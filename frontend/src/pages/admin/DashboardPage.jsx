import { useEffect, useState } from "react";
import { api } from "../../api";
import StatCard from "../../components/common/StatCard";
import StatusPill from "../../components/common/StatusPill";
import { currency, dateTime } from "../../utils/format";
import { useOutletContext } from "react-router-dom";
import { Link } from "react-router-dom";
export default function DashboardPage() {
  const { user } = useOutletContext();
  const [data,setData]=useState({patients:[],doctors:[],appointments:[],admissions:[],summary:null});
  const [error,setError]=useState(""); const [loading,setLoading]=useState(true);
  async function load(){setLoading(true);try{const [patients,doctors,appointments,admissions,summary]=await Promise.all([api("/patients"),api("/doctors"),api("/appointments"),api("/admissions"),user.role==="Admin"?api("/reports/summary"):Promise.resolve(null)]);setData({patients,doctors,appointments,admissions,summary});setError("");}catch(e){setError(e.message);}finally{setLoading(false);}}
  useEffect(()=>{load();},[]);
  const active=data.appointments.filter(a=>["Booked","Confirmed"].includes(a.status)); const today=new Date().toDateString(); const todayItems=active.filter(a=>new Date(a.scheduledAt).toDateString()===today);
  const bars=[{label:"Booked",value:data.appointments.filter(a=>["Booked","Confirmed"].includes(a.status)).length},{label:"Completed",value:data.appointments.filter(a=>a.status==="Completed").length},{label:"Cancelled",value:data.appointments.filter(a=>a.status==="Cancelled").length}]; const max=Math.max(1,...bars.map(x=>x.value));
  if(loading)return <div className="loading-state">Loading hospital overview…</div>;
  return <div className="page-body">{error&&<div className="alert error">{error}</div>}
    <section className="stats-grid"><StatCard label="Registered patients" value={data.patients.length} detail="Patient records" icon="♙"/><StatCard label="Active doctors" value={data.doctors.length} detail="Clinical team" icon="✚" tone="green"/><StatCard label="Today's appointments" value={todayItems.length} detail={`${active.length} booked overall`} icon="◷" tone="violet"/><StatCard label="Current admissions" value={data.admissions.filter(a=>a.status==="Admitted").length} detail="Inpatient care" icon="▣" tone="amber"/></section>
    <section className="dashboard-grid"><article className="panel"><div className="panel-heading"><div><h3>Appointment activity</h3><p>Current status distribution</p></div><Link to={`/${user.role.toLowerCase()}/appointments`}>Open schedule →</Link></div>{bars.map(b=><div className="chart-row" key={b.label}><span>{b.label}</span><div className="bar-track"><i style={{width:`${b.value/max*100}%`}}/></div><strong>{b.value}</strong></div>)}<p className="chart-footnote">Counts reflect the appointment records returned by the current account.</p></article>
      <article className="panel"><div className="panel-heading"><div><h3>Quick actions</h3><p>Common front-desk workflows</p></div></div><div className="quick-link-grid"><Link to={`/${user.role.toLowerCase()}/appointments`}><span>◷</span><strong>Schedule visit</strong><small>Book or reschedule</small></Link><Link to={`/${user.role.toLowerCase()}/patients`}><span>♙</span><strong>Register patient</strong><small>Create a record</small></Link>{user.role==="Admin"&&<Link to="/admin/beds"><span>▣</span><strong>Bed overview</strong><small>Manage capacity</small></Link>}<Link to={`/${user.role.toLowerCase()}/admissions`}><span>⇄</span><strong>Admissions</strong><small>Admit or discharge</small></Link></div></article></section>
    <section className="panel"><div className="panel-heading"><div><h3>Next appointments</h3><p>Upcoming booked consultations</p></div><button className="secondary-button" onClick={load}>Refresh</button></div>{active.length===0?<div className="empty-state">No booked appointments to display.</div>:<div className="table-wrap"><table><thead><tr><th>Patient</th><th>Doctor</th><th>Date & time</th><th>Department</th><th>Status</th></tr></thead><tbody>{active.slice().sort((a,b)=>new Date(a.scheduledAt)-new Date(b.scheduledAt)).slice(0,7).map(a=><tr key={a._id}><td><strong>{a.patient?.fullName||"—"}</strong><small>{a.patient?.phone||""}</small></td><td>{a.doctor?.fullName||"—"}</td><td>{dateTime(a.scheduledAt)}</td><td>{a.doctor?.department||"—"}</td><td><StatusPill value={a.status}/></td></tr>)}</tbody></table></div>}</section>
    {data.summary&&<div className="revenue-strip"><div><span>Paid revenue</span><strong>{currency(data.summary.paidRevenue)}</strong></div><div><span>Outstanding</span><strong>{currency(data.summary.outstandingAmount)}</strong></div><div><span>Bills issued</span><strong>{(data.summary.bills?.Paid||0)+(data.summary.bills?.Unpaid||0)}</strong></div></div>}
  </div>;
}
