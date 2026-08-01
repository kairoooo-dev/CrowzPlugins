/* ⚔ Crowz-Plugins — AI Assistant
   Local rule-based assistant with plugin knowledge.
   No external API calls — everything runs in your browser. */
(() => {
    const store = window.CrowzStore;
    const CATALOG = store ? store.getCatalog() : PLUGINS;
    const fab = document.getElementById('assistant-fab');
    const panel = document.getElementById('assistant-panel');
    const closeBtn = document.getElementById('assistant-close');
    const chat = document.getElementById('assistant-chat');
    const input = document.getElementById('assistant-input');
    const sendBtn = document.getElementById('assistant-send');
    const suggestions = document.getElementById('assistant-suggestions');

    const SUGGESTIONS = [
        'Who created these plugins?',
        'Which plugin is best for PvP?',
        'How do I install a plugin?',
        'Tell me about UltimateVoice',
        'Join the community'
    ];

    // ---------- Knowledge base ----------
    const KNOWLEDGE = [
        {
            match: /pvpcorex/i,
            answer: () => {
                const p = findPlugin('pvpcorex');
                return `⚔️ <b>PVPCoreX</b> is the flagship all-in-one PvP ecosystem (${p.size}, v${p.version}). It includes <b>CombatX</b> (combat tagging & punishments), <b>KillStreakX</b>, <b>KillEffectsX</b> (9 premium effects), <b>DuelX</b> (ELO + kits), <b>BountyX</b>, <b>DeathChestX</b> (instant PvP looting), <b>SupplyDropX</b>, <b>KOTHX</b> and <b>PvPStatsX</b>. Fully Folia-compatible with SQLite/MySQL/MongoDB support.`;
            }
        },
        {
            match: /ultimatevoice|voice/i,
            answer: () => {
                const p = findPlugin('ultimatevoice');
                return `🎙️ <b>UltimateVoice</b> (${p.size}) adds full voice communication to your server via Simple Voice Chat integration. Features 1v1 calls, voice groups, friends & block lists, call history, animated premium GUI, and database persistence. Perfect for SMP or faction servers.`;
            }
        },
        {
            match: /install|setup|how.*(use|install|add)/i,
            answer: () => `📦 <b>Installing a plugin:</b><br>1. Download the JAR using the Download button.<br>2. Stop your server.<br>3. Place the JAR in your <code>plugins/</code> folder.<br>4. Start the server.<br>5. Edit the generated config files in <code>plugins/&lt;PluginName&gt;/</code>.<br>6. Run <code>/pvpcorex reload</code> if the plugin supports live reload.<br><br>⚠️ All plugins here require <b>Paper 1.21+</b> and <b>Java 21</b>.`
        },
        {
            match: /license|key|unlock/i,
            answer: () => `✅ <b>No licenses here.</b> Downloads are open to everyone — hit <b>Download</b> on any plugin and the jar saves to your computer. No keys, no sign-ups, no premium versions. If something ever asks you for a key, it's not this site.`
        },
        {
            match: /pvp|combat|best.*pvp/i,
            answer: () => `🗡️ For PvP, the top picks are:<br><b>1. PVPCoreX</b> — full PvP ecosystem (combat tags, duels with ELO, bounties, death chests, KOTH).<br><b>2. CrowzPVP</b> — lightweight PvP enhancements.<br><b>3. UltimateVoice</b> — voice chat to coordinate with your team.<br>Use <b>ArmorDurability HUD</b> to keep your gear in check mid-fight!`
        },
        {
            match: /performance|lag|tps|optimize|fps/i,
            answer: () => `⚡ Performance stack:<br><b>1. CrowzOptimizer</b> — trims unused features, reduces lag.<br><b>2. CrowzPerformance</b> — entity limits & redstone control.<br><b>3. KaisClearLag</b> — auto-clears entities & items to keep TPS high.<br>PVPCoreX itself is designed for 5,000+ players with almost zero TPS impact.`
        },
        {
            match: /security|antivpn|anticheat|auth|hacker|cheat/i,
            answer: () => `🔐 Security suite:<br><b>CrowzAntiVPN</b> — blocks VPN/proxy/alt connections.<br><b>CrowzCAnticheat</b> — detects kill aura, fly and more.<br><b>v0Auth</b> — password authentication with brute-force protection.<br><b>StaffModerationPlus</b> — vanish, freeze, inventory inspection.`
        },
        {
            match: /economy|shop|money|vault/i,
            answer: () => `💰 Economy tools:<br><b>EnclaveShop</b> — GUI-based player shops with Vault integration.<br><b>FlowSMP</b> — includes a full economy module.<br><b>PVPCoreX</b> — duels, bounties, kill streaks and KOTH all pay out money through Vault.`
        },
        {
            match: /how many|count|list.*plugin|what plugin/i,
            answer: () => `I have <b>${CATALOG.length} plugins</b> available for download. Categories: PvP, Voice Chat, Security, Economy, Utility and Core. Type a plugin name and I'll tell you about it!`
        },
        {
            match: /(which|what).*(should|recommend|pick|best)/i,
            answer: () => `🌟 <b>My recommendations:</b><br>• PvP server → <b>PVPCoreX</b> + <b>CrowzAntiVPN</b><br>• SMP server → <b>FlowSMP</b> + <b>EnclaveShop</b><br>• Factions → <b>UltimateVoice</b> + <b>PVPCoreX</b><br>• Any server → <b>CrowzOptimizer</b> for TPS`
        },
        {
            match: /hi|hello|hey|yo|sup/i,
            answer: () => `Hey there! 👋 I'm the Crowz Assistant. I can help you find the right plugin, explain features, or walk you through installation. Ask me anything!`
        },
        {
            match: /thank|thanks|thx/i,
            answer: () => `You're welcome! 😄 Enjoy the plugins — and remember, everything here is free.`
        },
        {
            match: /who (are you|made you)|what are you|who created|who made/i,
            answer: () => `I'm <b>Crowz Assistant</b> 🤖 — created by <b>Crowz</b> (CrowzDev), the solo developer behind every plugin on this site. I run 100% in your browser with zero data leaving your device. Crowz built me to help you find the right plugin, answer install questions, and give server setup advice. I know all ${CATALOG.length} plugins inside out!`
        },
        {
            match: /who is crowz|tell me about crowz|about the dev|creator/i,
            answer: () => `<b>Crowz</b> (CrowzDev) is the solo developer who built every plugin on this site — PvP cores, anticheat, voice chat, economy tools, all of it. He started Crowz-Plugins because his own servers needed these tools and he was tired of paying for bad ones. Everything here is free, maintained by one person who actually answers his email (Crowzwdev@gmail.com) and Discord. 🎮`
        },
        {
            match: /discord|community|chat|hangout/i,
            answer: () => `🎮 <b>Join the Crowz community!</b><br>• Discord: <a href="https://discord.gg/NG2hyARph" target="_blank" rel="noopener">discord.gg/NG2hyARph</a><br>• Hub: <a href="../Crowz-Hub/index.html">Crowz Hub</a> — live chat, online users, leaderboard<br>• Email: Crowzwdev@gmail.com<br><br>Open the Hub in multiple tabs to see the live community features in action!`
        },
        {
            match: /deathchest|death chest/i,
            answer: () => `📦 <b>DeathChestX</b> (in PVPCoreX) creates a chest at your death location with <b>NO owner lock</b> — every player can loot it instantly. First come, first served. Perfect for competitive PvP, crystal PvP, lifesteal and FFA servers. Features safe placement, explosion/lava/hopper protection, expiry cleanup and compass tracking.`
        },
        {
            match: /duel|elo|ranked/i,
            answer: () => `🏆 <b>DuelX</b> (in PVPCoreX) offers: classic/crystal/sword kits, arenas, spectators, queue, ranked & unranked duels, best-of-3, rematch, ELO ratings and leaderboards. Type <code>/pvpcorex duel &lt;player&gt;</code> to challenge someone!`
        },
        {
            match: /koth|king of the hill/i,
            answer: () => `👑 <b>KOTHX</b> (in PVPCoreX) runs King-of-the-Hill events: capture zones with particle rings, boss-bar capture progress, timed events, rotation, broadcasts and money/command rewards. Configure hills in <code>koth.yml</code>.`
        }
    ];

    function findPlugin(id) {
        return CATALOG.find(p => p.id === id) || { name: id, size: '?', version: '?' };
    }

    // ---------- Chat logic ----------
    function addMessage(text, isUser = false) {
        const div = document.createElement('div');
        div.className = 'msg ' + (isUser ? 'user' : 'bot');
        div.innerHTML = (isUser ? '' : '<span class="msg-icon">🤖</span>') + text;
        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;
        return div;
    }

    function addTyping() {
        const div = document.createElement('div');
        div.className = 'msg bot typing';
        div.textContent = 'thinking...';
        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;
        return div;
    }

    function getAnswer(text) {
        // Exact plugin name match first
        for (const p of CATALOG) {
            if (text.toLowerCase().includes(p.name.toLowerCase())) {
                return `📦 <b>${p.name}</b> — ${p.description} <br>• Category: ${p.category}<br>• Version: v${p.version} · ${p.size}<br>• Paper: ${p.paper}<br><br>Click <b>Download</b> on the card to grab it!`;
            }
        }
        for (const k of KNOWLEDGE) {
            if (k.match.test(text)) {
                return k.answer();
            }
        }
        return `Hmm, I'm not sure about that one 🤔 — but I know everything about the <b>${CATALOG.length} plugins</b> in this hub. Try asking things like:<br>• "Which plugin is best for PvP?"<br>• "How do I install a plugin?"<br>• "Tell me about UltimateVoice"`;
    }

    function ask(text) {
        if (!text.trim()) return;
        addMessage(escapeHtml(text), true);
        const typing = addTyping();
        setTimeout(() => {
            typing.remove();
            addMessage(getAnswer(text));
        }, 400 + Math.random() * 500);
    }

    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function setSuggestions() {
        suggestions.innerHTML = '';
        for (const s of SUGGESTIONS) {
            const btn = document.createElement('button');
            btn.className = 'suggestion';
            btn.textContent = s;
            btn.addEventListener('click', () => {
                input.value = s;
                ask(s);
            });
            suggestions.appendChild(btn);
        }
    }

    // ---------- Panel open/close ----------
    let opened = false;
    function openPanel() {
        panel.classList.add('open');
        opened = true;
        setTimeout(() => input.focus(), 150);
        if (!chat.children.length) {
            setTimeout(() => addMessage('Hey! 👋 I\'m <b>Crowz Assistant</b>, created by <b>Crowz</b> — the solo dev behind every plugin here. I know all ' + CATALOG.length + ' plugins inside out. Ask me anything, or click the Community button to chat with other server owners!'), 300);
        }
    }
    function closePanel() {
        panel.classList.remove('open');
        opened = false;
    }

    fab.addEventListener('click', () => opened ? closePanel() : openPanel());
    closeBtn.addEventListener('click', closePanel);
    sendBtn.addEventListener('click', () => { ask(input.value); input.value = ''; });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { ask(input.value); input.value = ''; }
    });

    setSuggestions();
})();
