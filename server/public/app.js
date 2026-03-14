'use strict';

// ── State ────────────────────────────────────────────────
var token = localStorage.getItem('token') || null;
var currentUser = null;
var currentBidId = null;
var resetToken = null;

// ── Helpers ──────────────────────────────────────────────
function id(elId) { return document.getElementById(elId); }

function toast(msg, type) {
  var el = id('toast');
  el.textContent = msg;
  el.className = 'toast show ' + (type || '');
  setTimeout(function () { el.className = 'toast'; }, 3500);
}

function api(path, options) {
  options = options || {};
  options.headers = options.headers || {};
  if (token) options.headers['Authorization'] = 'Bearer ' + token;
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  return fetch(path, options).then(function (res) {
    return res.json().then(function (data) {
      if (!res.ok) throw new Error(data.message || (data.errors && data.errors[0] && data.errors[0].msg) || 'Request failed');
      return data;
    });
  });
}

function escapeHtml(s) {
  if (!s) return '';
  var d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Routing ──────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
  var el = id('page-' + name);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(function (a) {
    a.classList.toggle('active', a.getAttribute('href') === '#' + name);
  });
}

function route() {
  var hash = (location.hash || '').slice(1) || (token ? 'dashboard' : 'auth');
  if (!token && hash !== 'auth') { showPage('auth'); return; }
  if (token && hash === 'auth') { location.hash = '#dashboard'; return; }
  showPage(hash);
  if (hash === 'dashboard') loadDashboard();
  if (hash === 'profile')   loadProfile();
  if (hash === 'bid')       loadBidding();
  if (hash === 'featured')  loadFeatured();
}

window.addEventListener('hashchange', route);

// ── Auth ─────────────────────────────────────────────────
id('btn-login').addEventListener('click', function () {
  api('/api/auth/login', {
    method: 'POST',
    body: { email: id('login-email').value, password: id('login-password').value }
  }).then(function (r) {
    token = r.data.token;
    currentUser = r.data.user;
    localStorage.setItem('token', token);
    id('navbar').classList.remove('hidden');
    id('nav-user-name').textContent = currentUser.name;
    location.hash = '#dashboard';
    toast('Welcome back, ' + currentUser.name + '!', 'success');
  }).catch(function (e) { toast(e.message, 'error'); });
});

id('btn-register').addEventListener('click', function () {
  api('/api/auth/register', {
    method: 'POST',
    body: { name: id('reg-name').value, email: id('reg-email').value, password: id('reg-password').value }
  }).then(function () {
    toast('Account created! Check your email to verify before logging in.', 'success');
    switchTab('login');
  }).catch(function (e) { toast(e.message, 'error'); });
});

id('btn-forgot').addEventListener('click', function () {
  api('/api/auth/forgot-password', {
    method: 'POST',
    body: { email: id('forgot-email').value }
  }).then(function () {
    toast('If that email exists, a reset link has been sent.', 'success');
    switchTab('login');
  }).catch(function (e) { toast(e.message, 'error'); });
});

id('btn-logout').addEventListener('click', function () {
  api('/api/auth/logout', { method: 'POST' }).catch(function () {});
  token = null; currentUser = null;
  localStorage.removeItem('token');
  id('navbar').classList.add('hidden');
  location.hash = '#auth';
  toast('Logged out.', '');
});

id('link-forgot').addEventListener('click', function (e) { e.preventDefault(); switchTab('forgot'); });
id('link-back-login').addEventListener('click', function (e) { e.preventDefault(); switchTab('login'); });

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(function (b) {
    b.classList.toggle('active', b.dataset.tab === name);
  });
  document.querySelectorAll('.tab-pane').forEach(function (p) {
    p.classList.toggle('active', p.id === 'tab-' + name);
  });
}

document.querySelectorAll('.tab-btn').forEach(function (b) {
  b.addEventListener('click', function () { switchTab(b.dataset.tab); });
});

// ── Dashboard ─────────────────────────────────────────────
function loadDashboard() {
  if (!currentUser) {
    api('/api/auth/me').then(function (r) {
      currentUser = r.data;
      id('nav-user-name').textContent = currentUser.name;
      id('navbar').classList.remove('hidden');
      finishDashboard();
    }).catch(logout);
  } else {
    finishDashboard();
  }
}

