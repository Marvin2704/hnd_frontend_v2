// // ─── Projects Module ──────────────────────────────────────

// async function loadProjects() {
//   const { ok, data } = await api('/projects');
//   if (ok) {
//     State.projects = data.projects || [];
//     renderProjectsPage();
//     renderSidebarProjects();
//     renderDashboardProjects();
//   }
// }

// function renderSidebarProjects() {
//   const container = document.getElementById('sidebar-projects-list');
//   if (!container) return;
//   if (!State.projects.length) {
//     container.innerHTML = `<div style="padding:8px 10px;font-size:12px;color:var(--text-muted)">No projects yet</div>`;
//     return;
//   }
//   container.innerHTML = State.projects.map(p => `
//     <div class="sidebar-project-item ${State.currentProject?._id === p._id ? 'active' : ''}"
//          onclick="openProject('${p._id}')">
//       <span class="sidebar-project-dot" style="background:${p.color || '#6366f1'}"></span>
//       <span class="sidebar-project-name">${p.name}</span>
//     </div>
//   `).join('');
// }

// function renderDashboardProjects() {
//   const el = document.getElementById('dashboard-projects-list');
//   if (!el) return;
//   el.innerHTML = State.projects.slice(0, 5).map(p => `
//     <div class="flex items-center gap-12" style="padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="openProject('${p._id}')">
//       <div style="width:10px;height:10px;border-radius:50%;background:${p.color || '#6366f1'};flex-shrink:0"></div>
//       <span style="flex:1;font-size:13px;font-weight:500">${p.name}</span>
//       ${statusBadge(p.status)}
//       <span style="font-size:11px;color:var(--text-muted)">${(p.members||[]).length} members</span>
//     </div>
//   `).join('') || '<div class="text-muted" style="font-size:13px;padding:16px 0">No projects yet.</div>';
// }

// function renderProjectsPage() {
//   const container = document.getElementById('projects-grid');
//   if (!container) return;
//   if (!State.projects.length) {
//     container.innerHTML = `
//       <div class="empty-state" style="grid-column:1/-1">
//         <div class="empty-icon">📁</div>
//         <div class="empty-title">No projects yet</div>
//         <div class="empty-desc">Create your first project to start tracking your Google Ads campaigns.</div>
//         <button class="btn btn-primary mt-8" onclick="openModal('modal-create-project')">+ New Project</button>
//       </div>`;
//     return;
//   }
//   container.innerHTML = State.projects.map(p => {
//     const myMember = p.members?.find(m => m.user?._id === Auth.getUser()?._id);
//     const myRole = myMember?.role || 'viewer';
//     return `
//     <div class="project-card card" style="border-top:3px solid ${p.color || '#6366f1'}; cursor:pointer"
//          onclick="openProject('${p._id}')">
//       <div class="card-header">
//         <div>
//           <div class="card-title">${p.name}</div>
//           <div class="card-subtitle">${p.description || 'No description'}</div>
//         </div>
//         <div class="dropdown">
//           <button class="btn btn-ghost btn-icon" onclick="event.stopPropagation();toggleDropdown('proj-menu-${p._id}')">⋮</button>
//           <div class="dropdown-menu" id="proj-menu-${p._id}">
//             <div class="dropdown-item" onclick="event.stopPropagation();openProject('${p._id}')">📊 Overview</div>
//             ${myRole !== 'viewer' ? `<div class="dropdown-item" onclick="event.stopPropagation();openEditProject('${p._id}')">✏️ Edit</div>` : ''}
//             ${myRole === 'owner' ? `<div class="dropdown-divider"></div><div class="dropdown-item danger" onclick="event.stopPropagation();deleteProject('${p._id}')">🗑️ Delete</div>` : ''}
//           </div>
//         </div>
//       </div>
//       <div class="flex gap-8 mb-16" style="flex-wrap:wrap">
//         ${statusBadge(p.status)}
//         <span class="badge badge-gray">💰 ${fmtCurrency(p.monthlyBudget, p.currency)}/mo</span>
//         <span class="badge badge-gray">🕐 ${p.timezone}</span>
//         <span class="badge ${myRole === 'owner' ? 'badge-owner' : myRole === 'editor' ? 'badge-editor' : 'badge-viewer'}">${myRole}</span>
//       </div>
//       <div class="flex items-center justify-between">
//         <div class="flex" style="margin-left:4px">
//           ${(p.members || []).slice(0,4).map(m => `
//             <div style="width:26px;height:26px;border-radius:50%;background:var(--accent-dim);
//               display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--accent);
//               border:2px solid var(--bg-card);margin-left:-8px" title="${m.user?.name || ''}">
//               ${avatarLetters(m.user?.name || '')}
//             </div>
//           `).join('')}
//           ${p.members?.length > 4 ? `<span style="font-size:11px;color:var(--text-muted);margin-left:6px">+${p.members.length-4}</span>` : ''}
//         </div>
//         <span style="font-size:11px;color:var(--text-muted)">${fmtDate(p.createdAt)}</span>
//       </div>
//     </div>`;
//   }).join('');
// }

// function toggleDropdown(id) {
//   const menu = document.getElementById(id);
//   if (!menu) return;
//   document.querySelectorAll('.dropdown-menu.open').forEach(m => { if (m.id !== id) m.classList.remove('open'); });
//   menu.classList.toggle('open');
// }

// function openProject(projectId) {
//   State.currentProject = State.projects.find(p => p._id === projectId);
//   if (!State.currentProject) return;
//   renderSidebarProjects();
//   navigateTo('project-overview');
//   loadProjectOverview();
// }

