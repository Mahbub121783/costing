const prisma = require('../utils/prisma');
const { calcFabricPrice } = require('../services/costingCalculator');

// Coerce '' / null / NaN to null — Prisma Decimal columns reject empty strings.
const dec = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

// Pick only valid schema fields and coerce numeric inputs (forms send strings).
const cleanFabric = (b) => ({
  name: b.name,
  fabricationDetail: b.fabricationDetail || null,
  composition: b.composition || null,
  gsm: dec(b.gsm),
  supplier: b.supplier || null,
  yarnCount: b.yarnCount || null,
  yarnPricePerKg: dec(b.yarnPricePerKg),
  spandexPriceKg: dec(b.spandexPriceKg),
  spandexPercentage: dec(b.spandexPercentage),
  yarnDyeingCost: dec(b.yarnDyeingCost),
  knittingCost: dec(b.knittingCost),
  dyeingFinishing: dec(b.dyeingFinishing),
  aopFinishing: dec(b.aopFinishing),
  wastagePct: dec(b.wastagePct),
  isDirectPrice: b.isDirectPrice || false,
  directPricePerKg: dec(b.directPricePerKg),
});

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
  const item = await prisma.fabricLibrary.create({
    data: { ...cleanFabric(req.body), createdBy: req.user.id },
  });
  res.status(201).json({ success: true, data: item });
};

const update = async (req, res) => {
  const item = await prisma.fabricLibrary.update({
    where: { id: req.params.id },
    data: cleanFabric(req.body),
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
