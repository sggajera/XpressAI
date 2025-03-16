import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import XIcon from '../Icons/XIcon';
import { useAuth } from '../../context/AuthContext';

const PostAsUser = () => {
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [tweetText, setTweetText] = useState('');
  const [replyToId, setReplyToId] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { getStoredToken } = useAuth();

  // Fetch connected accounts on mount
  useEffect(() => {
    fetchAccounts();
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
        if (data.accounts && data.accounts.length > 0) {
          setSelectedAccount(data.accounts[0].twitterId);
        }
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

  // Post a tweet
  const handlePostTweet = async () => {
    if (!tweetText.trim()) {
      setError('Tweet text is required');
      return;
    }
    
    try {
      setPosting(true);
      setError(null);
      setSuccess(null);
      
      const token = getStoredToken();
      
      const response = await fetch('/api/twitter/tweet-as-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: tweetText,
          replyToId: replyToId.trim() || null
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Tweet posted successfully!');
        setTweetText('');
        setReplyToId('');
      } else {
        setError(data.error || 'Failed to post tweet');
      }
    } catch (error) {
      console.error('Error posting tweet:', error);
      setError(error.message || 'Failed to post tweet');
    } finally {
      setPosting(false);
    }
  };

  // Clear alerts
  const clearAlerts = () => {
    setError(null);
    setSuccess(null);
  };

  // Get selected account username
  const getSelectedAccountUsername = () => {
    const account = accounts.find(acc => acc.twitterId === selectedAccount);
    return account ? account.username : '';
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <XIcon sx={{ fontSize: 20, color: '#1D9BF0' }} />
        Post as User
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
      ) : accounts.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No Twitter accounts connected
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.href = '/profile'}
            sx={{
              background: 'linear-gradient(45deg, #1D9BF0 30%, #0D8AE0 90%)',
              color: '#FFFFFF',
              '&:hover': {
                background: 'linear-gradient(45deg, #0D8AE0 30%, #0077CC 90%)',
              }
            }}
          >
            Connect Twitter Account
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="twitter-account-label">Twitter Account</InputLabel>
            <Select
              labelId="twitter-account-label"
              value={selectedAccount}
              label="Twitter Account"
              onChange={(e) => setSelectedAccount(e.target.value)}
            >
              {accounts.map((account) => (
                <MenuItem key={account.twitterId} value={account.twitterId}>
                  @{account.username}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Tweet Text"
            value={tweetText}
            onChange={(e) => setTweetText(e.target.value)}
            placeholder="What's happening?"
            inputProps={{ maxLength: 280 }}
            helperText={`${tweetText.length}/280`}
          />
          
          <TextField
            fullWidth
            label="Reply to Tweet ID (optional)"
            value={replyToId}
            onChange={(e) => setReplyToId(e.target.value)}
            placeholder="Enter a tweet ID to reply to"
          />
          
          <Button
            variant="contained"
            onClick={handlePostTweet}
            disabled={posting || !tweetText.trim()}
            sx={{
              background: 'linear-gradient(45deg, #1D9BF0 30%, #0D8AE0 90%)',
              color: '#FFFFFF',
              '&:hover': {
                background: 'linear-gradient(45deg, #0D8AE0 30%, #0077CC 90%)',
              }
            }}
          >
            {posting ? (
              <CircularProgress size={24} sx={{ color: '#FFFFFF' }} />
            ) : (
              <>Post as @{getSelectedAccountUsername()}</>
            )}
          </Button>
          
          <Divider sx={{ my: 1 }} />
          
          <Typography variant="caption" color="text.secondary">
            This will post directly to your Twitter account. Make sure to follow Twitter's guidelines and terms of service.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default PostAsUser; 