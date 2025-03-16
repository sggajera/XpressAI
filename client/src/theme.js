import { createTheme } from '@mui/material/styles';

// Import Google Fonts - adding a modern sans-serif font
const getTheme = (mode) => createTheme({
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 500,
    },
  },
  palette: {
    mode,
    primary: {
      main: '#000000', // Black
      light: '#2C2C2C',
      dark: '#000000',
      contrastText: '#fff',
    },
    secondary: {
      main: '#1D9BF0', // X's blue
      light: '#4CB3F3',
      dark: '#1884CD',
      contrastText: '#fff',
    },
    background: {
      default: mode === 'dark' ? '#121212' : '#F5F7FA',
      paper: mode === 'dark' ? '#1E1E1E' : '#FFFFFF',
      paperLight: mode === 'dark' ? '#2A2A2A' : '#FFFFFF',
      paperLighter: mode === 'dark' ? '#252525' : '#FFFFFF',
    },
    text: {
      primary: mode === 'dark' ? '#E0E0E0' : '#2C3E50',
      secondary: mode === 'dark' ? '#A0A0A0' : '#34495E',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: mode === 'dark' 
            ? '0 2px 16px rgba(0,0,0,0.3)'
            : '0 2px 16px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          textTransform: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 20,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    // Prevent SVG icons from being inverted in dark mode
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          filter: 'none !important', // Prevent automatic filtering
        },
      },
    },
    // Prevent images from being inverted in dark mode
    MuiAvatar: {
      styleOverrides: {
        img: {
          filter: 'none !important', // Prevent automatic filtering
        },
      },
    },
  },
});

export default getTheme; 