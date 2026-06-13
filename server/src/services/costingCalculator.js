/**
 * Core fabric price formula (matches the OCS Excel exactly):
 * Price/kg = (yarn*(1-spandex%) + spandex*spandex% + yarnDye + knitting + dyeing + aop) * (1 + wastage%)
 */
const calcFabricPrice = ({
  yarnPricePerKg = 0,
  spandexPriceKg = 0,
  spandexPct = 0,        // decimal: 0.05 = 5%
  yarnDyeingCost = 0,
  knittingCost = 0,
  dyeingFinishing = 0,
  aopFinishing = 0,
  wastagePct = 0,        // decimal: 0.165 = 16.5%
}) => {
  const yarn = Number(yarnPricePerKg);
  const spandex = Number(spandexPriceKg);
  const spandexP = Number(spandexPct);
  const yarnDye = Number(yarnDyeingCost);
  const knit = Number(knittingCost);
  const dye = Number(dyeingFinishing);
  const aop = Number(aopFinishing);
  const waste = Number(wastagePct);

  const effectiveYarn = yarn * (1 - spandexP) + spandex * spandexP;
  const basePrice = effectiveYarn + yarnDye + knit + dye + aop;
  return parseFloat((basePrice * (1 + waste)).toFixed(6));
};

/**
 * Shell cost per size = fabric price/kg × consumption kg/pc
 */
const calcShellCostPerSize = (fabricPricePerKg, consumptionPerSize) => {
  const price = Number(fabricPricePerKg);
  const result = {};
  for (const [size, consumption] of Object.entries(consumptionPerSize)) {
    result[size] = parseFloat((price * Number(consumption)).toFixed(6));
  }
  return result;
};

/**
 * Sum JSONB cost objects across multiple items for each size
 * items = array of {costPerSize: {"3Y-6Y": 0.09, ...}}
 */
const sumCostPerSize = (items, sizes) => {
  const result = {};
  for (const size of sizes) {
    result[size] = items.reduce((acc, item) => {
      return acc + Number(item.costPerSize?.[size] || 0);
    }, 0);
    result[size] = parseFloat(result[size].toFixed(6));
  }
  return result;
};

/**
 * Calculate CM from SMV
 * CM = (SMV / (workingMins * efficiency)) * workerWageDay
 */
const calcCmFromSmv = ({ smv, lineEfficiency, workerWageDay, workingMinsDay = 480 }) => {
  const eff = Number(lineEfficiency) || 0.75;
  const wage = Number(workerWageDay) || 0;
  const mins = Number(workingMinsDay);
  if (!smv || !wage) return 0;
  return parseFloat(((Number(smv) / (mins * eff)) * wage).toFixed(6));
};

/**
 * Calculate total commercial percentage (all charges combined)
 */
const calcCommPct = (commercial) => {
  const { buyingHouseCommPct = 0, factoryCommPct = 0, profitMarginPct = 0, otherCharges = [] } = commercial;
  return (
    Number(buyingHouseCommPct) +
    Number(factoryCommPct) +
    Number(profitMarginPct) +
    (otherCharges || []).reduce((a, c) => a + Number(c.pct || 0), 0)
  );
};

/**
 * Correct OCS FOB formula:
 *   FOB = SubTotal / (1 - commPct)
 * Because buying house commission is calculated ON the FOB price:
 *   FOB × (1 - commPct) = SubTotal (what factory receives)
 *
 * WRONG old approach was: FOB = SubTotal × (1 + commPct)
 * That would mean the factory pays comm on COST not on FOB — incorrect.
 */
const calcFob = (subTotal, commPct) => {
  if (commPct >= 1) return subTotal; // guard against 100%+ comm
  return commPct > 0 ? parseFloat((subTotal / (1 - commPct)).toFixed(6)) : subTotal;
};

/**
 * Full FOB summary per size — correct OCS formula
 */
