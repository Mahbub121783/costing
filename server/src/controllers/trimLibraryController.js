const prisma = require('../utils/prisma');

// Coerce '' / null / NaN to null — Prisma Decimal columns reject empty strings.
const dec = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

const cleanTrim = (b) => ({
  name: b.name,
  category: b.category || null,
  unit: b.unit || null,
  unitPrice: dec(b.unitPrice),
  supplier: b.supplier || null,
});

const getAll = async (req, res) => {
  const { search, category } = req.query;
  const items = await prisma.trimLibrary.findMany({
    where: {
      isActive: true,
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(category && { category }),
    },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  res.json({ success: true, data: items });
};

const create = async (req, res) => {
  const item = await prisma.trimLibrary.create({
    data: { ...cleanTrim(req.body), createdBy: req.user.id },
  });
  res.status(201).json({ success: true, data: item });
};

const update = async (req, res) => {
  const item = await prisma.trimLibrary.update({
    where: { id: req.params.id },
    data: cleanTrim(req.body),
  });
  res.json({ success: true, data: item });
};

const remove = async (req, res) => {
  await prisma.trimLibrary.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ success: true, message: 'Trim removed from library' });
};

module.exports = { getAll, create, update, remove };
