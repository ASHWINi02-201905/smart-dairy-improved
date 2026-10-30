# Backend: billing, statements, owner management via WhatsApp

**Status:** logic and security checks are covered by automated tests (`python -m pytest backend`). The WhatsApp Cloud API calls
have **NOT** been tested against Meta – no credentials were available. Until you add them, messages are logged as `not_configured`, never "sent".
The existing website (`app.html`, `index.html`) still uses browser localStorage; it is not yet connected to this backend.

## Files
`db.py` schema (SQLite, paise) · `billing.py` orders/bills/payments/statements/report · `pdfs.py` 5 PDF types · `wa.py` webhook, commands, sending ·
`jobs.py` monthly job · `app.py` Flask API · `migrations/001_billing.sql` · `tests/`

## Run locally (Windows)
```
py -m venv .venv && .venv\Scripts\activate
pip install -r backend\requirements.txt
copy backend\.env.example .env       (fill values, then set them in your shell or use a dotenv loader)
python -m pytest backend
python -m backend.app                (http://localhost:5000/health)
```
Back up first: `copy dairy.db dairy.backup.db` (rollback = restore this file). Migrations only add tables.

## Meta WhatsApp Cloud API
1. developers.facebook.com → create Business app → add WhatsApp. Note Phone number ID → `WA_PHONE_ID`; create a System User permanent token → `WA_TOKEN`; App secret → `WA_APP_SECRET`.
2. Deploy over HTTPS, set webhook callback `https://YOUR_HOST/webhook` and your `WA_VERIFY_TOKEN`; subscribe to `messages`.
3. Create and get approved two templates (names in `.env`). Business-initiated messages (bills, reminders) require them and customer opt-in (`customers.wa_optin`).
4. Put your number in `OWNER_PHONES`. Commands are accepted only from the webhook's signed `from` field.
Commands: `/menu /orders today|pending|confirmed|delivered|cancelled /products /price ID 64 /stock ID 50 /active ID on|off /addproduct ID Name unit price /payment CUST 500 UPI /dues /bill CUST October 2026 /report October 2026 /remind /confirm /cancel`
Price, stock, payment and product changes need `/confirm`.

## Deploy
Any Python host (Render, Railway, VPS): `gunicorn "backend.app:create_app()"`, set env vars, persistent disk for `dairy.db` and `pdf/` (or move to Postgres/Supabase – schema is standard SQL).
Schedule `python -m backend.jobs` daily (cron / Render cron); it only creates last month's statements once.

## Still needs from you
Meta business verification and credentials, approved templates, HTTPS host, real login: replace `customer_from_token()` in `app.py` with your auth (e.g. Supabase JWT),
connect the frontend to these endpoints, and test with the sample flow (create order → deliver → payment → `/bill` → `/report`).
Not built: expense entry commands (table exists), customer WhatsApp ordering, spreadsheet export, tax lines.
