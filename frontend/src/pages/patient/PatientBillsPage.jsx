import { useEffect, useState } from "react";
import { api } from "../../api";
import StatusPill from "../../components/common/StatusPill";
import { currency, dateOnly } from "../../utils/format";

export default function PatientBillsPage({ onLogout }) {
  const [bills, setBills] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { api("/billing").then(setBills).catch(e => setError(e.message)); }, []);
  const due = bills.reduce((sum, bill) => sum + (["Unpaid", "Partially Paid"].includes(bill.status) ? Number(bill.balanceDue ?? (bill.subtotal - (bill.amountPaid || 0))) : 0), 0);
  return <div className="role-page patient-theme"><header className="role-header"><div className="hospital-brand"><span className="brand-mark">✚</span><span><strong>City Care Hospital</strong><small>Patient portal</small></span></div><div className="role-header-actions"><a className="button button-light button-small" href="/patient/dashboard">Dashboard</a><a className="button button-light button-small" href="/patient/appointments">Appointments</a><button className="button button-outline button-small" onClick={onLogout}>Log out</button></div></header><main className="role-main"><div className="panel"><p className="eyebrow">BILLING</p><h2>My bills and payments</h2><p className="muted">Review invoices issued against your hospital record.</p><div className="patient-balance"><span>Outstanding balance</span><strong>{currency(due)}</strong></div>{error && <div className="notice error-notice">{error}</div>}<div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Issued</th><th>Due</th><th>Items</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>{bills.map(bill => <tr key={bill._id}><td>#{bill._id.slice(-8).toUpperCase()}</td><td>{dateOnly(bill.issuedAt)}</td><td>{dateOnly(bill.dueAt)}</td><td>{bill.items?.map(item => `${item.description} × ${item.quantity}`).join(", ")}</td><td>{currency(bill.subtotal)}</td><td>{currency(bill.amountPaid || (bill.status === "Paid" ? bill.subtotal : 0))}</td><td>{currency(bill.balanceDue ?? (bill.subtotal - (bill.amountPaid || 0)))}</td><td><StatusPill value={bill.status} /></td></tr>)}</tbody></table>{!bills.length && !error && <div className="empty-state">No bills have been issued yet.</div>}</div></div></main></div>;
}
