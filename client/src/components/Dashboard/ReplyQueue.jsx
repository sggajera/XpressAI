import React, { useState } from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  Card,
  CardContent,
  Box,
  Button,
  Chip,
  Divider,
  Collapse,
  IconButton,
  Tooltip,
} from '@mui/material';
import { 
  Send as SendIcon, 
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  SendAll as SendAllIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import XIcon from '../Icons/XIcon';

const ReplyQueue = ({ queuedReplies = [], onRemoveReply }) => {
  const [sending, setSending] = useState(new Set());
  const [sendingAll, setSendingAll] = useState(false);

  const handleSendReply = async (reply) => {
    setSending(prev => new Set([...prev, reply.id]));
    try {
      // TODO: Implement actual sending
      await new Promise(resolve => setTimeout(resolve, 1000));
      // After successful send, remove from queue and DB
      await onRemoveReply(reply.tweetId);
    } finally {
      setSending(prev => {
        const next = new Set(prev);
        next.delete(reply.id);
        return next;
      });
    }
  };

  const handleSendAll = async () => {
    if (queuedReplies.length === 0) return;
    
    setSendingAll(true);
    try {
      // Send all replies in sequence
      for (const reply of queuedReplies) {
        await handleSendReply(reply);
      }
    } finally {
      setSendingAll(false);
    }
  };

  // Add a helper function to format the date
  const formatDate = (dateString) => {
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
    <Paper sx={{ 
      p: 2, 
      borderRadius: 2, 
      bgcolor: 'background.paper', 
      height: '85vh',
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon fontSize="small" />
          <Typography variant="h6">
            Reply Queue ({queuedReplies.length})
          </Typography>
        </Box>
        
        <Tooltip title="Post all replies">
          <span>
            <Button
              variant="contained"
              size="medium"
              onClick={handleSendAll}
              disabled={sendingAll || queuedReplies.length === 0}
              startIcon={<SendIcon sx={{ color: '#E8E8E8' }} />}
              sx={{
                background: 'linear-gradient(45deg, #000000 30%, #2C2C2C 90%)',
                boxShadow: '0 3px 8px 2px rgba(0, 0, 0, 0.3)',
                color: '#E8E8E8',
                minWidth: '120px',
                height: '40px',
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                letterSpacing: '0.5px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(4px)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1A1A1A 30%, #383838 90%)',
                  boxShadow: '0 4px 10px 3px rgba(0, 0, 0, 0.4)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
                '&.Mui-disabled': {
                  background: 'linear-gradient(45deg, #666666 30%, #888888 90%)',
                  color: 'rgba(255, 255, 255, 0.5)',
                  boxShadow: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                },
                '& .MuiButton-startIcon': {
                  marginRight: 1,
                },
                '& .MuiSvgIcon-root': {
                  fontSize: '1.2rem',
                },
              }}
            >
              {sendingAll ? 'Posting...' : 'Post All'}
            </Button>
          </span>
        </Tooltip>
      </Box>

      {queuedReplies.length === 0 ? (
        <Box sx={{ 
          textAlign: 'center', 
          py: 3,
          bgcolor: 'rgba(0, 0, 0, 0.02)',
          borderRadius: 1,
          border: '1px dashed rgba(0, 0, 0, 0.1)'
        }}>
          <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
            No replies in queue
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Approve replies to add them to the queue
          </Typography>
        </Box>
      ) : (
        <List sx={{ maxHeight: '75vh', overflow: 'auto' }}>
          {queuedReplies.map((reply) => (
            <ListItem key={reply.id} sx={{ px: 0 }}>
              <Card variant="outlined" sx={{ width: '100%', position: 'relative' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <XIcon fontSize="small" />
                    <Typography variant="subtitle2">
                      {reply.username}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {reply.originalTweet}
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    my: 2,
                  }}>
                    <Box sx={{ flex: 1, borderBottom: '1px solid', borderColor: 'divider' }} />
                    <Typography variant="caption" color="text.secondary" sx={{ 
                      fontSize: '0.65rem',
                      opacity: 0.7,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Reply
                    </Typography>
                    <Box sx={{ flex: 1, borderBottom: '1px solid', borderColor: 'divider' }} />
                  </Box>
                  
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {reply.replyText}
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 2,
                    pt: 2,
                    mt: 2,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                  }}>
                    <Box sx={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 2,
                    }}>
                      <Button
                        size="large"
                        variant="contained"
                        startIcon={<SendIcon />}
                        onClick={() => handleSendReply(reply)}
                        disabled={sending.has(reply.id)}
                        sx={{
                          flex: 1,
                          background: 'linear-gradient(45deg, #000000 30%, #2C2C2C 90%)',
                          boxShadow: '0 3px 8px 2px rgba(0, 0, 0, 0.3)',
                          color: '#E8E8E8',
                          height: '48px',
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontSize: '1rem',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #1A1A1A 30%, #383838 90%)',
                            boxShadow: '0 4px 10px 3px rgba(0, 0, 0, 0.4)',
                          },
                          '&.Mui-disabled': {
                            background: 'linear-gradient(45deg, #666666 30%, #888888 90%)',
                            color: 'rgba(255, 255, 255, 0.5)',
                            boxShadow: 'none',
                          }
                        }}
                      >
                        {sending.has(reply.id) ? 'Sending...' : 'Send Now'}
                      </Button>
                    </Box>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ 
                        alignSelf: 'center',
                        fontSize: '0.75rem',
                        opacity: 0.8
                      }}
                    >
                      Queued: {formatDate(reply.queuedAt)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
};

export default ReplyQueue; 