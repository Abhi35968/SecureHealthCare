import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/secure-logo.svg";
import API from "../api";
import { useAuth } from "../context/AuthContext";

const templates = [
  {
    label: "Vitals snapshot",
    value:
      "Heart Rate: 72 bpm\nBlood Pressure: 120/78 mmHg\nRespiration: 16/min\nSpO2: 98% on room air\nMedication: Metoprolol 25mg BID\nPlan: Monitor BP trend, continue regimen",
  },
  {
    label: "Post-op day 1",
    value:
      "Procedure: Laparoscopic appendectomy, POD1\nTemp: 37.8 C | Pain: 4/10 controlled\nLabs: WBC 11.2, Hgb 12.1, Cr 0.9\nDrains: Minimal serous output\nPlan: Advance diet, ambulate TID, labs in am",
  },
  {
    label: "Chronic care",
    value:
      "Dx: Type 2 DM, HTN\nBlood Pressure: 134/82 mmHg\nA1c: 7.4% (down from 8.1%)\nMedications: Metformin 1g BID, Lisinopril 10mg daily\nFollow-up: Foot exam 3 months, retina eval scheduled",
  },
];

function buildQualitySignals(text) {
  const source = text || "";
  return [
    {
      label: "Vitals captured",
      ok: /blood pressure|bp|heart rate|hr|respiration|spo2/i.test(source),
      pass: "BP + HR detected.",
      fail: "Add vitals for faster clinician triage.",
    },
    {
      label: "Medication dosage",
      ok: /mg|mcg|tablet|dose|dosage|units/i.test(source),
      pass: "Dosage documented.",
      fail: "List dose + frequency for each therapy.",
    },
    {
      label: "Care plan",
      ok: /plan|follow-up|follow up|monitor|recheck/i.test(source),
      pass: "Follow-up instructions present.",
      fail: "Outline plan or monitoring cadence.",
    },
    {
      label: "Labs or imaging",
      ok: /lab|cbc|panel|glucose|creatinine|imaging|scan/i.test(source),
      pass: "Objective data logged.",
      fail: "Include labs/imaging to enrich context.",
    },
  ];
}

