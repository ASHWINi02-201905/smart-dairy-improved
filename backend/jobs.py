"""Run daily (e.g. cron / scheduler). Safe to run repeatedly: statements and notifications are idempotent."""
import logging, os
from datetime import date
from . import billing as B, pdfs, wa
from .db import connect
log = logging.getLogger("jobs")
def previous_period(today=None):
    t = today or date.today(); y, m = (t.year - 1, 12) if t.month == 1 else (t.year, t.month - 1); return f"{y:04d}-{m:02d}"
def monthly(con, period=None, outdir="pdf"):
    period = period or previous_period(); made = B.run_monthly(con, period); sent = 0
    for s in made:
        c = con.execute("SELECT * FROM customers WHERE id=?", (s["customer_id"],)).fetchone()
        if c["wa_optin"] and c["phone"]:
            st = wa.send_template(con, c["phone"], os.environ.get("WA_TPL_STATEMENT", "monthly_statement"), [c["name"], period, B.rupees(s["closing"])], key=f"stmt:{s['stmt_no']}")
            sent += st == "accepted"
    rpt = pdfs.owner_report(con, period, f"{outdir}/report-{period}.pdf")
    for o in wa.owners(): wa.send_document(con, o, rpt, f"Owner report {period}")
    log.info("period=%s statements=%d accepted=%d", period, len(made), sent); return len(made), sent
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO); monthly(connect())
