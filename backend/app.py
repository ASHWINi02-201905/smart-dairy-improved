"""Flask API: WhatsApp webhook, authorised PDF downloads, order placement, monthly job trigger."""
import hashlib, hmac, os, time
from flask import Flask, abort, jsonify, request, send_file
from . import billing as B, jobs, pdfs, wa
from .db import connect
def secret(): return os.environ.get("APP_SECRET", "").encode()
def issue_token(cid, ttl=3600):
    exp = int(time.time()) + ttl; return f"{cid}:{exp}:" + hmac.new(secret(), f"{cid}:{exp}".encode(), hashlib.sha256).hexdigest()
def customer_from_token():
    """Replace with your real login/JWT verification; tokens here are signed server-side."""
    try:
        cid, exp, sig = request.headers.get("Authorization", "").removeprefix("Bearer ").rsplit(":", 2)
        ok = hmac.compare_digest(sig, hmac.new(secret(), f"{cid}:{exp}".encode(), hashlib.sha256).hexdigest()) and int(exp) > time.time() and secret()
    except ValueError: ok = False
    if not ok: abort(401)
    return cid
def owner_only():
    k = os.environ.get("OWNER_API_KEY", "")
    if not k or not hmac.compare_digest(request.headers.get("X-Owner-Key", ""), k): abort(403)
def create_app(db_path=None, outdir="pdf"):
    app = Flask(__name__); db = lambda: connect(db_path)
    @app.get("/health")
    def health(): return {"ok": True, "whatsapp_configured": wa.configured()}
    @app.get("/webhook")
    def verify():
        if request.args.get("hub.mode") == "subscribe" and hmac.compare_digest(request.args.get("hub.verify_token", ""), os.environ.get("WA_VERIFY_TOKEN", "\0")): return request.args.get("hub.challenge", ""), 200
        abort(403)
    @app.post("/webhook")
    def hook():
        raw = request.get_data()
        if not wa.verify_signature(raw, request.headers.get("X-Hub-Signature-256", "")): abort(403)
        wa.process(db(), request.get_json(force=True, silent=True) or {}); return "ok"
    @app.post("/api/orders")
    def new_order():
        cid = customer_from_token(); j = request.get_json(force=True)
        try: oid = B.place_order(db(), cid, [(i["product_id"], float(i["qty"])) for i in j["items"]], delivery=B.paise(j.get("delivery", 0)))
        except (ValueError, KeyError) as e: return jsonify(error=str(e)), 400
        return jsonify(order_id=oid), 201
    @app.get("/api/my/bills")
    def my_bills():
        cid = customer_from_token(); con = db(); al = B.allocations(con, cid)
        return jsonify([dict(id=b["id"], bill_no=b["bill_no"], total=b["total"], status=B.bill_status(b["total"], al[b["id"]])) for b in con.execute("SELECT * FROM bills WHERE customer_id=?", (cid,))])
    @app.get("/api/my/bills/<int:bid>/pdf")
    def my_bill_pdf(bid):
        cid = customer_from_token(); con = db(); b = con.execute("SELECT * FROM bills WHERE id=? AND customer_id=?", (bid, cid)).fetchone()
        if not b: abort(404)
        return send_file(os.path.abspath(pdfs.receipt(con, bid, f"{outdir}/{b['bill_no']}.pdf")), mimetype="application/pdf")
    @app.get("/api/my/statements/<period>/pdf")
    def my_stmt(period):
        cid = customer_from_token(); con = db(); s = con.execute("SELECT * FROM statements WHERE customer_id=? AND period=?", (cid, period)).fetchone()
        if not s: abort(404)
        return send_file(os.path.abspath(pdfs.statement(con, s["id"], f"{outdir}/{s['stmt_no']}.pdf")), mimetype="application/pdf")
    @app.get("/api/owner/report/<period>/pdf")
    def owner_report(period):
        owner_only(); return send_file(os.path.abspath(pdfs.owner_report(db(), period, f"{outdir}/report-{period}.pdf")), mimetype="application/pdf")
    @app.post("/jobs/monthly")
    def job():
        owner_only(); n, s = jobs.monthly(db(), request.args.get("period"), outdir); return jsonify(statements=n, notifications_accepted=s)
    return app
if __name__ == "__main__": create_app().run(port=int(os.environ.get("PORT", 5000)))
