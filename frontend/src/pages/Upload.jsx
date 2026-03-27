import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/secure-logo.svg";

export default function Upload() {
  const [data, setData] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const upload = async (e) => {
    e?.preventDefault();

    if (!data.trim()) {
      setMessage("❌ Please enter some data to upload");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const token = localStorage.getItem("token");
      
      console.log("=== UPLOAD REQUEST ===");
      console.log("Token from localStorage:", token);
      
      if (!token) {
        setMessage("❌ No token found. Please login again.");
        setTimeout(() => navigate("/"), 2000);
        return;
      }

      if (!token.includes(".")) {
        setMessage("❌ Token is malformed. Please login again.");
        localStorage.removeItem("token");
        setTimeout(() => navigate("/"), 2000);
        return;
      }

      console.log("Token parts:", token.split(".").length);
      
      // Create direct axios request with explicit header
      const response = await axios.post(
        "http://localhost:3000/records/upload",
        { data },
        {
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        }
      );
      
      console.log("Upload successful:", response.data);
      setMessage("✅ Record uploaded securely!");
      setData("");
      
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      console.error("Upload error details:", err);
      if (err.response) {
        console.error("Status:", err.response.status);
        console.error("Data:", err.response.data);
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
          <label className="input-group">
            <span>Encrypted payload</span>
            <textarea
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="Heart Rate: 72 bpm\nBlood Pressure: 120/80\nMedication: Aspirin 100mg"
            />
          </label>

          <ul className="muted-list">
            <li>• Use concise, structured sentences.</li>
            <li>• Avoid PHI in free text fields when possible.</li>
            <li>• Attach medication and dosage details.</li>
          </ul>

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
      </section>
    </main>
  );
}