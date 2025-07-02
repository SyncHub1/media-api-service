import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  try {
    console.log(`🔍 Auth middleware called for: ${req.method} ${req.path}`);
    
    // Skip authentication for health check endpoint
    if (req.path === '/health') {
      console.log('✅ Skipping auth for health check');
      return next();
    }

    // Check if JWT secret is configured
    if (!process.env.ACCESS_TOKEN_SECRET) {
      console.error('❌ ACCESS_TOKEN_SECRET is not configured in environment variables');
      return res.status(500).json({
        success: false,
        error: {
          message: 'Authentication service not properly configured',
          code: 'CONFIG_ERROR'
        }
      });
    }

    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    console.log('🔑 Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid authorization header');
      return res.status(401).json({
        success: false,
        error: {
          message: 'No token provided',
          code: 'UNAUTHORIZED'
        }
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔑 Token length:', token.length);

    // Verify token using the same secret as the main auth service
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log('✅ Token verified successfully');
    
    // Attach user info to request (matching the structure from existing auth)
    req.user = {
      _id: decoded._id,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role
    };

    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token',
          code: 'UNAUTHORIZED'
        }
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        }
      });
    }
    
    return res.status(500).json({
      success: false,
      error: {
        message: 'Authentication error',
        code: 'AUTH_ERROR'
      }
    });
  }
};

export default authMiddleware; 