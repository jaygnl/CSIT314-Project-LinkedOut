/* =============================================
   LinkedOut – Notifications dropdown (shared)
   Turns the header bell into a working dropdown:
   candidates see application outcomes + new matching
   jobs; employers see new applicants. The badge only
   shows when there are genuinely unread notifications.
   ============================================= */

(function () {
  if (typeof API === 'undefined' || !API.getToken()) return;

  const btn = document.getElementById('notificationsNavBtn') || document.getElementById('navNotifications');
  if (!btn) return;
  btn.style.position = 'relative';

  // Reuse the existing badge span if present, else create one. Start hidden
  // (this removes the hardcoded placeholder count).
  let badge = btn.querySelector('.notif-badge');
  if (!badge) { badge = document.createElement('span'); badge.className = 'notif-badge'; btn.appendChild(badge); }
  badge.textContent = '';
  badge.style.display = 'none';

  // Dropdown panel lives on <body> (so its links are real, clickable anchors).
  const panel = document.createElement('div');
  panel.setAttribute('role', 'menu');
  panel.style.cssText = [
    'position:fixed', 'width:330px', 'max-height:440px', 'overflow-y:auto',
    'background:var(--card-bg)', 'border:1px solid var(--border)', 'border-radius:12px',
    'box-shadow:0 12px 34px rgba(0,0,0,0.18)', 'z-index:1000', 'display:none', 'padding:6px',
  ].join(';');
  document.body.appendChild(panel);

  let open = false;
  let data = { notifications: [], unreadCount: 0 };

  const esc = (s) => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  function timeAgo(iso) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60); if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }

  function setBadge(n) {
    if (n > 0) { badge.textContent = n > 9 ? '9+' : String(n); badge.style.display = 'flex'; }
    else { badge.style.display = 'none'; }
  }

  function render() {
    if (!data.notifications.length) {
      panel.innerHTML = '<div style="padding:22px 14px;text-align:center;color:var(--text-muted);font-size:13px;">🔕 No notifications yet</div>';
      return;
    }
    panel.innerHTML =
      '<div style="padding:10px 12px;font-weight:800;font-size:13px;border-bottom:1px solid var(--border);margin-bottom:4px;">Notifications</div>' +
      data.notifications.map(n => `
        <a href="${esc(n.link)}" style="display:flex;gap:10px;padding:10px 12px;text-decoration:none;color:var(--text-main);border-radius:8px;${n.unread ? 'background:var(--primary-light);' : ''}">
          <span style="font-size:18px;line-height:1.2;">${n.icon || '🔔'}</span>
          <span style="flex:1;min-width:0;">
            <span style="display:block;font-weight:700;font-size:13px;">${esc(n.title)}</span>
            <span style="display:block;font-size:12px;color:var(--text-muted);">${esc(n.body)}</span>
            <span style="display:block;font-size:11px;color:var(--text-soft);margin-top:2px;">${timeAgo(n.at)}</span>
          </span>
          ${n.unread ? '<span style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0;margin-top:4px;"></span>' : ''}
        </a>`).join('');
  }

  function position() {
    const r = btn.getBoundingClientRect();
    panel.style.top = (r.bottom + 8) + 'px';
    panel.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
  }

  function close() { open = false; panel.style.display = 'none'; }

  async function load() {
    try { data = await API.notifications.list(); setBadge(data.unreadCount); render(); }
    catch { /* not signed in / network — leave bell idle */ }
  }

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    open = !open;
    if (!open) { close(); return; }
    position();
    render();
    panel.style.display = 'block';
    // Opening clears the unread state.
    if (data.unreadCount > 0) {
      try { await API.notifications.markSeen(); } catch { /* ignore */ }
      data.notifications = data.notifications.map(n => ({ ...n, unread: false }));
      data.unreadCount = 0;
      setBadge(0);
      render();
    }
  });

  document.addEventListener('click', (e) => {
    if (open && !panel.contains(e.target) && !btn.contains(e.target)) close();
  });
  window.addEventListener('resize', () => { if (open) position(); });

  load();
})();
