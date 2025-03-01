import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Chip,
  Divider,
  useTheme,
  useMediaQuery,
  Snackbar,
  Alert,
  AlertColor,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import StremioService from '../services/stremioService';
import { Manifest } from '../types/stremio';

const AddonsManager: React.FC = () => {
  const [addons, setAddons] = useState<Manifest[]>([]);
  const [open, setOpen] = useState(false);
  const [addonUrl, setAddonUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });
  
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const stremioService = StremioService.getInstance();

  useEffect(() => {
    loadAddons();
  }, []);

  const loadAddons = async () => {
    setLoading(true);
    try {
      const installedAddons = stremioService.getInstalledAddons();
      setAddons(installedAddons);
    } catch (err) {
      console.error('Error loading addons:', err);
      setSnackbar({
        open: true,
        message: 'Failed to load addons',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddon = async () => {
    try {
      setError('');
      await stremioService.installAddon(addonUrl);
      loadAddons();
      setOpen(false);
      setAddonUrl('');
      setSnackbar({
        open: true,
        message: 'Add-on installed successfully',
        severity: 'success',
      });
    } catch (err) {
      setError('Failed to add addon. Please check the URL and try again.');
    }
  };

  const handleRemoveAddon = async (id: string, name: string) => {
    try {
      stremioService.removeAddon(id);
      await loadAddons();
      setSnackbar({
        open: true,
        message: `${name} removed successfully`,
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to remove add-on',
        severity: 'error',
      });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={40} thickness={4} />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      maxWidth: 800, 
      margin: '0 auto', 
      p: isSmallScreen ? 1 : 2,
      height: '100%',
      overflow: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1,
        bgcolor: 'background.default',
        py: 2
      }}>
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          Installed Add-ons
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setOpen(true)}
          startIcon={<AddIcon />}
          sx={{
            borderRadius: 20,
            textTransform: 'none',
            px: 2
          }}
        >
          Add New
        </Button>
      </Box>

      <List sx={{ pt: 1 }}>
        {addons.map((addon, index) => (
          <React.Fragment key={addon.id}>
            <Card 
              sx={{ 
                mb: 1,
                borderRadius: 2,
                boxShadow: 'none',
                border: `1px solid ${theme.palette.divider}`
              }}
            >
              <CardContent sx={{ p: isSmallScreen ? 1.5 : 2 }}>
                <ListItem disablePadding>
                  <Box sx={{ flex: 1 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {addon.name}
                          </Typography>
                          {addon.types.map((type) => (
                            <Chip
                              key={type}
                              label={type}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ 
                                height: 24,
                                borderRadius: 12,
                                '& .MuiChip-label': {
                                  px: 1,
                                  fontSize: '0.75rem'
                                }
                              }}
                            />
                          ))}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ 
                              mb: 0.5,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {addon.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Version: {addon.version}
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleRemoveAddon(addon.id, addon.name)}
                      sx={{ 
                        color: theme.palette.error.main,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.error.main, 0.08)
                        }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </CardContent>
            </Card>
            {index < addons.length - 1 && <Divider sx={{ my: 1 }} />}
          </React.Fragment>
        ))}
      </List>

      <Dialog 
        open={open} 
        onClose={() => setOpen(false)}
        fullScreen={isSmallScreen}
        PaperProps={{
          sx: {
            borderRadius: isSmallScreen ? 0 : 3,
            m: isSmallScreen ? 0 : 2
          }
        }}
      >
        <DialogTitle sx={{ 
          pb: 2,
          pt: isSmallScreen ? 3 : 2,
          px: isSmallScreen ? 3 : 3 
        }}>
          Add New Stremio Add-on
        </DialogTitle>
        <DialogContent sx={{ px: isSmallScreen ? 3 : 3 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Add-on URL"
            type="url"
            fullWidth
            value={addonUrl}
            onChange={(e) => setAddonUrl(e.target.value)}
            error={!!error}
            helperText={error}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ 
          px: isSmallScreen ? 3 : 3,
          pb: isSmallScreen ? 3 : 2 
        }}>
          <Button 
            onClick={() => setOpen(false)}
            sx={{ 
              textTransform: 'none',
              minWidth: 100
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddAddon} 
            variant="contained" 
            color="primary"
            sx={{ 
              textTransform: 'none',
              minWidth: 100,
              borderRadius: 20
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ 
            width: '100%',
            borderRadius: 2
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AddonsManager; 