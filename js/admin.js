/* Crowz-Plugins — admin panel logic */
(() => {
    const store = window.CrowzStore;
    if (!store) throw new Error('CrowzStore missing — load store.js first.');

    const SESSION_KEY = 'crowz_admin_session';
    const $ = (id) => document.getElementById(id);

    let catalog = store.getCatalog();
    let editingId = null;

    // ---------- Toast ----------
    let toastTimer = null;
    function toast(msg) {
        const el = $('admin-toast');
        el.textContent = msg;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
    }

    // ---------- Auth ----------
    const isAuthed = () => { try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; } };
    function showApp() {
        $('login-screen').hidden = true;
        $('admin-app').hidden = false;
    }
    function showLogin() {
        $('login-screen').hidden = false;
        $('admin-app').hidden = true;
        $('login-password').value = '';
        $('login-error').hidden = true;
    }

    $('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const password = $('login-password').value;
        const settings = store.getSettings();
        if (password === settings.adminPassword) {
            try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
            showApp();
            refreshAll();
        } else {
            $('login-error').hidden = false;
        }
    });

    $('logout-btn').addEventListener('click', () => {
        try { sessionStorage.removeItem(SESSION_KEY); } catch {}
        showLogin();
    });

    // ---------- Navigation ----------
    const VIEW_TITLES = { dashboard: 'Dashboard', plugins: 'Plugins', analytics: 'Analytics', settings: 'Settings' };
    function switchView(name) {
        document.querySelectorAll('.view').forEach(v => v.hidden = true);
        document.querySelectorAll('.side-link').forEach(l => l.classList.toggle('active', l.dataset.view === name));
        $('view-' + name).hidden = false;
        $('view-title').textContent = VIEW_TITLES[name];
        const actions = $('topbar-actions');
        actions.innerHTML = '';
        if (name === 'plugins') {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary btn-sm';
            btn.textContent = 'Add plugin';
            btn.addEventListener('click', () => openPluginForm(null));
            actions.appendChild(btn);
        }
    }
    document.querySelectorAll('.side-link[data-view]').forEach(link => {
        link.addEventListener('click', () => switchView(link.dataset.view));
    });

    // ---------- Formatting ----------
    const fmt = (n) => n.toLocaleString('en-US');
    const catLabel = (c) => ({ pvp: 'PvP', voice: 'Voice', security: 'Security', economy: 'Economy', utility: 'Utility', core: 'Core' }[c] || c);

    // ---------- Dashboard ----------
    function renderDashboard() {
        const cards = $('dash-cards');
        const totalDl = store.totalDownloads();
        const top = [...catalog].sort((a, b) => store.downloadCount(b) - store.downloadCount(a))[0];
        const totalMb = catalog.reduce((acc, p) => acc + parseFloat(p.size) || 0, 0);
        cards.innerHTML = `
            <div class="stat-card"><span class="stat-label">Plugins</span><span class="stat-value">${catalog.length}</span><span class="stat-sub">in the catalog</span></div>
            <div class="stat-card accent"><span class="stat-label">Total downloads</span><span class="stat-value">${fmt(totalDl)}</span><span class="stat-sub">all time</span></div>
            <div class="stat-card"><span class="stat-label">Most downloaded</span><span class="stat-value">${top ? top.name : '—'}</span><span class="stat-sub">${top ? fmt(store.downloadCount(top)) + ' downloads' : ''}</span></div>
            <div class="stat-card"><span class="stat-label">Builds size</span><span class="stat-value">${Math.round(totalMb)} MB</span><span class="stat-sub">across all jars</span></div>`;

        const bars = $('dash-bars');
        const top5 = [...catalog].sort((a, b) => store.downloadCount(b) - store.downloadCount(a)).slice(0, 5);
        const max = top5.length ? store.downloadCount(top5[0]) : 1;
        bars.innerHTML = top5.map(p => `
            <div class="bar-row">
                <span class="bar-name">${p.name}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, Math.round(store.downloadCount(p) / max * 100))}%"></div></div>
                <span class="bar-val">${fmt(store.downloadCount(p))}</span>
            </div>`).join('') || '<p class="feed-empty">No plugins yet.</p>';

        const feed = $('dash-feed');
        const log = store.getLog();
        const nameOf = (id) => { const p = catalog.find(x => x.id === id); return p ? p.name : id; };
        feed.innerHTML = log.length
            ? log.slice(-10).reverse().map(l => `
                <div class="feed-item">
                    <span class="feed-name">${nameOf(l.id)}</span>
                    <span class="feed-time">${store.timeAgo(l.t)}</span>
                </div>`).join('')
            : '<p class="feed-empty">No downloads recorded yet. The site logs every download here.</p>';
    }

    // ---------- Plugins table ----------
    let pluginQuery = '';
    let pluginCat = 'all';
    function renderPluginTable() {
        const q = pluginQuery.toLowerCase();
        const rows = $('plugin-rows');
        const list = catalog.filter(p => {
            const matchCat = pluginCat === 'all' || p.category === pluginCat;
            const matchQ = !q || p.name.toLowerCase().includes(q) || p.tag.toLowerCase().includes(q);
            return matchCat && matchQ;
        });
        rows.innerHTML = list.map(p => `
            <tr>
                <td><div class="plugin-cell">
                    <div class="tile tile-${p.category}">${p.monogram}</div>
                    <div><div class="p-name">${p.name}</div><div class="p-tag">${p.tag || ''}</div></div>
                </div></td>
                <td>${catLabel(p.category)}</td>
                <td><div class="p-tag">${p.tag || ''}${p.requiresLicense !== false ? ' · license-gated' : ''}</div></td>
                <td>v${p.version}</td>
                <td>${p.size}</td>
                <td class="num">${fmt(store.downloadCount(p))}</td>
                <td>${p.updated}</td>
                <td><div class="row-actions">
                    <button class="icon-btn" data-edit="${p.id}" title="Edit">✎</button>
                    <button class="icon-btn danger" data-del="${p.id}" title="Delete">✕</button>
                </div></td>
            </tr>`).join('');
        $('plugin-empty').hidden = list.length > 0;
    }

    $('plugin-search').addEventListener('input', (e) => { pluginQuery = e.target.value; renderPluginTable(); });
    $('plugin-cat-filter').addEventListener('change', (e) => { pluginCat = e.target.value; renderPluginTable(); });
    $('add-plugin-btn').addEventListener('click', () => openPluginForm(null));

    $('plugin-rows').addEventListener('click', (e) => {
        const edit = e.target.closest('[data-edit]');
        if (edit) { openPluginForm(edit.dataset.edit); return; }
        const del = e.target.closest('[data-del]');
        if (del) {
            const p = catalog.find(x => x.id === del.dataset.del);
            confirmDialog(`Delete ${p.name}?`, 'The plugin is removed from the catalog. The jar file stays in the downloads folder.', () => {
                catalog = catalog.filter(x => x.id !== del.dataset.del);
                store.saveCatalog(catalog);
                renderPluginTable();
                renderDashboard();
                toast(`Deleted ${p.name}.`);
            });
        }
    });

    // ---------- Plugin form ----------
    const FORM_FIELDS = ['name', 'file', 'monogram', 'category', 'tag', 'version', 'size', 'paper', 'updated', 'baseDownloads', 'blurb', 'description'];
    const LIST_FIELDS = ['features', 'commands', 'requirements'];

    function openPluginForm(id) {
        editingId = id;
        const p = id ? catalog.find(x => x.id === id) : null;
        $('plugin-form-title').textContent = p ? 'Edit ' + p.name : 'Add plugin';
        $('plugin-form-submit').textContent = p ? 'Save changes' : 'Add plugin';
        $('plugin-form').reset();
        $('plugin-modal').hidden = false;
        $('plugin-form').elements.name.focus();
        if (p) {
            FORM_FIELDS.forEach(f => { $('plugin-form')[f].value = p[f] != null ? p[f] : ''; });
            LIST_FIELDS.forEach(f => { $('plugin-form')[f].value = (p[f] || []).join('\n'); });
            $('plugin-form').recent.checked = !!p.recent;
            $('plugin-form').requiresLicense.checked = p.requiresLicense !== false;
        }
    }

    $('plugin-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        const data = {};
        FORM_FIELDS.forEach(f => {
            data[f] = f === 'baseDownloads' ? (parseInt(form.elements[f].value, 10) || 0) : form.elements[f].value.trim();
        });
        LIST_FIELDS.forEach(f => {
            data[f] = form.elements[f].value.split('\n').map(s => s.trim()).filter(Boolean);
        });
        data.recent = form.elements.recent.checked;
        data.requiresLicense = form.elements.requiresLicense.checked;

        if (editingId) {
            const idx = catalog.findIndex(x => x.id === editingId);
            if (idx === -1) return;
            catalog[idx] = Object.assign({}, catalog[idx], data);
            toast('Plugin updated.');
        } else {
            data.id = store.slugify(data.name);
            if (catalog.some(x => x.id === data.id)) {
                toast('A plugin with that name already exists.');
                return;
            }
            data.baseDownloads = data.baseDownloads || 0;
            catalog.push(data);
            toast(data.name + ' added to the catalog.');
        }
        store.saveCatalog(catalog);
        $('plugin-modal').hidden = true;
        renderPluginTable();
        renderDashboard();
        switchView('plugins');
    });

    // ---------- Analytics ----------
    function renderAnalytics() {
        const log = store.getLog();
        const now = Date.now();
        const today = log.filter(l => now - l.t < 24 * 3600 * 1000).length;
        const week = log.filter(l => now - l.t < 7 * 24 * 3600 * 1000).length;

        const cards = $('analytics-cards');
        cards.innerHTML = `
            <div class="stat-card accent"><span class="stat-label">Downloads today</span><span class="stat-value">${today}</span><span class="stat-sub">last 24h</span></div>
            <div class="stat-card"><span class="stat-label">This week</span><span class="stat-value">${week}</span><span class="stat-sub">last 7 days</span></div>
            <div class="stat-card"><span class="stat-label">All time</span><span class="stat-value">${fmt(store.totalDownloads())}</span><span class="stat-sub">including base counts</span></div>
            <div class="stat-card"><span class="stat-label">Logged events</span><span class="stat-value">${log.length}</span><span class="stat-sub">recent history</span></div>`;

        const bars = $('analytics-bars');
        const sorted = [...catalog].sort((a, b) => store.downloadCount(b) - store.downloadCount(a));
        const max = sorted.length ? store.downloadCount(sorted[0]) : 1;
        bars.innerHTML = sorted.map(p => `
            <div class="bar-row">
                <span class="bar-name">${p.name}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, Math.round(store.downloadCount(p) / max * 100))}%"></div></div>
                <span class="bar-val">${fmt(store.downloadCount(p))}</span>
            </div>`).join('') || '<p class="feed-empty">Catalog is empty.</p>';
        $('analytics-note').textContent = 'Counts = baseDownloads + downloads logged on the site.';
    }

    $('reset-stats-btn').addEventListener('click', () => {
        confirmDialog('Reset all download stats?', 'Per-plugin counters and the download log are cleared. Base download numbers on plugins stay.', () => {
            store.resetStats();
            renderDashboard();
            renderAnalytics();
            toast('Stats reset.');
        });
    });

    // ---------- Settings ----------
    function fillSettingsForm() {
        const s = store.getSettings();
        const form = $('settings-form');
        form.siteName.value = s.siteName;
        form.tagline.value = s.tagline;
        form.contactEmail.value = s.contactEmail;
        form.adminPassword.value = s.adminPassword;
    }

    $('settings-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        store.saveSettings({
            siteName: form.siteName.value.trim(),
            tagline: form.tagline.value.trim(),
            contactEmail: form.contactEmail.value.trim(),
            adminPassword: form.adminPassword.value || store.getSettings().adminPassword
        });
        $('settings-saved').hidden = false;
        toast('Settings saved. The site picks them up on next load.');
        setTimeout(() => { $('settings-saved').hidden = true; }, 2000);
    });

    // ---------- Export / import ----------
    $('export-btn').addEventListener('click', () => {
        const blob = new Blob([store.exportData()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'crowz-plugins-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
        toast('Backup exported.');
    });

    $('import-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const count = store.importData(reader.result);
                catalog = store.getCatalog();
                renderPluginTable();
                renderDashboard();
                renderAnalytics();
                fillSettingsForm();
                toast(`Imported ${count} plugins.`);
            } catch (err) {
                toast('Import failed: ' + err.message);
            }
            e.target.value = '';
        };
        reader.readAsText(file);
    });

    // ---------- Danger zone ----------
    $('reset-catalog-btn').addEventListener('click', () => {
        confirmDialog('Reset catalog to defaults?', 'All admin edits to plugins are discarded. Downloads and settings are kept.', () => {
            store.resetCatalog();
            catalog = store.getCatalog();
            renderPluginTable();
            renderDashboard();
            renderAnalytics();
            toast('Catalog reset to defaults.');
        });
    });

    $('wipe-btn').addEventListener('click', () => {
        confirmDialog('Wipe everything?', 'The catalog, settings, download stats and all licenses are deleted. The site falls back to its shipped defaults.', () => {
            store.resetCatalog();
            store.resetSettings();
            store.resetStats();
            store.resetLicenses();
            catalog = store.getCatalog();
            fillSettingsForm();
            renderPluginTable();
            renderDashboard();
            renderAnalytics();
            toast('Everything wiped.');
        });
    });

    // ---------- Confirm dialog ----------
    let confirmAction = null;
    function confirmDialog(title, text, action) {
        $('confirm-title').textContent = title;
        $('confirm-text').textContent = text;
        confirmAction = action;
        $('confirm-modal').hidden = false;
    }
    $('confirm-yes').addEventListener('click', () => {
        $('confirm-modal').hidden = true;
        if (confirmAction) { confirmAction(); confirmAction = null; }
    });

    // ---------- Global modal close ----------
    document.querySelectorAll('.modal [data-close]').forEach(el => {
        el.addEventListener('click', () => { el.closest('.modal').hidden = true; });
    });

    // ---------- Refresh ----------
    function refreshAll() {
        catalog = store.getCatalog();
        renderDashboard();
        renderPluginTable();
        renderAnalytics();
        fillSettingsForm();
        switchView('dashboard');
    }

    // ---------- Init ----------
    refreshAll();
    if (isAuthed()) showApp();
})();
