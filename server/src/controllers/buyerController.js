const prisma = require('../utils/prisma');

const getAll = async (req, res) => {
  const buyers = await prisma.buyer.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, country: true, contactName: true, email: true },
  });
  res.json({ success: true, data: buyers });
};

const create = async (req, res) => {
  const { name, country, contactName, email } = req.body;
  const buyer = await prisma.buyer.create({
    data: { name, country, contactName, email, createdBy: req.user.id },
  });
  res.status(201).json({ success: true, data: buyer });
};

const update = async (req, res) => {
  const { id } = req.params;
  const { name, country, contactName, email } = req.body;
  const buyer = await prisma.buyer.update({
    where: { id },
    data: { name, country, contactName, email },
  });
  res.json({ success: true, data: buyer });
};

const remove = async (req, res) => {
  const { id } = req.params;
  await prisma.buyer.update({ where: { id }, data: { isActive: false } });
  res.json({ success: true, message: 'Buyer deactivated' });
};

module.exports = { getAll, create, update, remove };
