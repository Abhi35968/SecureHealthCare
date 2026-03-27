import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import logo from "../assets/secure-logo.svg";

export default function Login() {
  const [data, setData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const login = async (e) => {
    e?.preventDefault();

    if (!data.email || !data.password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await API.post("/auth/login", data);

      if (typeof res.data === 'object' && res.data && res.data.token) {
        const token = res.data.token;
        localStorage.setItem("token", token);
        nav("/dashboard");
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError(err?.response ? "Invalid email or password" : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="single-card-shell">
      <section className="auth-card">
        <div className="logo-mark brand">
          <img src={logo} alt="SecureHealth" />
          <div>
            <strong>SecureHealth</strong>
          </div>
        </div>

        <h1>Welcome back</h1>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={login}>
          <label className="input-group">
            <span>Email address</span>
            <input
              placeholder="you@hospital.org"
              type="email"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
              autoComplete="email"
              disabled={loading}
            />
          </label>

          <label className="input-group">
            <span>Password</span>
            <input
              type="password"
              placeholder="Enter your password"
              value={data.password}
              onChange={(e) => setData({ ...data, password: e.target.value })}
              autoComplete="current-password"
              disabled={loading}
            />
          </label>

          <button type="submit" className="primary-action" disabled={loading}>
            {loading ? "Signing you in..." : "Sign in"}
          </button>
        </form>

        <p className="helper-text">
          Don't have an account? <Link to="/register">Create account</Link>
        </p>
      </section>
    </main>
  );
}