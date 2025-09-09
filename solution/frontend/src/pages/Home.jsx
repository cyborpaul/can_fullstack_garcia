import { useEffect, useState } from "react";
import API from "../api";

export default function Homey() {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function load() {
    setBusy(true); setErr(""); setMsg("");
    try {
      const data = await API.listFiles({ mine: true });
      setFiles(data || []);
    } catch (e) {
      setErr("No se pudieron cargar tus archivos.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setErr(""); setMsg("");
    try {
      const res = await API.uploadCsv(file);
      setMsg(`Subido: ${res?.count ?? 0} registros`);
      await load();
    } catch (e) {
      const m = e?.body?.error || "Error al subir el CSV";
      setErr(m);
    } finally {
      e.target.value = "";
      setBusy(false);
    }
  }

  function logout() {
    API.logout();
    window.location.href = "/login";
  }

  return (
    <div className="container" style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
      <div className="row" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
        <h2>Homey</h2>
        <div style={{ display:"flex", gap:8 }}>
          <label style={{ border:"1px solid #ddd", padding:"8px 12px", borderRadius:8, cursor:"pointer" }}>
            Subir CSV
            <input type="file" accept=".csv" onChange={onUpload} style={{ display:"none" }} />
          </label>
          <button onClick={load} disabled={busy} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #ddd" }}>
            {busy ? "Cargando..." : "Refrescar"}
          </button>
          <button onClick={logout} style={{ padding:"8px 12px", borderRadius:8, border:"1px solid #ddd" }}>
            Salir
          </button>
        </div>
      </div>

      {msg && <div className="ok">{msg}</div>}
      {err && <div className="err">{err}</div>}

      <table className="table" style={{ width:"100%", borderCollapse:"collapse", marginTop:12 }}>
        <thead>
          <tr>
            <th style={{ textAlign:"left", borderBottom:"1px solid #eee", padding:8 }}>Archivo</th>
            <th style={{ textAlign:"left", borderBottom:"1px solid #eee", padding:8 }}>Fecha</th>
            <th style={{ textAlign:"left", borderBottom:"1px solid #eee", padding:8 }}>Total links</th>
            <th style={{ textAlign:"left", borderBottom:"1px solid #eee", padding:8 }}>Procesados</th>
            <th style={{ textAlign:"left", borderBottom:"1px solid #eee", padding:8 }}>Errores</th>
            <th style={{ textAlign:"left", borderBottom:"1px solid #eee", padding:8 }}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {files.map(f => (
            <tr key={f.id}>
              <td style={{ borderBottom:"1px solid #eee", padding:8 }}>{f.filename}</td>
              <td style={{ borderBottom:"1px solid #eee", padding:8 }}>{new Date(f.created_at).toLocaleString()}</td>
              <td style={{ borderBottom:"1px solid #eee", padding:8 }}>{f.total_links}</td>
              <td style={{ borderBottom:"1px solid #eee", padding:8 }}>{f.processed_count}</td>
              <td style={{ borderBottom:"1px solid #eee", padding:8 }}>{f.error_count}</td>
              <td style={{ borderBottom:"1px solid #eee", padding:8 }}>{f.status}</td>
            </tr>
          ))}
          {!files.length && (
            <tr><td colSpan={6} style={{ padding:12, color:"#777" }}>Sin archivos aún.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
