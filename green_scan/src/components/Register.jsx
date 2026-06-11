import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState(""); // kept for UI completeness
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Registration failed");
        return;
      }

      // Registration successful
      navigate("/login");
    } catch (error) {
      setMessage("Backend not reachable. Is server running?");
    }
  };

  return (
    <div className="auth-page">
      <h1 className="app-title">GreenScan</h1>
      <p className="app-subtitle">
        Smart Office Print & Resource Tracker
      </p>

      <div className="auth-card">
        <h2>Create Your Account</h2>

        <form onSubmit={handleSubmit}>
          <label>Full Name</label>
          <input
            id="name"
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <label>Email Address</label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            id="password"
            type="password"
            placeholder="Create a password (min. 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {message && (
            <p style={{ color: "red", marginBottom: "10px" }}>
              {message}
            </p>
          )}

          <button id="registerBtn" type="submit">
            Register
          </button>
        </form>

        <p className="switch-text">
          Already have an account?{" "}
          <span onClick={() => navigate("/login")}>Login</span>
        </p>
      </div>

      <footer>Academic Lab Project © 2026</footer>
    </div>
  );
}

export default Register;
