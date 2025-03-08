import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Collapse,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Chip,
  IconButton,
  TextField,
  Button,
  Grid,
  Popper,
  Paper as PopperPaper,
  ClickAwayListener,
  Link
} from '@mui/material';
import { 
  ExpandMore, 
  ExpandLess, 
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Psychology as AIIcon,
  Send as SendIcon,
  Check as CheckIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';
import XIcon from '../Icons/XIcon';
import theme from '../../theme';

const TrackedAccountsList = ({ onAddToQueue, onRemoveFromQueue }) => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState({});
  const [editingReply, setEditingReply] = useState(null);
  const [editingContext, setEditingContext] = useState(false);
  const [context, setContext] = useState('');
  const [approvedReplies, setApprovedReplies] = useState(new Set());
  const [anchorEl, setAnchorEl] = useState(null);
  const popperRef = useRef(null);
  const [currentTweet, setCurrentTweet] = useState(null);

  useEffect(() => {
    fetchTrackedAccounts();
  }, []);

  useEffect(() => {
    const loadApprovedReplies = async () => {
      try {
        const response = await fetch('/api/twitter/approved-replies');
        const data = await response.json();
        if (data.success) {
          const approvedSet = new Set(data.data.map(reply => reply.tweetId));
          setApprovedReplies(approvedSet);
          // Also add to queue
          data.data.forEach(reply => onAddToQueue(reply));
        }
      } catch (error) {
        console.error('Error loading approved replies:', error);
      }
    };

    loadApprovedReplies();
  }, [onAddToQueue]);

  const fetchTrackedAccounts = async () => {
    try {
      const response = await fetch('/api/twitter/tracked-accounts');
      const data = await response.json();
      if (data.success) {
        setAccounts(data.data);
      }
    } catch (error) {
      console.error('Error fetching tracked accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountClick = async (account) => {
    setSelectedAccount(selectedAccount?.username === account.username ? null : account);
    
    // Generate replies for all tweets that don't have suggestions yet
    if (account.tweets) {
      account.tweets.forEach(async (tweet) => {
        if (!suggestions[tweet.id]) {
          await generateReply(tweet);
        }
      });
    }
  };

  const generateReply = async (tweet) => {
    try {
      // Show loading state while generating
      setSuggestions(prev => ({
        ...prev,
        [tweet.id]: 'Generating suggestion...'
      }));

      const response = await fetch('/api/test-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tweet: tweet.text,
          context: context || 'Be professional and friendly'
        }),
      });

      const data = await response.json();
      setSuggestions(prev => ({
        ...prev,
        [tweet.id]: data.reply
      }));
    } catch (error) {
      console.error('Error generating reply:', error);
      setSuggestions(prev => ({
        ...prev,
        [tweet.id]: 'Failed to generate reply'
      }));
    }
  };

  const handleApproveReply = async (tweet, reply) => {
    try {
      // Store in DB
      await fetch('/api/twitter/approved-replies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tweetId: tweet.id,
          reply: {
            username: selectedAccount.username,
            originalTweet: tweet.text,
            replyText: reply,
            tweetId: tweet.id,
          }
        }),
      });

      // Update local state
      setApprovedReplies(prev => new Set([...prev, tweet.id]));
      onAddToQueue({
        username: selectedAccount.username,
        originalTweet: tweet.text,
        replyText: reply,
        tweetId: tweet.id
      });
    } catch (error) {
      console.error('Error storing approved reply:', error);
    }
  };

  const handleUnapprove = (tweet) => {
    setApprovedReplies(prev => {
      const next = new Set(prev);
      next.delete(tweet.id);
      return next;
    });
    onRemoveFromQueue(tweet.id);
  };

  const handleAIEditClick = (event, tweet) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
    setEditingContext(true);
    setContext('');
    setCurrentTweet(tweet);
  };

  return (
    <Paper 
      sx={{ 
        p: 3, 
        borderRadius: 2, 
        bgcolor: 'background.paper',
        height: '85vh',  // Set fixed height
        overflow: 'auto' // Enable scrolling
      }}
    >
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <XIcon color="primary" />
        Tracked Accounts
      </Typography>

      {loading ? (
        <Typography color="text.secondary">Loading accounts...</Typography>
      ) : accounts.length === 0 ? (
        <Typography color="text.secondary">No accounts tracked yet</Typography>
      ) : (
        <List>
          {accounts.map((account) => (
            <React.Fragment key={account.username}>
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleAccountClick(account)}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <XIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={account.username}
                    secondary={`Last checked: ${new Date(account.lastChecked).toLocaleString()}`}
                  />
                  {account.keywords.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                      {account.keywords.map(keyword => (
                        <Chip 
                          key={keyword} 
                          label={keyword} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  )}
                  {selectedAccount?.username === account.username ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              </ListItem>

              <Collapse in={selectedAccount?.username === account.username} timeout="auto" unmountOnExit>
                <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                  {account.tweets?.map((tweet) => (
                    <Grid container spacing={2} key={tweet.id} sx={{ mb: 3 }}>
                      {/* Original Tweet - smaller */}
                      <Grid item xs={12} md={5}>
                        <Paper 
                          elevation={0} 
                          sx={{ 
                            height: '100%',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            position: 'relative',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          {/* Title Bar */}
                          <Box sx={{
                            p: 1.5,
                            bgcolor: 'grey.50',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}>
                            {/* Left side with logo and text */}
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              gap: 1,
                            }}>
                              <XIcon fontSize="small" color="action" />
                              <Typography variant="subtitle2" color="text.secondary">
                                Original Tweet
                              </Typography>
                            </Box>
                            
                            {/* Right side with link */}
                            <Link
                              href={`https://twitter.com/${tweet.username}/status/${tweet.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                color: 'text.secondary',
                                textDecoration: 'none',
                                fontSize: '0.75rem',
                                '&:hover': {
                                  color: 'primary.main',
                                  textDecoration: 'underline',
                                }
                              }}
                            >
                              View on X
                              <LaunchIcon sx={{ fontSize: 14 }} />
                            </Link>
                          </Box>

                          {/* Content */}
                          <Box sx={{ 
                            p: 2,
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                          }}>
                            {/* Username header */}
                            <Box sx={{ mb: 1.5 }}>
                              <Typography variant="subtitle2">
                                {tweet.username}
                              </Typography>
                            </Box>
                            
                            {/* Tweet content - adjusted to fill space */}
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                flex: 1,
                                mb: 'auto',
                                minHeight: 0,
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap',
                                overflowWrap: 'break-word',
                                textAlign: 'left',
                                pl: 1,
                                fontSize: '0.95rem',
                                lineHeight: 1.5,
                              }}
                            >
                              {tweet.text}
                            </Typography>
                          </Box>

                          {/* Bottom Bar */}
                          <Box sx={{ 
                            mt: 'auto',
                            borderTop: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'grey.50',
                            height: '52px',
                          }}>
                            {/* For Original Tweet metrics */}
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'center',
                              alignItems: 'center',
                              gap: 3,
                              width: '100%',
                              height: '100%',
                            }}>
                              <Typography variant="caption" color="text.secondary">
                                ♥ {tweet.public_metrics?.like_count || 0}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ↺ {tweet.public_metrics?.retweet_count || 0}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                💬 {tweet.public_metrics?.reply_count || 0}
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>

                      {/* Suggested Reply - larger */}
                      <Grid item xs={12} md={7}>
                        <Paper 
                          elevation={0} 
                          sx={{ 
                            height: '100%',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            position: 'relative',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          {/* Title Bar */}
                          <Box sx={{
                            p: 1.5,
                            bgcolor: 'grey.50',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}>
                            <XIcon fontSize="small" color="action" />
                            <Typography variant="subtitle2" color="text.secondary">
                              Suggested Reply
                            </Typography>
                          </Box>

                          {/* Content */}
                          <Box sx={{ 
                            p: 2,
                            flex: 1,
                          }}>
                            {editingReply === tweet.id ? (
                              <TextField
                                fullWidth
                                multiline
                                rows={4}
                                defaultValue={suggestions[tweet.id]}
                                placeholder="Edit reply..."
                              />
                            ) : (
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  minHeight: '80px',
                                  textAlign: 'left',
                                  pl: 1,
                                  fontSize: '0.95rem',
                                  lineHeight: 1.5,
                                }}
                              >
                                {suggestions[tweet.id] || 'Generating suggestion...'}
                              </Typography>
                            )}
                          </Box>

                          {/* Bottom Bar */}
                          <Box sx={{ 
                            mt: 'auto',
                            borderTop: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'grey.50',
                            height: '52px',
                          }}>
                            {/* For Suggested Reply buttons */}
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              px: 2,
                              width: '100%',
                              height: '100%',
                            }}>
                              <Button
                                size="small"
                                startIcon={<AIIcon sx={{ fontSize: 18 }} />}
                                onClick={(e) => handleAIEditClick(e, tweet)}
                                sx={{ 
                                  minWidth: 'auto',
                                  py: 0.5,
                                  fontSize: '0.75rem',
                                }}
                              >
                                Edit with AI
                              </Button>

                              {!approvedReplies.has(tweet.id) ? (
                                <Button
                                  variant="contained"
                                  color="primary"
                                  size="small"
                                  startIcon={<CheckIcon sx={{ fontSize: 18 }} />}
                                  onClick={() => handleApproveReply(tweet, suggestions[tweet.id])}
                                  disabled={!suggestions[tweet.id] || suggestions[tweet.id] === 'Generating suggestion...'}
                                  sx={{ 
                                    minWidth: '110px',
                                    height: '32px',
                                    py: 0.5,
                                    fontSize: '0.75rem',
                                    borderRadius: '4px',
                                    textTransform: 'none',
                                    '&.Mui-disabled': {
                                      bgcolor: 'rgba(0, 0, 0, 0.12)',
                                      color: 'rgba(0, 0, 0, 0.26)',
                                    }
                                  }}
                                >
                                  {suggestions[tweet.id] === 'Generating suggestion...' ? 'Generating...' : 'Approve'}
                                </Button>
                              ) : (
                                <Chip
                                  label="Approved"
                                  color="success"
                                  size="small"
                                  onClick={() => handleUnapprove(tweet)}
                                  onDelete={() => handleUnapprove(tweet)}
                                  sx={{
                                    minWidth: '110px',
                                    height: '32px',
                                    fontSize: '0.75rem',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    '&:hover': {
                                      bgcolor: 'error.lighter',
                                      color: 'error.main',
                                    },
                                    '& .MuiChip-label': {
                                      px: 2,
                                    },
                                    '& .MuiChip-deleteIcon': {
                                      color: 'inherit',
                                      '&:hover': {
                                        color: 'error.main',
                                      }
                                    }
                                  }}
                                />
                              )}

                              <Button
                                size="small"
                                startIcon={<EditIcon sx={{ fontSize: 18 }} />}
                                onClick={() => setEditingReply(editingReply === tweet.id ? null : tweet.id)}
                                sx={{ 
                                  minWidth: 'auto',
                                  py: 0.5,
                                  fontSize: '0.75rem',
                                }}
                              >
                                Edit Text
                              </Button>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>

                      {/* AI Context Popper */}
                      <Grid item xs={12}>
                        <Popper 
                          open={Boolean(anchorEl) && editingContext}
                          anchorEl={anchorEl}
                          placement="bottom-start"
                          sx={{ zIndex: 1300 }}
                        >
                          <ClickAwayListener 
                            onClickAway={(event) => {
                              // Check if click is inside the popper content or the button
                              if (popperRef.current?.contains(event.target) || 
                                  anchorEl?.contains(event.target)) {
                                return;
                              }
                              setAnchorEl(null);
                              setEditingContext(false);
                            }}
                          >
                            <PopperPaper 
                              ref={popperRef}
                              elevation={3}
                              sx={{ 
                                p: 2,
                                width: '400px',
                                mt: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                              }}
                            >
                              <Typography variant="subtitle2" gutterBottom>
                                Update AI Context
                              </Typography>
                              <TextField
                                fullWidth
                                size="small"
                                multiline
                                rows={2}
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                                placeholder="Enter new instructions for AI (e.g., 'Be more professional', 'Use casual tone')"
                              />
                              <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                <Button 
                                  size="small" 
                                  onClick={() => {
                                    setAnchorEl(null);
                                    setEditingContext(false);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  size="small" 
                                  variant="contained"
                                  onClick={() => {
                                    generateReply(currentTweet);
                                    setAnchorEl(null);
                                    setEditingContext(false);
                                  }}
                                >
                                  Regenerate
                                </Button>
                              </Box>
                            </PopperPaper>
                          </ClickAwayListener>
                        </Popper>
                      </Grid>
                    </Grid>
                  ))}
                </Box>
              </Collapse>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default TrackedAccountsList; 