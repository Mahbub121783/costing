const prisma = require('../utils/prisma');

const getStats = async (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'ADMIN';

  const whereUser = isAdmin ? {} : { createdBy: userId };

  const [totalStyles, totalCostings, approved, draft, submitted, recentStyles, recentCostings] =
    await Promise.all([
      prisma.style.count({ where: { isActive: true, ...whereUser } }),
      prisma.costing.count({ where: whereUser }),
      prisma.costing.count({ where: { status: 'APPROVED', ...whereUser } }),
      prisma.costing.count({ where: { status: 'DRAFT', ...whereUser } }),
      prisma.costing.count({ where: { status: 'SUBMITTED', ...whereUser } }),
      prisma.style.findMany({
        where: { isActive: true, ...whereUser },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          buyer: { select: { id: true, name: true } },
          factory: { select: { id: true, name: true } },
          _count: { select: { costings: true } },
        },
      }),
      prisma.costing.findMany({
        where: whereUser,
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
          style: { select: { id: true, styleNo: true, description: true } },
          creator: { select: { name: true } },
        },
      }),
    ]);

  res.json({
    success: true,
    data: {
      stats: { totalStyles, totalCostings, approved, draft, submitted },
      recentStyles,
      recentCostings,
    },
  });
};

module.exports = { getStats };
