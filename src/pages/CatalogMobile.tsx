import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Card,
    CardMedia,
    Chip,
    alpha,
    Fade,
    Button,
    Skeleton,
    CircularProgress
} from '@mui/material';
import { catalogService } from '../services/catalogService';
import { StreamingAddon, StreamingContent } from '../types/catalog';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoIcon from '@mui/icons-material/Info';
import StarIcon from '@mui/icons-material/Star';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

// Memoized mobile content card component
export const MobileContentCard = React.memo(({ item }: { item: StreamingContent }) => (
    <Card 
        sx={{ 
            width: '100%',
            position: 'relative',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            background: 'transparent',
            border: 'none',
            borderRadius: 1.5,
            overflow: 'hidden',
            cursor: 'pointer',
            transform: 'scale(1)',
            WebkitTapHighlightColor: 'transparent',
            '&:hover': {
                transform: 'scale(1.02)',
                '& .poster-image': {
                    transform: 'scale(1.05)',
                    filter: 'brightness(1.1)',
                },
                '& .content-overlay': {
                    background: 'linear-gradient(to top, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.98) 15%, rgba(0, 0, 0, 0.9) 30%, rgba(0, 0, 0, 0.6) 60%, rgba(0, 0, 0, 0.4) 100%)',
                }
            },
            '&:active': {
                transform: 'scale(0.98)',
            },
            '&:focus': {
                outline: 'none'
            }
        }}
    >
        <Box sx={{ position: 'relative', aspectRatio: '2/3' }}>
            <CardMedia
                component="img"
                image={item.poster}
                alt={item.name}
                className="poster-image"
                loading="lazy"
                sx={{ 
                    height: '100%',
                    width: '100%',
                    objectFit: 'cover',
                    borderRadius: 1.5,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    transition: 'all 0.4s ease',
                }}
            />
            <Box 
                className="content-overlay"
                sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.5) 60%, rgba(0, 0, 0, 0) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    p: 1,
                    transition: 'all 0.3s ease',
                    borderRadius: '0 0 12px 12px'
                }}
            >
                <Typography 
                    variant="subtitle2" 
                    sx={{ 
                        fontWeight: 600, 
                        color: '#ffffff',
                        fontSize: '0.8rem',
                        lineHeight: 1.2,
                        mb: 0.25,
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                    }}
                >
                    {item.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {item.releaseInfo && (
                        <Typography 
                            variant="caption" 
                            sx={{ 
                                color: alpha('#fff', 0.95), 
                                fontWeight: 500,
                                fontSize: '0.7rem',
                                textShadow: '0 1px 2px rgba(0,0,0,0.4)'
                            }}
                        >
                            {item.releaseInfo}
                        </Typography>
                    )}
                    {item.imdbRating && (
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.25,
                            backgroundColor: 'rgba(245, 197, 24, 0.2)',
                            borderRadius: '4px',
                            padding: '1px 4px'
                        }}>
                            <StarIcon sx={{ color: '#f5c518', fontSize: '0.7rem' }} />
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    color: '#f5c518', 
                                    fontWeight: 600,
                                    fontSize: '0.7rem',
                                    lineHeight: 1
                                }}
                            >
                                {item.imdbRating}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    </Card>
));

