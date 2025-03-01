import { useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    Chip,
    Rating,
    CircularProgress,
    IconButton,
    Button,
    alpha,
    useTheme,
    Skeleton,
    BottomNavigation,
    BottomNavigationAction,
    Collapse,
    Slide,
    Fade
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import SurroundSoundIcon from '@mui/icons-material/SurroundSound';
import FourKIcon from '@mui/icons-material/FourK';
import BrightnessHighIcon from '@mui/icons-material/BrightnessHigh';
import InfoIcon from '@mui/icons-material/Info';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { catalogService } from '../services/catalogService';
import StremioService from '../services/stremioService';
import { Stream as ExternalStream } from '../types/stremio';
import { useNavigate, useParams } from 'react-router-dom';
import { useScrollHide } from '../contexts/ScrollHideContext';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import ExoPlayer from '../plugins/ExoPlayerPlugin';
import { Preferences } from '@capacitor/preferences';
import ExternalPlayer from '../plugins/ExternalPlayerPlugin';

// Add WebTorrent type declaration at the top of the file
declare global {
    interface Window {
        WebTorrent?: any;
    }
}

interface GroupedStreams {
    [addonId: string]: {
        addonName: string;
        streams: ExternalStream[];
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

interface CastMember {
    id: number;
    name: string;
    character: string;
    profilePath: string;
    order: number;
}

interface Video {
    season: number;
    // Add other properties as needed
}

interface Subtitle {
    url: string;
    lang: string;
}

interface LocalStream extends ExternalStream {
    behaviorHints?: {
        notWebReady?: boolean;
        headers?: Record<string, string>;
        isMagnetStream?: boolean;
        magnetUrl?: string;
        size?: string;
        seeders?: number;
    };
    subtitles?: Subtitle[];
}

interface Metadata {
    id: string;
    imdb_id?: string;
    type: string;
    name: string;
    poster: string | null;
    background: string | null;
    logo: string | null;
    description?: string;
    releaseInfo?: string | number;
    runtime?: string;
    genres?: string[];
    cast?: string[];
    castData?: any[];
    director?: string;
    rating?: string;
    videos?: Array<{
        season: number;
        episode: number;
        title?: string;
        overview?: string;
        thumbnail?: string;
        episodeCount?: number;
        airDate?: string;
    }>;
    numberOfSeasons?: number;
    inProduction?: boolean;
    status?: string;
    lastAirDate?: string;
    nextAirDate?: string;
    episodeInfo?: {
        number: number;
        title?: string;
        description?: string;
        thumbnail?: string;
    };
}

interface StremioManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    url?: string;
    manifest?: {
        name?: string;
    };
}

const MobileMetadataDialog = () => {
    const { type = '', id = '' } = useParams<{ type: string; id: string }>();
    const theme = useTheme();
    const navigate = useNavigate();
    const [metadata, setMetadata] = useState<Metadata | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [groupedStreams, setGroupedStreams] = useState<GroupedStreams>({});
    const [loadingStreams, setLoadingStreams] = useState(false);
    const [selectedSeason, setSelectedSeason] = useState<number>(1);
    const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
    const [seasons, setSeasons] = useState<SeasonData[]>([]);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [showStreamsPage, setShowStreamsPage] = useState(false);
    const prevLocation = useRef<string | null>(null);
    const stremioService = StremioService.getInstance();
    
    // Scroll tracking for back button visibility
    const contentRef = useRef<HTMLDivElement>(null);
    const [lastScrollTop, setLastScrollTop] = useState(0);
    
    const { showNavigation } = useScrollHide();
    
    const [selectedSource, setSelectedSource] = useState<string>('all');
    const [installedAddons, setInstalledAddons] = useState<Record<string, string>>({});

    useEffect(() => {
        const handleScroll = () => {
            if (!contentRef.current) return;
            const scrollTop = contentRef.current.scrollTop;
            setLastScrollTop(scrollTop);
        };
        
        const contentElement = contentRef.current;
        if (contentElement) {
            contentElement.addEventListener('scroll', handleScroll, { passive: true });
        }
        
        return () => {
            if (contentElement) {
                contentElement.removeEventListener('scroll', handleScroll);
            }
        };
    }, [lastScrollTop]);

    useEffect(() => {
        // Store the current location when component mounts
        prevLocation.current = document.referrer;
    }, []);

    // Rest of the existing effects
    useEffect(() => {
        if (type && id) {
            loadMetadata();
        }
    }, [type, id]);

    useEffect(() => {
        if (metadata) {
            const loadStreamsData = async () => {
                if (type === 'series' && selectedSeason !== undefined && selectedEpisode !== undefined) {
                    await loadStreams(selectedSeason, selectedEpisode);
                } else if (type !== 'series') {
                    await loadStreams();
                }
            };
            loadStreamsData();
        }
    }, [metadata, selectedSeason, selectedEpisode]);

    useEffect(() => {
        const loadInstalledAddons = async () => {
            try {
                const addons = await stremioService.getInstalledAddons();
                const addonInfo = addons.reduce((acc, addon: StremioManifest) => {
                    const url = addon.url || '';
                    const matches = url.match(/\/([^/]+)\/manifest\.json$/);
                    const id = matches ? matches[1] : url;
                    acc[id] = addon.manifest?.name || addon.name || id;
                    return acc;
                }, {} as Record<string, string>);
                setInstalledAddons(addonInfo);
            } catch (error) {
                console.error('Error loading installed addons:', error);
            }
        };
        loadInstalledAddons();
    }, []);

    const loadMetadata = async () => {
        if (!type || !id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await catalogService.getMetadata(type, id);
            if (!data) {
                throw new Error('No metadata returned');
            }
            setMetadata(data);
            
            if (type === 'series' && data.videos?.length > 0) {
                try {
                    // Get season details for the first valid season
                    const firstSeason = data.videos[0];
                    const seasonDetails = await catalogService.getSeasonDetails(id, firstSeason.season);
                    if (seasonDetails) {
                        setSeasons([seasonDetails]);
                        setSelectedSeason(seasonDetails.season);
                        if (seasonDetails.episodes?.length > 0) {
                            setSelectedEpisode(seasonDetails.episodes[0].number);
                        }
                    }
                } catch (seasonError) {
                    console.error('Error loading season details:', seasonError);
                    // Don't fail completely if season details fail to load
                }
            }
        } catch (error) {
            console.error('Error loading metadata:', error);
            setError('Unable to load content details. This might be due to network restrictions. You can still try to play content from available streams.');
            
            // Set minimal metadata from the URL parameters
            setMetadata({
                id,
                type,
                name: id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                poster: null,
                background: null,
                logo: null
            });
        } finally {
            setLoading(false);
        }
    };

    // Add a new effect to load season details when selected season changes
    useEffect(() => {
        if (type === 'series' && metadata && metadata.videos && metadata.videos.length > 0) {
            // Load all seasons initially
            const loadAllSeasons = async () => {
                const seasonPromises = (metadata.videos as Video[]).map(video => 
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

    const loadStreams = async (season?: number, episode?: number) => {
        setLoadingStreams(true);
        try {
            console.log('Loading streams with params:', { type, id, season, episode });
            console.log('Metadata:', metadata);

            // Initialize empty streams array
            let allStreams: LocalStream[] = [];
            const updateStreams = (newStreams: LocalStream[]) => {
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
                                subtitles: railwayData.subtitles?.map((sub: any) => ({
                                    url: sub.url,
                                    lang: sub.lang
                                }))
                            } as LocalStream));
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
                                subtitles: vidsrcData.subtitles?.map((sub: any) => ({
                                    url: sub.url,
                                    lang: sub.lang
                                }))
                            } as LocalStream));
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

    const handleStreamClick = async (stream: LocalStream) => {
        if (!stream.url) {
            console.error('No stream URL provided');
            alert('Invalid stream URL. Please try another stream.');
            return;
        }

        try {
            const { value: useExternalPlayer } = await Preferences.get({ key: 'useExternalPlayer' });
            console.log('External player setting:', useExternalPlayer, 'Platform:', Capacitor.getPlatform());
            
            if (useExternalPlayer === 'true' && Capacitor.getPlatform() === 'android') {
                console.log('Attempting to open in external player:', {
                    url: stream.url,
                    title: stream.title || stream.name || 'Video'
                });
                
                try {
                    await ExternalPlayer.openVideo({
                        url: stream.url,
                        title: stream.title || stream.name || 'Video',
                        useDefault: true
                    });
                } catch (externalError) {
                    console.error('External player error:', externalError);
                    alert('Failed to open external player. Falling back to built-in player.');
                    
                    // Fallback to ExoPlayer
                    await ExoPlayer.play({
                        url: stream.url,
                        title: stream.title || stream.name || 'Video',
                        headers: stream.behaviorHints?.headers,
                        subtitles: stream.subtitles?.map(sub => ({
                            url: sub.url,
                            language: sub.lang
                        }))
                    });
                }
            } else if (Capacitor.getPlatform() === 'android') {
                // Use native ExoPlayer
                try {
                    await ExoPlayer.play({
                        url: stream.url,
                        title: stream.title || stream.name || 'Video',
                        headers: stream.behaviorHints?.headers,
                        subtitles: stream.subtitles?.map(sub => ({
                            url: sub.url,
                            language: sub.lang
                        }))
                    });
                } catch (error) {
                    console.error('Error playing video with ExoPlayer:', error);
                    // Fallback to web player if ExoPlayer fails
                    const subtitlesParam = stream.subtitles ? `&subtitles=${encodeURIComponent(JSON.stringify(stream.subtitles))}` : '';
                    navigate(`/play/${type}/${id}?streamUrl=${encodeURIComponent(stream.url)}${stream.behaviorHints?.headers ? `&headers=${encodeURIComponent(JSON.stringify(stream.behaviorHints.headers))}` : ''}${subtitlesParam}`);
                }
            } else {
                // Use web player for other platforms
                const subtitlesParam = stream.subtitles ? `&subtitles=${encodeURIComponent(JSON.stringify(stream.subtitles))}` : '';
                navigate(`/play/${type}/${id}?streamUrl=${encodeURIComponent(stream.url)}${stream.behaviorHints?.headers ? `&headers=${encodeURIComponent(JSON.stringify(stream.behaviorHints.headers))}` : ''}${subtitlesParam}`);
            }
        } catch (error) {
            console.error('Error playing stream:', error);
            alert('Failed to play video. Please try another stream or player option.');
        }
    };

    const getStreamQualityInfo = (stream: LocalStream) => {
        const qualities = {
            '4K': ['2160p', '4k', 'uhd'],
            'FHD': ['1080p', 'fhd'],
            'HD': ['720p', 'hd'],
            'SD': ['480p', '360p', 'sd']
        };

        const streamTitle = (stream.title || stream.name || '').toLowerCase();
        for (const [quality, terms] of Object.entries(qualities)) {
            if (terms.some(term => streamTitle.includes(term))) {
                return quality;
            }
        }
        return null;
    };

    const getHDRInfo = (stream: LocalStream) => {
        const formats = {
            'Dolby Vision': ['dolby.?vision', 'dovi', 'dv'],
            'HDR10+': ['hdr10\\+', 'hdr\\+'],
            'HDR': ['hdr'],
            'HDR HLG': ['hlg']
        };

        const streamTitle = (stream.title || stream.name || '').toLowerCase();
        for (const [format, terms] of Object.entries(formats)) {
            if (terms.some(term => streamTitle.match(new RegExp(term)))) {
                return format;
            }
        }
        return null;
    };

    const getAudioInfo = (stream: LocalStream) => {
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

        const streamTitle = (stream.title || stream.name || '').toLowerCase();
        const detectedFormats = [];
        
        for (const [format, terms] of Object.entries(formats)) {
            if (terms.some(term => streamTitle.match(new RegExp(term)))) {
                detectedFormats.push(format);
            }
        }
        return detectedFormats;
    };

    const renderStreamCard = (stream: LocalStream) => {
        const quality = getStreamQualityInfo(stream);
        const hdrInfo = getHDRInfo(stream);
        const audioInfo = getAudioInfo(stream);
        const size = stream.behaviorHints?.size || 
            ((stream.title || stream.name || '')?.match(/💾\s*([\d.]+\s*[GM]B)/)?.[1]) || '';
        const seeders = stream.behaviorHints?.seeders;

        return (
            <Box
                onClick={() => handleStreamClick(stream)}
                sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    bgcolor: alpha('#fff', 0.03),
                    border: `1px solid ${alpha('#fff', 0.1)}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    WebkitTapHighlightColor: 'transparent',
                    '&:active': {
                        transform: 'scale(0.98)',
                        bgcolor: alpha('#fff', 0.06)
                    },
                    '&:focus': {
                        outline: 'none'
                    }
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            flexShrink: 0,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: stream.behaviorHints?.isMagnetStream ?
                                alpha(theme.palette.warning.main, 0.2) :
                                stream.behaviorHints?.notWebReady ?
                                    alpha(theme.palette.error.main, 0.2) :
                                    alpha(theme.palette.primary.main, 0.2),
                            color: stream.behaviorHints?.isMagnetStream ?
                                theme.palette.warning.main :
                                stream.behaviorHints?.notWebReady ?
                                    theme.palette.error.main :
                                    theme.palette.primary.main
                        }}
                    >
                        {stream.behaviorHints?.isMagnetStream ? <DownloadIcon /> : 
                         stream.behaviorHints?.notWebReady ? <DownloadIcon /> : 
                         <PlayArrowIcon />}
                    </Box>
                    <Typography
                        sx={{
                            flex: 1,
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {stream.title || stream.name || 'Unnamed Stream'}
                    </Typography>
                </Box>

                <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 1,
                    width: '100%'
                }}>
                    {quality && (
                        <Chip
                            size="small"
                            icon={<FourKIcon sx={{ fontSize: '1rem' }} />}
                            label={quality}
                            sx={{
                                bgcolor: alpha(theme.palette.primary.main, 0.15),
                                color: theme.palette.primary.light,
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                '& .MuiChip-icon': { color: 'inherit' }
                            }}
                        />
                    )}
                    {hdrInfo && (
                        <Chip
                            size="small"
                            icon={<BrightnessHighIcon sx={{ fontSize: '1rem' }} />}
                            label={hdrInfo}
                            sx={{
                                bgcolor: alpha(theme.palette.secondary.main, 0.15),
                                color: theme.palette.secondary.light,
                                border: `1px solid ${alpha(theme.palette.secondary.main, 0.3)}`,
                                '& .MuiChip-icon': { color: 'inherit' }
                            }}
                        />
                    )}
                    {audioInfo.map((format, index) => (
                        <Chip
                            key={index}
                            size="small"
                            icon={<SurroundSoundIcon sx={{ fontSize: '1rem' }} />}
                            label={format}
                            sx={{
                                bgcolor: alpha(theme.palette.warning.main, 0.15),
                                color: theme.palette.warning.light,
                                border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                                '& .MuiChip-icon': { color: 'inherit' }
                            }}
                        />
                    ))}
                    {size && (
                        <Chip
                            size="small"
                            label={size}
                            sx={{
                                bgcolor: alpha('#fff', 0.1),
                                color: alpha('#fff', 0.9),
                                border: `1px solid ${alpha('#fff', 0.2)}`
                            }}
                        />
                    )}
                    {seeders && (
                        <Chip
                            size="small"
                            label={`${seeders} seeders`}
                            sx={{
                                bgcolor: alpha(theme.palette.success.main, 0.15),
                                color: theme.palette.success.light,
                                border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`
                            }}
                        />
                    )}
                </Box>
            </Box>
        );
    };

    const handleEpisodeClick = async (episode: any) => {
        if (!episode || !metadata) return;
        
        // Update metadata with episode information, but keep original series name
        setMetadata(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                episodeInfo: {
                    number: episode.number,
                    title: episode.title,
                    description: episode.description,
                    thumbnail: episode.thumbnail
                }
            };
        });

        // Clear existing streams before loading new ones
        setGroupedStreams({});
        
        // Update selected episode and show streams page
        setSelectedEpisode(episode.number);
        setShowStreamsPage(true);
        
        // Load streams for this specific episode
        await loadStreams(selectedSeason, episode.number);
    };

    const renderInfo = () => {
        if (loading) {
            return (
                <Box sx={{ p: 2 }}>
                    <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 2 }} />
                    <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
                    <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
                    <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
                </Box>
            );
        }

        if (!metadata) return null;

        const getHeroHeight = () => window.innerWidth > 768 ? '75vh' : '65vh';
        const logoUrl = metadata.logo ? metadata.logo : (metadata.imdb_id ? `https://live.metahub.space/logo/medium/${metadata.imdb_id}/img` : null);

        return (
            <Box sx={{ pb: 10 }}>
                <Box
                    sx={{
                        position: 'relative',
                        width: '100%',
                        height: getHeroHeight(),
                        overflow: 'hidden',
                    }}
                >
                    {(metadata.background || metadata.poster) ? (
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
                                filter: 'brightness(0.65)',
                                transform: 'scale(1.1)',
                                transition: 'transform 0.3s ease-out',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.6) 40%, rgba(0, 0, 0, 0.9) 70%, rgba(0, 0, 0, 0.98) 85%, rgba(0, 0, 0, 1) 100%)'
                                }
                            }}
                        />
                    ) : (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)'
                            }}
                        />
                    )}

                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            p: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            alignItems: 'flex-start'
                        }}
                    >
                        {metadata.genres && metadata.genres.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                {metadata.genres.slice(0, 3).map((genre: string) => (
                                    <Chip
                                        key={genre}
                                        label={genre}
                                        size="small"
                                        sx={{
                                            bgcolor: alpha('#fff', 0.15),
                                            color: '#fff',
                                            fontSize: '0.75rem',
                                            height: 26,
                                            backdropFilter: 'blur(10px)',
                                            border: `1px solid ${alpha('#fff', 0.2)}`
                                        }}
                                    />
                                ))}
                            </Box>
                        )}

                        {logoUrl ? (
                            <Box
                                component="img"
                                src={logoUrl}
                                alt={metadata.name}
                                sx={{
                                    maxWidth: '85%',
                                    maxHeight: '20vh',
                                    objectFit: 'contain',
                                    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
                                    mt: 'auto',
                                    mb: 2
                                }}
                                onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    if (!img.classList.contains('error')) {
                                        img.classList.add('error');
                                        // Fallback to text if logo fails to load
                                        const titleElement = document.createElement('h1');
                                        titleElement.textContent = metadata.name;
                                        titleElement.style.fontSize = '2.5rem';
                                        titleElement.style.fontWeight = '800';
                                        titleElement.style.color = '#fff';
                                        titleElement.style.textShadow = '0 4px 12px rgba(0,0,0,0.5)';
                                        titleElement.style.lineHeight = '1.2';
                                        img.parentNode?.replaceChild(titleElement, img);
                                    }
                                }}
                            />
                        ) : (
                            <Typography
                                variant="h1"
                                sx={{
                                    fontSize: '2.5rem',
                                    fontWeight: 800,
                                    color: '#fff',
                                    textShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                    lineHeight: 1.2,
                                    mt: 'auto',
                                    mb: 2
                                }}
                            >
                                {metadata.name}
                            </Typography>
                        )}

                        <Box 
                            sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 2, 
                                flexWrap: 'wrap',
                                backdropFilter: 'blur(10px)',
                                bgcolor: alpha('#000', 0.3),
                                px: 2,
                                py: 1,
                                borderRadius: 2
                            }}
                        >
                            {metadata.releaseInfo && (
                                <Typography
                                    variant="body2"
                                    sx={{
                                    color: alpha('#fff', 0.9),
                                        fontSize: '0.85rem',
                                        fontWeight: 500
                                    }}
                                >
                                    {metadata.releaseInfo}
                                </Typography>
                            )}
                            {metadata.runtime && (
                                <Typography
                                    variant="body2"
                                    sx={{
                                    color: alpha('#fff', 0.9),
                                        fontSize: '0.85rem',
                                        fontWeight: 500
                                    }}
                                >
                                    {metadata.runtime}
                                </Typography>
                            )}
                            {metadata.rating && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Rating
                                        value={parseFloat(metadata.rating)}
                                        precision={0.1}
                                        readOnly
                                        size="small"
                                        sx={{
                                            color: '#f5c518',
                                            '& .MuiRating-icon': {
                                                fontSize: '0.9rem'
                                            }
                                        }}
                                    />
                                    <Typography
                                        variant="body2"
                                        sx={{
                                        color: '#f5c518',
                                            fontSize: '0.85rem',
                                            fontWeight: 600
                                        }}
                                    >
                                        {metadata.rating}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ p: 2, pt: 1.5 }}>
                    <Box sx={{ mb: 2 }}>
                        <Collapse in={!showFullDescription} collapsedSize={60}>
                                <Typography
                                variant="body2"
                                    sx={{
                                        color: alpha('#fff', 0.9),
                                    fontSize: '0.9rem',
                                    lineHeight: 1.5,
                                    mb: 1
                                    }}
                                >
                                    {metadata.description}
                                </Typography>
                            </Collapse>
                        {metadata.description && metadata.description.length > 150 && (
                            <Button
                                onClick={() => setShowFullDescription(!showFullDescription)}
                                endIcon={<KeyboardArrowDownIcon sx={{
                                    transform: showFullDescription ? 'rotate(180deg)' : 'none',
                                    transition: 'transform 0.3s'
                                }} />}
                                sx={{
                                    color: alpha('#fff', 0.7),
                                    textTransform: 'none',
                                    fontSize: '0.8rem',
                                    p: 0,
                                    minWidth: 'unset',
                                    '&:hover': { color: '#fff' }
                                }}
                            >
                                {showFullDescription ? 'Show less' : 'Show more'}
                            </Button>
                    )}
                    </Box>

                    {metadata.castData && metadata.castData.length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography
                                variant="subtitle2"
                                        sx={{
                                    color: alpha('#fff', 0.7),
                                            fontSize: '0.8rem',
                                    fontWeight: 600,
                                            mb: 1
                                        }}
                                    >
                                        Cast
                                    </Typography>
                                    <Box 
                                        sx={{ 
                                            display: 'flex',
                                    gap: 1.5,
                                            overflowX: 'auto',
                                            pb: 1,
                                    mx: -2,
                                    px: 2,
                                    '&::-webkit-scrollbar': { display: 'none' },
                                    scrollbarWidth: 'none'
                                }}
                            >
                                {metadata.castData.slice(0, 10).map((cast: CastMember) => (
                                    <Box
                                        key={cast.id}
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                            flexShrink: 0,
                                            width: 80
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                width: 60,
                                                height: 60,
                                                        borderRadius: '50%',
                                                        overflow: 'hidden',
                                                mb: 0.5,
                                                bgcolor: 'rgba(255,255,255,0.1)'
                                            }}
                                        >
                                                        <Box
                                                            component="img"
                                                src={cast.profilePath}
                                                alt={cast.name}
                                                            sx={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover'
                                                            }}
                                                        />
                                                </Box>
                                                    <Typography
                                            variant="caption"
                                                        sx={{
                                                            color: '#fff',
                                                fontSize: '0.7rem',
                                                fontWeight: 500,
                                                textAlign: 'center',
                                                maxWidth: '100%',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                            {cast.name}
                                                    </Typography>
                                                        <Typography
                                            variant="caption"
                                                            sx={{
                                                                color: alpha('#fff', 0.7),
                                                fontSize: '0.65rem',
                                                textAlign: 'center',
                                                maxWidth: '100%',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                            {cast.character}
                                                        </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                        </Box>
                    )}

                    {type === 'series' && seasons.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Typography
                                variant="subtitle2"
                                sx={{
                                    color: alpha('#fff', 0.7),
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    mb: 1
                                }}
                            >
                                Episodes
                            </Typography>
                            <Box
                                sx={{
                                    display: 'flex',
                                    gap: 1,
                                    overflowX: 'auto',
                                    pb: 1,
                                    mx: -2,
                                    px: 2,
                                    '&::-webkit-scrollbar': { display: 'none' },
                                    scrollbarWidth: 'none'
                                }}
                            >
                                {seasons.map((season) => (
                                    <Button
                                        key={season.season}
                                        onClick={() => setSelectedSeason(season.season)}
                                        variant={selectedSeason === season.season ? "contained" : "outlined"}
                                        size="small"
                                        sx={{
                                            minWidth: 'unset',
                                            px: 1.5,
                                            py: 0.5,
                                            fontSize: '0.8rem',
                                            borderRadius: 1,
                                            color: selectedSeason === season.season ? '#000' : '#fff',
                                            bgcolor: selectedSeason === season.season ? '#fff' : 'transparent',
                                            borderColor: alpha('#fff', 0.3),
                                            '&:hover': {
                                                bgcolor: selectedSeason === season.season ? alpha('#fff', 0.9) : alpha('#fff', 0.1)
                                            }
                                        }}
                                    >
                                        Season {season.season}
                                    </Button>
                                ))}
                            </Box>
                            {selectedSeason && (
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                        gap: 1.5,
                                        mt: 1.5
                                    }}
                                >
                                    {seasons
                                        .find(s => s.season === selectedSeason)
                                        ?.episodes.map((episode) => (
                                            <Box
                                                key={episode.number}
                                                onClick={() => handleEpisodeClick(episode)}
                                            sx={{
                                                position: 'relative',
                                                    cursor: 'pointer',
                                                borderRadius: 1,
                                                overflow: 'hidden',
                                                    aspectRatio: '16/9',
                                                    bgcolor: 'rgba(255,255,255,0.1)',
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        transform: 'scale(1.02)',
                                                        '& img': {
                                                            filter: 'brightness(1.1)'
                                                        }
                                                    }
                                                }}
                                            >
                                                {episode.thumbnail && (
                                                    <Box
                                                        component="img"
                                                    src={episode.thumbnail}
                                                    alt={`Episode ${episode.number}`}
                                                        sx={{
                                                        width: '100%',
                                                        height: '100%',
                                                            objectFit: 'cover',
                                                            transition: 'all 0.3s'
                                                        }}
                                                />
                                                )}
                                                <Box
                                                    sx={{
                                                        position: 'absolute',
                                                        bottom: 0,
                                                        left: 0,
                                                        right: 0,
                                                        p: 1,
                                                        background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0))'
                                                    }}
                                                >
                                            <Typography
                                                        variant="caption"
                                                sx={{
                                                    color: '#fff',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600
                                                }}
                                            >
                                                        Episode {episode.number}
                                            </Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}
                        </Box>
                    )}
                </Box>

                {error && (
                    <Box sx={{ p: 2, mb: 2 }}>
                        <Typography
                            variant="body2"
                            sx={{
                                color: theme.palette.warning.main,
                                bgcolor: alpha(theme.palette.warning.main, 0.1),
                                p: 2,
                                borderRadius: 1,
                                border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
                            }}
                        >
                            {error}
                        </Typography>
                    </Box>
                )}

                <Box
                    sx={{
                        position: 'fixed',
                        bottom: { xs: 56, sm: 0 },
                        left: 0,
                        right: 0,
                        px: 2,
                        pb: 2,
                        pt: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.8) 50%, transparent)',
                        zIndex: 1400,
                        display: showStreamsPage ? 'none' : 'block',
                        transform: 'translateZ(0)',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden'
                    }}
                >
                    {type !== 'series' && (
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={handleShowStreams}
                            startIcon={<PlayArrowIcon />}
                            disableRipple
                            sx={{
                                bgcolor: '#fff',
                                color: '#000',
                                borderRadius: '100px',
                                py: 1.5,
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                textTransform: 'none',
                                transform: 'translateZ(0)',
                                '&:hover': {
                                    bgcolor: alpha('#fff', 0.9)
                                }
                            }}
                        >
                            Play
                        </Button>
                    )}
                </Box>
            </Box>
        );
    };

    const renderStreams = () => {
        if (!metadata) return null;

        // Get unique addon IDs from grouped streams
        const availableAddons = Object.keys(groupedStreams);
        
        // Create source options based on available streams and installed addons
        const sources = ['all', ...availableAddons].filter(source => 
            source === 'all' || 
            installedAddons.hasOwnProperty(source) || 
            ['vidsrc', 'railway'].includes(source)
        );

        const getSourceDisplayName = (source: string) => {
            if (source === 'all') return 'All Sources';
            if (installedAddons.hasOwnProperty(source)) return installedAddons[source];
            return source.charAt(0).toUpperCase() + source.slice(1);
        };

        return (
            <Box 
                sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    position: 'relative',
                    maxWidth: '100vw',
                    overflow: 'hidden'
                }}
            >
                <Box
                    sx={{
                        position: 'sticky',
                        top: 0,
                        bgcolor: alpha(theme.palette.background.paper, 0.98),
                        backdropFilter: 'blur(10px)',
                        zIndex: 2,
                        borderBottom: `1px solid ${alpha('#fff', 0.1)}`
                    }}
                >
                    {metadata.episodeInfo && (
                        <Box
                            sx={{
                                position: 'relative',
                                width: '100%',
                                height: '25vh',
                                overflow: 'hidden'
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundImage: `url(${metadata.episodeInfo.thumbnail || metadata.background})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    filter: 'brightness(0.85)',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,0.95) 100%)'
                                    }
                                }}
                            />
                            <Box
                                sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    p: 2,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1
                                }}
                            >
                                <Typography
                                    variant="h6"
                                    sx={{
                                        color: '#fff',
                                        fontSize: '1.1rem',
                                        fontWeight: 600,
                                        textShadow: '0 2px 4px rgba(0,0,0,0.4)'
                                    }}
                                >
                                    {metadata.episodeInfo.title || `Episode ${metadata.episodeInfo.number}`}
                                </Typography>
                                {metadata.episodeInfo.description && (
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: alpha('#fff', 0.9),
                                            fontSize: '0.85rem',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                                        }}
                                    >
                                        {metadata.episodeInfo.description}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    )}

                    <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <IconButton
                            onClick={() => setShowStreamsPage(false)}
                            sx={{ color: 'white' }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                                variant="subtitle1"
                                sx={{
                                    color: '#fff',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                Available Streams
                            </Typography>
                            {metadata.type === 'series' && metadata.episodeInfo && (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: alpha('#fff', 0.7),
                                        fontSize: '0.75rem'
                                    }}
                                >
                                    Season {selectedSeason}, Episode {metadata.episodeInfo.number}
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            display: 'flex',
                            gap: 1,
                            p: 1.5,
                            pt: 0,
                            overflowX: 'auto',
                            WebkitOverflowScrolling: 'touch',
                            msOverflowStyle: 'none',
                            scrollbarWidth: 'none',
                            '&::-webkit-scrollbar': { display: 'none' }
                        }}
                    >
                        {sources.map((source) => (
                            <Button
                                key={source}
                                onClick={() => setSelectedSource(source)}
                                variant={selectedSource === source ? "contained" : "outlined"}
                                size="small"
                                sx={{
                                    minWidth: 'unset',
                                    px: 2,
                                    py: 0.5,
                                    fontSize: '0.8rem',
                                    borderRadius: 1,
                                    whiteSpace: 'nowrap',
                                    textTransform: 'capitalize',
                                    color: selectedSource === source ? '#000' : '#fff',
                                    bgcolor: selectedSource === source ? '#fff' : 'transparent',
                                    borderColor: alpha('#fff', 0.3),
                                    '&:hover': {
                                        bgcolor: selectedSource === source ? alpha('#fff', 0.9) : alpha('#fff', 0.1)
                                    }
                                }}
                            >
                                {getSourceDisplayName(source)}
                            </Button>
                        ))}
                    </Box>
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        p: 2,
                        pb: 4,
                        WebkitOverflowScrolling: 'touch',
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                        '&::-webkit-scrollbar': { display: 'none' }
                    }}
                >
                    {loadingStreams ? (
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            minHeight: '200px'
                        }}>
                            <CircularProgress size={32} />
                        </Box>
                    ) : Object.keys(groupedStreams).length === 0 ? (
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            minHeight: '200px'
                        }}>
                        <Typography
                                variant="body2"
                            sx={{
                                    color: alpha('#fff', 0.7),
                                    textAlign: 'center'
                                }}
                            >
                                No streams available
                        </Typography>
                        </Box>
                    ) : (
                        Object.entries(groupedStreams)
                            .filter(([addonId]) => selectedSource === 'all' || addonId === selectedSource)
                            .map(([addonId, { addonName, streams }]) => (
                                <Box key={addonId} sx={{ mb: 3, width: '100%' }}>
                        <Typography
                                        variant="subtitle2"
                            sx={{
                                color: alpha('#fff', 0.7),
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            mb: 1.5,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 3,
                                                height: 16,
                                                borderRadius: 1,
                                                bgcolor: theme.palette.primary.main
                                            }}
                                        />
                                        {addonName}
                        </Typography>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: 1.5,
                                        width: '100%'
                                    }}>
                                        {streams.map((stream) => renderStreamCard(stream))}
                    </Box>
                                </Box>
                            ))
                )}
                </Box>
            </Box>
        );
    };

    const handleBack = () => {
        if (showStreamsPage) {
            setShowStreamsPage(false);
            return;
        }
        
        if (prevLocation.current) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    const handleShowStreams = () => {
        setShowStreamsPage(true);
    };

    // Handle back button/gesture
    useEffect(() => {
        let listenerHandle: any;

        const setupBackHandler = async () => {
            if (Capacitor.getPlatform() === 'android') {
                listenerHandle = await App.addListener('backButton', () => {
                    if (showStreamsPage) {
                        setShowStreamsPage(false);
                    } else {
                        if (prevLocation.current) {
                            navigate(-1);
                        } else {
                            navigate('/');
                        }
                    }
                });
            }
        };

        setupBackHandler();

        return () => {
            if (listenerHandle) {
                listenerHandle.remove();
            }
        };
    }, [navigate, showStreamsPage]);

    if (loading) {
        return (
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#000'
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Fade in appear mountOnEnter unmountOnExit timeout={400}>
            <Box sx={{ 
                height: '100vh',
                width: '100vw',
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: theme.zIndex.modal,
                background: 'linear-gradient(135deg, #000000 0%, #000000 100%)',
                overflowX: 'hidden'
            }}>
                {/* Info Page - Always rendered */}
                <Box sx={{ 
                    height: '100%',
                    width: '100%',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch',
                    filter: showStreamsPage ? 'brightness(0.5)' : 'none',
                    transition: 'filter 0.3s ease'
                }}>
                    {renderInfo()}
                </Box>

                {/* Streams Page - Overlay with slide animation */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.98) 0%, rgba(0, 0, 0, 0.98) 100%)',
                        transform: `translateX(${showStreamsPage ? '0%' : '100%'})`,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        zIndex: 1,
                        overflowY: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        backdropFilter: 'blur(20px)',
                        boxShadow: showStreamsPage ? '-8px 0 24px rgba(0,0,0,0.4)' : 'none',
                        borderLeft: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                    }}
                >
                    {renderStreams()}
                </Box>

                {/* Back Button */}
                <Slide appear={false} direction="down" in={showNavigation}>
                    <IconButton
                        color="inherit"
                        onClick={handleBack}
                        sx={{
                            position: 'fixed',
                            top: 16,
                            left: 16,
                            zIndex: 1200,
                            bgcolor: alpha('#000', 0.5),
                            backdropFilter: 'blur(10px)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            '&:hover': {
                                bgcolor: alpha('#000', 0.7)
                            }
                        }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                </Slide>

                {/* Bottom Navigation */}
                <Fade in appear={false} timeout={300}>
                    <BottomNavigation
                        value={showStreamsPage ? 'streams' : 'info'}
                        onChange={(_, newValue) => {
                            if (newValue === 'streams') {
                                handleShowStreams();
                            } else {
                                setShowStreamsPage(false);
                            }
                        }}
                        sx={{
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 64,
                            background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.98) 100%)',
                            backdropFilter: 'blur(20px)',
                            borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                            zIndex: 2
                        }}
                    >
                        <BottomNavigationAction
                            label="Info"
                            value="info"
                            icon={<InfoIcon />}
                            sx={{
                                color: alpha('#fff', 0.7),
                                '&.Mui-selected': {
                                    color: theme.palette.primary.main
                                }
                            }}
                        />
                        <BottomNavigationAction
                            label="Streams"
                            value="streams"
                            icon={<PlayCircleOutlineIcon />}
                            sx={{
                                color: alpha('#fff', 0.7),
                                '&.Mui-selected': {
                                    color: theme.palette.primary.main
                                }
                            }}
                        />
                    </BottomNavigation>
                </Fade>
            </Box>
        </Fade>
    );
};

export default MobileMetadataDialog;