const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
  try {
    console.log('Request body:', req.body); // Debug log
    
    const { email, password, role, name } = req.body;
    
    // Validate input
    if (!email || !password || !role || !name) {
      return res.status(400).json({ 
        message: 'All fields are required',
        received: { email: !!email, password: !!password, role: !!role, name: !!name }
      });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      role,
      name
    });
    
    const savedUser = await user.save();
    console.log('User created:', savedUser.email);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: savedUser._id,
        email: savedUser.email,
        role: savedUser.role,
        name: savedUser.name
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ 
      message: 'Server error during registration',
      error: error.message 
    });
  }
};

const login = async (req, res) => {
  try {
    console.log('Login request body:', req.body); // Debug log
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login',
      error: error.message 
    });
  }
};

module.exports = { register, login };
