import { useState } from "react";
import API from "../api";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(null); setOk(null); setLoading(true);
    try {
      await API.register(email.trim(), password);
      await API.login(email.trim(), password);
      setOk("Cuenta creada correctamente");
      nav("/home");
    } catch (e) {
      setErr(e.message || "No se pudo registrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1>Registro</h1>
      <form onSubmit={onSubmit} className="card">
        <label>Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={password} onChange={e=>setPass(e.target.value)} required />
        <button disabled={loading}>{loading ? "Creando..." : "Crear cuenta"}</button>
        {ok && <p className="ok">{ok}</p>}
        {err && <p className="err">{err}</p>}
      </form>
      <p>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
    </div>
  );
}
