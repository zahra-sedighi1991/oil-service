package ir.roghanyar.app;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        String versionName = call.getString("versionName", "latest");
        if (url == null || url.trim().isEmpty()) {
            call.reject("Invalid update URL.");
            return;
        }

        Uri uri = Uri.parse(url.trim());
        if (!"https".equalsIgnoreCase(uri.getScheme()) && !BuildConfig.DEBUG) {
            call.reject("Release updates require an HTTPS URL.");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent settings = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(settings);
            JSObject result = new JSObject();
            result.put("permissionRequired", true);
            call.resolve(result);
            return;
        }

        try {
            String safeVersion = versionName.replaceAll("[^a-zA-Z0-9._-]", "-");
            String fileName = "roghanyar-" + safeVersion + "-" + System.currentTimeMillis() + ".apk";
            DownloadManager.Request request = new DownloadManager.Request(uri)
                .setTitle("Roghanyar update")
                .setDescription("Downloading version " + versionName)
                .setMimeType("application/vnd.android.package-archive")
                .setAllowedOverMetered(true)
                .setAllowedOverRoaming(false)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalFilesDir(getContext(), Environment.DIRECTORY_DOWNLOADS, fileName);

            DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
            long downloadId = manager.enqueue(request);
            getContext().getSharedPreferences(AppUpdateDownloadReceiver.PREFERENCES, Context.MODE_PRIVATE)
                .edit()
                .putLong(AppUpdateDownloadReceiver.DOWNLOAD_ID, downloadId)
                .apply();

            JSObject result = new JSObject();
            result.put("permissionRequired", false);
            result.put("downloadId", downloadId);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Unable to start update download.", error);
        }
    }
}
