import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Grid,
    alpha,
    Paper,
    InputBase,
    IconButton,
    useTheme,
    List,
    ListItem,
    ListItemText,
    Fab,
    Chip,
    Tab,
    Tabs,
    Container,
    Skeleton,
    Snackbar,
    Alert,
    SwipeableDrawer
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { catalogService } from '../services/catalogService';
import { StreamingContent } from '../types/catalog';
import { useDebounce } from '../hooks/useDebounce';

const Search = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const initialType = searchParams.get('type') || 'all';
    const initialSort = searchParams.get('sort') || 'relevance';
    
    const navigate = useNavigate();
    const theme = useTheme();
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchCache = useRef<{ [key: string]: StreamingContent[] }>({});
    const abortController = useRef<AbortController | null>(null);
    
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<StreamingContent[]>([]);
    const [filteredResults, setFilteredResults] = useState<StreamingContent[]>([]);
    const [searchInput, setSearchInput] = useState(query);
    const [contentType, setContentType] = useState<string>(initialType);
    const [sortOrder, setSortOrder] = useState<string>(initialSort);
    const [error, setError] = useState<string | null>(null);
    const [tabValue, setTabValue] = useState(0);
    const [showToTop, setShowToTop] = useState(false);
    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    
    const debouncedSearchInput = useDebounce(searchInput, 500);

    // Handle scroll to show/hide "to top" button
    useEffect(() => {
        const handleScroll = () => {
            setShowToTop(window.scrollY > 300);
        };
        
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    
    // Focus search input on component mount
    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    // Search when input changes
    useEffect(() => {
        // Only search if input is at least 2 characters
        if (debouncedSearchInput && debouncedSearchInput.length >= 2) {
            searchContent(debouncedSearchInput);
            updateUrlParams();
        } else {
            setResults([]);
            setFilteredResults([]);
        }
    }, [debouncedSearchInput]);

    // Apply filters and sorting when results, type or sort order changes
    useEffect(() => {
        if (results.length > 0) {
            applyFiltersAndSort();
        }
    }, [results, contentType, sortOrder]);

    const updateUrlParams = () => {
        const params: Record<string, string> = {};
        
        if (debouncedSearchInput) params.q = debouncedSearchInput;
        if (contentType !== 'all') params.type = contentType;
        if (sortOrder !== 'relevance') params.sort = sortOrder;
        
        setSearchParams(params);
    };

    const searchContent = async (searchQuery: string) => {
        if (!searchQuery) return;
        
        // Cancel any ongoing search
        if (abortController.current) {
            abortController.current.abort();
        }
        abortController.current = new AbortController();
        
        // Check cache first
        const cacheKey = `${searchQuery}-${contentType}`;
        if (searchCache.current[cacheKey]) {
            setResults(searchCache.current[cacheKey]);
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            // Only fetch the content type we need
            let promises = [];
            if (contentType === 'all' || contentType === 'movie') {
                promises.push(catalogService.getCatalogContent('com.linvo.cinemeta', 'movie', 'top', { search: searchQuery }));
            }
            if (contentType === 'all' || contentType === 'series') {
                promises.push(catalogService.getCatalogContent('com.linvo.cinemeta', 'series', 'top', { search: searchQuery }));
            }

            const results = await Promise.all(promises);
            const allResults = results.flat().filter(Boolean);
            
            // Remove duplicates
            const uniqueResults = allResults.filter((item, index, self) =>
                index === self.findIndex((t) => (
                    t.id === item.id && t.type === item.type
                ))
            );

            // Cache the results
            searchCache.current[cacheKey] = uniqueResults;
            setResults(uniqueResults);
        } catch (err: any) {
            // Only show error if it's not an abort error
            if (err.name !== 'AbortError') {
                console.error('Error searching content:', err);
                setResults([]);
                setError('Failed to fetch search results. Please try again later.');
            }
        } finally {
            if (abortController.current) {
                abortController.current = null;
            }
            setLoading(false);
        }
    };

    const applyFiltersAndSort = () => {
        let filtered = [...results];
        
        // Apply type filter
        if (contentType !== 'all') {
            filtered = filtered.filter(item => item.type === contentType);
        }
        
        // Apply sorting
        if (sortOrder === 'name-asc') {
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortOrder === 'name-desc') {
            filtered.sort((a, b) => b.name.localeCompare(a.name));
        } else if (sortOrder === 'year-desc') {
            filtered.sort((a, b) => {
                const yearA = a.releaseInfo ? parseInt(a.releaseInfo, 10) : 0;
                const yearB = b.releaseInfo ? parseInt(b.releaseInfo, 10) : 0;
                return yearB - yearA;
            });
        } else if (sortOrder === 'year-asc') {
            filtered.sort((a, b) => {
                const yearA = a.releaseInfo ? parseInt(a.releaseInfo, 10) : 0;
                const yearB = b.releaseInfo ? parseInt(b.releaseInfo, 10) : 0;
                return yearA - yearB;
            });
        } else if (sortOrder === 'rating-desc') {
            filtered.sort((a, b) => {
                const ratingA = a.imdbRating ? parseFloat(a.imdbRating) : 0;
                const ratingB = b.imdbRating ? parseFloat(b.imdbRating) : 0;
                return ratingB - ratingA;
            });
        }
        
        setFilteredResults(filtered);
    };

    const handleContentClick = (item: StreamingContent) => {
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

    const handleClearSearch = () => {
        setSearchInput('');
        setResults([]);
        setFilteredResults([]);
        setSearchParams({});
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        setContentType(newValue === 0 ? 'all' : newValue === 1 ? 'movie' : 'series');
    };

    const handleCloseError = () => {
        setError(null);
    };

    const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
        event.currentTarget.src = 'https://via.placeholder.com/300x450?text=No+Poster';
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleFilterDrawer = (open: boolean) => () => {
        setFilterDrawerOpen(open);
    };

    const handleSortSelect = (value: string) => {
        setSortOrder(value);
        setFilterDrawerOpen(false);
    };

    const movies = results.filter(item => item.type === 'movie');
    const series = results.filter(item => item.type === 'series');
    
    const renderContentCards = (items: StreamingContent[]) => (
        <Grid container spacing={1}>
            {items.map((item) => (
                <Grid item xs={4} key={item.id}>
                    <Box
                        onClick={() => handleContentClick(item)}
                        sx={{
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                            borderRadius: 1,
                            overflow: 'hidden',
                            aspectRatio: '2/3',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            mb: 1,
                            '&:active': {
                                transform: 'scale(0.97)',
                            }
                        }}
                    >
                        <Box
                            component="img"
                            src={item.poster}
                            alt={item.name}
                            onError={handleImageError}
                            sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                        />
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                p: 1,
                                background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)',
                            }}
                        >
                            <Typography
                                sx={{ 
                                    color: '#fff',
                                    fontWeight: 500,
                                    fontSize: '0.85rem',
                                    lineHeight: 1.2,
                                    mb: 0.5,
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    display: '-webkit-box'
                                }}
                            >
                                {item.name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {item.releaseInfo && (
                                    <Typography 
                                        sx={{ 
                                            color: alpha('#fff', 0.7),
                                            fontSize: '0.7rem'
                                        }}
                                    >
                                        {item.releaseInfo}
                                    </Typography>
                                )}
                                {item.imdbRating && (
                                    <Chip 
                                        label={`★ ${item.imdbRating}`} 
                                        size="small" 
                                        sx={{ 
                                            height: 16, 
                                            fontSize: '0.6rem',
                                            ml: 'auto',
                                            backgroundColor: theme.palette.warning.dark,
                                            color: 'white'
                                        }}
                                    />
                                )}
                            </Box>
                        </Box>
                    </Box>
                </Grid>
            ))}
        </Grid>
    );
    
    const renderSkeletons = () => (
        <Grid container spacing={1}>
            {Array.from(new Array(12)).map((_, index) => (
                <Grid item xs={4} key={index}>
                    <Skeleton 
                        variant="rectangular" 
                        animation="wave"
                        sx={{ 
                            width: '100%', 
                            aspectRatio: '2/3',
                            borderRadius: 1,
                            mb: 1
                        }} 
                    />
                </Grid>
            ))}
        </Grid>
    );

    return (
        <Box 
            sx={{ 
                minHeight: '100vh',
                background: '#121212',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* App Bar with Search */}
            <Paper
                elevation={1}
                sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    borderRadius: 0,
                    backgroundColor: alpha(theme.palette.background.paper, 0.95),
                    backdropFilter: 'blur(10px)'
                }}
            >
                <Box sx={{ p: 1 }}>
                    <Paper
                        component="form"
                        onSubmit={(e) => e.preventDefault()}
                        sx={{
                            p: '2px 4px',
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            borderRadius: 4,
                            backgroundColor: alpha('#fff', 0.1),
                        }}
                    >
                        <IconButton sx={{ p: 1, color: alpha('#fff', 0.7) }}>
                            <SearchIcon fontSize="small" />
                        </IconButton>
                        <InputBase
                            inputRef={searchInputRef}
                            sx={{ 
                                ml: 1,
                                flex: 1,
                                color: 'white',
                                fontSize: '0.95rem'
                            }}
                            placeholder="Search by title or actor name (typo-friendly)..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            inputProps={{ 'aria-label': 'search movies and tv shows' }}
                        />
                        {searchInput && (
                            <IconButton 
                                aria-label="clear search"
                                onClick={handleClearSearch}
                                sx={{ p: 1, color: alpha('#fff', 0.7) }}
                            >
                                <ClearIcon fontSize="small" />
                            </IconButton>
                        )}
                        <IconButton 
                            onClick={toggleFilterDrawer(true)}
                            sx={{ 
                                p: 1, 
                                ml: 0.5, 
                                color: alpha('#fff', sortOrder !== 'relevance' ? 1 : 0.7) 
                            }}
                        >
                            <FilterListIcon fontSize="small" />
                        </IconButton>
                    </Paper>
                </Box>

                {results.length > 0 && (
                    <Tabs 
                        value={tabValue} 
                        onChange={handleTabChange}
                        variant="fullWidth"
                        sx={{
                            minHeight: 40,
                            '& .MuiTab-root': {
                                minHeight: 40,
                                fontSize: '0.85rem',
                                py: 0
                            }
                        }}
                    >
                        <Tab label={`All (${results.length})`} />
                        <Tab label={`Movies (${movies.length})`} />
                        <Tab label={`TV Shows (${series.length})`} />
                    </Tabs>
                )}
            </Paper>

            {/* Main Content */}
            <Container disableGutters maxWidth={false} sx={{ flex: 1, px: 1.5, pb: 2 }}>
                {/* Status Text */}
                {debouncedSearchInput && (
                    <Typography 
                        sx={{ 
                            py: 1.5,
                            color: alpha('#fff', 0.7),
                            fontSize: '0.85rem'
                        }}
                    >
                        {loading 
                            ? `Searching for "${debouncedSearchInput}"...` 
                            : filteredResults.length > 0 
                              ? `Found ${filteredResults.length} results for "${debouncedSearchInput}"`
                              : `No results for "${debouncedSearchInput}"`
                        }
                    </Typography>
                )}

                {/* Loading State */}
                {loading ? (
                    renderSkeletons()
                ) : filteredResults.length > 0 ? (
                    renderContentCards(filteredResults)
                ) : debouncedSearchInput ? (
                    <Box 
                        sx={{ 
                            textAlign: 'center',
                            py: 8
                        }}
                    >
                        <Typography 
                            variant="body1" 
                            sx={{ 
                                color: alpha('#fff', 0.7),
                                mb: 1,
                                fontSize: '1rem'
                            }}
                        >
                            No results found
                        </Typography>
                        <Typography 
                            variant="body2"
                            sx={{ 
                                color: alpha('#fff', 0.5),
                                fontSize: '0.85rem'
                            }}
                        >
                            Try different keywords or check your spelling
                        </Typography>
                    </Box>
                ) : (
                    <Box 
                        sx={{ 
                            textAlign: 'center',
                            py: 8,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '60vh'
                        }}
                    >
                        <SearchIcon sx={{ fontSize: 48, color: alpha('#fff', 0.2), mb: 2 }} />
                        <Typography 
                            variant="body1" 
                            sx={{ 
                                color: alpha('#fff', 0.7),
                                mb: 1,
                                fontSize: '1rem'
                            }}
                        >
                            Search for movies and TV shows
                        </Typography>
                        <Typography 
                            variant="body2"
                            sx={{ 
                                color: alpha('#fff', 0.5),
                                fontSize: '0.85rem'
                            }}
                        >
                            Enter a title, actor or genre to get started
                        </Typography>
                    </Box>
                )}
            </Container>

            {/* Filter Bottom Sheet */}
            <SwipeableDrawer
                anchor="bottom"
                open={filterDrawerOpen}
                onClose={toggleFilterDrawer(false)}
                onOpen={toggleFilterDrawer(true)}
                disableSwipeToOpen
                sx={{
                    '& .MuiDrawer-paper': {
                        borderTopLeftRadius: 16,
                        borderTopRightRadius: 16,
                        maxHeight: '75vh'
                    }
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography 
                        variant="subtitle1" 
                        sx={{ 
                            fontWeight: 500, 
                            textAlign: 'center',
                            pb: 1,
                            borderBottom: '1px solid',
                            borderColor: alpha('#000', 0.1)
                        }}
                    >
                        Sort Results
                    </Typography>
                </Box>
                <List sx={{ pt: 0 }}>
                    {[
                        { value: 'relevance', label: 'Relevance' },
                        { value: 'name-asc', label: 'Name (A-Z)' },
                        { value: 'name-desc', label: 'Name (Z-A)' },
                        { value: 'year-desc', label: 'Year (Newest)' },
                        { value: 'year-asc', label: 'Year (Oldest)' },
                        { value: 'rating-desc', label: 'Rating (High-Low)' }
                    ].map((option) => (
                        <ListItem 
                            key={option.value} 
                            onClick={() => handleSortSelect(option.value)}
                            sx={{ 
                                py: 1.5,
                                cursor: 'pointer',
                                '&:hover': {
                                    backgroundColor: alpha('#000', 0.04)
                                }
                            }}
                        >
                            <ListItemText primary={option.label} />
                            {sortOrder === option.value ? (
                                <CheckCircleIcon color="primary" />
                            ) : (
                                <RadioButtonUncheckedIcon sx={{ color: alpha('#000', 0.3) }} />
                            )}
                        </ListItem>
                    ))}
                </List>
            </SwipeableDrawer>

            {/* Scroll to Top FAB */}
            {showToTop && (
                <Fab
                    size="small"
                    color="primary"
                    aria-label="scroll back to top"
                    onClick={scrollToTop}
                    sx={{
                        position: 'fixed',
                        bottom: 16,
                        right: 16,
                        opacity: 0.9
                    }}
                >
                    <KeyboardArrowUpIcon />
                </Fab>
            )}

            {/* Error Snackbar */}
            <Snackbar
                open={!!error}
                autoHideDuration={4000}
                onClose={handleCloseError}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert 
                    onClose={handleCloseError} 
                    severity="error" 
                    sx={{ 
                        width: '100%',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                >
                    {error}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Search; 