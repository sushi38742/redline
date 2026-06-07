"""
Redline — Website Security Testing & Endorsement Platform.

A stateless Flask app that runs controlled, non-destructive, simulation-based
security and performance checks against domains the user has verified they own,
and grants a performance-based "endorsement" when every selected test passes.

No database. All network calls go through safe_request() with a short timeout
and catch every exception so a misbehaving target can never crash a test.
"""

import re
import ssl
import socket
import time
from datetime import datetime, timezone
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# --------------------------------------------------------------------------- #
#  Configuration
# --------------------------------------------------------------------------- #

DOMAIN_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$")
USER_AGENT = "RedlineScanner/1.0 (+https://redline.test; non-destructive)"
TIMEOUT = 3
COMMON_PATHS = ["/admin", "/login", "/.env", "/wp-admin", "/config.php", "/.git/config"]

# collegeconnekt.com is a demo domain: it bypasses verification and always
# returns pre-simulated passing results. dailyfracture.com bypasses the meta-tag
# requirement but is scanned for real.
PRESIM_DOMAIN = "collegeconnekt.com"
VERIFY_BYPASS = {PRESIM_DOMAIN, "dailyfracture.com"}

# Human-readable test catalog (also used to label the simulated results).
TEST_CATALOG = {
    "load_test": "Stress Load Test",
    "rate_limit_test": "Rate Limit Bypass",
    "security_scan": "Security Penetration Test",
    "endpoint_scan": "Endpoint Discovery",
    "ssl_test": "SSL/TLS Certificate Test",
    "cookie_security_test": "Cookie Security Test",
    "open_redirect_test": "Open Redirect Test",
    "cors_test": "CORS Misconfiguration Test",
    "clickjacking_test": "Clickjacking Test",
    "csrf_test": "CSRF Protection Test",
    "sql_injection_test": "SQL Injection Test",
    "xss_test": "XSS Vulnerability Test",
}


TEST_DESCRIPTIONS = {
    "load_test": "Sends a short burst of requests and measures response time and success rate.",
    "rate_limit_test": "Fires rapid repeat requests to see whether abusive traffic gets throttled.",
    "security_scan": "Inspects response headers for the core browser-hardening protections.",
    "endpoint_scan": "Probes common sensitive paths (/admin, /.env, /wp-admin) for accidental exposure.",
    "ssl_test": "Verifies HTTPS, certificate validity, and the HTTP→HTTPS redirect.",
    "cookie_security_test": "Checks cookies for the Secure, HttpOnly and SameSite flags.",
    "open_redirect_test": "Tries injected external URLs to see if the site forwards to attacker sites.",
    "cors_test": "Sends a forged Origin to detect overly permissive cross-origin sharing.",
    "clickjacking_test": "Confirms the site can't be silently embedded in a malicious frame.",
    "csrf_test": "Looks for anti-CSRF tokens on forms and SameSite cookie protection.",
    "sql_injection_test": "Reflects harmless test inputs to detect leaked database errors.",
    "xss_test": "Checks whether test markup is reflected back unescaped (XSS risk).",
}

# Heavier tests that hit several paths — flagged in the picker.
INTENSIVE_TESTS = {"endpoint_scan", "sql_injection_test", "xss_test", "open_redirect_test"}

# Group tests into sections that make sense (used for the picker AND the report
# breakdown — results are grouped by section, not by severity).
TEST_SECTIONS = [
    {"name": "Performance & Availability", "icon": "bi-speedometer2",
     "tests": ["load_test", "rate_limit_test"]},
    {"name": "Transport & Browser Protection", "icon": "bi-shield-lock",
     "tests": ["ssl_test", "security_scan", "clickjacking_test", "cookie_security_test"]},
    {"name": "Injection & Input Handling", "icon": "bi-bug",
     "tests": ["sql_injection_test", "xss_test", "open_redirect_test"]},
    {"name": "Access & API Surface", "icon": "bi-door-open",
     "tests": ["endpoint_scan", "cors_test", "csrf_test"]},
]


