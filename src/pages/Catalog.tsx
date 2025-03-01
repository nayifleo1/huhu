import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Card,
    CardMedia,
    IconButton,
    Chip,
    useTheme,
    alpha,
    Fade,
    Button,
    Skeleton
} from '@mui/material';
import { catalogService } from '../services/catalogService';
import { StreamingAddon, StreamingContent } from '../types/catalog';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoIcon from '@mui/icons-material/Info';
import StarIcon from '@mui/icons-material/Star';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// Memoized content card component
const ContentCard = React.memo(({ item, onContentClick }: { item: StreamingContent; onContentClick: (item: StreamingContent) => void }) => (
    <Card 
        sx={{ 
            minWidth: 280,
            position: 'relative',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            background: 'transparent',
            border: 'none',
            '&:hover': {
                transform: 'scale(1.05)',
                zIndex: 1,
                '& .content-overlay': {
                    opacity: 1
                },
                '& .poster-image': {
                    boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                    filter: 'brightness(1.1)'
                }
            }
        }}
    >
        <Box sx={{ position: 'relative' }}>
            <CardMedia
                component="img"
                height={400}
                image={item.poster}
                alt={item.name}
                className="poster-image"
                loading="lazy"
                sx={{ 
                    borderRadius: 2,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    filter: 'brightness(0.95)',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '40%',
                        background: 'linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, transparent 100%)',
                        borderRadius: '0 0 8px 8px',
                        pointerEvents: 'none'
                    }
                }}
            />
            <Box 
                className="content-overlay"
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to top, rgba(0, 0, 0, 0.98) 0%, rgba(0, 0, 0, 0.8) 50%, rgba(0, 0, 0, 0.4) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    p: 2,
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    borderRadius: 2
                }}
            >
                {/* Action buttons */}
                <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                    <IconButton 
                        size="small"
                        onClick={() => onContentClick(item)}
                        sx={{
                            bgcolor: '#ffffff',
                            '&:hover': { 
                                bgcolor: alpha('#ffffff', 0.9),
                                transform: 'scale(1.1)'
                            }
                        }}
                    >
                        <PlayArrowIcon sx={{ color: '#000000' }} />
                    </IconButton>
                    <IconButton 
                        size="small"
                        onClick={() => onContentClick(item)}
                        sx={{
                            bgcolor: alpha('#ffffff', 0.15),
                            '&:hover': { 
                                bgcolor: alpha('#ffffff', 0.25),
                                transform: 'scale(1.1)'
                            }
                        }}
                    >
                        <InfoIcon />
                    </IconButton>
                </Box>
                
                {/* Title and metadata */}
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#ffffff', mb: 0.5 }}>
                    {item.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {item.releaseInfo && (
                        <Typography variant="caption" sx={{ color: alpha('#fff', 0.9), fontWeight: 600 }}>
                            {item.releaseInfo}
                        </Typography>
                    )}
                    {item.imdbRating && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <StarIcon sx={{ color: '#f5c518', fontSize: '0.9rem' }} />
                            <Typography variant="caption" sx={{ color: '#f5c518', fontWeight: 700 }}>
                                {item.imdbRating}
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    </Card>
));

