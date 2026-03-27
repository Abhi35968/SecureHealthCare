import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ activeSessions: 1, totalRecords: 0 });
  const navigate = useNavigate();

  const sortedRecords = [...records].sort((a, b) => {
    const timeDiff = new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (timeDiff !== 0) return timeDiff;
    return (b.id || 0) - (a.id || 0);
  });
  const totalRecords = sortedRecords.length;
  const recentRecords = sortedRecords.slice(0, 4);
  const lastRecord = recentRecords[0]?.encrypted_data?.substring(0, 80) || "Upload a record to populate your vault.";
  const activeSessions = stats?.activeSessions ?? 0;
  const metrics = [
    {
      label: "Records secured",
      value: totalRecords,
      trend: totalRecords
        ? `Latest ID #${recentRecords[0].id}`
        : "Upload your first record",
    },
    {
      label: "Active sessions",
      value: activeSessions,
      trend:
        activeSessions === 1
          ? "Current user online"
          : `${activeSessions} users authenticated`,
    },
  ];
  const activityFeed = [];

  useEffect(() => {
    const fetchStats = async (token) => {
      try {
        const res = await axios.get("http://localhost:3000/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(res.data);
      } catch (statsErr) {
        console.error("Failed to load stats", statsErr);
      }
    };

    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token || !token.includes(".")) {
          setError("Session expired. Please login again.");
          localStorage.removeItem("token");
          setTimeout(() => navigate("/"), 1500);
          setRecords([]);
          return;
        }

        const res = await axios.get("http://localhost:3000/records", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (Array.isArray(res.data)) {
          setRecords(res.data);
          setError(null);
          fetchStats(token);
        } else {
          setRecords([]);
          setError("Failed to fetch records. Invalid response format.");
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.data?.error?.includes("Invalid token")) {
          setError("Session expired. Please login again.");
          localStorage.removeItem("token");
          setTimeout(() => navigate("/"), 1500);
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
  }, [navigate]);

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
              <button className="ghost" onClick={() => navigate("/")}>
                Switch account
              </button>
            </div>
          </div>
          <div className="dashboard-actions">
            <button
              className="destructive"
              onClick={() => {
                localStorage.removeItem("token");
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
        </div>
      </div>
    </div>
  );
}