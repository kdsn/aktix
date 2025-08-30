// --- helpers ---
const $ = (id) => document.getElementById(id);
const log = (m) => {
  const el = $('log');
  if (!el) return;
  el.textContent = (el.textContent + '\n' + m).trim();
};
const safeJson = async (res) => {
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error((data && (data.error || data.message)) || res.statusText);
  return data;
};
const jfetch = (url, opts = {}) =>
  fetch(url, { credentials: 'include', headers: { 'Content-Type':'application/json', ...(opts.headers||{}) }, ...opts })
    .then(safeJson);

// base64url <-> ArrayBuffer
const b64uToBuf = (b64u) => {
  const pad = '='.repeat((4 - (b64u.length % 4)) % 4);
  const b64 = (b64u + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new ArrayBuffer(raw.length);
  const bytes = new Uint8Array(out);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return out;
};
const bufToB64u = (buf) => {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

// --- feature check ---
const passkeysOK = !!(window.PublicKeyCredential && navigator.credentials);

// --- actions ---
async function showMe() {
  try {
    const me = await jfetch('/api/me');
    const target = $('me');
    if (target) target.textContent = me.authenticated ? `Signed in as ${me.username}` : 'Not signed in';
  } catch (e) {
    log('ME error: ' + e.message);
  }
}

async function register() {
  try {
    if (!passkeysOK) throw new Error('Passkeys not supported in this browser/context');
    const uEl = $('username'); const dEl = $('displayName');
    const username = (uEl?.value || '').trim().toLowerCase();
    const displayName = (dEl?.value || username || '').trim();
    if (!username) return log('Enter username');

    const begin = await jfetch('/api/webauthn/register/begin', {
      method: 'POST',
      body: JSON.stringify({ username, displayName })
    });

    // convert fields to ArrayBuffer
    begin.challenge = b64uToBuf(begin.challenge);
    if (begin.user?.id) begin.user.id = b64uToBuf(begin.user.id);
    if (Array.isArray(begin.excludeCredentials)) {
      begin.excludeCredentials = begin.excludeCredentials.map(c => ({ ...c, id: b64uToBuf(c.id) }));
    }

    const cred = await navigator.credentials.create({ publicKey: begin });
    if (!cred) throw new Error('Credential creation was cancelled');

    const attestation = {
      id: cred.id,
      rawId: bufToB64u(cred.rawId),
      type: cred.type,
      response: {
        clientDataJSON: bufToB64u(cred.response.clientDataJSON),
        attestationObject: bufToB64u(cred.response.attestationObject),
      },
      transports: (cred.response.getTransports && cred.response.getTransports()) || [],
    };

    const res = await jfetch('/api/webauthn/register/complete', {
      method: 'POST',
      body: JSON.stringify(attestation)
    });
    log('Register: ' + JSON.stringify(res));
  } catch (e) {
    log('Register error: ' + e.message);
  }
}

async function login() {
  try {
    if (!passkeysOK) throw new Error('Passkeys not supported in this browser/context');
    const uEl = $('username');
    const username = (uEl?.value || '').trim().toLowerCase();
    if (!username) return log('Enter username');

    const begin = await jfetch('/api/webauthn/authenticate/begin', {
      method: 'POST',
      body: JSON.stringify({ username })
    });

    begin.challenge = b64uToBuf(begin.challenge);
    if (Array.isArray(begin.allowCredentials)) {
      begin.allowCredentials = begin.allowCredentials.map(c => ({ ...c, id: b64uToBuf(c.id) }));
    }

    const assertion = await navigator.credentials.get({ publicKey: begin });
    if (!assertion) throw new Error('Authentication was cancelled');

    const payload = {
      id: assertion.id,
      rawId: bufToB64u(assertion.rawId),
      type: assertion.type,
      response: {
        clientDataJSON: bufToB64u(assertion.response.clientDataJSON),
        authenticatorData: bufToB64u(assertion.response.authenticatorData),
        signature: bufToB64u(assertion.response.signature),
        userHandle: assertion.response.userHandle ? bufToB64u(assertion.response.userHandle) : null,
      }
    };

    const res = await jfetch('/api/webauthn/authenticate/complete', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    log('Login: ' + JSON.stringify(res));
    await showMe();
  } catch (e) {
    log('Login error: ' + e.message);
  }
}

// --- wire up after DOM is ready ---
document.addEventListener('DOMContentLoaded', () => {
  // Buttons might not exist on every page; guard listeners
  const regBtn = $('btn-register');
  if (regBtn) regBtn.addEventListener('click', register);

  const loginBtn = $('btn-login');
  if (loginBtn) loginBtn.addEventListener('click', login);

  showMe();

  // Service Worker (keep name consistent with your file)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch((e) => log('SW error: ' + e.message));
  }

  // quick feature hint
  if (!passkeysOK) log('Passkeys not available (need secure context + supported browser)');
});
