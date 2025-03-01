package com.stremio.player.plugins.exoplayer;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.Bridge;
import org.json.JSONObject;
import com.getcapacitor.JSArray;

@CapacitorPlugin(name = "ExoPlayer")
public class ExoPlayerPlugin extends Plugin {
    private ExoPlayerActivity currentActivity;
    private static ExoPlayerPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        String title = call.getString("title", "");
        JSObject headers = call.getObject("headers", new JSObject());
        
        // Handle subtitles array
        JSArray subtitlesArray = call.getArray("subtitles", new JSArray());
        JSObject subtitlesObject = new JSObject();
        subtitlesObject.put("subtitles", subtitlesArray);

        Intent intent = new Intent(getContext(), ExoPlayerActivity.class);
        intent.putExtra("url", url);
        intent.putExtra("title", title);
        intent.putExtra("headers", headers.toString());
        intent.putExtra("subtitles", subtitlesObject.toString());
        
        getActivity().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        if (currentActivity != null && currentActivity.getPlayer() != null) {
            currentActivity.getPlayer().pause();
        }
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (currentActivity != null && currentActivity.getPlayer() != null) {
            currentActivity.getPlayer().stop();
            currentActivity.finish();
        }
        call.resolve();
    }

    @PluginMethod
    public void setPlaybackSpeed(PluginCall call) {
        if (currentActivity != null && currentActivity.getPlayer() != null) {
            Double speedDouble = call.getDouble("speed", 1.0);
            float speed = speedDouble != null ? speedDouble.floatValue() : 1.0f;
            currentActivity.getPlayer().setPlaybackSpeed(speed);
        }
        call.resolve();
    }

    @PluginMethod
    public void seekTo(PluginCall call) {
        if (currentActivity != null && currentActivity.getPlayer() != null) {
            Long positionLong = call.getLong("position", 0L);
            long position = positionLong != null ? positionLong : 0L;
            currentActivity.getPlayer().seekTo(position);
        }
        call.resolve();
    }

    @PluginMethod
    public void getDuration(PluginCall call) {
        if (currentActivity != null && currentActivity.getPlayer() != null) {
            JSObject ret = new JSObject();
            ret.put("duration", currentActivity.getPlayer().getDuration());
            call.resolve(ret);
        } else {
            call.reject("Player not initialized");
        }
    }

    @PluginMethod
    public void getCurrentPosition(PluginCall call) {
        if (currentActivity != null && currentActivity.getPlayer() != null) {
            JSObject ret = new JSObject();
            ret.put("position", currentActivity.getPlayer().getCurrentPosition());
            call.resolve(ret);
        } else {
            call.reject("Player not initialized");
        }
    }

    @PluginMethod
    public void isPlaying(PluginCall call) {
        if (currentActivity != null && currentActivity.getPlayer() != null) {
            JSObject ret = new JSObject();
            ret.put("playing", currentActivity.getPlayer().isPlaying());
            call.resolve(ret);
        } else {
            call.reject("Player not initialized");
        }
    }

    public void setCurrentActivity(ExoPlayerActivity activity) {
        this.currentActivity = activity;
    }

    public static ExoPlayerPlugin getInstance() {
        return instance;
    }
} 