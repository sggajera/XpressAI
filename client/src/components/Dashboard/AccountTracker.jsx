import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import XIcon from '../Icons/XIcon';

const AccountTracker = () => {
  const [username, setUsername] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const startTracking = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/twitter/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.replace('@', '') }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to track account');
      }
      
      setTrackingResult(data.data);
      setUsername('');
    } catch (error) {
      console.error('Error:', error);
      setTrackingResult({ 
        error: error.message.includes('rate limit') 
          ? 'Twitter API rate limit reached. Please try again in a few minutes.'
          : error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper 
      sx={{ 
        p: 3,
        borderRadius: 2, 
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}>
        <Box sx={{ 
          width: '100%',
          maxWidth: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mx: 'auto',
        }}>
          <TextField
            fullWidth
            size="medium"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter an X username to start tracking."
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Typography color="text.secondary" sx={{ fontSize: '1.1rem' }}>@</Typography>
                </InputAdornment>
              ),
              sx: {
                bgcolor: 'background.paper',
                height: '48px',
                fontSize: '1.1rem',
              }
            }}
          />
          <Button
            variant="contained"
            onClick={startTracking}
            disabled={loading || !username}
            sx={{
              background: 'linear-gradient(145deg, #2C2C2C 0%, #1A1A1A 100%)',
              boxShadow: `
                0 2px 4px rgba(0,0,0,0.2),
                inset 0 1px 1px rgba(255,255,255,0.1),
                inset 0 -1px 1px rgba(0,0,0,0.2)
              `,
              color: '#E8E8E8',
              minWidth: 'auto',
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.05)',
              position: 'relative',
              overflow: 'hidden',
              '&:before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '50%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
                borderRadius: '7px 7px 0 0',
              },
              '&:hover': {
                background: 'linear-gradient(145deg, #333333 0%, #222222 100%)',
                boxShadow: `
                  0 4px 8px rgba(0,0,0,0.3),
                  inset 0 1px 1px rgba(255,255,255,0.15),
                  inset 0 -1px 1px rgba(0,0,0,0.3)
                `,
              },
              '&:active': {
                background: 'linear-gradient(145deg, #1A1A1A 0%, #2C2C2C 100%)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
              },
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              <AddIcon sx={{ 
                fontSize: 24,
                filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))',
                color: '#FFFFFF',
              }} />
            )}
          </Button>
        </Box>

        {/* Alert Messages */}
        {trackingResult && (
          <Box sx={{ 
            width: '100%', 
            maxWidth: 500,
            mx: 'auto'
          }}>
            {trackingResult.error ? (
              <Alert severity="error">
                {trackingResult.error}
              </Alert>
            ) : (
              <Alert severity="success">
                Now tracking: @{trackingResult.user?.username}
              </Alert>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default AccountTracker; 