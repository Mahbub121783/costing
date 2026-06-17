const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  const token = authHeader.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error('Not authorized, token expired or invalid');
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, name: true, email: true, role: true, status: true, isActive: true, company: true, phone: true, designation: true },
  });

  if (!user || !user.isActive || user.status !== 'ACTIVE') {
    res.status(401);
    throw new Error('Not authorized, user inactive or not found');
  }

  req.user = user;
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    res.status(403);
    throw new Error('Access denied: insufficient permissions');
  }
  next();
};

module.exports = { protect, requireRole };
