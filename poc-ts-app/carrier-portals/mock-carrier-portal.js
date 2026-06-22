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
})();
