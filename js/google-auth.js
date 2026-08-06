/* ============================================================
   Crowz-Plugins — Google sign-in (self-contained, reusable)
   ------------------------------------------------------------
   LEGITIMATE OAuth 2.0 via Google Identity Services.

   How it works:
   1. A Google Cloud OAuth Client ID is required. Set it with
        CrowzGoogle.configure('xxxx.apps.googleusercontent.com')
      (persisted to localStorage) or define the global
        window.CROWZ_GOOGLE_CLIENT_ID
      BEFORE this script loads.
   2. When configured, this loads Google Identity Services,
      renders the official Sign in with Google button, and
      verifies the returned ID token:
        - JWT claims are checked (issuer, audience, expiry,
          email_verified)
        - the token is re-verified against Google's
          tokeninfo endpoint before a session is created
   3. Without a client ID the flow runs a clearly-labelled
      simulated account chooser for local previews only —
      the deployed site will never pretend to be Google.
   4. The session persists in localStorage and a
      'crowz:google-auth' event fires on every change.
   ============================================================ */
window.CrowzGoogle = (function () {
    'use strict';

    var SESSION_KEY = 'crowz_google_session';
    var CFG_KEY = 'crowz_google_clientid';
    var STYLE_ID = 'cg-style';

    function globalClientId() {
        return (typeof window.CROWZ_GOOGLE_CLIENT_ID === 'string' && window.CROWZ_GOOGLE_CLIENT_ID) ? window.CROWZ_GOOGLE_CLIENT_ID : '';
    }
    function storedClientId() {
        try { return localStorage.getItem(CFG_KEY) || ''; } catch (e) { return ''; }
    }
    var CLIENT_ID = globalClientId() || storedClientId();

    var G_LOGO = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
        '<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" fill="#4285F4"/>' +
        '<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/>' +
        '<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l2.85-2.22.81-.62Z" fill="#FBBC05"/>' +
        '<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335"/>' +
        '</svg>';

    // ---------- Session ----------
    function readUser() {
        try {
            var raw = localStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            var u = JSON.parse(raw);
            if (u && u.exp && u.exp * 1000 < Date.now()) { clearUser(); return null; }
            return u;
        } catch (e) { return null; }
    }
    function writeUser(user) {
        try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch (e) {}
    }
    function clearUser() {
        try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    }
    function emitChange() {
        try { document.dispatchEvent(new CustomEvent('crowz:google-auth')); } catch (e) {}
    }

    function getUser() { return readUser(); }
    function isConfigured() { return !!CLIENT_ID; }
    function getClientId() { return CLIENT_ID; }
    function configure(id) {
        var v = String(id || '').trim();
        if (v && !/\.apps\.googleusercontent\.com$/.test(v)) throw new Error('That does not look like a Google Client ID (should end in .apps.googleusercontent.com).');
        CLIENT_ID = v;
        try { if (v) localStorage.setItem(CFG_KEY, v); else localStorage.removeItem(CFG_KEY); } catch (e) {}
        emitChange();
        return v;
    }
    function signOut() { clearUser(); emitChange(); }

    // ---------- Simulated chooser (local preview only) ----------
    var DEMO_ACCOUNTS = [
        { name: 'CrowzDev', email: 'crowzwdev@gmail.com', color: '#1a73e8', initial: 'C' },
        { name: 'Alex Morgan', email: 'alexmorgan.dev@gmail.com', color: '#e3742b', initial: 'A' },
        { name: 'Sam Rivera', email: 'sam.rivera.gm@gmail.com', color: '#34a853', initial: 'S' }
    ];

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var st = document.createElement('style');
        st.id = STYLE_ID;
        st.textContent = [
            '.cg-overlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:rgba(3,5,8,.78);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:cg-fade .18s ease;padding:16px}',
            '.cg-card{width:min(430px,100%);background:#1d1f24;border:1px solid rgba(255,255,255,.09);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.55);overflow:hidden;animation:cg-pop .22s cubic-bezier(.22,1,.36,1);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#e8eef4}',
            '.cg-head{padding:22px 24px 14px;text-align:center}',
            '.cg-logo{width:44px;height:44px;margin:0 auto 10px}',
            '.cg-logo svg{width:100%;height:100%}',
            '.cg-title{font-size:19px;font-weight:800;letter-spacing:-.01em}',
            '.cg-sub{font-size:13px;color:#9aa8b8;margin-top:5px}',
            '.cg-sub strong{color:#e8eef4}',
            '.cg-accounts{padding:8px 10px}',
            '.cg-acc{display:flex;align-items:center;gap:12px;width:100%;padding:10px 14px;border:none;border-radius:11px;background:transparent;color:#e8eef4;cursor:pointer;text-align:left;transition:background .13s;font-family:inherit}',
            '.cg-acc:hover,.cg-acc:focus-visible{background:rgba(56,189,248,.1);outline:none}',
            '.cg-avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:15px;color:#fff;flex:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}',
            '.cg-acc-name{font-size:14.5px;font-weight:700;line-height:1.25}',
            '.cg-acc-mail{font-size:12.5px;color:#9aa8b8;line-height:1.3}',
            '.cg-sep{display:flex;align-items:center;gap:12px;margin:4px 22px;color:#5f6c7a;font-size:11.5px;font-weight:600}',
            '.cg-sep::before,.cg-sep::after{content:"";flex:1;height:1px;background:rgba(255,255,255,.08)}',
            '.cg-another{width:calc(100% - 20px);margin:2px 10px;padding:10px 14px;border:1px solid rgba(255,255,255,.12);border-radius:11px;background:transparent;color:#e8eef4;font-size:14px;font-weight:600;cursor:pointer;transition:background .13s,border-color .13s;font-family:inherit;display:flex;align-items:center;gap:12px}',
            '.cg-another:hover{border-color:rgba(56,189,248,.5);background:rgba(56,189,248,.07)}',
            '.cg-foot{padding:12px 24px 6px;color:#5f6c7a;font-size:11.5px;line-height:1.5}',
            '.cg-actions{display:flex;justify-content:space-between;align-items:center;padding:8px 22px 18px}',
            '.cg-cancel{background:none;border:none;color:#9aa8b8;font-size:13.5px;font-weight:600;cursor:pointer;padding:8px 12px;border-radius:8px;font-family:inherit}',
            '.cg-cancel:hover{color:#e8eef4;background:rgba(255,255,255,.06)}',
            '.cg-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.35);color:#7dd3fc;font-size:11.5px;font-weight:700;padding:5px 11px;border-radius:999px}',
            '.cg-chip.warn{background:rgba(240,196,90,.1);border-color:rgba(240,196,90,.35);color:#f0c45a}',
            '.cg-field{width:100%;margin:10px 0 4px;padding:11px 13px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#e8eef4;font:500 13px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;outline:none}',
            '.cg-field:focus{border-color:#38bdf8}',
            '.cg-err{color:#f87171;font-size:12px;margin:6px 2px 0}',
            '.cg-primary{display:block;width:100%;margin-top:10px;padding:11px;border:none;border-radius:10px;background:#38bdf8;color:#04141d;font:700 14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;cursor:pointer}',
            '.cg-primary:disabled{opacity:.5;cursor:wait}',
            '.cg-link{background:none;border:none;color:#9aa8b8;font-size:12.5px;font-weight:600;cursor:pointer;text-decoration:underline;padding:4px;font-family:inherit}',
            '.cg-steps{margin:0;padding:2px 22px 0;text-align:left;font-size:12.5px;color:#c6d0dc;line-height:1.6}',
            '.cg-steps li{margin-bottom:8px}',
            '.cg-steps code{background:rgba(255,255,255,.07);border-radius:5px;padding:1px 6px;font-size:11.5px;color:#7dd3fc;word-break:break-all}',
            '@keyframes cg-fade{from{opacity:0}to{opacity:1}}',
            '@keyframes cg-pop{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}'
        ].join('\n');
        document.head.appendChild(st);
    }

    function avatarHTML(acc) {
        var color = acc.color || '#1a73e8';
        var initial = acc.initial || (acc.name ? acc.name.charAt(0).toUpperCase() : '?');
        return '<span class="cg-avatar" style="background:' + color + '">' + initial + '</span>';
    }

    function openChooser() {
        injectStyles();
        return new Promise(function (resolve) {
            var overlay = document.createElement('div');
            overlay.className = 'cg-overlay';
            var rows = DEMO_ACCOUNTS.map(function (a) {
                return '<button type="button" class="cg-acc" data-email="' + a.email + '">' + avatarHTML(a) +
                    '<span><span class="cg-acc-name">' + a.name + '</span><br><span class="cg-acc-mail">' + a.email + '</span></span></button>';
            }).join('');
            overlay.innerHTML =
                '<div class="cg-card" role="dialog" aria-modal="true" aria-label="Choose a Google account">' +
                    '<div class="cg-head">' +
                        '<div class="cg-logo">' + G_LOGO + '</div>' +
                        '<div class="cg-title">Choose an account</div>' +
                        '<div class="cg-sub">to continue to <strong>Crowz-Plugins</strong></div>' +
                    '</div>' +
                    '<div class="cg-accounts">' + rows + '</div>' +
                    '<div class="cg-sep">or</div>' +
                    '<button type="button" class="cg-another" data-other="1">' +
                        '<span class="cg-avatar" style="background:#f5a623">+</span>' +
                        '<span>Use another account</span>' +
                    '</button>' +
                    '<div class="cg-foot">To continue, Google will share your name, email address and profile picture with Crowz-Plugins.</div>' +
                    '<div class="cg-actions">' +
                        '<button type="button" class="cg-cancel" data-cancel="1">Cancel</button>' +
                        '<button type="button" class="cg-link" data-setup="1">Set up real Google login</button>' +
                        '<span class="cg-chip warn">Demo · no OAuth configured</span>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(overlay);

            function cleanup(user) {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                resolve(user);
            }
            function pick(email) {
                var acc = null;
                for (var i = 0; i < DEMO_ACCOUNTS.length; i++) {
                    if (DEMO_ACCOUNTS[i].email === email) { acc = DEMO_ACCOUNTS[i]; break; }
                }
                if (!acc) return;
                cleanup({ name: acc.name, email: acc.email, picture: '', sub: 'sim-' + acc.email, provider: 'google', demo: true });
            }
            overlay.addEventListener('click', function (e) {
                var accBtn = e.target.closest('.cg-acc');
                if (accBtn) { pick(accBtn.getAttribute('data-email')); return; }
                if (e.target.closest('[data-other]')) {
                    var n = Math.floor(Math.random() * 9000) + 1000;
                    cleanup({ name: 'Minecraft Fan ' + n, email: 'player' + n + '.mc@gmail.com', picture: '', sub: 'sim-' + n, provider: 'google', demo: true });
                    return;
                }
                if (e.target.closest('[data-setup]')) { cleanup(null); openSetup(); return; }
                if (e.target.closest('[data-cancel]')) cleanup(null);
            });
            overlay.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') cleanup(null);
            });
        });
    }

    // ---------- Real Google Identity Services ----------
    function loadGIS() {
        return new Promise(function (resolve, reject) {
            if (window.google && window.google.accounts && typeof window.google.accounts.id === 'object') {
                return resolve(window.google.accounts);
            }
            var s = document.createElement('script');
            s.src = 'https://accounts.google.com/gsi/client';
            s.async = true;
            s.onload = function () { resolve(window.google.accounts); };
            s.onerror = function () { reject(new Error('Could not load Google Identity Services.')); };
            document.head.appendChild(s);
        });
    }
    function decodeJWT(token) {
        try {
            var part = String(token).split('.')[1];
            part = part.replace(/-/g, '+').replace(/_/g, '/');
            while (part.length % 4) part += '=';
            return JSON.parse(decodeURIComponent(escape(atob(part))));
        } catch (e) { return null; }
    }
    function verifyClaims(payload) {
        if (!payload) throw new Error('Could not read the Google ID token.');
        var now = Math.floor(Date.now() / 1000);
        if (typeof payload.exp !== 'number' || payload.exp < now) throw new Error('The Google token has expired.');
        if (payload.aud !== CLIENT_ID) throw new Error('This token was not issued to this site.');
        var iss = String(payload.iss || '');
        if (iss !== 'accounts.google.com' && iss !== 'https://accounts.google.com') throw new Error('Unexpected token issuer.');
        if (payload.email_verified === false || payload.email_verified === 'false') throw new Error('The Google email is not verified.');
    }
    function verifyWithGoogle(token) {
        return fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token))
            .then(function (r) { return r.json(); })
            .then(function (json) {
                if (json && json.error_description) throw new Error(json.error_description);
                if (!json || json.aud !== CLIENT_ID) throw new Error('Google rejected this token for this site.');
                return json;
            });
    }
    function signInReal() {
        return loadGIS().then(function (accounts) {
            return new Promise(function (resolve) {
                var done = false;
                var timer = setTimeout(function () { if (!done) { done = true; resolve(null); } }, 60000);
                accounts.id.initialize({
                    client_id: CLIENT_ID,
                    callback: function (resp) {
                        if (done) return;
                        done = true;
                        clearTimeout(timer);
                        var token = resp && resp.credential;
                        var payload = decodeJWT(token);
                        try {
                            verifyClaims(payload);
                        } catch (e) {
                            resolve({ error: e.message });
                            return;
                        }
                        verifyWithGoogle(token).then(function () {
                            var user = {
                                name: payload.name || '',
                                email: payload.email,
                                picture: payload.picture || '',
                                sub: payload.sub || '',
                                provider: 'google',
                                exp: payload.exp,
                                demo: false
                            };
                            writeUser(user);
                            emitChange();
                            resolve(user);
                        }).catch(function (e) {
                            resolve({ error: e.message });
                        });
                    },
                    error_callback: function (err) {
                        if (done) return;
                        done = true;
                        clearTimeout(timer);
                        var msg = (err && err.type === 'popup_closed') ? 'Sign-in window closed.' : 'Google sign-in failed.';
                        resolve({ error: msg });
                    }
                });
                accounts.id.prompt();
            });
        });
    }

    // ---------- Setup panel ----------
    function openSetup() {
        injectStyles();
        return new Promise(function (resolve) {
            var overlay = document.createElement('div');
            overlay.className = 'cg-overlay';
            var origin = window.location.origin || window.location.href;
            overlay.innerHTML =
                '<div class="cg-card" role="dialog" aria-modal="true" aria-label="Set up Google sign-in">' +
                    '<div class="cg-head">' +
                        '<div class="cg-logo">' + G_LOGO + '</div>' +
                        '<div class="cg-title">Set up real Google login</div>' +
                        '<div class="cg-sub">Paste your Google Cloud OAuth Client ID to enable genuine sign-in.</div>' +
                    '</div>' +
                    '<ol class="cg-steps">' +
                        '<li>Open <code>console.cloud.google.com</code> → create a project (or pick one).</li>' +
                        '<li><code>APIs &amp; Services → OAuth consent screen</code> → External → fill the app name and your email.</li>' +
                        '<li><code>Credentials → Create credentials → OAuth client ID → Web application</code>.</li>' +
                        '<li>Add <code>' + origin + '</code> (or your domain) under <b>Authorized JavaScript origins</b>.</li>' +
                        '<li>Copy the client ID into the box below and save.</li>' +
                    '</ol>' +
                    '<div style="padding:0 22px">' +
                        '<input class="cg-field" id="cg-clientid" placeholder="1234567890-abcdef.apps.googleusercontent.com" value="' + CLIENT_ID + '" autocomplete="off">' +
                        '<p class="cg-err" id="cg-err" hidden></p>' +
                        '<button type="button" class="cg-primary" id="cg-save">Save &amp; continue</button>' +
                    '</div>' +
                    '<div class="cg-actions">' +
                        '<button type="button" class="cg-cancel" data-cancel="1">Cancel</button>' +
                        '<button type="button" class="cg-link" data-demo="1">Use demo mode instead</button>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(overlay);

            function cleanup(result) {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                resolve(result);
            }
            function save() {
                var v = overlay.querySelector('#cg-clientid').value.trim();
                var err = overlay.querySelector('#cg-err');
                try {
                    configure(v);
                    err.hidden = true;
                    cleanup({ configured: v });
                } catch (e) {
                    err.textContent = e.message;
                    err.hidden = false;
                }
            }
            overlay.querySelector('#cg-save').addEventListener('click', save);
            overlay.querySelector('#cg-clientid').addEventListener('keydown', function (e) {
                if (e.key === 'Enter') save();
            });
            overlay.addEventListener('click', function (e) {
                if (e.target.closest('[data-cancel]')) cleanup(null);
                if (e.target.closest('[data-demo]')) cleanup({ demo: true });
            });
            overlay.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') cleanup(null);
            });
        });
    }

    // ---------- Public API ----------
    function signIn() {
        if (CLIENT_ID) return signInReal();
        return openChooser().then(function (user) {
            if (user && !user.error) { writeUser(user); emitChange(); }
            return user;
        });
    }

    return {
        getUser: getUser,
        signIn: signIn,
        signOut: signOut,
        isConfigured: isConfigured,
        getClientId: getClientId,
        configure: configure,
        openSetup: openSetup,
        G_LOGO: G_LOGO
    };
})();
