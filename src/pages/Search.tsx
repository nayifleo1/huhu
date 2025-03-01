import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Grid,
    CircularProgress,
    alpha,
    Paper,
    InputBase,
    IconButton,
    useTheme,
    Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { catalogService } from '../services/catalogService';
import { StreamingContent } from '../types/catalog';
import { useDebounce } from '../hooks/useDebounce';

const INITIAL_ITEMS_TO_SHOW = 4;

const Search = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const navigate = useNavigate();
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<StreamingContent[]>([]);
    const [searchInput, setSearchInput] = useState(query);
    const [showAllMovies, setShowAllMovies] = useState(false);
    const [showAllSeries, setShowAllSeries] = useState(false);
    const debouncedSearchInput = useDebounce(searchInput, 300);

    useEffect(() => {
        if (debouncedSearchInput) {
            searchContent(debouncedSearchInput);
            setSearchParams({ q: debouncedSearchInput });
        } else {
            setResults([]);
        }
    }, [debouncedSearchInput]);

    const searchContent = async (searchQuery: string) => {
        if (!searchQuery) return;
        
        setLoading(true);
        try {
            const [movieResults, seriesResults] = await Promise.all([
                catalogService.getCatalogContent('com.linvo.cinemeta', 'movie', 'top', { search: searchQuery }),
                catalogService.getCatalogContent('com.linvo.cinemeta', 'series', 'top', { search: searchQuery })
            ]);

            const allResults = [...movieResults, ...seriesResults].filter(Boolean);
            const uniqueResults = allResults.filter((item, index, self) =>
                index === self.findIndex((t) => (
                    t.id === item.id && t.type === item.type
                ))
            );

            setResults(uniqueResults);
        } catch (error) {
            console.error('Error searching content:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
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

    const movies = results.filter(item => item.type === 'movie');
    const series = results.filter(item => item.type === 'series');
    const moviesToShow = showAllMovies ? movies : movies.slice(0, INITIAL_ITEMS_TO_SHOW);
    const seriesToShow = showAllSeries ? series : series.slice(0, INITIAL_ITEMS_TO_SHOW);

    return (
        <Box 
            sx={{ 
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #000000 0%, #000000 100%)',
                pt: { xs: 1, sm: 4 },
                pb: { xs: 6, sm: 8 }
            }}
        >
            <Container maxWidth="xl">
                {/* Search Bar */}
                <Paper
                    component="form"
                    onSubmit={(e) => e.preventDefault()}
                    sx={{
                        p: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        mb: { xs: 2, sm: 3 },
                        borderRadius: { xs: 1.5, sm: 2 },
                        background: alpha(theme.palette.background.paper, 0.4),
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            background: alpha(theme.palette.background.paper, 0.6),
                            border: '1px solid rgba(255,255,255,0.2)',
                        }
                    }}
                >
                    <InputBase
                        sx={{ 
                            ml: 2,
                            flex: 1,
                            color: 'white',
                            fontSize: { xs: '1rem', sm: '1.1rem' }
                        }}
                        placeholder="Search movies & TV shows..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        autoFocus
                    />
                    <IconButton 
                        sx={{ 
                            p: '10px',
                            color: alpha('#fff', 0.7),
                            mr: 1,
                            '&:hover': {
                                color: '#fff'
                            }
                        }}
                    >
                        <SearchIcon />
                    </IconButton>
                </Paper>

                {/* Results Title */}
                <Typography 
                    variant="h4" 
                    sx={{ 
                        mb: { xs: 0.5, sm: 1 },
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: { xs: '1.25rem', sm: '2rem' }
                    }}
                >
                    Search Results
                </Typography>
                <Typography 
                    sx={{ 
                        mb: { xs: 2, sm: 4 },
                        color: alpha('#fff', 0.7),
                        fontSize: { xs: '0.85rem', sm: '1.1rem' }
                    }}
                >
                    {debouncedSearchInput ? `Showing results for "${debouncedSearchInput}"` : 'Enter a search term to find movies and TV shows'}
                </Typography>

                {/* Loading State */}
                {loading ? (
                    <Box 
                        sx={{ 
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: '50vh'
                        }}
                    >
                        <CircularProgress />
                    </Box>
                ) : results.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {/* Movies Section */}
                        {movies.length > 0 && (
                            <Box>
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    mb: 3
                                }}>
                                    <Typography 
                                        variant="h5" 
                                        sx={{ 
                                            color: '#fff',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            fontSize: { xs: '1.1rem', sm: '1.5rem' }
                                        }}
                                    >
                                        Movies
                                        <Typography 
                                            component="span" 
                                            sx={{ 
                                                color: alpha('#fff', 0.5),
                                                fontSize: { xs: '0.9rem', sm: '1rem' },
                                                fontWeight: 400
                                            }}
                                        >
                                            ({movies.length})
                                        </Typography>
                                    </Typography>
                                    {movies.length > INITIAL_ITEMS_TO_SHOW && (
                                        <Button
                                            onClick={() => setShowAllMovies(!showAllMovies)}
                                            endIcon={<KeyboardArrowRightIcon />}
                                            sx={{
                                                color: theme.palette.primary.main,
                                                '&:hover': {
                                                    background: alpha(theme.palette.primary.main, 0.1)
                                                }
                                            }}
                                        >
                                            {showAllMovies ? 'Show Less' : 'See All'}
                                        </Button>
                                    )}
                                </Box>
                                <Grid container spacing={1}>
                                    {moviesToShow.map((item) => (
                                        <Grid item xs={4} sm={4} md={3} lg={2} key={item.id}>
                                            <Box
                                                onClick={() => handleContentClick(item)}
                                                sx={{
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    borderRadius: 2,
                                                    overflow: 'hidden',
                                                    aspectRatio: '2/3',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                                    '&:hover': {
                                                        transform: 'scale(1.03)',
                                                        boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                                                        '& .content-overlay': {
                                                            opacity: 1
                                                        }
                                                    }
                                                }}
                                            >
                                                <Box
                                                    component="img"
                                                    src={item.poster}
                                                    alt={item.name}
                                                    sx={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover'
                                                    }}
                                                />
                                                <Box
                                                    className="content-overlay"
                                                    sx={{
                                                        position: 'absolute',
                                                        bottom: 0,
                                                        left: 0,
                                                        right: 0,
                                                        p: 2,
                                                        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)',
                                                        opacity: 0,
                                                        transition: 'opacity 0.3s ease'
                                                    }}
                                                >
                                                    <Typography
                                                        sx={{ 
                                                            color: '#fff',
                                                            fontWeight: 600,
                                                            fontSize: { xs: '0.8rem', sm: '1.1rem' },
                                                            mb: 0.5
                                                        }}
                                                    >
                                                        {item.name}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                        {item.releaseInfo && (
                                                            <Typography 
                                                                sx={{ 
                                                                    color: alpha('#fff', 0.7),
                                                                    fontSize: { xs: '0.8rem', sm: '0.9rem' }
                                                                }}
                                                            >
                                                                {item.releaseInfo}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        )}

                        {/* TV Shows Section */}
                        {series.length > 0 && (
                            <Box>
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    mb: 3
                                }}>
                                    <Typography 
                                        variant="h5" 
                                        sx={{ 
                                            color: '#fff',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            fontSize: { xs: '1.1rem', sm: '1.5rem' }
                                        }}
                                    >
                                        TV Shows
                                        <Typography 
                                            component="span" 
                                            sx={{ 
                                                color: alpha('#fff', 0.5),
                                                fontSize: { xs: '0.9rem', sm: '1rem' },
                                                fontWeight: 400
                                            }}
                                        >
                                            ({series.length})
                                        </Typography>
                                    </Typography>
                                    {series.length > INITIAL_ITEMS_TO_SHOW && (
                                        <Button
                                            onClick={() => setShowAllSeries(!showAllSeries)}
                                            endIcon={<KeyboardArrowRightIcon />}
                                            sx={{
                                                color: theme.palette.primary.main,
                                                '&:hover': {
                                                    background: alpha(theme.palette.primary.main, 0.1)
                                                }
                                            }}
                                        >
                                            {showAllSeries ? 'Show Less' : 'See All'}
                                        </Button>
                                    )}
                                </Box>
                                <Grid container spacing={1}>
                                    {seriesToShow.map((item) => (
                                        <Grid item xs={4} sm={4} md={3} lg={2} key={item.id}>
                                            <Box
                                                onClick={() => handleContentClick(item)}
                                                sx={{
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    borderRadius: 2,
                                                    overflow: 'hidden',
                                                    aspectRatio: '2/3',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                                    '&:hover': {
                                                        transform: 'scale(1.03)',
                                                        boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                                                        '& .content-overlay': {
                                                            opacity: 1
                                                        }
                                                    }
                                                }}
                                            >
                                                <Box
                                                    component="img"
                                                    src={item.poster}
                                                    alt={item.name}
                                                    sx={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover'
                                                    }}
                                                />
                                                <Box
                                                    className="content-overlay"
                                                    sx={{
                                                        position: 'absolute',
                                                        bottom: 0,
                                                        left: 0,
                                                        right: 0,
                                                        p: 2,
                                                        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)',
                                                        opacity: 0,
                                                        transition: 'opacity 0.3s ease'
                                                    }}
                                                >
                                                    <Typography
                                                        sx={{ 
                                                            color: '#fff',
                                                            fontWeight: 600,
                                                            fontSize: { xs: '0.8rem', sm: '1.1rem' },
                                                            mb: 0.5
                                                        }}
                                                    >
                                                        {item.name}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                        {item.releaseInfo && (
                                                            <Typography 
                                                                sx={{ 
                                                                    color: alpha('#fff', 0.7),
                                                                    fontSize: { xs: '0.8rem', sm: '0.9rem' }
                                                                }}
                                                            >
                                                                {item.releaseInfo}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        )}
                    </Box>
                ) : debouncedSearchInput ? (
                    <Box 
                        sx={{ 
                            textAlign: 'center',
                            py: 8
                        }}
                    >
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                color: alpha('#fff', 0.7),
                                mb: 1,
                                fontSize: { xs: '1.1rem', sm: '1.25rem' }
                            }}
                        >
                            No results found
                        </Typography>
                        <Typography 
                            sx={{ 
                                color: alpha('#fff', 0.5),
                                fontSize: { xs: '0.9rem', sm: '1rem' }
                            }}
                        >
                            Try different keywords or check your spelling
                        </Typography>
                    </Box>
                ) : null}
            </Container>
        </Box>
    );
};

export default Search; 