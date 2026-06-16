const prisma = require('../../generated');
const { Prisma } = require('../../generated');

const dec = (v) => (v === '' || v == null ? undefined : new Prisma.Decimal(v));
const num = (v) => (v === '' || v == null ? undefined : Number(v));

async function getAll(req, res) {
  const payrolls = await prisma.monthlyPayroll.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: {
      creator: { select: { name: true } },
      processor: { select: { name: true } },
      _count: { select: { items: true } },
    },
  });
  res.json(payrolls);
}

async function getOne(req, res) {
  const payroll = await prisma.monthlyPayroll.findUnique({
    where: { id: req.params.id },
    include: {
      items: {
        include: { employee: { select: { employeeCode: true, name: true, designation: true, department: true } } },
        orderBy: { employee: { name: 'asc' } },
      },
      creator: { select: { name: true } },
      processor: { select: { name: true } },
    },
  });
  if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
  res.json(payroll);
}

async function generate(req, res) {
  const { month, year, notes } = req.body;
  const m = num(month);
  const y = num(year);

  const existing = await prisma.monthlyPayroll.findUnique({ where: { month_year: { month: m, year: y } } });
  if (existing) return res.status(409).json({ message: `Payroll for ${m}/${y} already exists` });

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    include: { salaryStructure: { where: { isActive: true }, take: 1 } },
  });

  const payroll = await prisma.$transaction(async (tx) => {
    const pr = await tx.monthlyPayroll.create({
      data: { month: m, year: y, notes, createdBy: req.user.id },
    });

    let totalGross = new Prisma.Decimal(0);
    let totalNet = new Prisma.Decimal(0);

    for (const emp of employees) {
      const sal = emp.salaryStructure[0];
      if (!sal) continue;

      const expenses = await tx.employeeExpense.findMany({
        where: { employeeId: emp.id, month: m, year: y },
      });

      let bonusAmount = new Prisma.Decimal(0);
      let bonusType = null;
      for (const ex of expenses) {
        if (ex.expenseType === 'BONUS') {
          bonusAmount = bonusAmount.add(ex.amount);
          bonusType = ex.bonusType;
        }
      }

      const totalDeductions = sal.taxDeduction.add(sal.otherDeductions);
      const netPay = sal.grossSalary.add(bonusAmount).sub(totalDeductions);

      const item = await tx.payrollItem.create({
        data: {
          payrollId: pr.id,
          employeeId: emp.id,
          basicSalary: sal.basicSalary,
          houseRent: sal.houseRent,
          medicalAllowance: sal.medicalAllowance,
          transportAllowance: sal.transportAllowance,
          mobileBill: sal.mobileBill,
          grossSalary: sal.grossSalary,
          bonusAmount,
          bonusType,
          taxDeduction: sal.taxDeduction,
          otherDeductions: sal.otherDeductions,
          totalDeductions,
          netPay,
        },
      });

      await tx.employeeExpense.updateMany({
        where: { employeeId: emp.id, month: m, year: y, payrollItemId: null },
        data: { payrollItemId: item.id },
      });

      totalGross = totalGross.add(sal.grossSalary);
      totalNet = totalNet.add(netPay);
    }

    return tx.monthlyPayroll.update({
      where: { id: pr.id },
      data: { totalGross, totalNet },
    });
  });

  const full = await prisma.monthlyPayroll.findUnique({
    where: { id: payroll.id },
    include: { items: { include: { employee: { select: { employeeCode: true, name: true, designation: true, department: true } } } } },
  });
  res.status(201).json(full);
}

async function updateItem(req, res) {
  const { bonusAmount, bonusType, overtimeAmount, advanceDeduction, taxDeduction, otherDeductions, notes } = req.body;

  const item = await prisma.payrollItem.findFirst({
    where: { id: req.params.itemId, payrollId: req.params.id },
  });
  if (!item) return res.status(404).json({ message: 'Payroll item not found' });

  const bonus = dec(bonusAmount) ?? item.bonusAmount;
  const overtime = dec(overtimeAmount) ?? item.overtimeAmount;
  const advance = dec(advanceDeduction) ?? item.advanceDeduction;
  const tax = dec(taxDeduction) ?? item.taxDeduction;
  const other = dec(otherDeductions) ?? item.otherDeductions;
  const totalDeductions = advance.add(tax).add(other);
  const netPay = item.grossSalary.add(bonus).add(overtime).sub(totalDeductions);

  const updated = await prisma.payrollItem.update({
    where: { id: req.params.itemId },
    data: {
      bonusAmount: bonus,
      bonusType: bonusType || item.bonusType,
      overtimeAmount: overtime,
      advanceDeduction: advance,
      taxDeduction: tax,
      otherDeductions: other,
      totalDeductions,
      netPay,
      notes,
    },
  });

  await recalcTotals(req.params.id);
  res.json(updated);
}

async function markItemPaid(req, res) {
  const item = await prisma.payrollItem.findFirst({
    where: { id: req.params.itemId, payrollId: req.params.id },
  });
  if (!item) return res.status(404).json({ message: 'Payroll item not found' });
  const updated = await prisma.payrollItem.update({
    where: { id: req.params.itemId },
    data: { isPaid: !item.isPaid, paidAt: !item.isPaid ? new Date() : null },
  });
  res.json(updated);
}

async function markAllPaid(req, res) {
  const payroll = await prisma.monthlyPayroll.findUnique({ where: { id: req.params.id } });
  if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
  if (payroll.status === 'DRAFT') return res.status(400).json({ message: 'Finalize payroll before marking paid' });

  await prisma.payrollItem.updateMany({
    where: { payrollId: req.params.id, isPaid: false },
    data: { isPaid: true, paidAt: new Date() },
  });

  const updated = await prisma.monthlyPayroll.update({
    where: { id: req.params.id },
    data: { status: 'PAID', paidAt: new Date() },
  });
  res.json(updated);
}

async function finalizePayroll(req, res) {
  const payroll = await prisma.monthlyPayroll.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { items: true } } },
  });
  if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
  if (payroll.status !== 'DRAFT') return res.status(400).json({ message: 'Only DRAFT payrolls can be finalized' });

  const updated = await prisma.monthlyPayroll.update({
    where: { id: req.params.id },
    data: { status: 'FINALIZED', processedBy: req.user.id, processedAt: new Date() },
  });
  res.json(updated);
}

async function deletePayroll(req, res) {
  const payroll = await prisma.monthlyPayroll.findUnique({ where: { id: req.params.id } });
  if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
  if (payroll.status !== 'DRAFT') return res.status(400).json({ message: 'Only DRAFT payrolls can be deleted' });

  await prisma.monthlyPayroll.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
}

async function recalcTotals(payrollId) {
  const agg = await prisma.payrollItem.aggregate({
    where: { payrollId },
    _sum: { grossSalary: true, netPay: true, advanceDeduction: true },
  });
  await prisma.monthlyPayroll.update({
    where: { id: payrollId },
    data: {
      totalGross: agg._sum.grossSalary || 0,
      totalNet: agg._sum.netPay || 0,
      totalAdvance: agg._sum.advanceDeduction || 0,
    },
  });
}

module.exports = { getAll, getOne, generate, updateItem, markItemPaid, markAllPaid, finalizePayroll, deletePayroll };
