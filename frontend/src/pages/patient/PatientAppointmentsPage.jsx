import { useEffect, useState } from "react";
import { api } from "../../api";
import PageTitle from "../../components/common/PageTitle";
import StatusPill from "../../components/common/StatusPill";
import { dateTime } from "../../utils/format";

export default function PatientAppointmentsPage({ onLogout }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState(null);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    try { setRows(await api("/appointments")); setError(""); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!edit || !date) { setSlots([]); setSlot(""); return; }
    let active = true;
    setLoadingSlots(true); setSlots([]); setSlot("");
    api(`/public/availability?doctor=${encodeURIComponent(edit.doctor?._id || "")}&date=${encodeURIComponent(date)}`)
      .then(result => { if (active) setSlots(result.slots || []); })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoadingSlots(false); });
    return () => { active = false; };
  }, [edit, date]);

  async function cancel(id) {
    try { await api(`/appointments/${id}/cancel`, { method: "PATCH" }); await load(); }
    catch (e) { setError(e.message); }
  }

  function startReschedule(appointment) {
    setEdit(appointment);
    setDate(new Date(appointment.scheduledAt).toLocaleDateString("en-CA"));
    setSlot("");
  }

  async function reschedule(event) {
    event.preventDefault();
    const when = slot ? new Date(slot) : null;
    if (!when || Number.isNaN(when.getTime()) || when <= new Date()) { setError("Choose an available future time slot."); return; }
    setBusy(true); setError("");
    try {
      await api(`/appointments/${edit._id}/reschedule`, { method: "PATCH", body: JSON.stringify({ scheduledAt: when.toISOString() }) });
      setEdit(null); setDate(""); setSlot(""); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return <div className="role-page patient-theme">
    <header className="role-header"><div className="hospital-brand"><span className="brand-mark">✚</span><span><strong>City Care Hospital</strong><small>Patient portal</small></span></div><div className="role-header-actions"><a className="button button-light button-small" href="/patient/dashboard">Dashboard</a><a className="button button-light button-small" href="/patient/profile">Profile</a><a className="button button-light button-small" href="/patient/records">Records</a><a className="button button-light button-small" href="/patient/billing">Billing</a><button className="button button-outline button-small" onClick={onLogout}>Sign out</button></div></header>
    <main className="role-main"><PageTitle title="My appointments" subtitle="View, reschedule or cancel your own booked visits." action={<button className="secondary-button" onClick={load}>Refresh</button>} />
      {error && <div className="notice error-notice" role="alert">{error}</div>}
      <section className="panel"><div className="table-wrap"><table><thead><tr><th>Doctor</th><th>Department</th><th>Date & time</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {rows.map(a => <tr key={a._id}><td><strong>{a.doctor?.fullName || "—"}</strong><small>{a.doctor?.specialization || ""}</small></td><td>{a.doctor?.department || "—"}</td><td>{dateTime(a.scheduledAt)}</td><td>{a.reason || "Consultation"}</td><td><StatusPill value={a.status} /></td><td>{["Booked", "Confirmed"].includes(a.status) && <><button className="text-button" onClick={() => startReschedule(a)}>Reschedule</button><button className="text-button danger-text" onClick={() => cancel(a._id)}>Cancel</button></>}</td></tr>)}
      </tbody></table>{!rows.length && <div className="empty-state">No appointments found.</div>}</div></section>
    </main>
    {edit && <div className="modal-overlay"><form className="dialog-card" onSubmit={reschedule}><h3>Reschedule appointment</h3><p className="muted">Choose a date and one of the doctor's current available slots.</p><label>New date<input type="date" min={new Date().toLocaleDateString("en-CA")} value={date} onChange={e => setDate(e.target.value)} required /></label><label>Available time slot<select value={slot} onChange={e => setSlot(e.target.value)} disabled={!date || loadingSlots} required><option value="">{loadingSlots ? "Checking slots…" : slots.length ? "Choose a time" : "No available slots"}</option>{slots.map(item => <option key={item.scheduledAt} value={item.scheduledAt}>{item.label}</option>)}</select></label><div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setEdit(null)}>Back</button><button disabled={busy || !slot}>{busy ? "Saving…" : "Save new time"}</button></div></form></div>}
  </div>;
}
