const prisma = require('../utils/prisma');

const getAll = async (req, res) => {
  const { search, buyerId, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    isActive: true,
    createdBy: req.user.role === 'ADMIN' ? undefined : req.user.id,
    ...(search && {
      OR: [
        { styleNo: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(buyerId && { buyerId }),
  };

  const [total, styles] = await Promise.all([
    prisma.style.count({ where }),
    prisma.style.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { id: true, name: true } },
        factory: { select: { id: true, name: true } },
        _count: { select: { costings: true } },
      },
    }),
  ]);

  res.json({ success: true, data: styles, total, page: Number(page), limit: Number(limit) });
};

const getOne = async (req, res) => {
  const style = await prisma.style.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      buyer: { select: { id: true, name: true } },
      factory: { select: { id: true, name: true } },
      costings: {
        orderBy: { version: 'desc' },
        select: { id: true, version: true, versionLabel: true, status: true, costingDate: true, updatedAt: true },
      },
    },
  });
  res.json({ success: true, data: style });
};

const create = async (req, res) => {
  const { styleNo, description, buyerId, factoryId, department, category, season, packOf, sizes } = req.body;

  const style = await prisma.style.create({
    data: {
      styleNo,
      description,
      buyerId: buyerId || null,
      factoryId: factoryId || null,
      department,
      category,
      season,
      packOf: packOf || 1,
      sizes: sizes || [],
      createdBy: req.user.id,
    },
    include: {
      buyer: { select: { id: true, name: true } },
      factory: { select: { id: true, name: true } },
    },
  });

  res.status(201).json({ success: true, data: style });
};

const update = async (req, res) => {
  const { styleNo, description, buyerId, factoryId, department, category, season, packOf, sizes } = req.body;

  const style = await prisma.style.update({
    where: { id: req.params.id },
    data: { styleNo, description, buyerId, factoryId, department, category, season, packOf, sizes },
    include: {
      buyer: { select: { id: true, name: true } },
      factory: { select: { id: true, name: true } },
    },
  });

  res.json({ success: true, data: style });
};

const remove = async (req, res) => {
  await prisma.style.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true, message: 'Style removed' });
};

module.exports = { getAll, getOne, create, update, remove };
