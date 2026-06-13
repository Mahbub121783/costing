import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs) => twMerge(clsx(inputs));

export const fmt = (val, decimals = 4) =>
  val !== null && val !== undefined ? Number(val).toFixed(decimals) : '—';

export const fmtUsd = (val, decimals = 4) =>
  val !== null && val !== undefined ? `$${Number(val).toFixed(decimals)}` : '—';

export const fmtPct = (val) =>
  val !== null && val !== undefined ? `${(Number(val) * 100).toFixed(2)}%` : '—';

export const calcFabricPrice = ({
  yarnPricePerKg = 0,
  spandexPriceKg = 0,
  spandexPct = 0,
  yarnDyeingCost = 0,
  knittingCost = 0,
  dyeingFinishing = 0,
  aopFinishing = 0,
  wastagePct = 0,
}) => {
  const yarn = Number(yarnPricePerKg);
  const spandex = Number(spandexPriceKg);
  const sp = Number(spandexPct);
  const effectiveYarn = yarn * (1 - sp) + spandex * sp;
  const base = effectiveYarn + Number(yarnDyeingCost) + Number(knittingCost) + Number(dyeingFinishing) + Number(aopFinishing);
  return parseFloat((base * (1 + Number(wastagePct))).toFixed(6));
};

export const computeLiveFob = (sections, sizes) => {
  const {
    shells = [],
    trims = [],
    cm = {},
    packaging = [],
    embellishments = [],
    washes = [],
    testing = {},
    commercial = {},
  } = sections;

  const result = {};

  for (const size of sizes) {
    // 1. Fabric: sum all shell costs per size
    const fabric = shells.reduce((sum, s) => {
      const price = s.isDirectPrice
        ? Number(s.directPricePerKg || 0)
        : calcFabricPrice(s);
      return sum + price * Number(s.consumptionPerSize?.[size] || 0);
    }, 0);

    // 2. Trims
    const trimsTotal = trims.reduce((sum, t) => sum + Number(t.costPerSize?.[size] || 0), 0);

    // 3. CM — base rate (per-size > direct > SMV), then apply overhead + compliance
    let cmBase = 0;
    const cmTop = Number(cm.cmTopPerSize?.[size] || 0);
    const cmBottom = Number(cm.cmBottomPerSize?.[size] || 0);
    if (cmTop + cmBottom > 0) {
      cmBase = cmTop + cmBottom;
    } else if (cm.cmMode === 'SMV_BASED' && cm.smv && cm.workerWageDay) {
      cmBase = (Number(cm.smv) / (Number(cm.workingMinsDay || 480) * Number(cm.lineEfficiency || 0.75))) * Number(cm.workerWageDay);
    } else {
      cmBase = Number(cm.directCmRate || 0);
    }
    const overheadPct = Number(cm.overheadPct || 0);
    const compliancePct = Number(cm.compliancePct || 0);
    const cmCost = cmBase * (1 + overheadPct + compliancePct);

    // 4. Packaging
    const packTotal = packaging.reduce((sum, p) => sum + Number(p.costPerSize?.[size] || 0), 0);

    // 5. Embellishment
    const embTotal = embellishments.reduce((sum, e) => sum + Number(e.costPerSize?.[size] || 0), 0);

    // 6. Wash
    const washTotal = washes.reduce((sum, w) => sum + Number(w.costPerSize?.[size] || 0), 0);

    // 7. Testing
    const testTotal = Number(testing?.costPerSize?.[size] || 0);

    const subTotal = fabric + trimsTotal + cmCost + packTotal + embTotal + washTotal + testTotal;

    // 8. Settlement
    const commPct =
      Number(commercial?.buyingHouseCommPct || 0) +
      Number(commercial?.factoryCommPct || 0) +
      Number(commercial?.profitMarginPct || 0) +
      (commercial?.otherCharges || []).reduce((s, o) => s + Number(o.pct || 0), 0);

    // Correct OCS formula: FOB = SubTotal / (1 - commPct)
    // BH commission is taken FROM the FOB price, so: FOB × (1 - commPct) = SubTotal
    // Wrong old formula was: FOB = SubTotal × (1 + commPct) — that applies % to cost, not FOB
    const fob = commPct > 0 && commPct < 1
      ? parseFloat((subTotal / (1 - commPct)).toFixed(4))
      : parseFloat(subTotal.toFixed(4));
    const settlement = parseFloat((fob - subTotal).toFixed(4));

    result[size] = {
      fabric: parseFloat(fabric.toFixed(4)),
      trims: parseFloat(trimsTotal.toFixed(4)),
      cm: parseFloat(cmCost.toFixed(4)),
      cmBase: parseFloat(cmBase.toFixed(4)),
      packaging: parseFloat(packTotal.toFixed(4)),
      embellishment: parseFloat(embTotal.toFixed(4)),
      wash: parseFloat(washTotal.toFixed(4)),
      testing: parseFloat(testTotal.toFixed(4)),
      subTotal: parseFloat(subTotal.toFixed(4)),
      settlement: parseFloat(settlement.toFixed(4)),
      fob: parseFloat(fob.toFixed(4)),
      commPct,
    };
  }

  return result;
};

export const STATUS_COLORS = {
  DRAFT:     { badge: 'badge-draft',     dot: 'bg-slate-400', label: 'Draft' },
  SUBMITTED: { badge: 'badge-submitted', dot: 'bg-amber-400',  label: 'Submitted' },
  APPROVED:  { badge: 'badge-approved',  dot: 'bg-emerald-500', label: 'Approved' },
  REJECTED:  { badge: 'badge-rejected',  dot: 'bg-red-500',    label: 'Rejected' },
};
