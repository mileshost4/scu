/* ============================================================
   navbar.js — Shared nav, sidebar, theme, modal helpers
   Included by every page that uses the navbar partial.
   ============================================================ */

/* ── Theme ──────────────────────────────────────────────────── */
function setTheme(mode) {
  const html  = document.documentElement;
  const icon  = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');

  let resolved = mode;
  if (mode === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  html.setAttribute('data-theme', resolved);
  localStorage.setItem('theme', mode);

  if (icon) {
    icon.className = resolved === 'dark'
      ? 'fa-solid fa-moon theme-icon'
      : 'fa-solid fa-sun theme-icon';
  }
  if (label) {
    label.textContent = mode === 'system' ? 'System' : (resolved === 'dark' ? 'Dark' : 'Light');
  }

  document.querySelectorAll('.theme-option').forEach(el => {
    el.classList.toggle('active', el.dataset.themeOpt === mode);
  });

  // Re-render any Chart.js instances registered on window.__charts
  if (window.__charts) window.__charts.forEach(c => c.update());
}

// Apply saved theme immediately on every page load
(function () {
  setTheme(localStorage.getItem('theme') || 'dark');
})();


/* ── Dropdowns (theme + user) ───────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {

  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeDropdown  = document.getElementById('themeDropdown');
  const navUserBtn     = document.getElementById('navUserBtn');
  const userDropdown   = document.getElementById('userDropdown');

  if (themeToggleBtn && themeDropdown) {
    themeToggleBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      themeDropdown.classList.toggle('open');
      if (userDropdown) userDropdown.classList.remove('open');
      if (navUserBtn)   navUserBtn.classList.remove('open');
    });
  }

  if (navUserBtn && userDropdown) {
    navUserBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      const isOpen = userDropdown.classList.toggle('open');
      navUserBtn.classList.toggle('open', isOpen);
      if (themeDropdown) themeDropdown.classList.remove('open');
    });
  }

  document.addEventListener('click', function () {
    if (userDropdown)   userDropdown.classList.remove('open');
    if (navUserBtn)     navUserBtn.classList.remove('open');
    if (themeDropdown)  themeDropdown.classList.remove('open');
  });


  /* ── Sidebar ──────────────────────────────────────────────── */
  const sidebar        = document.getElementById('sidebar');
  const sidebarToggle  = document.getElementById('sidebarToggle');
  const mainContent    = document.getElementById('mainContent');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  if (!sidebar || !sidebarToggle) return;

  let sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';

  function applySidebarState() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      sidebar.classList.remove('collapsed');
      sidebarToggle.classList.remove('collapsed');
      if (mainContent) mainContent.classList.remove('sidebar-collapsed');
      return;
    }
    sidebar.classList.toggle('collapsed', sidebarCollapsed);
    sidebarToggle.classList.toggle('collapsed', sidebarCollapsed);
    if (mainContent) mainContent.classList.toggle('sidebar-collapsed', sidebarCollapsed);
  }

  applySidebarState();

  sidebarToggle.addEventListener('click', function () {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      sidebar.classList.toggle('mobile-open');
      if (sidebarOverlay) sidebarOverlay.classList.toggle('visible');
    } else {
      sidebarCollapsed = !sidebarCollapsed;
      localStorage.setItem('sidebarCollapsed', sidebarCollapsed);
      applySidebarState();
    }
  });

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', function () {
      sidebar.classList.remove('mobile-open');
      sidebarOverlay.classList.remove('visible');
    });
  }

  window.addEventListener('resize', applySidebarState);


  /* ── Sidebar accordion ────────────────────────────────────── */
  document.querySelectorAll('.sidebar-group-toggle').forEach(function (btn) {
    const sub = btn.nextElementSibling;
    if (sub && sub.querySelector('.sidebar-item.active')) {
      btn.classList.add('open');
      sub.classList.add('open');
    }
    btn.addEventListener('click', function () {
      if (sidebar.classList.contains('collapsed')) return;
      btn.classList.toggle('open');
      if (sub) sub.classList.toggle('open');
    });
  });


/* ── Flash auto-dismiss ───────────────────────────────── */
window.dismissFlash = function(btn) {
  const flash = btn.closest('.flash');
  if (!flash) return;
  flash.classList.add('dismissing');
  flash.addEventListener('animationend', () => flash.remove(), { once: true });
};

// Auto-dismiss after 5 s
document.querySelectorAll('.flash').forEach(function(flash) {
  setTimeout(function() {
    if (flash.isConnected) {
      flash.classList.add('dismissing');
      flash.addEventListener('animationend', () => flash.remove(), { once: true });
    }
  }, 5000);
});

  /* ── Modal helpers ────────────────────────────────────────── */
  window.openModal = function (id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
  };
  window.closeModal = function (id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
  };
  window.handleOverlayClick = function (e, id) {
    if (e.target === e.currentTarget) window.closeModal(id);
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.custom-modal-overlay.open').forEach(m => {
        m.classList.remove('open');
      });
      document.body.style.overflow = '';
    }
  });

});