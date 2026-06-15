const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const SAFE_SELECT = {
  id: true, name: true, email: true, role: true,
  company: true, phone: true, designation: true, createdAt: true,
};

const register = async (req, res) => {
  const { name, email, password, company, phone, designation } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409);
    throw new Error('Email already registered');
  }

  // First registered user automatically becomes ADMIN
  const userCount = await prisma.user.count();
  const role = userCount === 0 ? 'ADMIN' : 'MERCHANDISER';

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      company: company || null,
      phone: phone || null,
      designation: designation || null,
    },
    select: SAFE_SELECT,
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.status(201).json({ success: true, user, accessToken, refreshToken });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  const { passwordHash: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser, accessToken, refreshToken });
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(401);
    throw new Error('Refresh token required');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    res.status(401);
    throw new Error('Invalid or expired refresh token');
  }
  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

  if (!stored || stored.userId !== decoded.id || stored.expiresAt < new Date()) {
    res.status(401);
    throw new Error('Invalid or expired refresh token');
  }

  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  const newAccess = generateAccessToken(decoded.id);
  const newRefresh = generateRefreshToken(decoded.id);

  await prisma.refreshToken.create({
    data: {
      userId: decoded.id,
      token: newRefresh,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  res.json({ success: true, accessToken: newAccess, refreshToken: newRefresh });
};

const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
  res.json({ success: true, message: 'Logged out' });
};

const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

const updateProfile = async (req, res) => {
  const { name, company, phone, designation } = req.body;
  if (!name || name.trim().length < 2) {
    res.status(400);
    throw new Error('Name must be at least 2 characters');
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      name: name.trim(),
      company: company?.trim() || null,
      phone: phone?.trim() || null,
      designation: designation?.trim() || null,
    },
    select: SAFE_SELECT,
  });

  res.json({ success: true, user });
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Both current and new password are required');
  }
  if (newPassword.length < 8) {
    res.status(400);
    throw new Error('New password must be at least 8 characters');
  }

  const full = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id } });
  const match = await bcrypt.compare(currentPassword, full.passwordHash);
  if (!match) {
    res.status(400);
    throw new Error('Current password is incorrect');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } });

  // Invalidate all refresh tokens on password change
  await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } });

  res.json({ success: true, message: 'Password changed. Please log in again.' });
};

module.exports = { register, login, refresh, logout, getMe, updateProfile, changePassword };
