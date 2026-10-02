import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { useAuth } from "../context/AuthContext";

const fallbackTimeline = Array.from({ length: 7 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - index));
  return { day: date.toISOString().slice(0, 10), count: 0 };
});

export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ activeSessions: 1, totalRecords: 0, timeline: [] });
  const navigate = useNavigate();
  const { logout } = useAuth();

  const sortedRecords = [...records].sort((a, b) => {
    const timeDiff = new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (timeDiff !== 0) return timeDiff;
    return (b.id || 0) - (a.id || 0);
  });
  const totalRecords = sortedRecords.length;
  const recentRecords = sortedRecords.slice(0, 4);
  const activeSessions = stats?.activeSessions ?? 0;
  const timelineSeries = useMemo(() => {
    const source = stats?.timeline?.length ? stats.timeline : fallbackTimeline;
    return source.slice(-7).map((entry) => ({
      day: entry.day || entry.date,
      count: Number(entry.count) || 0,
    }));
  }, [stats?.timeline]);

  const timelineMax = timelineSeries.reduce((max, entry) => Math.max(max, entry.count), 1);
  const timelineTotal = timelineSeries.reduce((sum, entry) => sum + entry.count, 0);
  const todayCount = timelineSeries[timelineSeries.length - 1]?.count ?? 0;

  const formatDay = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const metrics = [
    {
      label: "Records secured",
      value: totalRecords,
      trend: totalRecords ? `Latest ID #${recentRecords[0].id}` : "Upload your first record",
    },
    {
      label: "Active sessions",
      value: activeSessions,
      trend: activeSessions === 1 ? "Current user online" : `${activeSessions} users authenticated`,
    },
    {
      label: "Records last 7 days",
      value: timelineTotal,
      trend: todayCount ? `${todayCount} processed today` : "Awaiting new submissions",
    },
  ];

  const securityPillars = [
    {
      label: "In transit",
      status: "TLS 1.3",
      detail: "Forward secrecy & HSTS everywhere.",
    },
    {
      label: "At rest",
      status: "AES-256-CBC",
      detail: "Fresh key + IV generated per record.",
    },
    {
      label: "Audit trail",
      status: "Streaming",
      detail: "Uploads, decrypts, and downloads logged in real time.",
    },
  ];

  const guardrails = [
    {
      icon: "🧪",
      title: "Integrity receipts",
      detail: "Upload endpoint returns audit IDs for downstream compliance stores.",
    },
    {
      icon: "🛰️",
      title: "Behavior analytics",
      detail: "Rate limits + anomaly scoring protect against scripted dumps.",
    },
    {
      icon: "🧾",
      title: "Download transparency",
      detail: "Every decrypt/export is watermark logged for 7 years.",
    },
  ];

  useEffect(() => {
    const handleAuthFailure = (message) => {
      setError(message);
      logout();
      setTimeout(() => navigate("/"), 1500);
    };

    const fetchStats = async () => {
      try {
        const res = await API.get("/stats", { params: { range: "7d" } });
        setStats(res.data);
      } catch (err) {
        console.error("Failed to load stats", err);
      }
    };

    const fetchData = async () => {
      try {
        const res = await API.get("/records");

        if (Array.isArray(res.data)) {
          setRecords(res.data);
          setError(null);
          fetchStats();
        } else {
          setRecords([]);
          setError("Failed to fetch records. Invalid response format.");
        }
      } catch (err) {
        if (err.response?.status === 401) {
          handleAuthFailure("Session expired. Please login again.");
        } else {
          const errorMsg = typeof err.response?.data === "string"
            ? err.response?.data
            : JSON.stringify(err.response?.data || err.message);
          setError("Failed to fetch records: " + errorMsg);
        }
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [logout, navigate]);

  if (loading) {
    return (
      <div className="dashboard-shell" style={{ textAlign: "center" }}>
        <div className="empty-state">
          <div className="record-icon">⏳</div>
          <h3>Loading your records</h3>
          <p>Decrypting and preparing your health vault.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="dashboard-shell">
        <header className="dashboard-hero">
          <div>
            <span className="status-pill success">Vault online</span>
            <h2>Medical records</h2>
            <p>
              {totalRecords === 0
                ? "No encrypted payloads yet. Start by uploading a record."
                : `${totalRecords} encrypted record${totalRecords !== 1 ? "s" : ""} synced across your care teams.`}
            </p>
            <div className="hero-actions">
              <button onClick={() => navigate("/upload")}>Upload record</button>
              <button
                className="ghost"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                Switch account
              </button>
            </div>
          </div>
          <div className="dashboard-actions">
            <button
              className="destructive"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {error && (
          <div className="error-message" style={{ marginTop: "24px" }}>
            ⚠️ {error}
          </div>
        )}

        <section className="metrics-grid">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <p className="metric-label">{metric.label}</p>
              <p className="metric-value">{metric.value}</p>
              <p className="metric-trend">{metric.trend}</p>
            </article>
          ))}
        </section>

        <section className="insight-grid">
          <article className="security-card">
            <p className="eyebrow" style={{ color: "var(--text-soft)", letterSpacing: "0.25em" }}>
              Defense posture
            </p>
            <h3>Zero-trust perimeter</h3>
            <ul className="status-list">
              {securityPillars.map((pillar) => (
                <li key={pillar.label}>
                  <div>
                    <p className="status-title">{pillar.label}</p>
                    <p className="status-detail">{pillar.detail}</p>
                  </div>
                  <span className="status-pill secondary">{pillar.status}</span>
                </li>
              ))}
            </ul>
            <button className="ghost" type="button" onClick={() => navigate("/security")}>
              Open security center →
            </button>
          </article>

          <article className="timeline-card">
            <div className="timeline-head">
              <div>
                <p className="eyebrow" style={{ marginBottom: 6 }}>7 day ingest</p>
                <h3>Growth timeline</h3>
              </div>
              <div className="timeline-total">
                <strong>{timelineTotal}</strong>
                <small>records</small>
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
        </section>

        <section className="section-head">
          <div>
            <p className="eyebrow" style={{ marginBottom: 6 }}>Encrypted activity</p>
            <h3>Latest records</h3>
          </div>
          <button className="ghost" onClick={() => navigate("/upload")}>
            Upload new data
          </button>
        </section>

        <div className="records-panel">
          <div className="record-stack">
            {recentRecords.length === 0 ? (
              <div className="empty-card">
                <div className="record-icon">📋</div>
                <h3>No records yet</h3>
                <p>Upload labs, vitals, or visit summaries to populate your vault.</p>
                <button onClick={() => navigate("/upload")}>Upload now →</button>
              </div>
            ) : (
              <div className="record-list">
                {recentRecords.map((record) => {
                  const snippet = record.encrypted_data
                    ? `${record.encrypted_data.substring(0, 160)}...`
                    : "Record stored without preview data.";
                  return (
                    <article className="record-row" key={record.id}>
                      <div className="record-icon">🔒</div>
                      <div>
                        <div className="record-chip">ID #{record.id}</div>
                        <p className="record-snippet">{snippet}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
          <aside className="action-card">
            <h4>Continuity controls</h4>
            <ul className="action-list">
              {guardrails.map((item) => (
                <li key={item.title}>
                  <span>{item.icon}</span>
                  <div>
                    <p>{item.title}</p>
                    <small>{item.detail}</small>
                  </div>
                </li>
              ))}
            </ul>
            <div className="session-card">
              <p className="eyebrow" style={{ marginBottom: 4 }}>Active sessions</p>
              <strong>{activeSessions}</strong>
              <p>
                {activeSessions === 1
                  ? "Single clinician currently authenticated."
                  : "Distributed workforce synced with the vault."}
              </p>
              <button className="ghost" type="button" onClick={() => navigate("/security")}>
                Review controls
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
