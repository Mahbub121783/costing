import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Layers, ChevronRight, LayoutGrid } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  DRAFT:     { dot: 'bg-slate-400', label: 'Draft' },
  SUBMITTED: { dot: 'bg-amber-400', label: 'Submitted' },
  APPROVED:  { dot: 'bg-emerald-500', label: 'Approved' },
  REJECTED:  { dot: 'bg-red-500', label: 'Rejected' },
};

function BuyerInitials({ name }) {
  if (!name) return <span className="text-slate-300">—</span>;
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 text-xs font-bold flex-shrink-0">
      {initials}
    </span>
  );
}

export default function StyleList() {
  const [styles, setStyles] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/styles', { params: { search } });
      setStyles(data.data || []);
    } catch { toast.error('Failed to load styles'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
            <LayoutGrid size={17} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-none">All Styles</h1>
            <p className="text-xs text-slate-400 mt-0.5">{styles.length} style{styles.length !== 1 ? 's' : ''} found</p>
          </div>
        </div>
        <Link to="/styles/new" className="btn-primary">
          <Plus size={15} /> New Style
        </Link>
      </div>

      {/* List card */}
      <div className="card">
        {/* Search bar */}
        <div className="card-header">
          <div className="relative w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by style no or description…"
              className="input pl-9 text-sm"
            />
          </div>
          {search && (
            <button onClick={() => setSearch('')} className="text-xs text-slate-400 hover:text-slate-600">
              Clear
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Style No</th>
                <th>Description</th>
                <th>Buyer</th>
                <th>Factory</th>
                <th>Sizes</th>
                <th className="text-center">Costings</th>
                <th>Latest Status</th>
                <th>Created</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                      <span className="text-xs">Loading styles…</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && styles.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <Layers size={36} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm font-medium">No styles found</p>
                    <p className="text-slate-300 text-xs mb-4">
                      {search ? `No results for "${search}"` : 'Create your first style to get started'}
                    </p>
                    {!search && (
                      <Link to="/styles/new" className="btn-primary btn-sm">
                        <Plus size={13} /> Create Style
                      </Link>
                    )}
                  </td>
                </tr>
              )}
              {styles.map((s) => {
                const latestStatus = s.costings?.[0]?.status || null;
                const statusCfg = latestStatus ? STATUS_CONFIG[latestStatus] : null;
                return (
                  <tr key={s.id}>
                    <td>
                      <span className="font-mono font-bold text-indigo-600 text-xs bg-indigo-50 px-2 py-0.5 rounded">
                        {s.styleNo}
                      </span>
                    </td>
                    <td className="max-w-[220px]">
                      <p className="truncate font-medium text-slate-800">{s.description}</p>
                      {s.category && <p className="text-slate-400 text-xs truncate">{s.category}</p>}
                    </td>
                    <td>
                      {s.buyer ? (
                        <div className="flex items-center gap-1.5">
                          <BuyerInitials name={s.buyer.name} />
                          <span className="truncate max-w-[100px]">{s.buyer.name}</span>
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="text-slate-600">
                      {s.factory?.name || <span className="text-slate-300">—</span>}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1 max-w-[140px]">
                        {(s.sizes || []).slice(0, 5).map((sz) => (
                          <span key={sz} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                            {sz}
                          </span>
                        ))}
                        {(s.sizes || []).length > 5 && (
                          <span className="text-xs text-slate-400">+{s.sizes.length - 5}</span>
                        )}
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="font-semibold text-slate-700">{s._count?.costings || 0}</span>
                    </td>
                    <td>
                      {statusCfg ? (
                        <div className="flex items-center gap-1.5">
                          <div className={`status-dot ${statusCfg.dot}`} />
                          <span className="text-xs text-slate-600">{statusCfg.label}</span>
                        </div>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="text-slate-400 text-xs whitespace-nowrap">
                      {new Date(s.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <Link
                        to={`/styles/${s.id}`}
                        className="btn-secondary btn-xs flex items-center gap-1"
                      >
                        Open <ChevronRight size={12} />
                      </Link>
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
