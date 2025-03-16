import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import XIcon from '../Icons/XIcon';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const TwitterConnect = () => {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { getStoredToken } = useAuth();
  const { mode } = useTheme();

  // Fetch connected accounts on mount
  useEffect(() => {
    fetchAccounts();
    
    // Check for URL params (from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#/', ''));
    
    // Check both regular URL params and hash params
    const twitterConnected = urlParams.get('twitter_connected') || hashParams.get('twitter_connected');
    
    if (twitterConnected) {
      const connected = twitterConnected === 'true';
      if (connected) {
        const username = urlParams.get('username') || hashParams.get('username');
        setSuccess(`Successfully connected Twitter account @${username}`);
      } else {
        const errorMsg = urlParams.get('error') || hashParams.get('error');
        setError(`Failed to connect Twitter account: ${errorMsg || 'Unknown error'}`);
        console.error('Twitter connection error:', errorMsg);
      }
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch connected Twitter accounts
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const token = getStoredToken();
      
      const response = await fetch('/api/twitter/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAccounts(data.accounts || []);
      } else {
        setError(data.error || 'Failed to fetch Twitter accounts');
      }
    } catch (error) {
      console.error('Error fetching Twitter accounts:', error);
      setError(error.message || 'Failed to fetch Twitter accounts');
    } finally {
      setLoading(false);
    }
  };

  // Connect a new Twitter account
  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      
      const token = getStoredToken();
      
      console.log('Starting Twitter OAuth flow...');
      
      const response = await fetch('/api/twitter/oauth/login', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Important for session cookies
      });
      
      const data = await response.json();
      
      if (data.success && data.url) {
        console.log('Redirecting to Twitter OAuth URL:', data.url);
        console.log('Session ID:', data.sessionId);
        
        // Store the session ID in localStorage as a backup
        localStorage.setItem('twitter_oauth_session_id', data.sessionId);
        
        // Small delay to ensure session is saved
        setTimeout(() => {
          // Redirect to Twitter OAuth
          window.location.href = data.url;
        }, 1000);
      } else {
        setError(data.error || 'Failed to start Twitter connection');
        setConnecting(false);
      }
    } catch (error) {
      console.error('Error connecting Twitter account:', error);
      setError(error.message || 'Failed to connect Twitter account');
      setConnecting(false);
    }
  };

  // Disconnect a Twitter account
  const handleDisconnect = async (twitterId) => {
    try {
      const token = getStoredToken();
      
      const response = await fetch(`/api/twitter/accounts/${twitterId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Remove account from state
        setAccounts(accounts.filter(account => account.twitterId !== twitterId));
        setSuccess('Twitter account disconnected successfully');
      } else {
        setError(data.error || 'Failed to disconnect Twitter account');
      }
    } catch (error) {
      console.error('Error disconnecting Twitter account:', error);
      setError(error.message || 'Failed to disconnect Twitter account');
    }
  };

  // Clear alerts
  const clearAlerts = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Connected Twitter Accounts
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={clearAlerts}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={clearAlerts}>
          {success}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <>
          {accounts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                No Twitter accounts connected
              </Typography>
              <Button
                variant="contained"
                startIcon={<XIcon sx={{ color: '#FFFFFF' }} />}
                onClick={handleConnect}
                disabled={connecting}
                sx={{
                  background: 'linear-gradient(45deg, #1D9BF0 30%, #0D8AE0 90%)',
                  color: '#FFFFFF',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #0D8AE0 30%, #0077CC 90%)',
                  }
                }}
              >
                {connecting ? 'Connecting...' : 'Connect Twitter Account'}
              </Button>
            </Box>
          ) : (
            <>
              <List sx={{ mb: 2 }}>
                {accounts.map((account) => (
                  <React.Fragment key={account.twitterId}>
                    <ListItem
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          aria-label="disconnect" 
                          onClick={() => handleDisconnect(account.twitterId)}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#1D9BF0' }}>
                          <XIcon sx={{ color: '#FFFFFF' }} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`@${account.username}`}
                        secondary={`Connected on ${new Date(account.createdAt).toLocaleDateString()}`}
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
              
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleConnect}
                disabled={connecting}
                sx={{ mt: 1 }}
              >
                {connecting ? 'Connecting...' : 'Connect Another Account'}
              </Button>
            </>
          )}
        </>
      )}
    </Paper>
  );
};

export default TwitterConnect; 