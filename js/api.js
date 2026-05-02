// ─── Config ──────────────────────────────────────────────
//const API_BASE = 'https://hndads-backend.onrender.com/api/v1';
//const SOCKET_URL = 'https://hndads-backend.onrender.com';
const API_BASE = 'https://hnd-backend-v2.onrender.com/api/v1';
const SOCKET_URL = 'https://hnd-backend-v2.onrender.com';
// ─── Token helpers ────────────────────────────────────────
const Auth = {
  getToken: () => localStorage.getItem('hnd_token'),
  setToken: (t) => { localStorage.setItem('hnd_token', t); localStorage.setItem('hnd_token_time', Date.now()); },
  getUser: () => { try { return JSON.parse(localStorage.getItem('hnd_user')) || null; } catch { return null; } },
  setUser: (u) => localStorage.setItem('hnd_user', JSON.stringify(u)),
  clear: () => {
    localStorage.removeItem('hnd_token');
    localStorage.removeItem('hnd_user');
    localStorage.removeItem('hnd_token_time');
    localStorage.removeItem('hnd_remember');
  },
  isLoggedIn: () => {
    const token = localStorage.getItem('hnd_token');
    if (!token) return false;
    const remember = localStorage.getItem('hnd_remember');
    if (!remember) {
      const tokenTime = parseInt(localStorage.getItem('hnd_token_time') || '0');
      if (Date.now() - tokenTime > 8 * 60 * 60 * 1000) { Auth.clear(); return false; }
    }
    return true;
  },
  touchSession: () => { if (localStorage.getItem('hnd_token')) localStorage.setItem('hnd_token_time', Date.now()); },
  setRemember: (val) => val ? localStorage.setItem('hnd_remember', '1') : localStorage.removeItem('hnd_remember'),
};

// ─── API helper ───────────────────────────────────────────
async function api(path, opts = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  Auth.touchSession();
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers,
      body: opts.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { Auth.clear(); if (window._socket) { window._socket.disconnect(); window._socket = null; } showApp('auth'); }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { message: 'Network error. Check connection.' } };
  }
}

async function apiUpload(path, formData) {
  const token = Auth.getToken();
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { message: 'Upload failed.' } };
  }
}

function fileUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${SOCKET_URL}${path}`;
}

// ─── Toast ────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${msg}</span><span class="toast-close" onclick="this.parentElement.remove()">×</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

function openModal(id) { const el = document.getElementById(id); if (el) { el.classList.add('show'); document.body.style.overflow = 'hidden'; } }
function closeModal(id) { const el = document.getElementById(id); if (el) { el.classList.remove('show'); document.body.style.overflow = ''; } }

const State = { projects: [], currentProject: null, teamMembers: [], tasks: [], messages: [], globalMessages: [] };

function showApp(view) {
  document.getElementById('auth-section').style.display = view === 'auth' ? 'flex' : 'none';
  document.getElementById('app-section').style.display = view === 'app' ? 'flex' : 'none';
}

function navigateTo(pageId, projectId = null) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.add('active');
  const nav = document.querySelector(`[data-page="${pageId}"]`);
  if (nav) nav.classList.add('active');

  if (projectId) {
    State.currentProject = State.projects.find(p => p._id === projectId) || State.currentProject;
    loadProjectPage(pageId);
  } else if (pageId === 'dashboard') { loadDashboard(); }
  else if (pageId === 'tasks') { loadTasks(); }
  else if (pageId === 'global-chat') { loadGlobalChat(); if (window._socket?.connected) window._socket.emit('join:global'); }
  else if (pageId === 'search') { /* ready */ }

  updateTopbar(pageId);
}

function updateTopbar(pageId) {
  const titles = {
    dashboard: 'Dashboard', projects: 'Projects', tasks: 'My Tasks', 'global-chat': 'Global Chat', search: 'Search',
    'project-overview': State.currentProject?.name || 'Project',
    'project-chat': (State.currentProject?.name || 'Project') + ' · Chat',
    'project-budget': (State.currentProject?.name || 'Project') + ' · Budget',
    'project-changelog': (State.currentProject?.name || 'Project') + ' · Change Log',
    'project-adcopy': (State.currentProject?.name || 'Project') + ' · Ad Copies',
    'project-keywords': (State.currentProject?.name || 'Project') + ' · Keywords',
    'project-searchterms': (State.currentProject?.name || 'Project') + ' · Search Terms',
    'project-landingpages': (State.currentProject?.name || 'Project') + ' · Landing Pages',
  };
  document.getElementById('topbar-title').textContent = titles[pageId] || pageId;
}

function avatarLetters(name = '') { return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'; }
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function fmtTime(d) { if (!d) return ''; return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }); }
function fmtDateTime(d) { return `${fmtDate(d)}, ${fmtTime(d)}`; }
function statusBadge(status) {
  const map = { active:'badge-green',paused:'badge-yellow',archived:'badge-gray',testing:'badge-blue',inactive:'badge-gray',pending:'badge-yellow',in_progress:'badge-blue',done:'badge-green',low:'badge-gray',medium:'badge-accent',high:'badge-yellow',urgent:'badge-red',excluded:'badge-red',added_as_keyword:'badge-green',broad:'badge-gray',phrase:'badge-blue',exact:'badge-accent',broad_modified:'badge-yellow' };
  return `<span class="badge ${map[status] || 'badge-gray'}">${status?.replace(/_/g,' ') || '—'}</span>`;
}
function fmtCurrency(amount, currency = 'INR') {
  if (amount === null || amount === undefined) return '—';
  const sym = { INR: '₹', USD: '$', AUD: 'A$' };
  return `${sym[currency] || ''}${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
function debounce(fn, ms) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }
document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown')) document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
});

