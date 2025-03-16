import React, { useState } from 'react';
import { Box, Container } from '@mui/material';
import MainLayout from '../Layout/MainLayout';
import Login from './Login';
import Register from './Register';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <MainLayout>
      <Container maxWidth="sm">
        <Box sx={{ mt: 4 }}>
          {isLogin ? (
            <Login onSwitchToRegister={() => setIsLogin(false)} />
          ) : (
            <Register onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </Box>
      </Container>
    </MainLayout>
  );
};

export default Auth; 