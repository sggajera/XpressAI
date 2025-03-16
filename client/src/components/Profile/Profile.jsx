import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
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
import MainLayout from '../Layout/MainLayout';
import TwitterConnect from './TwitterConnect';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <MainLayout>
        <Container maxWidth="sm">
          <Paper sx={{ p: 3, textAlign: 'center', mt: 4 }}>
            <Typography>Please log in to view your profile</Typography>
          </Paper>
        </Container>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
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
        </Paper>

        {/* Twitter Connect Section */}
        <TwitterConnect />

        {/* Actions Section */}
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ mt: 2 }}>
            <Button 
              variant="contained" 
              color="primary"
              fullWidth
              onClick={logout}
              sx={{
                background: 'linear-gradient(45deg, #000000 30%, #2C2C2C 90%)',
                color: '#FFFFFF',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1A1A1A 30%, #383838 90%)',
                },
              }}
            >
              Sign Out
            </Button>
          </Box>
        </Paper>
      </Container>
    </MainLayout>
  );
};

export default Profile; 