// // ─── Project Overview ─────────────────────────────────────
// async function loadProjectOverview() {
//   if (!State.currentProject) return;
//   // Re-fetch to get latest data including myRole
//   const { ok, data } = await api(`/projects/${State.currentProject._id}`);
//   if (ok) {
//     State.currentProject = data.project;
//     State.myProjectRole = data.myRole;
//     State.projects = State.projects.map(p => p._id === data.project._id ? data.project : p);
//   }
//   const p = State.currentProject;

//   document.getElementById('proj-overview-name').textContent = p.name;
//   document.getElementById('proj-overview-desc').textContent = p.description || 'No description';
//   document.getElementById('proj-overview-status').innerHTML = statusBadge(p.status);
//   document.getElementById('proj-overview-budget').textContent = fmtCurrency(p.monthlyBudget, p.currency);
//   document.getElementById('proj-overview-timezone').textContent = p.timezone;
//   document.getElementById('proj-overview-currency').textContent = p.currency;

//   // Show/hide edit button based on role
//   const editBtn = document.querySelector('[onclick*="openEditProject"]');
//   if (editBtn) editBtn.style.display = State.myProjectRole === 'viewer' ? 'none' : '';

//   renderMembersList(p);
//   loadProjectSummaryCounts(p._id);
//   // Fix #4: Apply viewer restrictions based on loaded role
//   if (typeof enforceViewerPermissions === 'function') enforceViewerPermissions();
// }

// function renderMembersList(p) {
//   const membersEl = document.getElementById('proj-members-list');
//   const myRole = State.myProjectRole;
//   membersEl.innerHTML = (p.members || []).map(m => {
//     const roleClass = m.role === 'owner' ? 'badge-owner' : m.role === 'editor' ? 'badge-editor' : 'badge-viewer';
//     const canChangeRole = myRole === 'owner' && m.user?._id !== Auth.getUser()?._id;
//     return `
//     <div class="flex items-center gap-12" style="padding:12px 0;border-bottom:1px solid var(--border)">
//       <div class="user-avatar" style="width:36px;height:36px;font-size:14px">${avatarLetters(m.user?.name || '')}</div>
//       <div style="flex:1">
//         <div style="font-weight:600;font-size:14px">${m.user?.name || 'Unknown'}</div>
//         <div style="font-size:12px;color:var(--text-muted)">${m.user?.email || ''}</div>
//       </div>
//       ${canChangeRole ? `
//         <select class="form-select" style="width:110px;font-size:12px;padding:4px 8px" onchange="changeMemberRole('${m.user?._id}', this.value)">
//           <option value="owner" ${m.role === 'owner' ? 'selected' : ''}>Owner</option>
//           <option value="editor" ${m.role === 'editor' ? 'selected' : ''}>Editor</option>
//           <option value="viewer" ${m.role === 'viewer' ? 'selected' : ''}>Viewer</option>
//         </select>
//         <button class="btn btn-ghost btn-sm btn-icon" onclick="removeMemberFromProject('${m.user?._id}')" title="Remove">✕</button>
//       ` : `<span class="badge ${roleClass}">${m.role}</span>`}
//     </div>`;
//   }).join('');
// }

// async function changeMemberRole(userId, newRole) {
//   if (!State.currentProject) return;
//   const { ok, data } = await api(`/projects/${State.currentProject._id}/members/${userId}`, {
//     method: 'PUT', body: { role: newRole },
//   });
//   if (ok) {
//     showToast('Role updated!', 'success');
//     State.currentProject = data.project;
//     State.projects = State.projects.map(p => p._id === data.project._id ? data.project : p);
//     // Fix #3: Re-derive myRole from fresh project data immediately
//     const me = Auth.getUser();
//     const myMember = data.project.members?.find(m => m.user?._id === me?._id);
//     if (myMember) {
//       State.myProjectRole = myMember.role;
//       // Fix #4: Apply viewer restrictions immediately without page refresh
//       if (typeof enforceViewerPermissions === 'function') enforceViewerPermissions();
//     }
//     renderMembersList(data.project);
//   } else showToast(data.message || 'Failed to update role', 'error');
// }

// async function removeMemberFromProject(userId) {
//   if (!State.currentProject) return;
//   if (!confirm('Remove this member from the project?')) return;
//   const { ok, data } = await api(`/projects/${State.currentProject._id}/members/${userId}`, { method: 'DELETE' });
//   if (ok) {
//     showToast('Member removed', 'info');
//     const me = Auth.getUser();
//     // Fix #5 & #6: If the removed user IS the current user, kick them out immediately
//     if (userId === me?._id) {
//       State.currentProject = null;
//       State.myProjectRole = null;
//       State.projects = State.projects.filter(p => p._id !== (data.project?._id || ''));
//       showToast('You have been removed from this project.', 'warning');
//       navigateTo('projects');
//       renderProjectsPage();
//       renderSidebarProjects();
//       return;
//     }
//     State.currentProject = data.project;
//     State.projects = State.projects.map(p => p._id === data.project._id ? data.project : p);
//     renderMembersList(data.project);
//   } else showToast(data.message || 'Failed', 'error');
// }

// async function loadProjectSummaryCounts(projectId) {
//   const [budgetRes, changeRes] = await Promise.all([
//     api(`/projects/${projectId}/budget/latest`),
//     api(`/projects/${projectId}/changelog?limit=5`),
//   ]);

