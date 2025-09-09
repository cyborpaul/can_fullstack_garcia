import { useEffect, useState } from "react";
import API from "../api";
import { useParams, Link } from "react-router-dom";

function Clip({ text, max = 300 }) {
  const [open, setOpen] = useState(false);
  if (!text || text.length <= max) return <p>{text || ""}</p>;
  return (
    <div>
      <p>{open ? text : text.slice(0, max) + "…"}</p>
      <button onClick={()=>setOpen(s=>!s)}>{open ? "Ver menos" : "Ver más"}</button>
    </div>
  );
}

export default function FileDetail() {
  const { id } = useParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function load() {
    if (!id) return;
    setErr(null); setLoading(true);
    try {
      const data = await API.listLinks(id); // <-- aquí el cambio
      setRows(data || []);
    } catch (e) {
      setErr(e.message || "Error al cargar links");
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); }, [id]);

  return (
    <div className="container">
      <div className="row">
        <h1 style={{flex:1}}>Links del archivo</h1>
        <Link to="/home">← Volver</Link>
      </div>

      {loading && <p>Cargando…</p>}
      {err && <p className="err">{err}</p>}

      {!loading && rows.length === 0 && <p>No hay links aún (¿en proceso?).</p>}

      {rows.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Nomenclatura</th>
              <th>Título</th>
              <th>URL</th>
              <th>Tipo</th>
              <th>Pág.</th>
              <th>Estado</th>
              <th>Contenido extraído</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(d=>(
              <tr key={d.id}>
                <td>{d.nomenclatura}</td>
                <td>{d.titulo || "-"}</td>
                <td>{d.urlDocumento ? <a href={d.urlDocumento} target="_blank" rel="noreferrer">Abrir</a> : "-"}</td>
                <td>{d.tipoDocumento || "-"}</td>
                <td>{d.paginas ?? "-"}</td>
                <td>
                  <span className={d.status === "PROCESSED" ? "ok" : d.status === "ERROR" ? "err" : "tag"}>
                    {d.status}
                  </span>
                </td>
                <td style={{minWidth: 320}}>
                  {d.extractedText ? <Clip text={d.extractedText} /> : <em>(sin contenido)</em>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
