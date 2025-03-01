package com.stremio.player.plugins.exoplayer;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.exoplayer2.ExoPlayer;
import com.google.android.exoplayer2.MediaItem;
import com.google.android.exoplayer2.PlaybackParameters;
import com.google.android.exoplayer2.Player;
import com.google.android.exoplayer2.ui.AspectRatioFrameLayout;
import com.google.android.exoplayer2.trackselection.DefaultTrackSelector;
import com.google.android.exoplayer2.trackselection.TrackSelectionParameters;
import com.google.android.exoplayer2.ui.PlayerView;
import com.google.android.exoplayer2.ui.TrackSelectionDialogBuilder;
import com.google.android.exoplayer2.upstream.DefaultHttpDataSource;
import com.stremio.player.R;
import org.json.JSONObject;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Collections;
import android.view.WindowManager;
import android.os.Build;
import android.graphics.Color;
import android.widget.ImageView;
import android.graphics.Bitmap;
import android.graphics.Rect;
import android.media.MediaMetadataRetriever;
import com.google.android.exoplayer2.MediaItem.SubtitleConfiguration;
import com.google.android.exoplayer2.C;
import com.google.android.exoplayer2.util.MimeTypes;
import org.json.JSONArray;
import java.util.ArrayList;
import java.util.List;
import android.net.Uri;
import com.google.android.exoplayer2.Tracks;
import android.app.AlertDialog;
import com.google.android.exoplayer2.Format;
import android.content.Context;
import android.view.LayoutInflater;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.RadioButton;
import java.util.Locale;
import android.widget.ListView;
import android.widget.AdapterView;
import com.google.android.exoplayer2.trackselection.TrackSelectionOverride;

