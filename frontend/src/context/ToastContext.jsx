import { createContext, useCallback, useContext, useState } from "react";
const ToastContext = createContext(() => {});
export function ToastProvider({ children }) {
  const [message, setMessage] = useState("");
  const notify = useCallback((value) => { setMessage(value); window.clearTimeout(notify.timer); notify.timer = window.setTimeout(() => setMessage(""), 3600); }, []);
  return <ToastContext.Provider value={notify}>{children}{message && <div className="toast" role="status">{message}</div>}</ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);
