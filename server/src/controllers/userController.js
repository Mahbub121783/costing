const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');

const USER_SELECT = {
  id: true, name: true, email: true, role: true, status: true, isActive: true,
  company: true, phone: true, designation: true, createdAt: true,
};

const listUsers = async (req, res) => {
  const { status } = req.query;
  const where = {};
  if (status) where.status = status;

  const users = await prisma.user.findMany({
    where,
    select: {
      ...USER_SELECT,
      _count: { select: { styles: true, costings: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: users });
};

const getUser = async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.params.id },
    select: {
      ...USER_SELECT,
      _count: { select: { styles: true, costings: true } },
    },
  });
  res.json({ success: true, data: user });
};

const updateUser = async (req, res) => {
  const { role, isActive, name, company, phone, designation } = req.body;

  // Prevent admin from deactivating themselves
  if (req.params.id === req.user.id && isActive === false) {
    res.status(400);
    throw new Error('You cannot deactivate your own account');
  }

  const data = {};
  if (role !== undefined) data.role = role;
  if (isActive !== undefined) data.isActive = isActive;
  if (name !== undefined) data.name = name.trim();
  if (company !== undefined) data.company = company?.trim() || null;
  if (phone !== undefined) data.phone = phone?.trim() || null;
  if (designation !== undefined) data.designation = designation?.trim() || null;

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: USER_SELECT,
  });
  res.json({ success: true, data: user });
};

// Approve a PENDING registration: activate the account and optionally set a role.
const approveUser = async (req, res) => {
  const { role } = req.body;
  const data = { status: 'ACTIVE', isActive: true };
  if (role) data.role = role;

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: USER_SELECT,
  });
  res.json({ success: true, data: user });
};

// Reject a registration (or revoke access). Cannot reject yourself.
const rejectUser = async (req, res) => {
  if (req.params.id === req.user.id) {
    res.status(400);
    throw new Error('You cannot reject your own account');
  }
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: 'REJECTED', isActive: false },
    select: USER_SELECT,
  });
  // Kill any existing sessions for the rejected user.
  await prisma.refreshToken.deleteMany({ where: { userId: req.params.id } });
  res.json({ success: true, data: user });
};

const adminResetPassword = async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    res.status(400);
    throw new Error('Password must be at least 8 characters');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });

  // Invalidate all refresh tokens for that user
  await prisma.refreshToken.deleteMany({ where: { userId: req.params.id } });

  res.json({ success: true, message: 'Password reset successfully' });
};

module.exports = { listUsers, getUser, updateUser, approveUser, rejectUser, adminResetPassword };
