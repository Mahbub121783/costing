import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
const STATUS_COLORS = { PENDING: 'badge-pending', PARTIAL: 'badge-partial', PAID: 'badge-paid' };

function AddPaymentModal({ orderId, onClose, onSaved }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { paymentDate: new Date().toISOString().slice(0, 10), paymentMethod: 'TT' },
  });

  const onSubmit = async (data) => {
    try {
      await api.post(`/order-finance/${orderId}/payments`, data);
      toast.success('Payment added');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Add Payment</h3>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="field-label">Payment Date</label>
            <input {...register('paymentDate')} type="date" className="input" />
          </div>
          <div>
            <label className="field-label">Amount (USD)</label>
            <input {...register('amount')} className="input" placeholder="0.00" />
          </div>
          <div>
            <label className="field-label">Method</label>
            <select {...register('paymentMethod')} className="input">
              <option value="TT">TT</option>
              <option value="LC">LC</option>
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="field-label">Bank Reference</label>
            <input {...register('bankReference')} className="input" placeholder="Optional" />
          </div>
          <div>
            <label className="field-label">Notes</label>
            <textarea {...register('notes')} className="input" rows={2} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving…' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrderFinanceDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    api.get(`/order-finance/${id}`).then((r) => setOrder(r.data)).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const deletePayment = async (pid) => {
    if (!confirm('Delete this payment?')) return;
    await api.delete(`/order-finance/${id}/payments/${pid}`);
    toast.success('Payment removed');
    load();
  };

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (!order) return <div className="p-8 text-slate-400">Not found</div>;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/finance/orders" className="btn-icon"><ArrowLeft size={16} /></Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{order.orderNo}</h1>
          <p className="text-sm text-slate-500">{order.buyer?.name} · {order.costing?.style?.styleNo}</p>
        </div>
        <span className={`ml-auto badge ${STATUS_COLORS[order.paymentStatus]}`}>{order.paymentStatus}</span>
      </div>

      {/* Order Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-2 sm:grid-cols-4 gap-5">
        <div><p className="text-xs text-slate-500">Agreed FOB</p><p className="font-semibold">{fmt(order.agreedFobPerPc)}/pc</p></div>
        <div><p className="text-xs text-slate-500">Total Qty</p><p className="font-semibold">{order.totalQty?.toLocaleString()}</p></div>
        <div><p className="text-xs text-slate-500">Total Goods Value</p><p className="font-bold text-lg">{fmt(order.totalGoodsValue)}</p></div>
        <div><p className="text-xs text-slate-500">Payment Terms</p><p className="font-semibold">{order.paymentTerms}</p></div>
        <div><p className="text-xs text-slate-500">Total Paid</p><p className="font-semibold text-emerald-600">{fmt(order.totalPaid)}</p></div>
        <div><p className="text-xs text-slate-500">Balance</p><p className="font-semibold text-amber-600">{fmt(order.balanceAmount)}</p></div>
        {order.shipmentDate && <div><p className="text-xs text-slate-500">Shipment</p><p className="font-semibold">{new Date(order.shipmentDate).toLocaleDateString()}</p></div>}
        {order.deliveryDate && <div><p className="text-xs text-slate-500">Delivery</p><p className="font-semibold">{new Date(order.deliveryDate).toLocaleDateString()}</p></div>}
      </div>

      {/* Payments */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Payment History</h2>
          <button onClick={() => setShowModal(true)} className="btn-primary gap-1.5 text-xs py-1.5 px-3">
            <Plus size={13} /> Add Payment
          </button>
        </div>
        {order.payments?.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No payments yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Date</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Method</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Reference</th>
                <th className="text-right px-5 py-3 font-medium text-slate-500">Amount</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Added By</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {order.payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-700">{new Date(p.paymentDate).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-slate-700">{p.paymentMethod}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{p.bankReference || '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold text-emerald-700">{fmt(p.amount)}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{p.creator?.name}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => deletePayment(p.id)} className="btn-icon text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && <AddPaymentModal orderId={id} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}
