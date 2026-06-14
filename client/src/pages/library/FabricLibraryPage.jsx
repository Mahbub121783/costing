import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { calcFabricPrice, fmtUsd } from '../../lib/utils';

const empty = () => ({
  name: '', fabricationDetail: '', composition: '', gsm: '', supplier: '',
  isDirectPrice: false,
  yarnCount: '', yarnPricePerKg: '', spandexPriceKg: '', spandexPercentage: '',
  yarnDyeingCost: '', knittingCost: '', dyeingFinishing: '', aopFinishing: '', wastagePct: '',
  directPricePerKg: '',
});

export default function FabricLibraryPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(empty());
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/fabric-library', { params: { search } });
      setItems(data.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to load fabric library'); }
  };

  useEffect(() => { load(); }, [search]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const livePrice = form.isDirectPrice
    ? Number(form.directPricePerKg || 0)
    : calcFabricPrice({ ...form, spandexPct: form.spandexPercentage, wastagePct: form.wastagePct });

  const save = async () => {
    try {
      if (editing) { await api.put(`/fabric-library/${editing}`, form); toast.success('Updated'); }
      else { await api.post('/fabric-library', form); toast.success('Added to library'); }
      setForm(empty()); setEditing(null); setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const del = async (id) => {
    if (!confirm('Remove this fabric from library?')) return;
    try {
      await api.delete(`/fabric-library/${id}`);
      toast.success('Removed from library');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to remove'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Fabric Library</h1>
        <button onClick={() => { setShowForm(!showForm); setForm(empty()); setEditing(null); }} className="btn-primary btn-sm">
          <Plus size={14} /> Add Fabric
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header"><h2 className="section-title">{editing ? 'Edit' : 'New'} Fabric</h2></div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className="label">Fabric Name *</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} className="input" placeholder="e.g. CVC Fleece 280GSM" />
              </div>
              <div>
                <label className="label">GSM</label>
                <input type="number" value={form.gsm} onChange={(e) => set('gsm', e.target.value)} className="input" placeholder="280" />
              </div>
              <div>
                <label className="label">Supplier</label>
                <input value={form.supplier} onChange={(e) => set('supplier', e.target.value)} className="input" />
              </div>
              <div className="col-span-2">
                <label className="label">Fabrication Detail</label>
                <input value={form.fabricationDetail} onChange={(e) => set('fabricationDetail', e.target.value)} className="input" placeholder="e.g. 80/20 CVC FLEECE" />
              </div>
              <div className="col-span-2">
                <label className="label">Composition</label>
                <input value={form.composition} onChange={(e) => set('composition', e.target.value)} className="input" placeholder="e.g. 80% Cotton 20% Polyester" />
              </div>
            </div>

            <div className="flex items-center gap-4 bg-gray-50 px-4 py-3 rounded-lg">
              <span className="text-sm font-medium">Price Mode:</span>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" checked={!form.isDirectPrice} onChange={() => set('isDirectPrice', false)} />
                <Calculator size={13} /> Calculate from Yarn
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="radio" checked={form.isDirectPrice} onChange={() => set('isDirectPrice', true)} />
                Direct Price
              </label>
            </div>

            {!form.isDirectPrice ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="label">Yarn Count</label><input value={form.yarnCount} onChange={(e) => set('yarnCount', e.target.value)} className="input" /></div>
                <div><label className="label">Yarn Price/kg</label><input type="number" step="0.0001" value={form.yarnPricePerKg} onChange={(e) => set('yarnPricePerKg', e.target.value)} className="input" /></div>
                <div><label className="label">Spandex Price/kg</label><input type="number" step="0.0001" value={form.spandexPriceKg} onChange={(e) => set('spandexPriceKg', e.target.value)} className="input" /></div>
                <div><label className="label">Spandex %</label><input type="number" step="0.01" value={form.spandexPercentage} onChange={(e) => set('spandexPercentage', e.target.value)} className="input" placeholder="0.05" /></div>
                <div><label className="label">Yarn Dyeing/kg</label><input type="number" step="0.0001" value={form.yarnDyeingCost} onChange={(e) => set('yarnDyeingCost', e.target.value)} className="input" /></div>
                <div><label className="label">Knitting/kg</label><input type="number" step="0.0001" value={form.knittingCost} onChange={(e) => set('knittingCost', e.target.value)} className="input" /></div>
                <div><label className="label">Dyeing & Finishing/kg</label><input type="number" step="0.0001" value={form.dyeingFinishing} onChange={(e) => set('dyeingFinishing', e.target.value)} className="input" /></div>
                <div><label className="label">Wastage %</label><input type="number" step="0.001" value={form.wastagePct} onChange={(e) => set('wastagePct', e.target.value)} className="input" placeholder="0.165" /></div>
                <div className="col-span-2 flex items-center gap-3 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                  <span className="text-xs text-gray-500">Calculated:</span>
                  <span className="text-lg font-bold font-mono text-green-700">{fmtUsd(livePrice)}/kg</span>
                </div>
              </div>
            ) : (
              <div className="w-56">
                <label className="label">Direct Price/kg (USD)</label>
                <input type="number" step="0.0001" value={form.directPricePerKg} onChange={(e) => set('directPricePerKg', e.target.value)} className="input text-lg font-mono" />
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={save} className="btn-primary btn-sm">Save</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary btn-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-8" placeholder="Search fabrics..." />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead><tr><th>Name</th><th>Fabrication</th><th>GSM</th><th>Composition</th><th>Supplier</th><th className="text-right">Price/kg</th><th></th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-6">No fabrics in library</td></tr>}
              {items.map((f) => {
                const price = f.isDirectPrice
                  ? Number(f.directPricePerKg || 0)
                  : calcFabricPrice({ ...f, spandexPct: f.spandexPercentage });
                return (
                  <tr key={f.id}>
                    <td className="font-medium">{f.name}</td>
                    <td className="text-xs text-gray-500">{f.fabricationDetail || '—'}</td>
                    <td>{f.gsm || '—'}</td>
                    <td className="text-xs">{f.composition || '—'}</td>
                    <td>{f.supplier || '—'}</td>
                    <td className="text-right font-mono font-semibold text-green-700">{fmtUsd(price)}</td>
                    <td className="flex gap-2">
                      <button onClick={() => { setForm({ ...f, spandexPercentage: f.spandexPercentage, wastagePct: f.wastagePct }); setEditing(f.id); setShowForm(true); }} className="text-gray-400 hover:text-blue-500"><Pencil size={14} /></button>
                      <button onClick={() => del(f.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