//   if (budgetRes.ok && budgetRes.data.entry) {
//     const e = budgetRes.data.entry;
//     const cur = State.currentProject?.currency;
//     document.getElementById('stat-yesterday-spend').textContent = fmtCurrency(e.yesterdaySpend, cur);
//     document.getElementById('stat-today-allowed').textContent = fmtCurrency(e.todayAllowed, cur);
//     document.getElementById('stat-monthly-target').textContent = fmtCurrency(e.monthlyTarget, cur);
//     const pct = e.monthlyTarget > 0 ? Math.min(100, Math.round((e.monthSpentSoFar / e.monthlyTarget) * 100)) : 0;
//     document.getElementById('stat-budget-progress').style.width = pct + '%';
//     document.getElementById('stat-budget-pct').textContent = pct + '%';
//     const barEl = document.getElementById('stat-budget-progress');
//     barEl.className = 'progress-bar ' + (pct > 90 ? 'red' : pct > 70 ? 'yellow' : 'green');
//   }

//   if (changeRes.ok) {
//     const recentEl = document.getElementById('recent-changes-list');
//     const entries = changeRes.data.entries || [];
//     recentEl.innerHTML = entries.length ? entries.map(e => `
//       <div class="flex items-center gap-12" style="padding:10px 0;border-bottom:1px solid var(--border)">
//         <div>
//           <div style="font-size:13px;font-weight:600">${e.type?.replace(/_/g,' ')}</div>
//           <div style="font-size:12px;color:var(--text-muted)">${e.campaign || '—'} · ${fmtDate(e.date)}</div>
//         </div>
//         <span class="badge badge-accent" style="margin-left:auto">${e.type?.split('_')[0]}</span>
//       </div>
//     `).join('') : '<div class="text-muted" style="font-size:13px;padding:16px 0">No changes logged yet.</div>';
//   }
// }

// // ─── Create Project ───────────────────────────────────────
// document.getElementById('form-create-project').addEventListener('submit', async (e) => {
//   e.preventDefault();
//   const btn = e.target.querySelector('[type=submit]');
//   btn.disabled = true; btn.textContent = 'Creating...';

//   const { ok, data } = await api('/projects', {
//     method: 'POST',
//     body: {
//       name: document.getElementById('cp-name').value.trim(),
//       description: document.getElementById('cp-desc').value.trim(),
//       timezone: document.getElementById('cp-timezone').value,
//       monthlyBudget: parseFloat(document.getElementById('cp-budget').value) || 0,
//       currency: document.getElementById('cp-currency').value,
//       color: document.getElementById('cp-color').value,
//     },
//   });

//   btn.disabled = false; btn.textContent = 'Create Project';
//   if (ok) {
//     showToast('Project created!', 'success');
//     closeModal('modal-create-project');
//     e.target.reset();
//     await loadProjects();
//     navigateTo('projects');
//   } else showToast(data.message || 'Failed to create project', 'error');
// });

// // ─── Edit Project ─────────────────────────────────────────
// function openEditProject(projectId) {
//   const p = State.projects.find(x => x._id === projectId);
//   if (!p) return;
//   document.getElementById('ep-id').value = p._id;
//   document.getElementById('ep-name').value = p.name;
//   document.getElementById('ep-desc').value = p.description || '';
//   document.getElementById('ep-timezone').value = p.timezone;
//   document.getElementById('ep-budget').value = p.monthlyBudget;
//   document.getElementById('ep-currency').value = p.currency;
//   document.getElementById('ep-status').value = p.status;
//   openModal('modal-edit-project');
// }

// document.getElementById('form-edit-project').addEventListener('submit', async (e) => {
//   e.preventDefault();
//   const id = document.getElementById('ep-id').value;
//   const btn = e.target.querySelector('[type=submit]');
//   btn.disabled = true; btn.textContent = 'Saving...';

//   const { ok, data } = await api(`/projects/${id}`, {
//     method: 'PUT',
//     body: {
//       name: document.getElementById('ep-name').value.trim(),
//       description: document.getElementById('ep-desc').value.trim(),
//       timezone: document.getElementById('ep-timezone').value,
//       monthlyBudget: parseFloat(document.getElementById('ep-budget').value) || 0,
//       currency: document.getElementById('ep-currency').value,
//       status: document.getElementById('ep-status').value,
//     },
//   });

//   btn.disabled = false; btn.textContent = 'Save Changes';
//   if (ok) {
//     showToast('Project updated!', 'success');
//     closeModal('modal-edit-project');
//     State.currentProject = data.project;
//     State.projects = State.projects.map(p => p._id === data.project._id ? data.project : p);
//     loadProjectOverview();
//     renderSidebarProjects();
//     renderProjectsPage();
//   } else showToast(data.message || 'Update failed', 'error');
// });

// // ─── Delete Project ───────────────────────────────────────
// async function deleteProject(projectId) {
//   if (!confirm('Delete this project? This cannot be undone.')) return;
//   const { ok, data } = await api(`/projects/${projectId}`, { method: 'DELETE' });
//   if (ok) {
//     showToast('Project deleted', 'info');
//     if (State.currentProject?._id === projectId) State.currentProject = null;
//     await loadProjects();
//     navigateTo('projects');
//   } else showToast(data.message || 'Delete failed', 'error');
// }

// // ─── Invite Member by Email ───────────────────────────────
// const inviteEmailInput = document.getElementById('invite-email-input');
// const inviteEmailDropdown = document.getElementById('invite-email-dropdown');

