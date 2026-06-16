const prisma = require('../../generated');
const { Prisma } = require('../../generated');

const dec = (v) => (v === '' || v == null ? undefined : new Prisma.Decimal(v));
const num = (v) => (v === '' || v == null ? undefined : Number(v));

async function nextEmployeeCode(tx) {
  const year = new Date().getFullYear();
  await tx.$executeRaw`
    INSERT INTO employee_id_seq (year, last_no) VALUES (${year}, 1)
    ON CONFLICT (year) DO UPDATE SET last_no = employee_id_seq.last_no + 1
  `;
  const rows = await tx.$queryRaw`SELECT last_no FROM employee_id_seq WHERE year = ${year}`;
  return `EMP-${year}-${String(rows[0].last_no).padStart(3, '0')}`;
}

async function getAll(req, res) {
  const { status, department, q } = req.query;
  const where = {};
  if (status) where.status = status;
  if (department) where.department = { contains: department, mode: 'insensitive' };
  if (q) where.OR = [
    { name: { contains: q, mode: 'insensitive' } },
    { employeeCode: { contains: q, mode: 'insensitive' } },
    { designation: { contains: q, mode: 'insensitive' } },
  ];

  const employees = await prisma.employee.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      salaryStructure: { where: { isActive: true }, take: 1 },
    },
  });
  res.json(employees);
}

async function getOne(req, res) {
  const emp = await prisma.employee.findUnique({
    where: { id: req.params.id },
    include: {
      salaryStructure: { orderBy: { effectiveFrom: 'desc' } },
      historyLogs: { orderBy: { changedAt: 'desc' }, include: { changedByUser: { select: { name: true } } } },
    },
  });
  if (!emp) return res.status(404).json({ message: 'Employee not found' });
  res.json(emp);
}

async function create(req, res) {
  const { name, phone, email, nid, joiningDate, designation, department, address, emergencyContact, bankDetails } = req.body;
  const emp = await prisma.$transaction(async (tx) => {
    const code = await nextEmployeeCode(tx);
    return tx.employee.create({
      data: {
        employeeCode: code,
        name,
        phone,
        email,
        nid,
        joiningDate: new Date(joiningDate),
        designation,
        department,
        address,
        emergencyContact: emergencyContact || {},
        bankDetails: bankDetails || {},
        createdBy: req.user.id,
      },
    });
  });
  res.status(201).json(emp);
}

async function update(req, res) {
  const { name, phone, email, nid, joiningDate, designation, department, address, emergencyContact, bankDetails } = req.body;
  const old = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!old) return res.status(404).json({ message: 'Employee not found' });

  const changes = [];
  if (designation && designation !== old.designation) changes.push({ changeType: 'DESIGNATION', oldValue: old.designation, newValue: designation });
  if (department && department !== old.department) changes.push({ changeType: 'DEPARTMENT', oldValue: old.department, newValue: department });

  const emp = await prisma.employee.update({
    where: { id: req.params.id },
    data: {
      name, phone, email, nid,
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
      designation, department, address,
      emergencyContact: emergencyContact || undefined,
      bankDetails: bankDetails || undefined,
    },
  });

  if (changes.length) {
    await prisma.employeeHistory.createMany({
      data: changes.map((c) => ({ ...c, employeeId: req.params.id, changedBy: req.user.id, notes: req.body.notes })),
    });
  }

  res.json(emp);
}

async function updateStatus(req, res) {
  const { status, notes } = req.body;
  const old = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!old) return res.status(404).json({ message: 'Employee not found' });

  const emp = await prisma.employee.update({ where: { id: req.params.id }, data: { status } });
  await prisma.employeeHistory.create({
    data: { employeeId: req.params.id, changedBy: req.user.id, changeType: 'STATUS', oldValue: old.status, newValue: status, notes },
  });
  res.json(emp);
}

async function addSalaryStructure(req, res) {
  const { effectiveFrom, basicSalary, houseRent, medicalAllowance, transportAllowance, mobileBill, taxDeduction, otherDeductions } = req.body;
  const basic = dec(basicSalary) || new Prisma.Decimal(0);
  const house = dec(houseRent) || new Prisma.Decimal(0);
  const medical = dec(medicalAllowance) || new Prisma.Decimal(0);
  const transport = dec(transportAllowance) || new Prisma.Decimal(0);
  const mobile = dec(mobileBill) || new Prisma.Decimal(0);
  const gross = basic.add(house).add(medical).add(transport).add(mobile);

  await prisma.employeeSalaryStructure.updateMany({
    where: { employeeId: req.params.id, isActive: true },
    data: { isActive: false },
  });

  const struct = await prisma.employeeSalaryStructure.create({
    data: {
      employeeId: req.params.id,
      effectiveFrom: new Date(effectiveFrom),
      basicSalary: basic,
      houseRent: house,
      medicalAllowance: medical,
      transportAllowance: transport,
      mobileBill: mobile,
      grossSalary: gross,
      taxDeduction: dec(taxDeduction) || new Prisma.Decimal(0),
      otherDeductions: dec(otherDeductions) || new Prisma.Decimal(0),
      createdBy: req.user.id,
    },
  });

  await prisma.employeeHistory.create({
    data: {
      employeeId: req.params.id,
      changedBy: req.user.id,
      changeType: 'SALARY_UPDATE',
      newValue: `Gross: ${gross}`,
    },
  });

  res.status(201).json(struct);
}

async function getHistory(req, res) {
  const logs = await prisma.employeeHistory.findMany({
    where: { employeeId: req.params.id },
    orderBy: { changedAt: 'desc' },
    include: { changedByUser: { select: { name: true, email: true } } },
  });
  res.json(logs);
}

async function addExpense(req, res) {
  const { expenseDate, expenseType, bonusType, amount, description, month, year } = req.body;
  const expense = await prisma.employeeExpense.create({
    data: {
      employeeId: req.params.id,
      expenseDate: new Date(expenseDate),
      expenseType,
      bonusType: bonusType || null,
      amount: dec(amount),
      description,
      month: num(month),
      year: num(year),
      createdBy: req.user.id,
    },
  });
  res.status(201).json(expense);
}

async function getExpenses(req, res) {
  const { month, year } = req.query;
  const where = { employeeId: req.params.id };
  if (month) where.month = num(month);
  if (year) where.year = num(year);
  const expenses = await prisma.employeeExpense.findMany({ where, orderBy: { expenseDate: 'desc' } });
  res.json(expenses);
}

module.exports = { getAll, getOne, create, update, updateStatus, addSalaryStructure, getHistory, addExpense, getExpenses };
