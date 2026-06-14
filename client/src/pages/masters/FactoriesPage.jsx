import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

export default function FactoriesPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', country: '', address: '' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/factories');
      setItems(data.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to load factories'); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (editing) { await api.put(`/factories/${editing}`, form); toast.success('Factory updated'); }
      else { await api.post('/factories', form); toast.success('Factory added'); }
      setForm({ name: '', country: '', address: '' });
      setEditing(null); setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Factories</h1>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: '', country: '', address: '' }); }} className="btn-primary btn-sm">
          <Plus size={14} /> Add Factory
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header"><h2 className="section-title">{editing ? 'Edit' : 'New'} Factory</h2></div>
          <div className="card-body grid grid-cols-2 gap-4">
            <div>
              <label className="label">Factory Name *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="input" placeholder="e.g. SM Knitwears Ltd" />
            </div>
            <div>
              <label className="label">Country</label>
              <input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} className="input" placeholder="Bangladesh" />
            </div>
            <div className="col-span-2">
              <label className="label">Address</label>
              <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className="input" />
            </div>
            <div className="col-span-2 flex gap-2">
              <button onClick={save} className="btn-primary btn-sm">{editing ? 'Update' : 'Save'} Factory</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary btn-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <table className="data-table w-full">
          <thead><tr><th>Factory Name</th><th>Country</th><th>Address</th><th></th></tr></thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 py-6">No factories yet</td></tr>}
            {items.map((f) => (
              <tr key={f.id}>
                <td className="font-medium">{f.name}</td>
                <td>{f.country || '—'}</td>
                <td className="max-w-xs truncate text-xs text-gray-500">{f.address || '—'}</td>
                <td>
                  <button onClick={() => { setForm({ name: f.name, country: f.country || '', address: f.address || '' }); setEditing(f.id); setShowForm(true); }} className="text-gray-400 hover:text-blue-500"><Pencil size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
