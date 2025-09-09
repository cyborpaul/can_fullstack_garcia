import os, smtplib
from email.mime.text import MIMEText

MAIL_HOST = os.environ.get("MAIL_HOST", "mailhog")
MAIL_PORT = int(os.environ.get("MAIL_PORT", "1025"))
MAIL_FROM = os.environ.get("MAIL_FROM", "notifier@sgcan.local")
MAIL_SUBJECT = os.environ.get("MAIL_SUBJECT", "[SGCAN] Nuevas normativas disponibles")

def notify_all(recipients: list[str], upload_id: str):
    if not recipients:
        return
    body = (
        f"Se ha completado la extracción del lote {upload_id}.\n"
        f"Hay nuevas normativas disponibles en el sistema."
    )
    msg = MIMEText(body, _charset="utf-8")
    msg["Subject"] = MAIL_SUBJECT
    msg["From"] = MAIL_FROM
    msg["To"] = ", ".join(recipients)

    with smtplib.SMTP(MAIL_HOST, MAIL_PORT, timeout=10) as s:
        s.sendmail(MAIL_FROM, recipients, msg.as_string())
