const prisma = require('../utils/prisma');
const {
  calcFabricPrice,
  calcShellCostPerSize,
  calcCmFromSmv,
  calcFobPerSize,
  calcShipment,
} = require('../services/costingCalculator');

// Full costing include helper
const fullCostingInclude = {
  style: {
    select: {
      id: true,
      styleNo: true,
      description: true,
      sizes: true,
      packOf: true,
      buyer: { select: { name: true } },
      factory: { select: { name: true } },
    },
  },
  fabricShells: { orderBy: { shellOrder: 'asc' } },
  trims: { orderBy: { sortOrder: 'asc' } },
  cm: true,
  packaging: { orderBy: { sortOrder: 'asc' } },
  embellishments: { orderBy: { sortOrder: 'asc' } },
  washes: { orderBy: { sortOrder: 'asc' } },
  testing: true,
  commercial: true,
  shipment: true,
};

// ── Create new costing (or new version) ──────────────────────────────────────
const create = async (req, res) => {
  const { styleId, versionLabel, fromUser, toPerson, costingDate, notes } = req.body;

  const style = await prisma.style.findUniqueOrThrow({ where: { id: styleId } });

  const lastVersion = await prisma.costing.aggregate({
    where: { styleId },
    _max: { version: true },
  });
  const version = (lastVersion._max.version || 0) + 1;

  const costing = await prisma.costing.create({
    data: {
      styleId,
      version,
      versionLabel: versionLabel || `v${version}`,
      fromUser,
      toPerson,
      costingDate: costingDate ? new Date(costingDate) : new Date(),
      notes,
      createdBy: req.user.id,
    },
    include: fullCostingInclude,
  });

  res.status(201).json({ success: true, data: costing });
};

// ── Get one costing with full data + calculated FOB ───────────────────────────
const getOne = async (req, res) => {
  const costing = await prisma.costing.findUniqueOrThrow({
    where: { id: req.params.id },
    include: fullCostingInclude,
  });

  const sizes = costing.style.sizes;
  const fobSummary = calcFobPerSize(costing, sizes);

  let shipmentCalc = null;
  if (costing.shipment) {
    shipmentCalc = calcShipment(costing.shipment, fobSummary);
  }

  res.json({ success: true, data: costing, fobSummary, shipmentCalc });
};

// ── Update header ─────────────────────────────────────────────────────────────
const updateHeader = async (req, res) => {
  const { versionLabel, fromUser, toPerson, costingDate, notes, status, targetFob } = req.body;
  const costing = await prisma.costing.update({
    where: { id: req.params.id },
    data: {
      versionLabel, fromUser, toPerson, notes, status,
      costingDate: costingDate ? new Date(costingDate) : undefined,
      targetFob: targetFob != null ? Number(targetFob) : undefined,
    },
    include: fullCostingInclude,
  });
  res.json({ success: true, data: costing });
};

// ── Fabric Shells ─────────────────────────────────────────────────────────────
const upsertShell = async (req, res) => {
  const { costingId } = req.params;
  const body = req.body;

  // Calculate fabric price
  let fabricPricePerKg;
  if (body.isDirectPrice) {
    fabricPricePerKg = Number(body.directPricePerKg || 0);
  } else {
    fabricPricePerKg = calcFabricPrice(body);
  }

  // Calculate cost per size
  const costPerSize = calcShellCostPerSize(fabricPricePerKg, body.consumptionPerSize || {});

  const shellData = {
    costingId,
    shellOrder: body.shellOrder,
    shellName: body.shellName,
    application: body.application,
    mill: body.mill,
    fabricationDetail: body.fabricationDetail,
    fabricLibraryId: body.fabricLibraryId || null,
    isDirectPrice: body.isDirectPrice || false,
    yarnCount: body.yarnCount,
    yarnPricePerKg: body.yarnPricePerKg,
    spandexPriceKg: body.spandexPriceKg,
    spandexPct: body.spandexPct,
    yarnDyeingCost: body.yarnDyeingCost,
    knittingCost: body.knittingCost,
    dyeingFinishing: body.dyeingFinishing,
    aopFinishing: body.aopFinishing,
    wastagePct: body.wastagePct,
    directPricePerKg: body.directPricePerKg,
    fabricPricePerKg,
    consumptionPerSize: body.consumptionPerSize || {},
    costPerSize,
  };

  let shell;
  if (body.id) {
    shell = await prisma.costingFabricShell.update({ where: { id: body.id }, data: shellData });
  } else {
    shell = await prisma.costingFabricShell.create({ data: shellData });
  }

  await logAudit(costingId, req.user.id, 'SHELL_SAVED', 'fabricShell', null, JSON.stringify(shell));
  res.json({ success: true, data: shell });
};

