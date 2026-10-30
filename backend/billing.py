"""Core business rules: orders, bills, payments, statements, owner report. Money = integer paise."""
import calendar
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
def paise(v):
    return int((Decimal(str(v)) * 100).quantize(Decimal("1"), ROUND_HALF_UP))
def rupees(p): return f"Rs {p/100:,.2f}"
def now(): return datetime.now(timezone.utc).replace(tzinfo=None).isoformat(timespec="seconds")
def line(q, p): return int((Decimal(str(q)) * p).quantize(Decimal("1"), ROUND_HALF_UP))
def audit(con, actor, action, detail=""):
    con.execute("INSERT INTO audit(actor,action,detail,at) VALUES(?,?,?,?)", (actor, action, detail, now()))
def _s(con, sql, *a): return con.execute(sql, a).fetchone()[0] or 0
def period_range(p):
    y, m = map(int, p.split("-")); ny, nm = (y + 1, 1) if m == 12 else (y, m + 1)
    return f"{y:04d}-{m:02d}-01", f"{ny:04d}-{nm:02d}-01"
def parse_period(text):
    t = text.strip()
    for f in ("%B %Y", "%b %Y", "%Y-%m"):
        try: return datetime.strptime(t.title() if "%B" in f or "%b" in f else t, f).strftime("%Y-%m")
        except ValueError: pass
    raise ValueError("Use a month like 'October 2026' or 2026-10")
def order_items_total(con, oid):
    return sum(line(r["qty"], r["unit_price"]) for r in con.execute("SELECT qty,unit_price FROM order_items WHERE order_id=?", (oid,)))
def order_total(con, oid):
    o = con.execute("SELECT * FROM orders WHERE id=?", (oid,)).fetchone()
    return order_items_total(con, oid) + o["delivery_charge"] - o["discount"]
def place_order(con, cid, items, delivery=0, discount=0, when=None):
    """Snapshots price and cost into order_items so later price changes never alter old bills."""
    if not items: raise ValueError("Order has no items")
    with con:
        oid = con.execute("INSERT INTO orders(customer_id,status,created_at,delivery_charge,discount) VALUES(?,?,?,?,?)",
                          (cid, "pending", when or now(), delivery, discount)).lastrowid
        for pid, q in items:
            p = con.execute("SELECT * FROM products WHERE id=? AND active=1", (pid,)).fetchone()
            if not p: raise ValueError(f"Unknown or inactive product {pid}")
            if q <= 0 or q > p["stock"]: raise ValueError(f"Invalid quantity or insufficient stock for {pid}")
            con.execute("INSERT INTO order_items(order_id,product_id,qty,unit_price,unit_cost) VALUES(?,?,?,?,?)", (oid, pid, q, p["price"], p["cost"]))
            con.execute("UPDATE products SET stock=stock-? WHERE id=?", (q, pid))
        if order_total(con, oid) < 0: raise ValueError("Discount exceeds order value")
    return oid
def make_bill(con, oid, when=None):
    o = con.execute("SELECT * FROM orders WHERE id=?", (oid,)).fetchone()
    con.execute("INSERT OR IGNORE INTO bills(bill_no,order_id,customer_id,total,created_at) VALUES(?,?,?,?,?)",
                (f"B{oid:06d}", oid, o["customer_id"], order_total(con, oid), when or now()))
    return con.execute("SELECT * FROM bills WHERE order_id=?", (oid,)).fetchone()
def set_status(con, oid, status, actor="system", when=None):
    o = con.execute("SELECT * FROM orders WHERE id=?", (oid,)).fetchone()
    if not o: raise ValueError("No such order")
    if o["status"] == status: return
    if o["status"] == "cancelled" or (o["status"] == "delivered" and status == "cancelled"):
        raise ValueError("Cannot change this order (use a refund/adjustment for delivered orders)")
    with con:
        con.execute("UPDATE orders SET status=? WHERE id=?", (status, oid))
        if status == "cancelled":
            for r in con.execute("SELECT product_id,qty FROM order_items WHERE order_id=?", (oid,)):
                con.execute("UPDATE products SET stock=stock+? WHERE id=?", (r["qty"], r["product_id"]))
        if status == "delivered": make_bill(con, oid, when)
        audit(con, actor, "order_status", f"{oid}->{status}")
def record_payment(con, cid, amount, method, ref=None, when=None, actor="system"):
    """Idempotent when `ref` is given: the same ref never creates a second payment."""
    if amount <= 0: raise ValueError("Amount must be positive")
    if method not in ("cash", "upi", "bank"): raise ValueError("Method must be cash, upi or bank")
    with con:
        cur = con.execute("INSERT OR IGNORE INTO payments(customer_id,amount,method,paid_at,ref) VALUES(?,?,?,?,?)", (cid, amount, method, when or now(), ref))
        if cur.rowcount: audit(con, actor, "payment", f"{cid} {amount} {method}")
    return bool(cur.rowcount)
