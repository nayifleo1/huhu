import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import Hls from 'hls.js';

const Player = () => {
    const [searchParams] = useSearchParams();
    const streamUrl = searchParams.get('streamUrl');
    const headersParam = searchParams.get('headers');
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let headers = {};
        if (headersParam) {
            try {
                headers = JSON.parse(headersParam);
            } catch (error) {
                console.error('Error parsing headers:', error);
            }
        }

        const initPlayer = () => {
            if (!videoRef.current || !streamUrl) return;

            if (hlsRef.current) {
                hlsRef.current.destroy();
            }

            if (streamUrl.includes('.m3u8')) {
                // Handle HLS streams
                if (Hls.isSupported()) {
                    const hls = new Hls({
                        xhrSetup: (xhr) => {
                            Object.entries(headers).forEach(([key, value]) => {
                                xhr.setRequestHeader(key, value as string);
                            });
                        }
                    });
                    hlsRef.current = hls;

                    hls.loadSource(streamUrl);
                    hls.attachMedia(videoRef.current);
                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        videoRef.current?.play();
                        setLoading(false);
                    });

                    hls.on(Hls.Events.ERROR, (_event, data) => {
                        console.error('HLS error:', data);
                        if (data.fatal) {
                            switch (data.type) {
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    hls.startLoad();
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    hls.recoverMediaError();
                                    break;
                                default:
                                    initPlayer();
                                    break;
                            }
                        }
                    });
                } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
                    // Fallback to native HLS support (Safari)
                    videoRef.current.src = streamUrl;
                    videoRef.current.addEventListener('loadedmetadata', () => {
                        videoRef.current?.play();
                        setLoading(false);
                    });
                }
            } else {
                // Handle regular video streams
                videoRef.current.src = streamUrl;
                videoRef.current.addEventListener('loadedmetadata', () => {
                    videoRef.current?.play();
                    setLoading(false);
                });
            }
        };

        initPlayer();

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, [streamUrl, headersParam]);

    if (!streamUrl) {
        return (
            <Box sx={{ p: 3 }}>
                <h1>Error: No stream URL provided</h1>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', height: '100vh', bgcolor: 'black', position: 'relative' }}>
            <video
                ref={videoRef}
                style={{ width: '100%', height: '100%' }}
                controls
                autoPlay
            />
            {loading && (
                <Box 
                    sx={{ 
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    <CircularProgress />
                </Box>
            )}
        </Box>
    );
};

export default Player;