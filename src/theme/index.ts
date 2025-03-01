import { createTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#14b8a6', // Teal 500
            light: '#2dd4bf',
            dark: '#0d9488',
        },
        secondary: {
            main: '#0ea5e9', // Sky blue
            light: '#38bdf8',
            dark: '#0284c7',
        },
        background: {
            default: '#000000', // Pure black
            paper: '#000000',
        },
        error: {
            main: '#f43f5e',
            light: '#fb7185',
            dark: '#e11d48',
        },
        warning: {
            main: '#f59e0b',
            light: '#fbbf24',
            dark: '#d97706',
        },
        success: {
            main: '#14b8a6',
            light: '#2dd4bf',
            dark: '#0d9488',
        },
        info: {
            main: '#06b6d4',
            light: '#22d3ee',
            dark: '#0891b2',
        },
        text: {
            primary: '#f8fafc',
            secondary: '#94a3b8',
            disabled: '#475569',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontWeight: 800,
            letterSpacing: '-0.025em',
            background: 'linear-gradient(to right, #14b8a6, #2dd4bf)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
        },
        h2: {
            fontWeight: 700,
            letterSpacing: '-0.025em',
        },
        h3: {
            fontWeight: 700,
            letterSpacing: '-0.025em',
        },
        h4: {
            fontWeight: 600,
            letterSpacing: '-0.025em',
        },
        h5: {
            fontWeight: 600,
        },
        h6: {
            fontWeight: 500,
        },
    },
    shape: {
        borderRadius: 16,
    },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1), rgba(14, 165, 233, 0.05))',
                    borderRadius: 16,
                    border: '1px solid rgba(20, 184, 166, 0.15)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 30px rgba(2, 6, 23, 0.3)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 12,
                    fontWeight: 500,
                },
                contained: {
                    background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                    },
                    boxShadow: '0 0 20px rgba(20, 184, 166, 0.3)',
                },
                outlined: {
                    borderColor: 'rgba(20, 184, 166, 0.5)',
                    '&:hover': {
                        borderColor: '#14b8a6',
                        background: 'rgba(20, 184, 166, 0.1)',
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                },
                filled: {
                    background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(14, 165, 233, 0.2))',
                    '&:hover': {
                        background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.3), rgba(14, 165, 233, 0.3))',
                    },
                    backdropFilter: 'blur(5px)',
                },
            },
        },
        MuiContainer: {
            styleOverrides: {
                root: {
                    '@media (min-width: 1200px)': {
                        paddingLeft: 32,
                        paddingRight: 32,
                    },
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    background: 'linear-gradient(135deg, rgba(2, 6, 23, 0.95), rgba(2, 6, 23, 0.98))',
                    backdropFilter: 'blur(40px)',
                    border: '1px solid rgba(20, 184, 166, 0.1)',
                    boxShadow: '0 0 40px rgba(20, 184, 166, 0.1)',
                },
            },
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'scale(1.1)',
                        background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.15), rgba(14, 165, 233, 0.15))',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: alpha('#020617', 0.8),
                    backdropFilter: 'blur(20px)',
                    '&.MuiMenu-paper': {
                        background: 'linear-gradient(135deg, rgba(2, 6, 23, 0.95), rgba(2, 6, 23, 0.98))',
                        backdropFilter: 'blur(40px)',
                        border: '1px solid rgba(20, 184, 166, 0.1)',
                    },
                },
            },
        },
        MuiTooltip: {
            styleOverrides: {
                tooltip: {
                    background: 'linear-gradient(135deg, rgba(2, 6, 23, 0.95), rgba(2, 6, 23, 0.98))',
                    backdropFilter: 'blur(10px)',
                    fontSize: '0.875rem',
                    border: '1px solid rgba(20, 184, 166, 0.1)',
                    padding: '8px 12px',
                    boxShadow: '0 4px 20px rgba(2, 6, 23, 0.4)',
                },
            },
        },
        MuiLinearProgress: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    backgroundColor: 'rgba(20, 184, 166, 0.1)',
                    overflow: 'hidden',
                },
                bar: {
                    background: 'linear-gradient(to right, #14b8a6, #0d9488)',
                    boxShadow: '0 0 10px rgba(20, 184, 166, 0.5)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    background: 'linear-gradient(180deg, rgba(2, 6, 23, 0.98) 0%, rgba(2, 6, 23, 0.95) 100%)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(20, 184, 166, 0.1)',
                },
            },
        },
    },
});

export default theme; 