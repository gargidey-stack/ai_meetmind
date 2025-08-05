import logger from './logger.js';

// Custom error class
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Not found middleware
export const notFound = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

// Global error handler
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(`Error ${err.statusCode || 500}: ${err.message}`);
  
  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401);
  }

  // Supabase errors
  if (err.message && err.message.includes('JWT')) {
    const message = 'Authentication failed';
    error = new AppError(message, 401);
  }

  // OpenAI API errors
  if (err.response && err.response.status) {
    if (err.response.status === 429) {
      const message = 'OpenAI API rate limit exceeded. Please try again later.';
      error = new AppError(message, 429);
    } else if (err.response.status === 401) {
      const message = 'OpenAI API authentication failed';
      error = new AppError(message, 500);
    }
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = new AppError(message, 400);
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

// Async error handler wrapper
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validation error helper
export const validationError = (message) => {
  return new AppError(message, 400);
};

// Authorization error helper
export const authError = (message = 'Not authorized') => {
  return new AppError(message, 401);
};

// Forbidden error helper
export const forbiddenError = (message = 'Forbidden') => {
  return new AppError(message, 403);
};

// Not found error helper
export const notFoundError = (message = 'Resource not found') => {
  return new AppError(message, 404);
};

export default {
  AppError,
  notFound,
  errorHandler,
  asyncHandler,
  validationError,
  authError,
  forbiddenError,
  notFoundError,
};