def adjust(con, cid, kind, amount, reason="", order_id=None, when=None, actor="system"):
    if amount <= 0: raise ValueError("Amount must be positive")
    with con:
        con.execute("INSERT INTO adjustments(customer_id,kind,amount,reason,order_id,created_at) VALUES(?,?,?,?,?,?)", (cid, kind, amount, reason, order_id, when or now()))
        audit(con, actor, "adjust_" + kind, f"{cid} {amount} {reason}")
def flows(con, cid, start, end):
    q = lambda t, c, extra="": _s(con, f"SELECT SUM(amount) FROM {t} WHERE customer_id=? AND {c}>=? AND {c}<? {extra}", cid, start, end)
    ch = _s(con, "SELECT SUM(total) FROM bills WHERE customer_id=? AND created_at>=? AND created_at<?", cid, start, end)
    return dict(charges=ch, debits=q("adjustments", "created_at", "AND kind='debit'"), payments=q("payments", "paid_at"),
                credits=q("adjustments", "created_at", "AND kind IN('credit','refund')"))
def balance(con, cid, end="9999"):
    f = flows(con, cid, "0000", end); return f["charges"] + f["debits"] - f["payments"] - f["credits"]
def allocations(con, cid):
    """Payments and credits are applied to bills oldest-first, so no payment is counted twice."""
    pool = flows(con, cid, "0000", "9999"); pool = pool["payments"] + pool["credits"] - pool["debits"]
    out = {}
    for b in con.execute("SELECT id,total FROM bills WHERE customer_id=? ORDER BY id", (cid,)):
        paid = max(0, min(b["total"], pool)); pool -= paid; out[b["id"]] = paid
    return out
def bill_status(total, paid): return "paid" if paid >= total else ("partially paid" if paid > 0 else "unpaid")
def generate_statement(con, cid, period):
    ex = con.execute("SELECT * FROM statements WHERE customer_id=? AND period=?", (cid, period)).fetchone()
    if ex: return ex
    s, e = period_range(period)
    if e > now()[:10]: raise ValueError("Period has not ended yet")
    f = flows(con, cid, s, e); op = balance(con, cid, s)
    closing = op + f["charges"] + f["debits"] - f["payments"] - f["credits"]
    with con:
        con.execute("INSERT OR IGNORE INTO statements(stmt_no,customer_id,period,opening,charges,debits,payments,credits,closing,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
                    (f"S{period.replace('-', '')}-{cid}", cid, period, op, f["charges"], f["debits"], f["payments"], f["credits"], closing, now()))
    return con.execute("SELECT * FROM statements WHERE customer_id=? AND period=?", (cid, period)).fetchone()
def run_monthly(con, period):
    """Statements for every customer with activity or a non-zero opening balance. Safe to re-run."""
    s, e = period_range(period); made = []
    for c in con.execute("SELECT id FROM customers"):
        f = flows(con, c["id"], s, e)
        if any(f.values()) or balance(con, c["id"], s) != 0: made.append(generate_statement(con, c["id"], period))
    return made
def dues(con):
    r = [(c["id"], c["name"], balance(con, c["id"])) for c in con.execute("SELECT id,name FROM customers")]
    return [x for x in r if x[2] > 0]
def owner_report(con, period):
    s, e = period_range(period)
    bills = con.execute("SELECT * FROM bills WHERE created_at>=? AND created_at<?", (s, e)).fetchall()
    sales = sum(b["total"] for b in bills)
    cogs = _s(con, "SELECT SUM(CAST(ROUND(i.qty*i.unit_cost) AS INTEGER)) FROM order_items i JOIN bills b ON b.order_id=i.order_id WHERE b.created_at>=? AND b.created_at<?", s, e)
    by = {m: _s(con, "SELECT SUM(amount) FROM payments WHERE method=? AND paid_at>=? AND paid_at<?", m, s, e) for m in ("cash", "upi", "bank")}
    ex = lambda k: _s(con, "SELECT SUM(amount) FROM expenses WHERE kind=? AND spent_at>=? AND spent_at<?", k, s, e)
    refunds = _s(con, "SELECT SUM(amount) FROM adjustments WHERE kind='refund' AND created_at>=? AND created_at<?", s, e)
    r = dict(period=period, orders=len(bills), sales=sales, avg_order=sales // len(bills) if bills else 0, collected=sum(by.values()), by_method=by,
             refunds=refunds, discounts=_s(con, "SELECT SUM(o.discount) FROM orders o JOIN bills b ON b.order_id=o.id WHERE b.created_at>=? AND b.created_at<?", s, e),
             receivables=sum(d[2] for d in dues(con)), supplier=ex("supplier"), other=ex("other"), cogs=cogs)
    r["profit"] = sales - refunds - cogs - r["other"]  # product cost (COGS) is used for stock; supplier purchases are shown separately, not double counted
    return r
