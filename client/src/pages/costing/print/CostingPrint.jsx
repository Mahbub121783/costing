import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import api from '../../../lib/api';
import './print.css';

const fmt4 = (v) => (v !== undefined && v !== null ? Number(v).toFixed(4) : '—');
const fmt2 = (v) => (v !== undefined && v !== null ? Number(v).toFixed(2) : '—');

function SizeHeader({ sizes }) {
  return sizes.map((s) => (
    <th key={s} className="ocs-th text-center">{s}</th>
  ));
}

function CostRow({ label, data, sizes, bold, highlight, prefix = '$' }) {
  return (
    <tr className={highlight ? 'ocs-row-highlight' : bold ? 'ocs-row-bold' : 'ocs-row'}>
      <td className="ocs-label">{label}</td>
      {sizes.map((s) => (
        <td key={s} className="ocs-value">
          {data?.[s] !== undefined ? `${prefix}${fmt4(data[s])}` : '—'}
        </td>
      ))}
    </tr>
  );
}

export default function CostingPrint() {
  const { id } = useParams();
  const [costing, setCosting] = useState(null);
  const [fobSummary, setFobSummary] = useState(null);
  const printRef = useRef();

  useEffect(() => {
    api.get(`/costings/${id}`).then(({ data }) => {
      setCosting(data.data);
      setFobSummary(data.fobSummary);
    });
  }, [id]);

  if (!costing) return <div className="p-10 text-center text-gray-400">Loading...</div>;

  const sizes = costing.style?.sizes || [];
  const style = costing.style;
  const shipment = costing.shipment;
  const orderQty = shipment?.orderQtyPerSize || {};
  const totalQty = Object.values(orderQty).reduce((a, b) => a + Number(b || 0), 0);

  const pick = (key) => {
    const out = {};
    sizes.forEach((s) => { out[s] = fobSummary?.[s]?.[key]; });
    return out;
  };

  return (
    <div>
      {/* Screen controls — hidden when printing */}
      <div className="no-print bg-gray-800 text-white px-6 py-3 flex items-center gap-4">
        <Link to={`/costing/${id}`} className="flex items-center gap-2 text-gray-300 hover:text-white text-sm">
          <ArrowLeft size={14} /> Back to Costing
        </Link>
        <div className="flex-1" />
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <Printer size={15} /> Print / Save PDF
        </button>
      </div>

      {/* Printable sheet */}
      <div ref={printRef} className="ocs-sheet" id="ocs-print">
        {/* ── HEADER ──────────────────────────────────────────── */}
        <div className="ocs-header-block">
          <div className="ocs-company">QUOTATION SHEET</div>
          <table className="ocs-meta-table">
            <tbody>
              <tr>
                <td className="ocs-meta-label">Date:</td>
                <td className="ocs-meta-val">
                  {costing.costingDate ? new Date(costing.costingDate).toLocaleDateString('en-GB') : '—'}
                </td>
                <td className="ocs-meta-label">Style / Item Ref:</td>
                <td className="ocs-meta-val" colSpan={3}>{style?.styleNo}</td>
              </tr>
              <tr>
                <td className="ocs-meta-label">To:</td>
                <td className="ocs-meta-val">{costing.toPerson || '—'}</td>
                <td className="ocs-meta-label">Description:</td>
                <td className="ocs-meta-val" colSpan={3}>{style?.description}</td>
              </tr>
              <tr>
                <td className="ocs-meta-label">From:</td>
                <td className="ocs-meta-val">{costing.fromUser || '—'}</td>
                <td className="ocs-meta-label">Department:</td>
                <td className="ocs-meta-val">{style?.department || '—'}</td>
                <td className="ocs-meta-label">Pack of:</td>
                <td className="ocs-meta-val">{style?.packOf || 1} Pc</td>
              </tr>
              <tr>
                <td className="ocs-meta-label">Version:</td>
                <td className="ocs-meta-val">v{costing.version} — {costing.versionLabel}</td>
                <td className="ocs-meta-label">Status:</td>
                <td className="ocs-meta-val">{costing.status}</td>
                <td className="ocs-meta-label">Sizes:</td>
                <td className="ocs-meta-val">{sizes.join(' | ')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── FABRIC SHELLS ────────────────────────────────────── */}
        <div className="ocs-section-title">FABRIC COST BREAKDOWN</div>
        {costing.fabricShells?.map((shell, idx) => (
          <div key={shell.id} className="ocs-shell-block">
            <div className="ocs-shell-title">
              Shell {idx + 1}: {shell.shellName} — {shell.fabricationDetail}
              {shell.application && ` (${shell.application})`}
              {shell.mill && ` | Mill: ${shell.mill}`}
            </div>
            <table className="ocs-table">
              <thead>
                <tr>
                  {!shell.isDirectPrice && (
                    <>
                      <th className="ocs-th">Yarn Count</th>
                      <th className="ocs-th">Yarn Price/kg</th>
                      <th className="ocs-th">Spandex%</th>
                      <th className="ocs-th">Spandex Price/kg</th>
                      <th className="ocs-th">Knitting/kg</th>
                      <th className="ocs-th">Dyeing/kg</th>
                      <th className="ocs-th">Wastage%</th>
                    </>
                  )}
                  <th className="ocs-th ocs-highlight">Fabric Price/kg</th>
                </tr>
              </thead>
              <tbody>
                <tr className="ocs-row">
                  {!shell.isDirectPrice && (
                    <>
                      <td className="ocs-value">{shell.yarnCount || '—'}</td>
                      <td className="ocs-value">${fmt4(shell.yarnPricePerKg)}</td>
                      <td className="ocs-value">{shell.spandexPct ? `${(Number(shell.spandexPct) * 100).toFixed(1)}%` : '0%'}</td>
                      <td className="ocs-value">${fmt4(shell.spandexPriceKg)}</td>
                      <td className="ocs-value">${fmt4(shell.knittingCost)}</td>
                      <td className="ocs-value">${fmt4(shell.dyeingFinishing)}</td>
                      <td className="ocs-value">{shell.wastagePct ? `${(Number(shell.wastagePct) * 100).toFixed(1)}%` : '0%'}</td>
                    </>
                  )}
                  <td className="ocs-value ocs-highlight font-bold">${fmt4(shell.fabricPricePerKg)}</td>
                </tr>
              </tbody>
            </table>

            {/* Consumption per size */}
            <table className="ocs-table mt-1">
              <thead>
                <tr>
                  <th className="ocs-th">Size</th>
                  <SizeHeader sizes={sizes} />
                </tr>
              </thead>
              <tbody>
                <tr className="ocs-row">
                  <td className="ocs-label">Consumption kg/pc</td>
                  {sizes.map((s) => (
                    <td key={s} className="ocs-value">{fmt4(shell.consumptionPerSize?.[s])}</td>
                  ))}
                </tr>
                <tr className="ocs-row-bold">
                  <td className="ocs-label">Shell Cost (USD/pc)</td>
                  {sizes.map((s) => (
                    <td key={s} className="ocs-value">${fmt4(shell.costPerSize?.[s])}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        {/* Total Fabric */}
        <table className="ocs-table ocs-total-row-table">
          <tbody>
            <CostRow label="TOTAL FABRIC COST / PC" data={pick('fabric')} sizes={sizes} bold highlight />
          </tbody>
        </table>

        {/* ── TRIMS ────────────────────────────────────────────── */}
        {costing.trims?.length > 0 && (
          <>
            <div className="ocs-section-title">TRIMS & ACCESSORIES</div>
            <table className="ocs-table">
              <thead>
                <tr>
                  <th className="ocs-th">Item</th>
                  <SizeHeader sizes={sizes} />
                </tr>
              </thead>
              <tbody>
                {costing.trims.map((t) => (
                  <tr key={t.id} className="ocs-row">
                    <td className="ocs-label">{t.itemName}</td>
                    {sizes.map((s) => <td key={s} className="ocs-value">${fmt4(t.costPerSize?.[s])}</td>)}
                  </tr>
                ))}
                <CostRow label="Total Trims / Pc" data={pick('trims')} sizes={sizes} bold />
              </tbody>
            </table>
          </>
        )}

        {/* ── CM ───────────────────────────────────────────────── */}
        {costing.cm && (
          <>
            <div className="ocs-section-title">CUT, MAKE & TRIM (CM)</div>
            <table className="ocs-table">
              <thead>
                <tr>
                  <th className="ocs-th">Item</th>
                  <SizeHeader sizes={sizes} />
                </tr>
              </thead>
              <tbody>
                {costing.cm.smv && (
                  <tr className="ocs-row">
                    <td className="ocs-label">SMV</td>
                    {sizes.map((s) => <td key={s} className="ocs-value">{costing.cm.smv}</td>)}
                  </tr>
                )}
                <tr className="ocs-row">
                  <td className="ocs-label">CM — Top Garment</td>
                  {sizes.map((s) => <td key={s} className="ocs-value">${fmt4(costing.cm.cmTopPerSize?.[s])}</td>)}
                </tr>
                {sizes.some((s) => Number(costing.cm.cmBottomPerSize?.[s]) > 0) && (
                  <tr className="ocs-row">
                    <td className="ocs-label">CM — Bottom Garment</td>
                    {sizes.map((s) => <td key={s} className="ocs-value">${fmt4(costing.cm.cmBottomPerSize?.[s])}</td>)}
                  </tr>
                )}
                <CostRow label="Total CM / Pc" data={pick('cm')} sizes={sizes} bold />
              </tbody>
            </table>
          </>
        )}

        {/* ── PACKAGING ────────────────────────────────────────── */}
        {costing.packaging?.length > 0 && (
          <>
            <div className="ocs-section-title">PACKAGING</div>
            <table className="ocs-table">
              <thead>
                <tr><th className="ocs-th">Item</th><SizeHeader sizes={sizes} /></tr>
              </thead>
              <tbody>
                {costing.packaging.map((p) => (
                  <tr key={p.id} className="ocs-row">
                    <td className="ocs-label">{p.itemName}</td>
                    {sizes.map((s) => <td key={s} className="ocs-value">${fmt4(p.costPerSize?.[s])}</td>)}
                  </tr>
                ))}
                <CostRow label="Total Packaging / Pc" data={pick('packaging')} sizes={sizes} bold />
              </tbody>
            </table>
          </>
        )}

        {/* ── EMBELLISHMENT ─────────────────────────────────────── */}
        {costing.embellishments?.length > 0 && (
          <>
            <div className="ocs-section-title">EMBELLISHMENT</div>
            <table className="ocs-table">
              <thead>
                <tr><th className="ocs-th">Item</th><SizeHeader sizes={sizes} /></tr>
              </thead>
              <tbody>
                {costing.embellishments.map((e) => (
                  <tr key={e.id} className="ocs-row">
                    <td className="ocs-label">{e.name}</td>
                    {sizes.map((s) => <td key={s} className="ocs-value">${fmt4(e.costPerSize?.[s])}</td>)}
                  </tr>
                ))}
                <CostRow label="Total Embellishment / Pc" data={pick('embellishment')} sizes={sizes} bold />
              </tbody>
            </table>
          </>
        )}

        {/* ── WASH ─────────────────────────────────────────────── */}
        {costing.washes?.some((w) => sizes.some((s) => Number(w.costPerSize?.[s]) > 0)) && (
          <>
            <div className="ocs-section-title">WASH DETAIL</div>
            <table className="ocs-table">
              <thead>
                <tr><th className="ocs-th">Wash Type</th><SizeHeader sizes={sizes} /></tr>
              </thead>
              <tbody>
                {costing.washes.map((w) => (
                  <tr key={w.id} className="ocs-row">
                    <td className="ocs-label">{w.washType}</td>
                    {sizes.map((s) => <td key={s} className="ocs-value">${fmt4(w.costPerSize?.[s])}</td>)}
                  </tr>
                ))}
                <CostRow label="Total Wash / Pc" data={pick('wash')} sizes={sizes} bold />
              </tbody>
            </table>
          </>
        )}

        {/* ── TESTING ──────────────────────────────────────────── */}
        {costing.testing && (
          <>
            <div className="ocs-section-title">TESTING & COMPLIANCE</div>
            <table className="ocs-table">
              <thead>
                <tr><th className="ocs-th">Item</th><SizeHeader sizes={sizes} /></tr>
              </thead>
              <tbody>
                <CostRow label="Testing Cost / Pc" data={costing.testing.costPerSize} sizes={sizes} bold />
              </tbody>
            </table>
          </>
        )}

        {/* ── FOB SUMMARY ───────────────────────────────────────── */}
        <div className="ocs-section-title">COST SUMMARY (USD per piece)</div>
        <table className="ocs-table">
          <thead>
            <tr>
              <th className="ocs-th ocs-summary-label">Cost Component</th>
              <SizeHeader sizes={sizes} />
            </tr>
          </thead>
          <tbody>
            <CostRow label="Total Fabric & Finance Cost" data={pick('fabric')} sizes={sizes} />
            <CostRow label="Total Trims Cost" data={pick('trims')} sizes={sizes} />
            <CostRow label="Total CM Cost" data={pick('cm')} sizes={sizes} />
            <CostRow label="Total Packaging Cost" data={pick('packaging')} sizes={sizes} />
            <CostRow label="Total Embellishment Cost" data={pick('embellishment')} sizes={sizes} />
            <CostRow label="Total Wash Cost" data={pick('wash')} sizes={sizes} />
            <CostRow label="Total Testing Cost" data={pick('testing')} sizes={sizes} />
            <tr className="ocs-row-subtotal">
              <td className="ocs-label">Sub-Total Cost / Pc</td>
              {sizes.map((s) => (
                <td key={s} className="ocs-value">${fmt4(fobSummary?.[s]?.subTotal)}</td>
              ))}
            </tr>
            <tr className="ocs-row">
              <td className="ocs-label">
                Settlement Discount
                {costing.commercial && (
                  <span className="ocs-note">
                    {' '}(BH: {(Number(costing.commercial.buyingHouseCommPct || 0) * 100).toFixed(1)}%
                    + FM: {(Number(costing.commercial.factoryCommPct || 0) * 100).toFixed(1)}%
                    + Profit: {(Number(costing.commercial.profitMarginPct || 0) * 100).toFixed(1)}%)
                  </span>
                )}
              </td>
              {sizes.map((s) => (
                <td key={s} className="ocs-value">${fmt4(fobSummary?.[s]?.settlement)}</td>
              ))}
            </tr>
            <tr className="ocs-row-fob">
              <td className="ocs-label-fob">TOTAL FOB COST</td>
              {sizes.map((s) => (
                <td key={s} className="ocs-value-fob">${fmt4(fobSummary?.[s]?.fob)}</td>
              ))}
            </tr>
          </tbody>
        </table>

        {/* ── QUANTITY & SHIPMENT ───────────────────────────────── */}
        {shipment && (
          <>
            <div className="ocs-section-title">QUANTITY & SHIPMENT</div>
            <table className="ocs-table">
              <thead>
                <tr>
                  <th className="ocs-th">Size</th>
                  {sizes.map((s) => <th key={s} className="ocs-th text-center">{s}</th>)}
                  <th className="ocs-th text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="ocs-row">
                  <td className="ocs-label">Order Quantity (pcs)</td>
                  {sizes.map((s) => <td key={s} className="ocs-value">{Number(orderQty[s] || 0).toLocaleString()}</td>)}
                  <td className="ocs-value font-bold">{totalQty.toLocaleString()}</td>
                </tr>
                <tr className="ocs-row">
                  <td className="ocs-label">FOB Cost / Pc</td>
                  {sizes.map((s) => <td key={s} className="ocs-value">${fmt4(fobSummary?.[s]?.fob)}</td>)}
                  <td className="ocs-value">—</td>
                </tr>
                <tr className="ocs-row">
                  <td className="ocs-label">Freight / Pc ({shipment.freightMode})</td>
                  {sizes.map(() => <td key={Math.random()} className="ocs-value">${fmt4(shipment.freightPerPiece)}</td>)}
                  <td className="ocs-value">—</td>
                </tr>
                <tr className="ocs-row-fob">
                  <td className="ocs-label-fob">LANDED COST / Pc</td>
                  {sizes.map((s) => (
                    <td key={s} className="ocs-value-fob">${fmt4(shipment.landedCostPerSize?.[s])}</td>
                  ))}
                  <td className="ocs-value-fob">—</td>
                </tr>
              </tbody>
            </table>

            <div className="ocs-shipment-meta">
              <span>Total Cartons: <strong>{shipment.totalCartons || '—'}</strong></span>
              <span>Total CBM: <strong>{fmt2(shipment.totalCbm)} m³</strong></span>
              <span>Freight Mode: <strong>{shipment.freightMode}</strong></span>
              <span>Freight Rate: <strong>${fmt4(shipment.freightRateUsd)} / {shipment.freightUnit?.replace('_', ' ')}</strong></span>
            </div>
          </>
        )}

        {/* ── NOTES ─────────────────────────────────────────────── */}
        {costing.notes && (
          <div className="ocs-notes">
            <strong>Comments:</strong> {costing.notes}
          </div>
        )}

        {/* Footer */}
        <div className="ocs-footer">
          <div>Costing prepared by: {costing.fromUser || '—'}</div>
          <div>Printed: {new Date().toLocaleDateString('en-GB')}</div>
          <div>This document is confidential and for internal use only.</div>
        </div>
      </div>
    </div>
  );
}
