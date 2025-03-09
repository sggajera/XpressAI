import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { useAuth } from '../../context/AuthContext';

const Dashboard = () => {
  const [queuedReplies, setQueuedReplies] = useState([]);
  const [approvedReplies, setApprovedReplies] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const initialFetchRef = useRef(false);
  const { getStoredToken } = useAuth();

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const token = getStoredToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const accountsResponse = await fetch('/api/twitter/tracked-accounts', { headers });
      const accountsData = await accountsResponse.json();
      
      if (accountsData.success) {
        const accountsWithTweets = accountsData.data.map(account => {
          // Handle both direct tweets array and tweets.data structure
          const tweets = Array.isArray(account.tweets) 
            ? account.tweets 
            : Array.isArray(account.tweets?.data)
              ? account.tweets.data
              : [];
            
          return {
            ...account,
            tweets: tweets
          };
        });
        
        setAccounts(accountsWithTweets);
        
        // Update rate limit info
        if (accountsData.rateLimit) {
          setRateLimitInfo(accountsData.rateLimit);
        }
        
        // If data is from cache, show a notification
        if (accountsData.fromCache) {
          console.log('Using cached data:', accountsData.error || 'Rate limit reached');
        }
      } else {
        console.error('Failed to fetch accounts:', accountsData.error);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load initial data on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      // Skip if we've already fetched
      if (initialFetchRef.current) return;
      initialFetchRef.current = true;

      try {
        setLoading(true);
        const token = getStoredToken();
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch both tracked accounts and approved replies in parallel
        const [accountsResponse, repliesResponse] = await Promise.all([
          fetch('/api/twitter/tracked-accounts', { headers }),
          fetch('/api/twitter/approved-replies', { headers })
        ]);

        const [accountsData, repliesData] = await Promise.all([
          accountsResponse.json(),
          repliesResponse.json()
        ]);
        
        if (accountsData.success) {
          const accountsWithTweets = accountsData.data.map(account => ({
            ...account,
            tweets: account.tweets || []
          }));
          setAccounts(accountsWithTweets);
        }

        if (repliesData.success) {
          const approvedSet = new Set(repliesData.data.map(reply => reply.tweetId));
          setApprovedReplies(approvedSet);
          setQueuedReplies(repliesData.data.map(reply => ({
            ...reply,
            id: Date.now(),
            queuedAt: reply.queuedAt || new Date().toISOString()
          })));
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [getStoredToken]); // Add getStoredToken to dependencies

  const handleAddToQueue = useCallback(async (reply) => {
    try {
      // Check if already in queue
      if (approvedReplies.has(reply.tweetId)) {
        return;
      }

      const token = getStoredToken();
      const response = await fetch('/api/twitter/approved-replies', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tweetId: reply.tweetId,
          reply: reply
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add reply to queue');
      }

      // Update local state only after successful API call
      setQueuedReplies(prev => [
        ...prev,
        {
          ...reply,
          id: Date.now(),
          queuedAt: new Date().toISOString()
        }
      ]);
      setApprovedReplies(prev => new Set([...prev, reply.tweetId]));
    } catch (error) {
      console.error('Error adding reply to queue:', error);
    }
  }, [approvedReplies, getStoredToken]);

  const handleRemoveFromQueue = useCallback(async (tweetId) => {
    try {
      const token = getStoredToken();
      console.log('Removing tweet:', tweetId); // Debug log
      console.log('Using token:', token); // Debug log

      const response = await fetch(`/api/twitter/approved-replies/${tweetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData); // Debug log
        throw new Error('Failed to remove reply from database');
      }
      
      setQueuedReplies(prev => prev.filter(reply => reply.tweetId !== tweetId));
      setApprovedReplies(prev => {
        const newSet = new Set(prev);
        newSet.delete(tweetId);
        return newSet;
      });
    } catch (error) {
      console.error('Error removing reply from queue:', error);
    }
  }, [getStoredToken]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

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
          {rateLimitInfo && rateLimitInfo.active && (
            <Chip
              label={`Rate limited - ${rateLimitInfo.minutesRemaining} mins remaining`}
              color="warning"
              size="small"
              sx={{ ml: 'auto' }}
            />
          )}
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
            <AccountTracker onAccountAdded={fetchAccounts} />
          </Grid>

          {/* Main Content */}
          <Grid container item spacing={3}>
            {/* Tracked Accounts List */}
            <Grid item xs={12} md={9}>
              <TrackedAccountsList 
                onAddToQueue={handleAddToQueue} 
                onRemoveFromQueue={handleRemoveFromQueue}
                approvedReplies={approvedReplies}
                queuedReplies={queuedReplies}
                accounts={accounts}
                loading={loading}
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