const prisma = require('../utils/prisma');

async function getDashboardStats(req, res) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const [
    receivables,
    monthlyExpenses,
    monthlyPayroll,
    revenueReceived,
    topBuyers,
    expenseByCategory,
    recentOrders,
    recentExpenses,
    employeeCount,
  ] = await Promise.all([
    prisma.orderFinance.aggregate({
      where: { paymentStatus: { in: ['PENDING', 'PARTIAL'] } },
      _sum: { balanceAmount: true },
    }),
    prisma.businessExpense.aggregate({
      where: { status: { in: ['APPROVED', 'PAID'] }, month, year },
      _sum: { amount: true },
    }),
    prisma.payrollItem.aggregate({
      where: { isPaid: true, paidAt: { gte: monthStart, lte: monthEnd } },
      _sum: { netPay: true },
    }),
    prisma.orderPayment.aggregate({
      where: { paymentDate: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.orderFinance.groupBy({
      by: ['buyerId'],
      _sum: { totalGoodsValue: true },
      orderBy: { _sum: { totalGoodsValue: 'desc' } },
      take: 5,
    }),
    prisma.businessExpense.groupBy({
      by: ['category'],
      where: { month, year },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),
    prisma.orderFinance.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, orderNo: true, totalGoodsValue: true, paymentStatus: true, createdAt: true,
        buyer: { select: { name: true } },
      },
    }),
    prisma.businessExpense.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, description: true, amount: true, category: true, status: true, expenseDate: true },
    }),
    prisma.employee.count({ where: { status: 'ACTIVE' } }),
  ]);

  // Resolve buyer names for top buyers
  const buyerIds = topBuyers.map((b) => b.buyerId);
  const buyers = await prisma.buyer.findMany({ where: { id: { in: buyerIds } }, select: { id: true, name: true } });
  const buyerMap = Object.fromEntries(buyers.map((b) => [b.id, b.name]));

  const revenue = Number(revenueReceived._sum.amount || 0);
  const expenses = Number(monthlyExpenses._sum.amount || 0);
  const payroll = Number(monthlyPayroll._sum.netPay || 0);

  res.json({
    totalReceivables: Number(receivables._sum.balanceAmount || 0),
    monthlyRevenue: revenue,
    monthlyExpenses: expenses,
    monthlyPayroll: payroll,
    netProfit: revenue - expenses - payroll,
    activeEmployees: employeeCount,
    topBuyers: topBuyers.map((b) => ({
      buyerId: b.buyerId,
      buyerName: buyerMap[b.buyerId] || 'Unknown',
      totalValue: Number(b._sum.totalGoodsValue || 0),
    })),
    expenseByCategory: expenseByCategory.map((e) => ({
      category: e.category,
      total: Number(e._sum.amount || 0),
    })),
    recentOrders,
    recentExpenses,
  });
}

module.exports = { getDashboardStats };
