document.addEventListener('DOMContentLoaded', () => {
  /* --- Theme Logic --- */
  const themeToggle = document.getElementById('themeToggle');
  const html = document.documentElement;

  // Load saved theme
  const savedTheme = localStorage.getItem('codebridge-theme') || 'light';
  html.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('codebridge-theme', newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    if (theme === 'light') {
      icon.className = 'fa-solid fa-moon';
    } else {
      icon.className = 'fa-solid fa-sun';
    }
  }

  /* --- Verification Logic --- */
  const resultContainer = document.getElementById('verificationResult');
  const urlParams = new URLSearchParams(window.location.search);
  // `id` keeps every printed legacy QR code working; `token` is the secure
  // path for new certificates. Either can be passed in `id`.
  const query = (urlParams.get('token') || urlParams.get('id') || '').trim();
  const TOKEN_PATTERN = /^CBV-[2-9A-HJ-NP-Z]{20}$/i;

  const SUPABASE_URL = 'https://siruvivfrinoyudbotko.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcnV2aXZmcmlub3l1ZGJvdGtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNjA1MDMsImV4cCI6MjA5NzkzNjUwM30.hxLb3o1YkfSRbrPqHST20ANWkVVbalrE6xplmy8mstU';
  const VERIFY_ENDPOINT = `${SUPABASE_URL}/functions/v1/verify-certificate`;

  if (!query) {
    showError("No Certificate ID Provided", "Please scan a valid QR code or ensure the URL contains a valid certificate ID.");
    return;
  }

  const isToken = TOKEN_PATTERN.test(query);

  verifyWithBackend(query)
    .then((result) => {
      if (result.ok) {
        handleBackendResult(result.data, result.method);
      } else if (result.fallbackAllowed && !isToken) {
        // The backend is unreachable (not deployed yet / outage): legacy
        // numbers still verify against the bundled records.
        verifyLegacy(query);
      } else {
        showError("System Error", "Unable to connect to the verification database. Please try again later.");
      }
    })
    .catch(() => {
      if (!isToken) {
        verifyLegacy(query);
      } else {
        showError("System Error", "Unable to connect to the verification database. Please try again later.");
      }
    });

  async function verifyWithBackend(value) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(VERIFY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(isToken ? { token: value } : { id: value }),
        signal: controller.signal
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        // A gateway/404 page means the function is not deployed yet.
        return { ok: false, fallbackAllowed: true };
      }

      const data = await response.json();

      if (response.status === 429) {
        showError("Too Many Attempts", data.message || "Too many verification attempts. Please wait a minute and try again.");
        return { ok: true, data: null };
      }

      if (response.status === 404 && data.error === 'certificate_not_found') {
        showInvalid(value, data.message);
        return { ok: true, data: null };
      }

      if (response.status === 400) {
        showInvalid(value, "That does not look like a valid certificate ID or verification token.");
        return { ok: true, data: null };
      }

      if (!response.ok) {
        // 5xx / 503: treat as an outage and fall back for legacy numbers.
        return { ok: false, fallbackAllowed: response.status >= 500 };
      }

      return { ok: true, data, method: data.method };
    } catch (error) {
      return { ok: false, fallbackAllowed: true };
    } finally {
      clearTimeout(timeout);
    }
  }

  function handleBackendResult(data, method) {
    if (!data) return;

    if (data.valid === false) {
      if (data.reason === 'revoked') {
        showError("Certificate Revoked", `Certificate ${data.certificate?.certificate_number || query} has been revoked and is no longer valid.`);
      } else if (data.reason === 'expired') {
        showError("Certificate Expired", `Certificate ${data.certificate?.certificate_number || query} has expired.`);
      } else {
        showInvalid(query, data.message);
      }
      return;
    }

    if (data.requires_token) {
      showRestricted(data.certificate || {});
      return;
    }

    const cert = data.certificate || {};
    showSuccess({
      id: cert.certificate_number || query,
      name: cert.holder_name || '',
      program: cert.program || '',
      modules: Array.isArray(cert.modules) ? cert.modules : [],
      startDate: formatDate(cert.start_date),
      endDate: formatDate(cert.end_date)
    }, method);
  }

  function verifyLegacy(value) {
    fetch('../data/students.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(students => {
        const needle = value.toUpperCase();
        const student = students.find(s => String(s.id).toUpperCase() === needle);

        if (student) {
          showSuccess(student, 'number');
        } else {
          showInvalid(value);
        }
      })
      .catch(error => {
        console.error('Error fetching verification data:', error);
        showError("System Error", "Unable to connect to the verification database. Please try again later.");
      });
  }

  function showInvalid(value, message) {
    showError(
      "Invalid Certificate",
      message || `No records found for Certificate ID: ${value}. This certificate may be forged or invalid.`
    );
  }

  function showSuccess(student, method) {
    const modules = Array.isArray(student.modules) ? student.modules : [];
    const modulesHtml = modules.map(module => `<li>${escapeHtml(module)}</li>`).join('');
    const methodNote = method === 'token'
      ? '<p class="program-name" style="font-size:0.85rem;opacity:0.8;margin-top:0.25rem;">Verified with a secure certificate token.</p>'
      : '';

    resultContainer.innerHTML = `
      <div class="status-banner valid">
        <div class="status-icon"><i class="fa-solid fa-check"></i></div>
        <div class="status-title">Verified Credential</div>
      </div>
      <div class="card-body">
        <h2 class="student-name">${escapeHtml(student.name)}</h2>
        <p class="program-name">${escapeHtml(student.program)}</p>
        ${methodNote}
        
        <div class="details-grid">
          <div class="dates-container">
            <div class="detail-item">
              <div class="detail-label">Start Date</div>
              <div class="detail-value">${escapeHtml(student.startDate || '—')}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">End Date</div>
              <div class="detail-value">${escapeHtml(student.endDate || '—')}</div>
            </div>
          </div>
          
          <div class="detail-item">
            <div class="detail-label">Certificate ID</div>
            <div class="detail-value" style="font-family: monospace;">${escapeHtml(student.id)}</div>
          </div>
          
          <div class="detail-item">
            <div class="detail-label">Modules Completed</div>
            <ul class="modules-list">
              ${modulesHtml}
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  function showRestricted(cert) {
    resultContainer.innerHTML = `
      <div class="status-banner valid">
        <div class="status-icon"><i class="fa-solid fa-check"></i></div>
        <div class="status-title">Certificate Confirmed</div>
      </div>
      <div class="card-body">
        <p class="program-name">Certificate ${escapeHtml(cert.certificate_number || query)} is valid and active.</p>
        <p>To view the holder's details, scan the QR code printed on the certificate or enter the verification token shown next to it.</p>
        <a href="index.html" class="btn-home">Return to Home</a>
      </div>
    `;
  }

  function showError(title, message) {
    resultContainer.innerHTML = `
      <div class="status-banner invalid">
        <div class="status-icon"><i class="fa-solid fa-xmark"></i></div>
        <div class="status-title">${escapeHtml(title)}</div>
      </div>
      <div class="card-body invalid-message">
        <p>${escapeHtml(message)}</p>
        <a href="index.html" class="btn-home">Return to Home</a>
      </div>
    `;
  }

  function formatDate(value) {
    if (!value) return '—';
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
});
