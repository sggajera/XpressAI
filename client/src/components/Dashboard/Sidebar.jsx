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
  Switch,
  useTheme as useMuiTheme
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
  DarkMode as DarkModeIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const Sidebar = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const muiTheme = useMuiTheme();

  const handleLogout = () => {
    logout();
  };

  // Define icon color based on theme mode
  const getIconColor = () => {
    return mode === 'dark' ? '#FFFFFF' : 'rgba(0, 0, 0, 0.7)';
  };

  const menuItems = [
    { title: 'Profile', icon: <ProfileIcon sx={{ color: getIconColor(), filter: 'none !important' }} />, action: () => navigate('/profile') },
    { title: 'Account Management', icon: <AccountIcon sx={{ color: getIconColor(), filter: 'none !important' }} />, action: () => console.log('Account clicked') },
    { title: 'Scheduler', icon: <ScheduleIcon sx={{ color: getIconColor(), filter: 'none !important' }} />, action: () => console.log('Scheduler clicked') },
    { title: 'Settings', icon: <SettingsIcon sx={{ color: getIconColor(), filter: 'none !important' }} />, action: () => console.log('Settings clicked') },
    { title: 'Security', icon: <SecurityIcon sx={{ color: getIconColor(), filter: 'none !important' }} />, action: () => console.log('Security clicked') },
    { title: 'Notifications', icon: <NotificationsIcon sx={{ color: getIconColor(), filter: 'none !important' }} />, action: () => console.log('Notifications clicked') },
    { title: 'Help & Support', icon: <HelpIcon sx={{ color: getIconColor(), filter: 'none !important' }} />, action: () => console.log('Help clicked') },
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
            filter: 'none !important',
            color: '#FFFFFF',
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
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 500,
              letterSpacing: '0.5px',
              color: '#fff',
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              textTransform: 'uppercase',
            }}
          >
            XPRESS AI
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
                    bgcolor: 'action.hover',
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: 40,
                  color: getIconColor(),
                  '& .MuiSvgIcon-root': {
                    filter: 'none !important',
                  }
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.title} />
              </ListItem>
            ))}

            <ListItem 
              button 
              onClick={toggleTheme}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                '&:hover': {
                  bgcolor: 'action.hover',
                }
              }}
            >
              <ListItemIcon sx={{ 
                minWidth: 40,
                color: getIconColor(),
              }}>
                <DarkModeIcon sx={{ color: getIconColor(), filter: 'none !important' }} />
              </ListItemIcon>
              <ListItemText primary="Dark Mode" />
              <Switch 
                checked={mode === 'dark'}
                onChange={toggleTheme}
                color="primary"
              />
            </ListItem>

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
                <LogoutIcon sx={{ filter: 'none !important' }} />
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