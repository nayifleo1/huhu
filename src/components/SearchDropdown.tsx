import { Box, Typography, CircularProgress, alpha, useTheme } from '@mui/material';
import { StreamingContent } from '../types/catalog';
import MovieIcon from '@mui/icons-material/Movie';
import TvIcon from '@mui/icons-material/Tv';

interface SearchDropdownProps {
    loading: boolean;
    results: StreamingContent[];
    onItemClick: (item: StreamingContent) => void;
    anchorEl: HTMLElement | null;
}

const SearchDropdown = ({ loading, results, onItemClick, anchorEl }: SearchDropdownProps) => {
    const theme = useTheme();

    if (!anchorEl) return null;

    // Get the position of the search input
    const rect = anchorEl.getBoundingClientRect();

    const movies = results.filter(item => item.type === 'movie').slice(0, 4);
    const shows = results.filter(item => item.type === 'series').slice(0, 4);

    return (
        <Box
            sx={{
                position: 'fixed',
                top: rect.bottom + 8,
                left: rect.left,
                width: rect.width,
                maxHeight: '80vh',
                overflowY: 'auto',
                background: 'linear-gradient(180deg, rgba(2, 6, 23, 0.98) 0%, rgba(2, 6, 23, 0.95) 100%)',
                backdropFilter: 'blur(20px)',
                borderRadius: 2,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                zIndex: theme.zIndex.modal + 1
            }}
        >
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress size={24} />
                </Box>
            ) : results.length > 0 ? (
                <>
                    {/* Movies Section */}
                    {movies.length > 0 && (
                        <Box>
                            <Typography
                                sx={{
                                    px: 2,
                                    py: 1.5,
                                    color: alpha('#fff', 0.7),
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                            >
                                <MovieIcon sx={{ fontSize: 18 }} />
                                Movies
                            </Typography>
                            {movies.map((movie) => (
                                <Box
                                    key={movie.id}
                                    onClick={() => onItemClick(movie)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        p: 1.5,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            background: alpha(theme.palette.primary.main, 0.1)
                                        }
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={movie.poster}
                                        alt={movie.name}
                                        sx={{
                                            width: 45,
                                            height: 68,
                                            borderRadius: 1,
                                            objectFit: 'cover'
                                        }}
                                    />
                                    <Box>
                                        <Typography sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
                                            {movie.name}
                                        </Typography>
                                        {movie.releaseInfo && (
                                            <Typography sx={{ color: alpha('#fff', 0.5), fontSize: '0.8rem' }}>
                                                {movie.releaseInfo}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}

                    {/* TV Shows Section */}
                    {shows.length > 0 && (
                        <Box>
                            <Typography
                                sx={{
                                    px: 2,
                                    py: 1.5,
                                    color: alpha('#fff', 0.7),
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                    ...(movies.length > 0 && {
                                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                        mt: 1
                                    })
                                }}
                            >
                                <TvIcon sx={{ fontSize: 18 }} />
                                TV Shows
                            </Typography>
                            {shows.map((show) => (
                                <Box
                                    key={show.id}
                                    onClick={() => onItemClick(show)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        p: 1.5,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            background: alpha(theme.palette.primary.main, 0.1)
                                        }
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={show.poster}
                                        alt={show.name}
                                        sx={{
                                            width: 45,
                                            height: 68,
                                            borderRadius: 1,
                                            objectFit: 'cover'
                                        }}
                                    />
                                    <Box>
                                        <Typography sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
                                            {show.name}
                                        </Typography>
                                        {show.releaseInfo && (
                                            <Typography sx={{ color: alpha('#fff', 0.5), fontSize: '0.8rem' }}>
                                                {show.releaseInfo}
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}
                </>
            ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography sx={{ color: alpha('#fff', 0.5), fontSize: '0.9rem' }}>
                        No results found
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default SearchDropdown; 