# --------------------------------------------------------------------------- #
#  Helpers
# --------------------------------------------------------------------------- #

def safe_request(url, method="GET", **kwargs):
    """Network wrapper: short timeout, graceful failure, sane defaults."""
    kwargs.setdefault("timeout", TIMEOUT)
    kwargs.setdefault("allow_redirects", kwargs.pop("allow_redirects", True))
    headers = {"User-Agent": USER_AGENT}
    headers.update(kwargs.pop("headers", {}) or {})
    try:
        return requests.request(method, url, headers=headers, **kwargs)
    except Exception:
        return None


def base_urls(domain):
    return [f"https://{domain}", f"http://{domain}"]


def fetch_home(domain):
    """Return the first successful (url, response) for the domain, else (None, None)."""
    for url in base_urls(domain):
        resp = safe_request(url)
        if resp is not None:
            return url, resp
    return None, None


def result(test_key, success, summary, details):
    """Standard result envelope rendered by the front-end cards."""
    return {
        "test": TEST_CATALOG.get(test_key, test_key),
        "key": test_key,
        "success": bool(success),
        "result": summary,        # plain-English explanation
        "details": details,       # raw technical output
    }


# --------------------------------------------------------------------------- #
#  Tests
# --------------------------------------------------------------------------- #

def test_load(domain):
    base, _ = fetch_home(domain)
    if not base:
        return result("load_test", False, "The site did not respond, so load behaviour could not be measured.", "No response from https/http.")
    times, ok = [], 0
    for _ in range(3):
        t0 = time.time()
        r = safe_request(base)
        dt = (time.time() - t0) * 1000
        times.append(dt)
        if r is not None and r.status_code < 500:
            ok += 1
    avg = sum(times) / len(times)
    success = ok == 3 and avg < 2000
    summary = (
        f"Your site stayed healthy under a quick burst of traffic, answering all "
        f"requests in about {avg:.0f}ms on average."
        if success else
        f"Your site struggled under a small burst — {ok}/3 requests succeeded, "
        f"averaging {avg:.0f}ms. Consider caching or a CDN."
    )
    details = f"Requests: 3\nSuccessful: {ok}/3\nResponse times (ms): {', '.join(f'{t:.0f}' for t in times)}\nAverage: {avg:.0f}ms"
    return result("load_test", success, summary, details)


def test_rate_limit(domain):
    base, _ = fetch_home(domain)
    if not base:
        return result("rate_limit_test", False, "The site did not respond, so rate limiting could not be observed.", "No response.")
    codes = []
    for _ in range(20):
        r = safe_request(base)
        codes.append(r.status_code if r is not None else "ERR")
    limited = codes.count(429)
    success = limited > 0
    summary = (
        f"Good — your site rate-limited rapid requests ({limited} of 20 were throttled), "
        f"which helps resist abuse."
        if success else
        "Your site answered 20 rapid requests without throttling any. Consider adding "
        "rate limiting on sensitive routes (login, API, search)."
    )
    details = f"Requests sent: 20\n429 (Too Many Requests) responses: {limited}\nStatus codes: {codes}"
    return result("rate_limit_test", success, summary, details)


def test_security_headers(domain):
    _, resp = fetch_home(domain)
    if resp is None:
        return result("security_scan", False, "The site did not respond, so headers could not be inspected.", "No response.")
    wanted = {
        "X-Frame-Options": resp.headers.get("X-Frame-Options"),
        "X-XSS-Protection": resp.headers.get("X-XSS-Protection"),
        "X-Content-Type-Options": resp.headers.get("X-Content-Type-Options"),
        "Strict-Transport-Security": resp.headers.get("Strict-Transport-Security"),
        "Content-Security-Policy": resp.headers.get("Content-Security-Policy"),
    }
    present = [k for k, v in wanted.items() if v]
    missing = [k for k, v in wanted.items() if not v]
    success = len(missing) == 0
    summary = (
        "All the core security headers are in place — a strong baseline."
        if success else
        f"You're missing {len(missing)} key security header(s): {', '.join(missing)}. "
        "These are quick wins that harden the browser against common attacks."
    )
    details = "\n".join(f"{k}: {v if v else 'MISSING'}" for k, v in wanted.items())
    return result("security_scan", success, summary, details)


