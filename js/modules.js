// ═══════════════════════════════════════════
// BUDGET MODULE
// ═══════════════════════════════════════════
async function loadBudget() {
  if (!State.currentProject) return;
  const pid = State.currentProject._id;
  const { ok, data } = await api(`/projects/${pid}/budget`);
  if (!ok) return;
  renderBudgetTable(data.entries || []);

  // Load latest for header stats
  const latestRes = await api(`/projects/${pid}/budget/latest`);
  if (latestRes.ok && latestRes.data.entry) {
    const e = latestRes.data.entry;
    document.getElementById('budget-yesterday').textContent = fmtCurrency(e.yesterdaySpend, State.currentProject.currency);
    document.getElementById('budget-today-allowed').textContent = fmtCurrency(e.todayAllowed, State.currentProject.currency);
    document.getElementById('budget-month-target').textContent = fmtCurrency(e.monthlyTarget, State.currentProject.currency);
    document.getElementById('budget-month-spent').textContent = fmtCurrency(e.monthSpentSoFar, State.currentProject.currency);
    const pct = e.monthlyTarget > 0 ? Math.min(100, Math.round(e.monthSpentSoFar / e.monthlyTarget * 100)) : 0;
    const bar = document.getElementById('budget-progress-bar');
    bar.style.width = pct + '%';
    bar.className = 'progress-bar ' + (pct > 90 ? 'red' : pct > 70 ? 'yellow' : 'green');
    document.getElementById('budget-progress-pct').textContent = pct + '%';
  }
}

function renderBudgetTable(entries) {
  State._budgetEntries = entries;
  const tbody = document.getElementById('budget-tbody');
  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">💰</div><div class="empty-title">No budget entries</div><div class="empty-desc">Log daily spend to track budget pacing.</div></div></td></tr>`;
    return;
  }
  const cur = State.currentProject?.currency;
  tbody.innerHTML = entries.map(e => {
    const pct = e.monthlyTarget > 0 ? Math.min(100, Math.round(e.monthSpentSoFar / e.monthlyTarget * 100)) : 0;
    const pctColor = pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--yellow)' : 'var(--green)';
    return `<tr>
      <td class="primary">${fmtDate(e.date)}</td>
      <td>${fmtCurrency(e.yesterdaySpend, cur)}</td>
      <td>${fmtCurrency(e.monthlyTarget, cur)}</td>
      <td>${fmtCurrency(e.monthSpentSoFar, cur)}</td>
      <td><div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:6px;background:var(--bg-hover);border-radius:99px;min-width:60px"><div style="width:${pct}%;height:100%;background:${pctColor};border-radius:99px"></div></div><span style="font-size:11px;color:${pctColor};font-weight:700">${pct}%</span></div></td>
      <td><span style="color:var(--green);font-weight:700">${fmtCurrency(e.todayAllowed, cur)}</span></td>
      <td><div class="actions"><button class="btn btn-ghost btn-sm btn-icon" onclick="deleteBudgetEntry('${e._id}')" title="Delete">🗑️</button></div></td>
    </tr>`;
  }).join('');
}

document.getElementById('form-add-budget')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!State.currentProject) return;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Saving...';

  const { ok, data } = await api(`/projects/${State.currentProject._id}/budget`, {
    method: 'POST',
    body: {
      date: document.getElementById('b-date').value,
      yesterdaySpend: parseFloat(document.getElementById('b-yesterday').value) || 0,
      monthlyTarget: parseFloat(document.getElementById('b-target').value) || 0,
      monthSpentSoFar: parseFloat(document.getElementById('b-spent').value) || 0,
      notes: document.getElementById('b-notes').value,
    },
  });
  btn.disabled = false; btn.textContent = 'Add Entry';
  if (ok) {
    showToast('Budget entry added!', 'success');
    closeModal('modal-add-budget');
    e.target.reset();
    loadBudget();
  } else showToast(data.message || 'Failed', 'error');
});

async function deleteBudgetEntry(id) {
  if (!confirm('Delete this entry?')) return;
  const { ok } = await api(`/projects/${State.currentProject._id}/budget/${id}`, { method: 'DELETE' });
  if (ok) { showToast('Deleted', 'info'); loadBudget(); }
  else showToast('Delete failed', 'error');
}