public class ExoPlayerActivity extends AppCompatActivity {
    private ExoPlayer player;
    private PlayerView playerView;
    private TextView titleView;
    private String videoUrl;
    private String videoTitle;
    private Map<String, String> headers;
    private DefaultTrackSelector trackSelector;
    private ImageButton subtitleButton;
    private ImageButton audioButton;
    private ImageButton speedButton;
    private View topControls;
    private View centerControls;
    private View bottomControls;
    private boolean isControlsVisible = true;
    private final int CONTROLS_HIDE_TIMEOUT = 3000; // 3 seconds
    private Handler controlsHandler;
    private final Runnable hideControlsRunnable = new Runnable() {
        @Override
        public void run() {
            hideControls();
        }
    };
    private final float[] PLAYBACK_SPEEDS = {0.25f, 0.5f, 0.75f, 1f, 1.25f, 1.5f, 1.75f, 2f};
    private int currentSpeedIndex = 3; // Default 1x speed
    private TextView speedIndicator;
    private static final int SPEED_INDICATOR_DURATION = 1500; // 1.5 seconds
    private View loadingOverlay;
    private DoubleTapController doubleTapController;
    private int currentAspectRatio = 0;
    private static final int[] ASPECT_RATIOS = {
        AspectRatioFrameLayout.RESIZE_MODE_FIT,      // Fit
        AspectRatioFrameLayout.RESIZE_MODE_ZOOM,     // Zoom  
        AspectRatioFrameLayout.RESIZE_MODE_FIXED_WIDTH,  // 16:9
        AspectRatioFrameLayout.RESIZE_MODE_FIXED_HEIGHT  // 4:3
    };
    private static final String[] ASPECT_RATIO_LABELS = {
        "Fit",
        "Zoom",
        "16:9",
        "4:3"
    };
    private GestureDetector leftGestureDetector;
    private GestureDetector rightGestureDetector;
    private View leftTapArea;
    private View rightTapArea;
    private View previewFrame;
    private ImageView previewImage;
    private TextView previewTime;
    private TextView chapterMarker;
    private TextView nextEpisodeButton;
    private ImageButton qualityButton;
    private boolean isPreviewEnabled = true;
    private long lastChapterUpdateTime = 0;
    private static final long CHAPTER_UPDATE_INTERVAL = 1000; // 1 second
    private static final long NEXT_EPISODE_SHOW_TIME = 10000; // 10 seconds before end
    private static final int PREVIEW_UPDATE_INTERVAL = 200; // milliseconds
    private Handler previewHandler = new Handler(Looper.getMainLooper());
    private boolean isNextEpisodeAvailable = false;
    private static final int THUMB_INTERVAL_MS = 5000; // 5 seconds between thumbnails
    private static final int THUMBS_PER_ROW = 5;
    private static final int THUMB_WIDTH = 160;
    private static final int THUMB_HEIGHT = 90;
    private Bitmap[] thumbnailCache;
    private List<SubtitleConfiguration> subtitleConfigurations;
    private boolean isLoadingSubtitles = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Make status bar fully transparent and extend content behind it
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS |
                               WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);  // Add keep screen on flag
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            getWindow().setStatusBarColor(Color.TRANSPARENT);
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        } else {
            // For older versions
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
        
        setContentView(R.layout.activity_exo_player);

        // Force landscape orientation
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);

        // Initialize handler for controls visibility
        controlsHandler = new Handler(Looper.getMainLooper());

        // Get video details from intent
        videoUrl = getIntent().getStringExtra("url");
        videoTitle = getIntent().getStringExtra("title");
        String headersJson = getIntent().getStringExtra("headers");
        headers = parseHeaders(headersJson);
        String subtitlesJson = getIntent().getStringExtra("subtitles");
        subtitleConfigurations = parseSubtitles(subtitlesJson);

        // Fetch additional subtitles if needed
        if (subtitleConfigurations == null || subtitleConfigurations.isEmpty()) {
            fetchOpenSubtitles();
        }

        // Initialize views
        playerView = findViewById(R.id.player_view);
        titleView = findViewById(R.id.video_title);
        titleView.setText(videoTitle);

        // Initialize control views
        topControls = findViewById(R.id.top_controls);
        centerControls = findViewById(R.id.center_controls);
        bottomControls = findViewById(R.id.bottom_controls);
        
        // Initialize custom buttons
        subtitleButton = findViewById(R.id.exo_subtitle);
        audioButton = findViewById(R.id.exo_audio);
        speedButton = findViewById(R.id.exo_speed);
        ImageButton fullscreenButton = findViewById(R.id.exo_fullscreen);
        ImageButton playPauseButton = findViewById(R.id.exo_play_pause);

        // Set up button click listeners
        setupButtonListeners();

        // Initialize player
        initializePlayer();

        // Initialize double tap controller after player is created
        doubleTapController = new DoubleTapController(this, player, findViewById(android.R.id.content));

        // Set up back button
        ImageButton backButton = findViewById(R.id.back_button);
        backButton.setOnClickListener(v -> finish());

        // Initialize speed indicator with rounded background
        speedIndicator = new TextView(this);
        speedIndicator.setTextColor(getResources().getColor(android.R.color.white));
        speedIndicator.setBackgroundResource(R.drawable.rounded_background);
        speedIndicator.setPadding(32, 16, 32, 16);
        speedIndicator.setTextSize(16);
        speedIndicator.setVisibility(View.GONE);
        
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        );
        params.gravity = Gravity.CENTER;
        ((FrameLayout) findViewById(android.R.id.content)).addView(speedIndicator, params);
        
        // Set up back button with proper handling
        backButton.setOnClickListener(v -> {
            // Hide controls immediately
            hideControls();
            // Stop playback
            if (player != null) {
                player.stop();
                player.clearMediaItems();
            }
            // Remove callbacks and animations
            controlsHandler.removeCallbacks(hideControlsRunnable);
            if (speedIndicator != null) {
                speedIndicator.clearAnimation();
            }
            // Finish activity immediately
            finish();
        });

        // Initialize loading overlay
        loadingOverlay = findViewById(R.id.loading_overlay);
        
        // Show loading initially
        loadingOverlay.setVisibility(View.VISIBLE);

        // Initialize aspect ratio button
        ImageButton aspectButton = findViewById(R.id.exo_aspect);
        aspectButton.setOnClickListener(v -> cycleAspectRatio());

        // Setup double tap areas for seeking
        setupDoubleTapArea();

        // Initialize touch areas for seeking
        setupTouchAreas();

        // Initialize new views
        previewFrame = findViewById(R.id.preview_frame);
        previewImage = findViewById(R.id.preview_image);
        previewTime = findViewById(R.id.preview_time);
        chapterMarker = findViewById(R.id.chapter_marker);
        nextEpisodeButton = findViewById(R.id.next_episode);
        qualityButton = findViewById(R.id.exo_quality);

        // Set up quality button
        qualityButton.setOnClickListener(v -> showQualitySelector());

        // Set up next episode button
        nextEpisodeButton.setOnClickListener(v -> playNextEpisode());

        // Add player listener for next episode
        player.addListener(new Player.Listener() {
            @Override
            public void onPositionDiscontinuity(Player.PositionInfo oldPosition,
                                              Player.PositionInfo newPosition,
                                              @Player.DiscontinuityReason int reason) {
                updateNextEpisodeVisibility();
            }

            @Override
            public void onPlaybackStateChanged(int state) {
                if (state == Player.STATE_READY) {
                    updateNextEpisodeVisibility();
                }
            }
        });

        // Set up preview frame touch listener
        playerView.setOnTouchListener((v, event) -> {
            // First try to handle double tap
            if (doubleTapController.onTouchEvent(event)) {
                return true;
            }
            
            // Handle single tap
            if (event.getAction() == MotionEvent.ACTION_UP) {
                if (!v.performClick()) {
                    toggleControls();
                    return true;
                }
            }
            return false;
        });
    }
    
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                getWindow().setStatusBarColor(Color.TRANSPARENT);
            }
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        }
    }

    private void setupButtonListeners() {
        subtitleButton.setOnClickListener(v -> showSubtitleTrackSelector());
        audioButton.setOnClickListener(v -> showAudioTrackSelector());
        speedButton.setOnClickListener(v -> showSpeedSelector());
        
        // Enhanced play/pause button handling
        ImageButton playPauseButton = findViewById(R.id.exo_play_pause);
        if (playPauseButton != null) {
            playPauseButton.setOnClickListener(v -> {
                if (player != null) {
                    if (player.isPlaying()) {
                        player.pause();
                    } else {
                        player.play();
                    }
                    updatePlayPauseButton(player.isPlaying());
                }
            });
        }
    }

    private String getLanguageName(String languageCode) {
        if (languageCode == null) return "Unknown";
        try {
            return new Locale(languageCode).getDisplayLanguage(Locale.ENGLISH);
        } catch (Exception e) {
            return languageCode;
        }
    }

    private void showSubtitleTrackSelector() {
        if (player == null) return;

        // Get the current tracks
        Tracks tracks = player.getCurrentTracks();
        List<Tracks.Group> textTrackGroups = new ArrayList<>();
        
        // Collect all text track groups
        for (Tracks.Group group : tracks.getGroups()) {
            if (group.getType() == C.TRACK_TYPE_TEXT) {
                textTrackGroups.add(group);
            }
        }

        if (!textTrackGroups.isEmpty()) {
            // Create dialog with custom layout
            AlertDialog.Builder builder = new AlertDialog.Builder(this, R.style.CustomAlertDialog);
            builder.setTitle("Subtitles");

            // Get track names
            List<String> trackNames = new ArrayList<>();
            List<Format> trackFormats = new ArrayList<>();
            trackNames.add("Off"); // Add option to disable subtitles
            
            // Collect all tracks from all groups
            for (Tracks.Group group : textTrackGroups) {
                for (int i = 0; i < group.length; i++) {
                    Format format = group.getTrackFormat(i);
                    String languageName = getLanguageName(format.language);
                    String trackName = languageName;
                    
                    if (format.label != null && !format.label.isEmpty()) {
                        trackName += " - " + format.label;
                    }
                    
                    // Add forced/SDH indicators if present
                    if ((format.selectionFlags & C.SELECTION_FLAG_FORCED) != 0) {
                        trackName += " [Forced]";
                    }
                    if ((format.selectionFlags & C.SELECTION_FLAG_DEFAULT) != 0) {
                        trackName += " [Default]";
                    }
                    
                    trackNames.add(trackName);
                    trackFormats.add(format);
                }
            }

            // Create custom list items with radio buttons
            ListView listView = new ListView(this);
            SubtitleTrackAdapter adapter = new SubtitleTrackAdapter(this, trackNames);
            listView.setAdapter(adapter);
            
            // Create and show dialog
            AlertDialog dialog = builder.setView(listView).create();
            
            // Handle item selection
            listView.setOnItemClickListener((parent, view, which, id) -> {
                if (which == 0) {
                    // Disable subtitles
                    player.setTrackSelectionParameters(
                        player.getTrackSelectionParameters()
                            .buildUpon()
                            .setDisabledTrackTypes(Collections.singleton(C.TRACK_TYPE_TEXT))
                            .build()
                    );
                } else {
                    // Get the selected track format
                    final Format selectedFormat = trackFormats.get(which - 1);
                    // Find the track group that contains this format
                    for (Tracks.Group group : textTrackGroups) {
                        for (int i = 0; i < group.length; i++) {
                            if (group.getTrackFormat(i) == selectedFormat) {
                                // Enable the selected track
                                player.setTrackSelectionParameters(
                                    player.getTrackSelectionParameters()
                                        .buildUpon()
                                        .setDisabledTrackTypes(Collections.emptySet())
                                        .setOverrideForType(
                                            new TrackSelectionOverride(
                                                group.getMediaTrackGroup(),
                                                i
                                            )
                                        )
                                        .build()
                                );
                                break;
                            }
                        }
                    }
                }
                dialog.dismiss();
            });

            dialog.show();
        }
    }

    private void showAudioTrackSelector() {
        if (player == null) return;

        // Get the current tracks
        Tracks tracks = player.getCurrentTracks();
        List<Tracks.Group> audioTrackGroups = new ArrayList<>();
        
        // Collect all audio track groups
        for (Tracks.Group group : tracks.getGroups()) {
            if (group.getType() == C.TRACK_TYPE_AUDIO) {
                audioTrackGroups.add(group);
            }
        }

        if (!audioTrackGroups.isEmpty()) {
            // Create dialog with custom layout
            AlertDialog.Builder builder = new AlertDialog.Builder(this, R.style.CustomAlertDialog);
            builder.setTitle("Audio");

            // Get track names
            List<String> trackNames = new ArrayList<>();
            List<Format> trackFormats = new ArrayList<>();
            
            // Collect all tracks from all groups
            for (Tracks.Group group : audioTrackGroups) {
                for (int i = 0; i < group.length; i++) {
                    Format format = group.getTrackFormat(i);
                    String languageName = getLanguageName(format.language);
                    StringBuilder trackName = new StringBuilder(languageName);
                    
                    if (format.label != null && !format.label.isEmpty()) {
                        trackName.append(" - ").append(format.label);
                    }
                    
                    // Add audio quality information
                    if (format.bitrate > 0) {
                        trackName.append(String.format(" • %d kbps", format.bitrate / 1024));
                    }
                    if (format.channelCount > 0) {
                        trackName.append(String.format(" • %d.%d", 
                            format.channelCount / 2, 
                            format.channelCount % 2));
                    }
                    
                    trackNames.add(trackName.toString());
                    trackFormats.add(format);
                }
            }

            // Create custom list items with radio buttons
            ListView listView = new ListView(this);
            AudioTrackAdapter adapter = new AudioTrackAdapter(this, trackNames);
            listView.setAdapter(adapter);
            
            // Create and show dialog
            AlertDialog dialog = builder.setView(listView).create();
            
            // Handle item selection
            listView.setOnItemClickListener((parent, view, which, id) -> {
                final Format selectedFormat = trackFormats.get(which);
                // Find the track group that contains this format
                for (Tracks.Group group : audioTrackGroups) {
                    for (int i = 0; i < group.length; i++) {
                        if (group.getTrackFormat(i) == selectedFormat) {
                            // Enable the selected track
                            player.setTrackSelectionParameters(
                                player.getTrackSelectionParameters()
                                    .buildUpon()
                                    .setOverrideForType(
                                        new TrackSelectionOverride(
                                            group.getMediaTrackGroup(),
                                            i
                                        )
                                    )
                                    .build()
                            );
                            break;
                        }
                    }
                }
                dialog.dismiss();
            });

            dialog.show();
        }
    }

    private class SubtitleTrackAdapter extends ArrayAdapter<String> {
        public SubtitleTrackAdapter(Context context, List<String> tracks) {
            super(context, R.layout.track_selection_item, tracks);
        }

        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            if (convertView == null) {
                convertView = LayoutInflater.from(getContext())
                    .inflate(R.layout.track_selection_item, parent, false);
            }

            TextView trackName = convertView.findViewById(R.id.track_name);
            TextView trackInfo = convertView.findViewById(R.id.track_info);
            RadioButton radio = convertView.findViewById(R.id.track_radio);

            String item = getItem(position);
            if (position == 0) {
                // "Off" option
                trackName.setText("Off");
                trackInfo.setVisibility(View.GONE);
            } else {
                String[] parts = item.split(" - |\\[|•");
                trackName.setText(parts[0].trim()); // Language name
                
                // Combine additional info
                StringBuilder info = new StringBuilder();
                for (int i = 1; i < parts.length; i++) {
                    if (parts[i].contains("Forced") || parts[i].contains("Default")) {
                        info.append(parts[i].replace("]", "").trim()).append(" • ");
                    } else if (!parts[i].trim().isEmpty()) {
                        info.append(parts[i].trim()).append(" • ");
                    }
                }
                
                if (info.length() > 0) {
                    info.setLength(info.length() - 3); // Remove last separator
                    trackInfo.setText(info.toString());
                    trackInfo.setVisibility(View.VISIBLE);
                } else {
                    trackInfo.setVisibility(View.GONE);
                }
            }

            // Check if this is the currently selected track
            boolean isSelected = false;
            if (position == 0) {
                isSelected = player.getTrackSelectionParameters()
                    .disabledTrackTypes.contains(C.TRACK_TYPE_TEXT);
            } else {
                TrackSelectionParameters params = player.getTrackSelectionParameters();
                for (Tracks.Group group : player.getCurrentTracks().getGroups()) {
                    if (group.isSelected() && group.getType() == C.TRACK_TYPE_TEXT) {
                        Format format = group.getTrackFormat(0);
                        isSelected = format != null && 
                                   format.language != null && 
                                   item.startsWith(getLanguageName(format.language));
                        break;
                    }
                }
            }
            
            radio.setChecked(isSelected);
            return convertView;
        }
    }

    private class AudioTrackAdapter extends ArrayAdapter<String> {
        public AudioTrackAdapter(Context context, List<String> tracks) {
            super(context, R.layout.track_selection_item, tracks);
        }

        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            if (convertView == null) {
                convertView = LayoutInflater.from(getContext())
                    .inflate(R.layout.track_selection_item, parent, false);
            }

            TextView trackName = convertView.findViewById(R.id.track_name);
            TextView trackInfo = convertView.findViewById(R.id.track_info);
            RadioButton radio = convertView.findViewById(R.id.track_radio);

            String item = getItem(position);
            String[] parts = item.split(" • ");
            
            // Set main track name (language and label if available)
            String[] nameParts = parts[0].split(" - ");
            trackName.setText(nameParts[0].trim());
            
            // Combine quality info
            StringBuilder info = new StringBuilder();
            if (nameParts.length > 1) {
                info.append(nameParts[1].trim()).append(" • ");
            }
            for (int i = 1; i < parts.length; i++) {
                info.append(parts[i].trim());
                if (i < parts.length - 1) {
                    info.append(" • ");
                }
            }
            
            if (info.length() > 0) {
                trackInfo.setText(info.toString());
                trackInfo.setVisibility(View.VISIBLE);
            } else {
                trackInfo.setVisibility(View.GONE);
            }

            // Check if this is the currently selected track
            boolean isSelected = false;
            TrackSelectionParameters params = player.getTrackSelectionParameters();
            for (Tracks.Group group : player.getCurrentTracks().getGroups()) {
                if (group.isSelected() && group.getType() == C.TRACK_TYPE_AUDIO) {
                    Format format = group.getTrackFormat(0);
                    isSelected = format != null && 
                               format.language != null && 
                               item.startsWith(getLanguageName(format.language));
                    break;
                }
            }
            
            radio.setChecked(isSelected);
            return convertView;
        }
    }

    private void showSpeedSelector() {
        currentSpeedIndex = (currentSpeedIndex + 1) % PLAYBACK_SPEEDS.length;
        float speed = PLAYBACK_SPEEDS[currentSpeedIndex];
        setPlaybackSpeed(speed);

        // Update speed button text and show indicator
        String speedText = speed + "x";
        speedButton.setContentDescription(speedText);
        speedIndicator.setText(speedText);
        
        // Show speed indicator with animation
        speedIndicator.setAlpha(0f);
        speedIndicator.setVisibility(View.VISIBLE);
        speedIndicator.animate()
            .alpha(1f)
            .setDuration(200)
            .withEndAction(() -> {
                new Handler().postDelayed(() -> {
                    speedIndicator.animate()
                        .alpha(0f)
                        .setDuration(200)
                        .withEndAction(() -> speedIndicator.setVisibility(View.GONE))
                        .start();
                }, SPEED_INDICATOR_DURATION);
            })
            .start();
    }

    private void initializePlayer() {
        // Create track selector with parameters
        DefaultTrackSelector.Parameters parameters = new DefaultTrackSelector.Parameters.Builder(this)
            .setPreferredTextLanguage("en")
            .setSelectUndeterminedTextLanguage(true)
            .setPreferredAudioLanguage(null) // Don't set a default audio language
            .build();
            
        trackSelector = new DefaultTrackSelector(this);
        trackSelector.setParameters(parameters);

        // Create player instance
        player = new ExoPlayer.Builder(this)
            .setTrackSelector(trackSelector)
            .build();

        // Add listener for track selection changes
        player.addListener(new Player.Listener() {
            @Override
            public void onTracksChanged(Tracks tracks) {
                updateAvailableButtons();
                
                // If no subtitle tracks are available, try fetching from OpenSubtitles
                boolean hasSubtitles = false;
                for (Tracks.Group trackGroup : tracks.getGroups()) {
                    if (trackGroup.getType() == C.TRACK_TYPE_TEXT && trackGroup.length > 0) {
                        hasSubtitles = true;
                        break;
                    }
                }
                
                if (!hasSubtitles && !isLoadingSubtitles) {
                    fetchOpenSubtitles();
                }
            }
        });

        // Set player view
        playerView.setPlayer(player);
        playerView.setControllerShowTimeoutMs(CONTROLS_HIDE_TIMEOUT);

        // Create media item with subtitles
        MediaItem.Builder mediaItemBuilder = new MediaItem.Builder()
            .setUri(videoUrl);

        // Add subtitle configurations
        if (subtitleConfigurations != null && !subtitleConfigurations.isEmpty()) {
            mediaItemBuilder.setSubtitleConfigurations(subtitleConfigurations);
        }

        // Create data source factory with headers
        DefaultHttpDataSource.Factory dataSourceFactory = new DefaultHttpDataSource.Factory();
        if (headers != null && !headers.isEmpty()) {
            dataSourceFactory.setDefaultRequestProperties(headers);
        }

        // Prepare player
        player.setMediaItem(mediaItemBuilder.build());
        player.prepare();
        player.setPlayWhenReady(true);

        // Add player listeners
        player.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int state) {
                if (state == Player.STATE_READY) {
                    loadingOverlay.setVisibility(View.GONE);
                    updateAvailableButtons();
                } else if (state == Player.STATE_BUFFERING) {
                    loadingOverlay.setVisibility(View.VISIBLE);
                }
            }

            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                updatePlayPauseButton(isPlaying);
            }
        });
    }

    private void updateAvailableButtons() {
        if (player == null) return;

        // Check for actual subtitle tracks in the player
        boolean hasSubtitles = false;
        Tracks tracks = player.getCurrentTracks();
        for (Tracks.Group trackGroup : tracks.getGroups()) {
            if (trackGroup.getType() == C.TRACK_TYPE_TEXT && trackGroup.length > 0) {
                hasSubtitles = true;
                break;
            }
        }
        if (subtitleButton != null) {
            subtitleButton.setVisibility(hasSubtitles ? View.VISIBLE : View.GONE);
        }

        // Check for actual audio tracks in the player
        boolean hasMultipleAudioTracks = false;
        int audioTrackCount = 0;
        for (Tracks.Group trackGroup : tracks.getGroups()) {
            if (trackGroup.getType() == C.TRACK_TYPE_AUDIO) {
                audioTrackCount += trackGroup.length;
            }
        }
        hasMultipleAudioTracks = audioTrackCount > 1;
        if (audioButton != null) {
            audioButton.setVisibility(hasMultipleAudioTracks ? View.VISIBLE : View.GONE);
        }
    }

    private Map<String, String> parseHeaders(String headersJson) {
        Map<String, String> headerMap = new HashMap<>();
        try {
            if (headersJson != null && !headersJson.isEmpty()) {
                JSONObject json = new JSONObject(headersJson);
                Iterator<String> keys = json.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    headerMap.put(key, json.getString(key));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return headerMap;
    }

    private List<SubtitleConfiguration> parseSubtitles(String subtitlesJson) {
        List<SubtitleConfiguration> configs = new ArrayList<>();
        if (subtitlesJson == null || subtitlesJson.isEmpty()) {
            return configs;
        }

        try {
            JSONObject jsonObject = new JSONObject(subtitlesJson);
            JSONArray subtitles = jsonObject.getJSONArray("subtitles");
            
            for (int i = 0; i < subtitles.length(); i++) {
                JSONObject subtitle = subtitles.getJSONObject(i);
                String url = subtitle.getString("url");
                String language = subtitle.getString("language");
                
                SubtitleConfiguration config = new SubtitleConfiguration.Builder(Uri.parse(url))
                    .setMimeType(MimeTypes.TEXT_VTT) // VTT format
                    .setLanguage(language)
                    .setSelectionFlags(C.SELECTION_FLAG_DEFAULT)
                    .build();
                
                configs.add(config);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        
        return configs;
    }

    public void setPlaybackSpeed(float speed) {
        if (player != null) {
            PlaybackParameters params = new PlaybackParameters(speed);
            player.setPlaybackParameters(params);
        }
    }

    private void toggleControls() {
        if (isControlsVisible) {
            hideControls();
        } else {
            showControls();
        }
    }

    private void showControls() {
        if (!isControlsVisible) {
            isControlsVisible = true;
            
            // Make sure views are visible before starting animation
            topControls.setVisibility(View.VISIBLE);
            centerControls.setVisibility(View.VISIBLE);
            bottomControls.setVisibility(View.VISIBLE);
            
            // Reset alpha to 0 for animation
            topControls.setAlpha(0f);
            centerControls.setAlpha(0f);
            bottomControls.setAlpha(0f);
            
            // Animate fade in
            topControls.animate()
                .alpha(1f)
                .setDuration(200)
                .withLayer()
                .start();
            
            centerControls.animate()
                .alpha(1f)
                .setDuration(200)
                .withLayer()
                .start();
            
            bottomControls.animate()
                .alpha(1f)
                .setDuration(200)
                .withLayer()
                .start();

            // Auto-hide controls after timeout
            resetHideControlsTimer();
        } else {
            // If controls are already visible, just reset the timer
            resetHideControlsTimer();
        }
    }

    private void hideControls() {
        if (isControlsVisible && player != null && 
            (player.isPlaying() || player.getPlaybackState() == Player.STATE_ENDED)) {
            isControlsVisible = false;
            
            // Animate fade out
            topControls.animate()
                .alpha(0f)
                .setDuration(200)
                .withLayer()
                .withEndAction(() -> {
                    if (!isControlsVisible) {
                        topControls.setVisibility(View.GONE);
                    }
                }).start();
            
            centerControls.animate()
                .alpha(0f)
                .setDuration(200)
                .withLayer()
                .withEndAction(() -> {
                    if (!isControlsVisible) {
                        centerControls.setVisibility(View.GONE);
                    }
                }).start();
            
            bottomControls.animate()
                .alpha(0f)
                .setDuration(200)
                .withLayer()
                .withEndAction(() -> {
                    if (!isControlsVisible) {
                        bottomControls.setVisibility(View.GONE);
                    }
                }).start();
        }
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        // Don't handle touches while loading
        if (loadingOverlay.getVisibility() == View.VISIBLE) {
            return true;
        }

        // Let the player view handle all touch events
        return super.onTouchEvent(event);
    }

    private void resetHideControlsTimer() {
        if (isControlsVisible) {
            controlsHandler.removeCallbacks(hideControlsRunnable);
            controlsHandler.postDelayed(hideControlsRunnable, CONTROLS_HIDE_TIMEOUT);
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (player != null) {
            player.pause();
            // Remove keep screen on flag when paused
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
        controlsHandler.removeCallbacks(hideControlsRunnable);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Restore keep screen on flag when resumed
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (player != null) {
            player.release();
            player = null;
        }
        controlsHandler.removeCallbacks(hideControlsRunnable);
        // Remove any pending animations
        if (speedIndicator != null) {
            speedIndicator.clearAnimation();
        }
        previewHandler.removeCallbacksAndMessages(null);
    }

    @Override
    public void onBackPressed() {
        // Hide controls first
        hideControls();
        // Pause playback
        if (player != null) {
            player.pause();
        }
        // Remove callbacks and animations
        controlsHandler.removeCallbacks(hideControlsRunnable);
        if (speedIndicator != null) {
            speedIndicator.clearAnimation();
        }
        super.onBackPressed();
    }

    public ExoPlayer getPlayer() {
        return player;
    }

    private void cycleAspectRatio() {
        currentAspectRatio = (currentAspectRatio + 1) % ASPECT_RATIOS.length;
        playerView.setResizeMode(ASPECT_RATIOS[currentAspectRatio]);
        
        // Show indicator with current aspect ratio
        String aspectLabel = ASPECT_RATIO_LABELS[currentAspectRatio];
        speedIndicator.setText(aspectLabel);
        speedIndicator.setAlpha(0f);
        speedIndicator.setVisibility(View.VISIBLE);
        
        // Clear any pending animations
        speedIndicator.animate().cancel();
        
        // Animate indicator
        speedIndicator.animate()
            .alpha(1f)
            .setDuration(200)
            .withEndAction(() -> {
                new Handler().postDelayed(() -> {
                    speedIndicator.animate()
                        .alpha(0f)
                        .setDuration(200)
                        .withEndAction(() -> speedIndicator.setVisibility(View.GONE))
                        .start();
                }, 1000);
            })
            .start();
    }

    private void setupDoubleTapArea() {
        View leftArea = new View(this);
        View rightArea = new View(this);

        // Set touch areas to be above the player view but below controls
        leftArea.setElevation(1);
        rightArea.setElevation(1);

        // Create layout params
        FrameLayout.LayoutParams leftParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        );
        leftParams.width = getResources().getDisplayMetrics().widthPixels / 3; // Divide into thirds

        FrameLayout.LayoutParams rightParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        );
        rightParams.width = getResources().getDisplayMetrics().widthPixels / 3;
        rightParams.leftMargin = leftParams.width * 2; // Place in last third

        // Add touch areas to the root view
        View decorView = getWindow().getDecorView();
        if (decorView instanceof FrameLayout) {
            FrameLayout rootView = (FrameLayout) decorView;
            rootView.addView(leftArea, 0, leftParams);
            rootView.addView(rightArea, 1, rightParams);
        }

        // Initialize gesture detectors with feedback
        GestureDetector leftDetector = new GestureDetector(this, new GestureDetector.SimpleOnGestureListener() {
            @Override
            public boolean onSingleTapConfirmed(MotionEvent e) {
                toggleControls();
                return true;
            }

            @Override
            public boolean onDoubleTap(MotionEvent e) {
                if (player != null) {
                    long newPosition = Math.max(0, player.getCurrentPosition() - 10000);
                    player.seekTo(newPosition);
                    showSeekFeedback(false);
                }
                return true;
            }
        });

        GestureDetector rightDetector = new GestureDetector(this, new GestureDetector.SimpleOnGestureListener() {
            @Override
            public boolean onSingleTapConfirmed(MotionEvent e) {
                toggleControls();
                return true;
            }

            @Override
            public boolean onDoubleTap(MotionEvent e) {
                if (player != null) {
                    long newPosition = Math.min(player.getCurrentPosition() + 10000, player.getDuration());
                    player.seekTo(newPosition);
                    showSeekFeedback(true);
                }
                return true;
            }
        });

        leftArea.setOnTouchListener((v, event) -> {
            if (isControlsVisible && event.getY() < topControls.getHeight()) {
                return false;
            }
            return leftDetector.onTouchEvent(event);
        });

        rightArea.setOnTouchListener((v, event) -> {
            if (isControlsVisible && event.getY() < topControls.getHeight()) {
                return false;
            }
            return rightDetector.onTouchEvent(event);
        });
    }

    private void seekForward() {
        if (player != null) {
            long newPosition = Math.min(player.getCurrentPosition() + 10000, player.getDuration());
            player.seekTo(newPosition);
            showSeekFeedback(true);
        }
    }

    private void seekBackward() {
        if (player != null) {
            long newPosition = Math.max(0, player.getCurrentPosition() - 10000);
            player.seekTo(newPosition);
            showSeekFeedback(false);
        }
    }

    private void showSeekFeedback(boolean forward) {
        // Create and show seek feedback view
        TextView seekFeedback = new TextView(this);
        seekFeedback.setTextColor(Color.WHITE);
        seekFeedback.setTextSize(20);
        seekFeedback.setText(forward ? "⏩ +10s" : "⏪ -10s");
        seekFeedback.setBackgroundResource(R.drawable.rounded_background);
        seekFeedback.setPadding(40, 20, 40, 20);

        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        );
        params.gravity = forward ? (Gravity.CENTER | Gravity.END) : (Gravity.CENTER | Gravity.START);
        params.rightMargin = forward ? 100 : 0;
        params.leftMargin = forward ? 0 : 100;

        FrameLayout rootView = findViewById(android.R.id.content);
        rootView.addView(seekFeedback, params);

        // Animate feedback
        seekFeedback.setAlpha(0f);
        seekFeedback.animate()
            .alpha(1f)
            .setDuration(200)
            .withEndAction(() -> {
                new Handler().postDelayed(() -> {
                    seekFeedback.animate()
                        .alpha(0f)
                        .setDuration(200)
                        .withEndAction(() -> rootView.removeView(seekFeedback))
                        .start();
                }, 800);
            })
            .start();
    }

    private void setupTouchAreas() {
        // Create touch areas
        leftTapArea = new View(this);
        rightTapArea = new View(this);
        
        // Make sure they can receive touches
        leftTapArea.setClickable(true);
        rightTapArea.setClickable(true);
        
        // Create layout parameters for both areas
        FrameLayout.LayoutParams leftParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        );
        leftParams.width = getResources().getDisplayMetrics().widthPixels / 2;
        
        FrameLayout.LayoutParams rightParams = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        );
        rightParams.width = getResources().getDisplayMetrics().widthPixels / 2;
        rightParams.leftMargin = leftParams.width;
        
        // Add touch areas to the player view parent
        FrameLayout rootView = findViewById(android.R.id.content);
        rootView.addView(leftTapArea, 0, leftParams);
        rootView.addView(rightTapArea, 1, rightParams);
        
        // Initialize gesture detectors
        leftGestureDetector = new GestureDetector(this, new GestureDetector.SimpleOnGestureListener() {
            @Override
            public boolean onSingleTapConfirmed(MotionEvent e) {
                toggleControls();
                return true;
            }
            
            @Override
            public boolean onDoubleTap(MotionEvent e) {
                seekBackward();
                return true;
            }
        });
        
        rightGestureDetector = new GestureDetector(this, new GestureDetector.SimpleOnGestureListener() {
            @Override
            public boolean onSingleTapConfirmed(MotionEvent e) {
                toggleControls();
                return true;
            }
            
            @Override
            public boolean onDoubleTap(MotionEvent e) {
                seekForward();
                return true;
            }
        });
        
        // Set touch listeners
        leftTapArea.setOnTouchListener((v, event) -> leftGestureDetector.onTouchEvent(event));
        rightTapArea.setOnTouchListener((v, event) -> rightGestureDetector.onTouchEvent(event));
    }

    private void showQualitySelector() {
        if (player != null) {
            TrackSelectionDialogBuilder builder = new TrackSelectionDialogBuilder(
                this,
                "Select Quality",
                player,
                com.google.android.exoplayer2.C.TRACK_TYPE_VIDEO
            );
            builder.setShowDisableOption(false)
                   .setAllowAdaptiveSelections(true)
                   .build()
                   .show();
        }
    }

    private void updatePreviewForPosition(float x) {
        if (player == null || !isPreviewEnabled) return;

        float width = playerView.getWidth();
        float progress = x / width;
        long duration = player.getDuration();
        long position = (long) (duration * progress);

        // Update preview position
        previewFrame.setX(Math.max(0, Math.min(x - previewFrame.getWidth() / 2,
                                              width - previewFrame.getWidth())));

        // Update preview time
        String timeString = formatDuration(position);
        previewTime.setText(timeString);

        // Show preview
        if (previewFrame.getVisibility() != View.VISIBLE) {
            previewFrame.setAlpha(0f);
            previewFrame.setVisibility(View.VISIBLE);
            previewFrame.animate()
                       .alpha(1f)
                       .setDuration(200)
                       .start();
        }

        // Load preview image (implement based on your thumbnail generation system)
        loadPreviewImage(position);
    }

    private void hidePreview() {
        if (previewFrame.getVisibility() == View.VISIBLE) {
            previewFrame.animate()
                       .alpha(0f)
                       .setDuration(200)
                       .withEndAction(() -> previewFrame.setVisibility(View.GONE))
                       .start();
        }
    }

    private void updateNextEpisodeVisibility() {
        if (player == null) return;

        long duration = player.getDuration();
        long position = player.getCurrentPosition();
        long timeRemaining = duration - position;

        if (isNextEpisodeAvailable && timeRemaining <= NEXT_EPISODE_SHOW_TIME) {
            if (nextEpisodeButton.getVisibility() != View.VISIBLE) {
                nextEpisodeButton.setAlpha(0f);
                nextEpisodeButton.setVisibility(View.VISIBLE);
                nextEpisodeButton.animate()
                                .alpha(1f)
                                .setDuration(300)
                                .start();
            }
        } else {
            if (nextEpisodeButton.getVisibility() == View.VISIBLE) {
                nextEpisodeButton.animate()
                                .alpha(0f)
                                .setDuration(300)
                                .withEndAction(() -> nextEpisodeButton.setVisibility(View.GONE))
                                .start();
            }
        }
    }

    private void playNextEpisode() {
        // Implement next episode logic based on your content system
        // This is just a placeholder
        if (isNextEpisodeAvailable) {
            // Load and play next episode
        }
    }

    private String formatDuration(long millis) {
        long seconds = millis / 1000;
        long minutes = seconds / 60;
        long hours = minutes / 60;
        seconds = seconds % 60;
        minutes = minutes % 60;
        return hours > 0 ?
            String.format("%d:%02d:%02d", hours, minutes, seconds) :
            String.format("%02d:%02d", minutes, seconds);
    }

    private void loadPreviewImage(long position) {
        if (player == null) return;

        // For now use placeholder while generating real thumbnails
        previewImage.setImageResource(R.drawable.preview_placeholder);

        // Start generating thumbnails if not already done
        if (thumbnailCache == null) {
            generateThumbnails();
        } else {
            // Use cached thumbnail if available
            int thumbIndex = (int) (position / THUMB_INTERVAL_MS);
            if (thumbIndex >= 0 && thumbIndex < thumbnailCache.length && thumbnailCache[thumbIndex] != null) {
                previewImage.setImageBitmap(thumbnailCache[thumbIndex]);
            }
        }
    }

    private void generateThumbnails() {
        if (player == null) return;

        long duration = player.getDuration();
        int numThumbnails = (int) (duration / THUMB_INTERVAL_MS) + 1;
        thumbnailCache = new Bitmap[numThumbnails];

        // Start a background thread to generate thumbnails
        new Thread(() -> {
            MediaMetadataRetriever retriever = new MediaMetadataRetriever();
            try {
                // Set data source with headers
                if (headers != null && !headers.isEmpty()) {
                    retriever.setDataSource(videoUrl, new HashMap<>(headers));
                } else {
                    retriever.setDataSource(videoUrl);
                }

                // Generate thumbnails at regular intervals
                for (int i = 0; i < numThumbnails; i++) {
                    long timeUs = i * THUMB_INTERVAL_MS * 1000L; // Convert to microseconds
                    
                    // Extract frame
                    Bitmap frame = retriever.getFrameAtTime(timeUs,
                            MediaMetadataRetriever.OPTION_CLOSEST);
                    
                    if (frame != null) {
                        // Scale the bitmap to the desired thumbnail size
                        thumbnailCache[i] = Bitmap.createScaledBitmap(
                            frame,
                            THUMB_WIDTH,
                            THUMB_HEIGHT,
                            true
                        );
                        frame.recycle(); // Recycle the original frame
                    }

                    // Update preview if it's currently showing this position
                    final int index = i;
                    runOnUiThread(() -> {
                        if (player != null && Math.abs(player.getCurrentPosition() - (index * THUMB_INTERVAL_MS)) < THUMB_INTERVAL_MS) {
                            previewImage.setImageBitmap(thumbnailCache[index]);
                        }
                    });
                }
            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                try {
                    retriever.release();
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }).start();
    }

    private void updatePlayPauseButton(boolean isPlaying) {
        ImageButton playPauseButton = findViewById(R.id.exo_play_pause);
        if (playPauseButton != null) {
            playPauseButton.setImageResource(isPlaying ? R.drawable.ic_pause : R.drawable.ic_play);
        }
        
        // Show controls when playback state changes
        showControls();
        
        // Show/hide loading overlay based on buffering state
        if (player != null && player.getPlaybackState() == Player.STATE_BUFFERING) {
            loadingOverlay.setVisibility(View.VISIBLE);
        } else {
            loadingOverlay.setVisibility(View.GONE);
        }

        // Update keep screen on flag based on playback state
        if (isPlaying) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        } else {
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }
    }

    private void fetchOpenSubtitles() {
        if (isLoadingSubtitles || videoTitle == null) return;
        
        isLoadingSubtitles = true;
        
        // Create a background thread to fetch subtitles
        new Thread(() -> {
            try {
                // TODO: Implement subtitle fetching using standard HTTP client
                // For example:
                // 1. Create an HTTP client (e.g., OkHttp)
                // 2. Make a request to your subtitle service
                // 3. Parse the response and create SubtitleConfiguration objects
                // 4. Update the player with new subtitles
                
                // For now, just reset the loading flag
                isLoadingSubtitles = false;
                
            } catch (Exception e) {
                e.printStackTrace();
                isLoadingSubtitles = false;
            }
        }).start();
    }
}