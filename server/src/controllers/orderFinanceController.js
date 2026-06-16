const prisma = require('../../generated');
const { Prisma } = require('../../generated');

const dec = (v) => (v === '' || v == null ? undefined : new Prisma.Decimal(v));
const num = (v) => (v === '' || v == null ? undefined : Number(v));

async function nextOrderNo(tx) {
  const year = new Date().getFullYear();
  await tx.$executeRaw`
    INSERT INTO order_finance_seq (year, last_no) VALUES (${year}, 1)
    ON CONFLICT (year) DO UPDATE SET last_no = order_finance_seq.last_no + 1
  `;
  const rows = await tx.$queryRaw`SELECT last_no FROM order_finance_seq WHERE year = ${year}`;
  return `ORD-${year}-${String(rows[0].last_no).padStart(3, '0')}`;
}

async function getAll(req, res) {
  const { status, buyerId } = req.query;
  const where = {};
  if (status) where.paymentStatus = status;
  if (buyerId) where.buyerId = buyerId;

  const orders = await prisma.orderFinance.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      buyer: { select: { name: true } },
      costing: { select: { id: true, style: { select: { styleNo: true, description: true } } } },
      _count: { select: { payments: true } },
    },
  });
  res.json(orders);
}

async function getOne(req, res) {
  const order = await prisma.orderFinance.findUnique({
    where: { id: req.params.id },
    include: {
      buyer: { select: { name: true, country: true, contactName: true } },
      costing: { include: { style: { select: { styleNo: true, description: true } } } },
      payments: { orderBy: { paymentDate: 'desc' }, include: { creator: { select: { name: true } } } },
      invoices: { select: { id: true, invoiceNo: true, status: true, grandTotal: true, invoiceDate: true } },
    },
  });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
}

async function create(req, res) {
  const { costingId, buyerId, agreedFobPerPc, totalQty, currency, paymentTerms, advancePct, shipmentDate, deliveryDate, notes } = req.body;

  const costing = await prisma.costing.findUnique({ where: { id: costingId } });
  if (!costing) return res.status(404).json({ message: 'Costing not found' });
  if (costing.status !== 'APPROVED') return res.status(400).json({ message: 'Only APPROVED costings can be converted to orders' });

  const fob = dec(agreedFobPerPc);
  const qty = num(totalQty);
  const totalGoodsValue = fob.mul(qty);
  const advPct = dec(advancePct) || new Prisma.Decimal(0);
  const advanceAmount = totalGoodsValue.mul(advPct);
  const balanceAmount = totalGoodsValue.sub(advanceAmount);

  const order = await prisma.$transaction(async (tx) => {
    const orderNo = await nextOrderNo(tx);
    return tx.orderFinance.create({
      data: {
        orderNo,
        costingId,
        buyerId,
        agreedFobPerPc: fob,
        totalQty: qty,
        totalGoodsValue,
        currency: currency || 'USD',
        paymentTerms,
        advancePct: advPct,
        advanceAmount,
        balanceAmount,
        shipmentDate: shipmentDate ? new Date(shipmentDate) : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        notes,
        createdBy: req.user.id,
      },
    });
  });

  res.status(201).json(order);
}

async function update(req, res) {
  const { agreedFobPerPc, totalQty, currency, paymentTerms, advancePct, shipmentDate, deliveryDate, notes } = req.body;
  const order = await prisma.orderFinance.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const fob = dec(agreedFobPerPc) ?? order.agreedFobPerPc;
  const qty = num(totalQty) ?? order.totalQty;
  const totalGoodsValue = fob.mul(qty);
  const advPct = dec(advancePct) ?? order.advancePct;
  const advanceAmount = totalGoodsValue.mul(advPct);
  const balanceAmount = totalGoodsValue.sub(order.totalPaid);

  const updated = await prisma.orderFinance.update({
    where: { id: req.params.id },
    data: {
      agreedFobPerPc: fob,
      totalQty: qty,
      totalGoodsValue,
      currency,
      paymentTerms,
      advancePct: advPct,
      advanceAmount,
      balanceAmount,
      shipmentDate: shipmentDate ? new Date(shipmentDate) : undefined,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      notes,
    },
  });
  res.json(updated);
}

async function addPayment(req, res) {
  const { paymentDate, amount, paymentMethod, bankReference, notes } = req.body;
  const order = await prisma.orderFinance.findUnique({ where: { id: req.params.id } });
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.orderPayment.create({
      data: {
        orderFinanceId: order.id,
        paymentDate: new Date(paymentDate),
        amount: dec(amount),
        paymentMethod,
        bankReference,
        notes,
        createdBy: req.user.id,
      },
    });

    const agg = await tx.orderPayment.aggregate({ where: { orderFinanceId: order.id }, _sum: { amount: true } });
    const totalPaid = agg._sum.amount || new Prisma.Decimal(0);
    const balanceAmount = order.totalGoodsValue.sub(totalPaid);
    let paymentStatus = 'PENDING';
    if (totalPaid.gte(order.totalGoodsValue)) paymentStatus = 'PAID';
    else if (totalPaid.gt(0)) paymentStatus = 'PARTIAL';

    await tx.orderFinance.update({
      where: { id: order.id },
      data: { totalPaid, balanceAmount, paymentStatus },
    });

    return p;
  });

  res.status(201).json(payment);
}

async function deletePayment(req, res) {
  const payment = await prisma.orderPayment.findFirst({
    where: { id: req.params.paymentId, orderFinanceId: req.params.id },
  });
  if (!payment) return res.status(404).json({ message: 'Payment not found' });

  const order = await prisma.orderFinance.findUnique({ where: { id: req.params.id } });

  await prisma.$transaction(async (tx) => {
    await tx.orderPayment.delete({ where: { id: req.params.paymentId } });
    const agg = await tx.orderPayment.aggregate({ where: { orderFinanceId: req.params.id }, _sum: { amount: true } });
    const totalPaid = agg._sum.amount || new Prisma.Decimal(0);
    const balanceAmount = order.totalGoodsValue.sub(totalPaid);
    let paymentStatus = 'PENDING';
    if (totalPaid.gte(order.totalGoodsValue)) paymentStatus = 'PAID';
    else if (totalPaid.gt(0)) paymentStatus = 'PARTIAL';

    await tx.orderFinance.update({
      where: { id: req.params.id },
      data: { totalPaid, balanceAmount, paymentStatus },
    });
  });

  res.json({ message: 'Payment deleted' });
}

async function getApprovedCostings(req, res) {
  const costings = await prisma.costing.findMany({
    where: { status: 'APPROVED' },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      version: true,
      versionLabel: true,
      style: { select: { styleNo: true, description: true, buyer: { select: { name: true } } } },
      shipment: { select: { totalQty: true, landedCostPerSize: true } },
    },
  });
  res.json(costings);
}

module.exports = { getAll, getOne, create, update, addPayment, deletePayment, getApprovedCostings };
