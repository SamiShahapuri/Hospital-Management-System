import jwt from "jsonwebtoken";
export function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "development-only-secret");
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: "You do not have permission for this action" });
    next();
  };
}