function finishDashboard() {
  id('dashboard-greeting').textContent = 'Welcome back, ' + currentUser.name;

  api('/api/wallet').then(function (r) {
    id('stat-wallet').textContent = '£' + (r.data.walletBalance || 0).toFixed(2);
  }).catch(function () {});

  api('/api/bids/monthly').then(function (r) {
    var d = r.data;
    id('stat-monthly').textContent = d.winsThisMonth + '/' + d.maxAllowed;
  }).catch(function () {});

  api('/api/profile/completion').then(function (r) {
    id('stat-completion').textContent = r.data.completionPercent + '%';
  }).catch(function () {});

  api('/api/bids/status').then(function (r) {
    var d = r.data;
    if (!d.hasBidToday) {
      id('stat-bid-status').textContent = 'No bid today';
    } else {
      id('stat-bid-status').innerHTML = d.isCurrentlyWinning
        ? '<span style="color:var(--gold)">🏆 Winning</span>'
        : '<span style="color:var(--text-muted)">Not winning</span>';
    }
  }).catch(function () {});

  api('/api/winners/today').then(function (r) {
    var el = id('featured-preview');
    if (!r.data) { el.innerHTML = '<p class="empty-state">No featured alumni today</p>'; return; }
    var a = r.data.alumni;
    el.innerHTML = '<div style="display:flex;align-items:center;gap:1rem">' +
      '<div class="featured-avatar" style="width:48px;height:48px;font-size:1.2rem">' + escapeHtml(a.name ? a.name[0] : '?') + '</div>' +
      '<div><div style="font-weight:500">' + escapeHtml(a.name) + '</div>' +
      '<div style="font-size:0.82rem;color:var(--text-muted)">' + escapeHtml(a.profile && a.profile.currentRole || '') + '</div></div></div>';
  }).catch(function () {});

  api('/api/winners').then(function (r) {
    var el = id('recent-winners');
    var winners = (r.data || []).slice(0, 5);
    if (!winners.length) { el.innerHTML = '<p class="empty-state">No winners yet</p>'; return; }
    el.innerHTML = winners.map(function (w) {
      return '<div class="winner-row"><span class="winner-name">' + escapeHtml(w.alumni && w.alumni.name || 'Alumni') + '</span>' +
        '<span class="winner-date">' + formatDate(w.displayDate) + '</span></div>';
    }).join('');
  }).catch(function () {});
}

// ── Profile ───────────────────────────────────────────────
function loadProfile() {
  api('/api/profile').then(function (r) {
    var p = r.data;
    id('prof-bio').value        = p.bio || '';
    id('prof-linkedin').value   = p.linkedInUrl || '';
    id('prof-role').value       = p.currentRole || '';
    id('prof-employer').value   = p.currentEmployer || '';
    id('prof-location').value   = p.location || '';
    id('prof-year').value       = p.graduationYear || '';

    if (p.photoUrl) {
      id('profile-photo-img').src = p.photoUrl;
      id('profile-photo-img').style.display = 'block';
      id('profile-photo-placeholder').style.display = 'none';
    }

    var pct = p.completionPercent || 0;
    id('completion-pct').textContent = pct + '%';
    id('completion-fill').style.width = pct + '%';

    renderSubList('degrees', p.degrees || [], renderDegree);
    renderSubList('certifications', p.certifications || [], renderCert);
    renderSubList('licences', p.licences || [], renderLicence);
    renderSubList('courses', p.courses || [], renderCourse);
    renderSubList('employment', p.employmentHistory || [], renderEmployment);
  }).catch(function (e) { toast(e.message, 'error'); });
}

id('btn-save-profile').addEventListener('click', function () {
  api('/api/profile', {
    method: 'PUT',
    body: {
      bio:             id('prof-bio').value,
      linkedInUrl:     id('prof-linkedin').value || undefined,
      currentRole:     id('prof-role').value,
      currentEmployer: id('prof-employer').value,
      location:        id('prof-location').value,
      graduationYear:  id('prof-year').value ? parseInt(id('prof-year').value) : undefined,
    }
  }).then(function () {
    toast('Profile updated!', 'success');
    loadProfile();
  }).catch(function (e) { toast(e.message, 'error'); });
});

