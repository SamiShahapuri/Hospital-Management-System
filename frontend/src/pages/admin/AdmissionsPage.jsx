import { useEffect, useState } from "react";
import { api } from "../../api";
import PageTitle from "../../components/common/PageTitle";
import StatusPill from "../../components/common/StatusPill";
import { dateTime } from "../../utils/format";
import { useToast } from "../../context/ToastContext";

const emptyForm = { patient: "", bed: "", roomNumber: "", bedNumber: "" };
export default function AdmissionsPage() {
  const notify = useToast();
  const [patients, setPatients] = useState([]);
  const [rows, setRows] = useState([]);
  const [beds, setBeds] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [transferId, setTransferId] = useState("");
  const [transferBed, setTransferBed] = useState("");
  const [historyRow, setHistoryRow] = useState(null);
  const [treatmentTarget, setTreatmentTarget] = useState(null);
  const [treatment, setTreatment] = useState({ description: "", details: "" });
  const [dischargeTarget, setDischargeTarget] = useState(null);
  const [dischargeSummary, setDischargeSummary] = useState("");

  async function load() {
    try {
      const [p, a, b] = await Promise.all([api("/patients"), api("/admissions"), api("/facility/beds")]);
      setPatients(p); setRows(a); setBeds(b); setError("");
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function admit(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const payload = form.bed ? { patient: form.patient, bed: form.bed } : { patient: form.patient, roomNumber: form.roomNumber, bedNumber: form.bedNumber };
      await api("/admissions", { method: "POST", body: JSON.stringify(payload) });
      setForm(emptyForm); notify("Patient admitted and bed allocated."); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function saveTreatment(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await api(`/admissions/${treatmentTarget._id}/treatments`, { method: "POST", body: JSON.stringify(treatment) });
      notify("Treatment added to the admission record."); setTreatmentTarget(null); setTreatment({ description: "", details: "" }); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function discharge(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const result = await api(`/admissions/${dischargeTarget._id}/discharge`, { method: "PATCH", body: JSON.stringify({ dischargeSummary }) });
      notify(result.roomChargeBill ? "Patient discharged. Bed released and room charges added to billing." : "Patient discharged; bed released.");
      setDischargeTarget(null); setDischargeSummary(""); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function transfer(e) {
    e.preventDefault(); setBusy(true);
    try {
      await api(`/admissions/${transferId}/transfer`, { method: "PATCH", body: JSON.stringify({ bed: transferBed }) });
      setTransferId(""); setTransferBed(""); notify("Patient transferred to the selected bed."); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return <div className="page-body">
    <PageTitle title="Inpatient admissions" subtitle="Admit patients, record treatment during their stay, transfer beds and discharge with a required summary." action={<button className="secondary-button" onClick={load}>↻ Refresh</button>} />
    {error && <div className="alert error">{error}</div>}
    <section className="panel">
      <div className="panel-heading"><div><h3>New admission</h3><p>Choose a registered patient and allocate a tracked room/bed.</p></div></div>
      <form className="form-grid" onSubmit={admit}>
        <label>Patient<select required value={form.patient} onChange={e => setForm({ ...form, patient: e.target.value })}><option value="">Select patient</option>{patients.map(p => <option key={p._id} value={p._id}>{p.fullName} · {p.patientId || p._id.slice(-6)}</option>)}</select></label>
        <label>Tracked available bed<select value={form.bed} onChange={e => setForm({ ...form, bed: e.target.value })}><option value="">Use legacy room/bed fields</option>{beds.filter(b => ["Available", "Reserved"].includes(b.status)).map(b => <option key={b._id} value={b._id}>{b.room?.ward?.name || "Ward"} · {b.room?.roomNumber || "Room"} · {b.bedNumber}</option>)}</select></label>
        {!form.bed && <><label>Room number<input required maxLength="30" value={form.roomNumber} onChange={e => setForm({ ...form, roomNumber: e.target.value })} /></label><label>Bed number<input required maxLength="30" value={form.bedNumber} onChange={e => setForm({ ...form, bedNumber: e.target.value })} /></label></>}
        <div className="form-actions"><button disabled={busy}>{busy ? "Saving…" : "Admit patient"}</button></div>
      </form>
      <p className="field-note">Tracked beds are reserved for this admission. Discharging a patient releases the bed and automatically adds room charges to billing.</p>
    </section>

    <section className="panel">
      <div className="panel-heading"><div><h3>Admission history</h3><p>{rows.length} recent records</p></div></div>
      <div className="table-wrap"><table><thead><tr><th>Patient</th><th>Location</th><th>Admitted</th><th>Discharged</th><th>Treatments</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {rows.map(a => <tr key={a._id}>
          <td><strong>{a.patient?.fullName || "—"}</strong><small>{a.patient?.phone || ""}</small></td>
          <td>{a.bed?.room?.roomNumber || a.roomNumber} · {a.bed?.bedNumber || a.bedNumber}{a.bed?.room?.ward?.name ? ` · ${a.bed.room.ward.name}` : ""}</td>
          <td>{dateTime(a.admittedAt)}</td><td>{a.dischargedAt ? dateTime(a.dischargedAt) : "—"}</td>
          <td>{a.treatments?.length || 0}</td><td><StatusPill value={a.status} /></td>
          <td className="actions-cell">{a.status === "Admitted" && <><button className="text-button" onClick={() => { setTreatmentTarget(a); setTreatment({ description: "", details: "" }); }}>Add treatment</button><button className="text-button" onClick={() => { setTransferId(a._id); setTransferBed(""); }}>Transfer</button><button className="text-button danger-text" onClick={() => { setDischargeTarget(a); setDischargeSummary(""); }}>Discharge</button></>}{(a.transferHistory?.length > 0 || a.treatments?.length > 0 || a.dischargeSummary) && <button className="text-button" onClick={() => setHistoryRow(a)}>Details</button>}</td>
        </tr>)}
      </tbody></table>{!rows.length && <div className="empty-state">No admissions recorded.</div>}</div>
    </section>

    {treatmentTarget && <div className="modal-overlay"><form className="dialog-card" onSubmit={saveTreatment}><h3>Add treatment / procedure</h3><p className="muted">Record this entry against {treatmentTarget.patient?.fullName || "the active admission"}.</p><label>Treatment or procedure<input maxLength="300" required value={treatment.description} onChange={e => setTreatment({ ...treatment, description: e.target.value })} placeholder="e.g. IV therapy" /></label><label>Details<textarea rows="3" maxLength="1000" value={treatment.details} onChange={e => setTreatment({ ...treatment, details: e.target.value })} placeholder="Medicine, procedure details or observations" /></label><div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setTreatmentTarget(null)}>Cancel</button><button disabled={busy}>{busy ? "Saving…" : "Save treatment"}</button></div></form></div>}

    {dischargeTarget && <div className="modal-overlay"><form className="dialog-card" onSubmit={discharge}><h3>Discharge patient</h3><p className="muted">A discharge summary is required. For a tracked bed, the system also generates room charges.</p><label>Discharge summary<textarea rows="4" maxLength="2000" required value={dischargeSummary} onChange={e => setDischargeSummary(e.target.value)} placeholder="Condition, outcome and advice for the patient" /></label><div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setDischargeTarget(null)}>Cancel</button><button disabled={busy || !dischargeSummary.trim()}>{busy ? "Discharging…" : "Confirm discharge"}</button></div></form></div>}

    {transferId && <div className="modal-overlay"><form className="dialog-card" onSubmit={transfer}><h3>Transfer patient</h3><p className="muted">Select an available bed in another room or ward.</p><label>Destination bed<select required value={transferBed} onChange={e => setTransferBed(e.target.value)}><option value="">Choose destination</option>{beds.filter(b => ["Available", "Reserved"].includes(b.status)).map(b => <option key={b._id} value={b._id}>{b.room?.ward?.name} · Room {b.room?.roomNumber} · {b.bedNumber}</option>)}</select></label><div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setTransferId("")}>Cancel</button><button disabled={busy}>Confirm transfer</button></div></form></div>}

    {historyRow && <div className="modal-overlay" onClick={() => setHistoryRow(null)}><section className="dialog-card" onClick={e => e.stopPropagation()}><h3>Admission details</h3><p className="muted">{historyRow.patient?.fullName || "Patient"} · {historyRow.patient?.patientId || "Hospital patient record"}</p>
      <h4>Treatments and procedures</h4>{historyRow.treatments?.length ? historyRow.treatments.map((item, index) => <article className="history-item" key={item._id || index}><strong>{item.description}</strong><p>{item.details || "No additional details"}</p><small>{dateTime(item.recordedAt)}</small></article>) : <p className="muted">No treatment entries.</p>}
      <h4>Discharge summary</h4><p className="muted">{historyRow.dischargeSummary || "Not yet discharged."}</p>
      <h4>Bed transfer history</h4>{historyRow.transferHistory?.length ? historyRow.transferHistory.map((item, index) => <article className="history-item" key={item._id || index}><strong>{item.fromBed?.bedNumber || "Previous bed"} → {item.toBed?.bedNumber || "New bed"}</strong><p>{item.fromBed?.room?.roomNumber || "—"} → {item.toBed?.room?.roomNumber || "—"}</p><small>{dateTime(item.transferredAt)}</small></article>) : <p className="muted">No bed transfers.</p>}
      <div className="dialog-actions"><button type="button" onClick={() => setHistoryRow(null)}>Close</button></div>
    </section></div>}
  </div>;
}