const deleteShell = async (req, res) => {
  await prisma.costingFabricShell.delete({ where: { id: req.params.shellId } });
  res.json({ success: true });
};

// ── Trims ─────────────────────────────────────────────────────────────────────
const saveTrims = async (req, res) => {
  const { costingId } = req.params;
  const { trims } = req.body; // full array replacement

  await prisma.$transaction(async (tx) => {
    await tx.costingTrim.deleteMany({ where: { costingId } });
    if (trims?.length) {
      await tx.costingTrim.createMany({
        data: trims.map((t, i) => ({
          costingId,
          trimLibraryId: t.trimLibraryId || null,
          itemName: t.itemName,
          category: t.category,
          unit: t.unit,
          ratePerUnit: t.ratePerUnit != null ? Number(t.ratePerUnit) : null,
          qtyPerGarment: t.qtyPerGarment != null ? Number(t.qtyPerGarment) : null,
          isSizeSpecific: t.isSizeSpecific || false,
          costPerSize: t.costPerSize || {},
          sortOrder: i,
        })),
      });
    }
  });

  const saved = await prisma.costingTrim.findMany({ where: { costingId }, orderBy: { sortOrder: 'asc' } });
  res.json({ success: true, data: saved });
};

// ── CM ────────────────────────────────────────────────────────────────────────
const saveCm = async (req, res) => {
  const { costingId } = req.params;
  const body = req.body;

  // If SMV-based, auto-calculate CM and spread across all sizes
  let cmTopPerSize = body.cmTopPerSize || {};
  if (body.cmMode === 'SMV_BASED' && body.smv) {
    const cmValue = calcCmFromSmv(body);
    const costing = await prisma.costing.findUniqueOrThrow({
      where: { id: costingId },
      include: { style: { select: { sizes: true } } },
    });
    costing.style.sizes.forEach((s) => { cmTopPerSize[s] = cmValue; });
  }

  const cmData = {
    cmMode: body.cmMode,
    smv: body.smv ? Number(body.smv) : null,
    lineEfficiency: body.lineEfficiency ? Number(body.lineEfficiency) : null,
    workerWageDay: body.workerWageDay ? Number(body.workerWageDay) : null,
    workingMinsDay: body.workingMinsDay ? Number(body.workingMinsDay) : 480,
    directCmRate: body.directCmRate ? Number(body.directCmRate) : null,
    overheadPct: body.overheadPct != null ? Number(body.overheadPct) : 0,
    compliancePct: body.compliancePct != null ? Number(body.compliancePct) : 0,
    cmTopPerSize,
    cmBottomPerSize: body.cmBottomPerSize || {},
  };
  const cm = await prisma.costingCm.upsert({
    where: { costingId },
    create: { costingId, ...cmData },
    update: cmData,
  });
  res.json({ success: true, data: cm });
};

// ── Packaging ─────────────────────────────────────────────────────────────────
const savePackaging = async (req, res) => {
  const { costingId } = req.params;
  const { items } = req.body;

  await prisma.$transaction(async (tx) => {
    await tx.costingPackaging.deleteMany({ where: { costingId } });
    if (items?.length) {
      await tx.costingPackaging.createMany({
        data: items.map((p, i) => ({
          costingId,
          itemName: p.itemName,
          costPerSize: p.costPerSize || {},
          sortOrder: i,
        })),
      });
    }
  });

  const saved = await prisma.costingPackaging.findMany({ where: { costingId }, orderBy: { sortOrder: 'asc' } });
  res.json({ success: true, data: saved });
};

