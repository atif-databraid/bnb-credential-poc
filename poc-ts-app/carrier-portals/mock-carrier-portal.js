(function () {
  const body = document.body;
  const root = document.getElementById('portal-root');
  if (!body || !root) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const safeText = (value) => {
    if (value == null) {
      return '';
    }
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const trustLabel = (tier) => {
    if (tier === 'TIER_1_ENTER_EVERY_TIME') {
      return 'Tier 1 · Enter credentials each launch';
    }
    if (tier === 'TIER_2_CACHED_SESSION') {
      return 'Tier 2 · Keep cached session';
    }
    return 'Tier 3 · Stored registry';
  };

  const context = {
    carrierId: params.get('carrierId') || body.dataset.carrierId || 'carrier-generic',
    carrierName: params.get('carrierName') || body.dataset.carrierName || body.dataset.carrierDisplay || 'Carrier',
    liveUrl: params.get('liveUrl') || body.dataset.liveUrl || '',
    notes: params.get('notes') || body.dataset.portalNotes || '',
    authMechanism: params.get('authMechanism') || body.dataset.authMechanism || 'credentials',
    requiresMfa: params.get('requiresMfa') === 'true',
    mfaMethod: params.get('mfaMethod') || 'totp',
    userName: params.get('userName') || 'Demo user',
    userEmail: params.get('userEmail') || '',
    trustTier: params.get('trustTier') || 'TIER_2_CACHED_SESSION',
    cachedSession: params.get('cachedSession') === 'true',
    mfaSatisfied: params.get('mfaSatisfied') === 'true',
    username: params.get('username') || '',
  };

  const brandColor = body.dataset.brandColor || '#5558fe';
  const carrierSigil = body.dataset.brandSigil || context.carrierName.charAt(0);
  const storageKey = `bb-mock-portal-session-${context.carrierId}`;
  body.style.setProperty('--carrier-color', brandColor);

  const existingSession = (() => {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  })();

  const existingUser = existingSession?.username ? `Last mock session for ${existingSession.username}` : '';

  const renderMechanismInputs = (mechanism, requireMfaPrompt) => {
    const require = requireMfaPrompt ? 'display: block;' : 'display: none;';
    if (mechanism === 'oauth') {
      return `
        <p class="muted">This carrier uses federated identity. Confirm your broker identity to proceed.</p>
        <label>
          Corporate email
          <input id="identifier" name="identifier" type="email" autocomplete="username" value="${safeText(context.userEmail)}" required />
        </label>
        <div id="mfa-box" style="${require}">
          <label>
            Verification code (${safeText(context.mfaMethod)})
            <input id="otp" name="otp" type="text" inputmode="numeric" autocomplete="one-time-code" />
          </label>
        </div>
      `;
    }
    if (mechanism === 'sso_redirect') {
      return `
        <p class="muted">Redirect pattern with third-party identity provider.</p>
        <label>
          Login identifier
          <input id="identifier" name="identifier" type="text" autocomplete="username" value="${safeText(context.username)}" required />
        </label>
        <div id="mfa-box" style="${require}">
          <label>
            OTP challenge (${safeText(context.mfaMethod)})
            <input id="otp" name="otp" type="text" inputmode="numeric" autocomplete="one-time-code" />
          </label>
        </div>
      `;
    }
    if (mechanism === 'email_code') {
      return `
        <p class="muted">Email-link + code entry login.</p>
        <label>
          User email
          <input id="identifier" name="identifier" type="email" autocomplete="username" value="${safeText(context.userEmail || context.username)}" required />
        </label>
        <label>
          One-time code
          <input id="otp" name="otp" type="text" inputmode="numeric" autocomplete="one-time-code" required />
        </label>
        <input id="password" name="password" type="hidden" value="mock-otp-session" />
      `;
    }
    if (mechanism === 'phone_code') {
      return `
        <p class="muted">Legacy SMS OTP login.</p>
        <label>
          User phone
          <input id="identifier" name="identifier" type="tel" autocomplete="tel" placeholder="+1 (555) 555-1234" required />
        </label>
        <label>
          One-time code
          <input id="otp" name="otp" type="text" inputmode="numeric" autocomplete="one-time-code" required />
        </label>
        <input id="password" name="password" type="hidden" value="mock-sms-session" />
      `;
    }

    return `
      <p class="muted">Classic broker username/password login.</p>
      <label>
        Username
        <input id="identifier" name="identifier" type="text" autocomplete="username" value="${safeText(context.username)}" required />
      </label>
      <label>
        Password
        <input id="password" name="password" type="password" autocomplete="current-password" required />
      </label>
      <div id="mfa-box" style="${require}">
        <label>
          MFA code (${safeText(context.mfaMethod)})
          <input id="otp" name="otp" type="text" inputmode="numeric" autocomplete="one-time-code" />
        </label>
      </div>
    `;
  };

  const submitButtonCopy = {
    credentials: 'Sign in',
    oauth: 'Continue with identity provider',
    sso_redirect: 'Start SSO redirect',
    email_code: 'Verify code',
    phone_code: 'Verify SMS code',
  }[context.authMechanism] || 'Continue';

  root.innerHTML = `
    <div class="mock-portal-shell">
      <section class="carrier-card">
        <div class="carrier-card-head">
          <div class="carrier-logo" aria-hidden="true">${safeText(carrierSigil)}</div>
          <div>
            <h1 class="carrier-title">${safeText(context.carrierName)} login</h1>
            <p class="carrier-subtitle">Simulated portal used by the POC for launch-flow validation.</p>
          </div>
        </div>
        <div class="pill-row" aria-label="Carrier context">
          <span class="chip">Trust: ${safeText(trustLabel(context.trustTier))}</span>
          <span class="chip">User: ${safeText(context.userName)}</span>
          <span class="chip">MFA: ${safeText(context.requiresMfa ? context.mfaMethod.toUpperCase() : 'Not required')}</span>
          <span class="chip">Mechanism: ${safeText(context.authMechanism.replace('_', ' '))}</span>
        </div>
      </section>

      <section class="carrier-card">
        <h2>POC sign in</h2>
        <form id="login-form" class="carrier-form">
          ${renderMechanismInputs(context.authMechanism, context.requiresMfa && !context.mfaSatisfied)}
          <div class="two-col">
            <button id="portal-submit" class="primary" type="submit">${submitButtonCopy}</button>
            <button id="reset-session" class="secondary" type="button">Clear cached portal session</button>
          </div>
        </form>
      </section>

      <section class="carrier-card">
        <h2>Portal status</h2>
        <p id="status" class="status-row ${context.cachedSession || existingSession ? 'ok' : 'warn'}">
          ${sessionMessage(context, existingUser)}
        </p>
        <p class="muted">If this were the real portal, you’d see carrier-specific navigation and role-based views after this step.</p>
      </section>

      <section class="carrier-card">
        <div class="row">
          <div>
            ${context.liveUrl ? `<a class="carrier-link" href="${safeText(context.liveUrl)}" target="_blank" rel="noopener noreferrer">Open live carrier login page</a>` : ''}
          </div>
          <p class="muted">This mock is intentionally read-only for local demo flow validation.</p>
          <p class="muted">
            Current trust mode: <strong>${safeText(context.trustTier)}</strong><br />
            Live hint: ${safeText(context.notes || 'carrier-specific login flow')}
          </p>
        </div>
      </section>
    </div>
  `;

  const form = root.querySelector('#login-form');
  const status = root.querySelector('#status');
  const resetButton = root.querySelector('#reset-session');
  if (!form || !status || !(form instanceof HTMLFormElement) || !(status instanceof HTMLElement) || !resetButton) {
    return;
  }

  const identifierInput = form.querySelector('#identifier');
  const passwordInput = form.querySelector('#password');
  const otpInput = form.querySelector('#otp');

  if (context.authMechanism !== 'email_code' && context.authMechanism !== 'phone_code') {
    if (context.trustTier === 'TIER_3_STORED_REGISTRY' && passwordInput instanceof HTMLInputElement) {
      passwordInput.value = '••••••';
    }
  }

  if (identifierInput instanceof HTMLInputElement && !identifierInput.value && existingSession?.username) {
    identifierInput.value = existingSession.username;
  }

  function setStatus(message, level = 'ok') {
    status.textContent = message;
    status.className = `status-row ${level}`;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!(identifierInput instanceof HTMLInputElement)) {
      setStatus('Sign-in form is not configured correctly.', 'error');
      return;
    }

    const identifier = identifierInput.value.trim();
    const password = passwordInput instanceof HTMLInputElement ? passwordInput.value.trim() : '';
    const otp = otpInput instanceof HTMLInputElement ? otpInput.value.trim() : '';

    if (!identifier) {
      setStatus('Identifier is required for this mock login path.', 'error');
      return;
    }

    if (context.authMechanism === 'credentials' && !password) {
      setStatus('Password is required for credentials login.', 'error');
      return;
    }

    if (context.requiresMfa && !context.mfaSatisfied && !otp) {
      setStatus(`This flow requires an MFA code from ${context.mfaMethod.toUpperCase()}.`, 'warn');
      return;
    }

    if (context.authMechanism === 'email_code' && !otp) {
      setStatus('Enter the code sent to the user email to complete the mock flow.', 'warn');
      return;
    }

    if (context.authMechanism === 'phone_code' && !otp) {
      setStatus('Enter the SMS code to complete the mock flow.', 'warn');
      return;
    }

    if (typeof localStorage !== 'undefined') {
      if (context.trustTier !== 'TIER_1_ENTER_EVERY_TIME') {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            carrierId: context.carrierId,
            carrierName: context.carrierName,
            username: identifier,
            trustTier: context.trustTier,
            signedInAt: new Date().toISOString(),
            rememberMode: context.trustTier,
            actorEmail: context.userEmail,
            userName: context.userName,
            mechanism: context.authMechanism,
          }),
        );
      } else {
        localStorage.removeItem(storageKey);
      }
    }

    if (context.requiresMfa) {
      setStatus(
        `${safeText(context.carrierName)} launch completed using ${safeText(context.authMechanism.replace('_', ' '))}. MFA (${safeText(context.mfaMethod.toUpperCase())}) was handled by relay.`,
        'ok',
      );
      return;
    }

    setStatus(`Signed in to ${context.carrierName} as ${identifier}.`, 'ok');
  });

  resetButton.addEventListener('click', () => {
    if (typeof localStorage === 'undefined') {
      setStatus('Session storage unavailable in this browser context.', 'warn');
      return;
    }
    localStorage.removeItem(storageKey);
    setStatus('Cached mock session cleared.', 'warn');
  });

  function sessionMessage(cfg, previousLabel) {
    if (cfg.authMechanism === 'email_code' || cfg.authMechanism === 'phone_code') {
      return 'This path uses a code-first flow in the mock portal.';
    }
    if (cfg.requiresMfa && !cfg.mfaSatisfied) {
      return 'Carrier policy requires MFA before sign-in succeeds in this flow.';
    }
    if (cfg.trustTier === 'TIER_1_ENTER_EVERY_TIME') {
      return `Fresh sign-in for this launch. ${cfg.cachedSession ? 'App session signal exists but is not reused.' : 'No reuse expected.'}`;
    }
    if (previousLabel) {
      return `${previousLabel}. ${cfg.cachedSession ? 'Cached session from app flow exists.' : 'Session cache can be seeded on successful submission.'}`;
    }
    if (cfg.cachedSession) {
      return 'The app launch carried a cached-session signal for this carrier.';
    }
    return 'No local mock session exists yet.';
  }

  // --- RPA auto-execution mode ---
  // If credentials were provided (from DataBraid launch), simulate automated login
  const rpaUsername = context.username;
  const rpaMfaSatisfied = context.mfaSatisfied;
  const rpaOtpRaw = params.get('otp') || '';
  const rpaOtp = (rpaOtpRaw && rpaOtpRaw !== 'relayed') ? rpaOtpRaw : '';
  const shouldAutoExecute = rpaUsername && (rpaMfaSatisfied || !context.requiresMfa);

  if (shouldAutoExecute) {
    const rpaOverlay = document.createElement('div');
    rpaOverlay.className = 'rpa-overlay';
    rpaOverlay.innerHTML = `
      <div class="rpa-banner">
        <div class="rpa-banner-icon">&#9889;</div>
        <span>DataBraid RPA — automating login</span>
      </div>
      <div class="rpa-step-log" id="rpa-log"></div>
    `;
    root.prepend(rpaOverlay);

    const logEl = document.getElementById('rpa-log');

    function typeInto(input, text, callback) {
      if (!(input instanceof HTMLInputElement)) { callback(); return; }
      input.value = '';
      input.classList.add('rpa-highlight');
      input.focus();
      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          input.value += text[i];
          i++;
        } else {
          clearInterval(interval);
          callback();
        }
      }, 45);
    }

    function typePassword(input, length, callback) {
      if (!(input instanceof HTMLInputElement)) { callback(); return; }
      input.value = '';
      input.classList.add('rpa-highlight');
      input.focus();
      let i = 0;
      const interval = setInterval(() => {
        if (i < length) {
          input.value += '•';
          i++;
        } else {
          clearInterval(interval);
          callback();
        }
      }, 60);
    }

    function logStep(text) {
      if (logEl) {
        const line = document.createElement('div');
        line.className = 'rpa-log-line';
        line.innerHTML = `<span class="rpa-check">&#10003;</span> ${text}`;
        logEl.appendChild(line);
        logEl.scrollTop = logEl.scrollHeight;
      }
    }

    function runSequence(steps, onDone) {
      let i = 0;
      function next() {
        if (i >= steps.length) { onDone(); return; }
        const step = steps[i];
        i++;
        setTimeout(() => { step.run(next); }, step.delay || 0);
      }
      next();
    }

    const steps = [];

    if (context.authMechanism === 'oauth' || context.authMechanism === 'sso_redirect') {
      steps.push(
        { delay: 500, run: (next) => { logStep('Initiating SSO redirect...'); next(); } },
        { delay: 700, run: (next) => {
          logStep(`Injecting identity: ${safeText(rpaUsername)}`);
          typeInto(identifierInput, rpaUsername, next);
        }},
        { delay: 600, run: (next) => { logStep('Identity provider token exchange...'); next(); } },
        { delay: 600, run: (next) => { logStep('Session token received'); next(); } },
      );
    } else if (context.authMechanism === 'email_code' || context.authMechanism === 'phone_code') {
      steps.push(
        { delay: 500, run: (next) => {
          logStep(`Filling identifier: ${safeText(rpaUsername)}`);
          typeInto(identifierInput, rpaUsername, next);
        }},
        { delay: 500, run: (next) => {
          logStep('Verification code relayed from broker');
          typeInto(otpInput, rpaOtp || '••••••', next);
        }},
        { delay: 600, run: (next) => { logStep('Code verified'); next(); } },
      );
    } else {
      steps.push(
        { delay: 500, run: (next) => {
          logStep(`Filling username: ${safeText(rpaUsername)}`);
          typeInto(identifierInput, rpaUsername, next);
        }},
        { delay: 400, run: (next) => {
          logStep('Filling password');
          typePassword(passwordInput, 12, next);
        }},
      );
      if (context.requiresMfa) {
        const mfaLabel = rpaOtp
          ? `MFA (${safeText(context.mfaMethod)}) — entering code from broker`
          : `MFA (${safeText(context.mfaMethod)}) — session token reused`;
        steps.push(
          { delay: 500, run: (next) => {
            logStep(mfaLabel);
            const mfaBox = document.getElementById('mfa-box');
            if (mfaBox) mfaBox.style.display = 'block';
            typeInto(otpInput, rpaOtp || '••••••', next);
          }},
        );
      }
      steps.push(
        { delay: 400, run: (next) => {
          logStep('Submitting login form...');
          const submitBtn = document.getElementById('portal-submit');
          if (submitBtn) submitBtn.classList.add('rpa-highlight');
          next();
        }},
      );
    }

    steps.push(
      { delay: 800, run: (next) => {
        logStep('Login successful — session active');
        rpaOverlay.classList.add('rpa-done');
        setTimeout(() => showAuthenticatedDashboard(context, rpaUsername, rpaOverlay), 800);
        next();
      }},
    );

    setTimeout(() => runSequence(steps, () => {}), 400);
  }

  function showAuthenticatedDashboard(ctx, username, overlay) {
    const carrierSigil = body.dataset.brandSigil || ctx.carrierName.charAt(0);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    root.innerHTML = `
      <div class="mock-portal-shell">
        <div class="rpa-success-bar">
          <span class="rpa-check-lg">&#10003;</span>
          <span>Signed in via DataBraid RPA</span>
        </div>

        <section class="carrier-card dashboard-header">
          <div class="carrier-card-head">
            <div class="carrier-logo" aria-hidden="true">${safeText(carrierSigil)}</div>
            <div>
              <h1 class="carrier-title">${safeText(ctx.carrierName)}</h1>
              <p class="carrier-subtitle">Agent Portal — Authenticated Session</p>
            </div>
          </div>
          <div class="dashboard-user-bar">
            <span class="dashboard-user">${safeText(ctx.userName)}</span>
            <span class="dashboard-email">${safeText(username)}</span>
            <span class="dashboard-time">Session started ${timeStr}</span>
          </div>
        </section>

        <section class="carrier-card">
          <nav class="dashboard-nav">
            <a class="dashboard-nav-item active" href="#">Home</a>
            <a class="dashboard-nav-item" href="#">Policies</a>
            <a class="dashboard-nav-item" href="#">Quotes</a>
            <a class="dashboard-nav-item" href="#">Claims</a>
            <a class="dashboard-nav-item" href="#">Reports</a>
            <a class="dashboard-nav-item" href="#">Admin</a>
          </nav>
        </section>

        <section class="carrier-card">
          <h2>Welcome back, ${safeText(ctx.userName.split(' ')[0])}</h2>
          <div class="dashboard-grid">
            <div class="dashboard-tile">
              <span class="dashboard-tile-number">24</span>
              <span class="dashboard-tile-label">Active policies</span>
            </div>
            <div class="dashboard-tile">
              <span class="dashboard-tile-number">7</span>
              <span class="dashboard-tile-label">Pending quotes</span>
            </div>
            <div class="dashboard-tile">
              <span class="dashboard-tile-number">3</span>
              <span class="dashboard-tile-label">Open claims</span>
            </div>
            <div class="dashboard-tile">
              <span class="dashboard-tile-number">12</span>
              <span class="dashboard-tile-label">Renewals this month</span>
            </div>
          </div>
        </section>

        <section class="carrier-card">
          <h2>Recent activity</h2>
          <div class="dashboard-activity">
            <div class="activity-row"><span class="activity-dot"></span><span>Policy #WC-4821 renewed — Workers Comp — Premium $4,200</span><span class="muted">Today</span></div>
            <div class="activity-row"><span class="activity-dot"></span><span>Quote #GL-1193 submitted — General Liability</span><span class="muted">Today</span></div>
            <div class="activity-row"><span class="activity-dot"></span><span>Claim #AU-772 status updated — Auto Physical Damage</span><span class="muted">Yesterday</span></div>
            <div class="activity-row"><span class="activity-dot"></span><span>New endorsement request — Property — #PR-3308</span><span class="muted">Yesterday</span></div>
            <div class="activity-row"><span class="activity-dot"></span><span>Commission statement posted — June 2026</span><span class="muted">3 days ago</span></div>
          </div>
        </section>

        <section class="carrier-card muted-card">
          <p class="muted">This is a simulated ${safeText(ctx.carrierName)} portal dashboard. In production, DataBraid's RPA hands over a live browser session and the broker works directly in the carrier's real portal.</p>
          ${ctx.liveUrl ? `<p><a class="carrier-link" href="${safeText(ctx.liveUrl)}" target="_blank" rel="noopener noreferrer">Open real ${safeText(ctx.carrierName)} portal</a></p>` : ''}
        </section>
      </div>
    `;
  }
})();
