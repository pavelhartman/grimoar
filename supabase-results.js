/* Odesílá pouze konečné výsledky; neukládá rozehranou hru na server. */
(() => {
  'use strict';
  const URL = 'https://vzycwoignmhqjsthkpdx.supabase.co';
  const KEY = 'sb_publishable_8995XXqxGddPHWHu6KPe9g_ycR_0Jwz';
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } };
  const pending = read('kgPendingFinalResults');
  const receipts = read('kgFinalResultReceipts');
  const running = new Map(), statuses = new Map();
  function persist() {
    try {
      localStorage.setItem('kgPendingFinalResults', JSON.stringify(pending));
      localStorage.setItem('kgFinalResultReceipts', JSON.stringify(receipts));
    } catch { /* Aktuální stránka si výsledek ponechá v paměti. */ }
  }
  function status(id, value) {
    statuses.set(id, value);
    window.dispatchEvent(new CustomEvent('kg-result-status', {detail: {id, status: value}}));
  }
  function send(id) {
    if (receipts[id]) { status(id, 'saved'); return Promise.resolve(true); }
    if (running.has(id)) return running.get(id);
    const payload = pending[id];
    if (!payload) return Promise.resolve(false);
    const task = (async () => {
      status(id, 'sending');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(URL + '/rest/v1/rpc/ulozit_vysledek', {
          method: 'POST', headers: {'apikey': KEY, 'Content-Type': 'application/json'},
          body: JSON.stringify({p: payload}), signal: controller.signal
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const result = await response.json();
        if (result?.saved !== true) throw new Error('Chybí potvrzení zápisu');
        receipts[id] = true;
        delete pending[id];
        persist();
        status(id, 'saved');
        return true;
      } catch {
        status(id, 'pending');
        return false;
      } finally { clearTimeout(timeout); }
    })();
    running.set(id, task);
    task.finally(() => running.delete(id));
    return task;
  }
  window.KGResults = {
    submit(payload) {
      if (!payload?.game_id || !payload?.konec) return Promise.resolve(false);
      const id = payload.game_id;
      if (!receipts[id] && !pending[id]) { pending[id] = {...payload}; persist(); }
      return send(id);
    },
    status(id) { return receipts[id] ? 'saved' : (statuses.get(id) || 'pending'); },
    retry() { return Promise.all(Object.keys(pending).map(send)); }
  };
  window.addEventListener('online', () => window.KGResults.retry());
  // Obnovuje pouze odesílání již dokončených výsledků.
  window.KGResults.retry();
})();
