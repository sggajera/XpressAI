const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User, Context } = require('../models');

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email already registered' 
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name
    });

    await user.save();

    // Create context for the user
    const context = new Context({
      user: user._id,
      tone: 'professional',
      autoApprove: false,
      keywords: [],
      userGeneralContext: ''
    });

    await context.save();

    // Update user with context reference
    user.context = context._id;
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    // Send response without password
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      context: context,
      createdAt: user.createdAt
    };

    res.status(201).json({
      success: true,
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and populate context
    const user = await User.findOne({ email })
      .populate('context')
      .populate('trackedAccounts');
      
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    // Send response without password
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      context: user.context,
      trackedAccounts: user.trackedAccounts,
      createdAt: user.createdAt
    };

    res.json({
      success: true,
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router; 