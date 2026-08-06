/* Crowz-Plugins — Plugin manifest
   Add new builds here; the site picks them up automatically. */
const PLUGINS = [
    {
        id: "staffmoderationplus",
        file: "StaffModerationPlus-2.2.0.jar",
        sha256: "bb3cd34e5b7e464dc621abb1b65e2a5f96d4818e42a1fbfdfc23741d51788840",
        name: "StaffModerationPlus",
        monogram: "SM",
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="11" r="1" fill="currentColor" stroke="none"/><path d="M12 14v1" stroke-width="2.5"/></svg>',
        category: "security",
        tag: "Moderation",
        recent: true,
        blurb: "The moderation toolkit: vanish, freeze, inventory inspection, Discord webhook logging and clean punishment records.",
        description: "StaffModerationPlus is what our own staff sit on all day. Vanish with per-staff visibility, freeze that actually stops movement, inventory inspection, chat moderation, Discord webhook logging with rich embeds, and a punishment history that doesn't require a separate web panel to understand.",
        features: ["Vanish (per-staff visibility)", "Freeze & unfreeze", "Inventory inspection", "Chat moderation", "Punishment history", "Discord webhook logging", "Voice announce (SVC)", "License system"],
        version: "2.2.0",
        size: "0.2 MB",
        paper: "Paper 1.21+",
        updated: "Aug 2026",
        requirements: ["Java 21", "Paper 1.21+", "Simple Voice Chat (optional — voice announce)"],
        commands: ["/ban", "/tempban", "/kick", "/freeze", "/vanish", "/invsee", "/setwebhook", "/license"],
        baseDownloads: 0,
        requiresLicense: true
    }
];
