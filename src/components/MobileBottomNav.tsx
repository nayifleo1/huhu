import { useEffect, useState } from 'react';
import {
    Box,
    alpha,
    useTheme,
    useMediaQuery,
    Slide,
    Typography
} from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import HomeIcon from '@mui/icons-material/Home';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import ExtensionIcon from '@mui/icons-material/Extension';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import { useLocation, useNavigate } from 'react-router-dom';
import { useScrollHide } from '../contexts/ScrollHideContext';
import { motion } from 'framer-motion';

const MobileBottomNav = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const location = useLocation();
    const navigate = useNavigate();
    const [value, setValue] = useState('/');
    const { showNavigation } = useScrollHide();

    useEffect(() => {
        // Update the selected value based on current route
        setValue(location.pathname);
    }, [location]);

    if (!isMobile) return null;

    const navItems = [
        { 
            label: 'Home', 
            value: '/', 
            icon: value === '/' ? <HomeIcon /> : <HomeOutlinedIcon />
        },
        { 
            label: 'Search', 
            value: '/search', 
            icon: value === '/search' ? <SearchIcon /> : <SearchOutlinedIcon />
        },
        { 
            label: 'Addons', 
            value: '/addons', 
            icon: value === '/addons' ? <ExtensionIcon /> : <ExtensionOutlinedIcon />
        },
        { 
            label: 'Settings', 
            value: '/settings', 
            icon: value === '/settings' ? <SettingsIcon /> : <SettingsOutlinedIcon />
        }
    ];

    const handleNavClick = (newValue: string) => {
        setValue(newValue);
        navigate(newValue);
    };

    return (
        <Slide appear={false} direction="up" in={showNavigation}>
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: theme.zIndex.appBar,
                    padding: '8px 16px 8px 16px',
                }}
            >
                <Box
                    sx={{
                        height: 72,
                        background: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.5)',
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                        overflow: 'hidden',
                    }}
                >
                    {navItems.map((item) => (
                        <Box
                            key={item.value}
                            component={motion.div}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleNavClick(item.value)}
                            sx={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                py: 1,
                                position: 'relative',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                },
                            }}
                        >
                            {item.value === value && (
                                <Box
                                    component={motion.div}
                                    layoutId="activeTab"
                                    initial={false}
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: '15%',
                                        width: '70%',
                                        height: '3px',
                                        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        borderRadius: '0 0 4px 4px',
                                        boxShadow: `0 0 10px ${alpha(theme.palette.primary.main, 0.7)}`,
                                    }}
                                />
                            )}
                            
                            <Box
                                sx={{
                                    color: item.value === value 
                                        ? theme.palette.primary.main 
                                        : alpha('#fff', 0.7),
                                    transition: 'all 0.3s ease',
                                    transform: item.value === value ? 'scale(1.1)' : 'scale(1)',
                                    filter: item.value === value 
                                        ? `drop-shadow(0 0 8px ${alpha(theme.palette.primary.main, 0.5)})` 
                                        : 'none',
                                }}
                            >
                                {item.icon}
                            </Box>
                            
                            <Typography
                                variant="caption"
                                sx={{
                                    mt: 0.5,
                                    fontSize: '0.7rem',
                                    fontWeight: item.value === value ? 600 : 400,
                                    color: item.value === value 
                                        ? theme.palette.primary.main 
                                        : alpha('#fff', 0.7),
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                {item.label}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </Box>
        </Slide>
    );
};

export default MobileBottomNav; 