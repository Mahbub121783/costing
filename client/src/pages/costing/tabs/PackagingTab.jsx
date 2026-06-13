import { useState, useEffect } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import api from '../../../lib/api';
import { fmtUsd } from '../../../lib/utils';
import { useSectionAutoSave } from '../../../hooks/useSectionAutoSave'
import SaveStatusIndicator from '../../../components/ui/SaveStatusIndicator';

const DEFAULT_PACKAGING = [
  { itemName: 'Hang Tag', costPerSize: {} },
  { itemName: 'Poly Bag', costPerSize: {} },
  { itemName: 'Carton', costPerSize: {} },
  { itemName: 'Carton Sticker', costPerSize: {} },
  { itemName: 'Tag Pin + Scotch Tape + Gum Tape', costPerSize: {} },
];

export default function PackagingTab({ costing, sizes, onSaved, onLiveChange }) {
  const [items, setItems] = useState(
    costing.packaging?.length ? costing.packaging : DEFAULT_PACKAGING
  );

  useEffect(() => { onLiveChange?.(items); }, [items]);

  const setItem = (idx, key, val) =>
    setItems((prev) => prev.map((p, i) => i === idx ? { ...p, [key]: val } : p));

  const setCost = (idx, size, val) =>
    setItems((prev) =>
      prev.map((p, i) => i === idx ? { ...p, costPerSize: { ...p.costPerSize, [size]: val } } : p)
    );

  const totalPerSize = (size) =>
    items.reduce((s, p) => s + Number(p.costPerSize?.[size] || 0), 0);

  const saveStatus = useSectionAutoSave(
    () => api.put(`/costings/${costing.id}/packaging`, { items }).then(onSaved),
    [items]
  );

  const colMinWidth = Math.max(80, Math.floor(500 / Math.max(sizes.length, 1)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-cyan-500 rounded-full" />
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Package size={15} className="text-cyan-500" /> Packaging
          </h2>
          <SaveStatusIndicator status={saveStatus} />
        </div>
        <button
          onClick={() => setItems((p) => [...p, { itemName: '', costPerSize: {} }])}
          className="btn-secondary btn-sm"
        >
          <Plus size={13} /> Add Row
        </button>
      </div>

      <div className="section-card overflow-x-auto">
        <table className="grid-table w-full" style={{ minWidth: `${250 + sizes.length * colMinWidth}px` }}>
          <thead>
            <tr>
              <th className="min-w-[220px]">Packaging Item</th>
              {sizes.map((s) => (
                <th key={s} className="num" style={{ minWidth: colMinWidth }}>
                  <span className="text-cyan-600">{s}</span>
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    value={item.itemName}
                    onChange={(e) => setItem(idx, 'itemName', e.target.value)}
                    className="cell-input-left"
                    placeholder="Item name"
                  />
                </td>
                {sizes.map((size) => (
                  <td key={size}>
                    <input
                      type="number" step="0.0001"
                      value={item.costPerSize?.[size] || ''}
                      onChange={(e) => setCost(idx, size, e.target.value)}
                      className="cell-input"
                      placeholder="0.0000"
                    />
                  </td>
                ))}
                <td>
                  <button
                    onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                    className="btn-icon text-slate-300 hover:text-red-500 hover:bg-red-50 w-6 h-6"
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
            <tr className="total-row">
              <td className="text-xs font-bold text-cyan-700 uppercase tracking-wide py-2 px-2">
                Total Packaging / pc
              </td>
              {sizes.map((s) => {
                const total = totalPerSize(s);
                return (
                  <td key={s} className="text-right font-mono text-cyan-700 font-bold tabular-nums text-xs py-2 px-2">
                    {total > 0 ? fmtUsd(total) : '—'}
                  </td>
                );
              })}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