id('photo-input').addEventListener('change', function () {
  var file = this.files[0];
  if (!file) return;
  var form = new FormData();
  form.append('photo', file);
  fetch('/api/profile/photo', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: form
  }).then(function (r) { return r.json(); }).then(function (r) {
    if (!r.success) throw new Error(r.message || 'Upload failed');
    toast('Photo uploaded!', 'success');
    loadProfile();
  }).catch(function (e) { toast(e.message, 'error'); });
});

// Sub-resource tab switching
document.querySelectorAll('.sub-tab').forEach(function (btn) {
  btn.addEventListener('click', function () {
    document.querySelectorAll('.sub-tab').forEach(function (b) { b.classList.remove('active'); });
    document.querySelectorAll('.sub-pane').forEach(function (p) { p.classList.remove('active'); });
    btn.classList.add('active');
    id('sub-' + btn.dataset.sub).classList.add('active');
  });
});

function renderSubList(resource, items, renderFn) {
  var el = id('list-' + resource);
  if (!items.length) { el.innerHTML = '<p class="empty-state">None added yet</p>'; return; }
  el.innerHTML = items.map(function (item) { return renderFn(resource, item); }).join('');
}

function delBtn(resource, itemId) {
  return '<button class="btn-del btn-sm" onclick="deleteSubResource(\'' + resource + '\',\'' + itemId + '\')">Remove</button>';
}

function renderDegree(resource, d) {
  return '<div class="item-row"><div class="item-info">' +
    '<div class="item-title">' + escapeHtml(d.title) + '</div>' +
    '<div class="item-sub">' + escapeHtml(d.institution) + (d.completedDate ? ' · ' + formatDate(d.completedDate) : '') + '</div>' +
    (d.url ? '<a class="item-link" href="' + escapeHtml(d.url) + '" target="_blank">View Degree Page ↗</a>' : '') +
    '</div><div class="item-actions">' + delBtn(resource, d.id) + '</div></div>';
}

function renderCert(resource, c) {
  return '<div class="item-row"><div class="item-info">' +
    '<div class="item-title">' + escapeHtml(c.name) + '</div>' +
    '<div class="item-sub">' + escapeHtml(c.issuer) + (c.completedDate ? ' · ' + formatDate(c.completedDate) : '') + '</div>' +
    (c.url ? '<a class="item-link" href="' + escapeHtml(c.url) + '" target="_blank">View Course Page ↗</a>' : '') +
    '</div><div class="item-actions">' + delBtn(resource, c.id) + '</div></div>';
}

function renderLicence(resource, l) {
  return '<div class="item-row"><div class="item-info">' +
    '<div class="item-title">' + escapeHtml(l.name) + '</div>' +
    '<div class="item-sub">' + escapeHtml(l.awardingBody) + (l.completedDate ? ' · ' + formatDate(l.completedDate) : '') + '</div>' +
    (l.url ? '<a class="item-link" href="' + escapeHtml(l.url) + '" target="_blank">View Awarding Body ↗</a>' : '') +
    '</div><div class="item-actions">' + delBtn(resource, l.id) + '</div></div>';
}

function renderCourse(resource, c) {
  return '<div class="item-row"><div class="item-info">' +
    '<div class="item-title">' + escapeHtml(c.name) + '</div>' +
    '<div class="item-sub">' + escapeHtml(c.provider) + (c.completedDate ? ' · ' + formatDate(c.completedDate) : '') + '</div>' +
    (c.url ? '<a class="item-link" href="' + escapeHtml(c.url) + '" target="_blank">View Course Page ↗</a>' : '') +
    '</div><div class="item-actions">' + delBtn(resource, c.id) + '</div></div>';
}

function renderEmployment(resource, e) {
  var dates = formatDate(e.startDate) + ' — ' + (e.current ? 'Present' : formatDate(e.endDate));
  return '<div class="item-row"><div class="item-info">' +
    '<div class="item-title">' + escapeHtml(e.jobTitle) + '</div>' +
    '<div class="item-sub">' + escapeHtml(e.employer) + ' · ' + dates + '</div>' +
    '</div><div class="item-actions">' + delBtn(resource, e.id) + '</div></div>';
}

