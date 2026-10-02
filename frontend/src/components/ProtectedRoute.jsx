import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "./Navbar";

export default function ProtectedRoute() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="page-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div className="empty-state">
          <div className="record-icon">🔐</div>
          <h3>Verifying your session…</h3>
          <p>Securing your access, please wait.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="protected-shell">
      <Navbar />
      <div className="protected-content">
        <Outlet />
      </div>
    </div>
  );
}
