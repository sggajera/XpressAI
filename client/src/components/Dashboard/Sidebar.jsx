import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Box,
  Divider,
  Typography,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Settings as SettingsIcon,
  Person as ProfileIcon,
  AccountCircle as AccountIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import theme from '../../theme';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const menuItems = [
    { title: 'Profile', icon: <ProfileIcon />, action: () => navigate('/profile') },
    { title: 'Account Management', icon: <AccountIcon />, action: () => console.log('Account clicked') },
    { title: 'Scheduler', icon: <ScheduleIcon />, action: () => console.log('Scheduler clicked') },
    { title: 'Settings', icon: <SettingsIcon />, action: () => console.log('Settings clicked') },
    { title: 'Security', icon: <SecurityIcon />, action: () => console.log('Security clicked') },
    { title: 'Notifications', icon: <NotificationsIcon />, action: () => console.log('Notifications clicked') },
    { title: 'Help & Support', icon: <HelpIcon />, action: () => console.log('Help clicked') },
  ];

  return (
    <>
      {!open && (
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            color: '#E8E8E8',
            padding: '12px',
            height: '48px',
            width: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <MenuIcon sx={{ 
            fontSize: 32,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
          }} />
        </IconButton>
      )}

      <Drawer
        anchor="left"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            bgcolor: 'background.paper',
            borderRight: '1px solid',
            borderColor: 'divider',
          }
        }}
      >
        <Box sx={{ 
          background: 'linear-gradient(45deg, #000000 30%, #2C2C2C 90%)',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          px: 2,
        }}>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 600,
              letterSpacing: '1px',
              color: '#fff',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              textTransform: 'uppercase',
            }}
          >
            Xpress AI
          </Typography>
        </Box>

        <Box sx={{ p: 2 }}>
          <List>
            {menuItems.map((item) => (
              <ListItem 
                button 
                key={item.title}
                onClick={item.action}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  '&:hover': {
                    bgcolor: 'menu.hover',
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: 40,
                  color: 'primary.main' 
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.title} />
              </ListItem>
            ))}

            <Divider sx={{ my: 2 }} />

            <ListItem 
              button 
              onClick={handleLogout}
              sx={{
                color: 'error.main',
                borderRadius: 1,
                '&:hover': {
                  bgcolor: 'error.lighter',
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Sidebar; 