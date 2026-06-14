import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

const CATEGORIES = ['Thread', 'Label', 'Button', 'Zipper', 'Elastic', 'Tape', 'Packaging', 'Other'];

export default function TrimLibraryPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [form, setForm] = useState({ name: '', category: '', unit: 'Pc', unitPrice: '', supplier: '' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/trim-library', { params: { search, category } });
      setItems(data.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to load trim library'); }
  };

  useEffect(() => { load(); }, [search, category]);

  const del = async (id) => {
    if (!confirm('Remove this trim from library?')) return;
    try {
      await api.delete(`/trim-library/${id}`);
      toast.success('Removed from library');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to remove'); }
  };

  const save = async () => {
    try {
      if (editing) { await api.put(`/trim-library/${editing}`, form); toast.success('Updated'); }
      else { await api.post('/trim-library', form); toast.success('Added to library'); }
      setForm({ name: '', category: '', unit: 'Pc', unitPrice: '', supplier: '' });
      setEditing(null); setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Trim Library</h1>
        <button onClick={() => { setShowForm(!showForm); setForm({ name: '', category: '', unit: 'Pc', unitPrice: '', supplier: '' }); setEditing(null); }} className="btn-primary btn-sm">
          <Plus size={14} /> Add Trim
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header"><h2 className="section-title">{editing ? 'Edit' : 'New'} Trim</h2></div>
          <div className="card-body grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">Trim Name *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="input" placeholder="e.g. Metal Button 4-hole 15mm" />
            </div>
            <div>
              <label className="label">Category</label>
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="input">
                <option value="">-- Select --</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Unit</label>
              <input value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} className="input" placeholder="Pc / Dozen / Meter" />
            </div>
            <div>
              <label className="label">Unit Price (USD)</label>
              <input type="number" step="0.0001" value={form.unitPrice} onChange={(e) => setForm((p) => ({ ...p, unitPrice: e.target.value }))} className="input font-mono" placeholder="0.0000" />
            </div>
            <div>
              <label className="label">Supplier</label>
              <input value={form.supplier} onChange={(e) => setForm((p) => ({ ...p, supplier: e.target.value }))} className="input" />
            </div>
            <div className="col-span-3 flex gap-2">
              <button onClick={save} className="btn-primary btn-sm">Save</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary btn-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header gap-3">
          <div className="relative w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-8" placeholder="Search trims..." />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input w-36">
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead><tr><th>Item Name</th><th>Category</th><th>Unit</th><th className="text-right">Unit Price</th><th>Supplier</th><th></th></tr></thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-6">No trims in library</td></tr>}
              {items.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.name}</td>
                  <td><span className="badge bg-gray-100 text-gray-600">{t.category || '—'}</span></td>
                  <td>{t.unit || '—'}</td>
                  <td className="text-right font-mono text-green-700">${Number(t.unitPrice || 0).toFixed(4)}</td>
                  <td>{t.supplier || '—'}</td>
                  <td className="flex gap-2">
                    <button onClick={() => { setForm({ name: t.name, category: t.category || '', unit: t.unit || 'Pc', unitPrice: t.unitPrice || '', supplier: t.supplier || '' }); setEditing(t.id); setShowForm(true); }} className="text-gray-400 hover:text-blue-500"><Pencil size={14} /></button>
                    <button onClick={() => del(t.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
