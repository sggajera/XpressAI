const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'No authentication token found',
        code: 'AUTH_REQUIRED'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (!decoded.userId) {
        throw new Error('Invalid token structure');
      }

      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: 'User not found',
          code: 'AUTH_REQUIRED'
        });
      }

      // Attach the full user object to the request
      req.user = user;
      req.token = token;
      next();
    } catch (jwtError) {
      console.error('JWT Verification failed:', jwtError);
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token',
        code: 'AUTH_REQUIRED'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      success: false, 
      error: 'Please authenticate',
      code: 'AUTH_REQUIRED'
    });
  }
};

module.exports = auth; 