def test_endpoints(domain):
    base, _ = fetch_home(domain)
    if not base:
        return result("endpoint_scan", False, "The site did not respond, so paths could not be probed.", "No response.")
    exposed, lines = [], []
    for path in COMMON_PATHS:
        r = safe_request(base + path)
        code = r.status_code if r is not None else "ERR"
        lines.append(f"{path} -> {code}")
        if r is not None and r.status_code == 200:
            exposed.append(path)
    success = len(exposed) == 0
    summary = (
        "None of the common sensitive paths were openly reachable — nicely locked down."
        if success else
        f"These sensitive path(s) returned 200 OK and may be exposed: {', '.join(exposed)}. "
        "Restrict or remove them."
    )
    return result("endpoint_scan", success, summary, "\n".join(lines))


def test_ssl(domain):
    https = safe_request(f"https://{domain}", allow_redirects=False)
    http = safe_request(f"http://{domain}", allow_redirects=False)
    notes, ok = [], True

    if https is None:
        ok = False
        notes.append("HTTPS did not respond.")
    else:
        notes.append(f"HTTPS responded with {https.status_code}.")

    # Certificate validity + self-signed check via a raw TLS handshake.
    cert_note = "Certificate: not checked."
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((domain, 443), timeout=TIMEOUT) as sock:
            with ctx.wrap_socket(sock, server_hostname=domain) as ssock:
                cert = ssock.getpeercert()
                exp = cert.get("notAfter")
                issuer = dict(x[0] for x in cert.get("issuer", []))
                cert_note = f"Certificate valid, issued by {issuer.get('organizationName', 'unknown')}, expires {exp}."
    except ssl.SSLCertVerificationError as e:
        ok = False
        cert_note = f"Certificate verification failed (possibly self-signed/expired): {e.verify_message}"
    except Exception as e:
        ok = False
        cert_note = f"Could not complete TLS handshake: {e}"
    notes.append(cert_note)

    # HTTP -> HTTPS redirect
    redirect_ok = False
    if http is not None and http.status_code in (301, 302, 307, 308):
        loc = http.headers.get("Location", "")
        redirect_ok = loc.startswith("https://")
        notes.append(f"HTTP redirects to: {loc or '(none)'}")
    elif http is not None:
        notes.append(f"HTTP returned {http.status_code} without redirecting to HTTPS.")
    if not redirect_ok:
        ok = False

    summary = (
        "HTTPS works, the certificate is valid, and HTTP traffic is redirected to HTTPS."
        if ok else
        "Your TLS setup has gaps — check HTTPS availability, certificate validity, and the HTTP→HTTPS redirect."
    )
    return result("ssl_test", ok, summary, "\n".join(notes))


def test_cookies(domain):
    _, resp = fetch_home(domain)
    if resp is None:
        return result("cookie_security_test", False, "The site did not respond, so cookies could not be inspected.", "No response.")
    raw = resp.headers.get("Set-Cookie")
    if not raw:
        return result("cookie_security_test", True, "No cookies were set on the homepage, so there are no insecure cookie flags to worry about here.", "Set-Cookie: (none)")
    low = raw.lower()
    flags = {
        "Secure": "secure" in low,
        "HttpOnly": "httponly" in low,
        "SameSite": "samesite" in low,
    }
    missing = [k for k, v in flags.items() if not v]
    success = not missing
    summary = (
        "Cookies are set with Secure, HttpOnly and SameSite — good hygiene."
        if success else
        f"Cookies are missing the {', '.join(missing)} flag(s), which can expose them to theft or CSRF."
    )
    details = f"Set-Cookie: {raw}\n\n" + "\n".join(f"{k}: {'yes' if v else 'MISSING'}" for k, v in flags.items())
    return result("cookie_security_test", success, summary, details)