// Memoized content row component
const ContentRow = React.memo(({ 
    items, 
    title,
    onContentClick,
    onScroll,
    rowRef
}: { 
    items: StreamingContent[]; 
    title: string;
    onContentClick: (item: StreamingContent) => void;
    onScroll: (direction: 'left' | 'right') => void;
    rowRef: React.RefObject<HTMLDivElement | null>;
}) => {
    const theme = useTheme();

    // Format the title and get logo
    const getPlatformInfo = (title: string) => {
        const [platform, type] = title.split('-');
        if (!type) return { logo: '', contentType: '' };

        const platformData: { [key: string]: { logo: string } } = {
            'nfx': {
                logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Logonetflix.png/1200px-Logonetflix.png'
            },
            'hbm': {
                logo: 'https://upload.wikimedia.org/wikipedia/commons/1/17/HBO_Max_Logo.svg'
            },
            'amp': {
                logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Prime_Video.png'
            },
            'dnp': {
                logo: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_logo.svg'
            },
            'atp': {
                logo: 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Apple_TV_Plus_logo.svg'
            }
        };

        const contentType = type.toLowerCase() === 'movie' ? 'Movies' : 'Series';
        return {
            logo: platformData[platform.toLowerCase()]?.logo || '',
            contentType
        };
    };

    const { logo, contentType } = getPlatformInfo(title);

    return (
        <Box sx={{ mb: 4, px: 3 }}>
            <Box 
                sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    mb: 2
                }}
            >
                {logo && (
                    <Box
                        component="img"
                        src={logo}
                        alt={title}
                        sx={{
                            height: '32px',
                            width: 'auto',
                            maxWidth: '140px',
                            objectFit: 'contain',
                            filter: title.split('-')[0].toLowerCase() === 'dnp' ? 'brightness(10)' : 'brightness(1)'
                        }}
                    />
                )}
                <Typography 
                    variant="h6" 
                    sx={{ 
                        fontWeight: 600,
                        fontSize: '1rem',
                        letterSpacing: '0.01em',
                        color: alpha('#fff', 0.75),
                        textTransform: 'uppercase'
                    }}
                >
                    {contentType}
                </Typography>
            </Box>
            <Box sx={{ position: 'relative' }}>
                <Box
                    ref={rowRef}
                    sx={{
                        display: 'flex',
                        overflowX: 'auto',
                        gap: 2,
                        py: 0.5,
                        scrollBehavior: 'smooth',
                        scrollSnapType: 'x mandatory',
                        '&::-webkit-scrollbar': { display: 'none' },
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}
                >
                    {items.map((item) => (
                        <Box 
                            key={item.id} 
                            sx={{ 
                                scrollSnapAlign: 'start',
                                flexShrink: 0
                            }}
                            onClick={() => onContentClick(item)}
                        >
                            <ContentCard item={item} onContentClick={onContentClick} />
                        </Box>
                    ))}
                </Box>
                <IconButton
                    onClick={() => onScroll('left')}
                    sx={{
                        position: 'absolute',
                        left: -20,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        bgcolor: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(8px)',
                        '&:hover': {
                            bgcolor: alpha(theme.palette.background.paper, 0.9),
                        }
                    }}
                >
                    <ChevronLeftIcon />
                </IconButton>
                <IconButton
                    onClick={() => onScroll('right')}
                    sx={{
                        position: 'absolute',
                        right: -20,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        bgcolor: alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(8px)',
                        '&:hover': {
                            bgcolor: alpha(theme.palette.background.paper, 0.9),
                        }
                    }}
                >
                    <ChevronRightIcon />
                </IconButton>
            </Box>
        </Box>
    );
});

