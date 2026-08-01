/* Crowz-Plugins — site logic */
(() => {
    const grid = document.getElementById('plugins-grid');
    const searchInput = document.getElementById('search');
    const emptyState = document.getElementById('empty-state');
    const modal = document.getElementById('plugin-modal');
    const modalBody = document.getElementById('modal-body');
    const modalClose = document.getElementById('modal-close');
    let activeCat = 'all';

    // ---------- Data (shared store) ----------
    const store = window.CrowzStore;
    const CATALOG = store ? store.getCatalog() : PLUGINS;
    const dlCount = (p) => store.downloadCount(p);
    const registerDownload = (p) => store.recordDownload(p.id);
    function fmt(n) { return n.toLocaleString('en-US'); }
    function fmtNum(n) { if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'; if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'; return String(n); }
    function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    const CATEGORY_LABELS = { pvp: 'PvP', voice: 'Voice', security: 'Security', economy: 'Economy', utility: 'Utility', core: 'Core' };
    const CATEGORY_ICONS = { pvp: '⚔️', voice: '🎙️', security: '🔐', economy: '💰', utility: '🔧', core: '⚙️' };

    // ---------- Card rendering (Modrinth style) ----------
    function createCard(p, index) {
        const card = document.createElement('article');
        card.className = 'plugin-card';
        card.dataset.id = p.id;
        card.style.animationDelay = (index % 18) * .05 + 's';
        const dl = dlCount(p);
        card.innerHTML = `
            <a class="card-link" data-open="${p.id}" href="javascript:void(0)">
                <div class="card-icon tile tile-${p.category} tile-lg">${p.monogram}</div>
                <div class="card-body">
                    <div class="card-top">
                        <div class="card-title">
                            <h3>${p.name}</h3>
                            <span class="card-author">by <strong>Crowz</strong></span>
                        </div>
                        <div class="card-stats">
                            <span class="card-dl"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> ${fmtNum(dl)}</span>
                            <span class="card-time"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${p.updated}</span>
                        </div>
                    </div>
                    <p class="card-blurb">${p.blurb}</p>
                    <div class="card-tags">
                        <span class="chip chip-cat cat-${p.category}">${CATEGORY_ICONS[p.category] || ''} ${CATEGORY_LABELS[p.category] || p.category}</span>
                        <span class="chip">${p.paper}</span>
                        ${p.recent ? '<span class="chip chip-fresh">New</span>' : ''}
                        ${p.sha256 ? '<span class="chip chip-ok">✓ Verified</span>' : ''}
                    </div>
                </div>
            </a>
            <div class="card-actions">
                <button class="btn btn-primary btn-sm" data-download="${p.id}">Download</button>
                <button class="btn btn-ghost btn-sm" data-open="${p.id}">Details</button>
            </div>`;
        return card;
    }

    function render(list) {
        grid.innerHTML = '';
        emptyState.hidden = list.length > 0;
        list.forEach((p, i) => {
            const card = createCard(p, i);
            grid.appendChild(card);
            observer.observe(card);
        });
    }

    function filterPlugins() {
        const q = searchInput.value.trim().toLowerCase();
        const cat = activeCat;
        const sort = document.getElementById('sort-filter') ? document.getElementById('sort-filter').value : 'name';
        let list = CATALOG.filter(p => {
            const matchCat = cat === 'all' || p.category === cat;
            const matchQ = !q ||
                p.name.toLowerCase().includes(q) ||
                p.blurb.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                p.tag.toLowerCase().includes(q);
            return matchCat && matchQ;
        });
        if (sort === 'downloads') list.sort((a, b) => dlCount(b) - dlCount(a));
        else if (sort === 'updated') list.sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
        else list.sort((a, b) => a.name.localeCompare(b.name));
        render(list);
        const countEl = document.getElementById('plugin-count');
        if (countEl) countEl.textContent = list.length + ' plugin' + (list.length !== 1 ? 's' : '');
    }

    // ---------- Modal ----------
    function openModal(id) {
        const p = CATALOG.find(x => x.id === id);
        if (!p) return;
        const dl = dlCount(p);
        const reloadCmd = p.commands.find(c => /reload/i.test(c)) || '/<plugin> reload';
        modalBody.innerHTML = `
            <div class="detail-header">
                <div class="detail-icon tile tile-${p.category} tile-lg">${p.monogram}</div>
                <div class="detail-info">
                    <h1 class="detail-name" id="modal-title">${p.name}</h1>
                    <p class="detail-author">by <strong>Crowz</strong></p>
                    <p class="detail-blurb">${p.blurb}</p>
                    <div class="detail-stats">
                        <span class="detail-stat"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> ${fmt(dl)} downloads</span>
                        <span class="detail-stat"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Updated ${p.updated}</span>
                    </div>
                    <div class="detail-tags">
                        <span class="chip chip-cat">${p.category}</span>
                        ${p.tag ? `<span class="chip">${p.tag}</span>` : ''}
                        ${p.recent ? '<span class="chip chip-fresh">New</span>' : ''}
                        <span class="chip">${p.paper}</span>
                    </div>
                </div>
                <div class="detail-actions">
                    <button class="btn btn-primary btn-lg" data-download="${p.id}">↓ Download</button>
                    <span class="dl-size">${p.size}</span>
                </div>
            </div>

            <div class="detail-tabs">
                <button class="tab active" data-tab="description">Description</button>
                <button class="tab" data-tab="versions">Versions</button>
            </div>

            <div class="detail-body">
                <div class="detail-content">
                    <div class="tab-panel active" data-panel="description">
                        <div class="detail-section">
                            <h3>${p.name}</h3>
                            <p>${p.description}</p>
                        </div>
                        <div class="detail-section">
                            <h3>What's inside</h3>
                            <ul class="detail-features">${p.features.map(f => `<li>${f}</li>`).join('')}</ul>
                        </div>
                        <div class="detail-section">
                            <h3>Commands</h3>
                            <ul class="detail-commands">${p.commands.map(c => `<li>${c}</li>`).join('')}</ul>
                        </div>
                        <div class="detail-section">
                            <h3>Install</h3>
                            <ol class="detail-install">
                                <li>Download the jar with the button above.</li>
                                <li>Stop your server and drop the jar into <code>plugins/</code>.</li>
                                <li>Start the server once to generate the config files.</li>
                                <li>Edit the configs, run <code>${reloadCmd}</code> and you're live.</li>
                            </ol>
                        </div>
                        ${p.sha256 ? `
                        <div class="detail-section">
                            <h3>File checksum</h3>
                            <div class="detail-checksum"><code>${p.sha256}</code></div>
                            <p class="detail-checksum-note">SHA-256 of the exact jar on this page. Verify your download to confirm authenticity.</p>
                        </div>` : ''}
                    </div>
                    <div class="tab-panel" data-panel="versions">
                        <div class="detail-section">
                            <h3>${p.name} v${p.version}</h3>
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid var(--border-soft)">
                                <div>
                                    <p style="color:var(--ink);font-weight:700;margin-bottom:2px">Version ${p.version}</p>
                                    <p style="color:var(--ink-faint);font-size:13.5px">${p.paper} · ${p.size} · ${p.updated}</p>
                                </div>
                                <button class="btn btn-primary btn-sm" data-download="${p.id}">↓ Download</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="detail-sidebar">
                    <div class="sidebar-card">
                        <h4>Compatibility</h4>
                        <div class="sidebar-row"><span class="sidebar-label">Platform</span><span class="sidebar-value">${p.paper}</span></div>
                        <div class="sidebar-row"><span class="sidebar-label">Version</span><span class="sidebar-value">${p.version}</span></div>
                        <div class="sidebar-row"><span class="sidebar-label">File size</span><span class="sidebar-value">${p.size}</span></div>
                    </div>
                    <div class="sidebar-card">
                        <h4>Requirements</h4>
                        <ul class="sidebar-list">${p.requirements.map(r => `<li>${r}</li>`).join('')}</ul>
                    </div>
                    <div class="sidebar-card">
                        <h4>Links</h4>
                        <ul class="sidebar-links">
                            <li><a href="https://discord.gg/NG2hyARph" target="_blank" rel="noopener">Join Discord</a></li>
                            <li><a href="mailto:Crowzwdev@gmail.com">Contact support</a></li>
                        </ul>
                    </div>
                </div>
            </div>`;
        modal.hidden = false;
        modalBody.dataset.id = p.id;
        document.body.classList.add('modal-open');
        modalClose.focus();
    }
    function closeModal() {
        modal.hidden = true;
        document.body.classList.remove('modal-open');
    }

    // ---------- Account ----------
    const accountArea = document.getElementById('account-area');
    const authModal = document.getElementById('auth-modal');
    const authGuest = document.getElementById('auth-guest');
    const authSession = document.getElementById('auth-session');
    const authClose = document.getElementById('auth-close');
    let account = store.currentAccount();

    function renderAccountArea() {
        if (!accountArea) return;
        accountArea.innerHTML = '';
        if (account) {
            const b = document.createElement('button');
            b.className = 'btn btn-ghost btn-sm';
            b.id = 'account-btn';
            b.textContent = account.username;
            b.addEventListener('click', openAuthModal);
            accountArea.appendChild(b);
        } else {
            const b = document.createElement('button');
            b.className = 'btn btn-ghost btn-sm';
            b.id = 'account-btn';
            b.textContent = 'Log in';
            b.addEventListener('click', openAuthModal);
            accountArea.appendChild(b);
        }
    }
    function openAuthModal() {
        authModal.hidden = false;
        document.body.classList.add('modal-open');
        if (account) showSessionView();
        else {
            showGuestView();
            document.getElementById('login-email').focus();
        }
    }
    function closeAuthModal() {
        authModal.hidden = true;
        if (modal.hidden) document.body.classList.remove('modal-open');
    }
    function showGuestView() {
        authGuest.hidden = false;
        authSession.hidden = true;
        switchAuthTab('login');
        document.getElementById('login-error').hidden = true;
        document.getElementById('reg-error').hidden = true;
    }
    function showSessionView() {
        authGuest.hidden = true;
        authSession.hidden = false;
        document.getElementById('session-identity').textContent = account.username + ' · ' + account.email;
    }
    function switchAuthTab(which) {
        document.getElementById('tab-login').classList.toggle('active', which === 'login');
        document.getElementById('tab-register').classList.toggle('active', which === 'register');
        document.getElementById('login-form').hidden = which !== 'login';
        document.getElementById('register-form').hidden = which !== 'register';
    }

    // ---------- Downloads ----------
    let pendingDownload = null;
    let pendingLicenseDownload = null;
    function download(p) {
        if (!account) {
            pendingDownload = p;
            openAuthModal();
            toast('Create a free account to download plugins.');
            return;
        }
        if (p.requiresLicense && !store.ownsLicense(account, p.id)) {
            pendingLicenseDownload = p;
            openLicenseGate(p);
            return;
        }
        doDownload(p);
    }
    function doDownload(p) {
        const a = document.createElement('a');
        if (p.dataUrl) {
            a.href = p.dataUrl;
        } else {
            a.href = 'downloads/' + encodeURIComponent(p.file);
        }
        a.download = p.file;
        document.body.appendChild(a);
        a.click();
        a.remove();
        registerDownload(p);
        refreshCounts();
        toast(`Downloading ${p.name} v${p.version} — check your downloads folder.`);
    }

    function refreshCounts() {
        document.querySelectorAll('.chip-dl').forEach(el => {
            const id = el.closest('.plugin-card')?.dataset.id;
            if (!id) return;
            const p = CATALOG.find(x => x.id === id);
            if (p) el.textContent = fmt(dlCount(p)) + ' downloads';
        });
        const note = modalBody.querySelector('.dl-note');
        const p = CATALOG.find(x => x.id === modalBody.dataset.id);
        if (note && p) note.textContent = fmt(dlCount(p)) + ' downloads so far';
        const featured = document.getElementById('featured-downloads');
        const fp = CATALOG.find(x => x.id === 'pvpcorex');
        if (featured && fp) featured.textContent = fmt(dlCount(fp));
    }

    // ---------- Toast ----------
    let toastEl = null;
    function toast(msg) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.className = 'toast';
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        clearTimeout(toastEl._t);
        toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2600);
    }

    // ---------- Event delegation ----------
    document.addEventListener('click', (e) => {
        const dl = e.target.closest('[data-download]');
        if (dl) {
            e.preventDefault();
            const p = CATALOG.find(x => x.id === dl.dataset.download);
            if (p) download(p);
            return;
        }
        const tab = e.target.closest('.tab[data-tab]');
        if (tab && !modal.hidden) {
            const target = tab.dataset.tab;
            modalBody.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === target));
            modalBody.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === target));
            return;
        }
        const open = e.target.closest('[data-open]');
        if (open) {
            openModal(open.dataset.open);
            return;
        }
        if (e.target.closest('.modal-backdrop')) {
            if (!authModal.hidden) { closeAuthModal(); return; }
            closeModal();
            return;
        }
        if (e.target === modalClose) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!authModal.hidden) closeAuthModal();
        else if (!modal.hidden) closeModal();
    });

    // ---------- Auth handlers ----------
    document.getElementById('tab-login').addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('tab-register').addEventListener('click', () => switchAuthTab('register'));
    authClose.addEventListener('click', closeAuthModal);
    document.getElementById('auth-logout').addEventListener('click', () => {
        store.logout();
        account = null;
        closeAuthModal();
        renderAccountArea();
        toast('Logged out.');
    });
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const err = document.getElementById('login-error');
        const res = store.loginAccount(document.getElementById('login-email').value, document.getElementById('login-pass').value);
        if (res.error) {
            err.textContent = res.error;
            err.hidden = false;
            return;
        }
        account = store.currentAccount();
        e.target.reset();
        err.hidden = true;
        closeAuthModal();
        renderAccountArea();
        toast('Welcome back, ' + account.username + '!');
        updateLicenseBadge();
        if (pendingDownload) {
            const pd = pendingDownload;
            pendingDownload = null;
            if (pd.requiresLicense && !store.ownsLicense(account, pd.id)) {
                pendingLicenseDownload = pd;
                openLicenseGate(pd);
            } else {
                doDownload(pd);
            }
        }
    });
    document.getElementById('register-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const err = document.getElementById('reg-error');
        const pw = document.getElementById('reg-pass').value;
        if (pw.length < 6) {
            err.textContent = 'Password must be at least 6 characters.';
            err.hidden = false;
            return;
        }
        if (pw !== document.getElementById('reg-pass2').value) {
            err.textContent = 'Passwords do not match.';
            err.hidden = false;
            return;
        }
        try {
            store.registerAccount(document.getElementById('reg-username').value, document.getElementById('reg-email').value, pw);
        } catch (ex) {
            err.textContent = ex.message;
            err.hidden = false;
            return;
        }
        const res = store.loginAccount(document.getElementById('reg-email').value, pw);
        if (res.error) {
            err.textContent = res.error;
            err.hidden = false;
            return;
        }
        account = store.currentAccount();
        e.target.reset();
        err.hidden = true;
        closeAuthModal();
        renderAccountArea();
        toast('Account created — welcome, ' + account.username + '!');
        updateLicenseBadge();
        if (pendingDownload) {
            const pd = pendingDownload;
            pendingDownload = null;
            if (pd.requiresLicense && !store.ownsLicense(account, pd.id)) {
                pendingLicenseDownload = pd;
                openLicenseGate(pd);
            } else {
                doDownload(pd);
            }
        }
    });

    // ---------- FAQ accordion ----------
    document.querySelectorAll('.faq-item').forEach(item => {
        const btn = item.querySelector('.faq-q');
        btn.addEventListener('click', () => {
            const isOpen = item.classList.contains('open');
            document.querySelectorAll('.faq-item.open').forEach(x => x.classList.remove('open'));
            if (!isOpen) item.classList.add('open');
            btn.setAttribute('aria-expanded', String(!isOpen));
        });
    });

    // ---------- Footer category shortcuts ----------
    document.querySelectorAll('[data-cat]').forEach(link => {
        link.addEventListener('click', () => {
            filterSelect.value = link.dataset.cat;
            filterPlugins();
        });
    });

    // ---------- Header & nav ----------
    const header = document.getElementById('site-header');
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.getElementById('nav-links');
    window.addEventListener('scroll', () => {
        header.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
    navToggle.addEventListener('click', () => {
        const open = navLinks.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', String(open));
    });

    // ---------- Reveal on scroll ----------
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(en => {
            if (en.isIntersecting) {
                en.target.classList.add('in');
                observer.unobserve(en.target);
            }
        });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // ---------- Stats ----------
    function animateNumber(el, target) {
        const start = parseInt(el.textContent.replace(/,/g, '') || '0', 10);
        const t0 = performance.now();
        const dur = 900;
        function step(t) {
            const p = Math.min(1, (t - t0) / dur);
            el.textContent = fmt(Math.round(start + (target - start) * (1 - Math.pow(1 - p, 3))));
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // ---------- Site settings ----------
    function applySettings() {
        const s = store.getSettings();
        document.title = s.siteName + ' · Free Minecraft Plugins';
        const brand = document.getElementById('brand-name');
        if (brand) brand.textContent = s.siteName;
        const sub = document.getElementById('hero-sub');
        if (sub) sub.textContent = s.tagline;
        const sm = document.getElementById('support-mail');
        if (sm) { sm.href = 'mailto:' + s.contactEmail; sm.textContent = s.contactEmail; }
        const fm = document.getElementById('footer-mail');
        if (fm) { fm.href = 'mailto:' + s.contactEmail; fm.textContent = s.contactEmail; }
    }

    // ---------- Init ----------
    function init() {
        applySettings();
        if (!CATALOG.length && Array.isArray(PLUGINS) && PLUGINS.length) {
            PLUGINS.forEach(p => CATALOG.push(p));
        }
        renderAccountArea();
        render(CATALOG);
        animateNumber(document.getElementById('stat-plugins'), CATALOG.length);
        const totalMb = CATALOG.reduce((acc, p) => acc + parseFloat(p.size), 0);
        animateNumber(document.getElementById('stat-size'), Math.round(totalMb));
        modalBody.dataset.id = '';
        requestAnimationFrame(() => {
            document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
        });
        if (!CATALOG.length) {
            emptyState.innerHTML = '<p>Couldn\'t load the plugin list.</p><p class="empty-hint">Refresh the page — if it keeps happening, email me at Crowzwdev@gmail.com.</p>';
            emptyState.hidden = false;
        }
        startRain();
        startMesh();
        startParticles();
        startMouseGlow();
        startCardTilt();
        startScrollProgress();
        startPresence();
        updateLicenseBadge();
    }

    // ---------- Presence (cross-tab) ----------
    function startPresence() {
        const TAB_ID = Math.random().toString(36).slice(2, 10);
        const ME = 'Visitor-' + TAB_ID.slice(0, 4);
        const KEY = 'crowz_hub_presence';
        let ch = null;
        try { ch = new BroadcastChannel('crowz-hub'); } catch {}

        function readP() {
            try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) : {}; } catch { return {}; }
        }
        function writeP(data) {
            try { const p = readP(); p[TAB_ID] = data; localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
        }
        function cleanP() {
            try {
                const p = readP(); const now = Date.now(); let ch = false;
                for (const [k, v] of Object.entries(p)) { if (now - v.ts > 12000) { delete p[k]; ch = true; } }
                if (ch) localStorage.setItem(KEY, JSON.stringify(p));
            } catch {}
        }
        function countOnline() {
            const p = readP(); const now = Date.now();
            const active = Object.values(p).filter(v => now - v.ts < 12000);
            const seen = new Set();
            return active.filter(v => { if (seen.has(v.username)) return false; seen.add(v.username); return true; }).length;
        }
        function renderCount() {
            cleanP();
            const n = countOnline();
            const el = document.getElementById('online-count');
            if (el) el.textContent = n;
        }
        function heartbeat() {
            writeP({ username: ME, ts: Date.now() });
            renderCount();
            if (ch) try { ch.postMessage({ type: 'heartbeat', username: ME, tab: TAB_ID, ts: Date.now() }); } catch {}
        }
        heartbeat();
        if (typeof setInterval === 'function') setInterval(heartbeat, 3000);
        if (ch) {
            ch.onmessage = (e) => {
                if (e.data && e.data.type === 'heartbeat' && e.data.tab !== TAB_ID) {
                    writeP({ username: e.data.username, ts: e.data.ts });
                    renderCount();
                }
            };
        }
    }

    // ---------- Rain ----------
    let rainRunning = false;
    function startRain() {
        const canvas = document.getElementById('rain-canvas');
        if (!canvas || typeof canvas.getContext !== 'function') return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        rainRunning = true;
        let W = 0, H = 0;
        const COUNT = 300;
        const drops = new Array(COUNT);
        function resize() {
            W = canvas.width = window.innerWidth;
            H = canvas.height = window.innerHeight;
        }
        function spawn(i) {
            const bright = Math.random() < 0.15;
            drops[i] = {
                x: Math.random() * W,
                y: Math.random() * -H * 1.2,
                len: bright ? 28 + Math.random() * 35 : 12 + Math.random() * 22,
                speed: bright ? 8 + Math.random() * 7 : 4 + Math.random() * 6,
                alpha: bright ? 0.25 + Math.random() * 0.3 : 0.06 + Math.random() * 0.14,
                bright
            };
        }
        function step() {
            if (!rainRunning) return;
            ctx.clearRect(0, 0, W, H);
            ctx.lineWidth = 1;
            for (let i = 0; i < COUNT; i++) {
                const d = drops[i];
                ctx.strokeStyle = d.bright ? 'rgba(56, 189, 248, 1)' : 'rgba(160, 210, 255, 1)';
                ctx.globalAlpha = d.alpha;
                ctx.beginPath();
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x + 0.5, d.y + d.len);
                ctx.stroke();
                d.y += d.speed;
                if (d.y > H) spawn(i);
            }
            ctx.globalAlpha = 1;
            window.requestAnimationFrame(step);
        }
        resize();
        for (let i = 0; i < COUNT; i++) spawn(i);
        window.addEventListener('resize', resize);
        step();
    }

    searchInput.addEventListener('input', filterPlugins);
    const sortFilter = document.getElementById('sort-filter');
    if (sortFilter) sortFilter.addEventListener('change', filterPlugins);

    // Category sidebar
    const catList = document.getElementById('cat-list');
    if (catList) {
        catList.addEventListener('click', (e) => {
            const btn = e.target.closest('.cat-btn');
            if (!btn) return;
            catList.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeCat = btn.dataset.cat;
            filterPlugins();
        });
    }
    // Category toggle for mobile
    const catToggle = document.getElementById('cat-toggle');
    if (catToggle) {
        catToggle.addEventListener('click', () => {
            const sidebar = document.getElementById('cat-sidebar');
            if (sidebar) sidebar.classList.toggle('collapsed');
        });
    }

    // ---------- Community Chat ----------
    const communityFab = document.getElementById('community-fab');
    const communityPanel = document.getElementById('community-panel');
    const communityClose = document.getElementById('community-close');
    const communityChat = document.getElementById('community-chat');
    const communityForm = document.getElementById('community-form');
    const communityInput = document.getElementById('community-input');
    const communityTyping = document.getElementById('community-typing');
    const communityTypingWho = document.getElementById('community-typing-who');
    const communityBadge = document.getElementById('community-badge');
    const communityOnlineEl = document.getElementById('community-online');
    const COMMUNITY_MSGS_KEY = 'crowz_community_msgs';
    const COMMUNITY_PRESENCE_KEY = 'crowz_community_presence';
    const MY_TAB = Math.random().toString(36).slice(2, 10);
    const MY_NAME = account ? account.username : 'Anon-' + MY_TAB.slice(0, 4);
    let communityOpen = false;
    let commChannel = null;
    try { commChannel = new BroadcastChannel('crowz-community'); } catch {}

    function readJson(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } }
    function writeJson(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
    function escChat(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    function commTimeAgo(ts) { const s = Math.floor((Date.now() - ts) / 1000); if (s < 60) return 'now'; if (s < 3600) return Math.floor(s/60)+'m'; if (s < 86400) return Math.floor(s/3600)+'h'; return Math.floor(s/86400)+'d'; }

    function getCommMsgs() { const m = readJson(COMMUNITY_MSGS_KEY, []); return Array.isArray(m) ? m.slice(-200) : []; }
    function saveCommMsgs(m) { writeJson(COMMUNITY_MSGS_KEY, m.slice(-200)); }
    function addCommMsg(author, text, ts, mine) {
        const msgs = getCommMsgs();
        const last = msgs[msgs.length - 1];
        if (last && last.author === author && last.text === text && Math.abs(last.ts - ts) < 1000) return;
        msgs.push({ author, text, ts, mine });
        saveCommMsgs(msgs);
        renderCommMsg(msgs[msgs.length - 1]);
        communityChat.scrollTop = communityChat.scrollHeight;
    }
    function renderCommMsg(m) {
        const div = document.createElement('div');
        div.className = 'msg ' + (m.mine ? 'user' : 'bot');
        div.innerHTML = (m.mine ? '' : `<span class="msg-author-label">${escChat(m.author)}</span>`) + escChat(m.text);
        communityChat.appendChild(div);
    }
    function renderAllCommMsgs() {
        communityChat.innerHTML = '<div class="chat-system">Welcome to community chat! Talk to other server owners, share tips, and hang out.</div>';
        getCommMsgs().forEach(m => renderCommMsg(m));
        communityChat.scrollTop = communityChat.scrollHeight;
    }

    function sendCommHeartbeat() {
        const p = readJson(COMMUNITY_PRESENCE_KEY, {});
        p[MY_TAB] = { username: MY_NAME, ts: Date.now() };
        const now = Date.now();
        for (const [k, v] of Object.entries(p)) { if (now - v.ts > 12000) delete p[k]; }
        writeJson(COMMUNITY_PRESENCE_KEY, p);
        const active = Object.values(p);
        const seen = new Set();
        const unique = active.filter(v => { if (seen.has(v.username)) return false; seen.add(v.username); return true; });
        communityOnlineEl.textContent = unique.length;
        communityBadge.textContent = unique.length;
        if (commChannel) try { commChannel.postMessage({ type: 'heartbeat', username: MY_NAME, tab: MY_TAB, ts: Date.now() }); } catch {}
    }

    let commTypingTimeout = null;
    if (commChannel) {
        commChannel.onmessage = (e) => {
            const d = e.data;
            if (!d || d.tab === MY_TAB) return;
            if (d.type === 'message') {
                addCommMsg(d.author, d.text, d.ts, false);
            }
            if (d.type === 'typing') {
                communityTypingWho.textContent = d.username;
                communityTyping.hidden = false;
                clearTimeout(commTypingTimeout);
                commTypingTimeout = setTimeout(() => { communityTyping.hidden = true; }, 3000);
            }
            if (d.type === 'heartbeat') {
                const p = readJson(COMMUNITY_PRESENCE_KEY, {});
                p[d.tab] = { username: d.username, ts: d.ts };
                writeJson(COMMUNITY_PRESENCE_KEY, p);
                sendCommHeartbeat();
            }
        };
    }

    function openCommunity() {
        communityPanel.classList.add('open');
        communityOpen = true;
        renderAllCommMsgs();
        sendCommHeartbeat();
        setTimeout(() => communityInput.focus(), 150);
    }
    function closeCommunity() {
        communityPanel.classList.remove('open');
        communityOpen = false;
    }

    if (communityFab) communityFab.addEventListener('click', () => communityOpen ? closeCommunity() : openCommunity());
    if (communityClose) communityClose.addEventListener('click', closeCommunity);
    if (communityForm) {
        communityForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = communityInput.value.trim();
            if (!text) return;
            communityInput.value = '';
            addCommMsg(MY_NAME, text, Date.now(), true);
            if (commChannel) try { commChannel.postMessage({ type: 'message', author: MY_NAME, text, ts: Date.now(), tab: MY_TAB }); } catch {}
        });
    }
    if (communityInput) {
        communityInput.addEventListener('input', () => {
            if (commChannel) try { commChannel.postMessage({ type: 'typing', username: MY_NAME, tab: MY_TAB }); } catch {}
        });
    }
    if (typeof setInterval === 'function') setInterval(sendCommHeartbeat, 3000);

    // ---------- Scroll progress ----------
    function startScrollProgress() {
        const bar = document.getElementById('scroll-progress');
        if (!bar || !document.documentElement) return;
        function update() {
            const h = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.width = h > 0 ? (window.scrollY / h * 100) + '%' : '0%';
        }
        window.addEventListener('scroll', update, { passive: true });
        update();
    }

    // ---------- Mesh gradient background ----------
    function startMesh() {
        const canvas = document.getElementById('mesh-canvas');
        if (!canvas || typeof canvas.getContext !== 'function') return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let W = 0, H = 0;
        const blobs = [
            { x: 0, y: 0, r: 350, color: 'rgba(56, 189, 248, .12)', vx: 0.15, vy: 0.1, phase: 0 },
            { x: 0, y: 0, r: 300, color: 'rgba(167, 139, 250, .10)', vx: -0.12, vy: 0.08, phase: 2 },
            { x: 0, y: 0, r: 280, color: 'rgba(14, 165, 233, .08)', vx: 0.08, vy: -0.1, phase: 4 },
            { x: 0, y: 0, r: 250, color: 'rgba(52, 211, 153, .06)', vx: -0.1, vy: -0.07, phase: 6 }
        ];
        function resize() {
            W = canvas.width = window.innerWidth;
            H = canvas.height = window.innerHeight;
            blobs.forEach((b, i) => { b.x = W * (0.2 + i * 0.2); b.y = H * (0.3 + (i % 2) * 0.4); });
        }
        function step(t) {
            ctx.clearRect(0, 0, W, H);
            blobs.forEach(b => {
                b.x += Math.sin(t * 0.0003 + b.phase) * b.vx;
                b.y += Math.cos(t * 0.0004 + b.phase) * b.vy;
                if (b.x < -b.r) b.x = W + b.r;
                if (b.x > W + b.r) b.x = -b.r;
                if (b.y < -b.r) b.y = H + b.r;
                if (b.y > H + b.r) b.y = -b.r;
                const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
                grad.addColorStop(0, b.color);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
            });
            requestAnimationFrame(step);
        }
        resize();
        window.addEventListener('resize', resize);
        requestAnimationFrame(step);
    }

    // ---------- Particle constellation ----------
    function startParticles() {
        const canvas = document.getElementById('particle-canvas');
        if (!canvas || typeof canvas.getContext !== 'function') return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let W = 0, H = 0;
        const COUNT = 80;
        const MAX_DIST = 120;
        const particles = [];
        function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
        function spawn() {
            return { x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.3, vy: -0.15 - Math.random() * 0.2, alpha: 0.1 + Math.random() * 0.2, size: 1 + Math.random() * 1.5 };
        }
        function step() {
            ctx.clearRect(0, 0, W, H);
            for (let i = 0; i < COUNT; i++) {
                const p = particles[i];
                p.x += p.vx; p.y += p.vy;
                if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
                if (p.x < -10) p.x = W + 10;
                if (p.x > W + 10) p.x = -10;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(56, 189, 248, ' + p.alpha + ')';
                ctx.fill();
                for (let j = i + 1; j < COUNT; j++) {
                    const q = particles[j];
                    const dx = p.x - q.x, dy = p.y - q.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < MAX_DIST) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(q.x, q.y);
                        ctx.strokeStyle = 'rgba(56, 189, 248, ' + (0.06 * (1 - dist / MAX_DIST)) + ')';
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(step);
        }
        resize();
        for (let i = 0; i < COUNT; i++) particles.push(spawn());
        window.addEventListener('resize', resize);
        step();
    }

    // ---------- Mouse glow ----------
    function startMouseGlow() {
        const glow = document.getElementById('mouse-glow');
        if (!glow) return;
        if ('ontouchstart' in window) return;
        let mx = -300, my = -300;
        document.addEventListener('mousemove', (e) => {
            mx = e.clientX; my = e.clientY;
            glow.style.left = mx + 'px';
            glow.style.top = my + 'px';
            glow.classList.add('active');
        });
        document.addEventListener('mouseleave', () => { glow.classList.remove('active'); });
    }

    // ---------- 3D card tilt ----------
    function startCardTilt() {
        const grid = document.getElementById('plugins-grid');
        if (!grid) return;
        grid.addEventListener('mousemove', (e) => {
            const card = e.target.closest('.plugin-card');
            if (!card) return;
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.transform = 'perspective(800px) rotateY(' + (x * 6) + 'deg) rotateX(' + (-y * 6) + 'deg) scale(1.01)';
        });
        grid.addEventListener('mouseleave', (e) => {
            const card = e.target.closest('.plugin-card');
            if (card) card.style.transform = '';
        }, true);
        grid.addEventListener('mouseout', (e) => {
            if (e.target.classList && e.target.classList.contains('plugin-card')) {
                e.target.style.transform = '';
            }
        });
    }

    // ---------- License Center ----------
    const licenseFab = document.getElementById('license-fab');
    const licensePanel = document.getElementById('license-panel');
    const licenseClose = document.getElementById('license-close');
    const licenseListWrap = document.getElementById('license-list-wrap');
    const licensePickerGrid = document.getElementById('license-picker-grid');
    const licenseKeyReveal = document.getElementById('license-key-reveal');
    const keyRevealCode = document.getElementById('key-reveal-code');
    const keyRevealPlugin = document.getElementById('key-reveal-plugin');
    const licenseGateModal = document.getElementById('license-gate-modal');
    const licenseGatePluginName = document.getElementById('license-gate-plugin-name');
    const licenseGateGenerate = document.getElementById('license-gate-generate');
    const licenseFabBadge = document.getElementById('license-fab-badge');
    let licenseOpen = false;
    let gatePlugin = null;

    function openLicensePanel() {
        if (!licensePanel) return;
        licenseOpen = true;
        licensePanel.classList.add('open');
        licenseKeyReveal.hidden = true;
        renderLicenseList();
        renderLicensePicker();
        updateLicenseBadge();
    }
    function closeLicensePanel() {
        licenseOpen = false;
        if (licensePanel) licensePanel.classList.remove('open');
    }
    function toggleLicensePanel() { licenseOpen ? closeLicensePanel() : openLicensePanel(); }

    function updateLicenseBadge() {
        if (!account || !licenseFabBadge) return;
        const count = account.licenses ? account.licenses.filter(k => { const l = store.validateLicense(k); return l && !l.revoked; }).length : 0;
        licenseFabBadge.textContent = count;
    }

    function renderLicenseList() {
        if (!licenseListWrap || !account) {
            if (licenseListWrap) licenseListWrap.innerHTML = '<p class="license-empty">Log in to see your licenses.</p>';
            return;
        }
        const keys = account.licenses || [];
        const active = keys.map(k => store.validateLicense(k)).filter(l => l && !l.revoked);
        if (!active.length) {
            licenseListWrap.innerHTML = '<p class="license-empty">No licenses yet. Go to <strong>Get a Key</strong> to generate one.</p>';
            return;
        }
        licenseListWrap.innerHTML = active.map(l => {
            const pluginName = l.plugins.map(id => { const p = CATALOG.find(x => x.id === id); return p ? p.name : id; }).join(', ');
            const p = CATALOG.find(x => l.plugins.includes(x.id));
            const tileClass = p ? 'tile-' + p.category : '';
            const mono = p ? p.monogram : '?';
            return `<div class="license-list-row">
                <div class="license-list-icon tile ${tileClass}">${mono}</div>
                <div class="license-list-info">
                    <div class="license-list-name">${esc(pluginName)}</div>
                    <div class="license-list-key">${esc(l.key)}</div>
                </div>
                <button class="license-list-copy" data-copy-key="${esc(l.key)}" title="Copy key">📋</button>
            </div>`;
        }).join('');
    }

    function renderLicensePicker() {
        if (!licensePickerGrid) return;
        licensePickerGrid.innerHTML = CATALOG.map(p => {
            const owned = account && store.ownsLicense(account, p.id);
            return `<div class="license-pick-card" data-gen-plugin="${p.id}">
                <div class="tile tile-${p.category}">${p.monogram}</div>
                <div>
                    <div class="license-pick-name">${esc(p.name)}</div>
                    <div class="license-pick-gen">${owned ? '✓ Licensed' : 'Generate key'}</div>
                </div>
            </div>`;
        }).join('');
    }

    function generateLicenseFor(pluginId) {
        if (!account) { openAuthModal(); toast('Log in to generate a license key.'); return; }
        if (store.ownsLicense(account, pluginId)) {
            const lic = account.licenses.map(k => store.validateLicense(k)).find(l => l && l.plugins.includes(pluginId));
            if (lic) showKeyReveal(lic.key, pluginId);
            return;
        }
        const lic = store.createLicense([pluginId], '', account.email);
        account = store.currentAccount();
        showKeyReveal(lic.key, pluginId);
        renderLicensePicker();
        updateLicenseBadge();
        toast('License key generated!');
    }

    function showKeyReveal(key, pluginId) {
        const p = CATALOG.find(x => x.id === pluginId);
        keyRevealCode.textContent = key;
        keyRevealPlugin.textContent = p ? p.name : pluginId;
        licenseKeyReveal.hidden = false;
        navigator.clipboard.writeText(key).catch(() => {});
    }

    function openLicenseGate(p) {
        gatePlugin = p;
        if (licenseGatePluginName) licenseGatePluginName.textContent = p.name;
        if (licenseGateModal) licenseGateModal.hidden = false;
    }
    function closeLicenseGate() {
        gatePlugin = null;
        if (licenseGateModal) licenseGateModal.hidden = true;
    }

    if (licenseFab) licenseFab.addEventListener('click', toggleLicensePanel);
    if (licenseClose) licenseClose.addEventListener('click', closeLicensePanel);

    if (licensePanel) {
        licensePanel.addEventListener('click', (e) => {
            const tab = e.target.closest('.license-tab');
            if (tab) {
                licensePanel.querySelectorAll('.license-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const target = tab.dataset.ltab;
                document.getElementById('license-tab-my-keys').hidden = target !== 'my-keys';
                document.getElementById('license-tab-get-key').hidden = target !== 'get-key';
                licenseKeyReveal.hidden = true;
                return;
            }
            const pick = e.target.closest('[data-gen-plugin]');
            if (pick) { generateLicenseFor(pick.dataset.genPlugin); return; }
            const copyBtn = e.target.closest('[data-copy-key]');
            if (copyBtn) {
                navigator.clipboard.writeText(copyBtn.dataset.copyKey).then(() => toast('Key copied!')).catch(() => {});
                return;
            }
        });
    }

    if (licenseKeyReveal) {
        licenseKeyReveal.addEventListener('click', (e) => {
            if (e.target.id === 'key-copy-btn' || e.target.closest('#key-copy-btn')) {
                navigator.clipboard.writeText(keyRevealCode.textContent).then(() => toast('Key copied to clipboard!')).catch(() => {});
            }
            if (e.target.id === 'key-download-btn' || e.target.closest('#key-download-btn')) {
                const p = CATALOG.find(x => x.id === keyRevealPlugin.textContent);
                if (p) { closeLicensePanel(); doDownload(p); }
            }
        });
    }

    if (licenseGateGenerate) {
        licenseGateGenerate.addEventListener('click', () => {
            if (!gatePlugin) return;
            if (!account) { closeLicenseGate(); openAuthModal(); return; }
            closeLicenseGate();
            generateLicenseFor(gatePlugin.id);
        });
    }

    // License gate modal close
    if (licenseGateModal && typeof licenseGateModal.querySelectorAll === 'function') {
        licenseGateModal.querySelectorAll('[data-close]').forEach(el => {
            el.addEventListener('click', closeLicenseGate);
        });
    }

    // Close panels when clicking outside
    document.addEventListener('click', (e) => {
        if (licenseOpen && licensePanel && licenseFab && !licensePanel.contains(e.target) && !licenseFab.contains(e.target)) {
            closeLicensePanel();
        }
    });

    let _inited = false;
    function guardedInit() { if (!_inited) { _inited = true; init(); } }
    document.addEventListener('DOMContentLoaded', guardedInit);
    if (document.readyState !== 'loading') guardedInit();
})();
