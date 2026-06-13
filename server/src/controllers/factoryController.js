const prisma = require('../utils/prisma');

const getAll = async (req, res) => {
  const factories = await prisma.factory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, country: true, address: true },
  });
  res.json({ success: true, data: factories });
};

const create = async (req, res) => {
  const { name, country, address } = req.body;
  const factory = await prisma.factory.create({
    data: { name, country, address, createdBy: req.user.id },
  });
  res.status(201).json({ success: true, data: factory });
};

const update = async (req, res) => {
  const { id } = req.params;
  const { name, country, address } = req.body;
  const factory = await prisma.factory.update({
    where: { id },
    data: { name, country, address },
  });
  res.json({ success: true, data: factory });
};

const remove = async (req, res) => {
  await prisma.factory.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true, message: 'Factory deactivated' });
};

module.exports = { getAll, create, update, remove };
