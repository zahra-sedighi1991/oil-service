package ir.roghanyar.app;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;

public class AppUpdateDownloadReceiver extends BroadcastReceiver {
    public static final String PREFERENCES = "roghanyar_app_update";
    public static final String DOWNLOAD_ID = "download_id";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(intent.getAction())) return;

        long completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
        long expectedId = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            .getLong(DOWNLOAD_ID, -2L);
        if (completedId != expectedId) return;

        DownloadManager manager = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        DownloadManager.Query query = new DownloadManager.Query().setFilterById(completedId);
        try (Cursor cursor = manager.query(query)) {
            if (cursor == null || !cursor.moveToFirst()) return;
            int statusColumn = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
            if (statusColumn < 0 || cursor.getInt(statusColumn) != DownloadManager.STATUS_SUCCESSFUL) return;
        }

        Uri apkUri = manager.getUriForDownloadedFile(completedId);
        if (apkUri == null) return;
        context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE).edit().remove(DOWNLOAD_ID).apply();

        Intent install = new Intent(Intent.ACTION_VIEW)
            .setDataAndType(apkUri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        context.startActivity(install);
    }
}