// ═══════════════════════════════════════════
// CHANGELOG MODULE
// ═══════════════════════════════════════════
async function loadChangelog(filters = {}) {
  if (!State.currentProject) return;
  let qs = new URLSearchParams(filters).toString();
  const { ok, data } = await api(`/projects/${State.currentProject._id}/changelog?${qs}&limit=50`);
  if (!ok) return;
  renderChangelogTable(data.entries || []);
  document.getElementById('changelog-total').textContent = `${data.total || 0} entries`;
}

function renderChangelogTable(entries) {
  const tbody = document.getElementById('changelog-tbody');
  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No changes logged</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = entries.map(e => `<tr>
      <td class="primary" style="white-space:nowrap">${fmtDate(e.date)}</td>
      <td>${statusBadge(e.type)}</td>
      <td class="primary">${e.campaign || '—'}</td>
      <td>${e.adGroup || '—'}</td>
      <td class="wrap" title="${(e.details||'').replace(/"/g,'&quot;')}">${e.details ? e.details.substring(0,60)+(e.details.length>60?'…':'') : '—'}</td>
      <td>${e.tags?.map(t => `<span class="badge badge-accent" style="margin:1px">${t.replace(/_/g,' ')}</span>`).join('') || '—'}</td>
      <td><div class="actions"><button class="btn btn-ghost btn-sm btn-icon" onclick="deleteChangeEntry('${e._id}')" title="Delete">🗑️</button></div></td>
    </tr>`).join('');
}

document.getElementById('form-add-change')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!State.currentProject) return;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Saving...';

  const selectedTags = Array.from(document.querySelectorAll('.change-tag-cb:checked')).map(cb => cb.value);

  const { ok, data } = await api(`/projects/${State.currentProject._id}/changelog`, {
    method: 'POST',
    body: {
      date: document.getElementById('cl-date').value || new Date().toISOString(),
      type: document.getElementById('cl-type').value,
      campaign: document.getElementById('cl-campaign').value.trim(),
      adGroup: document.getElementById('cl-adgroup').value.trim(),
      oldValue: document.getElementById('cl-old').value.trim(),
      newValue: document.getElementById('cl-new').value.trim(),
      details: document.getElementById('cl-details').value.trim(),
      reason: document.getElementById('cl-reason').value.trim(),
      tags: selectedTags,
    },
  });
  btn.disabled = false; btn.textContent = 'Log Change';
  if (ok) {
    showToast('Change logged!', 'success');
    closeModal('modal-add-change');
    e.target.reset();
    loadChangelog();
  } else showToast(data.message || 'Failed', 'error');
});

async function deleteChangeEntry(id) {
  if (!confirm('Delete this entry?')) return;
  const { ok } = await api(`/projects/${State.currentProject._id}/changelog/${id}`, { method: 'DELETE' });
  if (ok) { showToast('Deleted', 'info'); loadChangelog(); }
  else showToast('Delete failed', 'error');
}

// ═══════════════════════════════════════════
// AD COPY MODULE
// ═══════════════════════════════════════════
async function loadAdCopy(filters = {}) {
  if (!State.currentProject) return;
  let qs = new URLSearchParams(filters).toString();
  const { ok, data } = await api(`/projects/${State.currentProject._id}/adcopy?${qs}`);
  if (!ok) return;
  renderAdCopyCards(data.adCopies || []);
}

