import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../lib/api';

const fmt = (n, d = 2) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

export default function InvoicePrint() {
  const { id } = useParams();
  const [inv, setInv] = useState(null);

  useEffect(() => {
    api.get(`/invoices/${id}/print`).then((r) => {
      setInv(r.data);
      setTimeout(() => window.print(), 600);
    });
  }, [id]);

  if (!inv) return <div className="p-8 text-center text-slate-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-white p-8 max-w-4xl mx-auto print:p-6">
      <style>{`@media print { body { margin: 0; } .no-print { display: none !important; } }`}</style>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">GCS</h1>
          <p className="text-xs text-slate-500 mt-0.5">Garments Costing System</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-slate-800">{inv.invoiceType} INVOICE</p>
          <p className="text-base font-semibold text-indigo-600 mt-0.5">{inv.invoiceNo}</p>
          <p className="text-sm text-slate-500 mt-1">Date: {new Date(inv.invoiceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          {inv.dueDate && <p className="text-sm text-slate-500">Due: {new Date(inv.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">From</p>
          <p className="font-semibold text-slate-800">GCS — Garments Costing System</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Bill To</p>
          <p className="font-semibold text-slate-800">{inv.buyerName || inv.buyer?.name}</p>
          {inv.buyerAddress && <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-line">{inv.buyerAddress}</p>}
        </div>
      </div>

      {inv.orderFinance && (
        <div className="border border-slate-200 rounded-lg p-3 mb-6 bg-slate-50 text-sm flex gap-8">
          <div><span className="text-slate-500">Order No:</span> <strong>{inv.orderFinance.orderNo}</strong></div>
          <div><span className="text-slate-500">Payment Terms:</span> <strong>{inv.orderFinance.paymentTerms}</strong></div>
          {inv.orderFinance.shipmentDate && <div><span className="text-slate-500">Shipment:</span> <strong>{new Date(inv.orderFinance.shipmentDate).toLocaleDateString()}</strong></div>}
        </div>
      )}

      {/* Line Items */}
      <table className="w-full text-sm mb-6 border-collapse">
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="text-left px-4 py-2.5 font-medium rounded-tl-lg">Description</th>
            <th className="text-right px-4 py-2.5 font-medium w-20">Qty</th>
            <th className="text-right px-4 py-2.5 font-medium w-28">Unit Price</th>
            <th className="text-right px-4 py-2.5 font-medium w-28 rounded-tr-lg">Total</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((it, i) => (
            <tr key={it.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              <td className="px-4 py-2.5 text-slate-700">{it.description}</td>
              <td className="px-4 py-2.5 text-right text-slate-600">{fmt(it.quantity, 3)}</td>
              <td className="px-4 py-2.5 text-right text-slate-600">{inv.currency} {fmt(it.unitPrice, 4)}</td>
              <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{inv.currency} {fmt(it.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium">{inv.currency} {fmt(inv.subtotal)}</span>
          </div>
          {Number(inv.additionalCharges) > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">{inv.additionalChargesNote || 'Additional Charges'}</span>
              <span className="font-medium">{inv.currency} {fmt(inv.additionalCharges)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-300 pt-1.5 font-bold text-base">
            <span>Grand Total</span>
            <span className="text-indigo-700">{inv.currency} {fmt(inv.grandTotal)}</span>
          </div>
        </div>
      </div>

      {inv.notes && (
        <div className="border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-slate-600">{inv.notes}</p>
        </div>
      )}

      <div className="mt-12 text-center text-xs text-slate-300 no-print">
        <button onClick={() => window.print()} className="text-indigo-500 underline">Print / Save PDF</button>
      </div>
    </div>
  );
}
