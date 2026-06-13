import { useState, useEffect } from 'react';
import { Scissors, Calculator, Edit2, Info } from 'lucide-react';
import api from '../../../lib/api';
import { fmtUsd, fmtPct } from '../../../lib/utils';
import { useSectionAutoSave } from '../../../hooks/useSectionAutoSave';
import SaveStatusIndicator from '../../../components/ui/SaveStatusIndicator';

export default function CmTab({ costing, sizes, onSaved, onLiveChange }) {
  const ex = costing.cm || {};
  const [mode, setMode] = useState(ex.cmMode || 'DIRECT_RATE');
  const [smv, setSmv] = useState(ex.smv || '');
  const [efficiency, setEfficiency] = useState(ex.lineEfficiency || '0.75');
  const [wageDay, setWageDay] = useState(ex.workerWageDay || '');
  const [workingMins, setWorkingMins] = useState(ex.workingMinsDay || 480);
  const [directRate, setDirectRate] = useState(ex.directCmRate || '');
  const [overheadPct, setOverheadPct] = useState(ex.overheadPct || '');
  const [compliancePct, setCompliancePct] = useState(ex.compliancePct || '');
  const [cmPerSize, setCmPerSize] = useState(ex.cmTopPerSize || {});

  const getCmData = () => ({
    cmMode: mode,
    smv: smv || null,
    lineEfficiency: efficiency,
    workerWageDay: wageDay || null,
    workingMinsDay: workingMins,
    directCmRate: directRate || null,
    overheadPct: overheadPct || 0,
    compliancePct: compliancePct || 0,
    cmTopPerSize: cmPerSize,
    cmBottomPerSize: {},
  });

  useEffect(() => { onLiveChange?.(getCmData()); }, [mode, smv, efficiency, wageDay, workingMins, directRate, overheadPct, compliancePct, cmPerSize]);

  // Base CM from SMV
  const smvBaseCm = mode === 'SMV_BASED' && smv && wageDay
    ? (Number(smv) / (Number(workingMins) * Number(efficiency || 0.75))) * Number(wageDay)
    : null;

  // Effective CM = base × (1 + overhead + compliance)
  const calcEffective = (base) => {
    const oh = Number(overheadPct || 0);
    const co = Number(compliancePct || 0);
    return base * (1 + oh + co);
  };

  const setCmSize = (size, val) => setCmPerSize((p) => ({ ...p, [size]: val }));

  const getBaseForSize = (size) => {
    const sizeOverride = Number(cmPerSize?.[size] || 0);
    if (sizeOverride > 0) return sizeOverride;
    if (mode === 'DIRECT_RATE') return Number(directRate || 0);
    return smvBaseCm || 0;
  };

  const saveStatus = useSectionAutoSave(
    () => api.put(`/costings/${costing.id}/cm`, getCmData()).then(onSaved),
    [mode, smv, efficiency, wageDay, workingMins, directRate, overheadPct, compliancePct, JSON.stringify(cmPerSize)]
  );

  const colMinWidth = Math.max(90, Math.floor(460 / Math.max(sizes.length, 1)));
  const ohVal = Number(overheadPct || 0);
  const coVal = Number(compliancePct || 0);
  const totalAddOn = ohVal + coVal;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-emerald-500 rounded-full" />
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Scissors size={15} className="text-emerald-500" /> Cut, Make & Trim (CM)
        </h2>
        <SaveStatusIndicator status={saveStatus} />
      </div>

      {/* Mode + base rate */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">CM Base Rate</h3>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={mode === 'DIRECT_RATE'} onChange={() => setMode('DIRECT_RATE')} className="accent-emerald-600" />
              <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <Edit2 size={13} className="text-emerald-500" /> Direct Rate
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={mode === 'SMV_BASED'} onChange={() => setMode('SMV_BASED')} className="accent-emerald-600" />
              <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                <Calculator size={13} className="text-indigo-500" /> SMV Based
              </span>
            </label>
          </div>
        </div>
        <div className="card-body space-y-4">
          {mode === 'DIRECT_RATE' && (
            <div className="flex items-end gap-4">
              <div className="w-56">
                <label className="field-label">CM Rate / pc (USD)</label>
                <input
                  type="number" step="0.0001"
                  value={directRate}
                  onChange={(e) => setDirectRate(e.target.value)}
                  className="input text-lg font-mono font-bold"
                  placeholder="0.0000"
                />
              </div>
              {directRate && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
                  <p className="text-xs text-emerald-600 font-medium mb-0.5">Base CM</p>
                  <p className="font-bold font-mono text-emerald-700 text-xl">{fmtUsd(Number(directRate))}</p>
                </div>
              )}
            </div>
          )}

          {mode === 'SMV_BASED' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'SMV (Standard Minutes)', val: smv, set: setSmv, placeholder: '24.69', hint: 'Total minutes to make 1 pc' },
                  { label: 'Line Efficiency', val: efficiency, set: setEfficiency, placeholder: '0.75', hint: '75% = 0.75' },
                  { label: 'Worker Wage / Day ($)', val: wageDay, set: setWageDay, placeholder: '4.50', hint: 'Daily wage in USD' },
                  { label: 'Working Mins / Day', val: workingMins, set: setWorkingMins, placeholder: '480', hint: '8 hrs = 480 min' },
                ].map(({ label, val, set, placeholder, hint }) => (
                  <div key={label}>
                    <label className="field-label">{label}</label>
                    <input
                      type="number" step="0.01"
                      value={val}
                      onChange={(e) => set(e.target.value)}
                      className="input font-mono"
                      placeholder={placeholder}
                    />
                    <p className="text-xs text-slate-400 mt-0.5">{hint}</p>
                  </div>
                ))}
              </div>
              {smvBaseCm !== null && smvBaseCm > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-6">
                  <div>
                    <p className="text-xs text-emerald-700 font-medium">SMV Formula</p>
                    <p className="text-xs text-slate-500 mt-0.5">= ({smv} ÷ ({workingMins} × {efficiency})) × ${wageDay}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs text-emerald-600 font-medium mb-0.5">Base CM / pc</p>
                    <p className="text-2xl font-bold font-mono text-emerald-700">{fmtUsd(smvBaseCm)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Overhead + Compliance */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
            <Info size={13} className="text-slate-400" /> Overhead & Compliance (adds to CM)
          </h3>
          {totalAddOn > 0 && (
            <span className="text-xs font-mono text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              +{(totalAddOn * 100).toFixed(2)}% on CM
            </span>
          )}
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="field-label">Factory Overhead %</label>
              <div className="relative">
                <input
                  type="number" step="0.001" min="0" max="1"
                  value={overheadPct}
                  onChange={(e) => setOverheadPct(e.target.value)}
                  className="input font-mono pr-10"
                  placeholder="0.15 = 15%"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  {overheadPct ? fmtPct(overheadPct) : '%'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Utilities, depreciation, rent…</p>
            </div>
            <div>
              <label className="field-label">Compliance / Social %</label>
              <div className="relative">
                <input
                  type="number" step="0.001" min="0" max="1"
                  value={compliancePct}
                  onChange={(e) => setCompliancePct(e.target.value)}
                  className="input font-mono pr-10"
                  placeholder="0.05 = 5%"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  {compliancePct ? fmtPct(compliancePct) : '%'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Audit, certifications, CSR…</p>
            </div>
            {/* Effective CM preview */}
            {(mode === 'DIRECT_RATE' ? Number(directRate) : smvBaseCm) > 0 && (
              <div className="col-span-2 flex items-center gap-6 bg-slate-50 rounded-lg border border-slate-200 px-4 py-3">
                <div className="text-sm text-slate-600">
                  <span className="font-mono">{fmtUsd(mode === 'DIRECT_RATE' ? Number(directRate) : smvBaseCm)}</span>
                  <span className="text-slate-400 mx-1">×</span>
                  <span className="font-mono">(1 + {(totalAddOn * 100).toFixed(2)}%)</span>
                  <span className="text-slate-400 mx-1">=</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Effective CM / pc</p>
                  <p className="text-xl font-bold font-mono text-emerald-700">
                    {fmtUsd(calcEffective(mode === 'DIRECT_RATE' ? Number(directRate) : smvBaseCm || 0))}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Per-size CM override */}
      <div className="section-card overflow-x-auto">
        <div className="section-card-header">
          <h3 className="text-sm font-semibold text-slate-700">CM Override by Size</h3>
          <span className="text-xs text-slate-400">Optional — leave blank to use the global CM rate above</span>
        </div>
        <table className="grid-table w-full" style={{ minWidth: `${180 + sizes.length * colMinWidth}px` }}>
          <thead>
            <tr>
              <th className="min-w-[160px]">Row</th>
              {sizes.map((s) => (
                <th key={s} className="num" style={{ minWidth: colMinWidth }}>
                  <span className="text-emerald-600">{s}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-xs font-medium text-slate-600 py-1.5 px-2">
                CM Rate Override ($/pc)
              </td>
              {sizes.map((s) => (
                <td key={s}>
                  <input
                    type="number" step="0.0001"
                    value={cmPerSize?.[s] || ''}
                    onChange={(e) => setCmSize(s, e.target.value)}
                    className="cell-input"
                    placeholder={
                      mode === 'DIRECT_RATE' && directRate
                        ? Number(directRate).toFixed(4)
                        : smvBaseCm
                          ? smvBaseCm.toFixed(4)
                          : '0.0000'
                    }
                  />
                </td>
              ))}
            </tr>
            <tr className="total-row">
              <td className="text-xs font-bold text-emerald-700 uppercase tracking-wide py-2 px-2">
                Effective CM / pc
              </td>
              {sizes.map((s) => {
                const base = getBaseForSize(s);
                const eff = calcEffective(base);
                return (
                  <td key={s} className="text-right font-mono text-emerald-700 font-bold tabular-nums text-xs py-2 px-2">
                    {eff > 0 ? fmtUsd(eff) : '—'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
