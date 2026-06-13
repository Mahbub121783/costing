const prisma = require('../utils/prisma');

const logAudit = async (costingId, userId, action, oldValue, newValue) => {
  await prisma.costingAuditLog.create({
    data: { costingId, changedBy: userId, action, fieldName: 'status', oldValue, newValue },
  }).catch(() => {});
};

const submitCosting = async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const costing = await prisma.costing.findUniqueOrThrow({ where: { id } });
  if (costing.status !== 'DRAFT') {
    return res.status(400).json({ message: 'Only DRAFT costings can be submitted' });
  }
  const updated = await prisma.costing.update({
    where: { id },
    data: { status: 'SUBMITTED', notes: notes || costing.notes },
  });
  await logAudit(id, req.user.id, 'STATUS_CHANGE', 'DRAFT', 'SUBMITTED');
  res.json({ success: true, data: updated });
};

const approveCosting = async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  const costing = await prisma.costing.findUniqueOrThrow({ where: { id } });
  if (costing.status !== 'SUBMITTED') {
    return res.status(400).json({ message: 'Only SUBMITTED costings can be approved' });
  }
  const updated = await prisma.costing.update({
    where: { id },
    data: { status: 'APPROVED', isLocked: true },
  });
  await logAudit(id, req.user.id, 'APPROVED', 'SUBMITTED', comment || 'APPROVED');
  res.json({ success: true, data: updated });
};

const rejectCosting = async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  const costing = await prisma.costing.findUniqueOrThrow({ where: { id } });
  if (costing.status !== 'SUBMITTED') {
    return res.status(400).json({ message: 'Only SUBMITTED costings can be rejected' });
  }
  const updated = await prisma.costing.update({
    where: { id },
    data: { status: 'REJECTED' },
  });
  await logAudit(id, req.user.id, 'REJECTED', 'SUBMITTED', comment || 'REJECTED');
  res.json({ success: true, data: updated });
};

const revertToDraft = async (req, res) => {
  const { id } = req.params;
  const costing = await prisma.costing.findUniqueOrThrow({ where: { id } });
  if (costing.status === 'APPROVED') {
    return res.status(400).json({ message: 'Approved costings cannot be reverted' });
  }
  const updated = await prisma.costing.update({
    where: { id },
    data: { status: 'DRAFT', isLocked: false },
  });
  await logAudit(id, req.user.id, 'REVERTED', costing.status, 'DRAFT');
  res.json({ success: true, data: updated });
};

module.exports = { submitCosting, approveCosting, rejectCosting, revertToDraft };
