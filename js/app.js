/* Crowz-Plugins — site logic */
(() => {
    const grid = document.getElementById('plugins-grid');
    const searchInput = document.getElementById('search');
    const filterSelect = document.getElementById('category-filter');
    const emptyState = document.getElementById('empty-state');
    const modal = document.getElementById('plugin-modal');
    const modalBody = document.getElementById('modal-body');
    const modalClose = document.getElementById('modal-close');

    // ---------- Data (shared store) ----------
    const store = window.CrowzStore;
    const CATALOG = store ? store.getCatalog() : PLUGINS;
    const dlCount = (p) => store.downloadCount(p);
    const registerDownload = (p) => store.recordDownload(p.id);
    function fmt(n) { return n.toLocaleString('en-US'); }

    const CATEGORY_LABELS = { pvp: 'PvP', voice: 'Voice', security: 'Security', economy: 'Economy', utility: 'Utility', core: 'Core' };

    // ---------- Card rendering ----------
    function createCard(p, index) {
        const card = document.createElement('article');
        card.className = 'plugin-card reveal';
        card.dataset.id = p.id;
        card.style.transitionDelay = (index % 6) * 40 + 'ms';
        card.innerHTML = `
            <div class="card-head">
                <div class="tile tile-${p.category}">${p.monogram}</div>
                <div class="card-title">
                    <h3>${p.name}</h3>
                    ${p.recent ? '<span class="chip chip-fresh">Fresh build</span>' : ''}
                </div>
            </div>
            <p class="card-blurb">${p.blurb}</p>
            <div class="card-meta">
                <span class="chip chip-cat cat-${p.category}">${CATEGORY_LABELS[p.category] || p.category}</span>
                <span class="chip">v${p.version}</span>
                ${isGated(p) ? '<span class="chip chip-lock">License required</span>' : ''}
                <span class="chip chip-dl">${fmt(dlCount(p))} downloads</span>
            </div>
            <div class="card-actions">
                <button class="btn btn-primary btn-sm" data-download="${p.id}">Download</button>
                <button class="btn btn-ghost btn-sm" data-open="${p.id}">Details</button>
            </div>`;
        return card;
    }

    function render(list) {
        grid.innerHTML = '';
        emptyState.hidden = list.length > 0;
        list.forEach((p, i) => grid.appendChild(createCard(p, i)));
    }

    function filterPlugins() {
        const q = searchInput.value.trim().toLowerCase();
        const cat = filterSelect.value;
        const list = CATALOG.filter(p => {
            const matchCat = cat === 'all' || p.category === cat;
            const matchQ = !q ||
                p.name.toLowerCase().includes(q) ||
                p.blurb.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                p.tag.toLowerCase().includes(q);
            return matchCat && matchQ;
        });
        render(list);
    }

    // ---------- Modal ----------
    function openModal(id) {
        const p = CATALOG.find(x => x.id === id);
        if (!p) return;
        modalBody.innerHTML = `
            <div class="modal-head">
                <div class="tile tile-${p.category} tile-lg">${p.monogram}</div>
                <div class="modal-head-text">
                    <h3>${p.name}</h3>
                    <p class="modal-tags">v${p.version} · ${p.size} · ${p.paper} · updated ${p.updated}</p>
                </div>
            </div>
            <p class="modal-desc">${p.description}</p>
            <h4>What's inside</h4>
            <ul class="modal-features">${p.features.map(f => `<li>${f}</li>`).join('')}</ul>
            <h4>Commands</h4>
            <div class="cmd-list">${p.commands.map(c => `<code>${c}</code>`).join('')}</div>
            <h4>Requirements</h4>
            <ul class="modal-reqs">${p.requirements.map(r => `<li>${r}</li>`).join('')}</ul>
            <h4>Install</h4>
            <ol class="modal-install">
                <li>Download the jar with the button below.</li>
                <li>Stop your server and drop the jar into <code>plugins/</code>.</li>
                <li>Start the server once to generate the config files.</li>
                <li>Edit the configs, run <code>${p.commands.find(c => /reload/i.test(c)) || '/<plugin> reload'}</code> and you're live.</li>
            </ol>
            <div class="modal-actions">
                <button class="btn btn-primary" data-download="${p.id}">Download ${p.name} (${p.size})</button>
                <span class="dl-note">${isGated(p) ? 'License required · ' : ''}${fmt(dlCount(p))} downloads so far</span>
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
        if (modal.hidden && licenseModal.hidden) document.body.classList.remove('modal-open');
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
        const list = document.getElementById('auth-licenses');
        list.innerHTML = '';
        const keys = (account.licenses || []).map(k => store.validateLicense(k)).filter(Boolean);
        if (!keys.length) {
            const p = document.createElement('p');
            p.className = 'modal-desc';
            p.textContent = 'No license keys attached yet. Get one from the license center and it lands here.';
            list.appendChild(p);
        } else {
            keys.forEach(l => {
                const row = document.createElement('div');
                row.className = 'auth-key-row';
                row.innerHTML = `<code>${l.key}</code><span>${l.revoked ? 'Revoked' : l.plugins.length + ' plugin' + (l.plugins.length === 1 ? '' : 's')}</span>`;
                list.appendChild(row);
            });
        }
    }
    function switchAuthTab(which) {
        document.getElementById('tab-login').classList.toggle('active', which === 'login');
        document.getElementById('tab-register').classList.toggle('active', which === 'register');
        document.getElementById('login-form').hidden = which !== 'login';
        document.getElementById('register-form').hidden = which !== 'register';
    }

    // ---------- License gate ----------
    const isGated = (p) => p.requiresLicense !== false;
    const CACHE_KEY = 'crowz_valid_keys';
    const licenseModal = document.getElementById('license-modal');
    const licenseKeyInput = document.getElementById('license-key');
    const licenseError = document.getElementById('license-error');
    const licensePluginName = document.getElementById('license-plugin-name');
    let pendingDownload = null;

    function cachedKeys() {
        try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || '[]'); } catch { return []; }
    }
    function cacheKey(k) {
        const list = cachedKeys();
        if (!list.includes(k)) {
            list.push(k);
            try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch {}
        }
    }
    function licenseCovers(p) {
        if (store.hasLicenseFor(p.id)) return true;
        if (store.ownsLicense(account, p.id)) return true;
        return cachedKeys().some(k => {
            const lic = store.validateLicense(k);
            return !!lic && lic.plugins.includes(p.id);
        });
    }
    function openLicenseModal(p) {
        licensePluginName.textContent = p.name + ' · v' + p.version;
        licenseError.hidden = true;
        licenseKeyInput.value = '';
        licenseModal.hidden = false;
        document.body.classList.add('modal-open');
        licenseKeyInput.focus();
    }
    function closeLicenseModal() {
        licenseModal.hidden = true;
        pendingDownload = null;
        if (modal.hidden) document.body.classList.remove('modal-open');
    }
    document.getElementById('license-confirm').addEventListener('click', () => {
        const p = pendingDownload;
        if (!p) { closeLicenseModal(); return; }
        const lic = store.validateLicense(licenseKeyInput.value);
        if (!lic || !lic.plugins.includes(p.id)) {
            licenseError.hidden = false;
            return;
        }
        cacheKey(lic.key);
        if (account) store.addLicenseToAccount(account.email, lic.key);
        closeLicenseModal();
        doDownload(p);
    });
    document.getElementById('license-cancel').addEventListener('click', closeLicenseModal);
    document.getElementById('license-close').addEventListener('click', closeLicenseModal);
    licenseKeyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('license-confirm').click();
    });

    // ---------- Downloads ----------
    function download(p) {
        if (isGated(p) && !licenseCovers(p)) {
            pendingDownload = p;
            openLicenseModal(p);
            return;
        }
        doDownload(p);
    }
    function doDownload(p) {
        const a = document.createElement('a');
        a.href = 'downloads/' + encodeURIComponent(p.file);
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
        const open = e.target.closest('[data-open]');
        if (open) {
            openModal(open.dataset.open);
            return;
        }
        if (e.target.closest('.modal-backdrop')) {
            if (!authModal.hidden) { closeAuthModal(); return; }
            if (!licenseModal.hidden) { closeLicenseModal(); return; }
            closeModal();
            return;
        }
        if (e.target === modalClose) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!authModal.hidden) closeAuthModal();
        else if (!licenseModal.hidden) closeLicenseModal();
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
        renderAccountArea();
        render(CATALOG);
        animateNumber(document.getElementById('stat-plugins'), CATALOG.length);
        const totalMb = CATALOG.reduce((acc, p) => acc + parseFloat(p.size), 0);
        animateNumber(document.getElementById('stat-size'), Math.round(totalMb));
        modalBody.dataset.id = '';
        requestAnimationFrame(() => {
            document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
        });
    }

    searchInput.addEventListener('input', filterPlugins);
    filterSelect.addEventListener('change', filterPlugins);
    document.addEventListener('DOMContentLoaded', init);
})();
