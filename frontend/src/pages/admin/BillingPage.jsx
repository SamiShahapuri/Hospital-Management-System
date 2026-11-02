import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import PageTitle from "../../components/common/PageTitle";
import StatusPill from "../../components/common/StatusPill";
import { currency, dateOnly, dateTime } from "../../utils/format";
import { useToast } from "../../context/ToastContext";

const newItem = () => ({ description: "Consultation fee", quantity: "1", unitPrice: "" });
const localDateAfter = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toLocaleDateString("en-CA"); };
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}


export default function BillingPage() {
  const notify = useToast();
  const [patients, setPatients] = useState([]);
  const [bills, setBills] = useState([]);
  const [items, setItems] = useState([newItem()]);
  const [form, setForm] = useState({ patient: "", notes: "", dueAt: localDateAfter(7) });
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [payment, setPayment] = useState({ amount: "", mode: "Cash" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [patientRows, billRows] = await Promise.all([api("/patients"), api("/billing")]);
      setPatients(patientRows);
      setBills(billRows);
      setError("");
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  const outstanding = useMemo(() => bills.reduce((sum, bill) =>
    sum + (["Unpaid", "Partially Paid"].includes(bill.status) ? Number(bill.balanceDue ?? (bill.subtotal - (bill.amountPaid || 0))) : 0), 0), [bills]);
  const totalCollected = useMemo(() => bills.reduce((sum, bill) => sum + Number(bill.amountPaid || (bill.status === "Paid" ? bill.subtotal : 0)), 0), [bills]);

  function patchItem(index, changes) {
    setItems(current => current.map((item, i) => i === index ? { ...item, ...changes } : item));
  }
  function addItem() {
    if (items.length < 20) setItems(current => [...current, { ...newItem(), description: "" }]);
  }
  function removeItem(index) {
    if (items.length > 1) setItems(current => current.filter((_, i) => i !== index));
  }

  async function create(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const normalized = items.map(item => ({ description: item.description.trim(), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) }));
      if (normalized.some(item => !item.description || !Number.isInteger(item.quantity) || item.quantity < 1 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
        throw new Error("Check every invoice line: description, quantity and unit price are required.");
      }
      if (!form.dueAt || form.dueAt < localDateAfter(0)) throw new Error("Invoice due date must be today or later.");
      const dueAt = new Date(`${form.dueAt}T23:59:59.999`).toISOString();
      await api("/billing", { method: "POST", body: JSON.stringify({ patient: form.patient, items: normalized, notes: form.notes, dueAt }) });
      setForm({ patient: "", notes: "", dueAt: localDateAfter(7) }); setItems([newItem()]);
      notify("Invoice created."); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  function openPayment(bill) {
    const balance = Number(bill.balanceDue ?? (bill.subtotal - (bill.amountPaid || 0)));
    setPaymentTarget(bill);
    setPayment({ amount: balance.toFixed(2), mode: "Cash" });
  }
  async function recordPayment(e) {
    e.preventDefault(); if (!paymentTarget) return;
    setBusy(true); setError("");
    try {
      await api(`/billing/${paymentTarget._id}/pay`, { method: "PATCH", body: JSON.stringify({ amount: Number(payment.amount), mode: payment.mode }) });
      notify("Payment recorded and balance updated."); setPaymentTarget(null); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function cancelBill(id) {
    if (!window.confirm("Cancel this invoice?")) return;
    try { await api(`/billing/${id}/cancel`, { method: "PATCH" }); notify("Invoice cancelled."); await load(); }
    catch (e) { setError(e.message); }
  }

  function printReceipt(bill) {
    const paid = Number(bill.amountPaid || (bill.status === "Paid" ? bill.subtotal : 0));
    const balance = Number(bill.balanceDue ?? Math.max(0, bill.subtotal - paid));
    const lines = (bill.items || []).map(item => `<tr><td>${escapeHtml(item.description)}</td><td>${item.quantity}</td><td>₹${Number(item.unitPrice).toFixed(2)}</td><td>₹${Number(item.lineTotal).toFixed(2)}</td></tr>`).join("");
    const payments = (bill.paymentHistory || []).map(item => `<tr><td>${new Date(item.recordedAt).toLocaleString()}</td><td>${escapeHtml(item.mode)}</td><td>₹${Number(item.amount).toFixed(2)}</td></tr>`).join("");
    const popup = window.open("", "_blank", "width=760,height=900");
    if (!popup) { setError("Allow pop-ups to print the payment receipt."); return; }
    popup.document.write(`<!doctype html><html><head><title>Receipt ${escapeHtml(bill._id.slice(-8).toUpperCase())}</title><style>body{font:14px Arial,sans-serif;max-width:720px;margin:32px auto;color:#182232}h1{font-size:24px;margin-bottom:4px}.muted{color:#64748b}.meta{display:flex;justify-content:space-between;margin:24px 0}table{width:100%;border-collapse:collapse;margin:14px 0 24px}th,td{text-align:left;padding:10px;border-bottom:1px solid #dce3ec}.totals{margin-left:auto;width:280px}.totals p{display:flex;justify-content:space-between}.balance{font-size:18px;font-weight:bold}@media print{button{display:none}}</style></head><body><h1>City Care Hospital</h1><div class="muted">Payment receipt</div><div class="meta"><div><b>Patient:</b> ${escapeHtml(bill.patient?.fullName || "—")}<br><b>Patient ID:</b> ${escapeHtml(bill.patient?.patientId || "—")}</div><div><b>Receipt:</b> ${escapeHtml(bill._id.slice(-8).toUpperCase())}<br><b>Issued:</b> ${escapeHtml(dateOnly(bill.issuedAt))}</div></div><h3>Invoice items</h3><table><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${lines}</tbody></table><div class="totals"><p><span>Invoice total</span><b>₹${Number(bill.subtotal).toFixed(2)}</b></p><p><span>Amount received</span><b>₹${paid.toFixed(2)}</b></p><p class="balance"><span>Balance due</span><b>₹${balance.toFixed(2)}</b></p></div><h3>Payment history</h3><table><thead><tr><th>Date</th><th>Method</th><th>Amount</th></tr></thead><tbody>${payments || "<tr><td colspan='3'>No payments recorded</td></tr>"}</tbody></table><p class="muted">Generated by City Care Hospital Management System.</p><script>window.onload=()=>window.print();</script></body></html>`);
    popup.document.close();
  }

  const estimate = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  return <div className="page-body">
    <PageTitle title="Billing & payments" subtitle="Create itemised invoices, accept partial or full payments, and track the balance due." action={<button className="secondary-button" onClick={load}>↻ Refresh</button>} />
    {error && <div className="alert error">{error}</div>}
    <section className="stats-grid compact-stats">
      <div className="mini-stat"><span>Outstanding balance</span><strong>{currency(outstanding)}</strong></div>
      <div className="mini-stat"><span>Invoices</span><strong>{bills.length}</strong></div>
      <div className="mini-stat"><span>Collected</span><strong>{currency(totalCollected)}</strong></div>
    </section>

    <section className="panel">
      <div className="panel-heading"><div><h3>Create invoice</h3><p>Add one or more consultation, lab, medicine or treatment charges.</p></div></div>
      <form onSubmit={create}>
        <div className="form-grid">
          <label>Patient<select required value={form.patient} onChange={e => setForm({ ...form, patient: e.target.value })}><option value="">Select registered patient</option>{patients.map(p => <option key={p._id} value={p._id}>{p.patientId ? `${p.patientId} · ` : ""}{p.fullName}</option>)}</select></label>
          <label>Due date<input type="date" min={localDateAfter(0)} required value={form.dueAt} onChange={e => setForm({ ...form, dueAt: e.target.value })} /></label>
          <label>Notes<input maxLength="500" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional billing notes" /></label>
        </div>
        <div className="invoice-lines">
          {items.map((item, index) => <div className="invoice-line form-grid" key={index}>
            <label>Item {index + 1}<input required maxLength="200" value={item.description} onChange={e => patchItem(index, { description: e.target.value })} placeholder="e.g. Consultation fee" /></label>
            <label>Quantity<input type="number" min="1" max="1000" step="1" required value={item.quantity} onChange={e => patchItem(index, { quantity: e.target.value })} /></label>
            <label>Unit price (₹)<input type="number" min="0" max="1000000" step="0.01" required value={item.unitPrice} onChange={e => patchItem(index, { unitPrice: e.target.value })} /></label>
            <div className="line-total"><span>Line total</span><strong>{currency((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</strong>{items.length > 1 && <button type="button" className="text-button danger-text" onClick={() => removeItem(index)}>Remove</button>}</div>
          </div>)}
        </div>
        <div className="invoice-form-footer"><button type="button" className="secondary-button" onClick={addItem} disabled={items.length >= 20}>＋ Add another item</button><div className="invoice-estimate"><span>Invoice total</span><strong>{currency(estimate)}</strong></div><button disabled={busy || !form.patient}>{busy ? "Saving…" : "Create invoice"}</button></div>
      </form>
    </section>

    <section className="panel">
      <div className="panel-heading"><div><h3>Invoices</h3><p>Record payments against the remaining balance. Payment history is retained for every invoice.</p></div></div>
      <div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Patient</th><th>Issued</th><th>Due</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {bills.map(bill => {
          const paid = Number(bill.amountPaid || (bill.status === "Paid" ? bill.subtotal : 0));
          const balance = Number(bill.balanceDue ?? Math.max(0, bill.subtotal - paid));
          return <tr key={bill._id}>
            <td>#{bill._id.slice(-8).toUpperCase()}</td><td><strong>{bill.patient?.fullName || "—"}</strong><small>{bill.patient?.patientId || ""}</small></td><td>{dateOnly(bill.issuedAt)}</td><td>{dateOnly(bill.dueAt)}</td>
            <td>{currency(bill.subtotal)}</td><td>{currency(paid)}</td><td><strong>{currency(balance)}</strong></td><td><StatusPill value={bill.status} /></td>
            <td className="actions-cell">{["Unpaid", "Partially Paid"].includes(bill.status) && <><button className="text-button" onClick={() => openPayment(bill)}>Record payment</button><button className="text-button danger-text" onClick={() => cancelBill(bill._id)}>Cancel</button></>}
              {paid > 0 && <button className="text-button" onClick={() => printReceipt(bill)}>Print receipt</button>}{bill.paymentHistory?.length > 0 && <details className="payment-history"><summary>History ({bill.paymentHistory.length})</summary>{bill.paymentHistory.map((entry, index) => <small key={entry._id || index}>{currency(entry.amount)} · {entry.mode} · {dateTime(entry.recordedAt)}</small>)}</details>}
            </td>
          </tr>;
        })}
      </tbody></table>{!bills.length && <div className="empty-state">No invoices created.</div>}</div>
    </section>

    {paymentTarget && <div className="modal-backdrop" role="presentation" onClick={e => { if (e.target === e.currentTarget) setPaymentTarget(null); }}><section className="panel payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title">
      <div className="panel-heading"><div><h3 id="payment-title">Record payment</h3><p>Invoice #{paymentTarget._id.slice(-8).toUpperCase()} · {paymentTarget.patient?.fullName}</p></div><button className="link-button" type="button" onClick={() => setPaymentTarget(null)}>Close</button></div>
      <p className="payment-balance">Outstanding: <strong>{currency(paymentTarget.balanceDue ?? (paymentTarget.subtotal - (paymentTarget.amountPaid || 0)))}</strong></p>
      <form className="form-grid" onSubmit={recordPayment}><label>Payment amount (₹)<input type="number" min="0.01" max={paymentTarget.balanceDue ?? (paymentTarget.subtotal - (paymentTarget.amountPaid || 0))} step="0.01" required value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} /></label><label>Payment method<select value={payment.mode} onChange={e => setPayment({ ...payment, mode: e.target.value })}>{["Cash", "Card", "UPI", "Bank Transfer"].map(mode => <option key={mode}>{mode}</option>)}</select></label><div className="form-actions"><button disabled={busy}>{busy ? "Recording…" : "Save payment"}</button></div></form>
    </section></div>}
  </div>;
}
