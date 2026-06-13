import { useState } from 'react';
import { Ship } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { fmtUsd } from '../../../lib/utils';
import { useSectionAutoSave } from '../../../hooks/useSectionAutoSave'
import SaveStatusIndicator from '../../../components/ui/SaveStatusIndicator';

export default function ShipmentTab({ costing, sizes, fobSummary, onSaved }) {
  const ex = costing.shipment || {};
  const [qty, setQty] = useState(ex.orderQtyPerSize || {});
  const [pcsPerCarton, setPcsPerCarton] = useState(ex.pcsPerCarton || '');
  const [cartonCbm, setCartonCbm] = useState(ex.cartonCbm || '');
  const [cartonGw, setCartonGw] = useState(ex.cartonGwKg || '');
  const [freightMode, setFreightMode] = useState(ex.freightMode || 'SEA');
  const [freightRate, setFreightRate] = useState(ex.freightRateUsd || '');
  const [freightUnit, setFreightUnit] = useState(ex.freightUnit || 'PER_CBM');
  const [insurancePct, setInsurancePct] = useState(ex.insurancePct || '');
  const [importDuty, setImportDuty] = useState(ex.importDutyPct || '');
  const [result, setResult] = useState(costing.shipment || null);

  const totalQty = Object.values(qty).reduce((s, v) => s + Number(v || 0), 0);
  const totalCartons = pcsPerCarton ? Math.ceil(totalQty / Number(pcsPerCarton)) : 0;
  const totalCbm = (totalCartons * Number(cartonCbm || 0)).toFixed(4);

  const getBody = () => ({
    orderQtyPerSize: qty,
    pcsPerCarton: Number(pcsPerCarton),
    cartonCbm: Number(cartonCbm),
    cartonGwKg: Number(cartonGw),
    freightMode,
    freightRateUsd: Number(freightRate),
    freightUnit,
    insurancePct: Number(insurancePct || 0),
    importDutyPct: Number(importDuty || 0),
  });

  const saveStatus = useSectionAutoSave(
    async () => {
      const res = await api.put(`/costings/${costing.id}/shipment`, getBody());
      setResult(res.data.data);
      onSaved();
    },
    [qty, pcsPerCarton, cartonCbm, cartonGw, freightMode, freightRate, freightUnit, insurancePct, importDuty]
  );

  const colMinWidth = Math.max(90, Math.floor(500 / Math.max(sizes.length, 1)));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-slate-500 rounded-full" />
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Ship size={15} className="text-slate-500" /> Shipment & Quantity
        </h2>
        <SaveStatusIndicator status={saveStatus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Carton details */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Carton Details</h3>
          </div>
          <div className="card-body space-y-3">
            {[
              { label: 'Pieces per Carton', val: pcsPerCarton, set: setPcsPerCarton, placeholder: '12' },
              { label: 'Carton CBM (m³)', val: cartonCbm, set: setCartonCbm, placeholder: '0.065' },
              { label: 'Carton G.W. (kg)', val: cartonGw, set: setCartonGw, placeholder: '8.00' },
            ].map(({ label, val, set, placeholder }) => (
              <div key={label}>
                <label className="field-label">{label}</label>
                <input
                  type="number" step="0.0001"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  className="input font-mono"
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Freight */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Freight & Duty</h3>
          </div>
          <div className="card-body space-y-3">
            <div>
              <label className="field-label">Freight Mode</label>
              <select value={freightMode} onChange={(e) => setFreightMode(e.target.value)} className="input">
                <option value="SEA">Sea Freight</option>
                <option value="AIR">Air Freight</option>
                <option value="ROAD">Road Transport</option>
                <option value="COURIER">Courier</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="field-label">Rate (USD)</label>
                <input type="number" step="0.01" value={freightRate} onChange={(e) => setFreightRate(e.target.value)} className="input font-mono" placeholder="0.00" />
              </div>
              <div>
                <label className="field-label">Rate Unit</label>
                <select value={freightUnit} onChange={(e) => setFreightUnit(e.target.value)} className="input">
                  <option value="PER_CBM">Per CBM</option>
                  <option value="PER_KG">Per KG</option>
                  <option value="PER_PIECE">Per Piece</option>
                  <option value="LUMP_SUM">Lump Sum</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="field-label">Insurance %</label>
                <input type="number" step="0.001" value={insurancePct} onChange={(e) => setInsurancePct(e.target.value)} className="input font-mono" placeholder="0.005" />
              </div>
              <div>
                <label className="field-label">Import Duty %</label>
                <input type="number" step="0.001" value={importDuty} onChange={(e) => setImportDuty(e.target.value)} className="input font-mono" placeholder="0.12" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Shipment Summary</h3>
          </div>
          <div className="card-body space-y-3">
            {[
              { label: 'Total Qty', value: `${totalQty.toLocaleString()} pcs` },
              { label: 'Total Cartons', value: totalCartons > 0 ? totalCartons.toLocaleString() : '—' },
              { label: 'Total CBM', value: Number(totalCbm) > 0 ? `${totalCbm} m³` : '—' },
              { label: 'Freight / pc', value: result?.freightPerPiece > 0 ? fmtUsd(result.freightPerPiece) : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-xs text-slate-500">{label}</span>
                <span className="font-mono font-semibold text-slate-800 text-sm">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order Qty per size */}
      <div className="section-card overflow-x-auto">
        <div className="section-card-header">
          <h3 className="text-sm font-semibold text-slate-700">Order Quantity by Size</h3>
          {totalQty > 0 && (
            <span className="bg-slate-100 text-slate-700 text-xs font-mono font-semibold px-2.5 py-1 rounded-full">
              Total: {totalQty.toLocaleString()} pcs
            </span>
          )}
        </div>
        <table className="grid-table w-full" style={{ minWidth: `${150 + sizes.length * colMinWidth}px` }}>
          <thead>
            <tr>
              <th className="min-w-[120px]">Item</th>
              {sizes.map((s) => <th key={s} className="num" style={{ minWidth: colMinWidth }}>{s}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-xs text-slate-600 font-medium py-1.5 px-2">Order Qty (pcs)</td>
              {sizes.map((size) => (
                <td key={size}>
                  <input
                    type="number"
                    value={qty?.[size] || ''}
                    onChange={(e) => setQty((p) => ({ ...p, [size]: e.target.value }))}
                    className="cell-input"
                    placeholder="0"
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Landed cost preview */}
      {result && fobSummary && (
        <div className="section-card overflow-x-auto">
          <div className="section-card-header">
            <h3 className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
              <Ship size={14} className="text-emerald-500" /> Landed Cost per Size
            </h3>
          </div>
          <table className="grid-table w-full">
            <thead>
              <tr>
                <th className="min-w-[140px]">Cost Item</th>
                {sizes.map((s) => <th key={s} className="num">{s}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-xs font-medium py-1.5 px-2">FOB Cost</td>
                {sizes.map((s) => (
                  <td key={s} className="text-right font-mono tabular-nums text-xs text-slate-700 py-1.5 px-2">
                    {fobSummary[s]?.fob != null ? fmtUsd(fobSummary[s].fob) : '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="text-xs font-medium py-1.5 px-2">Freight / pc</td>
                {sizes.map((s) => (
                  <td key={s} className="text-right font-mono tabular-nums text-xs text-slate-700 py-1.5 px-2">
                    {fmtUsd(result.freightPerPiece || 0)}
                  </td>
                ))}
              </tr>
              <tr className="fob-row">
                <td className="text-xs font-bold uppercase tracking-wide py-2.5 px-2">Landed Cost</td>
                {sizes.map((s) => (
                  <td key={s} className="text-right font-mono tabular-nums font-bold text-sm py-2.5 px-2 text-emerald-300">
                    {result.landedCostPerSize?.[s] != null ? fmtUsd(result.landedCostPerSize[s]) : '—'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
