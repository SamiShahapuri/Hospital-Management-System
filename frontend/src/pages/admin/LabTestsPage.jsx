import { useEffect, useState } from "react";
import { api } from "../../api";
import PageTitle from "../../components/common/PageTitle";
import StatusPill from "../../components/common/StatusPill";
import { dateTime } from "../../utils/format";
import { useToast } from "../../context/ToastContext";

const blank = { patient: "", testName: "", scheduledAt: "", notes: "" };
const localDateTime = (date = new Date(Date.now() + 60 * 60 * 1000)) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function LabTestsPage() {
  const notify = useToast();
  const [patients, setPatients] = useState([]);
  const [tests, setTests] = useState([]);
  const [form, setForm] = useState({ ...blank, scheduledAt: localDateTime() });
  const [resultTarget, setResultTarget] = useState(null);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("All");

  async function load() {
    try {
      const [p, t] = await Promise.all([api("/patients"), api("/lab-tests")]);
      setPatients(p); setTests(t); setError("");
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function schedule(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const time = new Date(form.scheduledAt);
      if (!form.patient || !form.testName.trim() || Number.isNaN(time.getTime()) || time <= new Date()) throw new Error("Choose a registered patient, test name and future date/time.");
      await api("/lab-tests", { method: "POST", body: JSON.stringify({ ...form, scheduledAt: time.toISOString() }) });
      setForm({ ...blank, scheduledAt: localDateTime() }); notify("Lab test scheduled. It will appear in the reminder center before the appointment."); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function update(id, payload) {
    setBusy(true); setError("");
    try { await api(`/lab-tests/${id}`, { method: "PATCH", body: JSON.stringify(payload) }); notify(payload.status === "Completed" ? "Lab result saved." : `Lab test marked ${payload.status.toLowerCase()}.`); setResultTarget(null); setResult(""); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const visible = tests.filter(test => filter === "All" || test.status === filter);
  return <div className="page-body">
    <PageTitle title="Lab test management" subtitle="Schedule patient investigations, record results, and surface upcoming tests in the notification center." action={<button className="secondary-button" onClick={load}>↻ Refresh</button>} />
    {error && <div className="alert error">{error}</div>}
    <section className="stats-grid compact-stats">
      <div className="mini-stat"><span>Scheduled</span><strong>{tests.filter(t => t.status === "Scheduled").length}</strong></div>
      <div className="mini-stat"><span>In progress</span><strong>{tests.filter(t => t.status === "In Progress").length}</strong></div>
      <div className="mini-stat"><span>Completed</span><strong>{tests.filter(t => t.status === "Completed").length}</strong></div>
    </section>
    <section className="panel">
      <div className="panel-heading"><div><h3>Schedule a lab test</h3><p>Only patients already present in the hospital register are available here.</p></div></div>
      <form className="form-grid" onSubmit={schedule}>
        <label>Patient<select required value={form.patient} onChange={e => setForm({ ...form, patient: e.target.value })}><option value="">Select patient</option>{patients.map(p => <option key={p._id} value={p._id}>{p.patientId || p._id.slice(-6)} · {p.fullName}</option>)}</select></label>
        <label>Test name<input required maxLength="160" value={form.testName} onChange={e => setForm({ ...form, testName: e.target.value })} placeholder="e.g. Complete Blood Count" /></label>
        <label>Scheduled date & time<input type="datetime-local" min={localDateTime()} required value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} /></label>
        <label>Notes<input maxLength="1000" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional preparation instructions" /></label>
        <div className="form-actions"><button disabled={busy || !patients.length}>{busy ? "Scheduling…" : "Schedule lab test"}</button></div>
      </form>
      {!patients.length && <p className="field-note">Register a patient before scheduling a test.</p>}
    </section>
    <section className="panel">
      <div className="panel-heading"><div><h3>Lab test register</h3><p>{visible.length} records displayed</p></div><label className="inline-filter">Status<select value={filter} onChange={e => setFilter(e.target.value)}>{["All", "Scheduled", "In Progress", "Completed", "Cancelled"].map(x => <option key={x}>{x}</option>)}</select></label></div>
      <div className="table-wrap"><table><thead><tr><th>Patient</th><th>Investigation</th><th>Scheduled</th><th>Result</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {visible.map(test => <tr key={test._id}><td><strong>{test.patient?.fullName || "—"}</strong><small>{test.patient?.patientId || ""}</small></td><td>{test.testName}<small>{test.notes || ""}</small></td><td>{dateTime(test.scheduledAt)}</td><td>{test.result || "—"}</td><td><StatusPill value={test.status} /></td><td className="actions-cell">{test.status === "Scheduled" && <button className="text-button" onClick={() => update(test._id, { status: "In Progress" })}>Start</button>}{["Scheduled", "In Progress"].includes(test.status) && <><button className="text-button" onClick={() => { setResultTarget(test); setResult(test.result || ""); }}>Enter result</button><button className="text-button danger-text" onClick={() => update(test._id, { status: "Cancelled" })}>Cancel</button></>}</td></tr>)}
      </tbody></table>{!visible.length && <div className="empty-state">No lab tests match this status.</div>}</div>
    </section>
    {resultTarget && <div className="modal-overlay"><form className="dialog-card" onSubmit={e => { e.preventDefault(); update(resultTarget._id, { status: "Completed", result }); }}><h3>Complete lab test</h3><p className="muted">{resultTarget.testName} · {resultTarget.patient?.fullName}</p><label>Result<textarea rows="5" maxLength="3000" required value={result} onChange={e => setResult(e.target.value)} placeholder="Enter findings / result summary" /></label><div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setResultTarget(null)}>Cancel</button><button disabled={busy || !result.trim()}>{busy ? "Saving…" : "Save result & complete"}</button></div></form></div>}
  </div>;
}
