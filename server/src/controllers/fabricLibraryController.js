const prisma = require('../utils/prisma');
const { calcFabricPrice } = require('../services/costingCalculator');

const getAll = async (req, res) => {
  const { search } = req.query;
  const items = await prisma.fabricLibrary.findMany({
    where: {
      isActive: true,
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: items });
};

const getOne = async (req, res) => {
  const item = await prisma.fabricLibrary.findUniqueOrThrow({ where: { id: req.params.id } });
  res.json({ success: true, data: item });
};

const create = async (req, res) => {
  const data = req.body;
  const item = await prisma.fabricLibrary.create({
    data: { ...data, createdBy: req.user.id },
  });
  res.status(201).json({ success: true, data: item });
};

const update = async (req, res) => {
  const item = await prisma.fabricLibrary.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json({ success: true, data: item });
};

const remove = async (req, res) => {
  await prisma.fabricLibrary.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ success: true, message: 'Fabric removed from library' });
};

// Preview calculated price without saving
const previewPrice = async (req, res) => {
  const price = calcFabricPrice(req.body);
  res.json({ success: true, data: { calculatedPrice: price } });
};

module.exports = { getAll, getOne, create, update, remove, previewPrice };
