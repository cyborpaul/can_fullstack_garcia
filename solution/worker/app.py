import json, os, logging, threading
import pika
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from db import Db
from extractor import extract_text, ExtractError, DownloadError
from notifier import notify_all

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(message)s"
)

DB_CONN = os.environ.get("DB_CONN", "postgresql://sgcan:sgcan@db:5432/sgcan")
BROKER_URL = os.environ.get("BROKER_URL", "amqp://guest:guest@broker:5672")
QUEUE = os.environ.get("QUEUE_EXTRACT", "sgcan.documents.extract")
PREFETCH = int(os.environ.get("PREFETCH", "1"))

db = Db(DB_CONN)
_notified_cache = set()  

def _parse_msg(body: bytes):
    try:
        m = json.loads(body.decode("utf-8"))
        return m["DocumentId"], m["UploadId"], m["Url"]
    except Exception:
        raise ValueError("Mensaje inválido")

@retry(
    retry=retry_if_exception_type((pika.exceptions.AMQPConnectionError,)),
    wait=wait_exponential(multiplier=1, min=1, max=30),
    stop=stop_after_attempt(10)
)
def start_consumer():
    params = pika.URLParameters(BROKER_URL)
    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    channel.queue_declare(queue=QUEUE, durable=True)
    channel.basic_qos(prefetch_count=PREFETCH)

    def on_message(ch, method, properties, body):
        try:
            document_id, upload_id, url = _parse_msg(body)
            logging.info(f"Procesando doc={document_id} upload={upload_id} url={url}")

            # 1) Extrae (o reusa por hash)
            try:
                text, content_hash = extract_text(url)
            except (DownloadError, ExtractError) as e:
                db.update_doc_error(document_id, str(e))
                logging.warning(f"ERROR extracción doc={document_id}: {e}")
                ch.basic_ack(delivery_tag=method.delivery_tag)
                _maybe_notify(upload_id)
                return

            reused = False
            existing = db.find_text_by_hash(content_hash)
            if existing:
                db.update_doc_processed(document_id, content_hash, existing)
                reused = True
                logging.info(f"Reusado por hash doc={document_id}")
            else:
                db.update_doc_processed(document_id, content_hash, text)
                logging.info(f"PROCESSED doc={document_id} ({len(text)} chars)")

            # 2) Notificar si terminó el lote
            _maybe_notify(upload_id)

            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            # Marcamos ERROR y ack para no bloquear la cola
            logging.exception(f"Fallo inesperado: {e}")
            try:
                # Si obtuvimos document_id, guardamos error
                m = json.loads(body.decode("utf-8"))
                if "DocumentId" in m:
                    db.update_doc_error(m["DocumentId"], f"Unexpected: {e}")
            except Exception:
                pass
            ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_consume(queue=QUEUE, on_message_callback=on_message, auto_ack=False)
    logging.info(f"Esperando mensajesito en '{QUEUE}' ...")
    channel.start_consuming()

def _maybe_notify(upload_id: str):
    # Evita duplicados en la misma ejecución
    if upload_id in _notified_cache:
        return
    if db.is_upload_done(upload_id):
        recipients = db.list_user_emails()
        try:
            notify_all(recipients, upload_id)
            logging.info(f"Notificación enviada a {len(recipients)} usuarios por upload={upload_id}")
            _notified_cache.add(upload_id)
        except Exception as e:
            logging.warning(f"No se pudo notificar upload={upload_id}: {e}")

if __name__ == "__main__":
    start_consumer()
