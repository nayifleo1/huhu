import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    TextField,
    InputAdornment,
    Grid,
    IconButton,
    Button,
    CircularProgress,
    Menu,
    MenuItem,
    Divider,
    Badge,
    Fade
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckIcon from '@mui/icons-material/Check';
import { StreamingContent } from '../types/catalog';
import { catalogService } from '../services/catalogService';
import { MobileContentCard } from './CatalogMobile';

export default function CatalogExpanded() {
    const location = useLocation();
    const { type, catalogId } = useParams();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [items, setItems] = useState<StreamingContent[]>([]);
    const [filteredItems, setFilteredItems] = useState<StreamingContent[]>([]);
    const [loading, setLoading] = useState(false);
    const [availableGenres, setAvailableGenres] = useState<string[]>([]);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const [fadeIn, setFadeIn] = useState(false);

    // Initialize content from navigation state or fetch new content
    useEffect(() => {
        const initializeContent = async () => {
            setLoading(true);
            try {
                let contentItems: StreamingContent[];
                if (location.state?.items) {
                    contentItems = location.state.items;
                    
                    // Check if we should animate the fade-in
                    if (location.state?.fadeIn) {
                        setFadeIn(false);
                        // Small delay to ensure component is ready before animation
                        setTimeout(() => setFadeIn(true), 50);
                    } else {
                        setFadeIn(true);
                    }
                } else {
                    const addon = (await catalogService.getStreamingAddons())[0];
                    contentItems = await catalogService.getCatalogContent(addon.id, type || '', catalogId || '');
                    setFadeIn(true);
                }
                setItems(contentItems);
                
                // Extract unique genres
                const genres = new Set<string>();
                contentItems.forEach(item => {
                    item.genres?.forEach(genre => genres.add(genre));
                });
                setAvailableGenres(Array.from(genres).sort());
                
                setFilteredItems(contentItems);
            } catch (error) {
                console.error('Error loading content:', error);
            } finally {
                setLoading(false);
            }
        };
        
        initializeContent();
    }, [location.state, type, catalogId]);

    // Filter content based on search and genres
    useEffect(() => {
        const filterContent = () => {
            let filtered = [...items];
            
            // Apply search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                filtered = filtered.filter(item => 
                    item.name.toLowerCase().includes(query) ||
                    item.description?.toLowerCase().includes(query)
                );
            }
            
            // Apply genre filter
            if (selectedGenres.length > 0) {
                filtered = filtered.filter(item =>
                    item.genres?.some(genre => selectedGenres.includes(genre))
                );
            }
            
            setFilteredItems(filtered);
        };
        
        filterContent();
    }, [searchQuery, selectedGenres, items]);

    const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleFilterClose = () => {
        setAnchorEl(null);
    };

    const handleGenreToggle = (genre: string) => {
        setSelectedGenres(prev => {
            const newGenres = prev.includes(genre)
                ? prev.filter(g => g !== genre)
                : [...prev, genre];
            return newGenres;
        });
    };

    const clearFilters = () => {
        setSelectedGenres([]);
        handleFilterClose();
    };

    const handleContentClick = (item: StreamingContent) => {
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
                genres: item.genres
            }
        });
    };

    return (
        <Box sx={{ 
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #000000 0%, #101720 100%)',
            pt: 2,
            pb: 4
        }}>
            <Fade in={fadeIn} timeout={600}>
                <Container maxWidth="xl">
                    {/* Header */}
                    <Box sx={{ mb: 4, px: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                            <IconButton 
                                onClick={() => navigate(-1)}
                                sx={{ 
                                    color: 'white',
                                    mr: 2,
                                    '&:hover': {
                                        background: 'rgba(255,255,255,0.1)'
                                    }
                                }}
                            >
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography 
                                variant="h5" 
                                sx={{ 
                                    color: 'white',
                                    fontWeight: 800,
                                    fontFamily: '"Montserrat", sans-serif'
                                }}
                            >
                                {location.state?.title || 'Catalog'}
                            </Typography>
                        </Box>

                        {/* Search and Filter Bar */}
                        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                            <TextField
                                fullWidth
                                variant="outlined"
                                placeholder="Search titles..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        color: 'white',
                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                        borderRadius: 2,
                                        '& fieldset': {
                                            borderColor: 'transparent'
                                        },
                                        '&:hover fieldset': {
                                            borderColor: 'rgba(255,255,255,0.2)'
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: 'rgba(255,255,255,0.3)'
                                        }
                                    }
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: 'rgba(255,255,255,0.7)' }} />
                                        </InputAdornment>
                                    )
                                }}
                            />
                            <Badge 
                                badgeContent={selectedGenres.length} 
                                color="primary"
                                sx={{
                                    '& .MuiBadge-badge': {
                                        right: 6,
                                        top: 6,
                                    }
                                }}
                            >
                                <Button
                                    variant="outlined"
                                    onClick={handleFilterClick}
                                    startIcon={<FilterListIcon />}
                                    sx={{
                                        color: 'white',
                                        borderColor: 'rgba(255,255,255,0.3)',
                                        px: 3,
                                        minWidth: '120px',
                                        '&:hover': {
                                            borderColor: 'rgba(255,255,255,0.5)',
                                            backgroundColor: 'rgba(255,255,255,0.1)'
                                        }
                                    }}
                                >
                                    Filters
                                </Button>
                            </Badge>
                        </Box>

                        {/* Filter Menu */}
                        <Menu
                            anchorEl={anchorEl}
                            open={open}
                            onClose={handleFilterClose}
                            TransitionComponent={Fade}
                            PaperProps={{
                                sx: {
                                    mt: 1,
                                    minWidth: 280,
                                    maxHeight: '70vh',
                                    backgroundColor: 'rgba(26, 32, 44, 0.95)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 2,
                                }
                            }}
                        >
                            <Box sx={{ px: 2, py: 1.5 }}>
                                <Typography 
                                    variant="subtitle2" 
                                    sx={{ 
                                        color: 'rgba(255,255,255,0.7)',
                                        fontWeight: 600,
                                        mb: 1
                                    }}
                                >
                                    Filter by Genre
                                </Typography>
                            </Box>
                            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                            <Box sx={{ maxHeight: '50vh', overflow: 'auto' }}>
                                {availableGenres.map((genre) => (
                                    <MenuItem
                                        key={genre}
                                        onClick={() => handleGenreToggle(genre)}
                                        sx={{
                                            color: 'white',
                                            py: 1,
                                            px: 2,
                                            '&:hover': {
                                                backgroundColor: 'rgba(255,255,255,0.1)'
                                            }
                                        }}
                                    >
                                        <Box sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            width: '100%',
                                            justifyContent: 'space-between'
                                        }}>
                                            {genre}
                                            {selectedGenres.includes(genre) && (
                                                <CheckIcon sx={{ color: 'primary.main', fontSize: '1.2rem' }} />
                                            )}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Box>
                            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                            <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                    onClick={clearFilters}
                                    sx={{
                                        color: 'rgba(255,255,255,0.7)',
                                        '&:hover': {
                                            color: 'white'
                                        }
                                    }}
                                >
                                    Clear All
                                </Button>
                            </Box>
                        </Menu>
                    </Box>

                    {/* Content Grid */}
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : (
                        <Grid 
                            container 
                            spacing={3} 
                            sx={{ 
                                px: 2,
                                '& .MuiGrid-item': {
                                    width: '33.333%',
                                    maxWidth: '33.333%',
                                    flexBasis: '33.333%'
                                }
                            }}
                        >
                            {filteredItems.map((item) => (
                                <Grid item key={item.id}>
                                    <Box 
                                        onClick={() => handleContentClick(item)}
                                        sx={{
                                            width: '100%',
                                            WebkitTapHighlightColor: 'transparent',
                                            '& > *': {
                                                width: '100% !important'
                                            },
                                            '&:focus': {
                                                outline: 'none'
                                            }
                                        }}
                                    >
                                        <MobileContentCard item={item} />
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    )}

                    {!loading && filteredItems.length === 0 && (
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            py: 4 
                        }}>
                            <Typography 
                                variant="body1" 
                                sx={{ 
                                    color: 'rgba(255,255,255,0.7)',
                                    textAlign: 'center'
                                }}
                            >
                                No results found
                            </Typography>
                        </Box>
                    )}
                </Container>
            </Fade>
        </Box>
    );
} 