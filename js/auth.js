// ─── Auth Module ──────────────────────────────────────────

function showAuthPage(page) {
  document.getElementById('login-form-wrap').style.display = page === 'login' ? 'block' : 'none';
  document.getElementById('register-form-wrap').style.display = page === 'register' ? 'block' : 'none';
}

// ─── Password strength meter ───────────────────────────────
function checkPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-5
}

function updateStrengthMeter(pw, barId, labelId) {
  const bar = document.getElementById(barId);
  const label = document.getElementById(labelId);
  if (!bar || !label) return;
  const score = checkPasswordStrength(pw);
  const levels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
  bar.style.width = `${(score / 5) * 100}%`;
  bar.style.background = colors[score] || 'var(--border)';
  label.textContent = pw.length ? levels[score] : '';
  label.style.color = colors[score] || '';
}

// ─── Show/hide password toggle ────────────────────────────
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? '🙈' : '👁️';
}

// ─── Login ────────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const remember = document.getElementById('login-remember')?.checked;

  if (!email || !password) { showToast('Email and password required', 'error'); return; }

  // Email format validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Invalid email format', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Signing in…';

  const { ok, data } = await api('/auth/login', { method: 'POST', body: { email, password } });

  btn.disabled = false;
  btn.innerHTML = 'Sign In';

  if (ok && data.token) {
    Auth.setToken(data.token);
    Auth.setUser(data.user);
    Auth.setRemember(remember);
    showToast(`Welcome back, ${data.user.name}! 👋`, 'success');
    initApp();
  } else {
    showToast(data.message || 'Login failed', 'error');
    document.getElementById('login-password').value = '';
    document.getElementById('login-password').focus();
  }
});

// ─── Register ─────────────────────────────────────────────
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('register-btn');
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-password-confirm')?.value;
  const role = document.getElementById('reg-role').value;

  if (!name || !email || !password) { showToast('All fields required', 'error'); return; }
  if (name.length < 2) { showToast('Name must be at least 2 characters', 'error'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Invalid email format', 'error'); return; }
  if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
  if (confirm !== undefined && password !== confirm) { showToast('Passwords do not match', 'error'); return; }
  if (checkPasswordStrength(password) < 2) { showToast('Password is too weak. Use letters and numbers', 'warning'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating account…';

  const { ok, data } = await api('/auth/register', { method: 'POST', body: { name, email, password, role } });

  btn.disabled = false;
  btn.innerHTML = 'Create Account';

  if (ok && data.token) {
    Auth.setToken(data.token);
    Auth.setUser(data.user);
    showToast(`Account created! Welcome, ${data.user.name}! 🎉`, 'success');
    initApp();
  } else {
    showToast(data.message || 'Registration failed', 'error');
  }
});

// ─── Logout ───────────────────────────────────────────────
async function logout() {
  await api('/auth/logout', { method: 'POST' });
  SocketManager.disconnect();
  BackgroundSync.stop();
  Auth.clear();
  State.projects = [];
  State.currentProject = null;
  State.messages = [];
  State.globalMessages = [];
  document.getElementById('login-form').reset();
  showApp('auth');
  showAuthPage('login');
  showToast('Logged out successfully', 'info');
}

// ─── Password strength wiring ──────────────────────────────
document.getElementById('reg-password')?.addEventListener('input', function() {
  updateStrengthMeter(this.value, 'pw-strength-bar', 'pw-strength-label');
});