function renderAdCopyCards(adCopies) {
  const container = document.getElementById('adcopy-grid');
  if (!adCopies.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📝</div><div class="empty-title">No ad copies</div><div class="empty-desc">Create your first ad copy to start tracking versions.</div></div>`;
    return;
  }
  container.innerHTML = adCopies.map(a => `
    <div class="card" style="border-left:3px solid var(--accent)">
      <div class="card-header">
        <div>
          <div class="card-title" style="font-size:14px">${a.campaign}</div>
          <div class="card-subtitle">${a.adGroup} · ${a.adType} · ${a.version}</div>
        </div>
        <div class="flex gap-8 items-center">
          ${statusBadge(a.status)}
          <div class="dropdown">
            <button class="btn btn-ghost btn-icon btn-sm" onclick="toggleDropdown('ac-menu-${a._id}')">⋮</button>
            <div class="dropdown-menu" id="ac-menu-${a._id}">
              <div class="dropdown-item" onclick="viewAdCopyHistory('${a._id}')">📜 History</div>
              <div class="dropdown-item" onclick="openUpdateAdCopy('${a._id}')">✏️ New Version</div>
              <div class="dropdown-divider"></div>
              <div class="dropdown-item danger" onclick="deleteAdCopy('${a._id}')">🗑️ Delete</div>
            </div>
          </div>
        </div>
      </div>
      <div style="margin-bottom:12px">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Headlines</div>
        ${(a.headlines || []).slice(0,3).map(h => `<div style="font-size:13px;padding:4px 0;border-bottom:1px solid var(--border);color:var(--text-primary)">${h.text}${h.pinPosition ? ` <span class="badge badge-blue">Pin ${h.pinPosition}</span>` : ''}</div>`).join('')}
        ${a.headlines?.length > 3 ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">+${a.headlines.length-3} more</div>` : ''}
      </div>
      <div style="margin-bottom:12px">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Descriptions</div>
        ${(a.descriptions || []).map(d => `<div style="font-size:13px;padding:4px 0;border-bottom:1px solid var(--border);color:var(--text-secondary)">${d.text}</div>`).join('')}
      </div>
      <div class="flex items-center justify-between" style="margin-top:12px">
        <span style="font-size:11px;color:var(--text-muted)">By ${a.createdBy?.name || '—'}</span>
        ${a.previousVersion ? `<span class="badge badge-gray">Updated from ${a.previousVersion.version || 'prev'}</span>` : ''}
      </div>
    </div>
  `).join('');
}

// ─── Fix #2: Ad Copy limits per campaign type ─────────────
// Google Search (RSA): max 15 headlines (≤30 chars), max 4 descriptions (≤90 chars)
// PMAX: max 5 big headlines (≤90 chars), max 5 descriptions (≤90 chars)
const AD_LIMITS = {
  RSA:  { maxH: 15, maxHChars: 30,  maxD: 4, maxDChars: 90, hlLabel: 'Headline (max 30 chars)' },
  ETA:  { maxH: 3,  maxHChars: 30,  maxD: 2, maxDChars: 90, hlLabel: 'Headline (max 30 chars)' },
  PMAX: { maxH: 5,  maxHChars: 90,  maxD: 5, maxDChars: 90, hlLabel: 'Long Headline (max 90 chars)' },
  DSA:  { maxH: 1,  maxHChars: 40,  maxD: 2, maxDChars: 90, hlLabel: 'Headline (max 40 chars)' },
};

function getAdLimits() {
  const type = document.getElementById('ac-adtype')?.value || 'RSA';
  return AD_LIMITS[type] || AD_LIMITS.RSA;
}

function addHeadlineField() {
  const wrap = document.getElementById('ac-headlines-wrap');
  const limits = getAdLimits();
  if (wrap.children.length >= limits.maxH) {
    showToast(`Max ${limits.maxH} headlines allowed for ${document.getElementById('ac-adtype')?.value || 'this'} ads`, 'warning');
    return;
  }
  const idx = wrap.children.length;
  const div = document.createElement('div');
  div.className = 'flex gap-8 mb-16';
  const showPin = limits.maxHChars <= 30; // only RSA/ETA have pin positions
  div.innerHTML = `
    <input class="form-input" placeholder="${limits.hlLabel}" maxlength="${limits.maxHChars}" name="headline" required style="flex:1">
    ${showPin ? `<input class="form-input" type="number" placeholder="Pin" min="1" max="3" name="headline-pin" style="width:70px">` : `<input type="hidden" name="headline-pin" value="">`}
    <button type="button" class="btn btn-ghost btn-icon" onclick="this.parentElement.remove()">×</button>
  `;
  wrap.appendChild(div);
}

function addDescField() {
  const wrap = document.getElementById('ac-descs-wrap');
  const limits = getAdLimits();
  if (wrap.children.length >= limits.maxD) {
    showToast(`Max ${limits.maxD} descriptions allowed for ${document.getElementById('ac-adtype')?.value || 'this'} ads`, 'warning');
    return;
  }
  const idx = wrap.children.length;
  const div = document.createElement('div');
  div.className = 'flex gap-8 mb-16';
  div.innerHTML = `
    <input class="form-input" placeholder="Description ${idx+1} (max ${limits.maxDChars} chars)" maxlength="${limits.maxDChars}" name="description" required style="flex:1">
    <button type="button" class="btn btn-ghost btn-icon" onclick="this.parentElement.remove()">×</button>
  `;
  wrap.appendChild(div);
}

// When adType changes, reset the fields to match new limits
function onAdTypeChange() {
  const wrap1 = document.getElementById('ac-headlines-wrap');
  const wrap2 = document.getElementById('ac-descs-wrap');
  if (!wrap1 || !wrap2) return;
  wrap1.innerHTML = '';
  wrap2.innerHTML = '';
  const limits = getAdLimits();
  // Pre-fill default number of fields
  const defaultH = Math.min(3, limits.maxH);
  const defaultD = Math.min(2, limits.maxD);
  for (let i = 0; i < defaultH; i++) addHeadlineField();
  for (let i = 0; i < defaultD; i++) addDescField();
}

document.getElementById('form-add-adcopy')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!State.currentProject) return;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Saving...';

  const limits = getAdLimits();
  const headlines = Array.from(document.querySelectorAll('#ac-headlines-wrap [name=headline]')).map((inp, i) => {
    const pin = document.querySelectorAll('#ac-headlines-wrap [name=headline-pin]')[i]?.value;
    return { text: inp.value.trim(), pinPosition: pin ? parseInt(pin) : null };
  }).filter(h => h.text);

  const descriptions = Array.from(document.querySelectorAll('#ac-descs-wrap [name=description]')).map(inp => ({
    text: inp.value.trim(), pinPosition: null
  })).filter(d => d.text);

  // Fix #2: Validate limits before sending
  if (headlines.length > limits.maxH) {
    showToast(`Max ${limits.maxH} headlines allowed for this ad type`, 'error');
    btn.disabled = false; btn.textContent = 'Save Ad Copy';
    return;
  }
  if (descriptions.length > limits.maxD) {
    showToast(`Max ${limits.maxD} descriptions allowed for this ad type`, 'error');
    btn.disabled = false; btn.textContent = 'Save Ad Copy';
    return;
  }

  const { ok, data } = await api(`/projects/${State.currentProject._id}/adcopy`, {
    method: 'POST',
    body: {
      campaign: document.getElementById('ac-campaign').value.trim(),
      adGroup: document.getElementById('ac-adgroup').value.trim(),
      adType: document.getElementById('ac-adtype').value,
      version: document.getElementById('ac-version').value.trim() || 'V1',
      headlines,
      descriptions,
      status: document.getElementById('ac-status').value,
      notes: document.getElementById('ac-notes').value.trim(),
    },
  });
  btn.disabled = false; btn.textContent = 'Save Ad Copy';
  if (ok) {
    showToast('Ad copy saved!', 'success');
    closeModal('modal-add-adcopy');
    e.target.reset();
    document.getElementById('ac-headlines-wrap').innerHTML = '';
    document.getElementById('ac-descs-wrap').innerHTML = '';
    onAdTypeChange(); // re-init fields for current ad type
    loadAdCopy();
  } else showToast(data.message || 'Failed', 'error');
});

async function deleteAdCopy(id) {
  if (!confirm('Delete this ad copy?')) return;
  const { ok } = await api(`/projects/${State.currentProject._id}/adcopy/${id}`, { method: 'DELETE' });
  if (ok) { showToast('Deleted', 'info'); loadAdCopy(); }
}

async function viewAdCopyHistory(id) {
  const { ok, data } = await api(`/projects/${State.currentProject._id}/adcopy/${id}/history`);
  if (!ok) return;
  const list = document.getElementById('adcopy-history-list');
  list.innerHTML = (data.history || []).map(h => `
    <div class="card card-sm mb-16">
      <div class="flex items-center justify-between mb-16">
        <span class="fw-700">${h.version} — ${h.adType}</span>
        ${statusBadge(h.status)}
        <span style="font-size:11px;color:var(--text-muted)">${fmtDate(h.createdAt)}</span>
      </div>
      <div style="font-size:12px;color:var(--text-muted)">By ${h.createdBy?.name || '—'}</div>
    </div>
  `).join('') || '<div class="text-muted" style="padding:16px">No history</div>';
  openModal('modal-adcopy-history');
}

// ═══════════════════════════════════════════
// KEYWORDS MODULE
// ═══════════════════════════════════════════
async function loadKeywords(filters = {}) {
  if (!State.currentProject) return;
  let qs = new URLSearchParams(filters).toString();
  const { ok, data } = await api(`/projects/${State.currentProject._id}/keywords?${qs}`);
  if (!ok) return;
  renderKeywordsTable(data.keywords || []);
}

function renderKeywordsTable(keywords) {
  State._keywords = keywords;
  const tbody = document.getElementById('keywords-tbody');
  if (!keywords.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🔑</div><div class="empty-title">No keywords yet</div><div class="empty-desc">Add keywords to track bids, match types and performance.</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = keywords.map(k => `
    <tr>
      <td class="primary">${escHtml(k.keyword)}</td>
      <td>${statusBadge(k.matchType)}</td>
      <td>${escHtml(k.campaign)}</td>
      <td>${escHtml(k.adGroup || '—')}</td>
      <td>${statusBadge(k.status)}</td>
      <td>${k.bidAmount ? fmtCurrency(k.bidAmount, State.currentProject?.currency) : '—'}</td>
      <td>
        <div class="actions">
          <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditKeyword('${k._id}')" title="Edit">✏️</button>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteKeyword('${k._id}')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openEditKeyword(id) {
  const k = State._keywords?.find(x => x._id === id);
  if (!k) return;
  document.getElementById('ekw-id').value = k._id;
  document.getElementById('ekw-keyword').value = k.keyword;
  document.getElementById('ekw-campaign').value = k.campaign;
  document.getElementById('ekw-adgroup').value = k.adGroup || '';
  document.getElementById('ekw-matchtype').value = k.matchType;
  document.getElementById('ekw-status').value = k.status;
  document.getElementById('ekw-bid').value = k.bidAmount || '';
  document.getElementById('ekw-notes').value = k.notes || '';
  openModal('modal-edit-keyword');
}

document.getElementById('form-edit-keyword')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!State.currentProject) return;
  const id = document.getElementById('ekw-id').value;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Saving...';
  const { ok, data } = await api(`/projects/${State.currentProject._id}/keywords/${id}`, {
    method: 'PUT',
    body: {
      keyword: document.getElementById('ekw-keyword').value.trim(),
      campaign: document.getElementById('ekw-campaign').value.trim(),
      adGroup: document.getElementById('ekw-adgroup').value.trim(),
      matchType: document.getElementById('ekw-matchtype').value,
      status: document.getElementById('ekw-status').value,
      bidAmount: parseFloat(document.getElementById('ekw-bid').value) || null,
      notes: document.getElementById('ekw-notes').value.trim(),
    },
  });
  btn.disabled = false; btn.textContent = 'Save Changes';
  if (ok) { showToast('Keyword updated!', 'success'); closeModal('modal-edit-keyword'); loadKeywords(); }
  else showToast(data.message || 'Failed', 'error');
});

