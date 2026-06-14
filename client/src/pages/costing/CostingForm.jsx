import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronRight, Printer, Download, CheckCircle, XCircle,
  Send, RotateCcw, Copy, Layers, Tag, Scissors, Package,
  Sparkles, Droplets, FlaskConical, DollarSign, Ship, BarChart3,
  AlertCircle, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { computeLiveFob, STATUS_COLORS } from '../../lib/utils';
import LiveFobBar from '../../components/costing/LiveFobBar';
import FabricTab from './tabs/FabricTab';
import TrimsTab from './tabs/TrimsTab';
import CmTab from './tabs/CmTab';
import PackagingTab from './tabs/PackagingTab';
import EmbellishmentWashTab from './tabs/EmbellishmentWashTab';
import TestingCommercialTab from './tabs/TestingCommercialTab';
import ShipmentTab from './tabs/ShipmentTab';
import SummaryTab from './tabs/SummaryTab';

const TABS = [
  { id: 'fabric',       label: 'Fabric',       icon: Layers,       color: 'bg-indigo-500',   dot: 'bg-indigo-500' },
  { id: 'trims',        label: 'Trims',         icon: Tag,          color: 'bg-amber-500',    dot: 'bg-amber-500' },
  { id: 'cm',           label: 'CM',            icon: Scissors,     color: 'bg-emerald-500',  dot: 'bg-emerald-500' },
  { id: 'packaging',    label: 'Packaging',     icon: Package,      color: 'bg-cyan-500',     dot: 'bg-cyan-500' },
  { id: 'embellishment',label: 'Embellishment', icon: Sparkles,     color: 'bg-purple-500',   dot: 'bg-purple-500' },
  { id: 'testing',      label: 'Testing',       icon: FlaskConical, color: 'bg-rose-500',     dot: 'bg-rose-500' },
  { id: 'commercial',   label: 'Commercial',    icon: DollarSign,   color: 'bg-violet-500',   dot: 'bg-violet-500' },
  { id: 'shipment',     label: 'Shipment',      icon: Ship,         color: 'bg-slate-500',    dot: 'bg-slate-500' },
  { id: 'summary',      label: 'FOB Summary',   icon: BarChart3,    color: 'bg-green-600',    dot: 'bg-green-600' },
];