// Memoized mobile content row component
const MobileContentRow = React.memo(({ 
    items, 
    title,
    onContentClick,
    rowRef
}: { 
    items: StreamingContent[]; 
    title: string;
    onContentClick: (item: StreamingContent) => void;
    rowRef: React.RefObject<HTMLDivElement | null>;
}) => {
    const navigate = useNavigate();
    const getContentInfo = (title: string) => {
        const [catalogId, type] = title.split('-');
        let contentType = '';

        switch (catalogId) {
            case 'top':
                contentType = type === 'movie' ? 'Popular Movies' : 'Popular Series';
                break;
            case 'year':
                contentType = type === 'movie' ? 'New Movies' : 'New Series';
                break;
            case 'imdbRating':
                contentType = type === 'movie' ? 'Featured Movies' : 'Featured Series';
                break;
            default:
                contentType = type === 'movie' ? 'Movies' : 'Series';
        }

        return { contentType, catalogId, type };
    };

    const { contentType, catalogId, type } = getContentInfo(title);

    const handleSeeMore = () => {
        navigate(`/catalog/${type}/${catalogId}`, { 
            state: { 
                title: contentType,
                items: items
            } 
        });
    };

    return (
        <Box sx={{ mb: 3 }}>
            <Box 
                sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 1.5,
                    mx: 2,
                }}
            >
                <Box
                    sx={{
                        position: 'relative',
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            bottom: -4,
                            left: 0,
                            width: '30px',
                            height: '2px',
                            background: 'linear-gradient(to right, #fff, transparent)',
                            borderRadius: '2px'
                        }
                    }}
                >
                    <Typography 
                        variant="h6" 
                        sx={{ 
                            fontWeight: 700,
                            fontSize: '1rem',
                            letterSpacing: '0.02em',
                            color: '#fff',
                            textTransform: 'uppercase',
                            fontFamily: '"Montserrat", sans-serif',
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                        }}
                    >
                        {contentType}
                    </Typography>
                </Box>
                <Button
                    onClick={handleSeeMore}
                    endIcon={<ArrowForwardIcon sx={{ fontSize: '1rem' }} />}
                    sx={{
                        color: 'white',
                        textTransform: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        opacity: 0.9,
                        padding: '4px 8px',
                        minWidth: 'unset',
                        transition: 'all 0.2s',
                        '&:hover': {
                            opacity: 1,
                            transform: 'translateX(4px)',
                            background: 'rgba(255,255,255,0.1)'
                        }
                    }}
                >
                    See More
                </Button>
            </Box>
            <Box
                ref={rowRef}
                sx={{
                    display: 'flex',
                    overflowX: 'auto',
                    scrollSnapType: 'x mandatory',
                    scrollBehavior: 'smooth',
                    gap: 1.5,
                    px: 2,
                    WebkitOverflowScrolling: 'touch',
                    '&::-webkit-scrollbar': { 
                        display: 'none'
                    },
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    '& > *': {
                        scrollSnapAlign: 'start',
                        flexShrink: 0,
                        width: 'calc((100% - 3rem) / 3)',
                        maxWidth: 'calc((100% - 3rem) / 3)',
                    },
                    '&::after': {
                        content: '""',
                        flexShrink: 0,
                        width: 2,
                        height: 1,
                    }
                }}
            >
                {items.map((item) => (
                    <Box 
                        key={item.id} 
                        onClick={() => onContentClick(item)}
                    >
                        <MobileContentCard item={item} />
                    </Box>
                ))}
            </Box>
        </Box>
    );
});

