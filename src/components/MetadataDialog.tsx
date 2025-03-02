import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Chip,
    Rating,
    CircularProgress,
    IconButton,
    Button,
    Container,
    alpha,
    useTheme,
    Fade,
    Tabs,
    Tab
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import SurroundSoundIcon from '@mui/icons-material/SurroundSound';
import FourKIcon from '@mui/icons-material/FourK';
import MovieIcon from '@mui/icons-material/Movie';
import BrightnessHighIcon from '@mui/icons-material/BrightnessHigh';
import { catalogService } from '../services/catalogService';
import StremioService from '../services/stremioService';
import { useNavigate, useParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import ExoPlayer from '../plugins/ExoPlayerPlugin';

interface Stream {
    name?: string;
    title?: string;
    url: string;
    behaviorHints?: {
        notWebReady?: boolean;
        headers?: Record<string, string>;
        isRealDebridCached?: boolean;
    };
    addonId?: string;
    addonName?: string;
}

interface GroupedStreams {
    [addonId: string]: {
        addonName: string;
        streams: Stream[];
    };
}

interface SeasonData {
    season: number;
    episodes: {
        number: number;
        title?: string;
        description?: string;
        released?: string;
        thumbnail?: string;
    }[];
}

const MetadataDialog = () => {
    const { type = '', id = '' } = useParams<{ type: string; id: string }>();
    const theme = useTheme();
    const navigate = useNavigate();
    const [metadata, setMetadata] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [groupedStreams, setGroupedStreams] = useState<GroupedStreams>({});
    const [loadingStreams, setLoadingStreams] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState<number>(1);
    const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
    const [seasons, setSeasons] = useState<SeasonData[]>([]);
    const [showStreamPanel, setShowStreamPanel] = useState(false);
    const stremioService = StremioService.getInstance();

    useEffect(() => {
        if (type && id) {
            loadMetadata();
        }
    }, [type, id]);

    useEffect(() => {
        if (metadata) {
            if (type === 'series' && selectedSeason !== undefined && selectedEpisode !== undefined) {
                loadStreams(selectedSeason, selectedEpisode);
            } else if (type !== 'series') {
                loadStreams();
            }
        }
    }, [metadata, selectedSeason, selectedEpisode]);

    useEffect(() => {
        if (type === 'series' && metadata && metadata.videos?.length > 0) {
            const loadAllSeasons = async () => {
                const seasonPromises = (metadata.videos as Array<{ season: number }>).map(video => 
                    catalogService.getSeasonDetails(id, video.season)
                );
                
                try {
                    const seasonDetails = await Promise.all(seasonPromises);
                    const validSeasons = seasonDetails.filter(season => season !== null);
                    setSeasons(validSeasons);
                    
                    // Set initial season and episode
                    if (validSeasons.length > 0) {
                        setSelectedSeason(validSeasons[0].season);
                        if (validSeasons[0].episodes?.length > 0) {
                            setSelectedEpisode(validSeasons[0].episodes[0].number);
                        }
                    }
                } catch (error) {
                    console.error('Error loading season details:', error);
                }
            };
            
            loadAllSeasons();
        }
    }, [type, id, metadata]);

    const loadMetadata = async () => {
        if (!type || !id) return;
        setLoading(true);
        try {
            const data = await catalogService.getMetadata(type, id);
            if (!data) {
                console.error('No metadata returned');
                return;
            }
            setMetadata(data);
            
            if (type === 'series' && data.videos?.length > 0) {
                // Get season details for the first valid season
                const firstVideo = data.videos[0] as { season: number };
                const seasonDetails = await catalogService.getSeasonDetails(id, firstVideo.season);
                if (seasonDetails) {
                    setSeasons([seasonDetails]);
                    setSelectedSeason(seasonDetails.season);
                    if (seasonDetails.episodes?.length > 0) {
                        setSelectedEpisode(seasonDetails.episodes[0].number);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading metadata:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStreams = async (season?: number, episode?: number) => {
        setLoadingStreams(true);
        try {
            console.log('Loading streams with params:', { type, id, season, episode });
            console.log('Metadata:', metadata);

            // Initialize empty streams array
            let allStreams: Stream[] = [];
            const updateStreams = (newStreams: Stream[]) => {
                allStreams = [...allStreams, ...newStreams];
                const grouped = allStreams.reduce<GroupedStreams>((acc, stream) => {
                    if (stream.addonId && stream.addonName) {
                        if (!acc[stream.addonId]) {
                            acc[stream.addonId] = {
                                addonName: stream.addonName,
                                streams: []
                            };
                        }
                        acc[stream.addonId].streams.push(stream);
                    }
                    return acc;
                }, {});

                // Sort groups to show non-torrent sources first
                const sortedGrouped = Object.entries(grouped)
                    .sort(([a], [b]) => {
                        // Railway and VidSrc first, then others
                        if (a === 'railway' || a === 'vidsrc') return -1;
                        if (b === 'railway' || b === 'vidsrc') return 1;
                        return 0;
                    })
                    .reduce((acc, [key, value]) => {
                        acc[key] = value;
                        return acc;
                    }, {} as GroupedStreams);

                setGroupedStreams(sortedGrouped);
            };

            const fetchWithRetry = async (url: string, apiName: string, maxRetries = 3, retryDelay = 1000) => {
                let lastError;
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        console.log(`${apiName} attempt ${attempt}/${maxRetries}`);
                        const response = await fetch(url, {
                            method: 'GET',
                            mode: 'cors',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json'
                            }
                        });

                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }

                        const data = await response.json();
                        if (!data?.sources || data.sources.length === 0) {
                            console.log(`${apiName}: No sources found in attempt ${attempt}`);
                            if (attempt < maxRetries) {
                                await new Promise(resolve => setTimeout(resolve, retryDelay));
                                continue;
                            }
                            return null;
                        }
                        return data;
                    } catch (error) {
                        console.error(`${apiName} error in attempt ${attempt}:`, error);
                        lastError = error;
                        if (attempt < maxRetries) {
                            await new Promise(resolve => setTimeout(resolve, retryDelay));
                        }
                    }
                }
                throw lastError;
            };

            // Start all fetches immediately and handle them independently
            const fetchRailway = async () => {
                try {
                    const railwayUrl = `https://nice-month-production.up.railway.app/embedsu/${metadata?.id || id}${type === 'series' && season !== undefined && episode !== undefined ? `?s=${season}&e=${episode}` : ''}`;
                    console.log('Fetching from Railway:', railwayUrl);
                    
                    const railwayData = await fetchWithRetry(railwayUrl, 'Railway');
                    if (railwayData?.sources) {
                        const railwayStreams = railwayData.sources.flatMap((source: any) => {
                            if (!source.files) return [];
                            return source.files.map((file: any) => ({
                                name: `${source.provider} ${file.quality}`,
                                title: `${source.provider} Stream (${file.quality} ${file.lang.toUpperCase()})`,
                                url: file.file,
                                behaviorHints: {
                                    notWebReady: false,
                                    headers: source.headers || {}
                                },
                                addonId: 'railway',
                                addonName: 'Railway',
                            } as Stream));
                        });
                        
                        console.log('Processed Railway streams:', railwayStreams);
                        if (railwayStreams.length > 0) {
                            updateStreams(railwayStreams);
                        }
                    }
                } catch (error) {
                    console.error('Railway API error:', error);
                }
            };

            const fetchVidSrc = async () => {
                try {
                    const vidsrcUrl = `https://vidsrc-api-js-phz6.onrender.com/embedsu/${metadata?.id || id}${type === 'series' && season !== undefined && episode !== undefined ? `?s=${season}&e=${episode}` : ''}`;
                    console.log('Fetching from VidSrc:', vidsrcUrl);
                    
                    const vidsrcData = await fetchWithRetry(vidsrcUrl, 'VidSrc');
                    if (vidsrcData?.sources) {
                        const vidsrcStreams = vidsrcData.sources.flatMap((source: any) => {
                            if (!source.files) return [];
                            return source.files.map((file: any) => ({
                                name: `VidSrc ${file.quality}`,
                                title: `VidSrc Stream (${file.quality} ${file.lang || 'Unknown'})`,
                                url: file.file,
                                behaviorHints: {
                                    notWebReady: false,
                                    headers: source.headers || {}
                                },
                                addonId: 'vidsrc',
                                addonName: 'VidSrc',
                            } as Stream));
                        });
                        
                        console.log('Processed VidSrc streams:', vidsrcStreams);
                        if (vidsrcStreams.length > 0) {
                            updateStreams(vidsrcStreams);
                        }
                    }
                } catch (error) {
                    console.error('VidSrc API error:', error);
                }
            };

            const fetchStremio = async () => {
                try {
                    const streamingId = metadata?.imdb_id || id;
                    let streamId = streamingId;
                    if (type === 'series' && season !== undefined && episode !== undefined) {
                        streamId = `${streamingId}:${season}:${episode}`;
                    }

                    const stremioResponses = await stremioService.getStreams(type, streamId);
                    const stremioStreams = stremioResponses.flatMap(response => response.streams || []);
                    console.log('Stremio streams:', stremioStreams);
                    if (stremioStreams.length > 0) {
                        updateStreams(stremioStreams);
                    }
                } catch (error) {
                    console.error('Stremio API error:', error);
                }
            };

            // Start all fetches immediately without waiting
            fetchRailway();
            fetchVidSrc();
            fetchStremio();

            // Set loading to false after a reasonable timeout
            setTimeout(() => {
                setLoadingStreams(false);
            }, 2000); // Show loading for at least 2 seconds to avoid UI flicker

        } catch (error) {
            console.error('Error loading streams:', error);
            setLoadingStreams(false);
        }
    };

    const handleStreamClick = async (stream: Stream) => {
        if (stream.behaviorHints?.notWebReady) {
            const isVideoFile = stream.url.match(/\.(mkv|mp4|avi|mov|wmv)$/i);
            const isTorrent = stream.url.startsWith('magnet:') || stream.url.endsWith('.torrent');
            
            let message = 'This stream cannot be played directly in the web player because:\n';
            if (isTorrent) {
                message += '- It is a torrent file that requires a torrent client\n';
            } else if (isVideoFile) {
                message += '- The video format or codec is not supported by web browsers\n';
            } else {
                message += '- The format is not compatible with web playback\n';
            }
            
            message += '\nYou have these options:\n';
            message += '1. Open in Stremio Desktop App\n';
            message += '2. Download and play locally\n';
            message += '3. Use a compatible streaming addon';

            const shouldProceed = window.confirm(message);
            
            if (shouldProceed) {
                window.open(stream.url, '_blank');
            }
            return;
        }

        // Use ExoPlayer on Android, web player on other platforms
        if (Capacitor.getPlatform() === 'android') {
            try {
                await ExoPlayer.play({
                    url: stream.url,
                    title: stream.title || stream.name || 'Video',
                    headers: stream.behaviorHints?.headers
                });
            } catch (error) {
                console.error('Error playing video with ExoPlayer:', error);
                // Fallback to web player if ExoPlayer fails
                navigate(`/play/${type}/${id}?streamUrl=${encodeURIComponent(stream.url)}${stream.behaviorHints?.headers ? `&headers=${encodeURIComponent(JSON.stringify(stream.behaviorHints.headers))}` : ''}`);
            }
        } else {
            // Use web player for other platforms
            navigate(`/play/${type}/${id}?streamUrl=${encodeURIComponent(stream.url)}${stream.behaviorHints?.headers ? `&headers=${encodeURIComponent(JSON.stringify(stream.behaviorHints.headers))}` : ''}`);
        }
    };

    const getStreamQualityInfo = (stream: Stream) => {
        const qualities = {
            '4K': ['2160p', '4k', 'uhd'],
            'FHD': ['1080p', 'fhd'],
            'HD': ['720p', 'hd'],
            'SD': ['480p', '360p', 'sd']
        };

        const title = stream.title?.toLowerCase() || '';
        for (const [quality, terms] of Object.entries(qualities)) {
            if (terms.some(term => title.includes(term))) {
                return quality;
            }
        }
        return null;
    };

    const getHDRInfo = (stream: Stream) => {
        const formats = {
            'Dolby Vision': ['dolby.?vision', 'dovi', 'dv'],
            'HDR10+': ['hdr10\\+', 'hdr\\+'],
            'HDR': ['hdr'],
            'HDR HLG': ['hlg']
        };

        const title = stream.title?.toLowerCase() || '';
        for (const [format, terms] of Object.entries(formats)) {
            if (terms.some(term => title.match(new RegExp(term)))) {
                return format;
            }
        }
        return null;
    };

    const getAudioInfo = (stream: Stream) => {
        const formats = {
            'Dolby Atmos': ['atmos'],
            'Dolby TrueHD': ['truehd'],
            'DTS:X': ['dts.?x'],
            'DTS-HD MA': ['dts.?hd.?ma', 'dts.?hd'],
            'Dolby Digital+': ['dd\\+', 'ddp', 'eac3'],
            'Dolby Digital': ['dd', 'ac3'],
            'DTS': ['dts(?!.?hd|.?x)'],
            'AAC': ['aac']
        };

        const title = stream.title?.toLowerCase() || '';
        const detectedFormats = [];
        
        for (const [format, terms] of Object.entries(formats)) {
            if (terms.some(term => title.match(new RegExp(term)))) {
                detectedFormats.push(format);
            }
        }
        return detectedFormats;
    };

    const getCodecInfo = (stream: Stream) => {
        const codecs = {
            'HEVC': ['hevc', 'h265', 'x265'],
            'AVC': ['avc', 'h264', 'x264'],
            'AV1': ['av1']
        };

        const title = stream.title?.toLowerCase() || '';
        for (const [codec, terms] of Object.entries(codecs)) {
            if (terms.some(term => title.includes(term))) {
                return codec;
            }
        }
        return null;
    };

    const isRealDebridCached = (stream: Stream) => {
        // First check behaviorHints
        if (stream.behaviorHints?.isRealDebridCached) {
            return true;
        }
        // Fallback to title check
        const streamTitle = (stream.title || stream.name || '').toLowerCase();
        return streamTitle.includes('[rd+]') || 
               streamTitle.includes('[rd]') || 
               streamTitle.includes('rd+') ||
               (streamTitle.includes('cached') && streamTitle.includes('rd'));
    };

    const QualityChip = ({ icon, label, color = 'primary' }: { icon: React.ReactNode; label: string | null; color?: 'primary' | 'secondary' | 'warning' }) => {
        if (!label) return null;
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    bgcolor: alpha(theme.palette[color].main, 0.1),
                    color: theme.palette[color].light,
                    py: { xs: 0.25, sm: 0.5 },
                    px: { xs: 0.75, sm: 1 },
                    borderRadius: 1,
                    border: `1px solid ${alpha(theme.palette[color].main, 0.2)}`,
                    fontSize: { xs: '0.75rem', sm: '0.85rem' },
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                }}
            >
                {icon}
                <Typography sx={{ 
                    fontSize: 'inherit', 
                    fontWeight: 'inherit',
                    display: { xs: label.length > 10 ? 'none' : 'block', sm: 'block' }
                }}>
                    {label}
                </Typography>
            </Box>
        );
    };

    const getStreamSourceInfo = (stream: Stream) => {
        const sources = {
            'WEB-DL': ['web-dl', 'webrip', 'web'],
            'BluRay': ['bluray', 'bdrip', 'brrip'],
            'HDTV': ['hdtv'],
            'DVDRip': ['dvdrip', 'dvd']
        };

        const title = stream.title?.toLowerCase() || '';
        for (const [source, terms] of Object.entries(sources)) {
            if (terms.some(term => title.includes(term))) {
                return source;
            }
        }
        return '';
    };

    const renderStreamCard = (stream: Stream) => {
        const quality = getStreamQualityInfo(stream);
        const source = getStreamSourceInfo(stream);
        const size = stream.title?.match(/💾\s*([\d.]+\s*[GM]B)/)?.[1] || '';
        
        // Format the stream title to include RD+ prefix if needed
        const displayTitle = stream.addonId === 'com.stremio.torrentio.addon' ? 
            stream.title || stream.name || 'Unnamed Stream' :
            stream.name || stream.title || 'Unnamed Stream';
        
        return (
            <Box 
                sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    bgcolor: alpha(theme.palette.background.paper, 0.1),
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${alpha('#fff', 0.1)}`,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: `0 20px 40px ${alpha('#000', 0.4)}`,
                        borderColor: alpha(theme.palette.primary.main, 0.4),
                        '& .stream-play-button': {
                            transform: 'translateY(0)',
                            opacity: 1
                        }
                    }
                }}
            >
                <Box 
                    sx={{ 
                        p: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        position: 'relative'
                    }}
                >
                    <Typography 
                        sx={{ 
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '1.1rem',
                            mb: 2,
                            lineHeight: 1.4,
                            flexGrow: 1,
                            ...(stream.addonId === 'com.stremio.torrentio.addon' ? {
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontFamily: 'monospace'
                            } : {
                                whiteSpace: 'normal',
                                wordBreak: 'break-word'
                            })
                        }}
                    >
                        {displayTitle}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                        {isRealDebridCached(stream) && (
                            <Chip
                                label="RD+"
                                size="small"
                                sx={{
                                    bgcolor: alpha('#388e3c', 0.2),
                                    color: '#4caf50',
                                    fontWeight: 'bold',
                                    border: '1px solid rgba(76, 175, 80, 0.3)'
                                }}
                            />
                        )}
                        {quality && (
                            <Chip
                                label={quality}
                                size="small"
                                sx={{
                                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                                    color: theme.palette.primary.light,
                                    fontWeight: 600,
                                    borderRadius: 1,
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                                }}
                            />
                        )}
                        {source && (
                            <Chip
                                label={source}
                                size="small"
                                sx={{
                                    bgcolor: alpha(theme.palette.secondary.main, 0.15),
                                    color: theme.palette.secondary.light,
                                    fontWeight: 600,
                                    borderRadius: 1,
                                    border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`
                                }}
                            />
                        )}
                        {size && (
                            <Chip
                                label={size}
                                size="small"
                                sx={{
                                    bgcolor: alpha('#fff', 0.08),
                                    color: alpha('#fff', 0.9),
                                    fontWeight: 600,
                                    borderRadius: 1,
                                    border: `1px solid ${alpha('#fff', 0.15)}`
                                }}
                            />
                        )}
                        {stream.behaviorHints?.notWebReady && (
                            <Chip
                                label="External Player"
                                size="small"
                                sx={{
                                    bgcolor: alpha(theme.palette.warning.main, 0.15),
                                    color: theme.palette.warning.light,
                                    fontWeight: 600,
                                    borderRadius: 1,
                                    border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
                                }}
                            />
                        )}
                    </Box>
                    
                    <Button
                        className="stream-play-button"
                        fullWidth
                        variant="contained"
                        startIcon={stream.behaviorHints?.notWebReady ? <DownloadIcon /> : <PlayArrowIcon />}
                        onClick={() => handleStreamClick(stream)}
                        sx={{
                            bgcolor: stream.behaviorHints?.notWebReady ? 
                                alpha(theme.palette.warning.main, 0.2) : 
                                'linear-gradient(45deg, #1976d2, #2196f3)',
                            color: '#fff',
                            '&:hover': {
                                bgcolor: stream.behaviorHints?.notWebReady ?
                                    alpha(theme.palette.warning.main, 0.3) :
                                    'linear-gradient(45deg, #1565c0, #1976d2)',
                                transform: 'scale(1.02)'
                            },
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            py: 1.5,
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '1rem',
                            borderRadius: 2,
                            boxShadow: stream.behaviorHints?.notWebReady ? 
                                'none' : 
                                '0 8px 24px rgba(33, 150, 243, 0.3)'
                        }}
                    >
                        {stream.behaviorHints?.notWebReady ? 'Download' : 'Play Stream'}
                    </Button>
                </Box>
            </Box>
        );
    };

    const renderSeasonSelector = () => {
        if (type !== 'series' || !seasons.length) return null;

        return (
            <Box sx={{ width: '100%' }}>
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    mb: 3,
                    gap: 2,
                    flexWrap: 'wrap'
                }}>
                    <Typography 
                        variant="h4" 
                        sx={{ 
                            fontWeight: 700,
                            background: 'linear-gradient(to right, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}
                    >
                        Episodes
                    </Typography>
                    
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        bgcolor: alpha('#fff', 0.03),
                        borderRadius: 2,
                        p: 0.5
                    }}>
                        <Tabs 
                            value={selectedSeason}
                            onChange={(_, newValue) => setSelectedSeason(newValue)}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{
                                minHeight: 40,
                                '& .MuiTab-root': {
                                    color: alpha('#fff', 0.7),
                                    minHeight: 40,
                                    fontSize: '0.9rem',
                                    px: 2,
                                    '&.Mui-selected': {
                                        color: '#fff'
                                    }
                                },
                                '& .MuiTabs-indicator': {
                                    bgcolor: theme.palette.primary.main
                                }
                            }}
                        >
                            {seasons.map((season) => (
                                <Tab 
                                    key={season.season}
                                    label={`Season ${season.season}`}
                                    value={season.season}
                                />
                            ))}
                        </Tabs>
                    </Box>
                </Box>

                <Box sx={{ mt: 4 }}>
                    {seasons
                        .find(s => s.season === selectedSeason)
                        ?.episodes.map((episode) => (
                            <Box
                                key={episode.number}
                                onClick={() => {
                                    setSelectedEpisode(episode.number);
                                    setShowStreamPanel(true);
                                }}
                                sx={{
                                    mb: 3,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateX(8px)'
                                    }
                                }}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        gap: 3,
                                        p: 2,
                                        borderRadius: 2,
                                        bgcolor: selectedEpisode === episode.number ? 
                                            alpha(theme.palette.primary.main, 0.15) : 
                                            alpha('#fff', 0.03),
                                        border: `1px solid ${selectedEpisode === episode.number ? 
                                            alpha(theme.palette.primary.main, 0.3) : 
                                            alpha('#fff', 0.1)}`,
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                            bgcolor: selectedEpisode === episode.number ?
                                                alpha(theme.palette.primary.main, 0.2) :
                                                alpha('#fff', 0.06)
                                        }
                                    }}
                                >
                                    <Box sx={{ 
                                        position: 'relative',
                                        width: { xs: 200, sm: 300 },
                                        height: { xs: 113, sm: 169 },
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                        bgcolor: alpha('#fff', 0.1)
                                    }}>
                                        {episode.thumbnail ? (
                                            <img
                                                src={episode.thumbnail}
                                                alt={`Episode ${episode.number}`}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        ) : (
                                            <Box
                                                sx={{
                                                    width: '100%',
                                                    height: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    bgcolor: alpha('#fff', 0.03)
                                                }}
                                            >
                                                <Typography sx={{ color: alpha('#fff', 0.3) }}>
                                                    No Preview
                                                </Typography>
                                            </Box>
                                        )}
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                background: selectedEpisode === episode.number ?
                                                    'linear-gradient(0deg, rgba(20, 184, 166, 0.1) 0%, transparent 100%)' :
                                                    'linear-gradient(0deg, rgba(0, 0, 0, 0.3) 0%, transparent 100%)',
                                                transition: 'all 0.2s ease-in-out'
                                            }}
                                        />
                                        <Typography
                                            sx={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                color: '#fff',
                                                fontSize: '3rem',
                                                fontWeight: 700,
                                                opacity: 0.15
                                            }}
                                        >
                                            {episode.number}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ flex: 1, py: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                            <Box>
                                                <Typography 
                                                    sx={{ 
                                                        color: '#fff',
                                                        fontWeight: 600,
                                                        fontSize: '1.2rem',
                                                        mb: 0.5,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1
                                                    }}
                                                >
                                                    {episode.title || `Episode ${episode.number}`}
                                                </Typography>
                                                <Typography 
                                                    sx={{ 
                                                        color: alpha('#fff', 0.7),
                                                        fontSize: '0.9rem',
                                                        mb: 1
                                                    }}
                                                >
                                                    Episode {episode.number}
                                                    {episode.released && ` • ${new Date(episode.released).toLocaleDateString()}`}
                                                </Typography>
                                            </Box>
                                            {selectedEpisode === episode.number && (
                                                <Box
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                                                        color: theme.palette.primary.main
                                                    }}
                                                >
                                                    <PlayArrowIcon />
                                                </Box>
                                            )}
                                        </Box>
                                        
                                        {episode.description && (
                                            <Typography 
                                                sx={{ 
                                                    color: alpha('#fff', 0.7),
                                                    fontSize: '0.95rem',
                                                    lineHeight: 1.5,
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 3,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden'
                                                }}
                                            >
                                                {episode.description}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        ))}
                </Box>
            </Box>
        );
    };

    const renderStreamPanel = () => {
        if (!showStreamPanel) return null;

        return (
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: { xs: '100%', md: '40%' },
                    height: '100vh',
                    bgcolor: 'rgba(0, 0, 0, 0.95)',
                    backdropFilter: 'blur(20px)',
                    borderLeft: `1px solid ${alpha('#fff', 0.1)}`,
                    zIndex: 1300,
                    overflowY: 'auto',
                    transform: showStreamPanel ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.3s ease-in-out',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <Box sx={{ 
                    p: 3, 
                    borderBottom: `1px solid ${alpha('#fff', 0.1)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <Box>
                        <Typography sx={{ 
                            color: '#fff',
                            fontSize: '1.2rem',
                            fontWeight: 600,
                            mb: 0.5
                        }}>
                            Season {selectedSeason} Episode {selectedEpisode}
                        </Typography>
                    </Box>
                    <IconButton 
                        onClick={() => setShowStreamPanel(false)}
                        sx={{ 
                            color: '#fff',
                            '&:hover': { bgcolor: alpha('#fff', 0.1) }
                        }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                </Box>

                <Box sx={{ flex: 1, p: 3 }}>
                    {loadingStreams ? (
                        <Box 
                            display="flex" 
                            justifyContent="center" 
                            alignItems="center" 
                            flexDirection="column"
                            gap={3}
                            sx={{ height: '100%' }}
                        >
                            <CircularProgress />
                            <Typography sx={{ color: alpha('#fff', 0.7) }}>
                                Loading available streams...
                            </Typography>
                        </Box>
                    ) : Object.keys(groupedStreams).length > 0 ? (
                        <Box>
                            {Object.entries(groupedStreams).map(([addonId, { addonName, streams }]) => (
                                <Box key={addonId} sx={{ mb: 4 }}>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center',
                                        mb: 2
                                    }}>
                                        <Box
                                            sx={{
                                                width: 4,
                                                height: 20,
                                                background: 'linear-gradient(180deg, #14b8a6, #0d9488)',
                                                borderRadius: 1,
                                                mr: 2
                                            }}
                                        />
                                        <Typography 
                                            variant="h6" 
                                            sx={{ 
                                                fontWeight: 600,
                                                color: '#fff'
                                            }}
                                        >
                                            {addonName}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        {streams.map((stream) => {
                                            const quality = getStreamQualityInfo(stream);
                                            const size = stream.title?.match(/💾\s*([\d.]+\s*[GM]B)/)?.[1] || '';
                                            
                                            return (
                                                <Box
                                                    key={stream.url}
                                                    onClick={() => handleStreamClick(stream)}
                                                    sx={{
                                                        mb: 2,
                                                        p: 2,
                                                        borderRadius: 2,
                                                        bgcolor: alpha('#fff', 0.03),
                                                        border: `1px solid ${alpha('#fff', 0.1)}`,
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease-in-out',
                                                        '&:hover': {
                                                            bgcolor: alpha('#fff', 0.06),
                                                            borderColor: alpha(theme.palette.primary.main, 0.3),
                                                            transform: 'translateY(-2px)'
                                                        }
                                                    }}
                                                >
                                                    <Box sx={{ 
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 2
                                                    }}>
                                                        <Box 
                                                            sx={{ 
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: 40,
                                                                height: 40,
                                                                borderRadius: 1,
                                                                bgcolor: stream.behaviorHints?.notWebReady ? 
                                                                    alpha(theme.palette.warning.main, 0.1) : 
                                                                    alpha(theme.palette.primary.main, 0.1),
                                                                color: stream.behaviorHints?.notWebReady ?
                                                                    theme.palette.warning.main :
                                                                    theme.palette.primary.main
                                                            }}
                                                        >
                                                            {stream.behaviorHints?.notWebReady ? 
                                                                <DownloadIcon /> : 
                                                                <PlayArrowIcon />}
                                                        </Box>
                                                        
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography 
                                                                sx={{ 
                                                                    color: '#fff',
                                                                    fontWeight: 600,
                                                                    mb: 1,
                                                                    lineHeight: 1.4,
                                                                    whiteSpace: 'pre-wrap',
                                                                    wordBreak: 'break-word',
                                                                    fontFamily: stream.addonId === 'com.stremio.torrentio.addon' ? 'monospace' : 'inherit'
                                                                }}
                                                            >
                                                                {stream.title || stream.name || 'Unnamed Stream'}
                                                            </Typography>
                                                            
                                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                                {isRealDebridCached(stream) && (
                                                                    <Chip
                                                                        label="RD+"
                                                                        size="small"
                                                                        sx={{
                                                                            bgcolor: alpha('#388e3c', 0.2),
                                                                            color: '#4caf50',
                                                                            fontWeight: 'bold',
                                                                            border: '1px solid rgba(76, 175, 80, 0.3)'
                                                                        }}
                                                                    />
                                                                )}
                                                                {quality && (
                                                                    <QualityChip 
                                                                        icon={<FourKIcon sx={{ fontSize: '1rem' }} />}
                                                                        label={quality}
                                                                    />
                                                                )}
                                                                {getHDRInfo(stream) && (
                                                                    <QualityChip 
                                                                        icon={<BrightnessHighIcon sx={{ fontSize: '1rem' }} />}
                                                                        label={getHDRInfo(stream)}
                                                                        color="secondary"
                                                                    />
                                                                )}
                                                                {getCodecInfo(stream) && (
                                                                    <QualityChip 
                                                                        icon={<MovieIcon sx={{ fontSize: '1rem' }} />}
                                                                        label={getCodecInfo(stream)}
                                                                    />
                                                                )}
                                                                {getAudioInfo(stream).map((format, index) => (
                                                                    <QualityChip 
                                                                        key={index}
                                                                        icon={<SurroundSoundIcon sx={{ fontSize: '1rem' }} />}
                                                                        label={format}
                                                                        color="warning"
                                                                    />
                                                                ))}
                                                                {size && (
                                                                    <QualityChip 
                                                                        icon={<span>💾</span>}
                                                                        label={size}
                                                                    />
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    ) : (
                        <Box 
                            sx={{ 
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                                p: 4,
                                textAlign: 'center'
                            }}
                        >
                            <Box
                                sx={{
                                    width: 80,
                                    height: 80,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    bgcolor: alpha('#fff', 0.08),
                                    mb: 2
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: '2.5rem',
                                        color: alpha('#fff', 0.5)
                                    }}
                                >
                                    📺
                                </Typography>
                            </Box>
                            <Typography 
                                variant="h6"
                                sx={{ 
                                    color: '#fff',
                                    fontWeight: 600,
                                    mb: 1
                                }}
                            >
                                No Streams Found
                            </Typography>
                            <Typography 
                                sx={{ 
                                    color: alpha('#fff', 0.7),
                                    fontSize: '1.1rem'
                                }}
                            >
                                No streams available for this episode. Try another episode or make sure you have streaming addons installed.
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>
        );
    };

    const renderTabs = () => {
        const itemTabStyles = {
            fontSize: { xs: '0.9rem', sm: '1rem' },
            minWidth: 'auto',
            py: 1.5,
            px: { xs: 2, sm: 3 },
            fontWeight: 600,
            textTransform: 'none',
            color: 'text.secondary',
            '&.Mui-selected': {
                color: 'text.primary',
                fontWeight: 700
            }
        };

        console.log('metadata.cast:', metadata.cast);
        const castList = Array.isArray(metadata.cast) ? metadata.cast.join(', ') : 'No cast available';

        return (
            <Box 
                sx={{ 
                    minHeight: '100vh',
                    background: 'linear-gradient(135deg, #000000 0%, #000000 100%)',
                    position: 'relative',
                    pb: 8
                }}
            >
                {/* Hero Section with Parallax Effect */}
                <Box 
                    sx={{ 
                        position: 'relative',
                        height: { xs: '100vh', md: '75vh' },
                        width: '100%',
                        overflow: 'hidden',
                        mb: 6
                    }}
                >
                    <Fade in timeout={1000}>
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundImage: `url(${metadata.background || metadata.poster})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                filter: 'brightness(0.7)',
                                transform: 'scale(1.1)',
                                transition: 'transform 0.5s ease-out',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: `linear-gradient(0deg, 
                                        rgba(0, 0, 0, 0.95) 0%,
                                        rgba(0, 0, 0, 0.8) 50%,
                                        rgba(0, 0, 0, 0.4) 100%
                                    )`
                                }
                            }}
                        />
                    </Fade>

                    {/* Floating action buttons with glass effect */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 20,
                            left: 20,
                            zIndex: 10,
                            display: 'flex',
                            gap: 2
                        }}
                    >
                        <IconButton
                            onClick={() => navigate(-1)}
                            sx={{
                                bgcolor: alpha('#fff', 0.1),
                                backdropFilter: 'blur(10px)',
                                '&:hover': {
                                    bgcolor: alpha('#fff', 0.2),
                                    transform: 'scale(1.1)'
                                },
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                width: 48,
                                height: 48
                            }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                    </Box>

                    <Container 
                        maxWidth={false}
                        sx={{ 
                            height: '100%',
                            position: 'relative',
                            zIndex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            px: { xs: 2, sm: 4, md: 8 }
                        }}
                    >
                        <Grid container spacing={6} alignItems="center">
                            <Grid item xs={12} md={4} lg={3}>
                                <Fade in timeout={1000}>
                                    <Box
                                        sx={{
                                            position: 'relative',
                                            width: '100%',
                                            maxWidth: { xs: 300, md: '100%' },
                                            margin: '0 auto',
                                            paddingTop: '150%',
                                            borderRadius: 4,
                                            overflow: 'hidden',
                                            boxShadow: '0 20px 80px rgba(0,0,0,0.6)',
                                            transform: 'perspective(1000px) rotateY(-5deg)',
                                            transition: 'all 0.5s ease',
                                            '&:hover': {
                                                transform: 'perspective(1000px) rotateY(0deg) translateY(-10px)',
                                            }
                                        }}
                                    >
                                        <img
                                            src={metadata.poster}
                                            alt={metadata.name}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            }}
                                        />
                                    </Box>
                                </Fade>
                            </Grid>
                            <Grid item xs={12} md={8} lg={9}>
                                <Fade in timeout={1000}>
                                    <Box>
                                        {metadata.genres && (
                                            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                                                {metadata.genres.slice(0, 4).map((genre: string) => (
                                                    <Chip
                                                        key={genre}
                                                        label={genre}
                                                        sx={{
                                                            bgcolor: alpha('#fff', 0.1),
                                                            color: '#fff',
                                                            fontWeight: 600,
                                                            borderRadius: 1,
                                                            px: 1.5
                                                        }}
                                                    />
                                                ))}
                                            </Box>
                                        )}

                                        {metadata.logo ? (
                                            <Box
                                                component="img"
                                                src={metadata.logo}
                                                alt={metadata.name}
                                                sx={{
                                                    mb: 2,
                                                    maxWidth: '100%',
                                                    height: 'auto',
                                                    maxHeight: '120px',
                                                    objectFit: 'contain',
                                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                                                    transition: 'all 0.3s ease',
                                                }}
                                            />
                                        ) : (
                                            <Typography 
                                                variant="h1" 
                                                sx={{ 
                                                    mb: 3,
                                                    fontWeight: 900,
                                                    fontSize: { xs: '2.75rem', sm: '3.75rem', md: '4.5rem' },
                                                    background: 'linear-gradient(to right, #14b8a6 0%, rgba(20, 184, 166, 0.85) 100%)',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    letterSpacing: '-0.02em',
                                                    lineHeight: 1,
                                                    textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                                                    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                                }}
                                            >
                                                {metadata.name}
                                            </Typography>
                                        )}

                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4, alignItems: 'center' }}>
                                            {metadata.releaseInfo && (
                                                <Typography 
                                                    sx={{ 
                                                        color: alpha('#fff', 0.9),
                                                        fontSize: '1.1rem',
                                                        fontWeight: 600,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1
                                                    }}
                                                >
                                                    <span style={{ color: theme.palette.primary.main }}>•</span> {metadata.releaseInfo}
                                                </Typography>
                                            )}
                                            {metadata.runtime && (
                                                <Typography 
                                                    sx={{ 
                                                        color: alpha('#fff', 0.9),
                                                        fontSize: '1.1rem',
                                                        fontWeight: 500,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1
                                                    }}
                                                >
                                                    <span style={{ color: theme.palette.primary.main }}>•</span> {metadata.runtime}
                                                </Typography>
                                            )}
                                            {metadata.imdbRating && (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Rating
                                                        value={parseFloat(metadata.imdbRating) / 2}
                                                        precision={0.1}
                                                        readOnly
                                                        sx={{
                                                            '& .MuiRating-iconFilled': {
                                                                color: '#f5c518'
                                                            }
                                                        }}
                                                    />
                                                    <Typography 
                                                        sx={{ 
                                                            color: '#f5c518',
                                                            fontWeight: 700,
                                                            fontSize: '1.1rem'
                                                        }}
                                                    >
                                                        {metadata.imdbRating}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>

                                        {metadata.description && (
                                            <Typography 
                                                sx={{ 
                                                    color: alpha('#fff', 0.9),
                                                    fontSize: '1.1rem',
                                                    lineHeight: 1.7,
                                                    mb: 4,
                                                    maxWidth: '90%',
                                                    textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                                }}
                                            >
                                                {metadata.description}
                                            </Typography>
                                        )}

                                        {/* People & Credits - horizontal scroll */}
                                        <Box sx={{ mb: 2 }}>
                                            {(metadata.cast || metadata.director) && (
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 2,
                                                        pb: 2
                                                    }}
                                                >
                                                    {metadata.director && (
                                                        <Box>
                                                            <Typography 
                                                                sx={{ 
                                                                    color: alpha('#fff', 0.7),
                                                                    mb: 0.5,
                                                                    fontWeight: 600,
                                                                    fontSize: '0.9rem',
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: 1
                                                                }}
                                                            >
                                                                Director
                                                            </Typography>
                                                            <Typography 
                                                                sx={{ 
                                                                    color: '#fff',
                                                                    fontSize: '1.1rem',
                                                                    fontWeight: 500
                                                                }}
                                                            >
                                                                {metadata.director}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    
                                                    {metadata.cast && (
                                                        <Box>
                                                            <Typography 
                                                                sx={{ 
                                                                    color: alpha('#fff', 0.7),
                                                                    mb: 0.5,
                                                                    fontWeight: 600,
                                                                    fontSize: '0.9rem',
                                                                    textTransform: 'uppercase',
                                                                    letterSpacing: 1
                                                                }}
                                                            >
                                                                Cast
                                                            </Typography>
                                                            <Typography 
                                                                sx={{ 
                                                                    color: '#fff',
                                                                    fontSize: '1.1rem',
                                                                    fontWeight: 500
                                                                }}
                                                            >
                                                                {castList}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                </Fade>
                            </Grid>
                        </Grid>
                    </Container>
                </Box>

                {/* Content Container with Glass Effect */}
                <Container 
                    maxWidth="xl" 
                    sx={{
                        position: 'relative',
                        zIndex: 2,
                        px: { xs: 2, sm: 3, md: 4 }
                    }}
                >
                    {/* Episodes Section */}
                    {type === 'series' && (
                        <Box 
                            sx={{ 
                                mb: 6,
                                p: { xs: 2, sm: 3, md: 4 },
                                borderRadius: { xs: 2, sm: 3, md: 4 },
                                bgcolor: alpha('#fff', 0.03),
                                backdropFilter: 'blur(20px)',
                                border: `1px solid ${alpha('#fff', 0.1)}`
                            }}
                        >
                            {renderSeasonSelector()}
                        </Box>
                    )}
                    
                    {/* Streams Section */}
                    <Box sx={{ mb: 8, width: '100%' }}>
                        <Typography 
                            variant="h4" 
                            sx={{ 
                                mb: 1,
                                fontWeight: 800,
                                fontSize: { xs: '1.5rem', sm: '1.8rem', md: '2.2rem' },
                                color: '#fff',
                                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                            }}
                        >
                            {type === 'series' ? (
                                <>
                                    Season {selectedSeason} Episode {selectedEpisode}
                                </>
                            ) : 'Available Streams'}
                        </Typography>
                        
                        <Typography 
                            sx={{ 
                                color: alpha('#fff', 0.7),
                                mb: { xs: 3, sm: 4 },
                                fontSize: { xs: '1rem', sm: '1.1rem' }
                            }}
                        >
                            Choose a stream to start watching
                        </Typography>

                        {type === 'series' ? (
                            renderStreamPanel()
                        ) : (
                            <Box>
                                {loadingStreams ? (
                                    <Box 
                                        display="flex" 
                                        justifyContent="center" 
                                        alignItems="center" 
                                        flexDirection="column"
                                        gap={3}
                                        sx={{ height: '100%', py: 8 }}
                                    >
                                        <CircularProgress />
                                        <Typography sx={{ color: alpha('#fff', 0.7) }}>
                                            Loading available streams...
                                        </Typography>
                                    </Box>
                                ) : Object.keys(groupedStreams).length > 0 ? (
                                    <Box>
                                        {Object.entries(groupedStreams).map(([addonId, { addonName, streams }]) => (
                                            <Box key={addonId} sx={{ mb: 4 }}>
                                                <Box sx={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center',
                                                    mb: 2
                                                }}>
                                                    <Box
                                                        sx={{
                                                            width: 4,
                                                            height: 20,
                                                            background: 'linear-gradient(180deg, #14b8a6, #0d9488)',
                                                            borderRadius: 1,
                                                            mr: 2
                                                        }}
                                                    />
                                                    <Typography 
                                                        variant="h6" 
                                                        sx={{ 
                                                            fontWeight: 600,
                                                            color: '#fff'
                                                        }}
                                                    >
                                                        {addonName}
                                                    </Typography>
                                                </Box>

                                                <Grid container spacing={2}>
                                                    {streams.map((stream) => (
                                                        <Grid item xs={12} sm={6} md={4} key={stream.url}>
                                                            {renderStreamCard(stream)}
                                                        </Grid>
                                                    ))}
                                                </Grid>
                                            </Box>
                                        ))}
                                    </Box>
                                ) : (
                                    <Box 
                                        sx={{ 
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 2,
                                            p: 4,
                                            textAlign: 'center'
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 80,
                                                height: 80,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '50%',
                                                bgcolor: alpha('#fff', 0.08),
                                                mb: 2
                                            }}
                                        >
                                            <Typography
                                                sx={{
                                                    fontSize: '2.5rem',
                                                    color: alpha('#fff', 0.5)
                                                }}
                                            >
                                                📺
                                            </Typography>
                                        </Box>
                                        <Typography 
                                            variant="h6"
                                            sx={{ 
                                                color: '#fff',
                                                fontWeight: 600,
                                                mb: 1
                                            }}
                                        >
                                            No Streams Found
                                        </Typography>
                                        <Typography 
                                            sx={{ 
                                                color: alpha('#fff', 0.7),
                                                fontSize: '1.1rem'
                                            }}
                                        >
                                            No streams available for this content. Make sure you have streaming addons installed.
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </Box>
                </Container>

                {/* Simple Footer */}
                <Box
                    sx={{
                        bgcolor: alpha('#000', 0.3),
                        py: 3,
                        borderTop: `1px solid ${alpha('#fff', 0.05)}`,
                        position: 'relative',
                        mt: 'auto'
                    }}
                >
                    <Container maxWidth="xl">
                        <Typography
                            sx={{
                                color: alpha('#fff', 0.6),
                                textAlign: 'center',
                                fontSize: '0.9rem'
                            }}
                        >
                            Powered by Stremio • Unofficial Web Player
                        </Typography>
                    </Container>
                </Box>
            </Box>
        );
    };

    if (loading) {
        return (
            <Box 
                sx={{ 
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #000000 0%, #000000 100%)'
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    if (!metadata) {
        return (
            <Box 
                sx={{ 
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #000000 0%, #000000 100%)'
                }}
            >
                <Typography color="error">Failed to load metadata</Typography>
            </Box>
        );
    }

    console.log('metadata.cast:', metadata.cast);

    return renderTabs();
};

export default MetadataDialog;