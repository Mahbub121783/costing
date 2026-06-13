import { useState } from 'react';
import { RefreshCw, Printer, BarChart3, Ship, Target, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { fmtUsd, fmtPct } from '../../../lib/utils';

const SECTION_ROWS = [
  { key: 'fabric',        label: 'Fabric',        color: '#818cf8', bg: 'bg-indigo-400' },
  { key: 'trims',         label: 'Trims',         color: '#fbbf24', bg: 'bg-amber-400' },
  { key: 'cm',            label: 'CM (incl. OH)', color: '#34d399', bg: 'bg-emerald-400' },
  { key: 'packaging',     label: 'Packaging',     color: '#22d3ee', bg: 'bg-cyan-400' },
  { key: 'embellishment', label: 'Embellishment', color: '#c084fc', bg: 'bg-purple-400' },
  { key: 'wash',          label: 'Wash',          color: '#38bdf8', bg: 'bg-sky-400' },
  { key: 'testing',       label: 'Testing',       color: '#fb7185', bg: 'bg-rose-400' },
];

function pct(part, total) {
  if (!total || !part) return null;
  return (part / total) * 100;
}

function PctBar({ value, max, color }) {
  const w = Math.min(100, ((value || 0) / (max || 1)) * 100);
  return (
    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
      <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, backgroundColor: color }} />
    </div>
  );
}

