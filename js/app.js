/* ⚔ PVPCoreX Hub — App logic */
(() => {
    const grid = document.getElementById('plugins-grid');
    const searchInput = document.getElementById('search');
    const filterSelect = document.getElementById('category-filter');
    const emptyState = document.getElementById('empty-state');

    // ---------- Download tracking (localStorage) ----------
    const KEY = 'pvpcorex_downloads';
    function getDownloadCount() {
        try { return parseInt(localStorage.getItem(KEY) || '0', 10); } catch { return 0; }
    }
    function addDownload() {
        const n = getDownloadCount() + 1;
        try { localStorage.setItem(KEY, String(n)); } catch {}
        return n;
    }

    // ---------- Render ----------
    function createCard(p, index) {
        const card = document.createElement('div');
        card.className = 'plugin-card';
        card.style.animationDelay = (index * 0.05) + 's';
        card.innerHTML = `
            <div class="plugin-top">
                <div class="plugin-icon">${p.icon}</div>
                <div>
                    <div class="plugin-title">${p.name}</div>
                    <div class="plugin-tag">${p.tag}</div>
                </div>
            </div>
            <p class="plugin-desc">${p.description}</p>
            <div class="plugin-meta">
                <span class="meta-chip category-${p.category}">${categoryLabel(p.category)}</span>
                ${(p.features || []).slice(0, 3).map(f => `<span class="meta-chip">${f}</span>`).join('')}
            </div>
            <div class="plugin-footer">
                <span class="version">v${p.version} · ${p.size} · Paper ${p.paper}</span>
                <button class="download-btn" data-file="${p.file}" data-name="${p.name}">
                    <span>⬇</span> Download
                </button>
            </div>`;
        card.querySelector('.download-btn').addEventListener('click', (e) => {
            e.preventDefault();
            downloadFile(p);
        });
        return card;
    }

    function downloadFile(p) {
        const a = document.createElement('a');
        a.href = 'downloads/' + encodeURIComponent(p.file);
        a.download = p.file;
        document.body.appendChild(a);
        a.click();
        a.remove();
        const n = addDownload();
        updateStat('stat-downloads', n);
        showToast(`⬇ Downloading ${p.name}...`);
    }

    function categoryLabel(c) {
        const map = { pvp: 'PvP', voice: 'Voice Chat', security: 'Security', economy: 'Economy', utility: 'Utility', core: 'Core' };
        return map[c] || c;
    }

    function filterPlugins() {
        const q = searchInput.value.trim().toLowerCase();
        const cat = filterSelect.value;
        const list = PLUGINS.filter(p => {
            const matchCat = cat === 'all' || p.category === cat;
            const matchQ = !q ||
                p.name.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q) ||
                p.tag.toLowerCase().includes(q);
            return matchCat && matchQ;
        });
        grid.innerHTML = '';
        emptyState.hidden = list.length > 0;
        list.forEach((p, i) => grid.appendChild(createCard(p, i)));
    }

    // ---------- Stats ----------
    function updateStat(id, value) {
        const el = document.getElementById(id);
        if (el) animateNumber(el, value);
    }
    function animateNumber(el, target) {
        const start = parseInt(el.textContent || '0', 10);
        const duration = 700;
        const t0 = performance.now();
        function step(t) {
            const p = Math.min(1, (t - t0) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(start + (target - start) * eased);
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // ---------- Toast ----------
    function showToast(msg) {
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%) translateY(20px);background:#1a1a24;border:1px solid #ff0033;color:#fff;padding:12px 22px;border-radius:10px;z-index:500;opacity:0;transition:all .3s;font-size:14px;box-shadow:0 8px 30px rgba(0,0,0,.5)';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
        clearTimeout(toast._t);
        toast._t = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
        }, 2600);
    }

    // ---------- Animated background ----------
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    function initParticles() {
        particles = [];
        const count = Math.min(90, Math.floor(window.innerWidth / 18));
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 1.8 + 0.4,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                color: Math.random() > 0.85 ? '255, 0, 51' : '139, 0, 0'
            });
        }
    }
    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const p of particles) {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color}, 0.35)`;
            ctx.fill();
        }
        requestAnimationFrame(drawParticles);
    }
    window.addEventListener('resize', () => { resize(); initParticles(); });

    // ---------- Init ----------
    function init() {
        resize();
        initParticles();
        drawParticles();
        filterPlugins();
        updateStat('stat-plugins', PLUGINS.length);
        const totalMb = PLUGINS.reduce((acc, p) => acc + parseFloat(p.size), 0);
        updateStat('stat-total', Math.round(totalMb));
        updateStat('stat-downloads', getDownloadCount());
    }

    searchInput.addEventListener('input', filterPlugins);
    filterSelect.addEventListener('change', filterPlugins);
    document.addEventListener('DOMContentLoaded', init);
})();
