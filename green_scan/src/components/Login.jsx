import { useState } from "react";
import { useNavigate } from "react-router-dom"; // Added for navigation
import "../styles/auth.css";

function Login() {
  const navigate = useNavigate(); // Added to match Register's navigation style
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userBalance", data.paperBalance);
        
        console.log("✅ Login success, forcing redirect...");
        window.location.href = "/home"; 
      } else {
        setMessage(data.message || "Invalid credentials");
      }
    } catch (error) {
      setMessage("Backend error. Check terminal.");
    }
  };

  return (
    <div className="auth-page">
      {/* Header section added to match Register page */}
      <h1 className="app-title">GreenScan</h1>
      <p className="app-subtitle">
        Smart Office Print & Resource Tracker
      </p>

      <div className="auth-card">
        <h2>Login to Your Account</h2>

        <form onSubmit={handleLogin}>
          <label>Email Address</label>
          <input
            id="loginEmail"
            type="email"
            placeholder="Enter your email address" // Placeholder added
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            id="loginPassword"
            type="password"
            placeholder="Enter your password" // Placeholder added
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {message && (
            <p id="errorMessage" style={{ color: "red", marginBottom: "10px" }}>
              {message}
            </p>
          )}

          <button id="loginBtn" type="submit">
            Login
          </button>
        </form>

        {/* Footer link to match Register page "switch-text" */}
        <p className="switch-text">
          Don't have an account?{" "}
          <span onClick={() => navigate("/register")}>Register</span>
        </p>
      </div>

      {/* Footer added to match Register page */}
      <footer>Academic Lab Project © 2026</footer>
    </div>
  );
}

export default Login;