const prisma = require('../../generated');
const { Prisma } = require('../../generated');

const dec = (v) => (v === '' || v == null ? undefined : new Prisma.Decimal(v));
const num = (v) => (v === '' || v == null ? undefined : Number(v));

async function nextInvoiceNo(tx) {
  const year = new Date().getFullYear();
  await tx.$executeRaw`
    INSERT INTO invoice_seq (year, last_no) VALUES (${year}, 1)
    ON CONFLICT (year) DO UPDATE SET last_no = invoice_seq.last_no + 1
  `;
  const rows = await tx.$queryRaw`SELECT last_no FROM invoice_seq WHERE year = ${year}`;
  return `INV-${year}-${String(rows[0].last_no).padStart(3, '0')}`;
}

async function getAll(req, res) {
  const { status, invoiceType, buyerId } = req.query;
  const where = {};
  if (status) where.status = status;
  if (invoiceType) where.invoiceType = invoiceType;
  if (buyerId) where.buyerId = buyerId;

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      buyer: { select: { name: true } },
      creator: { select: { name: true } },
      _count: { select: { items: true } },
    },
  });
  res.json(invoices);
}

async function getOne(req, res) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: {
      buyer: { select: { name: true, country: true, contactName: true, email: true } },
      orderFinance: { select: { orderNo: true, totalGoodsValue: true, paymentTerms: true } },
      creator: { select: { name: true } },
      items: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  res.json(invoice);
}

async function create(req, res) {
  const { invoiceType, invoiceDate, orderFinanceId, buyerId, buyerName, buyerAddress, items, additionalCharges, additionalChargesNote, currency, dueDate, notes } = req.body;

  const invoice = await prisma.$transaction(async (tx) => {
    const invoiceNo = await nextInvoiceNo(tx);

    const parsedItems = (items || []).map((it, i) => {
      const qty = dec(it.quantity);
      const price = dec(it.unitPrice);
      const total = qty.mul(price);
      return { description: it.description, quantity: qty, unitPrice: price, totalPrice: total, sortOrder: i };
    });

    const subtotal = parsedItems.reduce((sum, it) => sum.add(it.totalPrice), new Prisma.Decimal(0));
    const addlCharges = dec(additionalCharges) || new Prisma.Decimal(0);
    const grandTotal = subtotal.add(addlCharges);

    const inv = await tx.invoice.create({
      data: {
        invoiceNo,
        invoiceType,
        invoiceDate: new Date(invoiceDate),
        orderFinanceId: orderFinanceId || null,
        buyerId: buyerId || null,
        buyerName,
        buyerAddress,
        subtotal,
        additionalCharges: addlCharges,
        additionalChargesNote,
        grandTotal,
        currency: currency || 'USD',
        dueDate: dueDate ? new Date(dueDate) : null,
        notes,
        createdBy: req.user.id,
        items: { create: parsedItems },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    return inv;
  });

  res.status(201).json(invoice);
}

async function update(req, res) {
  const { invoiceDate, buyerId, buyerName, buyerAddress, items, additionalCharges, additionalChargesNote, currency, dueDate, notes } = req.body;

  const inv = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ message: 'Invoice not found' });
  if (inv.status === 'PAID' || inv.status === 'CANCELLED') {
    return res.status(400).json({ message: 'Cannot edit a PAID or CANCELLED invoice' });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: req.params.id } });

    const parsedItems = (items || []).map((it, i) => {
      const qty = dec(it.quantity);
      const price = dec(it.unitPrice);
      const total = qty.mul(price);
      return { description: it.description, quantity: qty, unitPrice: price, totalPrice: total, sortOrder: i };
    });

    const subtotal = parsedItems.reduce((sum, it) => sum.add(it.totalPrice), new Prisma.Decimal(0));
    const addlCharges = dec(additionalCharges) || new Prisma.Decimal(0);
    const grandTotal = subtotal.add(addlCharges);

    return tx.invoice.update({
      where: { id: req.params.id },
      data: {
        invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
        buyerId: buyerId || undefined,
        buyerName,
        buyerAddress,
        subtotal,
        additionalCharges: addlCharges,
        additionalChargesNote,
        grandTotal,
        currency,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        notes,
        items: { create: parsedItems },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });
  });

  res.json(updated);
}

async function updateStatus(req, res) {
  const { status } = req.body;
  const inv = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ message: 'Invoice not found' });

  const updated = await prisma.invoice.update({
    where: { id: req.params.id },
    data: { status, paidAt: status === 'PAID' ? new Date() : undefined },
  });
  res.json(updated);
}

async function deleteInvoice(req, res) {
  const inv = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!inv) return res.status(404).json({ message: 'Invoice not found' });
  if (inv.status !== 'DRAFT') return res.status(400).json({ message: 'Only DRAFT invoices can be deleted' });

  await prisma.invoice.delete({ where: { id: req.params.id } });
  res.json({ message: 'Deleted' });
}

async function getPrint(req, res) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: {
      buyer: true,
      orderFinance: { select: { orderNo: true, paymentTerms: true, shipmentDate: true } },
      items: { orderBy: { sortOrder: 'asc' } },
      creator: { select: { name: true } },
    },
  });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  res.json(invoice);
}

module.exports = { getAll, getOne, create, update, updateStatus, deleteInvoice, getPrint };
