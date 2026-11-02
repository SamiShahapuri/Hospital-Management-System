export default function PageTitle({ title, subtitle, action }) { return <div className="page-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>; }
