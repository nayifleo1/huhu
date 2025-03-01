import { useState, useEffect, useRef } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    IconButton,
    Tooltip,
    Menu,
    MenuItem,
    Badge,
    Slide,
    alpha,
    Paper,
    InputBase,
    useTheme,
    useMediaQuery,
    ClickAwayListener
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ExtensionIcon from '@mui/icons-material/Extension';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { Link, useNavigate } from 'react-router-dom';
import StremioService from '../services/stremioService';
import { catalogService } from '../services/catalogService';
import { StreamingContent } from '../types/catalog';
import SearchDropdown from './SearchDropdown';
import { useDebounce } from '../hooks/useDebounce';
import { useScrollHide } from '../contexts/ScrollHideContext';

interface HideOnScrollProps {
    children: React.ReactElement;
}

function HideOnScroll({ children }: HideOnScrollProps) {
    const { showNavigation } = useScrollHide();

    return (
        <Slide appear={false} direction="down" in={showNavigation}>
            {children}
        </Slide>
    );
}

const Navbar = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [addAddonUrl, setAddAddonUrl] = useState('');
    const [addAddonDialogOpen, setAddAddonDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<StreamingContent[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [installedAddons, setInstalledAddons] = useState<number>(0);
    const searchInputRef = useRef<HTMLFormElement>(null);
    const stremioService = StremioService.getInstance();
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    if (isMobile) {
        return (
            <>
                <HideOnScroll>
                    <AppBar 
                        position="fixed" 
                        elevation={0}
                        sx={{ 
                            background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.98) 0%, rgba(0, 0, 0, 0.85) 100%)',
                            backdropFilter: 'blur(20px)',
                            borderBottom: '1px solid rgba(20, 184, 166, 0.1)'
                        }}
                    >
                        <Toolbar sx={{ justifyContent: 'center' }}>
                            <Typography 
                                variant="h4" 
                                sx={{ 
                                    fontFamily: "'Comic Sans MS', cursive",
                                    fontWeight: 'bold',
                                    background: 'linear-gradient(45deg, #2dd4bf, #14b8a6)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    letterSpacing: '2px',
                                    transform: 'rotate(-2deg)',
                                    textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
                                }}
                            >
                                HuHu
                            </Typography>
                        </Toolbar>
                    </AppBar>
                </HideOnScroll>
                <Toolbar /> {/* Spacer for fixed AppBar */}
            </>
        );
    }

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleManageAddons = () => {
        handleMenuClose();
        navigate('/addons');
    };

    const handleAddAddon = async () => {
        if (!addAddonUrl) return;
        
        try {
            await stremioService.installAddon(addAddonUrl);
            setAddAddonUrl('');
            setAddAddonDialogOpen(false);
            const addons = stremioService.getInstalledAddons();
            setInstalledAddons(addons.length);
        } catch (error) {
            console.error('Error installing addon:', error);
        }
    };

    useEffect(() => {
        if (debouncedSearchQuery) {
            searchContent();
        } else {
            setSearchResults([]);
        }
    }, [debouncedSearchQuery]);

    const searchContent = async () => {
        if (!debouncedSearchQuery) return;
        
        setLoading(true);
        try {
            const [movieResults, seriesResults] = await Promise.all([
                catalogService.getCatalogContent('com.linvo.cinemeta', 'movie', 'top', { search: debouncedSearchQuery }),
                catalogService.getCatalogContent('com.linvo.cinemeta', 'series', 'top', { search: debouncedSearchQuery })
            ]);

            const allResults = [...movieResults, ...seriesResults].filter(Boolean);
            const uniqueResults = allResults.filter((item, index, self) =>
                index === self.findIndex((t) => (
                    t.id === item.id && t.type === item.type
                ))
            );

            setSearchResults(uniqueResults);
        } catch (error) {
            console.error('Error searching content:', error);
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchFocus = () => {
        setShowDropdown(true);
    };

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(event.target.value);
        setShowDropdown(true);
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
        setShowDropdown(false);
        setSearchQuery('');
    };

    useEffect(() => {
        const addons = stremioService.getInstalledAddons();
        setInstalledAddons(addons.length);
    }, []);

    return (
        <>
            <HideOnScroll>
                <AppBar 
                    position="fixed" 
                    elevation={0}
                    sx={{ 
                        background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.98) 0%, rgba(0, 0, 0, 0.85) 100%)',
                        backdropFilter: 'blur(20px)',
                        borderBottom: '1px solid rgba(20, 184, 166, 0.1)'
                    }}
                >
                    <Toolbar sx={{ gap: 2, justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box 
                                    sx={{ 
                                        width: 40, 
                                        height: 40, 
                                        borderRadius: '12px',
                                        background: 'linear-gradient(45deg, #14b8a6, #0d9488)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)'
                                    }}
                                >
                                    <ExtensionIcon sx={{ color: 'white' }} />
                                </Box>
                                <Typography 
                                    variant="h6" 
                                    sx={{ 
                                        fontWeight: 600,
                                        background: 'linear-gradient(45deg, #2dd4bf, #14b8a6)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        letterSpacing: '0.5px'
                                    }}
                                >
                                    Stremio Web
                                </Typography>
                            </Link>

                            <ClickAwayListener onClickAway={() => setShowDropdown(false)}>
                                <Box sx={{ position: 'relative' }}>
                                    <Paper
                                        ref={searchInputRef}
                                        component="form"
                                        sx={{
                                            p: '2px 4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            width: 400,
                                            borderRadius: 2,
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
                                            sx={{ ml: 1, flex: 1, color: 'white' }}
                                            placeholder="Search movies & TV shows..."
                                            value={searchQuery}
                                            onChange={handleSearchChange}
                                            onFocus={handleSearchFocus}
                                        />
                                        <IconButton sx={{ p: '10px', color: alpha('#fff', 0.7) }}>
                                            <SearchIcon />
                                        </IconButton>
                                    </Paper>
                                    {showDropdown && (
                                        <SearchDropdown
                                            loading={loading}
                                            results={searchResults}
                                            onItemClick={handleContentClick}
                                            anchorEl={searchInputRef.current}
                                        />
                                    )}
                                </Box>
                            </ClickAwayListener>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Tooltip title="Installed Addons">
                                <Badge 
                                    badgeContent={installedAddons} 
                                    color="primary"
                                    sx={{ 
                                        '& .MuiBadge-badge': {
                                            background: 'linear-gradient(45deg, #14b8a6, #0d9488)',
                                            border: '2px solid #020617'
                                        }
                                    }}
                                >
                                    <IconButton 
                                        sx={{ 
                                            color: alpha('#fff', 0.7),
                                            transition: 'all 0.2s ease',
                                            '&:hover': { 
                                                color: '#fff',
                                                transform: 'scale(1.1)'
                                            }
                                        }}
                                    >
                                        <ExtensionIcon />
                                    </IconButton>
                                </Badge>
                            </Tooltip>

                            <Tooltip title="Add Addon">
                                <IconButton 
                                    onClick={() => setAddAddonDialogOpen(true)}
                                    sx={{ 
                                        color: alpha('#fff', 0.7),
                                        transition: 'all 0.2s ease',
                                        '&:hover': { 
                                            color: '#fff',
                                            transform: 'scale(1.1)'
                                        }
                                    }}
                                >
                                    <AddIcon />
                                </IconButton>
                            </Tooltip>

                            <Tooltip title="Settings">
                                <IconButton 
                                    onClick={handleMenuOpen}
                                    sx={{ 
                                        color: alpha('#fff', 0.7),
                                        transition: 'all 0.2s ease',
                                        '&:hover': { 
                                            color: '#fff',
                                            transform: 'scale(1.1)'
                                        }
                                    }}
                                >
                                    <AccountCircleIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Toolbar>
                </AppBar>
            </HideOnScroll>
            <Toolbar /> {/* Spacer for fixed AppBar */}

            {/* Settings Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                    sx: {
                        mt: 1,
                        background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.98) 0%, rgba(0, 0, 0, 0.95) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(20, 184, 166, 0.1)',
                        borderRadius: 2,
                        minWidth: 200
                    }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <MenuItem 
                    onClick={handleManageAddons}
                    sx={{ 
                        gap: 2,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            background: alpha(theme.palette.primary.main, 0.1)
                        }
                    }}
                >
                    <ExtensionIcon sx={{ color: alpha('#fff', 0.7) }} />
                    <Typography>Manage Addons</Typography>
                </MenuItem>
                <MenuItem 
                    onClick={handleMenuClose}
                    sx={{ 
                        gap: 2,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            background: alpha(theme.palette.primary.main, 0.1)
                        }
                    }}
                >
                    <SettingsIcon sx={{ color: alpha('#fff', 0.7) }} />
                    <Typography>Preferences</Typography>
                </MenuItem>
            </Menu>

            {/* Add Addon Dialog */}
            <Dialog 
                open={addAddonDialogOpen} 
                onClose={() => setAddAddonDialogOpen(false)}
                PaperProps={{
                    sx: {
                        background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.98) 0%, rgba(0, 0, 0, 0.95) 100%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(20, 184, 166, 0.1)',
                        borderRadius: 3,
                        minWidth: 400
                    }
                }}
            >
                <DialogTitle sx={{ 
                    borderBottom: '1px solid rgba(20, 184, 166, 0.1)',
                    p: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                }}>
                    <Box 
                        sx={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: '10px',
                            background: 'linear-gradient(45deg, #14b8a6, #0d9488)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)'
                        }}
                    >
                        <ExtensionIcon sx={{ color: 'white' }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Add Stremio Addon
                    </Typography>
                </DialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    <TextField
                        autoFocus
                        fullWidth
                        variant="outlined"
                        label="Addon URL"
                        placeholder="https://example.com/manifest.json"
                        value={addAddonUrl}
                        onChange={(e) => setAddAddonUrl(e.target.value)}
                        sx={{
                            mt: 2,
                            '& .MuiOutlinedInput-root': {
                                backgroundColor: alpha(theme.palette.background.paper, 0.4),
                                backdropFilter: 'blur(10px)',
                                '& fieldset': {
                                    borderColor: 'rgba(255,255,255,0.2)',
                                },
                                '&:hover fieldset': {
                                    borderColor: 'rgba(255,255,255,0.3)',
                                },
                                '&.Mui-focused fieldset': {
                                    borderColor: theme.palette.primary.main,
                                },
                            },
                            '& .MuiInputLabel-root': {
                                color: alpha('#fff', 0.7),
                            },
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ 
                    borderTop: '1px solid rgba(20, 184, 166, 0.1)', 
                    p: 2.5,
                    gap: 1
                }}>
                    <Button 
                        onClick={() => setAddAddonDialogOpen(false)}
                        variant="text"
                        sx={{ 
                            color: alpha('#fff', 0.7),
                            '&:hover': { 
                                color: '#fff',
                                background: alpha('#fff', 0.1)
                            }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleAddAddon}
                        variant="contained"
                        sx={{ 
                            background: 'linear-gradient(45deg, #14b8a6 30%, #0d9488 90%)',
                            color: 'white',
                            px: 3,
                            '&:hover': {
                                background: 'linear-gradient(45deg, #0d9488 60%, #0f766e 90%)',
                            }
                        }}
                    >
                        Add Addon
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default Navbar; 