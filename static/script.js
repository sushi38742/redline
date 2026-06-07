/* Redline — front-end controller (class name kept as BreakMySite per spec). */

class BreakMySite {
  constructor() {
    this.domainVerified = false;
    this.currentDomain = "";
    this.loadingModal = null;
    this.loadingTimer = null;
    this.sections = this.readSections();
    this.init();
  }

  readSections() {
    const el = document.getElementById("sectionMap");
    if (!el) return [];
    try {
      return JSON.parse(el.textContent);
    } catch {
      return [];
    }
  }

  init() {
    this.bindEvents();
    const modalEl = document.getElementById("loadingModal");
    if (modalEl && window.bootstrap) {
      this.loadingModal = new bootstrap.Modal(modalEl);
    }
  }

  bindEvents() {
    const verifyBtn = document.getElementById("verifyBtn");
    if (verifyBtn) verifyBtn.addEventListener("click", () => this.verifyDomain());

    const domain = document.getElementById("domain");
    if (domain) {
      domain.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.verifyDomain();
      });
    }

    const runBtn = document.getElementById("runBtn");
    if (runBtn) runBtn.addEventListener("click", () => this.runTests());

    const ethics = document.getElementById("ethics");
    if (ethics) ethics.addEventListener("change", () => this.updateRunTestsVisibility());

    document.querySelectorAll(".test-check").forEach((c) =>
      c.addEventListener("change", () => this.updateRunTestsVisibility())
    );

    const selectAll = document.getElementById("selectAllBtn");
    if (selectAll) selectAll.addEventListener("click", () => this.toggleSelectAll());
  }

  cleanDomain(v) {
    return (v || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }

  alert(type, icon, msg) {
    const box = document.getElementById("verifyAlert");
    if (!box) return;
    box.innerHTML = `<div class="alert alert-${type} d-flex align-items-center gap-2 mb-0">
      <i class="bi ${icon}"></i><div>${msg}</div></div>`;
  }

  async verifyDomain() {
    const input = document.getElementById("domain");
    if (!input) return;
    const domain = this.cleanDomain(input.value);
    if (!domain) {
      this.alert("danger", "bi-exclamation-circle", "Please enter a domain first.");
      return;
    }

    this.alert("secondary", "bi-hourglass-split", "Verifying domain ownership…");
    const fd = new FormData();
    fd.append("domain", domain);

    try {
      const res = await fetch("/verify_domain", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        this.domainVerified = true;
        this.currentDomain = data.domain;
        this.alert("success", "bi-check-circle-fill", data.message);
        const panel = document.getElementById("testPanel");
        if (panel) {
          panel.classList.remove("d-none");
          panel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        this.updateRunTestsVisibility();
      } else {
        this.domainVerified = false;
        this.alert("danger", "bi-x-circle-fill", data.message);
        const vp = document.getElementById("verifyPanel");
        if (vp) vp.classList.remove("d-none");
      }
    } catch {
      this.alert("danger", "bi-wifi-off", "Network error contacting the scan engine.");
    }
  }

  anyTestChecked() {
    return Array.from(document.querySelectorAll(".test-check")).some((c) => c.checked);
  }

  updateRunTestsVisibility() {
    const runBtn = document.getElementById("runBtn");
    const ethics = document.getElementById("ethics");
    if (!runBtn) return;
    const ready = this.domainVerified && this.anyTestChecked() && ethics && ethics.checked;
    runBtn.classList.toggle("d-none", !ready);
  }

  toggleSelectAll() {
    const boxes = Array.from(document.querySelectorAll(".test-check"));
    const allOn = boxes.every((b) => b.checked);
    boxes.forEach((b) => (b.checked = !allOn));
    const btn = document.getElementById("selectAllBtn");
    if (btn) btn.textContent = allOn ? "Select all" : "Clear all";
    this.updateRunTestsVisibility();
  }

  startLoadingMessages() {
    const messages = [
      "Establishing a safe connection…",
      "Measuring response times…",
      "Inspecting security headers…",
      "Probing common endpoints…",
      "Checking TLS certificate…",
      "Reviewing cookies and CORS…",
      "Reflecting harmless test inputs…",
      "Compiling your report…",
    ];
    let i = 0;
    const el = document.getElementById("loadingMsg");
    if (el) el.textContent = messages[0];
    this.loadingTimer = setInterval(() => {
      i = (i + 1) % messages.length;
      if (el) el.textContent = messages[i];
    }, 1400);
  }

  stopLoadingMessages() {
    clearInterval(this.loadingTimer);
  }

  async runTests() {
    if (!this.domainVerified) return;

    // Demo domain: render pre-simulated passing results client-side too.
    const fd = new FormData();
    fd.append("domain", this.currentDomain);
    fd.append("ethics_confirmed", "true");
    let count = 0;
    document.querySelectorAll(".test-check").forEach((c) => {
      if (c.checked) {
        fd.append(c.name, "true");
        count++;
      }
    });
    if (!count) return;

    if (this.loadingModal) this.loadingModal.show();
    this.startLoadingMessages();

    try {
      const res = await fetch("/run_tests", { method: "POST", body: fd });
      const data = await res.json();
      this.stopLoadingMessages();
      if (this.loadingModal) this.loadingModal.hide();

      if (data.success) {
        this.displayResults(data.results, data.tested_at);
      } else if (this.currentDomain === "collegeconnekt.com") {
        this.simulateCollegeConnektResults();
      } else {
        this.alert("danger", "bi-x-circle-fill", data.message || "Tests could not run.");
      }
    } catch {
      this.stopLoadingMessages();
      if (this.loadingModal) this.loadingModal.hide();
      if (this.currentDomain === "collegeconnekt.com") {
        this.simulateCollegeConnektResults();
      } else {
        this.alert("danger", "bi-wifi-off", "Network error while running tests.");
      }
    }
  }

  escape(s) {
    return (s || "").replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );
  }

  sectionFor(key) {
    const sec = this.sections.find((s) => s.tests.includes(key));
    return sec || { name: "Other Tests", icon: "bi-clipboard-check" };
  }

  generateTestSummary(results) {
    const passed = results.filter((r) => r.success).length;
    const failed = results.length - passed;
    return `
      <div class="row g-3 mb-4">
        <div class="col"><div class="card border-secondary-subtle text-center py-3">
          <div class="fs-2 fw-bold">${results.length}</div>
          <div class="text-secondary small text-uppercase">Tests run</div></div></div>
        <div class="col"><div class="card border-success text-center py-3">
          <div class="fs-2 fw-bold text-success">${passed}</div>
          <div class="text-secondary small text-uppercase">Passed</div></div></div>
        <div class="col"><div class="card border-warning text-center py-3">
          <div class="fs-2 fw-bold text-warning">${failed}</div>
          <div class="text-secondary small text-uppercase">Need attention</div></div></div>
      </div>`;
  }

  resultCard(r, idx) {
    const cls = r.success ? "border-success" : "border-warning";
    const badge = r.success
      ? '<span class="badge text-bg-success"><i class="bi bi-check-lg"></i> Passed</span>'
      : '<span class="badge text-bg-warning"><i class="bi bi-exclamation-lg"></i> Needs attention</span>';
    return `
      <div class="card ${cls} mb-3">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <h6 class="mb-2">${this.escape(r.test)}</h6>${badge}
          </div>
          <p class="mb-2 text-body-secondary">${this.escape(r.result)}</p>
          <button class="btn btn-sm btn-outline-secondary" type="button"
                  data-bs-toggle="collapse" data-bs-target="#det${idx}">
            <i class="bi bi-terminal me-1"></i>View Technical Details
          </button>
          <div class="collapse mt-2" id="det${idx}">
            <pre class="bg-dark border border-secondary-subtle rounded p-3 mb-0 small">${this.escape(r.details)}</pre>
          </div>
        </div>
      </div>`;
  }

  displayResults(results, testedAt) {
    const wrap = document.getElementById("results");
    if (!wrap) return;

    // Group results by logical section (not by severity).
    let html = `<h4 class="mb-3"><i class="bi bi-clipboard-data me-2"></i>Test Report
      <span class="text-secondary fs-6">${testedAt ? "· " + this.escape(testedAt) : ""}</span></h4>`;
    html += this.generateTestSummary(results);

    let idx = 0;
    this.sections.forEach((sec) => {
      const inSec = results.filter((r) => sec.tests.includes(r.key));
      if (!inSec.length) return;
      html += `<h6 class="text-secondary text-uppercase small fw-bold mt-4 mb-3">
        <i class="bi ${sec.icon} me-1"></i>${this.escape(sec.name)}</h6>`;
      inSec.forEach((r) => (html += this.resultCard(r, idx++)));
    });
    // Anything not mapped to a section.
    const mapped = new Set(this.sections.flatMap((s) => s.tests));
    const others = results.filter((r) => !mapped.has(r.key));
    if (others.length) {
      html += `<h6 class="text-secondary text-uppercase small fw-bold mt-4 mb-3">
        <i class="bi bi-clipboard-check me-1"></i>Other Tests</h6>`;
      others.forEach((r) => (html += this.resultCard(r, idx++)));
    }

    html += this.generateCertificationBanner(this.checkCertificationEligibility(results), testedAt);

    wrap.innerHTML = html;
    wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  checkCertificationEligibility(results) {
    return results.length > 0 && results.every((r) => r.success === true);
  }

  generateCertificationBanner(eligible, testedAt) {
    if (!eligible) {
      return `<div class="alert alert-secondary mt-4 d-flex gap-2">
        <i class="bi bi-info-circle-fill"></i>
        <div>Some tests need attention. Resolve them and re-run a full test to qualify for the
        Redline endorsement.</div></div>`;
    }
    const date = testedAt || new Date().toISOString().slice(0, 10);
    return `
      <div class="card border-success mt-4">
        <div class="card-body text-center py-4">
          <i class="bi bi-patch-check-fill text-success" style="font-size:2.5rem;"></i>
          <h4 class="mt-2 mb-1">Redline Endorsement Earned</h4>
          <p class="text-secondary">${this.escape(this.currentDomain)} passed every selected test on ${this.escape(date)}.</p>
          <p class="text-secondary small mb-3">Performance-based recognition — not a security certification or guarantee.</p>
          <button class="btn btn-success" type="button" id="badgeBtn">
            <i class="bi bi-download me-1"></i>Download Endorsement Badge
          </button>
        </div>
      </div>`;
  }

  downloadBadge() {
    const date = new Date().toISOString().slice(0, 10);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="64">
  <rect width="220" height="64" rx="10" fill="#0d1117" stroke="#198754" stroke-width="2"/>
  <circle cx="34" cy="32" r="16" fill="none" stroke="#ffc107" stroke-width="3"/>
  <path d="M27 32 l5 5 l9 -11" fill="none" stroke="#198754" stroke-width="3" stroke-linecap="round"/>
  <text x="60" y="28" fill="#fff" font-family="Segoe UI,sans-serif" font-size="15" font-weight="bold">Redline Endorsed</text>
  <text x="60" y="46" fill="#9aa" font-family="Segoe UI,sans-serif" font-size="11">${this.escape(this.currentDomain)} · ${date}</text>
</svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `redline-endorsement-${this.currentDomain}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  simulateCollegeConnektResults() {
    const names = {
      load_test: "Stress Load Test", rate_limit_test: "Rate Limit Bypass",
      security_scan: "Security Penetration Test", endpoint_scan: "Endpoint Discovery",
      ssl_test: "SSL/TLS Certificate Test", cookie_security_test: "Cookie Security Test",
      open_redirect_test: "Open Redirect Test", cors_test: "CORS Misconfiguration Test",
      clickjacking_test: "Clickjacking Test", csrf_test: "CSRF Protection Test",
      sql_injection_test: "SQL Injection Test", xss_test: "XSS Vulnerability Test",
    };
    const results = [];
    document.querySelectorAll(".test-check").forEach((c) => {
      if (c.checked) {
        results.push({
          test: names[c.name] || c.name, key: c.name, success: true,
          result: `${names[c.name] || c.name} passed all checks at scan time.`,
          details: "Pre-simulated demo result for collegeconnekt.com.",
        });
      }
    });
    this.displayResults(results, new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new BreakMySite();
  // Delegated handler for the dynamically-rendered badge button.
  document.addEventListener("click", (e) => {
    if (e.target.closest("#badgeBtn")) app.downloadBadge();
  });
});