def test_open_redirect(domain):
    base, _ = fetch_home(domain)
    if not base:
        return result("open_redirect_test", False, "The site did not respond, so redirects could not be tested.", "No response.")
    payloads = ["?redirect=https://evil.example", "?url=//evil.example", "?next=https://evil.example"]
    vulnerable, lines = [], []
    for path in ["/", "/login", "/redirect"]:
        for p in payloads:
            r = safe_request(base + path + p, allow_redirects=False)
            if r is None:
                continue
            loc = r.headers.get("Location", "")
            hit = "evil.example" in loc
            lines.append(f"{path}{p} -> {r.status_code} Location: {loc or '(none)'}")
            if hit:
                vulnerable.append(path + p)
    success = not vulnerable
    summary = (
        "No open-redirect behaviour found — the site didn't forward to our injected external URL."
        if success else
        f"Open redirect detected on: {', '.join(vulnerable)}. Validate redirect targets against an allowlist."
    )
    return result("open_redirect_test", success, summary, "\n".join(lines) or "No redirecting endpoints responded.")


def test_cors(domain):
    base, _ = fetch_home(domain)
    if not base:
        return result("cors_test", False, "The site did not respond, so CORS could not be tested.", "No response.")
    evil = "https://evil.example"
    lines, bad = [], []
    for path in ["/", "/api", "/api/user"]:
        r = safe_request(base + path, headers={"Origin": evil})
        if r is None:
            continue
        acao = r.headers.get("Access-Control-Allow-Origin", "")
        acac = r.headers.get("Access-Control-Allow-Credentials", "")
        lines.append(f"{path} -> ACAO: {acao or '(none)'} | ACAC: {acac or '(none)'}")
        if acao == "*" or acao == evil:
            bad.append(f"{path} ({acao})")
    success = not bad
    summary = (
        "CORS looks safe — the server didn't trust our forged external origin."
        if success else
        f"Permissive CORS found on: {', '.join(bad)}. Reflecting arbitrary origins can expose user data; use a strict allowlist."
    )
    return result("cors_test", success, summary, "\n".join(lines) or "No endpoints returned CORS headers.")


def test_clickjacking(domain):
    _, resp = fetch_home(domain)
    if resp is None:
        return result("clickjacking_test", False, "The site did not respond, so framing protection could not be checked.", "No response.")
    xfo = resp.headers.get("X-Frame-Options", "")
    csp = resp.headers.get("Content-Security-Policy", "")
    xfo_ok = xfo.upper() in ("DENY", "SAMEORIGIN")
    csp_ok = "frame-ancestors" in csp.lower()
    success = xfo_ok or csp_ok
    summary = (
        "Your site can't be silently embedded in a malicious frame — clickjacking protection is active."
        if success else
        "No framing protection found. Add X-Frame-Options: DENY or a Content-Security-Policy 'frame-ancestors' rule."
    )
    details = f"X-Frame-Options: {xfo or 'MISSING'}\nCSP frame-ancestors: {'present' if csp_ok else 'MISSING'}\nFull CSP: {csp or '(none)'}"
    return result("clickjacking_test", success, summary, details)


