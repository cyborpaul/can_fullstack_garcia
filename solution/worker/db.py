import os, psycopg2
from psycopg2.extras import RealDictCursor

class Db:
    def __init__(self, dsn: str):
        self.dsn = dsn

    def connect(self):
        return psycopg2.connect(self.dsn, cursor_factory=RealDictCursor)

    # Reutilizar texto por hash (idempotencia)
    def find_text_by_hash(self, content_hash: str):
        with self.connect() as conn, conn.cursor() as cur:
            cur.execute('''
                SELECT "ExtractedText" AS text 
                FROM "Documents"
                WHERE "ContentHash"=%s AND "ExtractedText" IS NOT NULL
                LIMIT 1
            ''', (content_hash,))
            row = cur.fetchone()
            return row["text"] if row else None

    def update_doc_processed(self, doc_id, content_hash, text):
        with self.connect() as conn, conn.cursor() as cur:
            cur.execute('''
                UPDATE "Documents"
                SET "ContentHash"=%s, "ExtractedText"=%s, "Status"='PROCESSED', 
                    "ErrorMessage"=NULL, "UpdatedAt"=NOW()
                WHERE "Id"=%s
            ''', (content_hash, text, doc_id))
            conn.commit()

    def update_doc_error(self, doc_id, message: str):
        message = (message or "")[:1000]
        with self.connect() as conn, conn.cursor() as cur:
            cur.execute('''
                UPDATE "Documents"
                SET "Status"='ERROR', "ErrorMessage"=%s, "UpdatedAt"=NOW()
                WHERE "Id"=%s
            ''', (message, doc_id))
            conn.commit()

    def is_upload_done(self, upload_id):
        with self.connect() as conn, conn.cursor() as cur:
            cur.execute('''
                SELECT COUNT(*) AS pending
                FROM "Documents"
                WHERE "UploadId"=%s AND "Status"='QUEUED'
            ''', (upload_id,))
            return cur.fetchone()["pending"] == 0

    def list_user_emails(self):
        with self.connect() as conn, conn.cursor() as cur:
            cur.execute('SELECT "Email" FROM "Users"')
            return [r["Email"] for r in cur.fetchall()]