export default function CatalogMobile() {
    const [addons, setAddons] = useState<StreamingAddon[]>([]);
    const [content, setContent] = useState<{ [key: string]: StreamingContent[] }>({});
    const [loading, setLoading] = useState(false);
    const [featuredContent, setFeaturedContent] = useState<StreamingContent | null>(null);
    const [availableMovies, setAvailableMovies] = useState<StreamingContent[]>([]);
    const rowRefs = useRef<{ [key: string]: React.RefObject<HTMLDivElement | null> }>({});
    const navigate = useNavigate();
    const location = useLocation();
    const mainContainerRef = useRef<HTMLDivElement>(null);
    const [shouldRestoreScroll, setShouldRestoreScroll] = useState(true);
    const isInitialMount = useRef(true);
    const lastScrollPosition = useRef(0);
    const [fadeIn, setFadeIn] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const pullStartY = useRef(0);
    const pullMoveY = useRef(0);
    const refreshAreaHeight = 100; // Height of refresh area in pixels
    const distanceToRefresh = 60; // Distance needed to trigger refresh
    const [pullDistance, setPullDistance] = useState(0);

    // Add fade-in effect on mount
    useEffect(() => {
        setFadeIn(true);
        return () => setFadeIn(false);
    }, []);

    // Save scroll position on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (mainContainerRef.current) {
                lastScrollPosition.current = mainContainerRef.current.scrollTop;
                // Save to session storage immediately
                const currentState = sessionStorage.getItem('catalogMobileState');
                if (currentState) {
                    const state = JSON.parse(currentState);
                    state.scrollPosition = lastScrollPosition.current;
                    sessionStorage.setItem('catalogMobileState', JSON.stringify(state));
                }
            }
        };

        const container = mainContainerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true });
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, []);

    // Function to save state to session storage
    const saveStateToStorage = useCallback(() => {
        if (!mainContainerRef.current) return;
        
        const state = {
            content,
            featuredContent,
            availableMovies,
            addons,
            scrollPosition: lastScrollPosition.current,
            timestamp: Date.now()
        };
        sessionStorage.setItem('catalogMobileState', JSON.stringify(state));
    }, [content, featuredContent, availableMovies, addons]);

    // Function to restore state from session storage with improved scroll restoration
    const restoreStateFromStorage = useCallback(() => {
        const savedState = sessionStorage.getItem('catalogMobileState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                
                // Only check if content exists, remove time-based cache invalidation
                if (Object.keys(state.content || {}).length > 0) {
                    setContent(state.content || {});
                    setFeaturedContent(state.featuredContent);
                    setAvailableMovies(state.availableMovies || []);
                    setAddons(state.addons || []);
                    
                    // Store the scroll position to restore after render
                    lastScrollPosition.current = state.scrollPosition || 0;
                    
                    // Instantly restore scroll position after content is rendered
                    if (shouldRestoreScroll) {
                        requestAnimationFrame(() => {
                            if (mainContainerRef.current) {
                                // Disable smooth scrolling temporarily
                                mainContainerRef.current.style.scrollBehavior = 'auto';
                                mainContainerRef.current.scrollTop = lastScrollPosition.current;
                                // Re-enable smooth scrolling after position is set
                                setTimeout(() => {
                                    if (mainContainerRef.current) {
                                        mainContainerRef.current.style.scrollBehavior = 'smooth';
                                    }
                                }, 100);
                            }
                        });
                    }
                    return true;
                }
            } catch (error) {
                console.error('Error restoring state:', error);
            }
        }
        return false;
    }, [shouldRestoreScroll]);

    // Save state before unloading or navigating away
    useEffect(() => {
        const handleBeforeUnload = () => {
            saveStateToStorage();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            saveStateToStorage();
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [saveStateToStorage]);

    // Modified initial load effect
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            
            // Only clear cache if explicitly requested
            if (location.state?.clearCache === true) {
                setShouldRestoreScroll(false);
                sessionStorage.removeItem('catalogMobileState');
                loadAddons();
            } else {
                const cacheRestored = restoreStateFromStorage();
                if (!cacheRestored) {
                    loadAddons();
                }
            }
        }
    }, [location.state, restoreStateFromStorage]);

    // Function to select random featured content
    const selectRandomFeaturedContent = () => {
        if (availableMovies.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableMovies.length);
            setFeaturedContent(availableMovies[randomIndex]);
        }
    };

    useEffect(() => {
        if (availableMovies.length > 0) {
            selectRandomFeaturedContent();
            const interval = setInterval(selectRandomFeaturedContent, 15000);
            return () => clearInterval(interval);
        }
    }, [availableMovies]);

    const loadAddons = async () => {
        if (loading) return; // Prevent concurrent loads
        
        try {
            setLoading(true);
            const addonData = await catalogService.getStreamingAddons();
            setAddons(addonData);
            if (addonData.length > 0) {
                await loadAllContent(addonData[0]);
            }
        } catch (error) {
            console.error('Error loading addons:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAllContent = async (addon: StreamingAddon) => {
        try {
            const contentMap: { [key: string]: StreamingContent[] } = {};
            const movies: StreamingContent[] = [];

            await Promise.all(addon.catalogs.map(async (catalog) => {
                try {
                    const contentData = await catalogService.getCatalogContent(addon.id, catalog.type, catalog.id);
                    const uniqueContent = contentData.filter((item, index, self) =>
                        index === self.findIndex((t) => t.id === item.id)
                    );

                    const key = `${catalog.id}-${catalog.type}`;
                    contentMap[key] = uniqueContent;

                    if (catalog.type === 'movie' && uniqueContent.length > 0) {
                        movies.push(...uniqueContent);
                    }
                } catch (error) {
                    console.error(`Error loading content for ${catalog.id} ${catalog.type}:`, error);
                }
            }));

            const filteredContentMap = Object.fromEntries(
                Object.entries(contentMap).filter(([_, content]) => content && content.length > 0)
            );

            if (Object.keys(filteredContentMap).length > 0) {
                setContent(filteredContentMap);
                setAvailableMovies(movies.filter((movie, index, self) =>
                    index === self.findIndex((t) => t.id === movie.id)
                ));
                
                // Save to cache immediately after successful load
                setTimeout(() => saveStateToStorage(), 0);
            }
        } catch (error) {
            console.error('Error loading content:', error);
            setContent({});
        }
    };

    const handleContentClick = useCallback((item: StreamingContent) => {
        saveStateToStorage(); // Save state before navigation
        if (!item.id) return;
        const imdbId = item.imdb_id || (item.id.startsWith('tt') ? item.id : `tt${item.id}`);
        navigate(`/title/${item.type}/${imdbId}`, {
            state: {
                title: item.name,
                poster: item.poster,
                background: item.background,
                description: item.description,
                releaseInfo: item.releaseInfo,
                imdbRating: item.imdbRating,
                runtime: item.runtime,
                genres: item.genres,
                preserveCache: true // Always preserve cache when navigating to content
            }
        });
    }, [navigate, saveStateToStorage]);

    // Enhanced refresh catalog function
    const refreshCatalog = useCallback(async () => {
        setIsRefreshing(true);
        sessionStorage.removeItem('catalogMobileState');
        await loadAddons();
        setIsRefreshing(false);
        setPullDistance(0);
    }, []);

    // Add touch event listeners with proper passive setting
    useEffect(() => {
        const container = mainContainerRef.current;
        if (!container) return;

        let initialTouchY = 0;
        let initialScrollTop = 0;

        const touchStart = (e: TouchEvent) => {
            initialTouchY = e.touches[0].clientY;
            initialScrollTop = container.scrollTop;
            pullStartY.current = initialTouchY;
            pullMoveY.current = initialTouchY;
            setPullDistance(0);
            
            // Reset any existing transform
            container.style.transform = 'translateY(0)';
            container.style.transition = 'none';
        };

        const touchMove = (e: TouchEvent) => {
            if (isRefreshing) return;

            const currentY = e.touches[0].clientY;
            const deltaY = currentY - initialTouchY;
            
            // Only allow pull-down when at the top
            if (initialScrollTop <= 0 && deltaY > 0) {
                e.preventDefault();
                const damping = 0.4;
                const transform = Math.min(deltaY * damping, refreshAreaHeight);
                container.style.transform = `translateY(${transform}px)`;
                setPullDistance(deltaY);
                pullMoveY.current = currentY;
            }
        };

        const touchEnd = () => {
            if (isRefreshing) return;

            const deltaY = pullMoveY.current - pullStartY.current;
            
            // Add smooth transition for the return animation
            container.style.transition = 'transform 0.3s ease-out';
            container.style.transform = 'translateY(0)';
            
            if (deltaY > distanceToRefresh) {
                refreshCatalog();
            }

            // Reset after animation
            setTimeout(() => {
                if (container) {
                    container.style.transition = 'none';
                    setPullDistance(0);
                }
            }, 300);
        };

        container.addEventListener('touchstart', touchStart, { passive: true });
        container.addEventListener('touchmove', touchMove, { passive: false });
        container.addEventListener('touchend', touchEnd, { passive: true });

        return () => {
            container.removeEventListener('touchstart', touchStart);
            container.removeEventListener('touchmove', touchMove);
            container.removeEventListener('touchend', touchEnd);
        };
    }, [isRefreshing, refreshCatalog]);

    const contentSections = useMemo(() => {
        return Object.entries(content).map(([key, items]) => {
            const [catalogId, type] = key.split('-');
            const catalog = addons[0]?.catalogs.find(c => c.id === catalogId && c.type === type);
            if (!catalog) return null;
            
            if (!rowRefs.current[key]) {
                rowRefs.current[key] = React.createRef<HTMLDivElement | null>();
            }
            
            return (
                <MobileContentRow
                    key={key}
                    items={items}
                    title={key}
                    onContentClick={handleContentClick}
                    rowRef={rowRefs.current[key]}
                />
            );
        }).filter(Boolean);
    }, [content, addons, handleContentClick]);

    const renderMobileHero = () => {
        if (!featuredContent) return null;

        return (
            <Box 
                sx={{ 
                    position: 'relative',
                    height: '65vh',
                    width: '100%',
                    overflow: 'hidden',
                    mb: 3
                }}
            >
                <Fade key={featuredContent.id} in timeout={1200}>
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundImage: `url(${featuredContent.background || featuredContent.poster})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            filter: 'brightness(0.9)',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'linear-gradient(to top, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.98) 15%, rgba(0, 0, 0, 0.9) 30%, rgba(0, 0, 0, 0.6) 60%, rgba(0, 0, 0, 0.4) 100%)'
                            }
                        }}
                    />
                </Fade>

                <Container 
                    maxWidth="xl" 
                    sx={{ 
                        height: '100%',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'flex-end',
                        pt: 4,
                        pb: 5,
                        zIndex: 2
                    }}
                >
                    <Fade key={`content-${featuredContent.id}`} in timeout={1200}>
                        <Box sx={{ width: '100%', px: 2.5 }}>
                            <Box sx={{ mb: 2 }}>
                                {featuredContent.genres && (
                                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                                        {featuredContent.genres.slice(0, 3).map((genre) => (
                                            <Chip 
                                                key={genre}
                                                label={genre}
                                                size="small"
                                                sx={{ 
                                                    bgcolor: alpha('#fff', 0.15),
                                                    color: alpha('#fff', 0.95),
                                                    borderRadius: 1.5,
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    letterSpacing: '0.02em',
                                                    height: 26,
                                                    backdropFilter: 'blur(4px)',
                                                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                                                }}
                                            />
                                        ))}
                                    </Box>
                                )}
                                
                                {featuredContent.logo ? (
                                    <Box 
                                        component="img"
                                        src={featuredContent.logo}
                                        alt={featuredContent.name}
                                        sx={{ 
                                            maxWidth: '80%',
                                            height: 'auto',
                                            maxHeight: '80px',
                                            mb: 2,
                                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))'
                                        }}
                                    />
                                ) : (
                                    <Typography 
                                        variant="h1" 
                                        sx={{ 
                                            mb: 2,
                                            fontWeight: 900,
                                            fontSize: '2.2rem',
                                            textShadow: '0 2px 4px rgba(0,0,0,0.4)',
                                            letterSpacing: '-0.02em',
                                            lineHeight: 1.1,
                                            color: '#fff'
                                        }}
                                    >
                                        {featuredContent.name}
                                    </Typography>
                                )}
                            </Box>

                            <Box sx={{ 
                                display: 'flex', 
                                gap: 2, 
                                alignItems: 'center', 
                                mb: 2.5,
                                flexWrap: 'wrap'
                            }}>
                                {featuredContent.releaseInfo && (
                                    <Chip 
                                        label={featuredContent.releaseInfo}
                                        sx={{ 
                                            bgcolor: alpha('#fff', 0.2),
                                            color: '#fff',
                                            borderRadius: 1.5,
                                            fontWeight: 600,
                                            fontSize: '0.75rem',
                                            letterSpacing: '0.02em',
                                            height: 26,
                                            backdropFilter: 'blur(4px)'
                                        }}
                                    />
                                )}
                                {featuredContent.imdbRating && (
                                    <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 0.5,
                                        bgcolor: 'rgba(245, 197, 24, 0.2)',
                                        px: 1,
                                        py: 0.5,
                                        borderRadius: 1.5,
                                        backdropFilter: 'blur(4px)'
                                    }}>
                                        <StarIcon sx={{ color: '#f5c518', fontSize: '0.9rem' }} />
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                color: '#f5c518', 
                                                fontWeight: 700,
                                                fontSize: '0.8rem'
                                            }}
                                        >
                                            {featuredContent.imdbRating}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>

                            {featuredContent.description && (
                                <Typography 
                                    variant="body1" 
                                    sx={{ 
                                        mb: 3.5,
                                        color: alpha('#fff', 0.85),
                                        textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        fontSize: '0.95rem',
                                        lineHeight: 1.6,
                                        fontWeight: 400,
                                        letterSpacing: '0.01em'
                                    }}
                                >
                                    {featuredContent.description}
                                </Typography>
                            )}

                            <Box sx={{ 
                                display: 'flex', 
                                gap: 1.5,
                                width: '100%',
                                mt: 1
                            }}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    startIcon={
                                        <PlayArrowIcon 
                                            sx={{ 
                                                fontSize: '1.6rem'
                                            }} 
                                        />
                                    }
                                    onClick={() => handleContentClick(featuredContent)}
                                    sx={{
                                        bgcolor: '#fff',
                                        color: '#000',
                                        py: 1.5,
                                        fontSize: '0.95rem',
                                        fontWeight: 600,
                                        borderRadius: '100px',
                                        textTransform: 'none',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            bgcolor: alpha('#fff', 0.85),
                                        }
                                    }}
                                >
                                    Play
                                </Button>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    size="large"
                                    startIcon={
                                        <InfoIcon 
                                            sx={{ 
                                                fontSize: '1.4rem'
                                            }} 
                                        />
                                    }
                                    onClick={() => handleContentClick(featuredContent)}
                                    sx={{
                                        color: '#fff',
                                        py: 1.5,
                                        fontSize: '0.95rem',
                                        fontWeight: 600,
                                        borderRadius: '100px',
                                        textTransform: 'none',
                                        borderColor: '#fff',
                                        borderWidth: 2,
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            borderWidth: 2,
                                            bgcolor: alpha('#fff', 0.1),
                                        }
                                    }}
                                >
                                    More Info
                                </Button>
                            </Box>
                        </Box>
                    </Fade>
                </Container>
            </Box>
        );
    };

    // Improved loading state render
    if (loading || (!loading && Object.keys(content).length === 0 && addons.length === 0)) {
        return (
            <Fade in={fadeIn} timeout={300}>
                <Box 
                    sx={{ 
                        minHeight: '100vh',
                        maxHeight: '100vh',
                        background: 'linear-gradient(135deg, #000000 0%, #101720 100%)',
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                    }}
                >
                    {/* Hero skeleton */}
                    <Box sx={{ position: 'relative', height: '65vh', mb: 3 }}>
                        <Skeleton 
                            variant="rectangular" 
                            width="100%" 
                            height="100%" 
                            sx={{ 
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                transform: 'none',
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 100%)'
                            }} 
                        />
                        <Box sx={{ 
                            position: 'absolute', 
                            bottom: 0, 
                            left: 0, 
                            right: 0, 
                            p: 2.5,
                            background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
                        }}>
                            <Skeleton width="60%" height={32} sx={{ mb: 1, background: 'rgba(255,255,255,0.1)' }} />
                            <Skeleton width="40%" height={24} sx={{ mb: 2, background: 'rgba(255,255,255,0.1)' }} />
                            <Skeleton width="90%" height={60} sx={{ mb: 2, background: 'rgba(255,255,255,0.1)' }} />
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Skeleton width={120} height={48} sx={{ background: 'rgba(255,255,255,0.1)' }} />
                                <Skeleton width={120} height={48} sx={{ background: 'rgba(255,255,255,0.1)' }} />
                            </Box>
                        </Box>
                    </Box>

                    {/* Content rows skeleton */}
                    <Box sx={{ px: 2.5 }}>
                        {[1, 2, 3].map((row) => (
                            <Box key={row} sx={{ mb: 4 }}>
                                <Skeleton 
                                    width={180} 
                                    height={28} 
                                    sx={{ 
                                        mb: 2,
                                        background: 'rgba(255,255,255,0.1)'
                                    }} 
                                />
                                <Box sx={{ 
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: 2
                                }}>
                                    {[1, 2, 3].map((item) => (
                                        <Skeleton 
                                            key={item} 
                                            variant="rectangular" 
                                            sx={{ 
                                                paddingTop: '150%',
                                                borderRadius: 2,
                                                background: 'rgba(255,255,255,0.1)'
                                            }} 
                                        />
                                    ))}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Fade>
        );
    }

    if (!loading && Object.keys(content).length === 0) {
        return (
            <Fade in={fadeIn} timeout={300}>
                <Box 
                    sx={{ 
                        minHeight: '100vh',
                        background: '#000000',
                        pt: { xs: 2, sm: 4 },
                        pb: { xs: 8, sm: 12 }
                    }}
                >
                    <Typography variant="body1" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                        No content available. Please make sure you have streaming addons installed.
                    </Typography>
                </Box>
            </Fade>
        );
    }

    return (
        <Fade in={fadeIn} timeout={300}>
            <Box 
                ref={mainContainerRef}
                sx={{ 
                    minHeight: '100vh',
                    maxHeight: '100vh',
                    background: '#000000',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    WebkitOverflowScrolling: 'touch',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    transition: 'none',
                    willChange: 'transform',
                    '&::-webkit-scrollbar': {
                        display: 'none'
                    },
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                }}
            >
                {/* Refresh indicator */}
                {(pullDistance > 0 || isRefreshing) && (
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '60px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            zIndex: 10,
                            background: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(10px)',
                            transform: 'translateY(-100%)',
                            transition: 'transform 0.2s ease-out',
                            ...(pullDistance > 0 && {
                                transform: 'translateY(0)',
                            }),
                        }}
                    >
                        {isRefreshing ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CircularProgress size={20} color="inherit" />
                                <Typography variant="body2">
                                    Refreshing...
                                </Typography>
                            </Box>
                        ) : (
                            <Typography variant="body2" sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1,
                                opacity: Math.min(pullDistance / distanceToRefresh, 1)
                            }}>
                                {pullDistance > distanceToRefresh ? 'Release to refresh' : 'Pull down to refresh'}
                            </Typography>
                        )}
                    </Box>
                )}

                {renderMobileHero()}
                
                <Box sx={{ mt: 1, pb: 4 }}>
                    {contentSections}
                </Box>
            </Box>
        </Fade>
    );
}