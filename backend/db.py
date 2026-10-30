"""SQLite schema (safe, additive: CREATE IF NOT EXISTS). Money is stored in integer paise."""
import os, sqlite3
SCHEMA = """
CREATE TABLE IF NOT EXISTS customers(id TEXT PRIMARY KEY,name TEXT NOT NULL,phone TEXT UNIQUE,address TEXT,wa_optin INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,name TEXT NOT NULL,unit TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>=0),cost INTEGER DEFAULT 0,stock REAL DEFAULT 0 CHECK(stock>=0),active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT,customer_id TEXT NOT NULL REFERENCES customers(id),status TEXT NOT NULL CHECK(status IN('pending','confirmed','delivered','cancelled')),created_at TEXT NOT NULL,delivery_charge INTEGER DEFAULT 0,discount INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS order_items(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER NOT NULL REFERENCES orders(id),product_id TEXT NOT NULL REFERENCES products(id),qty REAL NOT NULL CHECK(qty>0),unit_price INTEGER NOT NULL,unit_cost INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS bills(id INTEGER PRIMARY KEY AUTOINCREMENT,bill_no TEXT UNIQUE NOT NULL,order_id INTEGER UNIQUE NOT NULL REFERENCES orders(id),customer_id TEXT NOT NULL,total INTEGER NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS payments(id INTEGER PRIMARY KEY AUTOINCREMENT,customer_id TEXT NOT NULL REFERENCES customers(id),amount INTEGER NOT NULL CHECK(amount>0),method TEXT NOT NULL CHECK(method IN('cash','upi','bank')),paid_at TEXT NOT NULL,ref TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS adjustments(id INTEGER PRIMARY KEY AUTOINCREMENT,customer_id TEXT NOT NULL REFERENCES customers(id),kind TEXT NOT NULL CHECK(kind IN('credit','refund','debit')),amount INTEGER NOT NULL CHECK(amount>0),reason TEXT,order_id INTEGER,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS expenses(id INTEGER PRIMARY KEY AUTOINCREMENT,kind TEXT NOT NULL CHECK(kind IN('supplier','other')),amount INTEGER NOT NULL CHECK(amount>0),note TEXT,spent_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS statements(id INTEGER PRIMARY KEY AUTOINCREMENT,stmt_no TEXT UNIQUE NOT NULL,customer_id TEXT NOT NULL,period TEXT NOT NULL,opening INTEGER,charges INTEGER,debits INTEGER,payments INTEGER,credits INTEGER,closing INTEGER,created_at TEXT,UNIQUE(customer_id,period));
CREATE TABLE IF NOT EXISTS wa_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,wa_id TEXT,to_phone TEXT,kind TEXT,status TEXT,error TEXT,created_at TEXT);
CREATE TABLE IF NOT EXISTS processed(msg_id TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS notified(key TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS pending(id INTEGER PRIMARY KEY AUTOINCREMENT,owner TEXT,action TEXT,payload TEXT,at TEXT);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT,action TEXT,detail TEXT,at TEXT);
CREATE INDEX IF NOT EXISTS ix_bills_c ON bills(customer_id,created_at);
CREATE INDEX IF NOT EXISTS ix_pay_c ON payments(customer_id,paid_at);
"""
def connect(path=None):
    con = sqlite3.connect(path or os.environ.get("DAIRY_DB", "dairy.db"))
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    con.executescript(SCHEMA)
    return con
