import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import logo from "../assets/secure-logo.svg";

export default function Register() {
  const [data, setData] = useState({ name: "", email: "", password: "", role: "patient" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const register = async (e) => {
    e?.preventDefault();

    if (!data.name || !data.email || !data.password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await API.post("/auth/register", data);
      console.log("Register response:", res.data);
      
      alert("✅ Registered successfully! Please login.");
      navigate("/");
    } catch (err) {
      console.error("Register error:", err);
      setError("Registration failed: " + (err.response?.data || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell single-column">
      <section className="form-panel">
        <div className="logo-mark">
          <img src={logo} alt="SecureHealth" />
          <div>
            <strong>SecureHealth</strong>
            <small>Verified participant setup</small>
          </div>
        </div>

        <h2>Create your account</h2>
        <p className="subhead">We will verify your identity before activating access.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={register}>
          <label className="input-group">
            <span>Full name</span>
            <input
              placeholder="Dr. Maya Patel"
              type="text"
              value={data.name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
            />
          </label>

          <label className="input-group">
            <span>Work email</span>
            <input
              placeholder="maya@clinic.org"
              type="email"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
            />
          </label>

          <label className="input-group">
            <span>Password</span>
            <input
              type="password"
              placeholder="Create a strong password"
              value={data.password}
              onChange={(e) => setData({ ...data, password: e.target.value })}
            />
          </label>

          <label className="input-group">
            <span>Role</span>
            <select value={data.role} onChange={(e) => setData({ ...data, role: e.target.value })}>
              <option value="patient">Patient</option>
              <option value="physician">Physician</option>
              <option value="researcher">Researcher</option>
              <option value="admin">Administrator</option>
            </select>
          </label>

          <button type="submit" className="primary-action register-button" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="helper-text">
          Already have secure access? <Link to="/">Sign in</Link>
        </p>
      </section>
    </main>
  );
}