import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import getTheme from './theme';
import Auth from './components/Auth/Auth';
import Dashboard from './components/Dashboard/Dashboard';
import Profile from './components/Profile/Profile';
import IdeasPage from './pages/IdeasPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import './App.css';

const ThemedApp = () => {
  const { mode } = useTheme();
  const theme = getTheme(mode);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        } />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/ideas"
          element={
            <PrivateRoute>
              <IdeasPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </MuiThemeProvider>
  );
};

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Redirect to /login but save the attempted URL
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  // If user is authenticated and tries to access login page,
  // redirect them to where they came from or dashboard
  if (user) {
    const from = location.state?.from || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <div className="App">
            <ThemedApp />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
