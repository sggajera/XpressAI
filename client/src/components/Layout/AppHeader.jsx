import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import Sidebar from '../Dashboard/Sidebar';

const AppHeader = ({ actionButton, rateLimitInfo }) => {
  const navigate = useNavigate();

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{
        background: 'linear-gradient(45deg, #000000 30%, #2C2C2C 90%)',
        height: '64px',
      }}
    >
      <Toolbar 
        sx={{ 
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Sidebar />
        <Typography 
          variant="h5" 
          component="div" 
          onClick={() => navigate('/dashboard')}
          sx={{ 
            fontFamily: '"Poppins", sans-serif',
            fontWeight: 500,
            letterSpacing: '0.5px',
            color: '#E8E8E8',
            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
            textTransform: 'uppercase',
            ml: 1,
            cursor: 'pointer',
            '&:hover': {
              color: '#FFFFFF',
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          XPRESS AI
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {rateLimitInfo && rateLimitInfo.active && (
          <Chip
            label={`Rate limited - ${rateLimitInfo.minutesRemaining} mins remaining`}
            color="warning"
            size="small"
          />
        )}
        {actionButton}
      </Toolbar>
    </AppBar>
  );
};

export default AppHeader; 