// if (inviteEmailInput) {
//   inviteEmailInput.addEventListener('input', debounce(function() {
//     const val = this.value.trim().toLowerCase();
//     if (!val || val.length < 2) { inviteEmailDropdown?.classList.remove('show'); return; }

//     // Filter existing team members not in project
//     const projectMemberIds = (State.currentProject?.members || []).map(m => m.user?._id || m.user);
//     const matches = State.teamMembers.filter(u =>
//       !projectMemberIds.includes(u._id) &&
//       (u.email.toLowerCase().includes(val) || u.name.toLowerCase().includes(val))
//     );

//     if (!matches.length) { inviteEmailDropdown?.classList.remove('show'); return; }

//     inviteEmailDropdown.innerHTML = matches.map(u => `
//       <div class="email-option" onclick="selectInviteUser('${u._id}', '${u.email}', '${u.name}')">
//         <div>
//           <div class="eo-name">${u.name}</div>
//           <div class="eo-email">${u.email}</div>
//         </div>
//       </div>
//     `).join('');
//     inviteEmailDropdown.classList.add('show');
//   }, 300));
// }

// function selectInviteUser(id, email, name) {
//   if (inviteEmailInput) inviteEmailInput.value = email;
//   document.getElementById('invite-user-id').value = id;
//   inviteEmailDropdown?.classList.remove('show');
// }

// document.getElementById('form-invite-member')?.addEventListener('submit', async (e) => {
//   e.preventDefault();
//   if (!State.currentProject) return;
//   const btn = e.target.querySelector('[type=submit]');
//   btn.disabled = true; btn.textContent = 'Sending...';

//   const email = document.getElementById('invite-email-input').value.trim();
//   const role = document.getElementById('invite-role').value;
//   const userId = document.getElementById('invite-user-id').value;

//   if (!email) { showToast('Enter an email address', 'error'); btn.disabled = false; btn.textContent = 'Send Invite'; return; }

//   // If we have a userId (selected from dropdown), send as direct add with notification approach
//   const { ok, data } = await api('/notifications/invite', {
//     method: 'POST',
//     body: { email, role, projectId: State.currentProject._id },
//   });

//   btn.disabled = false; btn.textContent = 'Send Invite';
//   if (ok) {
//     showToast(data.message || 'Invite sent!', 'success');
//     closeModal('modal-invite-member');
//     e.target.reset();
//     document.getElementById('invite-user-id').value = '';
//     inviteEmailDropdown?.classList.remove('show');
//   } else showToast(data.message || 'Failed to send invite', 'error');
// });

// // Keep old loadTeamForSelect for backward compat (task modal)
// async function loadTeamForSelect() {
//   const { ok, data } = await api('/auth/team');
//   if (ok) State.teamMembers = data.users || [];
// }

// function populateTaskProjectSelect() {
//   const sel = document.getElementById('task-project');
//   if (!sel) return;
//   sel.innerHTML = '<option value="">No project</option>' +
//     State.projects.map(p => `<option value="${p._id}">${p.name}</option>`).join('');
//   const sel2 = document.getElementById('task-assigned');
//   if (sel2) {
//     sel2.innerHTML = '<option value="">Unassigned</option>' +
//       State.teamMembers.map(u => `<option value="${u._id}">${u.name}</option>`).join('');
//   }
// }

// // ─── Notifications Panel ──────────────────────────────────
// let notifOpen = false;

// function toggleNotifPanel() {
//   notifOpen = !notifOpen;
//   const panel = document.getElementById('notif-panel');
//   if (!panel) return;
//   panel.classList.toggle('open', notifOpen);
//   if (notifOpen) loadNotifications();
// }

// async function loadNotifications() {
//   const { ok, data } = await api('/notifications');
//   if (!ok) return;
//   const badge = document.getElementById('notif-count-badge');
//   if (badge) {
//     badge.textContent = data.unread || '';
//     badge.style.display = data.unread > 0 ? 'flex' : 'none';
//   }
//   const list = document.getElementById('notif-list');
//   if (!list) return;

//   if (!data.notifications?.length) {
//     list.innerHTML = '<div class="empty-state" style="padding:40px"><div class="empty-icon">🔔</div><div class="empty-title">No notifications</div></div>';
//     return;
//   }

//   list.innerHTML = data.notifications.map(n => {
//     const isInvite = n.type === 'project_invite' && n.status === 'pending';
//     return `
//     <div class="notif-item ${!n.read ? 'unread' : ''}" id="notif-${n._id}">
//       <div class="notif-avatar">${avatarLetters(n.from?.name || '?')}</div>
//       <div class="notif-content">
//         <div class="notif-msg">${n.message || 'New notification'}</div>
//         ${n.project ? `<div style="font-size:11px;color:var(--accent);margin-top:2px">📁 ${n.project.name}</div>` : ''}
//         <div class="notif-time">${fmtDateTime(n.createdAt)}</div>
//         ${isInvite ? `
//           <div class="notif-actions">
//             <button class="btn btn-primary btn-sm" onclick="respondInvite('${n._id}', 'accept')">✓ Accept</button>
//             <button class="btn btn-ghost btn-sm" onclick="respondInvite('${n._id}', 'decline')">✕ Decline</button>
//           </div>
//         ` : `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">${n.status !== 'pending' ? '• ' + n.status : ''}</div>`}
//       </div>
//       <button class="btn btn-ghost btn-icon" style="flex-shrink:0;font-size:14px" onclick="deleteNotif('${n._id}')" title="Dismiss">×</button>
//     </div>`;
//   }).join('');

