import { createTheme } from '@mui/material/styles';

const getTheme = (mode) => createTheme({
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
  },
});

export default getTheme; 