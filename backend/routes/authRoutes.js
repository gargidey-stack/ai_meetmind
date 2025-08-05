import express from 'express';
import { supabase, supabaseAdmin } from '../../config/supabaseConfig.js';
import { asyncHandler } from '../utils/errorHandler.js';
import { protect, optionalAuth } from '../utils/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, name, role = 'team_member' } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      error: { message: 'Please provide email, password, and name' }
    });
  }

  // Create user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    logger.error('Supabase auth error:', authError);
    return res.status(400).json({
      success: false,
      error: { message: authError.message }
    });
  }

  if (!authData.user) {
    return res.status(400).json({
      success: false,
      error: { message: 'Failed to create user' }
    });
  }

  // Create user profile in database
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .insert([
      {
        id: authData.user.id,
        email,
        name,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ])
    .select()
    .single();

  if (userError) {
    logger.error('User profile creation error:', userError);
    // Clean up auth user if profile creation fails
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to create user profile' }
    });
  }

  logger.info(`New user registered: ${email}`);

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
      },
      message: 'User registered successfully. Please check your email for verification.'
    }
  });
}));

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: { message: 'Please provide email and password' }
    });
  }

  // Sign in with Supabase
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    logger.error('Login error:', authError);
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid credentials' }
    });
  }

  // Get user profile
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (userError || !userData) {
    logger.error('User profile fetch error:', userError);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch user profile' }
    });
  }

  logger.info(`User logged in: ${email}`);

  res.json({
    success: true,
    data: {
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
      },
      session: authData.session,
      access_token: authData.session.access_token,
    }
  });
}));

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, asyncHandler(async (req, res) => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    logger.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to logout' }
    });
  }

  res.json({
    success: true,
    data: { message: 'Logged out successfully' }
  });
}));

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user
    }
  });
}));

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, asyncHandler(async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  if (!name) {
    return res.status(400).json({
      success: false,
      error: { message: 'Please provide name' }
    });
  }

  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .update({
      name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (userError) {
    logger.error('Profile update error:', userError);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to update profile' }
    });
  }

  logger.info(`Profile updated for user: ${userId}`);

  res.json({
    success: true,
    data: {
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
      }
    }
  });
}));

// @desc    Refresh session
// @route   POST /api/auth/refresh
// @access  Public
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({
      success: false,
      error: { message: 'Refresh token required' }
    });
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token
  });

  if (error) {
    logger.error('Token refresh error:', error);
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid refresh token' }
    });
  }

  res.json({
    success: true,
    data: {
      session: data.session,
      access_token: data.session.access_token,
    }
  });
}));

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: { message: 'Please provide email' }
    });
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
  });

  if (error) {
    logger.error('Password reset error:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to send reset email' }
    });
  }

  res.json({
    success: true,
    data: { message: 'Password reset email sent' }
  });
}));

export default router;
