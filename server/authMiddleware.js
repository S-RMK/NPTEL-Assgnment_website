const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nptel_pwa_super_secret_jwt_key_2026';

const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role || 'STUDENT'
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. Token missing.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        } catch (err) {
            // Ignore token error for optional auth
        }
    }
    next();
};

const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: `Permission denied. Requires one of: ${allowedRoles.join(', ')}` });
        }
        next();
    };
};

module.exports = {
    JWT_SECRET,
    generateToken,
    verifyToken,
    optionalAuth,
    requireRole
};
