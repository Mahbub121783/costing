import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import api, { asArray } from '../../lib/api';
import toast from 'react-hot-toast';

const schema = z.object({
  costingId: z.string().min(1, 'Select a costing'),
  buyerId: z.string().min(1, 'Select a buyer'),
  agreedFobPerPc: z.string().min(1, 'FOB required'),
  totalQty: z.string().min(1, 'Qty required'),
  paymentTerms: z.enum(['LC', 'TT', 'DP', 'DA']),
  advancePct: z.string().optional(),
  currency: z.string().default('USD'),
  shipmentDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  notes: z.string().optional(),
});

export default function OrderFinanceModal({ onClose, onSaved }) {
  const [costings, setCostings] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { paymentTerms: 'TT', currency: 'USD', advancePct: '0' } });

  useEffect(() => {
    Promise.all([api.get('/order-finance/approved-costings'), api.get('/buyers')])
      .then(([c, b]) => { setCostings(asArray(c.data)); setBuyers(asArray(b.data).filter((x) => x.isActive)); })
      .catch(() => toast.error('Failed to load form data'));
  }, []);

  const onSubmit = async (data) => {
    try {
      await api.post('/order-finance', data);
      toast.success('Order created');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">New Order</h2>
          <button onClick={onClose} className="btn-icon"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="field-label">Costing (APPROVED only)</label>
            <select {...register('costingId')} className="input">
              <option value="">Select costing…</option>
              {costings.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.style?.styleNo} — {c.style?.description} (v{c.version}{c.versionLabel ? ` · ${c.versionLabel}` : ''})
                </option>
              ))}
            </select>
            {errors.costingId && <p className="field-error">{errors.costingId.message}</p>}
          </div>

          <div>
            <label className="field-label">Buyer</label>
            <select {...register('buyerId')} className="input">
              <option value="">Select buyer…</option>
              {buyers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {errors.buyerId && <p className="field-error">{errors.buyerId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Agreed FOB/pc (USD)</label>
              <input {...register('agreedFobPerPc')} className="input" placeholder="0.0000" />
              {errors.agreedFobPerPc && <p className="field-error">{errors.agreedFobPerPc.message}</p>}
            </div>
            <div>
              <label className="field-label">Total Qty</label>
              <input {...register('totalQty')} className="input" placeholder="0" type="number" />
              {errors.totalQty && <p className="field-error">{errors.totalQty.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Payment Terms</label>
              <select {...register('paymentTerms')} className="input">
                <option value="LC">LC</option>
                <option value="TT">TT</option>
                <option value="DP">DP</option>
                <option value="DA">DA</option>
              </select>
            </div>
            <div>
              <label className="field-label">Advance %</label>
              <input {...register('advancePct')} className="input" placeholder="30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Shipment Date</label>
              <input {...register('shipmentDate')} type="date" className="input" />
            </div>
            <div>
              <label className="field-label">Delivery Date</label>
              <input {...register('deliveryDate')} type="date" className="input" />
            </div>
          </div>

          <div>
            <label className="field-label">Notes</label>
            <textarea {...register('notes')} className="input" rows={2} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">{isSubmitting ? 'Saving…' : 'Create Order'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
