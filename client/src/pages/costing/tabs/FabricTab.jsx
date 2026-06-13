import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Calculator, Edit2, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { calcFabricPrice, fmtUsd, fmt } from '../../../lib/utils';
import { useSectionAutoSave } from '../../../hooks/useSectionAutoSave';
import SaveStatusIndicator from '../../../components/ui/SaveStatusIndicator';

const emptyShell = (order) => ({
  shellOrder: order,
  shellName: '',
  application: '',
  mill: '',
  fabricationDetail: '',
  isDirectPrice: false,
  yarnCount: '',
  yarnPricePerKg: '',
  spandexPriceKg: '',
  spandexPct: '',
  yarnDyeingCost: '',
  knittingCost: '',
  dyeingFinishing: '',
  aopFinishing: '',
  wastagePct: '',
  directPricePerKg: '',
  consumptionPerSize: {},
});

const SECTION_COLOR = 'indigo';

function ShellCard({ shell, sizes, index, onDelete, onSave, onLiveChange }) {
  const [data, setData] = useState({ ...emptyShell(index + 1), ...shell });
  const [open, setOpen] = useState(!shell.id);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => {
    const next = { ...data, [k]: v };
    setData(next);
    onLiveChange?.(next);
  };
  const setConsumption = (size, v) => {
    const next = { ...data, consumptionPerSize: { ...data.consumptionPerSize, [size]: v } };
    setData(next);
    onLiveChange?.(next);
  };

  const livePrice = data.isDirectPrice
    ? Number(data.directPricePerKg || 0)
    : calcFabricPrice(data);

  const shellCost = (size) => {
    const c = Number(data.consumptionPerSize?.[size] || 0);
    return livePrice * c;
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post(`/costings/${shell.costingId || data.costingId}/shells`, {
        ...data,
        id: shell.id,
        fabricPricePerKg: livePrice,
      });
      toast.success('Shell saved');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const totalFabricCost = sizes.reduce((s, sz) => s + shellCost(sz), 0);

  return (
    <div className="section-card">
      {/* Shell header */}
      <div
        className="section-card-header cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">
              {data.shellName || `Fabric Shell ${index + 1}`}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {data.fabricationDetail || data.application || 'No details entered'}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {livePrice > 0 && (
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full text-xs font-mono font-semibold">
                {fmtUsd(livePrice, 4)}/kg
              </span>
            )}
            {totalFabricCost > 0 && (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-xs font-mono">
                avg {fmtUsd(sizes.length > 0 ? totalFabricCost / sizes.length : 0)}/pc
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="btn-icon text-slate-300 hover:text-red-500 hover:bg-red-50"
          >
            <Trash2 size={14} />
          </button>
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {open && (
        <div className="p-5 space-y-5 border-t border-slate-100">
          {/* Shell meta */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Shell Name', key: 'shellName', placeholder: 'e.g. Body S/J' },
              { label: 'Application', key: 'application', placeholder: 'e.g. FR+BK+SLV' },
              { label: 'Mill / Supplier', key: 'mill', placeholder: 'e.g. SM Knitwears' },
              { label: 'Fabrication', key: 'fabricationDetail', placeholder: 'e.g. CVC Fleece 280GSM' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="field-label">{label}</label>
                <input
                  value={data[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="input"
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>

          {/* Price mode toggle */}
          <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-200">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Fabric Price:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={!data.isDirectPrice} onChange={() => set('isDirectPrice', false)} className="accent-indigo-600" />
              <span className="text-sm flex items-center gap-1 text-slate-700">
                <Calculator size={13} className="text-indigo-500" /> Calculate from Yarn
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={data.isDirectPrice} onChange={() => set('isDirectPrice', true)} className="accent-indigo-600" />
              <span className="text-sm flex items-center gap-1 text-slate-700">
                <Edit2 size={13} className="text-emerald-500" /> Direct Price Entry
              </span>
            </label>
          </div>

          {/* Yarn inputs */}
          {!data.isDirectPrice && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Yarn Count', key: 'yarnCount', type: 'text', placeholder: '30/1' },
                { label: 'Yarn Price / kg ($)', key: 'yarnPricePerKg', type: 'number', placeholder: '0.0000' },
                { label: 'Spandex Price / kg ($)', key: 'spandexPriceKg', type: 'number', placeholder: '0.0000' },
                { label: 'Spandex % (0.05=5%)', key: 'spandexPct', type: 'number', placeholder: '0.05' },
                { label: 'Yarn Dyeing / kg ($)', key: 'yarnDyeingCost', type: 'number', placeholder: '0.00' },
                { label: 'Knitting Charge / kg ($)', key: 'knittingCost', type: 'number', placeholder: '0.28' },
                { label: 'Dyeing & Finishing / kg ($)', key: 'dyeingFinishing', type: 'number', placeholder: '2.20' },
                { label: 'AOP / Finishing / kg ($)', key: 'aopFinishing', type: 'number', placeholder: '0.00' },
                { label: 'Wastage % (0.165=16.5%)', key: 'wastagePct', type: 'number', placeholder: '0.165' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="field-label">{label}</label>
                  <input
                    type={type}
                    step={type === 'number' ? '0.0001' : undefined}
                    value={data[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className="input font-mono"
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <div className="flex items-end">
                <div className="w-full bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-indigo-600 font-medium mb-0.5">Calculated Price / kg</p>
                  <p className="font-bold font-mono text-indigo-800 text-xl">{fmtUsd(livePrice)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Direct price */}
          {data.isDirectPrice && (
            <div className="flex items-end gap-4">
              <div className="w-64">
                <label className="field-label">Fabric Price / kg (USD)</label>
                <input
                  type="number" step="0.0001"
                  value={data.directPricePerKg}
                  onChange={(e) => set('directPricePerKg', e.target.value)}
                  className="input text-xl font-mono font-bold"
                  placeholder="0.0000"
                />
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
                <p className="text-xs text-emerald-600 font-medium mb-0.5">Price / kg</p>
                <p className="font-bold font-mono text-emerald-800 text-xl">{fmtUsd(livePrice)}</p>
              </div>
            </div>
          )}

          {/* CAD Consumption per size */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="field-label m-0">CAD Consumption per Piece (kg)</span>
              <span className="text-xs text-slate-400">→ cost = price/kg × consumption</span>
            </div>
            <div className="overflow-x-auto">
              <table className="grid-table w-full">
                <thead>
                  <tr>
                    <th className="text-left min-w-[100px]">Size</th>
                    {sizes.map((s) => <th key={s} className="num min-w-[90px]">{s}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-xs text-slate-500 font-medium py-1.5 px-2">Consumption (kg)</td>
                    {sizes.map((size) => (
                      <td key={size} className="py-0.5 px-1">
                        <input
                          type="number" step="0.001"
                          value={data.consumptionPerSize?.[size] || ''}
                          onChange={(e) => setConsumption(size, e.target.value)}
                          className="cell-input"
                          placeholder="0.000"
                        />
                      </td>
                    ))}
                  </tr>
                  <tr className="total-row">
                    <td className="text-indigo-700 text-xs font-bold uppercase py-1.5 px-2">Shell Cost / pc</td>
                    {sizes.map((size) => (
                      <td key={size} className="text-right font-mono tabular-nums text-indigo-700 font-bold text-xs py-1.5 px-2">
                        {shellCost(size) > 0 ? fmtUsd(shellCost(size)) : '—'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={save} disabled={saving} className="btn-primary btn-sm">
              {saving ? 'Saving…' : 'Save Shell'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FabricTab({ costing, sizes, onSaved, onLiveChange }) {
  const [shells, setShells] = useState(costing.fabricShells || []);

  // Build live shells map for parent
  const updateParentLive = (updatedShells) => {
    onLiveChange?.(updatedShells);
  };

  const updateShell = (idx, shellData) => {
    setShells((prev) => {
      const next = prev.map((s, i) => i === idx ? { ...s, ...shellData } : s);
      updateParentLive(next);
      return next;
    });
  };

  const addShell = () => {
    const newShell = { ...emptyShell(shells.length + 1), costingId: costing.id, _new: true };
    setShells((prev) => [...prev, newShell]);
  };

  const deleteShell = async (shell, idx) => {
    if (shell.id) {
      await api.delete(`/costings/${costing.id}/shells/${shell.id}`).catch(() => {});
      toast.success('Shell deleted');
      onSaved();
    }
    setShells((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      updateParentLive(next);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-indigo-500 rounded-full" />
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers size={15} className="text-indigo-500" /> Fabric Cost Breakdown
          </h2>
          <span className="text-xs text-slate-400">({shells.length} shell{shells.length !== 1 ? 's' : ''})</span>
        </div>
        <button onClick={addShell} className="btn-secondary btn-sm">
          <Plus size={13} /> Add Shell
        </button>
      </div>

      {shells.length === 0 && (
        <div className="card p-10 text-center">
          <Layers size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No fabric shells yet.</p>
          <p className="text-slate-300 text-xs mb-4">Add your first shell, e.g. Body S/J, Cuff RIB</p>
          <button onClick={addShell} className="btn-primary btn-sm">
            <Plus size={13} /> Add First Shell
          </button>
        </div>
      )}

      {shells.map((shell, idx) => (
        <ShellCard
          key={shell.id || `new-${idx}`}
          shell={{ ...shell, costingId: costing.id }}
          sizes={sizes}
          index={idx}
          onDelete={() => deleteShell(shell, idx)}
          onSave={onSaved}
          onLiveChange={(shellData) => updateShell(idx, shellData)}
        />
      ))}
    </div>
  );
}
