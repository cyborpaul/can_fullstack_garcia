import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../api";

export default function Login() {
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from?.pathname || "/home";

  const [email, setEmail] = useState("admin@sgcan.test");
  const [password, setPassword] = useState("admin123");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const emailOk = /\S+@\S+\.\S+/.test(email);
  const passOk = password.length >= 6;
  const canSubmit = emailOk && passOk && !loading;

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setErr("");
    setLoading(true);
    try {
      await API.login(email.trim(), password);
      nav(from, { replace: true });
    } catch (error) {
      const msg = error?.body?.message || error?.message || "Credenciales inválidas";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  // estilos reusables (manteniendo tu línea visual)
  const styles = {
    wrap: { maxWidth: 420, margin: "64px auto", padding: 16 },
    h1: { marginBottom: 8 },
    p: { color: "#666", marginBottom: 16 },
    label: { display: "grid", gap: 6, fontSize: 14, color: "#222" },
    input: {
      width: "100%",
      padding: 10,
      border: "1px solid #ccc",
      borderRadius: 8,
      outline: "none",
    },
    inputFocus: { borderColor: "#111", boxShadow: "0 0 0 3px rgba(0,0,0,0.08)" },
    btn: {
      padding: "10px 14px",
      borderRadius: 8,
      border: "none",
      background: "#111",
      color: "#fff",
      cursor: "pointer",
      transition: "background .2s ease",
    },
    btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
    err: {
      border: "1px solid #f6b0b0",
      background: "#fdecec",
      color: "#b00020",
      padding: "10px 12px",
      borderRadius: 8,
      fontSize: 13,
    },
    hint: { fontSize: 12, color: "#666", marginTop: 4 },
    pwdWrap: { position: "relative" },
    toggle: {
      position: "absolute",
      right: 8,
      top: "50%",
      transform: "translateY(-50%)",
      background: "transparent",
      border: "none",
      color: "#555",
      cursor: "pointer",
      padding: "4px 6px",
      borderRadius: 6,
    },
    form: { display: "grid", gap: 12 },
  };

  return (
    <div style={styles.wrap}>
      <h1 style={styles.h1}>SGCAN — Login</h1>
      <p style={styles.p}>Ingresa para continuar.</p>

      <form onSubmit={onSubmit} className="row" style={styles.form}>
        <label style={styles.label}>
          <div>Email</div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
            onBlur={(e) => Object.assign(e.target.style, { borderColor: "#ccc", boxShadow: "none" })}
            style={styles.input}
            placeholder="tucorreo@dominio.com"
            autoComplete="email"
          />
          {!emailOk && email.length > 0 && (
            <div style={styles.hint}>Ingresa un correo válido.</div>
          )}
        </label>

        <label style={styles.label}>
          <div>Contraseña</div>
          <div style={styles.pwdWrap}>
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
              onBlur={(e) => Object.assign(e.target.style, { borderColor: "#ccc", boxShadow: "none" })}
              style={{ ...styles.input, paddingRight: 76 }}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPass((s) => !s)}
              aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              style={styles.toggle}
              onMouseDown={(e) => e.preventDefault()}
            >
              {showPass ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          {password && !passOk && (
            <div style={styles.hint}>Mínimo 6 caracteres.</div>
          )}
        </label>

        {err && <div className="err" role="alert" style={styles.err}>{err}</div>}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            ...styles.btn,
            ...(canSubmit ? {} : styles.btnDisabled),
          }}
          onMouseEnter={(e) => {
            if (canSubmit) e.currentTarget.style.background = "#000";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#111";
          }}
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
