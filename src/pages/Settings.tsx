import { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Switch,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    alpha,
    useTheme,
    Paper,
    Fade,
    Button
} from '@mui/material';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import ExternalPlayer from '../plugins/ExternalPlayerPlugin';

const Settings = () => {
    const theme = useTheme();
    const [useExternalPlayer, setUseExternalPlayer] = useState(false);

    useEffect(() => {
        // Load saved preference
        const loadPreference = async () => {
            const { value } = await Preferences.get({ key: 'useExternalPlayer' });
            setUseExternalPlayer(value === 'true');
        };
        loadPreference();
    }, []);

    const handleExternalPlayerToggle = async () => {
        const newValue = !useExternalPlayer;
        setUseExternalPlayer(newValue);
        await Preferences.set({
            key: 'useExternalPlayer',
            value: String(newValue)
        });
    };

    return (
        <Fade in timeout={300}>
            <Box
                sx={{
                    minHeight: '100vh',
                    background: '#000000',
                    pt: 2,
                    pb: 8 // Space for bottom navigation
                }}
            >
                <Container maxWidth="sm">
                    <Typography
                        variant="h5"
                        sx={{
                            mb: 3,
                            fontWeight: 600,
                            color: theme.palette.primary.main
                        }}
                    >
                        Settings
                    </Typography>

                    <Paper
                        elevation={0}
                        sx={{
                            background: alpha(theme.palette.background.paper, 0.4),
                            backdropFilter: 'blur(10px)',
                            borderRadius: 2,
                            border: `1px solid ${alpha('#fff', 0.1)}`
                        }}
                    >
                        <List>
                            {Capacitor.getPlatform() === 'android' && (
                                <>
                                    <ListItem>
                                        <ListItemText
                                            primary="Use External Video Player"
                                            secondary="Open video links in your preferred Android video player"
                                            secondaryTypographyProps={{
                                                sx: { color: alpha('#fff', 0.7) }
                                            }}
                                        />
                                        <ListItemSecondaryAction>
                                            <Switch
                                                edge="end"
                                                checked={useExternalPlayer}
                                                onChange={handleExternalPlayerToggle}
                                                sx={{
                                                    '& .MuiSwitch-switchBase.Mui-checked': {
                                                        color: theme.palette.primary.main
                                                    },
                                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                                        backgroundColor: alpha(theme.palette.primary.main, 0.5)
                                                    }
                                                }}
                                            />
                                        </ListItemSecondaryAction>
                                    </ListItem>
                                    {useExternalPlayer && (
                                        <ListItem>
                                            <ListItemText
                                                primary="Clear Default Player"
                                                secondary="Reset your default external video player choice"
                                                secondaryTypographyProps={{
                                                    sx: { color: alpha('#fff', 0.7) }
                                                }}
                                            />
                                            <ListItemSecondaryAction>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={async () => {
                                                        try {
                                                            await ExternalPlayer.clearDefaultPlayer();
                                                            alert('Default player cleared successfully');
                                                        } catch (error) {
                                                            console.error('Error clearing default player:', error);
                                                            alert('Failed to clear default player');
                                                        }
                                                    }}
                                                    sx={{
                                                        color: theme.palette.primary.main,
                                                        borderColor: alpha(theme.palette.primary.main, 0.5),
                                                        '&:hover': {
                                                            borderColor: theme.palette.primary.main,
                                                            backgroundColor: alpha(theme.palette.primary.main, 0.1)
                                                        }
                                                    }}
                                                >
                                                    Clear
                                                </Button>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    )}
                                </>
                            )}
                        </List>
                    </Paper>
                </Container>
            </Box>
        </Fade>
    );
};

export default Settings; 