// ─── Socket.io Real-Time Manager ─────────────────────────
const SocketManager = {
  connect() {
    const token = Auth.getToken();
    if (!token || window._socket?.connected) return;
    if (typeof io === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
      script.onload = () => this._doConnect(token);
      document.head.appendChild(script);
    } else {
      this._doConnect(token);
    }
  },

  _doConnect(token) {
    if (window._socket?.connected) return;
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    window._socket = socket;

    socket.on('connect', () => {
      this._setStatus(true);
      if (State.currentProject) socket.emit('join:project', State.currentProject._id);
      socket.emit('join:global');
    });

    socket.on('disconnect', () => this._setStatus(false));

    socket.on('message:new', (msg) => {
      if (!State.currentProject || msg.project !== State.currentProject._id) return;
      if (State.messages.find(m => m._id === msg._id)) return;
      State.messages.push(msg);
      const container = document.getElementById('chat-messages-list');
      if (!container) return;
      const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      appendMessage('chat-messages-list', msg, State.currentProject._id);
      if (atBottom) scrollChatToBottom('chat-messages-list'); else showNewMsgBadge('chat-messages-list');
    });

    socket.on('global:new', (msg) => {
      if (State.globalMessages.find(m => m._id === msg._id)) return;
      State.globalMessages.push(msg);
      const container = document.getElementById('global-chat-list');
      if (!container) return;
      const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      appendMessage('global-chat-list', msg, null);
      if (atBottom) scrollChatToBottom('global-chat-list'); else showNewMsgBadge('global-chat-list');
    });

    socket.on('notification:new', (notif) => {
      const badge = document.getElementById('notif-count-badge');
      if (badge) {
        const cur = parseInt(badge.textContent || '0');
        badge.textContent = cur + 1;
        badge.style.display = 'flex';
      }
      showToast(notif.message || 'New notification', 'info');
    });

    // Fix #3 & #4: Server tells us our role in a project changed → apply immediately
    socket.on('project:role_changed', ({ projectId, userId, newRole }) => {
      const me = Auth.getUser();
      if (!me || userId !== me._id) return; // only care about our own role change
      if (State.currentProject?._id === projectId) {
        State.myProjectRole = newRole;
        showToast(`Your role has been changed to: ${newRole}`, 'info');
        if (typeof enforceViewerPermissions === 'function') enforceViewerPermissions();
        // Re-render members list to reflect new role badge
        if (State.currentProject) renderMembersList(State.currentProject);
      }
      // Update role in projects list too
      State.projects = State.projects.map(p => {
        if (p._id !== projectId) return p;
        return { ...p, members: (p.members || []).map(m => m.user?._id === userId ? { ...m, role: newRole } : m) };
      });
    });

    // Fix #5 & #6: Server tells us we were removed from a project → redirect immediately
    socket.on('project:member_removed', ({ projectId, userId }) => {
      const me = Auth.getUser();
      if (!me || userId !== me._id) return; // only care about our own removal
      State.projects = State.projects.filter(p => p._id !== projectId);
      if (State.currentProject?._id === projectId) {
        State.currentProject = null;
        State.myProjectRole = null;
        showToast('You have been removed from this project.', 'warning');
        if (typeof navigateTo === 'function') navigateTo('projects');
        if (typeof renderProjectsPage === 'function') renderProjectsPage();
        if (typeof renderSidebarProjects === 'function') renderSidebarProjects();
      }
    });

    socket.on('typing:start', ({ name, projectId }) => {
      if (State.currentProject?._id === projectId) showTypingIndicator(name, 'chat-messages-list');
    });
    socket.on('typing:stop', () => hideTypingIndicator());

    socket.on('message:reactions:updated', ({ messageId, reactions }) => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
        const r = el.querySelector('.msg-reactions') || (() => { const d = document.createElement('div'); d.className='msg-reactions'; el.appendChild(d); return d; })();
        r.innerHTML = reactions.map(rx => `<button class="msg-reaction-btn">${rx.emoji} ${rx.users.length}</button>`).join('');
      }
    });

    socket.on('message:edited', (msg) => {
      const el = document.getElementById(`msg-${msg._id}`);
      if (el) { const s = el.querySelector('.msg-content-text'); if (s) s.textContent = msg.content; }
    });

    socket.on('message:deleted', ({ messageId }) => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) el.querySelector('.msg-bubble').innerHTML = '<span style="font-style:italic;color:var(--text-muted);opacity:0.6">🗑️ Message deleted</span>';
    });

    socket.on('online:users', (userIds) => {
      document.querySelectorAll('[data-user-id]').forEach(el => {
        el.classList.toggle('is-online', userIds.includes(el.dataset.userId));
      });
    });
  },

  disconnect() {
    if (window._socket) { window._socket.disconnect(); window._socket = null; }
  },

  joinProject(id) { if (window._socket?.connected) window._socket.emit('join:project', id); },
  leaveProject(id) { if (window._socket?.connected) window._socket.emit('leave:project', id); },
  startTyping(id) { if (window._socket?.connected) window._socket.emit('typing:start', { projectId: id }); },
  stopTyping(id) { if (window._socket?.connected) window._socket.emit('typing:stop', { projectId: id }); },

  _setStatus(ok) {
    const d = document.getElementById('socket-status');
    if (d) { d.title = ok ? 'Live — real-time connected' : 'Reconnecting…'; d.className = `socket-dot ${ok ? 'online' : 'offline'}`; }
  },
};

