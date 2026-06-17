import { TrendingUp, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { fmtUsd } from '../../lib/utils';

const SECTION_ORDER = [
  { key: 'fabric',        label: 'Fabric',   color: '#818cf8' },
  { key: 'trims',         label: 'Trims',    color: '#fbbf24' },
  { key: 'cm',            label: 'CM',       color: '#34d399' },
  { key: 'packaging',     label: 'Pack',     color: '#22d3ee' },
  { key: 'embellishment', label: 'Emb',      color: '#c084fc' },
  { key: 'wash',          label: 'Wash',     color: '#38bdf8' },
  { key: 'testing',       label: 'Test',     color: '#fb7185' },
  { key: 'settlement',    label: 'Settle',   color: '#a78bfa' },
];

export default function LiveFobBar({ liveFob, sizes }) {
  const [expanded, setExpanded] = useState(false);

  if (!sizes?.length) return null;

  const hasFob = sizes.some((s) => liveFob?.[s]?.fob > 0);

  return (
    <div className="fixed bottom-0 left-0 lg:left-60 right-0 z-50 bg-[#0b1120] border-t border-slate-700/80 shadow-2xl">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="absolute -top-7 right-4 bg-[#0b1120] border border-slate-700/80 border-b-0 px-3 py-1 rounded-t-lg text-slate-400 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
      >
        <TrendingUp size={11} />
        <span className="font-semibold tracking-wide">LIVE FOB</span>
        <ChevronUp size={11} className={`transition-transform ${expanded ? '' : 'rotate-180'}`} />
      </button>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="px-4 py-2 border-b border-slate-700/60 overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr>
                <th className="text-left text-slate-500 py-1 pr-4 font-medium">Component</th>
                {sizes.map((s) => (
                  <th key={s} className="text-right text-slate-500 py-1 px-2 font-medium min-w-[70px]">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SECTION_ORDER.map(({ key, label, color }) => (
                <tr key={key}>
                  <td className="py-0.5 pr-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                      <span style={{ color }}>{label}</span>
                    </span>
                  </td>
                  {sizes.map((s) => {
                    const val = liveFob?.[s]?.[key] || 0;
                    return (
                      <td key={s} className="text-right py-0.5 px-2 tabular-nums" style={{ color: val > 0 ? color : '#475569' }}>
                        {val > 0 ? fmtUsd(val) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t border-slate-700/60">
                <td className="py-1 pr-4 text-slate-400 font-medium">Sub Total</td>
                {sizes.map((s) => (
                  <td key={s} className="text-right py-1 px-2 tabular-nums text-slate-300 font-semibold">
                    {fmtUsd(liveFob?.[s]?.subTotal || 0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* FOB row — always visible */}
      <div className="flex items-center overflow-x-auto scrollbar-thin">
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 border-r border-slate-700/60 min-w-[120px]">
          <TrendingUp size={14} className="text-emerald-400" />
          <span className="text-emerald-400 font-bold text-xs tracking-widest uppercase">FOB / pc</span>
        </div>
        {sizes.map((s) => {
          const fobVal = liveFob?.[s]?.fob || 0;
          return (
            <div key={s} className="flex-shrink-0 px-4 py-2.5 border-r border-slate-700/60 min-w-[100px] text-right">
              <p className="text-[10px] text-slate-500 font-medium">{s}</p>
              <p className={`font-mono font-bold tabular-nums ${fobVal > 0 ? 'text-emerald-400 text-sm' : 'text-slate-600 text-sm'}`}>
                {fobVal > 0 ? fmtUsd(fobVal) : '—'}
              </p>
            </div>
          );
        })}
        <div className="flex-shrink-0 px-4 py-2.5 ml-auto">
          {hasFob && (
            <div className="text-right">
              <p className="text-[10px] text-slate-500">Avg FOB</p>
              <p className="font-mono font-bold text-sm text-white tabular-nums">
                {fmtUsd(sizes.reduce((s, sz) => s + (liveFob?.[sz]?.fob || 0), 0) / sizes.length)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
