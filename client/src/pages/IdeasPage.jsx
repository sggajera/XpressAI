import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Avatar,
  Tooltip,
  Snackbar,
  Alert,
  Divider,
  Fade,
  keyframes,
} from '@mui/material';
import {
  Send as SendIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import MainLayout from '../components/Layout/MainLayout';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Add keyframes for the blinking animation
const blinkAnimation = keyframes`
  0% { box-shadow: 0 4px 20px rgba(0, 76, 140, 0.3); }
  50% { box-shadow: 0 4px 30px rgba(0, 76, 140, 0.6); }
  100% { box-shadow: 0 4px 20px rgba(0, 76, 140, 0.3); }
`;

const IdeasPage = () => {
  const [ideas, setIdeas] = useState('');
  const [ideaHistory, setIdeaHistory] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isTyping, setIsTyping] = useState(false);
  const { getStoredToken, user } = useAuth();
  const { mode } = useTheme();
  const messagesEndRef = useRef(null);
  
  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [ideaHistory]);

  // Fetch idea history on component mount
  useEffect(() => {
    const fetchIdeaHistory = async () => {
      try {
        const token = getStoredToken();
        const response = await fetch('/api/context/history', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setIdeaHistory(data.data);
          }
        }
      } catch (error) {
        console.error('Error fetching idea history:', error);
      }
    };

    fetchIdeaHistory();
  }, [getStoredToken]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setIdeas(value);
    setIsTyping(value.length > 0);
  };

  const handleSave = async () => {
    if (!ideas.trim()) return;
    
    try {
      const token = getStoredToken();
      const response = await fetch('/api/context', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userGeneralContext: ideas
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save ideas');
      }

      // Add to history and clear input
      const newIdea = {
        id: Date.now(),
        text: ideas,
        createdAt: new Date().toISOString()
      };
      
      setIdeaHistory([...ideaHistory, newIdea]);
      setIdeas('');
      setIsTyping(false);
      setSnackbar({
        open: true,
        message: 'Idea saved successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving ideas:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save idea: ' + error.message,
        severity: 'error'
      });
    }
  };

  const handleEdit = (id, text) => {
    setEditingId(id);
    setEditText(text);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = async (id) => {
    try {
      const token = getStoredToken();
      
      // Use the context endpoint with a delete flag
      const response = await fetch('/api/context', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deleteIdeaId: id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete idea');
      }

      // Remove idea from history
      const updatedHistory = ideaHistory.filter(idea => idea.id !== id);
      setIdeaHistory(updatedHistory);
      
      setSnackbar({
        open: true,
        message: 'Idea deleted successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting idea:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete idea: ' + error.message,
        severity: 'error'
      });
    }
  };

  const handleSaveEdit = async (id) => {
    if (!editText.trim()) return;
    
    try {
      const token = getStoredToken();
      
      // Use the main context endpoint since we don't have a specific endpoint for individual ideas
      const response = await fetch('/api/context', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userGeneralContext: editText,
          ideaId: id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update idea');
      }

      // Update idea in history
      const updatedHistory = ideaHistory.map(idea => 
        idea.id === id ? { ...idea, text: editText } : idea
      );
      
      setIdeaHistory(updatedHistory);
      setEditingId(null);
      setEditText('');
      setSnackbar({
        open: true,
        message: 'Idea updated successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating idea:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update idea: ' + error.message,
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleEditKeyPress = (e, id) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit(id);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Determine background colors based on theme mode
  const isDarkMode = mode === 'dark';
  const paperBgGradient = isDarkMode 
    ? 'linear-gradient(145deg, #1A1A1A 0%, #2C2C2C 100%)'
    : 'linear-gradient(145deg, #FFFFFF 0%, #F5F7FA 100%)';
  const messagesBg = isDarkMode ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.02)';
  const inputBg = isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)';
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const textColor = isDarkMode ? '#E8E8E8' : '#2C3E50';
  const textSecondary = isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';
  const titleColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
  const subtitleColor = isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const messageBubbleBg = isDarkMode 
    ? 'linear-gradient(135deg, #004C8C 0%, #003A6C 100%)'
    : 'linear-gradient(135deg, #1D9BF0 0%, #0D8AE0 100%)';
  const inputFieldBg = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const inputFieldBorder = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const inputFieldText = isDarkMode ? '#E8E8E8' : '#2C3E50';
  const emptyMessageColor = isDarkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const headerBg = isDarkMode ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.03)';

  // Fixed height for the input area
  const inputAreaHeight = '120px';

  // Determine if header should be shown
  const showHeader = !isTyping && ideaHistory.length === 0;

  return (
    <MainLayout>
      <Box 
        sx={{ 
          height: 'calc(100vh - 64px)', // Full height minus header
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          p: { xs: 1, sm: 2 },
          maxWidth: '900px', // Added max width for overall container
          mx: 'auto', // Center the container
        }}
      >
        {/* Main Content Area - Structured view box */}
        <Paper 
          elevation={0}
          sx={{ 
            borderRadius: 2,
            background: paperBgGradient,
            border: `1px solid ${borderColor}`,
            boxShadow: '0 4px 20px rgba(0, 76, 140, 0.3)',
            animation: `${blinkAnimation} 3s ease-in-out infinite`,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            maxHeight: 'calc(100vh - 100px)', // Limit maximum height
            '&:hover': {
              animation: 'none',
              boxShadow: '0 4px 30px rgba(0, 76, 140, 0.6)',
            },
          }}
        >
          {/* Chat Messages Area - Structured with better organization */}
          <Box 
            sx={{ 
              flex: 1,
              overflow: 'auto',
              p: 2,
              display: 'flex',
              flexDirection: 'column-reverse', // Reverse to show newest at bottom
              gap: 2,
              bgcolor: messagesBg,
              minHeight: '180px', // Reduced from 200px
              height: `calc(100% - ${inputAreaHeight})`,
            }}
          >
            <div ref={messagesEndRef} />
            {ideaHistory.length > 0 ? (
              [...ideaHistory].reverse().map((idea) => (
                <Box 
                  key={idea.id} 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    maxWidth: '80%',
                    alignSelf: 'flex-end',
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: '18px 18px 4px 18px',
                        background: messageBubbleBg,
                        border: `1px solid ${borderColor}`,
                        position: 'relative',
                        '&:hover .edit-button, &:hover .delete-button': {
                          opacity: 1,
                        }
                      }}
                    >
                      {editingId === idea.id ? (
                        <Box sx={{ width: '100%' }}>
                          <Typography 
                            component="div"
                            sx={{ 
                              color: '#FFFFFF',
                              fontSize: '0.95rem',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              textAlign: 'left',
                              lineHeight: 1.3,
                              width: '100%',
                              boxSizing: 'border-box',
                              position: 'relative',
                            }}
                          >
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSaveEdit(idea.id);
                                }
                              }}
                              autoFocus
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: '#FFFFFF',
                                fontSize: '0.95rem',
                                lineHeight: '1.3',
                                fontFamily: 'inherit',
                                resize: 'none',
                                padding: 0,
                                margin: 0,
                                overflow: 'hidden',
                              }}
                            />
                            {/* Invisible text to match dimensions */}
                            <span style={{ visibility: 'hidden' }}>{editText || ' '}</span>
                          </Typography>
                          
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              justifyContent: 'flex-end', 
                              gap: 1,
                              mt: 1,
                            }}
                          >
                            <IconButton 
                              size="small" 
                              onClick={handleCancelEdit}
                              sx={{ color: 'rgba(255,255,255,0.7)' }}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              onClick={() => handleSaveEdit(idea.id)}
                              sx={{ 
                                color: 'rgba(255,255,255,0.9)',
                                bgcolor: 'rgba(0,76,140,0.5)',
                                '&:hover': {
                                  bgcolor: 'rgba(0,76,140,0.8)',
                                }
                              }}
                            >
                              <SaveIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      ) : (
                        <>
                          <Typography 
                            sx={{ 
                              color: '#FFFFFF',
                              fontSize: '0.95rem',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              textAlign: 'left', // Left-align text
                              lineHeight: 1.3, // Reduce line spacing
                              width: '100%',
                              boxSizing: 'border-box',
                            }}
                          >
                            {idea.text}
                          </Typography>
                          {/* Edit Button */}
                          <IconButton 
                            className="edit-button"
                            size="small" 
                            onClick={() => handleEdit(idea.id, idea.text)}
                            sx={{ 
                              position: 'absolute',
                              top: -8,
                              left: -8,
                              bgcolor: 'rgba(0,0,0,0.5)',
                              color: 'rgba(255,255,255,0.9)',
                              width: 28,
                              height: 28,
                              opacity: 0.4,
                              transition: 'opacity 0.2s',
                              '&:hover': {
                                bgcolor: 'rgba(0,0,0,0.7)',
                                opacity: 1,
                              },
                              '.MuiSvgIcon-root': {
                                fontSize: '1rem',
                              }
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          
                          {/* Delete Button */}
                          <IconButton 
                            className="delete-button"
                            size="small" 
                            onClick={() => handleDelete(idea.id)}
                            sx={{ 
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              bgcolor: 'rgba(220,0,0,0.5)',
                              color: 'rgba(255,255,255,0.9)',
                              width: 28,
                              height: 28,
                              opacity: 0.4,
                              transition: 'opacity 0.2s',
                              '&:hover': {
                                bgcolor: 'rgba(220,0,0,0.7)',
                                opacity: 1,
                              },
                              '.MuiSvgIcon-root': {
                                fontSize: '1rem',
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </Paper>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: textSecondary,
                        mt: 0.5,
                        fontSize: '0.7rem',
                      }}
                    >
                      {formatDate(idea.createdAt)}
                    </Typography>
                  </Box>
                  <Avatar 
                    sx={{ 
                      width: 36, 
                      height: 36,
                      bgcolor: '#004C8C',
                      fontSize: '0.9rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {getInitials(user?.name)}
                  </Avatar>
                </Box>
              ))
            ) : (
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center',
                  height: '100%',
                  gap: 2
                }}
              >
                {!isTyping && (
                  <Fade in={showHeader}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography
                        variant="h6"
                        sx={{
                          color: titleColor,
                          fontWeight: 400,
                          letterSpacing: '0.5px',
                          fontSize: '1.2rem',
                          mb: 1
                        }}
                      >
                        Your Idea Stream
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: subtitleColor,
                          fontWeight: 300,
                          fontSize: '0.8rem',
                          display: 'block',
                          mb: 2
                        }}
                      >
                        Capture your ideas, reflections, and insights
                      </Typography>
                    </Box>
                  </Fade>
                )}
              </Box>
            )}
          </Box>
          
          {/* Chat Input Area - Structured with better visual separation */}
          <Box 
            sx={{ 
              borderTop: `1px solid ${borderColor}`,
              background: inputBg,
              display: 'flex',
              flexDirection: 'column',
              height: inputAreaHeight,
              borderRadius: '0 0 8px 8px', // Rounded corners at bottom
            }}
          >
            {/* Input Field and Send Button */}
            <Box 
              sx={{ 
                p: 2,
                display: 'flex',
                alignItems: 'flex-end',
                gap: 1,
                flex: 1,
              }}
            >
              <TextField
                fullWidth
                multiline
                maxRows={3}
                minRows={3}
                value={ideas}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Type your ideas here..."
                variant="outlined"
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: inputFieldBg,
                    borderRadius: '20px',
                    padding: '10px 14px',
                    height: '100%',
                    '& fieldset': {
                      borderColor: inputFieldBorder,
                      borderRadius: '20px',
                    },
                    '&:hover fieldset': {
                      borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#004C8C',
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    color: inputFieldText,
                    fontSize: '0.95rem',
                    lineHeight: 1.3,
                    padding: '6px 4px',
                  },
                }}
              />
              <Tooltip title="Send idea (or press Enter)">
                <span>
                  <IconButton
                    onClick={handleSave}
                    disabled={!ideas.trim()}
                    sx={{
                      bgcolor: '#004C8C',
                      color: '#FFFFFF',
                      width: 42,
                      height: 42,
                      '&:hover': {
                        bgcolor: '#003A6C',
                      },
                      '&.Mui-disabled': {
                        bgcolor: 'rgba(0, 76, 140, 0.3)',
                        color: 'rgba(255, 255, 255, 0.4)',
                      }
                    }}
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
        </Paper>
      </Box>
      
      {/* Feedback Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
};

export default IdeasPage; 