export default function SummaryTab({ costing, sizes, fobSummary, shipmentCalc, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);
  const [targetFob, setTargetFob] = useState(costing.targetFob ? String(costing.targetFob) : '');
  const [savingTarget, setSavingTarget] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try { await onRefresh(); toast.success('Summary refreshed'); }
    finally { setRefreshing(false); }
  };

  const saveTarget = async () => {
    setSavingTarget(true);
    try {
      await api.put(`/costings/${costing.id}/header`, { targetFob: targetFob || null });
      toast.success('Target FOB saved');
    } catch { toast.error('Failed to save target'); }
    finally { setSavingTarget(false); }
  };

  const orderQty = costing.shipment?.orderQtyPerSize || {};
  const totalQty = Object.values(orderQty).reduce((a, b) => a + Number(b || 0), 0);

  // Use average FOB for target comparison
  const avgFob = sizes.length > 0
    ? sizes.reduce((s, sz) => s + Number(fobSummary?.[sz]?.fob || 0), 0) / sizes.length
    : 0;

  const targetNum = Number(targetFob || 0);
  const gap = targetNum > 0 && avgFob > 0 ? avgFob - targetNum : null;

  // Max value for bar chart (across all sizes)
  const maxSectionVal = Math.max(
    ...SECTION_ROWS.map(({ key }) =>
      Math.max(...sizes.map((s) => Number(fobSummary?.[s]?.[key] || 0)))
    ), 0.001
  );

  // Average per section (for single-column display when many sizes)
  const avgByKey = (key) => {
    if (!sizes.length) return 0;
    return sizes.reduce((s, sz) => s + Number(fobSummary?.[sz]?.[key] || 0), 0) / sizes.length;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-emerald-600 rounded-full" />
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 size={15} className="text-emerald-600" /> FOB Cost Summary
          </h2>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} disabled={refreshing} className="btn-secondary btn-sm">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => window.open(`/costing/${costing.id}/print`, '_blank')} className="btn-primary btn-sm">
            <Printer size={13} /> Print
          </button>
        </div>
      </div>

      {/* Target FOB + gap */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
            {/* Target input */}
            <div>
              <label className="field-label flex items-center gap-1.5">
                <Target size={12} className="text-indigo-500" /> Target FOB (USD/pc)
              </label>
              <div className="flex gap-2">
                <input
                  type="number" step="0.01"
                  value={targetFob}
                  onChange={(e) => setTargetFob(e.target.value)}
                  className="input font-mono"
                  placeholder="e.g. 11.50"
                />
                <button onClick={saveTarget} disabled={savingTarget} className="btn-secondary btn-sm flex-shrink-0">
                  {savingTarget ? '…' : 'Set'}
                </button>
              </div>
            </div>

            {/* Calculated avg FOB */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 px-5 py-3 text-center">
              <p className="text-xs text-slate-500 font-medium mb-1">Calculated Avg FOB</p>
              <p className="text-2xl font-bold font-mono text-slate-900">{avgFob > 0 ? fmtUsd(avgFob) : '—'}</p>
            </div>

            {/* Gap indicator */}
            <div className={`rounded-xl border px-5 py-3 text-center ${
              gap === null ? 'bg-slate-50 border-slate-200' :
              gap > 0 ? 'bg-red-50 border-red-200' :
              gap < 0 ? 'bg-emerald-50 border-emerald-200' :
              'bg-slate-50 border-slate-200'
            }`}>
              <p className="text-xs font-medium mb-1" style={{ color: gap === null ? '#94a3b8' : gap > 0 ? '#dc2626' : '#059669' }}>
                {gap === null ? 'Gap vs Target' : gap > 0 ? 'OVER TARGET' : gap < 0 ? 'UNDER TARGET' : 'ON TARGET'}
              </p>
              <div className="flex items-center justify-center gap-1.5">
                {gap !== null && (
                  gap > 0 ? <TrendingUp size={18} className="text-red-500" /> :
                  gap < 0 ? <TrendingDown size={18} className="text-emerald-500" /> :
                  <Minus size={18} className="text-slate-400" />
                )}
                <p className={`text-2xl font-bold font-mono ${
                  gap === null ? 'text-slate-300' :
                  gap > 0 ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  {gap !== null ? `${gap > 0 ? '+' : ''}${fmtUsd(gap)}` : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost breakdown table with % analysis */}
      <div className="section-card overflow-x-auto">
        <div className="section-card-header">
          <h3 className="text-sm font-semibold text-slate-700">Cost Breakdown per Piece (USD)</h3>
          <span className="text-xs text-slate-400">% of FOB shown for avg across sizes</span>
        </div>
        <table className="grid-table w-full" style={{ minWidth: `${300 + sizes.length * 100}px` }}>
          <thead>
            <tr>
              <th className="min-w-[160px]">Component</th>
              <th className="num min-w-[70px]">Avg</th>
              <th className="min-w-[100px]">% of FOB</th>
              {sizes.map((s) => <th key={s} className="num min-w-[95px]">{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {SECTION_ROWS.map(({ key, label, color, bg }) => {
              const avg = avgByKey(key);
              const avgFobLocal = avgByKey('fob');
              const pctVal = pct(avg, avgFobLocal);
              return (
                <tr key={key}>
                  <td className="py-2 px-3">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs font-medium text-slate-700">{label}</span>
                    </span>
                  </td>
                  <td className="text-right font-mono text-xs tabular-nums py-2 px-2" style={{ color: avg > 0 ? color : '#e2e8f0' }}>
                    {avg > 0 ? fmtUsd(avg) : '—'}
                  </td>
                  <td className="py-2 px-3">
                    {pctVal != null ? (
                      <div className="flex items-center gap-2">
                        <PctBar value={avg} max={maxSectionVal} color={color} />
                        <span className="text-xs font-mono text-slate-500">{pctVal.toFixed(1)}%</span>
                      </div>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  {sizes.map((s) => {
                    const val = fobSummary?.[s]?.[key];
                    return (
                      <td key={s} className="text-right font-mono text-xs tabular-nums py-2 px-3" style={{ color: val > 0 ? color : '#e2e8f0' }}>
                        {val != null && val > 0 ? fmtUsd(val) : '—'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Sub-total */}
            <tr className="total-row">
              <td colSpan={2} className="text-xs font-bold text-slate-700 uppercase tracking-wide py-2.5 px-3">Sub-Total</td>
              <td className="py-2.5 px-3">
                {avgFob > 0 && (
                  <span className="text-xs font-mono text-slate-500">
                    {pct(avgByKey('subTotal'), avgFob)?.toFixed(1)}%
                  </span>
                )}
              </td>
              {sizes.map((s) => (
                <td key={s} className="text-right font-mono font-bold text-slate-700 tabular-nums text-xs py-2.5 px-3">
                  {fobSummary?.[s]?.subTotal != null ? fmtUsd(fobSummary[s].subTotal) : '—'}
                </td>
              ))}
            </tr>

            {/* Settlement */}
            <tr>
              <td className="py-2 px-3">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-violet-400 flex-shrink-0" />
                  <span className="text-xs font-medium text-violet-600">Commercial Charges</span>
                </span>
              </td>
              <td className="text-right font-mono text-xs tabular-nums text-violet-600 py-2 px-2">
                {avgByKey('settlement') > 0 ? fmtUsd(avgByKey('settlement')) : '—'}
              </td>
              <td className="py-2 px-3">
                {fobSummary?.[sizes[0]]?.commPct > 0 && (
                  <span className="text-xs font-mono text-violet-500">
                    {(fobSummary[sizes[0]].commPct * 100).toFixed(2)}% of FOB
                  </span>
                )}
              </td>
              {sizes.map((s) => (
                <td key={s} className="text-right font-mono text-xs tabular-nums text-violet-500 py-2 px-3">
                  {fobSummary?.[s]?.settlement > 0 ? fmtUsd(fobSummary[s].settlement) : '—'}
                </td>
              ))}
            </tr>

            {/* FOB total */}
            <tr className="fob-row">
              <td className="text-xs font-bold uppercase tracking-wider py-3 px-3">TOTAL FOB</td>
              <td className="text-right font-mono font-bold text-sm py-3 px-2 text-emerald-300">
                {avgFob > 0 ? fmtUsd(avgFob) : '—'}
              </td>
              <td className="py-3 px-3">
                {targetNum > 0 && avgFob > 0 && (
                  <span className={`text-xs font-mono font-bold ${gap > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {gap > 0 ? '+' : ''}{fmtUsd(gap)} vs target
                  </span>
                )}
              </td>
              {sizes.map((s) => (
                <td key={s} className="text-right font-mono font-bold text-sm tabular-nums py-3 px-3 text-emerald-300">
                  {fobSummary?.[s]?.fob != null ? fmtUsd(fobSummary[s].fob) : '—'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Shipment */}
      {costing.shipment && (
        <div className="section-card overflow-x-auto">
          <div className="section-card-header">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Ship size={14} className="text-slate-500" /> Shipment & Landed Cost
            </h3>
          </div>
          <div className="grid grid-cols-4 gap-0 border-b border-slate-100">
            {[
              { label: 'Total Qty', value: `${totalQty.toLocaleString()} pcs` },
              { label: 'Total Cartons', value: shipmentCalc?.totalCartons != null ? shipmentCalc.totalCartons.toLocaleString() : '—' },
              { label: 'Total CBM', value: shipmentCalc?.totalCbm != null ? `${Number(shipmentCalc.totalCbm).toFixed(3)} m³` : '—' },
              { label: 'Freight / pc', value: shipmentCalc?.freightPerPiece != null ? fmtUsd(shipmentCalc.freightPerPiece) : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="px-5 py-3 border-r border-slate-100 last:border-0 text-center">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          <table className="grid-table w-full">
            <thead>
              <tr>
                <th className="min-w-[80px]">Size</th>
                <th className="num">Order Qty</th>
                <th className="num">FOB Cost</th>
                <th className="num">Freight/pc</th>
                <th className="num">Landed Cost</th>
              </tr>
            </thead>
            <tbody>
              {sizes.map((s) => (
                <tr key={s}>
                  <td className="font-semibold text-slate-700 py-2 px-3">{s}</td>
                  <td className="text-right font-mono py-2 px-3">{Number(orderQty[s] || 0).toLocaleString()}</td>
                  <td className="text-right font-mono text-indigo-600 py-2 px-3">
                    {fobSummary?.[s]?.fob != null ? fmtUsd(fobSummary[s].fob) : '—'}
                  </td>
                  <td className="text-right font-mono py-2 px-3">
                    {shipmentCalc?.freightPerPiece != null ? fmtUsd(shipmentCalc.freightPerPiece) : '—'}
                  </td>
                  <td className="text-right font-mono font-bold text-emerald-700 py-2 px-3">
                    {shipmentCalc?.landedCostPerSize?.[s] != null ? fmtUsd(shipmentCalc.landedCostPerSize[s]) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {costing.notes && (
        <div className="card">
          <div className="card-header"><h3 className="section-title">Notes</h3></div>
          <div className="card-body text-sm text-slate-700 whitespace-pre-wrap">{costing.notes}</div>
        </div>
      )}
    </div>
  );
}
