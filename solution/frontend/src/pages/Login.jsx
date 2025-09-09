import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../api";

export default function Login() {
  const [email, setEmail] = useState("admin@sgcan.test"); 
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from?.pathname || "/home";

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await API.login(email, password);
      nav(from, { replace: true });
    } catch (error) {
      const msg = error?.body?.message || "Credenciales inválidas";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "64px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>SGCAN — Login</h1>
      <p style={{ color: "#666", marginBottom: 16 }}>
        Ingresa para continuar.
      </p>

      <form onSubmit={onSubmit} className="row" style={{ display:"grid", gap:12 }}>
        <label>
          <div>Email</div>
          <input
            type="email"
            value={email}
            onChange={e=>setEmail(e.target.value)}
            required
            style={{ width:"100%", padding:8, border:"1px solid #ccc", borderRadius:8 }}
          />
        </label>
        <label>
          <div>Contraseña</div>
          <input
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            required
            style={{ width:"100%", padding:8, border:"1px solid #ccc", borderRadius:8 }}
          />
        </label>

        {err && <div className="err">{err}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{ padding:"10px 14px", borderRadius:8, border:"none", background:"#111", color:"#fff" }}
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
