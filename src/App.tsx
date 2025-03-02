import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, Box, GlobalStyles, useTheme, useMediaQuery } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import CatalogWrapper from './pages/CatalogWrapper';
import Player from './pages/Player';
import Navbar from './components/Navbar';
import MobileNavbar from './components/MobileNavbar';
import MobileBottomNav from './components/MobileBottomNav';
import AddonsManager from './components/AddonsManager';
import ResponsiveMetadataDialog from './components/ResponsiveMetadataDialog';
import Search from './pages/Search';
import CatalogExpanded from './pages/CatalogExpanded';
import Settings from './pages/Settings';
import theme from './theme';
import { ScrollHideProvider } from './contexts/ScrollHideContext';

const globalStyles = {
  '*': {
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    WebkitOverflowScrolling: 'touch',
    '&::-webkit-scrollbar': {
      display: 'none',
      width: 0,
      background: 'transparent'
    }
  },
  'html, body': {
    overflow: 'hidden',
    height: '100%',
    width: '100%',
    position: 'fixed',
    overscrollBehavior: 'none'
  },
  '#root': {
    height: '100%',
    width: '100%',
    overflow: 'hidden',
    position: 'fixed'
  }
};

// Wrapper component to handle conditional rendering of MobileBottomNav
const AppContent = () => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const hideBottomNav = location.pathname.includes('/title/');

  return (
    <ScrollHideProvider>
      <Box
        sx={{
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {isMobile ? <MobileNavbar /> : <Navbar />}
        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            position: 'relative',
            '&::-webkit-scrollbar': {
              display: 'none'
            }
          }}
        >
          <Routes>
            <Route path="/" element={<CatalogWrapper />} />
            <Route path="/play/:type/:id" element={<Player />} />
            <Route path="/addons" element={<AddonsManager />} />
            <Route path="/title/:type/:id" element={<ResponsiveMetadataDialog />} />
            <Route path="/search" element={<Search />} />
            <Route path="/catalog/:type/:catalogId" element={<CatalogExpanded />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Box>
        {isMobile && !hideBottomNav && <MobileBottomNav />}
      </Box>
    </ScrollHideProvider>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles styles={globalStyles} />
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
