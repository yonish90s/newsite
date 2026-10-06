// ============================================================
// תפריט נגישות — כפתור צף + פאנל הגדרות (נשמר בדפדפן של הגולש)
// ============================================================
(function () {
  const STORE_KEY = 'a11y-settings-v1';
  const DEFAULTS = {
    zoom: 100,       // גודל טקסט באחוזים
    lineHeight: 100, // מרווח שורות באחוזים
    letter: 0,       // מרווח אותיות (צעדים)
    font: false, align: false,
    contrast: '',    // '' | 'dark' | 'light' | 'invert' | 'gray'
    links: false, headings: false, focus: false, cursor: false,
    guide: false, mask: false, motion: false, images: false
  };
  let s = Object.assign({}, DEFAULTS);
  try { Object.assign(s, JSON.parse(localStorage.getItem(STORE_KEY) || '{}')); } catch (e) {}

  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) {} };

  const ICONS = {
    person: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10.5"/><circle cx="12" cy="6.6" r="1.4" fill="currentColor"/><path d="M6.5 9.3l5.5 1.2 5.5-1.2M12 10.5v4M9.5 19l2.5-4.5 2.5 4.5"/></svg>',
    font: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20L12 4l7 16M8 14h8"/></svg>',
    align: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M8 10h12M4 14h16M10 18h10"/></svg>',
    dark: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    light: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    invert: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>',
    gray: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="12" r="6"/><circle cx="15" cy="12" r="6"/></svg>',
    links: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>',
    headings: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 4v16M18 4v16M6 12h12"/></svg>',
    focus: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><circle cx="12" cy="12" r="3"/></svg>',
    cursor: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 3l14 7-6 2-2 6z"/></svg>',
    guide: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M4 18h16"/><rect x="3" y="10" width="18" height="4" rx="1" fill="currentColor"/></svg>',
    mask: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18"/><rect x="3" y="3" width="18" height="6" fill="currentColor" opacity=".35"/><rect x="3" y="15" width="18" height="6" fill="currentColor" opacity=".35"/></svg>',
    motion: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6" stroke-linecap="round"/></svg>',
    images: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16l5-5 5 5M14 14l2-2 5 5M3 3l18 18"/></svg>'
  };

  const stepper = (key, label, unit) => `
    <div class="a11y-row">
      <span class="a11y-row-label">${label}</span>
      <div class="a11y-stepper">
        <button type="button" class="a11y-step" data-step="${key}" data-dir="-1" aria-label="הקטנת ${label}">−</button>
        <span class="a11y-step-val" data-val="${key}"></span>
        <button type="button" class="a11y-step" data-step="${key}" data-dir="1" aria-label="הגדלת ${label}">+</button>
      </div>
    </div>`;
  const tile = (key, label, group) => `
    <button type="button" class="a11y-tile" data-toggle="${key}"${group ? ` data-group="${group}"` : ''} aria-pressed="false">
      ${ICONS[key]}<span>${label}</span>
    </button>`;

  const root = document.createElement('div');
  root.className = 'a11y-root';
  root.innerHTML = `
    <button type="button" class="a11y-launcher" aria-label="תפריט נגישות — פתיחת הגדרות נגישות ותצוגה" aria-expanded="false" aria-controls="a11y-panel">${ICONS.person}</button>
    <div class="a11y-panel" id="a11y-panel" role="dialog" aria-modal="false" aria-labelledby="a11y-title" hidden>
      <div class="a11y-head">
        <h2 id="a11y-title">הגדרות נגישות</h2>
        <button type="button" class="a11y-close" aria-label="סגירת הגדרות הנגישות">✕</button>
      </div>
      <div class="a11y-body">
        <h3>טקסט</h3>
        ${stepper('zoom', 'גודל טקסט')}
        ${stepper('lineHeight', 'מרווח שורות')}
        ${stepper('letter', 'מרווח אותיות')}
        <div class="a11y-grid">${tile('font', 'פונט קריא')}${tile('align', 'יישור לימין')}</div>

        <h3>צבע וניגודיות</h3>
        <div class="a11y-grid">
          ${tile('dark', 'ניגודיות כהה', 'contrast')}${tile('light', 'ניגודיות בהירה', 'contrast')}
          ${tile('invert', 'היפוך צבעים', 'contrast')}${tile('gray', 'גווני אפור', 'contrast')}
        </div>

        <h3>עזרי ניווט וקריאה</h3>
        <div class="a11y-grid">
          ${tile('links', 'הדגשת קישורים')}${tile('headings', 'הדגשת כותרות')}
          ${tile('focus', 'סימון פוקוס')}${tile('cursor', 'סמן עכבר גדול')}
          ${tile('guide', 'סרגל קריאה')}${tile('mask', 'מסכת קריאה')}
        </div>

        <h3>תנועה ומדיה</h3>
        <div class="a11y-grid">${tile('motion', 'עצירת אנימציות')}${tile('images', 'הסתרת תמונות')}</div>
      </div>
      <div class="a11y-foot">
        <button type="button" class="a11y-reset">איפוס כל ההגדרות</button>
      </div>
    </div>
    <div class="a11y-guide-bar" aria-hidden="true"></div>
    <div class="a11y-mask-top" aria-hidden="true"></div>
    <div class="a11y-mask-bottom" aria-hidden="true"></div>`;

  const LIMITS = {
    zoom:       { min: 80, max: 200, step: 10, fmt: v => v + '%' },
    lineHeight: { min: 100, max: 250, step: 25, fmt: v => v + '%' },
    letter:     { min: 0, max: 10, step: 1, fmt: v => String(v) }
  };
  const TOGGLE_CLASSES = ['font', 'align', 'links', 'headings', 'focus', 'cursor', 'guide', 'mask', 'motion', 'images'];

  function apply() {
    const html = document.documentElement;
    html.style.setProperty('--a11y-zoom', s.zoom / 100);
    html.style.setProperty('--a11y-lh', (1.5 * s.lineHeight / 100).toFixed(2));
    html.style.setProperty('--a11y-ls', (s.letter * 0.04).toFixed(2) + 'em');
    html.classList.toggle('a11y-zoomed', s.zoom !== 100);
    html.classList.toggle('a11y-lh', s.lineHeight !== 100);
    html.classList.toggle('a11y-ls', s.letter !== 0);
    TOGGLE_CLASSES.forEach(k => html.classList.toggle('a11y-' + k, !!s[k]));
    ['dark', 'light', 'invert', 'gray'].forEach(c => html.classList.toggle('a11y-c-' + c, s.contrast === c));

    root.querySelectorAll('[data-val]').forEach(el => { const k = el.dataset.val; el.textContent = LIMITS[k].fmt(s[k]); });
    root.querySelectorAll('[data-toggle]').forEach(btn => {
      const k = btn.dataset.toggle;
      const on = btn.dataset.group ? s.contrast === k : !!s[k];
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const anyOn = Object.keys(DEFAULTS).some(k => s[k] !== DEFAULTS[k]);
    root.querySelector('.a11y-launcher').classList.toggle('has-settings', anyOn);
  }

  function setOpen(open) {
    const panel = root.querySelector('.a11y-panel');
    const launcher = root.querySelector('.a11y-launcher');
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) root.querySelector('.a11y-close').focus();
    else launcher.focus();
  }

  root.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.classList.contains('a11y-launcher')) { setOpen(root.querySelector('.a11y-panel').hidden); return; }
    if (t.classList.contains('a11y-close')) { setOpen(false); return; }
    if (t.classList.contains('a11y-reset')) { s = Object.assign({}, DEFAULTS); save(); apply(); return; }
    if (t.dataset.step) {
      const k = t.dataset.step, L = LIMITS[k];
      s[k] = Math.min(L.max, Math.max(L.min, s[k] + Number(t.dataset.dir) * L.step));
      save(); apply(); return;
    }
    if (t.dataset.toggle) {
      const k = t.dataset.toggle;
      if (t.dataset.group) s.contrast = (s.contrast === k) ? '' : k;
      else s[k] = !s[k];
      save(); apply();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !root.querySelector('.a11y-panel').hidden) setOpen(false);
  });

  // סרגל קריאה / מסכת קריאה — עוקבים אחרי העכבר או האצבע
  function track(y) {
    const html = document.documentElement;
    if (!html.classList.contains('a11y-guide') && !html.classList.contains('a11y-mask')) return;
    root.querySelector('.a11y-guide-bar').style.top = (y - 6) + 'px';
    root.querySelector('.a11y-mask-top').style.height = Math.max(0, y - 60) + 'px';
    root.querySelector('.a11y-mask-bottom').style.top = (y + 60) + 'px';
  }
  document.addEventListener('mousemove', e => track(e.clientY), { passive: true });
  document.addEventListener('touchmove', e => { if (e.touches[0]) track(e.touches[0].clientY); }, { passive: true });

  function init() {
    document.body.appendChild(root);
    apply();
    track(window.innerHeight / 2);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
