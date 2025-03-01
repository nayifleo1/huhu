import { useMediaQuery, useTheme } from '@mui/material';
import Catalog from './Catalog';
import CatalogMobile from './CatalogMobile';

export default function CatalogWrapper() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    return isMobile ? <CatalogMobile /> : <Catalog />;
} 