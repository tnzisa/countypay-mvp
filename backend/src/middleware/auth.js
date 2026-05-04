const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        code: 'UNAUTHORIZED',
        message: 'No token provided' 
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.userId || !decoded.organizationId) {
      return res.status(401).json({ 
        code: 'INVALID_TOKEN',
        message: 'Token missing required fields' 
      });
    }
    
    req.user = {
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      role: decoded.role || 'citizen',
      phone: decoded.phone
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired' 
      });
    }
    
    res.status(401).json({ 
      code: 'UNAUTHORIZED',
      message: 'Invalid token' 
    });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        code: 'UNAUTHORIZED',
        message: 'Authentication required' 
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        code: 'FORBIDDEN',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
      });
    }
    
    next();
  };
}

module.exports = { authMiddleware, requireRole };