// ── Embellishments ────────────────────────────────────────────────────────────
const saveEmbellishments = async (req, res) => {
  const { costingId } = req.params;
  const { items } = req.body;

  await prisma.$transaction(async (tx) => {
    await tx.costingEmbellishment.deleteMany({ where: { costingId } });
    if (items?.length) {
      await tx.costingEmbellishment.createMany({
        data: items.map((e, i) => ({
          costingId,
          name: e.name,
          costPerSize: e.costPerSize || {},
          sortOrder: i,
        })),
      });
    }
  });

  const saved = await prisma.costingEmbellishment.findMany({ where: { costingId }, orderBy: { sortOrder: 'asc' } });
  res.json({ success: true, data: saved });
};

// ── Wash ──────────────────────────────────────────────────────────────────────
const saveWash = async (req, res) => {
  const { costingId } = req.params;
  const { items } = req.body;

  await prisma.$transaction(async (tx) => {
    await tx.costingWash.deleteMany({ where: { costingId } });
    if (items?.length) {
      await tx.costingWash.createMany({
        data: items.map((w, i) => ({
          costingId,
          washType: w.washType,
          costPerSize: w.costPerSize || {},
          sortOrder: i,
        })),
      });
    }
  });

  const saved = await prisma.costingWash.findMany({ where: { costingId }, orderBy: { sortOrder: 'asc' } });
  res.json({ success: true, data: saved });
};

// ── Testing ───────────────────────────────────────────────────────────────────
const saveTesting = async (req, res) => {
  const { costingId } = req.params;
  const testing = await prisma.costingTesting.upsert({
    where: { costingId },
    create: { costingId, costPerSize: req.body.costPerSize || {}, notes: req.body.notes },
    update: { costPerSize: req.body.costPerSize || {}, notes: req.body.notes },
  });
  res.json({ success: true, data: testing });
};

// ── Commercial ────────────────────────────────────────────────────────────────
const saveCommercial = async (req, res) => {
  const { costingId } = req.params;
  const commercial = await prisma.costingCommercial.upsert({
    where: { costingId },
    create: { costingId, ...req.body },
    update: req.body,
  });
  res.json({ success: true, data: commercial });
};

// ── Shipment ──────────────────────────────────────────────────────────────────
const saveShipment = async (req, res) => {
  const { costingId } = req.params;

  // Fetch current FOB to compute landed cost
  const costing = await prisma.costing.findUniqueOrThrow({
    where: { id: costingId },
    include: fullCostingInclude,
  });
  const fobSummary = calcFobPerSize(costing, costing.style.sizes);
  const shipCalc = calcShipment(req.body, fobSummary);

  const shipment = await prisma.costingShipment.upsert({
    where: { costingId },
    create: {
      costingId,
      ...req.body,
      totalQty: shipCalc.totalQty,
      totalCartons: shipCalc.totalCartons,
      totalCbm: shipCalc.totalCbm,
      freightPerPiece: shipCalc.freightPerPiece,
      landedCostPerSize: shipCalc.landedCostPerSize,
    },
    update: {
      ...req.body,
      totalQty: shipCalc.totalQty,
      totalCartons: shipCalc.totalCartons,
      totalCbm: shipCalc.totalCbm,
      freightPerPiece: shipCalc.freightPerPiece,
      landedCostPerSize: shipCalc.landedCostPerSize,
    },
  });

  res.json({ success: true, data: shipment, shipmentCalc: shipCalc });
};

// ── FOB Summary (recalculate on demand) ───────────────────────────────────────
const getFobSummary = async (req, res) => {
  const costing = await prisma.costing.findUniqueOrThrow({
    where: { id: req.params.id },
    include: fullCostingInclude,
  });

  const sizes = costing.style.sizes;
  const fobSummary = calcFobPerSize(costing, sizes);
  let shipmentCalc = null;
  if (costing.shipment) {
    shipmentCalc = calcShipment(costing.shipment, fobSummary);
  }

  res.json({ success: true, fobSummary, shipmentCalc });
};

// ── Audit Log ─────────────────────────────────────────────────────────────────
const getAuditLog = async (req, res) => {
  const logs = await prisma.costingAuditLog.findMany({
    where: { costingId: req.params.id },
    orderBy: { changedAt: 'desc' },
    include: { changedByUser: { select: { name: true, email: true } } },
    take: 50,
  });
  res.json({ success: true, data: logs });
};

