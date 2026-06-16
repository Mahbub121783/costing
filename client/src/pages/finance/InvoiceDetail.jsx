import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Printer } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import api, { asArray } from '../../lib/api';
import toast from 'react-hot-toast';

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
const STATUS_OPS = ['DRAFT', 'SENT', 'PARTIAL', 'PAID', 'CANCELLED'];

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [invoice, setInvoice] = useState(null);
  const [buyers, setBuyers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const { register, control, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      invoiceType: 'COMMERCIAL',
      invoiceDate: new Date().toISOString().slice(0, 10),
      currency: 'USD',
      items: [{ description: '', quantity: '1', unitPrice: '0' }],
      additionalCharges: '0',
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');
  const watchedAddl = watch('additionalCharges');

  useEffect(() => {
    Promise.all([api.get('/buyers'), api.get('/order-finance')])
      .then(([b, o]) => { setBuyers(asArray(b.data).filter((x) => x.isActive)); setOrders(asArray(o.data)); })
      .catch(() => toast.error('Failed to load buyers/orders'));
    if (!isNew) {
      api.get(`/invoices/${id}`).then((r) => {
        setInvoice(r.data);
        const inv = r.data;
        reset({
          invoiceType: inv.invoiceType,
          invoiceDate: inv.invoiceDate?.slice(0, 10),
          orderFinanceId: inv.orderFinanceId || '',
          buyerId: inv.buyerId || '',
          buyerName: inv.buyerName || '',
          buyerAddress: inv.buyerAddress || '',
          currency: inv.currency,
          dueDate: inv.dueDate?.slice(0, 10) || '',
          notes: inv.notes || '',
          additionalCharges: String(inv.additionalCharges || 0),
          additionalChargesNote: inv.additionalChargesNote || '',
          items: (inv.items || []).map((it) => ({ description: it.description, quantity: String(it.quantity), unitPrice: String(it.unitPrice) })),
        });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const subtotal = (watchedItems || []).reduce((s, it) => s + (Number(it.quantity || 0) * Number(it.unitPrice || 0)), 0);
  const grandTotal = subtotal + Number(watchedAddl || 0);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      if (isNew) {
        const res = await api.post('/invoices', data);
        toast.success('Invoice created');
        navigate(`/finance/invoices/${res.data.id}`);
      } else {
        await api.put(`/invoices/${id}`, data);
        toast.success('Saved');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (status) => {
    setStatusUpdating(true);
    try {
      await api.put(`/invoices/${id}/status`, { status });
      toast.success(`Status → ${status}`);
      setInvoice((p) => ({ ...p, status }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setStatusUpdating(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/finance/invoices" className="btn-icon"><ArrowLeft size={16} /></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">{isNew ? 'New Invoice' : invoice?.invoiceNo}</h1>
          {!isNew && <p className="text-sm text-slate-500">{invoice?.invoiceType} · {invoice?.status}</p>}
        </div>
        {!isNew && (
          <a href={`/finance/invoices/${id}/print`} target="_blank" rel="noreferrer" className="btn-secondary gap-1.5"><Printer size={14} /> Print</a>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="field-label">Invoice Type</label>
            <select {...register('invoiceType')} className="input">
              <option value="COMMERCIAL">Commercial</option>
              <option value="PROFORMA">Proforma</option>
              <option value="INTERNAL">Internal</option>
            </select>
          </div>
          <div>
            <label className="field-label">Invoice Date</label>
            <input {...register('invoiceDate')} type="date" className="input" />
          </div>
          <div>
            <label className="field-label">Currency</label>
            <input {...register('currency')} className="input" placeholder="USD" />
          </div>
          <div>
            <label className="field-label">Linked Order (optional)</label>
            <select {...register('orderFinanceId')} className="input">
              <option value="">None</option>
              {orders.map((o) => <option key={o.id} value={o.id}>{o.orderNo} — {o.buyer?.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Buyer</label>
            <select {...register('buyerId')} className="input">
              <option value="">None / Manual</option>
              {buyers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Due Date</label>
            <input {...register('dueDate')} type="date" className="input" />
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label className="field-label">Buyer Name (override)</label>
            <input {...register('buyerName')} className="input" placeholder="Buyer name on invoice" />
          </div>
          <div className="col-span-2 sm:col-span-3">
            <label className="field-label">Buyer Address</label>
            <textarea {...register('buyerAddress')} className="input" rows={2} />
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-sm">Line Items</h2>
            <button type="button" onClick={() => append({ description: '', quantity: '1', unitPrice: '0' })} className="btn-icon text-indigo-600"><Plus size={15} /></button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-slate-500">Description</th>
                <th className="text-right px-4 py-2 font-medium text-slate-500 w-24">Qty</th>
                <th className="text-right px-4 py-2 font-medium text-slate-500 w-28">Unit Price</th>
                <th className="text-right px-4 py-2 font-medium text-slate-500 w-28">Total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => {
                const total = Number(watchedItems?.[i]?.quantity || 0) * Number(watchedItems?.[i]?.unitPrice || 0);
                return (
                  <tr key={f.id} className="border-t border-slate-100">
                    <td className="px-4 py-2"><input {...register(`items.${i}.description`)} className="input text-sm" placeholder="Description" /></td>
                    <td className="px-4 py-2"><input {...register(`items.${i}.quantity`)} className="input text-sm text-right" /></td>
                    <td className="px-4 py-2"><input {...register(`items.${i}.unitPrice`)} className="input text-sm text-right" /></td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-700">{fmt(total)}</td>
                    <td className="px-2 py-2"><button type="button" onClick={() => remove(i)} className="btn-icon text-red-400"><Trash2 size={13} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t border-slate-100 px-5 py-3 space-y-2">
            <div className="flex items-center gap-4 justify-end">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">Additional Charges</label>
                <input {...register('additionalCharges')} className="input text-sm w-28 text-right" />
                <input {...register('additionalChargesNote')} className="input text-sm w-40" placeholder="Label" />
              </div>
            </div>
            <div className="flex justify-end gap-8 text-sm">
              <span className="text-slate-500">Subtotal: <strong className="text-slate-800">{fmt(subtotal)}</strong></span>
              <span className="text-slate-700 font-bold">Grand Total: {fmt(grandTotal)}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="field-label">Notes</label>
          <textarea {...register('notes')} className="input" rows={2} />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : isNew ? 'Create Invoice' : 'Save Changes'}</button>
          {!isNew && (
            <div className="flex gap-2 ml-auto">
              {STATUS_OPS.filter((s) => s !== invoice?.status).map((s) => (
                <button key={s} type="button" disabled={statusUpdating} onClick={() => updateStatus(s)} className="btn-secondary text-xs py-1.5 px-3">→ {s}</button>
              ))}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
