import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { useAuth } from "../context/AuthContext";

const emptyStats = { totalRecords: 0, activeSessions: 0, timeline: [] };

const fallbackTimeline = Array.from({ length: 7 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - index));
  return { day: date.toISOString().slice(0, 10), count: 0 };
});

function decodeToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload.exp) {
      return { payload, expiresInLabel: "Session active" };
    }
    const expiresAt = payload.exp * 1000;
    const diffMs = expiresAt - Date.now();
    const minutes = Math.max(0, Math.round(diffMs / 60000));
    const expiresInLabel = minutes > 120 ? `${(minutes / 60).toFixed(1)} hrs` : `${minutes} min`;
    return {
      payload,
      expiresAt,
      expiresInMinutes: minutes,
      expiresAtLabel: new Date(expiresAt).toLocaleString(),
      expiresInLabel,
    };
  } catch (err) {
    console.warn("Failed to decode token", err);
    return null;
  }
}

export default function Security() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(emptyStats);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      try {
        const res = await API.get("/stats", { params: { range: "30d" } });
        if (mounted && res.data) {
          setStats((prev) => ({ ...prev, ...res.data }));
        }
      } catch (err) {
        console.warn("Failed to load stats", err);
      }
    };

    const fetchAudit = async () => {
      try {
        const res = await API.get("/audit", { params: { limit: 8 } });
        if (mounted) {
          setAuditLogs(res.data?.logs || []);
          setAuditError(null);
        }
      } catch (err) {
        const status = err.response?.status;
        const message =
          status === 403
            ? "Audit feed requires admin privileges."
            : "Audit service unavailable right now.";
        if (mounted) {
          setAuditError(message);
          setAuditLogs([]);
        }
      } finally {
        if (mounted) {
          setAuditLoading(false);
        }
      }
    };

    fetchStats();
    fetchAudit();

    return () => {
      mounted = false;
    };
  }, []);

  const sessionMeta = useMemo(() => decodeToken(token), [token]);

  const timelineSeries = useMemo(() => {
    const source = stats?.timeline?.length ? stats.timeline : fallbackTimeline;
    return source.slice(-10).map((entry) => ({
      day: entry.day || entry.date,
      count: Number(entry.count) || 0,
    }));
  }, [stats?.timeline]);

  const timelineMax = timelineSeries.reduce((max, entry) => Math.max(max, entry.count), 1);

  const sessionControls = [
    {
      label: "Access token",
      value: sessionMeta?.expiresInLabel || "≈15 min TTL",
      detail: "Rotates automatically through refresh endpoint.",
    },
    {
      label: "Refresh token store",
      value: "Server-side",
      detail: "40-byte secrets persisted with expiry + audit trail.",
    },
    {
      label: "Role enforcement",
      value: (user?.role || "patient").toUpperCase(),
      detail: "Routes gated with JWT middleware + role checks.",
    },
  ];

  const dataControls = [
    {
      label: "Encryption at rest",
      status: "AES-256-CBC",
      detail: "Unique symmetric key + IV per record, rotated per upload.",
    },
    {
      label: "Transport security",
      status: "TLS 1.3",
      detail: "Mutual auth friendly, HSTS ready, forward secrecy defaults.",
    },
    {
      label: "Audit logging",
      status: "Streaming",
      detail: "Uploads, decrypts, and downloads captured with metadata.",
    },
  ];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const formatDay = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="page-shell">
      <div className="security-shell">
        <header className="security-hero">
          <div>
            <span className="status-pill success">Session protected</span>
            <h2>Security center</h2>
            <p>
              Observe authentication health, encryption guarantees, and the latest audit activity for
              your workspace.
            </p>
          </div>
          <div className="session-meta">
            <div>
              <p>Role</p>
              <strong>{user?.role || "patient"}</strong>
              <small>Least privilege enforcement</small>
            </div>
            <div>
              <p>Token expires</p>
              <strong>{sessionMeta?.expiresInLabel || "Under 15 min"}</strong>
              <small>{sessionMeta?.expiresAtLabel || "auto refresh enabled"}</small>
            </div>
            <button type="button" className="ghost" onClick={handleLogout}>
              Sign out everywhere
            </button>
          </div>
        </header>

        <section className="security-grid">
          <article className="security-card">
            <p className="eyebrow" style={{ marginBottom: 6 }}>Session health</p>
            <h3>Authentication controls</h3>
            <ul className="status-list">
              {sessionControls.map((control) => (
                <li key={control.label}>
                  <div>
                    <p className="status-title">{control.label}</p>
                    <p className="status-detail">{control.detail}</p>
                  </div>
                  <span className="status-pill secondary">{control.value}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="security-card">
            <p className="eyebrow" style={{ marginBottom: 6 }}>Data hardening</p>
            <h3>Defense layers</h3>
            <ul className="defense-list">
              {dataControls.map((layer) => (
                <li key={layer.label}>
                  <div>
                    <p>{layer.label}</p>
                    <small>{layer.detail}</small>
                  </div>
                  <span>{layer.status}</span>
                </li>
              ))}
            </ul>
            <p className="defense-footnote">
              Active sessions: {stats.activeSessions || 0} • Records encrypted: {stats.totalRecords || 0}
            </p>
          </article>

          <article className="security-card timeline-card">
            <div className="timeline-head">
              <div>
                <p className="eyebrow" style={{ marginBottom: 6 }}>Last 10 days</p>
                <h3>Record ingest trend</h3>
              </div>
            </div>
            <div className="timeline-body">
              {timelineSeries.map((entry, index) => {
                const width = Math.max(6, Math.round((entry.count / timelineMax) * 100));
                return (
                  <div className="timeline-row" key={entry.day || index}>
                    <span>{formatDay(entry.day)}</span>
                    <div className="timeline-bar">
                      <div style={{ width: `${width}%` }} />
                    </div>
                    <span className="timeline-count">{entry.count}</span>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="security-card audit-card">
            <p className="eyebrow" style={{ marginBottom: 6 }}>Audit trail</p>
            <h3>Recent events</h3>
            <div className="audit-list">
              {auditLoading ? (
                <p className="audit-placeholder">Loading audit activity…</p>
              ) : auditError ? (
                <p className="audit-placeholder">{auditError}</p>
              ) : auditLogs.length === 0 ? (
                <p className="audit-placeholder">No audit entries yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div className="audit-row" key={log.id}>
                    <span className="audit-icon">🧾</span>
                    <div>
                      <p>{log.action}</p>
                      <small>{new Date(log.createdAt).toLocaleString()}</small>
                      {log.metadata?.recordId && <small>Record #{log.metadata.recordId}</small>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
