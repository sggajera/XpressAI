import React from 'react';
import { Box } from '@mui/material';
import AppHeader from './AppHeader';

const MainLayout = ({ children, actionButton, rateLimitInfo }) => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppHeader 
        actionButton={actionButton} 
        rateLimitInfo={rateLimitInfo} 
      />
      {children}
    </Box>
  );
};

export default MainLayout; 