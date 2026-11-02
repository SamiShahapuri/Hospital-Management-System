import { useEffect, useState } from "react";
import { api } from "../../api";
import PageTitle from "../../components/common/PageTitle";
import { currency, dateOnly, dateTime } from "../../utils/format";

const today = new Date().toLocaleDateString("en-CA");
const monthAgo = (() => { const date = new Date(); date.setDate(date.getDate() - 30); return date.toLocaleDateString("en-CA"); })();

export default function ReportsPage() {
  const [summary, setSummary] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [filters, setFilters] = useState({ type: "appointments", from: monthAgo, to: today, status: "", doctor: "" });
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/reports/summary").then(setSummary).catch(e => setError(e.message));
    api("/doctors").then(setDoctors).catch(() => {});
  }, []);

  async function generate(e) {
    e?.preventDefault(); setBusy(true); setError("");
    try {
      const params = new URLSearchParams({ type: filters.type, from: filters.from, to: filters.to });
      if (filters.status && ["appointments", "labTests"].includes(filters.type)) params.set("status", filters.status);
      if (filters.doctor && ["appointments", "doctors"].includes(filters.type)) params.set("doctor", filters.doctor);
      setReport(await api(`/reports/detail?${params.toString()}`));
    } catch (e) { setError(e.message); setReport(null); }
    finally { setBusy(false); }
  }
  useEffect(() => { generate(); }, []);

  function exportCsv() {
    if (!report?.rows?.length) return;
    const fields = report.type === "patients" ? ["patientId", "fullName", "email", "phone", "createdAt"]
      : report.type === "doctors" ? ["fullName", "specialization", "department", "appointmentCount"]
      : report.type === "appointments" ? ["patient", "doctor", "department", "scheduledAt", "status"]
      : report.type === "admissions" ? ["patient", "roomNumber", "bedNumber", "admittedAt", "dischargedAt", "status"]
      : report.type === "labTests" ? ["patient", "testName", "scheduledAt", "status", "result"] : ["patient", "amount", "mode", "paidAt", "status"];
    const cell = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const lines = [fields.join(","), ...report.rows.map(row => fields.map(key => {
      if (key === "patient") return cell(row.patient?.fullName || "");
      if (key === "doctor") return cell(row.doctor?.fullName || "");
      if (key === "department") return cell(row.doctor?.department || row.department || "");
      if (["createdAt", "scheduledAt", "admittedAt", "dischargedAt", "paidAt"].includes(key)) return cell(row[key] ? new Date(row[key]).toISOString() : "");
      return cell(row[key]);
    }).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = `hms-${report.type}-report.csv`; link.click(); URL.revokeObjectURL(url);
  }

  const rows = report?.rows || [];
  return <div className="page-body">
    <PageTitle title="Reports & analytics" subtitle="Live reports across patient registration, doctor performance, appointments, admissions, lab tests and payments." />
    {error && <div className="alert error">{error}</div>}
    {summary && <section className="stats-grid"><div className="stat-card"><div className="stat-icon">♙</div><div><span>Patients</span><strong>{summary.patients}</strong></div></div><div className="stat-card green"><div className="stat-icon">✚</div><div><span>Active doctors</span><strong>{summary.activeDoctors}</strong></div></div><div className="stat-card violet"><div className="stat-icon">₹</div><div><span>Paid revenue</span><strong>{currency(summary.paidRevenue)}</strong></div></div><div className="stat-card amber"><div className="stat-icon">◷</div><div><span>Outstanding</span><strong>{currency(summary.outstandingAmount)}</strong></div></div></section>}
    {summary && <section className="dashboard-grid">{[{ title: "Appointments", values: summary.appointments || {} }, { title: "Admissions", values: summary.admissions || {} }, { title: "Bills", values: summary.bills || {} }].map(group => { const entries = Object.entries(group.values); const max = Math.max(1, ...entries.map(([, value]) => value)); return <article className="panel" key={group.title}><div className="panel-heading"><div><h3>{group.title} distribution</h3><p>All-time records grouped by status</p></div></div>{entries.length ? entries.map(([name, value]) => <div className="chart-row" key={name}><span>{name}</span><div className="bar-track"><i style={{ width: `${value / max * 100}%` }} /></div><strong>{value}</strong></div>) : <p className="muted">No records yet.</p>}</article>; })}</section>}
    <section className="panel">
      <div className="panel-heading"><div><h3>Generate detailed report</h3><p>Choose a report type, date range and optional filters. Updated data is retrieved each time.</p></div></div>
      <form className="filter-row report-filters" onSubmit={generate}>
        <label>Report type<select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value, status: "", doctor: "" })}><option value="patients">Patient registrations</option><option value="doctors">Doctor performance</option><option value="appointments">Appointments</option><option value="admissions">Admissions & discharge</option><option value="payments">Payments</option><option value="labTests">Lab tests</option></select></label>
        <label>From<input type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} required /></label>
        <label>To<input type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} required /></label>
        {["appointments", "labTests"].includes(filters.type) && <label>Status<select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{(filters.type === "labTests" ? ["Scheduled", "In Progress", "Completed", "Cancelled"] : ["Booked", "Confirmed", "Completed", "Cancelled", "No-show"]).map(value => <option key={value}>{value}</option>)}</select></label>}
        {["appointments", "doctors"].includes(filters.type) && <label>Doctor<select value={filters.doctor} onChange={e => setFilters({ ...filters, doctor: e.target.value })}><option value="">All doctors</option>{doctors.map(doctor => <option key={doctor._id} value={doctor._id}>{doctor.fullName}</option>)}</select></label>}
        <button disabled={busy}>{busy ? "Generating…" : "Generate report"}</button>
      </form>
      {report && <><div className="report-result-head"><div><strong>{report.summary?.total ?? report.summary?.completedAppointments ?? report.summary?.paidAmount ?? rows.length}</strong><span> result metric · generated {new Date(report.generatedAt).toLocaleString()}</span></div><button className="secondary-button" disabled={!rows.length} onClick={exportCsv}>Export CSV ↓</button></div>
        {report.type === "payments" && <p className="report-total">Total payments: <strong>{currency(report.summary.paidAmount || 0)}</strong></p>}
        <div className="table-wrap"><table><thead><tr>{report.type === "patients" ? <><th>Patient ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Registered</th></> : report.type === "doctors" ? <><th>Doctor</th><th>Specialization</th><th>Department</th><th>Completed appointments</th></> : report.type === "appointments" ? <><th>Patient</th><th>Doctor</th><th>Department</th><th>Scheduled</th><th>Status</th></> : report.type === "admissions" ? <><th>Patient</th><th>Location</th><th>Admitted</th><th>Discharged</th><th>Status</th></> : report.type === "labTests" ? <><th>Patient</th><th>Test</th><th>Scheduled</th><th>Result</th><th>Status</th></> : <><th>Patient</th><th>Amount</th><th>Method</th><th>Paid date</th><th>Status</th></>}</tr></thead><tbody>
          {rows.map(row => <tr key={row._id}>{report.type === "patients" ? <><td>{row.patientId || "—"}</td><td>{row.fullName}</td><td>{row.email || "—"}</td><td>{row.phone || "—"}</td><td>{dateOnly(row.createdAt)}</td></> : report.type === "doctors" ? <><td>{row.fullName}</td><td>{row.specialization}</td><td>{row.department}</td><td>{row.appointmentCount}</td></> : report.type === "appointments" ? <><td>{row.patient?.fullName || "—"}</td><td>{row.doctor?.fullName || "—"}</td><td>{row.doctor?.department || "—"}</td><td>{dateTime(row.scheduledAt)}</td><td>{row.status}</td></> : report.type === "admissions" ? <><td>{row.patient?.fullName || "—"}</td><td>{row.bed?.room?.roomNumber || row.roomNumber || "—"} · {row.bed?.bedNumber || row.bedNumber || "—"}</td><td>{dateTime(row.admittedAt)}</td><td>{row.dischargedAt ? dateTime(row.dischargedAt) : "—"}</td><td>{row.status}</td></> : report.type === "labTests" ? <><td>{row.patient?.fullName || "—"}</td><td>{row.testName}</td><td>{dateTime(row.scheduledAt)}</td><td>{row.result || "Pending"}</td><td>{row.status}</td></> : <><td>{row.patient?.fullName || "—"}</td><td>{currency(row.amount)}</td><td>{row.mode}</td><td>{dateTime(row.paidAt)}</td><td>{row.status}</td></>}</tr>)}
        </tbody></table>{!rows.length && <div className="empty-state">No records found for the selected period.</div>}</div></>}
    </section>
  </div>;
}