window.addSubResource = function (resource, data) {
  // Remove empty strings
  Object.keys(data).forEach(function (k) {
    if (data[k] === '' || data[k] === null) delete data[k];
  });
  api('/api/profile/' + resource, { method: 'POST', body: data })
    .then(function () { toast('Added successfully!', 'success'); loadProfile(); })
    .catch(function (e) { toast(e.message, 'error'); });
};

window.deleteSubResource = function (resource, itemId) {
  if (!confirm('Remove this entry?')) return;
  api('/api/profile/' + resource + '/' + itemId, { method: 'DELETE' })
    .then(function () { toast('Removed.', ''); loadProfile(); })
    .catch(function (e) { toast(e.message, 'error'); });
};

// ── Sub-resource Add Buttons ──────────────────────────────
id('btn-add-degree').addEventListener('click', function () {
  addSubResource('degrees', {
    title:         id('deg-title').value,
    institution:   id('deg-institution').value,
    url:           id('deg-url').value,
    completedDate: id('deg-date').value,
  });
});

id('btn-add-cert').addEventListener('click', function () {
  addSubResource('certifications', {
    name:          id('cert-name').value,
    issuer:        id('cert-issuer').value,
    url:           id('cert-url').value,
    completedDate: id('cert-date').value,
  });
});

id('btn-add-licence').addEventListener('click', function () {
  addSubResource('licences', {
    name:          id('lic-name').value,
    awardingBody:  id('lic-body').value,
    url:           id('lic-url').value,
    completedDate: id('lic-date').value,
  });
});

id('btn-add-course').addEventListener('click', function () {
  addSubResource('courses', {
    name:          id('crs-name').value,
    provider:      id('crs-provider').value,
    url:           id('crs-url').value,
    completedDate: id('crs-date').value,
  });
});

id('btn-add-employment').addEventListener('click', function () {
  addSubResource('employment', {
    jobTitle:  id('emp-title').value,
    employer:  id('emp-employer').value,
    startDate: id('emp-start').value,
    endDate:   id('emp-end').value || null,
    current:   id('emp-current').checked,
  });
});

// ── Bidding ───────────────────────────────────────────────
function loadBidding() {
  api('/api/bids/monthly').then(function (r) {
    var d = r.data;
    var slots = id('slots-visual');
    slots.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var dot = document.createElement('div');
      dot.className = 'slot-dot' + (i < d.winsThisMonth ? ' used' : '');
      slots.appendChild(dot);
    }
    if (d.maxAllowed > 3) {
      var bonusDot = document.createElement('div');
      bonusDot.className = 'slot-dot' + (d.winsThisMonth >= 4 ? ' bonus' : '');
      bonusDot.title = 'Event bonus slot';
      slots.appendChild(bonusDot);
    }
    id('monthly-text').textContent = 'Used ' + d.winsThisMonth + ' of ' + d.maxAllowed + ' slots this month. ' +
      d.slotsRemaining + ' remaining.' +
      (d.eventBonusActive ? ' 🎉 Event bonus active!' : '');
  }).catch(function () {});

  api('/api/bids/tomorrow').then(function (r) {
    var d = r.data;
    var el = id('tomorrow-slot');
    el.innerHTML = '<p><strong>Date:</strong> ' + escapeHtml(d.slotDate) + '</p>' +
      '<p><strong>Bidding:</strong> ' + (d.biddingOpen ? '✅ Open' : '❌ Closed') + '</p>' +
      '<p style="font-size:0.82rem;color:var(--text-muted)">Closes at ' + escapeHtml(d.biddingClosesAt) + '</p>';
  }).catch(function () {});

  api('/api/wallet').then(function (r) {
    id('wallet-hint').textContent = 'Available balance: £' + (r.data.walletBalance || 0).toFixed(2);
  }).catch(function () {});

  api('/api/bids/status').then(function (r) {
    var d = r.data;
    var dispEl = id('current-bid-display');
    var formEl = id('bid-form-area');
    var updateEl = id('bid-update-area');

    if (!d.hasBidToday) {
      dispEl.innerHTML = '<p class="empty-state">You have not placed a bid today.</p>';
      formEl.style.display = 'block';
      updateEl.style.display = 'none';
      currentBidId = null;
    } else {
      dispEl.innerHTML = d.isCurrentlyWinning
        ? '<p class="bid-winning">🏆 You are currently the highest bidder!</p>'
        : '<p class="bid-losing">⚠️ You are not currently the highest bidder. Consider increasing your bid.</p>';
      formEl.style.display = 'none';
      updateEl.style.display = 'block';
    }
  }).catch(function () {});

  loadBidHistory();
}

