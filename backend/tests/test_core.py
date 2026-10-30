import hashlib, hmac, json, os
import pytest
from backend import billing as B, jobs, pdfs, wa
from backend.app import create_app, issue_token
from backend.db import connect
@pytest.fixture(autouse=True)
def env(monkeypatch):
    for k, v in dict(OWNER_PHONES="919999999999", WA_APP_SECRET="s3", WA_VERIFY_TOKEN="vt", APP_SECRET="appsec", OWNER_API_KEY="ok").items(): monkeypatch.setenv(k, v)
    for k in ("WA_TOKEN", "WA_PHONE_ID"): monkeypatch.delenv(k, raising=False)
@pytest.fixture
def con(tmp_path):
    c = connect(str(tmp_path / "t.db"))
    c.executescript("INSERT INTO customers VALUES('C1','Ravi','919000000001','x',1),('C2','Anita','919000000002','y',0);"
                    "INSERT INTO products VALUES('MILK001','Milk','litre',6000,5000,100,1),('GHEE001','Ghee','kg',65000,50000,10,1);")
    return c
def deliver(con, cid, items, when, **kw):
    oid = B.place_order(con, cid, items, when=when, **kw); B.set_status(con, oid, "delivered", when=when); return oid
def test_price_snapshot_and_multi_items(con):
    oid = deliver(con, "C1", [("MILK001", 2), ("GHEE001", 0.5)], "2026-10-02")
    con.execute("UPDATE products SET price=9900 WHERE id='MILK001'"); con.commit()
    assert B.order_total(con, oid) == 2 * 6000 + 32500
def test_cancel_not_billed_and_stock_restored(con):
    oid = B.place_order(con, "C1", [("MILK001", 5)]); assert con.execute("SELECT stock FROM products WHERE id='MILK001'").fetchone()[0] == 95
    B.set_status(con, oid, "cancelled"); assert con.execute("SELECT stock FROM products WHERE id='MILK001'").fetchone()[0] == 100
    assert con.execute("SELECT COUNT(*) FROM bills").fetchone()[0] == 0
    with pytest.raises(ValueError): B.set_status(con, oid, "delivered")
def test_bill_idempotent(con):
    oid = deliver(con, "C1", [("MILK001", 1)], "2026-10-02"); B.make_bill(con, oid); con.commit()
    assert con.execute("SELECT COUNT(*) FROM bills").fetchone()[0] == 1
def test_partial_payments_and_status(con):
    deliver(con, "C1", [("MILK001", 10)], "2026-10-02"); deliver(con, "C1", [("MILK001", 5)], "2026-10-03")
    B.record_payment(con, "C1", 70000, "upi", when="2026-10-05")
    al = B.allocations(con, "C1"); b1, b2 = [r for r in con.execute("SELECT * FROM bills ORDER BY id")]
    assert B.bill_status(b1["total"], al[b1["id"]]) == "paid" and B.bill_status(b2["total"], al[b2["id"]]) == "partially paid"
    assert B.balance(con, "C1") == 90000 - 70000
def test_duplicate_payment_ref_ignored(con):
    assert B.record_payment(con, "C1", 100, "cash", ref="r1") and not B.record_payment(con, "C1", 100, "cash", ref="r1")
def test_statement_opening_closing_and_idempotent(con):
    deliver(con, "C1", [("MILK001", 10)], "2026-08-10"); B.record_payment(con, "C1", 20000, "cash", when="2026-08-20")
    deliver(con, "C1", [("MILK001", 5)], "2026-09-04"); B.record_payment(con, "C1", 10000, "bank", when="2026-09-06"); B.adjust(con, "C1", "refund", 3000, "spoiled", when="2026-09-07")
    s = B.generate_statement(con, "C1", "2026-09")
    assert (s["opening"], s["charges"], s["payments"], s["credits"], s["closing"]) == (40000, 30000, 10000, 3000, 57000)
    assert B.generate_statement(con, "C1", "2026-09")["id"] == s["id"]
    B.run_monthly(con, "2026-09"); B.run_monthly(con, "2026-09"); assert con.execute("SELECT COUNT(*) FROM statements WHERE period='2026-09'").fetchone()[0] == 1
    with pytest.raises(ValueError): B.generate_statement(con, "C1", "2099-01")
def test_job_repeat_and_no_whatsapp_simulation(con, tmp_path):
    deliver(con, "C1", [("MILK001", 1)], "2026-09-10"); jobs.monthly(con, "2026-09", str(tmp_path)); jobs.monthly(con, "2026-09", str(tmp_path))
    assert con.execute("SELECT COUNT(*) FROM statements").fetchone()[0] == 1
    assert "accepted" not in {r[0] for r in con.execute("SELECT status FROM wa_logs")} and con.execute("SELECT COUNT(*) FROM notified").fetchone()[0] == 0