export default function Catalog() {
    const theme = useTheme();
    const [addons, setAddons] = useState<StreamingAddon[]>([]);
    const [content, setContent] = useState<{ [key: string]: StreamingContent[] }>({});
    const [loading, setLoading] = useState(false);
    const [featuredContent, setFeaturedContent] = useState<StreamingContent | null>(null);
    const [availableMovies, setAvailableMovies] = useState<StreamingContent[]>([]);
    const rowRefs = useRef<{ [key: string]: React.RefObject<HTMLDivElement | null> }>({});
    const rotationInterval = useRef<number | undefined>(undefined);
    const navigate = useNavigate();

    // Function to select random featured content
    const selectRandomFeaturedContent = () => {
        if (availableMovies.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableMovies.length);
            setFeaturedContent(availableMovies[randomIndex]);
        }
    };

    // Set up auto-rotation
    useEffect(() => {
        if (availableMovies.length > 0) {
            // Initial random selection
            selectRandomFeaturedContent();

            // Set up interval for rotation (every 15 seconds)
            rotationInterval.current = window.setInterval(selectRandomFeaturedContent, 15000);

            // Cleanup interval on unmount
            return () => {
                if (rotationInterval.current) {
                    window.clearInterval(rotationInterval.current);
                }
            };
        }
    }, [availableMovies]);

    useEffect(() => {
        loadAddons();
    }, []);

    const loadAddons = async () => {
        console.log('Loading addons...');
        try {
            const addonData = await catalogService.getStreamingAddons();
            console.log('Loaded addons:', addonData);
            setAddons(addonData);
            if (addonData.length > 0) {
                console.log('Loading content for addon:', addonData[0].name);
                loadAllContent(addonData[0]);
            } else {
                console.warn('No addons available');
                setLoading(false);
            }
        } catch (error) {
            console.error('Error loading addons:', error);
            setLoading(false);
        }
    };

    const loadAllContent = async (addon: StreamingAddon) => {
        setLoading(true);
        try {
            console.log('Loading content for catalogs:', addon.catalogs);
            const contentMap: { [key: string]: StreamingContent[] } = {};
            const movies: StreamingContent[] = [];

            for (const catalog of addon.catalogs) {
                console.log(`Loading content for ${catalog.id} ${catalog.type}...`);
                const contentData = await catalogService.getCatalogContent(addon.id, catalog.type, catalog.id);
                console.log(`Loaded ${contentData.length} items for ${catalog.id} ${catalog.type}`);
                const key = `${catalog.id}-${catalog.type}`;
                contentMap[key] = contentData;

                if (catalog.type === 'movie' && contentData.length > 0) {
                    movies.push(...contentData);
                }
            }

            setAvailableMovies(movies);
            setContent(contentMap);
        } catch (error) {
            console.error('Error loading content:', error);
            setContent({});
        } finally {
            setLoading(false);
        }
    };

    // Memoized callbacks
    const handleContentClick = useCallback((item: StreamingContent) => {
        console.log('Clicked item:', item);
        if (!item.id) {
            console.error('No ID found for item:', item);
            return;
        }
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
                genres: item.genres
            }
        });
    }, [navigate]);

    const handleScroll = useCallback((key: string, direction: 'left' | 'right') => {
        const rowRef = rowRefs.current[key];
        if (rowRef?.current) {
            const scrollAmount = direction === 'left' ? -400 : 400;
            rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    }, []);

    // Memoized content sections
    const contentSections = useMemo(() => {
        return Object.entries(content).map(([key, items]) => {
            const [catalogId, type] = key.split('-');
            const catalog = addons[0]?.catalogs.find(c => c.id === catalogId && c.type === type);
            if (!catalog) return null;
            
            if (!rowRefs.current[key]) {
                rowRefs.current[key] = React.createRef<HTMLDivElement | null>();
            }
            
            return (
                <ContentRow
                    key={key}
                    items={items}
                    title={key}
                    onContentClick={handleContentClick}
                    onScroll={(direction) => handleScroll(key, direction)}
                    rowRef={rowRefs.current[key]}
                />
            );
        }).filter(Boolean);
    }, [content, addons, handleContentClick, handleScroll]);

    const renderHeroSection = () => {
        if (!featuredContent) return null;

        return (
            <Box 
                sx={{ 
                    position: 'relative',
                    height: '75vh',
                    width: '100%',
                    overflow: 'hidden',
                    mb: 4,
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '70%',
                        background: `linear-gradient(to top, 
                            #020617 0%,
                            rgba(2, 6, 23, 0.95) 10%,
                            rgba(2, 6, 23, 0.8) 25%,
                            rgba(2, 6, 23, 0.4) 50%,
                            transparent 100%
                        )`,
                        pointerEvents: 'none',
                        zIndex: 1
                    }
                }}
            >
                <Fade key={featuredContent.id} in timeout={1500}>
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
                            transform: 'scale(1.1)',
                            filter: 'brightness(0.8)',
                            transition: 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: `linear-gradient(to left, 
                                    transparent 0%,
                                    rgba(2, 6, 23, 0.4) 50%,
                                    rgba(2, 6, 23, 0.8) 75%,
                                    rgba(2, 6, 23, 0.95) 100%
                                )`,
                                backdropFilter: 'blur(8px)',
                                transition: 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
                            }
                        }}
                    />
                </Fade>

                <Fade key={`poster-${featuredContent.id}`} in timeout={1500}>
                    <Box
                        sx={{
                            position: 'absolute',
                            right: '5%',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '22%',
                            height: '75%',
                            zIndex: 2,
                            borderRadius: 3,
                            overflow: 'hidden',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                                transform: 'translateY(-50%) scale(1.02)',
                                boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                            }
                        }}
                    >
                        <img
                            src={featuredContent.poster}
                            alt={featuredContent.name}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                transform: 'scale(1.02)',
                                transition: 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                        />
                    </Box>
                </Fade>

                <Container 
                    maxWidth="xl" 
                    sx={{ 
                        height: '100%',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        pt: 8,
                        zIndex: 2
                    }}
                >
                    <Fade key={`content-${featuredContent.id}`} in timeout={1500}>
                        <Box sx={{ maxWidth: '40%', ml: '5%' }}>
                            <Box sx={{ mb: 3 }}>
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
                                                    borderRadius: 1,
                                                    fontSize: '0.85rem',
                                                    fontWeight: 500,
                                                    letterSpacing: '0.02em',
                                                    '&:hover': {
                                                        bgcolor: alpha('#fff', 0.25)
                                                    }
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
                                            maxHeight: '200px',
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
                                            fontSize: '3rem',
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

                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
                                {featuredContent.releaseInfo && (
                                    <Chip 
                                        label={featuredContent.releaseInfo}
                                        sx={{ 
                                            bgcolor: alpha(theme.palette.primary.main, 0.25),
                                            color: '#fff',
                                            borderRadius: 1,
                                            fontWeight: 600,
                                            fontSize: '0.9rem',
                                            letterSpacing: '0.02em',
                                            height: 28
                                        }}
                                    />
                                )}
                                {featuredContent.imdbRating && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <StarIcon sx={{ color: '#f5c518', fontSize: '1.2rem' }} />
                                        <Typography sx={{ 
                                            color: '#f5c518', 
                                            fontWeight: 700,
                                            fontSize: '0.95rem',
                                            letterSpacing: '0.02em'
                                        }}>
                                            {featuredContent.imdbRating}
                                        </Typography>
                                    </Box>
                                )}
                                {featuredContent.runtime && (
                                    <Typography 
                                        sx={{ 
                                            color: alpha('#fff', 0.85),
                                            fontWeight: 500,
                                            fontSize: '0.95rem',
                                            letterSpacing: '0.02em'
                                        }}
                                    >
                                        {featuredContent.runtime}
                                    </Typography>
                                )}
                            </Box>

                            {featuredContent.description && (
                                <Typography 
                                    variant="h6" 
                                    sx={{ 
                                        mb: 4,
                                        color: alpha('#fff', 0.85),
                                        textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        fontSize: '1.15rem',
                                        lineHeight: 1.6,
                                        maxWidth: '90%',
                                        fontWeight: 400,
                                        letterSpacing: '0.01em'
                                    }}
                                >
                                    {featuredContent.description}
                                </Typography>
                            )}

                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={<PlayArrowIcon />}
                                    onClick={() => handleContentClick(featuredContent)}
                                    sx={{
                                        bgcolor: '#ffffff',
                                        color: '#000000',
                                        px: 4,
                                        py: 1.2,
                                        fontSize: '1.1rem',
                                        fontWeight: 600,
                                        letterSpacing: '0.02em',
                                        borderRadius: 1.5,
                                        textTransform: 'none',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                        '&:hover': {
                                            bgcolor: alpha('#ffffff', 0.95),
                                            transform: 'scale(1.02)',
                                            boxShadow: '0 6px 16px rgba(0,0,0,0.4)'
                                        },
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                >
                                    Play
                                </Button>
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={<InfoIcon />}
                                    onClick={() => handleContentClick(featuredContent)}
                                    sx={{
                                        bgcolor: alpha(theme.palette.background.paper, 0.15),
                                        px: 4,
                                        py: 1.2,
                                        fontSize: '1.1rem',
                                        fontWeight: 600,
                                        letterSpacing: '0.02em',
                                        borderRadius: 1.5,
                                        textTransform: 'none',
                                        backdropFilter: 'blur(8px)',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.background.paper, 0.25),
                                            transform: 'scale(1.02)'
                                        },
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
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

    if (loading || (!loading && Object.keys(content).length === 0 && addons.length === 0)) {
        return (
            <Box sx={{ p: 3 }}>
                <Skeleton variant="rectangular" height={400} sx={{ mb: 4 }} />
                {[1, 2, 3].map((row) => (
                    <Box key={row} sx={{ mb: 4 }}>
                        <Skeleton width={200} height={32} sx={{ mb: 2 }} />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            {[1, 2, 3, 4, 5].map((item) => (
                                <Skeleton key={item} variant="rectangular" width={280} height={400} />
                            ))}
                        </Box>
                    </Box>
                ))}
            </Box>
        );
    }

    if (!loading && Object.keys(content).length === 0) {
        return (
            <Box 
                sx={{ 
                    minHeight: '100vh',
                    background: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 4
                }}
            >
                <Typography variant="h5" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                    No content available. Please make sure you have streaming addons installed.
                </Typography>
            </Box>
        );
    }

    return (
        <Box 
            sx={{ 
                minHeight: '100vh',
                background: '#000000',
                pt: { xs: 2, sm: 4 },
                pb: { xs: 8, sm: 12 }
            }}
        >
            {renderHeroSection()}
            
            <Box sx={{ width: '100%', mt: 4 }}>
                {contentSections.map((section, index) => (
                    <Box key={index} sx={{ width: '100%' }}>
                        {section}
                    </Box>
                ))}
            </Box>
        </Box>
    );
}