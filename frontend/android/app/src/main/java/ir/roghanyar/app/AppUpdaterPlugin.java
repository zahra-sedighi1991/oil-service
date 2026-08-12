package ir.roghanyar.app;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.plugin.WebView;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    public static final String PREFERENCES = "roghanyar_web_update";
    public static final String ACTIVE_VERSION = "active_version";
    public static final String ACTIVE_BUILD_NUMBER = "active_build_number";
    public static final String PREVIOUS_VERSION = "previous_version";
    public static final String PREVIOUS_BUILD_NUMBER = "previous_build_number";
    public static final String PENDING_CONFIRMATION = "pending_confirmation";

    @PluginMethod
    public void getActiveWebVersion(PluginCall call) {
        File updatesDirectory = new File(getContext().getFilesDir(), "web-updates");
        String serverPath = getBridge().getServerBasePath();
        boolean usingDownloadedBundle = serverPath != null
            && serverPath.startsWith(updatesDirectory.getAbsolutePath() + File.separator);
        JSObject result = new JSObject();
        SharedPreferences preferences = getContext().getSharedPreferences(PREFERENCES, Activity.MODE_PRIVATE);
        result.put("version", usingDownloadedBundle ? preferences.getString(ACTIVE_VERSION, "bundled") : "bundled");
        result.put("buildNumber", usingDownloadedBundle ? preferences.getInt(ACTIVE_BUILD_NUMBER, 0) : 0);
        call.resolve(result);
    }

    @PluginMethod
    public void confirmWebBundle(PluginCall call) {
        getContext().getSharedPreferences(PREFERENCES, Activity.MODE_PRIVATE)
            .edit()
            .putBoolean(PENDING_CONFIRMATION, false)
            .apply();
        call.resolve();
    }

    @PluginMethod
    public void installWebBundle(PluginCall call) {
        String url = call.getString("url");
        String version = call.getString("version");
        Integer buildNumber = call.getInt("buildNumber");
        String expectedSha256 = call.getString("sha256");
        if (url == null || version == null || buildNumber == null || expectedSha256 == null) {
            call.reject("Web update metadata is incomplete.");
            return;
        }
        if (!url.startsWith("https://") && !BuildConfig.DEBUG) {
            call.reject("Release web updates require HTTPS.");
            return;
        }
        if (!version.matches("[a-zA-Z0-9._-]+") || buildNumber <= 0 || !expectedSha256.matches("(?i)[a-f0-9]{64}")) {
            call.reject("Web update metadata is invalid.");
            return;
        }

        execute(() -> {
            File updatesDirectory = new File(getContext().getFilesDir(), "web-updates");
            String bundleDirectoryName = String.valueOf(buildNumber);
            File zipFile = new File(updatesDirectory, bundleDirectoryName + ".zip.part");
            File targetDirectory = new File(updatesDirectory, bundleDirectoryName);
            try {
                if (!updatesDirectory.exists() && !updatesDirectory.mkdirs()) {
                    throw new IllegalStateException("Unable to create update directory.");
                }
                deleteRecursively(targetDirectory);
                download(url, zipFile);
                String actualSha256 = sha256(zipFile);
                if (!actualSha256.equalsIgnoreCase(expectedSha256)) {
                    throw new SecurityException("Web update checksum does not match.");
                }
                if (!targetDirectory.mkdirs()) throw new IllegalStateException("Unable to create bundle directory.");
                unzipSafely(zipFile, targetDirectory);
                File indexFile = new File(targetDirectory, "index.html");
                if (!indexFile.isFile()) throw new IllegalStateException("Web bundle has no index.html.");
                zipFile.delete();

                SharedPreferences updatePreferences = getContext().getSharedPreferences(PREFERENCES, Activity.MODE_PRIVATE);
                String currentServerPath = getBridge().getServerBasePath();
                boolean replacingDownloadedBundle = currentServerPath != null
                    && currentServerPath.startsWith(updatesDirectory.getAbsolutePath() + File.separator);
                String previousVersion = replacingDownloadedBundle
                    ? updatePreferences.getString(ACTIVE_VERSION, "bundled")
                    : "bundled";
                int previousBuildNumber = replacingDownloadedBundle
                    ? updatePreferences.getInt(ACTIVE_BUILD_NUMBER, 0)
                    : 0;
                updatePreferences.edit()
                    .putString(PREVIOUS_VERSION, previousVersion)
                    .putInt(PREVIOUS_BUILD_NUMBER, previousBuildNumber)
                    .putString(ACTIVE_VERSION, version)
                    .putInt(ACTIVE_BUILD_NUMBER, buildNumber)
                    .putBoolean(PENDING_CONFIRMATION, true)
                    .apply();
                getBridge().executeOnMainThread(() -> {
                    getBridge().setServerBasePath(targetDirectory.getAbsolutePath());
                    SharedPreferences.Editor editor = getContext()
                        .getSharedPreferences(WebView.WEBVIEW_PREFS_NAME, Activity.MODE_PRIVATE)
                        .edit();
                    editor.putString(WebView.CAP_SERVER_PATH, targetDirectory.getAbsolutePath());
                    editor.apply();
                    call.resolve();
                });
            } catch (Exception error) {
                zipFile.delete();
                deleteRecursively(targetDirectory);
                call.reject("Unable to install web update.", error);
            }
        });
    }

    @PluginMethod
    public void openStore(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !(url.startsWith("https://") || url.startsWith("market://"))) {
            call.reject("Store URL is invalid.");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Unable to open app store.", error);
        }
    }

    private void download(String source, File destination) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(source).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(30000);
        connection.setInstanceFollowRedirects(true);
        connection.connect();
        if (!"https".equalsIgnoreCase(connection.getURL().getProtocol()) && !BuildConfig.DEBUG) {
            connection.disconnect();
            throw new SecurityException("Web update redirected to an insecure URL.");
        }
        if (connection.getResponseCode() < 200 || connection.getResponseCode() >= 300) {
            connection.disconnect();
            throw new IllegalStateException("Update server returned " + connection.getResponseCode());
        }
        long contentLength = connection.getContentLengthLong();
        if (contentLength > 50L * 1024L * 1024L) {
            connection.disconnect();
            throw new IllegalStateException("Web update is too large.");
        }
        try (InputStream input = new BufferedInputStream(connection.getInputStream());
             BufferedOutputStream output = new BufferedOutputStream(new FileOutputStream(destination))) {
            byte[] buffer = new byte[8192];
            int count;
            long total = 0;
            while ((count = input.read(buffer)) != -1) {
                total += count;
                if (total > 50L * 1024L * 1024L) throw new IllegalStateException("Web update is too large.");
                output.write(buffer, 0, count);
            }
        } finally {
            connection.disconnect();
        }
    }

    private String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new BufferedInputStream(new FileInputStream(file))) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) digest.update(buffer, 0, count);
        }
        StringBuilder value = new StringBuilder();
        for (byte item : digest.digest()) value.append(String.format(Locale.US, "%02x", item));
        return value.toString();
    }

    private void unzipSafely(File source, File destination) throws Exception {
        String destinationPath = destination.getCanonicalPath() + File.separator;
        long extractedBytes = 0;
        int extractedEntries = 0;
        try (ZipInputStream input = new ZipInputStream(new BufferedInputStream(new FileInputStream(source)))) {
            ZipEntry entry;
            while ((entry = input.getNextEntry()) != null) {
                extractedEntries += 1;
                if (extractedEntries > 10000) throw new IllegalStateException("Web update contains too many files.");
                File output = new File(destination, entry.getName());
                if (!output.getCanonicalPath().startsWith(destinationPath)) {
                    throw new SecurityException("Invalid path in web bundle.");
                }
                if (entry.isDirectory()) {
                    if (!output.exists() && !output.mkdirs()) throw new IllegalStateException("Unable to create directory.");
                } else {
                    File parent = output.getParentFile();
                    if (parent != null && !parent.exists() && !parent.mkdirs()) throw new IllegalStateException("Unable to create directory.");
                    try (BufferedOutputStream writer = new BufferedOutputStream(new FileOutputStream(output))) {
                        byte[] buffer = new byte[8192];
                        int count;
                        while ((count = input.read(buffer)) != -1) {
                            extractedBytes += count;
                            if (extractedBytes > 150L * 1024L * 1024L) throw new IllegalStateException("Extracted web update is too large.");
                            writer.write(buffer, 0, count);
                        }
                    }
                }
                input.closeEntry();
            }
        }
    }

    private void deleteRecursively(File value) {
        if (value == null || !value.exists()) return;
        File[] children = value.listFiles();
        if (children != null) for (File child : children) deleteRecursively(child);
        value.delete();
    }
}
