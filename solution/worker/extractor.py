import io, os, hashlib, subprocess, tempfile
from typing import Tuple
import requests
from pdfminer.high_level import extract_text as pdf_extract_text
from docx import Document as DocxDocument

REQUEST_TIMEOUT = int(os.environ.get("REQUEST_TIMEOUT", "30"))
MAX_CONTENT_MB = int(os.environ.get("MAX_CONTENT_MB", "20"))

class DownloadError(Exception): ...
class ExtractError(Exception): ...

def download(url: str) -> Tuple[bytes, str]:
    r = requests.get(url, timeout=REQUEST_TIMEOUT, stream=True)
    r.raise_for_status()
    b = r.content
    if len(b) > MAX_CONTENT_MB * 1024 * 1024:
        raise DownloadError(f"Archivo > {MAX_CONTENT_MB}MB")
    return b, url.lower()

def sha256_hex(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()

def extract_text(url: str) -> Tuple[str, str]:
    """
    Devuelve (texto, content_hash). Lanza ExtractError si falla.
    """
    data, hint = download(url)
    content_hash = sha256_hex(data)

    if hint.endswith(".docx"):
        text = _extract_docx(data)
    elif hint.endswith(".doc"):
        text = _extract_doc(data)
    elif hint.endswith(".pdf"):
        text = _extract_pdf(data)
    else:
        raise ExtractError("Formato no soportado (use .doc/.docx/.pdf)")

    text = (text or "").strip()
    if not text:
        raise ExtractError("No se pudo extraer texto (¿PDF escaneado?)")
    return text, content_hash

def _extract_docx(b: bytes) -> str:
    doc = DocxDocument(io.BytesIO(b))
    return "\n".join(p.text for p in doc.paragraphs)

def _extract_pdf(b: bytes) -> str:
    bio = io.BytesIO(b)
    txt = pdf_extract_text(bio) or ""
    return txt

def _extract_doc(b: bytes) -> str:
    with tempfile.NamedTemporaryFile(suffix=".doc") as f:
        f.write(b)
        f.flush()
        try:
            out = subprocess.check_output(
                ["antiword", "-m", "UTF-8.txt", "-w", "0", f.name],
                stderr=subprocess.STDOUT,
                timeout=30
            )
            return out.decode("utf-8", errors="replace")
        except subprocess.CalledProcessError as e:
            raise ExtractError(f"antiword fallo: {e.output.decode('utf-8', 'ignore')[:200]}")
