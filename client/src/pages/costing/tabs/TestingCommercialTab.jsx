import { useState, useEffect } from 'react';
import { Plus, Trash2, FlaskConical, DollarSign } from 'lucide-react';
import api from '../../../lib/api';
import { fmtPct } from '../../../lib/utils';
import { useSectionAutoSave } from '../../../hooks/useSectionAutoSave'
import SaveStatusIndicator from '../../../components/ui/SaveStatusIndicator';

export default function TestingCommercialTab({ costing, sizes, onSaved, onLiveChange, startSection }) {
  const [testingCost, setTestingCost] = useState(costing.testing?.costPerSize || {});
  const [testingNotes, setTestingNotes] = useState(costing.testing?.notes || '');
  const [comm, setComm] = useState(costing.commercial || {
    buyingHouseCommPct: '', factoryCommPct: '', profitMarginPct: '', otherCharges: [],
  });

  useEffect(() => {
    onLiveChange?.(
      { costPerSize: testingCost, notes: testingNotes },
      comm
    );
  }, [testingCost, testingNotes, comm]);

  const setOther = (idx, key, val) =>
    setComm((p) => ({
      ...p,
      otherCharges: (p.otherCharges || []).map((o, i) => i === idx ? { ...o, [key]: val } : o),
    }));

  const totalCommPct =
    Number(comm.buyingHouseCommPct || 0) +
    Number(comm.factoryCommPct || 0) +
    Number(comm.profitMarginPct || 0) +
    (comm.otherCharges || []).reduce((s, o) => s + Number(o.pct || 0), 0);

  const testingSaveStatus = useSectionAutoSave(
    () => api.put(`/costings/${costing.id}/testing`, { costPerSize: testingCost, notes: testingNotes }).then(onSaved),
    [testingCost, testingNotes]
  );

  const commSaveStatus = useSectionAutoSave(
    () => api.put(`/costings/${costing.id}/commercial`, comm).then(onSaved),
    [comm]
  );

  const colCount = Math.min(sizes.length, 6);

  return (
    <div className="space-y-5">
      {/* Testing */}
      {startSection !== 'commercial' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-rose-500 rounded-full" />
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FlaskConical size={15} className="text-rose-500" /> Testing & Compliance Cost (USD/pc)
            </h2>
            <SaveStatusIndicator status={testingSaveStatus} />
          </div>

          <div className="card">
            <div className="card-body space-y-4">
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${colCount}, minmax(80px, 1fr))` }}>
                {sizes.map((size) => (
                  <div key={size}>
                    <label className="field-label text-center block">{size}</label>
                    <input
                      type="number" step="0.0001"
                      value={testingCost?.[size] || ''}
                      onChange={(e) => setTestingCost((p) => ({ ...p, [size]: e.target.value }))}
                      className="input text-center font-mono"
                      placeholder="0.0000"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="field-label">Notes / Compliance Standards</label>
                <input
                  value={testingNotes}
                  onChange={(e) => setTestingNotes(e.target.value)}
                  className="input"
                  placeholder="e.g. EN71, REACH, Oeko-Tex, ASTM…"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Commercial / Settlement */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-violet-500 rounded-full" />
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <DollarSign size={15} className="text-violet-500" /> Commercial & Settlement Discount
          </h2>
          <SaveStatusIndicator status={commSaveStatus} />
        </div>

        <div className="card">
          <div className="card-body space-y-5">
            {/* Main percentages */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Buying House Commission', key: 'buyingHouseCommPct', placeholder: '0.033 = 3.3%' },
                { label: 'Factory Commission', key: 'factoryCommPct', placeholder: '0.012 = 1.2%' },
                { label: 'Profit Margin', key: 'profitMarginPct', placeholder: '0.015 = 1.5%' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="field-label">{label}</label>
                  <div className="relative">
                    <input
                      type="number" step="0.001" max="1"
                      value={comm[key] || ''}
                      onChange={(e) => setComm((p) => ({ ...p, [key]: e.target.value }))}
                      className="input font-mono pr-12"
                      placeholder={placeholder}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                      {comm[key] ? fmtPct(comm[key]) : '%'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Other charges */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="field-label m-0">Other Charges</label>
                <button
                  type="button"
                  onClick={() => setComm((p) => ({ ...p, otherCharges: [...(p.otherCharges || []), { label: '', pct: '' }] }))}
                  className="btn-secondary btn-xs"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className="space-y-2">
                {(comm.otherCharges || []).map((o, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      value={o.label}
                      onChange={(e) => setOther(idx, 'label', e.target.value)}
                      className="input flex-1"
                      placeholder="e.g. Bank Charge, Survey Fee"
                    />
                    <div className="relative w-36 flex-shrink-0">
                      <input
                        type="number" step="0.001"
                        value={o.pct}
                        onChange={(e) => setOther(idx, 'pct', e.target.value)}
                        className="input font-mono pr-10"
                        placeholder="0.005"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        {o.pct ? fmtPct(o.pct) : '%'}
                      </span>
                    </div>
                    <button
                      onClick={() => setComm((p) => ({ ...p, otherCharges: p.otherCharges.filter((_, i) => i !== idx) }))}
                      className="btn-icon text-slate-300 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Total settlement */}
            <div className={`rounded-xl px-5 py-4 flex items-center justify-between ${totalCommPct > 0 ? 'bg-violet-50 border border-violet-200' : 'bg-slate-50 border border-slate-200'}`}>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-0.5">Total Settlement Discount</p>
                <p className={`text-3xl font-bold font-mono ${totalCommPct > 0 ? 'text-violet-700' : 'text-slate-300'}`}>
                  {(totalCommPct * 100).toFixed(2)}%
                </p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>Applied on Sub-Total</p>
                <p className="text-slate-300">= Sub-Total × {(totalCommPct * 100).toFixed(2)}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
