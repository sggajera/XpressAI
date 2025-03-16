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
  Link,
  useTheme
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
import { useAuth } from '../../context/AuthContext';

const TrackedAccountsList = ({ onAddToQueue, onRemoveFromQueue, approvedReplies, queuedReplies, accounts = [], loading = false }) => {
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [suggestions, setSuggestions] = useState({});
  const [editingReply, setEditingReply] = useState(null);
  const [editingContext, setEditingContext] = useState(false);
  const [context, setContext] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const popperRef = useRef(null);
  const [currentTweet, setCurrentTweet] = useState(null);
  const { getStoredToken } = useAuth();
  const theme = useTheme();

  // Initialize suggestions when queuedReplies changes
  useEffect(() => {
    const replySuggestions = {};
    queuedReplies.forEach(reply => {
      replySuggestions[reply.tweetId] = reply.replyText;
    });
    setSuggestions(prev => ({
      ...prev,
      ...replySuggestions
    }));
  }, [queuedReplies]);

  const handleAccountClick = async (account) => {
    setSelectedAccount(selectedAccount?.username === account.username ? null : account);
    
    // Generate replies for all posts that don't have suggestions yet
    const postsArray = Array.isArray(account.posts) ? account.posts : [];

    if (postsArray.length > 0) {
      const postsWithoutSuggestions = postsArray.filter(post => !suggestions[post.id]);
      await Promise.all(postsWithoutSuggestions.map(post => generateReply(post, false)));
    }
  };

  const generateReply = async (post, forceRegenerate = false) => {
    try {
      // Check if this post already has a reply stored in the database
      // and we're not forcing regeneration
      if (!forceRegenerate) {
        // First check if we already have a suggestion locally
        if (suggestions[post.id] && suggestions[post.id] !== 'Generating suggestion...' && 
            suggestions[post.id] !== 'Failed to generate reply') {
          console.log('Using existing suggestion for post:', post.id);
          return;
        }
        
        // Then check if the post has a reply in the database
        const token = getStoredToken();
        const checkResponse = await fetch(`/api/twitter/post-reply/${post.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (checkResponse.ok) {
          const data = await checkResponse.json();
          if (data.success && data.data && data.data.reply && data.data.reply.replyText) {
            // Use the existing reply from the database
            setSuggestions(prev => ({
              ...prev,
              [post.id]: data.data.reply.replyText
            }));
            console.log('Using existing reply from database for post:', post.id);
            return;
          }
        }
      }
      
      // Show loading state while generating
      setSuggestions(prev => ({
        ...prev,
        [post.id]: 'Generating suggestion...'
      }));

      const token = getStoredToken();
      const response = await fetch('/api/test-reply', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tweet: post.text,
          context: context || 'Be professional and friendly'
        }),
      });

      const data = await response.json();
      
      // Store the generated reply in the Post object
      if (data.reply) {
        const storeResponse = await fetch('/api/twitter/store-reply', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            postId: post.id,
            replyText: data.reply,
            forceUpdate: forceRegenerate
          })
        });
        
        if (!storeResponse.ok) {
          console.error('Failed to store reply in Post object:', await storeResponse.json());
        }
      }
      
      setSuggestions(prev => ({
        ...prev,
        [post.id]: data.reply
      }));
    } catch (error) {
      console.error('Error generating reply:', error);
      setSuggestions(prev => ({
        ...prev,
        [post.id]: 'Failed to generate reply'
      }));
    }
  };

  const handleApproveReply = async (post, reply) => {
    try {
      // Check if already approved to prevent duplicate
      if (approvedReplies.has(post.id)) {
        return;
      }

      const token = getStoredToken();
      
      // First, ensure the reply is stored in the Post object
      const storeResponse = await fetch('/api/twitter/store-reply', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: post.id,
          replyText: reply,
          forceUpdate: true // Always update when approving
        })
      });
      
      if (!storeResponse.ok) {
        throw new Error('Failed to store reply in Post object');
      }
      
      // Then, add to queue through the approved-replies endpoint
      const queueResponse = await fetch('/api/twitter/approved-replies', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tweetId: post.id,
          reply: {
            replyText: reply,
            tone: context || 'professional',
            userGeneralContext: context || '',
          }
        })
      });
      
      if (!queueResponse.ok) {
        throw new Error('Failed to add reply to queue');
      }
      
      // Update local state
      onAddToQueue({
        username: selectedAccount.username,
        originalTweet: post.text,
        replyText: reply,
        tweetId: post.id,
        queuedAt: new Date().toISOString(),
      });

      // Disable editing mode
      setEditingReply(null);
    } catch (error) {
      console.error('Error storing approved reply:', error);
    }
  };

  const handleUnapprove = async (post) => {
    try {
      // Remove from DB first
      const token = getStoredToken();
      const response = await fetch(`/api/twitter/approved-replies/${post.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove reply from database');
      }
      
      // Remove from queue - ensure we're passing the correct ID structure
      if (onRemoveFromQueue) {
        console.log('Unapproving tweet with ID:', post.id);
        onRemoveFromQueue(post.id);
      }

      // Put the message back in the suggested reply
      setSuggestions(prev => ({
        ...prev,
        [post.id]: prev[post.id] || 'No suggestion available' // Restore the suggestion
      }));
    } catch (error) {
      console.error('Error removing approved reply:', error);
    }
  };

  const handleAIEditClick = (event, post) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
    setEditingContext(true);
    setContext('');
    setCurrentTweet(post);
  };

  const handleSaveEditedReply = (tweetId, newReplyText) => {
    setSuggestions(prev => ({
      ...prev,
      [tweetId]: newReplyText
    }));
    setEditingReply(null);
  };

  // Add a helper function to format the date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } catch (error) {
      return 'Invalid Date';
    }
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
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        Tracked Accounts
      </Typography>

      {loading ? (
        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
          Loading tracked accounts...
        </Typography>
      ) : !Array.isArray(accounts) || accounts.length === 0 ? (
        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
          No accounts being tracked
        </Typography>
      ) : (
        <List>
          {accounts.map((account) => (
            <React.Fragment key={account.username}>
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleAccountClick(account)}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <XIcon sx={{ color: '#FFFFFF' }} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={account.username}
                    secondary={`Last checked: ${formatDate(account.lastChecked)}`}
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
                  {(() => {
                    // Ensure posts is an array
                    const postsArray = Array.isArray(account.posts) ? account.posts : [];
                    
                    return postsArray.map((post) => (
                      <Grid container spacing={2} key={post.id} sx={{ mb: 3 }}>
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
                              bgcolor: 'background.paperLight',
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
                                <XIcon 
                                  fontSize="small" 
                                  sx={{ 
                                    color: theme.palette.mode === 'dark' ? '#FFFFFF' : 'rgba(0, 0, 0, 0.54)',
                                    filter: 'none !important'
                                  }} 
                                />
                                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  Original Tweet
                                </Typography>
                              </Box>
                              
                              {/* Right side with link */}
                              <Link
                                href={`https://twitter.com/${post.username}/status/${post.id}`}
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
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {post.username}
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
                                {post.text}
                              </Typography>
                            </Box>

                            {/* Bottom Bar */}
                            <Box sx={{ 
                              mt: 'auto',
                              borderTop: '1px solid',
                              borderColor: 'divider',
                              bgcolor: 'background.paperLight',
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
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  ♥ {post.public_metrics?.likeCount || 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  ↺ {post.public_metrics?.retweetCount || 0}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  💬 {post.public_metrics?.replyCount || 0}
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
                              bgcolor: 'background.paperLight',
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}>
                              <XIcon 
                                fontSize="small" 
                                sx={{ 
                                  color: theme.palette.mode === 'dark' ? '#FFFFFF' : 'rgba(0, 0, 0, 0.54)',
                                  filter: 'none !important'
                                }} 
                              />
                              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                Suggested Reply
                              </Typography>
                            </Box>

                            {/* Content */}
                            <Box sx={{ 
                              p: 2,
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                            }}>
                              {editingReply === post.id ? (
                                <TextField
                                  fullWidth
                                  multiline
                                  rows={4}
                                  defaultValue={suggestions[post.id]}
                                  placeholder="Edit reply..."
                                  onBlur={(e) => handleSaveEditedReply(post.id, e.target.value)}
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
                                  {suggestions[post.id] || 'Generating suggestion...'}
                                </Typography>
                              )}
                            </Box>

                            {/* Bottom Bar */}
                            <Box sx={{ 
                              mt: 'auto',
                              borderTop: '1px solid',
                              borderColor: 'divider',
                              bgcolor: 'background.paperLight',
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
                                {/* Left side - Edit with AI button */}
                                <Box sx={{ width: '120px' }}>
                                  <Button
                                    size="small"
                                    startIcon={<AIIcon sx={{ fontSize: 18 }} />}
                                    onClick={(e) => handleAIEditClick(e, post)}
                                    disabled={approvedReplies.has(post.id)}
                                    sx={{ 
                                      minWidth: 'auto',
                                      py: 0.5,
                                      fontSize: '0.75rem',
                                      color: 'text.primary',
                                      fontWeight: 600,
                                      '&.Mui-disabled': {
                                        color: 'text.disabled'
                                      }
                                    }}
                                  >
                                    Edit with AI
                                  </Button>
                                </Box>

                                {/* Middle - Approve/Approved button */}
                                {!approvedReplies.has(post.id) ? (
                                  <Button
                                    variant="contained"
                                    color="primary"
                                    size="small"
                                    startIcon={<CheckIcon sx={{ fontSize: 18 }} />}
                                    onClick={() => handleApproveReply(post, suggestions[post.id])}
                                    disabled={
                                      !suggestions[post.id] || 
                                      suggestions[post.id] === 'Generating suggestion...' ||
                                      editingReply === post.id ||
                                      (Boolean(anchorEl) && editingContext && currentTweet?.id === post.id)
                                    }
                                    sx={{ 
                                      minWidth: '110px',
                                      height: '32px',
                                      py: 0.5,
                                      fontSize: '0.75rem',
                                      borderRadius: '4px',
                                      textTransform: 'none',
                                      fontWeight: 600,
                                      color: '#CCCCCC',
                                      '&.Mui-disabled': {
                                        bgcolor: 'rgba(0, 0, 0, 0.12)',
                                        color: 'rgba(0, 0, 0, 0.26)',
                                      }
                                    }}
                                  >
                                    {suggestions[post.id] === 'Generating suggestion...' ? 'Generating...' : 'Approve'}
                                  </Button>
                                ) : (
                                  <Chip
                                    label="Approved"
                                    color="success"
                                    size="small"
                                    onClick={() => handleUnapprove(post)}
                                    onDelete={() => handleUnapprove(post)}
                                    sx={{
                                      minWidth: '110px',
                                      height: '32px',
                                      fontSize: '0.75rem',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      '&:hover': {
                                        bgcolor: 'error.lighter',
                                        color: 'error.main',
                                      },
                                      '& .MuiChip-label': {
                                        px: 2,
                                        fontWeight: 600,
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

                                {/* Right side - Edit Text button or Save button */}
                                <Box sx={{ width: '120px', display: 'flex', justifyContent: 'flex-end' }}>
                                  {editingReply === post.id ? (
                                    <Button
                                      size="small"
                                      startIcon={<CheckIcon sx={{ fontSize: 18 }} />}
                                      onClick={() => {
                                        const textField = document.querySelector(`[data-tweet-id="${post.id}"] textarea`);
                                        if (textField) {
                                          handleSaveEditedReply(post.id, textField.value);
                                        }
                                      }}
                                      sx={{ 
                                        minWidth: 'auto',
                                        py: 0.5,
                                        fontSize: '0.75rem',
                                      }}
                                    >
                                      Save
                                    </Button>
                                  ) : (
                                    <Button
                                      size="small"
                                      startIcon={<EditIcon sx={{ fontSize: 18 }} />}
                                      onClick={() => setEditingReply(editingReply === post.id ? null : post.id)}
                                      disabled={approvedReplies.has(post.id)}
                                      sx={{ 
                                        minWidth: 'auto',
                                        py: 0.5,
                                        fontSize: '0.75rem',
                                        color: 'text.primary',
                                        fontWeight: 600,
                                        '&.Mui-disabled': {
                                          color: 'text.disabled'
                                        }
                                      }}
                                    >
                                      Edit Text
                                    </Button>
                                  )}
                                </Box>
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
                                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  AI Context
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                  Enter instructions for AI to generate a new reply
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
                                      generateReply(currentTweet, true);
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
                    ));
                  })()}
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