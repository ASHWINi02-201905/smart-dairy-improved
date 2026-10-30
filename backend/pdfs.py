"""ReportLab PDFs: receipt, statement, payment receipt, owner report, outstanding report."""
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from . import billing as B
ST = getSampleStyleSheet()
def _doc(path, title, meta, tables):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    els = [Paragraph(os.environ.get("BUSINESS_NAME", "Daily Dairy Needs"), ST["Title"]), Paragraph(os.environ.get("BUSINESS_CONTACT", ""), ST["Normal"]), Spacer(1, 8), Paragraph(title, ST["Heading2"])]
    els += [Paragraph(m, ST["Normal"]) for m in meta] + [Spacer(1, 8)]
    for rows in tables:
        t = Table(rows, hAlign="LEFT"); t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#d9efd9")), ("GRID", (0, 0), (-1, -1), .4, colors.grey), ("FONTSIZE", (0, 0), (-1, -1), 9)]))
        els += [t, Spacer(1, 10)]
    SimpleDocTemplate(path, pagesize=A4).build(els); return path
R = B.rupees
def receipt(con, bill_id, path):
    b = con.execute("SELECT * FROM bills WHERE id=?", (bill_id,)).fetchone(); o = con.execute("SELECT * FROM orders WHERE id=?", (b["order_id"],)).fetchone()
    c = con.execute("SELECT * FROM customers WHERE id=?", (b["customer_id"],)).fetchone(); paid = B.allocations(con, c["id"]).get(b["id"], 0)
    items = [["Product", "Qty", "Unit", "Unit price", "Amount"]] + [[con.execute("SELECT name FROM products WHERE id=?", (i["product_id"],)).fetchone()["name"], i["qty"], con.execute("SELECT unit FROM products WHERE id=?", (i["product_id"],)).fetchone()["unit"], R(i["unit_price"]), R(B.line(i["qty"], i["unit_price"]))] for i in con.execute("SELECT * FROM order_items WHERE order_id=?", (o["id"],))]
    summ = [["Items subtotal", R(B.order_items_total(con, o["id"]))], ["Delivery", R(o["delivery_charge"])], ["Discount", "-" + R(o["discount"])], ["Total", R(b["total"])], ["Paid", R(paid)], ["Due", R(b["total"] - paid)], ["Status", B.bill_status(b["total"], paid)]]
    return _doc(path, f"Receipt {b['bill_no']}", [f"Order #{o['id']} · {o['created_at'][:10]}", f"Customer: {c['name']} ({c['id']})"], [items, summ])
def statement(con, stmt_id, path):
    s = con.execute("SELECT * FROM statements WHERE id=?", (stmt_id,)).fetchone(); c = con.execute("SELECT * FROM customers WHERE id=?", (s["customer_id"],)).fetchone(); a, z = B.period_range(s["period"])
    pur = [["Bill", "Date", "Amount"]] + [[x["bill_no"], x["created_at"][:10], R(x["total"])] for x in con.execute("SELECT * FROM bills WHERE customer_id=? AND created_at>=? AND created_at<? ORDER BY id", (c["id"], a, z))]
    pay = [["Date", "Method", "Amount"]] + [[x["paid_at"][:10], x["method"], R(x["amount"])] for x in con.execute("SELECT * FROM payments WHERE customer_id=? AND paid_at>=? AND paid_at<?", (c["id"], a, z))]
    adj = [["Date", "Type", "Reason", "Amount"]] + [[x["created_at"][:10], x["kind"], x["reason"] or "", R(x["amount"])] for x in con.execute("SELECT * FROM adjustments WHERE customer_id=? AND created_at>=? AND created_at<?", (c["id"], a, z))]
    summ = [["Opening balance", R(s["opening"])], ["New charges", R(s["charges"])], ["Debit adjustments", R(s["debits"])], ["Payments", "-" + R(s["payments"])], ["Credits/refunds", "-" + R(s["credits"])], ["Closing balance", R(s["closing"])]]
    return _doc(path, f"Statement {s['stmt_no']}", [f"Customer: {c['name']} ({c['id']})", f"Period: {s['period']} · Generated {s['created_at'][:10]}"], [pur, pay, adj, summ])
def payment_receipt(con, pid, path):
    p = con.execute("SELECT * FROM payments WHERE id=?", (pid,)).fetchone(); c = con.execute("SELECT * FROM customers WHERE id=?", (p["customer_id"],)).fetchone()
    return _doc(path, f"Payment receipt #{p['id']}", [f"Customer: {c['name']} ({c['id']})"], [[["Date", "Method", "Amount"], [p["paid_at"][:10], p["method"], R(p["amount"])]]])
def owner_report(con, period, path):
    r = B.owner_report(con, period)
    rows = [["Metric", "Value"], ["Orders", r["orders"]], ["Sales (billed)", R(r["sales"])], ["Average order", R(r["avg_order"])], ["Cash collected", R(r["collected"])]] + [[f"  {k}", R(v)] for k, v in r["by_method"].items()] + [["Refunds", R(r["refunds"])], ["Discounts", R(r["discounts"])], ["Outstanding receivables", R(r["receivables"])], ["Product cost (COGS)", R(r["cogs"])], ["Supplier purchases (info)", R(r["supplier"])], ["Other expenses", R(r["other"])], ["Estimated profit", R(r["profit"])]]
    return _doc(path, f"Owner report {period}", ["Sales, cash collected, receivables and profit are separate figures."], [rows])
def outstanding(con, path):
    return _doc(path, "Outstanding balances", [B.now()[:10]], [[["Customer", "Name", "Balance"]] + [[i, n, R(b)] for i, n, b in B.dues(con)]])
