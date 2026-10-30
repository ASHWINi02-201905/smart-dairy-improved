"""WhatsApp Cloud API: webhook verification, owner commands, sending with retry, status logging."""
import hashlib, hmac, json, os, time
import requests
from . import billing as B
from .billing import paise, rupees as R
def owners(): return {x.strip() for x in os.environ.get("OWNER_PHONES", "").split(",") if x.strip()}
def verify_signature(body, header):
    sec = os.environ.get("WA_APP_SECRET", "")
    if not sec or not header or not header.startswith("sha256="): return False
    return hmac.compare_digest(hmac.new(sec.encode(), body, hashlib.sha256).hexdigest(), header[7:])
def configured(): return bool(os.environ.get("WA_TOKEN") and os.environ.get("WA_PHONE_ID"))
def _log(con, to, kind, status, wa_id=None, err=None):
    with con: con.execute("INSERT INTO wa_logs(wa_id,to_phone,kind,status,error,created_at) VALUES(?,?,?,?,?,?)", (wa_id, to, kind, status, err, B.now()))
def _api(path, **kw):
    u = f"https://graph.facebook.com/{os.environ.get('WA_API_VERSION', 'v20.0')}/{os.environ['WA_PHONE_ID']}/{path}"
    return requests.post(u, headers={"Authorization": "Bearer " + os.environ["WA_TOKEN"]}, timeout=20, **kw)
def dispatch(con, to, kind, message, key=None):
    """Never reports 'sent': 'accepted' only means Meta accepted it; delivery comes via webhook statuses."""
    if key and con.execute("SELECT 1 FROM notified WHERE key=?", (key,)).fetchone(): return "duplicate"
    if not configured(): _log(con, to, kind, "not_configured"); return "not_configured"
    body = {"messaging_product": "whatsapp", "to": to, **message}; err = None
    for i in range(3):
        try:
            r = _api("messages", json=body)
            if r.ok:
                _log(con, to, kind, "accepted", r.json()["messages"][0]["id"])
                if key:
                    with con: con.execute("INSERT OR IGNORE INTO notified(key) VALUES(?)", (key,))
                return "accepted"
            err = r.text[:300]
            if r.status_code < 500 and r.status_code != 429: break
        except requests.RequestException as e: err = str(e)
        time.sleep(2 ** i)
    _log(con, to, kind, "failed", err=err); return "failed"
def send_text(con, to, text, kind="reply", key=None): return dispatch(con, to, kind, {"type": "text", "text": {"body": text}}, key)
def send_template(con, to, name, params, key=None):
    """Business-initiated messages (bills, reminders) need an approved template."""
    return dispatch(con, to, "template:" + name, {"type": "template", "template": {"name": name, "language": {"code": "en"}, "components": [{"type": "body", "parameters": [{"type": "text", "text": str(p)} for p in params]}]}}, key)
def send_menu(con, to):
    btn = lambda i, t: {"type": "reply", "reply": {"id": i, "title": t}}
    return dispatch(con, to, "menu", {"type": "interactive", "interactive": {"type": "button", "body": {"text": "Dairy owner menu"}, "action": {"buttons": [btn("/orders today", "Today's orders"), btn("/dues", "Dues"), btn("/products", "Products")]}}})
def send_document(con, to, path, caption=""):
    if not configured(): _log(con, to, "document", "not_configured"); return "not_configured"
    with open(path, "rb") as f: up = _api("media", data={"messaging_product": "whatsapp", "type": "application/pdf"}, files={"file": (os.path.basename(path), f, "application/pdf")})
    if not up.ok: _log(con, to, "document", "failed", err=up.text[:300]); return "failed"
    return dispatch(con, to, "document", {"type": "document", "document": {"id": up.json()["id"], "caption": caption, "filename": os.path.basename(path)}})
def retry_failed(con):
    """Re-sends nothing automatically for free text outside the 24h window; lists failures for the owner."""
    return [dict(r) for r in con.execute("SELECT * FROM wa_logs WHERE status='failed' ORDER BY id DESC LIMIT 20")]
# ---------- owner commands ----------
def _ask(con, owner, action, payload, summary):
    with con: con.execute("INSERT INTO pending(owner,action,payload,at) VALUES(?,?,?,?)", (owner, action, json.dumps(payload), B.now()))
    return f"{summary}\nReply /confirm to apply or /cancel."
def _apply(con, owner, action, p, pid):
    if action == "price": con.execute("UPDATE products SET price=? WHERE id=?", (p["v"], p["id"]))
    elif action == "stock": con.execute("UPDATE products SET stock=? WHERE id=?", (p["v"], p["id"]))
    elif action == "active": con.execute("UPDATE products SET active=? WHERE id=?", (p["v"], p["id"]))
    elif action == "addproduct": con.execute("INSERT INTO products(id,name,unit,price,stock,active) VALUES(?,?,?,?,0,1)", (p["id"], p["name"], p["unit"], p["price"]))
    elif action == "payment":
        B.record_payment(con, p["cid"], p["amt"], p["m"], ref=f"wa-pending-{pid}", actor=owner); return "Payment recorded."
    B.audit(con, owner, action, json.dumps(p)); return "Done."