// Get today's bid ID for updates
function getTodayBidId(callback) {
  api('/api/bids/history').then(function (r) {
    var today = new Date().toISOString().split('T')[0];
    var todayBid = (r.data || []).find(function (b) {
      return b.bidDate === today && b.status === 'active';
    });
    if (todayBid) { currentBidId = todayBid.id; callback(todayBid.id); }
    else callback(null);
  }).catch(function () { callback(null); });
}

id('btn-place-bid').addEventListener('click', function () {
  var amount = parseFloat(id('bid-amount').value);
  if (!amount || amount < 1) { toast('Enter a valid amount (min £1)', 'error'); return; }
  api('/api/bids', { method: 'POST', body: { amount: amount } })
    .then(function (r) {
      var msg = r.data.feedback.isCurrentlyWinning ? '🏆 Bid placed — you are currently winning!' : '⚠️ Bid placed — not currently winning.';
      toast(msg, r.data.feedback.isCurrentlyWinning ? 'success' : '');
      loadBidding();
    }).catch(function (e) { toast(e.message, 'error'); });
});

id('btn-update-bid').addEventListener('click', function () {
  var amount = parseFloat(id('bid-new-amount').value);
  if (!amount || amount < 1) { toast('Enter a valid amount', 'error'); return; }
  getTodayBidId(function (bidId) {
    if (!bidId) { toast('No active bid found', 'error'); return; }
    api('/api/bids/' + bidId, { method: 'PATCH', body: { amount: amount } })
      .then(function (r) {
        toast(r.data.feedback.isCurrentlyWinning ? '🏆 Bid increased — now winning!' : '⚠️ Bid increased — still not winning.', '');
        loadBidding();
      }).catch(function (e) { toast(e.message, 'error'); });
  });
});

id('btn-cancel-bid').addEventListener('click', function () {
  if (!confirm('Cancel your bid? No charge will be applied.')) return;
  getTodayBidId(function (bidId) {
    if (!bidId) { toast('No active bid found', 'error'); return; }
    api('/api/bids/' + bidId, { method: 'DELETE' })
      .then(function () { toast('Bid cancelled. No charge applied.', ''); loadBidding(); })
      .catch(function (e) { toast(e.message, 'error'); });
  });
});

function loadBidHistory() {
  api('/api/bids/history').then(function (r) {
    var el = id('bid-history-list');
    var bids = r.data || [];
    if (!bids.length) { el.innerHTML = '<p class="empty-state">No bid history yet</p>'; return; }
    el.innerHTML = bids.slice(0, 10).map(function (b) {
      return '<div class="bid-history-row">' +
        '<span>' + formatDate(b.bidDate) + '</span>' +
        '<span class="status-badge status-' + b.status + '">' + b.status + '</span>' +
        '</div>';
    }).join('');
  }).catch(function () {});
}