export default function Upload() {
  const [data, setData] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { logout } = useAuth();

  const trimmed = data.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const classification = trimmed.length > 600 ? "Comprehensive" : trimmed.length > 250 ? "Standard" : trimmed.length > 0 ? "Draft" : "Empty";
  const checklistScore = useMemo(() => {
    const signals = buildQualitySignals(trimmed);
    const passed = signals.filter((signal) => signal.ok).length;
    return { passed, total: signals.length, signals };
  }, [trimmed]);

  const checklist = checklistScore.signals;

  const applyTemplate = (value) => {
    setData(value);
    setMessage("");
  };

  const wordsLabel = `${wordCount} ${wordCount === 1 ? "word" : "words"}`;
  const charsLabel = `${data.length}/10,000 chars`;
  const badgeTone =
    classification === "Comprehensive"
      ? "badge-success"
      : classification === "Standard"
      ? "badge-warn"
      : classification === "Draft"
      ? "badge-neutral"
      : "badge-muted";

  const upload = async (e) => {
    e?.preventDefault();

    if (!data.trim()) {
      setMessage("❌ Please enter some data to upload");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      await API.post("/records/upload", { data });
      setMessage("✅ Record uploaded securely!");
      setData("");
      
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      if (err.response) {
        if (err.response.status === 401) {
          setMessage("❌ Session expired. Please login again.");
          logout();
          setTimeout(() => navigate("/"), 2000);
          return;
        }
        const errorMsg = typeof err.response.data === 'string' 
          ? err.response.data 
          : JSON.stringify(err.response.data);
        setMessage("❌ Upload failed (" + err.response.status + "): " + errorMsg);
      } else {
        setMessage("❌ Upload failed: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="brand-panel">
        <p className="eyebrow">Secure ingestion</p>
        <h1>Stream encrypted vitals, labs, and care plans.</h1>
        <p className="hero-copy">
          Every submission is encrypted client-side before it touches our infrastructure.
        </p>

        <ul className="feature-list">
          <li><span>📡</span> TLS 1.3 with forward secrecy</li>
          <li><span>🧾</span> Automated integrity receipts</li>
          <li><span>🔎</span> Full audit visibility</li>
        </ul>

        <div className="stat-card">
          <div>
            <p className="eyebrow" style={{ marginBottom: 4 }}>Median ingest latency</p>
            <strong>420 ms</strong>
          </div>
          <p style={{ maxWidth: 180 }}>Optimized pipelines keep care teams in sync.</p>
        </div>
      </section>

      <section className="form-panel">
        <div className="logo-mark">
          <img src={logo} alt="SecureHealth" />
          <div>
            <strong>SecureHealth</strong>
            <small>Encrypted ingestion portal</small>
          </div>
        </div>

        <h2>Upload medical record</h2>
        <p className="subhead">Paste vitals, lab summaries, or structured observations below.</p>

        {message && (
          <div className={message.includes("✅") ? "success-message" : "error-message"}>{message}</div>
        )}

        <form onSubmit={upload}>
          <div className="template-chips" aria-label="Payload templates">
            {templates.map((template) => (
              <button
                key={template.label}
                type="button"
                className="chip-button"
                onClick={() => applyTemplate(template.value)}
              >
                {template.label}
              </button>
            ))}
            <button type="button" className="chip-button ghost" onClick={() => applyTemplate("")}>
              Clear
            </button>
          </div>

          <label className="input-group">
            <span>Encrypted payload</span>
            <textarea
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="Heart Rate: 72 bpm\nBlood Pressure: 120/80\nMedication: Aspirin 100mg"
            />
          </label>

          <div className="payload-bar">
            <span className={`signal-badge ${badgeTone}`}>{classification} payload</span>
            <div className="payload-meta">
              <span>{wordsLabel}</span>
              <span>{charsLabel}</span>
              <span>
                {checklistScore.passed}/{checklistScore.total} checks
              </span>
            </div>
          </div>

          <ul className="muted-list">
            <li>• Use concise, structured sentences.</li>
            <li>• Avoid PHI in free text fields when possible.</li>
            <li>• Attach medication and dosage details.</li>
          </ul>

          <div className="quality-panel">
            <div className="quality-header">
              <p className="eyebrow" style={{ marginBottom: 0 }}>Pre-flight checklist</p>
              <span className="quality-score">
                {checklistScore.passed}/{checklistScore.total} ready
              </span>
            </div>
            <div className="quality-grid">
              {checklist.map((signal) => (
                <div key={signal.label} className={`quality-row${signal.ok ? " ok" : ""}`}>
                  <span>{signal.ok ? "✅" : "⚠️"}</span>
                  <div>
                    <p>{signal.label}</p>
                    <small>{signal.ok ? signal.pass : signal.fail}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="button-row">
            <button type="submit" disabled={loading}>
              {loading ? "⏳ Uploading..." : "📤 Upload record"}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => navigate("/dashboard")}
            >
              ← Back to dashboard
            </button>
          </div>
        </form>

        <p className="helper-text">
          Need to verify data formats? <Link to="/dashboard">Review sample entries</Link>
        </p>

        <div className="encryption-card">
          <p className="eyebrow" style={{ color: "var(--text-soft)", marginBottom: 8 }}>Pipeline guarantees</p>
          <ul>
            <li>🔐 Client payload encrypted locally before TLS transit.</li>
            <li>🧬 Server re-encrypts with unique AES-256-CBC keys + IVs.</li>
            <li>📜 Every write + decrypt is appended to the audit ledger.</li>
          </ul>
          <button type="button" className="ghost" onClick={() => navigate("/security")}>
            View security posture →
          </button>
        </div>
      </section>
    </main>
  );
}