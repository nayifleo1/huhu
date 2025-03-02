import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';

const EmbedPlayer = () => {
    const [searchParams] = useSearchParams();
    const embedUrl = searchParams.get('embedUrl');
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        // Lock screen orientation to landscape
        const lockOrientation = async () => {
            try {
                // Try using the Screen Orientation API
                if ('orientation' in screen) {
                    const screenOrientation = (screen as any).orientation;
                    if (screenOrientation.lock) {
                        await screenOrientation.lock('landscape');
                    }
                }
                // Fallback to older orientation API
                else if ('lockOrientation' in screen) {
                    (screen as any).lockOrientation('landscape');
                } else if ('mozLockOrientation' in screen) {
                    (screen as any).mozLockOrientation('landscape');
                } else if ('msLockOrientation' in screen) {
                    (screen as any).msLockOrientation('landscape');
                }
            } catch (err) {
                console.warn('Failed to lock screen orientation:', err);
            }
        };

        lockOrientation();

        // Set document referrer through meta tag
        const metaReferrer = document.createElement('meta');
        metaReferrer.name = 'referrer';
        metaReferrer.content = 'no-referrer';
        document.head.appendChild(metaReferrer);

        // Add CSS to block common ad elements and make player fullscreen
        const style = document.createElement('style');
        style.textContent = `
            /* Hide common ad indicators */
            iframe[style*="z-index:"] {
                display: none !important;
            }
            div[style*="z-index: 999999"] {
                display: none !important;
            }
            div[class*="popup"], div[id*="popup"],
            div[class*="banner"], div[id*="banner"],
            div[class*="ad-"], div[id*="ad-"],
            div[class*="ads-"], div[id*="ads-"] {
                display: none !important;
            }
            /* Make body and html fullscreen */
            html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                overflow: hidden !important;
                background: #000 !important;
            }
            /* Hide navigation bars */
            nav, .navbar, .bottom-nav, .navigation {
                display: none !important;
            }
            /* Force landscape orientation */
            @media screen and (orientation: portrait) {
                body {
                    width: 100vh !important;
                    height: 100vw !important;
                    transform: rotate(90deg);
                    transform-origin: left top;
                    position: absolute;
                    top: 0;
                    left: 100%;
                }
                #root {
                    width: 100vh !important;
                    height: 100vw !important;
                }
                .MuiBox-root {
                    width: 100vh !important;
                    height: 100vw !important;
                }
            }
        `;
        document.head.appendChild(style);

        // Request fullscreen on mobile devices
        const requestFullscreen = () => {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            }
        };

        // Add fullscreen request on user interaction
        const handleInteraction = () => {
            requestFullscreen();
            lockOrientation();
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
        };

        document.addEventListener('click', handleInteraction);
        document.addEventListener('touchstart', handleInteraction);

        return () => {
            // Unlock screen orientation when component unmounts
            try {
                if ('orientation' in screen) {
                    const screenOrientation = (screen as any).orientation;
                    if (screenOrientation.unlock) {
                        screenOrientation.unlock();
                    }
                }
            } catch (err) {
                console.warn('Failed to unlock screen orientation:', err);
            }
            document.head.removeChild(metaReferrer);
            document.head.removeChild(style);
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
        };
    }, []);

    if (!embedUrl) {
        return null;
    }

    // Add our own parameters to potentially disable ads
    const modifiedUrl = new URL(embedUrl);
    modifiedUrl.searchParams.set('autoplay', '1');
    modifiedUrl.searchParams.set('hideAds', 'true');
    modifiedUrl.searchParams.set('sandbox', 'true');

    return (
        <Box
            sx={{
                width: '100vw',
                height: '100vh',
                bgcolor: '#000',
                position: 'fixed',
                top: 0,
                left: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                '@media screen and (orientation: portrait)': {
                    width: '100vh !important',
                    height: '100vw !important',
                },
                '& iframe': {
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    '@media screen and (orientation: portrait)': {
                        width: '100vh !important',
                        height: '100vw !important',
                    }
                }
            }}
        >
            <iframe
                ref={iframeRef}
                src={modifiedUrl.toString()}
                allowFullScreen
                allow="fullscreen; autoplay; encrypted-media; picture-in-picture; screen-orientation"
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none'
                }}
            />
        </Box>
    );
};

export default EmbedPlayer; 