def test_report_separates_figures(con):
    deliver(con, "C1", [("MILK001", 10)], "2026-10-02"); B.record_payment(con, "C1", 20000, "cash", when="2026-10-03")
    con.execute("INSERT INTO expenses(kind,amount,note,spent_at) VALUES('other',5000,'fuel','2026-10-04')"); con.commit()
    r = B.owner_report(con, "2026-10"); assert (r["sales"], r["collected"], r["receivables"], r["cogs"], r["profit"]) == (60000, 20000, 40000, 50000, 60000 - 50000 - 5000)
def test_owner_only_commands_and_confirm(con):
    assert wa.handle(con, "919000000001", "/price MILK001 64") == "Not authorised."
    assert wa.handle(con, "919000000001", "/dues") == "Not authorised."
    assert "/confirm" in wa.handle(con, "919999999999", "/price MILK001 64")
    assert con.execute("SELECT price FROM products WHERE id='MILK001'").fetchone()[0] == 6000
    wa.handle(con, "919999999999", "/confirm"); assert con.execute("SELECT price FROM products WHERE id='MILK001'").fetchone()[0] == 6400
    assert wa.handle(con, "919999999999", "/payment C1 500 UPI").startswith("Record"); wa.handle(con, "919999999999", "/confirm")
    assert B.balance(con, "C1") == -50000
    assert wa.handle(con, "919999999999", "/stock MILK001 -3").startswith("Stock cannot")
def test_send_not_configured_is_logged_not_sent(con):
    assert wa.send_text(con, "919000000001", "hi") == "not_configured"; assert con.execute("SELECT status FROM wa_logs").fetchone()[0] == "not_configured"
def test_webhook_signature_and_duplicates(con, tmp_path):
    app = create_app(str(tmp_path / "t.db"), str(tmp_path)).test_client()
    body = json.dumps({"entry": [{"changes": [{"value": {"messages": [{"id": "m1", "from": "919999999999", "text": {"body": "/products"}}]}}]}]}).encode()
    sig = "sha256=" + hmac.new(b"s3", body, hashlib.sha256).hexdigest()
    assert app.post("/webhook", data=body).status_code == 403 and app.post("/webhook", data=body, headers={"X-Hub-Signature-256": "sha256=bad"}).status_code == 403
    assert app.post("/webhook", data=body, headers={"X-Hub-Signature-256": sig}).status_code == 200; assert app.post("/webhook", data=body, headers={"X-Hub-Signature-256": sig}).status_code == 200
    c = connect(str(tmp_path / "t.db")); assert c.execute("SELECT COUNT(*) FROM wa_logs WHERE kind='reply'").fetchone()[0] == 1
    assert app.get("/webhook?hub.mode=subscribe&hub.verify_token=vt&hub.challenge=77").data == b"77" and app.get("/webhook?hub.mode=subscribe&hub.verify_token=no&hub.challenge=77").status_code == 403
def test_pdfs_and_customer_access(con, tmp_path):
    oid = deliver(con, "C1", [("MILK001", 2)], "2026-09-10"); deliver(con, "C2", [("MILK001", 1)], "2026-09-11"); B.record_payment(con, "C1", 5000, "cash", when="2026-09-12")
    s = B.generate_statement(con, "C1", "2026-09")
    for p in (pdfs.receipt(con, 1, str(tmp_path / "a.pdf")), pdfs.statement(con, s["id"], str(tmp_path / "b.pdf")), pdfs.payment_receipt(con, 1, str(tmp_path / "c.pdf")), pdfs.owner_report(con, "2026-09", str(tmp_path / "d.pdf")), pdfs.outstanding(con, str(tmp_path / "e.pdf"))):
        assert open(p, "rb").read(4) == b"%PDF"
    c = create_app(str(tmp_path / "t.db"), str(tmp_path)).test_client(); h1 = {"Authorization": "Bearer " + issue_token("C1")}
    assert c.get("/api/my/bills/1/pdf", headers=h1).status_code == 200 and c.get("/api/my/bills/2/pdf", headers=h1).status_code == 404 and c.get("/api/my/bills/1/pdf").status_code == 401
    assert c.get("/api/owner/report/2026-09/pdf").status_code == 403 and c.get("/api/owner/report/2026-09/pdf", headers={"X-Owner-Key": "ok"}).status_code == 200