def test_csrf(domain):
    base, resp = fetch_home(domain)
    if resp is None:
        return result("csrf_test", False, "The site did not respond, so CSRF protections could not be checked.", "No response.")
    soup = BeautifulSoup(resp.text or "", "html.parser")
    forms = soup.find_all("form")
    token_re = re.compile(r"csrf|token|authenticity|_token|xsrf", re.I)
    forms_with_token = 0
    for f in forms:
        for inp in f.find_all("input", attrs={"type": "hidden"}):
            if token_re.search((inp.get("name") or "") + (inp.get("id") or "")):
                forms_with_token += 1
                break
    samesite = "samesite" in (resp.headers.get("Set-Cookie", "").lower())
    # If there are no forms, treat SameSite cookies as adequate baseline.
    if not forms:
        success = True
        summary = "No HTML forms were found on the homepage, so there's no obvious CSRF surface here."
    else:
        success = forms_with_token == len(forms) or samesite
        summary = (
            f"CSRF protections look present — {forms_with_token}/{len(forms)} forms carry a token"
            + (" and SameSite cookies are set." if samesite else ".")
            if success else
            f"Only {forms_with_token}/{len(forms)} forms include a CSRF token and SameSite cookies are "
            f"{'set' if samesite else 'not set'}. Add anti-CSRF tokens to state-changing forms."
        )
    details = f"Forms found: {len(forms)}\nForms with hidden token field: {forms_with_token}\nSameSite cookie attribute: {'yes' if samesite else 'no'}"
    return result("csrf_test", success, summary, details)


def test_sql_injection(domain):
    base, _ = fetch_home(domain)
    if not base:
        return result("sql_injection_test", False, "The site did not respond, so injection reflection could not be tested.", "No response.")
    payloads = ["?id='", "?q=1 OR 1=1--", "?id=1'\"", "?search=' OR '1'='1"]
    errors = re.compile(r"sql syntax|mysql_fetch|ORA-\d+|SQLSTATE|psql:|sqlite3\.|unclosed quotation|odbc", re.I)
    flagged, lines = [], []
    for path in ["/", "/search", "/product"]:
        for p in payloads:
            r = safe_request(base + path + p)
            if r is None:
                continue
            hit = bool(errors.search(r.text or ""))
            lines.append(f"{path}{p} -> {r.status_code}{' [DB ERROR REFLECTED]' if hit else ''}")
            if hit:
                flagged.append(path + p)
    success = not flagged
    summary = (
        "No database error messages were reflected back from our harmless test inputs — a good sign."
        if success else
        f"Database error messages leaked for: {', '.join(flagged)}. This often indicates SQL injection risk; "
        "use parameterized queries and hide DB errors."
    )
    return result("sql_injection_test", success, summary, "\n".join(lines) or "No endpoints responded to test inputs.")


def test_xss(domain):
    base, _ = fetch_home(domain)
    if not base:
        return result("xss_test", False, "The site did not respond, so reflection could not be tested.", "No response.")
    marker = "<script>alert(1)</script>"
    payloads = [f"?q={marker}", f"?search={marker}", f'?name="><img src=x onerror=alert(1)>']
    reflected, lines = [], []
    for path in ["/", "/search"]:
        for p in payloads:
            r = safe_request(base + path + p)
            if r is None:
                continue
            hit = marker in (r.text or "") or "onerror=alert(1)" in (r.text or "")
            lines.append(f"{path}{p} -> {r.status_code}{' [PAYLOAD REFLECTED RAW]' if hit else ''}")
            if hit:
                reflected.append(path + p)
    success = not reflected
    summary = (
        "Our test markup was not reflected back unescaped — the site appears to encode user input."
        if success else
        f"Unescaped input was reflected for: {', '.join(reflected)}. Escape/encode output to prevent XSS."
    )
    return result("xss_test", success, summary, "\n".join(lines) or "No endpoints responded to test inputs.")


TEST_FUNCS = {
    "load_test": test_load,
    "rate_limit_test": test_rate_limit,
    "security_scan": test_security_headers,
    "endpoint_scan": test_endpoints,
    "ssl_test": test_ssl,
    "cookie_security_test": test_cookies,
    "open_redirect_test": test_open_redirect,
    "cors_test": test_cors,
    "clickjacking_test": test_clickjacking,
    "csrf_test": test_csrf,
    "sql_injection_test": test_sql_injection,
    "xss_test": test_xss,
}


