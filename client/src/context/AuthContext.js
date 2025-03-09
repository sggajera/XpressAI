import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const getStoredToken = () => {
    const token = localStorage.getItem('token');
    console.log('Getting stored token:', token); // Debug log
    return token;
  };

  const setStoredToken = (token) => {
    if (token) {
      console.log('Setting token in storage:', token); // Debug log
      localStorage.setItem('token', token);
    } else {
      console.log('Removing token from storage'); // Debug log
      localStorage.removeItem('token');
    }
  };

  // Check authentication status
  const checkAuth = async () => {
    try {
      const token = getStoredToken();
      if (!token) {
        throw new Error('No token');
      }

      // Try to get user profile to verify token is valid
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error);
      }

      setUser(data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      setStoredToken(null);
      localStorage.removeItem('user');
      setUser(null);
      
      // Only redirect to login if not already there
      if (!location.pathname.includes('/login')) {
        navigate('/login', { 
          replace: true,
          state: { from: location.pathname }
        });
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, [location.pathname]);

  const login = async (userData, token) => {
    if (!token) {
      throw new Error('No token provided');
    }
    console.log('Logging in with token:', token); // Debug log
    setStoredToken(token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    
    // Redirect to the page they tried to visit or dashboard
    const from = location.state?.from || '/dashboard';
    navigate(from, { replace: true });
  };

  const logout = () => {
    setStoredToken(null);
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, checkAuth, getStoredToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 