const calcFobPerSize = (costing, sizes) => {
  const summary = {};
  const commPct = costing.commercial ? calcCommPct(costing.commercial) : 0;

  for (const size of sizes) {
    const fabric = sumCostPerSize(
      costing.fabricShells.map((s) => ({ costPerSize: s.costPerSize })),
      [size]
    )[size] || 0;

    const trims = sumCostPerSize(costing.trims, [size])[size] || 0;

    const cmTop = Number(costing.cm?.cmTopPerSize?.[size] || 0);
    const cmBottom = Number(costing.cm?.cmBottomPerSize?.[size] || 0);
    const cmBase = cmTop + cmBottom;
    // Apply overhead and compliance on top of base CM
    const overheadPct = Number(costing.cm?.overheadPct || 0);
    const compliancePct = Number(costing.cm?.compliancePct || 0);
    const cm = parseFloat((cmBase * (1 + overheadPct + compliancePct)).toFixed(6));

    const packaging = sumCostPerSize(costing.packaging, [size])[size] || 0;
    const embellishment = sumCostPerSize(costing.embellishments, [size])[size] || 0;
    const wash = sumCostPerSize(costing.washes, [size])[size] || 0;
    const testing = Number(costing.testing?.costPerSize?.[size] || 0);

    const subTotal = fabric + trims + cm + packaging + embellishment + wash + testing;
    const fob = calcFob(subTotal, commPct);
    const settlement = parseFloat((fob - subTotal).toFixed(6));

    summary[size] = {
      fabric: parseFloat(fabric.toFixed(4)),
      trims: parseFloat(trims.toFixed(4)),
      cm: parseFloat(cm.toFixed(4)),
      cmBase: parseFloat(cmBase.toFixed(4)),
      packaging: parseFloat(packaging.toFixed(4)),
      embellishment: parseFloat(embellishment.toFixed(4)),
      wash: parseFloat(wash.toFixed(4)),
      testing: parseFloat(testing.toFixed(4)),
      subTotal: parseFloat(subTotal.toFixed(4)),
      settlement: parseFloat(settlement.toFixed(4)),
      fob: parseFloat(fob.toFixed(4)),
      commPct,
    };
  }

  return summary;
};

/**
 * Shipment / landed cost calculation
 */
const calcShipment = (shipmentData, fobPerSize) => {
  const {
    orderQtyPerSize = {},
    pcsPerCarton = 1,
    cartonCbm = 0,
    cartonGwKg = 0,
    freightMode,
    freightRateUsd = 0,
    freightUnit,
    insurancePct = 0,
    importDutyPct = 0,
  } = shipmentData;

  const totalQty = Object.values(orderQtyPerSize).reduce((a, b) => a + Number(b), 0);
  const totalCartons = Math.ceil(totalQty / Number(pcsPerCarton));
  const totalCbm = parseFloat((totalCartons * Number(cartonCbm)).toFixed(4));
  const totalGw = parseFloat((totalCartons * Number(cartonGwKg)).toFixed(2));

  let totalFreight = 0;
  const rate = Number(freightRateUsd);
  if (freightUnit === 'PER_CBM') totalFreight = totalCbm * rate;
  else if (freightUnit === 'PER_KG') totalFreight = totalGw * rate;
  else if (freightUnit === 'PER_PIECE') totalFreight = totalQty * rate;
  else if (freightUnit === 'LUMP_SUM') totalFreight = rate;

  const freightPerPiece = totalQty > 0 ? parseFloat((totalFreight / totalQty).toFixed(6)) : 0;

  const landedCostPerSize = {};
  for (const [size, fobData] of Object.entries(fobPerSize)) {
    const fob = fobData.fob;
    const insurance = fob * Number(insurancePct);
    const duty = fob * Number(importDutyPct);
    landedCostPerSize[size] = parseFloat((fob + freightPerPiece + insurance + duty).toFixed(4));
  }

  return { totalQty, totalCartons, totalCbm, totalGw, freightPerPiece, landedCostPerSize };
};

module.exports = {
  calcFabricPrice,
  calcShellCostPerSize,
  sumCostPerSize,
  calcCmFromSmv,
  calcCommPct,
  calcFob,
  calcFobPerSize,
  calcShipment,
};
