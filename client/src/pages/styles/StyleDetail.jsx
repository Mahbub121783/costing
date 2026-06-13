import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, ChevronRight, Copy, Printer, Upload, Image, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

const STATUS_CONFIG = {
  DRAFT:     { badge: 'badge-draft',     label: 'Draft' },
  SUBMITTED: { badge: 'badge-submitted', label: 'Submitted' },
  APPROVED:  { badge: 'badge-approved',  label: 'Approved' },
  REJECTED:  { badge: 'badge-rejected',  label: 'Rejected' },
};

export default function StyleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [style, setStyle] = useState(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = () =>
    api.get(`/styles/${id}`).then(({ data }) => setStyle(data.data)).catch(() => toast.error('Style not found'));

  useEffect(() => { load(); }, [id]);

  const createCosting = async () => {
    setCreating(true);
    try {
      const res = await api.post('/costings', { styleId: id });
      navigate(`/costing/${res.data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create costing');
    } finally { setCreating(false); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('image', file);
    setUploading(true);
    try {
      await api.post(`/styles/${id}/image`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Image uploaded');
      load();
    } catch { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  if (!style) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const imageUrl = style.imageUrl ? `http://localhost:5000${style.imageUrl}` : null;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link to="/styles" className="hover:text-indigo-600 transition-colors">Styles</Link>
        <ChevronRight size={12} />
        <span className="font-mono font-semibold text-slate-700">{style.styleNo}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-5">
        {/* Style image */}
        <div
          className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-200 flex-shrink-0 overflow-hidden relative group cursor-pointer"
          onClick={() => fileRef.current?.click()}
          title="Click to upload garment image"
        >
          {imageUrl ? (
            <>
              <img src={imageUrl} alt="Style" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload size={20} className="text-white" />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-300 hover:text-slate-400 transition-colors">
              {uploading ? (
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Image size={24} />
                  <span className="text-[10px] text-center px-2">Click to add photo</span>
                </>
              )}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">{style.description}</h1>
          <div className="flex gap-4 mt-2 text-sm text-slate-500 flex-wrap">
            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{style.styleNo}</span>
            {style.buyer && <span>Buyer: <strong className="text-slate-700">{style.buyer.name}</strong></span>}
            {style.factory && <span>Factory: <strong className="text-slate-700">{style.factory.name}</strong></span>}
            {style.department && <span>Dept: <strong className="text-slate-700">{style.department}</strong></span>}
            {style.season && <span>Season: <strong className="text-slate-700">{style.season}</strong></span>}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {style.sizes?.map((s) => (
              <span key={s} className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        </div>

        <button onClick={createCosting} disabled={creating} className="btn-primary flex-shrink-0">
          <Plus size={15} /> {creating ? 'Creating…' : 'New Costing'}
        </button>
      </div>

      {/* Style info card */}
      <div className="card">
        <div className="card-header">
          <h2 className="section-title">Style Details</h2>
        </div>
        <div className="card-body grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 text-sm">
          {[
            { label: 'Style No', value: style.styleNo, mono: true },
            { label: 'Category', value: style.category || '—' },
            { label: 'Season', value: style.season || '—' },
            { label: 'Pack Of', value: `${style.packOf} pc` },
          ].map(({ label, value, mono }) => (
            <div key={label}>
              <p className="text-xs text-slate-400 font-medium mb-0.5">{label}</p>
              <p className={`font-semibold text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Costing versions */}
      <div className="card">
        <div className="card-header">
          <h2 className="section-title">
            <FileText size={15} className="text-slate-400" />
            Costing Versions
            <span className="text-xs font-normal text-slate-400 ml-1">({style.costings?.length || 0})</span>
          </h2>
          <button onClick={createCosting} disabled={creating} className="btn-primary btn-sm">
            <Plus size={13} /> New Costing
          </button>
        </div>

        {style.costings?.length === 0 ? (
          <div className="p-10 text-center">
            <FileText size={36} className="text-slate-100 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No costings yet.</p>
            <p className="text-slate-300 text-xs mb-4">Create your first OCS for this style</p>
            <button onClick={createCosting} className="btn-primary btn-sm">
              <Plus size={13} /> Create First Costing
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Label</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {style.costings?.map((c) => {
                  const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.DRAFT;
                  return (
                    <tr key={c.id}>
                      <td className="font-mono font-bold text-indigo-700">v{c.version}</td>
                      <td className="text-slate-600">{c.versionLabel || `v${c.version}`}</td>
                      <td>
                        <span className={sc.badge}>{sc.label}</span>
                      </td>
                      <td className="text-slate-400">
                        {c.costingDate ? new Date(c.costingDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="text-slate-400">{new Date(c.updatedAt).toLocaleDateString()}</td>
                      <td>
                        <div className="flex gap-1">
                          <Link to={`/costing/${c.id}`} className="btn-primary btn-xs">Open</Link>
                          <Link
                            to={`/costing/${c.id}/print`}
                            target="_blank"
                            className="btn-secondary btn-xs"
                            title="Print / PDF"
                          >
                            <Printer size={11} />
                          </Link>
                          <button
                            className="btn-secondary btn-xs"
                            title="Clone to new version"
                            onClick={async () => {
                              try {
                                const res = await api.post(`/costings/${c.id}/clone`);
                                toast.success('Cloned to new version');
                                navigate(`/costing/${res.data.data.id}`);
                              } catch { toast.error('Clone failed'); }
                            }}
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
