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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import PreviewIcon from '@mui/icons-material/Preview';
import StremioService from '../services/stremioService';
import { Manifest } from '../types/stremio';

interface AddonPreview {
  name: string;
  version: string;
  description: string;
  types: string[];
  catalogs: {
    type: string;
    id: string;
    name: string;
  }[];
  resources: {
    name: string;
    types: string[];
    idPrefixes?: string[];
  }[];
}

const AddonsManager: React.FC = () => {
  const [addons, setAddons] = useState<Manifest[]>([]);
  const [open, setOpen] = useState(false);
  const [addonUrl, setAddonUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [addonPreview, setAddonPreview] = useState<AddonPreview | null>(null);
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

  const handlePreviewAddon = async () => {
    if (!addonUrl) return;

    setPreviewLoading(true);
    setError('');
    try {
      const preview = await stremioService.previewAddon(addonUrl);
      setAddonPreview(preview);
    } catch (err) {
      setError('Failed to preview addon. Please check the URL and try again.');
      setAddonPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleAddAddon = async () => {
    try {
      setError('');
      await stremioService.installAddon(addonUrl);
      loadAddons();
      setOpen(false);
      setAddonUrl('');
      setAddonPreview(null);
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

  const renderResourceChips = (resources: { name: string; types: string[] }[]) => {
    if (!resources || !Array.isArray(resources)) return null;
    
    return resources.map((resource, index) => {
      if (!resource || !resource.types) return null;
      
      return (
        <Tooltip 
          key={`${resource.name}-${index}`}
          title={`Supported types: ${resource.types.join(', ')}`}
        >
          <Chip
            label={resource.name || 'Unknown'}
            size="small"
            color="secondary"
            variant="outlined"
            sx={{ 
              ml: 1,
              height: 24,
              borderRadius: 12,
              '& .MuiChip-label': {
                px: 1,
                fontSize: '0.75rem'
              }
            }}
          />
        </Tooltip>
      );
    });
  };

  const renderCatalogChips = (catalogs: { type: string; id: string; name: string }[]) => {
    if (!catalogs || !Array.isArray(catalogs)) return null;

    const uniqueTypes = Array.from(new Set(catalogs.map(cat => cat?.type).filter(Boolean)));
    return uniqueTypes.map(type => {
      if (!type) return null;
      
      const catalogsOfType = catalogs.filter(c => c?.type === type);
      const catalogNames = catalogsOfType
        .map(c => c?.name)
        .filter(Boolean)
        .join(', ');

      return (
        <Tooltip 
          key={type}
          title={`Catalogs: ${catalogNames}`}
        >
          <Chip
            label={type}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ 
              mr: 1,
              height: 24,
              borderRadius: 12,
              '& .MuiChip-label': {
                px: 1,
                fontSize: '0.75rem'
              }
            }}
          />
        </Tooltip>
      );
    }).filter(Boolean);
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
          Installed Add-ons ({addons.length})
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
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          {addon.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          v{addon.version}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {renderCatalogChips(addon.catalogs || [])}
                      </Box>
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
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {addon.description}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Resources:
                      </Typography>
                      {renderResourceChips(addon.resources || [])}
                    </Box>
                    {addon.url && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        URL: {addon.url}
                      </Typography>
                    )}
                  </AccordionDetails>
                </Accordion>
              </CardContent>
            </Card>
            {index < addons.length - 1 && <Divider sx={{ my: 1 }} />}
          </React.Fragment>
        ))}
      </List>

      <Dialog 
        open={open} 
        onClose={() => {
          setOpen(false);
          setAddonPreview(null);
          setAddonUrl('');
          setError('');
        }}
        fullScreen={isSmallScreen}
        PaperProps={{
          sx: {
            borderRadius: isSmallScreen ? 0 : 3,
            m: isSmallScreen ? 0 : 2,
            maxWidth: 600
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
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
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
            <Button
              variant="outlined"
              onClick={handlePreviewAddon}
              disabled={!addonUrl || previewLoading}
              startIcon={previewLoading ? <CircularProgress size={20} /> : <PreviewIcon />}
              sx={{ mt: 1 }}
            >
              Preview
            </Button>
          </Box>

          {addonPreview && (
            <Card variant="outlined" sx={{ mt: 2, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {addonPreview.name} <Typography component="span" variant="caption">v{addonPreview.version}</Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {addonPreview.description}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Content Types:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  {addonPreview.types.map(type => (
                    <Chip
                      key={type}
                      label={type}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  Available Catalogs:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                  {addonPreview.catalogs.map((catalog, index) => (
                    <Tooltip key={index} title={`Type: ${catalog.type}, ID: ${catalog.id}`}>
                      <Chip
                        label={catalog.name}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    </Tooltip>
                  ))}
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  Resources:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {addonPreview.resources.map((resource, index) => (
                    <Tooltip
                      key={index}
                      title={`Supported types: ${resource.types.join(', ')}`}
                    >
                      <Chip
                        label={resource.name}
                        size="small"
                        color="info"
                        variant="outlined"
                      />
                    </Tooltip>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          px: isSmallScreen ? 3 : 3,
          pb: isSmallScreen ? 3 : 2 
        }}>
          <Button 
            onClick={() => {
              setOpen(false);
              setAddonPreview(null);
              setAddonUrl('');
              setError('');
            }}
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
            disabled={!addonUrl || !addonPreview}
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