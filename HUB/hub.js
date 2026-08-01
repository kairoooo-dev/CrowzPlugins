/* Crowz-Hub — live community features
   BroadcastChannel for cross-tab chat + presence, localStorage for persistence. */
(() => {
    'use strict';

    // ---------- Store ----------
    const catalog = (typeof PLUGINS !== 'undefined' && Array.isArray(PLUGINS)) ? PLUGINS : [];
    const store = (typeof CrowzStore !== 'undefined') ? CrowzStore : null;

    // ---------- Storage keys ----------
    const MESSAGES_KEY = 'crowz_hub_messages';
    const ACTIVITY_KEY = 'crowz_hub_activity';
    const HEARTBEAT_KEY = 'crowz_hub_heartbeat';
    const PRESENCE_KEY = 'crowz_hub_presence';
    const TAB_ID = Math.random().toString(36).slice(2, 10);
    const MY_USER = (() => {
        if (store) {
            const s = store.currentAccount();
            if (s && s.username) return s.username;
        }
        return 'Anon-' + TAB_ID.slice(0, 4);
    })();

    // ---------- BroadcastChannel ----------
    let channel = null;
    try { channel = new BroadcastChannel('crowz-hub'); } catch {}

    // ---------- DOM ----------
    const $ = (id) => document.getElementById(id);
    const chatMessages = $('chat-messages');
    const chatForm = $('chat-form');
    const chatInput = $('chat-input');
    const chatTyping = $('chat-typing');
    const typingWho = $('typing-who');
    const onlineList = $('online-list');
    const sidebarOnline = $('sidebar-online');
    const chatOnline = $('chat-online');
    const activityFeed = $('activity-feed');
    const leaderboardGrid = $('leaderboard-grid');

    // ---------- Helpers ----------
    function read(key, fallback) {
        try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
        catch { return fallback; }
    }
    function write(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }
    function timeAgo(ts) {
        const s = Math.floor((Date.now() - ts) / 1000);
        if (s < 60) return 'just now';
        if (s < 3600) return Math.floor(s / 60) + 'm ago';
        if (s < 86400) return Math.floor(s / 3600) + 'h ago';
        return Math.floor(s / 86400) + 'd ago';
    }
    function fmtNum(n) {
        if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return String(n);
    }
    function avatarColor(name) {
        let h = 0;
        for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
        const hue = Math.abs(h) % 360;
        return `hsl(${hue}, 55%, 50%)`;
    }
    function avatarInitial(name) { return name.charAt(0).toUpperCase(); }

    // ---------- Messages ----------
    function getMessages() {
        const msgs = read(MESSAGES_KEY, []);
        return Array.isArray(msgs) ? msgs.slice(-200) : [];
    }
    function saveMessages(msgs) {
        write(MESSAGES_KEY, msgs.slice(-200));
    }
    function addMessage(author, text, ts, isMine) {
        const msg = { author, text, ts: ts || Date.now(), mine: !!isMine };
        const msgs = getMessages();
        // dedupe (same author + text within 1s)
        const last = msgs[msgs.length - 1];
        if (last && last.author === msg.author && last.text === msg.text && Math.abs(last.ts - msg.ts) < 1000) return;
        msgs.push(msg);
        saveMessages(msgs);
        renderChatMessage(msg);
        scrollChat();
    }
    function renderChatMessage(msg) {
        const div = document.createElement('div');
        div.className = 'chat-msg' + (msg.mine ? ' mine' : '');
        div.innerHTML = `<div class="msg-author">${esc(msg.author)}</div><div class="msg-text">${esc(msg.text)}</div><div class="msg-time">${timeAgo(msg.ts)}</div>`;
        chatMessages.appendChild(div);
    }
    function renderAllMessages() {
        chatMessages.innerHTML = '<div class="chat-system">Welcome to Crowz Hub! Be nice, share tips, and have fun.</div>';
        getMessages().forEach(m => renderChatMessage(m));
        scrollChat();
    }
    function scrollChat() {
        requestAnimationFrame(() => { chatMessages.scrollTop = chatMessages.scrollHeight; });
    }
    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    // ---------- Presence ----------
    function getPresence() {
        const p = read(PRESENCE_KEY, {});
        const now = Date.now();
        const active = {};
        for (const [tab, data] of Object.entries(p)) {
            if (now - data.ts < 12000) active[tab] = data;
        }
        return active;
    }
    function savePresence(data) {
        const p = read(PRESENCE_KEY, {});
        p[TAB_ID] = data;
        write(PRESENCE_KEY, p);
    }
    function cleanPresence() {
        const p = read(PRESENCE_KEY, {});
        const now = Date.now();
        let changed = false;
        for (const [tab, data] of Object.entries(p)) {
            if (now - data.ts > 12000) { delete p[tab]; changed = true; }
        }
        if (changed) write(PRESENCE_KEY, p);
    }
    function sendHeartbeat() {
        savePresence({ username: MY_USER, ts: Date.now() });
        cleanPresence();
        renderOnline();
        // broadcast
        if (channel) {
            try { channel.postMessage({ type: 'heartbeat', username: MY_USER, ts: Date.now(), tab: TAB_ID }); } catch {}
        }
    }
    function renderOnline() {
        const active = getPresence();
        const users = Object.values(active);
        const count = users.length;
        sidebarOnline.textContent = count;
        chatOnline.textContent = count;
        $('online-count').textContent = count;
        $('stat-online').textContent = count;

        // dedupe by username
        const seen = new Set();
        const unique = [];
        for (const u of users) {
            if (!seen.has(u.username)) { seen.add(u.username); unique.push(u); }
        }

        onlineList.innerHTML = '';
        if (!unique.length) {
            onlineList.innerHTML = '<p class="empty-text">No one here yet. Open another tab to see it work!</p>';
            return;
        }
        unique.forEach((u, i) => {
            const div = document.createElement('div');
            div.className = 'online-user';
            div.style.animationDelay = (i * .05) + 's';
            const color = avatarColor(u.username);
            div.innerHTML = `<div class="online-avatar" style="background:${color};color:#fff">${avatarInitial(u.username)}</div><div class="online-user-info"><div class="online-user-name">${esc(u.username)}</div><div class="online-user-when">${u.tab === TAB_ID ? 'you' : timeAgo(u.ts)}</div></div>`;
            onlineList.appendChild(div);
        });
    }

    // ---------- Typing indicator ----------
    let typingTimeout = null;
    function broadcastTyping() {
        if (channel) {
            try { channel.postMessage({ type: 'typing', username: MY_USER, tab: TAB_ID }); } catch {}
        }
    }
    function showTyping(who) {
        if (who === MY_USER) return;
        typingWho.textContent = who;
        chatTyping.hidden = false;
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => { chatTyping.hidden = true; }, 3000);
    }

    // ---------- Activity feed ----------
    function getActivity() {
        const a = read(ACTIVITY_KEY, []);
        return Array.isArray(a) ? a.slice(-50) : [];
    }
    function addActivity(icon, html, ts) {
        const items = getActivity();
        items.push({ icon, html, ts: ts || Date.now() });
        write(ACTIVITY_KEY, items.slice(-50));
        renderActivity();
    }
    function renderActivity() {
        const items = getActivity().slice(-10).reverse();
        activityFeed.innerHTML = '';
        if (!items.length) {
            activityFeed.innerHTML = '<p class="empty-text">Activity will show up here.</p>';
            return;
        }
        items.forEach((item, i) => {
            const div = document.createElement('div');
            div.className = 'activity-item';
            div.style.animationDelay = (i * .05) + 's';
            div.innerHTML = `<div class="activity-icon">${item.icon}</div><div><div class="activity-text">${item.html}</div><span class="activity-time">${timeAgo(item.ts)}</span></div>`;
            activityFeed.appendChild(div);
        });
    }

    // ---------- Leaderboard ----------
    function renderLeaderboard() {
        const sorted = catalog.map(p => ({
            ...p,
            downloads: (p.baseDownloads || 0) + (store ? (store.delta ? store.delta(p.id) : 0) : 0)
        })).sort((a, b) => b.downloads - a.downloads);

        leaderboardGrid.innerHTML = '';
        sorted.forEach((p, i) => {
            const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
            const card = document.createElement('a');
            card.className = 'lb-card';
            card.style.animationDelay = (i * .06) + 's';
            card.href = `../Crowz-Plugins/index.html#${p.id}`;
            card.innerHTML = `<div class="lb-rank ${rankClass}">${i + 1}</div><div class="lb-info"><div class="lb-name">${esc(p.name)}</div><div class="lb-meta">${esc(p.paper)} · ${esc(p.size)}</div></div><div class="lb-dl">↓ ${fmtNum(p.downloads)}</div>`;
            leaderboardGrid.appendChild(card);
        });
    }

    // ---------- Stats ----------
    function renderStats() {
        $('stat-plugins').textContent = catalog.length;
        const totalDl = catalog.reduce((acc, p) => acc + (p.baseDownloads || 0) + (store ? (store.delta ? store.delta(p.id) : 0) : 0), 0);
        $('stat-downloads').textContent = fmtNum(totalDl);
        const msgs = getMessages().filter(m => {
            const d = Date.now() - m.ts;
            return d < 86400000;
        });
        $('stat-messages').textContent = msgs.length;
    }

    // ---------- Chat form ----------
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;
        chatInput.value = '';
        addMessage(MY_USER, text, Date.now(), true);
        addActivity('💬', `<strong>${esc(MY_USER)}</strong> sent a message`, Date.now());
        if (channel) {
            try { channel.postMessage({ type: 'message', author: MY_USER, text, ts: Date.now(), tab: TAB_ID }); } catch {}
        }
    });
    chatInput.addEventListener('input', () => { broadcastTyping(); });

    // ---------- Channel listener ----------
    if (channel) {
        channel.onmessage = (e) => {
            const d = e.data;
            if (!d) return;
            if (d.type === 'message' && d.tab !== TAB_ID) {
                addMessage(d.author, d.text, d.ts, false);
                addActivity('💬', `<strong>${esc(d.author)}</strong> sent a message`, d.ts);
            }
            if (d.type === 'typing' && d.tab !== TAB_ID) {
                showTyping(d.username);
            }
            if (d.type === 'heartbeat' && d.tab !== TAB_ID) {
                savePresence({ username: d.username, ts: d.ts, tab: d.tab });
                cleanPresence();
                renderOnline();
            }
            if (d.type === 'join' && d.tab !== TAB_ID) {
                savePresence({ username: d.username, ts: Date.now(), tab: d.tab });
                renderOnline();
                addActivity('👋', `<strong>${esc(d.username)}</strong> joined the hub`, Date.now());
            }
        };
    }

    // ---------- Init ----------
    function init() {
        renderAllMessages();
        renderLeaderboard();
        renderStats();
        renderActivity();
        sendHeartbeat();
        setInterval(sendHeartbeat, 3000);
        setInterval(renderStats, 10000);
        setInterval(cleanPresence, 5000);

        // announce join
        if (channel) {
            try { channel.postMessage({ type: 'join', username: MY_USER, tab: TAB_ID }); } catch {}
        }
        addActivity('👋', `<strong>${esc(MY_USER)}</strong> joined the hub`, Date.now());

        // update time displays
        setInterval(() => {
            chatMessages.querySelectorAll('.msg-time').forEach((el, i) => {
                const msgs = getMessages();
                if (msgs[i]) el.textContent = timeAgo(msgs[i].ts);
            });
        }, 30000);
    }

    // ---------- Rain ----------
    function startRain() {
        const canvas = document.getElementById('rain-canvas');
        if (!canvas || !canvas.getContext || typeof canvas.getContext !== 'function') return;
        const ctx = canvas.getContext('2d');
        if (!ctx || typeof window.requestAnimationFrame !== 'function') return;
        let W = 0, H = 0;
        const COUNT = 200;
        const drops = new Array(COUNT);
        function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
        function spawn(i) {
            const bright = Math.random() < 0.08;
            drops[i] = {
                x: Math.random() * W, y: Math.random() * -H,
                len: bright ? 22 + Math.random() * 28 : 10 + Math.random() * 18,
                speed: bright ? 7 + Math.random() * 6 : 3 + Math.random() * 5,
                alpha: bright ? 0.18 + Math.random() * 0.2 : 0.04 + Math.random() * 0.1,
                bright
            };
        }
        function step() {
            ctx.clearRect(0, 0, W, H);
            ctx.lineWidth = 1;
            for (let i = 0; i < COUNT; i++) {
                const d = drops[i];
                ctx.strokeStyle = d.bright ? 'rgba(56,189,248,1)' : 'rgba(140,190,240,1)';
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

    // ---------- Nav toggle ----------
    const navToggle = $('nav-toggle');
    const navLinks = document.querySelector('.nav');
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
    }

    // ---------- Start ----------
    startRain();
    init();
})();
