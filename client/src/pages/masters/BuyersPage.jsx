import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

export default function BuyersPage() {
  const [buyers, setBuyers] = useState([]);
  const [form, setForm] = useState({ name: '', country: '', contactName: '', email: '' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/buyers');
      setBuyers(data.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to load buyers'); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (editing) {
        await api.put(`/buyers/${editing}`, form);
        toast.success('Buyer updated');
      } else {
        await api.post('/buyers', form);
        toast.success('Buyer added');
      }
      setForm({ name: '', country: '', contactName: '', email: '' });
      setEditing(null);
      setShowForm(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const del = async (id) => {
    if (!confirm('Deactivate this buyer?')) return;
    try {
      await api.delete(`/buyers/${id}`);
      toast.success('Buyer removed');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to remove buyer'); }
  };

  const startEdit = (b) => {
    setForm({ name: b.name, country: b.country || '', contactName: b.contactName || '', email: b.email || '' });
    setEditing(b.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Buyers</h1>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: '', country: '', contactName: '', email: '' }); }} className="btn-primary btn-sm">
          <Plus size={14} /> Add Buyer
        </button>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header"><h2 className="section-title">{editing ? 'Edit' : 'New'} Buyer</h2></div>
          <div className="card-body grid grid-cols-2 gap-4">
            <div>
              <label className="label">Buyer Name *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="input" placeholder="e.g. NEXT Sourcing" />
            </div>
            <div>
              <label className="label">Country</label>
              <input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} className="input" placeholder="e.g. UK" />
            </div>
            <div>
              <label className="label">Contact Name</label>
              <input value={form.contactName} onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))} className="input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="input" />
            </div>
            <div className="col-span-2 flex gap-2">
              <button onClick={save} className="btn-primary btn-sm">{editing ? 'Update' : 'Save'} Buyer</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary btn-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <table className="data-table w-full">
          <thead><tr><th>Buyer Name</th><th>Country</th><th>Contact</th><th>Email</th><th></th></tr></thead>
          <tbody>
            {buyers.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-6">No buyers yet</td></tr>}
            {buyers.map((b) => (
              <tr key={b.id}>
                <td className="font-medium">{b.name}</td>
                <td>{b.country || '—'}</td>
                <td>{b.contactName || '—'}</td>
                <td>{b.email || '—'}</td>
                <td className="flex gap-2">
                  <button onClick={() => startEdit(b)} className="text-gray-400 hover:text-blue-500"><Pencil size={14} /></button>
                  <button onClick={() => del(b.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