//   // Mark as read
//   if (data.unread > 0) {
//     api('/notifications/read-all', { method: 'PUT' });
//     if (badge) { badge.textContent = ''; badge.style.display = 'none'; }
//   }
// }

// async function respondInvite(notifId, action) {
//   const { ok, data } = await api(`/notifications/${notifId}/respond`, {
//     method: 'PUT', body: { action },
//   });
//   if (ok) {
//     showToast(data.message, action === 'accept' ? 'success' : 'info');
//     if (action === 'accept') await loadProjects();
//     loadNotifications();
//   } else showToast(data.message || 'Failed', 'error');
// }

// async function deleteNotif(id) {
//   await api(`/notifications/${id}`, { method: 'DELETE' });
//   document.getElementById(`notif-${id}`)?.remove();
// }

// // Poll for new notifications every 30s
// async function pollNotifications() {
//   const { ok, data } = await api('/notifications');
//   if (ok) {
//     const badge = document.getElementById('notif-count-badge');
//     if (badge) {
//       badge.textContent = data.unread || '';
//       badge.style.display = data.unread > 0 ? 'flex' : 'none';
//     }
//   }
// }

// ─── Projects Module ──────────────────────────────────────

async function loadProjects() {
  const { ok, data } = await api('/projects');
  if (ok) {
    State.projects = data.projects || [];
    renderProjectsPage();
    renderSidebarProjects();
    renderDashboardProjects();
  }
}

function renderSidebarProjects() {
  const container = document.getElementById('sidebar-projects-list');
  if (!container) return;
  if (!State.projects.length) {
    container.innerHTML = `<div style="padding:8px 10px;font-size:12px;color:var(--text-muted)">No projects yet</div>`;
    return;
  }
  container.innerHTML = State.projects.map(p => `
    <div class="sidebar-project-item ${State.currentProject?._id === p._id ? 'active' : ''}"
         onclick="openProject('${p._id}')">
      <span class="sidebar-project-dot" style="background:${p.color || '#6366f1'}"></span>
      <span class="sidebar-project-name">${p.name}</span>
    </div>
  `).join('');
}

function renderDashboardProjects() {
  const el = document.getElementById('dashboard-projects-list');
  if (!el) return;
  el.innerHTML = State.projects.slice(0, 5).map(p => `
    <div class="flex items-center gap-12" style="padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="openProject('${p._id}')">
      <div style="width:10px;height:10px;border-radius:50%;background:${p.color || '#6366f1'};flex-shrink:0"></div>
      <span style="flex:1;font-size:13px;font-weight:500">${p.name}</span>
      ${statusBadge(p.status)}
      <span style="font-size:11px;color:var(--text-muted)">${(p.members||[]).length} members</span>
    </div>
  `).join('') || '<div class="text-muted" style="font-size:13px;padding:16px 0">No projects yet.</div>';
}