def handle(con, sender, text, outdir="pdf"):
    """`sender` MUST be the webhook's authenticated `from` field, never text from the message body."""
    t = (text or "").strip()
    if not t.startswith("/"): return "Send /menu for options."
    cmd, *a = t.split(); cmd = cmd.lower()
    if sender not in owners():
        if cmd == "/balance":
            c = con.execute("SELECT id FROM customers WHERE phone=?", (sender,)).fetchone()
            return f"Your balance: {R(B.balance(con, c['id']))}" if c else "No account for this number."
        return "Not authorised."
    try:
        if cmd == "/confirm":
            row = con.execute("SELECT * FROM pending WHERE owner=? ORDER BY id DESC LIMIT 1", (sender,)).fetchone()
            if not row or row["at"] < time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(time.time() - 600)): return "Nothing to confirm (requests expire after 10 minutes)."
            with con:
                msg = _apply(con, sender, row["action"], json.loads(row["payload"]), row["id"]); con.execute("DELETE FROM pending WHERE owner=?", (sender,))
            return msg
        if cmd == "/cancel":
            with con: con.execute("DELETE FROM pending WHERE owner=?", (sender,))
            return "Cancelled."
        if cmd == "/menu": return "__MENU__"
        if cmd == "/orders":
            w = (a[0] if a else "today").lower(); q = "SELECT o.id,o.status,c.name FROM orders o JOIN customers c ON c.id=o.customer_id WHERE "
            rows = con.execute(q + "o.created_at>=?", (B.now()[:10],)).fetchall() if w == "today" else con.execute(q + "o.status=?", (w,)).fetchall()
            return "\n".join(f"#{r['id']} {r['name']} – {r['status']}" for r in rows) or "No orders."
        if cmd == "/products":
            return "\n".join(f"{p['id']} {p['name']} {R(p['price'])}/{p['unit']} stock {p['stock']:g} {'' if p['active'] else '(inactive)'}" for p in con.execute("SELECT * FROM products")) or "No products."
        if cmd == "/price": return _ask(con, sender, "price", {"id": a[0], "v": paise(a[1])}, f"Set price of {a[0]} to {R(paise(a[1]))}?")
        if cmd == "/stock":
            if float(a[1]) < 0: return "Stock cannot be negative."
            return _ask(con, sender, "stock", {"id": a[0], "v": float(a[1])}, f"Set stock of {a[0]} to {a[1]}?")
        if cmd == "/active": return _ask(con, sender, "active", {"id": a[0], "v": 1 if a[1].lower() == "on" else 0}, f"Set {a[0]} {a[1]}?")
        if cmd == "/addproduct": return _ask(con, sender, "addproduct", {"id": a[0], "name": a[1], "unit": a[2], "price": paise(a[3])}, f"Add product {a[0]} {a[1]} at {R(paise(a[3]))}/{a[2]}?")
        if cmd == "/payment":
            if not con.execute("SELECT 1 FROM customers WHERE id=?", (a[0],)).fetchone(): return "Unknown customer."
            return _ask(con, sender, "payment", {"cid": a[0], "amt": paise(a[1]), "m": a[2].lower()}, f"Record {R(paise(a[1]))} {a[2]} from {a[0]}?")
        if cmd == "/dues":
            d = B.dues(con); return "\n".join(f"{i} {n}: {R(b)}" for i, n, b in d) + f"\nTotal: {R(sum(x[2] for x in d))}" if d else "No outstanding balances."
        if cmd == "/bill":
            from . import pdfs
            s = B.generate_statement(con, a[0], B.parse_period(" ".join(a[1:]))); path = pdfs.statement(con, s["id"], f"{outdir}/{s['stmt_no']}.pdf")
            send_document(con, sender, path, s["stmt_no"]); return f"Statement {s['stmt_no']}: closing balance {R(s['closing'])}"
        if cmd == "/report":
            from . import pdfs
            p = B.parse_period(" ".join(a)); r = B.owner_report(con, p); path = pdfs.owner_report(con, p, f"{outdir}/report-{p}.pdf"); send_document(con, sender, path, f"Report {p}")
            return f"{p}: sales {R(r['sales'])}, collected {R(r['collected'])}, receivables {R(r['receivables'])}, est. profit {R(r['profit'])}"
        if cmd == "/remind":
            n = 0
            for i, nm, b in B.dues(con):
                c = con.execute("SELECT * FROM customers WHERE id=?", (i,)).fetchone()
                if c["wa_optin"] and c["phone"] and send_template(con, c["phone"], os.environ.get("WA_TPL_REMINDER", "payment_reminder"), [nm, R(b)], key=f"remind:{i}:{B.now()[:10]}") == "accepted": n += 1
            return f"Reminders accepted by WhatsApp: {n} (opted-in customers only; see logs for failures)."
    except (IndexError, ValueError, KeyError) as e: return f"Invalid command: {e}"
    return "Unknown command. Send /menu."
def process(con, payload):
    for e in payload.get("entry", []):
        for ch in e.get("changes", []):
            v = ch.get("value", {})
            for s in v.get("statuses", []):
                with con: con.execute("UPDATE wa_logs SET status=?,error=? WHERE wa_id=?", (s["status"], json.dumps(s.get("errors")) if s.get("errors") else None, s["id"]))
            for m in v.get("messages", []):
                with con: fresh = con.execute("INSERT OR IGNORE INTO processed(msg_id) VALUES(?)", (m["id"],)).rowcount
                if not fresh: continue  # duplicate webhook delivery
                text = (m.get("text") or {}).get("body") or ((m.get("interactive") or {}).get("button_reply") or (m.get("interactive") or {}).get("list_reply") or {}).get("id")
                reply = handle(con, m["from"], text)
                send_menu(con, m["from"]) if reply == "__MENU__" else send_text(con, m["from"], reply)