document.getElementById('form-add-keyword')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!State.currentProject) return;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Adding...';

  const { ok, data } = await api(`/projects/${State.currentProject._id}/keywords`, {
    method: 'POST',
    body: {
      campaign: document.getElementById('kw-campaign').value.trim(),
      adGroup: document.getElementById('kw-adgroup').value.trim(),
      keyword: document.getElementById('kw-keyword').value.trim(),
      matchType: document.getElementById('kw-matchtype').value,
      status: document.getElementById('kw-status').value,
      bidAmount: parseFloat(document.getElementById('kw-bid').value) || null,
      notes: document.getElementById('kw-notes').value.trim(),
    },
  });
  btn.disabled = false; btn.textContent = 'Add Keyword';
  if (ok) {
    showToast('Keyword added!', 'success');
    closeModal('modal-add-keyword');
    e.target.reset();
    loadKeywords();
  } else showToast(data.message || 'Failed', 'error');
});

async function deleteKeyword(id) {
  if (!confirm('Delete this keyword?')) return;
  const { ok } = await api(`/projects/${State.currentProject._id}/keywords/${id}`, { method: 'DELETE' });
  if (ok) { showToast('Deleted', 'info'); loadKeywords(); }
}

// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
// LANDING PAGES MODULE
// ═══════════════════════════════════════════
async function loadLandingPages(filters = {}) {
  if (!State.currentProject) return;
  let qs = new URLSearchParams(filters).toString();
  const { ok, data } = await api(`/projects/${State.currentProject._id}/landingpages?${qs}`);
  if (!ok) return;
  renderLandingPagesTable(data.pages || []);
}