// ── Featured ──────────────────────────────────────────────
function loadFeatured() {
  var el = id('featured-full');
  api('/api/winners/today').then(function (r) {
    if (!r.data) {
      el.innerHTML = '<div class="card"><p class="empty-state">No featured alumni today. Check back after midnight when the auction resolves.</p></div>';
      return;
    }
    var w = r.data;
    var a = w.alumni;
    var p = a.profile || {};
    var initial = a.name ? a.name[0].toUpperCase() : '?';

    var certsHtml = (p.certifications || []).map(function (c) {
      return '<div class="cred-chip">' + (c.url ? '<a href="' + escapeHtml(c.url) + '" target="_blank">' + escapeHtml(c.name) + ' ↗</a>' : escapeHtml(c.name)) + '</div>';
    }).join('');

    var degsHtml = (p.degrees || []).map(function (d) {
      return '<div class="cred-chip">' + (d.url ? '<a href="' + escapeHtml(d.url) + '" target="_blank">' + escapeHtml(d.title) + ' ↗</a>' : escapeHtml(d.title)) + '</div>';
    }).join('');

    var licsHtml = (p.licences || []).map(function (l) {
      return '<div class="cred-chip">' + (l.url ? '<a href="' + escapeHtml(l.url) + '" target="_blank">' + escapeHtml(l.name) + ' ↗</a>' : escapeHtml(l.name)) + '</div>';
    }).join('');

    var crsHtml = (p.courses || []).map(function (c) {
      return '<div class="cred-chip">' + (c.url ? '<a href="' + escapeHtml(c.url) + '" target="_blank">' + escapeHtml(c.name) + ' ↗</a>' : escapeHtml(c.name)) + '</div>';
    }).join('');

    el.innerHTML = '<div class="featured-card">' +
      '<div class="featured-header">' +
      '<div class="featured-avatar">' +
        (p.photoUrl ? '<img src="' + escapeHtml(p.photoUrl) + '" alt="' + escapeHtml(a.name) + '">' : initial) +
      '</div>' +
      '<div>' +
        '<div class="featured-name">' + escapeHtml(a.name) + '</div>' +
        '<div class="featured-role">' + escapeHtml(p.currentRole || '') + (p.currentEmployer ? ' @ ' + escapeHtml(p.currentEmployer) : '') + '</div>' +
        (p.linkedInUrl ? '<a href="' + escapeHtml(p.linkedInUrl) + '" target="_blank" style="font-size:0.82rem;color:var(--gold)">LinkedIn Profile ↗</a>' : '') +
      '</div>' +
      '</div>' +
      '<div class="featured-body">' +
        (p.bio ? '<div class="featured-section"><h4>About</h4><p>' + escapeHtml(p.bio) + '</p></div>' : '') +
        (degsHtml ? '<div class="featured-section"><h4>Degrees</h4><div class="cred-grid">' + degsHtml + '</div></div>' : '') +
        (certsHtml ? '<div class="featured-section"><h4>Certifications</h4><div class="cred-grid">' + certsHtml + '</div></div>' : '') +
        (licsHtml ? '<div class="featured-section"><h4>Licences</h4><div class="cred-grid">' + licsHtml + '</div></div>' : '') +
        (crsHtml ? '<div class="featured-section"><h4>Courses</h4><div class="cred-grid">' + crsHtml + '</div></div>' : '') +
      '</div></div>';
  }).catch(function (e) {
    el.innerHTML = '<div class="card"><p class="empty-state">Could not load featured alumni. ' + escapeHtml(e.message) + '</p></div>';
  });
}

// ── Boot ──────────────────────────────────────────────────
(function init() {
  // If URL has ?token= it's a password reset link
  var urlParams = new URLSearchParams(window.location.search);
  var tokenParam = urlParams.get('token');
  if (tokenParam) {
    resetToken = tokenParam;
    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
    id('page-reset').classList.add('active');
    id('navbar').classList.add('hidden');
    return;
  }
  if (token) {
    id('navbar').classList.remove('hidden');
    api('/api/auth/me').then(function (r) {
      currentUser = r.data;
      id('nav-user-name').textContent = currentUser.name;
    }).catch(function () {
      token = null;
      localStorage.removeItem('token');
      id('navbar').classList.add('hidden');
    });
  }
  route();
})();

// ── Reset Password Page ───────────────────────────────────
id('btn-reset-password').addEventListener('click', function () {
  var pw  = id('reset-password').value;
  var cpw = id('reset-confirm').value;
  if (!pw) { toast('Enter a new password', 'error'); return; }
  if (pw !== cpw) { toast('Passwords do not match', 'error'); return; }
  if (!resetToken) { toast('Invalid or missing reset token', 'error'); return; }
  api('/api/auth/reset-password', {
    method: 'POST',
    body: { token: resetToken, password: pw }
  }).then(function () {
    toast('Password reset! Redirecting to login...', 'success');
    setTimeout(function () { window.location.href = '/'; }, 2000);
  }).catch(function (e) { toast(e.message, 'error'); });
});