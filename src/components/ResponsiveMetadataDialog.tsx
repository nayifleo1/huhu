import { useMediaQuery, useTheme } from '@mui/material';
import MetadataDialog from './MetadataDialog';
import MobileMetadataDialog from './MobileMetadataDialog';

const ResponsiveMetadataDialog = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    return isMobile ? <MobileMetadataDialog /> : <MetadataDialog />;
};

export default ResponsiveMetadataDialog; 