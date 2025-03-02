import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    IconButton,
    CircularProgress,
    Dialog,
    DialogContent,
    alpha,
    useTheme,
    Chip,
    Grid,
    Slide,
    Fade,
    Tab,
    Tabs
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { TransitionProps } from '@mui/material/transitions';
import React from 'react';
import axios from 'axios';

// Import TMDb configuration from catalogService
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MzljNDc4YTc3MWYzNWMwNTAyMmY5ZmVhYmNjYTAxYyIsIm5iZiI6MTcwOTkxMTEzNS4xNCwic3ViIjoiNjVlYjJjNWYzODlkYTEwMTYyZDgyOWU0Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.gosBVl1wYUbePOeB9WieHn8bY9x938-GSGmlXZK_UVM';

// Define interface for cast member details
interface CastMemberDetails {
    id: number;
    name: string;
    profilePath: string | null;
    biography: string;
    birthday?: string;
    placeOfBirth?: string;
    deathday?: string;
    knownForDepartment?: string;
    alsoKnownAs?: string[];
    gender?: number;
    homepage?: string;
    knownFor?: {
        id: string;
        title: string;
        posterPath: string | null;
        mediaType: string;
        character?: string;
        releaseDate?: string;
    }[];
}

interface CastMemberPopupProps {
    open: boolean;
    onClose: () => void;
    castId: number | null;
}

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const CastMemberPopup = ({ open, onClose, castId }: CastMemberPopupProps) => {
    const theme = useTheme();
    const [castDetails, setCastDetails] = useState<CastMemberDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);

    // Fetch cast member details when castId changes
    useEffect(() => {
        if (!castId || !open) return;

        const fetchCastDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch from TMDb API using the configured access token
                const response = await axios.get(`${TMDB_BASE_URL}/person/${castId}`, {
                    params: {
                        append_to_response: 'combined_credits'
                    },
                    headers: {
                        'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
                        'accept': 'application/json'
                    }
                });
                
                const data = response.data;
                
                // Process the data into our format
                const processedData: CastMemberDetails = {
                    id: data.id,
                    name: data.name,
                    profilePath: data.profile_path ? `https://image.tmdb.org/t/p/w500${data.profile_path}` : null,
                    biography: data.biography || 'No biography available.',
                    birthday: data.birthday,
                    placeOfBirth: data.place_of_birth,
                    deathday: data.deathday,
                    knownForDepartment: data.known_for_department,
                    alsoKnownAs: data.also_known_as,
                    gender: data.gender,
                    homepage: data.homepage,
                    knownFor: []
                };
                
                // Process known for works
                if (data.combined_credits?.cast) {
                    // Sort by popularity and take top 10
                    const knownFor = data.combined_credits.cast
                        .sort((a: any, b: any) => b.popularity - a.popularity)
                        .slice(0, 10)
                        .map((credit: any) => ({
                            id: credit.id,
                            title: credit.title || credit.name,
                            posterPath: credit.poster_path ? `https://image.tmdb.org/t/p/w200${credit.poster_path}` : null,
                            mediaType: credit.media_type,
                            character: credit.character,
                            releaseDate: credit.release_date || credit.first_air_date
                        }));
                    processedData.knownFor = knownFor;
                }
                
                setCastDetails(processedData);
            } catch (err) {
                console.error('Error fetching cast details:', err);
                setError('Failed to load cast information. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchCastDetails();
    }, [castId, open]);

    // Reset state when dialog closes
    const handleClose = () => {
        onClose();
        // Don't reset the data immediately for smoother transitions
        setTimeout(() => {
            if (!open) {
                setCastDetails(null);
                setError(null);
            }
        }, 300);
    };

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    return (
        <Dialog
            open={open}
            TransitionComponent={Transition}
            keepMounted
            onClose={handleClose}
            fullWidth
            maxWidth="sm"
            sx={{
                '& .MuiDialog-paper': {
                    borderRadius: 2,
                    background: 'linear-gradient(to bottom, rgba(25, 25, 25, 0.98), rgba(15, 15, 15, 0.97))',
                    backgroundSize: 'cover',
                    overflow: 'hidden',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    backdropFilter: 'blur(20px)',
                    margin: { xs: 1, sm: 2 },
                    maxHeight: '90vh'
                }
            }}
        >
            <IconButton
                onClick={handleClose}
                sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 2,
                    color: '#fff',
                    bgcolor: alpha(theme.palette.background.paper, 0.2),
                    backdropFilter: 'blur(5px)',
                    '&:hover': {
                        bgcolor: alpha(theme.palette.background.paper, 0.3),
                    },
                    padding: '6px'
                }}
            >
                <CloseIcon fontSize="small" />
            </IconButton>
            
            <DialogContent sx={{ p: 0, overflowX: 'hidden' }}>
                {loading ? (
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '40vh',
                        flexDirection: 'column',
                        gap: 2
                    }}>
                        <CircularProgress size={36} />
                        <Typography variant="body2" sx={{ color: alpha('#fff', 0.8) }}>
                            Loading...
                        </Typography>
                    </Box>
                ) : error ? (
                    <Box sx={{
                        p: 3,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '30vh',
                        flexDirection: 'column'
                    }}>
                        <Typography variant="body2" sx={{ color: theme.palette.error.main, mb: 1 }}>
                            {error}
                        </Typography>
                    </Box>
                ) : castDetails ? (
                    <Box sx={{ overflow: 'auto', maxHeight: '90vh' }}>
                        {/* Compact Header */}
                        <Box sx={{
                            position: 'relative',
                            display: 'flex',
                            p: 2,
                            pb: 1,
                            alignItems: 'center',
                            borderBottom: `1px solid ${alpha('#fff', 0.1)}`
                        }}>
                            {/* Profile image */}
                            <Box sx={{
                                width: '70px',
                                height: '70px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                flexShrink: 0,
                                border: `1px solid ${alpha('#fff', 0.2)}`,
                                bgcolor: 'rgba(0,0,0,0.3)'
                            }}>
                                {castDetails.profilePath ? (
                                    <img 
                                        src={castDetails.profilePath}
                                        alt={castDetails.name}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                        }}
                                    />
                                ) : (
                                    <Box sx={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: alpha(theme.palette.primary.main, 0.1)
                                    }}>
                                        <Typography variant="h6" sx={{ color: alpha('#fff', 0.7) }}>
                                            {castDetails.name.substring(0, 1)}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                            
                            {/* Name and basic info */}
                            <Box sx={{
                                ml: 2,
                                overflow: 'hidden'
                            }}>
                                <Typography variant="h6" sx={{
                                    color: '#fff',
                                    fontWeight: 600,
                                    mb: 0.5,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {castDetails.name}
                                </Typography>
                                
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {castDetails.knownForDepartment && (
                                        <Chip 
                                            label={castDetails.knownForDepartment}
                                            size="small"
                                            sx={{
                                                height: '20px',
                                                fontSize: '0.7rem',
                                                bgcolor: alpha(theme.palette.primary.main, 0.2),
                                                color: theme.palette.primary.light
                                            }}
                                        />
                                    )}
                                </Box>
                            </Box>
                        </Box>
                        
                        {/* Tabs for different sections */}
                        <Tabs 
                            value={activeTab} 
                            onChange={handleTabChange}
                            variant="fullWidth"
                            sx={{
                                minHeight: '40px',
                                '& .MuiTab-root': {
                                    minHeight: '40px',
                                    fontSize: '0.8rem',
                                    color: alpha('#fff', 0.7),
                                    '&.Mui-selected': {
                                        color: '#fff'
                                    }
                                },
                                '& .MuiTabs-indicator': {
                                    backgroundColor: theme.palette.primary.main
                                }
                            }}
                        >
                            <Tab label="About" />
                            <Tab label="Known For" />
                            <Tab label="Info" />
                        </Tabs>
                        
                        {/* Tab content */}
                        <Box sx={{ p: 2, pt: 1.5 }}>
                            {/* About tab */}
                            {activeTab === 0 && (
                                <Box>
                                    <Typography variant="body2" sx={{ 
                                        color: alpha('#fff', 0.9),
                                        lineHeight: 1.6,
                                        fontSize: '0.9rem',
                                        whiteSpace: 'pre-line',
                                        maxHeight: '50vh',
                                        overflow: 'auto'
                                    }}>
                                        {castDetails.biography?.trim() || 'No biography available.'}
                                    </Typography>
                                </Box>
                            )}
                            
                            {/* Known For tab */}
                            {activeTab === 1 && castDetails.knownFor && castDetails.knownFor.length > 0 && (
                                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                                    {castDetails.knownFor.map((work) => (
                                        <Grid item xs={4} sm={4} key={`${work.mediaType}-${work.id}`}>
                                            <Fade in timeout={300}>
                                                <Box sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    height: '100%',
                                                    borderRadius: 1,
                                                    overflow: 'hidden',
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        transform: 'translateY(-3px)',
                                                        boxShadow: `0 3px 10px rgba(0,0,0,0.2), 0 0 0 1px ${alpha(theme.palette.primary.main, 0.3)}`,
                                                        '& .media-title': {
                                                            color: theme.palette.primary.light
                                                        }
                                                    }
                                                }}>
                                                    <Box sx={{
                                                        position: 'relative',
                                                        paddingTop: '150%',
                                                        bgcolor: alpha('#fff', 0.05),
                                                        borderRadius: 1,
                                                        overflow: 'hidden',
                                                        border: `1px solid ${alpha('#fff', 0.1)}`
                                                    }}>
                                                        {work.posterPath ? (
                                                            <img 
                                                                src={work.posterPath}
                                                                alt={work.title}
                                                                style={{
                                                                    position: 'absolute',
                                                                    top: 0,
                                                                    left: 0,
                                                                    width: '100%',
                                                                    height: '100%',
                                                                    objectFit: 'cover'
                                                                }}
                                                            />
                                                        ) : (
                                                            <Box sx={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: 0,
                                                                width: '100%',
                                                                height: '100%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexDirection: 'column',
                                                                p: 1
                                                            }}>
                                                                <Typography variant="caption" sx={{ 
                                                                    color: alpha('#fff', 0.7),
                                                                    textAlign: 'center',
                                                                    fontSize: '0.7rem'
                                                                }}>
                                                                    {work.title}
                                                                </Typography>
                                                            </Box>
                                                        )}

                                                        {/* Media type badge */}
                                                        <Box sx={{
                                                            position: 'absolute',
                                                            top: 4,
                                                            right: 4,
                                                            bgcolor: alpha('#000', 0.6),
                                                            color: '#fff',
                                                            borderRadius: 0.5,
                                                            px: 0.5,
                                                            py: 0.25,
                                                            fontSize: '0.6rem',
                                                            backdropFilter: 'blur(4px)',
                                                            textTransform: 'uppercase',
                                                            fontWeight: 600
                                                        }}>
                                                            {work.mediaType === 'movie' ? 'Movie' : 'TV'}
                                                        </Box>
                                                    </Box>
                                                    <Box sx={{ mt: 0.5, px: 0.5 }}>
                                                        <Typography variant="caption" className="media-title" sx={{ 
                                                            color: '#fff',
                                                            fontWeight: 600,
                                                            transition: 'color 0.2s',
                                                            display: 'block',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            fontSize: '0.75rem'
                                                        }}>
                                                            {work.title}
                                                        </Typography>
                                                        
                                                        {work.releaseDate && (
                                                            <Typography variant="caption" sx={{ 
                                                                color: alpha('#fff', 0.7),
                                                                display: 'block',
                                                                fontSize: '0.65rem'
                                                            }}>
                                                                {new Date(work.releaseDate).getFullYear()}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </Fade>
                                        </Grid>
                                    ))}
                                </Grid>
                            )}
                            
                            {/* Info tab */}
                            {activeTab === 2 && (
                                <Box sx={{ 
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1.5
                                }}>
                                    {castDetails.birthday && (
                                        <Box>
                                            <Typography variant="caption" sx={{ color: alpha('#fff', 0.6), fontSize: '0.7rem' }}>
                                                Born
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.85rem' }}>
                                                {formatDate(castDetails.birthday)}
                                            </Typography>
                                        </Box>
                                    )}
                                    
                                    {castDetails.placeOfBirth && (
                                        <Box>
                                            <Typography variant="caption" sx={{ color: alpha('#fff', 0.6), fontSize: '0.7rem' }}>
                                                Place of Birth
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.85rem' }}>
                                                {castDetails.placeOfBirth}
                                            </Typography>
                                        </Box>
                                    )}
                                    
                                    {castDetails.deathday && (
                                        <Box>
                                            <Typography variant="caption" sx={{ color: alpha('#fff', 0.6), fontSize: '0.7rem' }}>
                                                Died
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.85rem' }}>
                                                {formatDate(castDetails.deathday)}
                                            </Typography>
                                        </Box>
                                    )}
                                    
                                    {castDetails.alsoKnownAs && castDetails.alsoKnownAs.length > 0 && (
                                        <Box>
                                            <Typography variant="caption" sx={{ color: alpha('#fff', 0.6), fontSize: '0.7rem' }}>
                                                Also Known As
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.85rem' }}>
                                                {castDetails.alsoKnownAs.join(', ')}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Box>
                ) : null}
            </DialogContent>
        </Dialog>
    );
};

export default CastMemberPopup; 