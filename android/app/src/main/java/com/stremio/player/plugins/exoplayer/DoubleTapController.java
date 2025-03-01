package com.stremio.player.plugins.exoplayer;

import android.content.Context;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.View;
import android.widget.TextView;
import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.os.Handler;
import android.os.Looper;
import android.widget.FrameLayout;
import android.view.Gravity;
import com.google.android.exoplayer2.ExoPlayer;
import com.stremio.player.R; // Add import for R class

public class DoubleTapController {
    private final GestureDetector gestureDetector;
    private final ExoPlayer player;
    private final Context context;
    private final View rootView;
    private TextView seekIndicator;
    private static final int SEEK_AMOUNT = 10000; // 10 seconds in milliseconds
    private static final int INDICATOR_DURATION = 600; // milliseconds
    private final Handler handler = new Handler(Looper.getMainLooper());

    public DoubleTapController(Context context, ExoPlayer player, View rootView) {
        this.context = context;
        this.player = player;
        this.rootView = rootView;
        this.gestureDetector = new GestureDetector(context, new GestureListener());
        createSeekIndicator();
    }

    private void createSeekIndicator() {
        seekIndicator = new TextView(context);
        seekIndicator.setTextColor(0xFFFFFFFF);
        seekIndicator.setTextSize(16);
        seekIndicator.setBackgroundResource(R.drawable.rounded_background);
        seekIndicator.setPadding(40, 20, 40, 20);
        seekIndicator.setVisibility(View.GONE);

        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        );
        params.gravity = Gravity.CENTER;
        ((FrameLayout) rootView).addView(seekIndicator, params);
    }

    public boolean onTouchEvent(MotionEvent event) {
        return gestureDetector.onTouchEvent(event);
    }

    private class GestureListener extends GestureDetector.SimpleOnGestureListener {
        @Override
        public boolean onDoubleTap(MotionEvent e) {
            float x = e.getX();
            int width = rootView.getWidth();
            
            // Determine which half of the screen was tapped
            if (x < width / 2) {
                // Left side - rewind
                seekBackward();
            } else {
                // Right side - fast forward
                seekForward();
            }
            return true;
        }
    }

    private void seekForward() {
        if (player != null) {
            long currentPos = player.getCurrentPosition();
            player.seekTo(currentPos + SEEK_AMOUNT);
            showSeekIndicator("⏩ +10s");
        }
    }

    private void seekBackward() {
        if (player != null) {
            long currentPos = player.getCurrentPosition();
            player.seekTo(Math.max(0, currentPos - SEEK_AMOUNT));
            showSeekIndicator("⏪ -10s");
        }
    }

    private void showSeekIndicator(String text) {
        seekIndicator.setText(text);
        seekIndicator.setAlpha(0f);
        seekIndicator.setVisibility(View.VISIBLE);
        
        // Clear any pending animations
        seekIndicator.animate().cancel();
        handler.removeCallbacksAndMessages(null);

        // Animate in
        seekIndicator.animate()
            .alpha(1f)
            .setDuration(200)
            .withEndAction(() -> {
                // Delay before animating out
                handler.postDelayed(() -> {
                    seekIndicator.animate()
                        .alpha(0f)
                        .setDuration(200)
                        .withEndAction(() -> seekIndicator.setVisibility(View.GONE))
                        .start();
                }, INDICATOR_DURATION);
            })
            .start();
    }
}