/* Shared loading screen — fades out once the page has finished loading.
   Keep it visible for a minimum moment so it reads as intentional. */
(function () {
    'use strict';
    var loader = document.getElementById('site-loader');
    if (!loader) return;

    var msgEl = loader.querySelector('[data-loader-msg]');
    var startedAt = Date.now();
    var tick = null;

    if (msgEl) {
        var msgs = ['Loading…', 'Fetching everything…', 'Polishing pixels…', 'Almost there…'];
        var i = 0;
        tick = setInterval(function () {
            i = (i + 1) % msgs.length;
            msgEl.textContent = msgs[i];
        }, 520);
    }

    var doneTimer = null;
    function finish() {
        if (tick) clearInterval(tick);
        if (doneTimer) clearTimeout(doneTimer);
        loader.classList.add('is-done');
        setTimeout(function () {
            if (loader.parentNode) loader.parentNode.removeChild(loader);
        }, 500);
    }
    function schedule() {
        var waited = Date.now() - startedAt;
        doneTimer = setTimeout(finish, Math.max(0, 850 - waited));
    }

    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule);
    setTimeout(finish, 6000); // safety net — never trap the page
})();