// ── Clone costing to new version ─────────────────────────────────────────────
const cloneCosting = async (req, res) => {
  const source = await prisma.costing.findUniqueOrThrow({
    where: { id: req.params.id },
    include: fullCostingInclude,
  });

  const lastVersion = await prisma.costing.aggregate({
    where: { styleId: source.styleId },
    _max: { version: true },
  });
  const newVersion = (lastVersion._max.version || 0) + 1;

  const newCosting = await prisma.$transaction(async (tx) => {
    const c = await tx.costing.create({
      data: {
        styleId: source.styleId,
        version: newVersion,
        versionLabel: `v${newVersion} (clone of v${source.version})`,
        fromUser: source.fromUser,
        toPerson: source.toPerson,
        costingDate: new Date(),
        notes: source.notes,
        status: 'DRAFT',
        createdBy: req.user.id,
      },
    });

    if (source.fabricShells?.length) {
      await tx.costingFabricShell.createMany({
        data: source.fabricShells.map(({ id, costingId, createdAt, updatedAt, ...rest }) => ({
          ...rest, costingId: c.id,
        })),
      });
    }
    if (source.trims?.length) {
      await tx.costingTrim.createMany({
        data: source.trims.map(({ id, costingId, createdAt, updatedAt, ...rest }) => ({ ...rest, costingId: c.id })),
      });
    }
    if (source.cm) {
      const { id, costingId, createdAt, updatedAt, ...cm } = source.cm;
      await tx.costingCm.create({ data: { ...cm, costingId: c.id } });
    }
    if (source.packaging?.length) {
      await tx.costingPackaging.createMany({
        data: source.packaging.map(({ id, costingId, createdAt, updatedAt, ...rest }) => ({ ...rest, costingId: c.id })),
      });
    }
    if (source.embellishments?.length) {
      await tx.costingEmbellishment.createMany({
        data: source.embellishments.map(({ id, costingId, createdAt, updatedAt, ...rest }) => ({ ...rest, costingId: c.id })),
      });
    }
    if (source.washes?.length) {
      await tx.costingWash.createMany({
        data: source.washes.map(({ id, costingId, createdAt, updatedAt, ...rest }) => ({ ...rest, costingId: c.id })),
      });
    }
    if (source.testing) {
      const { id, costingId, createdAt, updatedAt, ...testing } = source.testing;
      await tx.costingTesting.create({ data: { ...testing, costingId: c.id } });
    }
    if (source.commercial) {
      const { id, costingId, createdAt, updatedAt, ...commercial } = source.commercial;
      await tx.costingCommercial.create({ data: { ...commercial, costingId: c.id } });
    }
    if (source.shipment) {
      const { id, costingId, createdAt, updatedAt, ...shipment } = source.shipment;
      await tx.costingShipment.create({ data: { ...shipment, costingId: c.id } });
    }
    return c;
  });

  res.status(201).json({ success: true, data: newCosting });
};

// ── Delete costing (DRAFT only) ───────────────────────────────────────────────
const deleteCosting = async (req, res) => {
  const costing = await prisma.costing.findUniqueOrThrow({ where: { id: req.params.id } });
  if (costing.status !== 'DRAFT') {
    res.status(400);
    throw new Error('Only DRAFT costings can be deleted');
  }
  await prisma.costing.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Costing deleted' });
};

// ── Helper ────────────────────────────────────────────────────────────────────
const logAudit = async (costingId, userId, action, fieldName, oldValue, newValue) => {
  await prisma.costingAuditLog.create({
    data: { costingId, changedBy: userId, action, fieldName, oldValue, newValue },
  }).catch(() => {}); // non-blocking
};

module.exports = {
  create,
  getOne,
  updateHeader,
  deleteCosting,
  upsertShell,
  deleteShell,
  saveTrims,
  saveCm,
  savePackaging,
  saveEmbellishments,
  saveWash,
  saveTesting,
  saveCommercial,
  saveShipment,
  getFobSummary,
  getAuditLog,
  cloneCosting,
};