def simulate_passing(selected):
    """Pre-simulated passing results for the demo domain."""
    out = []
    for key in selected:
        name = TEST_CATALOG.get(key, key)
        out.append({
            "test": name,
            "key": key,
            "success": True,
            "result": f"{name} passed all checks at scan time.",
            "details": "Pre-simulated demo result for collegeconnekt.com.",
        })
    return out


# --------------------------------------------------------------------------- #
#  Verification
# --------------------------------------------------------------------------- #

def verify_meta_tag(domain):
    """True if <meta name='breakmysite' content='verified'> is on the homepage."""
    if domain in VERIFY_BYPASS:
        return True
    _, resp = fetch_home(domain)
    if resp is None:
        return False
    soup = BeautifulSoup(resp.text or "", "html.parser")
    tag = soup.find("meta", attrs={"name": "breakmysite"})
    return bool(tag and (tag.get("content", "").strip().lower() == "verified"))


# --------------------------------------------------------------------------- #
#  Routes
# --------------------------------------------------------------------------- #

@app.route("/")
def index():
    return render_template(
        "index.html",
        catalog=TEST_CATALOG,
        descriptions=TEST_DESCRIPTIONS,
        intensive=list(INTENSIVE_TESTS),
        sections=TEST_SECTIONS,
    )


@app.route("/endorsement")
def endorsement():
    return render_template("certification.html")


@app.route("/legal")
def legal():
    return render_template("legal.html")


@app.route("/verify_domain", methods=["POST"])
def verify_domain():
    domain = (request.form.get("domain") or "").strip().lower()
    domain = re.sub(r"^https?://", "", domain).rstrip("/")
    if not DOMAIN_RE.match(domain):
        return jsonify(success=False, message="Please enter a valid domain, e.g. example.com", domain=domain)

    if domain in VERIFY_BYPASS:
        return jsonify(success=True, message="Domain pre-cleared. You can run tests now.", domain=domain)

    _, resp = fetch_home(domain)
    if resp is None:
        return jsonify(success=False, message="Could not reach the site over HTTPS or HTTP.", domain=domain)
    if verify_meta_tag(domain):
        return jsonify(success=True, message="Ownership verified. You can run tests now.", domain=domain)
    return jsonify(
        success=False,
        message='Verification meta tag not found. Add <meta name="breakmysite" content="verified"> to your homepage <head> and try again.',
        domain=domain,
    )


@app.route("/run_tests", methods=["POST"])
def run_tests():
    domain = (request.form.get("domain") or "").strip().lower()
    domain = re.sub(r"^https?://", "", domain).rstrip("/")
    ethics = request.form.get("ethics_confirmed") == "true"

    if not DOMAIN_RE.match(domain):
        return jsonify(success=False, message="Invalid domain.")
    if not ethics:
        return jsonify(success=False, message="You must confirm you are authorized to test this domain.")

    selected = [key for key in TEST_CATALOG if request.form.get(key) == "true"]
    if not selected:
        return jsonify(success=False, message="Select at least one test to run.")

    # Demo domain: always pre-simulated passing results.
    if domain == PRESIM_DOMAIN:
        return jsonify(success=True, results=simulate_passing(selected), domain=domain,
                       tested_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))

    # Re-verify ownership immediately before testing.
    if not verify_meta_tag(domain):
        return jsonify(success=False, message="Domain ownership could not be re-verified. Re-add the meta tag and verify again.")

    results = []
    for key in selected:
        func = TEST_FUNCS.get(key)
        if func:
            try:
                results.append(func(domain))
            except Exception as e:
                results.append(result(key, False, "This test could not complete.", f"Error: {e}"))

    return jsonify(success=True, results=results, domain=domain,
                   tested_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
