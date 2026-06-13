import { useState, useEffect } from 'react';
import { Plus, Trash2, Sparkles, Droplets } from 'lucide-react';
import api from '../../../lib/api';
import { fmtUsd } from '../../../lib/utils';
import { useSectionAutoSave } from '../../../hooks/useSectionAutoSave'
import SaveStatusIndicator from '../../../components/ui/SaveStatusIndicator';

function SectionTable({ title, icon: Icon, color, textColor, items, setItems, sizes, nameKey, placeholder, saveStatus }) {
  const setCost = (idx, size, val) =>
    setItems((prev) =>
      prev.map((p, i) => i === idx ? { ...p, costPerSize: { ...p.costPerSize, [size]: val } } : p)
    );

  const setName = (idx, val) =>
    setItems((prev) => prev.map((p, i) => i === idx ? { ...p, [nameKey]: val } : p));

  const totalPerSize = (size) =>
    items.reduce((s, p) => s + Number(p.costPerSize?.[size] || 0), 0);

  const colMinWidth = Math.max(80, Math.floor(500 / Math.max(sizes.length, 1)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-1 h-5 rounded-full`} style={{ backgroundColor: color }} />
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Icon size={15} style={{ color }} /> {title}
          </h3>
          <SaveStatusIndicator status={saveStatus} />
        </div>
        <button
          onClick={() => setItems((p) => [...p, { [nameKey]: '', costPerSize: {} }])}
          className="btn-secondary btn-sm"
        >
          <Plus size={13} /> Add
        </button>
      </div>

      <div className="section-card overflow-x-auto">
        <table className="grid-table w-full" style={{ minWidth: `${220 + sizes.length * colMinWidth}px` }}>
          <thead>
            <tr>
              <th className="min-w-[200px]">Name</th>
              {sizes.map((s) => (
                <th key={s} className="num" style={{ minWidth: colMinWidth }}>
                  <span style={{ color }}>{s}</span>
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
                    value={item[nameKey]}
                    onChange={(e) => setName(idx, e.target.value)}
                    className="cell-input-left"
                    placeholder={placeholder}
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
              <td className="text-xs font-bold uppercase tracking-wide py-2 px-2" style={{ color }}>
                Total / pc
              </td>
              {sizes.map((s) => {
                const total = totalPerSize(s);
                return (
                  <td key={s} className="text-right font-mono font-bold tabular-nums text-xs py-2 px-2" style={{ color: total > 0 ? color : undefined }}>
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

export default function EmbellishmentWashTab({ costing, sizes, onSaved, onLiveChange }) {
  const [embellishments, setEmbellishments] = useState(
    costing.embellishments?.length ? costing.embellishments : [{ name: 'Print Cost', costPerSize: {} }]
  );
  const [washes, setWashes] = useState(
    costing.washes?.length ? costing.washes : [{ washType: 'Garment Wash', costPerSize: {} }]
  );

  useEffect(() => { onLiveChange?.(embellishments, washes); }, [embellishments, washes]);

  const embSaveStatus = useSectionAutoSave(
    () => api.put(`/costings/${costing.id}/embellishments`, { items: embellishments }).then(onSaved),
    [embellishments]
  );

  const washSaveStatus = useSectionAutoSave(
    () => api.put(`/costings/${costing.id}/wash`, { items: washes }).then(onSaved),
    [washes]
  );

  return (
    <div className="space-y-6">
      <SectionTable
        title="Embellishment (Print / Embroidery / AOP)"
        icon={Sparkles}
        color="#a855f7"
        items={embellishments}
        setItems={setEmbellishments}
        sizes={sizes}
        nameKey="name"
        placeholder="e.g. Screen Print, Embroidery"
        saveStatus={embSaveStatus}
      />
      <SectionTable
        title="Wash Details"
        icon={Droplets}
        color="#0ea5e9"
        items={washes}
        setItems={setWashes}
        sizes={sizes}
        nameKey="washType"
        placeholder="e.g. Enzyme Wash, Stone Wash"
        saveStatus={washSaveStatus}
      />
    </div>
  );
}