// ─── New message badge ─────────────────────────────────────
function showNewMsgBadge(containerId) {
  const existing = document.getElementById(`${containerId}-new-badge`);
  if (existing) return;
  const container = document.getElementById(containerId);
  if (!container || !container.parentElement) return;
  const badge = document.createElement('button');
  badge.id = `${containerId}-new-badge`;
  badge.className = 'new-msg-badge';
  badge.innerHTML = '↓ New messages';
  badge.onclick = () => { scrollChatToBottom(containerId); badge.remove(); };
  container.parentElement.style.position = 'relative';
  container.parentElement.appendChild(badge);
  container.addEventListener('scroll', function onScroll() {
    if (container.scrollHeight - container.scrollTop - container.clientHeight < 50) { badge.remove(); container.removeEventListener('scroll', onScroll); }
  });
}

// ─── Typing indicator ─────────────────────────────────────
let _typingTimeout = null;
function showTypingIndicator(name, containerId) {
  let el = document.getElementById('typing-indicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'typing-indicator';
    el.className = 'typing-indicator';
    const container = document.getElementById(containerId);
    if (container) container.appendChild(el);
  }
  el.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span> <span>${name} is typing…</span>`;
  el.style.display = 'flex';
  clearTimeout(_typingTimeout);
  _typingTimeout = setTimeout(() => { if (el) el.style.display = 'none'; }, 3000);
}
function hideTypingIndicator() { const el = document.getElementById('typing-indicator'); if (el) el.style.display = 'none'; }

// ─── Background sync (silent, idle-aware) ─────────────────
const BackgroundSync = {
  _intervals: [],
  start() {
    this._add(() => this._syncNotifs(), 15000);
    this._add(() => {
      const p = document.querySelector('.page.active');
      if (p?.id === 'page-dashboard') loadDashboard();
    }, 60000);
  },
  stop() { this._intervals.forEach(clearInterval); this._intervals = []; },
  _add(fn, ms) {
    const id = setInterval(() => {
      if (typeof requestIdleCallback !== 'undefined') requestIdleCallback(() => fn(), { timeout: ms });
      else fn();
    }, ms);
    this._intervals.push(id);
  },
  async _syncNotifs() {
    if (!Auth.isLoggedIn()) return;
    const { ok, data } = await api('/notifications');
    if (!ok) return;
    const badge = document.getElementById('notif-count-badge');
    if (badge) { badge.textContent = data.unread || ''; badge.style.display = data.unread > 0 ? 'flex' : 'none'; }
  },
};
