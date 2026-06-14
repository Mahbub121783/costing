import { useState, useEffect, Fragment } from 'react';
import { Plus, Trash2, Tag, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../../lib/api';
import { fmtUsd } from '../../../lib/utils';
import { useSectionAutoSave } from '../../../hooks/useSectionAutoSave';
import SaveStatusIndicator from '../../../components/ui/SaveStatusIndicator';

const CATEGORIES = ['Label', 'Button / Snap', 'Zipper', 'Thread', 'Elastic / Tape', 'Interlining', 'Sewing', 'Packaging Trim', 'Other'];
const UNITS = ['Pc', 'Set', 'Mtr', 'Yard', 'Kg', 'Gm', 'Doz', 'Lot'];

const DEFAULT_TRIMS = [
  { itemName: 'Main Label',       category: 'Label',         unit: 'Pc',  qtyPerGarment: '1',    ratePerUnit: '', isSizeSpecific: false, costPerSize: {} },
  { itemName: 'Size Label',       category: 'Label',         unit: 'Pc',  qtyPerGarment: '1',    ratePerUnit: '', isSizeSpecific: false, costPerSize: {} },
  { itemName: 'Care Label',       category: 'Label',         unit: 'Pc',  qtyPerGarment: '1',    ratePerUnit: '', isSizeSpecific: false, costPerSize: {} },
  { itemName: 'Country Label',    category: 'Label',         unit: 'Pc',  qtyPerGarment: '1',    ratePerUnit: '', isSizeSpecific: false, costPerSize: {} },
  { itemName: 'Main Zipper',      category: 'Zipper',        unit: 'Pc',  qtyPerGarment: '1',    ratePerUnit: '', isSizeSpecific: false, costPerSize: {} },
  { itemName: 'Button',           category: 'Button / Snap', unit: 'Pc',  qtyPerGarment: '',     ratePerUnit: '', isSizeSpecific: false, costPerSize: {} },
  { itemName: 'Sewing Thread',    category: 'Thread',        unit: 'Lot', qtyPerGarment: '1',    ratePerUnit: '', isSizeSpecific: false, costPerSize: {} },
  { itemName: 'Elastic (Waist)',  category: 'Elastic / Tape',unit: 'Mtr', qtyPerGarment: '',     ratePerUnit: '', isSizeSpecific: true,  costPerSize: {} },
];

// Build per-size cost from qty × rate (for non-size-specific trims)
const buildCostPerSize = (trim, sizes) => {
  const qty = Number(trim.qtyPerGarment || 0);
  const rate = Number(trim.ratePerUnit || 0);
  const cost = parseFloat((qty * rate).toFixed(6));
  if (!trim.isSizeSpecific) {
    const result = {};
    sizes.forEach((s) => { result[s] = cost > 0 ? cost : 0; });
    return result;
  }
  return trim.costPerSize || {};
};

export default function TrimsTab({ costing, sizes, onSaved, onLiveChange }) {
  const [trims, setTrims] = useState(
    costing.trims?.length
      ? costing.trims.map((t) => ({
          ...t,
          qtyPerGarment: t.qtyPerGarment ?? '',
          ratePerUnit: t.ratePerUnit ?? '',
          isSizeSpecific: t.isSizeSpecific ?? false,
        }))
      : DEFAULT_TRIMS
  );
  const [expandedIdx, setExpandedIdx] = useState(null);

  // Push live data to parent with computed costPerSize
  useEffect(() => {
    const withCosts = trims.map((t) => ({ ...t, costPerSize: buildCostPerSize(t, sizes) }));
    onLiveChange?.(withCosts);
  }, [trims, sizes]);

  const set = (idx, key, val) =>
    setTrims((prev) => prev.map((t, i) => i === idx ? { ...t, [key]: val } : t));

  const setSizeSpecificCost = (idx, size, val) =>
    setTrims((prev) =>
      prev.map((t, i) =>
        i === idx ? { ...t, costPerSize: { ...t.costPerSize, [size]: val } } : t
      )
    );

  const toggleSizeSpecific = (idx) => {
    setTrims((prev) =>
      prev.map((t, i) => {
        if (i !== idx) return t;
        const next = !t.isSizeSpecific;
        // When switching to size-specific, seed with current qty×rate value
        let costPerSize = t.costPerSize || {};
        if (next) {
          const defaultCost = Number(t.qtyPerGarment || 0) * Number(t.ratePerUnit || 0);
          if (defaultCost > 0) {
            sizes.forEach((s) => { if (!costPerSize[s]) costPerSize = { ...costPerSize, [s]: defaultCost.toFixed(4) }; });
          }
        }
        return { ...t, isSizeSpecific: next, costPerSize };
      })
    );
    setExpandedIdx((prev) => (prev === idx ? null : idx));
  };

  const addRow = () => setTrims((p) => [...p, { itemName: '', category: '', unit: 'Pc', qtyPerGarment: '1', ratePerUnit: '', isSizeSpecific: false, costPerSize: {} }]);

  const del = (idx) => setTrims((p) => p.filter((_, i) => i !== idx));

  // What gets saved: inject computed costPerSize before save
  const getSavePayload = () =>
    trims.map((t) => ({ ...t, costPerSize: buildCostPerSize(t, sizes) }));

  const saveStatus = useSectionAutoSave(
    () => api.put(`/costings/${costing.id}/trims`, { trims: getSavePayload() }).then(onSaved),
    [trims]
  );

  // Grand total per size
  const totalPerSize = (size) =>
    trims.reduce((sum, t) => {
      const c = buildCostPerSize(t, sizes);
      return sum + Number(c[size] || 0);
    }, 0);

  const colMinWidth = Math.max(80, Math.floor(420 / Math.max(sizes.length, 1)));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-amber-500 rounded-full" />
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Tag size={15} className="text-amber-500" /> Trims & Accessories
          </h2>
          <SaveStatusIndicator status={saveStatus} />
        </div>
        <button onClick={addRow} className="btn-secondary btn-sm">
          <Plus size={13} /> Add Trim
        </button>
      </div>

      {/* Formula legend */}
      <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-800">
        <span className="font-semibold">Cost/pc = Qty × Rate</span>
        <span className="text-amber-600">— enter quantity per garment and unit price. Toggle "Per Size" for items that vary by size (e.g. elastic waistband).</span>
      </div>

      {/* Main table */}
      <div className="section-card">
        <div className="overflow-x-auto">
          <table className="grid-table w-full" style={{ minWidth: '700px' }}>
            <thead>
              <tr>
                <th className="min-w-[180px] text-left">Trim Item</th>
                <th className="min-w-[120px] text-left">Category</th>
                <th className="min-w-[60px] text-left">Unit</th>
                <th className="min-w-[70px] text-right">Qty/pc</th>
                <th className="min-w-[90px] text-right">Rate/Unit ($)</th>
                <th className="min-w-[90px] text-right text-amber-600">Cost/pc ($)</th>
                <th className="min-w-[80px] text-center">Per Size?</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {trims.map((trim, idx) => {
                const computedCost = !trim.isSizeSpecific
                  ? Number(trim.qtyPerGarment || 0) * Number(trim.ratePerUnit || 0)
                  : null;
                const isExpanded = expandedIdx === idx;

                return (
                  <Fragment key={idx}>
                    <tr className={trim.isSizeSpecific ? 'bg-indigo-50/30' : ''}>
                      <td>
                        <input
                          value={trim.itemName}
                          onChange={(e) => set(idx, 'itemName', e.target.value)}
                          className="cell-input-left font-medium"
                          placeholder="e.g. Main Label, Button"
                        />
                      </td>
                      <td>
                        <select
                          value={trim.category}
                          onChange={(e) => set(idx, 'category', e.target.value)}
                          className="cell-input-left text-slate-600"
                        >
                          <option value="">—</option>
                          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td>
                        <select
                          value={trim.unit}
                          onChange={(e) => set(idx, 'unit', e.target.value)}
                          className="cell-input-left"
                        >
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number" step="0.001" min="0"
                          value={trim.qtyPerGarment}
                          onChange={(e) => set(idx, 'qtyPerGarment', e.target.value)}
                          className="cell-input"
                          placeholder="1"
                          disabled={trim.isSizeSpecific}
                        />
                      </td>
                      <td>
                        <input
                          type="number" step="0.0001" min="0"
                          value={trim.ratePerUnit}
                          onChange={(e) => set(idx, 'ratePerUnit', e.target.value)}
                          className="cell-input"
                          placeholder="0.0000"
                          disabled={trim.isSizeSpecific}
                        />
                      </td>
                      <td className="text-right py-1 px-2">
                        {trim.isSizeSpecific ? (
                          <span className="text-xs text-slate-400 italic">per size</span>
                        ) : computedCost > 0 ? (
                          <span className="font-mono font-bold text-amber-700 text-xs">
                            {fmtUsd(computedCost)}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="text-center py-1">
                        <button
                          type="button"
                          onClick={() => toggleSizeSpecific(idx)}
                          className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${
                            trim.isSizeSpecific
                              ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          {trim.isSizeSpecific ? (
                            <span className="flex items-center gap-1">On {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}</span>
                          ) : 'Off'}
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={() => del(idx)}
                          className="btn-icon text-slate-300 hover:text-red-500 hover:bg-red-50 w-6 h-6"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded: per-size cost inputs */}
                    {trim.isSizeSpecific && isExpanded && (
                      <tr className="bg-indigo-50/50">
                        <td colSpan={3} className="py-2 px-3 text-xs text-indigo-600 font-semibold">
                          Cost / pc by size:
                        </td>
                        {sizes.map((size) => (
                          <td key={size} colSpan={1} className="py-1 px-1" style={{ minWidth: colMinWidth }}>
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-xs text-indigo-600 font-medium">{size}</span>
                              <input
                                type="number" step="0.0001"
                                value={trim.costPerSize?.[size] || ''}
                                onChange={(e) => setSizeSpecificCost(idx, size, e.target.value)}
                                className="cell-input text-center w-full"
                                placeholder="0.0000"
                              />
                            </div>
                          </td>
                        ))}
                        <td colSpan={8 - 3 - sizes.length} />
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {/* Totals row */}
              <tr className="total-row">
                <td colSpan={5} className="text-xs font-bold text-amber-700 uppercase tracking-wide py-2 px-2">
                  Total Trims / pc
                </td>
                <td className="text-right font-mono font-bold text-amber-700 text-xs py-2 px-2">
                  {(() => {
                    const avg = sizes.length > 0
                      ? sizes.reduce((s, sz) => s + totalPerSize(sz), 0) / sizes.length
                      : 0;
                    return avg > 0 ? fmtUsd(avg) : '—';
                  })()}
                  <span className="text-slate-400 font-normal ml-1">(avg)</span>
                </td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Per-size total breakdown */}
        {sizes.length > 0 && (
          <div className="border-t border-slate-100 overflow-x-auto">
            <table className="grid-table w-full" style={{ minWidth: `${200 + sizes.length * colMinWidth}px` }}>
              <thead>
                <tr>
                  <th className="min-w-[200px]">Breakdown by Size</th>
                  {sizes.map((s) => <th key={s} className="num" style={{ minWidth: colMinWidth }}><span className="text-amber-600">{s}</span></th>)}
                </tr>
              </thead>
              <tbody>
                {trims.filter((t) => t.itemName).map((trim, idx) => {
                  const costs = buildCostPerSize(trim, sizes);
                  const hasAny = sizes.some((s) => Number(costs[s] || 0) > 0);
                  if (!hasAny) return null;
                  return (
                    <tr key={idx}>
                      <td className="text-xs text-slate-600 py-1 px-2">
                        {trim.itemName}
                        {!trim.isSizeSpecific && trim.qtyPerGarment && trim.ratePerUnit && (
                          <span className="ml-1.5 text-slate-400">
                            ({trim.qtyPerGarment} × ${Number(trim.ratePerUnit).toFixed(4)})
                          </span>
                        )}
                      </td>
                      {sizes.map((s) => (
                        <td key={s} className="text-right font-mono tabular-nums text-xs py-1 px-2 text-slate-600">
                          {Number(costs[s] || 0) > 0 ? fmtUsd(Number(costs[s])) : '—'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                <tr className="total-row">
                  <td className="text-xs font-bold text-amber-700 uppercase tracking-wide py-2 px-2">Grand Total</td>
                  {sizes.map((s) => {
                    const t = totalPerSize(s);
                    return (
                      <td key={s} className="text-right font-mono font-bold text-amber-700 tabular-nums text-xs py-2 px-2">
                        {t > 0 ? fmtUsd(t) : '—'}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
