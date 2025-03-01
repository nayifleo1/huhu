import { useEffect, useState } from 'react';
import {
    BottomNavigation,
    BottomNavigationAction,
    Box,
    alpha,
    useTheme,
    useMediaQuery,
    Slide
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import ExtensionIcon from '@mui/icons-material/Extension';
import SettingsIcon from '@mui/icons-material/Settings';
import { useLocation, useNavigate } from 'react-router-dom';
import { useScrollHide } from '../contexts/ScrollHideContext';

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

    return (
        <Slide appear={false} direction="up" in={showNavigation}>
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: theme.zIndex.appBar,
                    borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                }}
            >
                <BottomNavigation
                    value={value}
                    onChange={(_, newValue) => {
                        setValue(newValue);
                        navigate(newValue);
                    }}
                    sx={{
                        height: 64,
                        background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 0, 0, 0.98) 100%)',
                        backdropFilter: 'blur(20px)',
                        borderTop: `1px solid ${alpha('#fff', 0.1)}`,
                        '& .MuiBottomNavigationAction-root': {
                            color: alpha('#fff', 0.7),
                            transition: 'all 0.3s ease',
                            '&.Mui-selected': {
                                color: theme.palette.primary.main,
                                '& .MuiSvgIcon-root': {
                                    transform: 'scale(1.1)',
                                    filter: 'drop-shadow(0 0 8px rgba(20, 184, 166, 0.3))',
                                },
                            },
                            '& .MuiSvgIcon-root': {
                                transition: 'all 0.3s ease',
                            },
                        },
                    }}
                >
                    <BottomNavigationAction
                        label="Home"
                        value="/"
                        icon={<HomeIcon />}
                    />
                    <BottomNavigationAction
                        label="Search"
                        value="/search"
                        icon={<SearchIcon />}
                    />
                    <BottomNavigationAction
                        label="Addons"
                        value="/addons"
                        icon={<ExtensionIcon />}
                    />
                    <BottomNavigationAction
                        label="Settings"
                        value="/settings"
                        icon={<SettingsIcon />}
                    />
                </BottomNavigation>
            </Box>
        </Slide>
    );
};

export default MobileBottomNav; 