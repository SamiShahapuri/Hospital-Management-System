import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import PageTitle from "../../components/common/PageTitle";
import { dateOnly } from "../../utils/format";
import { useToast } from "../../context/ToastContext";

const empty = { fullName: "", age: "", gender: "", phone: "", email: "", address: "" };
export default function PatientsPage() {
  const notify = useToast();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState(empty);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try { setRows(await api("/patients")); setError(""); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter(p =>
    `${p.patientId || ""} ${p.fullName} ${p.phone || ""} ${p.email || ""} ${p._id}`.toLowerCase().includes(q.toLowerCase())
  ), [rows, q]);

  async function create(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const created = await api("/patients", { method: "POST", body: JSON.stringify(form) });
      setForm(empty); notify(`Patient registered. ID: ${created.patientId}`); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function view(id) {
    try {
      const patient = await api(`/patients/${id}`);
      setSelected(patient);
      setEditForm({ fullName: patient.fullName || "", age: patient.age ?? "", gender: patient.gender || "", phone: patient.phone || "", email: patient.email || "", address: patient.address || "" });
      setEditing(false);
    } catch (e) { setError(e.message); }
  }

  async function savePatient(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const updated = await api(`/patients/${selected._id}`, { method: "PATCH", body: JSON.stringify(editForm) });
      setSelected(updated); setEditing(false); notify("Patient record updated across the system."); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return <div className="page-body">
    <PageTitle title="Patient records" subtitle="Register patients first. They can activate their own login later using the Patient ID and registered email." action={<button className="secondary-button" onClick={load}>↻ Refresh</button>} />
    {error && <div className="alert error">{error}</div>}
    <section className="panel">
      <div className="panel-heading"><div><h3>Register a patient</h3><p>A hospital record must exist before a patient can create a login.</p></div><span className="subtle-tag">Staff only</span></div>
      <form className="form-grid" onSubmit={create}>
        <label>Full name<input maxLength="120" required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></label>
        <label>Age<input type="number" min="0" max="120" step="1" required value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></label>
        <label>Gender<select required value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}><option value="">Choose gender</option><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select></label>
        <label>Phone<input type="tel" pattern={"[+0-9 \\(\\)\\-]{7,30}"} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
        <label>Registered email<input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
        <label>Address<input maxLength="300" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></label>
        <div className="form-actions"><button disabled={busy}>{busy ? "Saving…" : "Register patient"}</button></div>
      </form>
    </section>
    <section className="panel">
      <div className="panel-heading"><div><h3>Patient directory</h3><p>{filtered.length} records found · share the Patient ID with the patient</p></div><input className="search-input" placeholder="Search Patient ID, name, phone or email" value={q} onChange={e => setQ(e.target.value)} /></div>
      <div className="table-wrap"><table><thead><tr><th>Patient ID</th><th>Patient</th><th>Contact</th><th>Email</th><th>Registered</th><th>Record</th></tr></thead><tbody>
        {filtered.map(p => <tr key={p._id}><td><strong>{p.patientId || p._id}</strong></td><td><strong>{p.fullName}</strong></td><td>{p.phone || "—"}</td><td>{p.email || "—"}</td><td>{dateOnly(p.createdAt)}</td><td><button className="text-button" onClick={() => view(p._id)}>View / edit →</button></td></tr>)}
      </tbody></table>{!filtered.length && <div className="empty-state">No patients found.</div>}</div>
    </section>
    {selected && <div className="modal-overlay" onClick={() => setSelected(null)}><section className="dialog-card profile-dialog" onClick={e => e.stopPropagation()}>
      <div className="panel-heading"><div><p className="eyebrow">PATIENT PROFILE · {selected.patientId || "ID unavailable"}</p><h3>{selected.fullName}</h3><p>Patient record and portal activation status</p></div><button className="icon-close" onClick={() => setSelected(null)}>×</button></div>
      {editing ? <form className="form-grid" onSubmit={savePatient}>
        <label>Full name<input required value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} /></label>
        <label>Age<input type="number" min="0" max="120" step="1" value={editForm.age} onChange={e => setEditForm({ ...editForm, age: e.target.value })} /></label>
        <label>Gender<select value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}><option value="">Not specified</option><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select></label>
        <label>Phone<input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} /></label>
        <label>Email<input type="email" required value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} /></label>
        <label>Address<input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} /></label>
        <div className="form-actions"><button disabled={busy}>{busy ? "Saving…" : "Save patient details"}</button><button className="secondary-button" type="button" onClick={() => setEditing(false)}>Cancel</button></div>
      </form> : <>
        <div className="detail-grid"><div><span>Patient ID</span><strong>{selected.patientId || selected._id}</strong></div><div><span>Age / Gender</span><strong>{selected.age ?? "—"} · {selected.gender || "—"}</strong></div><div><span>Phone</span><strong>{selected.phone || "—"}</strong></div><div><span>Email</span><strong>{selected.email || "—"}</strong></div><div><span>Portal</span><strong>{selected.linkedUser ? "Account activated" : "Not activated"}</strong></div><div><span>Blood group</span><strong>{selected.bloodGroup || "Not recorded"}</strong></div><div><span>Address</span><strong>{selected.address || "—"}</strong></div></div>
        <button className="secondary-button" onClick={() => setEditing(true)}>Edit contact details</button>
      </>}
      <h4>Medical history</h4>{selected.medicalHistory?.length ? selected.medicalHistory.slice().reverse().map((r, i) => <div className="history-item" key={r._id || i}><strong>{r.diagnosis || "Clinical note"}</strong><p>{r.treatment || r.note}</p><small>{dateOnly(r.recordedAt)}</small></div>) : <p className="muted">No medical history recorded.</p>}
      <h4>Prescriptions</h4>{selected.prescriptions?.length ? selected.prescriptions.slice().reverse().map((r, i) => <div className="history-item" key={r._id || i}><strong>{r.medicine}</strong><p>{[r.dosage, r.frequency, r.duration].filter(Boolean).join(" · ")}</p><p>{r.instructions}</p></div>) : <p className="muted">No prescriptions recorded.</p>}
    </section></div>}
  </div>;
}
