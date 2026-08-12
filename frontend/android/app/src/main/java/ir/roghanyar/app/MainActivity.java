package ir.roghanyar.app;

import android.app.Activity;
import android.content.SharedPreferences;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.plugin.WebView;
import java.io.File;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        rollbackUnconfirmedWebUpdate();
        registerPlugin(AppUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
    }

    private void rollbackUnconfirmedWebUpdate() {
        SharedPreferences updatePreferences = getSharedPreferences(AppUpdaterPlugin.PREFERENCES, Activity.MODE_PRIVATE);
        if (!updatePreferences.getBoolean(AppUpdaterPlugin.PENDING_CONFIRMATION, false)) return;
        String previousVersion = updatePreferences.getString(AppUpdaterPlugin.PREVIOUS_VERSION, "bundled");
        int previousBuildNumber = updatePreferences.getInt(AppUpdaterPlugin.PREVIOUS_BUILD_NUMBER, 0);
        File previousDirectory = new File(new File(getFilesDir(), "web-updates"), String.valueOf(previousBuildNumber));
        String previousPath = previousBuildNumber > 0 && new File(previousDirectory, "index.html").isFile()
            ? previousDirectory.getAbsolutePath()
            : "";
        getSharedPreferences(WebView.WEBVIEW_PREFS_NAME, Activity.MODE_PRIVATE)
            .edit()
            .putString(WebView.CAP_SERVER_PATH, previousPath)
            .apply();
        updatePreferences.edit()
            .putString(AppUpdaterPlugin.ACTIVE_VERSION, previousPath.isEmpty() ? "bundled" : previousVersion)
            .putInt(AppUpdaterPlugin.ACTIVE_BUILD_NUMBER, previousPath.isEmpty() ? 0 : previousBuildNumber)
            .putBoolean(AppUpdaterPlugin.PENDING_CONFIRMATION, false)
            .apply();
    }
}
