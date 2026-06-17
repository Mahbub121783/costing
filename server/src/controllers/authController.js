const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');

const SAFE_SELECT = {
  id: true, name: true, email: true, role: true, status: true,
  company: true, phone: true, designation: true, createdAt: true,
};

const register = async (req, res) => {
  const { name, email, password, company, phone, designation } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409);
    throw new Error('Email already registered');
  }

  // First registered user bootstraps the system: ADMIN + ACTIVE (auto login).
  // Everyone else self-registers as MERCHANDISER + PENDING and must be approved
  // by an admin before they can log in.
  const userCount = await prisma.user.count();
  const isFirstUser = userCount === 0;
  const role = isFirstUser ? 'ADMIN' : 'MERCHANDISER';
  const status = isFirstUser ? 'ACTIVE' : 'PENDING';

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      status,
      isActive: isFirstUser,
      company: company || null,
      phone: phone || null,
      designation: designation || null,
    },
    select: SAFE_SELECT,
  });

  // Pending users get no tokens — they cannot access the app until approved.
  if (!isFirstUser) {
    return res.status(201).json({
      success: true,
      pending: true,
      message: 'Registration submitted. An admin will review and approve your account before you can log in.',
    });
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

  res.status(201).json({ success: true, user, accessToken, refreshToken });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  // Gate on approval status — give a clear, actionable message per state.
  if (user.status === 'PENDING') {
    res.status(403);
    throw new Error('Your account is awaiting admin approval.');
  }
  if (user.status === 'REJECTED') {
    res.status(403);
    throw new Error('Your registration was not approved. Please contact an administrator.');
  }
  if (user.status === 'SUSPENDED' || !user.isActive) {
    res.status(403);
    throw new Error('Your account is inactive. Please contact an administrator.');
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
