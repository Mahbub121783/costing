const prisma = require('../utils/prisma');
const { Prisma } = require('../../generated');

const dec = (v) => (v === '' || v == null ? undefined : new Prisma.Decimal(v));
const num = (v) => (v === '' || v == null ? undefined : Number(v));

async function getAll(req, res) {
  const { category, status, month, year } = req.query;
  const where = {};
  if (category) where.category = category;
  if (status) where.status = status;
  if (month) where.month = num(month);
  if (year) where.year = num(year);

  const expenses = await prisma.businessExpense.findMany({
    where,
    orderBy: { expenseDate: 'desc' },
    include: {
      creator: { select: { name: true } },
      approver: { select: { name: true } },
    },
  });
  res.json(expenses);
}

async function getOne(req, res) {
  const expense = await prisma.businessExpense.findUnique({
    where: { id: req.params.id },
    include: {
      creator: { select: { name: true } },
      approver: { select: { name: true } },
    },
  });
  if (!expense) return res.status(404).json({ message: 'Expense not found' });
  res.json(expense);
}

async function create(req, res) {
  const { expenseDate, category, description, amount, paymentMethod, receiptUrl, isRecurring, recurringDay, notes } = req.body;
  const date = new Date(expenseDate);
  const expense = await prisma.businessExpense.create({
    data: {
      expenseDate: date,
      category,
      description,
      amount: dec(amount),
      paymentMethod,
      receiptUrl,
      isRecurring: !!isRecurring,
      recurringDay: num(recurringDay),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      createdBy: req.user.id,
    },
  });
  res.status(201).json(expense);
}

async function update(req, res) {
  const { expenseDate, category, description, amount, paymentMethod, receiptUrl, isRecurring, recurringDay } = req.body;
  const expense = await prisma.businessExpense.findUnique({ where: { id: req.params.id } });
  if (!expense) return res.status(404).json({ message: 'Expense not found' });
  if (expense.status !== 'PENDING') return res.status(400).json({ message: 'Only PENDING expenses can be edited' });

  const date = expenseDate ? new Date(expenseDate) : undefined;
  const updated = await prisma.businessExpense.update({
    where: { id: req.params.id },
    data: {
      expenseDate: date,
      category,
      description,
      amount: dec(amount),
      paymentMethod,
      receiptUrl,
      isRecurring: isRecurring != null ? !!isRecurring : undefined,
      recurringDay: num(recurringDay),
      month: date ? date.getMonth() + 1 : undefined,
      year: date ? date.getFullYear() : undefined,
    },
  });
  res.json(updated);
}

async function approve(req, res) {
  const expense = await prisma.businessExpense.findUnique({ where: { id: req.params.id } });
  if (!expense) return res.status(404).json({ message: 'Expense not found' });

  const updated = await prisma.businessExpense.update({
    where: { id: req.params.id },
    data: { status: 'APPROVED', approvedBy: req.user.id, approvedAt: new Date() },
  });
  res.json(updated);
}

async function markPaid(req, res) {
  const expense = await prisma.businessExpense.findUnique({ where: { id: req.params.id } });
  if (!expense) return res.status(404).json({ message: 'Expense not found' });
  if (expense.status === 'PENDING') return res.status(400).json({ message: 'Approve expense before marking paid' });

  const updated = await prisma.businessExpense.update({
    where: { id: req.params.id },
    data: { status: 'PAID', paidAt: new Date() },
  });
  res.json(updated);
}

async function deleteExpense(req, res) {
  const expense = await prisma.businessExpense.findUnique({ where: { id: req.params.id } });
  if (!expense) return res.status(404).json({ message: 'Expense not found' });
  if (expense.status !== 'PENDING') return res.status(400).json({ message: 'Only PENDING expenses can be deleted' });

  await prisma.businessExpense.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
}

module.exports = { getAll, getOne, create, update, approve, markPaid, deleteExpense };
