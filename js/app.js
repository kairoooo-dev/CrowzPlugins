/* Crowz-Plugins — site logic */
(() => {
    const grid = document.getElementById('plugins-grid');
    const searchInput = document.getElementById('search');
    const filterSelect = document.getElementById('category-filter');
    const emptyState = document.getElementById('empty-state');
    const modal = document.getElementById('plugin-modal');
    const modalBody = document.getElementById('modal-body');
    const modalClose = document.getElementById('modal-close');

    // ---------- Downloads (localStorage, per plugin) ----------
    const KEY = (id) => 'crowz_dl_' + id;
    function localDelta(id) {
        try { return parseInt(localStorage.getItem(KEY(id)) || '0', 10); } catch { return 0; }
    }
    function dlCount(p) { return p.baseDownloads + localDelta(p.id); }
    function registerDownload(p) {
        try { localStorage.setItem(KEY(p.id), String(localDelta(p.id) + 1)); } catch {}
    }
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
        const list = PLUGINS.filter(p => {
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
        const p = PLUGINS.find(x => x.id === id);
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
                <span class="dl-note">${fmt(dlCount(p))} downloads so far</span>
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

    // ---------- Downloads ----------
    function download(p) {
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
            const p = PLUGINS.find(x => x.id === id);
            if (p) el.textContent = fmt(dlCount(p)) + ' downloads';
        });
        const note = modalBody.querySelector('.dl-note');
        const p = PLUGINS.find(x => x.id === modalBody.dataset.id);
        if (note && p) note.textContent = fmt(dlCount(p)) + ' downloads so far';
        const featured = document.getElementById('featured-downloads');
        const fp = PLUGINS.find(x => x.id === 'pvpcorex');
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
            const p = PLUGINS.find(x => x.id === dl.dataset.download);
            if (p) download(p);
            return;
        }
        const open = e.target.closest('[data-open]');
        if (open) {
            openModal(open.dataset.open);
            return;
        }
        if (e.target.closest('.modal-backdrop') || e.target === modalClose) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) closeModal();
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

    // ---------- Init ----------
    function init() {
        render(PLUGINS);
        animateNumber(document.getElementById('stat-plugins'), PLUGINS.length);
        const totalMb = PLUGINS.reduce((acc, p) => acc + parseFloat(p.size), 0);
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
