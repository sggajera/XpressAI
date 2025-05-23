import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  AppBar,
  Toolbar,
  Chip,
} from '@mui/material';
import AccountTracker from './AccountTracker';
import TrackedAccountsList from './TrackedAccountsList';
import ReplyQueue from './ReplyQueue';
import XIcon from '../Icons/XIcon';
import Sidebar from './Sidebar';
import theme from '../../theme';

const Dashboard = () => {
  const [dbStatus, setDbStatus] = useState('Checking...');
  const [queuedReplies, setQueuedReplies] = useState([]);

  useEffect(() => {
    fetch('/api/test-db')
      .then(res => res.json())
      .then(data => setDbStatus(data.status))
      .catch(err => setDbStatus('Database connection failed'));
  }, []);

  // Load queued replies from approved replies on mount
  useEffect(() => {
    const loadQueuedReplies = async () => {
      try {
        const response = await fetch('/api/twitter/approved-replies');
        const data = await response.json();
        if (data.success) {
          setQueuedReplies(data.data);
        }
      } catch (error) {
        console.error('Error loading queued replies:', error);
      }
    };

    loadQueuedReplies();
  }, []);

  const handleAddToQueue = (reply) => {
    // Check if reply is already in queue
    setQueuedReplies(prev => {
      const exists = prev.some(item => item.tweetId === reply.tweetId);
      if (exists) {
        return prev;
      }
      return [...prev, {
        id: Date.now(),
        queuedAt: new Date().toISOString(),
        ...reply
      }];
    });
  };

  const handleRemoveFromQueue = async (tweetId) => {
    try {
      console.log('Removing tweet from queue:', tweetId);
      
      // Remove from DB first
      const response = await fetch(`/api/twitter/approved-replies/${tweetId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove reply from database');
      }
      
      // Remove from local state
      setQueuedReplies(prev => {
        console.log('Current queue:', prev);
        console.log('Filtering out tweet ID:', tweetId);
        // Filter out the reply with the matching tweetId
        return prev.filter(reply => reply.tweetId !== tweetId);
      });
    } catch (error) {
      console.error('Error removing reply from queue:', error);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
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
            sx={{ 
              fontWeight: 600,
              letterSpacing: '1px',
              color: '#E8E8E8',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              textTransform: 'uppercase',
              ml: 1,
            }}
          >
            Xpress AI
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ 
        mt: 4, 
        mb: 4,
        bgcolor: 'background.default',
        borderRadius: 2,
        p: 3,
      }}>
        <Grid container spacing={3}>
          {/* Top Row - Account Tracker */}
          <Grid item xs={12}>
            <AccountTracker />
          </Grid>

          {/* Main Content */}
          <Grid container item spacing={3}>
            {/* Tracked Accounts List */}
            <Grid item xs={12} md={9}>
              <TrackedAccountsList 
                onAddToQueue={handleAddToQueue} 
                onRemoveFromQueue={handleRemoveFromQueue}
              />
            </Grid>

            {/* Reply Queue - Always visible */}
            <Grid item xs={12} md={3}>
              <ReplyQueue 
                queuedReplies={queuedReplies}
                onRemoveReply={handleRemoveFromQueue}
              />
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard; 