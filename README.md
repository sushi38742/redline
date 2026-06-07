# Redline — Website Security Testing & Endorsement

A stateless **Flask** app that runs controlled, **non-destructive**,
simulation-based security and performance tests against domains you've verified
you own, then grants a performance-based **endorsement** when every selected
test passes.

## Stack

- Python 3 + Flask (no database — fully stateless)
- Bootstrap 5 dark theme + Bootstrap Icons
- `requests` + `beautifulsoup4`

## Run

```bash
pip install -r requirements.txt
python main.py                  # dev, http://localhost:5000
# or production:
gunicorn --bind 0.0.0.0:5000 --reuse-port --reload main:app
```

## Flow

1. Enter a domain (no `http://`).
2. Add `<meta name="breakmysite" content="verified">` to your homepage `<head>`
   and click **Verify Domain Ownership**.
3. Pick tests (grouped into logical sections), confirm you're authorized, and
   **Run Selected Tests**.
4. Results render as cards grouped by section (not by severity), each with a
   plain-English summary and a collapsible **View Technical Details** panel.
5. Pass every selected test to earn the Redline endorsement + downloadable badge.

`collegeconnekt.com` bypasses verification and returns pre-simulated passing
results; `dailyfracture.com` bypasses the meta-tag requirement but is tested for
real.

## Tests

Performance & Availability: Stress Load, Rate Limit Bypass ·
Transport & Browser Protection: SSL/TLS, Security Headers, Clickjacking,
Cookie Security · Injection & Input: SQL Injection, XSS, Open Redirect ·
Access & API Surface: Endpoint Discovery, CORS, CSRF.

All checks are simulation-based and non-destructive. Redline is **not** a
security certification — see the Legal page.
