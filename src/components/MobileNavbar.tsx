import { AppBar, Toolbar, Typography, Box, useTheme, useMediaQuery } from '@mui/material';
import { useScrollHide } from '../contexts/ScrollHideContext';
import Slide from '@mui/material/Slide';

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

const MobileNavbar = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    if (!isMobile) {
        return null;
    }

    return (
        <>
            <HideOnScroll>
                <AppBar 
                    position="fixed" 
                    elevation={0}
                    sx={{ 
                        background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.98) 0%, rgba(0, 0, 0, 0.85) 100%)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: 'none',
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            bottom: -15,
                            left: 0,
                            right: 0,
                            height: '15px',
                            background: 'linear-gradient(180deg, rgba(20, 184, 166, 0.15) 0%, transparent 100%)',
                            pointerEvents: 'none'
                        },
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: '2px',
                            background: 'linear-gradient(90deg, transparent 0%, rgba(20, 184, 166, 0.3) 50%, transparent 100%)',
                            pointerEvents: 'none',
                            opacity: 0.8
                        }
                    }}
                >
                    <Toolbar sx={{ 
                        justifyContent: 'center',
                        minHeight: '72px',
                        paddingTop: '16px',
                        paddingBottom: '8px'
                    }}>
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
            <Box sx={{ height: '88px' }} />
        </>
    );
};

export default MobileNavbar; 