import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../../config/supabaseConfig.js';
import { asyncHandler, authError, forbiddenError } from './errorHandler.js';
import logger from './logger.js';

// Generate JWT token
export const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// Verify JWT token
export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Extract token from request
export const extractToken = (req) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  return token;
};

// Middleware to protect routes
export const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    throw authError('Access denied. No token provided.');
  }

  try {
    // Verify Supabase JWT token
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      throw authError('Invalid token');
    }

    // Get user details from database
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw authError('User not found');
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: userData.name,
      role: userData.role,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    throw authError('Invalid token');
  }
});

// Middleware to check user roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw authError('Access denied. Please authenticate.');
    }

    if (!roles.includes(req.user.role)) {
      throw forbiddenError(`Access denied. Required roles: ${roles.join(', ')}`);
    }

    next();
  };
};

// Check if user is super admin
export const isSuperAdmin = (req, res, next) => {
  return authorize('super_admin')(req, res, next);
};

// Check if user is admin (super_admin or project_admin)
export const isAdmin = (req, res, next) => {
  return authorize('super_admin', 'project_admin')(req, res, next);
};

// Check if user can access resource (admin or team member)
export const canAccess = (req, res, next) => {
  return authorize('super_admin', 'project_admin', 'team_member')(req, res, next);
};

// Middleware to optionally authenticate (for public endpoints that benefit from user context)
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);

  if (token) {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

      if (!error && user) {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userData) {
          req.user = {
            id: user.id,
            email: user.email,
            name: userData.name,
            role: userData.role,
          };
        }
      }
    } catch (error) {
      // Ignore authentication errors for optional auth
      logger.debug('Optional auth failed:', error.message);
    }
  }

  next();
});

// Helper to check if user owns resource or is admin
export const canModifyResource = (resourceUserId) => {
  return (req, res, next) => {
    if (!req.user) {
      throw authError('Access denied. Please authenticate.');
    }

    const isOwner = req.user.id === resourceUserId;
    const isAdmin = ['super_admin', 'project_admin'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      throw forbiddenError('Access denied. You can only modify your own resources.');
    }

    next();
  };
};

export default {
  generateToken,
  verifyToken,
  extractToken,
  protect,
  authorize,
  isSuperAdmin,
  isAdmin,
  canAccess,
  optionalAuth,
  canModifyResource,
};