function renderProjectsPage() {
  const container = document.getElementById('projects-grid');
  if (!container) return;
  if (!State.projects.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">📁</div>
        <div class="empty-title">No projects yet</div>
        <div class="empty-desc">Create your first project to start tracking your Google Ads campaigns.</div>
        <button class="btn btn-primary mt-8" onclick="openModal('modal-create-project')">+ New Project</button>
      </div>`;
    return;
  }
  container.innerHTML = State.projects.map(p => {
    const myMember = p.members?.find(m => m.user?._id === Auth.getUser()?._id);
    const myRole = myMember?.role || 'viewer';
    return `
    <div class="project-card card" style="border-top:3px solid ${p.color || '#6366f1'}; cursor:pointer"
         onclick="openProject('${p._id}')">
      <div class="card-header">
        <div>
          <div class="card-title">${p.name}</div>
          <div class="card-subtitle">${p.description || 'No description'}</div>
        </div>
        <div class="dropdown">
          <button class="btn btn-ghost btn-icon" onclick="event.stopPropagation();toggleDropdown('proj-menu-${p._id}')">⋮</button>
          <div class="dropdown-menu" id="proj-menu-${p._id}">
            <div class="dropdown-item" onclick="event.stopPropagation();openProject('${p._id}')">📊 Overview</div>
            ${myRole !== 'viewer' ? `<div class="dropdown-item" onclick="event.stopPropagation();openEditProject('${p._id}')">✏️ Edit</div>` : ''}
            ${myRole === 'owner' ? `<div class="dropdown-divider"></div><div class="dropdown-item danger" onclick="event.stopPropagation();deleteProject('${p._id}')">🗑️ Delete</div>` : ''}
          </div>
        </div>
      </div>
      <div class="flex gap-8 mb-16" style="flex-wrap:wrap">
        ${statusBadge(p.status)}
        <span class="badge badge-gray">💰 ${fmtCurrency(p.monthlyBudget, p.currency)}/mo</span>
        <span class="badge badge-gray">🕐 ${p.timezone}</span>
        <span class="badge ${myRole === 'owner' ? 'badge-owner' : myRole === 'editor' ? 'badge-editor' : 'badge-viewer'}">${myRole}</span>
      </div>
      <div class="flex items-center justify-between">
        <div class="flex" style="margin-left:4px">
          ${(p.members || []).slice(0,4).map(m => `
            <div style="width:26px;height:26px;border-radius:50%;background:var(--accent-dim);
              display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--accent);
              border:2px solid var(--bg-card);margin-left:-8px" title="${m.user?.name || ''}">
              ${avatarLetters(m.user?.name || '')}
            </div>
          `).join('')}
          ${p.members?.length > 4 ? `<span style="font-size:11px;color:var(--text-muted);margin-left:6px">+${p.members.length-4}</span>` : ''}
        </div>
        <span style="font-size:11px;color:var(--text-muted)">${fmtDate(p.createdAt)}</span>
      </div>
    </div>`;
  }).join('');
}

function toggleDropdown(id) {
  const menu = document.getElementById(id);
  if (!menu) return;
  document.querySelectorAll('.dropdown-menu.open').forEach(m => { if (m.id !== id) m.classList.remove('open'); });
  menu.classList.toggle('open');
}

function openProject(projectId) {
  State.currentProject = State.projects.find(p => p._id === projectId);
  if (!State.currentProject) return;
  renderSidebarProjects();
  navigateTo('project-overview');
  loadProjectOverview();
}

// ─── Project Overview ─────────────────────────────────────
async function loadProjectOverview() {
  if (!State.currentProject) return;
  // Re-fetch to get latest data including myRole
  const { ok, data } = await api(`/projects/${State.currentProject._id}`);
  if (ok) {
    State.currentProject = data.project;
    State.myProjectRole = data.myRole;
    State.projects = State.projects.map(p => p._id === data.project._id ? data.project : p);
  }
  const p = State.currentProject;

  document.getElementById('proj-overview-name').textContent = p.name;
  document.getElementById('proj-overview-desc').textContent = p.description || 'No description';
  document.getElementById('proj-overview-status').innerHTML = statusBadge(p.status);
  document.getElementById('proj-overview-budget').textContent = fmtCurrency(p.monthlyBudget, p.currency);
  document.getElementById('proj-overview-timezone').textContent = p.timezone;
  document.getElementById('proj-overview-currency').textContent = p.currency;

  // Show/hide edit button based on role
  const editBtn = document.querySelector('[onclick*="openEditProject"]');
  if (editBtn) editBtn.style.display = State.myProjectRole === 'viewer' ? 'none' : '';

  renderMembersList(p);
  loadProjectSummaryCounts(p._id);
}

function renderMembersList(p) {
  const membersEl = document.getElementById('proj-members-list');
  const myRole = State.myProjectRole;
  membersEl.innerHTML = (p.members || []).map(m => {
    const roleClass = m.role === 'owner' ? 'badge-owner' : m.role === 'editor' ? 'badge-editor' : 'badge-viewer';
    const canChangeRole = myRole === 'owner' && m.user?._id !== Auth.getUser()?._id;
    return `
    <div class="flex items-center gap-12" style="padding:12px 0;border-bottom:1px solid var(--border)">
      <div class="user-avatar" style="width:36px;height:36px;font-size:14px">${avatarLetters(m.user?.name || '')}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:14px">${m.user?.name || 'Unknown'}</div>
        <div style="font-size:12px;color:var(--text-muted)">${m.user?.email || ''}</div>
      </div>
      ${canChangeRole ? `
        <select class="form-select" style="width:110px;font-size:12px;padding:4px 8px" onchange="changeMemberRole('${m.user?._id}', this.value)">
          <option value="owner" ${m.role === 'owner' ? 'selected' : ''}>Owner</option>
          <option value="editor" ${m.role === 'editor' ? 'selected' : ''}>Editor</option>
          <option value="viewer" ${m.role === 'viewer' ? 'selected' : ''}>Viewer</option>
        </select>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="removeMemberFromProject('${m.user?._id}')" title="Remove">✕</button>
      ` : `<span class="badge ${roleClass}">${m.role}</span>`}
    </div>`;
  }).join('');
}

async function changeMemberRole(userId, newRole) {
  if (!State.currentProject) return;
  const { ok, data } = await api(`/projects/${State.currentProject._id}/members/${userId}`, {
    method: 'PUT', body: { role: newRole },
  });
  if (ok) {
    showToast('Role updated!', 'success');
    // Re-fetch to get fully populated members
    const { ok: ok2, data: data2 } = await api(`/projects/${State.currentProject._id}`);
    if (ok2) {
      State.currentProject = data2.project;
      State.myProjectRole = data2.myRole;
      State.projects = State.projects.map(p => p._id === data2.project._id ? data2.project : p);
      renderMembersList(data2.project);
    } else {
      State.currentProject = data.project;
      State.projects = State.projects.map(p => p._id === data.project._id ? data.project : p);
      renderMembersList(data.project);
    }
  } else showToast(data.message || 'Failed to update role', 'error');
}

async function removeMemberFromProject(userId) {
  if (!State.currentProject) return;
  if (!confirm('Remove this member from the project?')) return;
  const { ok, data } = await api(`/projects/${State.currentProject._id}/members/${userId}`, { method: 'DELETE' });
  if (ok) {
    showToast('Member removed', 'info');
    // Re-fetch project to get fully populated member list
    const { ok: ok2, data: data2 } = await api(`/projects/${State.currentProject._id}`);
    if (ok2) {
      State.currentProject = data2.project;
      State.myProjectRole = data2.myRole;
      State.projects = State.projects.map(p => p._id === data2.project._id ? data2.project : p);
      renderMembersList(data2.project);
    } else {
      // fallback to what backend returned
      State.currentProject = data.project;
      State.projects = State.projects.map(p => p._id === data.project._id ? data.project : p);
      renderMembersList(data.project);
    }
  } else showToast(data.message || 'Failed', 'error');
}

async function loadProjectSummaryCounts(projectId) {
  const [budgetRes, changeRes] = await Promise.all([
    api(`/projects/${projectId}/budget/latest`),
    api(`/projects/${projectId}/changelog?limit=5`),
  ]);

  if (budgetRes.ok && budgetRes.data.entry) {
    const e = budgetRes.data.entry;
    const cur = State.currentProject?.currency;
    document.getElementById('stat-yesterday-spend').textContent = fmtCurrency(e.yesterdaySpend, cur);
    document.getElementById('stat-today-allowed').textContent = fmtCurrency(e.todayAllowed, cur);
    document.getElementById('stat-monthly-target').textContent = fmtCurrency(e.monthlyTarget, cur);
    const pct = e.monthlyTarget > 0 ? Math.min(100, Math.round((e.monthSpentSoFar / e.monthlyTarget) * 100)) : 0;
    document.getElementById('stat-budget-progress').style.width = pct + '%';
    document.getElementById('stat-budget-pct').textContent = pct + '%';
    const barEl = document.getElementById('stat-budget-progress');
    barEl.className = 'progress-bar ' + (pct > 90 ? 'red' : pct > 70 ? 'yellow' : 'green');
  }

  if (changeRes.ok) {
    const recentEl = document.getElementById('recent-changes-list');
    const entries = changeRes.data.entries || [];
    recentEl.innerHTML = entries.length ? entries.map(e => `
      <div class="flex items-center gap-12" style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:13px;font-weight:600">${e.type?.replace(/_/g,' ')}</div>
          <div style="font-size:12px;color:var(--text-muted)">${e.campaign || '—'} · ${fmtDate(e.date)}</div>
        </div>
        <span class="badge badge-accent" style="margin-left:auto">${e.type?.split('_')[0]}</span>
      </div>
    `).join('') : '<div class="text-muted" style="font-size:13px;padding:16px 0">No changes logged yet.</div>';
  }
}

// ─── Create Project ───────────────────────────────────────
document.getElementById('form-create-project').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Creating...';

  const { ok, data } = await api('/projects', {
    method: 'POST',
    body: {
      name: document.getElementById('cp-name').value.trim(),
      description: document.getElementById('cp-desc').value.trim(),
      timezone: document.getElementById('cp-timezone').value,
      monthlyBudget: parseFloat(document.getElementById('cp-budget').value) || 0,
      currency: document.getElementById('cp-currency').value,
      color: document.getElementById('cp-color').value,
    },
  });

  btn.disabled = false; btn.textContent = 'Create Project';
  if (ok) {
    showToast('Project created!', 'success');
    closeModal('modal-create-project');
    e.target.reset();
    await loadProjects();
    navigateTo('projects');
  } else showToast(data.message || 'Failed to create project', 'error');
});

// ─── Edit Project ─────────────────────────────────────────
function openEditProject(projectId) {
  const p = State.projects.find(x => x._id === projectId);
  if (!p) return;
  document.getElementById('ep-id').value = p._id;
  document.getElementById('ep-name').value = p.name;
  document.getElementById('ep-desc').value = p.description || '';
  document.getElementById('ep-timezone').value = p.timezone;
  document.getElementById('ep-budget').value = p.monthlyBudget;
  document.getElementById('ep-currency').value = p.currency;
  document.getElementById('ep-status').value = p.status;
  openModal('modal-edit-project');
}

document.getElementById('form-edit-project').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('ep-id').value;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Saving...';

  const { ok, data } = await api(`/projects/${id}`, {
    method: 'PUT',
    body: {
      name: document.getElementById('ep-name').value.trim(),
      description: document.getElementById('ep-desc').value.trim(),
      timezone: document.getElementById('ep-timezone').value,
      monthlyBudget: parseFloat(document.getElementById('ep-budget').value) || 0,
      currency: document.getElementById('ep-currency').value,
      status: document.getElementById('ep-status').value,
    },
  });

  btn.disabled = false; btn.textContent = 'Save Changes';
  if (ok) {
    showToast('Project updated!', 'success');
    closeModal('modal-edit-project');
    State.currentProject = data.project;
    State.projects = State.projects.map(p => p._id === data.project._id ? data.project : p);
    loadProjectOverview();
    renderSidebarProjects();
    renderProjectsPage();
  } else showToast(data.message || 'Update failed', 'error');
});

// ─── Delete Project ───────────────────────────────────────
async function deleteProject(projectId) {
  if (!confirm('Delete this project? This cannot be undone.')) return;
  const { ok, data } = await api(`/projects/${projectId}`, { method: 'DELETE' });
  if (ok) {
    showToast('Project deleted', 'info');
    if (State.currentProject?._id === projectId) State.currentProject = null;
    await loadProjects();
    navigateTo('projects');
  } else showToast(data.message || 'Delete failed', 'error');
}

// ─── Invite Member by Email ───────────────────────────────
const inviteEmailInput = document.getElementById('invite-email-input');
const inviteEmailDropdown = document.getElementById('invite-email-dropdown');

if (inviteEmailInput) {
  inviteEmailInput.addEventListener('input', debounce(function() {
    const val = this.value.trim().toLowerCase();
    if (!val || val.length < 2) { inviteEmailDropdown?.classList.remove('show'); return; }

    // Filter existing team members not in project
    const projectMemberIds = (State.currentProject?.members || []).map(m => m.user?._id || m.user);
    const matches = State.teamMembers.filter(u =>
      !projectMemberIds.includes(u._id) &&
      (u.email.toLowerCase().includes(val) || u.name.toLowerCase().includes(val))
    );

    if (!matches.length) { inviteEmailDropdown?.classList.remove('show'); return; }

    inviteEmailDropdown.innerHTML = matches.map(u => `
      <div class="email-option" onclick="selectInviteUser('${u._id}', '${u.email}', '${u.name}')">
        <div>
          <div class="eo-name">${u.name}</div>
          <div class="eo-email">${u.email}</div>
        </div>
      </div>
    `).join('');
    inviteEmailDropdown.classList.add('show');
  }, 300));
}

function selectInviteUser(id, email, name) {
  if (inviteEmailInput) inviteEmailInput.value = email;
  document.getElementById('invite-user-id').value = id;
  inviteEmailDropdown?.classList.remove('show');
}

document.getElementById('form-invite-member')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!State.currentProject) return;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Sending...';

  const email = document.getElementById('invite-email-input').value.trim();
  const role = document.getElementById('invite-role').value;
  const userId = document.getElementById('invite-user-id').value;

  if (!email) { showToast('Enter an email address', 'error'); btn.disabled = false; btn.textContent = 'Send Invite'; return; }

  // If we have a userId (selected from dropdown), send as direct add with notification approach
  const { ok, data } = await api('/notifications/invite', {
    method: 'POST',
    body: { email, role, projectId: State.currentProject._id },
  });

  btn.disabled = false; btn.textContent = 'Send Invite';
  if (ok) {
    showToast(data.message || 'Invite sent!', 'success');
    closeModal('modal-invite-member');
    e.target.reset();
    document.getElementById('invite-user-id').value = '';
    inviteEmailDropdown?.classList.remove('show');
  } else showToast(data.message || 'Failed to send invite', 'error');
});

// Keep old loadTeamForSelect for backward compat (task modal)
async function loadTeamForSelect() {
  const { ok, data } = await api('/auth/team');
  if (ok) State.teamMembers = data.users || [];
}

function populateTaskProjectSelect() {
  const sel = document.getElementById('task-project');
  if (!sel) return;
  sel.innerHTML = '<option value="">No project</option>' +
    State.projects.map(p => `<option value="${p._id}">${p.name}</option>`).join('');
  const sel2 = document.getElementById('task-assigned');
  if (sel2) {
    sel2.innerHTML = '<option value="">Unassigned</option>' +
      State.teamMembers.map(u => `<option value="${u._id}">${u.name}</option>`).join('');
  }
}

// ─── Notifications Panel ──────────────────────────────────
let notifOpen = false;

function toggleNotifPanel() {
  notifOpen = !notifOpen;
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  panel.classList.toggle('open', notifOpen);
  if (notifOpen) loadNotifications();
}

async function loadNotifications() {
  const { ok, data } = await api('/notifications');
  if (!ok) return;
  const badge = document.getElementById('notif-count-badge');
  if (badge) {
    badge.textContent = data.unread || '';
    badge.style.display = data.unread > 0 ? 'flex' : 'none';
  }
  const list = document.getElementById('notif-list');
  if (!list) return;

  if (!data.notifications?.length) {
    list.innerHTML = '<div class="empty-state" style="padding:40px"><div class="empty-icon">🔔</div><div class="empty-title">No notifications</div></div>';
    return;
  }

  list.innerHTML = data.notifications.map(n => {
    const isInvite = n.type === 'project_invite' && n.status === 'pending';
    return `
    <div class="notif-item ${!n.read ? 'unread' : ''}" id="notif-${n._id}">
      <div class="notif-avatar">${avatarLetters(n.from?.name || '?')}</div>
      <div class="notif-content">
        <div class="notif-msg">${n.message || 'New notification'}</div>
        ${n.project ? `<div style="font-size:11px;color:var(--accent);margin-top:2px">📁 ${n.project.name}</div>` : ''}
        <div class="notif-time">${fmtDateTime(n.createdAt)}</div>
        ${isInvite ? `
          <div class="notif-actions">
            <button class="btn btn-primary btn-sm" onclick="respondInvite('${n._id}', 'accept')">✓ Accept</button>
            <button class="btn btn-ghost btn-sm" onclick="respondInvite('${n._id}', 'decline')">✕ Decline</button>
          </div>
        ` : `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">${n.status !== 'pending' ? '• ' + n.status : ''}</div>`}
      </div>
      <button class="btn btn-ghost btn-icon" style="flex-shrink:0;font-size:14px" onclick="deleteNotif('${n._id}')" title="Dismiss">×</button>
    </div>`;
  }).join('');

  // Mark as read
  if (data.unread > 0) {
    api('/notifications/read-all', { method: 'PUT' });
    if (badge) { badge.textContent = ''; badge.style.display = 'none'; }
  }
}

async function respondInvite(notifId, action) {
  const { ok, data } = await api(`/notifications/${notifId}/respond`, {
    method: 'PUT', body: { action },
  });
  if (ok) {
    showToast(data.message, action === 'accept' ? 'success' : 'info');
    if (action === 'accept') await loadProjects();
    loadNotifications();
  } else showToast(data.message || 'Failed', 'error');
}

async function deleteNotif(id) {
  await api(`/notifications/${id}`, { method: 'DELETE' });
  document.getElementById(`notif-${id}`)?.remove();
}

// Poll for new notifications every 30s
async function pollNotifications() {
  const { ok, data } = await api('/notifications');
  if (ok) {
    const badge = document.getElementById('notif-count-badge');
    if (badge) {
      badge.textContent = data.unread || '';
      badge.style.display = data.unread > 0 ? 'flex' : 'none';
    }
  }
}
