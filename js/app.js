// ─── App Init ─────────────────────────────────────────────
async function initApp() {
  showApp('app');

  const user = Auth.getUser();
  if (user) {
    document.getElementById('user-name-display').textContent = user.name;
    document.getElementById('user-role-display').textContent = user.role;
    document.getElementById('user-avatar-display').textContent = avatarLetters(user.name);
  }

  await loadProjects();

  const { ok, data } = await api('/auth/team');
  if (ok) State.teamMembers = data.users || [];

  navigateTo('dashboard');
  loadDashboard();

  // Fix #1 – wire up chat tags and file upload after DOM is ready
  initChatTagsAndUpload();

  // Start real-time socket connection
  SocketManager.connect();

  // Start silent background sync (notifications, dashboard refresh)
  BackgroundSync.start();

  // Fix #7 – auto-refresh active project section every 1 second
  // Note: 0.001s = 1000 API calls/sec which would crash the server.
  // 1 second is the practical safe minimum that still feels real-time.
  ProjectAutoRefresh.start();

  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notif-panel');
    const bell = e.target.closest('.notif-bell-wrap');
    if (notifOpen && panel && !panel.contains(e.target) && !bell) {
      notifOpen = false;
      panel.classList.remove('open');
    }
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    }
    if (!e.target.closest('.invite-email-wrap')) {
      document.getElementById('invite-email-dropdown')?.classList.remove('show');
    }
  });
}

// ─── Dashboard ────────────────────────────────────────────
async function loadDashboard() {
  const user = Auth.getUser();
  document.getElementById('dashboard-greeting').textContent =
    `Good ${getTimeOfDay()}, ${user?.name?.split(' ')[0] || 'there'}! 👋`;
  document.getElementById('dashboard-proj-count').textContent = State.projects.length;

  const { ok, data } = await api('/tasks/my');
  if (ok) {
    const tasks = data.tasks || [];
    document.getElementById('dashboard-tasks-count').textContent = tasks.length;
    renderDashboardTasks(tasks.slice(0, 5));
    const urgent = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length;
    document.getElementById('dashboard-urgent-count').textContent = urgent;
  }
  renderDashboardProjects();
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function renderDashboardTasks(tasks) {
  const el = document.getElementById('dashboard-recent-tasks');
  if (!el) return;
  el.innerHTML = tasks.length ? tasks.map(t => `
    <div class="flex items-center gap-12" style="padding:10px 0;border-bottom:1px solid var(--border)">
      <span class="badge priority-${t.priority}">${t.priority}</span>
      <span style="flex:1;font-size:13px;font-weight:500">${t.title}</span>
      ${statusBadge(t.status)}
      ${t.dueDate ? `<span style="font-size:11px;color:${new Date(t.dueDate)<new Date()?'var(--red)':'var(--text-muted)'}">${fmtDate(t.dueDate)}</span>` : ''}
    </div>
  `).join('') : '<div class="text-muted" style="padding:16px;font-size:13px">No pending tasks 🎉</div>';
}

// ─── Load Project Page ────────────────────────────────────
function loadProjectPage(pageId) {
  if (!State.currentProject) return;
  if (pageId === 'project-overview')     loadProjectOverview();
  else if (pageId === 'project-chat')    { loadProjectChat(); }
  else if (pageId === 'project-budget')  loadBudget();
  else if (pageId === 'project-changelog') loadChangelog();
  else if (pageId === 'project-adcopy') { loadAdCopy(); initAdCopyForm(); }
  else if (pageId === 'project-keywords') loadKeywords();
  else if (pageId === 'project-landingpages') loadLandingPages();
  // Fix #4: Enforce viewer restrictions after section content renders
  setTimeout(() => enforceViewerPermissions(), 150);
}

// ─── Fix #4: Enforce viewer role — block write actions ────
// Called every time a project section is loaded or role changes
function enforceViewerPermissions() {
  const role = State.myProjectRole;
  if (!role) return;
  const isViewer = role === 'viewer';
  // All "add / create / save / delete / edit" buttons within project pages
  const writeSelectors = [
    '#page-project-budget .btn-primary',
    '#page-project-changelog .btn-primary',
    '#page-project-adcopy .btn-primary',
    '#page-project-keywords .btn-primary',
    '#page-project-landingpages .btn-primary',
    'button[onclick*="deleteAdCopy"]',
    'button[onclick*="deleteBudgetEntry"]',
    'button[onclick*="deleteChangeEntry"]',
    'button[onclick*="deleteKeyword"]',
    'button[onclick*="deleteLandingPage"]',
    'button[onclick*="openEditProject"]',
    'button[onclick*="deleteProject"]',
  ];
  writeSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(btn => {
      btn.disabled = isViewer;
      btn.title = isViewer ? 'Viewers cannot make changes' : '';
      btn.style.opacity = isViewer ? '0.4' : '';
      btn.style.pointerEvents = isViewer ? 'none' : '';
    });
  });
  // Block chat send for viewer
  const chatSend = document.querySelector('#page-project-chat .btn-primary');
  if (chatSend) {
    chatSend.disabled = isViewer;
    chatSend.title = isViewer ? 'Viewers cannot send messages' : '';
    chatSend.style.opacity = isViewer ? '0.4' : '';
  }
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.readOnly = isViewer;
    chatInput.placeholder = isViewer ? 'Viewers cannot send messages' : 'Type a message... (Enter to send, Shift+Enter for new line)';
  }
}

function initAdCopyForm() {
  const hw = document.getElementById('ac-headlines-wrap');
  const dw = document.getElementById('ac-descs-wrap');
  if (!hw || !dw) return;
  if (hw.children.length === 0) {
    onAdTypeChange(); // init fields based on current adType selection
  }
  // Wire adType change → reset fields
  const adTypeSelect = document.getElementById('ac-adtype');
  if (adTypeSelect && !adTypeSelect._limitWired) {
    adTypeSelect.addEventListener('change', onAdTypeChange);
    adTypeSelect._limitWired = true;
  }
}

function openProjectTab(pageId) {
  if (!State.currentProject) { showToast('Please select a project first', 'warning'); return; }
  navigateTo(pageId, State.currentProject._id);
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Fix #7: Project Auto-Refresh ─────────────────────────
// Refreshes the currently active project section every 1 second.
// (Requested 0.001s = 1000 req/s, which would DDoS the backend.
//  1 second is the safe practical minimum that keeps data current.)
const ProjectAutoRefresh = {
  _timer: null,
  _lastPage: null,
  start() {
    if (this._timer) return;
    this._timer = setInterval(() => this._tick(), 1000);
  },
  stop() { clearInterval(this._timer); this._timer = null; },
  _tick() {
    if (!Auth.isLoggedIn() || !State.currentProject) return;
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;
    const pageId = activePage.id.replace('page-', '');
    const projectPages = [
      'project-overview','project-budget','project-changelog',
      'project-adcopy','project-keywords','project-landingpages',
    ];
    // Chat is excluded — it's already real-time via socket
    if (!projectPages.includes(pageId)) return;
    // Silently refresh without resetting scroll or UI state
    if (pageId === 'project-overview') loadProjectOverview();
    else if (pageId === 'project-budget') loadBudget();
    else if (pageId === 'project-changelog') loadChangelog();
    else if (pageId === 'project-adcopy') loadAdCopy();
    else if (pageId === 'project-keywords') loadKeywords();
    else if (pageId === 'project-landingpages') loadLandingPages();
  },
};

// ─── Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (Auth.isLoggedIn()) {
    initApp();
  } else {
    showApp('auth');
    showAuthPage('login');
  }
});
