package com.madari.stremio;

import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import android.content.ComponentName;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.app.Activity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.util.List;

@CapacitorPlugin(
    name = "ExternalPlayer",
    permissions = {
        @Permission(
            strings = { "android.permission.READ_EXTERNAL_STORAGE" },
            alias = "read"
        )
    }
)
public class ExternalPlayerPlugin extends Plugin {
    private static final String TAG = "ExternalPlayerPlugin";
    private static final String PREFS_NAME = "ExternalPlayerPrefs";
    private static final String DEFAULT_PLAYER_PACKAGE = "default_player_package";
    private static final String DEFAULT_PLAYER_ACTIVITY = "default_player_activity";

    @PluginMethod
    public void openVideo(PluginCall call) {
        String url = call.getString("url");
        String title = call.getString("title", "Video");
        boolean useDefault = call.getBoolean("useDefault", true);

        if (url == null) {
            call.reject("URL is required");
            return;
        }

        Log.d(TAG, "Attempting to open video URL: " + url);

        try {
            Uri videoUri = Uri.parse(url);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(videoUri, "video/*");
            
            // Add extras
            intent.putExtra("title", title);
            intent.putExtra("secure_uri", true);
            intent.putExtra("position", 0L);
            intent.putExtra("return_result", true);
            
            // Add flags
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            // Check for default player
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, 0);
            String defaultPackage = prefs.getString(DEFAULT_PLAYER_PACKAGE, null);
            String defaultActivity = prefs.getString(DEFAULT_PLAYER_ACTIVITY, null);

            if (useDefault && defaultPackage != null && defaultActivity != null) {
                // Try to use default player
                try {
                    ComponentName component = new ComponentName(defaultPackage, defaultActivity);
                    intent.setComponent(component);
                    getContext().startActivity(intent);
                    Log.d(TAG, "Video opened with default player: " + defaultPackage);
                    call.resolve();
                    return;
                } catch (Exception e) {
                    Log.w(TAG, "Failed to use default player, falling back to chooser", e);
                    // Clear default player as it might be uninstalled
                    prefs.edit().remove(DEFAULT_PLAYER_PACKAGE).remove(DEFAULT_PLAYER_ACTIVITY).apply();
                }
            }

            // Create native chooser with "Always" option
            PackageManager pm = getContext().getPackageManager();
            List<ResolveInfo> resInfo = pm.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
            
            if (resInfo.isEmpty()) {
                call.reject("No video players found");
                return;
            }

            // Use native chooser dialog
            Intent chooserIntent = Intent.createChooser(intent, "Open with");
            chooserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            chooserIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            // This flag enables the "Always" button in the chooser
            chooserIntent.putExtra(Intent.EXTRA_EXCLUDE_COMPONENTS, new ComponentName[0]);
            chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[0]);

            getContext().startActivity(chooserIntent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error opening video: " + e.getMessage(), e);
            call.reject("Failed to open video: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void clearDefaultPlayer(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, 0);
            prefs.edit()
                .remove(DEFAULT_PLAYER_PACKAGE)
                .remove(DEFAULT_PLAYER_ACTIVITY)
                .apply();

            // Clear Android's default app preference for video
            Activity activity = getActivity();
            if (activity != null) {
                PackageManager pm = activity.getPackageManager();
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setType("video/*");
                pm.clearPackagePreferredActivities(activity.getPackageName());
            }

            Log.d(TAG, "Default player cleared");
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error clearing default player: " + e.getMessage(), e);
            call.reject("Failed to clear default player: " + e.getMessage(), e);
        }
    }
} 