import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  keyframes,
} from '@mui/material';
import Psychology from '@mui/icons-material/Psychology';
import AccountTracker from './AccountTracker';
import TrackedAccountsList from './TrackedAccountsList';
import ReplyQueue from './ReplyQueue';
import MainLayout from '../Layout/MainLayout';
import { useAuth } from '../../context/AuthContext';
import PostAsUser from './PostAsUser';

// Add keyframes for the blinking animation
const blinkAnimation = keyframes`
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
`;

const Dashboard = () => {
  const [queuedReplies, setQueuedReplies] = useState([]);
  const [approvedReplies, setApprovedReplies] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);
  const initialFetchRef = useRef(false);
  const { getStoredToken } = useAuth();
  const navigate = useNavigate();

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
      <MainLayout title="Xpress AI">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Typography>Loading...</Typography>
        </Box>
      </MainLayout>
    );
  }

  const actionButton = (
    <Button
      variant="contained"
      onClick={() => navigate('/ideas')}
      startIcon={
        <Psychology 
          sx={{ 
            fontSize: '1.4rem',
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.2))'
          }} 
        />
      }
      sx={{
        background: 'linear-gradient(45deg, #004C8C 30%, #003A6C 90%)',
        boxShadow: '0 3px 8px 2px rgba(0, 76, 140, 0.3)',
        color: '#FFFFFF',
        height: '40px',
        minWidth: '120px',
        maxWidth: '120px',
        borderRadius: '8px',
        textTransform: 'none',
        fontSize: '0.95rem',
        fontWeight: 600,
        letterSpacing: '0.5px',
        border: '1px solid rgba(255,255,255,0.15)',
        position: 'relative',
        overflow: 'hidden',
        animation: `${blinkAnimation} 3s ease-in-out infinite`,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 16px',
        '&:before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)',
          borderRadius: '7px 7px 0 0',
        },
        '&:hover': {
          background: 'linear-gradient(45deg, #003A6C 30%, #002D54 90%)',
          boxShadow: '0 4px 10px 3px rgba(0, 76, 140, 0.4)',
          animation: 'none',
          opacity: 1,
          '&:before': {
            opacity: 0.8,
          },
        },
        '&:active': {
          background: 'linear-gradient(45deg, #002D54 30%, #003A6C 90%)',
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
          animation: 'none',
          opacity: 1,
        },
      }}
    >
      Ideas!
    </Button>
  );

  return (
    <MainLayout actionButton={actionButton} rateLimitInfo={rateLimitInfo}>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Account Tracker */}
          <Grid item xs={12}>
            <AccountTracker onAccountAdded={fetchAccounts} />
          </Grid>
          
          {/* Main Content */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={3}>
              {/* Tracked Accounts */}
              <Grid item xs={12}>
                <TrackedAccountsList 
                  accounts={accounts}
                  loading={loading}
                  onAddToQueue={handleAddToQueue}
                  onRemoveFromQueue={handleRemoveFromQueue}
                  approvedReplies={approvedReplies}
                  queuedReplies={queuedReplies}
                />
              </Grid>
            </Grid>
          </Grid>
          
          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <Grid container spacing={3}>
              {/* Reply Queue */}
              <Grid item xs={12}>
                <ReplyQueue 
                  queuedReplies={queuedReplies} 
                  onRemoveReply={handleRemoveFromQueue}
                />
              </Grid>
              
              {/* Post as User */}
              <Grid item xs={12}>
                <PostAsUser />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </MainLayout>
  );
};

export default Dashboard; 