function renderLandingPagesTable(pages) {
  const tbody = document.getElementById('landing-tbody');
  if (!pages.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🌐</div><div class="empty-title">No landing pages yet</div><div class="empty-desc">Track all landing page URLs, versions and statuses.</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = pages.map(p => `
    <tr>
      <td class="primary">${escHtml(p.title)}</td>
      <td><a href="${p.url}" target="_blank" class="table-link" title="${p.url}">${p.url.replace(/^https?:\/\//, '').substring(0, 40)}${p.url.length > 45 ? '…' : ''}</a></td>
      <td>${p.campaign || '—'}</td>
      <td><span class="badge badge-gray">${p.version}</span></td>
      <td>${statusBadge(p.status)}</td>
      <td>${fmtDate(p.updatedAt)}</td>
      <td>
        <div class="actions">
          <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditLandingPage('${p._id}')" title="Edit">✏️</button>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="deleteLandingPage('${p._id}')" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openEditLandingPage(id) {
  const page = State._landingPages?.find(p => p._id === id);
  if (!page) return;
  document.getElementById('elp-id').value = page._id;
  document.getElementById('elp-url').value = page.url;
  document.getElementById('elp-title').value = page.title;
  document.getElementById('elp-campaign').value = page.campaign || '';
  document.getElementById('elp-version').value = page.version || 'V1';
  document.getElementById('elp-status').value = page.status || 'active';
  document.getElementById('elp-notes').value = page.notes || '';
  openModal('modal-edit-landing');
}

document.getElementById('form-add-landing')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!State.currentProject) return;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Adding...';

  const { ok, data } = await api(`/projects/${State.currentProject._id}/landingpages`, {
    method: 'POST',
    body: {
      url: document.getElementById('lp-url').value.trim(),
      title: document.getElementById('lp-title').value.trim(),
      campaign: document.getElementById('lp-campaign').value.trim(),
      version: document.getElementById('lp-version').value.trim() || 'V1',
      status: document.getElementById('lp-status').value,
      notes: document.getElementById('lp-notes').value.trim(),
    },
  });
  btn.disabled = false; btn.textContent = 'Add Page';
  if (ok) {
    showToast('Landing page added!', 'success');
    closeModal('modal-add-landing');
    e.target.reset();
    loadLandingPages();
  } else showToast(data.message || 'Failed', 'error');
});

document.getElementById('form-edit-landing')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!State.currentProject) return;
  const id = document.getElementById('elp-id').value;
  const btn = e.target.querySelector('[type=submit]');
  btn.disabled = true; btn.textContent = 'Saving...';

  const { ok, data } = await api(`/projects/${State.currentProject._id}/landingpages/${id}`, {
    method: 'PUT',
    body: {
      url: document.getElementById('elp-url').value.trim(),
      title: document.getElementById('elp-title').value.trim(),
      campaign: document.getElementById('elp-campaign').value.trim(),
      version: document.getElementById('elp-version').value.trim() || 'V1',
      status: document.getElementById('elp-status').value,
      notes: document.getElementById('elp-notes').value.trim(),
    },
  });
  btn.disabled = false; btn.textContent = 'Save Changes';
  if (ok) {
    showToast('Landing page updated!', 'success');
    closeModal('modal-edit-landing');
    loadLandingPages();
  } else showToast(data.message || 'Failed', 'error');
});

async function deleteLandingPage(id) {
  if (!confirm('Delete this landing page?')) return;
  const { ok } = await api(`/projects/${State.currentProject._id}/landingpages/${id}`, { method: 'DELETE' });
  if (ok) { showToast('Deleted', 'info'); loadLandingPages(); }
}

// ─── Keyword Mode Switcher ────────────────────────────────
function switchKwMode(mode) {
  document.querySelectorAll('.kw-mode-tab').forEach((t, i) => {
    const modes = ['single','bulk','sheet','convert'];
    t.classList.toggle('active', modes[i] === mode);
  });
  document.querySelectorAll('.kw-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('kw-panel-' + mode);
  if (panel) panel.classList.add('active');
}

// ─── Bulk Keyword Import ─────────────────────────────────
document.getElementById('bulk-keywords')?.addEventListener('input', function() {
  const lines = this.value.split('\n').map(l => l.trim()).filter(Boolean);
  const wrap = document.getElementById('bulk-preview-wrap');
  const count = document.getElementById('bulk-preview-count');
  if (lines.length) {
    wrap.style.display = 'block';
    count.textContent = `${lines.length} keyword${lines.length !== 1 ? 's' : ''} ready to import`;
  } else {
    wrap.style.display = 'none';
  }
});

async function submitBulkKeywords() {
  const campaign = document.getElementById('bulk-campaign').value.trim();
  const adGroup  = document.getElementById('bulk-adgroup').value.trim();
  const matchType = document.getElementById('bulk-matchtype').value;
  const status   = document.getElementById('bulk-status').value;
  const raw      = document.getElementById('bulk-keywords').value;
  const keywords = raw.split('\n').map(l => l.trim()).filter(Boolean);

  if (!campaign || !adGroup) { showToast('Campaign and Ad Group are required', 'warning'); return; }
  if (!keywords.length) { showToast('Enter at least one keyword', 'warning'); return; }

  const btn = document.querySelector('#kw-panel-bulk .btn-primary');
  btn.disabled = true; btn.textContent = `Importing ${keywords.length}...`;

  let ok = true;
  for (const keyword of keywords) {
    const res = await api(`/projects/${State.currentProject._id}/keywords`, {
      method: 'POST',
      body: JSON.stringify({ campaign, adGroup, keyword, matchType, status }),
    });
    if (!res.ok) { ok = false; }
  }

  btn.disabled = false; btn.textContent = 'Import All Keywords';
  if (ok) {
    showToast(`${keywords.length} keywords imported!`, 'success');
    closeModal('modal-add-keyword');
    loadKeywords();
    // reset
    document.getElementById('bulk-keywords').value = '';
    document.getElementById('bulk-preview-wrap').style.display = 'none';
  } else {
    showToast('Some keywords failed to import', 'error');
    loadKeywords();
  }
}

// ─── Sheet Upload ─────────────────────────────────────────
let _sheetKeywords = [];

function downloadKwTemplate(e) {
  e.stopPropagation();
  const csv = 'keyword,match_type,campaign,ad_group,bid\nrunning shoes,exact,Brand Campaign,Shoes,1.50\nbest running shoes,phrase,Brand Campaign,Shoes,1.20';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'keywords_template.csv'; a.click();
  URL.revokeObjectURL(url);
}

async function handleKwFileUpload(input) {
  const file = input.files[0];
  if (!file) return;

  const ext = file.name.split('.').pop().toLowerCase();
  let rows = [];

  if (ext === 'csv') {
    const text = await file.text();
    rows = parseCSV(text);
  } else if (ext === 'xlsx') {
    // Use SheetJS if available, else fallback
    if (typeof XLSX !== 'undefined') {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    } else {
      showToast('XLSX support unavailable. Please use CSV.', 'warning');
      return;
    }
  }

  if (!rows.length) { showToast('No data found in file', 'error'); return; }

  const defaultCampaign = document.getElementById('sheet-campaign').value.trim();
  const defaultAdGroup  = document.getElementById('sheet-adgroup').value.trim();

  _sheetKeywords = rows.map(r => ({
    keyword:   r.keyword || r.Keyword || '',
    matchType: (r.match_type || r['Match Type'] || r.matchType || 'exact').toLowerCase().replace(' ', '_'),
    campaign:  r.campaign || r.Campaign || defaultCampaign,
    adGroup:   r.ad_group || r['Ad Group'] || r.adGroup || defaultAdGroup,
    bidAmount: parseFloat(r.bid || r.Bid || 0) || null,
  })).filter(r => r.keyword && r.campaign && r.adGroup);

  const count = document.getElementById('sheet-preview-count');
  const previewWrap = document.getElementById('sheet-preview-wrap');
  const previewTable = document.getElementById('sheet-preview-table');
  const importBtn = document.getElementById('btn-import-sheet');

  count.textContent = `${_sheetKeywords.length} valid keyword${_sheetKeywords.length !== 1 ? 's' : ''} found`;
  previewWrap.style.display = 'block';
  importBtn.disabled = _sheetKeywords.length === 0;

  const preview = _sheetKeywords.slice(0, 8);
  previewTable.innerHTML = `
    <table>
      <thead><tr><th>Keyword</th><th>Match Type</th><th>Campaign</th><th>Ad Group</th><th>Bid</th></tr></thead>
      <tbody>${preview.map(k => `
        <tr>
          <td>${escHtml(k.keyword)}</td>
          <td>${escHtml(k.matchType)}</td>
          <td>${escHtml(k.campaign)}</td>
          <td>${escHtml(k.adGroup)}</td>
          <td>${k.bidAmount || '—'}</td>
        </tr>`).join('')}
        ${_sheetKeywords.length > 8 ? `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);font-size:11px">...and ${_sheetKeywords.length - 8} more</td></tr>` : ''}
      </tbody>
    </table>`;
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const obj = {};
    headers.forEach((h, i) => obj[h] = vals[i] || '');
    return obj;
  });
}

async function submitSheetKeywords() {
  if (!_sheetKeywords.length) { showToast('No keywords to import', 'warning'); return; }
  const btn = document.getElementById('btn-import-sheet');
  btn.disabled = true; btn.textContent = `Importing ${_sheetKeywords.length}...`;

  let failed = 0;
  for (const kw of _sheetKeywords) {
    const res = await api(`/projects/${State.currentProject._id}/keywords`, {
      method: 'POST',
      body: JSON.stringify({ campaign: kw.campaign, adGroup: kw.adGroup, keyword: kw.keyword, matchType: kw.matchType, status: 'active', bidAmount: kw.bidAmount }),
    });
    if (!res.ok) failed++;
  }

  btn.disabled = false; btn.textContent = 'Import Sheet';
  const imported = _sheetKeywords.length - failed;
  showToast(`${imported} keywords imported${failed ? `, ${failed} failed` : ''}!`, failed ? 'warning' : 'success');
  closeModal('modal-add-keyword');
  loadKeywords();
  _sheetKeywords = [];
}

// ─── Convert All Match Types ──────────────────────────────
async function submitConvertAll() {
  const matchType = document.getElementById('convert-matchtype').value;
  if (!State._keywords?.length) { showToast('No keywords to convert', 'warning'); return; }
  if (!confirm(`Convert all ${State._keywords.length} keywords to "${matchType}"? This cannot be undone.`)) return;

  const btn = document.querySelector('#kw-panel-convert .btn-danger');
  btn.disabled = true; btn.textContent = 'Converting...';

  let ok = true;
  for (const kw of State._keywords) {
    const res = await api(`/projects/${State.currentProject._id}/keywords/${kw._id}`, {
      method: 'PUT',
      body: JSON.stringify({ matchType }),
    });
    if (!res.ok) ok = false;
  }

  btn.disabled = false; btn.textContent = 'Convert All Keywords';
  showToast(ok ? `All keywords converted to ${matchType}!` : 'Some conversions failed', ok ? 'success' : 'error');
  closeModal('modal-add-keyword');
  loadKeywords();
}

// ─── Drag & Drop for Sheet Upload ────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const zone = document.getElementById('kw-drop-zone');
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
      const input = document.getElementById('kw-file-input');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      handleKwFileUpload(input);
    }
  });
});