function WorkflowActions({ costing, onRefresh }) {
  const [working, setWorking] = useState(false);
  const [showDialog, setShowDialog] = useState(null); // 'approve' | 'reject'
  const [comment, setComment] = useState('');
  const status = costing.status;

  const doAction = async (action) => {
    setWorking(true);
    try {
      await api.post(`/costings/${costing.id}/${action}`, { comment });
      toast.success(`Costing ${action}d`);
      setShowDialog(null);
      setComment('');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally { setWorking(false); }
  };

  return (
    <div className="flex items-center gap-2">
      {status === 'DRAFT' && (
        <button
          onClick={() => doAction('submit')}
          disabled={working || costing.isLocked}
          className="btn-warning btn-sm"
        >
          <Send size={13} /> Submit for Review
        </button>
      )}
      {status === 'SUBMITTED' && (
        <>
          <button onClick={() => setShowDialog('approve')} className="btn-success btn-sm">
            <CheckCircle size={13} /> Approve
          </button>
          <button onClick={() => setShowDialog('reject')} className="btn-danger btn-sm">
            <XCircle size={13} /> Reject
          </button>
        </>
      )}
      {(status === 'SUBMITTED' || status === 'REJECTED') && (
        <button onClick={() => doAction('revert')} disabled={working} className="btn-secondary btn-sm">
          <RotateCcw size={13} /> Revert to Draft
        </button>
      )}

      {/* Approve / Reject dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="font-bold text-slate-900 text-base mb-1 capitalize">
              {showDialog} Costing
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {showDialog === 'approve' ? 'This will lock the costing for editing.' : 'The costing will be returned for revision.'}
            </p>
            <textarea
              className="input h-20 resize-none mb-4"
              placeholder={`Add a comment (optional)…`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowDialog(null); setComment(''); }} className="btn-secondary btn-sm">
                Cancel
              </button>
              <button
                onClick={() => doAction(showDialog)}
                disabled={working}
                className={showDialog === 'approve' ? 'btn-success btn-sm' : 'btn-danger btn-sm'}
              >
                {working ? 'Processing…' : `Confirm ${showDialog}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CostingForm() {
  const { id } = useParams();
  const [costing, setCosting] = useState(null);
  const [fobSummary, setFobSummary] = useState(null);
  const [shipmentCalc, setShipmentCalc] = useState(null);
  const [activeTab, setActiveTab] = useState('fabric');
  const [loading, setLoading] = useState(true);

  // Live data aggregated from all tabs (for real-time FOB)
  const [liveData, setLiveData] = useState({
    shells: [], trims: [], cm: {}, packaging: [], embellishments: [], washes: [], testing: {}, commercial: {},
  });

  const loadCosting = useCallback(async () => {
    try {
      const { data } = await api.get(`/costings/${id}`);
      const c = data.data;
      setCosting(c);
      setFobSummary(data.fobSummary);
      setShipmentCalc(data.shipmentCalc);
      // Sync live data
      setLiveData({
        shells: c.fabricShells || [],
        trims: c.trims || [],
        cm: c.cm || {},
        packaging: c.packaging || [],
        embellishments: c.embellishments || [],
        washes: c.washes || [],
        testing: c.testing || {},
        commercial: c.commercial || {},
      });
    } catch { toast.error('Failed to load costing'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadCosting(); }, [loadCosting]);

  const updateLiveSection = useCallback((key, value) => {
    setLiveData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const sizes = costing?.style?.sizes || [];

  const liveFob = useMemo(
    () => computeLiveFob(liveData, sizes),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(liveData), JSON.stringify(sizes)]
  );

  const downloadExcel = async () => {
    try {
      const res = await api.get(`/costings/${id}/export/excel`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OCS-${costing.style?.styleNo}-v${costing.version}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading OCS…</p>
        </div>
      </div>
    );
  }
  if (!costing) return <div className="text-center py-20 text-red-400">Costing not found</div>;

  const statusInfo = STATUS_COLORS[costing.status] || STATUS_COLORS.DRAFT;
  const activeTabInfo = TABS.find((t) => t.id === activeTab);

  return (
    <div className="pb-24 space-y-3">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm px-5 py-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
          <Link to="/styles" className="hover:text-indigo-600 transition-colors">Styles</Link>
          <ChevronRight size={12} />
          <Link to={`/styles/${costing.style?.id}`} className="hover:text-indigo-600 font-mono font-medium text-slate-500 transition-colors">
            {costing.style?.styleNo}
          </Link>
          <ChevronRight size={12} />
          <span className="text-slate-600 font-medium">v{costing.version}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 leading-tight truncate">
                {costing.style?.description}
              </h1>
              <span className={statusInfo.badge}>
                <span className={`status-dot ${statusInfo.dot}`} />
                {statusInfo.label}
              </span>
              {costing.isLocked && (
                <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  <Lock size={10} /> Locked
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400 flex-wrap">
              {costing.style?.buyer?.name && (
                <span>Buyer: <span className="text-slate-600 font-medium">{costing.style.buyer.name}</span></span>
              )}
              {costing.style?.factory?.name && (
                <span>Factory: <span className="text-slate-600 font-medium">{costing.style.factory.name}</span></span>
              )}
              <span>Sizes: <span className="font-mono text-slate-600">{sizes.join(' · ')}</span></span>
              {costing.fromUser && <span>From: <span className="text-slate-600">{costing.fromUser}</span></span>}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <WorkflowActions costing={costing} onRefresh={loadCosting} />

            <button onClick={downloadExcel} className="btn-secondary btn-sm" title="Export to Excel">
              <Download size={13} /> Excel
            </button>
            <Link
              to={`/costing/${id}/print`}
              target="_blank"
              className="btn-secondary btn-sm"
              title="Print / PDF"
            >
              <Printer size={13} /> PDF
            </Link>
          </div>
        </div>
      </div>

      {/* ── Tab navigation ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-white rounded-xl border border-slate-200/70 shadow-sm overflow-x-auto scrollbar-thin">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer select-none flex-shrink-0 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-white/70' : tab.dot}`} />
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      <div>
        {activeTab === 'fabric' && (
          <FabricTab
            costing={costing}
            sizes={sizes}
            onSaved={loadCosting}
            onLiveChange={(shells) => updateLiveSection('shells', shells)}
          />
        )}
        {activeTab === 'trims' && (
          <TrimsTab
            costing={costing}
            sizes={sizes}
            onSaved={loadCosting}
            onLiveChange={(trims) => updateLiveSection('trims', trims)}
          />
        )}
        {activeTab === 'cm' && (
          <CmTab
            costing={costing}
            sizes={sizes}
            onSaved={loadCosting}
            onLiveChange={(cm) => updateLiveSection('cm', cm)}
          />
        )}
        {activeTab === 'packaging' && (
          <PackagingTab
            costing={costing}
            sizes={sizes}
            onSaved={loadCosting}
            onLiveChange={(packaging) => updateLiveSection('packaging', packaging)}
          />
        )}
        {activeTab === 'embellishment' && (
          <EmbellishmentWashTab
            costing={costing}
            sizes={sizes}
            onSaved={loadCosting}
            onLiveChange={(embellishments, washes) => {
              updateLiveSection('embellishments', embellishments);
              updateLiveSection('washes', washes);
            }}
          />
        )}
        {activeTab === 'testing' && (
          <TestingCommercialTab
            costing={costing}
            sizes={sizes}
            onSaved={loadCosting}
            onLiveChange={(testing, commercial) => {
              updateLiveSection('testing', testing);
              updateLiveSection('commercial', commercial);
            }}
          />
        )}
        {activeTab === 'commercial' && (
          <TestingCommercialTab
            costing={costing}
            sizes={sizes}
            onSaved={loadCosting}
            startSection="commercial"
            onLiveChange={(testing, commercial) => {
              updateLiveSection('testing', testing);
              updateLiveSection('commercial', commercial);
            }}
          />
        )}
        {activeTab === 'shipment' && (
          <ShipmentTab
            costing={costing}
            sizes={sizes}
            fobSummary={fobSummary}
            onSaved={loadCosting}
          />
        )}
        {activeTab === 'summary' && (
          <SummaryTab
            costing={costing}
            sizes={sizes}
            fobSummary={fobSummary}
            shipmentCalc={shipmentCalc}
            onRefresh={loadCosting}
          />
        )}
      </div>

      {/* ── Live FOB Bar (fixed at bottom) ─────────────────────────────────── */}
      <LiveFobBar liveFob={liveFob} sizes={sizes} />
    </div>
  );
}
