package com.stremio.player.plugins.exoplayer;

import android.content.Context;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.widget.FrameLayout;

public class EdgeSwipeInterceptorLayout extends FrameLayout {
    private static final int EDGE_SLOP = 50; // pixels from edge to intercept

    public EdgeSwipeInterceptorLayout(Context context) {
        super(context);
    }

    public EdgeSwipeInterceptorLayout(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    @Override
    public boolean onInterceptTouchEvent(MotionEvent ev) {
        if (ev.getAction() == MotionEvent.ACTION_DOWN) {
            float x = ev.getX();
            float y = ev.getY();
            
            // Intercept touches near screen edges
            if (x < EDGE_SLOP || x > getWidth() - EDGE_SLOP ||
                y < EDGE_SLOP || y > getHeight() - EDGE_SLOP) {
                return true;
            }
        }
        return super.onInterceptTouchEvent(ev);
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        // Consume the touch event
        return true;
    }
}