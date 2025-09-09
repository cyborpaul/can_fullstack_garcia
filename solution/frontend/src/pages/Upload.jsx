import { useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

export default function UploadBox() {
  const nav = useNavigate();
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onUpload() {
    if (!file) return;
    setMsg(null); setErr(null); setLoading(true);
    try {
      const res = await API.uploadCsv(file);
      setMsg(`Subido. ${res.count} filas detectadas.`);
      nav(`/files/${res.uploadId}`);
    } catch (e) {
      setErr(e.message || "Error al subir");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3>Subir CSV</h3>
      <input type="file" accept=".csv" onChange={e=>setFile(e.target.files?.[0] || null)} />
      <button disabled={!file || loading} onClick={onUpload}>
        {loading ? "Procesando..." : "Subir y procesar"}
      </button>
      {msg && <p className="ok">{msg}</p>}
      {err && <p className="err">{err}</p>}
    </div>
  );
}
