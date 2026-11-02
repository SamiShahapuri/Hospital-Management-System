import { Navigate, Outlet } from "react-router-dom";
export default function RoleRoute({ user, roles }) {
  if (!user) {
    const loginPath = roles?.includes("Doctor") ? "/doctor/login" : roles?.includes("Patient") ? "/patient/login" : "/login";
    return <Navigate to={loginPath} replace />;
  }
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${String(user.role || "").toLowerCase()}/dashboard`} replace />;
  return <Outlet />;
}
