import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button
} from '@mui/material';
import {
  Email as EmailIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

const Profile = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Please log in to view your profile</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      {/* Header Section */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        mb: 3 
      }}>
        <Avatar 
          sx={{ 
            width: 80, 
            height: 80,
            bgcolor: 'primary.main',
            fontSize: '2rem'
          }}
        >
          {user.name?.charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            {user.name}
          </Typography>
          <Typography color="text.secondary">
            {user.email}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Details Section */}
      <List>
        <ListItem>
          <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
          <ListItemText 
            primary="Name"
            secondary={user.name}
          />
        </ListItem>
        <ListItem>
          <EmailIcon sx={{ mr: 2, color: 'primary.main' }} />
          <ListItemText 
            primary="Email"
            secondary={user.email}
          />
        </ListItem>
        <ListItem>
          <CalendarIcon sx={{ mr: 2, color: 'primary.main' }} />
          <ListItemText 
            primary="Member Since"
            secondary={new Date(user.createdAt || Date.now()).toLocaleDateString()}
          />
        </ListItem>
      </List>

      <Divider sx={{ my: 2 }} />

      {/* Stats Section */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Account Statistics
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          flexWrap: 'wrap' 
        }}>
          <Chip 
            label={`${user.preferences?.trackedAccounts?.length || 0} Tracked Accounts`}
            color="primary"
            variant="outlined"
          />
          <Chip 
            label="Active"
            color="success"
            variant="outlined"
          />
        </Box>
      </Box>

      {/* Actions Section */}
      <Box sx={{ mt: 4 }}>
        <Button 
          variant="contained" 
          color="primary"
          fullWidth
          onClick={logout}
        >
          Sign Out
        </Button>
      </Box>
    </Paper>
  );
};

export default Profile; 