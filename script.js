import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, set, get, child, onValue, push, update, increment, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// מסך מלא (מצב מחשב) — מוגדר מוקדם כדי שבוני העמודים יוכלו לקרוא אותו
let pageFullWidth = (function () {
  try { return localStorage.getItem('page_full_width') === '1'; } catch (e) { return false; }
})();
document.documentElement.classList.toggle('page-full-width', pageFullWidth);

// הגדרות הפרויקט של Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCpVZS9qEnpPz-gyu12yD3FLiu3Lf-Tg04",
    authDomain: "newsite-f76e2.firebaseapp.com",
    databaseURL: "https://newsite-f76e2-default-rtdb.firebaseio.com",
    projectId: "newsite-f76e2",
    storageBucket: "newsite-f76e2.firebasestorage.app",
    messagingSenderId: "484000020563",
    appId: "1:484000020563:web:da9bd9cfd08d63433d6ea6",
    measurementId: "G-7W3NCN6GQP"
};

// אתחול פיירבייס והגדרת ה-Auth והפרוביידר של גוגל
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getDatabase(app);

// הגדרת התראות מעוצבות ומאוירות במקום התראות הדפדפן הרגילות
window.alert = function(message) {
  if (!document.getElementById('custom-alert-styles')) {
    const style = document.createElement('style');
    style.id = 'custom-alert-styles';
    style.textContent = `
      .custom-alert-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        z-index: 1000000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.25s ease;
        direction: rtl;
        font-family: system-ui, -apple-system, sans-serif;
        padding: 20px;
      }
      .custom-alert-overlay.show {
        opacity: 1;
      }
      .custom-alert-card {
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.25);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15), 0 0 120px rgba(225, 29, 72, 0.05);
        border-radius: 28px;
        width: 100%;
        max-width: 360px;
        padding: 32px 24px 24px;
        text-align: center;
        transform: scale(0.85) translateY(15px);
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
      }
      .custom-alert-overlay.show .custom-alert-card {
        transform: scale(1) translateY(0);
      }
      .custom-alert-icon-wrap {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: rgba(225, 29, 72, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #e11d48;
        font-size: 34px;
        box-shadow: inset 0 2px 10px rgba(225, 29, 72, 0.1), 0 8px 20px rgba(225, 29, 72, 0.05);
        margin-bottom: 4px;
      }
      .custom-alert-message {
        font-size: 16px;
        font-weight: 700;
        color: #111827;
        line-height: 1.6;
        margin: 0;
        white-space: pre-line;
      }
      .custom-alert-btn {
        background: #e11d48;
        color: white;
        border: none;
        border-radius: 50px;
        padding: 12px 36px;
        font-size: 15px;
        font-weight: 800;
        cursor: pointer;
        width: 100%;
        transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
        box-shadow: 0 4px 15px rgba(225, 29, 72, 0.3);
      }
      .custom-alert-btn:hover {
        background: #be123c;
        box-shadow: 0 6px 20px rgba(225, 29, 72, 0.45);
      }
      .custom-alert-btn:active {
        transform: scale(0.98);
      }
    `;
    document.head.appendChild(style);
  }

  const overlay = document.createElement('div');
  overlay.className = 'custom-alert-overlay';
  
  let icon = '🔔';
  if (message.includes('התחבר') || message.includes('רשום')) {
    icon = '🔑';
  } else if (message.includes('שגיאה') || message.includes('נכשל') || message.includes('גדול מדי') || message.includes('לא הוגדר')) {
    icon = '❌';
  } else if (message.includes('בהצלחה') || message.includes('נשמר') || message.includes('אושר') || message.includes('שוחזר')) {
    icon = '✨';
  } else if (message.includes('מחיקה') || message.includes('למחוק')) {
    icon = '🗑️';
  } else if (message.includes('שים לב') || message.includes('חובה') || message.includes('לפחות')) {
    icon = '⚠️';
  }

  overlay.innerHTML = `
    <div class="custom-alert-card">
      <div class="custom-alert-icon-wrap">${icon}</div>
      <p class="custom-alert-message">${message}</p>
      <button class="custom-alert-btn">אישור</button>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.offsetHeight; 
  overlay.classList.add('show');

  const closeAlert = () => {
    overlay.classList.remove('show');
    setTimeout(() => {
      overlay.remove();
    }, 250);
  };

  overlay.querySelector('.custom-alert-btn').addEventListener('click', closeAlert);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAlert();
  });
};

function updateUserActivity(user) {
  if (!user) return;
  try {
    const userRef = ref(db, `website/users/${user.uid}/last_seen`);
    set(userRef, Date.now());
  } catch (e) {
    console.error("Error updating user activity:", e);
  }
}
window.updateUserActivity = updateUserActivity;

// --- מעקב ביקורים לאנליטיקת האתר (למנהל) ---
function _analyticsDayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function _analyticsMonthKey(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function trackVisit() {
  try {
    const today = _analyticsDayKey();
    // צפיית עמוד בכל טעינה
    update(ref(db, 'website/analytics'), { pageviews: increment(1) }).catch(function () {});
    // ביקור ייחודי — נספר פעם אחת ביום לכל דפדפן
    const last = localStorage.getItem('last_visit_day');
    if (last !== today) {
      localStorage.setItem('last_visit_day', today);
      update(ref(db, 'website/analytics'), {
        visits: increment(1),
        ['daily/' + today]: increment(1),
        ['monthly/' + _analyticsMonthKey()]: increment(1)
      }).catch(function () {});
    }
  } catch (e) {}
}
window.trackVisit = trackVisit;

// מעקב פעולות אנונימי (בלי מידע אישי) — מונים לפי סוג פעולה ויום, לחישוב הקלקות ואחוז נטישה ב-CRM.
// "ביקור מעורב" = ביקור שבו הגולש עשה לפחות פעולה אחת (אחרת הוא נחשב נטישה).
const TRACK_EVENTS = ['gallery_open', 'story_open', 'like', 'save', 'upload_submit', 'subscribe_click', 'search', 'dm_send', 'comment'];
function trackEvent(name) {
  if (TRACK_EVENTS.indexOf(name) === -1) return;
  try {
    const day = _analyticsDayKey();
    const upd = { ['events/' + name]: increment(1), ['events_daily/' + day + '/' + name]: increment(1) };
    let engagedNow = false;
    try { engagedNow = sessionStorage.getItem('crm_engaged') !== '1'; if (engagedNow) sessionStorage.setItem('crm_engaged', '1'); } catch (e) {}
    if (engagedNow) {
      upd['events/engaged_visit'] = increment(1);
      upd['events_daily/' + day + '/engaged_visit'] = increment(1);
    }
    update(ref(db, 'website/analytics'), upd).catch(function () {});
  } catch (e) {}
}
window.trackEvent = trackEvent;
function trackSessionStart() {
  try {
    if (sessionStorage.getItem('crm_session') === '1') return;
    sessionStorage.setItem('crm_session', '1');
    const day = _analyticsDayKey();
    update(ref(db, 'website/analytics'), { 'events/visit_session': increment(1), ['events_daily/' + day + '/visit_session']: increment(1) }).catch(function () {});
  } catch (e) {}
}
try { trackSessionStart(); } catch (e) {}

/**
 * ============================================================================
 * YHSH Website Builder - מנוע האתר המרכזי
 * ============================================================================
 * 
 * תוכן עניינים מהיר (Table of Contents):
 * --------------------------------------
 * 1. הגדרות בסיס ומצב התחלתי (State)
 * 2. תפיסת אלמנטים מרכזיים מה-HTML (DOM Elements)
 * 3. פונקציות ליבה (Rendering & Logic - שמירה, טעינה וניווט)
 * 4. מערכת העריכה הויזואלית (Edit Mode, מודלים, קישורים)
 * 5. מנגנוני הוספת עמודים וניווט
 * 6. גרירה, שינוי גודל (interact.js) ומנגנון בחירה מרובה (Marquee)
 * 7. הוספת אלמנטים חדשים (טקסט, תמונות, כפתורים - מסרגל הכלים)
 * 8. פונקציות עזר (העתקה, הדבקה, מחיקה)
 * 9. אנימציות וסרגלי כלים מרחפים
 * 10. קיצורי מקלדת מקצועיים (Shortcuts - Ctrl+C/V/Z)
 * 11. מערכות צד ג' (Cookie Consent, צ'אט תמיכה)
 * 
 * הערה ארכיטקטונית (Architecture Note):
 * -------------------------------------
 * נכון לעכשיו, קוד זה (והממשק הויזואלי כולו) משמש את *מנהל האתר* (Admin / Editor).
 * כל הכלים כאן נועדו לבניית האתר ועריכתו בזמן אמת.
 * בעתיד ייווצר "מצב צופה" ללא יכולות עריכה עבור משתמשי הקצה.
 * ============================================================================
 */
// --- שלב 1: הגדרות בסיס ומצב התחלתי (State) ---

// נגדיר את רשימת העמודים ההתחלתית שלנו (ברירת המחדל למקרה שאין כלום בזיכרון)
const defaultPages = [
  {
    id: 'page-main',
    title: 'כתבות',
    content: ''
  }
];

// הגדרות ברירת מחדל (יוחלפו אם יש שמירה)
let pages = defaultPages;
let activePageId = 'page-photos-main';
let topNavPages = ['page-ideas-main']; // העמודים שמופיעים בתפריט העליון
// עמודים שמופיעים רק בסרגל הצד ("עמודי צד") ולא בתפריט העליון
const SIDE_ONLY_PAGE_IDS = ['page-questions-main', 'page-offers-main', 'page-photos-main', 'page-stories-main'];
// זיהוי עמוד צד לפי מזהה, תוכן או כותרת (העמודים עשויים להיווצר עם מזהים דינמיים)
function isSideOnlyPage(p) {
  if (!p) return false;
  // "מוצרי יד שניה" ו"שותפויות" הם עמודים ראשיים בתפריט העליון (למרות תוכן photos-page)
  if (p.id === 'page-secondhand-main' || (p.content || '').includes('secondhand-page') || (p.title || '').includes('יד שניה')) return false;
  if (p.id === 'page-partnerships-main' || (p.content || '').includes('partnerships-page') || (p.title || '').includes('שותפויות')) return false;
  if (p.id === 'page-reviews-main' || (p.content || '').includes('reviews-page') || (p.title || '').includes('ביקורת')) return false;
  if (p.id === 'page-subscription-main' || (p.content || '').includes('subscription-page') || (p.title || '').includes('מנוי')) return false;
  if (SIDE_ONLY_PAGE_IDS.includes(p.id)) return true;
  const t = p.title || '', c = p.content || '';
  if (c.includes('photos-page') || c.includes('stories-page') || c.includes('questions-page') || c.includes('offers-page')) return true;
  if (t.includes('תמונות') || t.includes('סיפורים') || t.includes('שאלות גולשים') || t.includes('הצעות')) return true;
  return false;
}
function isSideOnlyId(id) {
  if (SIDE_ONLY_PAGE_IDS.includes(id)) return true;
  const p = (typeof pages !== 'undefined' && Array.isArray(pages)) ? pages.find(x => x && x.id === id) : null;
  return isSideOnlyPage(p);
}
let isEditMode = false; // ברירת מחדל: אורח (ללא עריכה)
let undoStack = []; // מערך לשמירת היסטוריית שינויים לצורך ביטול (Undo)
let siteBackgrounds = { dashboard: null, topNav: null, main: null };
let hideCart = false;
let hideChat = false;
let deleteCart = false;
let deleteChat = false;

// פונקציית עזר לבדיקה האם המשתמש המחובר כרגע הוא המנהל המורשה
const isAdmin = () => auth.currentUser && auth.currentUser.email === "yoni98321@gmail.com";

// מפתחות ציבוריים של האתר. כללי האבטחה חוסמים קריאה של כל website (הודעות, משתמשים וכו'),
// ולכן קוראים רק את המפתחות האלה, כל אחד בנפרד.
const PUBLIC_SITE_KEYS = ['pages', 'topNavPages', 'siteBackgrounds', 'promotedSites', 'socialLinks',
  'onboardingVideos', 'hideCart', 'hideChat', 'deleteCart', 'deleteChat', 'item_likes',
  'storyCategories', 'photoBarCategories'];

async function fetchPublicSiteData() {
  const snaps = await Promise.all(PUBLIC_SITE_KEYS.map(k => get(ref(db, 'website/' + k)).catch(() => null)));
  const data = {};
  snaps.forEach((s, i) => { if (s && s.exists()) data[PUBLIC_SITE_KEYS[i]] = s.val(); });
  return data;
}

// מאזין לכל המפתחות הציבוריים ומפעיל את cb עם אובייקט מאוחד (באיחוד קצר של עדכונים סמוכים)
function onPublicSiteValue(cb) {
  const data = {};
  let timer = null;
  PUBLIC_SITE_KEYS.forEach(k => {
    onValue(ref(db, 'website/' + k), (snap) => {
      if (snap.exists()) data[k] = snap.val(); else delete data[k];
      clearTimeout(timer);
      timer = setTimeout(() => cb({ ...data }), 60);
    }, () => {});
  });
}

// לייקים נשמרים בנפרד (website/item_likes/{id}) כי גולשים לא כותבים ל-pages.
// מעדכנים את מוני הלייקים בתוך נתוני העמודים לפי הערכים האלה.
function applyItemLikesToPages(pageList, likes) {
  if (!likes || !Array.isArray(pageList)) return false;
  let changed = false;
  pageList.forEach(p => {
    if (!p || !p.content) return;
    p.content = p.content.replace(/data-(photos|stories)-json="([^"]*)"/g, (full, kind, enc) => {
      let arr;
      try { arr = JSON.parse(decodeURIComponent(enc)); } catch (e) { return full; }
      if (!Array.isArray(arr)) return full;
      let touched = false;
      arr.forEach(item => {
        if (item && item.id && typeof likes[item.id] === 'number' && item.likes !== likes[item.id]) {
          item.likes = likes[item.id];
          touched = true;
        }
      });
      if (!touched) return full;
      changed = true;
      return `data-${kind}-json="${encodeURIComponent(JSON.stringify(arr))}"`;
    });
  });
  return changed;
}

// משתמש "רשום" אמיתי = מחובר ואינו אנונימי. אורח אנונימי אינו נחשב משתמש רשום
// (אם יתנתק ויתחבר שוב הוא משתמש אחר), ולכן אין לו פרופיל/אימות/משימות.
const isRegisteredUser = () => auth.currentUser && !auth.currentUser.isAnonymous;
window.isRegisteredUser = isRegisteredUser;

// מוודא שיש משתמש מחובר. אם אין — מתחבר אנונימית (כאורח) כדי שכתיבות ל-Firebase
// (למשל בקשת פרסום) יעברו את כללי האבטחה. מחזיר true אם יש/נוצר משתמש.
async function ensureGuestSignedIn() {
  try {
    if (auth.currentUser) return true;
    await signInAnonymously(auth);
    return !!auth.currentUser;
  } catch (e) {
    console.error('anonymous (guest) sign-in failed:', e);
    return false;
  }
}
window.ensureGuestSignedIn = ensureGuestSignedIn;

// --- מערכות דינמיות ---
// פונקציה ליישום הרקעים למסך
function applyBackgrounds() {
  const dash = document.querySelector('.side-dashboard');
  const top = document.querySelector('.top-bar');
  const mainWrapper = document.body;
  
  if (siteBackgrounds.dashboard) {
    if (dash) {
      dash.style.backgroundImage = `url(${siteBackgrounds.dashboard})`;
      dash.style.backgroundSize = 'cover';
      dash.style.backgroundPosition = 'center';
    }
  } else {
    if (dash) dash.style.backgroundImage = '';
  }
  
  if (siteBackgrounds.topNav) {
    if (top) {
      top.style.backgroundImage = `url(${siteBackgrounds.topNav})`;
      top.style.backgroundSize = 'cover';
      top.style.backgroundPosition = 'center';
    }
  } else {
    if (top) top.style.backgroundImage = '';
  }
  
  // רקע ייחודי לכל עמוד
  const currentPage = pages.find(p => p.id === activePageId);
  const mainContentEl = document.getElementById('mainContent');
  if (mainContentEl) {
    if (currentPage && currentPage.background) {
      mainContentEl.style.backgroundImage = `url(${currentPage.background})`;
      mainContentEl.style.backgroundSize = 'cover';
      mainContentEl.style.backgroundPosition = 'center';
    } else if (siteBackgrounds.main) {
      mainContentEl.style.backgroundImage = `url(${siteBackgrounds.main})`;
      mainContentEl.style.backgroundSize = 'cover';
      mainContentEl.style.backgroundPosition = 'center';
    } else {
      mainContentEl.style.backgroundImage = '';
    }
  }
}

// עדכון נראות של כפתורי העגלה והצ'אט לפי הגדרות מנהל
function updateFABsVisibility() {
  const cartFab = document.getElementById('global-shop-cart-fab');
  const chatFab = document.getElementById('global-chat-fab');
  const cartControls = document.getElementById('cart-admin-controls');
  const chatControls = document.getElementById('chat-admin-controls');
  const btnRestoreCart = document.getElementById('btn-restore-cart');
  const btnRestoreChat = document.getElementById('btn-restore-chat');
  
  const admin = isAdmin();
  const edit = isEditMode; // האם כרגע במצב עריכה פעיל

  // 1. טיפול בעגלת קניות
  if (cartFab) {
    if (deleteCart) {
      cartFab.style.display = 'none';
      if (cartControls) cartControls.style.display = 'none';
      if (btnRestoreCart && edit) btnRestoreCart.style.display = 'inline-block';
    } else {
      if (btnRestoreCart) btnRestoreCart.style.display = 'none';
      if (hideCart) {
        cartFab.style.display = edit ? 'flex' : 'none';
        cartFab.style.opacity = edit ? '0.4' : '1';
      } else {
        cartFab.style.display = 'flex';
        cartFab.style.opacity = '1';
      }
      if (cartControls) {
        cartControls.style.display = edit ? 'flex' : 'none';
      }
    }
  }

  // 2. טיפול בצ'אט תמיכה
  if (chatFab) {
    if (deleteChat) {
      chatFab.style.display = 'none';
      if (chatControls) chatControls.style.display = 'none';
      if (btnRestoreChat && edit) btnRestoreChat.style.display = 'inline-block';
    } else {
      if (btnRestoreChat) btnRestoreChat.style.display = 'none';
      if (hideChat) {
        chatFab.style.display = edit ? 'flex' : 'none';
        chatFab.style.opacity = edit ? '0.4' : '1';
      } else {
        chatFab.style.display = 'flex';
        chatFab.style.opacity = '1';
      }
      if (chatControls) {
        chatControls.style.display = edit ? 'flex' : 'none';
      }
    }
  }

  // 3. עדכון האייקונים של העין/קוף בכפתורים המרחפים
  const cartHideIcon = document.getElementById('cart-hide-icon');
  const chatHideIcon = document.getElementById('chat-hide-icon');
  if (cartHideIcon) {
    cartHideIcon.textContent = hideCart ? '🙈' : '👁️';
    cartHideIcon.title = hideCart ? 'הצג עגלה' : 'הסתר עגלה';
  }
  if (chatHideIcon) {
    chatHideIcon.textContent = hideChat ? '🙈' : '👁️';
    chatHideIcon.title = hideChat ? 'הצג צ\'אט' : 'הסתר צ\'אט';
  }
}

// כמה זמן מחכים ל-Firebase לפני שמציגים את האתר מהגיבוי המקומי.
// בלי התקרה הזו כל הרינדור תלוי בבקשת רשת אחת: כש-WebSocket של
// Firebase נתקע (רשת חוסמת, חיבור איטי) ה-get לא נפתר ולא נכשל,
// initSite נתקע לנצח, והגולש נשאר מול שלד ריק של האתר.
const BOOT_FETCH_TIMEOUT_MS = 4000;

// מסיר עמודי תמונות/סיפורים כפולים: מכל סוג משאיר את העמוד עם התוכן העשיר ביותר
// ומוחק את הכפולים/הריקים (למשל עמוד "סיפורים" ריק לצד עמוד סיפורים עם תוכן).
function dedupePageList(list) {
  if (!Array.isArray(list)) return list;
  const removeIds = new Set();
  // עמודי תמונות מחולקים ל"סקשנים" (photos / yad2 / prices) — לא ממזגים בין סקשנים שונים
  const sectionOf = c => { const m = (c || '').match(/data-section="([^"]+)"/); return m ? m[1] : 'photos'; };
  // עמודי סיפורים מחולקים לפי "סוג" (קומיקס / סיפורים) כדי שלא ימוזגו לאחד
  const storyKindOf = c => { const m = (c || '').match(/data-story-kind="([^"]+)"/); return m ? m[1] : 'comics'; };
  ['stories-page', 'photos-page'].forEach(kind => {
    const matches = list.filter(p => p && (p.content || '').includes(kind) && !(p.content || '').includes('photos-stories-feed'));
    if (matches.length <= 1) return;
    const groups = {};
    matches.forEach(p => {
      const key = kind === 'photos-page' ? sectionOf(p.content) : storyKindOf(p.content);
      (groups[key] = groups[key] || []).push(p);
    });
    Object.values(groups).forEach(grp => {
      if (grp.length <= 1) return;
      grp.sort((a, b) => (b.content || '').length - (a.content || '').length);
      grp.slice(1).forEach(p => { if (p && p.id) removeIds.add(p.id); });
    });
  });
  return removeIds.size ? list.filter(p => !p || !removeIds.has(p.id)) : list;
}

// עמודים שהוסרו — מנקים אותם מכל מקום (מהעמודים השמורים ומהתפריט)
const REMOVED_PHOTO_PAGE_IDS = ['page-yad2-main', 'page-prices-main'];

// משנה את עמוד הסיפורים הקיים (התוכן הקומיקסי) ל"קומיקס", ומוסיף עמוד "סיפורים" חדש
// לסיפורי טקסט. אידמפוטנטי — רץ בכל טעינה בלי ליצור כפולים.
function setupComicsStoriesPages() {
  if (!Array.isArray(pages)) return;
  // 1. העמוד הישן (קומיקס) = עמוד stories שאינו עמוד הסיפורים החדש ואינו עמוד התמונות/פיד
  const comics = pages.find(p => p && p.id !== 'page-stories-text' && p.id !== 'page-home-feed'
    && (p.content || '').includes('stories-page')
    && !(p.content || '').includes('home-feed-page')
    && !(p.content || '').includes('photos-page')
    && !(p.content || '').includes('photos-stories-feed'));
  if (comics && comics.title !== 'קומיקס') comics.title = 'קומיקס';
  // 2. עמוד "סיפורים" חדש (טקסט) — יוצרים אם עדיין אין
  if (!pages.some(p => p && p.id === 'page-stories-text') && typeof buildStoriesPage === 'function') {
    pages.push({ id: 'page-stories-text', title: 'סיפורים', content: buildStoriesPage([], 'stories') });
  }
  // 3. עמוד "קומיקס" — אם אין אף עמוד קומיקס (העמוד הקודם אבד), יוצרים חדש ריק,
  //    בנוי בדיוק כמו העמוד המקורי: id=page-stories-main, סוג 'comics', שלד buildStoriesPage.
  if (!comics && !pages.some(p => p && p.id === 'page-stories-main') && typeof buildStoriesPage === 'function') {
    pages.push({ id: 'page-stories-main', title: 'קומיקס', content: buildStoriesPage([], 'comics') });
  }
}

function sanitizeToOnlyPhotosAndStories() {
  if (!Array.isArray(pages)) pages = [];

  // מסננים עמודי מחשבונים ישנים בלבד (ריבית דריבית ו-Everything Money)
  pages = pages.filter(p => p && p.id !== 'page-ci' && p.id !== 'page-em' && !p.title?.includes('ריבית') && !p.title?.includes('Everything'));

  // מסירים עמודי תמונות/סיפורים כפולים (משאירים את זה עם התוכן)
  pages = dedupePageList(pages);

  // לפי בקשת המשתמש: משאירים רק עמודי תמונות וסיפורים (מוחקים כתבות/קהילה וכל עמוד אחר).
  // מסננים רק כשקיים לפחות עמוד תמונות/סיפורים אחד, כדי לא לרוקן אתר תקין בטעות.
  if (pages.some(p => p && ((p.content || '').includes('photos-page') || (p.content || '').includes('stories-page')))) {
    pages = pages.filter(p => p && (p.id === 'page-home-feed' || p.id === 'page-subscription-main' || (p.content || '').includes('home-feed-page') || (p.content || '').includes('subscription-page') || (p.content || '').includes('photos-page') || (p.content || '').includes('stories-page') || (p.content || '').includes('ideas-page') || (p.content || '').includes('communities-page') || (p.content || '').includes('info-page') || (p.content || '').includes('requests-page') || (p.content || '').includes('questions-page') || (p.content || '').includes('offers-page')));
  }

  // בוטסטראפ של עמודי ברירת המחדל (תמונות + סיפורים) רק כאשר אין אף עמוד באתר.
  // כך המנהל יכול למחוק עמודים לצמיתות מבלי שהם ייווצרו מחדש בכל שמירה.
  if (pages.length === 0) {
    pages.push({ id: 'page-photos-main', title: 'תמונות 🖼️', content: typeof buildPhotosPage === 'function' ? buildPhotosPage(typeof PHOTOS_SAMPLES !== 'undefined' ? PHOTOS_SAMPLES : []) : '' });
    pages.push({ id: 'page-stories-main', title: 'קומיקס', content: typeof buildStoriesPage === 'function' ? buildStoriesPage(typeof STORIES_SAMPLES !== 'undefined' ? STORIES_SAMPLES : [], 'comics') : '' });
    pages.push({ id: 'page-ideas-main', title: 'רעיונות 💡', content: '<div class="ideas-page" data-page-id="page-ideas-main"></div>' });
  }

  // קומיקס + סיפורים: משנים את עמוד הסיפורים הישן ל"קומיקס" ומוסיפים עמוד "סיפורים" חדש (טקסט)
  setupComicsStoriesPages();

  // עמוד "רעיונות": מוודאים שהוא קיים
  const _ideasPage = pages.find(p => p && p.id === 'page-ideas-main');
  const _ideasContent = '<div class="ideas-page" data-page-id="page-ideas-main"></div>';
  if (!_ideasPage) {
    pages.push({ id: 'page-ideas-main', title: 'רעיונות 💡', isHidden: false, content: _ideasContent });
  } else {
    // לא מאלצים isHidden=false — מכבדים אם המנהל הסתיר את העמוד
    if (!_ideasPage.title) _ideasPage.title = 'רעיונות 💡';
    _ideasPage.content = _ideasContent;
  }

  // עמוד "קהילות": מוודאים שהוא קיים תמיד (נוסף גם לאתרים קיימים), ומרפאים
  // את תוכנו לפלייסהולדר קבוע כדי שלא ייפגע בטעות משמירות קודמות.
  const _commPage = pages.find(p => p && p.id === 'page-communities-main');
  const _commContent = '<div class="communities-page" data-page-id="page-communities-main"></div>';
  if (!_commPage) {
    pages.push({ id: 'page-communities-main', title: 'קהילות 🏘️', content: _commContent });
  } else {
    // תיקון שם בלבד: גרסאות קודמות שינו בטעות את שם עמוד הקהילות ל"קומיקס" — מחזירים ל"קהילות".
    // לא נוגעים ב-isHidden כאן כדי לכבד הסתרה/הצגה של המנהל (ראה repairCommunitiesAccessOnce).
    if (!_commPage.title || _commPage.title === 'קומיקס') _commPage.title = 'קהילות 🏘️';
    _commPage.content = _commContent;
  }

  // עמוד הבית: שורות מתחלפות קומיקס/סיפורים. מוודאים שהוא קיים תמיד (התוכן נבנה דינמית ברינדור).
  const _homePage = pages.find(p => p && p.id === 'page-home-feed');
  const _homeContent = '<div class="home-feed-page" data-page-id="page-home-feed"></div>';
  if (!_homePage) {
    // נוסף בראש הרשימה כדי להיות עמוד הבית הראשי
    pages.unshift({ id: 'page-home-feed', title: 'בית 🏠', content: _homeContent });
  } else {
    // מתקנים שם שגוי (למשל אם גרסה קודמת שינתה אותו ל"קומיקס") ומאפסים תוכן לפלייסהולדר
    if (!_homePage.title || _homePage.title === 'קומיקס') _homePage.title = 'בית 🏠';
    _homePage.content = _homeContent;
  }

  // עמוד "תמונות" — מוודאים שהוא קיים תמיד. בעבר קרו התנגשויות שמירה שבהן תוכן עמוד
  // התמונות (data-section="photos") נדבק לעמוד אחר (למשל "שותפויות"/"מוצרי יד שניה"),
  // וכך עמוד התמונות "נעלם" והכניסה אליו הובילה לעמוד הלא נכון. כאן מרפאים זאת:
  // אם אין עמוד תמונות תקין אך קיים עמוד אחר שמכיל את חתך התמונות — מחזירים לו את
  // הזהות הנכונה (id=page-photos-main, כותרת "תמונות"), והעמוד הזר ייווצר מחדש ריק בהמשך.
  if (!pages.some(p => p && p.id === 'page-photos-main')) {
    const _mislabeledPhotos = pages.find(p => p && p.id !== 'page-photos-main'
      && (p.content || '').includes('data-section="photos"'));
    if (_mislabeledPhotos) {
      _mislabeledPhotos.id = 'page-photos-main';
      _mislabeledPhotos.title = 'תמונות 🖼️';
      _mislabeledPhotos.isHidden = false;
      _mislabeledPhotos.content = (_mislabeledPhotos.content || '').replace(/data-page-id="[^"]*"/, 'data-page-id="page-photos-main"');
    } else if (typeof buildPhotosPage === 'function') {
      pages.push({ id: 'page-photos-main', title: 'תמונות 🖼️', content: buildPhotosPage([], 'photos') });
    }
  }
  // עמוד התמונות חייב להיות גלוי לכולם (גם אם בעבר סומן מוסתר בטעות)
  { const _pm = pages.find(p => p && p.id === 'page-photos-main'); if (_pm && _pm.isHidden) _pm.isHidden = false; }

  // עמוד "מוצרי יד שניה" — עמוד מסוג תמונות (גריד + חיפוש + סינון), הנתונים נשמרים בתוכן העמוד
  const _shPage = pages.find(p => p && p.id === 'page-secondhand-main');
  if (!_shPage) {
    const _shContent = (typeof buildPhotosPage === 'function')
      ? buildPhotosPage([], 'secondhand')
      : '<div class="photos-page secondhand-page" data-page-id="page-secondhand-main" data-section="secondhand" data-photos-json="%5B%5D"></div>';
    pages.push({ id: 'page-secondhand-main', title: 'מוצרי יד שניה 🛒', content: _shContent });
  } else {
    if (!_shPage.title) _shPage.title = 'מוצרי יד שניה 🛒';
  }

  // עמוד "שותפויות" — עמוד גריד (כמו יד 2)
  const _ptPage = pages.find(p => p && p.id === 'page-partnerships-main');
  if (!_ptPage) {
    const _ptContent = (typeof buildPhotosPage === 'function')
      ? buildPhotosPage([], 'partnerships')
      : '<div class="photos-page partnerships-page" data-page-id="page-partnerships-main" data-section="partnerships" data-photos-json="%5B%5D"></div>';
    pages.push({ id: 'page-partnerships-main', title: 'שותפויות 🤝', content: _ptContent });
  } else {
    if (!_ptPage.title) _ptPage.title = 'שותפויות 🤝';
  }

  // עמוד "ביקורת" — עמוד גריד (כמו שותפויות)
  const _rvPage = pages.find(p => p && p.id === 'page-reviews-main');
  if (!_rvPage) {
    const _rvContent = (typeof buildPhotosPage === 'function')
      ? buildPhotosPage([], 'reviews')
      : '<div class="photos-page reviews-page" data-page-id="page-reviews-main" data-section="reviews" data-photos-json="%5B%5D"></div>';
    pages.push({ id: 'page-reviews-main', title: 'ביקורת ⭐', content: _rvContent });
  } else {
    if (!_rvPage.title) _rvPage.title = 'ביקורת ⭐';
  }

  // מסירים לצמיתות את העמודים "יד שניה" ו"השוואת מחירים"
  pages = pages.filter(p => p && !REMOVED_PHOTO_PAGE_IDS.includes(p.id));

  // עמוד "מידע" — תמיד קיים אך מוסתר (מופיע בתפריט רק למנהל)
  const _infoContent = '<div class="info-page" data-page-id="page-info-main"></div>';
  const _infoPage = pages.find(p => p && p.id === 'page-info-main');
  if (!_infoPage) {
    pages.push({ id: 'page-info-main', title: 'מידע 🔒', isHidden: true, content: _infoContent });
  } else {
    if (_infoPage.isHidden === undefined) _infoPage.isHidden = true;
    _infoPage.content = _infoContent;
    if (!_infoPage.title) _infoPage.title = 'מידע 🔒';
  }

  // עמוד "בקשות" — תמיד קיים אך מוסתר (מופיע בתפריט רק למנהל, לאישור העלאות)
  const _reqContent = '<div class="requests-page" data-page-id="page-requests-main"></div>';
  const _reqPage = pages.find(p => p && p.id === 'page-requests-main');
  if (!_reqPage) {
    pages.push({ id: 'page-requests-main', title: 'בקשות 🔒', isHidden: true, content: _reqContent });
  } else {
    if (_reqPage.isHidden === undefined) _reqPage.isHidden = true;
    _reqPage.content = _reqContent;
    if (!_reqPage.title) _reqPage.title = 'בקשות 🔒';
  }

  // עמוד "שאלות גולשים" — תמיד קיים
  const _qContent = '<div class="questions-page" data-page-id="page-questions-main"></div>';
  const _qPage = pages.find(p => p && p.id === 'page-questions-main');
  if (!_qPage) {
    pages.push({ id: 'page-questions-main', title: 'שאלות גולשים ❓', content: _qContent });
  } else {
    _qPage.content = _qContent;
    if (!_qPage.title) _qPage.title = 'שאלות גולשים ❓';
  }

  // עמוד "הצעות" — תמיד קיים
  const _ofContent = '<div class="offers-page" data-page-id="page-offers-main"></div>';
  const _ofPage = pages.find(p => p && p.id === 'page-offers-main');
  if (!_ofPage) {
    pages.push({ id: 'page-offers-main', title: 'הצעות 🔥', content: _ofContent });
  } else {
    _ofPage.content = _ofContent;
    if (!_ofPage.title) _ofPage.title = 'הצעות 🔥';
  }

  // עמוד "מנוי" — תמיד קיים
  const _subContent = '<div class="subscription-page" data-page-id="page-subscription-main"></div>';
  const _subPage = pages.find(p => p && p.id === 'page-subscription-main');
  if (!_subPage) {
    pages.push({ id: 'page-subscription-main', title: 'מנוי 💎', content: _subContent });
  } else {
    _subPage.content = _subContent;
    if (!_subPage.title) _subPage.title = 'מנוי 💎';
  }

  // סנכרון התפריט העליון עם רשימת העמודים
  if (!Array.isArray(topNavPages) || topNavPages.length === 0) {
    topNavPages = pages.filter(p => !isSideOnlyPage(p)).map(p => p.id);
  } else {
    pages.forEach(p => {
      if (p && p.id && !topNavPages.includes(p.id) && !isSideOnlyPage(p)) topNavPages.push(p.id);
    });
  }
  topNavPages = topNavPages.filter(id => !isSideOnlyId(id));
  // מוודאים ש-page-ideas-main מופיע בתפריט העליון רק אם אינו מוסתר
  const _ideasPInit = pages.find(p => p && p.id === 'page-ideas-main');
  if (_ideasPInit && !_ideasPInit.isHidden) {
    topNavPages = topNavPages.filter(id => id !== 'page-ideas-main');
    topNavPages.unshift('page-ideas-main');
  } else {
    topNavPages = topNavPages.filter(id => id !== 'page-ideas-main');
  }
  // מסירים מהתפריט העליון עמודים שכבר לא קיימים (נמחקו)
  topNavPages = topNavPages.filter(id => pages.some(p => p && p.id === id));

  // עמוד הבית מוצג בתפריט העליון צמוד ל"קהילות" (לפי בקשת המשתמש: "תוסיף ליד קהילות")
  if (pages.some(p => p && p.id === 'page-home-feed')) {
    topNavPages = topNavPages.filter(id => id !== 'page-home-feed');
    const _ci = topNavPages.indexOf('page-communities-main');
    if (_ci >= 0) topNavPages.splice(_ci + 1, 0, 'page-home-feed');
    else topNavPages.push('page-home-feed');
  }

  // עמוד "מנוי" מוצג בתפריט העליון
  if (pages.some(p => p && p.id === 'page-subscription-main')) {
    if (!topNavPages.includes('page-subscription-main')) {
      topNavPages.push('page-subscription-main');
    }
  }

  if (!activePageId || !pages.some(p => p && p.id === activePageId)) {
    activePageId = pages[0] ? pages[0].id : null;
  }
}

// פונקציית אתחול מהירה (Instant 0ms First Paint)
async function initSite() {
  try {
    const savedPages = await localforage.getItem('mySitePages_v3');
    if (savedPages && savedPages.length) pages = savedPages;

    const savedBackgrounds = await localforage.getItem('mySiteBackgrounds_v3');
    if (savedBackgrounds) siteBackgrounds = savedBackgrounds;
    applyBackgrounds();
  } catch (localErr) {}

  sanitizeToOnlyPhotosAndStories();

  // עמוד הבית הראשי בעת כניסה לאתר הוא עמוד הבית (שורות מתחלפות קומיקס/סיפורים)
  let mainHomePage = pages.find(p => p && p.id === 'page-home-feed')
    || pages.find(p => p && p.id === 'page-photos-main')
    || pages.find(p => p && p.content && p.content.includes('data-section="photos"'))
    || pages.find(p => p && p.title && p.title.includes('תמונות'));
  if (mainHomePage) {
    activePageId = mainHomePage.id;
  }

  renderSideMenu();
  renderTopNav();
  renderPage();
  updateFABsVisibility();
  if (typeof trackVisit === 'function') { try { trackVisit(); } catch (e) {} }

  // סנכרון ברקע מ-Firebase DB
  try {
    const data = await Promise.race([
      fetchPublicSiteData(),
      new Promise((_, reject) => setTimeout(
        () => reject(new Error('Firebase boot fetch timed out')), 1500
      ))
    ]);

    if (Object.keys(data).length) {
      if (data.pages && Array.isArray(data.pages)) { pages = data.pages; applyItemLikesToPages(pages, data.item_likes); }
      if (data.topNavPages && Array.isArray(data.topNavPages)) topNavPages = data.topNavPages;
      if (data.siteBackgrounds) siteBackgrounds = data.siteBackgrounds;
      if (data.promotedSites) {
        PROMOTED_SITES = data.promotedSites;
        localStorage.setItem('promoted_sites', JSON.stringify(PROMOTED_SITES));
      }
      if (data.socialLinks && typeof SOCIAL_LINKS !== 'undefined') SOCIAL_LINKS = { ...SOCIAL_LINKS, ...data.socialLinks };
      if (typeof applyRemoteCategoryBars === 'function') applyRemoteCategoryBars(data, false);
      if (data.onboardingVideos && typeof ONBOARDING_VIDEOS !== 'undefined') {
        ONBOARDING_VIDEOS = { ...ONBOARDING_VIDEOS, ...data.onboardingVideos };
        try { if (typeof maybeShowOnboarding === 'function') maybeShowOnboarding(); } catch (e) {}
      }
      
      sanitizeToOnlyPhotosAndStories();

      let bootHomePage = pages.find(p => p && p.id === 'page-home-feed')
        || pages.find(p => p && p.id === 'page-photos-main')
        || pages.find(p => p && p.content && p.content.includes('data-section="photos"'))
        || pages.find(p => p && p.title && p.title.includes('תמונות'));
      if (bootHomePage) {
        activePageId = bootHomePage.id;
      }
      
      localforage.setItem('mySitePages_v3', pages);
      localforage.setItem('myActivePage_v3', activePageId);
      localforage.setItem('mySiteTopNav_v3', topNavPages);
      localforage.setItem('mySiteBackgrounds_v3', siteBackgrounds);
      
      applyBackgrounds();
      renderSideMenu();
      renderTopNav();
      renderPage();
    }
  } catch(e) {
    console.log('Firebase background sync complete');
  }

  if (typeof window.hidePreloader === 'function') {
    window.hidePreloader();
  }
}

// קריאה לאתחול
initSite();

// --- שלב 2: תפיסת אלמנטים מרכזיים מה-HTML ---
const mainContent = document.getElementById('mainContent');
const sideMenuContainer = document.getElementById('sideMenuContainer');
const btnEditMode = document.getElementById('btn-edit-mode');
const btnAddPage = document.getElementById('btn-add-page');
const btnResetSite = document.getElementById('btn-reset-site');
const btnAddVideo = document.getElementById('btn-add-video');
const btnAddLoopVideo = document.getElementById('btn-add-loop-video');
const navLinksContainer = document.querySelector('.nav-links'); // התפריט העליון
// מגה-מנו הוסר לחלוטין
const megaMenuContainer = { classList: { add: ()=>{}, remove: ()=>{} }, style: {}, innerHTML: '' };

function goToHomePage() {
  if (typeof pages === 'undefined') return;
  const homePage = pages.find(p => p && p.id === 'page-home-feed')
    || pages.find(p => p && p.id === 'page-photos-main')
    || pages.find(p => p && p.content && p.content.includes('data-section="photos"'))
    || pages.find(p => p && p.title && p.title.includes('תמונות'));
  if (homePage) {
    activePageId = homePage.id;
  } else if (pages.length > 0) {
    activePageId = pages[0].id;
  }
  if (typeof renderTopNav === 'function') renderTopNav();
  if (typeof renderPage === 'function') renderPage();
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
}
window.goToHomePage = goToHomePage;

// טיפול בלוגו ובטקסט הלוגו
const mainLogo = document.getElementById('main-logo');
const mainLogoText = document.getElementById('main-logo-text');

if (mainLogo) {
  mainLogo.addEventListener('click', function(e) {
    if (isEditMode) {
      e.stopPropagation();
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = ev => {
        const file = ev.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = event => {
            const dataUrl = event.target.result;
            this.src = dataUrl;
            
            const loaderImg = document.getElementById('loader-img');
            const favicon = document.getElementById('favicon');
            if (loaderImg) loaderImg.src = dataUrl;
            if (favicon) favicon.href = dataUrl;
            
            localforage.setItem('mySiteLogo_v3', dataUrl);
            saveCurrentPageContent();
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      goToHomePage();
    }
  });
}

const logoAreaEl = document.querySelector('.logo-area');
if (logoAreaEl) {
  logoAreaEl.addEventListener('click', function(e) {
    if (!isEditMode) {
      goToHomePage();
    }
  });
}

if (mainLogoText) {
  mainLogoText.addEventListener('blur', () => {
    if (isEditMode) {
      localforage.setItem('mySiteLogoText_v3', mainLogoText.textContent);
    }
  });
}


// התאמת חווית עריכה למובייל בזמן אמת בשינוי גודל מסך
window.addEventListener('resize', () => {
  if (isEditMode) {
    interact('.draggable-resizable').draggable({ enabled: true }).resizable({ enabled: true });
  }
});

// --- שלב 3: פונקציות ליבה (Rendering & Logic) ---

// פונקציה לשמירת הנתונים למסד הנתונים (מבוסס localforage + Firebase RTDB לסנכרון)
function saveToStorage() {
  sanitizeToOnlyPhotosAndStories();
  localforage.setItem('mySitePages_v3', pages);
  localforage.setItem('myActivePage_v3', activePageId);
  localforage.setItem('mySiteTopNav_v3', topNavPages); // שמירת התפריט העליון
  
  // שמירת מבנה ה-HTML של התפריט העליון ללא כפתורי העריכה
  const tempNav = navLinksContainer.cloneNode(true);
  tempNav.querySelectorAll('.top-nav-controls').forEach(el => el.remove());
  const addBtn = tempNav.querySelector('#add-nav-link-btn');
  if (addBtn) addBtn.remove();
  
  const navHTML = tempNav.innerHTML;
  localforage.setItem('mySiteTopNavHTML_v3', navHTML); 
  
  // שמירה ל-Firebase Database — רק המנהל כותב את תוכן האתר (גם כללי האבטחה אוכפים זאת).
  // אצל שאר הגולשים השינויים נשמרים מקומית בלבד.
  if (isAdmin()) try {
    const dbRef = ref(db, 'website');
    update(dbRef, {
      pages: pages,
      activePageId: activePageId,
      topNavPages: topNavPages,
      navHTML: navHTML,
      siteBackgrounds: siteBackgrounds,
      promotedSites: PROMOTED_SITES,
      socialLinks: SOCIAL_LINKS,
      onboardingVideos: (typeof ONBOARDING_VIDEOS !== 'undefined' ? ONBOARDING_VIDEOS : { desktop: ['', '', ''], mobile: ['', '', ''] }),
      storyCategories: STORY_CATEGORIES,
      photoBarCategories: PHOTO_BAR_CATEGORIES
    }).then(() => {
      console.log("סונכרן בהצלחה לענן Firebase!");
    }).catch(err => {
      console.error("שגיאה בסנכרון לענן:", err);
    });
  } catch (firebaseErr) {
    console.error("שגיאת פיירבייס:", firebaseErr);
  }
  
  // הוספה למערך ההיסטוריה עבור פעולת Undo (שומרים את 20 הפעולות האחרונות)
  undoStack.push(JSON.stringify({ pages, topNavPages }));
  if (undoStack.length > 20) {
    undoStack.shift(); // מוחק את הישן ביותר כדי לא לפוצץ את זיכרון הראם
  }
}

// תיקון חד-פעמי (מנהל בלבד): גרסאות קודמות הסתירו את עמודי הקהילה ושינו את שם
// עמוד הקהילות ל"קומיקס". מתקנים את הנתונים השמורים ב-Firebase פעם אחת ומסמנים דגל,
// כדי שמכאן והלאה הסתרה/הצגה של המנהל תישמר כרגיל (בלי שנכפה מצב בכל טעינה).
let _communitiesRepairDone = false;
async function repairCommunitiesAccessOnce() {
  try {
    if (_communitiesRepairDone) return;
    if (typeof isAdmin !== 'function' || !isAdmin()) return;
    if (!Array.isArray(pages)) return;
    // בטיחות: לא לרוץ על נתונים חלקיים/דוגמה (מונע דריסת Firebase). דורשים סט עמודים תקין.
    const hasReal = pages.length >= 6
      && pages.some(p => p && p.id === 'page-communities-main')
      && pages.some(p => p && ((p.content || '').includes('data-section="photos"') || (p.title || '').includes('תמונות')));
    if (!hasReal) return;
    const flagRef = ref(db, 'website/_repairs/communitiesAccess_v1');
    const snap = await get(flagRef);
    if (snap.exists() && snap.val()) { _communitiesRepairDone = true; return; }

    let changed = false;
    const comm = pages.find(p => p && p.id === 'page-communities-main');
    if (comm) {
      if (comm.title === 'קומיקס') { comm.title = 'קהילות 🏘️'; changed = true; }
      if (comm.isHidden) { comm.isHidden = false; changed = true; }
    }
    ['page-secondhand-main', 'page-partnerships-main', 'page-reviews-main'].forEach(function (id) {
      const pg = pages.find(p => p && p.id === id);
      if (pg && pg.isHidden) { pg.isHidden = false; changed = true; }
    });

    _communitiesRepairDone = true;
    await set(flagRef, true);
    if (changed) {
      renderSideMenu();
      renderTopNav();
      saveToStorage(); // מסנכרן את התיקון ל-Firebase פעם אחת
    }
  } catch (e) { /* אם אין הרשאה/רשת — נשאיר כמו שהוא */ }
}
window.repairCommunitiesAccessOnce = repairCommunitiesAccessOnce;

// פונקציה שמייצרת את תפריט הצד (מייצרת את שורות ה-HTML של הלינקים לפי מערך העמודים)
function renderSideMenu() {
  if (!sideMenuContainer) return; // הדשבורד הוסר
  sideMenuContainer.innerHTML = ''; // מנקים את התפריט הישן
  
  pages.forEach(page => {
    // אם אנחנו לא במצב עריכה והעמוד מוסתר - לא נציג אותו (אלא אם המשתמש הוא מנהל)
    if (!isEditMode && page.isHidden && !isAdmin()) return;

    const li = document.createElement('li'); // יוצרים אלמנט רשימה חדש
    li.id = page.id;
    
    // אם במצב עריכה או שהמשתמש הוא מנהל והעמוד מוסתר, נציג אותו חצי שקוף
    if (page.isHidden && (isEditMode || isAdmin())) {
      li.style.opacity = '0.5';
    }
    
    // מיכל לטקסט ולכפתורים
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.alignItems = 'center';
    
    const textSpan = document.createElement('span');
    textSpan.textContent = page.title;
    li.appendChild(textSpan);
    
    // אם זה העמוד שאנחנו נמצאים בו עכשיו, נוסיף לו את המחלקה השחורה
    if (page.id === activePageId) {
      li.classList.add('active-item');
    }
    
    // הוספת כפתורי ניהול רק במצב עריכה
    if (isEditMode) {
      // הופך את האלמנט לגריר (Draggable) אל תוך התפריט העליון
      li.setAttribute('draggable', 'true');
      li.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', page.id);
        e.dataTransfer.effectAllowed = 'copy';
      });

      const actionsSpan = document.createElement('span');
      actionsSpan.style.display = 'flex';
      actionsSpan.style.gap = '8px';
      actionsSpan.style.fontSize = '14px';
      
      // כפתור שינוי שם
      const renameBtn = document.createElement('span');
      renameBtn.textContent = '✏️';
      renameBtn.style.cursor = 'pointer';
      renameBtn.title = 'שנה שם';
      renameBtn.onclick = (e) => {
        e.stopPropagation(); // מונע מעבר עמוד כשלוחצים על הכפתור
        const newName = prompt('הכנס שם חדש לעמוד:', page.title);
        if (newName && newName.trim() !== '') {
          page.title = newName.trim();
          saveToStorage();
          renderSideMenu();
        }
      };
      
      // כפתור הסתרה/תצוגה
      const hideBtn = document.createElement('span');
      hideBtn.textContent = page.isHidden ? '🙈' : '👁️';
      hideBtn.style.cursor = 'pointer';
      hideBtn.title = page.isHidden ? 'הצג עמוד' : 'הסתר עמוד ממבקרים';
      hideBtn.onclick = (e) => {
        e.stopPropagation();
        page.isHidden = !page.isHidden;
        saveToStorage();
        renderSideMenu();
        renderTopNav();
      };
      
      // כפתור מחיקה
      const deleteBtn = document.createElement('span');
      deleteBtn.textContent = '🗑️';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.title = 'מחק עמוד';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        if (pages.length === 1) {
          alert('אי אפשר למחוק את העמוד האחרון באתר!');
          return;
        }
        pages.splice(pages.findIndex(p => p.id === page.id), 1);
        // אם מחקנו את העמוד שאנחנו נמצאים בו, נעבור לעמוד הראשון ברשימה
        if (activePageId === page.id) {
          activePageId = pages[0].id;
          renderPage();
        }
        saveToStorage();
        renderSideMenu();
        renderTopNav();
      };
      
      actionsSpan.appendChild(renameBtn);
      actionsSpan.appendChild(hideBtn);
      actionsSpan.appendChild(deleteBtn);
      li.appendChild(actionsSpan);
    }
    
    // לחיצה על שם העמוד תעביר אותנו אליו
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isEditMode) saveCurrentPageContent();
      window.__detailOpen = false; // סוגר כל תצוגה פנימית (סיפור/גלריה) כדי לאפשר ניווט
      activePageId = page.id;
      saveToStorage();
      renderPage();
      renderSideMenu(); // מעדכן איזה עמוד מודגש כרגע
      renderTopNav(); // מעדכן את הפיל הפעיל בתפריט העליון
    });
    
    sideMenuContainer.appendChild(li); // מוסיפים את הכפתור לתפריט
  });
}

// פונקציה שמייצרת את התפריט העליון ומוסיפה לו מגה-תפריט
function renderTopNav() {
  if (!Array.isArray(topNavPages)) topNavPages = [];
  const _ideasPTop = pages.find(p => p && p.id === 'page-ideas-main');
  if (_ideasPTop && !_ideasPTop.isHidden) {
    topNavPages = topNavPages.filter(id => id !== 'page-ideas-main');
    topNavPages.unshift('page-ideas-main');
  } else {
    topNavPages = topNavPages.filter(id => id !== 'page-ideas-main');
  }
  if (!topNavPages.includes('page-subscription-main') && pages.some(p => p && p.id === 'page-subscription-main')) {
    topNavPages.push('page-subscription-main');
  }
  navLinksContainer.innerHTML = ''; // מנקה את התפריט הסטטי מה-HTML
  
  topNavPages.forEach(pageId => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return; // במקרה שהעמוד נמחק
    if (pageId === 'page-ci' || pageId === 'page-em' || isSideOnlyPage(page) || page.title?.includes('ריבית') || page.title?.includes('Everything')) return;
    if (!isEditMode && page.isHidden && !isAdmin()) return; // מסתיר עמודים מוסתרים גם למעלה
    
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = page.title;
    if (page.isHidden && (isEditMode || isAdmin())) {
      a.style.opacity = '0.6';
    }
    a.dataset.pageId = pageId; // שמירת המזהה כדי שנוכל למחוק אותו מהמערך בעריכה
    
    // סימון עמוד פעיל למעלה
    if (pageId === activePageId) {
      a.classList.add('active-top-nav');
    }
    
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (isEditMode) saveCurrentPageContent();
      window.__detailOpen = false; // סוגר כל תצוגה פנימית (סיפור/גלריה) כדי לאפשר ניווט
      activePageId = page.id;
      saveToStorage();
      renderSideMenu();
      renderTopNav();
      renderPage();
    });
    

    
    if (isEditMode) {
      a.style.cursor = 'move'; // נראות של גרירה ומיקום
      
      // הפיכת הלינק לגריר לצורך שינוי מיקום (Reorder)
      a.setAttribute('draggable', 'true');
      a.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', 'topnav:' + pageId);
        e.dataTransfer.effectAllowed = 'move';
      });
      a.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // מציג קו סמן בצד ימין (RTL)
        a.style.borderRight = '3px solid #111';
        a.style.paddingRight = '5px';
      });
      a.addEventListener('dragleave', (e) => {
        a.style.borderRight = '';
        a.style.paddingRight = '';
      });
      a.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        a.style.borderRight = '';
        a.style.paddingRight = '';
        
        const data = e.dataTransfer.getData('text/plain');
        if (data.startsWith('topnav:')) {
          const draggedPageId = data.replace('topnav:', '');
          if (draggedPageId !== pageId) {
            const draggedIdx = topNavPages.indexOf(draggedPageId);
            if (draggedIdx > -1) {
              topNavPages.splice(draggedIdx, 1);
              const targetIdx = topNavPages.indexOf(pageId);
              // מכיוון שזה RTL, צד ימין אומר שזה יופיע לפניו במערך
              topNavPages.splice(targetIdx, 0, draggedPageId);
              saveToStorage();
              renderTopNav();
            }
          }
        } else if (data) {
          // אם זה נגרר מתפריט הצד
          if (!topNavPages.includes(data)) {
            const targetIdx = topNavPages.indexOf(pageId);
            topNavPages.splice(targetIdx, 0, data);
            saveToStorage();
            renderTopNav();
          }
        }
      });
      
      // הוסרו הכפתורים הישנים והמכוערים (✖ ו-👁️) שהיו מוצמדים לטקסט
      // מעכשיו סרגל הכלים המרחף (top-nav-controls) מטפל בזה!
    }
    
    const isPhotos = page.title && (page.title.includes('תמונות') || page.title.toLowerCase().includes('photo'));
    if (isPhotos) {
      // הוספת אייקון תמונות לכפתור תמונות
      a.style.display = 'inline-flex';
      a.style.alignItems = 'center';
      a.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: inherit; display: block; margin-left: 6px;">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <span>${page.title.replace(/[\u1000-\uFFFF]+/g, '').trim()}</span>
      `;
    }
    
    navLinksContainer.appendChild(a);
  });
}

// אזור הקליטה (Drop Zone) בתפריט העליון
navLinksContainer.addEventListener('dragover', (e) => {
  if (!isEditMode) return;
  e.preventDefault(); // חובה כדי לאפשר Drop
  navLinksContainer.classList.add('drag-over');
});

navLinksContainer.addEventListener('dragleave', () => {
  navLinksContainer.classList.remove('drag-over');
});

navLinksContainer.addEventListener('drop', (e) => {
  if (!isEditMode) return;
  e.preventDefault();
  navLinksContainer.classList.remove('drag-over');
  
  const data = e.dataTransfer.getData('text/plain');
  if (data.startsWith('topnav:')) {
    // נגרר בתוך התפריט העליון לחלל הריק (בסוף)
    const draggedPageId = data.replace('topnav:', '');
    const draggedIdx = topNavPages.indexOf(draggedPageId);
    if (draggedIdx > -1) {
      topNavPages.splice(draggedIdx, 1);
      topNavPages.push(draggedPageId);
      saveToStorage();
      renderTopNav();
    }
  } else if (data && !topNavPages.includes(data)) {
    // מוסיף את העמוד לתפריט העליון (בסוף)
    topNavPages.push(data);
    saveToStorage();
    renderTopNav();
  }
});

// מגה-מנו הוסר לחלוטין - הניווט עובד רק בלחיצה

// פונקציה לבדיקת יחס הגובה-רוחב של התמונה והוספת מחלקה אם היא רחבה (Landscape)
function adjustImgAspectRatio(img) {
  const checkRatio = () => {
    if (img.naturalWidth && img.naturalHeight) {
      const ratio = img.naturalWidth / img.naturalHeight;
      if (ratio > 1.2) {
        img.classList.add('landscape-img');
      } else {
        img.classList.remove('landscape-img');
      }
    }
  };

  if (img.complete) {
    checkRatio();
  }
  img.addEventListener('load', checkRatio);
}

// פונקציה שמציגה את התוכן של העמוד הנוכחי במרכז המסך
function renderPage() {
  // באג "יוצא מהדף": כשצופים בעמוד פנימי (גלריה/סיפור), רענון ברקע (סנכרון Firebase)
  // לא ירנדר מחדש את הרשימה ו"יבעט" את המשתמש החוצה.
  // חוסמים רק אם: (1) הדגל פעיל, (2) יש .art-detail במסך, (3) הנמצאים באותו עמוד שנפתחה התצוגה הפנימית בו.
  // אם המשתמש ניווט לעמוד אחר — מאפשרים תמיד.
  if (window.__detailOpen
      && typeof mainContent !== 'undefined' && mainContent && mainContent.querySelector('.art-detail')
      && window.__detailOpenPageId === activePageId) {
    return;
  }
  // ניווט לעמוד חדש — מנקים את הדגל
  if (window.__detailOpenPageId && window.__detailOpenPageId !== activePageId) {
    window.__detailOpen = false;
    window.__detailOpenPageId = null;
  }
  // עמוד "הפיד שלי" — עמוד דינמי בפני עצמו (לא נשמר ברשימת העמודים)
  if (activePageId === 'page-feed-main') {
    if (typeof buildFeedPage === 'function') {
      mainContent.innerHTML = buildFeedPage();
      try { window.scrollTo(0, 0); } catch (e) {}
      return;
    }
  }
  const currentPage = pages.find(p => p.id === activePageId); // מחפשים את העמוד ברשימה

  // הגנה: אם העמוד מוסתר והמשתמש הוא לא מנהל/עורך, מפנים אותו לעמוד גלוי.
  if (currentPage && currentPage.isHidden && !isEditMode && !isAdmin()) {
    const isVisible = p => p && !p.isHidden;
    const articlesPage = pages.find(p => isVisible(p) && p.content && p.content.includes('articles-page') && !p.content.includes('stories-page') && !p.content.includes('photos-page') && !p.content.includes('courses-page'));
    const fallback = articlesPage || pages.find(isVisible);
    if (!fallback || fallback.id === activePageId) {
      mainContent.innerHTML = '';
      return;
    }
    activePageId = fallback.id;
    renderPage();
    return;
  }
  if (currentPage) {
    if (currentPage.id === 'page-ci' || (currentPage.title && currentPage.title.includes('ריבית'))) {
      mainContent.innerHTML = buildCompoundInterestPage();
      calculateCompoundInterest();
      return;
    }
    if (currentPage.id === 'page-em' || (currentPage.title && currentPage.title.includes('Everything'))) {
      mainContent.innerHTML = buildEverythingMoneyPage();
      calculateEMValuation();
      return;
    }

    // עמוד הבית: שורות מתחלפות קומיקס/סיפורים — נבנה דינמית בכל רינדור
    if (currentPage.id === 'page-home-feed') {
      if (typeof buildHomeFeedPage === 'function') {
        mainContent.innerHTML = buildHomeFeedPage();
        if (isEditMode) applyEditModeToContent();
        try { window.scrollTo(0, 0); } catch (e) {}
        return;
      }
    }

    // עמוד "קהילות": מזוהה לפי מזהה/כותרת (לא לפי תוכן) כדי שיהיה עמיד לחלוטין
    if (currentPage.id === 'page-communities-main' || (currentPage.title && currentPage.title.includes('קהילות'))) {
      if (typeof buildCommunitiesPage === 'function') {
        mainContent.innerHTML = buildCommunitiesPage();
        try { window.scrollTo(0, 0); } catch (e) {}
        return;
      }
    }

    // עמוד "רעיונות"
    if (currentPage.id === 'page-ideas-main' || (currentPage.title && currentPage.title.includes('רעיונות'))) {
      if (typeof buildIdeasPage === 'function') {
        mainContent.innerHTML = buildIdeasPage();
        try { window.scrollTo(0, 0); } catch (e) {}
        return;
      }
    }

    // עמוד "מידע" (למנהל בלבד) — מזוהה לפי מזהה
    if (currentPage.id === 'page-info-main') {
      if (typeof buildInfoPage === 'function') {
        mainContent.innerHTML = buildInfoPage();
        try { window.scrollTo(0, 0); } catch (e) {}
        return;
      }
    }

    // עמוד "בקשות" (אישור העלאות — למנהל בלבד)
    if (currentPage.id === 'page-requests-main') {
      if (typeof buildRequestsPage === 'function') {
        mainContent.innerHTML = buildRequestsPage();
        try { window.scrollTo(0, 0); } catch (e) {}
        return;
      }
    }

    // עמוד "שאלות גולשים"
    if (currentPage.id === 'page-questions-main' || (currentPage.title && currentPage.title.includes('שאלות גולשים'))) {
      if (typeof buildQuestionsPage === 'function') {
        mainContent.innerHTML = buildQuestionsPage();
        try { window.scrollTo(0, 0); } catch (e) {}
        return;
      }
    }

    // עמוד "הצעות"
    if (currentPage.id === 'page-offers-main' || (currentPage.title && currentPage.title.includes('הצעות'))) {
      if (typeof buildOffersPage === 'function') {
        mainContent.innerHTML = buildOffersPage();
        try { window.scrollTo(0, 0); } catch (e) {}
        return;
      }
    }

    // עמוד "מנוי"
    if (currentPage.id === 'page-subscription-main' || (currentPage.title && currentPage.title.includes('מנוי'))) {
      if (typeof buildSubscriptionPage === 'function') {
        mainContent.innerHTML = buildSubscriptionPage();
        try { window.scrollTo(0, 0); } catch (e) {}
        return;
      }
    }

    mainContent.innerHTML = currentPage.content; // מזריקים את ה-HTML של העמוד פנימה

    // עמוד כתבות: בונים מחדש מהנתונים השמורים כדי ששינויי מבנה (חיפוש, עיצוב) תמיד ייכנסו
    const artPageEl = mainContent.querySelector('.articles-page:not(.stories-page):not(.photos-page):not(.courses-page)');
    if (artPageEl && typeof buildArticlesPage === 'function') {
      let savedArts = [];
      try { savedArts = JSON.parse(decodeURIComponent(artPageEl.dataset.articlesJson)); } catch(e){}
      if (savedArts.length) mainContent.innerHTML = buildArticlesPage(savedArts);
    }

    // עמוד סיפורים: בונים מחדש מהנתונים השמורים
    // (מתעלמים מפיד הסיפורים שמוטמע בתחתית עמוד התמונות — .photos-stories-feed)
    const storyPageEl = mainContent.querySelector('.stories-page:not(.photos-stories-feed)');
    if (storyPageEl && typeof buildStoriesPage === 'function') {
      let savedStories = [];
      try { savedStories = JSON.parse(decodeURIComponent(storyPageEl.dataset.storiesJson)); } catch(e){}
      const _sk = storyPageEl.getAttribute('data-story-kind') || 'comics';
      // תמיד בונים מחדש (גם כשריק) כדי לשמור על הסוג (קומיקס/סיפורים) והתוויות
      mainContent.innerHTML = buildStoriesPage(savedStories, _sk);
    }

    // עמוד קורסים: בונים מחדש מהנתונים השמורים
    const coursePageEl = mainContent.querySelector('.courses-page');
    if (coursePageEl && typeof buildCoursesPage === 'function') {
      let savedCourses = [];
      try { savedCourses = JSON.parse(decodeURIComponent(coursePageEl.dataset.coursesJson)); } catch(e){}
      if (savedCourses.length) mainContent.innerHTML = buildCoursesPage(savedCourses);
    }

    // עמוד תמונות: בונים מחדש מנתוני הגלריות
    const isPhotosPage = (currentPage && (currentPage.id === 'page-photos-main' || (currentPage.title && currentPage.title.includes('תמונות')))) || mainContent.querySelector('.photos-page:not(.community-page):not(.user-page)');
    if (isPhotosPage && typeof buildPhotosPage === 'function') {
      const _pel = mainContent.querySelector('.photos-page:not(.community-page):not(.user-page)');
      const _psection = (_pel && _pel.dataset.section) ? _pel.dataset.section : 'photos';
      const albums = photoGetAlbums();
      mainContent.innerHTML = buildPhotosPage(albums, _psection);
    }

    // עמוד קהילה: בונים מחדש
    const commPageEl = mainContent.querySelector('.community-page');
    if (commPageEl && typeof buildCommunityPage === 'function') {
      mainContent.innerHTML = buildCommunityPage();
    }

    // עמוד "קהילות" (רשימת הקהילות): בונים מחדש מהנתונים החיים
    const commListEl = mainContent.querySelector('.communities-page');
    if (commListEl && typeof buildCommunitiesPage === 'function') {
      mainContent.innerHTML = buildCommunitiesPage();
    }

    // עמוד חנות: בונים מחדש מהנתונים השמורים
    const shopPageEl = mainContent.querySelector('.shop-page');
    if (shopPageEl && typeof buildShopPage === 'function') {
      let savedProds = [];
      try { savedProds = JSON.parse(decodeURIComponent(shopPageEl.dataset.productsJson)); } catch(e){}
      if (savedProds.length) mainContent.innerHTML = buildShopPage(savedProds);
    }

    // המרת מיקומים (Migration): הפיכת טרנספורמציות ישנות למיקום אבסולוטי (left/top)
    // זה קריטי כדי שגלילת המסך (Scroll) תעבוד כשיש הרבה תוכן למטה
    const draggables = mainContent.querySelectorAll('.draggable-resizable');
    draggables.forEach(el => {
      // 1. המרת תמונות רקע ישנות לתגיות <img> אמיתיות למניעת קריסה במובייל
      let bgUrl = el.style.backgroundImage;
      if (bgUrl && bgUrl !== 'none') {
        const url = bgUrl.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
        if (url && !el.querySelector('img') && !el.dataset.slideshowUrls) {
          el.style.backgroundImage = '';
          el.style.backgroundSize = '';
          el.style.backgroundRepeat = '';
          el.style.backgroundPosition = '';
          
          const img = document.createElement('img');
          img.src = url;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'contain';
          img.style.borderRadius = el.style.borderRadius || '12px';
          img.style.display = 'block';
          el.appendChild(img);
        }
      }

      // 2. המרת מצגות תמונות ישנות לתגיות <img> אמיתיות
      if (el.dataset.slideshowUrls && !el.querySelector('img')) {
        try {
          const urls = JSON.parse(el.dataset.slideshowUrls);
          if (urls && urls.length > 0) {
            el.style.backgroundImage = '';
            el.style.backgroundSize = '';
            el.style.backgroundRepeat = '';
            el.style.backgroundPosition = '';
            
            const img = document.createElement('img');
            img.src = urls[0];
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.style.borderRadius = el.style.borderRadius || '12px';
            img.style.display = 'block';
            el.appendChild(img);
          }
        } catch(e) {
          console.error("שגיאה בהמרת מצגת ישנה:", e);
        }
      }

      // תיקון דינמי לתמונות שכבר נשמרו עם cover בעבר
      const existingImg = el.querySelector('img');
      if (existingImg && existingImg.style.objectFit === 'cover') {
        existingImg.style.objectFit = 'contain';
      }

      // 3. המרת מיקומים ישנים
      if (el.style.transform && el.style.transform.includes('translate')) {
        const x = el.getAttribute('data-x') || 0;
        const y = el.getAttribute('data-y') || 0;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.transform = 'none'; // מוחקים את הטרנספורמציה
      }
    });

    // 4. מיון דינמי של כל האלמנטים לפי גובה Y (מלמעלה למטה) כדי שיסתדרו נכון במובייל
    // המיון קורה תמיד - גם במחשב וגם במובייל - כדי שסדר ה-DOM יתאים לסדר הוויזואלי
    const childrenToSort = Array.from(mainContent.children).filter(el => el.classList.contains('draggable-resizable'));
    // מיון: בעיקר לפי Y, ובמקרה של שוויון - לפי סדר ה-DOM המקורי (stable sort)
    const domOrder = new Map(childrenToSort.map((el, i) => [el, i]));
    childrenToSort.sort((a, b) => {
      const yA = parseFloat(a.getAttribute('data-y')) || parseFloat(a.style.top) || 0;
      const yB = parseFloat(b.getAttribute('data-y')) || parseFloat(b.style.top) || 0;
      if (Math.abs(yA - yB) < 5) return domOrder.get(a) - domOrder.get(b); // tiebreaker: סדר DOM מקורי
      return yA - yB;
    });
    childrenToSort.forEach((el, index) => {
      mainContent.appendChild(el);
      el.style.order = index;
    });

    // התאמה דינמית לתמונות רחבות במובייל כדי שלא ייחתכו ויקבלו מראה של באנר רחב
    const imgs = mainContent.querySelectorAll('img');
    imgs.forEach(adjustImgAspectRatio);
  }
  
  // אם מצב עריכה דלוק כרגע, אנחנו צריכים להחיל אותו מיד על התוכן החדש שנטען
  if (isEditMode) {
    applyEditModeToContent();
  }
  
  // הפעלת מצגות תמונות (Slideshows)
  initSlideshows();

  // עדכון רקע ייחודי לעמוד הנוכחי
  applyBackgrounds();

  // רנדור אזורי לחיצה (Hotspots)
  renderAllHotspots();

  // הפעלת קרא עוד על אלמנטים מסומנים
  if (!isEditMode) {
    mainContent.querySelectorAll('[data-has-readmore]').forEach(el => renderReadMore(el));
  }

  // קיצור גובה הקונטיינר לתוכן בלבד (מניעת רקע ענק מתחת לתוכן)
  if (window.innerWidth > 768) {
    fitPageToContent();
  }
}

function fitPageToContent() {
  const imgs = Array.from(mainContent.querySelectorAll('img'));
  const pending = imgs.filter(img => !img.complete || img.naturalHeight === 0);

  if (pending.length === 0) {
    _applyContentHeight();
    return;
  }

  // מחכים שכל התמונות יטענו לגמרי לפני מדידה
  let done = 0;
  pending.forEach(img => {
    const finish = () => { done++; if (done === pending.length) _applyContentHeight(); };
    img.addEventListener('load', finish, { once: true });
    img.addEventListener('error', finish, { once: true });
  });
}

function _applyContentHeight() {
  // מחכים frame נוסף כדי שה-browser יסיים layout
  requestAnimationFrame(() => {
    const els = mainContent.querySelectorAll('.draggable-resizable');
    if (!els.length) return;
    let maxBottom = 0;
    els.forEach(el => {
      const rect = el.getBoundingClientRect();
      const containerRect = mainContent.getBoundingClientRect();
      const bottom = (rect.bottom - containerRect.top) + mainContent.scrollTop;
      if (bottom > maxBottom) maxBottom = bottom;
    });
    const availableHeight = mainContent.parentElement ? mainContent.parentElement.clientHeight : window.innerHeight;
    if (maxBottom > 0 && maxBottom < availableHeight) {
      // תוכן קצר ממסך - מגבילים גובה למניעת רקע ענק
      mainContent.style.height = (maxBottom + 4) + 'px';
      mainContent.style.minHeight = '0';
    } else {
      // תוכן ארוך - משאירים גלילה רגילה ללא הגבלה
      mainContent.style.height = '';
      mainContent.style.minHeight = '';
    }
  });
}

let slideshowIntervals = [];

function initSlideshows() {
  // ניקוי אינטרוולים ישנים כדי למנוע כפילויות
  slideshowIntervals.forEach(clearInterval);
  slideshowIntervals = [];
  
  const slideshowEls = mainContent.querySelectorAll('[data-slideshow-urls]');
  slideshowEls.forEach(el => {
    try {
      const urls = JSON.parse(el.dataset.slideshowUrls);
      if (urls && urls.length > 1) {
        let currentIndex = parseInt(el.dataset.slideshowIndex || '0');
        const imgTag = el.querySelector('img');
        
        const intervalId = setInterval(() => {
          currentIndex = (currentIndex + 1) % urls.length;
          el.dataset.slideshowIndex = currentIndex;
          
          if (imgTag) {
            imgTag.src = urls[currentIndex];
          } else {
            el.style.backgroundImage = `url(${urls[currentIndex]})`;
          }
        }, 3000); // מתחלף כל 3 שניות
        
        slideshowIntervals.push(intervalId);
      }
    } catch (e) {
      console.error('שגיאה בטעינת מצגת התמונות', e);
    }
  });
}

// --- שלב 4: מערכת העריכה (מצב עריכה ✏️) ---

// פונקציה שהופכת טקסטים לניתנים לעריכה
function applyEditModeToContent() {
  document.body.classList.add('edit-mode');

  // בוחרים את כל סוגי הטקסטים בתוך אזור התוכן המרכזי
  const textElements = mainContent.querySelectorAll('h1, h2, h3, p, span');
  textElements.forEach(el => {
    // התכונה הזו אומרת לדפדפן לאפשר עריכה אך לחסום עיצובים מודבקים מבחוץ
    el.setAttribute('contenteditable', 'plaintext-only');
  });
  
  const logoText = document.getElementById('main-logo-text');
  if (logoText) {
    logoText.setAttribute('contenteditable', 'plaintext-only');
    logoText.title = 'לחץ לעריכת טקסט הלוגו';
    logoText.style.outline = '1px dashed #ccc';
  }
  
  makeImagesEditable();

  // הצגת סרגל הכלים המרחף למנהלים
  const ft = document.getElementById('floating-toolbar');
  if (ft) ft.style.display = 'flex';
  
  // הדלקת יכולות הגרירה ושינוי הגודל (אך לא במסכים קטנים כדי לשמור על רספונסיביות)
  interact('.draggable-resizable').draggable({ enabled: true }).resizable({ enabled: true });

  // --- עריכת תפריט עליון ---
  Array.from(navLinksContainer.children).forEach(child => {
    if (child.id === 'add-nav-link-btn' || child.classList.contains('top-nav-controls')) return;

    // ניקוי כפתורים ישנים למקרה שנשארו
    const oldControls = child.querySelectorAll('.top-nav-controls');
    oldControls.forEach(c => c.remove());

    const targetLink = child.tagName === 'A' ? child : child.querySelector('.mega-drop-trigger');
    if (!targetLink) return;

    child.style.position = 'relative'; // וידוא שהכפתורים ימוקמו ביחס לעמוד הקיים
    const controls = document.createElement('span');
    controls.className = 'top-nav-controls';
    controls.style.position = 'absolute';
    controls.style.top = '100%';
    controls.style.marginTop = '8px';
    controls.style.left = '50%';
    controls.style.transform = 'translateX(-50%)';
    controls.style.display = 'flex';
    controls.style.gap = '5px';
    controls.style.background = '#fff';
    controls.style.border = '1px solid #ddd';
    controls.style.borderRadius = '4px';
    controls.style.padding = '2px 5px';
    controls.style.zIndex = '1000';
    controls.contentEditable = 'false';
    controls.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
    controls.style.fontSize = '12px';

    const renameBtn = document.createElement('span');
    renameBtn.textContent = '✏️';
    renameBtn.style.cursor = 'pointer';
    renameBtn.title = 'שנה שם';
    renameBtn.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      const currentText = targetLink.childNodes[0].nodeValue || targetLink.textContent;
      const newName = prompt('שנה שם:', currentText.replace('⌄', '').trim());
      if (newName !== null) {
        targetLink.childNodes[0].nodeValue = newName + (targetLink.textContent.includes('⌄') ? ' ⌄' : '');
      }
    };

    const arrowBtn = document.createElement('span');
    arrowBtn.textContent = '⌄';
    arrowBtn.style.cursor = 'pointer';
    arrowBtn.title = 'הוסף/הסר חץ מגה-תפריט';
    arrowBtn.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (targetLink.textContent.includes('⌄')) {
         targetLink.childNodes[0].nodeValue = targetLink.childNodes[0].nodeValue.replace(' ⌄', '').replace('⌄', '');
      } else {
         targetLink.childNodes[0].nodeValue += ' ⌄';
      }
    };

    const hideBtn = document.createElement('span');
    hideBtn.textContent = child.classList.contains('hidden-nav') ? '🙈' : '👁️';
    hideBtn.style.cursor = 'pointer';
    hideBtn.title = 'הסתר/הצג';
    hideBtn.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (child.classList.contains('hidden-nav')) {
        child.classList.remove('hidden-nav');
        hideBtn.textContent = '👁️';
      } else {
        child.classList.add('hidden-nav');
        hideBtn.textContent = '🙈';
      }
      // אם זה קישור מקושר לעמוד, נשמור את מצב ההסתרה
      if (child.dataset.pageId) {
        const page = pages.find(p => p.id === child.dataset.pageId);
        if (page) {
          page.isHidden = child.classList.contains('hidden-nav');
          saveToStorage();
          renderSideMenu();
        }
      }
    };

    const removeBtn = document.createElement('span');
    removeBtn.textContent = '🗑️';
    removeBtn.style.cursor = 'pointer';
    removeBtn.title = 'הסר קישור';
    removeBtn.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      child.remove();
      // אם זה קישור דינמי שבא מהעמודים, נמחק אותו גם מהמערך
      if (child.dataset.pageId) {
        topNavPages = topNavPages.filter(id => id !== child.dataset.pageId);
        saveToStorage();
      }
    };

    controls.appendChild(renameBtn);
    controls.appendChild(arrowBtn);
    controls.appendChild(hideBtn);
    controls.appendChild(removeBtn);

    child.style.position = 'relative';
    child.appendChild(controls);
  });

  if (!document.getElementById('add-nav-link-btn')) {
    const addNavBtn = document.createElement('button');
    addNavBtn.id = 'add-nav-link-btn';
    addNavBtn.textContent = '+';
    addNavBtn.title = 'הוסף קישור חדש';
    addNavBtn.style.padding = '0 10px';
    addNavBtn.style.marginLeft = '10px';
    addNavBtn.style.background = '#f0f0f0';
    addNavBtn.style.border = '1px dashed #ccc';
    addNavBtn.style.borderRadius = '15px';
    addNavBtn.style.cursor = 'pointer';
    addNavBtn.onclick = () => {
      const name = prompt('שם הקישור החדש (ייצור עמוד חדש גם בתפריט הצד):');
      if (name && name.trim() !== '') {
        const newPageId = 'page-' + Date.now();
        // ניצור עמוד חדש במערכת
        pages.push({
          id: newPageId,
          title: name.trim(),
          content: ''
        });
        
        // ניצור את הקישור הדינמי בתפריט העליון
        const newA = document.createElement('a');
        newA.href = '#';
        newA.textContent = name.trim();
        newA.dataset.pageId = newPageId;
        navLinksContainer.insertBefore(newA, addNavBtn);
        
        topNavPages.push(newPageId);
        activePageId = newPageId;
        saveToStorage();
        renderSideMenu();
        removeEditModeFromContent();
        applyEditModeToContent(); // This will re-add controls to the new link
        renderPage();
      }
    };
    navLinksContainer.appendChild(addNavBtn);
  }
}

// פונקציה שמסירה את מצב העריכה מהטקסטים (לפני ששומרים)
function removeEditModeFromContent() {
  document.body.classList.remove('edit-mode');

  // סיום מצב ציור hotspot אם פעיל
  if (typeof exitHotspotDrawMode === 'function') exitHotspotDrawMode();

  const editableElements = mainContent.querySelectorAll('[contenteditable]');
  editableElements.forEach(el => {
    el.removeAttribute('contenteditable');
  });
  
  const logoText = document.getElementById('main-logo-text');
  if (logoText) {
    logoText.removeAttribute('contenteditable');
    logoText.title = '';
    logoText.style.outline = 'none';
  }

  // הסרת אירועי עריכת תמונות (למעט מקושרות לדף)
  mainContent.querySelectorAll('img').forEach(img => {
    const linked = img.closest('[data-page-link]');
    if (!linked) {
      img.style.cursor = 'default';
      img.title = '';
    } else {
      img.style.cursor = 'pointer'; // שומרים על pointer לתמונות מקושרות
    }
  });

  // כפתור מצביע על אלמנטים מקושרים
  mainContent.querySelectorAll('[data-page-link]').forEach(el => {
    el.style.cursor = 'pointer';
  });

  // הסרת כפתורי העריכה של התפריט העליון
  const controls = navLinksContainer.querySelectorAll('.top-nav-controls');
  controls.forEach(c => c.remove());
  
  // הסרת סמן הגרירה ואטריביוט הגרירה מהקישורים עצמם
  navLinksContainer.querySelectorAll('a').forEach(a => {
    a.style.cursor = '';
    a.removeAttribute('draggable');
    a.style.borderRight = '';
    a.style.paddingRight = '';
  });
  
  const addBtn = document.getElementById('add-nav-link-btn');
  if (addBtn) addBtn.remove();
  
  // העלמת סרגל הכלים המרחף לאורחים
  const ft = document.getElementById('floating-toolbar');
  if (ft) ft.style.display = 'none';
  
  // כיבוי מוחלט של יכולות הגרירה ושינוי הגודל לאורחים
  interact('.draggable-resizable').draggable({ enabled: false }).resizable({ enabled: false });
}

// פונקציית עזר לפתיחת דיאלוג בחירת תמונה והחלפתה
function makeImagesEditable() {
  mainContent.querySelectorAll('img').forEach(img => {
    img.style.cursor = 'pointer';
    img.title = 'לחץ פעמיים להחלפת התמונה';
    
    // מונע הוספת כפולה של מאזין אם הפעלנו את מצב עריכה שוב
    if (!img.dataset.hasDblclick) {
      img.dataset.hasDblclick = 'true';
      img.addEventListener('dblclick', function() {
        if (!isEditMode) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = e => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = event => {
              this.src = event.target.result;
              saveCurrentPageContent();
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      });
    }
  });
}

// מחזיר גרסה קלה לשמירה של תוכן העמוד הנוכחי. עמודי תמונות/סיפורים/
// קורסים/כתבות/קהילה נבנים תמיד מחדש מה-JSON בזמן הרינדור, ולכן אין
// טעם לשמור את כל ה-HTML המרונדר — הוא מכפיל כל תמונת base64 פעמים
// רבות (תמונה ראשית + תצוגות מקדימות + data-json) ומנפח את הבלוב
// שמסונכרן ל-Firebase עד כדי קריסה. שומרים רק את המעטפת עם ה-data.
function artSerializePageContent() {
  // עמוד הבית (שורות מתחלפות) — התוכן נבנה דינמית ברינדור; שומרים רק פלייסהולדר
  // כדי שהעמודים הפנימיים (photos-page/stories-page) לא ייחשבו לעמוד קומיקס/תמונות בעצמם.
  if (activePageId === 'page-home-feed' || mainContent.querySelector('.home-feed-page')) {
    return '<div class="home-feed-page" data-page-id="page-home-feed"></div>';
  }
  const photos = mainContent.querySelector('.photos-page');
  if (photos && photos.dataset.photosJson) {
    return `<div class="articles-page photos-page" data-section="${photos.dataset.section || 'photos'}" data-photos-json="${photos.dataset.photosJson}"></div>`;
  }
  const stories = mainContent.querySelector('.stories-page:not(.photos-stories-feed):not(.art-detail)');
  if (stories && stories.dataset.storiesJson) {
    // חובה לשמור את data-story-kind (קומיקס/סיפורים) — אחרת התוכן נחשב "קומיקס",
    // מתנגש בעמוד הקומיקס, ומחיקת-הכפולים מוחקת אותו (הסיפור "נעלם").
    const _sk = stories.getAttribute('data-story-kind') || 'comics';
    return `<div class="articles-page stories-page" data-story-kind="${_sk}" data-stories-json="${stories.dataset.storiesJson}"></div>`;
  }
  const courses = mainContent.querySelector('.courses-page');
  if (courses && courses.dataset.coursesJson) {
    return `<div class="articles-page courses-page" data-courses-json="${courses.dataset.coursesJson}"></div>`;
  }
  const community = mainContent.querySelector('.community-page');
  if (community) {
    return `<div class="articles-page community-page" data-page-id="${community.dataset.pageId || activePageId}"></div>`;
  }
  const communitiesList = mainContent.querySelector('.communities-page');
  if (communitiesList) {
    return '<div class="communities-page" data-page-id="page-communities-main"></div>';
  }
  const infoList = mainContent.querySelector('.info-page');
  if (infoList) {
    return '<div class="info-page" data-page-id="page-info-main"></div>';
  }
  const questionsList = mainContent.querySelector('.questions-page');
  if (questionsList) {
    return '<div class="questions-page" data-page-id="page-questions-main"></div>';
  }
  const offersList = mainContent.querySelector('.offers-page');
  if (offersList) {
    return '<div class="offers-page" data-page-id="page-offers-main"></div>';
  }
  const articles = mainContent.querySelector('.articles-page:not(.stories-page):not(.photos-page):not(.courses-page):not(.community-page)');
  if (articles && articles.dataset.articlesJson) {
    return `<div class="articles-page" data-articles-json="${articles.dataset.articlesJson}"></div>`;
  }
  // עמוד רגיל (בלוקים חופשיים, טקסט, תמונות שנגררו) — נשמר כרגיל
  return mainContent.innerHTML;
}

// מכווץ מחרוזת תוכן עמוד שמורה לגרסה קלה (רק המעטפת עם ה-JSON).
// משמש למיגרציה של תוכן ישן בטעינה. מנתח בעזרת DOMParser כדי לא לטעון
// את התמונות לדף החי.
function artLightenContent(content) {
  if (!content || typeof content !== 'string') return content;
  if (content.indexOf('-json=') === -1 && content.indexOf('community-page') === -1) return content;
  let doc;
  try { doc = new DOMParser().parseFromString(content, 'text/html'); } catch (e) { return content; }
  const ph = doc.querySelector('.photos-page');
  if (ph && ph.dataset.photosJson) return `<div class="articles-page photos-page" data-section="${ph.dataset.section || 'photos'}" data-photos-json="${ph.dataset.photosJson}"></div>`;
  const st = doc.querySelector('.stories-page');
  if (st && st.dataset.storiesJson) return `<div class="articles-page stories-page" data-stories-json="${st.dataset.storiesJson}"></div>`;
  const co = doc.querySelector('.courses-page');
  if (co && co.dataset.coursesJson) return `<div class="articles-page courses-page" data-courses-json="${co.dataset.coursesJson}"></div>`;
  const cm = doc.querySelector('.community-page');
  if (cm) return `<div class="articles-page community-page" data-page-id="${cm.dataset.pageId || ''}"></div>`;
  const ar = doc.querySelector('.articles-page:not(.stories-page):not(.photos-page):not(.courses-page):not(.community-page)');
  if (ar && ar.dataset.articlesJson) return `<div class="articles-page" data-articles-json="${ar.dataset.articlesJson}"></div>`;
  return content;
}

// שומר את התוכן הערוך (בגרסה קלה) למערך ואז ל-localforage ול-Firebase
function saveCurrentPageContent() {
  // הגנה קריטית מפני אובדן מידע: כאשר מוצג עמוד זמני (קהילה/עמוד משתמש) — שאינו
  // העמוד הפעיל האמיתי — אסור לשמור את תוכנו על העמוד הפעיל (למשל דריסת עמוד התמונות).
  if (typeof mainContent !== 'undefined' && mainContent && mainContent.querySelector('.community-page, .user-page')) {
    return;
  }
  // קודם נוריד את מצב העריכה ואת סימוני הבחירה של הגרירה (כדי שהם לא יישמרו לקוד הסטטי!)
  removeEditModeFromContent();
  if (typeof removeSelection === 'function') removeSelection();
  
  // נמצא את העמוד הנוכחי במערך שלנו
  const currentPage = pages.find(p => p.id === activePageId);
  if (currentPage) {
    currentPage.content = artSerializePageContent(); // שומרים גרסה קלה, בלי כפילויות תמונות
    saveToStorage(); // שומרים לזיכרון של הדפדפן
  }

  // אם היינו במצב עריכה, נחזיר אותו כדי שיהיה אפשר להמשיך לערוך
  if (isEditMode) {
    applyEditModeToContent();
  }
}

// מאזין לחיצה לכפתור מצב העריכה למעלה
btnEditMode.addEventListener('click', () => {
  isEditMode = !isEditMode; // הופכים את המצב (אם היה כבוי נדלק, ואם היה דלוק נכבה)
  
  if (isEditMode) {
    // נדלק
    btnEditMode.classList.add('active'); // מוסיף מחלקה שהופכת אותו לירוק ב-CSS
    btnEditMode.textContent = 'שמור שינויים 💾';
    applyEditModeToContent(); // הופך את הטקסטים לניתנים לעריכה
  } else {
  // נכבה (שמירה)
    btnEditMode.classList.remove('active');
    btnEditMode.textContent = 'מצב עריכה ✏️';
    saveCurrentPageContent(); // שומר את מה שערכנו
    // אין צורך לרענן מחדש כי התוכן כבר מופיע, פשוט הסרנו את יכולת העריכה
  }
  
  const managerBtn = document.querySelector('.manager-btn');
  if (managerBtn) {
    managerBtn.textContent = isEditMode ? 'מנהל' : 'אורח';
  }
  
  renderSideMenu(); // לעדכן את תפריט הצד (כדי להציג או להעלים את כפתורי העריכה/מחיקה)
  renderTopNav(); // לעדכן את התפריט העליון
});

// --- שלב 5: הוספת עמודים חדשים ---

// האזנה ללחיצה על כפתור "+ הוסף עמוד חדש"
btnAddPage.addEventListener('click', () => {
  // מקפיצים חלונית שמבקשת מהמשתמש את שם העמוד
  const newTitle = prompt('איך תרצה לקרוא לעמוד החדש? (למשל: 📞 צור קשר)');
  
  if (newTitle && newTitle.trim() !== '') {
    // יוצרים אובייקט של עמוד חדש
    const newPage = {
      id: 'page-' + Date.now(), // מזהה ייחודי שמבוסס על הזמן הנוכחי
      title: newTitle, // השם שהמשתמש הקליד
      content: ''
    };
    
    pages.push(newPage); // מוסיפים למערך שלנו
    activePageId = newPage.id; // מעבירים אותו להיות העמוד הפעיל
    
    saveToStorage(); // שומרים
    renderSideMenu(); // מרעננים את התפריט שיציג את העמוד החדש
    renderPage(); // מרעננים את המסך שיציג את העמוד החדש
  }
});

// האזנה ללחיצה על כפתור "איפוס אתר"
if (btnResetSite) {
  btnResetSite.addEventListener('click', async () => {
    if (confirm('האם אתה בטוח שברצונך לאפס את עיצובי האתר? הכתבות, המוצרים והקורסים שהעלית יישמרו, אך רקעי העיצוב יאופסו.')) {
      try {
        // איפוס מקומי של העדפות דפדפן
        await localforage.clear();
        localStorage.clear();
        
        // קריאת המצב הנוכחי כדי לשמור על העמודים והתוכן
        const dbRef = ref(db, 'website');
        const snapshot = await get(dbRef);
        const currentData = snapshot.val() || {};
        const existingPages = currentData.pages || [];
        
        // שמירת התוכן ואיפוס רק של הרקעים והעיצובים
        await update(dbRef, {
          pages: existingPages, // שומר על כל הכתבות והתכנים הקיימים
          activePageId: currentData.activePageId || 'page-main',
          topNavPages: currentData.topNavPages || ['page-main'],
          navHTML: currentData.navHTML || null,
          siteBackgrounds: { dashboard: null, topNav: null, main: null } // מאפס רקעים לדיפולט
        });
        
        alert('העיצוב אופס בהצלחה! התוכן והכתבות שלך נשמרו. העמוד ייטען מחדש כעת.');
        window.location.reload();
      } catch (e) {
        console.error(e);
        alert('שגיאה במהלך האיפוס.');
      }
    }
  });
}

// האזנה לכפתורי הצגת/הסתרת עגלה וצ'אט בסרגל הניהול
const btnToggleCartVisibility = document.getElementById('btn-toggle-cart-visibility');
const btnToggleChatVisibility = document.getElementById('btn-toggle-chat-visibility');

if (btnToggleCartVisibility) {
  btnToggleCartVisibility.addEventListener('click', async () => {
    hideCart = !hideCart;
    try {
      await update(ref(db, 'website'), { hideCart: hideCart });
      updateFABsVisibility();
    } catch(err) {
      console.error(err);
    }
  });
}

if (btnToggleChatVisibility) {
  btnToggleChatVisibility.addEventListener('click', async () => {
    hideChat = !hideChat;
    try {
      await update(ref(db, 'website'), { hideChat: hideChat });
      updateFABsVisibility();
    } catch(err) {
      console.error(err);
    }
  });
}

// --- שלב 6: טיפול בתפריט העליון (Nav Links) ---
// כדי שהתפריט העליון יעבוד כשהוא מפנה לעמודים ידועים (אם הם קיימים עדיין במערכת)
const topNavMapping = {
  'top-nav-main': 'page-main',
  'top-nav-shop': 'page-shop',
  'top-nav-charts': 'page-charts',
  'top-nav-forum': 'page-forum',
  'top-nav-services': 'page-services',
  'top-nav-meeting': 'page-meeting'
};

// האזנה קבועה (Event Delegation) לכל הקישורים בתפריט העליון
navLinksContainer.addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (!a) return;
  
  let targetPageId = null;
  // קודם נבדוק אם זה קישור דינמי (שיש לו data-page-id)
  if (a.dataset.pageId) {
    targetPageId = a.dataset.pageId;
  }
  // אחרת נבדוק אם זה קישור סטטי מ-HTML שיש לו ID
  else if (a.id && topNavMapping[a.id]) {
    targetPageId = topNavMapping[a.id];
  }

  // אם מצאנו עמוד יעד, ננווט אליו
  if (targetPageId) {
    e.preventDefault();
    const targetPage = pages.find(p => p.id === targetPageId);
    if (targetPage) {
      if (isEditMode) saveCurrentPageContent();
      window.__detailOpen = false;
      activePageId = targetPageId;
      saveToStorage();
      renderSideMenu();
      renderPage();
    }
  }
});

// --- שלב 7: הרצה ראשונית של האתר! ---
// (הפונקציות renderSideMenu ו- renderPage מופעלות כעת בתוך initSite בסיום טעינת הנתונים)

// --- שלב 8: גרירה, שינוי גודל ומחיקת אלמנטים (interact.js) ---


// פונקציה שמנקה את הבחירה מאלמנט (מעלימה מסגרת וכפתורי פעולה)
function removeSelection() {
  const selected = document.querySelectorAll('.draggable-resizable.selected');
  selected.forEach(el => {
    el.classList.remove('selected');
    const actions = el.querySelector('.actions-container');
    if (actions) actions.remove();
  });
}

// --- מנגנון בחירה מרובה (Marquee Selection) ---
let isDrawingSelection = false;
let selectionBox = null;
let startSelX = 0;
let startSelY = 0;

mainContent.addEventListener('mousedown', (e) => {
  if (!isEditMode) return;
  // בודקים שלחצו בדיוק על משטח העבודה (ולא על תמונה למשל)
  if (e.target === mainContent) {
    removeSelection(); // מנקים בחירה קודמת
    saveCurrentPageContent();
    
    isDrawingSelection = true;
    
    // בגלל שייתכן גלילה, מחשבים מיקום מוחלט בתוך ה-mainContent
    const rect = mainContent.getBoundingClientRect();
    startSelX = e.clientX - rect.left + mainContent.scrollLeft;
    startSelY = e.clientY - rect.top + mainContent.scrollTop;
    
    selectionBox = document.createElement('div');
    selectionBox.className = 'selection-box';
    selectionBox.style.left = startSelX + 'px';
    selectionBox.style.top = startSelY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    mainContent.appendChild(selectionBox);
  }
});

// מסיר בחירה כאשר לוחצים מחוץ לאלמנט
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('.draggable-resizable') && !e.target.closest('.actions-container') && !e.target.closest('.action-btn') && !e.target.closest('input[type=\"color\"]') && !e.target.closest('.selection-box') && !e.target.closest('#link-modal')) {
    removeSelection();
  }
});

mainContent.addEventListener('mousemove', (e) => {
  if (!isEditMode || !isDrawingSelection || !selectionBox) return;
  
  const rect = mainContent.getBoundingClientRect();
  const currentX = e.clientX - rect.left + mainContent.scrollLeft;
  const currentY = e.clientY - rect.top + mainContent.scrollTop;
  
  const width = Math.abs(currentX - startSelX);
  const height = Math.abs(currentY - startSelY);
  const left = Math.min(startSelX, currentX);
  const top = Math.min(startSelY, currentY);
  
  selectionBox.style.width = width + 'px';
  selectionBox.style.height = height + 'px';
  selectionBox.style.left = left + 'px';
  selectionBox.style.top = top + 'px';
  
  // בדיקת חפיפה (Intersection) - אילו אלמנטים נתפסו בריבוע שלנו
  const selectionRect = selectionBox.getBoundingClientRect();
  const draggables = mainContent.querySelectorAll('.draggable-resizable');
  
  draggables.forEach(el => {
    const elRect = el.getBoundingClientRect();
    const isIntersecting = !(
      selectionRect.right < elRect.left || 
      selectionRect.left > elRect.right || 
      selectionRect.bottom < elRect.top || 
      selectionRect.top > elRect.bottom
    );
    
    if (isIntersecting) {
      el.classList.add('selected');
      // כדי למנוע עומס על המסך בבחירה מרובה, נסיר את כפתורי המחיקה והעריכה האישיים
      const actions = el.querySelector('.actions-container');
      if (actions) actions.remove();
    } else {
      el.classList.remove('selected');
    }
  });
});

document.addEventListener('mouseup', () => {
  if (isDrawingSelection) {
    isDrawingSelection = false;
    if (selectionBox) {
      selectionBox.remove();
      selectionBox = null;
    }
  }
});

// הגדרת ספריית interact.js על כל אלמנט שנושא את המחלקה 'draggable-resizable'
interact('.draggable-resizable')
  .draggable({
    ignoreFrom: '[contenteditable]:focus, .action-btn, video', // מונע גרירה כשלוחצים על טקסט שבעריכה, כפתורי פעולה או נגן וידאו
    listeners: {
      move(event) {
        if (!isEditMode) return;
        const target = event.target;
        
        // אם האלמנט שגוררים כרגע מסומן, נגרור את כל מה שמסומן יחד
        if (target.classList.contains('selected')) {
          const selectedEls = document.querySelectorAll('.draggable-resizable.selected');
          selectedEls.forEach(el => {
            const x = (parseFloat(el.getAttribute('data-x')) || 0) + event.dx;
            const y = (parseFloat(el.getAttribute('data-y')) || 0) + event.dy;
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            el.setAttribute('data-x', x);
            el.setAttribute('data-y', y);
          });
        } else {
          // גרירה רגילה של אלמנט בודד
          const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
          const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
          target.style.left = x + 'px';
          target.style.top = y + 'px';
          target.setAttribute('data-x', x);
          target.setAttribute('data-y', y);
        }
      },
      end() {
        // כשמסיימים לגרור - שומרים הכל לזיכרון!
        saveCurrentPageContent();
      }
    }
  })
  .resizable({
    ignoreFrom: '[contenteditable]:focus, .action-btn, video',
    // מאפשרים שינוי גודל מכל 4 הכיוונים (הפינות)
    edges: { left: true, right: true, bottom: true, top: true },
    listeners: {
      move(event) {
        const target = event.target;
        let x = (parseFloat(target.getAttribute('data-x')) || 0);
        let y = (parseFloat(target.getAttribute('data-y')) || 0);

        // מעדכנים את הגודל (רוחב וגובה)
        target.style.width = event.rect.width + 'px';
        target.style.height = event.rect.height + 'px';

        // אם מתחנו מהצד השמאלי או העליון, המיקום X/Y גם משתנה, לכן מוסיפים פיצוי
        x += event.deltaRect.left;
        y += event.deltaRect.top;

        target.style.left = x + 'px';
        target.style.top = y + 'px';
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
      },
      end() {
        saveCurrentPageContent();
      }
    }
  })
  .on('down', function (event) {
    if (!isEditMode) return;
    // אם לחצנו על אחד מכפתורי הפעולה, אנחנו לא רוצים לבחור מחדש אלא לתת לכפתור לעבוד
    if (event.target.closest('.action-btn') || event.target.closest('input[type=\"color\"]')) return;
    
    // כשלוחצים על אלמנט (MouseDown):
    const target = event.currentTarget;
    if (!target.classList.contains('selected')) {
      removeSelection(); // קודם כל מנקים בחירה קודמת רק אם נבחר אלמנט חדש
      target.classList.add('selected'); // מדליקים מסגרת כחולה
    }
    
    // מנקים קונטיינר ישן אם קיים כדי לא ליצור כפילויות
    const oldActions = target.querySelector('.actions-container');
    if (oldActions) oldActions.remove();
    
    // יוצרים קונטיינר לכפתורי הפעולה
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'actions-container';
    
    // 1. כפתור קישור
    const linkBtn = document.createElement('button');
    linkBtn.className = 'action-btn link-btn';
    linkBtn.innerHTML = '🔗';
    linkBtn.title = 'הוסף קישור';
    linkBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      currentEditingLinkElement = target;
      const currentLink = target.getAttribute('data-href') || '';
      
      const linkInternalSelect = document.getElementById('link-internal-select');
      const linkExternalInput = document.getElementById('link-external-input');
      const linkModal = document.getElementById('link-modal');

      // מילוי ה-Select בעמודים קיימים
      linkInternalSelect.innerHTML = '<option value="">-- בחר עמוד פנימי --</option>';
      pages.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.title;
        linkInternalSelect.appendChild(opt);
      });
      
      // איפוס
      linkExternalInput.value = '';
      linkInternalSelect.value = '';
      
      // טעינת קישור קיים אם יש
      if (currentLink) {
        if (pages.find(p => p.id === currentLink || p.title === currentLink)) {
          const found = pages.find(p => p.id === currentLink || p.title === currentLink);
          linkInternalSelect.value = found.id;
        } else {
          linkExternalInput.value = currentLink;
        }
      }
      
      linkModal.style.display = 'flex';
    });

    // 1.5 כפתור פתח קישור (במצב עריכה)
    const openLinkBtn = document.createElement('button');
    openLinkBtn.className = 'action-btn open-link-btn';
    openLinkBtn.innerHTML = '↗️';
    openLinkBtn.title = 'פתח קישור / נווט לדף';
    openLinkBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      const href = target.getAttribute('data-href');
      const pageLink = target.dataset.pageLink;
      
      if (!href && !pageLink) {
        alert('לא הוגדר קישור לאלמנט זה עדיין. הגדר קישור באמצעות כפתור 🔗 או 📄→.');
        return;
      }
      
      if (pageLink) {
        const targetPage = pages.find(p => p.id === pageLink);
        if (targetPage) {
          window.__detailOpen = false;
          activePageId = pageLink;
          saveToStorage();
          renderSideMenu();
          renderTopNav();
          renderPage();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          alert('דף היעד אינו קיים עוד.');
        }
      } else if (href) {
        const internalPage = pages.find(p => p.title.trim() === href.trim() || p.id === href.trim());
        if (internalPage) {
          window.__detailOpen = false;
          activePageId = internalPage.id;
          saveToStorage();
          renderSideMenu();
          renderTopNav();
          renderPage();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          const finalLink = href.startsWith('http') ? href : 'https://' + href;
          window.open(finalLink, '_blank');
        }
      }
    });

    // 2. כפתור העתקה
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn copy-btn';
    copyBtn.innerHTML = '📄';
    copyBtn.title = 'העתק אלמנט';
    copyBtn.addEventListener('mousedown', async (e) => {
      e.stopPropagation();
      await copySelectedElements([target]);
      alert('האלמנט הועתק! עכשיו אפשר להדביק אותו בעמוד אחר בעזרת כפתור "הדבק" או Ctrl+V.');
    });

    // 3. כפתור מחיקה
    const delBtn = document.createElement('button');
    delBtn.className = 'action-btn delete-btn';
    delBtn.innerHTML = '🗑️';
    delBtn.title = 'מחק אלמנט';
    delBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation(); 
      deleteSelectedElements([target]);
    });
    
    // פונקציית עזר למציאת אלמנט הטקסט הפנימי
    const getInnerEl = (t) => t.querySelector('h1, h2, h3, h4, h5, h6, p, span, div') || t;

    // 4. כפתור בחירת צבע טקסט
    const colorWrapper = document.createElement('div');
    colorWrapper.className = 'action-btn';
    colorWrapper.style.position = 'relative';
    colorWrapper.style.overflow = 'hidden';
    colorWrapper.title = 'שנה צבע טקסט';
    
    const colorIcon = document.createElement('span');
    colorIcon.innerHTML = '🎨';
    colorIcon.style.pointerEvents = 'none';
    
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.style.position = 'absolute';
    colorInput.style.opacity = '0';
    colorInput.style.width = '100%';
    colorInput.style.height = '100%';
    colorInput.style.cursor = 'pointer';
    
    colorInput.addEventListener('mousedown', (e) => e.stopPropagation());
    colorInput.addEventListener('input', (e) => {
      getInnerEl(target).style.color = e.target.value;
    });
    colorInput.addEventListener('change', () => {
      saveCurrentPageContent();
    });
    
    colorWrapper.appendChild(colorIcon);
    colorWrapper.appendChild(colorInput);

    // 5. כפתור הדגשה (B)
    const boldBtn = document.createElement('button');
    boldBtn.className = 'action-btn';
    boldBtn.innerHTML = '<b>B</b>';
    boldBtn.title = 'הדגש טקסט';
    boldBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      const el = getInnerEl(target);
      const weight = window.getComputedStyle(el).fontWeight;
      const isBold = weight === 'bold' || parseInt(weight) >= 700;
      el.style.fontWeight = isBold ? 'normal' : 'bold';
      saveCurrentPageContent();
    });

    // 6. כפתור הגדלת טקסט (A+)
    const sizeUpBtn = document.createElement('button');
    sizeUpBtn.className = 'action-btn';
    sizeUpBtn.innerHTML = 'A+';
    sizeUpBtn.title = 'הגדל טקסט';
    sizeUpBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      const el = getInnerEl(target);
      let size = parseInt(window.getComputedStyle(el).fontSize) || 16;
      el.style.fontSize = (size + 2) + 'px';
      saveCurrentPageContent();
    });

    // 7. כפתור הקטנת טקסט (A-)
    const sizeDownBtn = document.createElement('button');
    sizeDownBtn.className = 'action-btn';
    sizeDownBtn.innerHTML = 'A-';
    sizeDownBtn.title = 'הקטן טקסט';
    sizeDownBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      const el = getInnerEl(target);
      let size = parseInt(window.getComputedStyle(el).fontSize) || 16;
      el.style.fontSize = Math.max(8, size - 2) + 'px';
      saveCurrentPageContent();
    });

    // 8. כפתור מעל/מתחת (Z-Index Toggle)
    const layerBtn = document.createElement('button');
    layerBtn.className = 'action-btn';
    
    const currentZ = parseInt(window.getComputedStyle(target).zIndex) || 1;
    layerBtn.innerHTML = currentZ >= 100 ? '⏬ מתחת' : '⏫ מעל';
    layerBtn.title = 'הבא לקדמה / שלח לאחור';
    
    layerBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      const currentZIndex = parseInt(window.getComputedStyle(target).zIndex) || 1;
      
      if (currentZIndex < 100) {
        target.style.zIndex = '100';
        layerBtn.innerHTML = '⏬ מתחת';
      } else {
        target.style.zIndex = '1';
        layerBtn.innerHTML = '⏫ מעל';
      }
      saveCurrentPageContent();
    });

    actionsContainer.appendChild(colorWrapper);
    actionsContainer.appendChild(boldBtn);
    actionsContainer.appendChild(sizeUpBtn);
    actionsContainer.appendChild(sizeDownBtn);
    actionsContainer.appendChild(layerBtn); // הוספת כפתור מעל/מתחת

    // 8.5 כפתור צריבה לרקע (אם יש תמונה)
    let bgUrl = target.style.backgroundImage;
    if (bgUrl && bgUrl !== 'none') {
       bgUrl = bgUrl.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
    } else {
       const img = target.querySelector('img');
       if (img) bgUrl = img.src;
    }
    
    if (bgUrl && bgUrl.startsWith('data:image')) {
      const burnBtn = document.createElement('button');
      burnBtn.className = 'action-btn';
      burnBtn.innerHTML = '🔥';
      burnBtn.title = 'קבע תמונה זו כרקע האתר';
      burnBtn.addEventListener('mousedown', async (e) => {
        e.stopPropagation();
        siteBackgrounds['main'] = bgUrl;
        await localforage.setItem('mySiteBackgrounds_v3', siteBackgrounds);
        applyBackgrounds();
        
        target.remove();
        removeSelection();
        saveCurrentPageContent();
      });
      actionsContainer.appendChild(burnBtn);
    }

    // כפתור קרא עוד
    const readMoreBtn = document.createElement('button');
    readMoreBtn.className = 'action-btn';
    const hasRM = target.dataset.hasReadmore === 'true';
    readMoreBtn.innerHTML = hasRM ? '📖✕' : '📖';
    readMoreBtn.title = hasRM ? 'הסר קרא עוד' : 'הוסף קרא עוד';
    readMoreBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (target.dataset.hasReadmore === 'true') {
        removeReadMoreFromEl(target);
        readMoreBtn.innerHTML = '📖';
        readMoreBtn.title = 'הוסף קרא עוד';
      } else {
        applyReadMoreToEl(target);
        readMoreBtn.innerHTML = '📖✕';
        readMoreBtn.title = 'הסר קרא עוד';
      }
    });

    // כפתור אזור לחיץ (hotspot)
    const hotspotBtn = document.createElement('button');
    hotspotBtn.className = 'action-btn hotspot-action-btn';
    hotspotBtn.innerHTML = '🎯';
    hotspotBtn.title = 'הוסף אזור לחיץ';
    hotspotBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      enterHotspotDrawMode(target);
    });

    actionsContainer.appendChild(linkBtn);
    actionsContainer.appendChild(openLinkBtn);
    actionsContainer.appendChild(readMoreBtn);
    actionsContainer.appendChild(hotspotBtn);
    actionsContainer.appendChild(copyBtn);
    actionsContainer.appendChild(delBtn);
    
    // 3.5 כפתור פירוק קבוצה (אם זה בלוק)
    if (target.getAttribute('data-is-group') === 'true') {
      const ungroupBtn = document.createElement('button');
      ungroupBtn.className = 'action-btn ungroup-btn';
      ungroupBtn.innerHTML = '🔓';
      ungroupBtn.title = 'פרק קבוצה';
      ungroupBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const groupX = parseFloat(target.getAttribute('data-x')) || parseFloat(target.style.left) || 0;
        const groupY = parseFloat(target.getAttribute('data-y')) || parseFloat(target.style.top) || 0;
        
        const children = Array.from(target.children).filter(c => !c.classList.contains('actions-container'));
        children.forEach(child => {
           const childX = parseFloat(child.getAttribute('data-x')) || parseFloat(child.style.left) || 0;
           const childY = parseFloat(child.getAttribute('data-y')) || parseFloat(child.style.top) || 0;
           
           const absX = groupX + childX;
           const absY = groupY + childY;
           
           child.style.left = absX + 'px';
           child.style.top = absY + 'px';
           child.setAttribute('data-x', absX);
           child.setAttribute('data-y', childY);
           
           child.classList.add('draggable-resizable'); // מחזירים לו יכולת גרירה בודדת
           mainContent.appendChild(child);
        });
        
        target.remove(); // Remove the group container
        removeSelection();
        saveCurrentPageContent();
      });
      actionsContainer.appendChild(ungroupBtn);
    }
    
    target.appendChild(actionsContainer);
  })
  .on('doubletap', function (event) {
    const target = event.currentTarget;
    const link = target.getAttribute('data-link');
    // אם לא במצב עריכה ויש קישור, נפתח אותו בלחיצה כפולה
    if (link && !event.target.closest('.action-btn') && !isEditMode) {
      window.open(link, '_blank');
    }
  });

// --- שלב 9: הוספת אלמנטים חדשים (דרך הסרגל המרחף התחתון) ---

// כפתורי ההוספה מהסרגל
const btnAddText = document.getElementById('btn-add-text');
const btnAddImage = document.getElementById('btn-add-image');
const btnMakeDownload = document.getElementById('btn-make-download');
const btnMakeSlideshow = document.getElementById('btn-make-slideshow');
const btnAddBg = document.getElementById('btn-add-bg');

// 9.0 הוספת מצגת 🎞️
if (btnMakeSlideshow) {
  btnMakeSlideshow.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true; // מאפשר בחירת מספר קבצים
    
    input.onchange = e => {
      const files = Array.from(e.target.files).slice(0, 5); // הגבלת 5 תמונות
      if (files.length > 0) {
        const urls = [];
        let loadedCount = 0;
        
        files.forEach((file, index) => {
          artCompressImage(file).then(data => {
            urls[index] = data;
            loadedCount++;

            if (loadedCount === files.length) {
              const el = document.createElement('div');
              el.className = 'draggable-resizable';
              
              // מידות התחלתיות סבירות
              el.style.width = '400px';
              el.style.height = '300px';
              el.style.left = '150px';
              el.style.top = '150px';
              el.setAttribute('data-x', '150');
              el.setAttribute('data-y', '150');
              el.style.borderRadius = '12px';
              
              const img = document.createElement('img');
              img.src = urls[0];
              img.style.width = '100%';
              img.style.height = '100%';
              img.style.objectFit = 'contain';
              img.style.borderRadius = '12px';
              img.style.display = 'block';
              el.appendChild(img);
              
              el.dataset.slideshowUrls = JSON.stringify(urls);
              el.dataset.slideshowIndex = '0';
              
              mainContent.appendChild(el);
              saveCurrentPageContent();
              initSlideshows(); // מפעיל מיד את המצגת
              alert('נוצרה מצגת עם ' + files.length + ' תמונות בהצלחה! התמונות יתחלפו כל 3 שניות.');
            }
          });
        });
      }
    };
    input.click();
  });
}

// 9.0 הוספת וידאו 📹
if (btnAddVideo) {
  btnAddVideo.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    
    input.onchange = e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = event => {
          const el = document.createElement('div');
          el.className = 'draggable-resizable';
          
          el.style.width = '480px';
          el.style.height = '270px';
          el.style.left = '150px';
          el.style.top = '150px';
          el.setAttribute('data-x', '150');
          el.setAttribute('data-y', '150');
          
          el.innerHTML = `
            <video src="${escHtml(event.target.result)}" controls style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;"></video>
          `;
          
          mainContent.appendChild(el);
          saveCurrentPageContent();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  });
}

// 9.0 הוספת וידאו בלופ 🔁
if (btnAddLoopVideo) {
  btnAddLoopVideo.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    
    input.onchange = e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = event => {
          const el = document.createElement('div');
          el.className = 'draggable-resizable';
          
          el.style.width = '480px';
          el.style.height = '270px';
          el.style.left = '150px';
          el.style.top = '150px';
          el.setAttribute('data-x', '150');
          el.setAttribute('data-y', '150');
          
          // סרטון לופ: ללא כפתורי שליטה (controls), מתנגן אוטומטית (autoplay), בלולאה (loop), מושתק (muted) ומותאם לניידים (playsinline)
          el.innerHTML = `
            <video src="${escHtml(event.target.result)}" autoplay loop muted playsinline style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;"></video>
          `;
          
          mainContent.appendChild(el);
          saveCurrentPageContent();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  });
}

// 9.0 הוספת כפתור הורדת קובץ
if (btnMakeDownload) {
  btnMakeDownload.addEventListener('click', () => {
    // שלב 1: בחירת תמונת אייקון
    const imgInput = document.createElement('input');
    imgInput.type = 'file';
    imgInput.accept = 'image/*';

    imgInput.onchange = e => {
      const imgFile = e.target.files[0];
      if (!imgFile) return;

      const imgReader = new FileReader();
      imgReader.onload = imgEvent => {
        const iconDataUrl = imgEvent.target.result;

        // שלב 2: בחירת קובץ להורדה
        const fileInput = document.createElement('input');
        fileInput.type = 'file';

        fileInput.onchange = e2 => {
          const dlFile = e2.target.files[0];
          if (!dlFile) return;

          const dlReader = new FileReader();
          dlReader.onload = dlEvent => {
            const el = document.createElement('div');
            el.className = 'draggable-resizable';
            el.style.width = '180px';
            el.style.left = '200px';
            el.style.top = '200px';
            el.setAttribute('data-x', '200');
            el.setAttribute('data-y', '200');
            el.dataset.downloadUrl = dlEvent.target.result;
            el.dataset.downloadName = dlFile.name;
            el.title = 'לחיצה תוריד: ' + dlFile.name;

            el.innerHTML = `
              <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; cursor:pointer; height:100%; box-sizing:border-box; padding:10px;">
                <img src="${iconDataUrl}" style="width:100%; height:auto; object-fit:contain; border-radius:8px; display:block;" draggable="false" />
                <span contenteditable="plaintext-only" style="font-size:13px; color:#333; text-align:center; font-weight:600;">${escHtml(dlFile.name)}</span>
              </div>
            `;

            mainContent.appendChild(el);
            saveCurrentPageContent();
          };
          dlReader.readAsDataURL(dlFile);
        };
        fileInput.click();
      };
      imgReader.readAsDataURL(imgFile);
    };
    imgInput.click();
  });
}

// 9.1 הוספת טקסט חופשי
if (btnAddText) {
  btnAddText.addEventListener('click', () => {
    // יוצרים קופסה חדשה
    const el = document.createElement('div');
    el.className = 'draggable-resizable'; // נותנים לה את מחלקת הקסם של interact.js
    el.innerHTML = '<p style="margin:0; padding:10px; color:#111; font-family:\'Inter\', sans-serif; font-size:18px;">טקסט חופשי</p>';
    
    // מידות התחלתיות מוגדרות מראש
    el.style.width = '200px';
    el.style.left = '100px';
    el.style.top = '100px'; // משתמשים במיקום אמיתי ולא טרנספורמציה כדי שייווצר פס גלילה
    el.setAttribute('data-x', '100');
    el.setAttribute('data-y', '100');
    
    mainContent.appendChild(el); // דוחפים למשטח
    saveCurrentPageContent(); // שומרים
  });
}

// 9.2 הוספת תמונה מותאמת אישית (העלאה מהמחשב)
if (btnAddImage) {
  btnAddImage.addEventListener('click', () => {
    // פותחים חלון לבחירת תמונה (כמו שהיה לנו בגרסה הקודמת)
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = e => {
      const file = e.target.files[0];
      if (file) {
        artCompressImage(file).then(data => {
          const imgObj = new Image();
          imgObj.onload = () => {
            const el = document.createElement('div');
            el.className = 'draggable-resizable';

            // מתאימים את הגודל ההתחלתי לפרופורציות האמיתיות של התמונה
            const targetWidth = 300; // רוחב התחלתי סביר
            const ratio = imgObj.height / imgObj.width;
            const targetHeight = targetWidth * ratio;

            el.style.width = targetWidth + 'px';
            el.style.height = targetHeight + 'px';
            el.style.left = '150px';
            el.style.top = '150px';
            el.setAttribute('data-x', '150');
            el.setAttribute('data-y', '150');
            el.style.borderRadius = '12px'; // קצת יופי

            const img = document.createElement('img');
            img.src = data;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.style.borderRadius = '12px';
            img.style.display = 'block';
            el.appendChild(img);

            mainContent.appendChild(el);
            saveCurrentPageContent();
          };
          imgObj.src = data;
        });
      }
    };
    input.click(); // לוחצים "וירטואלית" על שדה העלאת הקובץ
  });
}

// 9.3 הוספת רקע ישיר לאתר - לחיצה אחת = בחר תמונה = רקע קבוע
const bgModal = document.getElementById('bg-modal');
const bgFileInput = document.getElementById('bg-file-input');
let currentBgTarget = null;

// קריאת בחירת קובץ ישירה בלי חלון ביניים
const directBgInput = document.createElement('input');
directBgInput.type = 'file';
directBgInput.accept = 'image/*';
directBgInput.style.display = 'none';
document.body.appendChild(directBgInput);

if (btnAddBg) {
  btnAddBg.addEventListener('click', () => {
    directBgInput.click();
  });
  
  directBgInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const currentPage = pages.find(p => p.id === activePageId);
        if (currentPage) {
          currentPage.background = event.target.result;
          await localforage.setItem('mySitePages_v3', pages);
        } else {
          siteBackgrounds.main = event.target.result;
          await localforage.setItem('mySiteBackgrounds_v3', siteBackgrounds);
        }
        applyBackgrounds();
      };
      reader.readAsDataURL(file);
    }
    directBgInput.value = '';
  });
}

// שמירת תמיכה בכפתור ניקוי רקע דרך החלון הישן (אם קיים)
const bgClearBtn = document.getElementById('bg-clear-all');
if (bgClearBtn) {
  bgClearBtn.addEventListener('click', async () => {
    siteBackgrounds = { dashboard: null, topNav: null, main: null };
    await localforage.setItem('mySiteBackgrounds_v3', siteBackgrounds);
    applyBackgrounds();
    if (bgModal) bgModal.style.display = 'none';
  });
}

// --- שלב 10: פעולות מערכת מתקדמות (העתק-הדבק ושמירה) ---

// פונקציות עזר מרכזיות לפעולות עריכה
function deleteSelectedElements(elements) {
  if (!elements || elements.length === 0) return;
  elements.forEach(el => el.remove());
  saveCurrentPageContent();
}

async function copySelectedElements(elements) {
  if (!elements || elements.length === 0) return;
  const wrapper = document.createElement('div');
  elements.forEach(el => {
    const clone = el.cloneNode(true);
    clone.classList.remove('selected');
    const cloneActions = clone.querySelector('.actions-container');
    if (cloneActions) cloneActions.remove();
    wrapper.appendChild(clone);
  });
  await localforage.setItem('copiedElementHTML', wrapper.innerHTML);
}

async function pasteElements(silent = false) {
  const copiedHTML = await localforage.getItem('copiedElementHTML');
  if (!copiedHTML) {
    if (!silent) alert('לא העתקת שום דבר עדיין!');
    return;
  }
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = copiedHTML;
  const childrenToPaste = Array.from(tempDiv.children);
  
  childrenToPaste.forEach(pastedEl => {
    let currentX = parseFloat(pastedEl.getAttribute('data-x')) || 100;
    let currentY = parseFloat(pastedEl.getAttribute('data-y')) || 100;
    
    currentX += 30; // מזיזים קצת כדי שלא יסתיר לגמרי את המקור
    currentY += 30;
    
    pastedEl.setAttribute('data-x', currentX);
    pastedEl.setAttribute('data-y', currentY);
    pastedEl.style.left = currentX + 'px';
    pastedEl.style.top = currentY + 'px';
    pastedEl.style.transform = 'none'; // מחיקת טרנספורמציה מהמקור (אם הייתה)
    
    mainContent.appendChild(pastedEl);
  });
  
  saveCurrentPageContent();
}

// 10.1 הדבקת אלמנט שהועתק לזיכרון
const btnPaste = document.getElementById('btn-paste');
if (btnPaste) {
  btnPaste.addEventListener('click', () => pasteElements(false));
}

// 10.1.5 סימון כבלוק (Group / Ungroup Elements)
const btnBlock = document.getElementById('btn-block');
if (btnBlock) {
  btnBlock.addEventListener('click', () => {
    const selectedEls = Array.from(document.querySelectorAll('.draggable-resizable.selected'));
    
    // אם מסומן בדיוק אלמנט אחד והוא בלוק - נפרק אותו (Ungroup)
    if (selectedEls.length === 1 && selectedEls[0].getAttribute('data-is-group') === 'true') {
      const groupEl = selectedEls[0];
      const groupX = parseFloat(groupEl.getAttribute('data-x')) || parseFloat(groupEl.style.left) || 0;
      const groupY = parseFloat(groupEl.getAttribute('data-y')) || parseFloat(groupEl.style.top) || 0;
      
      const children = Array.from(groupEl.children);
      children.forEach(child => {
        // מחשירים מחדש למיקום מוחלט בדף
        const childX = (parseFloat(child.getAttribute('data-x')) || parseFloat(child.style.left) || 0) + groupX;
        const childY = (parseFloat(child.getAttribute('data-y')) || parseFloat(child.style.top) || 0) + groupY;
        
        child.classList.add('draggable-resizable');
        child.style.left = childX + 'px';
        child.style.top = childY + 'px';
        child.setAttribute('data-x', childX);
        child.setAttribute('data-y', childY);
        
        mainContent.appendChild(child);
      });
      groupEl.remove();
      removeSelection();
      saveCurrentPageContent();
      return;
    }
    
    if (selectedEls.length < 2) {
      alert('יש לסמן לפחות 2 אלמנטים כדי ליצור בלוק, או לסמן בלוק קיים כדי לפרק אותו!');
      return;
    }
    
    let minX = Infinity, minY = Infinity, maxR = -Infinity, maxB = -Infinity;
    
    selectedEls.forEach(el => {
      const x = parseFloat(el.getAttribute('data-x')) || parseFloat(el.style.left) || 0;
      const y = parseFloat(el.getAttribute('data-y')) || parseFloat(el.style.top) || 0;
      const w = parseFloat(el.style.width) || el.getBoundingClientRect().width || 0;
      const h = parseFloat(el.style.height) || el.getBoundingClientRect().height || 0;
      
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxR) maxR = x + w;
      if (y + h > maxB) maxB = y + h;
    });
    
    const groupW = maxR - minX;
    const groupH = maxB - minY;
    
    const groupEl = document.createElement('div');
    groupEl.className = 'draggable-resizable';
    groupEl.setAttribute('data-is-group', 'true');
    groupEl.style.position = 'absolute';
    groupEl.style.left = minX + 'px';
    groupEl.style.top = minY + 'px';
    groupEl.style.width = groupW + 'px';
    groupEl.style.height = groupH + 'px';
    groupEl.setAttribute('data-x', minX);
    groupEl.setAttribute('data-y', minY);
    // עיצוב קל שיראה שמדובר בבלוק אחד
    groupEl.style.border = '2px dashed #0078d7';
    groupEl.style.backgroundColor = 'rgba(0, 120, 215, 0.02)';
    groupEl.style.borderRadius = '8px';
    
    mainContent.appendChild(groupEl);
    
    selectedEls.forEach(el => {
      const x = parseFloat(el.getAttribute('data-x')) || parseFloat(el.style.left) || 0;
      const y = parseFloat(el.getAttribute('data-y')) || parseFloat(el.style.top) || 0;
      
      const relX = x - minX;
      const relY = y - minY;
      
      el.style.left = relX + 'px';
      el.style.top = relY + 'px';
      el.setAttribute('data-x', relX);
      el.setAttribute('data-y', relY);
      
      el.classList.remove('draggable-resizable');
      el.classList.remove('selected');
      el.style.position = 'absolute';
      
      const actions = el.querySelector('.actions-container');
      if (actions) actions.remove();
      
      groupEl.appendChild(el);
    });
    
    removeSelection();
    groupEl.classList.add('selected');
    saveCurrentPageContent();
  });
}

// 10.1.6 חיתוך אלמנט ל-2 חצאים (Split Element) באמצעות שרטוט קו
const btnSplitEl = document.getElementById('btn-split-el');
if (btnSplitEl) {
  btnSplitEl.addEventListener('click', () => {
    const selectedEls = Array.from(document.querySelectorAll('.draggable-resizable.selected'));
    if (selectedEls.length === 0) {
      alert('יש לסמן אלמנט שברצונך לחתוך!');
      return;
    }
    if (selectedEls.length > 1) {
      alert('אפשר לחתוך רק אלמנט אחד בכל פעם!');
      return;
    }
    
    const targetEl = selectedEls[0];
    
    // יצירת שכבת שרטוט על כל המסך
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '9999999';
    overlay.style.cursor = 'crosshair';
    document.body.appendChild(overlay);
    
    let startX, startY;
    let line = document.createElement('div');
    line.style.position = 'absolute';
    line.style.background = '#ff0000';
    line.style.boxShadow = '0 0 8px rgba(255,0,0,0.8)';
    line.style.zIndex = '10000000';
    line.style.pointerEvents = 'none';
    
    const onMouseDown = (e) => {
      startX = e.clientX;
      startY = e.clientY;
      document.body.appendChild(line);
    };
    
    const onMouseMove = (e) => {
      if (startX === undefined) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const length = Math.sqrt(dx*dx + dy*dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      
      line.style.width = length + 'px';
      line.style.height = '2px';
      line.style.left = startX + 'px';
      line.style.top = startY + 'px';
      line.style.transformOrigin = '0 0';
      line.style.transform = `rotate(${angle}deg)`;
    };
    
    const onMouseUp = (e) => {
      if (startX === undefined) return;
      overlay.remove();
      line.remove();
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      // אם לא באמת ציירו קו (סתם לחיצה)
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      
      const actions = targetEl.querySelector('.actions-container');
      if (actions) actions.remove();
      
      const originalHTML = targetEl.innerHTML;
      const w = targetEl.offsetWidth;
      const h = targetEl.offsetHeight;
      const leftPos = parseFloat(targetEl.style.left) || parseFloat(targetEl.getAttribute('data-x')) || 0;
      const topPos = parseFloat(targetEl.style.top) || parseFloat(targetEl.getAttribute('data-y')) || 0;
      
      const rect = targetEl.getBoundingClientRect();
      const avgX = (startX + e.clientX) / 2;
      const avgY = (startY + e.clientY) / 2;
      
      const cutX = avgX - rect.left;
      const cutY = avgY - rect.top;
      
      const part1 = targetEl.cloneNode(false);
      part1.classList.remove('selected');
      const part2 = targetEl.cloneNode(false);
      part2.classList.remove('selected');
      
      // בדיקה אם הקו שורטט לרוחב (אופקי) או לאורך (אנכי)
      if (Math.abs(dx) > Math.abs(dy)) {
        // קו אופקי -> חיתוך למעלה ולמטה
        if (cutY <= 0 || cutY >= h) return; // החיתוך מחוץ לאלמנט
        
        // חלק עליון
        part1.style.height = cutY + 'px';
        part1.innerHTML = '<div style="width:100%; height:100%; overflow:hidden; position:relative;"><div style="width:' + w + 'px; height:' + h + 'px; position:absolute; left:0; top:0;">' + originalHTML + '</div></div>';
        
        // חלק תחתון
        part2.style.height = (h - cutY) + 'px';
        part2.style.top = (topPos + cutY) + 'px';
        part2.setAttribute('data-y', topPos + cutY);
        part2.innerHTML = '<div style="width:100%; height:100%; overflow:hidden; position:relative;"><div style="width:' + w + 'px; height:' + h + 'px; position:absolute; left:0; top:-' + cutY + 'px;">' + originalHTML + '</div></div>';
        
      } else {
        // קו אנכי -> חיתוך ימין ושמאל
        if (cutX <= 0 || cutX >= w) return;
        
        // חלק שמאלי
        part1.style.width = cutX + 'px';
        part1.innerHTML = '<div style="width:100%; height:100%; overflow:hidden; position:relative;"><div style="width:' + w + 'px; height:' + h + 'px; position:absolute; left:0; top:0;">' + originalHTML + '</div></div>';
        
        // חלק ימני
        part2.style.width = (w - cutX) + 'px';
        part2.style.left = (leftPos + cutX) + 'px';
        part2.setAttribute('data-x', leftPos + cutX);
        part2.innerHTML = '<div style="width:100%; height:100%; overflow:hidden; position:relative;"><div style="width:' + w + 'px; height:' + h + 'px; position:absolute; left:-' + cutX + 'px; top:0;">' + originalHTML + '</div></div>';
      }
      
      mainContent.appendChild(part1);
      mainContent.appendChild(part2);
      targetEl.remove();
      
      removeSelection();
      saveCurrentPageContent();
    };
    
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

// 10.2 שמירת האתר באופן יזום בלחיצת כפתור
const btnSaveSite = document.getElementById('btn-save-site');
if (btnSaveSite) {
  btnSaveSite.addEventListener('click', () => {
    // הפונקציה הזו אוספת את כל המידע מהמסך ושומרת אותו עמוק בזיכרון של האתר
    saveCurrentPageContent(); 
    // עכשיו גם נקפיץ הודעה יפה למשתמש כדי שיידע שהכל בטוח
    alert('כל השינויים שלך נשמרו בהצלחה! 💾✨');
  });
}

// --- שלב 11: אנימציית קיפול של סרגל הצד (דשבורד) ---
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const sideDashboard = document.querySelector('.side-dashboard');

if (btnToggleSidebar && sideDashboard) {
  // כשלוחצים על ההמבורגר, אנחנו מקפלים או פותחים את התפריט
  btnToggleSidebar.addEventListener('click', () => {
    sideDashboard.classList.toggle('closed');
  });
}

// --- שלב 12: סרגל הכלים המרחף (גרירה ומזעור) ---
const floatingToolbar = document.getElementById('floating-toolbar');
const btnMinimizeToolbar = document.getElementById('btn-minimize-toolbar');

if (floatingToolbar && btnMinimizeToolbar) {
  // 12.1 לוגיקה למזעור ופתיחה מחדש
  btnMinimizeToolbar.addEventListener('click', () => {
    floatingToolbar.classList.toggle('minimized');
    
    // אם זו פעם ראשונה שפותחים ולא גררו עדיין
    if (!floatingToolbar.classList.contains('minimized') && !floatingToolbar.getAttribute('data-initialized-drag')) {
      floatingToolbar.style.position = 'fixed';
      floatingToolbar.style.top = '90px';
      floatingToolbar.style.left = '30px';
      floatingToolbar.style.bottom = 'auto';
      floatingToolbar.style.transform = 'none';
      floatingToolbar.style.margin = '0';
      floatingToolbar.setAttribute('data-initialized-drag', 'true');
      floatingToolbar.setAttribute('data-x', 0);
      floatingToolbar.setAttribute('data-y', 0);
    }

    if (floatingToolbar.classList.contains('minimized')) {
      btnMinimizeToolbar.innerHTML = '+'; // סמל להגדלה
      btnMinimizeToolbar.title = 'הרחב';
    } else {
      btnMinimizeToolbar.innerHTML = '➖'; // סמל למזעור
      btnMinimizeToolbar.title = 'מזער';
    }
  });

  // 12.2 גרירה חופשית של הסרגל בכל המסך
  interact('.floating-toolbar').draggable({
    allowFrom: '.toolbar-drag-handle', // אפשר לגרור רק מהידית המיועדת
    listeners: {
      start(event) {
        const target = event.target;
        // בנגיעה הראשונה אנחנו הופכים את המיקום ל-Left/Top נקי כדי שהגרירה תעבוד חלק 
        // ולא תתנגש עם ההגדרות הראשוניות של ה-CSS (transform)
        if (!target.getAttribute('data-initialized-drag')) {
          const rect = target.getBoundingClientRect();
          target.style.position = 'fixed';
          target.style.margin = '0';
          target.style.left = rect.left + 'px';
          target.style.top = rect.top + 'px';
          target.style.bottom = 'auto'; // מבטל את הקיבוע לתחתית
          target.style.transform = 'none'; // מבטל את המרכוז
          target.setAttribute('data-initialized-drag', 'true');
          target.setAttribute('data-x', 0);
          target.setAttribute('data-y', 0);
        }
      },
      move(event) {
        const target = event.target;
        const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
        const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
        
        // מזיזים פיזית את הסרגל
        target.style.transform = `translate(${x}px, ${y}px)`;
        
        // שומרים את המיקום
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
      }
    }
  });
}

// --- שלב 13: קיצורי מקלדת מקצועיים (מחיקה, העתקה, הדבקה והזזה עם חיצים) ---
document.addEventListener('keydown', async (event) => {
  const activeEl = document.activeElement;
  if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable) {
    return;
  }

  const selectedEls = Array.from(document.querySelectorAll('.draggable-resizable.selected'));
  const isCmdOrCtrl = event.ctrlKey || event.metaKey;

  // 13.1 הדבקה (Command + V)
  if (isCmdOrCtrl && event.key.toLowerCase() === 'v') {
    await pasteElements(true);
    return;
  }

  // שאר הפעולות דורשות לפחות אלמנט אחד מסומן
  if (selectedEls.length === 0) return;

  // 13.2 מחיקה
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    deleteSelectedElements(selectedEls);
    return;
  }

  // 13.3 העתקה (Command + C)
  if (isCmdOrCtrl && event.key.toLowerCase() === 'c') {
    await copySelectedElements(selectedEls);
    return;
  }

  // 13.4 גזירה (Command + X)
  if (isCmdOrCtrl && event.key.toLowerCase() === 'x') {
    await copySelectedElements(selectedEls);
    deleteSelectedElements(selectedEls);
    return;
  }

  // 13.5 סידור חכם בגריד (Command + Z)
  if (isCmdOrCtrl && event.key.toLowerCase() === 'z') {
    event.preventDefault(); 
    
    if (selectedEls.length > 0) {
      // מיון: מלמעלה למטה, ומימין לשמאל (RTL)
      selectedEls.sort((a, b) => {
        const topA = parseFloat(a.style.top) || parseFloat(a.getAttribute('data-y')) || 0;
        const topB = parseFloat(b.style.top) || parseFloat(b.getAttribute('data-y')) || 0;
        const leftA = parseFloat(a.style.left) || parseFloat(a.getAttribute('data-x')) || 0;
        const leftB = parseFloat(b.style.left) || parseFloat(b.getAttribute('data-x')) || 0;
        
        if (Math.abs(topA - topB) > 50) return topA - topB; // שורות שונות
        return leftB - leftA; // מימינה לשמאלה
      });

      const ITEM_SIZE = 200; // גודל קבוע לכל התמונות ברשת
      const GAP = 20;
      const COLUMNS = 4; // כמות עמודות
      
      // נתחיל מהמיקום של האלמנט הראשון
      const startX = parseFloat(selectedEls[0].style.left) || parseFloat(selectedEls[0].getAttribute('data-x')) || 100;
      const startY = parseFloat(selectedEls[0].style.top) || parseFloat(selectedEls[0].getAttribute('data-y')) || 100;

      selectedEls.forEach((el, index) => {
        const row = Math.floor(index / COLUMNS);
        const col = index % COLUMNS;
        
        // ב-RTL מחסרים את ה-X כדי ללכת ימינה->שמאלה
        const newX = startX - (col * (ITEM_SIZE + GAP));
        const newY = startY + (row * (ITEM_SIZE + GAP));
        
        el.style.width = ITEM_SIZE + 'px';
        el.style.height = ITEM_SIZE + 'px';
        el.style.left = newX + 'px';
        el.style.top = newY + 'px';
        el.setAttribute('data-x', newX);
        el.setAttribute('data-y', newY);
      });
      
      saveCurrentPageContent();
    }
    return;
  }
  
  // 13.6 ביטול פעולה אחרונה (Undo) בעזרת Command + B
  if (isCmdOrCtrl && event.key.toLowerCase() === 'b') {
    event.preventDefault();
    if (undoStack.length > 1) {
      undoStack.pop(); // זורקים את המצב השגוי האחרון
      const previousState = undoStack[undoStack.length - 1]; // לוקחים את הלפני-אחרון
      const stateObj = JSON.parse(previousState);
      
      // תומך גם בפורמט הישן (רק pages) וגם בחדש (אובייקט עם pages ו-topNavPages)
      if (Array.isArray(stateObj)) {
        pages = stateObj;
      } else {
        pages = stateObj.pages || defaultPages;
        topNavPages = stateObj.topNavPages || topNavPages;
      }
      
      // בודקים אם העמוד שבו היינו עדיין קיים (אולי ביטלנו יצירת עמוד)
      const pageExists = pages.find(p => p.id === activePageId);
      if (!pageExists && pages.length > 0) {
        activePageId = pages[0].id;
      }
      
      // שומרים ומרעננים הכל
      localforage.setItem('mySitePages_v3', pages);
      localforage.setItem('myActivePage_v3', activePageId);
      localforage.setItem('mySiteTopNav_v3', topNavPages);
      renderSideMenu();
      renderTopNav();
      renderPage();
    }
    return;
  }

  // 13.7 הזזה מדויקת עם החיצים
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    const step = event.shiftKey ? 25 : 2.5;
    
    selectedEls.forEach(el => {
      let x = parseFloat(el.style.left) || parseFloat(el.getAttribute('data-x')) || 0;
      let y = parseFloat(el.style.top) || parseFloat(el.getAttribute('data-y')) || 0;
      
      if (event.key === 'ArrowUp') y -= step;
      if (event.key === 'ArrowDown') y += step;
      if (event.key === 'ArrowLeft') x -= step;
      if (event.key === 'ArrowRight') x += step;
      
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.setAttribute('data-x', x);
      el.setAttribute('data-y', y);
    });
    clearTimeout(window.moveSaveTimeout);
    window.moveSaveTimeout = setTimeout(() => {
      saveCurrentPageContent();
    }, 300);
  }
});

// --- שלב 14: הוספת קישורים לתמונות וטקסטים (חיצוניים ופנימיים) ---
const linkModal = document.getElementById('link-modal');
const linkInternalSelect = document.getElementById('link-internal-select');
const linkExternalInput = document.getElementById('link-external-input');
const btnCancelLink = document.getElementById('btn-cancel-link');
const btnRemoveLink = document.getElementById('btn-remove-link');
const btnSaveLink = document.getElementById('btn-save-link');
let currentEditingLinkElement = null;

// לחיצה כפולה במצב עריכה כדי להוסיף קישור
document.addEventListener('dblclick', (event) => {
  if (!isEditMode) return;
  const draggableEl = event.target.closest('.draggable-resizable');
  if (draggableEl) {
    currentEditingLinkElement = draggableEl;
    const currentLink = draggableEl.getAttribute('data-href') || '';
    
    // מילוי ה-Select בעמודים קיימים
    linkInternalSelect.innerHTML = '<option value="">-- בחר עמוד פנימי --</option>';
    pages.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.title;
      linkInternalSelect.appendChild(opt);
    });
    
    // איפוס
    linkExternalInput.value = '';
    linkInternalSelect.value = '';
    
    // טעינת קישור קיים אם יש
    if (currentLink) {
      if (pages.find(p => p.id === currentLink || p.title === currentLink)) {
        const found = pages.find(p => p.id === currentLink || p.title === currentLink);
        linkInternalSelect.value = found.id;
      } else {
        linkExternalInput.value = currentLink;
      }
    }
    
    linkModal.style.display = 'flex';
  }
});

btnCancelLink.onclick = () => {
  linkModal.style.display = 'none';
  currentEditingLinkElement = null;
  hotspotPendingData = null;
};

btnRemoveLink.onclick = () => {
  if (currentEditingLinkElement) {
    currentEditingLinkElement.removeAttribute('data-href');
    currentEditingLinkElement.style.cursor = 'move';
    saveCurrentPageContent();
  }
  linkModal.style.display = 'none';
  currentEditingLinkElement = null;
};

btnSaveLink.onclick = () => {
  const internalVal = linkInternalSelect.value;
  const externalVal = linkExternalInput.value.trim();
  const finalVal = externalVal || internalVal;

  if (hotspotPendingData) {
    // שמירת hotspot
    if (finalVal) {
      const { el, hsData } = hotspotPendingData;
      let hotspots = [];
      try { hotspots = JSON.parse(el.dataset.hotspots || '[]'); } catch(e) {}
      hotspots.push({ ...hsData, href: finalVal });
      el.dataset.hotspots = JSON.stringify(hotspots);
      renderHotspotsOnEl(el);
      saveToStorage();
    }
    hotspotPendingData = null;
  } else if (currentEditingLinkElement) {
    if (finalVal) {
      currentEditingLinkElement.setAttribute('data-href', finalVal);
      currentEditingLinkElement.style.cursor = 'pointer';
    } else {
      currentEditingLinkElement.removeAttribute('data-href');
      currentEditingLinkElement.style.cursor = 'move';
    }
    saveCurrentPageContent();
  }

  linkModal.style.display = 'none';
  currentEditingLinkElement = null;
};





// ניקוי אוטומטי של השדה השני
linkExternalInput.addEventListener('input', () => {
  if (linkExternalInput.value.trim() !== '') linkInternalSelect.value = '';
});
linkInternalSelect.addEventListener('change', () => {
  if (linkInternalSelect.value !== '') linkExternalInput.value = '';
});

document.addEventListener('click', (event) => {
  // אם אנחנו במצב עריכה - ננווט לקישור רק אם לחצו 3 פעמים רצופות!
  if (isEditMode && event.detail !== 3) return;

  const draggableEl = event.target.closest('.draggable-resizable');
  if (draggableEl) {
    const link = draggableEl.getAttribute('data-href');
    if (link) {
      // בודקים אם הקישור הוא עמוד פנימי (לפי שם העמוד או ה-ID שלו)
      const internalPage = pages.find(p => p.title.trim() === link.trim() || p.id === link.trim());
      
      if (internalPage) {
        // נווט לעמוד הפנימי
        window.__detailOpen = false;
        activePageId = internalPage.id;
        saveToStorage();
        renderSideMenu();
        renderTopNav();
        renderPage();
      } else {
        // קישור חיצוני - פתיחה בטאב חדש
        const finalLink = link.startsWith('http') ? link : 'https://' + link;
        window.open(finalLink, '_blank');
      }
    }
  }
});



// --- Support Chat Modal Logic ---
document.addEventListener('DOMContentLoaded', () => {
  const chatBtn = document.querySelector('.chat-btn');
  const chatModal = document.getElementById('support-chat-modal');
  const chatCloseBtn = document.getElementById('support-chat-close');
  const chatSendBtn = document.getElementById('support-chat-send');
  const chatInput = document.getElementById('support-chat-input');
  const messagesContainer = document.getElementById('chat-messages-container');

  const managerBtn = document.getElementById('manager-btn');
  const floatingToolbarEl = document.getElementById('floating-toolbar');

  // הגדרת המנהל המורשה
  const ADMIN_EMAIL = "yoni98321@gmail.com";

  function updateManagerUI(user = null) {
    if (!managerBtn) return;
    // אורח אנונימי מטופל כמו לא-מחובר בממשק (בלי פרופיל/אימות/משימות/עריכה)
    if (user && user.isAnonymous) user = null;

    if (!user) {
      const chatPanel = document.getElementById('global-chat-panel');
      if (chatPanel) chatPanel.style.display = 'none';
      if (typeof chatCleanup === 'function') chatCleanup();
      managerBtn.textContent = 'אורח';
      managerBtn.classList.remove('is-admin');
      if (floatingToolbarEl) floatingToolbarEl.style.display = 'none';
      
      // כיבוי מצב עריכה
      if (isEditMode) {
        isEditMode = false;
        btnEditMode.classList.remove('active');
        btnEditMode.textContent = 'מצב עריכה ✏️';
        saveCurrentPageContent();
        renderSideMenu();
        renderTopNav();
      }
    } else {
      if (typeof initChatBadgeListeners === 'function') initChatBadgeListeners(user);
      
      if (user.email === ADMIN_EMAIL) {
        managerBtn.textContent = 'מנהל ✏️';
        managerBtn.classList.add('is-admin');
        if (floatingToolbarEl) floatingToolbarEl.style.display = '';
        
        // הפעלת מצב עריכה
        if (!isEditMode) {
          isEditMode = true;
          btnEditMode.classList.add('active');
          btnEditMode.textContent = 'שמור שינויים 💾';
          applyEditModeToContent();
          renderSideMenu();
          renderTopNav();
        }
        // תיקון חד-פעמי של גישת הקהילות (רץ פעם אחת בלבד, מכבד הסתרות עתידיות)
        if (typeof repairCommunitiesAccessOnce === 'function') repairCommunitiesAccessOnce();
      } else {
        managerBtn.textContent = 'התנתק';
        managerBtn.classList.remove('is-admin');
        if (floatingToolbarEl) floatingToolbarEl.style.display = 'none';
        
        // כיבוי מצב עריכה
        if (isEditMode) {
          isEditMode = false;
          btnEditMode.classList.remove('active');
          btnEditMode.textContent = 'מצב עריכה ✏️';
          saveCurrentPageContent();
          renderSideMenu();
          renderTopNav();
        }
      }
    }

    if (typeof updateFABsVisibility === 'function') updateFABsVisibility();
  }

  // מאזין לשינויי מצב התחברות
  let userActivityInterval = null;
  onAuthStateChanged(auth, async (user) => {
    setTimeout(() => { try { refreshUserMaps(); } catch (e) {} }, 0);
    updateManagerUI(user);
    if (userActivityInterval) {
      clearInterval(userActivityInterval);
      userActivityInterval = null;
    }
    // אורח אנונימי (guest) — לא מריצים עבודה כבדה ולא מרנדרים מחדש. זה מונע
    // תקיעה/באגים כשנחתמים כאורח תוך כדי שמירת העלאה.
    if (user && user.isAnonymous) {
      return;
    }
    if (user) {
      updateUserActivity(user);
      userActivityInterval = setInterval(() => updateUserActivity(user), 45000);
      if (typeof crmRecordUserMeta === 'function') { try { crmRecordUserMeta(user); } catch (e) {} }

      // שמירת ה-uid של המנהל כדי שמשתמשים יוכלו לפתוח שיחה נעוצה עם מנהל האתר
      if (user.email === ADMIN_EMAIL) {
        try { set(ref(db, 'website/admin_uid'), user.uid); } catch (e) {}
      }

      // מנוי להודעות פרטיות כדי שהתראות/מונה יתעדכנו חי
      if (typeof subscribeMyDMs === 'function') { try { subscribeMyDMs(); } catch (e) {} }
      // מנוי לרשימת המעקב כדי שהפיד יציג קודם את מי שעוקבים אחריו
      if (typeof subscribeMyFollows === 'function') { try { subscribeMyFollows(); } catch (e) {} }
      // מנוי לאימותי חשבונות בזמן אמת
      if (typeof initVerificationRealtimeListener === 'function') { try { initVerificationRealtimeListener(); } catch (e) {} }

      // סנכרון יתרת הלייקים היומית
      await syncUserLikeBudget(user);
      
      // טעינת גלריות שמורות מהענן
      try {
        const userSavedRef = ref(db, `website/users/${user.uid}/saved_galleries`);
        const snapshot = await get(userSavedRef);
        if (snapshot.exists()) {
          localStorage.setItem(`saved_galleries_${user.uid}`, JSON.stringify(snapshot.val()));
        }
      } catch (e) {
        console.error("שגיאה בטעינת שמורים מפיירבייס:", e);
      }
    }
    if (typeof renderPage === 'function') renderPage();
  });

  const authModal = document.getElementById('auth-modal');
  const authGoogleLoginBtn = document.getElementById('auth-google-login-btn');
  const authModalClose = document.getElementById('auth-modal-close');

  if (managerBtn) {
    managerBtn.addEventListener('click', () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        // אם מחובר, לחיצה תנתק אותו
        signOut(auth).then(() => {
          alert("התנתקת בהצלחה!");
        }).catch((err) => {
          console.error("שגיאה בהתנתקות:", err);
        });
      } else {
        // פתיחת מודאל התחברות
        if (authModal) authModal.style.display = 'flex';
      }
    });
  }

  if (authModalClose && authModal) {
    authModalClose.addEventListener('click', () => {
      authModal.style.display = 'none';
    });
  }

  if (authGoogleLoginBtn && authModal) {
    authGoogleLoginBtn.addEventListener('click', () => {
      authModal.style.display = 'none'; // סגירת המודאל לקראת הפופאפ
      signInWithPopup(auth, provider)
        .then((result) => {
          const user = result.user;
          if (user.email === ADMIN_EMAIL) {
            alert(`שלום מנהל! התחברת בהצלחה עם המייל: ${user.email}`);
          } else {
            alert(`התחברת בהצלחה כמשתמש רגיל (${user.email})! כעת תוכל לפנות לתמיכה.`);
          }
        })
        .catch((error) => {
          console.error("שגיאה מפורטת בהתחברות:", error);
          alert("התחברות נכשלה. קוד שגיאה: " + error.code + "\nהודעה: " + error.message);
        });
    });
  }

  const authMicrosoftLoginBtn = document.getElementById('auth-microsoft-login-btn');
  if (authMicrosoftLoginBtn) {
    authMicrosoftLoginBtn.addEventListener('click', () => {
      alert("התחברות באמצעות Microsoft אינה פעילה כרגע. אנא השתמש בהתחברות באמצעות Google.");
    });
  }

  const authEmailSubmitBtn = document.getElementById('auth-email-submit-btn');
  if (authEmailSubmitBtn) {
    authEmailSubmitBtn.addEventListener('click', () => {
      alert("התחברות באמצעות דוא\"ל אינה פעילה כרגע. אנא השתמש בהתחברות באמצעות Google.");
    });
  }

  if (chatBtn && chatModal) {
    const aiBtn = document.querySelector('.bar-ai-btn');
    
    const openChat = (e) => {
      e.preventDefault();
      chatModal.classList.add('chat-open');
      setTimeout(() => chatInput.focus(), 300);
    };
    
    chatBtn.addEventListener('click', openChat);
    if (aiBtn) aiBtn.addEventListener('click', openChat);

    chatCloseBtn.addEventListener('click', () => {
      chatModal.classList.remove('chat-open');
    });

    document.addEventListener('click', (e) => {
      // אם לוחצים מחוץ לחלון הצ'אט ומחוץ לכפתור הפתיחה
      if (chatModal.classList.contains('chat-open') && 
          !chatModal.contains(e.target) && 
          !chatBtn.contains(e.target) &&
          !(aiBtn && aiBtn.contains(e.target))) {
        chatModal.classList.remove('chat-open');
      }
    });

    const addMessage = (text, isUser = true) => {
      const msgDiv = document.createElement('div');
      msgDiv.className = `chat-message ${isUser ? 'user-msg' : 'automated-msg'}`;
      
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const senderHtml = isUser 
        ? `<div class="msg-sender" style="text-align: left; width: 100%; display: block;">אתה</div>` 
        : `<div class="msg-sender">🤖 נציג AI</div>`;
        
      const timeAlign = isUser ? 'text-align: left;' : '';

      msgDiv.innerHTML = `
        <div class="msg-content">
          ${senderHtml}
          ${isUser ? escHtml(text) : text}
          <div class="msg-time" style="${timeAlign}">${timeStr}</div>
        </div>
      `;
      
      messagesContainer.appendChild(msgDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    const handleSend = () => {
      const text = chatInput.value.trim();
      if (!text) return;
      
      addMessage(text, true);
      chatInput.value = '';
      
      // סימולציית שירות לקוחות AI
      setTimeout(() => {
        addMessage('אני בודק את הפנייה שלך. כרגע אני נציג AI בהדגמה, אבל בקרוב אוכל לעזור לך באופן מלא! האם יש משהו ספציפי שתרצה לדעת?', false);
      }, 1200);
    };

    chatSendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });
  }
});

// --- מנגנון הורדת קבצים ---
// מאזין ללחיצות על אזור התוכן הראשי. אם לחצו על אלמנט שיש לו data-download-url במצב אורח, מוריד את הקובץ
mainContent.addEventListener('click', (e) => {
  // אם אנחנו במצב עריכה - הלחיצה מיועדת לבחירת האלמנט, לא לניווט
  if (isEditMode) return;

  // פתיחת קישור חיצוני / ניווט לדף פנימי בלחיצה על אלמנט מקושר
  const linkedEl = e.target.closest('[data-href]');
  if (linkedEl) {
    const href = linkedEl.getAttribute('data-href');
    if (href) {
      const internalPage = pages.find(p => p.title.trim() === href.trim() || p.id === href.trim());
      if (internalPage) {
        window.__detailOpen = false;
        activePageId = internalPage.id;
        saveToStorage();
        renderSideMenu();
        renderTopNav();
        renderPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const finalLink = href.startsWith('http') ? href : 'https://' + href;
        window.open(finalLink, '_blank');
      }
      return;
    }
  }

  // ניווט לדף פנימי (data-page-link)
  const pageLinkEl = e.target.closest('[data-page-link]');
  if (pageLinkEl) {
    const targetPageId = pageLinkEl.dataset.pageLink;
    const targetPage = pages.find(p => p.id === targetPageId);
    if (targetPage) {
      window.__detailOpen = false;
      activePageId = targetPageId;
      saveToStorage();
      renderSideMenu();
      renderTopNav();
      renderPage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return;
  }

  // בודק אם האלמנט שעליו לחצו (או אחד מאבותיו) מכיל את מאפיין ההורדה
  const downloadEl = e.target.closest('[data-download-url]');
  if (downloadEl) {
    const fileUrl = downloadEl.dataset.downloadUrl;
    const fileName = downloadEl.dataset.downloadName || 'download';
    
    // יוצר תגית a נסתרת ומפעיל לחיצה מדומה כדי להוריד את הקובץ
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
});

// ============================================================
// דפים מוסתרים וקישורים פנימיים
// ============================================================

// --- יצירת דף מוסתר (לא מופיע בניווט) ---
const btnAddHiddenPage = document.getElementById('btn-add-hidden-page');
if (btnAddHiddenPage) {
  btnAddHiddenPage.addEventListener('click', () => {
    const newTitle = prompt('שם הדף המוסתר (לא יופיע בתפריט):\nלמשל: "דף פרטים", "עמוד הסבר", "גלריה"');
    if (newTitle && newTitle.trim()) {
      const newPage = {
        id: 'page-hidden-' + Date.now(),
        title: newTitle.trim(),
        content: '',
        isHidden: true  // מסומן כמוסתר מהניווט
      };
      pages.push(newPage);
      // לא מוסיפים ל-topNavPages — הדף קיים אבל לא מופיע בתפריט

      // מעבר לדף החדש לצורך עריכה
      activePageId = newPage.id;
      saveToStorage();
      renderPage();
      alert('✅ הדף "' + newPage.title + '" נוצר!\nעכשיו ערוך אותו, ואז חזור לעמוד הראשי וקשר אליו תמונה או כפתור.');
    }
  });
}

// --- מודאל "קשר לדף פנימי" ---
const pageLinkModal = document.getElementById('page-link-modal');
const pageLinkSelect = document.getElementById('page-link-select');
const pageLinkCancel = document.getElementById('page-link-cancel');
const pageLinkSave = document.getElementById('page-link-save');
let _pageLinkTargetEl = null;

function openPageLinkModal(el) {
  _pageLinkTargetEl = el;

  // מילוי רשימת כל הדפים (כולל מוסתרים)
  pageLinkSelect.innerHTML = '<option value="">— ללא קישור —</option>';
  pages.forEach(p => {
    if (p.id === activePageId) return; // לא מקשרים לעמוד עצמו
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.title + (p.isHidden ? ' 🔒' : '');
    if (el.dataset.pageLink === p.id) opt.selected = true;
    pageLinkSelect.appendChild(opt);
  });

  pageLinkModal.style.display = 'flex';
}

if (pageLinkCancel) {
  pageLinkCancel.addEventListener('click', () => {
    pageLinkModal.style.display = 'none';
    _pageLinkTargetEl = null;
  });
}

if (pageLinkSave) {
  pageLinkSave.addEventListener('click', () => {
    if (!_pageLinkTargetEl) return;
    const selectedId = pageLinkSelect.value;
    if (selectedId) {
      _pageLinkTargetEl.dataset.pageLink = selectedId;
      _pageLinkTargetEl.style.cursor = 'pointer';
      // אינדיקטור ויזואלי קטן שיודע שיש קישור
      _pageLinkTargetEl.title = 'קישור לדף: ' + (pages.find(p => p.id === selectedId)?.title || selectedId);
    } else {
      delete _pageLinkTargetEl.dataset.pageLink;
      _pageLinkTargetEl.style.cursor = '';
      _pageLinkTargetEl.title = '';
    }
    saveCurrentPageContent();
    pageLinkModal.style.display = 'none';
    _pageLinkTargetEl = null;
  });
}

// --- כפתור "קשר לדף" בתוך action panel של אלמנטים ---
// מוסיפים hook על יצירת actions-container
const _origApplyEditMode = applyEditModeToContent;
applyEditModeToContent = function() {
  _origApplyEditMode();

  // מוסיפים כפתור קישור-דף לכל actions-container שנוצר
  setTimeout(() => {
    mainContent.querySelectorAll('.actions-container').forEach(container => {
      if (container.querySelector('.page-link-btn')) return; // כבר יש
      const parentEl = container.closest('.draggable-resizable');
      if (!parentEl) return;

      const pageLinkBtn = document.createElement('button');
      pageLinkBtn.className = 'action-btn page-link-btn';
      pageLinkBtn.innerHTML = '📄→';
      pageLinkBtn.title = 'קשר לדף פנימי';
      pageLinkBtn.style.background = parentEl.dataset.pageLink ? '#6366f1' : '';
      pageLinkBtn.style.color = parentEl.dataset.pageLink ? 'white' : '';

      pageLinkBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        openPageLinkModal(parentEl);
      });

      container.appendChild(pageLinkBtn);
    });
  }, 50);
};

// --- ניווט לדף בלחיצה על אלמנט מקושר (מצב צופה) ---
// משתמשים ב-document במקום mainContent כדי לתפוס גם קליקים מבפנים
document.addEventListener('click', (e) => {
  if (isEditMode) return; // רק במצב צופה
  const linked = e.target.closest('[data-page-link]');
  if (linked && linked.dataset.pageLink) {
    const targetPage = pages.find(p => p.id === linked.dataset.pageLink);
    if (targetPage) {
      e.preventDefault();
      e.stopPropagation();
      window.__detailOpen = false;
      activePageId = linked.dataset.pageLink;
      renderPage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
});


// ============================================================
// אזורי לחיצה (Hotspots) - ציור אזורים לחיצים על תמונות
// ============================================================

let hotspotPendingData = null; // נתוני hotspot שממתינים לקישור

function openLinkModalForHotspot(el, hsData) {
  // מילוי רשימת עמודים פנימיים
  linkInternalSelect.innerHTML = '<option value="">-- בחר עמוד פנימי --</option>';
  pages.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.title;
    linkInternalSelect.appendChild(opt);
  });
  linkExternalInput.value = '';
  linkInternalSelect.value = '';

  // שמור נתונים זמנית
  hotspotPendingData = { el, hsData };
  currentEditingLinkElement = null; // לא עורכים אלמנט רגיל
  linkModal.style.display = 'flex';
}

let hotspotDrawingEl = null; // האלמנט שעליו מציירים
let hotspotStartX = 0, hotspotStartY = 0;
let hotspotDrawRect = null;
let isDrawingHotspot = false;

const btnAddHotspot = document.getElementById('btn-add-hotspot');
if (btnAddHotspot) {
  btnAddHotspot.addEventListener('click', () => {
    if (!selectedElement) {
      alert('בחר קודם אלמנט (תמונה) שעליו תרצה לסמן אזורים לחיצים.');
      return;
    }
    enterHotspotDrawMode(selectedElement);
  });
}

function enterHotspotDrawMode(el) {
  if (!isEditMode) return; // אורח לא יכול לסמן אזורים
  hotspotDrawingEl = el;
  el.classList.add('hotspot-drawing-mode');
  el.style.position = 'relative';

  // נטרול גרירה ושינוי גודל כדי שלא יתנגשו עם ציור הריבוע
  interact('.draggable-resizable').draggable({ enabled: false }).resizable({ enabled: false });

  // יצירת ריבוע הגרירה
  hotspotDrawRect = document.createElement('div');
  hotspotDrawRect.id = 'hotspot-draw-rect';
  el.appendChild(hotspotDrawRect);

  el.addEventListener('mousedown', onHotspotMouseDown);
  document.addEventListener('mousemove', onHotspotMouseMove);
  document.addEventListener('mouseup', onHotspotMouseUp);
  document.addEventListener('keydown', onHotspotKeyDown);

  showHotspotHint('סמן אזור על התמונה - גרור ריבוע ולחץ ESC לסיום');
}

function exitHotspotDrawMode() {
  if (!hotspotDrawingEl) return;
  hotspotDrawingEl.classList.remove('hotspot-drawing-mode');
  hotspotDrawingEl.removeEventListener('mousedown', onHotspotMouseDown);
  document.removeEventListener('mousemove', onHotspotMouseMove);
  document.removeEventListener('mouseup', onHotspotMouseUp);
  document.removeEventListener('keydown', onHotspotKeyDown);
  if (hotspotDrawRect) hotspotDrawRect.remove();
  hotspotDrawRect = null;
  hotspotDrawingEl = null;
  hideHotspotHint();

  // החזרת גרירה ושינוי גודל
  interact('.draggable-resizable').draggable({ enabled: true }).resizable({ enabled: true });
}

function onHotspotKeyDown(e) {
  if (e.key === 'Escape') exitHotspotDrawMode();
}

function onHotspotMouseDown(e) {
  e.stopPropagation();
  e.preventDefault();
  isDrawingHotspot = true;
  const rect = hotspotDrawingEl.getBoundingClientRect();
  hotspotStartX = e.clientX - rect.left;
  hotspotStartY = e.clientY - rect.top;
  hotspotDrawRect.style.display = 'block';
  hotspotDrawRect.style.left = hotspotStartX + 'px';
  hotspotDrawRect.style.top = hotspotStartY + 'px';
  hotspotDrawRect.style.width = '0';
  hotspotDrawRect.style.height = '0';
}

function onHotspotMouseMove(e) {
  if (!isDrawingHotspot || !hotspotDrawingEl) return;
  const rect = hotspotDrawingEl.getBoundingClientRect();
  const curX = e.clientX - rect.left;
  const curY = e.clientY - rect.top;
  const x = Math.min(hotspotStartX, curX);
  const y = Math.min(hotspotStartY, curY);
  const w = Math.abs(curX - hotspotStartX);
  const h = Math.abs(curY - hotspotStartY);
  hotspotDrawRect.style.left = x + 'px';
  hotspotDrawRect.style.top = y + 'px';
  hotspotDrawRect.style.width = w + 'px';
  hotspotDrawRect.style.height = h + 'px';
}

function onHotspotMouseUp(e) {
  if (!isDrawingHotspot || !hotspotDrawingEl) return;
  isDrawingHotspot = false;
  hotspotDrawRect.style.display = 'none';

  const rect = hotspotDrawingEl.getBoundingClientRect();
  const curX = e.clientX - rect.left;
  const curY = e.clientY - rect.top;
  const x = Math.min(hotspotStartX, curX);
  const y = Math.min(hotspotStartY, curY);
  const w = Math.abs(curX - hotspotStartX);
  const h = Math.abs(curY - hotspotStartY);

  if (w < 10 || h < 10) return; // התעלם מלחיצות קטנות

  // שמור כאחוזים מגודל האלמנט
  const elW = hotspotDrawingEl.offsetWidth;
  const elH = hotspotDrawingEl.offsetHeight;
  const xPct = (x / elW) * 100;
  const yPct = (y / elH) * 100;
  const wPct = (w / elW) * 100;
  const hPct = (h / elH) * 100;

  // פתח את חלון "הגדרת קישור" הקיים עם callback לשמירת hotspot
  openLinkModalForHotspot(hotspotDrawingEl, { x: xPct, y: yPct, w: wPct, h: hPct });
}

// רנדור hotspots על אלמנט
function renderHotspotsOnEl(el) {
  // הסר hotspots ישנים
  el.querySelectorAll('.hotspot-overlay').forEach(h => h.remove());

  let hotspots = [];
  try { hotspots = JSON.parse(el.dataset.hotspots || '[]'); } catch(e) {}

  hotspots.forEach((hs, index) => {
    const div = document.createElement('div');
    div.className = 'hotspot-overlay';
    div.style.left = hs.x + '%';
    div.style.top = hs.y + '%';
    div.style.width = hs.w + '%';
    div.style.height = hs.h + '%';
    div.dataset.href = hs.href;
    div.title = '';

    // כפתור מחיקה (נראה רק במצב עריכה)
    const delBtn = document.createElement('button');
    delBtn.className = 'hotspot-delete-btn';
    delBtn.innerHTML = '✕';
    delBtn.title = 'מחק אזור';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hotspots.splice(index, 1);
      el.dataset.hotspots = JSON.stringify(hotspots);
      renderHotspotsOnEl(el);
      saveToStorage();
    });

    // לחיצה במצב צפייה - פתח קישור
    div.addEventListener('click', (e) => {
      if (isEditMode) return;
      e.stopPropagation();
      const link = hs.href.startsWith('http') ? hs.href : 'https://' + hs.href;
      window.open(link, '_blank');
    });

    div.appendChild(delBtn);
    el.appendChild(div);
  });
}

// רנדור hotspots על כל האלמנטים בעמוד
function renderAllHotspots() {
  mainContent.querySelectorAll('[data-hotspots]').forEach(el => {
    if (el.dataset.hotspots && el.dataset.hotspots !== '[]') {
      renderHotspotsOnEl(el);
    }
  });
}

// הנחיית hotspot
function showHotspotHint(msg) {
  let hint = document.getElementById('hotspot-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'hotspot-hint';
    hint.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 20px;border-radius:20px;z-index:99999;font-size:14px;pointer-events:none;';
    document.body.appendChild(hint);
  }
  hint.textContent = msg;
}

function hideHotspotHint() {
  const hint = document.getElementById('hotspot-hint');
  if (hint) hint.remove();
}


// ============================================================
// ניהול עמודים - מחיקה ושינוי שם
// ============================================================

const btnManagePages = document.getElementById('btn-manage-pages');
const managePagesModal = document.getElementById('manage-pages-modal');
const managePagesClose = document.getElementById('manage-pages-close');
const managePagesList = document.getElementById('manage-pages-list');

function openManagePagesModal() {
  managePagesList.innerHTML = '';
  pages.forEach(page => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; align-items:center; gap:10px; padding:12px 14px; border:1px solid #eee; border-radius:10px; background:#fafafa;';

    const name = document.createElement('span');
    name.textContent = page.title;
    name.style.cssText = 'flex:1; font-size:15px; font-weight:500;';

    const renameBtn = document.createElement('button');
    renameBtn.textContent = '✏️';
    renameBtn.title = 'שנה שם';
    renameBtn.style.cssText = 'background:none; border:1px solid #ddd; border-radius:8px; padding:5px 8px; cursor:pointer; font-size:14px;';
    renameBtn.onclick = () => {
      const newName = prompt('שם חדש לעמוד:', page.title);
      if (newName && newName.trim()) {
        page.title = newName.trim();
        saveToStorage();
        renderSideMenu();
        renderTopNav();
        openManagePagesModal();
      }
    };

    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑️ מחק';
    delBtn.title = 'מחק עמוד';
    delBtn.style.cssText = 'background:#fee2e2; border:none; border-radius:8px; padding:5px 10px; cursor:pointer; font-size:13px; color:#b91c1c; font-weight:600;';
    delBtn.onclick = () => {
      if (pages.length === 1) { alert('אי אפשר למחוק את העמוד האחרון!'); return; }
      if (!confirm(`למחוק את "${page.title}"?`)) return;
      pages.splice(pages.findIndex(p => p.id === page.id), 1);
      topNavPages.splice(topNavPages.indexOf(page.id), 1);
      if (activePageId === page.id) activePageId = pages[0].id;
      saveToStorage();
      renderSideMenu();
      renderTopNav();
      renderPage();
      openManagePagesModal();
    };

    row.appendChild(name);
    row.appendChild(renameBtn);
    row.appendChild(delBtn);
    managePagesList.appendChild(row);
  });

  managePagesModal.style.display = 'flex';
}

if (btnManagePages) btnManagePages.addEventListener('click', openManagePagesModal);
if (managePagesClose) managePagesClose.onclick = () => { managePagesModal.style.display = 'none'; };

// ============================================================
// קרא עוד / הקטן
// ============================================================

function applyReadMoreToEl(el) {
  // מסמן את האלמנט
  el.dataset.hasReadmore = 'true';
  renderReadMore(el);
  saveCurrentPageContent();
}

function removeReadMoreFromEl(el) {
  delete el.dataset.hasReadmore;
  const wrapper = el.querySelector('.readmore-wrapper');
  if (wrapper) {
    // מחלץ את התוכן המקורי
    const content = wrapper.querySelector('.readmore-content');
    if (content) el.innerHTML = content.innerHTML;
  }
  saveCurrentPageContent();
}

function renderReadMore(el) {
  if (!el.dataset.hasReadmore) return;
  // אל תרנדר שוב אם כבר יש wrapper
  if (el.querySelector('.readmore-wrapper')) return;

  const originalHTML = el.innerHTML;
  el.innerHTML = `
    <div class="readmore-wrapper readmore-collapsed">
      <div class="readmore-content">${originalHTML}</div>
      <div class="readmore-fade"></div>
      <button class="readmore-btn" onclick="toggleReadMore(this)">קראו עוד</button>
    </div>
  `;
}

function toggleReadMore(btn) {
  const wrapper = btn.closest('.readmore-wrapper');
  if (!wrapper) return;
  const collapsed = wrapper.classList.toggle('readmore-collapsed');
  btn.textContent = collapsed ? 'קראו עוד' : 'הקטן';
}

// החלת קרא עוד על כל האלמנטים שמסומנים אחרי renderPage
const _origRenderPage = renderPage;
// הוספת הפעלת readmore לתוך applyEditModeToContent ו-removeEditModeFromContent
const _origApplyEdit = applyEditModeToContent;
applyEditModeToContent = function() {
  _origApplyEdit.apply(this, arguments);
  // במצב עריכה - מסיר את ה-wrapper כדי שניתן לערוך
  mainContent.querySelectorAll('[data-has-readmore]').forEach(el => {
    const wrapper = el.querySelector('.readmore-wrapper');
    if (wrapper) {
      const content = wrapper.querySelector('.readmore-content');
      if (content) el.innerHTML = content.innerHTML;
    }
  });
};

const _origRemoveEdit = removeEditModeFromContent;
removeEditModeFromContent = function() {
  _origRemoveEdit.apply(this, arguments);
  // ביציאה ממצב עריכה - מחיל מחדש את קרא עוד
  mainContent.querySelectorAll('[data-has-readmore]').forEach(el => {
    renderReadMore(el);
  });
};

// כפתור קרא עוד בסרגל הכלים של האלמנט - מוסיף דרך applyEditModeToContent
// לכן מאזינים ל-renderPage ומוסיפים את הכפתור לשם

// ===== דף כתבות =====

const ARTICLES_SAMPLES = [
  {
    id: 'a1',
    title: 'גוגל משדרגת את Chrome עם מילוי אוטומטי של מסמכי זיהוי, טיסות ועוד מ-Google Wallet',
    summary: 'גוגל הודיעה על העמקת השילוב בין שירות הארנק שלה לדפדפן הכרום במובייל ובדסקטופ. הדפדפן יאפשר מילוי אוטומטי של מסמכי זיהוי, דרכונים ורישיונות נהיגה ישירות מהאפליקציה.',
    body: 'גוגל הכריזה הבוקר על שדרוג משמעותי לדפדפן Chrome, שיאפשר למשתמשים למלא טפסים מקוונים אוטומטית תוך שימוש בנתוני זיהוי שמורים ב-Google Wallet.\n\nהשדרוג החדש יתמוך במסמכי זיהוי ממשלתיים, כולל תעודות זהות ודרכונים, כרטיסי טיסה ועוד. פיצ\'ר זה יהיה זמין תחילה בארצות הברית ויורחב לשאר המדינות בהמשך השנה.\n\nלדברי גוגל, כל המידע מוצפן ואינו נשלח לשרתי החברה - הוא נשאר בטוח במכשיר המשתמש בלבד.',
    author: 'יאל לכברמן', category: 'חדשות', categoryColor: '#1565C0', timestamp: 'היום, 11:20',
    image: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=800&q=80', link: ''
  },
  {
    id: 'a2',
    title: 'הוכרז: Honor X80 Pro Max עם סוללת 11,000mAh ו-Snapdragon 6 Gen 5-i',
    summary: 'מותג הסמארטפונים הסיני מציג מכשיר חדש עם סוללה יוצאת דופן של 11,000 מיליאמפר-שעה לצד טעינה מהירה ומעבד עדכני.',
    body: 'Honor השיקה היום רשמית את ה-X80 Pro Max, מכשיר פלאגשיפ חדש עם אחת הסוללות הגדולות ביותר שנראו בשוק הסמארטפונים.\n\nהמכשיר מגיע עם סוללת 11,000mAh וטעינה מהירה של 100W, שלפי החברה מסוגלת לטעון את הסוללה מ-0 ל-50% תוך 25 דקות בלבד.\n\nמבחינת ביצועים, ה-X80 Pro Max מופעל על ידי מעבד Snapdragon 6 Gen 5-i עם 12GB RAM ו-256GB אחסון. תצוגת ה-AMOLED בגודל 6.8 אינץ\' תומכת ב-120Hz רענון.',
    author: 'רנן מנדזיצקי', category: 'חדשות', categoryColor: '#1565C0', timestamp: 'היום, 09:30',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80', link: ''
  },
  {
    id: 'a3',
    title: 'טיינה מהירה וטוחה מרשים: רכב הפנאי ההיברידי החדש הגיע לישראל',
    summary: 'הרכב החדש מציע עיצוב אגרסיבי וביצועים מרשימים עם מנוע היברידי חסכוני. הגרסה הישראלית מגיעה עם ציוד עשיר במיוחד.',
    body: 'רכב הפנאי ההיברידי החדש הגיע רשמית לשוק הישראלי ומציע שילוב מרשים של עיצוב ספורטיבי עם יעילות דלק יוצאת דופן.\n\nהמנוע ההיברידי מייצר 245 כ"ס ומאפשר צריכת דלק ממוצעת של 5.2 ליטר ל-100 ק"מ. זמן ה-0-100 עומד על 7.8 שניות בלבד.\n\nהגרסה הישראלית מגיעה עם ציוד עשיר כולל מסך מגע 12.3 אינץ\', מערכת שמע פרימיום, רדאר לזיהוי מכשולים ועוד.',
    author: 'אורן מנרד', category: 'רכב', categoryColor: '#1B5E20', timestamp: 'אתמול, 20:40',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80', link: ''
  },
  {
    id: 'a4',
    title: 'סקירה: Sony WH-CH720N – אוזניות מסננות רעשים בתקציב שפוי',
    summary: 'סוני מראה את הכוח בשוק הרעשים האקטיבי (ANC) גם לקטגוריית מחיר נמוכה מ-500 שקלים. האם הן שוות את הרכישה?',
    body: 'אוזניות ה-WH-CH720N של סוני מגיעות לשוק הישראלי במחיר מומלץ של 449 שקלים ומתיימרות להביא ביצועי ANC ברמה גבוהה לקטגוריית מחיר נגישה.\n\nמבחינת עיצוב, האוזניות קלות במיוחד (192 גרם) ונוחות לשימוש ממושך. כרית האוזן מרופדת בחומר רך שאינו מחמם.\n\nביצועי ה-ANC מרשימים לקטגוריית המחיר - הן מסוגלות לסנן רעשי סביבה כמו מזגנים ותנועה בצורה יעילה. הסאונד בהיר ומאוזן עם בס נעים שאינו מוגזם.',
    author: 'רנן מנדזיצקי', category: 'סקירות', categoryColor: '#6A1B9A', timestamp: 'לפני יומיים',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', link: ''
  },
  {
    id: 'a5',
    title: 'מבצע סוף עונה: MacBook Air M3 במחיר חסר תקדים באילת',
    summary: 'דיל יום: אם אתם מתכננים ירידה לאילת בקרוב, רשתות השיווק המקומיות יוצאות במבצע ענק ללא מע"מ על ה-MacBook Air M3.',
    body: 'לקראת עונת הקיץ, רשתות האלקטרוניקה באילת מציעות מחירים חסרי תקדים על ה-MacBook Air M3 - ללא מע"מ, המחיר יורד לכ-3,800 שקלים לגרסת הבסיס.\n\nה-MacBook Air עם שבב M3 מציע שיפור של 35% בביצועים לעומת M2 הקודם, כולל תמיכה בשני מסכים חיצוניים - תכונה שחסרה בדור הקודם.\n\nהמבצע תקף לחודש יולי בלבד ונסיעה לאילת לצורך רכישה עשויה לחסוך מאות שקלים לעומת קנייה בצפון המדינה.',
    author: 'רנן מנדזיצקי', category: 'מבצעים', categoryColor: '#2E7D32', timestamp: 'לפני 3 ימים',
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80', link: ''
  }
];

let PROMOTED_SITES = [];
try {
  const savedSites = localStorage.getItem('promoted_sites');
  if (savedSites) {
    PROMOTED_SITES = JSON.parse(savedSites);
  } else {
    PROMOTED_SITES = [
      { name: 'גוגל (Google)', url: 'https://www.google.com', icon: '🌐' },
      { name: 'וואלה! (Walla)', url: 'https://www.walla.co.il', icon: '📰' },
      { name: 'ויינט (Ynet)', url: 'https://www.ynet.co.il', icon: '🔥' },
      { name: 'יוטיוב (YouTube)', url: 'https://www.youtube.com', icon: '🎥' }
    ];
    localStorage.setItem('promoted_sites', JSON.stringify(PROMOTED_SITES));
  }
} catch (e) {
  PROMOTED_SITES = [
    { name: 'גוגל (Google)', url: 'https://www.google.com', icon: '🌐' },
    { name: 'וואלה! (Walla)', url: 'https://www.walla.co.il', icon: '📰' },
    { name: 'ויינט (Ynet)', url: 'https://www.ynet.co.il', icon: '🔥' },
    { name: 'יוטיוב (YouTube)', url: 'https://www.youtube.com', icon: '🎥' }
  ];
}

function toggleShowImages(checked) {
  try {
    sessionStorage.setItem('show_images', checked ? 'true' : 'false');
  } catch(e){}

  const root = document.documentElement;
  if (!checked) {
    root.classList.add('hide-site-images');
    if (typeof showCopyToast === 'function') showCopyToast('🚫 הצגת תמונות הופסקה');
  } else {
    root.classList.remove('hide-site-images');
    if (typeof showCopyToast === 'function') showCopyToast('🖼️ הצגת תמונות הופעלה');
  }

  const boxes = document.querySelectorAll('#toggle-show-images, #toggle-show-images-top, #toggle-show-images-sidebar');
  boxes.forEach(b => { if (b) b.checked = !!checked; });
}
window.toggleShowImages = toggleShowImages;

function buildSiteDefaultTogglesBar() {
  const isVerified = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('age_verified') === 'true';
  const isShowImages = typeof sessionStorage === 'undefined' || sessionStorage.getItem('show_images') !== 'false';

  return `
    <div class="site-default-toggles-bar" style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 40px; padding: 8px 20px; display: inline-flex; align-items: center; justify-content: space-between; gap: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); margin-bottom: 20px; direction: rtl; flex-wrap: wrap;">
      
      <!-- toggle 2: תוכן למבוגרים (ברירת מחדל: כבוי - אפור / OFF) -->
      <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; margin: 0;">
        <span style="font-size: 14px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 6px;">
          <span>תוכן למבוגרים</span>
          <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; background: #dc2626; color: #ffffff; font-size: 10.5px; font-weight: 900; border-radius: 50%;">18</span>
        </span>
        <div class="ios-switch">
          <input type="checkbox" id="toggle-adult-content-top" ${isVerified ? 'checked' : ''} onchange="toggleSidebarAgeVerification(this.checked)">
          <span class="ios-slider"></span>
        </div>
      </label>

    </div>
  `;
}
window.buildSiteDefaultTogglesBar = buildSiteDefaultTogglesBar;

function buildAgeFilterSidebarBox() {
  const isVerified = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('age_verified') === 'true';
  
  return `
    <div class="art-sidebar-box art-age-filter-box" style="margin-bottom: 20px; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 16px; background: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.03); text-align: right; direction: rtl;">
      <h4 style="margin: 0 0 12px; font-size: 15px; font-weight: 800; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
        <span>🎛️ הגדרות תצוגה וסינון</span>
      </h4>
      
      <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px;">

        <!-- toggle 2: תוכן למבוגרים (ברירת מחדל: כבוי - אפור) -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
          <span style="font-size: 13.5px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; background: #dc2626; color: #ffffff; font-size: 10.5px; font-weight: 900; border-radius: 50%;">18</span>
            <span>תוכן למבוגרים</span>
          </span>
          <div class="ios-switch">
            <input type="checkbox" id="sidebar-age-checkbox" ${isVerified ? 'checked' : ''} onchange="toggleSidebarAgeVerification(this.checked)">
            <span class="ios-slider"></span>
          </div>
        </div>

      </div>

      <div id="sidebar-age-status-msg" style="font-size: 12px; font-weight: 800; color: ${isVerified ? '#16a34a' : '#dc2626'}; text-align: center; background: ${isVerified ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)'}; padding: 6px; border-radius: 8px;">
        ${isVerified ? '✓ תוכן למבוגרים (18+) פתוח לצפייה' : '🔒 תוכן למבוגרים (18+) חסום לצפייה'}
      </div>
    </div>
  `;
}

function updateAgeVerificationUIState(checked) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;

  if (checked) {
    root.classList.remove('age-not-verified');
    if (body) body.classList.remove('age-not-verified');
  } else {
    root.classList.add('age-not-verified');
    if (body) body.classList.add('age-not-verified');
  }

  const checkboxes = document.querySelectorAll('#sidebar-age-checkbox, #toggle-adult-content, #toggle-adult-content-top, .view-toggles input[onchange*="toggleSidebarAgeVerification"]');
  checkboxes.forEach(cb => { if (cb) cb.checked = !!checked; });

  const statusMsg = document.getElementById('sidebar-age-status-msg');
  if (statusMsg) {
    statusMsg.style.color = checked ? '#16a34a' : '#dc2626';
    statusMsg.style.background = checked ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)';
    statusMsg.textContent = checked ? '✓ תוכן למבוגרים (18+) פתוח לצפייה' : '🔒 תוכן למבוגרים (18+) חסום לצפייה';
  }

  const overlay = document.getElementById('age-gate-overlay');
  if (overlay && checked) {
    overlay.style.setProperty('display', 'none', 'important');
  }
}
window.updateAgeVerificationUIState = updateAgeVerificationUIState;

(function applyInitialAgeState() {
  try {
    if (typeof document !== 'undefined') {
      // ברירת מחדל: "תוכן למבוגרים" דלוק — התוכן מוצג ישר (אחרי שער הגיל בכניסה),
      // אלא אם המשתמש כיבה אותו ידנית בסשן הזה.
      if (sessionStorage.getItem('age_verified') !== 'false') {
        sessionStorage.setItem('age_verified', 'true');
      }
      if (sessionStorage.getItem('show_images') === 'false') {
        document.documentElement.classList.add('hide-site-images');
      } else {
        document.documentElement.classList.remove('hide-site-images');
      }
      if (sessionStorage.getItem('age_verified') !== 'true') {
        document.documentElement.classList.add('age-not-verified');
      } else {
        document.documentElement.classList.remove('age-not-verified');
      }
    }
  } catch (e) {}
})();

// פונקציות עזר: הודעת "טוסט" קצרה והעתקת אימייל ללוח (שוחזרו לאחר שנמחקו בקלקול)
function copyEmailToClipboard(emailStr, e, hint) {
  if (e) {
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
    if (typeof e.preventDefault === 'function') e.preventDefault();
  }
  if (!emailStr) return;

  let cleanEmail = emailStr.replace(/^mailto:/i, '').trim();
  if (!cleanEmail) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(cleanEmail).then(() => {
      showCopyToast(`האימייל הועתק בהצלחה! 📋 (${cleanEmail})${hint || ''}`);
    }).catch(() => {
      fallbackCopyText(cleanEmail, hint);
    });
  } else {
    fallbackCopyText(cleanEmail, hint);
  }
}

function fallbackCopyText(text, hint) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    showCopyToast(`האימייל הועתק בהצלחה! 📋 (${text})${hint || ''}`);
  } catch (err) {
    alert(`כתובת אימייל: ${text}`);
  }
  document.body.removeChild(textArea);
}

// לחיצה על כפתור האימייל: מעתיק ללוח (עם הודעה קופצת) וגם חושף את
// הכתובת כטקסט גלוי על הכפתור עצמו במקום המילה "אימייל".
function revealAndCopyEmail(emailStr, btn, e) {
  const clean = (emailStr || '').replace(/^mailto:/i, '').trim();
  // לחיצה שנייה (אחרי שהכתובת נחשפה) — פותחת את אפליקציית המייל
  if (btn && btn.getAttribute('data-revealed') === '1' && /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(clean)) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    window.location.href = 'mailto:' + encodeURIComponent(clean).replace(/%40/g, '@');
    return;
  }
  copyEmailToClipboard(emailStr, e, ' — לחצו שוב כדי לשלוח מייל'); // מעתיק + מציג הודעה (וגם עוצר את הבועה)
  if (btn && clean) {
    const span = document.createElement('span');
    span.textContent = clean;
    span.style.cssText = 'direction:ltr; unicode-bidi:embed; font-weight:700; white-space:normal; word-break:break-all;';
    btn.innerHTML = '';
    btn.appendChild(span);
    btn.title = 'לחצו שוב כדי לשלוח מייל';
    btn.setAttribute('data-revealed', '1');
  }
}
window.revealAndCopyEmail = revealAndCopyEmail;

function showCopyToast(msg) {
  let toast = document.getElementById('global-copy-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-copy-toast';
    toast.style.cssText = 'position:fixed; bottom:30px; left:50%; transform:translateX(-50%); background:#111; color:#fff; padding:12px 24px; border-radius:30px; font-size:14px; font-weight:bold; z-index:9999999; box-shadow:0 10px 30px rgba(0,0,0,0.3); transition:all 0.3s ease; direction:rtl; opacity:0; pointer-events:none;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';

  clearTimeout(window.__copyToastTimer);
  window.__copyToastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
  }, 2200);
}
window.copyEmailToClipboard = copyEmailToClipboard;

function toggleSidebarAgeVerification(checked) {
  if (checked) {
    sessionStorage.setItem('age_verified', 'true');
    showCopyToast('✓ אושר בהצלחה! תוכן 18+ פתוח לצפייה 🔞');
  } else {
    sessionStorage.setItem('age_verified', 'false');
    showCopyToast('🔒 סינון תוכן 18+ הופעל - תמונות האתר מטושטשות');
  }
  
  updateAgeVerificationUIState(checked);

  if (typeof photoApplyFilters === 'function') photoApplyFilters();
  if (typeof storyApplyFilters === 'function') storyApplyFilters();
}

let eventRegistrations = [];

let UPCOMING_EVENT = (function() {
  try {
    const saved = localStorage.getItem('upcoming_event_data');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return {
    title: 'מפגש קהילה מרכזי',
    date: '15.09.2026',
    time: '20:00',
    location: 'תל אביב / זום אונליין',
    image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80',
    description: 'מפגש חברים וקהילה מרתק! הצטרפו אלינו לערב בלתי נשכח.'
  };
})();

function saveUpcomingEvent(data) {
  UPCOMING_EVENT = data;
  try { localStorage.setItem('upcoming_event_data', JSON.stringify(data)); } catch (e) {}
  updateEventSidebarBoxRegistrants();
}

function updateEventSidebarBoxRegistrants() {
  if (typeof mainContent === 'undefined' || !mainContent) return;
  const boxes = mainContent.querySelectorAll('.art-event-box');
  boxes.forEach(box => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = buildEventsSidebarBox();
    if (tempDiv.firstElementChild) {
      box.outerHTML = tempDiv.firstElementChild.outerHTML;
    }
  });
}

function buildEventsSidebarBox() {
  const isEd = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);
  const ev = UPCOMING_EVENT;
  const regCount = eventRegistrations.length;

  return `
    <div class="art-sidebar-box art-event-box" style="margin-bottom: 20px; border: 1.5px solid #3b82f6; border-radius: 12px; padding: 13px 16px; background: #ffffff; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.08); text-align: right; direction: rtl;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; margin-bottom: 7px;">
        <h4 style="margin: 0; font-size: 14px; font-weight: 800; color: #1e3a8a; display: flex; align-items: center; gap: 6px;">
          <span>🎉 מפגש ואירוע קרוב</span>
        </h4>
        ${isEd ? `<button onclick="openEditEventModal()" style="background: #3b82f6; color: white; border: none; border-radius: 6px; padding: 2px 8px; font-size: 11px; font-weight: bold; cursor: pointer;">✏️ ערוך אירוע</button>` : ''}
      </div>

      <h5 style="margin: 0 0 5px; font-size: 13.5px; font-weight: 800; color: #111827;">${escHtml(ev.title)}</h5>

      <div style="display: flex; flex-direction: column; gap: 2px; font-size: 12px; color: #4b5563; margin-bottom: 6px; font-weight: 700;">
        <div style="display: flex; align-items: center; gap: 6px; color: #d97706;">
          <span>📅 מפגש בתאריך:</span>
          <span style="color: #111827; font-weight: 900;">${escHtml(ev.date)} בשעה ${escHtml(ev.time)}</span>
        </div>
        ${ev.location ? `
          <div style="display: flex; align-items: center; gap: 6px; color: #6b7280;">
            <span>📍 מיקום:</span>
            <span>${escHtml(ev.location)}</span>
          </div>
        ` : ''}
      </div>

      <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(37, 99, 235, 0.06); padding: 5px 10px; border-radius: 8px; margin-bottom: 6px; font-size: 12px; font-weight: 800; color: #1d4ed8;">
        <span>👥 נרשמו עד כה:</span>
        <span style="background: #2563eb; color: white; padding: 2px 8px; border-radius: 12px; font-weight: 900;">${regCount} משתתפים</span>
      </div>

      <button onclick="openEventRegisterModal()" style="width: 100%; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; border: none; border-radius: 8px; padding: 8px; font-size: 13px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); transition: transform 0.2s, background 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;">
        <span>✍️ להרשמה לאירוע</span>
      </button>

      ${isEd ? `
        <button onclick="openEventRegistrantsAdminModal()" style="width: 100%; margin-top: 8px; background: #059669; color: white; border: none; border-radius: 8px; padding: 8px; font-size: 12.5px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.2);">
          <span>📋 ניהול נרשמים לאירוע (${regCount})</span>
        </button>
      ` : ''}
    </div>
  `;
}

function openEventRegisterModal() {
  const user = auth.currentUser;
  if (!user) {
    alert("יש להתחבר לחשבון באתר כדי להירשם לאירוע.");
    const authModal = document.getElementById('auth-modal');
    if (authModal) authModal.style.display = 'flex';
    return;
  }

  let modal = document.getElementById('event-register-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'event-register-modal';
    modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:9999999; align-items:center; justify-content:center; direction:rtl; padding:20px; font-family:system-ui, sans-serif;';
    modal.innerHTML = `
      <div style="background:#ffffff; border-radius:20px; padding:28px; width:95%; max-width:440px; box-shadow:0 20px 50px rgba(0,0,0,0.2); border:1px solid #eee; display:flex; flex-direction:column; gap:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:12px;">
          <h3 style="margin:0; font-size:18px; font-weight:900; color:#1e3a8a;">✍️ הרשמה למפגש / אירוע</h3>
          <button onclick="document.getElementById('event-register-modal').style.display='none'" style="background:none; border:none; font-size:20px; cursor:pointer; color:#888;">✕</button>
        </div>

        <div id="event-modal-details-card" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px; font-size:13px; color:#334155; line-height:1.5;">
          <strong>אירוע:</strong> <span id="event-reg-title-text">${escHtml(UPCOMING_EVENT.title)}</span><br>
          <strong>תאריך ושעה:</strong> <span id="event-reg-date-text">${escHtml(UPCOMING_EVENT.date)} בשעה ${escHtml(UPCOMING_EVENT.time)}</span>
        </div>

        <label style="font-size:13px; font-weight:700; color:#374151;">שם מלא <span style="color:red">*</span></label>
        <input type="text" id="event-reg-name" placeholder="הכנס את שמך" style="padding:10px 14px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px; outline:none;">

        <label style="font-size:13px; font-weight:700; color:#374151;">מספר טלפון / וואטסאפ <span style="color:red">*</span></label>
        <input type="tel" id="event-reg-phone" placeholder="050-0000000" style="padding:10px 14px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px; outline:none;">

        <label style="font-size:13px; font-weight:700; color:#374151;">כתובת אימייל</label>
        <input type="email" id="event-reg-email" placeholder="example@mail.com" style="padding:10px 14px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px; outline:none;">

        <div style="display:flex; gap:10px; margin-top:10px;">
          <button onclick="document.getElementById('event-register-modal').style.display='none'" style="flex:1; padding:11px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; cursor:pointer; font-weight:700; font-size:14px;">ביטול</button>
          <button onclick="submitEventRegistration()" style="flex:1.5; padding:11px; border:none; border-radius:8px; background:#2563eb; color:#fff; cursor:pointer; font-weight:800; font-size:14px;">אישור הרשמה ✓</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  document.getElementById('event-reg-title-text').textContent = UPCOMING_EVENT.title;
  document.getElementById('event-reg-date-text').textContent = `${UPCOMING_EVENT.date} בשעה ${UPCOMING_EVENT.time}`;
  if (user) {
    if (user.displayName) document.getElementById('event-reg-name').value = user.displayName;
    if (user.email) document.getElementById('event-reg-email').value = user.email;
  }
  modal.style.display = 'flex';
}

async function submitEventRegistration() {
  const user = auth.currentUser;
  if (!user) {
    alert("יש להתחבר לחשבון באתר כדי להירשם לאירוע.");
    const authModal = document.getElementById('auth-modal');
    if (authModal) authModal.style.display = 'flex';
    return;
  }

  const name = document.getElementById('event-reg-name').value.trim();
  const phone = document.getElementById('event-reg-phone').value.trim();
  const email = document.getElementById('event-reg-email').value.trim() || user.email || '';

  if (!name || !phone) {
    alert('נא למלא שם ומספר טלפון להרשמה');
    return;
  }

  const regData = {
    eventId: UPCOMING_EVENT.title || 'event',
    eventTitle: UPCOMING_EVENT.title,
    eventDate: UPCOMING_EVENT.date,
    userId: user.uid,
    userName: name,
    userPhone: phone,
    userEmail: email,
    createdAt: new Date().toLocaleDateString('he-IL') + ' ' + new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now()
  };

  try {
    const newRef = push(ref(db, 'website/event_registrations'));
    await set(newRef, regData);
  } catch (err) {
    console.error("Error saving event registration:", err);
  }

  document.getElementById('event-register-modal').style.display = 'none';
  showCopyToast(`🎉 הרשמתך למפגש נקלטה בהצלחה! נשמח לראותך.`);
  document.getElementById('event-reg-name').value = '';
  document.getElementById('event-reg-phone').value = '';
}
window.openEventRegisterModal = openEventRegisterModal;
window.submitEventRegistration = submitEventRegistration;

function openEventRegistrantsAdminModal() {
  if (!isAdmin() && !isEditMode) return;

  let modal = document.getElementById('event-admin-registrants-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'event-admin-registrants-modal';
    modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:9999999; align-items:center; justify-content:center; direction:rtl; padding:20px; font-family:system-ui, sans-serif;';
    document.body.appendChild(modal);
  }

  const regList = eventRegistrations;
  const rowsHTML = regList.length ? regList.map((r, i) => `
    <tr style="border-bottom: 1px solid #f1f5f9; background: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 10px 12px; font-weight: 800; color: #64748b;">${i + 1}</td>
      <td style="padding: 10px 12px; font-weight: 800; color: #0f172a;">${escHtml(r.userName || 'ללא שם')}</td>
      <td style="padding: 10px 12px; color: #2563eb; font-weight: 700; direction: ltr; text-align: right;"><a href="tel:${escHtml(r.userPhone)}" style="color:#2563eb; text-decoration:none;">${escHtml(r.userPhone || '--')}</a></td>
      <td style="padding: 10px 12px; color: #475569; direction: ltr; text-align: right;">${escHtml(r.userEmail || '--')}</td>
      <td style="padding: 10px 12px; color: #64748b; font-size: 12px;">${escHtml(r.createdAt || '')}</td>
      <td style="padding: 10px 12px; text-align: center;">
        <button onclick="deleteEventRegistration('${artEsc(r.id)}')" style="background: #ef4444; color: white; border: none; border-radius: 6px; padding: 4px 8px; font-size: 12px; cursor: pointer; font-weight: bold;" title="מחק נרשם">✕</button>
      </td>
    </tr>
  `).join('') : `
    <tr>
      <td colspan="6" style="text-align: center; padding: 30px; color: #94a3b8; font-weight: 700;">עדיין לא נרשמו משתמשים לאירוע זה.</td>
    </tr>
  `;

  modal.innerHTML = `
    <div style="background:#ffffff; border-radius:20px; padding:24px; width:95%; max-width:720px; max-height:85vh; display:flex; flex-direction:column; box-shadow:0 25px 50px rgba(0,0,0,0.25); border:1px solid #cbd5e1; direction:rtl;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #059669; padding-bottom:12px; margin-bottom:16px;">
        <div>
          <h3 style="margin:0; font-size:19px; font-weight:900; color:#065f46; display:flex; align-items:center; gap:8px;">
            <span>📋 רשימת נרשמים לאירוע</span>
          </h3>
          <div style="font-size:13px; color:#475569; margin-top:2px;">
            סה"כ נרשמו: <strong style="color:#059669; font-size:14px;">${regList.length}</strong> משתתפים
          </div>
        </div>
        <button onclick="document.getElementById('event-admin-registrants-modal').style.display='none'" style="background:#f1f5f9; border:none; width:32px; height:32px; border-radius:50%; font-size:18px; cursor:pointer; color:#64748b; font-weight:bold;">✕</button>
      </div>

      <div style="flex:1; overflow-y:auto; border:1px solid #e2e8f0; border-radius:12px; margin-bottom:16px;">
        <table style="width:100%; border-collapse:collapse; text-align:right; font-size:13.5px;">
          <thead>
            <tr style="background:#f1f5f9; color:#334155; font-weight:800; border-bottom:2px solid #e2e8f0;">
              <th style="padding:10px 12px;">#</th>
              <th style="padding:10px 12px;">שם מלא</th>
              <th style="padding:10px 12px;">טלפון / וואטסאפ</th>
              <th style="padding:10px 12px;">אימייל</th>
              <th style="padding:10px 12px;">תאריך הרשמה</th>
              <th style="padding:10px 12px; text-align:center;">מחיקה</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
        <button onclick="document.getElementById('event-admin-registrants-modal').style.display='none'" style="padding:9px 20px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; cursor:pointer; font-weight:700; font-size:13.5px;">סגור</button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';
}

async function deleteEventRegistration(regId) {
  if (!confirm('האם אתה בטוח שברצונך למחוק נרשם זה?')) return;
  try {
    await set(ref(db, `website/event_registrations/${regId}`), null);
    showCopyToast('✓ הנרשם נמחק בהצלחה');
    openEventRegistrantsAdminModal();
  } catch (e) {
    console.error(e);
  }
}
window.openEventRegistrantsAdminModal = openEventRegistrantsAdminModal;
window.deleteEventRegistration = deleteEventRegistration;
window.openEventRegisterModal = openEventRegisterModal;
window.submitEventRegistration = submitEventRegistration;

function openEditEventModal() {
  let modal = document.getElementById('event-edit-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'event-edit-modal';
    modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:9999999; align-items:center; justify-content:center; direction:rtl; padding:20px; font-family:system-ui, sans-serif;';
    modal.innerHTML = `
      <div style="background:#ffffff; border-radius:20px; padding:28px; width:95%; max-width:440px; box-shadow:0 20px 50px rgba(0,0,0,0.2); border:1px solid #eee; display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:12px;">
          <h3 style="margin:0; font-size:18px; font-weight:900; color:#1e3a8a;">✏️ עריכת פרטי מפגש / אירוע</h3>
          <button onclick="document.getElementById('event-edit-modal').style.display='none'" style="background:none; border:none; font-size:20px; cursor:pointer; color:#888;">✕</button>
        </div>

        <label style="font-size:13px; font-weight:700;">שם האירוע / המפגש</label>
        <input type="text" id="event-edit-title" style="padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px;">

        <label style="font-size:13px; font-weight:700;">תאריך המפגש (למשל 15.09.2026)</label>
        <input type="text" id="event-edit-date" style="padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px;">

        <label style="font-size:13px; font-weight:700;">שעה (למשל 20:00)</label>
        <input type="text" id="event-edit-time" style="padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px;">

        <label style="font-size:13px; font-weight:700;">מיקום המפגש</label>
        <input type="text" id="event-edit-location" style="padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px;">

        <label style="font-size:13px; font-weight:700;">קישור לתמונת שער (URL)</label>
        <input type="text" id="event-edit-image" style="padding:9px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px;">

        <div style="display:flex; gap:10px; margin-top:8px;">
          <button onclick="document.getElementById('event-edit-modal').style.display='none'" style="flex:1; padding:10px; border:1px solid #cbd5e1; border-radius:8px; background:#fff; cursor:pointer; font-weight:700; font-size:14px;">ביטול</button>
          <button onclick="saveEditedEvent()" style="flex:1.5; padding:10px; border:none; border-radius:8px; background:#3b82f6; color:#fff; cursor:pointer; font-weight:800; font-size:14px;">שמור שינויים ✓</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  document.getElementById('event-edit-title').value = UPCOMING_EVENT.title || '';
  document.getElementById('event-edit-date').value = UPCOMING_EVENT.date || '';
  document.getElementById('event-edit-time').value = UPCOMING_EVENT.time || '';
  document.getElementById('event-edit-location').value = UPCOMING_EVENT.location || '';
  document.getElementById('event-edit-image').value = UPCOMING_EVENT.image || '';
  modal.style.display = 'flex';
}

function saveEditedEvent() {
  const data = {
    title: document.getElementById('event-edit-title').value.trim() || 'מפגש קהילה',
    date: document.getElementById('event-edit-date').value.trim() || '15.09.2026',
    time: document.getElementById('event-edit-time').value.trim() || '20:00',
    location: document.getElementById('event-edit-location').value.trim() || '',
    image: document.getElementById('event-edit-image').value.trim() || 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=80'
  };
  saveUpcomingEvent(data);
  document.getElementById('event-edit-modal').style.display = 'none';
  showCopyToast('✓ פרטי המפגש עודכנו בהצלחה!');
}
window.openEditEventModal = openEditEventModal;
window.saveEditedEvent = saveEditedEvent;
window.buildEventsSidebarBox = buildEventsSidebarBox;

window.toggleSidebarAgeVerification = toggleSidebarAgeVerification;
window.buildAgeFilterSidebarBox = buildAgeFilterSidebarBox;

function buildPromotedSitesBox() {
  const sitesHTML = PROMOTED_SITES.map((site, index) => {
    let iconHTML = '';
    if (site.icon && (site.icon.startsWith('data:image') || site.icon.startsWith('http'))) {
      iconHTML = `<img src="${escHtml(site.icon)}" alt="" style="width:24px;height:24px;border-radius:4px;object-fit:cover;flex-shrink:0;">`;
    } else {
      iconHTML = `<span style="font-size:18px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${site.icon || '🌐'}</span>`;
    }

    const deleteBtn = isEditMode ? `
      <button onclick="event.preventDefault(); event.stopPropagation(); deletePromotedSite(${index})" style="background:none;border:none;color:#ff4444;cursor:pointer;font-size:14px;padding:4px;margin-right:auto;display:flex;align-items:center;justify-content:center;" title="מחק קישור">✕</button>
    ` : '';

    return `
      <li style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;background:#f9f9f9;border:1px solid #f0f0f0;transition:all 0.2s ease-in-out;">
        <a href="${escHtml(safeUrl(site.url))}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:8px;color:#000;text-decoration:none;font-weight:bold;font-size:14px;flex:1;min-width:0;">
          ${iconHTML}
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(site.name)}</span>
        </a>
        ${deleteBtn}
      </li>
    `;
  }).join('');

  const addBtnHTML = isEditMode ? `
    <button onclick="openPromotedSiteModal()" style="width:100%;background:#16a34a;color:#fff;padding:8px;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px;margin-top:10px;transition:background 0.2s;display:flex;align-items:center;justify-content:center;gap:6px;">
      <span>+ הוסף קישור</span>
    </button>
  ` : '';

  return `
    <div class="art-sidebar-box art-promoted-sites" style="margin-bottom:20px; border:1px solid #e2e8f0; border-radius:12px; padding:16px; background:#fff;">
      <h4 style="margin:0 0 12px;font-size:16px;font-weight:800;color:#000;border-bottom:2px solid #eaeaea;padding-bottom:6px;">אתרים מומלצים</h4>
      <ul style="list-style:none;padding:0 0 0 4px;margin:0;display:flex;flex-direction:column;gap:8px;max-height:240px;overflow-y:auto;scrollbar-width:thin;direction:rtl;">
        ${sitesHTML || '<li style="font-size:13px;color:#888;text-align:center;padding:10px;">אין קישורים ממומנים</li>'}
      </ul>
      ${addBtnHTML}
    </div>
  `;
}

// escHtml — לטקסט ולערכי מאפיינים ב-HTML (מונע הזרקת קוד/XSS)
function escHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
window.escHtml = escHtml;

// safeUrl — חוסם קישורי javascript:/vbscript: וכו' (מאפשר http/https/mailto/tel ונתיבים יחסיים)
function safeUrl(url) {
  const s = String(url == null ? '' : url).trim();
  if (!s) return '';
  if (/^(https?:|mailto:|tel:|blob:|data:image\/)/i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s.replace(/[\s\u0000-\u001f]/g, ''))) return '#';
  return s;
}
window.safeUrl = safeUrl;

// jsStrEsc — למחרוזת JS בלבד (למשל setAttribute, שם אין פענוח של ישויות HTML)
function jsStrEsc(str) {
  return String(str == null ? '' : str)
    .replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"')
    .replace(/</g, '\\x3c').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
}

// artEsc — למחרוזת JS בתוך מאפיין HTML, למשל onclick="fn('${artEsc(id)}')"
function artEsc(str) {
  return escHtml(String(str == null ? '' : str)
    .replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    .replace(/\r/g, '\\r').replace(/\n/g, '\\n'));
}

function buildArticlesPage(articles) {
  const featured = articles.filter(a => a.pinned).slice(0, 3);
  const popular = articles.slice(0, 5);

  const featuredHTML = featured.map(a => `
    <div class="art-featured-card" onclick="artOpenDetail('${artEsc(a.id)}')">
      <img src="${escHtml(a.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80')}" alt="">
      <div class="art-featured-overlay"></div>
      <div class="art-featured-info">
        <span class="art-category-badge" style="background:${escHtml(a.categoryColor || '#e65100')}">${escHtml(a.category)}</span>
        <h3>${escHtml(a.title)}</h3>
        <div class="art-featured-meta">${escHtml(a.author)} · ${escHtml(a.timestamp)}</div>
      </div>
    </div>
  `).join('');

  const listHTML = articles.map((a) => `
    <div class="art-row" onclick="artOpenDetail('${artEsc(a.id)}')">
      <div class="art-row-text">
        <h3>${escHtml(a.title)}</h3>
        <p>${escHtml(a.summary)}</p>
        <div class="art-row-meta">
          <span>${escHtml(a.author)}</span>
          <span class="art-row-sep">|</span>
          <span>${escHtml(a.timestamp)}</span>
        </div>
      </div>
      <div class="art-row-img-wrap" style="--bg-img: url('${artEsc(a.image || '')}');">
        ${a.image ? `<img src="${escHtml(a.image)}" alt="">` : '<div class="art-row-img-placeholder"></div>'}
        ${a.image ? `<button class="art-zoom-btn" onclick="event.stopPropagation();artZoomImage('${artEsc(a.image)}')" title="מסך מלא">⛶</button>` : ''}
        ${isEditMode ? `<button class="art-pin-btn" onclick="event.stopPropagation(); togglePinArticle('${artEsc(a.id)}')" title="${a.pinned ? 'בטל נעץ' : 'נעץ בגריד'}" style="${a.pinned ? 'color:#ffd700;display:flex;' : ''}">${a.pinned ? '★' : '☆'}</button>` : ''}
        <button class="art-delete-btn" onclick="event.stopPropagation();artDelete('${artEsc(a.id)}',this)">✕</button>
      </div>
    </div>
  `).join('');

  const popularHTML = popular.map((a, i) => `
    <div class="art-popular-item" onclick="artOpenDetail('${artEsc(a.id)}')">
      <span class="art-popular-num">${String(i+1).padStart(2,'0')}</span>
      <div style="flex:1;font-size:13px;font-weight:600;line-height:1.4;color:#222">${escHtml(a.title)}</div>
    </div>
  `).join('');

  const json = encodeURIComponent(JSON.stringify(articles));
  return `<div class="articles-page" data-articles-json="${json}">
    <div class="art-inner">
      <div class="art-featured-grid">${featuredHTML}</div>
      <div class="art-layout">
        <div class="art-main">
          <div class="art-search-wrap">
            <input type="text" class="art-search" placeholder="🔍 חיפוש כתבות..." oninput="artSearch(this.value)">
          </div>
          <div class="art-section-title">כל הכתבות</div>
          <div class="art-rows">${listHTML}</div>
          <div class="art-no-results" style="display:none">לא נמצאו כתבות התואמות לחיפוש</div>
          ${(isAdmin() || isEditMode) ? `<button class="art-add-btn" onclick="openArtModal()">+ הוסף כתבה חדשה</button>` : ''}
        </div>
        <div class="art-sidebar">
          <div class="art-sidebar-box" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #fff; border: 1px solid #334155;">
            <div class="art-sidebar-title" style="color: #38bdf8; border-bottom: 2px solid #0284c7;">🧮 מחשבונים פיננסיים</div>
            <div style="display:flex; flex-direction:column; gap:10px; margin-top:12px;">
              <button onclick="openCalculatorPage('page-ci')" style="padding:11px 14px; background:#0284c7; color:#fff; border:none; border-radius:10px; font-weight:800; font-size:13px; cursor:pointer; text-align:right; display:flex; justify-content:space-between; align-items:center; transition:transform 0.2s ease;">
                <span>📈 מחשבון ריבית דריבית</span>
                <span style="font-size:16px;">←</span>
              </button>
              <button onclick="openCalculatorPage('page-em')" style="padding:11px 14px; background:#84cc16; color:#18181b; border:none; border-radius:10px; font-weight:900; font-size:13px; cursor:pointer; text-align:right; display:flex; justify-content:space-between; align-items:center; transition:transform 0.2s ease;">
                <span>📊 מחשבון Everything Money</span>
                <span style="font-size:16px;">←</span>
              </button>
            </div>
          </div>
          ${buildPromotedSitesBox()}
          <div class="art-sidebar-box">
            <div class="art-sidebar-title">הכי נקראות השבוע</div>
            ${popularHTML}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function artOpenDetail(id) {
  const container = mainContent.querySelector('.articles-page');
  if (!container) return;
  let arts = [];
  try { arts = JSON.parse(decodeURIComponent(container.dataset.articlesJson)); } catch(e){ return; }
  const a = arts.find(x => x.id === id);
  if (!a) return;

  const bodyHTML = (a.body || a.summary || '').split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('');

  // כתבות מומלצות - עד 3 כתבות אחרות
  const recommended = arts.filter(x => x.id !== id).slice(0, 3);
  const recHTML = recommended.map(r => `
    <div class="art-rec-card" onclick="artOpenDetail('${artEsc(r.id)}')">
      <div class="art-rec-img">
        ${r.image ? `<img src="${escHtml(r.image)}" alt="">` : '<div class="art-card-img-placeholder"></div>'}
        <span class="art-rec-badge art-category-badge" style="background:${escHtml(r.categoryColor || '#e65100')}">${escHtml(r.category)}</span>
      </div>
      <div class="art-rec-text">
        <h4>${escHtml(r.title)}</h4>
        <div class="art-rec-meta">${escHtml(r.author)} · ${escHtml(r.timestamp)}</div>
      </div>
    </div>
  `).join('');

  const json = encodeURIComponent(JSON.stringify(arts));
  mainContent.innerHTML = `
    <div class="art-detail articles-page" data-article-id="${id}" data-articles-json="${json}">
      <div class="art-detail-inner">
        <button class="art-back-btn" onclick="artGoBack()">← חזרה לכתבות</button>
        ${a.image ? `<img class="art-detail-hero" src="${escHtml(a.image)}" alt="">` : ''}
        <div class="art-detail-body">
          <div class="art-meta" style="margin-bottom:12px">
            <span class="art-category-badge" style="background:${escHtml(a.categoryColor || '#e65100')}">${escHtml(a.category)}</span>
            <span>${escHtml(a.author)}</span>
            <span>·</span>
            <span>${escHtml(a.timestamp)}</span>
          </div>
          <h1 class="art-detail-title">${escHtml(a.title)}</h1>
          <div class="art-detail-content">${bodyHTML}</div>
          ${a.link ? `<a href="${escHtml(safeUrl(a.link))}" target="_blank" class="art-detail-link">קרא באתר המקור ↗</a>` : ''}
        </div>
        ${recommended.length ? `
        <div class="art-rec-section">
          <div class="art-section-title">כתבות מומלצות</div>
          <div class="art-rec-grid">${recHTML}</div>
        </div>` : ''}
      </div>
    </div>
  `;
  mainContent.scrollTop = 0;
  window.scrollTo(0, 0);
}

function artGoBack() {
  window.__detailOpen = false;
  renderPage();
}

function artSearch(query) {
  if (typeof logSearchQuery === 'function' && query) {
    logSearchQuery(query, 'כתבות');
  }
  const q = (query || '').trim().toLowerCase();
  const rows = mainContent.querySelectorAll('.art-row');
  let visible = 0;
  rows.forEach(row => {
    const txt = row.textContent.toLowerCase();
    const match = !q || txt.includes(q);
    row.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  const noRes = mainContent.querySelector('.art-no-results');
  if (noRes) noRes.style.display = visible === 0 ? 'block' : 'none';
}

// חשיפת הפונקציות ל-window כדי ש-onclick יעבוד (הקובץ הוא module)
window.artOpenDetail = artOpenDetail;
window.artGoBack = artGoBack;
window.artDelete = artDelete;
window.openArtModal = openArtModal;
window.artSearch = artSearch;

function artGetArticles() {
  const container = mainContent.querySelector('.articles-page');
  if (!container) return [];
  try { return JSON.parse(decodeURIComponent(container.dataset.articlesJson)); } catch(e){ return []; }
}

function artDelete(id, btn) {
  if (!isEditMode) return;
  const arts = artGetArticles().filter(a => a.id !== id);
  mainContent.innerHTML = buildArticlesPage(arts);
  saveCurrentPageContent();
}

function openArtModal() {
  if (!isEditMode) return;
  document.getElementById('art-title').value = '';
  document.getElementById('art-summary').value = '';
  document.getElementById('art-body').value = '';
  document.getElementById('art-author').value = '';
  document.getElementById('art-category').value = '';
  document.getElementById('art-link').value = '';
  const preview = document.getElementById('art-img-preview');
  preview.style.display = 'none'; preview.src = '';
  artImgData = '';
  document.getElementById('art-img-pick').textContent = 'לחץ לבחירת תמונה מהמחשב';
  document.getElementById('article-modal').style.display = 'flex';
}

let artImgData = '';

document.getElementById('art-img-pick').addEventListener('click', () => {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    artCompressImage(f).then(data => {
      artImgData = data;
      const p = document.getElementById('art-img-preview');
      p.src = artImgData; p.style.display = 'block';
      document.getElementById('art-img-pick').textContent = '✓ תמונה נבחרה';
    });
  };
  inp.click();
});

document.getElementById('art-cancel').addEventListener('click', () => {
  document.getElementById('article-modal').style.display = 'none';
});

document.getElementById('art-save').addEventListener('click', () => {
  const title = document.getElementById('art-title').value.trim();
  if (!title) { alert('חובה כותרת'); return; }
  const arts = artGetArticles();
  arts.unshift({
    id: 'a' + Date.now(),
    title,
    summary: document.getElementById('art-summary').value.trim(),
    body: document.getElementById('art-body').value.trim(),
    author: document.getElementById('art-author').value.trim() || 'עורך',
    category: document.getElementById('art-category').value.trim() || 'כללי',
    categoryColor: '#e65100',
    timestamp: 'עכשיו',
    image: artImgData,
    link: document.getElementById('art-link').value.trim()
  });
  mainContent.innerHTML = buildArticlesPage(arts);
  saveCurrentPageContent();
  document.getElementById('article-modal').style.display = 'none';
});

const btnAddArticlesPage = document.getElementById('btn-add-articles-page');
if (btnAddArticlesPage) {
  btnAddArticlesPage.addEventListener('click', () => {
    const title = prompt('שם העמוד הראשי של הכתבות:') || 'כתבות';
    const newId = 'page-' + Date.now();
    pages.unshift({ id: newId, title: title.trim(), content: buildArticlesPage(ARTICLES_SAMPLES) });
    topNavPages.unshift(newId);
    activePageId = newId;
    saveToStorage();
    renderSideMenu();
    renderTopNav();
    renderPage();
  });
}

// ===== עמוד חנות =====

const SHOP_SAMPLES = [
  { id: 'p1', name: 'AirPods Max 2 - Midnight', label: 'חריטה חינם', price: '₪2,199', image: 'https://images.unsplash.com/photo-1625245488600-f03fef636a3c?w=600&q=80', link: '' },
  { id: 'p2', name: 'AirPods Pro 3', label: 'חריטה חינם', price: '₪999', image: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600&q=80', link: '' },
  { id: 'p3', name: 'AirPods 4 עם ביטול רעשים אקטיבי', label: 'חריטה חינם', price: '₪749', image: 'https://images.unsplash.com/photo-1603351154351-5e2d0600bb77?w=600&q=80', link: '' },
  { id: 'p4', name: 'iPhone 16 Pro', label: 'עד 24 תשלומים', price: '₪4,799', image: 'https://images.unsplash.com/photo-1592286927505-1def25115558?w=600&q=80', link: '' },
  { id: 'p5', name: 'MacBook Air M3', label: 'הנחת סטודנט', price: '₪4,499', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80', link: '' },
  { id: 'p6', name: 'Apple Watch Series 10', label: 'רצועה חינם', price: '₪1,799', image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&q=80', link: '' }
];

function buildShopPage(products) {
  const cartSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';
  const cardsHTML = products.map(p => `
    <div class="shop-card" ${p.link ? `onclick="window.open('${artEsc(p.link)}','_blank')"` : ''} style="${p.link ? 'cursor:pointer' : ''}">
      <button class="shop-delete-btn" onclick="event.stopPropagation();shopDelete('${artEsc(p.id)}')">✕</button>
      <div class="shop-card-img">
        ${p.image ? `<img src="${escHtml(p.image)}" alt="">` : '<div class="shop-img-placeholder"></div>'}
        <button class="shop-cart-btn" title="הוסף לסל" onclick="event.stopPropagation();shopAddToCart('${artEsc(p.id)}')">${cartSvg}<span class="shop-cart-plus">+</span></button>
      </div>
      <div class="shop-card-info">
        ${p.label ? `<div class="shop-label">${escHtml(p.label)}</div>` : ''}
        <h3 class="shop-name">${escHtml(p.name)}</h3>
        <div class="shop-price">${escHtml(p.price || '')}</div>
      </div>
    </div>
  `).join('');

  const bestSellers = products.slice(0, 5);
  const bestHTML = bestSellers.map((p, i) => `
    <div class="shop-best-item" ${p.link ? `onclick="window.open('${artEsc(p.link)}','_blank')"` : ''} style="${p.link ? 'cursor:pointer' : ''}">
      <span class="shop-best-num">${String(i+1).padStart(2,'0')}</span>
      ${p.image ? `<img class="shop-best-img" src="${escHtml(p.image)}" alt="">` : ''}
      <div class="shop-best-text">
        <div class="shop-best-name">${escHtml(p.name)}</div>
        <div class="shop-best-price">${escHtml(p.price || '')}</div>
      </div>
    </div>
  `).join('');

  const json = encodeURIComponent(JSON.stringify(products));
  return `<div class="shop-page" data-products-json="${json}">
    <div class="shop-inner">
      <div class="shop-header">
        <h1 class="shop-title">החנות</h1>
        <p class="shop-subtitle">כל המוצרים שאתם אוהבים, במקום אחד.</p>
      </div>
      <div class="shop-search-wrap">
        <input type="text" class="shop-search" placeholder="🔍 חיפוש מוצרים..." oninput="shopSearch(this.value)">
      </div>
      <div class="shop-layout">
        <div class="shop-main">
          <div class="shop-grid">${cardsHTML}</div>
          <div class="shop-no-results" style="display:none">לא נמצאו מוצרים התואמים לחיפוש</div>
          <button class="shop-add-btn" onclick="openShopModal()">+ הוסף מוצר חדש</button>
        </div>
        <div class="shop-sidebar">
          <div class="shop-sidebar-box">
            <div class="shop-sidebar-title">הנמכרות השבוע</div>
            ${bestHTML}
          </div>
        </div>
      </div>
    </div>

    <button class="shop-cart-fab" onclick="shopToggleCart()" title="הסל שלי">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
      <span class="shop-cart-count" style="display:none">0</span>
    </button>
    <div class="shop-cart-panel" style="display:none">
      <div class="shop-cart-header"><span>הסל שלי</span><button onclick="shopToggleCart()" class="shop-cart-close">✕</button></div>
      <div class="shop-cart-items"></div>
      <div class="shop-cart-footer">
        <div class="shop-cart-total"></div>
        <button class="shop-cart-checkout" onclick="alert('תודה על הקנייה!')">מעבר לתשלום</button>
      </div>
    </div>
  </div>`;
}

let shopCart = [];

function shopAddToCart(id) {
  const prods = shopGetProducts();
  const p = prods.find(x => x.id === id);
  if (!p) return;
  const existing = shopCart.find(x => x.id === id);
  if (existing) existing.qty++;
  else shopCart.push({ id: p.id, name: p.name, price: p.price, image: p.image, qty: 1 });
  shopRenderCart();
  // אנימציית אישור קצרה
  const fab = mainContent.querySelector('.shop-cart-fab');
  if (fab) { fab.classList.add('shop-cart-bump'); setTimeout(() => fab.classList.remove('shop-cart-bump'), 300); }
}

function shopRemoveFromCart(id) {
  shopCart = shopCart.filter(x => x.id !== id);
  shopRenderCart();
}

function shopParsePrice(str) {
  const n = parseFloat(String(str || '').replace(/[^\d.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function shopRenderCart() {
  const count = shopCart.reduce((s, x) => s + x.qty, 0);
  const countEl = mainContent.querySelector('.shop-cart-count');
  if (countEl) { countEl.textContent = count; countEl.style.display = count ? 'flex' : 'none'; }
  const itemsEl = mainContent.querySelector('.shop-cart-items');
  if (itemsEl) {
    if (!shopCart.length) {
      itemsEl.innerHTML = '<div class="shop-cart-empty">הסל ריק</div>';
    } else {
      itemsEl.innerHTML = shopCart.map(x => `
        <div class="shop-cart-row">
          ${x.image ? `<img src="${escHtml(x.image)}" alt="">` : ''}
          <div class="shop-cart-row-text">
            <div class="shop-cart-row-name">${escHtml(x.name)}</div>
            <div class="shop-cart-row-price">${escHtml(x.price || '')} ${x.qty > 1 ? '× ' + x.qty : ''}</div>
          </div>
          <button class="shop-cart-remove" onclick="shopRemoveFromCart('${artEsc(x.id)}')">✕</button>
        </div>
      `).join('');
    }
  }
  const totalEl = mainContent.querySelector('.shop-cart-total');
  if (totalEl) {
    const total = shopCart.reduce((s, x) => s + shopParsePrice(x.price) * x.qty, 0);
    totalEl.textContent = total ? ('סה"כ: ₪' + total.toLocaleString()) : '';
  }
}

function shopToggleCart() {
  const panel = mainContent.querySelector('.shop-cart-panel');
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  shopRenderCart();
}

function shopSearch(query) {
  const q = (query || '').trim().toLowerCase();
  const cards = mainContent.querySelectorAll('.shop-card');
  let visible = 0;
  cards.forEach(card => {
    const txt = card.textContent.toLowerCase();
    const match = !q || txt.includes(q);
    card.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  const noRes = mainContent.querySelector('.shop-no-results');
  if (noRes) noRes.style.display = visible === 0 ? 'block' : 'none';
}

function shopGetProducts() {
  const container = mainContent.querySelector('.shop-page');
  if (!container) return [];
  try { return JSON.parse(decodeURIComponent(container.dataset.productsJson)); } catch(e){ return []; }
}

function shopDelete(id) {
  if (!isEditMode) return;
  const prods = shopGetProducts().filter(p => p.id !== id);
  mainContent.innerHTML = buildShopPage(prods);
  saveCurrentPageContent();
}

window.openCalculatorPage = function(pageId) {
  if (isEditMode) saveCurrentPageContent();
  window.__detailOpen = false;
  activePageId = pageId;
  saveToStorage();
  renderSideMenu();
  renderTopNav();
  renderPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.buildCompoundInterestPage = function() {
  return `
    <div class="calc-page-wrapper">
      <div class="calc-header-box">
        <div class="calc-header-title">
          <h1>📈 מחשבון ריבית דריבית מתקדם</h1>
          <p>חשב את צמיחת ההון, ההפקדות והריבית המצטברת לאורך זמן</p>
        </div>
        <div style="background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 12px; font-weight: 800; font-size: 14px;">
          💡 אפקט הריבית דריבית: הכסף שלך עובד בשבילך
        </div>
      </div>

      <div class="calc-card-grid">
        <div class="calc-box">
          <h3 style="margin-top:0; font-size: 18px; margin-bottom: 20px; color: #0284c7;">⚙️ פרטי ההשקעה</h3>
          
          <div class="calc-form-group">
            <label>סכום התחלתי (₪)</label>
            <div class="calc-input-wrap">
              <input type="number" id="ci-initial" value="10000" oninput="calculateCompoundInterest()">
            </div>
          </div>

          <div class="calc-form-group">
            <label>הפקדה חודשית (₪)</label>
            <div class="calc-input-wrap">
              <input type="number" id="ci-monthly" value="1000" oninput="calculateCompoundInterest()">
            </div>
          </div>

          <div class="calc-form-group">
            <label>תשואה שנתית צפויה (%)</label>
            <div class="calc-input-wrap">
              <input type="number" id="ci-rate" value="8" step="0.1" oninput="calculateCompoundInterest()">
            </div>
          </div>

          <div class="calc-form-group">
            <label>תקופת השקעה (בשנים)</label>
            <div class="calc-input-wrap">
              <input type="number" id="ci-years" value="20" min="1" max="50" oninput="calculateCompoundInterest()">
            </div>
          </div>

          <div class="calc-form-group">
            <label>תדירות חישוב הריבית</label>
            <div class="calc-input-wrap">
              <select id="ci-freq" onchange="calculateCompoundInterest()">
                <option value="12">חודשית (12 פעמים בשנה)</option>
                <option value="1">שנתית (פעם בשנה)</option>
              </select>
            </div>
          </div>
        </div>

        <div class="calc-box">
          <h3 style="margin-top:0; font-size: 18px; margin-bottom: 20px; color: #10b981;">📊 תוצאות הסימולציה</h3>
          
          <div class="calc-kpi-grid">
            <div class="calc-kpi-card highlight">
              <div class="calc-kpi-label">סך הכל חיסכון מצטבר</div>
              <div class="calc-kpi-val" id="ci-res-total">₪0</div>
            </div>
            <div class="calc-kpi-card">
              <div class="calc-kpi-label">סך הכל הפקדות</div>
              <div class="calc-kpi-val" id="ci-res-principal">₪0</div>
            </div>
            <div class="calc-kpi-card highlight">
              <div class="calc-kpi-label">רווח מריבית דריבית</div>
              <div class="calc-kpi-val" id="ci-res-interest">₪0</div>
            </div>
            <div class="calc-kpi-card">
              <div class="calc-kpi-label">מכפיל תשואה כולל</div>
              <div class="calc-kpi-val" id="ci-res-mult">0x</div>
            </div>
          </div>

          <!-- visual progress bar -->
          <div style="margin-top: 20px;">
            <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700; margin-bottom:6px; color:#64748b;">
              <span>הפקדות: <strong id="ci-bar-p-pct">50%</strong></span>
              <span>רווח מריבית: <strong id="ci-bar-i-pct" style="color:#10b981;">50%</strong></span>
            </div>
            <div style="height: 14px; background: #e2e8f0; border-radius: 50px; overflow: hidden; display: flex;">
              <div id="ci-bar-p" style="width: 50%; background: #3b82f6; transition: width 0.3s ease;"></div>
              <div id="ci-bar-i" style="width: 50%; background: #10b981; transition: width 0.3s ease;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

window.calculateCompoundInterest = function() {
  const initial = parseFloat(document.getElementById('ci-initial')?.value) || 0;
  const monthly = parseFloat(document.getElementById('ci-monthly')?.value) || 0;
  const ratePct = parseFloat(document.getElementById('ci-rate')?.value) || 0;
  const years = parseInt(document.getElementById('ci-years')?.value) || 0;
  const freq = parseInt(document.getElementById('ci-freq')?.value) || 12;

  const rate = ratePct / 100;
  const totalMonths = years * 12;
  const rPeriod = rate / freq;

  let totalFV = initial * Math.pow(1 + rPeriod, years * freq);
  let totalDeposits = initial;

  for (let m = 1; m <= totalMonths; m++) {
    totalDeposits += monthly;
    const monthsRemaining = totalMonths - m;
    const periodsRemaining = (monthsRemaining / 12) * freq;
    totalFV += monthly * Math.pow(1 + rPeriod, periodsRemaining);
  }

  const interestProfit = totalFV - totalDeposits;
  const multiplier = totalDeposits > 0 ? (totalFV / totalDeposits).toFixed(2) : '0';

  const fmt = (num) => '₪' + Math.round(num).toLocaleString();

  if (document.getElementById('ci-res-total')) document.getElementById('ci-res-total').textContent = fmt(totalFV);
  if (document.getElementById('ci-res-principal')) document.getElementById('ci-res-principal').textContent = fmt(totalDeposits);
  if (document.getElementById('ci-res-interest')) document.getElementById('ci-res-interest').textContent = fmt(interestProfit);
  if (document.getElementById('ci-res-mult')) document.getElementById('ci-res-mult').textContent = multiplier + 'x';

  const pPct = totalFV > 0 ? Math.round((totalDeposits / totalFV) * 100) : 50;
  const iPct = 100 - pPct;

  if (document.getElementById('ci-bar-p')) document.getElementById('ci-bar-p').style.width = pPct + '%';
  if (document.getElementById('ci-bar-i')) document.getElementById('ci-bar-i').style.width = iPct + '%';
  if (document.getElementById('ci-bar-p-pct')) document.getElementById('ci-bar-p-pct').textContent = pPct + '%';
  if (document.getElementById('ci-bar-i-pct')) document.getElementById('ci-bar-i-pct').textContent = iPct + '%';
};

/* Everything Money Stock Analyzer Builder & Calculation */
window.buildEverythingMoneyPage = function() {
  return `
    <div class="calc-page-wrapper">
      <div class="calc-header-box">
        <div class="calc-header-title">
          <h1>📊 מחשבון תשואה ושיווי משקל</h1>
          <p>ניתוח מניות מקצועי בשיטת 8 הפילירים (Everything Money)</p>
        </div>
        <div class="em-header-tag">
          🟢 מודל הערכת שווי מניות 8 הפילירים
        </div>
      </div>

      <!-- Stock Basics Input & Auto-Fetch -->
      <div class="calc-box em-stock-basics">
        <div style="display:flex; justify-space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
          <h3 class="em-section-title" style="margin:0;">📈 חיבור בזמן אמת ל-TradingView / שוק ההון</h3>
          <span id="em-status-badge" style="display:inline-block; font-size:12px; font-weight:800; padding:6px 14px; border-radius:50px; background:#dcfce7; color:#15803d;">
            ✅ מחובר בלייב ל-TradingView (AAPL)
          </span>
        </div>

        <!-- Quick Select Stock Pills -->
        <div style="margin-bottom:16px; display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
          <span style="font-size:12px; font-weight:700; color:#64748b;">מניות פופולריות בלחיצה:</span>
          <button onclick="document.getElementById('em-ticker').value='AAPL'; fetchStockData('AAPL');" class="em-pill-btn">AAPL (Apple)</button>
          <button onclick="document.getElementById('em-ticker').value='NVDA'; fetchStockData('NVDA');" class="em-pill-btn">NVDA (NVIDIA)</button>
          <button onclick="document.getElementById('em-ticker').value='TSLA'; fetchStockData('TSLA');" class="em-pill-btn">TSLA (Tesla)</button>
          <button onclick="document.getElementById('em-ticker').value='MSFT'; fetchStockData('MSFT');" class="em-pill-btn">MSFT (Microsoft)</button>
          <button onclick="document.getElementById('em-ticker').value='GOOGL'; fetchStockData('GOOGL');" class="em-pill-btn">GOOGL (Alphabet)</button>
          <button onclick="document.getElementById('em-ticker').value='AMZN'; fetchStockData('AMZN');" class="em-pill-btn">AMZN (Amazon)</button>
          <button onclick="document.getElementById('em-ticker').value='META'; fetchStockData('META');" class="em-pill-btn">META (Meta)</button>
          <button onclick="document.getElementById('em-ticker').value='AMD'; fetchStockData('AMD');" class="em-pill-btn">AMD (Advanced Micro)</button>
        </div>

        <div class="em-stock-grid">
          <div>
            <label>סימול המניה (למשל AAPL, NVDA, TSLA)</label>
            <div style="position:relative; display:flex; gap:8px;">
              <input type="text" id="em-ticker" value="AAPL" class="em-stock-input" placeholder="הקלד סימול מניה...">
              <button onclick="fetchStockData()" style="background:#ec4899; color:#fff; border:none; padding:0 16px; border-radius:12px; font-weight:800; cursor:pointer; font-size:13px; white-space:nowrap;">🔍 רענן</button>
            </div>
          </div>
          <div>
            <label>מחיר מניה נוכחי בשוק ($)</label>
            <input type="number" id="em-price" value="220.00" step="0.01" class="em-stock-input">
          </div>
          <div>
            <label>הכנסות שנתיות במיליארדי $ (TTM)</label>
            <input type="number" id="em-rev" value="385.6" step="0.1" class="em-stock-input">
          </div>
          <div>
            <label>מספר מניות במחזור (במיליארדים)</label>
            <input type="number" id="em-shares" value="15.3" step="0.1" class="em-stock-input">
          </div>
        </div>
      </div>

      <!-- Everything Money Table Matrix -->
      <div class="em-container">
        <div class="em-header-banner">
          <span>ניתוח מניות ושיווי משקל</span>
          <span>הנחות היסוד שלי</span>
        </div>
        <div class="em-table-scroll">
          <table class="em-table">
            <thead>
              <tr>
                <th class="em-th-label">מדד פיננסי</th>
                <th>שנה 1</th>
                <th>5 שנים</th>
                <th>10 שנים</th>
                <th class="em-th-low">שמרני</th>
                <th class="em-th-mid">בינוני</th>
                <th class="em-th-high">אופטימי</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="em-row-label">תשואה על ההון המושקע (ROIC)</td>
                <td class="em-hist-val">18.56%</td>
                <td class="em-hist-val">18.93%</td>
                <td class="em-hist-val">19.04%</td>
                <td>-</td><td>-</td><td>-</td>
              </tr>
              <tr>
                <td class="em-row-label">צמיחה בהכנסות (%)</td>
                <td class="em-hist-val">30.56%</td>
                <td class="em-hist-val">25.04%</td>
                <td class="em-hist-val">18.10%</td>
                <td><input type="number" id="em-g-low" value="5" class="em-input">%</td>
                <td><input type="number" id="em-g-mid" value="10" class="em-input">%</td>
                <td><input type="number" id="em-g-high" value="15" class="em-input">%</td>
              </tr>
              <tr>
                <td class="em-row-label">שולי רווח נקי (%)</td>
                <td class="em-hist-val">49.92%</td>
                <td class="em-hist-val">43.78%</td>
                <td class="em-hist-val">41.47%</td>
                <td><input type="number" id="em-pm-low" value="35" class="em-input">%</td>
                <td><input type="number" id="em-pm-mid" value="38" class="em-input">%</td>
                <td><input type="number" id="em-pm-high" value="41" class="em-input">%</td>
              </tr>
              <tr>
                <td class="em-row-label">שולי תזרים מזומנים חופשי (%)</td>
                <td class="em-hist-val">25.61%</td>
                <td class="em-hist-val">24.77%</td>
                <td class="em-hist-val">22.98%</td>
                <td><input type="number" id="em-fcf-low" value="20" class="em-input">%</td>
                <td><input type="number" id="em-fcf-mid" value="23" class="em-input">%</td>
                <td><input type="number" id="em-fcf-high" value="26" class="em-input">%</td>
              </tr>
              <tr>
                <td class="em-row-label">מכפיל רווח צפוי (P/E)</td>
                <td>-</td><td>-</td><td>-</td>
                <td><input type="number" id="em-pe-low" value="17" class="em-input"></td>
                <td><input type="number" id="em-pe-mid" value="20" class="em-input"></td>
                <td><input type="number" id="em-pe-high" value="23" class="em-input"></td>
              </tr>
              <tr>
                <td class="em-row-label">מכפיל תזרים מזומנים צפוי (P/FCF)</td>
                <td>-</td><td>-</td><td>-</td>
                <td><input type="number" id="em-pfcf-low" value="17" class="em-input"></td>
                <td><input type="number" id="em-pfcf-mid" value="20" class="em-input"></td>
                <td><input type="number" id="em-pfcf-high" value="23" class="em-input"></td>
              </tr>
              <tr>
                <td class="em-row-label">תשואה שנתית מבוקשת (%)</td>
                <td>-</td><td>-</td><td>-</td>
                <td><input type="number" id="em-ret-low" value="9" class="em-input">%</td>
                <td><input type="number" id="em-ret-mid" value="9" class="em-input">%</td>
                <td><input type="number" id="em-ret-high" value="9" class="em-input">%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="em-btn-wrap">
          <button onclick="calculateEMValuation()" class="em-analyze-btn">
            🚀 נתח מניה ומצא מחיר קנייה יעד
          </button>
        </div>

        <!-- Output Step (Matches Screenshot 2!) -->
        <div id="em-output-container" class="em-results-grid">
          <!-- Scenario Low -->
          <div class="em-result-card low">
            <div class="em-scenario-title">תרחיש שמרני (Low)</div>
            <div class="em-res-sub">מחיר יעד לפי מכפיל רווח</div>
            <div class="em-buy-price danger" id="em-res-pm-low">$178.29 <span class="em-plus">⊕</span></div>
            
            <div class="em-res-sub mt">מחיר יעד לפי מכפיל תזרים</div>
            <div class="em-buy-price danger" id="em-res-fcf-low">$101.88 <span class="em-plus">⊕</span></div>

            <div class="em-res-sub mt">תשואה שנתית צפויה במחיר הנוכחי ⓘ</div>
            <div class="em-ret-val danger" id="em-res-ret-low">-7.59%</div>
            
            <span class="em-val-tag over" id="em-tag-low">מחיר יתר (Overvalued)</span>
          </div>

          <!-- Scenario Mid -->
          <div class="em-result-card mid">
            <div class="em-scenario-title">תרחיש בינוני (Mid)</div>
            <div class="em-res-sub">מחיר יעד לפי מכפיל רווח</div>
            <div class="em-buy-price danger" id="em-res-pm-mid">$315.97 <span class="em-plus">⊕</span></div>
            
            <div class="em-res-sub mt">מחיר יעד לפי מכפיל תזרים</div>
            <div class="em-buy-price danger" id="em-res-fcf-mid">$191.24 <span class="em-plus">⊕</span></div>

            <div class="em-res-sub mt">תשואה שנתית צפויה במחיר הנוכחי ⓘ</div>
            <div class="em-ret-val danger" id="em-res-ret-mid">-0.30%</div>

            <span class="em-val-tag over" id="em-tag-mid">מחיר יתר (Overvalued)</span>
          </div>

          <!-- Scenario High -->
          <div class="em-result-card high">
            <div class="em-scenario-title">תרחיש אופטימי (High)</div>
            <div class="em-res-sub">מחיר יעד לפי מכפיל רווח</div>
            <div class="em-buy-price success" id="em-res-pm-high">$556.83 <span class="em-plus">⊕</span></div>
            
            <div class="em-res-sub mt">מחיר יעד לפי מכפיל תזרים</div>
            <div class="em-buy-price danger" id="em-res-fcf-high">$353.11 <span class="em-plus">⊕</span></div>

            <div class="em-res-sub mt">תשואה שנתית צפויה במחיר הנוכחי ⓘ</div>
            <div class="em-ret-val success" id="em-res-ret-high">6.94%</div>

            <span class="em-val-tag fair" id="em-tag-high">מחיר הוגן (Fair Value)</span>
          </div>
        </div>
      </div>
    </div>
  `;
};

// Stock Financial Database & Live TradingView Auto-Fetch
window.stockDatabase = {
  "AAPL": { price: 226.05, rev: 385.6, shares: 15.3, roic: ["18.56%", "18.93%", "19.04%"], g: ["30.56%", "25.04%", "18.10%"], pm: ["49.92%", "43.78%", "41.47%"], fcf: ["25.61%", "24.77%", "22.98%"], gAssump: [6, 10, 14], pmAssump: [25, 27, 30], fcfAssump: [22, 25, 28], peAssump: [22, 26, 30], pfcfAssump: [22, 26, 30] },
  "NVDA": { price: 128.25, rev: 96.3, shares: 24.6, roic: ["55.20%", "32.10%", "22.40%"], g: ["122.4%", "58.20%", "38.50%"], pm: ["55.30%", "48.10%", "36.20%"], fcf: ["45.20%", "38.50%", "28.10%"], gAssump: [15, 25, 35], pmAssump: [35, 42, 50], fcfAssump: [30, 38, 45], peAssump: [28, 35, 45], pfcfAssump: [28, 35, 45] },
  "TSLA": { price: 210.15, rev: 96.8, shares: 3.19, roic: ["14.20%", "12.80%", "8.50%"], g: ["18.80%", "37.20%", "45.10%"], pm: ["14.40%", "12.10%", "9.20%"], fcf: ["8.50%", "7.20%", "5.10%"], gAssump: [10, 18, 25], pmAssump: [10, 14, 18], fcfAssump: [8, 12, 16], peAssump: [25, 40, 60], pfcfAssump: [25, 40, 60] },
  "MSFT": { price: 421.40, rev: 245.1, shares: 7.43, roic: ["29.10%", "27.40%", "23.50%"], g: ["15.70%", "14.20%", "12.80%"], pm: ["36.20%", "35.10%", "33.40%"], fcf: ["30.10%", "29.20%", "28.50%"], gAssump: [9, 13, 17], pmAssump: [30, 34, 38], fcfAssump: [25, 28, 32], peAssump: [22, 27, 33], pfcfAssump: [22, 27, 33] },
  "GOOGL": { price: 165.80, rev: 328.2, shares: 12.3, roic: ["26.40%", "23.10%", "20.50%"], g: ["13.80%", "15.40%", "17.10%"], pm: ["25.80%", "24.20%", "22.50%"], fcf: ["22.10%", "21.50%", "20.20%"], gAssump: [8, 12, 16], pmAssump: [20, 24, 28], fcfAssump: [18, 22, 25], peAssump: [18, 22, 26], pfcfAssump: [18, 22, 26] },
  "AMZN": { price: 177.20, rev: 604.3, shares: 10.4, roic: ["18.20%", "14.50%", "11.80%"], g: ["12.50%", "16.80%", "21.20%"], pm: ["7.40%", "5.80%", "4.20%"], fcf: ["8.90%", "7.10%", "5.50%"], gAssump: [8, 13, 18], pmAssump: [6, 9, 12], fcfAssump: [7, 10, 14], peAssump: [25, 32, 42], pfcfAssump: [25, 32, 42] },
  "META": { price: 532.50, rev: 149.8, shares: 2.53, roic: ["31.50%", "26.80%", "24.20%"], g: ["22.10%", "18.50%", "20.40%"], pm: ["33.80%", "30.40%", "28.10%"], fcf: ["28.50%", "26.20%", "24.10%"], gAssump: [9, 14, 20], pmAssump: [26, 30, 35], fcfAssump: [22, 26, 30], peAssump: [18, 24, 30], pfcfAssump: [18, 24, 30] },
  "NFLX": { price: 685.20, rev: 36.5, shares: 0.43, roic: ["22.40%", "18.10%", "14.20%"], g: ["15.20%", "13.40%", "16.80%"], pm: ["20.50%", "17.20%", "12.80%"], fcf: ["18.20%", "15.10%", "10.40%"], gAssump: [8, 12, 16], pmAssump: [18, 22, 26], fcfAssump: [16, 20, 24], peAssump: [24, 30, 38], pfcfAssump: [24, 30, 38] },
  "AMD": { price: 142.30, rev: 23.2, shares: 1.62, roic: ["8.50%", "12.40%", "10.20%"], g: ["9.20%", "24.50%", "28.10%"], pm: ["8.10%", "11.20%", "9.50%"], fcf: ["10.20%", "12.50%", "11.10%"], gAssump: [10, 16, 24], pmAssump: [12, 18, 24], fcfAssump: [10, 16, 22], peAssump: [22, 30, 40], pfcfAssump: [22, 30, 40] }
};

window.fetchStockData = async function(tickerInput) {
  const ticker = (tickerInput || document.getElementById('em-ticker')?.value || '').trim().toUpperCase();
  if (!ticker) return;

  const statusEl = document.getElementById('em-status-badge');
  if (statusEl) {
    statusEl.style.display = 'inline-block';
    statusEl.innerHTML = `⏳ מביא נתונים בזמן אמת עבור <b>${ticker}</b>...`;
    statusEl.style.background = '#fef3c7';
    statusEl.style.color = '#d97706';
  }

  // 1. Check local pre-loaded financial database
  const stock = window.stockDatabase[ticker];

  if (stock) {
    if (document.getElementById('em-price')) document.getElementById('em-price').value = stock.price;
    if (document.getElementById('em-rev')) document.getElementById('em-rev').value = stock.rev;
    if (document.getElementById('em-shares')) document.getElementById('em-shares').value = stock.shares;

    // Assumptions Low, Mid, High
    if (document.getElementById('em-g-low')) document.getElementById('em-g-low').value = stock.gAssump[0];
    if (document.getElementById('em-g-mid')) document.getElementById('em-g-mid').value = stock.gAssump[1];
    if (document.getElementById('em-g-high')) document.getElementById('em-g-high').value = stock.gAssump[2];

    if (document.getElementById('em-pm-low')) document.getElementById('em-pm-low').value = stock.pmAssump[0];
    if (document.getElementById('em-pm-mid')) document.getElementById('em-pm-mid').value = stock.pmAssump[1];
    if (document.getElementById('em-pm-high')) document.getElementById('em-pm-high').value = stock.pmAssump[2];

    if (document.getElementById('em-fcf-low')) document.getElementById('em-fcf-low').value = stock.fcfAssump[0];
    if (document.getElementById('em-fcf-mid')) document.getElementById('em-fcf-mid').value = stock.fcfAssump[1];
    if (document.getElementById('em-fcf-high')) document.getElementById('em-fcf-high').value = stock.fcfAssump[2];

    if (document.getElementById('em-pe-low')) document.getElementById('em-pe-low').value = stock.peAssump[0];
    if (document.getElementById('em-pe-mid')) document.getElementById('em-pe-mid').value = stock.peAssump[1];
    if (document.getElementById('em-pe-high')) document.getElementById('em-pe-high').value = stock.peAssump[2];

    if (document.getElementById('em-pfcf-low')) document.getElementById('em-pfcf-low').value = stock.pfcfAssump[0];
    if (document.getElementById('em-pfcf-mid')) document.getElementById('em-pfcf-mid').value = stock.pfcfAssump[1];
    if (document.getElementById('em-pfcf-high')) document.getElementById('em-pfcf-high').value = stock.pfcfAssump[2];

    if (statusEl) {
      statusEl.innerHTML = `✅ נתוני <b>${ticker}</b> התעדכנו בזמן אמת!`;
      statusEl.style.background = '#dcfce7';
      statusEl.style.color = '#15803d';
    }

    calculateEMValuation();
    return;
  }

  // 2. Fetch live price via TradingView / Financial API endpoint
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`);
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (meta && meta.regularMarketPrice) {
      const price = meta.regularMarketPrice;
      if (document.getElementById('em-price')) document.getElementById('em-price').value = price.toFixed(2);

      if (statusEl) {
        statusEl.innerHTML = `✅ מחיר לייב חודש מ-TradingView: $${price.toFixed(2)} עבור <b>${ticker}</b>`;
        statusEl.style.background = '#dcfce7';
        statusEl.style.color = '#15803d';
      }
      calculateEMValuation();
    } else {
      if (statusEl) {
        statusEl.innerHTML = `ℹ️ <b>${ticker}</b> - הזן נתונים ידנית למניה זו`;
        statusEl.style.background = '#f1f5f9';
        statusEl.style.color = '#475569';
      }
    }
  } catch (err) {
    if (statusEl) {
      statusEl.innerHTML = `ℹ️ <b>${ticker}</b> - הזן נתונים ידנית למניה זו`;
      statusEl.style.background = '#f1f5f9';
      statusEl.style.color = '#475569';
    }
  }
};

// Global Event Listeners for Stock Auto-Fetch Input
document.addEventListener('input', function(e) {
  if (e.target && e.target.id === 'em-ticker') {
    const val = e.target.value.trim().toUpperCase();
    if (val.length >= 2) {
      fetchStockData(val);
    }
  }
});

window.calculateEMValuation = function() {
  const price = parseFloat(document.getElementById('em-price')?.value) || 220;
  const revBillion = parseFloat(document.getElementById('em-rev')?.value) || 385.6;
  const sharesBillion = parseFloat(document.getElementById('em-shares')?.value) || 15.3;

  const calcScenario = (gKey, pmKey, fcfKey, peKey, pfcfKey, retKey, tagId, pmResId, fcfResId, retResId) => {
    const g = (parseFloat(document.getElementById(gKey)?.value) || 10) / 100;
    const pm = (parseFloat(document.getElementById(pmKey)?.value) || 35) / 100;
    const fcf = (parseFloat(document.getElementById(fcfKey)?.value) || 20) / 100;
    const pe = parseFloat(document.getElementById(peKey)?.value) || 20;
    const pfcf = parseFloat(document.getElementById(pfcfKey)?.value) || 20;
    const r = (parseFloat(document.getElementById(retKey)?.value) || 9) / 100;

    const rev10 = revBillion * Math.pow(1 + g, 10);
    const ni10 = rev10 * pm;
    const fcf10 = rev10 * fcf;

    const mcPE10 = ni10 * pe;
    const mcFCF10 = fcf10 * pfcf;

    const pricePE10 = mcPE10 / sharesBillion;
    const priceFCF10 = mcFCF10 / sharesBillion;

    const buyPricePM = pricePE10 / Math.pow(1 + r, 10);
    const buyPriceFCF = priceFCF10 / Math.pow(1 + r, 10);

    const retPEPct = (Math.pow(pricePE10 / price, 1 / 10) - 1) * 100;

    const fmt = (val) => '$' + val.toFixed(2);

    if (document.getElementById(pmResId)) document.getElementById(pmResId).innerHTML = fmt(buyPricePM) + ' <span style="font-size:16px;">⊕</span>';
    if (document.getElementById(fcfResId)) document.getElementById(fcfResId).innerHTML = fmt(buyPriceFCF) + ' <span style="font-size:16px;">⊕</span>';
    if (document.getElementById(retResId)) {
      const el = document.getElementById(retResId);
      el.textContent = retPEPct.toFixed(2) + '%';
      el.style.color = retPEPct >= 0 ? '#10b981' : '#ef4444';
    }

    const tag = document.getElementById(tagId);
    if (tag) {
      if (price <= Math.min(buyPricePM, buyPriceFCF)) {
        tag.className = 'em-val-tag under';
        tag.textContent = 'מחיר חסר (Undervalued)';
      } else if (price <= Math.max(buyPricePM, buyPriceFCF)) {
        tag.className = 'em-val-tag fair';
        tag.textContent = 'מחיר הוגן (Fair Value)';
      } else {
        tag.className = 'em-val-tag over';
        tag.textContent = 'מחיר יתר (Overvalued)';
      }
    }
  };

  calcScenario('em-g-low', 'em-pm-low', 'em-fcf-low', 'em-pe-low', 'em-pfcf-low', 'em-ret-low', 'em-tag-low', 'em-res-pm-low', 'em-res-fcf-low', 'em-res-ret-low');
  calcScenario('em-g-mid', 'em-pm-mid', 'em-fcf-mid', 'em-pe-mid', 'em-pfcf-mid', 'em-ret-mid', 'em-tag-mid', 'em-res-pm-mid', 'em-res-fcf-mid', 'em-res-ret-mid');
  calcScenario('em-g-high', 'em-pm-high', 'em-fcf-high', 'em-pe-high', 'em-pfcf-high', 'em-ret-high', 'em-tag-high', 'em-res-pm-high', 'em-res-fcf-high', 'em-res-ret-high');
};

let shopImgData = '';

function openShopModal() {
  if (!isEditMode) return;
  document.getElementById('shop-name').value = '';
  document.getElementById('shop-label').value = '';
  document.getElementById('shop-price').value = '';
  document.getElementById('shop-link').value = '';
  const preview = document.getElementById('shop-img-preview');
  preview.style.display = 'none'; preview.src = '';
  shopImgData = '';
  document.getElementById('shop-img-pick').textContent = 'לחץ לבחירת תמונה מהמחשב';
  document.getElementById('shop-modal').style.display = 'flex';
}

document.getElementById('shop-img-pick').addEventListener('click', () => {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    artCompressImage(f).then(data => {
      shopImgData = data;
      const p = document.getElementById('shop-img-preview');
      p.src = shopImgData; p.style.display = 'block';
      document.getElementById('shop-img-pick').textContent = '✓ תמונה נבחרה';
    });
  };
  inp.click();
});

document.getElementById('shop-cancel').addEventListener('click', () => {
  document.getElementById('shop-modal').style.display = 'none';
});

document.getElementById('shop-save').addEventListener('click', () => {
  const name = document.getElementById('shop-name').value.trim();
  if (!name) { alert('חובה שם מוצר'); return; }
  const prods = shopGetProducts();
  prods.unshift({
    id: 'p' + Date.now(),
    name,
    label: document.getElementById('shop-label').value.trim(),
    price: document.getElementById('shop-price').value.trim(),
    image: shopImgData,
    link: document.getElementById('shop-link').value.trim()
  });
  mainContent.innerHTML = buildShopPage(prods);
  saveCurrentPageContent();
  document.getElementById('shop-modal').style.display = 'none';
});

window.buildShopPage = buildShopPage;
window.shopDelete = shopDelete;
window.openShopModal = openShopModal;
window.shopSearch = shopSearch;
window.shopAddToCart = shopAddToCart;
window.shopRemoveFromCart = shopRemoveFromCart;
window.shopToggleCart = shopToggleCart;

// ============================================================
// מערכת סיפורים (Stories System)
// ============================================================

const STORIES_SAMPLES = [
  {
    id: 's1',
    title: 'המסע אל מעבר להרי החושך',
    summary: 'סיפור הרפתקאות מרתק על קבוצת חוקרים צעירים שיצאה למצוא את העיר האבודה בצפון הרחוק.',
    body: 'הרוח נשבה בעוצמה כאשר עמדנו בפתח המערה הגדולה...\n\nזה היה המסע שהתכוננו אליו במשך שנים. ידענו שהדרך תהיה קשה ומאתגרת, אך איש מאיתנו לא תיאר לעצמו מה באמת מחכה לנו שם.\n\nלאחר שבועיים של טיפוס מפרך, מצאנו את עצמנו מול חומות אבן עתיקות שאיש לא ראה מזה אלפי שנים.',
    author: 'יואב דרור', category: 'הרפתקאות', categoryColor: '#8b5cf6', timestamp: 'היום, 14:00',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80', link: '', verified: true
  },
  {
    id: 's2',
    title: 'הסוד של השען הזקן מרחוב הרצל',
    summary: 'בסמטה צדדית בעיר העתיקה, שעון אחד קטן החל ללכת לאחור ומאז הכל השתנה.',
    body: 'השען הזקן, מר לוי, עבד בסדנתו הקטנה מזה חמישים שנה. אנשים ידעו שהוא יכול לתקן כל דבר, אך השעון הזה היה שונה.\n\nיום אחד, הגיע לקוח מסתורי והשאיר שעון זהב עתיק. כשמר לוי פתח אותו, הוא גילה מנגנון שלא דמה לשום דבר שראה בחייו.\n\nכאשר מחוגי השעון החלו לזוז לאחור, מר לוי הרגיש פתאום צעיר בעשר שנים...',
    author: 'מיכל ישראלי', category: 'פנטזיה', categoryColor: '#3b82f6', timestamp: 'אתמול, 10:15',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=80', link: ''
  }
];

// קטגוריות הסיפורים (ניתן לעריכה על ידי מנהל)
let STORY_CATEGORIES = (function () {
  try {
    const saved = JSON.parse(localStorage.getItem('custom_story_categories'));
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch (e) {}
  return ['כללי', 'עירום'];
})();

function saveStoryCategories() {
  localStorage.setItem('custom_story_categories', JSON.stringify(STORY_CATEGORIES));
  try {
    const dbRef = ref(db, 'website/storyCategories');
    set(dbRef, STORY_CATEGORIES);
  } catch (e) {}
  syncStoryCategorySelect();
}

function syncStoryCategorySelect() {
  const select = document.getElementById('story-category');
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = STORY_CATEGORIES.map(cat => `<option value="${escHtml(cat)}">${cat}</option>`).join('');
  if (STORY_CATEGORIES.includes(currentVal)) {
    select.value = currentVal;
  }
}
window.syncStoryCategorySelect = syncStoryCategorySelect;

// ============================================================
// עריכת סרגלי הקטגוריות (מנהל): 'stories' = קומיקס+סיפורים, 'photos' = עמוד התמונות
// ============================================================
let PHOTO_BAR_CATEGORIES = (function () {
  try {
    const saved = JSON.parse(localStorage.getItem('custom_photo_bar_categories'));
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch (e) {}
  return ['תמונות גולשים', 'לעסקים', 'כללי'];
})();

function savePhotoBarCategories() {
  try { localStorage.setItem('custom_photo_bar_categories', JSON.stringify(PHOTO_BAR_CATEGORIES)); } catch (e) {}
  try { set(ref(db, 'website/photoBarCategories'), PHOTO_BAR_CATEGORIES); } catch (e) {}
}

let catModalKind = 'stories';
function _catList(kind) { return kind === 'photos' ? PHOTO_BAR_CATEGORIES : STORY_CATEGORIES; }
function _catSave(kind) { if (kind === 'photos') savePhotoBarCategories(); else saveStoryCategories(); }
function _catRerender(kind) {
  if (kind === 'photos') {
    const bar = mainContent && mainContent.querySelector('.photos-page[data-section="photos"] .section-category-bar');
    if (bar) bar.outerHTML = sectionCategoryBarHTML('photos');
  } else {
    renderStoryCategoryTabs();
  }
}

// מחיל קטגוריות שהגיעו מ-Firebase (לכל הגולשים ולכל המכשירים)
function applyRemoteCategoryBars(data, rerender) {
  if (!data) return;
  if (Array.isArray(data.storyCategories) && data.storyCategories.length
      && JSON.stringify(data.storyCategories) !== JSON.stringify(STORY_CATEGORIES)) {
    STORY_CATEGORIES = data.storyCategories.filter(Boolean);
    try { localStorage.setItem('custom_story_categories', JSON.stringify(STORY_CATEGORIES)); } catch (e) {}
    syncStoryCategorySelect();
    if (rerender) _catRerender('stories');
  }
  if (Array.isArray(data.photoBarCategories) && data.photoBarCategories.length
      && JSON.stringify(data.photoBarCategories) !== JSON.stringify(PHOTO_BAR_CATEGORIES)) {
    PHOTO_BAR_CATEGORIES = data.photoBarCategories.filter(Boolean);
    try { localStorage.setItem('custom_photo_bar_categories', JSON.stringify(PHOTO_BAR_CATEGORIES)); } catch (e) {}
    if (rerender) _catRerender('photos');
  }
}
window.applyRemoteCategoryBars = applyRemoteCategoryBars;

function openCategoriesModal(kind) {
  if (!isAdmin() && !isEditMode) return;
  catModalKind = kind === 'photos' ? 'photos' : 'stories';
  const list = _catList(catModalKind);
  const title = document.getElementById('story-categories-modal-title');
  if (title) title.textContent = catModalKind === 'photos' ? '🏷️ ניהול קטגוריות — תמונות' : '🏷️ ניהול קטגוריות — קומיקס וסיפורים';
  const listContainer = document.getElementById('story-categories-list-container');
  if (listContainer) {
    const iconBtn = 'border:none; border-radius:6px; width:28px; height:28px; cursor:pointer; font-weight:bold; display:flex; align-items:center; justify-content:center;';
    listContainer.innerHTML = list.map((cat, idx) => `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 10px 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
        <span style="font-weight: 600; font-size: 14px; color: #1f2937; flex: 1;">${escHtml(cat)}</span>
        <button onclick="moveCategory(${idx}, -1)" title="הזז למעלה" ${idx === 0 ? 'disabled' : ''} style="${iconBtn} background:#eef2ff; color:#4f46e5; opacity:${idx === 0 ? 0.35 : 1};">▲</button>
        <button onclick="moveCategory(${idx}, 1)" title="הזז למטה" ${idx === list.length - 1 ? 'disabled' : ''} style="${iconBtn} background:#eef2ff; color:#4f46e5; opacity:${idx === list.length - 1 ? 0.35 : 1};">▼</button>
        <button onclick="renameCategory(${idx})" title="שנה שם" style="${iconBtn} background:rgba(139,92,246,0.1); color:#8b5cf6;">✏️</button>
        <button onclick="deleteStoryCategory(${idx})" title="מחק קטגוריה" style="${iconBtn} background:rgba(225,29,72,0.1); color:#e11d48;">✕</button>
      </div>
    `).join('');
  }
  const modal = document.getElementById('story-categories-modal');
  if (modal) modal.style.display = 'flex';
}
window.openCategoriesModal = openCategoriesModal;

function openStoryCategoriesModal() { openCategoriesModal('stories'); }
window.openStoryCategoriesModal = openStoryCategoriesModal;

function closeStoryCategoriesModal() {
  const modal = document.getElementById('story-categories-modal');
  if (modal) modal.style.display = 'none';
}
window.closeStoryCategoriesModal = closeStoryCategoriesModal;

function _catChanged() {
  _catSave(catModalKind);
  openCategoriesModal(catModalKind);
  _catRerender(catModalKind);
}

function addStoryCategory() {
  const inp = document.getElementById('new-story-cat-input');
  if (!inp) return;
  const val = inp.value.trim();
  if (!val) { alert('אנא הזן שם קטגוריה'); return; }
  const list = _catList(catModalKind);
  if (val === 'הכל' || list.includes(val)) { alert('קטגוריה זו כבר קיימת'); return; }
  list.push(val);
  inp.value = '';
  _catChanged();
}
window.addStoryCategory = addStoryCategory;

function renameCategory(idx) {
  const list = _catList(catModalKind);
  const old = list[idx];
  if (old === undefined) return;
  const val = (prompt('שם חדש לקטגוריה:', old) || '').trim();
  if (!val || val === old) return;
  if (val === 'הכל' || list.includes(val)) { alert('קטגוריה זו כבר קיימת'); return; }
  list[idx] = val;
  if (catModalKind === 'photos') {
    if (typeof sectionCatFilters !== 'undefined' && sectionCatFilters.photos === old) sectionCatFilters.photos = val;
  } else if (selectedStoryCategories.has(old)) {
    selectedStoryCategories.delete(old); selectedStoryCategories.add(val);
  }
  _catChanged();
}
window.renameCategory = renameCategory;

function moveCategory(idx, dir) {
  const list = _catList(catModalKind);
  const j = idx + dir;
  if (j < 0 || j >= list.length) return;
  [list[idx], list[j]] = [list[j], list[idx]];
  _catChanged();
}
window.moveCategory = moveCategory;

function deleteStoryCategory(idx) {
  const list = _catList(catModalKind);
  if (list.length <= 1) {
    alert('חובה להשאיר לפחות קטגוריה אחת');
    return;
  }
  const cat = list[idx];
  if (!confirm(`האם למחוק את הקטגוריה "${cat}"?`)) return;
  list.splice(idx, 1);
  if (catModalKind === 'photos') {
    if (typeof sectionCatFilters !== 'undefined' && sectionCatFilters.photos === cat) sectionCatFilters.photos = 'הכל';
  } else if (selectedStoryCategories.has(cat)) {
    selectedStoryCategories.delete(cat);
  }
  _catChanged();
}
window.deleteStoryCategory = deleteStoryCategory;

function renderStoryCategoryTabs() {
  const container = mainContent.querySelector('.story-category-tabs');
  if (container) {
    container.outerHTML = storyCategoryBarHTML();
  }
}

// גודל הגריד בעמוד הסיפורים (מספר עמודות). נשמר בין ביקורים.
let storyGridCols = (function () {
  const v = parseInt(localStorage.getItem('story_grid_cols') || '4', 10);
  if (v === 2 || v === 3 || v === 4) return v;
  return 4;
})();
// קטגוריות נבחרות לסינון. סט ריק = "הכל" (כל הסיפורים). אפשר לבחור כמה
// קטגוריות בו-זמנית, וסיפור מוצג אם הקטגוריה שלו נמצאת באחת מהן.
let selectedStoryCategories = new Set();

// בורר גודל: 2 / 3 / 4 סיפורים בשורה. משנה את הגריד ושומר את הבחירה.
function storySizeBarHTML() {
  return `
    <div class="story-size-bar">
      <span class="story-size-label">גודל</span>
      ${[4, 3, 2].map(n => `<button type="button" class="story-size-btn${storyGridCols === n ? ' active' : ''}" onclick="storySetGridSize(${n})">${n}</button>`).join('')}
    </div>
  `;
}

function storySetGridSize(n) {
  if (![2, 3, 4].includes(n)) return;
  storyGridCols = n;
  try { localStorage.setItem('story_grid_cols', String(n)); } catch (e) {}
  const root = mainContent.querySelector('.stories-page');
  if (root) {
    root.classList.remove('story-cols-2', 'story-cols-3', 'story-cols-4');
    root.classList.add('story-cols-' + n);
  }
  mainContent.querySelectorAll('.story-size-btn').forEach(b => b.classList.toggle('active', b.textContent.trim() === String(n)));
}
window.storySetGridSize = storySetGridSize;

// כפתור "עוד" לסיפורים — מציג שורת גריד אחת, ובלחיצה חושף את הכל (כמו בתמונות)
function storyRowMoreBtn(count, rowId) {
  // כפתור "עוד" הוסר לבקשת המשתמש — כל הסיפורים מוצגים תמיד למטה
  return '';
}

// שורת סינון כללי לסיפורים (בחירה יחידה: הכל/כללי/עירום)
function storyGeneralFilterBarHTML() {
  const opts = ['הכל', ...STORY_CATEGORIES];
  return `
    <div class="story-general-filter-bar" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
      ${opts.map(o => `<button type="button" class="story-general-filter-btn${currentStoryGeneralFilter === o ? ' active' : ''}" onclick="storySetGeneralFilter('${artEsc(o)}', this)">${o}</button>`).join('')}
    </div>
  `;
}

function storySetGeneralFilter(opt, btn) {
  currentStoryGeneralFilter = opt;
  const bar = btn.closest('.story-general-filter-bar');
  if (bar) bar.querySelectorAll('.story-general-filter-btn').forEach(b => b.classList.toggle('active', b.textContent.trim() === opt));
  if (typeof storyApplyFilters === 'function') storyApplyFilters();
}
window.storySetGeneralFilter = storySetGeneralFilter;

// שורת סינון קטגוריות לסיפורים (בחירה יחידה)
function storyCatIsActive(c) {
  return c === 'הכל' ? selectedStoryCategories.size === 0 : selectedStoryCategories.has(c);
}
function storyCategoryBarHTML() {
  const cats = ['הכל', ...STORY_CATEGORIES];
  const editBtn = (isAdmin() || isEditMode) ? `
    <button type="button" class="story-cat-btn" onclick="openStoryCategoriesModal()" style="background: rgba(139,92,246,0.1); color: #8b5cf6; border: 1px dashed #8b5cf6; font-weight: 700;">✏️ ניהול קטגוריות</button>
  ` : '';
  return `
    <div class="story-category-tabs" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
      ${cats.map(c => `<button type="button" class="story-cat-btn${storyCatIsActive(c) ? ' active' : ''}" onclick="storyFilterCategory('${artEsc(c)}', this)">${c}</button>`).join('')}
      ${editBtn}
    </div>
  `;
}

function storyFilterCategory(cat, btn) {
  // בחירה יחידה: "הכל" או לחיצה שוב על הקטגוריה האקטיבית — מחזיר ל"הכל" (ללא סינון).
  // לחיצה על קטגוריה אחרת — בוחרת אותה בלבד.
  if (cat === 'הכל' || selectedStoryCategories.has(cat)) {
    selectedStoryCategories.clear();
  } else {
    selectedStoryCategories.clear();
    selectedStoryCategories.add(cat);
  }
  const bar = btn.closest('.story-category-tabs');
  if (bar) bar.querySelectorAll('.story-cat-btn').forEach(b => b.classList.toggle('active', storyCatIsActive(b.textContent.trim())));
  artPageState.stories = 1;
  storyApplyFilters();
}
window.storyFilterCategory = storyFilterCategory;

// מסמן אילו סיפורים תואמים לחיפוש ולקטגוריות שנבחרו; העימוד מציג את התוצאות
function storyApplyFilters() {
  if (typeof photoApplySort === 'function') photoApplySort(); // מיון העמוד (כללי)
  const searchInput = mainContent.querySelector('.stories-page .art-search');
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const rows = mainContent.querySelectorAll('.stories-page .art-row');
  const isAgeVerified = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('age_verified') === 'true';
  const dateSel = (typeof photoSel !== 'undefined' && photoSel.date) ? photoSel.date : [];
  const topDateThreshold = photoDateThreshold(currentPhotoDateFilter);
  let visible = 0;
  rows.forEach(r => {
    const text = (r.dataset.search || r.textContent).toLowerCase();
    const rowCat = r.dataset.category || 'כללי';
    const rowTime = r.dataset.time ? Number(r.dataset.time) : null;
    const catMatch = (selectedStoryCategories.size === 0 || selectedStoryCategories.has(rowCat));
    
    // סינון תאריך: פאנל הצד (OR) AND שורת הצ׳יפים העליונה (currentPhotoDateFilter)
    let dateMatchSide = true;
    if (dateSel.length) {
      dateMatchSide = dateSel.some(dr => { const th = photoDateThreshold(dr); return th === null ? true : (rowTime !== null && rowTime >= th); });
    }
    const dateMatchTop = (topDateThreshold === null) || (rowTime !== null && rowTime >= topDateThreshold);
    const dateMatch = dateMatchSide && dateMatchTop;

    const isVerifiedRow = (r.dataset.verified === '1' || r.dataset.verified === 'true');
    const verifiedMatch = !photoVerifiedOnly || isVerifiedRow;
    const match = catMatch && dateMatch && text.includes(q) && verifiedMatch;
    r.dataset.artMatch = match ? '1' : '0';
    if (match) visible++;

    const imgWrap = r.querySelector('.art-row-img-wrap');
    if (imgWrap) {
      if (!isAgeVerified) {
        imgWrap.style.filter = 'blur(25px)';
        imgWrap.style.setProperty('-webkit-filter', 'blur(25px)');
        imgWrap.style.transition = 'filter 0.3s ease, -webkit-filter 0.3s ease';
        imgWrap.title = 'תוכן מטושטש - יש לאשר גיל 18+ בסרגל הצד';
      } else {
        imgWrap.style.filter = 'none';
        imgWrap.style.setProperty('-webkit-filter', 'none');
        imgWrap.title = '';
      }
    }
  });

  const allOutsideStoryMedia = mainContent.querySelectorAll('.stories-page .art-featured-card img, .stories-page .art-rec-img img, .stories-page .art-popular-item img');
  allOutsideStoryMedia.forEach(el => {
    if (!isAgeVerified) {
      el.style.filter = 'blur(25px)';
      el.style.setProperty('-webkit-filter', 'blur(25px)');
    } else {
      el.style.filter = 'none';
      el.style.setProperty('-webkit-filter', 'none');
    }
  });

  artSyncPagination();
  const noResults = mainContent.querySelector('.stories-page .art-no-results');
  if (noResults) noResults.style.display = visible === 0 ? 'block' : 'none';
}
window.storyApplyFilters = storyApplyFilters;

// כרטיס סיפור בודד — חולץ לפונקציה נפרדת כדי לשמש גם בעמוד הסיפורים
// וגם כפיד "סיפורים" שנוסף בתחתית עמוד התמונות.
function storyCardHTML(s, iconHint) {
    const validImages = (s.images && s.images.length) ? s.images.filter(Boolean) : (s.image ? [s.image] : []);
    const mainImg = validImages[0] || s.image || '';
    let miniThumbnailsHTML = '';
    if (validImages.length <= 1) {
      miniThumbnailsHTML = '<div class="photo-mini-thumbs-spacer" aria-hidden="true"></div>';
    } else {
      miniThumbnailsHTML = `
        <div class="photo-mini-thumbs" style="display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 6px; width: 100%; direction: ltr;">
          <div class="photo-mini-thumbs-list" style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap; flex: 1; min-width: 0;">
            ${validImages.map((imgUrl, idx) => `
              <div class="photo-mini-thumb" 
                   onclick="event.stopPropagation(); photoSelectRowImage('${artEsc(s.id)}', '${artEsc(imgUrl)}', this)" 
                   style="width: 22px; height: 22px; border-radius: 4px; overflow: hidden; cursor: pointer; border: 1.5px solid ${idx === 0 ? '#e11d48' : '#ddd'}; transition: all 0.2s; background: #eee; flex-shrink:0;">
                <img src="${escHtml(imgUrl)}" style="width: 100%; height: 100%; object-fit: cover;">
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    const isVerifiedStory = isUserVerified(s.authorId, s.author, s.verified || s.verifiedUser);
    const verifiedBadgeHTML = isVerifiedStory ? ` <span title="משתמש מאומת" style="color:#2563eb; font-weight:900; background:#dbeafe; border-radius:50%; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; font-size:10px; margin-right:3px;">✓</span>` : '';
    const storyTime = photoAlbumTime(s);
    const viewsCount = photoGetViews(s.id);
    const likesCount = s.likes || 0;
    const storyScore = likesCount + viewsCount;
    const defaultIcon = iconHint || (s.id && s.id.includes('comic') ? '📖' : '✍️');

    const cardLink = (url, label, iconPath, extraPath) => {
      const svg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><path d="${iconPath}"/>${extraPath || ''}</svg>`;
      if (url) {
        if (label === 'אימייל') {
          return `<button type="button" onclick="revealAndCopyEmail('${artEsc(url)}', this, event);" class="art-telegram-btn" title="לחץ לחשיפת והעתקת אימייל">${svg}<span>${label}</span></button>`;
        }
        return `<a href="${escHtml(safeUrl(url))}" target="_blank" onclick="event.stopPropagation();" class="art-telegram-btn">${svg}<span>${label}</span></a>`;
      }
      return `<span class="art-telegram-btn is-disabled" onclick="event.stopPropagation();" aria-disabled="true">${svg}<span>${label}</span></span>`;
    };

    const isLikedCard = typeof photoIsLikedLocal === 'function' ? photoIsLikedLocal(s.id) : false;
    const cardHeartOverlay = `
      <button type="button" class="art-heart-overlay${isLikedCard ? ' liked' : ''}" onclick="event.stopPropagation(); photoToggleLike('${artEsc(s.id)}')" title="לייק" aria-label="לייק">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="${isLikedCard ? '#ff2e4d' : 'none'}" stroke="${isLikedCard ? '#ff2e4d' : '#ffffff'}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </button>
    `;

    const isSavedCard = typeof photoIsSavedLocal === 'function' ? photoIsSavedLocal(s.id) : false;
    const cardSaveBtnHTML = `
      <button type="button" onclick="event.stopPropagation(); photoToggleSave('${artEsc(s.id)}')" class="art-telegram-btn art-save-btn${isSavedCard ? ' is-saved' : ''}" title="${isSavedCard ? 'הסר משמורים' : 'שמור לצפייה מאוחרת'}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="${isSavedCard ? '#ffffff' : 'none'}" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
        <span>${isSavedCard ? 'שמור' : 'שמירה'}</span>
      </button>
    `;

    const cardLinksHTML = `
      <div class="photo-card-links">
        ${cardSaveBtnHTML}
        ${cardLink(s.telegramUrl, 'טלגרם', 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z')}
        ${cardLink(s.emailUrl, 'אימייל', 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', '<polyline points="22,6 12,13 2,6"/>')}
      </div>
    `;

    const scoreBadgeHTML = `
      <div style="display:inline-flex; align-items:center; gap:8px; font-size:12px; color:#64748b; font-weight:700; margin-top:4px;">
        <span>👁️ ${viewsCount} צפיות</span>
        <span>·</span>
        <span>❤️ ${likesCount} לייקים</span>
      </div>
    `;

    return `
      <div class="art-row" data-category="${escHtml(s.category || 'כללי')}" data-verified="${isVerifiedStory ? '1' : '0'}" data-time="${storyTime}" data-score="${storyScore}" data-search="${escHtml([s.title, s.summary, s.author, s.category].filter(Boolean).join(' '))}" onclick="storyOpenDetail('${artEsc(s.id)}')">
        <div class="art-row-text photo-card-info">
          <h3>${escHtml(s.title)}</h3>
          <div class="art-row-meta" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="photo-author-link art-row-author" onclick="event.stopPropagation(); if(typeof openUserPage==='function') openUserPage('${artEsc(s.authorId || '')}', '${artEsc(s.author || '')}')" style="cursor: pointer; color: #e11d48; text-decoration: underline; font-weight: 600;">${escHtml(s.author)}${verifiedBadgeHTML}</span>
            <span class="art-row-sep">|</span>
            <span>${escHtml(s.timestamp)}</span>
            ${s.ageRange ? `<span class="art-row-sep">|</span><span>גיל ${escHtml(String(s.ageRange))}</span>` : ''}
            ${isVerifiedStory ? `<span class="art-row-sep">|</span><span style="color:#2563eb; font-weight:700; display:inline-flex; align-items:center; gap:4px;">חשבון זה מאומת <span style="background:#dbeafe; border-radius:50%; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; font-size:10px;">✓</span></span>` : ''}
          </div>
          ${scoreBadgeHTML}
          ${cardLinksHTML}
        </div>
        <div class="art-row-img-container" style="display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0;">
          <div class="art-row-img-wrap" style="--bg-img: url('${mainImg || ''}');">
            ${mainImg ? `<img src="${escHtml(mainImg)}" alt="">` : `<div class="art-row-img-placeholder" data-icon="${defaultIcon}"></div>`}
            ${validImages.length > 1 ? `<div class="photo-count-badge">1 / ${validImages.length}</div>` : ''}
            ${mainImg ? `<button class="art-zoom-btn" onclick="event.stopPropagation();artGalleryById('stories','${artEsc(s.id)}', this.closest('.art-row-img-wrap').querySelector('img') && this.closest('.art-row-img-wrap').querySelector('img').getAttribute('src'))" title="מסך מלא">⛶</button>` : ''}
            ${cardHeartOverlay}
            ${isEditMode ? `<button class="art-pin-btn" onclick="event.stopPropagation(); togglePinStory('${artEsc(s.id)}')" title="${s.pinned ? 'בטל נעץ' : 'נעץ בגריד'}" style="${s.pinned ? 'color:#ffd700;display:flex;' : ''}">${s.pinned ? '★' : '☆'}</button>` : ''}
            ${isEditMode ? `<button class="art-edit-btn" onclick="event.stopPropagation(); openStoryEditModal('${artEsc(s.id)}')" title="ערוך סיפור">✎</button>` : ''}
            <button class="art-delete-btn" onclick="event.stopPropagation();storyDelete('${artEsc(s.id)}',this)">✕</button>
          </div>
          ${miniThumbnailsHTML}
        </div>
      </div>
    `;
}

function buildStoriesPage(stories, storyKind) {
  // storyKind: 'comics' (העמוד הישן, קומיקס/תמונות-סיפור) או 'stories' (סיפורי טקסט חדשים)
  storyKind = (storyKind === 'stories') ? 'stories' : 'comics';
  const kindLabel = storyKind === 'stories' ? 'סיפורים' : 'קומיקס';
  const featured = stories.filter(s => s.pinned).slice(0, 3);
  const popular = stories.slice(0, 5);

  const featuredHTML = featured.map(s => `
    <div class="art-featured-card" onclick="storyOpenDetail('${artEsc(s.id)}')">
      <img src="${escHtml(s.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80')}" alt="">
      <div class="art-featured-overlay"></div>
      <div class="art-featured-info">
        <span class="art-category-badge" style="background:${escHtml(s.categoryColor || '#8b5cf6')}">${escHtml(s.category)}</span>
        <h3>${escHtml(s.title)}</h3>
        <div class="art-featured-meta">${escHtml(s.author)} · ${escHtml(s.timestamp)}</div>
      </div>
    </div>
  `).join('');

  const listHTML = stories.map(storyCardHTML).join('');

  const popularHTML = popular.map((s, i) => `
    <div class="art-popular-item" onclick="storyOpenDetail('${artEsc(s.id)}')">
      <span class="art-popular-num">${String(i+1).padStart(2,'0')}</span>
      <div style="flex:1;font-size:13px;font-weight:600;line-height:1.4;color:#222">${escHtml(s.title)}</div>
    </div>
  `).join('');

  const json = encodeURIComponent(JSON.stringify(stories));
  const _adultOn = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('age_verified') === 'true');
  return `<div class="articles-page stories-page story-cols-${storyGridCols}${photoImagesMode ? '' : ' text-mode'}" data-story-kind="${storyKind}" data-stories-json="${json}">
    <div class="art-inner">
      <div class="art-featured-grid">${featuredHTML}</div>
      <div class="art-layout">
        <div class="art-main">
          <div class="art-search-wrap">
            <input type="text" class="art-search" placeholder="🔍 חיפוש ${kindLabel}..." oninput="storySearch(this.value)">
          </div>
          ${storyCategoryBarHTML()}
          ${photoFilterSectionHTML()}
          <div class="view-toggles">
            <label class="tgl tgl-desktop-only">
              <span class="tgl-label">⛶ מסך מלא (הסתרת סרגלי הצד)</span>
              <span class="tgl-switch"><input type="checkbox" ${pageFullWidth ? 'checked' : ''} onchange="togglePageFullWidth(this.checked)"><span class="tgl-slider"></span></span>
            </label>
          </div>
          <div class="art-section-title-row">
            <div class="art-section-title">כל ה${kindLabel}</div>
            ${storySizeBarHTML()}
          </div>
          <div class="art-rows photo-collapsible expanded" id="story-row-main">${listHTML}</div>
          ${storyRowMoreBtn(stories.length, 'story-row-main')}
          <div class="art-pagination" style="display:none"></div>
          <div class="art-no-results" style="display:none">לא נמצאו ${kindLabel} התואמים לחיפוש</div>
          <button class="art-add-btn" onclick="openStoryModal()" style="background:#8b5cf6">+ הוסף ${storyKind === 'stories' ? 'סיפור' : 'קומיקס'} חדש</button>
        </div>
        <div class="art-sidebar art-sidebar-right">
          ${(isAdmin() || isEditMode) ? `
          <button onclick="openStoryModal()" style="background:#8b5cf6; width:100%; padding:12px 16px; border-radius:8px; border:none; color:white; font-weight:bold; font-size:14px; cursor:pointer; margin-bottom:16px;">+ הוסף סיפור חדש</button>
          ` : ''}
          ${buildSidebarTabs('', 'stories')}
        </div>
        ${buildLeftSidebarBox(popularHTML, 'stories')}
      </div>
    </div>
  </div>`;
}

function storyOpenDetail(id) {
  if (typeof trackEvent === 'function') trackEvent('story_open');
  window.__detailOpen = true; // מגן מפני רענון-רקע שיבעט מהעמוד הפנימי
  window.__detailOpenPageId = activePageId; // שומר איזה עמוד פעיל כשנפתחה התצוגה הפנימית
  const container = mainContent.querySelector('.stories-page');
  const _srcKind = (container && container.getAttribute('data-story-kind')) || 'comics';
  
  let stories = [];
  try {
    if (container && container.dataset && container.dataset.storiesJson) {
      stories = JSON.parse(decodeURIComponent(container.dataset.storiesJson));
    }
  } catch(e) {}
  
  let s = Array.isArray(stories) ? stories.find(x => x && x.id === id) : null;
  if (!s) {
    const all = (typeof getAllStoriesFromPages === 'function') ? getAllStoriesFromPages() : [];
    s = all.find(x => x && x.id === id);
    if (all && all.length) stories = all;
  }
  if (!s) {
    const demos = (typeof _homeDemoComics === 'function' && typeof _homeDemoStories === 'function') 
      ? _homeDemoComics().concat(_homeDemoStories()) : [];
    s = demos.find(x => x && x.id === id);
    if (s && !stories.length) stories = demos;
  }
  if (!s) return;
  if (typeof addToWatchHistory === 'function') addToWatchHistory({ ...s, type: 'story' });

  const validImages = s.images ? s.images.filter(img => !!img) : (s.image ? [s.image] : []);

  // עמודי הסיפור: תמונה או טקסט. אם אין pages — ממירים מהתמונות הישנות
  let storyPagesArr = (s.pages && s.pages.length)
    ? s.pages.map(p => (p && typeof p === 'object') ? p : { type: 'image', url: p })
    : validImages.map(u => ({ type: 'image', url: u }));

  const _bodyText = (s.body || s.summary || '').trim();
  // קומיקס (יש עמודי תמונה) — נפתח ישר בתמונה הראשונה. הטקסט מוצג כתיאור קצר מתחת לכותרת
  // ולא כ"עמוד" נפרד לפני התמונות.
  let _comicDesc = '';
  if (storyPagesArr.some(p => p && p.type === 'image' && p.url)) {
    const _texts = storyPagesArr.filter(p => p && p.type === 'text').map(p => (p.text || '').trim()).filter(Boolean);
    _comicDesc = _texts.length ? _texts.join('\n') : _bodyText;
    storyPagesArr = storyPagesArr.filter(p => p && p.type !== 'text');
  } else if (_bodyText && !storyPagesArr.some(p => p.type === 'text')) {
    storyPagesArr.unshift({ type: 'text', text: _bodyText });
  }
  if (typeof splitStoryTextPages === 'function') storyPagesArr = splitStoryTextPages(storyPagesArr);
  if (!storyPagesArr.length) {
    storyPagesArr = [{ type: 'text', text: s.summary || s.title || 'סיפור' }];
  }

  window.storyPagesData = storyPagesArr;
  window.currentStoryId = id;
  window.currentStoryTitle = s.title || 'סיפור';

  let _bmPage = 0;
  try {
    const _bms = JSON.parse(localStorage.getItem('story_bookmarks_v1') || '{}');
    const _b = _bms[id];
    const _p = (_b && typeof _b === 'object') ? _b.page : _b;
    if (_p != null) {
      const parsed = parseInt(_p, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < storyPagesArr.length) _bmPage = parsed;
    }
  } catch (e) {}
  window.currentStoryPage = _bmPage;

  // תמונות ממוזערות לכל עמוד
  const thumbsHTML = storyPagesArr.map((pg, idx) => {
    const inner = pg.type === 'text'
      ? `<div class="story-thumb-text" style="width:100%; height:100%; font-size:9px; font-weight:700; padding:3px; overflow:hidden; box-sizing:border-box; background:#fff; color:#333; text-align:center;">${escHtml((pg.text || '').slice(0, 40))}</div>`
      : `<img src="${escHtml(pg.url)}" style="width:100%; height:100%; object-fit:cover; display:block;">`;
    return `<div class="story-page-thumb${idx === _bmPage ? ' active' : ''}" data-idx="${idx}" onclick="event.stopPropagation(); storyGoToPage(${idx})" style="width:54px; height:54px; border-radius:8px; overflow:hidden; cursor:pointer; border:2px solid ${idx === _bmPage ? '#e11d48' : '#cbd5e1'}; flex-shrink:0; background:#fff;">${inner}</div>`;
  }).join('');

  const recommended = stories.filter(x => x && x.id !== id).slice(0, 3);
  const recHTML = recommended.map(r => `
    <div class="art-rec-card" onclick="event.stopPropagation(); storyOpenDetail('${artEsc(r.id)}')">
      <div class="art-rec-img">
        ${r.image ? `<img src="${escHtml(r.image)}" alt="">` : '<div class="art-card-img-placeholder"></div>'}
        <span class="art-rec-badge art-category-badge" style="background:${escHtml(r.categoryColor || '#8b5cf6')}">${escHtml(r.category)}</span>
      </div>
      <div class="art-rec-text">
        <h4>${escHtml(r.title)}</h4>
        <div class="art-rec-meta">${escHtml(r.author)} · ${escHtml(r.timestamp)}</div>
      </div>
    </div>
  `).join('');

  const json = encodeURIComponent(JSON.stringify(stories));

  // סיפור טקסט בלבד בעל עמוד יחיד
  const isTextStory = storyPagesArr.length > 0 && storyPagesArr.every(p => p.type === 'text');
  if (isTextStory && storyPagesArr.length === 1) {
    const _fullText = storyPagesArr.map(p => p.text || '').join('\n\n');
    const _paras = _fullText.split(/\n+/).map(t => t.trim()).filter(Boolean);
    const _words = _fullText.split(/\s+/).filter(Boolean).length;
    const _readMin = Math.max(1, Math.round(_words / 180));
    const _tags = (Array.isArray(s.tags) && s.tags.length) ? s.tags : (s.category ? [s.category] : []);
    const _tagChips = _tags.map(t => `<span class="story-article-tag">${escHtml(t)}</span>`).join('');
    mainContent.innerHTML = `
      <div class="art-detail articles-page stories-page story-article-page" data-story-kind="${_srcKind}" data-story-id="${id}" data-stories-json="${json}">
        <div class="art-detail-inner">
          <button class="art-back-btn" onclick="storyGoBack()" style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; padding:6px 14px; font-weight:700; cursor:pointer;">← חזרה לסיפורים</button>
          <article class="story-article" style="margin-top:16px;">
            <h1 class="story-article-title">${escHtml(s.title || '')}</h1>
            <div class="story-article-rule"></div>
            <div class="story-article-meta" style="margin-bottom:14px; color:#64748b;">
              <span>🗓️ ${escHtml(s.timestamp || '')}</span>
              <span>⏱️ זמן קריאה: ${_readMin} דקות</span>
              <span>✍️ מאת <b>${escHtml(s.author || '')}</b></span>
            </div>
            ${_tagChips ? `<div class="story-article-tags">${_tagChips}</div>` : ''}
            ${storyLinkedChipHTML(s)}
            <div class="story-article-body" id="story-article-body" style="font-size:17px; line-height:1.75; color:#1e293b;">${_paras.map(p => `<p>${escHtml(p).replace(/\n/g, '<br>')}</p>`).join('')}</div>
          </article>
          ${(typeof storyCommentsSectionHTML === 'function') ? storyCommentsSectionHTML(id) : ''}
          <div class="art-rec-section" style="margin-top:36px;">
            <h3 style="margin:0 0 16px; font-size:17px; font-weight:800;">סיפורים נוספים שיעניינו אותך</h3>
            <div class="art-rec-grid">${recHTML}</div>
          </div>
        </div>
      </div>
    `;
    if (typeof subscribeStoryComments === 'function') subscribeStoryComments(id);
    detailScrollTop();
    return;
  }

  const viewerHTML = `
    <div class="story-viewer" style="background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:20px; margin-bottom:24px; box-shadow:0 4px 20px rgba(0,0,0,0.04); position:relative;">
      <div class="story-frame">
        <div class="story-page-view" id="story-page-view" style="min-height:360px; background:#fafafa; border:1px solid #f0f0f0; border-radius:12px; display:flex; align-items:center; justify-content:center; overflow:hidden;"></div>
      </div>
      
      ${storyPagesArr.length > 1 ? `
      <div class="story-viewer-nav" style="display:flex; align-items:center; justify-content:center; gap:16px; margin-top:16px; direction:ltr;">
        <button type="button" class="story-nav-btn" id="story-prev-btn" onclick="event.stopPropagation(); storyPrevPage()" title="הקודם" style="width:38px; height:38px; border-radius:50%; background:#3b82f6; color:#fff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        
        <div class="story-page-thumbs" style="display:flex; gap:8px; overflow-x:auto; padding:4px; max-width:80%;">${thumbsHTML}</div>
        
        <button type="button" class="story-nav-btn" id="story-next-btn" onclick="event.stopPropagation(); storyNextPage()" title="הבא" style="width:38px; height:38px; border-radius:50%; background:#3b82f6; color:#fff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="story-page-counter" id="story-page-counter" style="text-align:center; color:#64748b; font-size:13px; font-weight:700; margin-top:8px;">${_bmPage + 1} / ${storyPagesArr.length}</div>
      ` : ''}
    </div>`;

  mainContent.innerHTML = `
    <div class="art-detail articles-page stories-page" data-story-kind="${escHtml(_srcKind)}" data-story-id="${escHtml(id)}" data-stories-json="${json}">
      <div class="art-detail-inner">
        <div class="story-detail-head" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
          <button class="art-back-btn" onclick="storyGoBack()" style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; padding:6px 14px; font-weight:700; cursor:pointer;">← חזרה לסיפורים</button>
          <div class="story-detail-titlewrap" style="text-align:center;">
            <h1 class="art-detail-title" style="margin:0; font-size:22px; font-weight:900;">${escHtml(s.title || '')}</h1>
            <div class="art-meta" style="margin-top:4px; font-size:13px; color:#64748b; display:flex; align-items:center; justify-content:center; gap:8px;">
              <span class="art-category-badge" style="background:${escHtml(s.categoryColor || '#8b5cf6')}; padding:2px 8px; border-radius:4px; color:#fff; font-size:11px; font-weight:700;">${escHtml(s.category || 'כללי')}</span>
              <span>${escHtml(s.author || '')}</span>
              <span>·</span>
              <span>${escHtml(s.timestamp || '')}</span>
            </div>
          </div>
          <div style="width:100px;"></div>
        </div>

        ${storyLinkedChipHTML(s)}

        ${_comicDesc ? `<div class="story-comic-desc" style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#334155; text-align:right; white-space:pre-wrap; word-break:break-word;">${escHtml(_comicDesc)}</div>` : ''}

        ${viewerHTML}

        ${(typeof storyCommentsSectionHTML === 'function') ? storyCommentsSectionHTML(id) : ''}

        <div class="art-rec-section" style="margin-top:36px;">
          <h3 style="margin:0 0 16px; font-size:17px; font-weight:800;">סיפורים נוספים שיעניינו אותך</h3>
          <div class="art-rec-grid">${recHTML}</div>
        </div>
      </div>
    </div>
  `;

  if (typeof subscribeStoryComments === 'function') subscribeStoryComments(id);
  storyRenderPage();
  detailScrollTop();
}

// מציג את העמוד הנוכחי של הסיפור (תמונה או טקסט מודגש)
// בקרת גודל טקסט בכתבת סיפור (קטן/בינוני/גדול)
function storyArticleFont(level) {
  const body = document.getElementById('story-article-body');
  if (!body) return;
  const sizes = ['17px', '20px', '24px'];
  body.style.fontSize = sizes[level] || sizes[1];
  const wrap = body.closest('.story-article');
  if (wrap) wrap.querySelectorAll('.story-article-fontsize button').forEach((b, i) => b.classList.toggle('active', i === level));
}
window.storyArticleFont = storyArticleFont;

function storyRenderPage() {
  const view = document.getElementById('story-page-view');
  const pagesArr = window.storyPagesData || [];
  if (!view || !pagesArr.length) return;

  const idx = Math.max(0, Math.min(window.currentStoryPage || 0, pagesArr.length - 1));
  window.currentStoryPage = idx;

  const pg = pagesArr[idx];
  if (!pg) return;

  const isText = pg.type === 'text';
  view.classList.toggle('story-view-text', isText);
  view.classList.toggle('story-view-image', !isText);

  if (isText) {
    view.innerHTML = `
      <div class="story-page-inner" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; width:100%; box-sizing:border-box;">
        <div class="story-text-page" style="font-size:17px; font-weight:700; line-height:1.75; color:#1e293b; max-width:640px; text-align:center; word-break:break-word;">
          ${escHtml(pg.text || '').replace(/\n/g, '<br>')}
        </div>
      </div>`;
  } else {
    view.innerHTML = `
      <div class="story-page-inner" style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:12px; width:100%; box-sizing:border-box; gap:10px;">
        <img src="${escHtml(pg.url)}" class="story-img-page" style="max-width:100%; max-height:60vh; object-fit:contain; border-radius:10px; display:block; margin:0 auto; cursor:pointer;" onclick="artGalleryById('stories', window.currentStoryId, this.getAttribute('src'))">
        ${pg.caption ? `<div style="font-size:14px; font-weight:700; color:#475569; text-align:center; max-width:600px;">${escHtml(pg.caption)}</div>` : ''}
      </div>`;
  }
  view.scrollTop = 0;

  document.querySelectorAll('.story-page-thumb').forEach(t => {
    const tIdx = Number(t.dataset.idx);
    const isActive = (tIdx === idx);
    t.classList.toggle('active', isActive);
    t.style.borderColor = isActive ? '#e11d48' : '#cbd5e1';
  });

  const counter = document.getElementById('story-page-counter');
  if (counter) counter.textContent = `${idx + 1} / ${pagesArr.length}`;

  const prevBtn = document.getElementById('story-prev-btn');
  const nextBtn = document.getElementById('story-next-btn');
  if (prevBtn) prevBtn.disabled = (idx === 0);
  if (nextBtn) nextBtn.disabled = (idx === pagesArr.length - 1);

  // ממרכזים את התמונה הממוזערת הפעילה בתוך הפס בלבד — בלי לגלול את כל העמוד אליה
  const activeThumb = document.querySelector('.story-page-thumb.active');
  const strip = activeThumb && activeThumb.parentElement;
  if (strip && strip.scrollWidth > strip.clientWidth) {
    try {
      const sr = strip.getBoundingClientRect();
      const tr = activeThumb.getBoundingClientRect();
      strip.scrollLeft += (tr.left + tr.width / 2) - (sr.left + sr.width / 2);
    } catch (e) {}
  }
}

function storyGoToPage(i) {
  const pagesArr = window.storyPagesData || [];
  if (!pagesArr.length) return;
  const validIdx = Math.max(0, Math.min(i, pagesArr.length - 1));
  window.currentStoryPage = validIdx;
  storyRenderPage();
}
window.storyGoToPage = storyGoToPage;

// רמז גלילה: מציג "▼ גללו לעוד" כשיש תוכן להמשך ומסתיר בסוף
function storyUpdateScrollHint() {
  const view = document.getElementById('story-page-view');
  const hint = document.getElementById('story-scroll-hint');
  if (!view || !hint) return;
  const hasMore = view.scrollHeight > view.clientHeight + 8;
  const atTop = view.scrollTop <= 4;
  // מציג את חץ הגלילה רק בראש העמוד (כשעדיין לא גללו) ויש תוכן להמשך;
  // ברגע שגוללים מטה — נעלם.
  hint.hidden = !(hasMore && atTop);
}
window.storyUpdateScrollHint = storyUpdateScrollHint;

// סימון הנקודה שהקורא עצר בה — לוכד מילה/כמה מילים, נשמר ב"שמורים" וממשיך משם
function storyBookmarkHere() {
  const id = window.currentStoryId;
  if (!id) return;
  const arr = window.storyPagesData || [];
  const pg = arr[window.currentStoryPage || 0];
  let def = '';
  if (pg && pg.type === 'text') def = (pg.text || '').trim().split(/\s+/).slice(0, 5).join(' ');
  const snippet = prompt('לכד/י אות או כמה מילים מהמקום שעצרת — זה יופיע בשמורים כדי שתמצא/י בקלות:', def);
  if (snippet === null) return; // בוטל
  let bms = {};
  try { bms = JSON.parse(localStorage.getItem('story_bookmarks_v1') || '{}'); } catch (e) {}
  bms[id] = {
    page: window.currentStoryPage || 0,
    snippet: (snippet || '').trim().slice(0, 90),
    title: window.currentStoryTitle || 'סיפור',
    at: Date.now()
  };
  try { localStorage.setItem('story_bookmarks_v1', JSON.stringify(bms)); } catch (e) {}
  if (typeof showCopyToast === 'function') showCopyToast('🔖 נשמר בשמורים! תמצא/י שם ותמשיך מכאן');
}
window.storyBookmarkHere = storyBookmarkHere;

// פתיחת סיפור מסימנייה שבשמורים (חוזר לעמוד שסומן)
function openStoryBookmark(id) {
  if (typeof closeSavedModal === 'function') closeSavedModal();
  const sp = (typeof pages !== 'undefined' && Array.isArray(pages)) ? pages.find(p => p && ((p.content || '').includes('stories-page') || (p.title || '').includes('סיפורים'))) : null;
  if (sp) { window.__detailOpen = false; activePageId = sp.id; if (typeof renderTopNav === 'function') renderTopNav(); if (typeof renderPage === 'function') renderPage(); }
  setTimeout(() => { if (typeof storyOpenDetail === 'function') storyOpenDetail(id); }, 90);
}
window.openStoryBookmark = openStoryBookmark;

// HTML של סימניות הסיפורים לתצוגה ב"שמורים"
function storyBookmarksHTML() {
  let bms = {};
  try { bms = JSON.parse(localStorage.getItem('story_bookmarks_v1') || '{}'); } catch (e) {}
  const entries = Object.entries(bms).filter(([id, b]) => b && typeof b === 'object');
  if (!entries.length) return '';
  entries.sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
  const items = entries.map(([id, b]) => `
    <div class="story-bm-cell" onclick="openStoryBookmark('${artEsc(id)}')" title="חזרה לסיפור">
      <div class="story-bm-icon">🔖</div>
      <div class="story-bm-main">
        <div class="story-bm-title">${escHtml(b.title || 'סיפור')} · עמוד ${(b.page || 0) + 1}</div>
        <div class="story-bm-snippet">${b.snippet ? '"' + escHtml(b.snippet) + '"' : 'המשך מהמקום שסימנת'}</div>
      </div>
      <button class="story-bm-del" onclick="event.stopPropagation(); storyRemoveBookmark('${artEsc(id)}')" title="הסר סימנייה">✕</button>
    </div>`).join('');
  return `<div class="story-bm-section"><div class="story-bm-head">🔖 הסימניות שלי בסיפורים</div>${items}</div>`;
}
window.storyBookmarksHTML = storyBookmarksHTML;

function storyRemoveBookmark(id) {
  let bms = {};
  try { bms = JSON.parse(localStorage.getItem('story_bookmarks_v1') || '{}'); } catch (e) {}
  delete bms[id];
  try { localStorage.setItem('story_bookmarks_v1', JSON.stringify(bms)); } catch (e) {}
  if (typeof openSavedModal === 'function') openSavedModal();
}
window.storyRemoveBookmark = storyRemoveBookmark;

function storyGoBack() {
  window.__detailOpen = false;
  // אם הגענו לפריט מעמוד הבית (שורות מתחלפות) — חוזרים לעמוד הבית ולא לעמוד סיפורים
  if (activePageId === 'page-home-feed' && typeof renderPage === 'function') {
    renderPage();
    if (isEditMode) applyEditModeToContent();
    return;
  }
  const container = mainContent.querySelector('.stories-page');
  if (!container) return;
  let stories = [];
  try { stories = JSON.parse(decodeURIComponent(container.dataset.storiesJson)); } catch(e){}
  mainContent.innerHTML = buildStoriesPage(stories, storyGetCurrentKind());
  if (isEditMode) applyEditModeToContent();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function storyGetStories() {
  const container = mainContent.querySelector('.stories-page');
  if (!container) return [];
  try { return JSON.parse(decodeURIComponent(container.dataset.storiesJson)); } catch(e){ return []; }
}

// הסוג של עמוד הסיפורים הנוכחי (קומיקס/סיפורים). קריטי לשמור בבנייה-מחדש,
// אחרת התוכן הופך ל"קומיקס" כברירת מחדל, מתנגש בעמוד הקומיקס, ומחיקת-הכפולים מוחקת אותו.
function storyGetCurrentKind() {
  try {
    const el = mainContent.querySelector('.stories-page:not(.photos-stories-feed)');
    return (el && el.getAttribute('data-story-kind')) || 'comics';
  } catch (e) { return 'comics'; }
}

function storyDelete(id, el) {
  if (!isEditMode) return;
  if (!confirm('האם למחוק סיפור זה?')) return;
  removeItemFromStoredPages(id);
  const onHome = !!mainContent.querySelector('.home-feed-page');
  if (onHome) { if (typeof renderPage === 'function') renderPage(); return; }
  const stories = storyGetStories().filter(s => s.id !== id);
  mainContent.innerHTML = buildStoriesPage(stories, storyGetCurrentKind());
  saveCurrentPageContent();
}

function storySearch(val) {
  if (typeof logSearchQuery === 'function' && val) {
    logSearchQuery(val, 'סיפורים');
  }
  // מאחד חיפוש + סינון קטגוריה; העימוד מציג את התוצאות
  artPageState.stories = 1;
  storyApplyFilters();
}

function storyNextPage() {
  const arr = window.storyPagesData || [];
  if (!arr.length) return;
  window.currentStoryPage = Math.min((window.currentStoryPage || 0) + 1, arr.length - 1);
  storyRenderPage();
}
window.storyNextPage = storyNextPage;

function storyPrevPage() {
  const arr = window.storyPagesData || [];
  if (!arr.length) return;
  window.currentStoryPage = Math.max((window.currentStoryPage || 0) - 1, 0);
  storyRenderPage();
}
window.storyPrevPage = storyPrevPage;

// ניווט בעמודי הסיפור עם מקשי החצים במקלדת (שמאלה=הבא, ימינה=הקודם — תואם RTL)
if (typeof document !== 'undefined' && !window._storyKeyNavAttached) {
  window._storyKeyNavAttached = true;
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (!document.getElementById('story-page-view')) return;            // רק כשצופה הסיפור פתוח
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return; // לא להפריע להקלדה
    if (!window.storyPagesData || window.storyPagesData.length < 2) return;
    e.preventDefault();
    if (e.key === 'ArrowLeft') storyNextPage(); else storyPrevPage();
  });
}

function updateStoryPageDisplay() {
  const spreads = document.querySelectorAll('.story-spread');
  spreads.forEach((spread, i) => {
    spread.style.display = i === window.currentStoryPage ? 'flex' : 'none';
  });
  const counter = document.getElementById('story-page-counter');
  if (counter) counter.textContent = `${window.currentStoryPage + 1} / ${window.storyPages.length}`;
  const prevBtn = document.getElementById('story-prev-btn');
  const nextBtn = document.getElementById('story-next-btn');
  if (prevBtn) prevBtn.disabled = window.currentStoryPage === 0;
  if (nextBtn) nextBtn.disabled = window.currentStoryPage === window.storyPages.length - 1;
}

// רשימת תמונות הסיפור לפי סדר. הראשונה (אינדקס 0) היא התמונה הראשית.
let storyImageList = [];
// מספר השורות המרבי בעמוד טקסט של סיפור (כדי שלא יהיה מגושם)
const STORY_MAX_LINES = 20;

// מזהה הסיפור שנמצא כרגע בעריכה; null = יצירת סיפור חדש
let storyEditingId = null;

// מצייר את עורך התמונות: תצוגה מקדימה לכל תמונה עם כפתורי הזזה והסרה.
// המיכל הוא LTR, ולכן אינדקס 0 בשמאל: ◀ מקדים (לכיוון הראשית), ▶ מאחר.
// ממיר פריט ישן (מחרוזת URL) לאובייקט עמוד; שומר על תאימות לאחור
function _storyNormalizePage(p) {
  if (p && typeof p === 'object') return p;
  return { type: 'image', url: p };
}

function renderStoryImagesEditor() {
  const box = document.getElementById('story-images-editor');
  if (!box) return;
  storyImageList = storyImageList.map(_storyNormalizePage);
  if (!storyImageList.length) {
    box.innerHTML = '<div style="font-size:12px; color:#999;">אין עמודים עדיין — הוסיפו עמוד תמונה או עמוד טקסט למטה.</div>';
    return;
  }
  const last = storyImageList.length - 1;
  box.innerHTML = storyImageList.map((pg, i) => {
    const moveBtns = `
      <div style="display:flex; gap:3px; flex-shrink:0;">
        <button type="button" onclick="storyMoveImage(${i}, -1)" title="העבר למעלה" ${i === 0 ? 'disabled' : ''} style="border:1px solid #ddd; background:#fff; border-radius:5px; width:26px; height:26px; cursor:pointer; font-size:12px;${i === 0 ? 'opacity:0.35; cursor:default;' : ''}">▲</button>
        <button type="button" onclick="storyMoveImage(${i}, 1)" title="העבר למטה" ${i === last ? 'disabled' : ''} style="border:1px solid #ddd; background:#fff; border-radius:5px; width:26px; height:26px; cursor:pointer; font-size:12px;${i === last ? 'opacity:0.35; cursor:default;' : ''}">▼</button>
        <button type="button" onclick="storyRemoveImage(${i})" title="הסר עמוד" style="border:1px solid #fca5a5; color:#dc2626; background:#fff; border-radius:5px; width:26px; height:26px; cursor:pointer; font-size:12px;">✕</button>
      </div>`;
    const badge = `<span style="background:${pg.type === 'text' ? '#8b5cf6' : '#3b82f6'}; color:#fff; font-size:10px; font-weight:800; padding:2px 8px; border-radius:6px;">עמוד ${i + 1} · ${pg.type === 'text' ? 'טקסט 📝' : 'תמונה 🖼️'}</span>`;
    const _ln = (pg.type === 'text') ? (pg.text || '').split('\n').length : 0;
    const _over = _ln > STORY_MAX_LINES;
    const _cntTxt = _over ? (_ln + ' שורות · יתחלק אוטומטית ל-' + Math.ceil(_ln / STORY_MAX_LINES) + ' עמודים') : (_ln + ' / ' + STORY_MAX_LINES + ' שורות');
    const _cntColor = _over ? '#2563eb' : (_ln >= STORY_MAX_LINES ? '#dc2626' : '#64748b');
    const inner = pg.type === 'text'
      ? `<textarea id="story-txt-${i}" oninput="storySetPageText(${i}, this.value)" placeholder="כתבו את הטקסט... (מעל ${STORY_MAX_LINES} שורות יתחלק אוטומטית לעמודים)" style="width:100%; min-height:120px; padding:8px 10px; border:1px solid #ddd; border-radius:8px; font-size:14px; font-weight:700; line-height:1.7; resize:vertical; box-sizing:border-box;">${escHtml(pg.text || '')}</textarea>
         <div id="story-txt-count-${i}" style="font-size:11px; font-weight:800; text-align:left; margin-top:3px; color:${_cntColor};">${_cntTxt}</div>`
      : `<img src="${escHtml(pg.url)}" style="width:70px; height:70px; object-fit:cover; border-radius:8px; border:1px solid #ddd; display:block;">`;
    return `
      <div style="border:1px solid #eee; border-radius:10px; padding:8px; background:#fafafa;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px;">
          ${badge}
          ${moveBtns}
        </div>
        ${inner}
      </div>`;
  }).join('');
}

function storySetPageText(i, val) {
  if (storyImageList[i]) storyImageList[i] = { type: 'text', text: val };
  const c = document.getElementById('story-txt-count-' + i);
  if (c) { c.textContent = String(val).split('\n').length + ' שורות'; c.style.color = '#64748b'; }
}
window.storySetPageText = storySetPageText;

function storyMoveImage(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= storyImageList.length) return;
  const t = storyImageList[i]; storyImageList[i] = storyImageList[j]; storyImageList[j] = t;
  renderStoryImagesEditor();
}
window.storyMoveImage = storyMoveImage;

function storyRemoveImage(i) {
  storyImageList.splice(i, 1);
  renderStoryImagesEditor();
}
window.storyRemoveImage = storyRemoveImage;

function openStoryModal() {
  if (!isEditMode) return;
  syncStoryCategorySelect();
  storyEditingId = null;
  const h = document.getElementById('story-modal-title');
  if (h) h.textContent = 'הוספת סיפור חדש';
  const saveBtn = document.getElementById('story-save');
  if (saveBtn) saveBtn.textContent = 'שמור סיפור';
  document.getElementById('story-title').value = '';
  document.getElementById('story-summary').value = '';
  document.getElementById('story-body').value = '';
  document.getElementById('story-author').value = '';
  if (document.getElementById('story-category')) document.getElementById('story-category').value = STORY_CATEGORIES[0] || 'כללי';
  document.getElementById('story-link').value = '';
  populateStoryLinkedSelect(null, '');
  storyImageList = [];
  renderStoryImagesEditor();
  document.getElementById('story-modal').style.display = 'flex';
}

// פותח את חלון הסיפור עם הנתונים הקיימים לעריכה (מנהל בלבד)
function openStoryEditModal(id) {
  if (!isEditMode) return;
  syncStoryCategorySelect();
  const s = storyGetStories().find(x => x.id === id);
  if (!s) return;
  storyEditingId = id;

  const h = document.getElementById('story-modal-title');
  if (h) h.textContent = 'עריכת סיפור';
  const saveBtn = document.getElementById('story-save');
  if (saveBtn) saveBtn.textContent = 'עדכן סיפור';

  document.getElementById('story-title').value = s.title || '';
  document.getElementById('story-summary').value = s.summary || '';
  document.getElementById('story-body').value = s.body || '';
  document.getElementById('story-author').value = s.author || '';
  if (document.getElementById('story-category')) document.getElementById('story-category').value = s.category || STORY_CATEGORIES[0] || 'כללי';
  document.getElementById('story-link').value = s.link || '';
  populateStoryLinkedSelect(id, s.linkedId || '');

  // טוענים את העמודים הקיימים (תמונה/טקסט). אם אין pages — ממירים מהתמונות הישנות
  if (s.pages && s.pages.length) {
    storyImageList = s.pages.map(_storyNormalizePage);
  } else {
    storyImageList = ((s.images && s.images.length) ? s.images.filter(Boolean) : (s.image ? [s.image] : [])).map(u => ({ type: 'image', url: u }));
  }
  renderStoryImagesEditor();

  document.getElementById('story-modal').style.display = 'flex';
}
window.openStoryEditModal = openStoryEditModal;

// הוספת תמונה חדשה לרשימה (בסוף)
const storyAddImageBtn = document.getElementById('story-add-image');
if (storyAddImageBtn) {
  storyAddImageBtn.addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      artCompressImage(f).then(data => {
        if (data) { storyImageList.push({ type: 'image', url: data }); renderStoryImagesEditor(); }
      });
    };
    inp.click();
  });
}

// הוספת עמוד טקסט
const storyAddTextBtn = document.getElementById('story-add-text');
if (storyAddTextBtn) {
  storyAddTextBtn.addEventListener('click', () => {
    storyImageList.push({ type: 'text', text: '' });
    renderStoryImagesEditor();
    // מיקוד על ה-textarea החדש
    setTimeout(() => {
      const box = document.getElementById('story-images-editor');
      const areas = box ? box.querySelectorAll('textarea') : [];
      if (areas.length) areas[areas.length - 1].focus();
    }, 30);
  });
}

document.getElementById('story-cancel').addEventListener('click', () => {
  storyEditingId = null;
  document.getElementById('story-modal').style.display = 'none';
});

document.getElementById('story-save').addEventListener('click', () => {
  const title = document.getElementById('story-title').value.trim();
  if (!title) { alert('חובה כותרת'); return; }

  // עמודי הסיפור לפי הסדר בעורך (תמונה/טקסט). שומרים גם images/image לתאימות לאחור ולתצוגה בכרטיסים
  let storyPages = storyImageList
    .map(_storyNormalizePage)
    .filter(p => p && ((p.type === 'image' && p.url) || (p.type === 'text' && (p.text || '').trim())));
  // חלוקה אוטומטית: עמוד טקסט ארוך מתפצל לכמה עמודים (100 שורות → 5 עמודים)
  if (typeof splitStoryTextPages === 'function') storyPages = splitStoryTextPages(storyPages);
  const storyImages = storyPages.filter(p => p.type === 'image').map(p => p.url);
  const firstImage = storyImages[0] || '';

  const data = {
    title,
    summary: document.getElementById('story-summary').value.trim(),
    body: document.getElementById('story-body').value.trim(),
    author: document.getElementById('story-author').value.trim(),
    category: document.getElementById('story-category').value.trim(),
    categoryColor: '#8b5cf6',
    image: firstImage,
    images: storyImages,
    pages: storyPages,
    link: document.getElementById('story-link').value.trim(),
    linkedId: (document.getElementById('story-linked') ? document.getElementById('story-linked').value.trim() : '')
  };

  const stories = storyGetStories();
  if (storyEditingId) {
    // עריכה: מעדכנים את הסיפור הקיים ושומרים id, תאריך ונעיצה
    const idx = stories.findIndex(x => x.id === storyEditingId);
    if (idx >= 0) stories[idx] = { ...stories[idx], ...data };
    storyEditingId = null;
  } else {
    stories.unshift({ id: 's' + Date.now(), ...data, timestamp: new Date().toLocaleDateString('he-IL') });
  }
  mainContent.innerHTML = buildStoriesPage(stories, storyGetCurrentKind());
  saveCurrentPageContent();
  document.getElementById('story-modal').style.display = 'none';
});

const btnAddStoriesPage = document.getElementById('btn-add-stories-page');
if (btnAddStoriesPage) {
  btnAddStoriesPage.addEventListener('click', () => {
    const title = prompt('שם העמוד של הסיפורים:') || 'סיפורים';
    const newId = 'page-' + Date.now();
    pages.push({ id: newId, title: title.trim(), content: buildStoriesPage(STORIES_SAMPLES) });
    topNavPages.push(newId);
    activePageId = newId;
    saveToStorage();
    renderSideMenu();
    renderTopNav();
    renderPage();
  });
}

const btnAddCommunityPage = document.getElementById('btn-add-community-page');
if (btnAddCommunityPage) {
  btnAddCommunityPage.addEventListener('click', () => {
    const title = prompt('שם עמוד הקהילה:') || 'קהילה';
    const newId = 'page-' + Date.now();
    pages.push({ id: newId, title: title.trim(), content: `<div class="articles-page community-page" data-page-id="${newId}"></div>` });
    topNavPages.push(newId);
    activePageId = newId;
    saveToStorage();
    renderSideMenu();
    renderTopNav();
    renderPage();
  });
}

// ============================================================
// דחיסת תמונות לפני שמירה (Image Compression)
// ============================================================
// תמונות נשמרות כ-base64 בתוך הנתונים המסונכרנים ל-Firebase. קובץ גולמי
// של כמה מגה-בייט הופך למחרוזת ענקית שמנפחת את הבלוב, מאיטה את האתר,
// גורמת לו לקרוס, ולעיתים נכשלת בכתיבה ל-Firebase — ואז ההעלאה גם לא
// מגיעה למכשירים אחרים. דחיסה לרוחב/גובה סביר ואיכות JPEG חוסכת פי 10-20.
function artCompressImage(file, maxDim = 1600, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file) { resolve(''); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      // GIF מונפש יאבד את ההנפשה בדחיסה — משאירים אותו כמו שהוא
      if (file.type === 'image/gif') { resolve(src); return; }
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (!w || !h) { resolve(src); return; }
        if (w > maxDim || h > maxDim) {
          if (w >= h) { h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        try {
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const out = canvas.toDataURL('image/jpeg', quality);
          // אם משום מה היצוא גדול מהמקור, עדיף לשמור את המקור
          resolve(out && out.length < src.length ? out : src);
        } catch (e) {
          resolve(src);
        }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}
window.artCompressImage = artCompressImage;

// ============================================================
// מערכת עימוד לגרידים (Pagination)
// ============================================================
// הגריד מציג 4 כרטיסים בשורה ו-5 שורות = 20 פריטים בעמוד.
// כל הפריטים נשארים ב-DOM (כדי שהחיפוש והסינון יעבדו על כולם),
// והעימוד רק מחליט אילו מהם מוצגים.

const ART_PAGE_SIZE = 20;
const artPageState = { photos: 1, stories: 1 };

function artApplyPagination(container, key) {
  if (!container || !container.querySelector('.art-rows')) return;

  if (key === 'photos') {
    const rows = Array.from(container.querySelectorAll('.art-row'));
    rows.forEach(r => {
      const show = r.dataset.artMatch !== '0';
      r.style.display = show ? '' : 'none';
    });
    const bar = container.querySelector('.art-pagination');
    if (bar) { bar.innerHTML = ''; bar.style.display = 'none'; }
    return;
  }

  const rows = Array.from(container.querySelectorAll('.art-rows > .art-row'));
  // artMatch מסומן על ידי החיפוש והסינון; פריט בלי סימון נחשב תואם
  const matching = rows.filter(r => r.dataset.artMatch !== '0');
  const totalPages = Math.max(1, Math.ceil(matching.length / ART_PAGE_SIZE));

  let page = artPageState[key] || 1;
  page = Math.min(Math.max(page, 1), totalPages);
  artPageState[key] = page;

  rows.forEach(r => { r.style.display = 'none'; });
  const start = (page - 1) * ART_PAGE_SIZE;
  matching.slice(start, start + ART_PAGE_SIZE).forEach(r => { r.style.display = ''; });

  const bar = container.querySelector('.art-pagination');
  if (!bar) return;
  if (totalPages <= 1) {
    bar.innerHTML = '';
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'flex';

  // חלון מספרים מצומצם כדי שהסרגל לא יתארך בלי סוף
  const nums = [];
  const from = Math.max(1, Math.min(page - 2, totalPages - 4));
  const to = Math.min(totalPages, Math.max(page + 2, 5));
  if (from > 1) nums.push(1, '…');
  for (let i = from; i <= to; i++) nums.push(i);
  if (to < totalPages) nums.push('…', totalPages);

  let html = `<button class="art-page-btn art-page-nav" ${page === 1 ? 'disabled' : ''} onclick="artGoToPage('${key}', ${page - 1})">הקודם</button>`;
  nums.forEach(n => {
    if (n === '…') {
      html += `<span class="art-page-gap">…</span>`;
    } else {
      html += `<button class="art-page-btn${n === page ? ' active' : ''}" onclick="artGoToPage('${key}', ${n})">${n}</button>`;
    }
  });
  html += `<button class="art-page-btn art-page-nav" ${page === totalPages ? 'disabled' : ''} onclick="artGoToPage('${key}', ${page + 1})">הבא</button>`;
  bar.innerHTML = html;
}

function artGoToPage(key, page) {
  artPageState[key] = page;
  artSyncPagination();
  const container = mainContent.querySelector(key === 'photos' ? '.photos-page' : '.stories-page');
  const anchor = container && container.querySelector('.art-section-title');
  if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
window.artGoToPage = artGoToPage;

let artPagObserver = null;

// כל בניית עמוד דורסת את ה-HTML מחדש ממקומות רבים בקוד, ולכן במקום
// לקרוא לעימוד בכל אתר קריאה בנפרד מסנכרנים אותו אחרי כל שינוי ב-DOM
function artSyncPagination() {
  if (typeof mainContent === 'undefined' || !mainContent) return;
  if (artPagObserver) artPagObserver.disconnect();
  try {
    artApplyPagination(mainContent.querySelector('.photos-page'), 'photos');
    artApplyPagination(mainContent.querySelector('.stories-page'), 'stories');
  } finally {
    if (artPagObserver) artPagObserver.observe(mainContent, { childList: true, subtree: true });
  }
}
window.artSyncPagination = artSyncPagination;

function artInitPaginationObserver() {
  if (artPagObserver || typeof mainContent === 'undefined' || !mainContent) return;
  artPagObserver = new MutationObserver(() => artSyncPagination());
  artPagObserver.observe(mainContent, { childList: true, subtree: true });
  artSyncPagination();
}

artInitPaginationObserver();

// ============================================================
// מערכת תמונות / גלריות (Photos System)
// ============================================================

const PHOTOS_SAMPLES = [
  {
    id: 'ph1',
    title: 'Apex Luxury - אתר תדמית ויוקרה כהה',
    summary: 'עיצוב פרימיום כהה בגימור יוקרתי, מתאים לעסקים, יועצים, מותגי יוקרה וסוכנויות.',
    images: [
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
      'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80'
    ],
    author: 'סטודיו אופק', category: 'אתר תדמית', categoryColor: '#8b5cf6', timestamp: 'עודכן היום', verified: true
  },
  {
    id: 'ph2',
    title: 'Nova Store - חנות אופנה ודיגיטל מודרנית',
    summary: 'חנות אונליין מלאה עם קטלוג מוצרים, עגלת קניות, סינון מוצרים וממשק רספונסיבי מרהיב.',
    images: [
      'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&q=80',
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
      'https://images.unsplash.com/photo-1526178613552-2b45c6c302f0?w=800&q=80'
    ],
    author: 'קולקציית הבוטיק', category: 'חנות E-Commerce', categoryColor: '#ec4899', timestamp: 'עודכן היום'
  },
  {
    id: 'ph3',
    title: 'Zenith SaaS - דף נחיתה להמרות גבוהות',
    summary: 'דף נחיתה מודרני לאפליקציות, שירותים דיגיטליים ומוצרים עם הנעה חזקה לפעולה.',
    images: [
      'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&q=80',
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80'
    ],
    author: 'נקסט טק', category: 'דף נחיתה', categoryColor: '#10b981', timestamp: 'חדש', verified: true
  },
  {
    id: 'ph4',
    title: 'Pulse Media - אתר תוכן, מגזין ומדיה',
    summary: 'פורטל תוכן דינמי הכולל כתבות, גלריות תמונות, סיפורים, וידאו וקהילה חיה.',
    images: [
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80',
      'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80'
    ],
    author: 'מגזין פולס', category: 'מדיה ותוכן', categoryColor: '#3b82f6', timestamp: 'חדש'
  },
  {
    id: 'ph5',
    title: 'Vibe Agency - אתר פורטפוליו לסוכנויות ויוצרים',
    summary: 'פורטפוליו קריאטיבי עם גלריית עבודות מרהיבה, אנימציות חלקות והצגת פרויקטים.',
    images: [
      'https://images.unsplash.com/photo-1542744094-3a31b272c390?w=800&q=80',
      'https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=800&q=80'
    ],
    author: 'וייב דיזיין', category: 'פורטפוליו', categoryColor: '#f59e0b', timestamp: 'עודכן השבוע'
  }
];

// סרגל הסינון: קו מפריד ומתחתיו שלושה כפתורים — מין, גיל, מיקום.
// לחיצה על אחד מהם פותחת את האפשרויות שלו *במקום* שלושת הכפתורים,
// ובחירה מחזירה אותם עם הערך שנבחר מוצג על הכפתור.
// המצב חי מחוץ ל-buildPhotosPage ולכן שורד בנייה מחדש של העמוד.
function photoCurrentFilter(kind) {
  if (kind === 'general') {
    return (typeof pfActivePage === 'function' && pfActivePage() === 'stories') ? currentStoryGeneralFilter : currentPhotoGeneralFilter;
  }
  if (kind === 'category') return currentPhotoCategoryFilter;
  if (kind === 'age') return currentPhotoAgeFilter;
  if (kind === 'date') return currentPhotoDateFilter;
  return currentPhotoRegionFilter;
}

function photoFilterBarHTML() {
  const isStories = (typeof pfActivePage === 'function' && pfActivePage() === 'stories');
  const availableGroups = isStories
    ? PHOTO_FILTER_GROUPS.filter(g => g.kind === 'general' || g.kind === 'date')
    : PHOTO_FILTER_GROUPS;

  const curCols = isStories ? (typeof storyGridCols !== 'undefined' ? storyGridCols : 3) : photoGridCols;

  // בורר גודל (מספר עמודות) — פתיחה באותו סגנון כמו שאר הפילטרים
  if (photoOpenFilterGroup === 'size') {
    return `
      <div class="photo-filter-bar is-open" data-open="size">
        <button type="button" class="photo-filter-back" onclick="photoToggleFilterGroup(null)" title="סגור">✕</button>
        <span class="photo-filter-label">גודל</span>
        <div class="photo-filter-group" data-kind="size">
          ${[4, 3, 2].map(n => `
            <button type="button"
                    class="photo-tab-btn${curCols === n ? ' active' : ''}"
                    onclick="${isStories ? `storySetGridSize(${n})` : `photoSetGridSize(${n})`}">${n}</button>
          `).join('')}
        </div>
      </div>
    `;
  }

  const open = availableGroups.find(g => g.kind === photoOpenFilterGroup);

  if (open) {
    const current = photoCurrentFilter(open.kind);
    return `
      <div class="photo-filter-bar is-open" data-open="${open.kind}">
        <button type="button" class="photo-filter-back" onclick="photoToggleFilterGroup(null)" title="סגור">✕</button>
        <span class="photo-filter-label">${escHtml(open.label)}</span>
        <div class="photo-filter-group" data-kind="${open.kind}">
          ${open.values.map(v => `
            <button type="button"
                    class="photo-tab-btn${v === current ? ' active' : ''}"
                    onclick="photoSetFilter('${open.kind}', '${artEsc(v)}', this)">${v}</button>
          `).join('')}
        </div>
      </div>
    `;
  }

  const anySet = availableGroups.some(g => photoCurrentFilter(g.kind) !== 'הכל');
  return `
    <div class="photo-filter-bar">
      ${availableGroups.map(g => {
        const cur = photoCurrentFilter(g.kind);
        const isSet = cur !== 'הכל';
        return `
          <button type="button" class="photo-filter-trigger${isSet ? ' has-value' : ''}"
                  onclick="photoToggleFilterGroup('${g.kind}')">
            <span class="photo-filter-trigger-label">${escHtml(g.label)}</span>
            ${isSet ? `<span class="photo-filter-trigger-value">${cur}</span>` : ''}
            <span class="photo-filter-caret" aria-hidden="true">▾</span>
          </button>
        `;
      }).join('')}
      <button type="button" class="photo-filter-trigger has-value" onclick="photoToggleFilterGroup('size')">
        <span class="photo-filter-trigger-label">גודל</span>
        <span class="photo-filter-trigger-value">${curCols}</span>
        <span class="photo-filter-caret" aria-hidden="true">▾</span>
      </button>
      ${anySet ? `<button type="button" class="photo-filter-clear" onclick="photoClearFilters()">נקה הכל</button>` : ''}
    </div>
  `;
}

// קו מפריד מעל הסרגל. הוא נשאר במקומו כשהסרגל מתחלף, כי מחליפים
// רק את .photo-filter-bar ולא את כל המקטע.
function photoFilterSectionHTML() {
  return `
    <div class="photo-filter-section">
      <div class="photo-filter-rule" aria-hidden="true"></div>
      ${photoFilterBarHTML()}
    </div>
  `;
}

function photoRenderFilterBar() {
  const bar = mainContent.querySelector('.photo-filter-bar');
  if (bar) bar.outerHTML = photoFilterBarHTML();
}

function photoToggleFilterGroup(kind) {
  photoOpenFilterGroup = (photoOpenFilterGroup === kind) ? null : kind;
  photoRenderFilterBar();
}
window.photoToggleFilterGroup = photoToggleFilterGroup;

function photoClearFilters() {
  // פאנל הצד (בחירה מרובה + טווח)
  photoSel.category = [];
  photoSel.region = [];
  photoSel.date = [];
  photoAgeMin = 18;
  photoAgeMax = 99;
  // שורת הצ׳יפים העליונה (בחירה יחידה)
  currentPhotoCategoryFilter = 'הכל';
  currentPhotoAgeFilter = 'הכל';
  currentPhotoRegionFilter = 'הכל';
  currentPhotoDateFilter = 'הכל';
  currentPhotoGeneralFilter = 'הכל';
  currentStoryGeneralFilter = 'הכל';
  photoOpenFilterGroup = null;
  // מרעננים את פאנל הסינונים של העמוד הפעיל כדי לאפס את כל תיבות הסימון
  const page = (typeof pfActivePage === 'function') ? pfActivePage() : 'photos';
  const box = mainContent.querySelector('.pf-box');
  if (box) box.outerHTML = buildFiltersSidebarBox(page);
  // מרעננים את שורת הצ׳יפים (בעמוד התמונות)
  if (typeof photoRenderFilterBar === 'function') photoRenderFilterBar();
  if (typeof pfApplyActive === 'function') pfApplyActive();
  else photoApplyFilters();
}
window.photoClearFilters = photoClearFilters;

function photoGetViews(id) {
  if (!id) return 0;
  try {
    return Number(localStorage.getItem(`photo_views_${id}`)) || 0;
  } catch(e) { return 0; }
}

function photoIncrementViews(id) {
  if (!id) return 0;
  try {
    const cur = photoGetViews(id);
    const updated = cur + 1;
    localStorage.setItem(`photo_views_${id}`, updated);
    if (typeof db !== 'undefined') {
      try { set(ref(db, `website/photo_albums/${id}/views`), updated); } catch(e){}
    }
    return updated;
  } catch(e) { return 1; }
}

function renderPhotoCard(p, options = {}) {
  const isPending = p.approved === false;
  if (!isEditMode && isPending) return '';

  const validImages = (p.images || []).filter(img => !!img);
  const mainImg = validImages[0] || '';
  const viewsCount = photoGetViews(p.id);
  const likesCount = p.likes || 0;
  const totalScore = likesCount + viewsCount;

  let miniThumbnailsHTML = '';
  if (validImages.length <= 1) {
    // העלאה עם תמונה בודדת — שומרים מקום (לבן) בגובה פס הריבועים כדי שהכפתורים
    // יתיישרו לאותו גובה כמו בהעלאה עם כמה תמונות (בקרוסלה האופקית).
    miniThumbnailsHTML = '<div class="photo-mini-thumbs-spacer" aria-hidden="true"></div>';
  }
  if (validImages.length > 1) {
    miniThumbnailsHTML = `
      <div class="photo-mini-thumbs" style="display: flex; align-items: center; justify-content: center; gap: 4px; margin-top: 6px; width: 100%; direction: ltr;">
        <div class="photo-mini-thumbs-list" style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap; flex: 1; min-width: 0;">
          ${validImages.map((imgUrl, idx) => `
            <div class="photo-mini-thumb"
                 onclick="event.stopPropagation(); photoSelectRowImage('${artEsc(p.id)}', '${artEsc(imgUrl)}', this)"
                 style="width: 22px; height: 22px; border-radius: 4px; overflow: hidden; cursor: pointer; border: 1.5px solid ${idx === 0 ? '#e11d48' : '#ddd'}; transition: all 0.2s; background: #eee; flex-shrink:0;">
              <img src="${escHtml(imgUrl)}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  const searchText = escHtml([p.title, p.summary, p.author, p.category].filter(Boolean).join(' '));

  const cardLink = (url, label, iconPath, extraPath) => {
    const svg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><path d="${iconPath}"/>${extraPath || ''}</svg>`;
    if (url) {
      if (label === 'אימייל') {
        return `
          <button type="button" onclick="revealAndCopyEmail('${artEsc(url)}', this, event);" class="art-telegram-btn" title="לחץ לחשיפת והעתקת אימייל">
            ${svg}<span>${label}</span>
          </button>
        `;
      }
      return `
        <a href="${escHtml(safeUrl(url))}" target="_blank" onclick="event.stopPropagation();" class="art-telegram-btn">
          ${svg}<span>${label}</span>
        </a>
      `;
    }
    return `
      <span class="art-telegram-btn is-disabled" onclick="event.stopPropagation();" aria-disabled="true">
        ${svg}<span>${label}</span>
      </span>
    `;
  };

  const isLikedCard = photoIsLikedLocal(p.id);
  // לב מוטבע בפינת התמונה (כמו בהפניה) — מחליף את כפתור הלייק בשורת הכפתורים
  const cardHeartOverlay = `
    <button type="button" class="art-heart-overlay${isLikedCard ? ' liked' : ''}" onclick="event.stopPropagation(); photoToggleLike('${artEsc(p.id)}')" title="לייק לגלריה זו" aria-label="לייק">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="${isLikedCard ? '#ff2e4d' : 'none'}" stroke="${isLikedCard ? '#ff2e4d' : '#ffffff'}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    </button>
  `;
  const cardLikeBtnHTML = `
    <button type="button" onclick="event.stopPropagation(); photoToggleLike('${artEsc(p.id)}')" class="art-telegram-btn" title="לייק לגלריה זו" style="display: inline-flex; align-items: center; background: #2f2f2f; color: ${isLikedCard ? '#ff2e4d' : '#ffffff'}; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: bold; gap: 6px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; transition: all 0.2s;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="${isLikedCard ? '#ff2e4d' : 'none'}" stroke="${isLikedCard ? '#ff2e4d' : 'currentColor'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
      <span>${likesCount}</span>
    </button>
  `;

  const isSavedCard = photoIsSavedLocal(p.id);
  const cardSaveBtnHTML = `
    <button type="button" onclick="event.stopPropagation(); photoToggleSave('${artEsc(p.id)}')" class="art-telegram-btn art-save-btn${isSavedCard ? ' is-saved' : ''}" title="${isSavedCard ? 'הסר משמורים' : 'שמור לצפייה מאוחרת'}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="${isSavedCard ? '#ffffff' : 'none'}" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
      </svg>
      <span>${isSavedCard ? 'שמור' : 'שמירה'}</span>
    </button>
  `;

  const cardLinksHTML = `
    <div class="photo-card-links">
      ${cardSaveBtnHTML}
      ${cardLink(p.telegramUrl, 'טלגרם', 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z')}
      ${cardLink(p.emailUrl, 'אימייל', 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', '<polyline points="22,6 12,13 2,6"/>')}
    </div>
  `;

  const scoreBadgeHTML = `
    <div style="display:inline-flex; align-items:center; gap:8px; font-size:12px; color:#64748b; font-weight:700; margin-top:4px;">
      <span>👁️ ${viewsCount} צפיות</span>
      <span>·</span>
      <span>❤️ ${likesCount} לייקים</span>
    </div>
  `;

  const isVerifiedAlbum = isUserVerified(p.authorId, p.author, p.verified || p.verifiedUser);
  const verifiedBadgeHTML = isVerifiedAlbum ? ` <span title="משתמש מאומת" style="color:#2563eb; font-weight:900; background:#dbeafe; border-radius:50%; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; font-size:10px; margin-right:3px;">✓</span>` : '';
  const priceBadgeHTML = p.price ? `<div class="art-price-badge">💰 ${escHtml(String(p.price))}</div>` : '';
  // בעמוד הקהילות מציגים כרטיס "ריבוע" נקי — ללא תאריך/מאומת/צפיות/לייקים וכפתורים
  const metaHTML = options.hideMeta ? '' : `
      <div class="art-row-meta" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        <span class="photo-author-link" onclick="event.stopPropagation(); openUserPage('${artEsc(p.authorId || '')}', '${artEsc(p.author)}')" style="cursor: pointer; color: #e11d48; text-decoration: underline; font-weight: 600;">${escHtml(p.author)}${verifiedBadgeHTML}</span>
        <span class="art-row-sep">|</span>
        <span>${escHtml(p.timestamp)}</span>
        ${p.ageRange ? `<span class="art-row-sep">|</span><span>גיל ${escHtml(String(p.ageRange))}</span>` : ''}
        ${isVerifiedAlbum ? `<span class="art-row-sep">|</span><span style="color:#2563eb; font-weight:700; display:inline-flex; align-items:center; gap:4px;">חשבון זה מאומת <span style="background:#dbeafe; border-radius:50%; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; font-size:10px;">✓</span></span>` : ''}
      </div>
      ${scoreBadgeHTML}
      ${cardLinksHTML}
  `;
  const classActionHTML = p.isClassAction ? `<div style="display:inline-block; background:#0f172a; color:#fff; font-size:11px; font-weight:800; padding:2px 8px; border-radius:6px; margin-bottom:4px;">⚖️ תביעה ייצוגית${p.businessName ? ' · ' + escHtml(p.businessName) : ''}</div>`
    : (p.isProblem ? `<div style="display:inline-block; background:#f59e0b; color:#fff; font-size:11px; font-weight:800; padding:2px 8px; border-radius:6px; margin-bottom:4px;">🎯 בעיה לפתרון · ${(p.bids ? Object.keys(p.bids).length : 0)} הצעות</div>`
    : (p.isWanted ? `<div style="display:inline-block; background:#2563eb; color:#fff; font-size:11px; font-weight:800; padding:2px 8px; border-radius:6px; margin-bottom:4px;">🔎 מחפש/ת · ${(p.offers ? Object.keys(p.offers).length : 0)} הצעות</div>` : ''));
  const infoBlock = `
    <div class="art-row-text photo-card-info">
      ${classActionHTML}
      <h3>${escHtml(p.title)}</h3>
      ${priceBadgeHTML}
      ${metaHTML}
    </div>
  `;

  const pendingHTML = isPending ? `<div style="color: #d97706; font-weight: bold; font-size: 12px; display: flex; align-items: center; gap: 4px;">⚠️ ממתין לאישור מנהל</div>` : '';
  const approveHTML = (isEditMode && isPending) ? `
    <button onclick="event.stopPropagation(); photoApprove('${artEsc(p.id)}')" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; transition: background 0.2s;">
      ✓ אשר גלריה לפרסום
    </button>
  ` : '';

  const actionsBlock = (pendingHTML || approveHTML)
    ? `<div class="art-row-text photo-card-actions">${pendingHTML}${approveHTML}</div>`
    : '';
  const textBlock = actionsBlock + infoBlock;

  return `
    <div class="art-row" data-category="${escHtml(p.category || 'כללי')}" data-verified="${isVerifiedAlbum ? '1' : '0'}" data-age="${escHtml(p.ageRange || '')}" data-region="${escHtml(p.region || '')}" data-time="${photoAlbumTime(p) ?? ''}" data-score="${totalScore}" data-adult="${p.isAdult ? '1' : '0'}" data-search="${searchText}" onclick="${isPending ? '' : `photoOpenDetail('${artEsc(p.id)}')`}" style="${isPending ? 'border: 2px dashed #f59e0b; background: #fffbeb; cursor: default;' : ''}">
      ${textBlock}
      <div class="art-row-img-container" style="display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0;">
        <div class="art-row-img-wrap" style="--bg-img: url('${mainImg || ''}');">
          ${mainImg ? `<img src="${escHtml(mainImg)}" alt="">` : '<div class="art-row-img-placeholder"></div>'}
          ${validImages.length > 1 ? `<div class="photo-count-badge">1 / ${validImages.length}</div>` : ''}
          ${mainImg ? `<button class="art-zoom-btn" onclick="event.stopPropagation();artGalleryById('photos','${artEsc(p.id)}', this.closest('.art-row-img-wrap').querySelector('img') && this.closest('.art-row-img-wrap').querySelector('img').getAttribute('src'))" title="מסך מלא">⛶</button>` : ''}
          ${cardHeartOverlay}
          ${(isAdmin() || isEditMode) ? `<button class="art-edit-btn" onclick="event.stopPropagation(); openPhotoEditModal('${artEsc(p.id)}', event)" title="ערוך גלריה" style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; z-index: 10;">✏️</button>` : ''}
          ${isEditMode ? `<button class="art-pin-btn" onclick="event.stopPropagation(); togglePinPhoto('${artEsc(p.id)}')" title="${p.pinned ? 'בטל נעץ' : 'נעץ בגריד'}" style="${p.pinned ? 'color:#ffd700;display:flex;' : ''}">${p.pinned ? '★' : '☆'}</button>` : ''}
          <button class="art-delete-btn" onclick="event.stopPropagation();photoDelete('${artEsc(p.id)}',this)">✕</button>
        </div>
        ${miniThumbnailsHTML}
      </div>
    </div>
  `;
}

// מספר הגלריות המוצגות בכל שורה לפני לחיצה על "עוד" (שורת גריד אחת = 4 עמודות)
const PHOTO_ROW_LIMIT = 4;

function photoRowMoreBtn(count, rowId) {
  // כפתורי "עוד"/"פחות" הוסרו — כל הפריטים מוצגים תמיד
  return '';
}

function photoToggleRowMore(rowId, btn) {
  const row = document.getElementById(rowId);
  if (!row) return;
  const expanded = row.classList.toggle('expanded');
  btn.innerHTML = expanded ? 'פחות' : 'עוד';
}
window.photoToggleRowMore = photoToggleRowMore;

// ============================================================
// צ'אט חי בין משתמשי האתר (Firebase RTDB, סנכרון בזמן אמת)
// ============================================================
let liveChatMessages = [];
let liveChatSubscribed = false;

function subscribeLiveChat() {
  if (liveChatSubscribed) return;
  liveChatSubscribed = true;
  onValue(ref(db, 'website/live_chat'), (snapshot) => {
    const val = snapshot.val() || {};
    liveChatMessages = Object.entries(val)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      .slice(-100);
    renderLiveChatMessages();
  });
}

function liveChatUserName() {
  const user = auth.currentUser;
  if (user) {
    try {
      const profile = JSON.parse(localStorage.getItem(`user_profile_${user.uid}`) || '{}');
      return profile.nickname || user.displayName || (user.email ? user.email.split('@')[0] : 'משתמש');
    } catch (e) {
      return user.displayName || 'משתמש';
    }
  }
  return (typeof isEditMode !== 'undefined' && isEditMode) ? 'מנהל' : 'אורח';
}

function liveChatMessagesHTML() {
  if (!liveChatMessages.length) {
    return '<div style="text-align:center; color:#94a3b8; font-size:13px; padding:24px 8px; line-height:1.6;">עדיין אין הודעות.<br>היו הראשונים לכתוב! 👋</div>';
  }
  const myUid = auth.currentUser ? auth.currentUser.uid : '';
  return liveChatMessages.map(m => {
    const mine = !!myUid && m.uid === myUid;
    const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '';
    return `
      <div style="display:flex; flex-direction:column; align-items:${mine ? 'flex-start' : 'flex-end'}; max-width:100%;">
        <div style="max-width:85%; background:${mine ? '#e11d48' : '#f1f5f9'}; color:${mine ? '#fff' : '#0f172a'}; padding:7px 11px; border-radius:12px; ${mine ? 'border-bottom-right-radius:4px;' : 'border-bottom-left-radius:4px;'} font-size:13px; line-height:1.4; word-break:break-word;">
          ${!mine ? `<div style="font-size:11px; font-weight:800; color:#e11d48; margin-bottom:2px;">${escHtml(m.name || 'אורח')}</div>` : ''}
          <div>${escHtml(m.text || '')}</div>
        </div>
        <div style="font-size:10px; color:#94a3b8; margin-top:2px;">${time}</div>
      </div>
    `;
  }).join('');
}

function renderLiveChatMessages() {
  const box = document.getElementById('live-chat-messages');
  if (!box) return;
  box.innerHTML = liveChatMessagesHTML();
  box.scrollTop = box.scrollHeight;
}

function buildLiveChatBox() {
  subscribeLiveChat();
  return `
    <div class="art-sidebar-box" style="padding:0; overflow:hidden; display:flex; flex-direction:column;">
      <div style="background:linear-gradient(135deg,#e11d48,#9f1239); color:#fff; padding:12px 14px; font-size:14px; font-weight:900; display:flex; align-items:center; gap:8px;">
        <span>💬 צ'אט חי — דברו זה עם זה</span>
      </div>
      <div id="live-chat-messages" style="height:250px; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:8px; background:#fafafa;">${liveChatMessagesHTML()}</div>
      <div style="display:flex; gap:6px; padding:10px 10px 4px; border-top:1px solid #eee; background:#fff;">
        <input id="live-chat-input" type="text" maxlength="500" placeholder="כתוב הודעה... או / לפרסום לקהילה" onkeydown="if(event.key==='Enter'){event.preventDefault(); sendLiveChatMessage();}" style="flex:1; padding:9px 12px; border:1px solid #ddd; border-radius:20px; font-size:13px; outline:none; box-sizing:border-box;">
        <button onclick="sendLiveChatMessage()" style="background:#e11d48; color:#fff; border:none; border-radius:20px; padding:9px 16px; font-size:13px; font-weight:800; cursor:pointer; flex-shrink:0;">שלח</button>
      </div>
      <div style="padding:0 12px 10px; background:#fff; font-size:11px; color:#94a3b8;">💡 טיפ: הקלד <b>/</b> ואז שם קהילה כדי לפרסם מודעה מהירה לקהילה</div>
    </div>
  `;
}

function openLiveChatLogin() {
  const authModal = document.getElementById('auth-modal');
  if (authModal) authModal.style.display = 'flex';
}
window.openLiveChatLogin = openLiveChatLogin;

async function sendLiveChatMessage() {
  const inp = document.getElementById('live-chat-input');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;

  // פקודת "/" — פרסום מהיר לקהילה. פתוחה לכולם (גם ללא התחברות) ואינה נשלחת לצ'אט.
  if (text.startsWith('/')) {
    inp.value = '';
    handleChatSlashCommand(text);
    return;
  }

  // הודעת צ'אט רגילה מחייבת התחברות (כללי Firebase מתירים כתיבה למשתמשים מחוברים בלבד)
  if (!auth.currentUser) {
    openLiveChatLogin();
    return;
  }
  inp.value = '';
  try {
    await push(ref(db, 'website/live_chat'), {
      name: liveChatUserName(),
      uid: auth.currentUser.uid,
      text: text.slice(0, 500),
      timestamp: Date.now()
    });
  } catch (e) {
    console.error('live chat send failed', e);
    inp.value = text;
    if (typeof showCopyToast === 'function') showCopyToast('שגיאה בשליחת ההודעה');
  }
}
window.sendLiveChatMessage = sendLiveChatMessage;

// פקודת "/" בצ'אט: פרסום מהיר לקהילה לפי שם. "/שם קהילה" פותח את הצ'אט
// המהיר עם הקהילה מסומנת; "/" לבד מציג את רשימת הקהילות הזמינות.
function handleChatSlashCommand(text) {
  const q = text.replace(/^\//, '').trim();
  const list = (typeof communitiesData !== 'undefined') ? Object.values(communitiesData || {}) : [];
  if (!list.length) {
    if (typeof showCopyToast === 'function') showCopyToast('אין קהילות עדיין — אפשר ליצור אחת בעמוד "קהילות"');
    return;
  }
  if (!q) {
    const names = list.map(c => c.name).filter(Boolean).join(', ');
    if (typeof showCopyToast === 'function') showCopyToast('הקלד / ואז שם קהילה. זמינות: ' + names);
    return;
  }
  const ql = q.toLowerCase();
  const match = list.find(c => (c.name || '').toLowerCase() === ql)
             || list.find(c => (c.name || '').toLowerCase().includes(ql));
  if (match) {
    if (typeof openQuickPublish === 'function') openQuickPublish(match.id);
  } else {
    const names = list.map(c => c.name).filter(Boolean).join(', ');
    if (typeof showCopyToast === 'function') showCopyToast(`קהילה "${q}" לא נמצאה. זמינות: ${names}`);
  }
}
window.handleChatSlashCommand = handleChatSlashCommand;

// ============================================================
// העלאה מהירה — נקודת כניסה נגישה לכל משתמש רשום (לא רק מנהל)
// ============================================================
function buildQuickUploadBox() {
  // מנהל/מצב עריכה כבר מקבלים כפתור העלאה נפרד, אין צורך לשכפל
  if ((typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode)) return '';

  if (auth.currentUser) {
    return `
      <div class="art-sidebar-box" style="border:1.5px solid #e11d48; background:rgba(225,29,72,0.03); border-radius:12px; padding:16px; text-align:center;">
        <div style="font-size:14px; font-weight:900; color:#9f1239; margin-bottom:4px;">⚡ העלאה מהירה</div>
        <div style="font-size:12px; color:#64748b; margin-bottom:12px; line-height:1.4;">הפרטים שלך (מייל/טלגרם) כבר שמורים וימולאו אוטומטית</div>
        <button onclick="openPhotoModal()" style="width:100%; background:#e11d48; color:#fff; border:none; border-radius:8px; padding:11px; font-size:14px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 2px 8px rgba(225,29,72,0.25);">
          <span style="font-size:16px;">📷</span> העלאת גלריה חדשה
        </button>
      </div>
    `;
  }

  return `
    <div class="art-sidebar-box" style="border:1.5px solid #cbd5e1; background:#f8fafc; border-radius:12px; padding:16px; text-align:center;">
      <div style="font-size:14px; font-weight:900; color:#334155; margin-bottom:4px;">⚡ העלאה מהירה</div>
      <div style="font-size:12px; color:#64748b; margin-bottom:12px; line-height:1.4;">התחבר פעם אחת — ומאז ההעלאות מהירות, עם הפרטים שלך שמורים</div>
      <button onclick="openLiveChatLogin()" style="width:100%; background:#0f172a; color:#fff; border:none; border-radius:8px; padding:11px; font-size:14px; font-weight:800; cursor:pointer;">🔒 התחבר כדי להעלות</button>
    </div>
  `;
}

// ============================================================
// צ'אט מהיר לפרסום מודעה — עוזר מונחה (זרימה מודרכת: כותרת → תמונות → תיאור → פרסום)
// ============================================================
let qpStep = 'title';
let qpData = { title: '', images: [], summary: '' };

function qpEnsureModal() {
  let modal = document.getElementById('quick-publish-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'quick-publish-modal';
  modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999999; align-items:center; justify-content:center; direction:rtl; padding:16px; font-family:system-ui,sans-serif;';
  modal.innerHTML = `
    <div style="background:#fff; border-radius:18px; width:100%; max-width:460px; height:80vh; max-height:640px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 25px 60px rgba(0,0,0,0.35);">
      <div style="background:#1a1a1a; color:#fff; padding:16px 18px; display:flex; align-items:center; gap:12px;">
        <div style="width:44px; height:44px; border-radius:50%; background:#22c55e; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0;">🤖</div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:16px; font-weight:900;">עוזר לפרסום מודעה מהיר</div>
          <div style="font-size:12px; color:#9ca3af;">🟢 זמין כעת · פרסום ב-30 שניות</div>
        </div>
        <button onclick="document.getElementById('quick-publish-modal').style.display='none'" style="background:rgba(255,255,255,0.12); border:none; color:#fff; width:30px; height:30px; border-radius:50%; cursor:pointer; font-size:16px; flex-shrink:0;">✕</button>
      </div>
      <div id="qp-messages" style="flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px; background:#f7f7f8;"></div>
      <div style="display:flex; gap:8px; padding:12px; border-top:1px solid #eee; background:#fff; align-items:center;">
        <button onclick="qpAddImage()" title="הוסף תמונה" style="width:40px; height:40px; border-radius:50%; background:#f1f5f9; border:1px solid #e2e8f0; cursor:pointer; font-size:18px; flex-shrink:0;">📷</button>
        <input id="qp-input" type="text" placeholder="הקלד תשובה לבוט..." onkeydown="if(event.key==='Enter'){event.preventDefault(); qpHandleSend();}" style="flex:1; padding:11px 14px; border:1px solid #ddd; border-radius:22px; font-size:14px; outline:none; box-sizing:border-box;">
        <button onclick="qpHandleSend()" style="width:44px; height:44px; border-radius:50%; background:#22c55e; border:none; color:#fff; cursor:pointer; font-size:18px; flex-shrink:0;">➤</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function qpBubble(role, html) {
  const box = document.getElementById('qp-messages');
  if (!box) return;
  const mine = role === 'user';
  const wrap = document.createElement('div');
  wrap.style.cssText = `display:flex; justify-content:${mine ? 'flex-start' : 'flex-end'};`;
  wrap.innerHTML = `<div style="max-width:82%; background:${mine ? '#22c55e' : '#fff'}; color:${mine ? '#fff' : '#111'}; padding:10px 14px; border-radius:14px; font-size:14px; line-height:1.5; box-shadow:0 1px 3px rgba(0,0,0,0.08); ${mine ? 'border-bottom-right-radius:4px;' : 'border-bottom-left-radius:4px;'} word-break:break-word;">${html}</div>`;
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
}

// עמוד טקסט מכיל את כל הסיפור (ללא חלוקה) — הטקסט הארוך פשוט נגלל בתוך המסגרת
function splitStoryTextPages(arr) {
  return arr || [];
}
window.splitStoryTextPages = splitStoryTextPages;

// מזהה את סוג העמוד הנוכחי כדי שהפרסום המהיר יתאים אליו
function qpCurrentSection() {
  if (typeof mainContent === 'undefined' || !mainContent) return 'photos';
  if (mainContent.querySelector('.secondhand-page')) return 'secondhand';
  if (mainContent.querySelector('.stories-page')) return 'stories';
  return 'photos';
}

function openQuickPublish(communityId, itemType) {
  // פרסום מהיר פתוח לכולם — גם למי שלא נרשם
  qpEnsureModal();
  // מתאימים את הפרסום לעמוד הנוכחי (יד 2 / תמונות / סיפורים) כשלא מדובר בקהילה
  const pageSection = communityId ? 'photos' : qpCurrentSection();
  const isProduct = pageSection === 'secondhand';
  const autoType = itemType || (pageSection === 'stories' ? 'story' : 'photo');
  qpData = { title: '', images: [], summary: '', communityId: communityId || null, type: autoType, pageSection, isProduct, tags: {}, tagIndex: 0, price: '', offerType: '', region: '' };
  document.getElementById('qp-messages').innerHTML = '';
  document.getElementById('quick-publish-modal').style.display = 'flex';
  const where = communityId ? 'בקהילה' : '';

  if (!itemType && communityId) {
    qpStep = 'type_choice';
    qpBubble('bot', `שלום! 🤖 ברוך הבא לפרסום ${where}.<br>בחר איזה סוג תוכן ברצונך להעלות:<br><br>
      <div style="display:flex; gap:8px; margin-top:6px;">
        <button type="button" onclick="qpSelectType('photo')" style="flex:1; background:#e11d48; color:#fff; border:none; border-radius:8px; padding:10px; font-weight:800; cursor:pointer;">📸 תמונה / גלריה</button>
        <button type="button" onclick="qpSelectType('story')" style="flex:1; background:#8b5cf6; color:#fff; border:none; border-radius:8px; padding:10px; font-weight:800; cursor:pointer;">📖 סיפור / כתבה</button>
      </div>
    `);
  } else {
    qpSelectType(qpData.type);
  }
}

function qpSelectType(type) {
  qpData.type = type;
  qpStep = 'title';
  const label = qpData.isProduct ? 'המוצר' : (type === 'story' ? 'הסיפור' : 'המודעה / התמונה');
  const intro = qpData.isProduct ? 'שלום! 🛒 בוא נפרסם מוצר יד שניה.<br>' : '';
  qpBubble('bot', `${intro}מצוין! ✍️ מה כותרת ${label} שברצונך לפרסם?`);
  setTimeout(() => { const i = document.getElementById('qp-input'); if (i) i.focus(); }, 100);
}
window.qpSelectType = qpSelectType;
window.openQuickPublish = openQuickPublish;

function qpHandleSend() {
  const inp = document.getElementById('qp-input');
  if (!inp) return;
  const text = inp.value.trim();

  if (qpStep === 'title') {
    if (!text) return;
    inp.value = '';
    qpData.title = text.slice(0, 120);
    qpBubble('user', escHtml(qpData.title));
    qpStep = 'images';
    qpBubble('bot', 'מעולה! 📸 עכשיו הוסף תמונות למודעה (עד 5) בלחיצה על כפתור המצלמה 📷.<br>כשסיימת — כתוב <b>המשך</b>.');
  } else if (qpStep === 'images') {
    if (text === 'המשך' || text === 'סיום') {
      inp.value = '';
      if (qpData.images.length === 0) { qpBubble('bot', 'צריך לפחות תמונה אחת 🙂 לחץ על 📷 להוספה.'); return; }
      qpStep = 'summary';
      qpBubble('bot', 'רוצה להוסיף תיאור קצר? כתוב אותו עכשיו, או כתוב <b>דלג</b>.');
    } else if (text) {
      inp.value = '';
      qpBubble('bot', 'הוסף תמונות עם 📷, וכשתסיים כתוב <b>המשך</b>.');
    }
  } else if (qpStep === 'summary') {
    inp.value = '';
    if (text && text !== 'דלג') { qpData.summary = text.slice(0, 300); qpBubble('user', escHtml(qpData.summary)); }
    else qpBubble('user', 'דלג');
    qpData.tags = {};
    // מוצר יד שניה: שואלים סוג הצעה → מיקום → מחיר
    if (qpData.isProduct) { qpStep = 'sh_offer'; qpAskShOffer(); }
    // אם הקהילה מגדירה סינונים מותאמים — שואלים ערך לכל סינון לפני הפרסום
    else if (qpCommunityFilters().length) { qpStep = 'tags'; qpData.tagIndex = 0; qpAskNextTag(); }
    else { qpMaybeAskPrice(); }
  } else if (qpStep === 'price') {
    inp.value = '';
    if (text && text !== 'דלג') {
      const n = String(text).replace(/[^\d.]/g, '');
      qpData.price = n ? (n + ' ₪') : '';
      qpBubble('user', qpData.price || escHtml(text));
    } else { qpBubble('user', 'דלג'); }
    qpStep = 'done';
    qpPublish();
  }
}

function qpCommunityFilters() {
  const c = (qpData.communityId && typeof communitiesData !== 'undefined') ? communitiesData[qpData.communityId] : null;
  return (c && Array.isArray(c.filters)) ? c.filters : [];
}

function qpHasPrice() {
  const c = (qpData.communityId && typeof communitiesData !== 'undefined') ? communitiesData[qpData.communityId] : null;
  return !!(c && c.hasPrice);
}

// אחרי הסינונים: אם הקהילה כוללת מחיר — שואלים מחיר, אחרת מפרסמים
function qpMaybeAskPrice() {
  if (qpHasPrice()) { qpStep = 'price'; qpBubble('bot', '💰 מה המחיר? כתוב מספר בש״ח, או <b>דלג</b>.'); }
  else { qpStep = 'done'; qpPublish(); }
}
window.qpMaybeAskPrice = qpMaybeAskPrice;

function qpAskNextTag() {
  const filters = qpCommunityFilters();
  if (qpData.tagIndex >= filters.length) { qpMaybeAskPrice(); return; }
  const g = filters[qpData.tagIndex];
  const btns = g.options.map(o =>
    `<button onclick="qpPickTag('${artEsc(g.name)}','${artEsc(o)}')" style="background:#eef2ff; color:#3730a3; border:1px solid #c7d2fe; border-radius:999px; padding:6px 14px; font-size:13px; font-weight:800; cursor:pointer; margin:3px;">${escHtml(o)}</button>`
  ).join('');
  qpBubble('bot', `בחר <b>${escHtml(g.name)}</b>:<br><div style="margin-top:6px;">${btns}</div>`);
}

function qpPickTag(group, value) {
  if (!qpData.tags) qpData.tags = {};
  qpData.tags[group] = value;
  qpBubble('user', escHtml(group) + ': ' + escHtml(value));
  qpData.tagIndex = (qpData.tagIndex || 0) + 1;
  qpAskNextTag();
}
window.qpPickTag = qpPickTag;

// --- שאלות ייעודיות למוצר יד שניה ---
function qpAskShOffer() {
  const opts = ['מכירה', 'השאלה', 'החלפה'];
  const btns = opts.map(o => `<button onclick="qpPickSh('offer','${artEsc(o)}')" style="background:#fee2e2; color:#991b1b; border:1px solid #fecaca; border-radius:999px; padding:6px 16px; font-size:13px; font-weight:800; cursor:pointer; margin:3px;">${escHtml(o)}</button>`).join('');
  qpBubble('bot', `🏷️ מה <b>סוג ההצעה</b>?<br><div style="margin-top:6px;">${btns}</div>`);
}
function qpAskShRegion() {
  const opts = ['צפון', 'מרכז', 'דרום', 'ירושלים', 'שרון', 'שפלה'];
  const btns = opts.map(o => `<button onclick="qpPickSh('region','${artEsc(o)}')" style="background:#dbeafe; color:#1e40af; border:1px solid #bfdbfe; border-radius:999px; padding:6px 16px; font-size:13px; font-weight:800; cursor:pointer; margin:3px;">${escHtml(o)}</button>`).join('');
  qpBubble('bot', `📍 מה <b>המיקום</b>?<br><div style="margin-top:6px;">${btns}</div>`);
}
function qpPickSh(kind, value) {
  if (kind === 'offer') {
    qpData.offerType = value;
    qpBubble('user', 'סוג הצעה: ' + escHtml(value));
    qpStep = 'sh_region';
    qpAskShRegion();
  } else if (kind === 'region') {
    qpData.region = value;
    qpBubble('user', 'מיקום: ' + escHtml(value));
    if (qpData.offerType === 'החלפה') { qpStep = 'done'; qpPublish(); }
    else { qpStep = 'price'; qpBubble('bot', '💰 מה המחיר המבוקש? כתוב מספר בש״ח, או <b>דלג</b>.'); }
  }
}
window.qpAskShOffer = qpAskShOffer;
window.qpAskShRegion = qpAskShRegion;
window.qpPickSh = qpPickSh;
window.qpHandleSend = qpHandleSend;

function qpAddImage() {
  if (qpData.images.length >= 5) { qpBubble('bot', 'הגעת למקסימום של 5 תמונות.'); return; }
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    (typeof artCompressImage === 'function' ? artCompressImage(f) : Promise.resolve('')).then(data => {
      if (!data) return;
      qpData.images.push(data);
      qpBubble('user', `<img src="${escHtml(data)}" style="width:130px; height:95px; object-fit:cover; border-radius:8px; display:block;">`);
      qpBubble('bot', `נוספה תמונה (${qpData.images.length}/5). הוסף עוד, או כתוב <b>המשך</b> לפרסום.`);
    });
  };
  inp.click();
}
window.qpAddImage = qpAddImage;

async function qpPublish() {
  qpBubble('bot', '⏳ מפרסם את התוכן...');
  const user = auth.currentUser;
  let nickname = 'משתמש', email = '', telegram = '';
  if (user) {
    try {
      const p = JSON.parse(localStorage.getItem(`user_profile_${user.uid}`) || '{}');
      nickname = p.nickname || user.displayName || (user.email ? user.email.split('@')[0] : 'משתמש');
      email = p.email || user.email || '';
      telegram = p.telegram ? String(p.telegram).replace(/^@/, '') : '';
    } catch (e) { nickname = user.displayName || 'משתמש'; }
  }
  const isAdminNow = (typeof isEditMode !== 'undefined' && isEditMode);
  const isStory = qpData.type === 'story';
  const album = {
    id: (isStory ? 'st' : 'ph') + Date.now(),
    type: qpData.type || 'photo',
    isStory: isStory,
    title: qpData.title,
    summary: qpData.summary,
    body: qpData.summary,
    image: qpData.images[0] || '',
    images: qpData.images.slice(0, 5),
    author: nickname,
    authorId: user ? user.uid : '',
    category: isStory ? 'סיפורים' : (qpData.isProduct ? (qpData.offerType || 'מכירה') : 'כללי'),
    ageRange: '',
    region: qpData.region || '',
    offerType: qpData.offerType || '',
    categoryColor: isStory ? '#8b5cf6' : (qpData.isProduct ? '#e11d48' : '#10b981'),
    timestamp: new Date().toLocaleDateString('he-IL'),
    createdAt: Date.now(),
    telegramUrl: telegram ? ('https://t.me/' + telegram) : '',
    emailUrl: email ? ('mailto:' + email) : '',
    isAdult: false,
    adminOnly: false,
    expiresAt: null,
    tags: qpData.tags || {},
    price: qpData.price || '',
    approved: isAdminNow
  };
  try {
    if (qpData.communityId) {
      // פרסום לתוך קהילה: נשמר תחת website/communities/{id}/items
      album.approved = true;
      await set(ref(db, `website/communities/${qpData.communityId}/items/${album.id}`), album);
      qpBubble('bot', `✅ ${isStory ? 'הסיפור' : 'התוכן'} פורסם/ה בקהילה בהצלחה!`);
      const cid = qpData.communityId;
      setTimeout(() => {
        const m = document.getElementById('quick-publish-modal'); if (m) m.style.display = 'none';
        if (typeof openCommunityPage === 'function') openCommunityPage(cid);
      }, 1500);
    } else if (qpData.pageSection === 'stories') {
      // פרסום סיפור לעמוד הסיפורים
      const stories = (typeof storyGetStories === 'function') ? storyGetStories() : [];
      const st = Object.assign({}, album, { pages: album.images.map(u => ({ type: 'image', url: u })) });
      stories.unshift(st);
      if (typeof buildStoriesPage === 'function') mainContent.innerHTML = buildStoriesPage(stories, storyGetCurrentKind());
      if (typeof saveCurrentPageContent === 'function') saveCurrentPageContent();
      if (!isAdminNow && typeof pushPendingSubmission === 'function') pushPendingSubmission(st);
      qpBubble('bot', '✅ הסיפור פורסם!' + (isAdminNow ? '' : '<br>הוא ממתין לאישור מנהל ויופיע בקרוב.'));
      setTimeout(() => { const m = document.getElementById('quick-publish-modal'); if (m) m.style.display = 'none'; }, 2000);
    } else {
      // תמונות או מוצרי יד שניה — מתפרסם לעמוד הנוכחי לפי הסקשן
      const sec = (qpData.pageSection === 'secondhand') ? 'secondhand' : 'photos';
      const albums = photoGetAlbums();
      albums.unshift(album);
      mainContent.innerHTML = buildPhotosPage(albums, sec);
      if (typeof saveCurrentPageContent === 'function') saveCurrentPageContent();
      if (!isAdminNow && typeof pushPendingSubmission === 'function') pushPendingSubmission(album);
      const what = sec === 'secondhand' ? 'המוצר פורסם' : 'המודעה פורסמה';
      qpBubble('bot', `✅ ${what} בהצלחה!` + (isAdminNow ? '' : '<br>ממתין לאישור מנהל ויופיע בקרוב.'));
      setTimeout(() => { const m = document.getElementById('quick-publish-modal'); if (m) m.style.display = 'none'; }, 2000);
    }
  } catch (e) {
    console.error('quick publish failed', e);
    qpBubble('bot', '❌ שגיאה בפרסום. נסה שוב מאוחר יותר.');
  }
}
window.qpPublish = qpPublish;

// ============================================================
// קהילות — משתמשים יוצרים קהילות, וכל קהילה היא עמוד עם גריד תכנים (כמו תמונות/סיפורים)
// ============================================================
let communitiesData = {};
let communitiesSubscribed = false;

function subscribeCommunities() {
  if (communitiesSubscribed) return;
  communitiesSubscribed = true;
  onValue(ref(db, 'website/communities'), (snapshot) => {
    communitiesData = snapshot.val() || {};
    // רענון הטאב אם הוא פתוח, ורענון עמוד הקהילה אם צופים בו
    const listEl = document.getElementById('communities-list');
    if (listEl) listEl.innerHTML = communitiesListHTML();
    const rowEl = document.getElementById('communities-page-list');
    if (rowEl) rowEl.innerHTML = communitiesRowHTML();
    const cp = mainContent && mainContent.querySelector('.community-page');
    if (cp && cp.dataset.communityId && communitiesData[cp.dataset.communityId]) {
      openCommunityPage(cp.dataset.communityId);
    }
  });
}

function communitiesListHTML() {
  const list = Object.values(communitiesData).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (!list.length) {
    return '<div style="grid-column:1 / -1; text-align:center; color:#94a3b8; font-size:13px; padding:16px 8px;">אין קהילות עדיין.<br>צרו את הראשונה!</div>';
  }
  const colors = ['#000000', '#ea580c', '#7c3aed', '#000000'];
  const isEd = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);

  return list.map((c, index) => {
    const count = c.items ? Object.keys(c.items).length : 0;
    const bg = colors[index % colors.length];
    const iconStr = (c.icon && c.icon !== '🏘️') ? escHtml(c.icon) + ' ' : '';
    const deleteBtn = isEd
      ? `<button onclick="event.stopPropagation(); deleteCommunity('${artEsc(c.id)}');" title="מחק קהילה (מנהל)" style="position:absolute; top:4px; left:4px; background:rgba(239,68,68,0.9); color:#fff; border:none; border-radius:50%; width:20px; height:20px; font-size:10px; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:5;">✕</button>`
      : '';
    return `
      <div onclick="openCommunityPage('${artEsc(c.id)}')" 
           style="position:relative; background:${bg}; color:#ffffff; border-radius:10px; padding:10px 6px; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; min-height:54px; box-sizing:border-box; transition:transform 0.15s, opacity 0.15s; text-decoration:none;" 
           onmouseover="this.style.opacity='0.9'; this.style.transform='translateY(-2px)';" 
           onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)';"
           title="${escHtml(c.name || 'קהילה')}">
        ${deleteBtn}
        <div style="font-size:13px; font-weight:800; color:#ffffff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%;">
          ${iconStr}${escHtml(c.name || 'קהילה')}
        </div>
        <div style="font-size:11px; opacity:0.85; margin-top:2px; font-weight:600; color:#ffffff;">
          ${count} תכנים
        </div>
      </div>
    `;
  }).join('');
}

function buildCommunitiesBox() {
  subscribeCommunities();
  return `
    <div class="art-sidebar-box" style="border:1.5px solid #e2e8f0; border-radius:12px; padding:14px;">
      <div style="font-size:14px; font-weight:900; color:#0f172a; margin-bottom:10px;">🏘️ קהילות</div>
      <div id="communities-list" style="display:grid; grid-template-columns:1fr 1fr; gap:8px; width:100%; box-sizing:border-box;">${communitiesListHTML()}</div>
    </div>
  `;
}

async function clearAllCustomCommunities() {
  const isEd = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);
  if (!isEd) { alert('רק מנהל רשאי למחוק את כל הקהילות'); return; }
  if (!confirm('האם למחוק את כל הקהילות שקיימות בבסיס הנתונים ולשמור רק את "תמונות" ו"סיפורים"?')) return;
  try {
    await remove(ref(db, 'website/communities'));
    communitiesData = {};
    if (typeof showCopyToast === 'function') showCopyToast('🗑️ כל הקהילות נמחקו בהצלחה!');
    if (typeof navigateToPage === 'function') navigateToPage('page-communities-main');
  } catch (e) {
    console.error('Clear communities failed', e);
    alert('שגיאה במחיקת הקהילות');
  }
}
window.clearAllCustomCommunities = clearAllCustomCommunities;

async function deleteCommunity(communityId) {
  const isEd = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);
  if (!isEd) { alert('רק מנהל רשאי למחוק קהילות'); return; }
  const comm = communitiesData[communityId];
  if (!comm) return;
  if (!confirm(`האם אתה בטוח שברצונך למחוק את הקהילה "${comm.name || 'זו'}"?`)) return;
  try {
    await remove(ref(db, `website/communities/${communityId}`));
    delete communitiesData[communityId];
    if (typeof showCopyToast === 'function') showCopyToast('🗑️ הקהילה נמחקה בהצלחה');
    const listEl = document.getElementById('communities-list');
    if (listEl) listEl.innerHTML = communitiesListHTML();
    const rowEl = document.getElementById('communities-page-list');
    if (rowEl) rowEl.innerHTML = communitiesRowHTML();
    const cp = mainContent && mainContent.querySelector('.community-page');
    if (cp && cp.dataset.communityId === communityId) {
      if (typeof goBackFromUserPage === 'function') goBackFromUserPage();
      else if (typeof navigateToPage === 'function') navigateToPage('page-communities-main');
    }
  } catch (e) {
    console.error('Delete community failed', e);
    alert('שגיאה במחיקת הקהילה');
  }
}
window.deleteCommunity = deleteCommunity;

// תמונת הקהילה הנבחרת (base64) בזמן יצירה
let communityImgData = '';

// יצירת קהילות חדשות מבוטלת לבקשת המשתמש
function createCommunity() {
  if (typeof showCopyToast === 'function') showCopyToast('יצירת קהילות חדשות מבוטלת באתר');
  alert('יצירת קהילות חדשות מבוטלת באתר.');
  return;
}
window.createCommunity = createCommunity;

async function saveCommunity() {
  if (!auth.currentUser) { if (typeof openLiveChatLogin === 'function') openLiveChatLogin(); return; }
  const name = (document.getElementById('community-name').value || '').trim();
  if (!name) { alert('חובה לתת שם לקהילה'); return; }
  const desc = (document.getElementById('community-desc').value || '').trim();
  const filters = parseCommunityFilters((document.getElementById('community-filters') || {}).value || '');
  const hasPrice = !!(document.getElementById('community-has-price') && document.getElementById('community-has-price').checked);
  const id = 'comm' + Date.now();
  const community = {
    id,
    name: name.slice(0, 60),
    desc: desc.slice(0, 200),
    icon: '🏘️',
    image: communityImgData || '',
    filters: filters,
    hasPrice: hasPrice,
    createdBy: auth.currentUser.uid,
    createdByName: (typeof liveChatUserName === 'function' ? liveChatUserName() : 'משתמש'),
    createdAt: Date.now()
  };
  try {
    await set(ref(db, `website/communities/${id}`), community);
    const modal = document.getElementById('community-modal');
    if (modal) modal.style.display = 'none';
    communityImgData = '';
    if (typeof showCopyToast === 'function') showCopyToast('✅ הקהילה נוצרה בהצלחה!');
    openCommunityPage(id);
  } catch (e) {
    console.error('create community failed', e);
    if (typeof showCopyToast === 'function') showCopyToast('שגיאה ביצירת הקהילה');
  }
}
window.saveCommunity = saveCommunity;

// ---- סינונים מותאמים אישית לקהילה ----
function parseCommunityFilters(text) {
  const out = [];
  (text || '').split('\n').forEach(line => {
    line = line.trim();
    if (!line) return;
    const idx = line.indexOf(':');
    if (idx < 0) return;
    const name = line.slice(0, idx).trim().slice(0, 40);
    const options = line.slice(idx + 1).split(',').map(s => s.trim()).filter(Boolean).slice(0, 20).map(o => o.slice(0, 40));
    if (name && options.length) out.push({ name, options });
  });
  return out.slice(0, 10);
}
window.parseCommunityFilters = parseCommunityFilters;

let communityFilterSel = {};
let communityActiveTab = 'all';

function communitySetTab(tab) {
  communityActiveTab = tab;
  communityRerenderItems();
}
window.communitySetTab = communitySetTab;

function renderCommunityItemCard(p) {
  if (p.type === 'story' || p.isStory) {
    return renderStoryCommunityCard(p);
  }
  return renderPhotoCard(p, { hideMeta: true });
}
window.renderCommunityItemCard = renderCommunityItemCard;

function renderStoryCommunityCard(s) {
  const isVerifiedStory = (typeof isUserVerified === 'function') ? isUserVerified(s.authorId, s.author, s.verified || s.verifiedUser) : false;
  const verifiedBadgeHTML = isVerifiedStory ? ` <span title="משתמש מאומת" style="color:#2563eb; font-weight:900; background:#dbeafe; border-radius:50%; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; font-size:10px; margin-right:3px;">✓</span>` : '';
  const validImages = (s.images && s.images.length) ? s.images.filter(Boolean) : (s.image ? [s.image] : []);
  const mainImg = validImages[0] || s.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80';
  return `
    <div class="art-card story-card" onclick="storyOpenDetail('${artEsc(s.id)}')" style="border-radius:14px; overflow:hidden; background:#fff; border:1px solid #e2e8f0; display:flex; flex-direction:column; cursor:pointer; transition:transform 0.15s, box-shadow 0.15s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 10px 25px rgba(0,0,0,0.1)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none';">
      <div style="position:relative; height:170px; width:100%; overflow:hidden; background:#0f172a;">
        <img src="${escHtml(mainImg)}" style="width:100%; height:100%; object-fit:cover;">
        <span style="position:absolute; top:10px; right:10px; background:#8b5cf6; color:#fff; font-size:11px; font-weight:800; padding:4px 10px; border-radius:999px; box-shadow:0 2px 6px rgba(0,0,0,0.2);">📖 סיפור</span>
      </div>
      <div style="padding:14px; display:flex; flex-direction:column; gap:6px; flex:1; text-align:right; direction:rtl;">
        <div style="font-size:15px; font-weight:900; color:#0f172a; line-height:1.3; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escHtml(s.title || 'סיפור')}</div>
        <div style="font-size:12px; color:#64748b; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; min-height:34px;">${escHtml(s.summary || s.body || 'לחץ לקריאת הסיפור המלא')}</div>
        <div style="margin-top:auto; padding-top:8px; display:flex; align-items:center; justify-content:space-between; font-size:11.5px; color:#94a3b8; border-top:1px solid #f1f5f9;">
          <span>✍️ ${escHtml(s.author || 'אנונימי')}${verifiedBadgeHTML}</span>
          <span style="color:#8b5cf6; font-weight:800;">קרא עוד ←</span>
        </div>
      </div>
    </div>
  `;
}
window.renderStoryCommunityCard = renderStoryCommunityCard;

function communityItemMatches(item) {
  for (const g in communityFilterSel) {
    const sel = communityFilterSel[g];
    if (!sel || !sel.length) continue;
    const val = (item.tags && item.tags[g]) || '';
    if (!sel.includes(val)) return false;
  }
  return true;
}

function communityFilterBarHTML(community) {
  const filters = (community && Array.isArray(community.filters)) ? community.filters : [];
  if (!filters.length) return '';
  const groups = filters.map(g => {
    const opts = g.options.map(o => {
      const checked = (communityFilterSel[g.name] || []).includes(o) ? ' checked' : '';
      return `<label class="cf-opt"><input type="checkbox"${checked} onchange="communityToggleFilter('${artEsc(g.name)}','${artEsc(o)}',this.checked)"> <span>${escHtml(o)}</span></label>`;
    }).join('');
    return `<div class="cf-group"><div class="cf-group-name">${escHtml(g.name)}</div><div class="cf-opts">${opts}</div></div>`;
  }).join('');
  return `<div class="cf-bar">${groups}</div>`;
}

function communityToggleFilter(group, value, checked) {
  if (!communityFilterSel[group]) communityFilterSel[group] = [];
  const arr = communityFilterSel[group];
  const i = arr.indexOf(value);
  if (checked && i < 0) arr.push(value);
  else if (!checked && i >= 0) arr.splice(i, 1);
  communityRerenderItems();
}
window.communityToggleFilter = communityToggleFilter;

function communityRerenderItems() {
  const cp = mainContent.querySelector('.community-page');
  if (!cp) return;
  const community = communitiesData[cp.dataset.communityId];
  if (!community) return;
  const grid = document.getElementById('community-items-grid');
  if (!grid) return;
  let items = community.items ? Object.values(community.items) : [];
  items = items.filter(communityItemMatches).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (communityActiveTab === 'photos') {
    items = items.filter(p => p.type !== 'story' && !p.isStory);
  } else if (communityActiveTab === 'stories') {
    items = items.filter(p => p.type === 'story' || p.isStory);
  }
  grid.innerHTML = items.map(p => renderCommunityItemCard(p)).join('') || '<div style="grid-column:1/-1; text-align:center; color:#94a3b8; padding:40px; font-weight:700;">אין תוצאות לסינון הזה.</div>';
  if (typeof photoApplyFilters === 'function') photoApplyFilters();
}
window.communityRerenderItems = communityRerenderItems;

(function initCommunityModal() {
  const pick = document.getElementById('community-img-pick');
  if (pick) pick.addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const done = data => {
        communityImgData = data;
        const p = document.getElementById('community-img-preview');
        if (p) { p.src = data; p.style.display = 'block'; }
      };
      if (typeof artCompressImage === 'function') artCompressImage(f).then(done);
      else { const r = new FileReader(); r.onload = () => done(r.result); r.readAsDataURL(f); }
    };
    inp.click();
  });
  const cancel = document.getElementById('community-cancel');
  if (cancel) cancel.addEventListener('click', () => {
    const modal = document.getElementById('community-modal');
    if (modal) modal.style.display = 'none';
    communityImgData = '';
  });
  const save = document.getElementById('community-save');
  if (save) save.addEventListener('click', saveCommunity);
})();

function buildCommunityPageHTML(community) {
  let items = community.items ? Object.values(community.items) : [];
  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const filtered = items.filter(communityItemMatches);

  const photos = filtered.filter(p => p.type !== 'story' && !p.isStory);
  const stories = filtered.filter(p => p.type === 'story' || p.isStory);

  let displayItems = filtered;
  if (communityActiveTab === 'photos') displayItems = photos;
  else if (communityActiveTab === 'stories') displayItems = stories;

  const cards = displayItems.map(p => renderCommunityItemCard(p)).join('');
  const json = encodeURIComponent(JSON.stringify(items));
  const filterBar = communityFilterBarHTML(community);
  const canUpload = !!auth.currentUser;
  const isEd = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);

  const adminDeleteBtn = isEd
    ? `<button onclick="deleteCommunity('${artEsc(community.id)}')" style="background:#ef4444; color:#fff; border:none; border-radius:8px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer; margin-top:8px; transition:opacity 0.2s;">🗑️ מחק קהילה זו (מנהל)</button>`
    : '';

  const tabBtnsHTML = `
    <div style="display:flex; gap:8px; margin-bottom:16px; border-bottom:1.5px solid #e2e8f0; padding-bottom:10px; direction:rtl;">
      <button onclick="communitySetTab('all')" style="padding:6px 14px; border-radius:8px; border:none; font-size:13px; font-weight:800; cursor:pointer; background:${communityActiveTab === 'all' ? '#0f172a' : '#f1f5f9'}; color:${communityActiveTab === 'all' ? '#fff' : '#475569'};">🌐 הכל (${filtered.length})</button>
      <button onclick="communitySetTab('photos')" style="padding:6px 14px; border-radius:8px; border:none; font-size:13px; font-weight:800; cursor:pointer; background:${communityActiveTab === 'photos' ? '#e11d48' : '#f1f5f9'}; color:${communityActiveTab === 'photos' ? '#fff' : '#475569'};">📸 תמונות (${photos.length})</button>
      <button onclick="communitySetTab('stories')" style="padding:6px 14px; border-radius:8px; border:none; font-size:13px; font-weight:800; cursor:pointer; background:${communityActiveTab === 'stories' ? '#8b5cf6' : '#f1f5f9'}; color:${communityActiveTab === 'stories' ? '#fff' : '#475569'};">📖 סיפורים (${stories.length})</button>
    </div>
  `;

  const uploadBtnsHTML = canUpload
    ? `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
        <button onclick="openQuickPublish('${artEsc(community.id)}', 'photo')" style="background:linear-gradient(135deg,#e11d48,#be123c); color:#fff; border:none; border-radius:10px; padding:12px; font-size:13.5px; font-weight:800; cursor:pointer; box-shadow:0 3px 10px rgba(225,29,72,0.25);">📸 העלה תמונה לקהילה</button>
        <button onclick="openQuickPublish('${artEsc(community.id)}', 'story')" style="background:linear-gradient(135deg,#8b5cf6,#6d28d9); color:#fff; border:none; border-radius:10px; padding:12px; font-size:13.5px; font-weight:800; cursor:pointer; box-shadow:0 3px 10px rgba(139,92,246,0.25);">📖 כתוב סיפור לקהילה</button>
      </div>
    `
    : `<button onclick="openLiveChatLogin()" style="width:100%; background:#f1f5f9; color:#0f172a; border:1px solid #cbd5e1; border-radius:10px; padding:12px; font-size:14px; font-weight:800; cursor:pointer; margin-bottom:20px;">🔒 התחבר כדי להעלות לקהילה</button>`;

  return `
  <div class="articles-page photos-page community-page photo-cols-${typeof photoGridCols !== 'undefined' ? photoGridCols : 4}" data-photos-json="${json}" data-community-id="${escHtml(community.id)}">
    <div class="art-inner">
      <button onclick="goBackFromUserPage()" style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; padding:8px 16px; font-size:13px; font-weight:800; cursor:pointer; margin-bottom:16px; color:#334155;">← חזרה</button>
      <div style="background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:20px; margin-bottom:20px; display:flex; align-items:center; gap:16px; box-shadow:0 4px 15px rgba(0,0,0,0.03); direction:rtl; flex-wrap:wrap;">
        ${community.image
          ? `<img src="${escHtml(community.image)}" alt="" style="width:56px; height:56px; border-radius:14px; object-fit:cover; flex-shrink:0;">`
          : `<div style="width:56px; height:56px; border-radius:14px; background:linear-gradient(135deg,#e11d48,#9f1239); color:#fff; display:flex; align-items:center; justify-content:center; font-size:26px; flex-shrink:0;">${escHtml(community.icon || '🏘️')}</div>`}
        <div style="flex:1; min-width:200px;">
          <div style="font-size:20px; font-weight:900; color:#0f172a;">${escHtml(community.name || 'קהילה')}</div>
          <div style="font-size:13px; color:#64748b; margin-top:2px;">${escHtml(community.desc || '')}</div>
          <div style="font-size:12px; color:#94a3b8; margin-top:4px;">👥 נוצרה ע"י ${escHtml(community.createdByName || '')} · ${items.length} תכנים</div>
          ${adminDeleteBtn}
        </div>
      </div>
      ${uploadBtnsHTML}
      ${tabBtnsHTML}
      ${filterBar}
      <div class="art-rows" id="community-items-grid">${cards || '<div style="grid-column:1/-1; text-align:center; color:#94a3b8; padding:40px; font-weight:700;">עדיין אין תכנים בקהילה זו. היו הראשונים להעלות!</div>'}</div>
    </div>
  </div>`;
}

let _lastCommunityId = null;
function openCommunityPage(communityId) {
  subscribeCommunities();
  const community = communitiesData[communityId];
  if (!community) { if (typeof showCopyToast === 'function') showCopyToast('הקהילה לא נמצאה'); return; }
  if (typeof mainContent === 'undefined' || !mainContent) return;
  if (_lastCommunityId !== communityId) { communityFilterSel = {}; _lastCommunityId = communityId; }
  mainContent.innerHTML = buildCommunityPageHTML(community);
  try { window.scrollTo(0, 0); } catch (e) {}
  if (typeof photoApplyFilters === 'function') photoApplyFilters();
}
window.openCommunityPage = openCommunityPage;

let communitiesSearchQuery = '';
function communitiesSearch(val) {
  if (typeof logSearchQuery === 'function' && val) {
    logSearchQuery(val, 'קהילות');
  }
  communitiesSearchQuery = (val || '').toLowerCase().trim();
  const rowEl = document.getElementById('communities-page-list');
  if (rowEl) rowEl.innerHTML = communitiesRowHTML();
}
window.communitiesSearch = communitiesSearch;

function communitiesRowHTML() {
  let list = Object.values(communitiesData).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (communitiesSearchQuery) {
    list = list.filter(c => (c.name || '').toLowerCase().includes(communitiesSearchQuery));
  }
  if (!list.length) {
    return `<div class="comm-empty">${communitiesSearchQuery ? 'לא נמצאו קהילות התואמות לחיפוש.' : 'אין קהילות עדיין — צרו את הראשונה! 🚀'}</div>`;
  }
  const isEd = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);

  return list.map(c => {
    const count = c.items ? Object.keys(c.items).length : 0;
    const imgHTML = c.image
      ? `<img src="${escHtml(c.image)}" alt="">`
      : `<div class="comm-card-img-ph">${escHtml(c.icon || '🏘️')}</div>`;
    const deleteBtn = isEd
      ? `<button onclick="event.stopPropagation(); deleteCommunity('${artEsc(c.id)}');" title="מחק קהילה" style="position:absolute; top:8px; left:8px; background:rgba(239,68,68,0.9); color:#fff; border:none; border-radius:6px; padding:4px 8px; font-size:12px; font-weight:bold; cursor:pointer; z-index:10;">🗑️ מחק</button>`
      : '';
    return `<div class="comm-card" onclick="openCommunityPage('${artEsc(c.id)}')" title="${escHtml(c.name || 'קהילה')}" style="position:relative;">
      ${deleteBtn}
      <div class="comm-card-img">${imgHTML}</div>
      <div class="comm-card-body">
        <div class="comm-card-name">${escHtml(c.name || 'קהילה')}</div>
        <div class="comm-card-meta">${count} תכנים${c.createdByName ? ' · ' + escHtml(c.createdByName) : ''}</div>
        <div class="comm-card-enter">כניסה ←</div>
      </div>
    </div>`;
  }).join('');
}
window.communitiesRowHTML = communitiesRowHTML;

const COMMUNITIES_SAMPLES = [];

function communityGetAlbums() {
  // קהילות מותאמות אישית בוטלו לבקשת המשתמש — העמוד מציג בלעדית את "תמונות" ו"סיפורים"
  return [];
}

function buildCommunitiesPage() {
  subscribeCommunities();
  const albums = communityGetAlbums();
  return buildPhotosPage(albums, 'communities');
}
window.buildCommunitiesPage = buildCommunitiesPage;

// עמוד "מוצרי יד שניה" — גריד מוצרים בקונספט של עמוד התמונות/רעיונות
function buildSecondhandPage() {
  const albums = (typeof photoGetAlbums === 'function') ? photoGetAlbums() : [];
  return buildPhotosPage(albums, 'secondhand');
}
window.buildSecondhandPage = buildSecondhandPage;

// עמוד "שותפויות" — גריד באותו קונספט
function buildPartnershipsPage() {
  const albums = (typeof photoGetAlbums === 'function') ? photoGetAlbums() : [];
  return buildPhotosPage(albums, 'partnerships');
}
window.buildPartnershipsPage = buildPartnershipsPage;

// עמוד "ביקורת" — ביקורות על מוצרים/שירותים + תביעות ייצוגיות
function buildReviewsPage() {
  const albums = (typeof photoGetAlbums === 'function') ? photoGetAlbums() : [];
  return buildPhotosPage(albums, 'reviews');
}
window.buildReviewsPage = buildReviewsPage;

// ============================================================
// עמוד "מידע" — לוח בקרה למנהל בלבד. משתמשים (רשומים ואורחים) שולחים
// מידע דרך טופס ציבורי; המנהל כותב הערות משלו ורואה את כל ההגשות.
// ============================================================
let userSubmissionsData = {};
let userSubmissionsSubscribed = false;
let adminInfoText = '';
let adminInfoSubscribed = false;

// ============================================================
// תיעוד היסטוריית חיפושים ושיחות מגולשים (כולל אורחים) למנהל
// ============================================================
let searchHistoryData = {};
let searchHistorySubscribed = false;
let searchLogDebounceTimer = null;

function logSearchQuery(query, pageName) {
  const trimmed = (query || '').trim();
  if (!trimmed || trimmed.length < 2) return;

  clearTimeout(searchLogDebounceTimer);
  searchLogDebounceTimer = setTimeout(async () => {
    try {
      const userObj = auth.currentUser;
      const userName = (userObj && typeof liveChatUserName === 'function') ? liveChatUserName() : 'אורח';
      const isRegistered = !!userObj;

      if (typeof trackEvent === 'function') trackEvent('search');
      await push(ref(db, 'website/search_history'), {
        query: trimmed.slice(0, 300),
        page: pageName || 'כללי',
        user: userName,
        registered: isRegistered,
        timestamp: Date.now()
      });
    } catch (e) {
      console.error('Failed to log search query:', e);
    }
  }, 1200);
}
window.logSearchQuery = logSearchQuery;

function subscribeSearchHistory() {
  if (searchHistorySubscribed) return;
  searchHistorySubscribed = true;
  onValue(ref(db, 'website/search_history'), (snap) => {
    searchHistoryData = snap.val() || {};
    const listEl = document.getElementById('search-history-list');
    if (listEl) listEl.innerHTML = searchHistoryListHTML();
  });
}

function searchHistoryListHTML() {
  const entries = Object.entries(searchHistoryData || {}).sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));
  if (!entries.length) {
    return '<div style="text-align:center; color:#94a3b8; font-size:13px; padding:20px; background:#fff; border:1px solid #e2e8f0; border-radius:10px;">עדיין לא נרשמו חיפושים מגולשים.</div>';
  }
  return entries.map(([key, s]) => {
    const time = s.timestamp ? new Date(s.timestamp).toLocaleString('he-IL') : '';
    const badge = s.registered 
      ? '<span style="background:#dcfce7; color:#166534; font-size:10px; font-weight:800; padding:2px 6px; border-radius:6px;">רשום</span>' 
      : '<span style="background:#fee2e2; color:#991b1b; font-size:10px; font-weight:800; padding:2px 6px; border-radius:6px;">אורח 👤</span>';
    const pageBadge = `<span style="background:#f1f5f9; color:#475569; font-size:10.5px; font-weight:700; padding:2px 6px; border-radius:6px;">📍 ${escHtml(s.page || 'כללי')}</span>`;
    return `
      <div style="border:1px solid #e2e8f0; border-radius:10px; padding:12px; background:#fff; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between; gap:12px; box-shadow:0 1px 3px rgba(0,0,0,0.02);">
        <div style="display:flex; flex-direction:column; gap:4px; flex:1; min-width:0;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <span style="font-size:14px; font-weight:900; color:#0f172a;">🔍 "${escHtml(s.query || '')}"</span>
            ${badge}
            ${pageBadge}
          </div>
          <div style="font-size:11.5px; color:#64748b;">
            <span>מאת: <strong>${escHtml(s.user || 'אורח')}</strong></span> &bull; <span>${time}</span>
          </div>
        </div>
        <button onclick="deleteSearchHistoryItem('${artEsc(key)}')" title="מחק חיפוש" style="background:none; border:none; color:#e11d48; font-size:16px; cursor:pointer; flex-shrink:0;">🗑️</button>
      </div>
    `;
  }).join('');
}

async function deleteSearchHistoryItem(key) {
  try { await set(ref(db, `website/search_history/${key}`), null); } catch (e) { console.error(e); }
}
window.deleteSearchHistoryItem = deleteSearchHistoryItem;

async function clearAllSearchHistory() {
  if (!confirm('האם למחוק את כל היסטוריית החיפושים?')) return;
  try { await set(ref(db, 'website/search_history'), null); } catch (e) { console.error(e); }
}
window.clearAllSearchHistory = clearAllSearchHistory;

function subscribeUserSubmissions() {
  if (userSubmissionsSubscribed) return;
  userSubmissionsSubscribed = true;
  onValue(ref(db, 'website/user_submissions'), (snap) => {
    userSubmissionsData = snap.val() || {};
    const listEl = document.getElementById('info-submissions-list');
    if (listEl) listEl.innerHTML = infoSubmissionsListHTML();
  });
}

function subscribeAdminInfo() {
  if (adminInfoSubscribed) return;
  adminInfoSubscribed = true;
  onValue(ref(db, 'website/admin_info/notes'), (snap) => {
    adminInfoText = snap.val() || '';
    const ta = document.getElementById('admin-info-notes');
    if (ta && document.activeElement !== ta) ta.value = adminInfoText;
  });
}

// טופס ציבורי להשארת מידע — פתוח לכולם (רשומים ואורחים)
function buildInfoSubmitBox() {
  const prefill = (auth.currentUser && typeof liveChatUserName === 'function') ? escHtml(liveChatUserName()) : '';
  return `
    <div class="art-sidebar-box" style="border:1.5px solid #e2e8f0; border-radius:12px; padding:16px; text-align:right; direction:rtl;">
      <div style="font-size:14px; font-weight:900; color:#0f172a; margin-bottom:4px;">📩 השאירו לנו מידע</div>
      <div style="font-size:12px; color:#64748b; margin-bottom:10px; line-height:1.4;">כל אחד יכול לכתוב לנו — גם בלי הרשמה.</div>
      <input id="info-submit-name" type="text" placeholder="שם (אופציונלי)" value="${prefill}" style="width:100%; box-sizing:border-box; padding:9px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px; margin-bottom:8px;">
      <textarea id="info-submit-text" rows="3" placeholder="כתבו כאן את המידע/ההודעה..." style="width:100%; box-sizing:border-box; padding:9px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px; resize:vertical; margin-bottom:8px;"></textarea>
      <button onclick="submitUserInfo()" style="width:100%; background:#e11d48; color:#fff; border:none; border-radius:8px; padding:10px; font-size:13.5px; font-weight:800; cursor:pointer;">שליחה</button>
    </div>
  `;
}
window.buildInfoSubmitBox = buildInfoSubmitBox;

async function submitUserInfo() {
  const nameEl = document.getElementById('info-submit-name');
  const textEl = document.getElementById('info-submit-text');
  const text = textEl ? textEl.value.trim() : '';
  if (!text) { alert('נא לכתוב הודעה'); return; }
  const name = (nameEl && nameEl.value.trim()) || (auth.currentUser && typeof liveChatUserName === 'function' ? liveChatUserName() : 'אורח');
  try {
    await push(ref(db, 'website/user_submissions'), {
      name: name.slice(0, 60),
      uid: auth.currentUser ? auth.currentUser.uid : '',
      registered: !!auth.currentUser,
      text: text.slice(0, 1000),
      timestamp: Date.now()
    });
    if (textEl) textEl.value = '';
    if (typeof showCopyToast === 'function') showCopyToast('✅ המידע נשלח, תודה!');
  } catch (e) {
    console.error('submit info failed', e);
    if (typeof showCopyToast === 'function') showCopyToast('שגיאה בשליחה, נסו שוב');
  }
}
window.submitUserInfo = submitUserInfo;

function infoSubmissionsListHTML() {
  // בקשות-תוכן (submissionType==='content') שייכות לעמוד "בקשות לאישור", לא כאן
  const entries = Object.entries(userSubmissionsData || {}).filter(([k, v]) => !(v && v.submissionType === 'content')).sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));
  if (!entries.length) {
    return '<div style="text-align:center; color:#94a3b8; font-size:13px; padding:24px;">עדיין לא התקבלו הגשות.</div>';
  }
  return entries.map(([key, s]) => {
    const time = s.timestamp ? new Date(s.timestamp).toLocaleString('he-IL') : '';
    const badge = s.registered ? '<span style="background:#dcfce7; color:#166534; font-size:10px; font-weight:800; padding:2px 6px; border-radius:6px;">רשום</span>' : '<span style="background:#f1f5f9; color:#64748b; font-size:10px; font-weight:800; padding:2px 6px; border-radius:6px;">אורח</span>';
    return `
      <div style="border:1px solid #e2e8f0; border-radius:10px; padding:12px; background:#fff; margin-bottom:10px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:14px; font-weight:900; color:#0f172a;">${escHtml(s.name || 'אורח')}</span>
            ${badge}
          </div>
          <button onclick="deleteUserSubmission('${artEsc(key)}')" title="מחק" style="background:none; border:none; color:#e11d48; font-size:16px; cursor:pointer;">🗑️</button>
        </div>
        <div style="font-size:13.5px; color:#1e293b; line-height:1.5; white-space:pre-wrap; word-break:break-word;">${escHtml(s.text || '')}</div>
        <div style="font-size:11px; color:#94a3b8; margin-top:6px;">${time}</div>
      </div>
    `;
  }).join('');
}

async function deleteUserSubmission(key) {
  if (!confirm('למחוק הגשה זו?')) return;
  try { await set(ref(db, `website/user_submissions/${key}`), null); } catch (e) { console.error(e); }
}
window.deleteUserSubmission = deleteUserSubmission;

async function saveAdminInfo() {
  const ta = document.getElementById('admin-info-notes');
  if (!ta) return;
  try {
    await set(ref(db, 'website/admin_info/notes'), ta.value.slice(0, 20000));
    if (typeof showCopyToast === 'function') showCopyToast('✅ המידע נשמר');
  } catch (e) { console.error(e); if (typeof showCopyToast === 'function') showCopyToast('שגיאה בשמירה'); }
}
window.saveAdminInfo = saveAdminInfo;

function buildInfoPage() {
  subscribeSearchHistory();
  subscribeUserSubmissions();
  subscribeAdminInfo();
  const allowed = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);
  if (!allowed) {
    return `<div class="info-page" data-page-id="page-info-main"><div class="comm-inner"><div style="text-align:center; padding:60px 20px; color:#64748b; font-size:16px; font-weight:700;">🔒 עמוד זה גלוי למנהל בלבד.</div></div></div>`;
  }
  const kpi = (id, label, icon, color) => `
    <div style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
      <div style="font-size:12px; color:#64748b; font-weight:800; display:flex; align-items:center; gap:6px;">${icon} ${label}</div>
      <div id="${id}" style="font-size:26px; font-weight:900; color:${color}; margin-top:6px;">…</div>
    </div>`;
  const analyticsHTML = `
    <div style="margin-bottom:20px; display:flex; gap:10px; flex-wrap:wrap;">
      <button type="button" onclick="openOnboardingAdmin()" style="background:#3b6ef5; color:#fff; border:none; border-radius:10px; padding:10px 18px; font-weight:800; font-size:14px; cursor:pointer;">🎬 הגדרות מדריך (אונבורדינג)</button>
      <button type="button" onclick="openSiteTourEditor()" style="background:#4a7fd4; color:#fff; border:none; border-radius:10px; padding:10px 18px; font-weight:800; font-size:14px; cursor:pointer;">🧭 כיוון סיור ההדרכה</button>
    </div>
    <div style="margin-bottom:24px;">
      <div style="font-size:16px; font-weight:900; color:#0f172a; margin-bottom:12px;">📊 נתוני האתר <span style="font-size:12px; color:#94a3b8; font-weight:700;">(מתעדכן בזמן אמת)</span></div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px; margin-bottom:14px;">
        ${kpi('an-today', 'כניסות היום', '👥', '#e11d48')}
        ${kpi('an-month', 'כניסות החודש', '📅', '#e11d48')}
        ${kpi('an-total', 'סה״כ כניסות', '🚪', '#0f172a')}
        ${kpi('an-pageviews', 'צפיות בעמודים', '👁️', '#0f172a')}
        ${kpi('an-users', 'משתמשים רשומים', '🧑‍🤝‍🧑', '#2563eb')}
        ${kpi('an-active24', 'פעילים ב-24 שעות', '🟢', '#16a34a')}
        ${kpi('an-active30', 'פעילים ב-30 יום', '📈', '#16a34a')}
        ${kpi('an-galleries', 'גלריות', '🖼️', '#8b5cf6')}
        ${kpi('an-stories', 'סיפורים', '📖', '#8b5cf6')}
        ${kpi('an-products', 'מוצרי יד שניה', '🛒', '#8b5cf6')}
        ${kpi('an-communities', 'קהילות', '👥', '#f59e0b')}
        ${kpi('an-questions', 'שאלות גולשים', '❓', '#f59e0b')}
        ${kpi('an-likes', 'סה״כ לייקים', '❤️', '#ef4444')}
        ${kpi('an-views', 'סה״כ צפיות בתכנים', '🔥', '#ef4444')}
      </div>
      <div style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,0.03);">
        <div style="font-size:13px; font-weight:900; color:#0f172a; margin-bottom:12px;">כניסות ב-7 הימים האחרונים</div>
        <div id="an-chart" style="display:flex; align-items:flex-end; justify-content:space-between; gap:8px; height:130px;"></div>
      </div>
    </div>`;
  setTimeout(function () { if (typeof loadAnalytics === 'function') loadAnalytics(); }, 60);
  return `
    <div class="info-page" data-page-id="page-info-main">
      <div class="comm-inner">
        <div style="max-width:900px; margin:0 auto; direction:rtl; text-align:right;">
          <h2 style="font-size:24px; font-weight:900; color:#0f172a; margin:0 0 16px;">🔒 מידע (למנהל בלבד)</h2>

          ${analyticsHTML}

          <div style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:18px; margin-bottom:24px; box-shadow:0 4px 15px rgba(0,0,0,0.03);">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
              <div style="font-size:16px; font-weight:900; color:#0f172a;">🔍 היסטוריית חיפושים ושיחות מכל הגולשים (כולל אורחים)</div>
              <button onclick="clearAllSearchHistory()" style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:4px 10px; font-size:12px; font-weight:700; color:#475569; cursor:pointer;">🗑️ ניקוי היסטוריית חיפושים</button>
            </div>
            <div id="search-history-list">${searchHistoryListHTML()}</div>
          </div>

          <div style="background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:18px; margin-bottom:24px; box-shadow:0 4px 15px rgba(0,0,0,0.03);">
            <div style="font-size:16px; font-weight:900; color:#0f172a; margin-bottom:8px;">📝 המידע שלי</div>
            <textarea id="admin-info-notes" rows="8" placeholder="כתוב כאן מידע פרטי שרק אתה רואה..." style="width:100%; box-sizing:border-box; padding:12px; border:1px solid #ddd; border-radius:10px; font-size:14px; line-height:1.6; resize:vertical;">${escHtml(adminInfoText)}</textarea>
            <button onclick="saveAdminInfo()" style="margin-top:10px; background:#e11d48; color:#fff; border:none; border-radius:8px; padding:10px 20px; font-size:14px; font-weight:800; cursor:pointer;">שמור מידע</button>
          </div>

          <div style="font-size:16px; font-weight:900; color:#0f172a; margin-bottom:12px;">📥 מידע שהתקבל ממשתמשים (טופס ציבורי)</div>
          <div id="info-submissions-list">${infoSubmissionsListHTML()}</div>

          <div style="margin-top:28px;">
            ${typeof buildSiteStatsSection === 'function' ? buildSiteStatsSection() : ''}
          </div>
        </div>
        ${typeof crmSectionHTML === 'function' ? crmSectionHTML() : ''}
      </div>
    </div>`;
}
window.buildInfoPage = buildInfoPage;

// שולף מערך פריטים מתוך תוכן עמוד (data-photos-json / data-stories-json)
function _analyticsPageItems(matchStr, excludeStr) {
  if (typeof pages === 'undefined' || !Array.isArray(pages)) return [];
  const p = pages.find(pg => pg && (pg.content || '').includes(matchStr) && (!excludeStr || !(pg.content || '').includes(excludeStr)));
  if (!p) return [];
  const m = (p.content || '').match(/data-(?:photos|stories)-json="([^"]*)"/);
  if (!m) return [];
  try { return JSON.parse(decodeURIComponent(m[1])) || []; } catch (e) { return []; }
}

function renderAnalyticsChart(daily) {
  const el = document.getElementById('an-chart');
  if (!el) return;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push({ key: _analyticsDayKey(d), label: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'][d.getDay()], val: (daily && daily[_analyticsDayKey(d)]) || 0 });
  }
  const max = Math.max(1, ...days.map(d => d.val));
  el.innerHTML = days.map(d => {
    const h = Math.round((d.val / max) * 100);
    return `<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; height:100%;">
      <div style="font-size:11px; font-weight:800; color:#334155;">${escHtml(d.val)}</div>
      <div style="width:100%; flex:1; display:flex; align-items:flex-end;"><div style="width:100%; height:${h}%; min-height:3px; background:linear-gradient(180deg,#f43f5e,#e11d48); border-radius:6px 6px 0 0;"></div></div>
      <div style="font-size:11px; color:#94a3b8; font-weight:700;">${escHtml(d.label)}</div>
    </div>`;
  }).join('');
}
window.renderAnalyticsChart = renderAnalyticsChart;

async function loadAnalytics() {
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const num = n => (Number(n) || 0).toLocaleString('he-IL');
  // נתונים מ-Firebase
  try {
    const [an, us, comm, q] = await Promise.all([
      get(ref(db, 'website/analytics')).then(s => s.val() || {}).catch(() => ({})),
      get(ref(db, 'website/users')).then(s => s.val() || {}).catch(() => ({})),
      get(ref(db, 'website/communities')).then(s => s.val() || {}).catch(() => ({})),
      get(ref(db, 'website/questions')).then(s => s.val() || {}).catch(() => ({}))
    ]);
    const today = _analyticsDayKey(), month = _analyticsMonthKey();
    setTxt('an-today', num((an.daily && an.daily[today]) || 0));
    setTxt('an-month', num((an.monthly && an.monthly[month]) || 0));
    setTxt('an-total', num(an.visits || 0));
    setTxt('an-pageviews', num(an.pageviews || 0));
    const uids = Object.keys(us || {});
    setTxt('an-users', num(uids.length));
    const now = Date.now();
    let a24 = 0, a30 = 0;
    uids.forEach(u => { const ls = us[u] && us[u].last_seen; if (ls) { if (now - ls <= 86400000) a24++; if (now - ls <= 2592000000) a30++; } });
    setTxt('an-active24', num(a24));
    setTxt('an-active30', num(a30));
    setTxt('an-communities', num(Object.keys(comm || {}).length));
    setTxt('an-questions', num(Object.keys(q || {}).length));
    renderAnalyticsChart(an.daily || {});
  } catch (e) {}
  // נתוני תוכן מהעמודים המקומיים
  try {
    const galleries = _analyticsPageItems('photos-page', 'secondhand-page').filter(a => a && a.id);
    const stories = _analyticsPageItems('stories-page');
    const products = _analyticsPageItems('secondhand-page');
    setTxt('an-galleries', num(galleries.length));
    setTxt('an-stories', num(stories.length));
    setTxt('an-products', num(products.length));
    let likes = 0, views = 0;
    galleries.concat(products).forEach(a => { likes += (a.likes || 0); views += (typeof photoGetViews === 'function' ? photoGetViews(a.id) : (a.views || 0)); });
    setTxt('an-likes', num(likes));
    setTxt('an-views', num(views));
  } catch (e) {}
}
window.loadAnalytics = loadAnalytics;

// ============================================================
// עמוד "שאלות גולשים" — לוח שאלות ועצות (Q&A) מבוסס Firebase
// ============================================================
let questionsData = {};
let questionsSubscribed = false;
let questionsSearchQuery = '';
let activeQuestionId = null;
const QUESTION_CATEGORIES = ['כללי', 'זוגיות', 'עבודה וקריירה', 'הורות ומשפחה', 'בריאות ונפש', 'בין הסדינים', 'מצבים ואנשים'];

function subscribeQuestions() {
  if (questionsSubscribed) return;
  questionsSubscribed = true;
  onValue(ref(db, 'website/questions'), snap => {
    questionsData = snap.val() || {};
    const listEl = document.getElementById('questions-list');
    if (listEl) listEl.innerHTML = questionsListHTML();
    if (activeQuestionId && mainContent.querySelector('.question-detail')) openQuestion(activeQuestionId);
  });
}

function questionAnswerCount(q) { return q.answers ? Object.keys(q.answers).length : 0; }

function questionMetaLine(q) {
  const who = q.anonymous ? 'אנונימי' : (q.authorName || 'אנונימי');
  return [escHtml(who), q.age ? ('גיל ' + escHtml(String(q.age))) : '', 'מתוך: ' + escHtml(q.category || 'כללי')].filter(Boolean).join(', ');
}

function questionsListHTML() {
  let list = Object.values(questionsData).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (questionsSearchQuery) {
    list = list.filter(q => (q.title || '').toLowerCase().includes(questionsSearchQuery) || (q.category || '').toLowerCase().includes(questionsSearchQuery));
  }
  if (!list.length) return `<div class="q-empty">${questionsSearchQuery ? 'לא נמצאו שאלות התואמות לחיפוש.' : 'עדיין אין שאלות — היו הראשונים לשאול!'}</div>`;
  return list.map(q => {
    const n = questionAnswerCount(q);
    return `<div class="q-row" onclick="openQuestion('${artEsc(q.id)}')">
      <div class="q-count"><span class="q-count-num">${n}</span><span class="q-count-lbl">עצות</span></div>
      <div class="q-row-main">
        <div class="q-row-title">${escHtml(q.title || '')}</div>
        <div class="q-row-meta">(${questionMetaLine(q)})</div>
      </div>
    </div>`;
  }).join('');
}
window.questionsListHTML = questionsListHTML;

function questionsSearch(val) {
  if (typeof logSearchQuery === 'function' && val) {
    logSearchQuery(val, 'שאלות');
  }
  questionsSearchQuery = (val || '').toLowerCase().trim();
  const el = document.getElementById('questions-list');
  if (el) el.innerHTML = questionsListHTML();
}
window.questionsSearch = questionsSearch;

function buildQuestionsPage() {
  subscribeQuestions();
  return `
    <div class="questions-page" data-page-id="page-questions-main">
      <div class="art-inner">
        <div class="art-layout">
          <div class="art-main">
            <div class="q-head">
              <h2 class="q-title">❓ שאלות גולשים</h2>
              <p class="q-sub">שאלו את הקהילה — או תנו עצה למי שצריך.</p>
              <button onclick="openQuestionModal()" class="q-ask-btn">➕ שאל שאלה</button>
            </div>
            <div class="art-search-wrap">
              <input type="text" class="art-search" placeholder="🔍 חיפוש שאלות..." value="${escHtml(questionsSearchQuery)}" oninput="questionsSearch(this.value)">
            </div>
            <div class="q-list" id="questions-list">${questionsListHTML()}</div>
          </div>
          <div class="art-sidebar art-sidebar-right">
            <button onclick="openQuestionModal()" style="background:#8b5cf6; width:100%; padding:12px 16px; border-radius:8px; border:none; color:white; font-weight:bold; font-size:14px; cursor:pointer; margin-bottom:16px;">➕ שאל שאלה חדשה</button>
            ${buildSidebarTabs('', 'questions')}
          </div>
          ${buildLeftSidebarBox('', 'questions')}
        </div>
      </div>
    </div>`;
}
window.buildQuestionsPage = buildQuestionsPage;

function openQuestion(id) {
  subscribeQuestions();
  const q = questionsData[id];
  if (!q) { if (typeof showCopyToast === 'function') showCopyToast('השאלה לא נמצאה'); return; }
  activeQuestionId = id;
  const answers = q.answers ? Object.values(q.answers).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)) : [];
  const answersHTML = answers.length ? answers.map(a => `
    <div class="q-answer">
      <div class="q-answer-head">${escHtml(a.name || 'אנונימי')} · ${a.createdAt ? new Date(a.createdAt).toLocaleDateString('he-IL') : ''}</div>
      <div class="q-answer-text">${escHtml(a.text || '')}</div>
    </div>`).join('') : '<div class="q-empty">עדיין אין עצות. היו הראשונים לענות!</div>';
  mainContent.innerHTML = `
    <div class="questions-page question-detail" data-page-id="page-questions-main">
      <div class="comm-inner">
        <button onclick="backToQuestions()" class="q-back">← חזרה לשאלות</button>
        <div class="q-detail-card">
          <div class="q-detail-title">${escHtml(q.title || '')}</div>
          <div class="q-detail-meta">(${questionMetaLine(q)})</div>
          ${q.text ? `<div class="q-detail-text">${escHtml(q.text)}</div>` : ''}
        </div>
        <div class="q-answers-title">💬 עצות (${answers.length})</div>
        <div id="q-answers-list">${answersHTML}</div>
        <div class="q-answer-form">
          <textarea id="q-answer-input" rows="3" placeholder="כתבו עצה או תגובה..."></textarea>
          <button onclick="submitAnswer('${artEsc(id)}')" class="q-answer-send">שלח עצה</button>
        </div>
      </div>
    </div>`;
  try { window.scrollTo(0, 0); } catch (e) {}
}
window.openQuestion = openQuestion;

function backToQuestions() {
  activeQuestionId = null;
  mainContent.innerHTML = buildQuestionsPage();
}
window.backToQuestions = backToQuestions;

async function submitAnswer(qid) {
  const inp = document.getElementById('q-answer-input');
  const text = inp ? inp.value.trim() : '';
  if (!text) { alert('נא לכתוב עצה'); return; }
  const name = (auth.currentUser && typeof liveChatUserName === 'function') ? liveChatUserName() : 'אנונימי';
  try {
    await push(ref(db, `website/questions/${qid}/answers`), { text: text.slice(0, 2000), name, uid: auth.currentUser ? auth.currentUser.uid : '', createdAt: Date.now() });
    if (inp) inp.value = '';
  } catch (e) { console.error('answer failed', e); if (typeof showCopyToast === 'function') showCopyToast('שגיאה בשליחה'); }
}
window.submitAnswer = submitAnswer;

function openQuestionModal() {
  ['question-title', 'question-text', 'question-age', 'question-name'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const anon = document.getElementById('question-anon'); if (anon) anon.checked = false;
  const nameEl = document.getElementById('question-name');
  if (nameEl && auth.currentUser && typeof liveChatUserName === 'function') nameEl.value = liveChatUserName();
  const m = document.getElementById('question-modal'); if (m) m.style.display = 'flex';
}
window.openQuestionModal = openQuestionModal;

async function saveQuestion() {
  const titleEl = document.getElementById('question-title');
  const title = titleEl ? titleEl.value.trim() : '';
  if (!title) { alert('נא לכתוב את השאלה'); return; }
  const anon = !!(document.getElementById('question-anon') && document.getElementById('question-anon').checked);
  const id = 'q' + Date.now();
  const q = {
    id,
    title: title.slice(0, 200),
    text: ((document.getElementById('question-text') || {}).value || '').trim().slice(0, 3000),
    category: (document.getElementById('question-category') || {}).value || 'כללי',
    age: ((document.getElementById('question-age') || {}).value || '').trim().slice(0, 10),
    anonymous: anon,
    authorName: anon ? '' : (((document.getElementById('question-name') || {}).value || '').trim() || (auth.currentUser && typeof liveChatUserName === 'function' ? liveChatUserName() : 'אנונימי')),
    authorUid: auth.currentUser ? auth.currentUser.uid : '',
    createdAt: Date.now()
  };
  try {
    await set(ref(db, `website/questions/${id}`), q);
    const m = document.getElementById('question-modal'); if (m) m.style.display = 'none';
    if (typeof showCopyToast === 'function') showCopyToast('✅ השאלה פורסמה!');
    activeQuestionId = null;
    if (mainContent.querySelector('.questions-page')) mainContent.innerHTML = buildQuestionsPage();
  } catch (e) { console.error('save question failed', e); if (typeof showCopyToast === 'function') showCopyToast('שגיאה בפרסום'); }
}
window.saveQuestion = saveQuestion;

// ============================================================
// עמוד "הצעות" — הצעות עם זמן מוגבל (טיימר ספירה לאחור). "אשר" פותח שיחה.
// ============================================================
let offersData = {};
let offersSubscribed = false;

function subscribeOffers() {
  if (offersSubscribed) return;
  offersSubscribed = true;
  onValue(ref(db, 'website/offers'), snap => {
    offersData = snap.val() || {};
    const el = document.getElementById('offers-list');
    if (el) el.innerHTML = offersListHTML();
  });
}

function offerFmt(ms) {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return [h, m, sec].map(x => String(x).padStart(2, '0')).join(':');
}

// ריבוע משתתף בהצעה — לחיצה פותחת את פרופיל המשתמש
function offerParticipantTileHTML(p, kind) {
  const name = p.name || 'משתתף';
  const initial = escHtml(String(name).trim().charAt(0) || '?');
  const role = p.isHost ? (kind === 'woman' ? '👑 מארחת' : '👑 מארח') : (kind === 'woman' ? 'משתתפת' : 'משתתף');
  return `
    <button type="button" class="of-part-tile ${kind} ${p.isHost ? 'host' : ''}" onclick="event.stopPropagation(); if(typeof openUserPage==='function') openUserPage('${artEsc(p.uid || '')}', '${artEsc(name)}')" title="צפייה בפרופיל של ${escHtml(name)}">
      <span class="of-part-avatar">${initial}</span>
      <span class="of-part-name">${escHtml(name)}</span>
      <span class="of-part-role">${role}</span>
    </button>`;
}

function offersListHTML() {
  const now = Date.now();
  const list = Object.values(offersData).filter(o => o && (!o.expiresAt || o.expiresAt > now)).sort((a, b) => (a.expiresAt || 0) - (b.expiresAt || 0));
  if (!list.length) return '<div class="of-empty">אין הצעות פעילות כרגע.<br>היו הראשונים להוסיף הצעה! 🔥</div>';
  const myUid = auth.currentUser ? auth.currentUser.uid : '';

  return list.map(o => {
    const mine = myUid && o.authorUid === myUid;
    const requests = o.requests || {};
    const participants = o.participants || {};
    const myReq = myUid ? requests[myUid] : null;

    const hostGender = o.authorGender || 'גבר';
    const hostParticipant = {
      uid: o.authorUid,
      name: o.authorName || 'אנונימי',
      gender: hostGender,
      isHost: true
    };

    const participantList = Object.values(participants);
    const allParticipants = [hostParticipant, ...participantList];

    const menList = allParticipants.filter(p => (p.gender || 'גבר') === 'גבר');
    const womenList = allParticipants.filter(p => p.gender === 'אישה');

    const maxCount = o.maxCount || 4;
    const currentCount = allParticipants.length;
    const spotsLeft = Math.max(0, maxCount - currentCount);
    const isFull = currentCount >= maxCount;

    const structuredBadgesHTML = `
      <div class="of-details-grid">
        <div class="of-detail-pill">📍 <strong>איפה:</strong> ${escHtml(o.location || 'לא צוין')}</div>
        <div class="of-detail-pill">⏰ <strong>מתי:</strong> ${escHtml(o.whenTime || 'הערב')}</div>
        <div class="of-detail-pill">🎯 <strong>כמה לצרף:</strong> ${maxCount} משתתפים ${isFull ? '<span class="of-pill-full">(🔒 מלא)</span>' : `<span class="of-pill-left">(נשארו עוד ${spotsLeft})</span>`}</div>
      </div>
    `;

    const participantsHTML = `
      <div class="of-participants-box">
        <div class="of-participants-header">
          <div class="of-participants-title">👥 משתתפים בהצעה (${currentCount} / ${maxCount})</div>
          <div class="of-gender-counts">
            <span class="of-count-chip men">♂️ ${menList.length} גברים</span>
            <span class="of-count-chip women">♀️ ${womenList.length} נשים</span>
          </div>
        </div>

        <div class="of-gender-groups">
          <div class="of-gender-group men-group">
            <div class="of-group-title">♂️ גברים (${menList.length}):</div>
            <div class="of-participants-grid">
              ${menList.length ? menList.map(p => offerParticipantTileHTML(p, 'man')).join('') : '<span class="of-no-part">אין גברים עדיין</span>'}
            </div>
          </div>

          <div class="of-gender-group women-group">
            <div class="of-group-title">♀️ נשים (${womenList.length}):</div>
            <div class="of-participants-grid">
              ${womenList.length ? womenList.map(p => offerParticipantTileHTML(p, 'woman')).join('') : '<span class="of-no-part">אין נשים עדיין</span>'}
            </div>
          </div>
        </div>
      </div>
    `;

    let pendingBoxHTML = '';
    if (mine) {
      const pendingList = Object.values(requests).filter(r => r && r.status === 'pending');
      if (pendingList.length > 0) {
        pendingBoxHTML = `
          <div class="of-pending-box">
            <div class="of-pending-title">📥 בקשות הצטרפות ממתינות (${pendingList.length}):</div>
            <div class="of-pending-list">
              ${pendingList.map(r => `
                <div class="of-pending-item">
                  <span class="of-pending-name">👤 ${escHtml(r.name || 'משתמש')} <span class="of-pending-gender">(${r.gender === 'אישה' ? '♀️ אישה' : '♂️ גבר'})</span></span>
                  <div class="of-pending-actions">
                    <button class="of-appr-btn" onclick="approveJoinRequest('${artEsc(o.id)}','${artEsc(r.uid)}','${artEsc(r.name)}','${artEsc(r.gender || 'גבר')}')">✓ אשר</button>
                    <button class="of-decl-btn" onclick="declineJoinRequest('${artEsc(o.id)}','${artEsc(r.uid)}')">✕ דחה</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    }

    let actionBtnHTML = '';
    if (mine) {
      actionBtnHTML = `<span class="of-mine">ההצעה שלך</span>`;
    } else if (myReq && myReq.status === 'pending') {
      actionBtnHTML = `<button class="of-confirm of-btn-pending" disabled>⏳ בקשה נשלחה</button>`;
    } else if (myReq && myReq.status === 'approved') {
      actionBtnHTML = `<button class="of-confirm of-btn-approved" onclick="dmStartWith('${artEsc(o.authorUid || '')}','${artEsc(o.authorName || '')}')">💬 בצ'אט (אושרת)</button>`;
    } else if (isFull) {
      actionBtnHTML = `<button class="of-confirm of-btn-full" disabled>🔒 מלא (${currentCount}/${maxCount})</button>`;
    } else {
      actionBtnHTML = `<button class="of-confirm of-btn-join" onclick="requestJoinOffer('${artEsc(o.id)}')">✋ בקש להצטרף</button>`;
    }

    return `<div class="of-card">
      <div class="of-top-row">
        <div class="of-main">
          <div class="of-text">${escHtml(o.text || '')}</div>
          <div class="of-meta">מאת ${escHtml(o.authorName || 'אנונימי')} (${hostGender === 'אישה' ? '♀️ אישה' : '♂️ גבר'})</div>
          ${structuredBadgesHTML}
        </div>
        <div class="of-side">
          <div class="of-timer" data-expires="${o.expiresAt || 0}">${offerFmt((o.expiresAt || 0) - now)}</div>
          ${actionBtnHTML}
        </div>
      </div>
      ${participantsHTML}
      ${pendingBoxHTML}
    </div>`;
  }).join('');
}
window.offersListHTML = offersListHTML;

function updateOfferTimers() {
  const timers = document.querySelectorAll('.of-timer');
  if (!timers.length) return;
  const now = Date.now();
  let expired = false;
  timers.forEach(el => {
    const exp = Number(el.dataset.expires) || 0;
    const left = exp - now;
    if (left <= 0) { el.textContent = 'הסתיים'; el.classList.add('ended'); expired = true; }
    else el.textContent = offerFmt(left);
  });
  if (expired) { const el = document.getElementById('offers-list'); if (el) el.innerHTML = offersListHTML(); }
}
if (typeof window !== 'undefined') setInterval(updateOfferTimers, 1000);

function buildOffersPage() {
  subscribeOffers();
  return `
    <div class="offers-page" data-page-id="page-offers-main">
      <div class="art-inner">
        <div class="art-layout">
          <div class="art-main">
            <div class="of-head">
              <h2 class="of-title">🔥 הצעות להערב</h2>
              <p class="of-sub">הצעות מפורטות ומאורגנות עם זמן, מיקום ומכסת משתתפים — לחצו "בקש להצטרף" כדי להגיש בקשה למארח!</p>
              <button onclick="openOfferModal()" class="of-add-btn">➕ הוסף הצעה</button>
            </div>
            <div class="of-list" id="offers-list">${offersListHTML()}</div>
          </div>
          <div class="art-sidebar art-sidebar-right">
            <button onclick="openOfferModal()" style="background:#e11d48; width:100%; padding:12px 16px; border-radius:8px; border:none; color:white; font-weight:bold; font-size:14px; cursor:pointer; margin-bottom:16px;">➕ הוסף הצעה חדשה</button>
            ${buildSidebarTabs('', 'offers')}
          </div>
          ${buildLeftSidebarBox('', 'offers')}
        </div>
      </div>
    </div>`;
}
window.buildOffersPage = buildOffersPage;

let pendingOfferJoinId = null;

function confirmOffer(uid, name, offerId) {
  if (!uid) { if (typeof showCopyToast === 'function') showCopyToast('אין איש קשר להצעה זו'); return; }
  let prefill = '';
  const o = (offerId && typeof offersData === 'object' && offersData) ? offersData[offerId] : null;
  if (o && o.text) prefill = `שלום! אני מעוניין/ת בהצעה: "${String(o.text).slice(0, 120)}"`;
  if (typeof dmStartWith === 'function') dmStartWith(uid, name || 'איש קשר', prefill);
}
window.confirmOffer = confirmOffer;

async function requestJoinOffer(offerId) {
  if (!auth.currentUser) {
    if (typeof openLiveChatLogin === 'function') openLiveChatLogin();
    return;
  }
  const myUid = auth.currentUser.uid;
  const savedGender = localStorage.getItem('user_gender_' + myUid);
  if (!savedGender) {
    pendingOfferJoinId = offerId;
    const modal = document.getElementById('join-gender-modal');
    if (modal) modal.style.display = 'flex';
    return;
  }
  await submitJoinWithGender(savedGender, offerId);
}
window.requestJoinOffer = requestJoinOffer;

async function submitJoinWithGender(gender, offerId) {
  offerId = offerId || pendingOfferJoinId;
  const m = document.getElementById('join-gender-modal');
  if (m) m.style.display = 'none';
  if (!auth.currentUser || !offerId) return;

  const myUid = auth.currentUser.uid;
  const myName = (typeof liveChatUserName === 'function' ? liveChatUserName() : 'משתמש');
  localStorage.setItem('user_gender_' + myUid, gender);

  try {
    await set(ref(db, `website/offers/${offerId}/requests/${myUid}`), {
      uid: myUid,
      name: myName,
      gender: gender,
      status: 'pending',
      requestedAt: Date.now()
    });
    if (typeof showCopyToast === 'function') showCopyToast('✋ בקשת הצטרפות נשלחה!');
  } catch (e) {
    console.error('requestJoinOffer failed', e);
    if (typeof showCopyToast === 'function') showCopyToast('שגיאה בשליחת הבקשה');
  }
}
window.submitJoinWithGender = submitJoinWithGender;

async function approveJoinRequest(offerId, requesterUid, requesterName, requesterGender) {
  if (!auth.currentUser) return;
  try {
    await update(ref(db, `website/offers/${offerId}/requests/${requesterUid}`), { status: 'approved' });
    await set(ref(db, `website/offers/${offerId}/participants/${requesterUid}`), {
      uid: requesterUid,
      name: requesterName || 'משתתף',
      gender: requesterGender || 'גבר',
      joinedAt: Date.now()
    });
    if (typeof showCopyToast === 'function') showCopyToast('✅ הבקשה אושרה!');
  } catch (e) {
    console.error('approveJoinRequest failed', e);
    if (typeof showCopyToast === 'function') showCopyToast('שגיאה באישור הבקשה');
  }
}
window.approveJoinRequest = approveJoinRequest;

async function declineJoinRequest(offerId, requesterUid) {
  if (!auth.currentUser) return;
  try {
    await update(ref(db, `website/offers/${offerId}/requests/${requesterUid}`), { status: 'declined' });
    if (typeof showCopyToast === 'function') showCopyToast('✕ הבקשה נדחתה');
  } catch (e) {
    console.error('declineJoinRequest failed', e);
    if (typeof showCopyToast === 'function') showCopyToast('שגיאה בדחיית הבקשה');
  }
}
window.declineJoinRequest = declineJoinRequest;

function openOfferModal() {
  if (!auth.currentUser) { if (typeof openLiveChatLogin === 'function') openLiveChatLogin(); return; }
  const t = document.getElementById('offer-text'); if (t) t.value = '';
  const loc = document.getElementById('offer-location'); if (loc) loc.value = '';
  const w = document.getElementById('offer-when'); if (w) w.value = '';
  const max = document.getElementById('offer-max-participants'); if (max) max.value = '4';
  const h = document.getElementById('offer-hours'); if (h) h.value = '8';
  const m = document.getElementById('offer-modal'); if (m) m.style.display = 'flex';
}
window.openOfferModal = openOfferModal;

async function saveOffer() {
  if (!auth.currentUser) { if (typeof openLiveChatLogin === 'function') openLiveChatLogin(); return; }
  const text = ((document.getElementById('offer-text') || {}).value || '').trim();
  if (!text) { alert('נא לכתוב מה ההצעה'); return; }
  const location = ((document.getElementById('offer-location') || {}).value || '').trim() || 'אזור המרכז';
  const whenTime = ((document.getElementById('offer-when') || {}).value || '').trim() || 'הערב';
  const maxCount = parseInt((document.getElementById('offer-max-participants') || {}).value) || 4;
  const gender = ((document.getElementById('offer-gender') || {}).value) || 'גבר';
  let hours = parseFloat((document.getElementById('offer-hours') || {}).value) || 8;
  hours = Math.min(Math.max(hours, 0.5), 72);
  const id = 'of' + Date.now();
  const now = Date.now();
  if (auth.currentUser) localStorage.setItem('user_gender_' + auth.currentUser.uid, gender);
  const offer = {
    id,
    text: text.slice(0, 300),
    location: location.slice(0, 100),
    whenTime: whenTime.slice(0, 100),
    maxCount: Math.min(Math.max(maxCount, 1), 50),
    hours,
    authorUid: auth.currentUser.uid,
    authorName: (typeof liveChatUserName === 'function' ? liveChatUserName() : 'אנונימי'),
    authorGender: gender,
    createdAt: now, expiresAt: now + hours * 3600000
  };
  try {
    await set(ref(db, `website/offers/${id}`), offer);
    const m = document.getElementById('offer-modal'); if (m) m.style.display = 'none';
    if (typeof showCopyToast === 'function') showCopyToast('✅ ההצעה פורסמה!');
    if (mainContent.querySelector('.offers-page')) mainContent.innerHTML = buildOffersPage();
  } catch (e) { console.error('save offer failed', e); if (typeof showCopyToast === 'function') showCopyToast('שגיאה בפרסום'); }
}
window.saveOffer = saveOffer;

// ============================================================
// קופסת סינונים (Filters) — זמינות, טווח מחיר, סוג עסקה, מצב המוצר
// ============================================================
const productFilters = {
  inStock: true,
  price: 'all',       // 'all' | 'u500' | '500-3k' | '3k+'
  deal: { buy: false, borrow: false, swap: false },
  grade: { sealed: false, likenew: false, used: false },
};

function buildSidebarNameChangeSectionHTML() {
  const user = auth.currentUser;
  // רק משתמש רשום — לא אורח אנונימי (שם תצוגה/אימות אינם רלוונטיים לאורח)
  if (!isRegisteredUser()) return '';

  let profile = {};
  try {
    profile = JSON.parse(localStorage.getItem(`user_profile_${user.uid}`) || '{}');
  } catch (e) {}

  const currentName = profile.nickname || user.displayName || (user.email ? user.email.split('@')[0] : 'משתמש');
  const lastChange = Number(profile.lastNameChange || 0);
  const now = Date.now();
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
  const timePassed = now - lastChange;
  const canChange = !lastChange || timePassed >= sixtyDaysMs;
  const daysRemaining = Math.ceil((sixtyDaysMs - timePassed) / (1000 * 60 * 60 * 24));

  return `
    <div class="pf-name-change-sec" style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #cbd5e1; text-align: right; direction: rtl;">
      <div style="font-size: 13.5px; font-weight: 800; color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
        <span>✏️ שינוי שם תצוגה</span>
      </div>
      
      <div style="font-size: 12px; color: #475569; margin-bottom: 8px;">
        שם נוכחי: <strong style="color: #2563eb;">${escHtml(currentName)}</strong>
      </div>

      ${canChange ? `
        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px;">
          <input type="text" id="pf-new-name-input" value="${escHtml(currentName)}" placeholder="הכנס שם חדש..." 
                 style="flex: 1; min-width: 120px; padding: 7px 10px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; transition: border-color 0.2s;"
                 onfocus="this.style.borderColor='#2563eb'" onblur="this.style.borderColor='#cbd5e1'">
          <button type="button" onclick="saveUserNickname()" 
                  style="background: #2563eb; color: #fff; border: none; border-radius: 8px; padding: 7px 14px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.15s ease;">
            שמור
          </button>
        </div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">
          * ניתן לשנות שם פעם אחת בלבד בכל 60 יום.
        </div>
      ` : `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; margin-top: 6px; font-size: 12px; color: #475569; text-align: center;">
          <span style="display: inline-block; margin-bottom: 2px;">🔒 <strong>שינוי שם ננעל</strong></span><br>
          תוכל לשנות שם שוב בעוד <strong style="color: #e11d48;">${daysRemaining} ימים</strong>.
        </div>
      `}
    </div>
  `;
}
window.buildSidebarNameChangeSectionHTML = buildSidebarNameChangeSectionHTML;

async function saveUserNickname() {
  const user = auth.currentUser;
  if (!user) {
    if (typeof showCopyToast === 'function') showCopyToast('יש להתחבר כדי לשנות שם');
    return;
  }

  const inp = document.getElementById('pf-new-name-input');
  const newName = inp ? inp.value.trim() : '';

  if (!newName) {
    if (typeof showCopyToast === 'function') showCopyToast('נא להזין שם תצוגה תקין');
    return;
  }
  if (newName.length < 2 || newName.length > 30) {
    if (typeof showCopyToast === 'function') showCopyToast('השם חייב להיות בין 2 ל-30 תווים');
    return;
  }

  let profile = {};
  try {
    profile = JSON.parse(localStorage.getItem(`user_profile_${user.uid}`) || '{}');
  } catch (e) {}

  const now = Date.now();
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
  const lastChange = Number(profile.lastNameChange || 0);

  if (lastChange && (now - lastChange) < sixtyDaysMs) {
    const daysRemaining = Math.ceil((sixtyDaysMs - (now - lastChange)) / (1000 * 60 * 60 * 24));
    if (typeof showCopyToast === 'function') showCopyToast(`לא ניתן לשנות שם. נותרו עוד ${daysRemaining} ימים.`);
    return;
  }

  profile.nickname = newName;
  profile.lastNameChange = now;

  try {
    localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(profile));
  } catch (e) {}

  if (user.updateProfile) {
    try { await user.updateProfile({ displayName: newName }); } catch (e) {}
  }

  if (typeof showCopyToast === 'function') {
    showCopyToast('✓ השם עודכן בהצלחה! תוכל לשנות שם שוב בעוד 60 יום.');
  }

  const page = (typeof pfActivePage === 'function') ? pfActivePage() : 'photos';
  const box = mainContent.querySelector('.pf-box');
  if (box) box.outerHTML = buildFiltersSidebarBox(page);

  if (typeof pfApplyActive === 'function') pfApplyActive();
}
window.saveUserNickname = saveUserNickname;

function isUserVerified(authorId, authorName, itemVerified) {
  if (itemVerified === true || itemVerified === 'true' || itemVerified === 1) return true;
  const user = auth.currentUser;
  if (user) {
    if ((authorId && authorId === user.uid) || (authorName && (user.displayName === authorName || (user.email && user.email.split('@')[0] === authorName)))) {
      try {
        const p = JSON.parse(localStorage.getItem(`user_profile_${user.uid}`) || '{}');
        if (p.verified || p.verificationStatus === 'approved') return true;
      } catch (e) {}
    }
  }
  if (window.verifiedUsersMap) {
    if (authorId && window.verifiedUsersMap[authorId]) return true;
    if (authorName && window.verifiedUsersMap[String(authorName).toLowerCase()]) return true;
  }
  return false;
}
window.isUserVerified = isUserVerified;

// ============================================================
// "פרטים עליי" — המשתמש מגדיר מאיפה הוא, מה הוא אוהב ומה לא. מוצג בעמוד המשתמש.
// ============================================================
const ABOUT_REGIONS = ['צפון', 'מרכז', 'דרום', 'ירושלים', 'שרון', 'שפלה'];

function aboutSplitTags(v) {
  return String(v || '').split(/[,،\n]+/).map(t => t.trim()).filter(Boolean).slice(0, 25).map(t => t.slice(0, 40));
}

function buildSidebarAboutMeSectionHTML() {
  if (!isRegisteredUser()) return '';
  const user = auth.currentUser;
  let p = {};
  try { p = JSON.parse(localStorage.getItem(`user_profile_${user.uid}`) || '{}'); } catch (e) {}
  // מכשיר חדש — טוענים את הפרטים השמורים מהענן וממלאים את השדות
  if (p.aboutRegion === undefined && p.aboutLikes === undefined) {
    get(ref(db, `website/users/${user.uid}/profile`)).then(snap => {
      if (!snap.exists()) return;
      const v = snap.val() || {};
      try { localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify({ ...p, ...v })); } catch (e) {}
      const set_ = (id, val) => { const el = document.getElementById(id); if (el && !el.value && val) el.value = val; };
      set_('pf-about-region', v.aboutRegion); set_('pf-about-city', v.aboutCity);
      set_('pf-about-likes', v.aboutLikes); set_('pf-about-dislikes', v.aboutDislikes);
      set_('pf-about-telegram', v.telegram); set_('pf-about-email', v.email);
    }).catch(() => {});
  }
  const fld = 'width:100%; box-sizing:border-box; padding:7px 10px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:13px; font-family:inherit; outline:none; background:#fff;';
  const lbl = 'font-size:12px; font-weight:700; color:#334155; margin:8px 0 4px;';
  return `
    <div class="pf-about-sec" style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #cbd5e1; text-align: right; direction: rtl;">
      <div style="font-size: 13.5px; font-weight: 800; color: #1e293b; margin-bottom: 4px;">🙋 פרטים עליי</div>
      <div style="font-size: 11.5px; color: #64748b; margin-bottom: 4px;">יוצג למי שנכנס לפרופיל שלך</div>
      <div style="${lbl}">📍 מאיפה אני</div>
      <div style="display:flex; gap:6px;">
        <select id="pf-about-region" style="${fld} flex:1;">
          <option value="">אזור</option>
          ${ABOUT_REGIONS.map(r => `<option value="${r}" ${p.aboutRegion === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
        <input id="pf-about-city" type="text" maxlength="30" placeholder="עיר (אופציונלי)" value="${escHtml(p.aboutCity || '')}" style="${fld} flex:1;">
      </div>
      <div style="${lbl}">✈️ טלגרם</div>
      <input id="pf-about-telegram" type="text" dir="ltr" maxlength="40" placeholder="@username" value="${escHtml(p.telegram || '')}" style="${fld} text-align:left;">
      <div style="${lbl}">✉️ מייל</div>
      <input id="pf-about-email" type="email" dir="ltr" maxlength="80" placeholder="example@mail.com" value="${escHtml(p.email || '')}" style="${fld} text-align:left;">
      <div style="${lbl}">💚 מה אני אוהב/ת</div>
      <textarea id="pf-about-likes" rows="2" maxlength="500" placeholder="מופרד בפסיקים, לדוגמה: ..., ..." style="${fld} resize:vertical;">${escHtml(p.aboutLikes || '')}</textarea>
      <div style="${lbl}">🚫 מה אני לא אוהב/ת</div>
      <textarea id="pf-about-dislikes" rows="2" maxlength="500" placeholder="מופרד בפסיקים" style="${fld} resize:vertical;">${escHtml(p.aboutDislikes || '')}</textarea>
      <button type="button" onclick="saveAboutMe()" style="margin-top:10px; width:100%; background:#2563eb; color:#fff; border:none; border-radius:8px; padding:8px 14px; font-size:13px; font-weight:700; cursor:pointer;">שמור פרטים</button>
    </div>
  `;
}
window.buildSidebarAboutMeSectionHTML = buildSidebarAboutMeSectionHTML;

async function saveAboutMe() {
  const user = auth.currentUser;
  if (!user || !isRegisteredUser()) { if (typeof showCopyToast === 'function') showCopyToast('יש להתחבר כדי לשמור פרטים'); return; }
  const val = id => ((document.getElementById(id) || {}).value || '').trim();
  const region = ABOUT_REGIONS.includes(val('pf-about-region')) ? val('pf-about-region') : '';
  const data = {
    aboutRegion: region,
    aboutCity: val('pf-about-city').slice(0, 30),
    aboutLikes: aboutSplitTags(val('pf-about-likes')).join(', '),
    aboutDislikes: aboutSplitTags(val('pf-about-dislikes')).join(', '),
    telegram: val('pf-about-telegram').slice(0, 40),
    email: val('pf-about-email').slice(0, 80)
  };
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    if (typeof showCopyToast === 'function') showCopyToast('כתובת המייל לא תקינה');
    return;
  }
  let p = {};
  try { p = JSON.parse(localStorage.getItem(`user_profile_${user.uid}`) || '{}'); } catch (e) {}
  try { localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify({ ...p, ...data })); } catch (e) {}
  try {
    const upd = { ...data };
    if (!p.nickname && user.displayName) upd.nickname = user.displayName;
    await update(ref(db, `website/users/${user.uid}/profile`), upd);
    if (typeof showCopyToast === 'function') showCopyToast('✓ הפרטים נשמרו');
  } catch (e) {
    console.error('saveAboutMe failed', e);
    if (typeof showCopyToast === 'function') showCopyToast('שגיאה בשמירת הפרטים');
  }
}
window.saveAboutMe = saveAboutMe;

// כרטיס "פרטים" בעמוד המשתמש
function userAboutCardHTML(profile, verified) {
  profile = profile || {};
  const where = [profile.aboutCity, profile.aboutRegion].filter(Boolean).join(', ');
  const likes = aboutSplitTags(profile.aboutLikes);
  const dislikes = aboutSplitTags(profile.aboutDislikes);
  const tg = String(profile.telegram || '').trim().replace(/^https?:\/\/t\.me\//i, '').replace(/^@/, '');
  const chips = (arr, cls) => arr.length
    ? arr.map(t => `<span class="up-about-chip ${cls}">${escHtml(t)}</span>`).join('')
    : '<span class="up-about-empty">לא צוין</span>';
  return `
    <div class="up-about-card">
      <div class="up-about-title">פרטים</div>
      <div class="up-about-row"><div class="up-about-label">🛡️ אימות</div><div>${verified
        ? '<span class="up-about-verified">✓ משתמש מאומת</span>'
        : '<span class="up-about-unverified">לא מאומת</span>'}</div></div>
      <div class="up-about-row"><div class="up-about-label">📍 מאיפה</div><div>${where ? `<span class="up-about-text">${escHtml(where)}</span>` : '<span class="up-about-empty">לא צוין</span>'}</div></div>
      <div class="up-about-row"><div class="up-about-label">✈️ טלגרם</div><div>${tg
        ? `<a class="up-about-link" href="https://t.me/${encodeURIComponent(tg)}" target="_blank" rel="noopener" dir="ltr">@${escHtml(tg)}</a>`
        : '<span class="up-about-empty">לא צוין</span>'}</div></div>
      <div class="up-about-row"><div class="up-about-label">✉️ מייל</div><div>${profile.email
        ? `<button type="button" class="up-about-link" dir="ltr" onclick="copyEmailToClipboard('${artEsc(profile.email)}', event)" title="העתקת המייל">${escHtml(profile.email)}</button>`
        : '<span class="up-about-empty">לא צוין</span>'}</div></div>
      <div class="up-about-row"><div class="up-about-label">💚 אוהב/ת</div><div class="up-about-chips">${chips(likes, 'like')}</div></div>
      <div class="up-about-row"><div class="up-about-label">🚫 לא אוהב/ת</div><div class="up-about-chips">${chips(dislikes, 'dislike')}</div></div>
    </div>`;
}
window.userAboutCardHTML = userAboutCardHTML;

function buildSidebarVerificationSectionHTML() {
  const user = auth.currentUser;
  // רק משתמש רשום — אורח אנונימי אינו יכול לאמת חשבון
  if (!isRegisteredUser()) return '';

  let profile = {};
  try {
    profile = JSON.parse(localStorage.getItem(`user_profile_${user.uid}`) || '{}');
  } catch (e) {}

  const isApproved = profile.verified || profile.verificationStatus === 'approved';
  const isPending = profile.verificationStatus === 'pending';
  const isRejected = profile.verificationStatus === 'rejected';
  const isAdminUser = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);

  let bodyContent = '';
  if (isApproved) {
    bodyContent = `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 10px; margin-top: 6px; font-size: 12.5px; color: #166534; text-align: center;">
        <span style="font-weight: 800; font-size: 13px; color: #15803d; display: inline-flex; align-items: center; gap: 4px;">
          <span style="background:#22c55e; color:#fff; border-radius:50%; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; font-size:10px;">✓</span> החשבון שלך מאומת
        </span>
        <div style="font-size: 11.5px; color: #166534; margin-top: 4px;">תג אימות כחול (✓) מופיע בצד השם שלך באתר.</div>
      </div>
    `;
  } else if (isPending) {
    bodyContent = `
      <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 10px; margin-top: 6px; font-size: 12px; color: #92400e; text-align: center;">
        <span style="font-weight: 800; font-size: 13px; color: #b45309; display: inline-flex; align-items: center; gap: 4px;">
          ⏳ בקשת אימות בבדיקת מנהל
        </span>
        <div style="font-size: 11.5px; color: #78350f; margin-top: 4px;">התמונה נשלחה ותיבדק על ידי המנהל בהקדם.</div>
        ${profile.verificationPhoto ? `<img src="${escHtml(profile.verificationPhoto)}" style="width: 54px; height: 54px; border-radius: 50%; object-fit: cover; margin-top: 8px; border: 2px solid #f59e0b;">` : ''}
      </div>
    `;
  } else {
    bodyContent = `
      <div style="font-size: 12px; color: #475569; margin-bottom: 8px; line-height: 1.4;">
        להעלאת תמונת פנים לאימות החשבון וקבלת תג אימות (✓) בצד השם שלך:
      </div>
      ${isRejected ? `
        <div style="font-size: 11.5px; color: #e11d48; background: #fff1f2; padding: 6px 8px; border-radius: 6px; margin-bottom: 8px; border: 1px solid #fecdd3;">
          ⚠️ בקשת האימות הקודמת נדחתה. נא להעלות תמונת פנים ברורה.
        </div>
      ` : ''}
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
        <label style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 8px; padding: 10px; text-align: center; cursor: pointer; font-size: 12.5px; color: #334155; font-weight: 600; transition: all 0.2s;"
               onmouseover="this.style.borderColor='#2563eb'" onmouseout="this.style.borderColor='#cbd5e1'">
          📷 בחר תמונת פנים
          <input type="file" id="pf-verification-file" accept="image/*" style="display: none;" onchange="previewVerificationPhoto(this)">
        </label>
        <div id="pf-verification-preview-wrap" style="display: none; text-align: center;">
          <img id="pf-verification-preview-img" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid #2563eb; margin: 0 auto;">
        </div>
        <button type="button" onclick="submitAccountVerification()" 
                style="background: #2563eb; color: #fff; border: none; border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.15s ease;">
          שלח תמונת פנים למנהל
        </button>
      </div>
    `;
  }

  const adminBtn = isAdminUser ? `
    <button type="button" onclick="openAdminVerificationsModal()" 
            style="margin-top: 10px; width: 100%; background: #0f172a; color: #fff; border: none; border-radius: 8px; padding: 8px 12px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
      <span>🛡️ ניהול בקשות אימות (מנהל)</span>
    </button>
  ` : '';

  return `
    <div class="pf-verification-sec" style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed #cbd5e1; text-align: right; direction: rtl;">
      <div style="font-size: 13.5px; font-weight: 800; color: #1e293b; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
        <span>🛡️ אימות חשבון</span>
      </div>
      ${bodyContent}
      ${adminBtn}
    </div>
  `;
}
window.buildSidebarVerificationSectionHTML = buildSidebarVerificationSectionHTML;

function previewVerificationPhoto(input) {
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  if (!file.type.startsWith('image/')) {
    if (typeof showCopyToast === 'function') showCopyToast('נא לבחור קובץ תמונה בלבד');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    if (typeof showCopyToast === 'function') showCopyToast('גודל התמונה עולה על 5MB');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    window._tempVerificationPhoto = e.target.result;
    const wrap = document.getElementById('pf-verification-preview-wrap');
    const img = document.getElementById('pf-verification-preview-img');
    if (img) img.src = e.target.result;
    if (wrap) wrap.style.display = 'block';
  };
  reader.readAsDataURL(file);
}
window.previewVerificationPhoto = previewVerificationPhoto;

async function submitAccountVerification() {
  const user = auth.currentUser;
  if (!user) {
    if (typeof showCopyToast === 'function') showCopyToast('יש להתחבר כדי לשלוח בקשת אימות');
    return;
  }
  if (!window._tempVerificationPhoto) {
    if (typeof showCopyToast === 'function') showCopyToast('נא לבחור תמונת פנים תחילה');
    return;
  }

  let profile = {};
  try {
    profile = JSON.parse(localStorage.getItem(`user_profile_${user.uid}`) || '{}');
  } catch (e) {}

  const currentName = profile.nickname || user.displayName || (user.email ? user.email.split('@')[0] : 'משתמש');
  const now = Date.now();
  const photoData = window._tempVerificationPhoto;

  profile.verificationStatus = 'pending';
  profile.verificationPhoto = photoData;
  profile.verificationSubmittedAt = now;

  try {
    localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(profile));
  } catch (e) {}

  if (typeof db !== 'undefined') {
    try {
      await set(ref(db, `website/verification_requests/${user.uid}`), {
        uid: user.uid,
        displayName: currentName,
        email: user.email || '',
        photo: photoData,
        status: 'pending',
        timestamp: now
      });
    } catch (e) {
      console.error('Failed saving verification request to Firebase:', e);
    }
  }

  delete window._tempVerificationPhoto;
  if (typeof showCopyToast === 'function') {
    showCopyToast('✓ תמונת הפנים נשלחה לאימות מנהל בהצלחה!');
  }

  const page = (typeof pfActivePage === 'function') ? pfActivePage() : 'photos';
  const box = document.querySelector('.pf-box');
  if (box) box.outerHTML = buildFiltersSidebarBox(page);
}
window.submitAccountVerification = submitAccountVerification;

function openAdminVerificationsModal() {
  let modal = document.getElementById('admin-verifications-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'admin-verifications-modal';
    document.body.appendChild(modal);
  }
  modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.65); z-index:99999; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); direction:rtl; text-align:right; font-family:inherit;';

  modal.innerHTML = `
    <div style="background:#fff; border-radius:16px; width:90%; max-width:650px; max-height:85vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);">
      <div style="padding:16px 20px; background:#0f172a; color:#fff; display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0; font-size:17px; font-weight:800; display:flex; align-items:center; gap:8px;">🛡️ בקשות אימות חשבון ממתינות</h3>
        <button onclick="document.getElementById('admin-verifications-modal').remove()" style="background:none; border:none; color:#cbd5e1; font-size:20px; cursor:pointer; padding:0 4px; line-height:1;">✕</button>
      </div>
      <div id="admin-verifications-list" style="padding:20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:16px;">
        <div style="text-align:center; color:#64748b; padding:20px;">טוען בקשות אימות...</div>
      </div>
    </div>
  `;

  loadAdminVerificationsList();
}
window.openAdminVerificationsModal = openAdminVerificationsModal;

async function loadAdminVerificationsList() {
  const container = document.getElementById('admin-verifications-list');
  if (!container) return;

  let requests = {};
  if (typeof db !== 'undefined') {
    try {
      const snap = await get(ref(db, 'website/verification_requests'));
      if (snap.exists()) requests = snap.val();
    } catch (e) {
      console.error(e);
    }
  }

  const keys = Object.keys(requests);
  if (keys.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:#64748b; padding:30px; font-size:14px;">אין בקשות אימות חשבון במערכת.</div>`;
    return;
  }

  const list = keys.map(k => requests[k]).sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return (b.timestamp || 0) - (a.timestamp || 0);
  });

  container.innerHTML = list.map(req => {
    const isApproved = req.status === 'approved';
    const isRejected = req.status === 'rejected';
    const statusBadge = isApproved
      ? `<span style="background:#dcfce7; color:#15803d; border-radius:6px; padding:2px 8px; font-size:11.5px; font-weight:700;">מאומת ✓</span>`
      : (isRejected
        ? `<span style="background:#ffe4e6; color:#be123c; border-radius:6px; padding:2px 8px; font-size:11.5px; font-weight:700;">נדחה ✕</span>`
        : `<span style="background:#fef3c7; color:#b45309; border-radius:6px; padding:2px 8px; font-size:11.5px; font-weight:700;">ממתין לבדיקה ⏳</span>`);

    const dateStr = req.timestamp ? new Date(req.timestamp).toLocaleString('he-IL') : '';

    return `
      <div style="border:1.5px solid #e2e8f0; border-radius:12px; padding:14px; background:#f8fafc; display:flex; gap:14px; align-items:center; flex-wrap:wrap;">
        <div style="flex-shrink:0;">
          ${req.photo ? `<img src="${escHtml(req.photo)}" onclick="if (typeof openImageModal==='function') openImageModal('${artEsc(req.photo)}')" style="width:70px; height:70px; border-radius:50%; object-fit:cover; border:2px solid #2563eb; cursor:pointer;" title="לחץ להגדלה">` : `<div style="width:70px; height:70px; border-radius:50%; background:#cbd5e1; display:flex; align-items:center; justify-content:center; font-size:24px;">👤</div>`}
        </div>
        <div style="flex:1; min-width:180px;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
            <strong style="font-size:15px; color:#0f172a;">${escHtml(req.displayName || 'משתמש')}</strong>
            ${statusBadge}
          </div>
          <div style="font-size:12px; color:#64748b; margin-bottom:2px;">דוא"ל: ${escHtml(req.email || 'לא מצוין')}</div>
          <div style="font-size:11.5px; color:#94a3b8;">מזהה: ${escHtml(req.uid)} | ${dateStr}</div>
        </div>
        <div style="display:flex; gap:6px; flex-shrink:0;">
          ${!isApproved ? `
            <button onclick="processVerificationRequest('${artEsc(req.uid)}', 'approved')" style="background:#16a34a; color:#fff; border:none; border-radius:8px; padding:8px 12px; font-size:12px; font-weight:700; cursor:pointer;">
              אשר ✓
            </button>
          ` : ''}
          ${!isRejected ? `
            <button onclick="processVerificationRequest('${artEsc(req.uid)}', 'rejected')" style="background:#dc2626; color:#fff; border:none; border-radius:8px; padding:8px 12px; font-size:12px; font-weight:700; cursor:pointer;">
              דחה ✕
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}
window.loadAdminVerificationsList = loadAdminVerificationsList;

async function processVerificationRequest(targetUid, action) {
  if (!targetUid) return;
  if (typeof db !== 'undefined') {
    try {
      await update(ref(db, `website/verification_requests/${targetUid}`), {
        status: action
      });
      if (action === 'approved') {
        await set(ref(db, `website/verified_users/${targetUid}`), true);
      } else {
        await set(ref(db, `website/verified_users/${targetUid}`), null);
      }
    } catch (e) {
      console.error('Failed processing verification:', e);
    }
  }

  const currentUser = auth.currentUser;
  if (currentUser && currentUser.uid === targetUid) {
    let profile = {};
    try { profile = JSON.parse(localStorage.getItem(`user_profile_${targetUid}`) || '{}'); } catch(e){}
    profile.verificationStatus = action;
    profile.verified = (action === 'approved');
    try { localStorage.setItem(`user_profile_${targetUid}`, JSON.stringify(profile)); } catch(e){}
  }

  window.verifiedUsersMap = window.verifiedUsersMap || {};
  if (action === 'approved') {
    window.verifiedUsersMap[targetUid] = true;
  } else {
    delete window.verifiedUsersMap[targetUid];
  }

  if (typeof showCopyToast === 'function') {
    showCopyToast(action === 'approved' ? '✓ המשתמש אושר בהצלחה כמאומת!' : '✕ בקשת האימות נדחתה.');
  }

  loadAdminVerificationsList();

  const page = (typeof pfActivePage === 'function') ? pfActivePage() : 'photos';
  const box = document.querySelector('.pf-box');
  if (box) box.outerHTML = buildFiltersSidebarBox(page);
  if (typeof pfApplyActive === 'function') pfApplyActive();
}
window.processVerificationRequest = processVerificationRequest;

function initVerificationRealtimeListener() {
  if (typeof db === 'undefined') return;
  try {
    onValue(ref(db, 'website/verification_requests'), (snap) => {
      const data = snap.val() || {};
      window.verificationRequestsData = data;
      window.verifiedUsersMap = window.verifiedUsersMap || {};
      
      const currentUser = auth.currentUser;
      Object.keys(data).forEach(uid => {
        const req = data[uid];
        if (req && req.status === 'approved') {
          window.verifiedUsersMap[uid] = true;
          if (req.displayName) {
            window.verifiedUsersMap[req.displayName.toLowerCase()] = true;
          }
        } else {
          delete window.verifiedUsersMap[uid];
        }

        if (currentUser && currentUser.uid === uid && req) {
          let profile = {};
          try { profile = JSON.parse(localStorage.getItem(`user_profile_${uid}`) || '{}'); } catch(e){}
          if (profile.verificationStatus !== req.status || profile.verified !== (req.status === 'approved')) {
            profile.verificationStatus = req.status;
            profile.verified = (req.status === 'approved');
            try { localStorage.setItem(`user_profile_${uid}`, JSON.stringify(profile)); } catch(e){}
          }
        }
      });
    });
  } catch (e) {
    console.error('Error initializing verification listener:', e);
  }
}
window.initVerificationRealtimeListener = initVerificationRealtimeListener;

function buildFiltersSidebarBox(pageType) {
  pageType = pageType || 'photos';
  const f = productFilters;
  const priceBtn = (id, label) =>
    `<button type="button" class="pf-price-pill${f.price === id ? ' active' : ''}" onclick="setPriceFilter('${id}', this)">${label}</button>`;
  const check = (group, key, label) =>
    `<label class="pf-check">
      <span class="pf-check-label">${label}</span>
      <input type="checkbox" ${f[group][key] ? 'checked' : ''} onchange="toggleFilterCheck('${group}','${key}',this.checked)">
    </label>`;
  // קבוצת בחירה-מרובה (multi) לפילטרים אמיתיים של הגלריות
  const multiCheck = (kind, value, label) =>
    `<label class="pf-check">
      <span class="pf-check-label">${label}</span>
      <input type="checkbox" ${photoSel[kind].includes(value) ? 'checked' : ''} onchange="photoToggleMulti('${kind}','${artEsc(value)}',this.checked)">
    </label>`;
  // בחירה יחידה של מיון (מתנהג כמו רדיו למרות הלסמן) — משקף את המיון של העמוד הנוכחי
  const curSort = (pageType === 'stories') ? currentStoryGeneralFilter : currentPhotoGeneralFilter;
  const sortCheck = (value, label) =>
    `<label class="pf-check">
      <span class="pf-check-label">${label}</span>
      <input type="checkbox" ${curSort === value ? 'checked' : ''} onchange="photoSetSort('${value}',this)">
    </label>`;

  // מקטע מתקפל: כותרת עם חץ מזעור + גוף שמקופל כברירת מחדל
  const sec = (title, body) => `
    <div class="pf-sec pf-collapsed">
      <div class="pf-section-title pf-sec-head" onclick="pfToggleSection(this)">
        <span class="pf-sec-title-text">${title}</span>
        <span class="pf-sec-chev" aria-hidden="true">▾</span>
      </div>
      <div class="pf-sec-body">${body}</div>
    </div>`;

  const ageBody = `
      <div class="pf-age-dual" style="direction:ltr;">
        <div class="pf-dual-labels">
          <span id="pf-age-lbl-min">${photoAgeMin}</span>
          <span id="pf-age-lbl-max">${photoAgeMax}</span>
        </div>
        <div class="pf-dual-slider">
          <div class="pf-dual-rail"></div>
          <div class="pf-dual-fill" id="pf-age-fill" style="left:${((photoAgeMin - 18) / 81) * 100}%; width:${((photoAgeMax - photoAgeMin) / 81) * 100}%;"></div>
          <input type="range" class="pf-dual-input" id="pf-age-min" min="18" max="99" step="1" value="${photoAgeMin}" oninput="photoSetAgeDual('min', this.value)">
          <input type="range" class="pf-dual-input" id="pf-age-max" min="18" max="99" step="1" value="${photoAgeMax}" oninput="photoSetAgeDual('max', this.value)">
        </div>
      </div>`;

  const sortBody = `<div class="pf-check-group">
        ${sortCheck('האחרונים', 'האחרונים')}
        ${sortCheck('הפופולארים', 'הפופולארים')}
        ${sortCheck('הישנים', 'הישנים')}
      </div>`;

  const catBody = PHOTO_CATEGORIES.filter(v => v !== 'הכל').map(v => multiCheck('category', v, v)).join('');
  const regBody = PHOTO_REGIONS.filter(v => v !== 'הכל').map(v => multiCheck('region', v, v)).join('');
  const dateBody = PHOTO_DATE_RANGES.filter(v => v !== 'הכל').map(v => multiCheck('date', v, v)).join('');
  const curCols = (pageType === 'stories') ? (typeof storyGridCols !== 'undefined' ? storyGridCols : 3) : photoGridCols;
  const sizeBody = `<div class="pf-check-group">
        ${[4, 3, 2].map(n => `
          <label class="pf-check">
            <span class="pf-check-label">${n} עמודות</span>
            <input type="checkbox" ${curCols === n ? 'checked' : ''} onchange="photoSetSizeCheck(${n}, this)">
          </label>
        `).join('')}
      </div>`;

  const sections = {
    age: sec('טווח גילאים (AGE)', ageBody),
    sort: sec('כללי (SORT)', sortBody),
    category: sec('מין (CATEGORY)', catBody),
    region: sec('מיקום (REGION)', regBody),
    date: sec('תאריך (DATE)', dateBody),
    size: sec('גודל (SIZE)', sizeBody)
  };
  // סינונים שונים מעמוד לעמוד: בסיפורים רק כללי/תאריך/גודל
  const allowed = (pageType === 'stories') ? ['sort', 'date', 'size'] : ['age', 'sort', 'category', 'region', 'date', 'size'];

  return `
    <div class="art-sidebar-box pf-box" style="border:1.5px solid #e2e8f0; border-radius:14px; padding:18px; background:#fff; box-shadow:0 4px 15px rgba(15,23,42,0.05); text-align:right; direction:rtl;">
      ${allowed.map(k => sections[k]).join('')}
      <button type="button" class="pf-clear-btn" onclick="photoClearFilters()">נקה סינון ✕</button>
      ${buildSidebarNameChangeSectionHTML()}
      ${buildSidebarVerificationSectionHTML()}
      ${buildSidebarAboutMeSectionHTML()}
    </div>
  `;
}

// מזעור/הרחבה של מקטע סינון בודד
function pfToggleSection(head) {
  const sec = head.closest('.pf-sec');
  if (sec) sec.classList.toggle('pf-collapsed');
}
window.pfToggleSection = pfToggleSection;

function setPriceFilter(id, btn) {
  productFilters.price = id;
  const box = btn.closest('.pf-box');
  if (box) box.querySelectorAll('.pf-price-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
}
window.setPriceFilter = setPriceFilter;

function onPriceRange(val) {
  // ערך הסליידר נשמר עבור סינון עתידי לפי מחיר
  productFilters.priceMax = Number(val);
}
window.onPriceRange = onPriceRange;

function toggleFilterCheck(group, key, checked) {
  if (key === null) productFilters[group] = checked;
  else productFilters[group][key] = checked;
}
window.toggleFilterCheck = toggleFilterCheck;
window.buildFiltersSidebarBox = buildFiltersSidebarBox;

// מצב מיון נפרד לעמוד הסיפורים (כדי שהסינון ישפיע על אותו עמוד בלבד)
let currentStoryGeneralFilter = 'הכל';
// זיהוי העמוד הפעיל והחלת הסינון עליו בלבד
function pfActivePage() {
  return (typeof mainContent !== 'undefined' && mainContent && mainContent.querySelector('.stories-page')) ? 'stories' : 'photos';
}
function pfApplyActive() {
  if (pfActivePage() === 'stories') { if (typeof storyApplyFilters === 'function') storyApplyFilters(); }
  else { if (typeof photoApplyFilters === 'function') photoApplyFilters(); }
}
window.pfApplyActive = pfApplyActive;

// ---- מצב הפילטרים האמיתיים של הגלריות (בפאנל הצד) ----
const photoSel = { category: [], region: [], date: [] }; // בחירה מרובה
let photoAgeMin = 18;
let photoAgeMax = 99; // 18–99 = טווח מלא (ללא סינון)

function photoAgeBucket(s) {
  if (s === '18-25') return [18, 25];
  if (s === '26-35') return [26, 35];
  if (s === '36-45') return [36, 45];
  if (s === '46+')   return [46, 99];
  // גיל בודד שהוקלד (למשל "24") — טווח נקודתי
  const n = parseInt(String(s), 10);
  if (!isNaN(n)) return [n, n];
  return null;
}

function photoToggleMulti(kind, value, checked) {
  const arr = photoSel[kind];
  if (!arr) return;
  const i = arr.indexOf(value);
  if (checked && i < 0) arr.push(value);
  else if (!checked && i >= 0) arr.splice(i, 1);
  pfApplyActive(); // משפיע על העמוד הנוכחי בלבד
}
window.photoToggleMulti = photoToggleMulti;

function photoSetSort(value, cb) {
  // מיון של העמוד הנוכחי בלבד (סיפורים / תמונות בנפרד)
  if (pfActivePage() === 'stories') currentStoryGeneralFilter = value;
  else currentPhotoGeneralFilter = value;
  const grp = cb.closest('.pf-check-group');
  if (grp) grp.querySelectorAll('input[type="checkbox"]').forEach(x => { if (x !== cb) x.checked = false; });
  cb.checked = true;
  if (typeof photoRenderFilterBar === 'function') photoRenderFilterBar();
  pfApplyActive();
}
window.photoSetSort = photoSetSort;

function photoSetSizeCheck(n, cb) {
  const grp = cb.closest('.pf-check-group');
  if (grp) grp.querySelectorAll('input[type="checkbox"]').forEach(x => { if (x !== cb) x.checked = false; });
  cb.checked = true;
  // גודל של העמוד הנוכחי בלבד
  if (pfActivePage() === 'stories') { if (typeof storySetGridSize === 'function') storySetGridSize(n); }
  else photoSetGridSize(n);
}
window.photoSetSizeCheck = photoSetSizeCheck;

function photoUpdateAgeDual() {
  const fill = document.getElementById('pf-age-fill');
  const lblMin = document.getElementById('pf-age-lbl-min');
  const lblMax = document.getElementById('pf-age-lbl-max');
  const pMin = ((photoAgeMin - 18) / 81) * 100;
  const pMax = ((photoAgeMax - 18) / 81) * 100;
  if (fill) { fill.style.left = pMin + '%'; fill.style.width = (pMax - pMin) + '%'; }
  if (lblMin) lblMin.textContent = photoAgeMin;
  if (lblMax) lblMax.textContent = photoAgeMax;
}

function photoSetAgeDual(which, val) {
  val = Number(val);
  const minEl = document.getElementById('pf-age-min');
  const maxEl = document.getElementById('pf-age-max');
  let mn = minEl ? Number(minEl.value) : photoAgeMin;
  let mx = maxEl ? Number(maxEl.value) : photoAgeMax;
  // מונעים חצייה של הידיות
  if (which === 'min') { mn = Math.min(val, mx); if (minEl) minEl.value = mn; }
  else { mx = Math.max(val, mn); if (maxEl) maxEl.value = mx; }
  photoAgeMin = mn;
  photoAgeMax = mx;
  photoUpdateAgeDual();
  photoApplyFilters();
}
window.photoSetAgeDual = photoSetAgeDual;

// ============================================================
// סרגל צד מאוחד עם טאבים (pills) — כל הקופסאות במקום אחד, מדפדפים ביניהן
// ============================================================
let activeSidebarTab = 'filter';

function buildSidebarTabs(savedHTML, pageType) {
  pageType = pageType || 'photos';
  const uploadHtml = (buildQuickUploadBox() || '') + (savedHTML || '');
  const tabs = [
    { id: 'filter',    label: '🔎 סינונים', html: buildFiltersSidebarBox(pageType) },
    { id: 'community', label: '👥 קהילה',  html: (typeof buildSocialCommunityBox === 'function' ? buildSocialCommunityBox() : '') },
    { id: 'chat',      label: '💬 צ׳אט',   html: buildLiveChatBox() },
    { id: 'publish',   label: '🤖 פרסום',  html: `
      <div class="art-sidebar-box" style="text-align:center; padding:18px; border:1.5px solid #22c55e; background:rgba(34,197,94,0.04); border-radius:12px;">
        <div style="font-size:15px; font-weight:900; color:#166534; margin-bottom:6px;">🤖 פרסום מודעה מהיר</div>
        <div style="font-size:12px; color:#64748b; margin-bottom:12px; line-height:1.45;">עוזר מונחה שיפרסם עבורך מודעה חדשה בצ׳אט תוך 30 שניות</div>
        <button onclick="openQuickPublish()" style="width:100%; background:linear-gradient(135deg,#22c55e,#16a34a); color:#fff; border:none; border-radius:10px; padding:12px; font-size:14px; font-weight:800; cursor:pointer; box-shadow:0 3px 10px rgba(34,197,94,0.3);">🤖 צ׳אט מהיר לפרסום מודעה</button>
      </div>
    ` },
    { id: 'event',     label: '🎉 אירוע',  html: buildEventsSidebarBox() },
    { id: 'age',       label: '🔞 18+',    html: buildAgeFilterSidebarBox() },
    { id: 'upload',    label: '⚡ העלאה',  html: uploadHtml || '<div style="text-align:center;color:#94a3b8;font-size:13px;padding:20px;">אין פעולות העלאה זמינות</div>' },
    { id: 'sites',     label: '🌐 אתרים',  html: buildPromotedSitesBox() },
    { id: 'info',      label: '📩 מידע',   html: (typeof buildInfoSubmitBox === 'function' ? buildInfoSubmitBox() : '') },
  ];
  if (!tabs.some(t => t.id === activeSidebarTab)) activeSidebarTab = 'chat';

  // במובייל הטאבים מקופלים כברירת מחדל (אין פאנל פתוח) — לחיצה פותחת/סוגרת.
  // במחשב הטאב הפעיל פתוח כרגיל.
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const active = isMobile ? null : activeSidebarTab;

  const pills = tabs.map(t =>
    `<button class="sidebar-tab-pill${t.id === active ? ' active' : ''}" data-tab="${escHtml(t.id)}" onclick="sidebarShowTab('${artEsc(t.id)}', this)">${escHtml(t.label)}</button>`
  ).join('');
  const panels = tabs.map(t =>
    `<div class="sidebar-tab-panel" data-tab="${escHtml(t.id)}" style="display:${t.id === active ? 'block' : 'none'};">${t.html}</div>`
  ).join('');

  return `
    <div class="sidebar-tabs-wrap">
      <div class="sidebar-tabs-pills">${pills}</div>
      <div class="sidebar-tools-row">
        <button type="button" class="sidebar-min-toggle" onclick="sidebarToggleMinimize(this)" title="מזער / הרחב">
          <span class="sidebar-min-chevron">▾</span> <span class="sidebar-min-label">מזער</span>
        </button>
        <button type="button" class="sidebar-saved-btn" onclick="openSavedModal()" title="הגלריות השמורות שלי">🔖 שמורים</button>
        <button type="button" class="sidebar-saved-btn" onclick="openMessages()" title="הודעות פרטיות">📨 הודעות <span class="dm-open-badge" style="display:none"></span></button>
      </div>
      <div class="sidebar-tabs-panels">${panels}</div>
    </div>
  `;
}

function navigateToPage(pageId) {
  const page = (typeof pages !== 'undefined' && Array.isArray(pages)) ? pages.find(p => p && p.id === pageId) : null;
  if (!page) return;
  window.__detailOpen = false; // ניווט מפורש — מותר לרנדר מחדש
  if (typeof isEditMode !== 'undefined' && isEditMode && typeof saveCurrentPageContent === 'function') {
    try { saveCurrentPageContent(); } catch (e) {}
  }
  activePageId = page.id;
  if (typeof saveToStorage === 'function') { try { saveToStorage(); } catch (e) {} }
  if (typeof renderSideMenu === 'function') { try { renderSideMenu(); } catch (e) {} }
  if (typeof renderTopNav === 'function') { try { renderTopNav(); } catch (e) {} }
  if (typeof renderPage === 'function') { try { renderPage(); } catch (e) {} }
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
}
window.navigateToPage = navigateToPage;

function buildLeftSidebarBox(popularHTML, section) {
  const defaultNavItems = [
    { id: 'page-photos-main', title: 'תמונות 🖼️' },
    { id: 'page-stories-main', title: 'קומיקס 💥' },
    { id: 'page-stories-text', title: 'סיפורים 📖' },
    { id: 'page-ideas-main', title: 'רעיונות 💡' },
    { id: 'page-communities-main', title: 'קהילות 👥' },
    { id: 'page-subscription-main', title: 'מנוי 💎' },
    { id: 'page-questions-main', title: 'שאלות גולשים ❓' },
    { id: 'page-offers-main', title: 'הצעות 🔥' }
  ];

  let pagesToDisplay = [];
  if (typeof pages !== 'undefined' && Array.isArray(pages) && pages.length > 0) {
    pagesToDisplay = pages.filter(p => p && (!p.isHidden || (typeof isEditMode !== 'undefined' && isEditMode) || (typeof isAdmin === 'function' && isAdmin())));
  }
  if (pagesToDisplay.length === 0) {
    pagesToDisplay = defaultNavItems;
  }

  const renderNavItem = (page) => {
    const isActive = page.id === activePageId;
    let title = page.title || '';
    let icon = '📄';
    if (page.id === 'page-photos-main') icon = '🖼️';
    else if (page.id === 'page-stories-main') icon = '📖';
    else if (page.id === 'page-ideas-main') icon = '💡';
    else if (page.id === 'page-communities-main') icon = '👥';
    else if (page.id === 'page-subscription-main') icon = '💎';
    else if (page.id === 'page-questions-main') icon = '❓';
    else if (page.id === 'page-offers-main') icon = '🔥';
    else {
      const match = title.match(/([\u1F300-\u1F9FF\u2600-\u26FF\u2700-\u27BF])/);
      if (match) {
        icon = match[1];
        // לא מסירים תווים מהכותרת — מציגים טקסט מלא
      }
    }
    const cleanTitle = title.replace(/🖼️|📖|💡|🏘️|👥|❓|🔥|🔒|💎/g, '').trim();

    return `
      <div class="site-page-nav-item ${isActive ? 'active' : ''}" onclick="navigateToPage('${artEsc(page.id)}')" role="button" tabindex="0">
        <div class="site-page-nav-left">
          <span class="site-page-nav-title">${cleanTitle}</span>
        </div>
        ${isActive ? `<span class="site-page-nav-badge">פעיל</span>` : `<span class="site-page-nav-arrow">‹</span>`}
      </div>
    `;
  };

  // קבוצה "עמודי צד" = שאלות גולשים, הצעות
  const isQuestionsOrOffers = (p) => {
    const t = p.title || '', c = p.content || '';
    return p.id === 'page-questions-main' || p.id === 'page-offers-main'
      || t.includes('שאלות גולשים') || t.includes('הצעות')
      || c.includes('questions-page') || c.includes('offers-page');
  };
  // קבוצה "קהילות" = תמונות, סיפורים
  const isPhotosOrStories = (p) => {
    // "מוצרי יד שניה"/"שותפויות" אינם חלק מקבוצת קהילות (למרות תוכן photos-page)
    if (p.id === 'page-secondhand-main' || (p.content || '').includes('secondhand-page') || (p.title || '').includes('יד שניה')) return false;
    if (p.id === 'page-partnerships-main' || (p.content || '').includes('partnerships-page') || (p.title || '').includes('שותפויות')) return false;
    if (p.id === 'page-reviews-main' || (p.content || '').includes('reviews-page') || (p.title || '').includes('ביקורת')) return false;
    const t = p.title || '', c = p.content || '';
    return p.id === 'page-photos-main' || p.id === 'page-stories-main' || p.id === 'page-stories-text'
      || t.includes('תמונות') || t.includes('סיפורים') || t.includes('קומיקס')
      || c.includes('photos-page') || c.includes('stories-page');
  };
  const mainPagesHTML = pagesToDisplay.filter(p => !isSideOnlyPage(p) && !isPhotosOrStories(p) && !isQuestionsOrOffers(p)).map(renderNavItem).join('');
  // "עמודי צד": שאלות גולשים קודם, ואז הצעות
  const qFirst = (p) => (p.id === 'page-questions-main' || (p.title || '').includes('שאלות גולשים') || (p.content || '').includes('questions-page')) ? 0 : 1;
  // "קהילות": תמונות קודם, ואז סיפורים
  const photoFirst = (p) => (p.id === 'page-photos-main' || (p.title || '').includes('תמונות') || (p.content || '').includes('photos-page')) ? 0 : 1;
  const sidePagesList = pagesToDisplay.filter(isQuestionsOrOffers).sort((a, b) => qFirst(a) - qFirst(b));
  const commPagesList = pagesToDisplay.filter(isPhotosOrStories).sort((a, b) => photoFirst(a) - photoFirst(b));
  const sidePagesHTML = sidePagesList.map(renderNavItem).join('');
  const commPagesHTML = commPagesList.map(renderNavItem).join('');

  return `
    <div class="art-sidebar art-sidebar-left">
      <div class="art-sidebar-box site-pages-widget-box" style="border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 16px; background: #ffffff;">
        <div class="art-sidebar-title" style="font-size: 15px; font-weight: 900; color: #0f172a; margin-bottom: 12px; border-bottom: 2.5px solid #e11d48; padding-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
          <span>📌 עמודי האתר</span>
          <span style="font-size: 11px; background: rgba(225,29,72,0.1); color: #e11d48; padding: 2px 8px; border-radius: 12px; font-weight: 800;">ניווט מהיר</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${mainPagesHTML}
        </div>
        ${sidePagesList.length ? `
          <div style="margin-top: 14px; margin-bottom: 10px; font-size: 12px; font-weight: 900; color: #64748b; letter-spacing: 0.3px; display: flex; align-items: center; gap: 8px;">
            <span style="flex: 1; height: 1.5px; background: #e2e8f0; border-radius: 2px;"></span>
            <span style="white-space: nowrap;">עמודי צד</span>
            <span style="flex: 1; height: 1.5px; background: #e2e8f0; border-radius: 2px;"></span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${sidePagesHTML}
          </div>
        ` : ''}
        ${commPagesList.length ? `
          <div style="margin-top: 14px; margin-bottom: 10px; font-size: 12px; font-weight: 900; color: #64748b; letter-spacing: 0.3px; display: flex; align-items: center; gap: 8px;">
            <span style="flex: 1; height: 1.5px; background: #e2e8f0; border-radius: 2px;"></span>
            <span style="white-space: nowrap;">קהילות</span>
            <span style="flex: 1; height: 1.5px; background: #e2e8f0; border-radius: 2px;"></span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${commPagesHTML}
          </div>
        ` : ''}
      </div>

      ${buildUserMapBox()}

      ${section === 'communities' ? '' : `<div class="art-sidebar-box" style="border: 1.5px solid #22c55e; background: rgba(34,197,94,0.04); border-radius: 14px; padding: 16px; text-align: center;">
        <div style="font-size: 14px; font-weight: 900; color: #166534; margin-bottom: 4px;">🤖 פרסום מודעה מהיר</div>
        <div style="font-size: 11.5px; color: #64748b; margin-bottom: 10px; line-height: 1.4;">עוזר מונחה שיפרסם עבורך מודעה חדשה בצ׳אט תוך 30 שניות</div>
        <button onclick="openQuickPublish()" style="width: 100%; background: linear-gradient(135deg,#22c55e,#16a34a); color: #fff; border: none; border-radius: 10px; padding: 10px; font-size: 13px; font-weight: 800; cursor: pointer; box-shadow: 0 3px 10px rgba(34,197,94,0.25);">🤖 צ׳אט לפרסום מהיר</button>
      </div>`}
    </div>
  `;
}

// ===== מפת גולשים (ישראל) — משתמש רשום ממקם את עצמו, כולם רואים =====
// מיקום נשמר מעוגל (~1 ק"מ) ב-website/user_map/{uid}
let userMapOpen = false;
let userMapData = {};
let userMapUnsub = null;
let userMapPicking = false;
let userMapExpanded = false;
const USER_MAP_BOUNDS = { minLat: 29.3, maxLat: 33.5, minLng: 34.2, maxLng: 35.95 };

function buildUserMapBox() {
  if (userMapOpen) setTimeout(initUserMaps, 0);
  const count = Object.keys(userMapData).length;
  return `
    <div class="art-sidebar-box umap-box${userMapOpen ? ' open' : ''}${userMapOpen && userMapExpanded ? ' expanded' : ''}">
      <button type="button" class="umap-head" onclick="toggleUserMap()">
        <span>🗺️ מפת גולשים</span>
        <span class="umap-head-meta"><span class="umap-count">${count ? count + ' על המפה' : ''}</span> <span class="umap-chevron">▾</span></span>
      </button>
      <div class="umap-body" style="display:${userMapOpen ? 'block' : 'none'};">
        <div class="umap-canvas-wrap">
          <div class="umap-canvas"></div>
          <button type="button" class="umap-expand" onclick="toggleUserMapExpand()">${userMapOpen && userMapExpanded ? '✕ סגירה' : '⛶ הגדלה'}</button>
        </div>
        <div class="umap-actions"></div>
      </div>
    </div>`;
}

function loadLeaflet() {
  if (window.L && window.L.map) return Promise.resolve(window.L);
  if (window.__leafletLoading) return window.__leafletLoading;
  window.__leafletLoading = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    js.onload = () => resolve(window.L);
    js.onerror = () => { window.__leafletLoading = null; reject(new Error('leaflet load failed')); };
    document.head.appendChild(js);
  });
  return window.__leafletLoading;
}

function subscribeUserMap() {
  if (userMapUnsub) return;
  userMapUnsub = onValue(ref(db, 'website/user_map'), (snap) => {
    userMapData = snap.exists() ? (snap.val() || {}) : {};
    document.querySelectorAll('.umap-count').forEach(el => {
      const n = Object.keys(userMapData).length;
      el.textContent = n ? n + ' על המפה' : '';
    });
    refreshUserMaps();
  }, () => {});
}

function toggleUserMap() {
  userMapOpen = !userMapOpen;
  document.querySelectorAll('.umap-box').forEach(box => {
    box.classList.toggle('open', userMapOpen);
    const body = box.querySelector('.umap-body');
    if (body) body.style.display = userMapOpen ? 'block' : 'none';
  });
  if (userMapOpen) initUserMaps();
  else { userMapPicking = false; toggleUserMapExpand(false); }
}
window.toggleUserMap = toggleUserMap;

async function initUserMaps() {
  subscribeUserMap();
  let L;
  try { L = await loadLeaflet(); } catch (e) {
    document.querySelectorAll('.umap-canvas').forEach(c => { c.innerHTML = '<div class="umap-err">לא ניתן לטעון את המפה כרגע</div>'; });
    return;
  }
  document.querySelectorAll('.umap-canvas').forEach(el => {
    if (el._umap || !el.isConnected || el.offsetParent === null) return;
    const map = L.map(el, {
      zoomSnap: 0.25, minZoom: 6.5, maxZoom: 11,
      maxBounds: [[28.9, 33.3], [33.8, 36.6]], maxBoundsViscosity: 0.8,
      attributionControl: false
    });
    map.fitBounds([[29.45, 34.25], [33.35, 35.9]], { padding: [6, 6] });
    drawCartoonIsrael(L, map, el);
    map.on('click', (ev) => { if (userMapPicking) saveMyMapLocation(ev.latlng.lat, ev.latlng.lng); });
    el._umap = map;
    el._umapLayer = L.layerGroup().addTo(map);
    // התאמה מחדש בכל שינוי גודל (פתיחה, הגדלה, סגירה)
    const refit = () => requestAnimationFrame(() => {
      if (!el.offsetWidth || !el.offsetHeight) return;
      map.invalidateSize({ pan: false });
      map.fitBounds([[29.45, 34.25], [33.35, 35.9]], { padding: [6, 6], animate: false });
      el._umapBaseZoom = map.getZoom();
      updateCityTiers(el);
    });
    el._umapRefit = refit;
    if (window.ResizeObserver) new ResizeObserver(refit).observe(el);
    setTimeout(refit, 50);
  });
  refreshUserMaps();
}

// קו מתאר מצויר של ישראל [lat, lng]
const ISRAEL_OUTLINE = [
  [33.093,35.105],[33.09,35.2],[33.06,35.37],[33.09,35.5],[33.277,35.573],[33.25,35.62],[33.33,35.82],[33.2,35.9],
  [33.05,35.87],[32.9,35.83],[32.75,35.78],[32.69,35.65],[32.64,35.57],[32.4,35.55],[32.1,35.52],[31.75,35.53],
  [31.5,35.56],[31.1,35.45],[30.8,35.33],[30.5,35.2],[30.2,35.15],[29.9,35.05],[29.55,34.98],[29.49,34.9],
  [29.6,34.87],[30.0,34.7],[30.4,34.55],[30.8,34.4],[31.22,34.27],[31.3,34.37],[31.45,34.5],[31.59,34.49],
  [31.68,34.57],[31.8,34.65],[32.05,34.75],[32.2,34.8],[32.33,34.85],[32.5,34.9],[32.7,34.95],[32.83,34.96],
  [32.8,35.03],[32.92,35.07],[33.0,35.09]
];
const KINNERET = [[32.89,35.53],[32.87,35.59],[32.82,35.65],[32.76,35.64],[32.71,35.59],[32.75,35.54],[32.82,35.52]];
const DEAD_SEA = [[31.76,35.46],[31.76,35.54],[31.55,35.56],[31.35,35.5],[31.1,35.44],[31.15,35.39],[31.4,35.42],[31.6,35.45]];
// tier: 1 תמיד, 2 בזום +1, 3 בזום +2, 4 בזום +3 (גוש דן הצפוף)
const ISRAEL_CITIES = [
  ['ירושלים',31.778,35.235,1],['תל אביב',32.085,34.781,1],['חיפה',32.794,34.99,1],['באר שבע',31.252,34.791,1],
  ['אילת',29.557,34.952,1],['טבריה',32.795,35.531,1],['צפת',32.965,35.496,2],['קריית שמונה',33.207,35.57,1],
  ['נתניה',32.33,34.857,1],['אשדוד',31.8,34.65,1],['דימונה',31.069,35.033,2],['מצפה רמון',30.61,34.8,1],
  ['נצרת',32.702,35.297,2],['עפולה',32.607,35.289,2],['נהריה',33.006,35.098,2],['עכו',32.927,35.084,2],
  ['כרמיאל',32.919,35.296,2],['חדרה',32.434,34.919,2],['אשקלון',31.669,34.571,2],['ערד',31.259,35.212,2],
  ['בית שאן',32.497,35.497,2],['קצרין',32.99,35.69,2],['מודיעין',31.899,35.007,2],['שדרות',31.525,34.596,2],
  ['קריית גת',31.61,34.764,2],['בית שמש',31.747,34.988,2],['אריאל',32.105,35.17,2],['עין בוקק',31.2,35.36,2],
  ['הרצליה',32.166,34.843,3],['כפר סבא',32.175,34.907,3],['רעננה',32.184,34.871,4],['פתח תקווה',32.087,34.887,3],
  ['ראשון לציון',31.964,34.804,3],['רחובות',31.894,34.811,3],['חולון',32.011,34.775,4],['רמת גן',32.068,34.824,4],
  ['בני ברק',32.083,34.833,4],['יבנה',31.878,34.739,4],['לוד',31.951,34.895,3],['רמלה',31.93,34.866,4],
  ['יקנעם',32.66,35.11,3],['זכרון יעקב',32.57,34.95,3],['מעלה אדומים',31.777,35.3,4],['נתיבות',31.42,34.59,3],
  ['אופקים',31.31,34.62,3],['קריית אתא',32.81,35.11,3],['מגדל העמק',32.676,35.24,3],['ראש פינה',32.97,35.54,3]
];
const ISRAEL_DECOR = [
  ['🌊',32.3,34.45],['🌊',31.4,34.1],['⛵',32.75,34.7],['⛰️',33.3,35.76],['🐟',32.8,35.585],
  ['🌴',29.72,34.95],['🐪',30.35,34.9],['🌵',30.95,34.95],['🌲',33.02,35.3],['🍇',32.55,35.02]
];

function drawCartoonIsrael(L, map, el) {
  const pane = (name, z) => { map.createPane(name).style.zIndex = z; return name; };
  pane('umapLand', 300); pane('umapCities', 620);
  const land = L.polygon(ISRAEL_OUTLINE, { pane: 'umapLand', className: 'umap-land', interactive: false, smoothFactor: 0 }).addTo(map);
  // מעבר צבעים צפון ירוק → נגב חולי
  const svg = land._renderer && land._renderer._container;
  if (svg && !svg.querySelector('#umapLandGrad')) {
    const NS = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(NS, 'defs');
    defs.innerHTML = '<linearGradient id="umapLandGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#9be38b"/><stop offset="0.38" stop-color="#c9ec8f"/>' +
      '<stop offset="0.55" stop-color="#fbe49a"/><stop offset="1" stop-color="#f8c878"/></linearGradient>';
    svg.insertBefore(defs, svg.firstChild);
  }
  L.polygon(KINNERET, { pane: 'umapLand', className: 'umap-lake', interactive: false }).addTo(map);
  L.polygon(DEAD_SEA, { pane: 'umapLand', className: 'umap-lake salt', interactive: false }).addTo(map);

  ISRAEL_DECOR.forEach(([e, lat, lng]) => L.marker([lat, lng], {
    pane: 'umapLand', interactive: false, keyboard: false,
    icon: L.divIcon({ className: 'umap-decor', html: e, iconSize: [22, 22], iconAnchor: [11, 11] })
  }).addTo(map));
  const seaLabel = (txt, lat, lng) => L.marker([lat, lng], { pane: 'umapLand', interactive: false,
    icon: L.divIcon({ className: 'umap-sea-label', html: txt, iconSize: [90, 20], iconAnchor: [45, 10] }) }).addTo(map);
  seaLabel('הים התיכון', 31.95, 34.3);
  seaLabel('ים המלח', 31.45, 35.72);
  
  seaLabel('ים סוף', 29.5, 35.12);

  el._umapCities = ISRAEL_CITIES.map(([name, lat, lng, tier]) => {
    const m = L.marker([lat, lng], {
      pane: 'umapCities', interactive: false, keyboard: false,
      icon: L.divIcon({
        className: 'umap-city t' + tier,
        html: `<span class="umap-city-dot"></span><span class="umap-city-name">${escHtml(name)}</span>`,
        iconSize: [0, 0], iconAnchor: [0, 0]
      })
    }).addTo(map);
    m._tier = tier;
    return m;
  });
  map.on('zoomend', () => updateCityTiers(el));
}

function updateCityTiers(el) {
  const map = el._umap;
  if (!map || !el._umapCities) return;
  // לפי זום מוחלט — במפה המוגדלת רואים יותר ערים כבר מההתחלה
  const z = map.getZoom();
  const maxTier = z >= 9.5 ? 4 : z >= 8.5 ? 3 : z >= 7.25 ? 2 : 1;
  const diff = z - 7;
  el._umapCities.forEach(m => {
    const n = m.getElement && m.getElement();
    if (n) n.style.display = m._tier <= maxTier ? '' : 'none';
  });
  el.classList.toggle('zoomed', diff >= 0.75);
}

function toggleUserMapExpand(force) {
  userMapExpanded = typeof force === 'boolean' ? force : !userMapExpanded;
  document.querySelectorAll('.umap-box').forEach(box => box.classList.toggle('expanded', userMapExpanded));
  document.querySelectorAll('.umap-expand').forEach(b => { b.textContent = userMapExpanded ? '✕ סגירה' : '⛶ הגדלה'; });
  document.body.classList.toggle('umap-expanded', userMapExpanded);
  setTimeout(() => document.querySelectorAll('.umap-canvas').forEach(el => el._umapRefit && el._umapRefit()), 250);
}
window.toggleUserMapExpand = toggleUserMapExpand;

function refreshUserMaps() {
  const L = window.L;
  const myUid = (auth.currentUser && !auth.currentUser.isAnonymous) ? auth.currentUser.uid : '';
  document.querySelectorAll('.umap-canvas').forEach(el => {
    if (!el._umap || !L) return;
    el._umapLayer.clearLayers();
    Object.entries(userMapData).forEach(([uid, v]) => {
      if (!v || typeof v.lat !== 'number' || typeof v.lng !== 'number') return;
      const mine = uid === myUid;
      const initial = escHtml(String(v.name || '?').trim().charAt(0) || '?');
      const icon = L.divIcon({
        className: 'umap-pin-wrap',
        html: `<div class="umap-pin${mine ? ' mine' : ''}">${initial}</div>`,
        iconSize: [28, 28], iconAnchor: [14, 14]
      });
      const m = L.marker([v.lat, v.lng], { icon }).addTo(el._umapLayer);
      m.bindPopup(`<div class="umap-pop"><b>${escHtml(v.name || 'משתמש')}</b>${mine ? ' (אני)' : ''}<br>
        <a href="#" onclick="event.preventDefault();openUserPage('${artEsc(uid)}','${artEsc(v.name || '')}')">לפרופיל ›</a></div>`);
    });
    el.classList.toggle('picking', userMapPicking);
  });
  renderUserMapActions();
}

function renderUserMapActions() {
  const user = auth.currentUser;
  const registered = user && !user.isAnonymous;
  const mine = registered && userMapData[user.uid];
  let html;
  if (!registered) {
    html = `<div class="umap-hint">התחברו כדי למקם את עצמכם על המפה</div>
      <button type="button" class="umap-btn" onclick="openLiveChatLogin()">🔑 התחברות</button>`;
  } else if (userMapPicking) {
    html = `<div class="umap-hint picking">👆 לחצו על המפה במקום שלכם</div>
      <div class="umap-row">
        <button type="button" class="umap-btn" onclick="userMapUseGps()">📍 מיקום נוכחי</button>
        <button type="button" class="umap-btn ghost" onclick="userMapSetPicking(false)">ביטול</button>
      </div>`;
  } else {
    html = `<div class="umap-row">
        <button type="button" class="umap-btn" onclick="userMapSetPicking(true)">📍 ${mine ? 'שינוי המיקום שלי' : 'מקם אותי במפה'}</button>
        ${mine ? `<button type="button" class="umap-btn ghost" onclick="removeMyMapLocation()">הסרה</button>` : ''}
      </div>
      <div class="umap-hint small">המיקום מוצג בקירוב (כ-1 ק"מ) לכל הגולשים</div>`;
  }
  document.querySelectorAll('.umap-actions').forEach(el => { el.innerHTML = html; });
}

function userMapSetPicking(on) {
  userMapPicking = !!on;
  refreshUserMaps();
}
window.userMapSetPicking = userMapSetPicking;

function userMapUseGps() {
  if (!navigator.geolocation) { alert('הדפדפן לא תומך באיתור מיקום'); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => saveMyMapLocation(pos.coords.latitude, pos.coords.longitude),
    () => alert('לא הצלחנו לאתר את המיקום — אפשר ללחוץ על המפה במקום זאת'),
    { enableHighAccuracy: false, timeout: 10000 }
  );
}
window.userMapUseGps = userMapUseGps;

async function saveMyMapLocation(lat, lng) {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) { openLiveChatLogin(); return; }
  const b = USER_MAP_BOUNDS;
  if (lat < b.minLat || lat > b.maxLat || lng < b.minLng || lng > b.maxLng) {
    alert('אפשר למקם רק בתחומי ישראל');
    return;
  }
  const round = (n) => Math.round(n * 100) / 100;
  try {
    await set(ref(db, `website/user_map/${user.uid}`), {
      lat: round(lat), lng: round(lng),
      name: String(liveChatUserName() || 'משתמש').slice(0, 40),
      t: Date.now()
    });
    userMapPicking = false;
    refreshUserMaps();
  } catch (e) {
    alert('שמירת המיקום נכשלה');
  }
}

async function removeMyMapLocation() {
  const user = auth.currentUser;
  if (!user) return;
  try { await set(ref(db, `website/user_map/${user.uid}`), null); } catch (e) { alert('ההסרה נכשלה'); }
}
window.removeMyMapLocation = removeMyMapLocation;

// מזעור/הרחבה של פאנל הסרגל (בסגנון רדיט)
function sidebarToggleMinimize(btn) {
  const wrap = btn.closest('.sidebar-tabs-wrap');
  if (!wrap) return;
  const min = wrap.classList.toggle('minimized');
  // במובייל: מזעור מקפל את כל אזור הסרגל (כולל כפתור ההעלאה והטאבים)
  const sidebar = btn.closest('.art-sidebar');
  if (sidebar) sidebar.classList.toggle('sidebar-collapsed', min);
  const chev = btn.querySelector('.sidebar-min-chevron');
  const lbl = btn.querySelector('.sidebar-min-label');
  if (chev) chev.textContent = min ? '▸' : '▾';
  if (lbl) lbl.textContent = min ? 'הרחב' : 'מזער';
}
window.sidebarToggleMinimize = sidebarToggleMinimize;

function sidebarShowTab(id, btn) {
  const wrap = btn.closest('.sidebar-tabs-wrap');
  if (!wrap) return;
  const panel = wrap.querySelector('.sidebar-tab-panel[data-tab="' + id + '"]');
  const alreadyOpen = btn.classList.contains('active') && panel && panel.style.display !== 'none';
  // סגירה בלחיצה חוזרת (בעיקר במובייל, שם הטאבים מקופלים)
  wrap.querySelectorAll('.sidebar-tab-pill').forEach(p => p.classList.remove('active'));
  wrap.querySelectorAll('.sidebar-tab-panel').forEach(p => { p.style.display = 'none'; });
  if (alreadyOpen) return; // היה פתוח → נסגר
  btn.classList.add('active');
  if (panel) panel.style.display = 'block';
  activeSidebarTab = id;
  if (id === 'chat' && typeof renderLiveChatMessages === 'function') renderLiveChatMessages();
}
window.sidebarShowTab = sidebarShowTab;

// פיד "סיפורים" שנוסף בתחתית עמוד התמונות — כשגוללים מטה מעבר לגלריות
// מגיעים לסיפורים (למרות שזה מקטע נפרד). מוצג רק בעמוד התמונות.
// שולף את נתוני הסיפורים מתוך עמוד הסיפורים השמור (page-stories-main),
// כי בעמוד התמונות אין .stories-page ב-DOM לקרוא ממנו.
// אוסף את כל הסיפורים/קומיקסים מכל עמודי הסיפורים (קומיקס + סיפורים) עם תיוג העמוד שלהם.
// משמש לשיוך הדדי בין קומיקס לסיפור — הפריט המשויך יכול להיות בעמוד אחר.
function getAllStoriesFromPages() {
  const out = [];
  try {
    if (typeof pages !== 'undefined' && Array.isArray(pages)) {
      pages.forEach(p => {
        if (!p || !p.content) return;
        if (!p.content.includes('stories-page')) return;
        if (p.content.includes('photos-page') || p.content.includes('photos-stories-feed')) return;
        const m = p.content.match(/data-stories-json="([^"]*)"/);
        if (!m) return;
        let arr = [];
        try { arr = JSON.parse(decodeURIComponent(m[1])); } catch (e) { return; }
        if (!Array.isArray(arr)) return;
        const km = p.content.match(/data-story-kind="([^"]*)"/);
        const kind = (km && km[1]) ? km[1] : 'comics';
        arr.forEach(s => { if (s && s.id) out.push({ ...s, __pageId: p.id, __pageTitle: p.title || '', __kind: kind }); });
      });
    }
  } catch (e) {}
  return out;
}
window.getAllStoriesFromPages = getAllStoriesFromPages;

// ממלא את תפריט השיוך במודל הסיפור עם כל הסיפורים/הקומיקסים האחרים
function populateStoryLinkedSelect(currentId, selectedId) {
  const sel = document.getElementById('story-linked');
  if (!sel) return;
  const all = getAllStoriesFromPages().filter(s => s.id !== currentId);
  let html = '<option value="">— ללא שיוך —</option>';
  all.forEach(s => {
    const kindLbl = s.__kind === 'stories' ? 'סיפור' : 'קומיקס';
    const label = (s.title || 'ללא שם') + ' (' + kindLbl + ')';
    html += `<option value="${escHtml(s.id)}"${s.id === selectedId ? ' selected' : ''}>${escHtml(label)}</option>`;
  });
  sel.innerHTML = html;
  if (selectedId) sel.value = selectedId;
}
window.populateStoryLinkedSelect = populateStoryLinkedSelect;

// פותח סיפור/קומיקס לפי id — גם אם הוא בעמוד אחר (מנווט לעמוד ואז פותח)
function storyOpenLinked(id) {
  try {
    const all = getAllStoriesFromPages();
    const target = all.find(s => s.id === id);
    if (!target) { alert('הפריט המשויך לא נמצא'); return; }
    // אם הפריט בעמוד הנוכחי — פשוט פותחים
    const container = mainContent.querySelector('.stories-page');
    let onSamePage = false;
    if (container) {
      try {
        const cur = JSON.parse(decodeURIComponent(container.dataset.storiesJson || '%5B%5D'));
        onSamePage = Array.isArray(cur) && cur.some(x => x && x.id === id);
      } catch (e) {}
    }
    if (onSamePage) { window.__detailOpen = false; storyOpenDetail(id); return; }
    // אחרת — מנווטים לעמוד היעד ואז פותחים
    window.__detailOpen = false;
    if (typeof navigateToPage === 'function') navigateToPage(target.__pageId);
    setTimeout(() => { if (typeof storyOpenDetail === 'function') storyOpenDetail(id); }, 120);
  } catch (e) {}
}
window.storyOpenLinked = storyOpenLinked;

// בונה שבב-קישור לפריט המשויך (כולל reverse-lookup לדו-כיווניות)
function storyLinkedChipHTML(s) {
  try {
    const all = getAllStoriesFromPages();
    let linked = null;
    if (s.linkedId) linked = all.find(x => x.id === s.linkedId);
    // reverse: פריט אחר שמשויך לפריט הנוכחי
    if (!linked) linked = all.find(x => x.linkedId === s.id);
    if (!linked || linked.id === s.id) return '';
    const kindLbl = linked.__kind === 'stories' ? 'הסיפור' : 'הקומיקס';
    return `<div class="story-linked-chip" onclick="storyOpenLinked('${artEsc(linked.id)}')">
      🔗 לקריאת ${kindLbl}: <b>${escHtml(linked.title || '')}</b> ←
    </div>`;
  } catch (e) { return ''; }
}
window.storyLinkedChipHTML = storyLinkedChipHTML;

function getStoriesFeedData() {
  try {
    if (typeof pages !== 'undefined' && Array.isArray(pages)) {
      // מזהה עמוד הסיפורים דינמי באתר החי — מזהים לפי כותרת/תוכן, לא רק לפי id קבוע.
      // חשוב: לא לתפוס את עמוד התמונות שמכיל את פיד הסיפורים (photos-page).
      // פיד ה"קומיקס" בתחתית עמוד התמונות — מציג את עמוד הקומיקס (התוכן הוויזואלי),
      // לא את עמוד הסיפורים החדש (page-stories-text) ולא את עמוד התמונות.
      const sp = pages.find(p => p && p.id === 'page-stories-main')
        || pages.find(p => p && p.title === 'קומיקס')
        || pages.find(p => p && p.id !== 'page-stories-text' && p.content && p.content.includes('stories-page') && !p.content.includes('photos-page') && !p.content.includes('photos-stories-feed'))
        || pages.find(p => p && p.title && p.title.includes('סיפורים'));
      if (sp && sp.content) {
        const m = sp.content.match(/data-stories-json="([^"]*)"/);
        if (m) { const arr = JSON.parse(decodeURIComponent(m[1])); if (Array.isArray(arr)) return arr; }
      }
    }
  } catch (e) {}
  return (typeof STORIES_SAMPLES !== 'undefined') ? STORIES_SAMPLES : [];
}

// שולף את גלריות התמונות לעמוד הבית (מתוך עמוד התמונות), עם נפילה לדוגמאות אם ריק.
function getPhotosForHome() {
  try {
    if (typeof pages !== 'undefined' && Array.isArray(pages)) {
      const pp = pages.find(p => p && (p.content || '').includes('data-section="photos"'))
        || pages.find(p => p && (p.title || '').includes('תמונות'));
      if (pp && pp.content) {
        const m = pp.content.match(/data-photos-json="([^"]*)"/);
        if (m) { const arr = JSON.parse(decodeURIComponent(m[1])); if (Array.isArray(arr)) return arr; }
      }
    }
  } catch (e) {}
  return (typeof PHOTOS_SAMPLES !== 'undefined' && Array.isArray(PHOTOS_SAMPLES)) ? PHOTOS_SAMPLES : [];
}

// דוגמאות תצוגה לעמוד הבית — מוצגות רק כשאין עדיין קומיקס/סיפורים אמיתיים,
// כדי שהמבנה (שורה של כל סוג) ייראה. ברגע שמעלים תוכן אמיתי, הן נעלמות.
function _homeDemoComics() {
  return [
    { id: 'demo-c1', title: 'קומיקס לדוגמה', author: 'הצוות', category: 'דוגמה', timestamp: 'עכשיו', images: ['https://picsum.photos/seed/comic1/400/300'], pages: [{ type: 'image', url: 'https://picsum.photos/seed/comic1/400/300' }] },
    { id: 'demo-c2', title: 'עוד קומיקס לדוגמה', author: 'הצוות', category: 'דוגמה', timestamp: 'עכשיו', images: ['https://picsum.photos/seed/comic2/400/300'], pages: [{ type: 'image', url: 'https://picsum.photos/seed/comic2/400/300' }] }
  ];
}
function _homeDemoStories() {
  return [
    { id: 'demo-t1', title: 'סיפור לדוגמה', author: 'הצוות', category: 'דוגמה', timestamp: 'עכשיו', pages: [{ type: 'text', text: 'זהו סיפור טקסט לדוגמה שמוצג בעמוד הבית עד שתעלה סיפורים אמיתיים.' }] },
    { id: 'demo-t2', title: 'עוד סיפור לדוגמה', author: 'הצוות', category: 'דוגמה', timestamp: 'עכשיו', pages: [{ type: 'text', text: 'סיפור נוסף לדוגמה. אפשר להחליף אותו בתוכן אמיתי מעמוד הסיפורים.' }] }
  ];
}

// עמוד הבית: שורה מכל סוג — תמונות, קומיקס, סיפורים.
// התמונות בעטיפת .photos-page (photoOpenDetail), הקומיקס+סיפורים בעטיפת .stories-page
// אחת עם data-stories-json מאוחד (storyOpenDetail מוצא כל פריט לפי id).
// וידג'ט מדדי פעילות האתר והצמיחה (עיצוב לבן נקי ויוקרתי)
function buildSiteStatsSection() {
  return `
    <div class="site-stats-wrapper" style="margin: 0 0 28px; background: #ffffff; color: #0f172a; padding: 26px 22px; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.04); font-family: system-ui, -apple-system, sans-serif; direction: rtl;">
      
      <!-- כותרת דאשבורד -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 22px; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 22px;">📊</span>
          <div>
            <h2 style="margin: 0; font-size: 19px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">מדדי פעילות האתר והצמיחה</h2>
            <p style="margin: 3px 0 0; font-size: 13px; color: #64748b;">נתונים בזמן אמת על עליות הפעילות, המשתמשים והתכנים באתר</p>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
            <span style="width: 7px; height: 7px; background: #16a34a; border-radius: 50%; display: inline-block;"></span>
            פעיל עכשיו
          </span>
        </div>
      </div>

      <!-- טבלת Q3 2026 / YOY -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-bottom: 22px;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; margin-bottom: 12px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">
          <span>רבעון נוכחי Q3 2026</span>
          <span>צמיחה שנתית (YOY)</span>
        </div>

        <!-- שורה 1 -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 6px; min-width: 160px; color: #334155; font-weight: 600;">
            <span>סה״כ צפיות ופעילות</span>
            <span style="color: #94a3b8; font-size: 11px;">›</span>
          </div>
          <div style="font-weight: 800; color: #0f172a; font-size: 15px;">997.4K</div>
          <div style="display: flex; align-items: center; gap: 12px; min-width: 160px; justify-content: flex-end; flex: 1;">
            <div style="flex: 1; max-width: 140px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; direction: ltr;">
              <div style="width: 85%; height: 100%; background: #4f46e5; border-radius: 3px;"></div>
            </div>
            <span style="color: #16a34a; font-weight: 800; font-size: 13px; min-width: 65px; text-align: left;">+21.7%</span>
          </div>
        </div>

        <!-- שורה 2 -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 6px; min-width: 160px; color: #334155; font-weight: 600;">
            <span>חברים פעילים בקהילות</span>
            <span style="color: #94a3b8; font-size: 11px;">›</span>
          </div>
          <div style="font-weight: 800; color: #0f172a; font-size: 15px;">435K</div>
          <div style="display: flex; align-items: center; gap: 12px; min-width: 160px; justify-content: flex-end; flex: 1;">
            <div style="flex: 1; max-width: 140px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; direction: ltr;">
              <div style="width: 55%; height: 100%; background: #4f46e5; border-radius: 3px;"></div>
            </div>
            <span style="color: #16a34a; font-weight: 800; font-size: 13px; min-width: 65px; text-align: left;">+22.9%</span>
          </div>
        </div>

        <!-- שורה 3 -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 6px; min-width: 160px; color: #334155; font-weight: 600;">
            <span>סיפורים וקומיקס שפורסמו</span>
            <span style="color: #94a3b8; font-size: 11px;">›</span>
          </div>
          <div style="font-weight: 800; color: #0f172a; font-size: 15px;">91K</div>
          <div style="display: flex; align-items: center; gap: 12px; min-width: 160px; justify-content: flex-end; flex: 1;">
            <div style="flex: 1; max-width: 140px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; direction: ltr;">
              <div style="width: 30%; height: 100%; background: #4f46e5; border-radius: 3px;"></div>
            </div>
            <span style="color: #16a34a; font-weight: 800; font-size: 13px; min-width: 65px; text-align: left;">+68.5%</span>
          </div>
        </div>

        <!-- שורה 4 -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 6px; min-width: 160px; color: #334155; font-weight: 600;">
            <span>מעורבות ותגובות משתמשים</span>
            <span style="color: #94a3b8; font-size: 11px;">›</span>
          </div>
          <div style="font-weight: 800; color: #0f172a; font-size: 15px;">252K</div>
          <div style="display: flex; align-items: center; gap: 12px; min-width: 160px; justify-content: flex-end; flex: 1;">
            <div style="flex: 1; max-width: 140px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; direction: ltr;">
              <div style="width: 45%; height: 100%; background: #4f46e5; border-radius: 3px;"></div>
            </div>
            <span style="color: #16a34a; font-weight: 800; font-size: 13px; min-width: 65px; text-align: left;">+620.0%</span>
          </div>
        </div>

        <!-- שורה 5 -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; font-size: 14px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 6px; min-width: 160px; color: #64748b; font-weight: 500;">
            <span>זמן שהייה ממוצע באתר</span>
            <span style="color: #94a3b8; font-size: 11px;">›</span>
          </div>
          <div style="font-weight: 600; color: #64748b; font-size: 14px;">25.3 דק׳</div>
          <div style="display: flex; align-items: center; gap: 12px; min-width: 160px; justify-content: flex-end; flex: 1;">
            <span style="color: #16a34a; font-weight: 800; font-size: 13px; min-width: 65px; text-align: left;">+491.5%</span>
          </div>
        </div>
      </div>

      <!-- 2 עמודות תחתיות -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px;">
          <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 800; color: #0f172a;">נתוני קהילה ומעורבות</h3>
          <div style="display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
            <span style="color: #64748b;">צפיות יומיות ממוצעות</span>
            <span style="font-weight: 700; color: #0f172a;">12,120</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
            <span style="color: #64748b;">אחוז משתמשים חוזרים</span>
            <span style="font-weight: 700; color: #0f172a;">88.5%</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
            <span style="color: #64748b;">פוסטים חדשים השבוע</span>
            <span style="font-weight: 700; color: #0f172a;">408</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 7px 0; font-size: 13px;">
            <span style="color: #64748b;">סה״כ חברי קהילה רשומים</span>
            <span style="font-weight: 700; color: #0f172a;">4,084,860</span>
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px;">
          <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 800; color: #0f172a;">מדדי ביצועים ואיכות</h3>
          <div style="display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
            <span style="color: #64748b;">יחס תגובות לכל תוכן</span>
            <span style="font-weight: 700; color: #0f172a;">20.92 ›</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
            <span style="color: #64748b;">מקדם שיתוף (Share Rate)</span>
            <span style="font-weight: 700; color: #0f172a;">3.37 ›</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
            <span style="color: #64748b;">דירוג שביעות רצון</span>
            <span style="font-weight: 700; color: #0f172a;">4.91 / 5</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 7px 0; font-size: 13px;">
            <span style="color: #64748b;">זמן טעינת עמוד</span>
            <span style="font-weight: 700; color: #0f172a;">0.3 שניות ›</span>
          </div>
        </div>

      </div>

    </div>
  `;
}
window.buildSiteStatsSection = buildSiteStatsSection;

// ============================================================
// וידג'ט העלאה מהירה לעמוד הבית (5 שאלות + העלאת תמונה)
// ============================================================
window.quickUploadState = window.quickUploadState || {
  step: 1,
  target: 'photos', // 'photos', 'comics', 'stories'
  title: '',
  summary: '',
  category: 'כללי',
  age: '',
  location: '',
  telegram: '',
  email: '',
  desc: '',
  author: '',
  images: [], // array of base64 strings
  isSubmitting: false
};

// רצף השלבים לפי היעד. לתמונות שואלים את כל השדות; קומיקס/סיפורים נשארים מקוצרים.
function quickUploadStepKeys() {
  const t = (window.quickUploadState && window.quickUploadState.target) || 'photos';
  if (t === 'photos') {
    return ['target', 'titlesum', 'details', 'contact', 'images'];
  }
  return ['target', 'title', 'category', 'desc', 'author', 'images'];
}

function renderQuickUploadHero() {
  const st = window.quickUploadState;
  const currentStep = st.step || 1;

  // כותרת עליונה בסגנון התמונה הרפרנסית עם גרדיאנט
  let questionHeader = '';
  let inputContent = '';

  const _stepKeys = quickUploadStepKeys();
  const _totalQ = _stepKeys.length - 1; // כל השלבים למעט "שלב אחרון" (העלאת תמונות)
  const _key = _stepKeys[currentStep - 1] || 'target';
  const _ARROW = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`;
  const _arrow = (t) => `<button type="button" class="qu-arrow-btn" onclick="quickUploadNext()" title="${t || 'המשך'}">${_ARROW}</button>`;
  const _hdr = (a, b, sub) => `
      <div class="qu-hero-title">${a} <span class="qu-gradient-text">${b}</span></div>
      <div class="qu-hero-subtitle">✨ שלב ${currentStep} מתוך ${_totalQ}: ${sub}</div>`;
  const _textStep = (ph, val, type) => `
      <div class="qu-input-wrapper">
        <input type="${type || 'text'}" id="qu-input-field" class="qu-text-input" placeholder="${ph}" value="${escHtml(val || '')}" onkeydown="if(event.key==='Enter') quickUploadNext()" autofocus>
        ${_arrow()}
      </div>`;

  if (_key === 'target') {
    questionHeader = `
      <div class="qu-hero-title">בואו להעלות תוכן <span class="qu-gradient-text">לויראלי</span></div>
      <div class="qu-hero-subtitle">✨ שלב 1 מתוך ${_totalQ}: לאיזה אזור תרצו להעלות את התוכן שלכם?</div>
    `;
    inputContent = `
      <div class="qu-options-grid">
        <button type="button" class="qu-dest-pill ${st.target === 'photos' ? 'active' : ''}" onclick="quickUploadSetTarget('photos')">
          <span class="qu-pill-icon">🖼️</span>
          <div class="qu-pill-text"><strong>תמונות</strong><small>אלבומים וגלריות תמונות</small></div>
        </button>
        <button type="button" class="qu-dest-pill ${st.target === 'comics' ? 'active' : ''}" onclick="quickUploadSetTarget('comics')">
          <span class="qu-pill-icon">📖</span>
          <div class="qu-pill-text"><strong>קומיקס</strong><small>רצועות קומיקס ואיורים</small></div>
        </button>
        <button type="button" class="qu-dest-pill ${st.target === 'stories' ? 'active' : ''}" onclick="quickUploadSetTarget('stories')">
          <span class="qu-pill-icon">✍️</span>
          <div class="qu-pill-text"><strong>סיפורים</strong><small>סיפורים קצרים ומאמרים</small></div>
        </button>
      </div>
      <div class="qu-input-row" style="margin-top:16px;">
        <div style="flex:1; font-size:13px; color:#64748b; text-align:right;">נבחר: <b>${st.target === 'photos' ? '🖼️ תמונות' : (st.target === 'comics' ? '📖 קומיקס' : '✍️ סיפורים')}</b></div>
        ${_arrow('המשך לשלב הבא')}
      </div>
    `;
  } else if (_key === 'title') {
    questionHeader = (st.target === 'photos')
      ? _hdr('מה הכותרת', 'שלך?', 'כותרת קליטה שתמשוך צופים')
      : _hdr('מה הכותרת', 'של התוכן?', 'כותרת קליטה שתמשוך קוראים וצופים');
    inputContent = _textStep('לדוגמה: יום טיול מדהים בצפון / הרפתקה בחלל...', st.title);
  } else if (_key === 'summary') {
    questionHeader = _hdr('מה התקציר', 'של הגלריה?', 'תיאור קצר או תקציר שילווה את הגלריה');
    inputContent = `
      <div class="qu-input-wrapper is-textarea">
        <textarea id="qu-input-field" class="qu-textarea-input" rows="3" placeholder="תיאור קצר...">${escHtml(st.summary || '')}</textarea>
        ${_arrow()}
      </div>`;
  } else if (_key === 'category') {
    if (st.target === 'photos') {
      // תמונות: קטגוריית מגדר — גבר / אישה / זוג
      const cats = ['גבר', 'אישה', 'זוג'];
      questionHeader = _hdr('מה הקטגוריה', 'שלך?', 'גבר, אישה או זוג');
      const catChips = cats.map(c => `<button type="button" class="qu-cat-chip ${st.category === c ? 'active' : ''}" onclick="quickUploadSetCat('${artEsc(c)}')">${escHtml(c)}</button>`).join('');
      inputContent = `
        <div class="qu-chips-container">${catChips}</div>
        <div class="qu-input-row" style="margin-top:16px; justify-content:flex-end;">
          ${_arrow()}
        </div>`;
    } else {
      // קומיקס/סיפורים: אותן קטגוריות כמו בעמוד (כללי / עירום ...)
      const cats = (typeof STORY_CATEGORIES !== 'undefined' && Array.isArray(STORY_CATEGORIES) && STORY_CATEGORIES.length)
        ? STORY_CATEGORIES : ['כללי', 'עירום'];
      questionHeader = _hdr('מה הקטגוריה', 'שלך?', 'בחרו קטגוריה');
      const catChips = cats.map(c => `<button type="button" class="qu-cat-chip ${st.category === c ? 'active' : ''}" onclick="quickUploadSetCat('${artEsc(c)}')">${escHtml(c)}</button>`).join('');
      inputContent = `
        <div class="qu-chips-container">${catChips}</div>
        <div class="qu-input-row" style="margin-top:16px; justify-content:flex-end;">
          ${_arrow()}
        </div>`;
    }
  } else if (_key === 'titlesum') {
    // תמונות: כותרת + תקציר — שלב אחד
    questionHeader = _hdr('מה הכותרת', 'והתקציר?', 'כותרת קליטה ותיאור קצר שילווה את הגלריה');
    inputContent = `
      <div class="qu-details-card">
        <div class="qu-detail-row">
          <div class="qu-detail-label">כותרת</div>
          <input type="text" id="qu-input-field" class="qu-field" placeholder="לדוגמה: יום טיול מדהים בצפון..." value="${escHtml(st.title || '')}" onkeydown="if(event.key==='Enter'){event.preventDefault(); const n=document.getElementById('qu-input-field-2'); if(n) n.focus();}" autofocus>
        </div>
        <div class="qu-detail-row">
          <div class="qu-detail-label">תקציר</div>
          <textarea id="qu-input-field-2" class="qu-field" rows="2" placeholder="תיאור קצר... (אופציונלי)">${escHtml(st.summary || '')}</textarea>
        </div>
      </div>
      <div class="qu-input-row" style="margin-top:16px; justify-content:flex-end;">
        ${_arrow()}
      </div>`;
  } else if (_key === 'contact') {
    // תמונות: טלגרם + מייל — שלב אחד
    questionHeader = _hdr('איך אפשר', 'ליצור קשר?', 'טלגרם ומייל שיוצגו בכרטיס (אופציונלי)');
    inputContent = `
      <div class="qu-details-card">
        <div class="qu-detail-row">
          <div class="qu-detail-label">טלגרם</div>
          <input type="text" id="qu-input-field" class="qu-field" dir="ltr" placeholder="@username" value="${escHtml(st.telegram || '')}" onkeydown="if(event.key==='Enter'){event.preventDefault(); const n=document.getElementById('qu-input-field-2'); if(n) n.focus();}" autofocus>
        </div>
        <div class="qu-detail-row">
          <div class="qu-detail-label">מייל</div>
          <input type="email" id="qu-input-field-2" class="qu-field" dir="ltr" placeholder="example@mail.com" value="${escHtml(st.email || '')}" onkeydown="if(event.key==='Enter') quickUploadNext()">
        </div>
      </div>
      <div class="qu-input-row" style="margin-top:16px; justify-content:flex-end;">
        ${_arrow()}
      </div>`;
  } else if (_key === 'details') {
    // תמונות: מין + גיל + אזור — שלב אחד מרוכז
    questionHeader = _hdr('מה הפרטים', 'שלך?', 'מין, גיל ואזור שיוצגו בכרטיס');
    const _chips = (field, opts, cur) => opts.map(o => `<button type="button" class="qu-cat-chip ${cur === o ? 'active' : ''}" onclick="quickUploadSetDetail('${field}', '${artEsc(o)}')">${escHtml(o)}</button>`).join('');
    let ageOpts = '<option value="">בחרו גיל</option>';
    for (let a = 18; a <= 99; a++) ageOpts += `<option value="${a}" ${String(st.age) === String(a) ? 'selected' : ''}>${a}</option>`;
    inputContent = `
      <div class="qu-details-card">
        <div class="qu-detail-row">
          <div class="qu-detail-label">מין</div>
          <div class="qu-detail-chips">${_chips('gender', ['גבר', 'אישה', 'זוג'], st.category)}</div>
        </div>
        <div class="qu-detail-row">
          <div class="qu-detail-label">גיל</div>
          <div class="qu-select-wrap"><select class="qu-select" onchange="quickUploadSetDetail('age', this.value)">${ageOpts}</select></div>
        </div>
        <div class="qu-detail-row">
          <div class="qu-detail-label">אזור</div>
          <div class="qu-detail-chips">${_chips('region', ['מרכז', 'דרום', 'צפון'], st.location)}</div>
        </div>
      </div>
      <div class="qu-input-row" style="margin-top:16px; justify-content:flex-end;">
        ${_arrow()}
      </div>`;
  } else if (_key === 'age') {
    questionHeader = _hdr('מה הגיל', 'שלך?', 'הגיל שיוצג בכרטיס');
    inputContent = _textStep('לדוגמה: 24', st.age, 'number');
  } else if (_key === 'location') {
    questionHeader = _hdr('מה המיקום?', '(אופציונלי)', 'אזור או מיקום שיוצג בכרטיס');
    inputContent = _textStep('לדוגמה: מרכז / תל אביב', st.location);
  } else if (_key === 'telegram') {
    questionHeader = _hdr('מה שם משתמש', 'הטלגרם שלך?', 'שם משתמש או קישור טלגרם ליצירת קשר');
    inputContent = _textStep('לדוגמה: @username', st.telegram);
  } else if (_key === 'email') {
    questionHeader = _hdr('מה לגבי', 'המייל שלך?', 'אימייל ליצירת קשר שיוצג בכרטיס');
    inputContent = _textStep('לדוגמה: example@mail.com', st.email, 'email');
  } else if (_key === 'desc') {
    questionHeader = _hdr('ספרו בקצרה', 'על התוכן', 'תיאור קצר, תקציר או הטקסט המלא שילווה את היצירה');
    inputContent = `
      <div class="qu-input-wrapper is-textarea">
        <textarea id="qu-input-field" class="qu-textarea-input" rows="3" placeholder="כתבו כאן כמה מילים או תיאור מפורט...">${escHtml(st.desc || '')}</textarea>
        ${_arrow()}
      </div>`;
  } else if (_key === 'author') {
    questionHeader = _hdr('מי היוצר /', 'פרטי קשר?', 'שם יוצר, טלגרם או אימייל שיופיע בכרטיס התוכן');
    inputContent = _textStep('שם היוצר / כינוי / טלגרם (@username)...', st.author);
  } else if (_key === 'images') {
    questionHeader = `
      <div class="qu-hero-title">העלאת תמונות <span class="qu-gradient-text">ופרסום</span></div>
      <div class="qu-hero-subtitle">✨ שלב אחרון: בחרו תמונה אחת או יותר ליצירה שלכם ולחצו על פרסום</div>
    `;
    const thumbs = (st.images || []).map((img, i) => `
      <div class="qu-thumb-item">
        <img src="${escHtml(img)}" alt="thumb">
        <button type="button" class="qu-thumb-remove" onclick="quickUploadRemoveImage(${i})" title="הסר תמונה">✕</button>
      </div>
    `).join('');
    inputContent = `
      <div class="qu-upload-box">
        <div class="qu-thumbs-row">
          ${thumbs}
          ${(st.images || []).length < 6 ? `
            <button type="button" class="qu-add-photo-btn" onclick="quickUploadPickFiles()">
              <span style="font-size:24px;">📷</span>
              <span>הוסף תמונה</span>
            </button>
          ` : ''}
        </div>
        <div class="qu-final-actions">
          <button type="button" class="qu-publish-btn ${st.isSubmitting ? 'loading' : ''}" onclick="quickUploadFinalSubmit()" ${st.isSubmitting ? 'disabled' : ''}>
            ${st.isSubmitting ? '⏳ מפרסם תוכן...' : '🚀 פרסם תוכן עכשיו'}
          </button>
        </div>
      </div>
    `;
  }

  // פסי התקדמות שלבים (דינמי לפי מספר השלבים)
  const stepsDots = _stepKeys.map((k, i) => {
    const s = i + 1;
    const isDone = s < currentStep;
    const isCurrent = s === currentStep;
    return `<div class="qu-step-dot ${isDone ? 'done' : ''} ${isCurrent ? 'active' : ''}"></div>`;
  }).join('');

  return `
    <div class="quick-upload-hero-container">
      <div class="qu-hero-card">
        ${currentStep > 1 ? `
          <button type="button" class="qu-back-btn" onclick="quickUploadPrev()" title="חזור לשלב הקודם">
            ← חזרה
          </button>
        ` : ''}
        <div class="qu-progress-dots">
          ${stepsDots}
        </div>
        ${questionHeader}
        <div class="qu-input-area">
          ${inputContent}
        </div>
      </div>
    </div>
  `;
}
window.renderQuickUploadHero = renderQuickUploadHero;

// ==========================================
// ריבוע "הסבר שימוש" — סרטון יוטיוב ליד וידג'ט ההעלאה (המנהל קובע את הקישור)
// ==========================================
let UPLOAD_GUIDE_URL = '';
try {
  onValue(ref(db, 'website/uploadGuideVideo'), snap => {
    UPLOAD_GUIDE_URL = snap.val() || '';
    const box = document.getElementById('upload-guide-box');
    if (box) box.outerHTML = uploadGuideBoxHTML();
  }, () => {});
} catch (e) {}

function youtubeVideoId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : '';
}

function uploadGuideBoxHTML() {
  const url = UPLOAD_GUIDE_URL;
  const vid = youtubeVideoId(url);
  const isAdminNow = typeof isAdmin === 'function' && isAdmin();
  let media;
  if (vid) {
    media = `<iframe class="qu-guide-frame" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(vid)}?rel=0" title="הסבר שימוש — איך מעלים תוכן" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  } else if (url) {
    // קישור לערוץ (לא לסרטון) — מציגים כפתור מעבר לערוץ
    media = `<a class="qu-guide-frame qu-guide-placeholder" href="${escHtml(safeUrl(url))}" target="_blank" rel="noopener">
      <span class="qu-guide-play" aria-hidden="true"></span><span>לערוץ היוטיוב שלנו</span></a>`;
  } else {
    media = `<div class="qu-guide-frame qu-guide-placeholder"><span class="qu-guide-play" aria-hidden="true"></span><span>סרטון ההסבר יעלה בקרוב</span></div>`;
  }
  return `
    <aside class="qu-guide" id="upload-guide-box">
      <div class="qu-guide-head">
        <div class="qu-guide-title">הסבר שימוש</div>
        ${isAdminNow ? `<button type="button" class="qu-guide-edit" onclick="editUploadGuideVideo()" title="הגדרת סרטון">✎</button>` : ''}
      </div>
      <div class="qu-guide-sub">איך מעלים תוכן לאתר — צפו בסרטון הקצר</div>
      ${media}
    </aside>`;
}
window.uploadGuideBoxHTML = uploadGuideBoxHTML;

async function editUploadGuideVideo() {
  if (!isAdmin()) return;
  const val = prompt('הדביקו קישור לסרטון יוטיוב (או לערוץ). השאירו ריק כדי להסיר:', UPLOAD_GUIDE_URL || '');
  if (val === null) return;
  const clean = val.trim();
  if (clean && !/^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(clean)) {
    alert('נא להדביק קישור של יוטיוב (youtube.com או youtu.be)');
    return;
  }
  try {
    await set(ref(db, 'website/uploadGuideVideo'), clean || null);
    if (typeof showCopyToast === 'function') showCopyToast('✅ סרטון ההסבר עודכן');
  } catch (e) {
    console.error('upload guide save failed', e);
    alert('שגיאה בשמירת הקישור');
  }
}
window.editUploadGuideVideo = editUploadGuideVideo;

// ==========================================
// במובייל: שלושת הריבועים בקרוסלה שמזפזפים בה (כמו שורת הקומיקס)
// פודקאסט משמאל, העלאה באמצע, יוטיוב מימין — נפתח על ההעלאה
// ==========================================
function quHeroCarouselCards(row) {
  return [row.querySelector('.pod-box'), row.querySelector('.quick-upload-hero-container'), row.querySelector('#upload-guide-box')].filter(Boolean);
}
function quHeroUpdateDots(row) {
  const dots = row.parentElement && row.parentElement.querySelector('.qu-hero-dots');
  if (!dots) return;
  const cards = quHeroCarouselCards(row);
  const mid = row.scrollLeft + row.clientWidth / 2;
  let best = 0, bestD = Infinity;
  cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bestD) { bestD = d; best = i; } });
  dots.querySelectorAll('.qu-hero-dot').forEach((d, i) => d.classList.toggle('active', i === best));
}
function quHeroGoTo(btn, i) {
  const row = btn.closest('.qu-hero-wrap') && btn.closest('.qu-hero-wrap').querySelector('.qu-hero-row');
  const card = row && quHeroCarouselCards(row)[i];
  if (card) row.scrollTo({ left: card.offsetLeft - (row.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' });
}
window.quHeroGoTo = quHeroGoTo;
function fitQuHeroRows() {
  if (window.innerWidth > 900) return;
  document.querySelectorAll('.qu-hero-row').forEach(row => {
    if (!row.dataset.carouselInit) {
      row.dataset.carouselInit = '1';
      row.addEventListener('scroll', () => quHeroUpdateDots(row), { passive: true });
      const hero = row.querySelector('.quick-upload-hero-container');
      if (hero) row.scrollLeft = hero.offsetLeft - (row.clientWidth - hero.offsetWidth) / 2;
    }
    quHeroUpdateDots(row);
  });
}
window.fitQuHeroRows = fitQuHeroRows;
window.addEventListener('resize', fitQuHeroRows);
try {
  if (mainContent) new MutationObserver(() => setTimeout(fitQuHeroRows, 0)).observe(mainContent, { childList: true });
} catch (e) {}
setTimeout(fitQuHeroRows, 0);

// ==========================================
// ריבוע פודקאסט (ספוטיפיי) משמאל לווידג'ט ההעלאה (המנהל קובע את הקישור)
// ==========================================
let PODCAST_URL = '';
try {
  onValue(ref(db, 'website/podcastEmbed'), snap => {
    PODCAST_URL = snap.val() || '';
    const box = document.getElementById('podcast-box');
    if (box) box.outerHTML = podcastBoxHTML();
  }, () => {});
} catch (e) {}

// open.spotify.com/(intl-xx/)episode|show|playlist|album|track/ID → {type, id}
function spotifyEmbedParts(url) {
  const m = String(url || '').match(/^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(episode|show|playlist|album|track)\/([A-Za-z0-9]{10,40})/);
  return m ? { type: m[1], id: m[2] } : null;
}

function podcastBoxHTML() {
  const sp = spotifyEmbedParts(PODCAST_URL);
  const isAdminNow = typeof isAdmin === 'function' && isAdmin();
  const media = sp
    ? `<iframe class="pod-frame" src="https://open.spotify.com/embed/${sp.type}/${encodeURIComponent(sp.id)}?utm_source=generator&theme=0" title="פודקאסט" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`
    : `<div class="pod-frame pod-placeholder">
        <span class="pod-art">🎧</span>
        <span class="pod-ph-text"><b>הפודקאסט שלנו</b><span>הפרק הראשון יעלה בקרוב</span></span>
        <span class="pod-play" aria-hidden="true"></span>
      </div>`;
  return `
    <aside class="qu-guide pod-box" id="podcast-box">
      <div class="qu-guide-head">
        <div class="qu-guide-title">🎙️ פודקאסט</div>
        ${isAdminNow ? `<button type="button" class="qu-guide-edit" onclick="editPodcastEmbed()" title="הגדרת פודקאסט">✎</button>` : ''}
      </div>
      <div class="qu-guide-sub">האזינו לפרק האחרון בספוטיפיי</div>
      ${media}
    </aside>`;
}
window.podcastBoxHTML = podcastBoxHTML;

async function editPodcastEmbed() {
  if (!isAdmin()) return;
  const val = prompt('הדביקו קישור ספוטיפיי לפרק / פודקאסט / פלייליסט. השאירו ריק כדי להסיר:', PODCAST_URL || '');
  if (val === null) return;
  const clean = val.trim().split('?')[0];
  if (clean && !spotifyEmbedParts(clean)) {
    alert('נא להדביק קישור של open.spotify.com (episode / show / playlist)');
    return;
  }
  try {
    await set(ref(db, 'website/podcastEmbed'), clean || null);
    if (typeof showCopyToast === 'function') showCopyToast('✅ הפודקאסט עודכן');
  } catch (e) {
    console.error('podcast save failed', e);
    alert('שגיאה בשמירת הקישור');
  }
}
window.editPodcastEmbed = editPodcastEmbed;

function quickUploadSetTarget(target) {
  window.quickUploadState.target = target;
  quickUploadRefreshUI();
}
window.quickUploadSetTarget = quickUploadSetTarget;

function quickUploadSetCat(cat) {
  window.quickUploadState.category = cat;
  const f = document.getElementById('qu-input-field');
  if (f) f.value = cat;
  quickUploadRefreshUI();
}
window.quickUploadSetCat = quickUploadSetCat;

// שלב "הפרטים" בתמונות: מין (נשמר כקטגוריה), גיל ואזור. לחיצה חוזרת על אזור מבטלת אותו.
function quickUploadSetDetail(field, val) {
  const st = window.quickUploadState;
  if (field === 'gender') st.category = val;
  else if (field === 'age') { st.age = val; return; }
  else if (field === 'region') st.location = (st.location === val) ? '' : val;
  quickUploadRefreshUI();
}
window.quickUploadSetDetail = quickUploadSetDetail;

// שומר את הערך של השלב הנוכחי לתוך ה-state לפי מפתח השלב
function quickUploadSaveCurrent(key, val) {
  const st = window.quickUploadState;
  if (key === 'title') st.title = val;
  else if (key === 'summary') st.summary = val;
  else if (key === 'category') { if (val) st.category = val; if (!st.category) st.category = 'כללי'; }
  else if (key === 'age') st.age = val;
  else if (key === 'location') st.location = val;
  else if (key === 'telegram') st.telegram = val;
  else if (key === 'email') st.email = val;
  else if (key === 'desc') st.desc = val;
  else if (key === 'author') st.author = val;
  else if (key === 'titlesum' || key === 'contact') {
    const f2 = document.getElementById('qu-input-field-2');
    const val2 = f2 ? f2.value.trim() : '';
    if (key === 'titlesum') { st.title = val; st.summary = val2; }
    else { st.telegram = val; st.email = val2; }
  }
}

function quickUploadNext() {
  const st = window.quickUploadState;
  const keys = quickUploadStepKeys();
  const key = keys[(st.step || 1) - 1];
  const f = document.getElementById('qu-input-field');
  const val = f ? f.value.trim() : '';

  // כותרת חובה
  if ((key === 'title' || key === 'titlesum') && !val) {
    alert('נא להזין כותרת');
    if (f) f.focus();
    return;
  }
  quickUploadSaveCurrent(key, val);

  if (st.step < keys.length) {
    st.step++;
    quickUploadRefreshUI();
    setTimeout(() => {
      const nextF = document.getElementById('qu-input-field');
      if (nextF) nextF.focus();
    }, 60);
  }
}
window.quickUploadNext = quickUploadNext;

function quickUploadPrev() {
  const st = window.quickUploadState;
  const keys = quickUploadStepKeys();
  const key = keys[(st.step || 1) - 1];
  const f = document.getElementById('qu-input-field');
  if (f) quickUploadSaveCurrent(key, f.value.trim());
  if (st.step > 1) {
    st.step--;
    quickUploadRefreshUI();
  }
}
window.quickUploadPrev = quickUploadPrev;

function quickUploadPickFiles() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.multiple = true;
  inp.onchange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    for (const file of files) {
      if ((window.quickUploadState.images || []).length >= 6) break;
      try {
        const compressed = (typeof artCompressImage === 'function') 
          ? await artCompressImage(file) 
          : await new Promise(res => {
              const r = new FileReader();
              r.onload = ev => res(ev.target.result);
              r.readAsDataURL(file);
            });
        if (compressed) {
          window.quickUploadState.images.push(compressed);
        }
      } catch (err) {
        console.error('Image compression error', err);
      }
    }
    quickUploadRefreshUI();
  };
  inp.click();
}
window.quickUploadPickFiles = quickUploadPickFiles;

function quickUploadRemoveImage(index) {
  if (window.quickUploadState.images) {
    window.quickUploadState.images.splice(index, 1);
    quickUploadRefreshUI();
  }
}
window.quickUploadRemoveImage = quickUploadRemoveImage;

function quickUploadRefreshUI() {
  const homeFeed = document.querySelector('.home-feed-page');
  if (homeFeed && typeof buildHomeFeedPage === 'function') {
    const inner = homeFeed.querySelector('.art-inner');
    const existingHero = document.querySelector('.quick-upload-hero-container');
    if (existingHero) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = renderQuickUploadHero();
      const newHero = tempDiv.firstElementChild;
      existingHero.replaceWith(newHero);
    } else {
      homeFeed.parentElement.innerHTML = buildHomeFeedPage();
    }
  }
}
window.quickUploadRefreshUI = quickUploadRefreshUI;

async function quickUploadFinalSubmit() {
  if (typeof trackEvent === 'function') trackEvent('upload_submit');
  const st = window.quickUploadState;
  if (st.isSubmitting) return;

  if (st.target !== 'stories' && (!st.images || !st.images.length)) {
    alert('נא להעלות לפחות תמונה אחת.');
    return;
  }

  st.isSubmitting = true;
  quickUploadRefreshUI();

  try {
    const user = (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser : null;
    let authorName = st.author || '';
    let authorEmail = '';
    let authorTelegram = '';

    if (user) {
      try {
        const p = JSON.parse(localStorage.getItem(`user_profile_${user.uid}`) || '{}');
        if (!authorName) authorName = p.nickname || user.displayName || (user.email ? user.email.split('@')[0] : 'משתמש');
        authorEmail = p.email || user.email || '';
        authorTelegram = p.telegram ? String(p.telegram).replace(/^@/, '') : '';
      } catch (e) {
        if (!authorName) authorName = user.displayName || 'משתמש';
      }
    }
    if (!authorName) authorName = 'יוצר עצמאי';

    const isAdminNow = (typeof isEditMode !== 'undefined' && isEditMode);
    const firstImg = (st.images && st.images[0]) ? st.images[0] : '';
    const nowStamp = new Date().toLocaleDateString('he-IL');

    // תמונות: מעדיפים את מה שהוזן באשף (טלגרם/אימייל) על פני הפרופיל השמור
    const quTelegram = (st.telegram || '').trim() ? String(st.telegram).replace(/^@/, '').replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '') : authorTelegram;
    const quEmail = (st.email || '').trim() ? String(st.email).trim() : authorEmail;

    if (st.target === 'photos') {
      // יצירת גלריית תמונות (עם כל שדות האשף)
      const newAlbum = {
        id: 'ph' + Date.now(),
        type: 'photo',
        isStory: false,
        title: st.title || 'גלריה חדשה',
        summary: st.summary || st.desc || '',
        desc: st.summary || st.desc || '',
        ageRange: st.age || '',
        region: st.location || '',
        image: firstImg,
        images: (st.images && st.images.length) ? st.images : [firstImg],
        author: authorName,
        authorId: user ? user.uid : '',
        category: st.category || 'כללי',
        categoryColor: '#e11d48',
        timestamp: nowStamp,
        createdAt: Date.now(),
        telegramUrl: quTelegram ? ('https://t.me/' + quTelegram) : '',
        emailUrl: quEmail ? ('mailto:' + quEmail) : '',
        likes: 0,
        views: 1,
        approved: isAdminNow
      };

      // שמירה לעמוד התמונות ב-pages
      if (typeof pages !== 'undefined' && Array.isArray(pages)) {
        let photoPage = pages.find(p => p && (p.content || '').includes('data-section="photos"')) 
                     || pages.find(p => p && (p.title || '').includes('תמונות'));
        if (photoPage) {
          let currentList = [];
          const m = (photoPage.content || '').match(/data-photos-json="([^"]*)"/);
          if (m) {
            try { currentList = JSON.parse(decodeURIComponent(m[1])); } catch (e) {}
          }
          if (!Array.isArray(currentList)) currentList = [];
          currentList.unshift(newAlbum);
          photoPage.content = photoPage.content.replace(/data-photos-json="[^"]*"/, `data-photos-json="${encodeURIComponent(JSON.stringify(currentList))}"`);
        }
      }
      if (typeof saveToStorage === 'function') saveToStorage();
      if (!isAdminNow && typeof pushPendingSubmission === 'function') pushPendingSubmission(newAlbum);

    } else {
      // קומיקס או סיפורים
      const isComics = st.target === 'comics';
      const storyPages = (st.images && st.images.length)
        ? st.images.map(u => ({ type: 'image', url: u }))
        : [{ type: 'text', text: st.desc || st.title }];

      const newStory = {
        id: (isComics ? 'cm' : 'st') + Date.now(),
        title: st.title || (isComics ? 'קומיקס חדש' : 'סיפור חדש'),
        summary: st.desc || '',
        body: st.desc || '',
        author: authorName,
        authorId: user ? user.uid : '',
        category: st.category || (isComics ? 'קומיקס' : 'סיפורים'),
        categoryColor: isComics ? '#8b5cf6' : '#0ea5e9',
        image: firstImg,
        images: st.images || [],
        pages: storyPages,
        timestamp: nowStamp,
        createdAt: Date.now(),
        telegramUrl: authorTelegram ? ('https://t.me/' + authorTelegram) : '',
        emailUrl: authorEmail ? ('mailto:' + authorEmail) : '',
        approved: isAdminNow
      };

      if (typeof pages !== 'undefined' && Array.isArray(pages)) {
        const targetKind = isComics ? 'comics' : 'stories';
        let targetPage = pages.find(p => p && p.content && p.content.includes(`data-story-kind="${targetKind}"`))
          || pages.find(p => p && (p.title || '').includes(isComics ? 'קומיקס' : 'סיפורים'));

        if (!targetPage) {
          targetPage = pages.find(p => p && p.content && p.content.includes('stories-page') && !p.content.includes('photos-page'));
        }

        if (targetPage) {
          let currentStories = [];
          const m = (targetPage.content || '').match(/data-stories-json="([^"]*)"/);
          if (m) {
            try { currentStories = JSON.parse(decodeURIComponent(m[1])); } catch (e) {}
          }
          if (!Array.isArray(currentStories)) currentStories = [];
          currentStories.unshift(newStory);
          targetPage.content = targetPage.content.replace(/data-stories-json="[^"]*"/, `data-stories-json="${encodeURIComponent(JSON.stringify(currentStories))}"`);
        }
      }
      if (typeof saveToStorage === 'function') saveToStorage();
      if (!isAdminNow && typeof pushPendingSubmission === 'function') pushPendingSubmission(newStory);
    }

    // איפוס המצב והצגת הודעת הצלחה
    window.quickUploadState = {
      step: 1,
      target: 'photos',
      title: '',
      category: 'כללי',
      desc: '',
      author: '',
      images: [],
      isSubmitting: false
    };

    alert('🎉 התוכן הועלה בהצלחה!');
    // רענון עמוד הבית להצגת התוכן החדש מיד בפיד
    if (typeof renderPage === 'function') renderPage();

  } catch (err) {
    console.error('Quick upload error:', err);
    alert('חלה שגיאה בהעלאת התוכן, אנא נסו שוב.');
    st.isSubmitting = false;
    quickUploadRefreshUI();
  }
}
window.quickUploadFinalSubmit = quickUploadFinalSubmit;

function buildHomeFeedPage() {
  const all = (typeof getAllStoriesFromPages === 'function') ? getAllStoriesFromPages() : [];
  let comics = all.filter(s => s && s.__kind !== 'stories');
  let stories = all.filter(s => s && s.__kind === 'stories');
  let photos = getPhotosForHome();
  
  // בלי דוגמאות בעמוד הבית — אם המנהל מחק הכל, השורה פשוט לא מוצגת

  // מיון הפריטים כך שה-4 האחרונים והחדשים ביותר יעלו ראשונים
  const sortByLatest = (arr) => arr.slice().sort((a, b) => (b.id || '').localeCompare(a.id || ''));
  comics = sortByLatest(comics);
  stories = sortByLatest(stories);

  const cols = 4; // שורה של 4 עמודות מדויקות
  const pcols = 4;
  const maxPerRow = 4; // 4 האחרונים בלבד בבית

  // --- וידג'ט העלאה מהירה (Hero) בראש עמוד הבית ---
  const quickUploadHero = renderQuickUploadHero();

  // --- שורת תמונות ---
  const photosJson = encodeURIComponent(JSON.stringify(photos));
  const photoCards = photos.slice(0, maxPerRow).map(p => (typeof renderPhotoCard === 'function') ? renderPhotoCard(p) : '').join('');
  const photosSection = photos.length ? `
    <div class="photos-page photo-cols-${pcols}${photoImagesMode ? '' : ' text-mode'}${photoNoImgMargins ? ' no-img-margins' : ''} home-feed-photos" data-section="photos" data-photos-json="${photosJson}">
      <div class="photo-section-row home-feed-section" style="margin:0 0 24px; background:#fff; padding:18px; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 4px 15px rgba(0,0,0,0.03);">
        <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:2.5px solid #e11d48; padding-bottom:10px; margin-bottom:18px;">
          <h3 style="margin:0; font-size:18px; font-weight:900; color:#be123c;">🖼️ תמונות אחרונות</h3>
          <button class="home-feed-open" onclick="event.stopPropagation(); homeOpenPhotos()" style="background:#e11d48; color:#fff; border:none; border-radius:8px; padding:7px 14px; font-size:13px; font-weight:700; cursor:pointer;">פתח הכל ←</button>
        </div>
        <div class="art-rows photo-collapsible expanded" style="grid-template-columns: repeat(4, 1fr) !important;">${photoCards}</div>
      </div>
    </div>` : '';

  // --- שורות קומיקס + סיפורים (עטיפה אחת) ---
  const combined = comics.concat(stories);
  const storiesJson = encodeURIComponent(JSON.stringify(combined));
  const storyRow = (items, title, color, border, targetId, iconHint) => `
    <div class="photo-section-row home-feed-section" style="margin:0 0 24px; background:#fff; padding:18px; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 4px 15px rgba(0,0,0,0.03);">
      <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:2.5px solid ${border}; padding-bottom:10px; margin-bottom:18px;">
        <h3 style="margin:0; font-size:18px; font-weight:900; color:${color};">${title} (4 אחרונים)</h3>
        <button class="home-feed-open" onclick="event.stopPropagation(); homeOpenSection('${targetId}')" style="background:${border}; color:#fff; border:none; border-radius:8px; padding:7px 14px; font-size:13px; font-weight:700; cursor:pointer;">פתח הכל ←</button>
      </div>
      <div class="art-rows photo-collapsible expanded" style="grid-template-columns: repeat(4, 1fr) !important;">${items.slice(0, maxPerRow).map(s => storyCardHTML(s, iconHint)).join('')}</div>
    </div>`;
  const storiesSection = `
    <div class="stories-page home-feed-stories story-cols-${cols}${photoImagesMode ? '' : ' text-mode'}" data-stories-json="${storiesJson}">
      ${comics.length ? storyRow(comics, '📖 קומיקס', '#6b21a8', '#8b5cf6', 'page-stories-main', '📖') : ''}
      ${stories.length ? storyRow(stories, '✍️ סיפורים', '#0369a1', '#0ea5e9', 'page-stories-text', '✍️') : ''}
    </div>`;

  return `<div class="articles-page home-feed-page" data-page-id="page-home-feed">
    <div class="art-inner">
      <div class="qu-hero-wrap">
        <div class="qu-hero-row">
          ${uploadGuideBoxHTML()}
          ${quickUploadHero}
          ${podcastBoxHTML()}
        </div>
        <div class="qu-hero-dots">
          <button type="button" class="qu-hero-dot" onclick="quHeroGoTo(this, 0)" aria-label="פודקאסט"></button>
          <button type="button" class="qu-hero-dot active" onclick="quHeroGoTo(this, 1)" aria-label="העלאת תוכן"></button>
          <button type="button" class="qu-hero-dot" onclick="quHeroGoTo(this, 2)" aria-label="הסבר שימוש"></button>
        </div>
      </div>
      ${photosSection}
      ${storiesSection}
    </div>
  </div>`;
}
window.buildHomeFeedPage = buildHomeFeedPage;

function homeOpenSection(targetId) {
  try {
    if (targetId === 'page-photos-main') {
      homeOpenPhotos();
      return;
    }
    let targetPage = (typeof pages !== 'undefined' && Array.isArray(pages)) ? pages.find(p => p && p.id === targetId) : null;
    if (!targetPage && Array.isArray(pages)) {
      if (targetId === 'page-stories-main') {
        targetPage = pages.find(p => p && (p.title === 'קומיקס' || (p.content || '').includes('data-story-kind="comics"')));
        if (!targetPage) {
          targetPage = { id: 'page-stories-main', title: 'קומיקס', content: typeof buildStoriesPage === 'function' ? buildStoriesPage([], 'comics') : '' };
          pages.push(targetPage);
        }
      } else if (targetId === 'page-stories-text') {
        targetPage = pages.find(p => p && (p.title === 'סיפורים' || (p.content || '').includes('data-story-kind="stories"')));
        if (!targetPage) {
          targetPage = { id: 'page-stories-text', title: 'סיפורים', content: typeof buildStoriesPage === 'function' ? buildStoriesPage([], 'stories') : '' };
          pages.push(targetPage);
        }
      }
    }
    const finalId = targetPage ? targetPage.id : targetId;
    if (typeof navigateToPage === 'function') {
      navigateToPage(finalId);
    } else {
      window.__detailOpen = false;
      activePageId = finalId;
      if (typeof renderPage === 'function') renderPage();
    }
  } catch (e) {
    console.error('homeOpenSection error:', e);
  }
}
window.homeOpenSection = homeOpenSection;

// "פתח הכל" של שורת התמונות — מנווט לעמוד התמונות
function homeOpenPhotos() {
  try {
    let pp = (typeof pages !== 'undefined' && Array.isArray(pages))
      ? (pages.find(p => p && p.id === 'page-photos-main')
         || pages.find(p => p && (p.content || '').includes('data-section="photos"'))
         || pages.find(p => p && (p.title || '').includes('תמונות'))
         || pages.find(p => p && (p.content || '').includes('photos-page')))
      : null;

    if (!pp && Array.isArray(pages)) {
      pp = {
        id: 'page-photos-main',
        title: 'תמונות 🖼️',
        content: (typeof buildPhotosPage === 'function') ? buildPhotosPage(typeof PHOTOS_SAMPLES !== 'undefined' ? PHOTOS_SAMPLES : []) : ''
      };
      pages.push(pp);
    }

    if (pp) {
      if (typeof navigateToPage === 'function') {
        navigateToPage(pp.id);
      } else {
        window.__detailOpen = false;
        activePageId = pp.id;
        if (typeof renderPage === 'function') renderPage();
      }
    }
  } catch (e) {
    console.error('homeOpenPhotos error:', e);
  }
}
window.homeOpenPhotos = homeOpenPhotos;

function photosStoriesFeedHTML() {
  try {
    const stories = getStoriesFeedData();
    if (!stories || !stories.length) return '';
    const json = encodeURIComponent(JSON.stringify(stories));
    const cols = (typeof storyGridCols !== 'undefined') ? storyGridCols : 3;
    const cards = stories.map(storyCardHTML).join('');
    return `<div class="articles-page stories-page photos-stories-feed story-cols-${cols}${photoImagesMode ? '' : ' text-mode'}" data-stories-json="${json}">
      <div class="art-inner" style="padding-top:0;">
        <div class="photo-section-row" style="margin: 0 0 24px; background:#ffffff; padding:18px; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 4px 15px rgba(0,0,0,0.03);">
          <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:2.5px solid #8b5cf6; padding-bottom:10px; margin-bottom:18px;">
            <h3 style="margin:0; font-size:18px; font-weight:900; color:#6b21a8;">📖 קומיקס</h3>
          </div>
          <div class="art-rows photo-collapsible expanded">${cards}</div>
        </div>
      </div>
    </div>`;
  } catch (e) { return ''; }
}

function buildPhotosPage(albums, section) {
  section = section || 'photos';
  // סינון גלריות זמניות שתוקפן פג (חולפו 24 שעות)
  const now = Date.now();
  albums = albums.filter(p => !p.expiresAt || p.expiresAt > now);

  // גלריות שסומנו "גלוי רק למנהל" מוסתרות מכל מי שאינו מנהל מחובר / במצב עריכה
  const _isAdminView = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);
  albums = albums.filter(p => !p.adminOnly || _isAdminView);

  // סינון לפי סרגל הקטגוריות (תמונות / קהילות) — "הכל · כללי · לעסקים"
  if ((section === 'photos' || section === 'communities' || section === 'secondhand' || section === 'partnerships' || section === 'reviews') && typeof filterAlbumsByCategory === 'function') {
    albums = filterAlbumsByCategory(albums, section);
  }
  // סינון ייעודי למוצרי יד שניה (סוג הצעה / מחיר / מיקום)
  if (section === 'secondhand' && typeof secondhandApplyFilters === 'function') {
    albums = secondhandApplyFilters(albums);
  }

  // 1. שורה ראשונה: מה חדש (מיון לפי תאריך / העלאה אחרונה)
  // הפיד הראשי: קודם גלריות של מי שאתה עוקב אחריו, ואז לפי הזמן (החדש קודם)
  const newestAlbums = [...albums].sort((a, b) => {
    const fa = (typeof isFollowing === 'function' && isFollowing(a.authorId)) ? 1 : 0;
    const fb = (typeof isFollowing === 'function' && isFollowing(b.authorId)) ? 1 : 0;
    if (fa !== fb) return fb - fa;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });

  // 2. שורה שנייה: בשבילך (נעוצים קודם, ואז המלצות)
  const forYouAlbums = [...albums].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (b.likes || 0) - (a.likes || 0);
  });

  // 3. שורה שלישית: הכי הרבה לייקים וצפיות (מיון משוקלל: צפייה 1 נקודה + לייק 1 נקודה)
  const mostPopularAlbums = [...albums].sort((a, b) => {
    const scoreA = (a.likes || 0) + photoGetViews(a.id);
    const scoreB = (b.likes || 0) + photoGetViews(b.id);
    return scoreB - scoreA;
  });

  const featured = albums.filter(p => p.pinned).slice(0, 3);
  const popularSidebar = [...mostPopularAlbums]
    .filter(p => p.approved !== false)
    .slice(0, 5);

  let savedHTML = '';
  let budgetHTML = '';
  let myProfileHTML = '';
  if (isRegisteredUser()) {
    const user = auth.currentUser;
    const budget = localStorage.getItem(`like_budget_${user.uid}`) || '5';
    budgetHTML = `
      <div class="art-sidebar-box" style="border: 1px solid rgba(225,29,72,0.15); background: rgba(225,29,72,0.02); display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 12px;">
        <span style="font-size: 24px; filter: drop-shadow(0 2px 4px rgba(225,29,72,0.2));">❤️</span>
        <div style="text-align: right;">
          <div style="font-size: 13px; font-weight: 800; color: #e11d48; margin-bottom: 2px;">יתרת הלייקים שלך: ${budget}</div>
          <div style="font-size: 11px; color: #777; font-weight: 500;">מצטברים 5 לייקים נוספים בכל יום!</div>
        </div>
      </div>
    `;

    const profile = (() => {
      try {
        return JSON.parse(localStorage.getItem(`user_profile_${user.uid}`) || '{}');
      } catch (e) { return {}; }
    })();
    const nick = profile.nickname || user.displayName || (user.email ? user.email.split('@')[0] : 'אורח');
    const age = profile.age || '--';
    const location = profile.location || '--';
    const tg = profile.telegram || '';
    const email = profile.email || '';

    myProfileHTML = `
      <div class="art-sidebar-box" id="my-profile-sidebar-box" style="border: 1px solid rgba(0,0,0,0.15); padding: 16px; border-radius: 12px; display: flex; flex-direction: column; gap: 10px;">
        <div class="art-sidebar-title" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0;">
          <span style="font-size: 14px; font-weight: 800;">👤 הפרופיל שלי</span>
          <button onclick="photoToggleProfileEdit()" style="background:none; border:none; color:#e11d48; font-size:12px; font-weight:800; cursor:pointer; padding: 0;">עריכה ✏️</button>
        </div>
        
        <div id="profile-view-state" style="display: block;">
          <div style="font-size: 13px; font-weight: 800; color: #111; margin-bottom: 6px;">כינוי: <span style="font-weight: 500; color: #4b5563;">${escHtml(nick)}</span></div>
          <div style="font-size: 13px; font-weight: 800; color: #111; margin-bottom: 6px;">גיל: <span style="font-weight: 500; color: #4b5563;">${escHtml(age)}</span></div>
          <div style="font-size: 13px; font-weight: 800; color: #111; margin-bottom: 6px;">מגורים: <span style="font-weight: 500; color: #4b5563;">${escHtml(location)}</span></div>
          ${tg ? `<div style="font-size: 13px; font-weight: 800; color: #111; margin-bottom: 6px;">טלגרם: <span style="font-weight: 500; color: #4b5563;">@${escHtml(tg)}</span></div>` : ''}
          ${email ? `<div style="font-size: 13px; font-weight: 800; color: #111;">אימייל: <span style="font-weight: 500; color: #4b5563;">${escHtml(email)}</span></div>` : ''}
        </div>

        <div id="profile-edit-state" style="display:none; flex-direction:column; gap:8px;">
          <input id="profile-edit-nickname" type="text" placeholder="כינוי" value="${escHtml(nick)}" style="padding:8px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px; width:100%; box-sizing:border-box;">
          <input id="profile-edit-age" type="number" placeholder="גיל" value="${age !== '--' ? age : ''}" style="padding:8px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px; width:100%; box-sizing:border-box;">
          <input id="profile-edit-location" type="text" placeholder="אזור מגורים" value="${location !== '--' ? location : ''}" style="padding:8px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px; width:100%; box-sizing:border-box;">
          <input id="profile-edit-telegram" type="text" placeholder="שם משתמש בטלגרם (ללא @)" value="${escHtml(tg)}" style="padding:8px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px; width:100%; box-sizing:border-box;">
          <input id="profile-edit-email" type="email" placeholder="אימייל" value="${escHtml(email)}" style="padding:8px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px; width:100%; box-sizing:border-box;">
          <div style="display:flex; gap:6px; margin-top: 4px;">
            <button onclick="photoSaveProfile()" style="background:#e11d48; color:white; border:none; padding:8px 12px; border-radius:8px; font-size:12px; font-weight:800; cursor:pointer; flex:1;">שמור</button>
            <button onclick="photoToggleProfileEdit()" style="background:#f3f4f6; color:#555; border:none; padding:8px 12px; border-radius:8px; font-size:12px; font-weight:800; cursor:pointer;">ביטול</button>
          </div>
        </div>
      </div>
    `;
  }
  if (auth.currentUser) {
    const savedMap = (() => {
      try { return JSON.parse(localStorage.getItem(`saved_galleries_${auth.currentUser.uid}`) || '{}'); } catch(e) { return {}; }
    })();
    const savedAlbums = albums.filter(a => savedMap[a.id]);

    if (savedAlbums.length > 0) {
      savedHTML = `
        <div class="art-sidebar-box">
          <div class="art-sidebar-title">גלריות שמורות</div>
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${savedAlbums.map(p => `
              <div class="art-popular-item" onclick="photoOpenDetail('${artEsc(p.id)}')" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  <div style="font-size:13px;font-weight:600;line-height:1.4;color:#222; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer;">${escHtml(p.title)}</div>
                </div>
                <button onclick="event.stopPropagation(); photoToggleSave('${artEsc(p.id)}')" style="background:none; border:none; cursor:pointer; color:#e11d48; padding:4px; display: flex; align-items: center;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                  </svg>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      savedHTML = `
        <div class="art-sidebar-box">
          <div class="art-sidebar-title">גלריות שמורות</div>
          <div style="font-size: 13px; color: #777; text-align: center; padding: 10px 0;">אין גלריות שמורות עדיין</div>
        </div>
      `;
    }
  }

  const featuredHTML = featured.map(p => {
    const mainImg = p.images && p.images[0] ? p.images[0] : 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80';
    return `
      <div class="art-featured-card" data-adult="${p.isAdult ? '1' : '0'}" onclick="photoOpenDetail('${artEsc(p.id)}')">
        <img src="${escHtml(mainImg)}" alt="">
      </div>
    `;
  }).join('');

  // בעמוד הקהילות: כרטיס קהילה אחיד ומסודר (תמונה + שם + מידע + כפתור) + ריבועי כניסה לתמונות/סיפורים
  let row1HTML, row2HTML, row3HTML;
  if (section === 'communities' && typeof renderCommunityGridCard === 'function') {
    // מסתירים את כל הקהילות — מציגים רק את הכניסה ל"תמונות" ו"סיפורים"
    const _commShortcuts = typeof communityShortcutsHTML === 'function' ? communityShortcutsHTML() : '';
    row1HTML = _commShortcuts;
    row2HTML = '';
    row3HTML = '';
  } else {
    row1HTML = newestAlbums.map(p => renderPhotoCard(p)).join('');
    row2HTML = forYouAlbums.map(p => renderPhotoCard(p)).join('');
    row3HTML = mostPopularAlbums.map(p => renderPhotoCard(p, { showScoreBadge: true })).join('');
  }

  const popularHTML = popularSidebar.map((p, i) => {
    const score = (p.likes || 0) + photoGetViews(p.id);
    const mainImg = p.images && p.images[0] ? p.images[0] : (p.image || '');
    return `
      <div class="art-popular-item" onclick="photoOpenDetail('${artEsc(p.id)}')" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; cursor: pointer; padding: 6px 8px; border-radius: 8px; transition: background 0.2s; border-bottom: 1px solid #f1f5f9;">
        <div style="display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${mainImg ? `<img src="${escHtml(mainImg)}" style="width: 36px; height: 36px; border-radius: 8px; object-fit: cover; flex-shrink: 0;">` : `<span class="art-popular-num" style="font-weight: 900; color: #ec4899;">${String(i+1).padStart(2,'0')}</span>`}
          <div style="font-size:13px;font-weight:700;line-height:1.4;color:#1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escHtml(p.title)}</div>
        </div>
        <div style="font-size: 11px; color: #e11d48; display: flex; align-items: center; gap: 4px; font-weight: bold; flex-shrink: 0; background: rgba(225,29,72,0.08); padding: 2px 7px; border-radius: 12px;" title="${photoGetViews(p.id)} צפיות + ${p.likes||0} לייקים">
          <span>🔥 ${score}</span>
        </div>
      </div>
    `;
  }).join('');

  const json = encodeURIComponent(JSON.stringify(albums));
  const _adultOn = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('age_verified') === 'true');
  let sectionTitle = 'כל הגלריות';
  let searchPlaceholder = '🔍 חיפוש גלריות...';
  let noResultsText = 'לא נמצאו עיצובים התואמים לחיפוש';
  let addBtnHTML = `<button onclick="openPhotoModal()" style="background:#e11d48; width: 100%; padding: 12px 16px; border-radius: 8px; border: none; color: white; font-weight: bold; font-size: 14px; cursor: pointer; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.2s;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        העלה תמונה
       </button>`;

  if (section === 'ideas') {
    sectionTitle = 'כל הרעיונות';
    searchPlaceholder = '🔍 חיפוש רעיונות...';
    noResultsText = 'לא נמצאו רעיונות התואמים לחיפוש';
    addBtnHTML = `<button onclick="openIdeaModal()" style="background:#3b82f6; width: 100%; padding: 12px 16px; border-radius: 8px; border: none; color: white; font-weight: bold; font-size: 14px; cursor: pointer; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.2s;">
        💡 הוסף רעיון חדש
       </button>
       <button onclick="openProblemModal()" style="background:#f59e0b; width: 100%; padding: 12px 16px; border-radius: 8px; border: none; color: white; font-weight: bold; font-size: 14px; cursor: pointer; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        🎯 פרסם בעיה לפתרון (מכרז)
       </button>`;
  } else if (section === 'communities') {
    sectionTitle = 'קהילות';
    searchPlaceholder = '🔍 חיפוש קהילות...';
    noResultsText = 'לא נמצאו קהילות התואמות לחיפוש';
    addBtnHTML = '';
  } else if (section === 'secondhand') {
    sectionTitle = 'כל המוצרים';
    searchPlaceholder = '🔍 חיפוש מוצרים...';
    noResultsText = 'לא נמצאו מוצרים התואמים לחיפוש';
    addBtnHTML = `<button onclick="openPhotoModal()" style="background:#e11d48; width: 100%; padding: 12px 16px; border-radius: 8px; border: none; color: white; font-weight: bold; font-size: 14px; cursor: pointer; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.2s;">
        ➕ הוסף מוצר יד שניה
       </button>
       <button onclick="openWantedModal()" style="background:#2563eb; width: 100%; padding: 12px 16px; border-radius: 8px; border: none; color: white; font-weight: bold; font-size: 14px; cursor: pointer; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        🔎 מחפש מוצר (קבל הצעות)
       </button>`;
  } else if (section === 'partnerships') {
    sectionTitle = 'כל השותפויות';
    searchPlaceholder = '🔍 חיפוש שותפויות...';
    noResultsText = 'לא נמצאו שותפויות התואמות לחיפוש';
    addBtnHTML = `<button onclick="openPhotoModal()" style="background:#e11d48; width: 100%; padding: 12px 16px; border-radius: 8px; border: none; color: white; font-weight: bold; font-size: 14px; cursor: pointer; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.2s;">
        ➕ פרסום שותפות חדשה
       </button>`;
  } else if (section === 'reviews') {
    sectionTitle = 'כל הביקורות';
    searchPlaceholder = '🔍 חיפוש ביקורות...';
    noResultsText = 'לא נמצאו ביקורות התואמות לחיפוש';
    addBtnHTML = `<button onclick="openPhotoModal()" style="background:#e11d48; width: 100%; padding: 12px 16px; border-radius: 8px; border: none; color: white; font-weight: bold; font-size: 14px; cursor: pointer; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.2s;">
        ✍️ כתוב ביקורת
       </button>
       <button onclick="openClassActionModal()" style="background:#0f172a; width: 100%; padding: 12px 16px; border-radius: 8px; border: none; color: white; font-weight: bold; font-size: 14px; cursor: pointer; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        ⚖️ פתח תביעה ייצוגית
       </button>`;
  }

  return `<div class="articles-page photos-page ${section === 'ideas' ? 'ideas-page' : ''} ${section === 'communities' ? 'communities-page' : ''} ${section === 'secondhand' ? 'secondhand-page' : ''} ${section === 'partnerships' ? 'partnerships-page' : ''} ${section === 'reviews' ? 'reviews-page' : ''} photo-cols-${photoGridCols}${photoImagesMode ? '' : ' text-mode'}${photoNoImgMargins ? ' no-img-margins' : ''}" data-section="${section}" data-photos-json="${json}">
    <div class="art-inner">
      <div class="art-featured-grid">${featuredHTML}</div>
      <div class="art-layout">
        <div class="art-main">
          <div class="art-search-wrap">
            <input type="text" class="art-search" placeholder="${searchPlaceholder}" oninput="photoSearch(this.value)">
          </div>
          ${section === 'ideas'
            ? (typeof ideasCategoryBarHTML === 'function' ? ideasCategoryBarHTML() : '')
            : (section === 'secondhand' || section === 'communities' ? '' : (typeof sectionCategoryBarHTML === 'function' ? sectionCategoryBarHTML(section) : ''))}
          ${section === 'communities' ? '' : (section === 'secondhand' && typeof secondhandFilterBarHTML === 'function' ? secondhandFilterBarHTML() : photoFilterSectionHTML())}
          ${section === 'communities' ? '' : (section === 'secondhand'
            ? (typeof secondhandTogglesHTML === 'function' ? secondhandTogglesHTML() : '')
            : `<div class="view-toggles">
            <label class="tgl">
              <span class="tgl-label">✔️ משתמשים מאומתים</span>
              <span class="tgl-switch"><input type="checkbox" ${photoVerifiedOnly ? 'checked' : ''} onchange="photoToggleVerified(this.checked)"><span class="tgl-slider"></span></span>
            </label>
            <label class="tgl tgl-desktop-only">
              <span class="tgl-label">⛶ מסך מלא (הסתרת סרגלי הצד)</span>
              <span class="tgl-switch"><input type="checkbox" ${pageFullWidth ? 'checked' : ''} onchange="togglePageFullWidth(this.checked)"><span class="tgl-slider"></span></span>
            </label>
          </div>`)}

          <!-- מקטע מאוחד: כל הרעיונות / כל הגלריות -->
          <div class="photo-section-row" style="margin-bottom: 32px; background: #ffffff; padding: 18px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
            <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:2.5px solid #2563eb; padding-bottom:10px; margin-bottom:18px;">
              <div>
                <h3 style="margin:0; font-size:18px; font-weight:900; color:#1e3a8a;">${sectionTitle}</h3>
              </div>
            </div>
            <div class="art-rows photo-collapsible expanded" id="photo-row-1">${row1HTML}</div>
            ${photoRowMoreBtn(newestAlbums.length, 'photo-row-1')}
          </div>
          ${section === 'communities' && typeof sidePagesShortcutsHTML === 'function' ? sidePagesShortcutsHTML() : ''}

          <div class="art-pagination" style="display:none"></div>
          <div class="art-no-results" style="display:none">${noResultsText}</div>
          ${(isAdmin() || isEditMode) ? (section === 'ideas' ? `<button class="art-add-btn" onclick="openIdeaModal()" style="background:#3b82f6">💡 הוסף רעיון חדש</button>` : `<button class="art-add-btn" onclick="openPhotoModal()" style="background:#e11d48">+ הוסף עיצוב אתר חדש</button>`) : ''}
        </div>
        <div class="art-sidebar art-sidebar-right">
          ${addBtnHTML}
          ${section === 'communities' ? '' : buildSidebarTabs(savedHTML, section === 'ideas' ? 'ideas' : 'photos')}
        </div>
        ${buildLeftSidebarBox(popularHTML, section)}
      </div>
    </div>
  </div>`;
}

function ideaExecutionBoxHTML(a) {
  let stepsHTML = '';
  if (a.executionStepsText) {
    const lines = a.executionStepsText.split(/\n+/).map(l => l.trim()).filter(Boolean);
    stepsHTML = lines.map((line, idx) => `
      <div style="display:flex; gap:12px; align-items:flex-start; margin-bottom:14px; background:#f8fafc; padding:10px 12px; border-radius:10px; border:1px solid #e2e8f0;">
        <span style="background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; font-weight:900; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; box-shadow:0 2px 6px rgba(59,130,246,0.3);">${idx + 1}</span>
        <div style="font-size:13.5px; color:#334155; line-height:1.5; font-weight:700;">${escHtml(line)}</div>
      </div>
    `).join('');
  } else {
    stepsHTML = `
      <div style="display:flex; gap:12px; align-items:flex-start; margin-bottom:14px; background:#f8fafc; padding:10px 12px; border-radius:10px; border:1px solid #e2e8f0;">
        <span style="background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; font-weight:900; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; box-shadow:0 2px 6px rgba(59,130,246,0.3);">1</span>
        <div>
          <div style="font-size:13.5px; font-weight:800; color:#0f172a;">📌 אפיון ומחקר שוק</div>
          <div style="font-size:12px; color:#64748b; line-height:1.4; margin-top:2px;">הגדרת דרישות המערכת, אפיון הפיצ'רים ובדיקת כדאיות טכנית.</div>
        </div>
      </div>
      <div style="display:flex; gap:12px; align-items:flex-start; margin-bottom:14px; background:#f8fafc; padding:10px 12px; border-radius:10px; border:1px solid #e2e8f0;">
        <span style="background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; font-weight:900; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; box-shadow:0 2px 6px rgba(59,130,246,0.3);">2</span>
        <div>
          <div style="font-size:13.5px; font-weight:800; color:#0f172a;">🛠️ עיצוב חווית משתמש (UI/UX)</div>
          <div style="font-size:12px; color:#64748b; line-height:1.4; margin-top:2px;">יצירת Wireframes ועיצוב ממשק משתמש מודרני, פשוט ונגיש.</div>
        </div>
      </div>
      <div style="display:flex; gap:12px; align-items:flex-start; margin-bottom:14px; background:#f8fafc; padding:10px 12px; border-radius:10px; border:1px solid #e2e8f0;">
        <span style="background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; font-weight:900; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; box-shadow:0 2px 6px rgba(59,130,246,0.3);">3</span>
        <div>
          <div style="font-size:13.5px; font-weight:800; color:#0f172a;">💻 פיתוח גרסת MVP</div>
          <div style="font-size:12px; color:#64748b; line-height:1.4; margin-top:2px;">כתיבת הקוד בטכנולוגיות המתקדמות ביותר וסנכרון מלא עם מסד הנתונים.</div>
        </div>
      </div>
      <div style="display:flex; gap:12px; align-items:flex-start; margin-bottom:14px; background:#f8fafc; padding:10px 12px; border-radius:10px; border:1px solid #e2e8f0;">
        <span style="background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; font-weight:900; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; box-shadow:0 2px 6px rgba(59,130,246,0.3);">4</span>
        <div>
          <div style="font-size:13.5px; font-weight:800; color:#0f172a;">🚀 בדיקות והשקה</div>
          <div style="font-size:12px; color:#64748b; line-height:1.4; margin-top:2px;">הרצת טסטים, בדיקות עומסים ואבטחה, והשקה הדרגתית לקהילת המשתמשים.</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="idea-exec-box">
      <div style="font-size:16px; font-weight:900; color:#0f172a; border-bottom:2.5px solid #3b82f6; padding-bottom:10px; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
        <span>🛠️ איך לבצע את הרעיון</span>
      </div>
      <div style="display:flex; flex-direction:column;">
        ${stepsHTML}
      </div>
      <div style="background:#eff6ff; border-right:4px solid #3b82f6; padding:12px 14px; border-radius:10px; font-size:12.5px; color:#1e40af; line-height:1.5; margin-top:12px; font-weight:600;">
        💡 <b>טיפ זהב לביצוע:</b> מומלץ להתחיל בבניית אב-טיפוס (Prototype) ולקבל משוב מהיר מהגולשים בקהילה לפני פיתוח מלא.
      </div>
    </div>
  `;
}

function ideaTechnicalBoxHTML(a) {
  const price = a.priceRequested || '₪5,000 - ₪12,000 (הערכה)';
  const tech = a.techStack || 'JavaScript, HTML5, CSS3, Firebase';
  const devTime = a.devTime || '1-3 שבועות';
  const complexity = a.complexity || 'בינונית (Medium)';
  const audience = a.targetAudience || 'משתמשי האתר ויזמים';

  return `
    <div class="idea-tech-box">
      <div style="font-size:16px; font-weight:900; color:#0f172a; border-bottom:2.5px solid #10b981; padding-bottom:10px; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
        <span>💰 מחיר מבוקש ופרטים</span>
      </div>

      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:12px 14px;">
          <div style="font-size:11.5px; color:#166534; font-weight:800; margin-bottom:4px;">💰 מחיר מבוקש / הערכת עלות</div>
          <div style="font-size:16px; font-weight:900; color:#15803d;">${escHtml(price)}</div>
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px;">
          <div style="font-size:11.5px; color:#64748b; font-weight:800; margin-bottom:4px;">⚙️ טכנולוגיות מומלצות</div>
          <div style="font-size:13.5px; font-weight:800; color:#1e293b;">${escHtml(tech)}</div>
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px;">
          <div style="font-size:11.5px; color:#64748b; font-weight:800; margin-bottom:4px;">⏱️ זמן פיתוח משוער</div>
          <div style="font-size:13.5px; font-weight:800; color:#1e293b;">${escHtml(devTime)}</div>
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px;">
          <div style="font-size:11.5px; color:#64748b; font-weight:800; margin-bottom:4px;">📊 רמת מורכבות</div>
          <div style="font-size:13.5px; font-weight:800; color:#1e293b;">${escHtml(complexity)}</div>
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px;">
          <div style="font-size:11.5px; color:#64748b; font-weight:800; margin-bottom:4px;">🎯 קהל יעד</div>
          <div style="font-size:13.5px; font-weight:800; color:#1e293b;">${escHtml(audience)}</div>
        </div>

        <button onclick="dmStartAboutGallery('${artEsc(a.authorId || '')}', '${artEsc(a.author || '')}', '${artEsc(a.id)}')"
                style="width:100%; background:linear-gradient(135deg,#10b981,#059669); color:#fff; border:none; padding:12px; border-radius:12px; font-weight:800; font-size:14px; cursor:pointer; box-shadow:0 4px 14px rgba(16,185,129,0.3); margin-top:6px; transition:all 0.2s ease;">
          💬 צור קשר / הגש הצעת מחיר
        </button>
      </div>
    </div>
  `;
}

// צד ימין במודעת יד שניה: איך רוכשים (שלבים)
function secondhandBuyBoxHTML(a) {
  const steps = [
    { n: 1, t: '💬 יצירת קשר', d: 'שלחו הודעה למוכר עם שאלות על המוצר.' },
    { n: 2, t: '🤝 תיאום פרטים ומחיר', d: 'סכמו על המחיר הסופי, מצב המוצר וזמן.' },
    { n: 3, t: '📍 מפגש או משלוח', d: 'קבעו נקודת מפגש נוחה או תיאמו משלוח.' },
    { n: 4, t: '✅ תשלום וקבלה', d: 'בצעו תשלום בטוח וקבלו את המוצר.' }
  ];
  const stepsHTML = steps.map(s => `
      <div style="display:flex; gap:12px; align-items:flex-start; margin-bottom:14px; background:#f8fafc; padding:10px 12px; border-radius:10px; border:1px solid #e2e8f0;">
        <span style="background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; font-weight:900; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; box-shadow:0 2px 6px rgba(59,130,246,0.3);">${s.n}</span>
        <div><div style="font-size:13.5px; font-weight:800; color:#0f172a;">${s.t}</div><div style="font-size:12px; color:#64748b; line-height:1.4; margin-top:2px;">${s.d}</div></div>
      </div>`).join('');
  return `
    <div class="idea-exec-box">
      <div style="font-size:16px; font-weight:900; color:#0f172a; border-bottom:2.5px solid #3b82f6; padding-bottom:10px; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
        <span>🤝 איך רוכשים</span>
      </div>
      <div style="display:flex; flex-direction:column;">${stepsHTML}</div>
      <div style="background:#eff6ff; border-right:4px solid #3b82f6; padding:12px 14px; border-radius:10px; font-size:12.5px; color:#1e40af; line-height:1.5; margin-top:12px; font-weight:600;">
        💡 <b>טיפ לרכישה בטוחה:</b> בדקו את המוצר לפני התשלום ותאמו מפגש במקום ציבורי ומואר.
      </div>
      ${(a.offerType === 'השאלה' && Array.isArray(a.loanTerms) && a.loanTerms.length) ? `
      <div style="margin-top:16px; background:#fff; border:1.5px solid #cbd5e1; border-radius:12px; padding:14px;">
        <div style="font-size:14px; font-weight:900; color:#0f172a; margin-bottom:10px; display:flex; align-items:center; gap:6px;">📜 תנאי חוזה ההשאלה</div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${a.loanTerms.map((t, i) => `<div style="font-size:12.5px; color:#334155; line-height:1.5; display:flex; gap:6px;"><span style="color:#2563eb; font-weight:800;">${i + 1}.</span><span>${escHtml(t)}</span></div>`).join('')}
        </div>
        <div style="font-size:11px; color:#94a3b8; margin-top:10px;">* התנאים מוצגים כהסכמה בין המשאיל לשואל.</div>
      </div>` : ''}
    </div>`;
}

// צד שמאל במודעת יד שניה: מחיר ופרטי המוצר
function secondhandDetailsBoxHTML(a) {
  const offer = a.offerType || 'מכירה';
  const region = a.region || '—';
  const detail = (a.offerDetail || '').trim();
  const row = (label, val) => `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:12px 14px;">
          <div style="font-size:11.5px; color:#64748b; font-weight:800; margin-bottom:4px;">${label}</div>
          <div style="font-size:13.5px; font-weight:800; color:#1e293b;">${escHtml(val)}</div>
        </div>`;
  // תיבה ראשית לפי סוג ההצעה
  let mainBox;
  if (offer === 'השאלה') {
    mainBox = `<div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:12px 14px;"><div style="font-size:11.5px; color:#1e40af; font-weight:800; margin-bottom:4px;">🔄 להשאלה · לתקופה</div><div style="font-size:18px; font-weight:900; color:#1d4ed8;">${escHtml(detail || 'לפי סיכום')}</div></div>`;
  } else if (offer === 'החלפה') {
    mainBox = `<div style="background:#fef3c7; border:1px solid #fde68a; border-radius:12px; padding:12px 14px;"><div style="font-size:11.5px; color:#92400e; font-weight:800; margin-bottom:4px;">🔁 להחלפה תמורת</div><div style="font-size:18px; font-weight:900; color:#b45309;">${escHtml(detail || 'לפי סיכום')}</div></div>`;
  } else {
    let price = (a.price != null && String(a.price).trim()) ? String(a.price).trim() : '';
    if (price && !/[₪$]/.test(price) && /\d/.test(price)) price = '₪' + price;
    if (!price) price = 'לפי סיכום';
    mainBox = `<div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:12px 14px;"><div style="font-size:11.5px; color:#166534; font-weight:800; margin-bottom:4px;">💰 מחיר</div><div style="font-size:18px; font-weight:900; color:#15803d;">${escHtml(price)}</div></div>`;
  }
  return `
    <div class="idea-tech-box">
      <div style="font-size:16px; font-weight:900; color:#0f172a; border-bottom:2.5px solid #10b981; padding-bottom:10px; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
        <span>💰 מחיר ופרטים</span>
      </div>
      <div style="display:flex; flex-direction:column; gap:12px;">
        ${mainBox}
        ${row('🏷️ סוג ההצעה', offer)}
        ${row('📍 מיקום', region)}
        <button onclick="dmStartAboutGallery('${artEsc(a.authorId || '')}', '${artEsc(a.author || '')}', '${artEsc(a.id)}')" style="width:100%; background:linear-gradient(135deg,#10b981,#059669); color:#fff; border:none; padding:12px; border-radius:12px; font-weight:800; font-size:14px; cursor:pointer; box-shadow:0 4px 14px rgba(16,185,129,0.3); margin-top:6px;">
          💬 צור קשר עם המוכר
        </button>
      </div>
    </div>`;
}

// פתיחת תצוגה פנימית (גלריה/סיפור/קומיקס) — תמיד מההתחלה, לא מהמקום שבו היה הגלילה בפיד.
// חוזרים על הגלילה גם בפריים הבא ואחרי רגע, כי טעינת תמונות/תגובות משנה את גובה העמוד.
function detailScrollTop() {
  const go = () => {
    try { window.scrollTo(0, 0); } catch (e) {}
    try { if (document.scrollingElement) document.scrollingElement.scrollTop = 0; } catch (e) {}
    try { if (mainContent) mainContent.scrollTop = 0; } catch (e) {}
  };
  go();
  try { requestAnimationFrame(go); } catch (e) {}
  setTimeout(go, 150);
}
window.detailScrollTop = detailScrollTop;

function photoOpenDetail(id) {
  if (typeof trackEvent === 'function') trackEvent('gallery_open');
  window.__detailOpen = true; // מגן מפני רענון-רקע שיבעט מהעמוד הפנימי
  window.__detailOpenPageId = activePageId; // שומר איזה עמוד פעיל כשנפתחה התצוגה הפנימית
  photoIncrementViews(id);
  // תומך גם בעמוד קהילה ובעמוד משתמש (שמכילים data-photos-json משלהם)
  const container = mainContent.querySelector('.photos-page, .community-page, .user-page, .ideas-page');
  if (!container) return;
  let albums = [];
  try { albums = JSON.parse(decodeURIComponent(container.dataset.photosJson)); } catch(e){ return; }
  const a = albums.find(x => x.id === id);
  if (!a) return;
  if (typeof addToWatchHistory === 'function') addToWatchHistory(a);

  const validImages = (a.images || []).filter(img => !!img);
  const mainImg = validImages[0] || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80';

  // יצירת ריבועי דפדוף (Thumbnails)
  const thumbnailsHTML = validImages.map((imgUrl, idx) => `
    <div class="photo-thumb-square" onclick="photoSelectImage('${artEsc(imgUrl)}', this)" style="width:60px; height:60px; border-radius:8px; overflow:hidden; cursor:pointer; border:2.5px solid ${idx === 0 ? '#e11d48' : '#ddd'}; transition:all 0.2s; flex-shrink:0;">
      <img src="${escHtml(imgUrl)}" style="width:100%; height:100%; object-fit:cover;">
    </div>
  `).join('');

  const recommended = albums.filter(x => x.id !== id).slice(0, 3);
  const recHTML = recommended.map(r => {
    const rImg = r.images && r.images[0] ? r.images[0] : '';
    return `
      <div class="art-rec-card" onclick="photoOpenDetail('${artEsc(r.id)}')">
        <div class="art-rec-img">
          ${rImg ? `<img src="${escHtml(rImg)}" alt="">` : '<div class="art-card-img-placeholder"></div>'}
          <span class="art-rec-badge art-category-badge" style="background:${escHtml(r.categoryColor || '#10b981')}">${escHtml(r.category)}</span>
        </div>
        <div class="art-rec-text">
          <h4>${escHtml(r.title)}</h4>
          <div class="art-rec-meta">${escHtml(r.author)} · ${escHtml(r.timestamp)}</div>
        </div>
      </div>
    `;
  }).join('');

  const paragraphs = (a.summary || '').split(/\n+/).map(p => p.trim()).filter(Boolean);
  const showRowImages = false;
  let contentHTML = '';
  
  if (showRowImages) {
    contentHTML = paragraphs.map((pText, idx) => {
      const imgUrl = validImages[(idx + 1) % validImages.length];
      const isEven = idx % 2 === 0;
      return `
        <div class="photo-story-row" style="display:flex; flex-direction:${isEven ? 'row' : 'row-reverse'}; gap:24px; align-items:center; margin-bottom:32px; flex-wrap:wrap;">
          <div style="flex:1; min-width:280px; height:240px; border-radius:12px; overflow:hidden; border:1px solid #f0f0f0; background:#fafafa; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
            <img src="${escHtml(imgUrl)}" style="width:100%; height:100%; object-fit:contain; display:block; cursor:zoom-in;" onclick="artGalleryById('photos','${artEsc(id)}', this.getAttribute('src'))">
          </div>
          <div style="flex:1.5; min-width:280px; font-size:16px; line-height:1.8; color:#374151; text-align:justify;">
            ${pText}
          </div>
        </div>
      `;
    }).join('');
  } else {
    contentHTML = paragraphs.map(pText => `
      <p style="font-size:16px; line-height:1.8; color:#374151; margin-bottom:16px; text-align:justify;">${pText}</p>
    `).join('');
  }

  const isAgeVerifiedDetail = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('age_verified') === 'true';
  const blurStyle = (a.isAdult && !isAgeVerifiedDetail) ? 'filter: blur(20px); transition: filter 0.3s ease;' : '';

  const isSecondhand = (container && container.classList.contains('secondhand-page'));
  const isIdea = !isSecondhand && ((container && container.classList.contains('ideas-page')) || (a.id && (a.id.includes('idea') || a.id.includes('sample'))) || (a.category && (a.category.includes('רעיונות') || a.category.includes('עסקים') || a.category.includes('מחקר') || a.category.includes('חוקים'))));

  // פאנלי צד — לרעיונות ולמוצרי יד שניה (אותו קונספט, תוכן מותאם)
  const _sp = isSecondhand ? (a.isWanted ? {
    back: '← חזרה למוצרים',
    right: (typeof secondhandWantedHowBoxHTML === 'function' ? secondhandWantedHowBoxHTML() : ''),
    left: (typeof secondhandOffersBoxHTML === 'function' ? secondhandOffersBoxHTML(a) : ''),
    creator: 'מחפש/ת',
    recTitle: 'עוד ביד שניה'
  } : {
    back: '← חזרה למוצרים',
    right: (typeof secondhandBuyBoxHTML === 'function' ? secondhandBuyBoxHTML(a) : ''),
    left: (typeof secondhandDetailsBoxHTML === 'function' ? secondhandDetailsBoxHTML(a) : ''),
    creator: 'מוכר',
    recTitle: 'מוצרים נוספים שיעניינו אותך'
  }) : (a.isProblem ? {
    back: '← חזרה לרעיונות',
    right: (typeof ideaTenderHowBoxHTML === 'function' ? ideaTenderHowBoxHTML() : ''),
    left: (typeof ideaBidsBoxHTML === 'function' ? ideaBidsBoxHTML(a) : ''),
    creator: 'פרסם/ה',
    recTitle: 'עוד בעיות ורעיונות'
  } : {
    back: '← חזרה לרעיונות',
    right: ideaExecutionBoxHTML(a),
    left: ideaTechnicalBoxHTML(a),
    creator: 'יוצר הרעיון',
    recTitle: 'רעיונות נוספים שיעניינו אותך'
  });

  // קרוסלת "הצצה" למובייל: מציגה תמונה אחת כמעט מלאה + הצצה לתמונה הבאה,
  // וניתן לדפדף בהחלקת אצבע (גלילה אופקית עם scroll-snap). מוצגת בראש עמוד
  // הגלריה כך שרואים את התמונה מיד בלי לגלול.
  const carouselImgs = validImages.length ? validImages : [mainImg];
  const detailCarouselHTML = `
    <div class="photo-detail-carousel-wrap">
      <div class="photo-detail-carousel">
        ${carouselImgs.map(u => `
          <div class="pd-slide" style="--bg-img:url('${u}');">
            <img src="${escHtml(u)}" style="${blurStyle}" onclick="artGalleryById('photos','${artEsc(id)}', this.getAttribute('src'))">
          </div>
        `).join('')}
      </div>
      ${carouselImgs.length > 1 ? `
        <button type="button" class="pd-arrow prev" onclick="photoCarouselScroll(this, -1)" aria-label="תמונה קודמת">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button type="button" class="pd-arrow next" onclick="photoCarouselScroll(this, 1)" aria-label="תמונה הבאה">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      ` : ''}
    </div>
  `;

  const json = encodeURIComponent(JSON.stringify(albums));

  if (isIdea || isSecondhand) {
    mainContent.innerHTML = `
      <div class="art-detail articles-page photos-page ideas-detail-page" data-photo-id="${id}" data-photos-json="${json}">
        <div class="art-detail-inner" style="max-width: 1350px; margin: 0 auto;">
          <button class="art-back-btn" onclick="photoGoBack()">${_sp.back}</button>

          <div class="idea-detail-grid-layout" style="display: flex; gap: 24px; align-items: flex-start; margin-top: 16px; flex-wrap: wrap;">

            <!-- בצד ימין: איך לבצע / איך רוכשים -->
            <div class="idea-detail-sidebar-right" style="flex: 1.1; min-width: 280px; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 4px 14px rgba(0,0,0,0.03);">
              ${_sp.right}
            </div>

            <!-- במרכז: תוכן הרעיון המלא -->
            <div class="idea-detail-main-center" style="flex: 2; min-width: 320px; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 22px; box-shadow: 0 4px 14px rgba(0,0,0,0.03);">
              <h1 class="art-detail-title" style="margin-top:0;">${escHtml(a.title)}</h1>
              <div class="art-meta" style="margin-bottom:14px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span class="art-category-badge" style="background:${escHtml(a.categoryColor || '#3b82f6')}">${escHtml(a.category)}</span>
                <span>${escHtml(_sp.creator)}: <b>${escHtml(a.author)}</b></span>
                ${a.authorId ? `<button onclick="toggleFollow('${artEsc(a.authorId)}','${artEsc(a.author || '')}', this)" class="follow-btn${isFollowing(a.authorId) ? ' following' : ''}">${isFollowing(a.authorId) ? '✓ עוקב' : '➕ עקוב'}</button>` : ''}
                <span>·</span>
                <span>${escHtml(a.timestamp)}</span>
                <button onclick="photoToggleLike('${artEsc(a.id)}')" class="photo-like-btn" style="background: ${photoIsLikedLocal(a.id) ? '#ffe4e6' : '#ffffff'}; border: 1.5px solid ${photoIsLikedLocal(a.id) ? '#e11d48' : '#e2e8f0'}; cursor: pointer; color: ${photoIsLikedLocal(a.id) ? '#e11d48' : '#1e293b'}; display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 8px; transition: all 0.2s; font-weight: 700; font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="${photoIsLikedLocal(a.id) ? '#e11d48' : 'none'}" stroke="${photoIsLikedLocal(a.id) ? '#e11d48' : '#e11d48'}" stroke-width="2.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  <span>${a.likes || 0} לייקים</span>
                </button>
                <button onclick="photoToggleSave('${artEsc(a.id)}')" class="photo-save-btn" style="background: rgba(0,0,0,0.05); border: 1px solid #ddd; cursor: pointer; color: #000; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 13px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="${photoIsSavedLocal(a.id) ? '#000' : 'none'}" stroke="#000" stroke-width="2.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                  <span>שמור</span>
                </button>
              </div>

              <div class="art-detail-content" style="margin-bottom:20px;">${contentHTML}</div>

              <div class="photo-main-img-container" style="margin-bottom:20px; ${blurStyle}">
                <img id="photo-gallery-main-img" src="${escHtml(mainImg)}" style="width:100%; height:100%; object-fit:contain; display:block; border-radius:12px; cursor:zoom-in; ${blurStyle}" onclick="artGalleryById('photos','${artEsc(id)}', this.getAttribute('src'))">
              </div>

              ${validImages.length > 1 ? `
                <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:24px; direction:ltr; flex-wrap:wrap;">
                  <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center;">${thumbnailsHTML}</div>
                </div>
              ` : ''}

              ${photoCommentsSectionHTML(id)}

              <div class="art-rec-section" style="margin-top:28px;">
                <h3 style="margin:0 0 16px;font-size:18px;font-weight:800">${escHtml(_sp.recTitle)}</h3>
                <div class="art-rec-grid">${recHTML}</div>
              </div>
            </div>

            <!-- בצד שמאל: מחיר ופרטים -->
            <div class="idea-detail-sidebar-left" style="flex: 1.1; min-width: 280px; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 20px; box-shadow: 0 4px 14px rgba(0,0,0,0.03);">
              ${_sp.left}
            </div>

          </div>
        </div>
      </div>
    `;
  } else {
    mainContent.innerHTML = `
      <div class="art-detail articles-page photos-page" data-photo-id="${id}" data-photos-json="${json}">
        <div class="art-detail-inner">
          <button class="art-back-btn" onclick="photoGoBack()">← חזרה לגלריות</button>

          <!-- בעמוד גלריה המלל בא לפני התמונה -->
          <div class="art-detail-body">
            <h1 class="art-detail-title">${escHtml(a.title)}</h1>
            <div class="art-meta" style="margin-bottom:12px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <span class="art-category-badge" style="background:${escHtml(a.categoryColor || '#10b981')}">${escHtml(a.category)}</span>
              <span>צילום: ${escHtml(a.author)}</span>
              ${a.authorId ? `<button onclick="toggleFollow('${artEsc(a.authorId)}','${artEsc(a.author || '')}', this)" class="follow-btn${isFollowing(a.authorId) ? ' following' : ''}">${isFollowing(a.authorId) ? '✓ עוקב' : '➕ עקוב'}</button>` : ''}
              <span>·</span>
              <span>${escHtml(a.timestamp)}</span>
              ${a.ageRange ? `<span>·</span><span>גיל ${escHtml(String(a.ageRange))}</span>` : ''}
              ${isUserVerified(a.authorId, a.author, a.verified || a.verifiedUser) ? `<span>·</span><span style="color:#2563eb; font-weight:700; display:inline-flex; align-items:center; gap:4px;">חשבון זה מאומת <span style="background:#dbeafe; border-radius:50%; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; font-size:10px;">✓</span></span>` : ''}
              ${a.expiresAt ? renderExpirationBadge(a.expiresAt) : ''}
              <button onclick="photoToggleLike('${artEsc(a.id)}')" class="photo-like-btn" style="background: ${photoIsLikedLocal(a.id) ? '#ffe4e6' : '#ffffff'}; border: 1.5px solid ${photoIsLikedLocal(a.id) ? '#e11d48' : '#e2e8f0'}; cursor: pointer; color: ${photoIsLikedLocal(a.id) ? '#e11d48' : '#1e293b'}; display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 8px; transition: all 0.2s; font-weight: 700; font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="${photoIsLikedLocal(a.id) ? '#e11d48' : 'none'}" stroke="${photoIsLikedLocal(a.id) ? '#e11d48' : '#e11d48'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <span>${a.likes || 0} לייקים</span>
              </button>
              <button onclick="photoToggleSave('${artEsc(a.id)}')" class="photo-save-btn" style="background: rgba(0,0,0,0.05); border: 1px solid #ddd; cursor: pointer; color: #000; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; transition: background 0.2s; font-weight: bold; font-size: 13px;" title="${photoIsSavedLocal(a.id) ? 'הסר משמורים' : 'שמור גלריה'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="${photoIsSavedLocal(a.id) ? '#000' : 'none'}" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>שמור</span>
              </button>
              <button onclick="dmStartAboutGallery('${artEsc(a.authorId || '')}', '${artEsc(a.author || '')}', '${artEsc(a.id)}')" class="photo-dm-btn" style="background:#e11d48; border:none; cursor:pointer; color:#fff; display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:13px;" title="שלח הודעה פרטית ליוצר">
                💬 <span>שלח הודעה</span>
              </button>
              ${a.telegramUrl ? `
                <a href="${escHtml(safeUrl(a.telegramUrl))}" target="_blank" title="${escHtml(a.telegramUrl.replace('https://t.me/', '@'))}" class="art-telegram-btn" style="display: inline-flex; align-items: center; background: #2f2f2f; color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 13px; text-decoration: none; font-weight: bold; gap: 6px; border: 1px solid rgba(255,255,255,0.1);">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                  </svg>
                  <span>טלגרם</span>
                </a>
              ` : ''}
              ${a.emailUrl ? `
                <button type="button" onclick="revealAndCopyEmail('${artEsc(a.emailUrl)}', this, event);" title="לחץ לחשיפת והעתקת אימייל" class="art-telegram-btn" style="display: inline-flex; align-items: center; background: #2f2f2f; color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 13px; text-decoration: none; font-weight: bold; gap: 6px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span>אימייל</span>
                </button>
              ` : ''}
              ${(isAdmin() || isEditMode) ? `
                <button type="button" onclick="openPhotoEditModal('${artEsc(a.id)}', event);" title="ערוך גלריה זו" style="display: inline-flex; align-items: center; background: #e11d48; color: #fff; padding: 6px 14px; border-radius: 6px; font-size: 13px; border: none; font-weight: bold; gap: 6px; cursor: pointer; transition: background 0.2s;">
                  ✏️ ערוך גלריה
                </button>
              ` : ''}
            </div>
            <div class="art-detail-content">${contentHTML}</div>
          </div>

          <!-- תמונה ראשית גדולה עם מזהה ספציפי (פרופורציונלית ולא ענקית) -->
          <div class="photo-main-img-container" style="${blurStyle}">
            <img id="photo-gallery-main-img" src="${escHtml(mainImg)}" style="width:100%; height:100%; object-fit:contain; display:block; border-radius:12px; cursor:zoom-in; ${blurStyle}" onclick="artGalleryById('photos','${artEsc(id)}', this.getAttribute('src'))">
          </div>

          <!-- ריבועי דפדוף (Thumbnails) עם חצי ניווט -->
          <div class="photo-detail-thumbs-row" style="display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:24px; direction:ltr; flex-wrap:wrap; padding:5px;">
            ${validImages.length > 1 ? `
              <button type="button" onclick="event.stopPropagation(); photoStepDetailImage(-1, this)" title="תמונה קודמת" style="width:32px; height:32px; border-radius:50%; background:#3b82f6; color:#fff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 2px 8px rgba(59,130,246,0.3); transition:background 0.15s ease;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
            ` : ''}
            <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center;">
              ${thumbnailsHTML}
            </div>
            ${validImages.length > 1 ? `
              <button type="button" onclick="event.stopPropagation(); photoStepDetailImage(1, this)" title="תמונה הבאה" style="width:32px; height:32px; border-radius:50%; background:#3b82f6; color:#fff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 2px 8px rgba(59,130,246,0.3); transition:background 0.15s ease;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            ` : ''}
          </div>

          ${photoCommentsSectionHTML(id)}

          <div class="art-rec-section">
            <h3 style="margin:0 0 16px;font-size:18px;font-weight:800">גלריות נוספות שיעניינו אותך</h3>
            <div class="art-rec-grid">${recHTML}</div>
          </div>
        </div>
      </div>
    `;
  }
  if (typeof subscribePhotoComments === 'function') subscribePhotoComments(id);
  detailScrollTop();
}

function photoSelectImage(imgUrl, el) {
  const mainImg = document.getElementById('photo-gallery-main-img') || document.getElementById('story-gallery-main-img') || (el.closest('.art-detail') ? el.closest('.art-detail').querySelector('.photo-main-img-container img') : null);
  if (mainImg) {
    mainImg.src = imgUrl;
  }
  const squares = el.parentNode.querySelectorAll('.photo-thumb-square');
  squares.forEach(sq => {
    sq.style.borderColor = '#ddd';
  });
  el.style.borderColor = '#e11d48';
}

function photoSelectRowImage(albumId, imgUrl, thumbEl) {
  const container = thumbEl.closest('.art-row-img-container');
  if (container) {
    const mainImg = container.querySelector('.art-row-img-wrap img');
    if (mainImg) {
      mainImg.src = imgUrl;
      const zoomBtn = container.querySelector('.art-zoom-btn');
      if (zoomBtn) {
        zoomBtn.setAttribute('onclick', `event.stopPropagation();artZoomImage('${jsStrEsc(imgUrl)}')`);
      }
    }
    const thumbs = Array.from(container.querySelectorAll('.photo-mini-thumb'));
    thumbs.forEach(t => {
      t.style.borderColor = '#ddd';
    });
    thumbEl.style.borderColor = '#e11d48';
    // עדכון מונה התמונות שעל גבי התמונה (למשל "2 / 5")
    const badge = container.querySelector('.photo-count-badge');
    if (badge && thumbs.length) {
      const idx = thumbs.indexOf(thumbEl);
      if (idx >= 0) badge.textContent = `${idx + 1} / ${thumbs.length}`;
    }
  }
}
window.photoSelectRowImage = photoSelectRowImage;

// מדלג לתמונה הבאה/הקודמת בתוך מכל תמונת הכרטיס (משמש חיצים על התמונה והחלקת אצבע)
function photoStepImageInContainer(container, dir) {
  if (!container) return;
  const thumbs = Array.from(container.querySelectorAll('.photo-mini-thumb'));
  if (thumbs.length < 2) return;
  let currentIndex = thumbs.findIndex(t => t.style.borderColor === 'rgb(225, 29, 72)' || t.style.borderColor === '#e11d48');
  if (currentIndex === -1) currentIndex = 0;
  const newIndex = (currentIndex + dir + thumbs.length) % thumbs.length;
  thumbs[newIndex].click();
}
window.photoStepImageInContainer = photoStepImageInContainer;

function photoStepRowImage(albumId, dir, btnEl) {
  photoStepImageInContainer(btnEl.closest('.art-row-img-container'), dir);
}
window.photoStepRowImage = photoStepRowImage;

// החלקת אצבע (swipe) על תמונת כרטיס גלריה — מדפדף בין תמונות הגלריה כמו קרוסלה.
// מאזין יחיד בהאצלה (delegation) שמכסה את כל הכרטיסים, גם אלה שנוצרים דינמית.
function photoInitCardSwipe() {
  if (window.__photoSwipeInit) return;
  window.__photoSwipeInit = true;
  let startX = 0, startY = 0, active = false, moved = false, wrap = null;
  // רק בעמוד התמונות (data-section="photos") — לא ברעיונות/קהילות/משתמש שחולקים photos-page
  const SWIPE_PAGES = '.photos-page[data-section="photos"]';

  document.addEventListener('touchstart', function (e) {
    active = false; moved = false; wrap = null;
    if (!e.target.closest) return;
    const w = e.target.closest('.art-row-img-wrap');
    if (!w || !w.closest(SWIPE_PAGES)) return;
    // בכרטיסים עם קרוסלה מקורית (pc-carousel) הגלילה מטופלת ע"י הדפדפן — לא מפעילים swipe ידני
    if (w.querySelector('.pc-carousel')) return;
    const container = w.closest('.art-row-img-container');
    if (!container || container.querySelectorAll('.photo-mini-thumb').length < 2) return;
    wrap = w; active = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!active) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (!moved && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) moved = true;
    if (moved) {
      const img = wrap.querySelector('img');
      if (img) img.style.transform = 'translateX(' + Math.max(-45, Math.min(45, dx * 0.35)) + 'px)';
    }
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    if (!active) return;
    active = false;
    const img = wrap && wrap.querySelector('img');
    if (img) img.style.transform = '';
    if (!moved) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) < 35) return;
    // החלקה שמאלה = התמונה הבאה, ימינה = הקודמת
    photoStepImageInContainer(wrap.closest('.art-row-img-container'), dx < 0 ? 1 : -1);
    // מונע שהלחיצה שאחרי ההחלקה תפתח את עמוד הגלריה
    const swallow = function (ev) { ev.stopPropagation(); ev.preventDefault(); document.removeEventListener('click', swallow, true); };
    document.addEventListener('click', swallow, true);
    setTimeout(function () { document.removeEventListener('click', swallow, true); }, 400);
  }, { passive: true });
}
// הוחלף: ההחלקה במובייל מדפדפת בין ההעלאות (קרוסלת .art-rows), לא בין תמונות הגלריה.
// photoInitCardSwipe();

// דפדוף עם החצים בקרוסלת ההצצה של עמוד הגלריה (מגלגל תמונה אחת קדימה/אחורה)
function photoCarouselScroll(btn, dir) {
  const wrap = btn.closest('.photo-detail-carousel-wrap');
  const sc = wrap && wrap.querySelector('.photo-detail-carousel');
  if (!sc) return;
  const slide = sc.querySelector('.pd-slide');
  const step = slide ? slide.getBoundingClientRect().width + 10 : sc.clientWidth * 0.86;
  const rtl = getComputedStyle(sc).direction === 'rtl';
  sc.scrollBy({ left: (rtl ? -1 : 1) * dir * step, behavior: 'smooth' });
}
window.photoCarouselScroll = photoCarouselScroll;

// דפדוף בין ההעלאות בקרוסלה האופקית של עמוד התמונות (מובייל) — החצים על הכרטיס
function photoUploadScroll(btn, dir) {
  const card = btn.closest('.art-row');
  const rows = card && card.closest('.art-rows');
  if (!rows) return;
  const step = card ? (card.getBoundingClientRect().width + 12) : rows.clientWidth;
  // הקרוסלה ב-LTR: החץ "הבא" (›) מגלגל ימינה אל ההעלאה הבאה
  rows.scrollBy({ left: dir * step, behavior: 'smooth' });
}
window.photoUploadScroll = photoUploadScroll;

// ===== קרוסלת הצצה בכרטיס הגלריה (סגנון אינסטגרם: תמונה + הצצה לבאה, החלקה) =====
// הקרוסלה ב-LTR כך שתמונה 1 בשמאל והבאה מציצה מימין (כמו בהפניה של המשתמש).
function photoCardCarouselScroll(btn, dir) {
  const host = btn.closest('.art-row-img-wrap') || btn.closest('.art-row-img-container');
  const sc = host && host.querySelector('.pc-carousel');
  if (!sc) return;
  const slide = sc.querySelector('.pc-slide');
  const step = slide ? slide.getBoundingClientRect().width : sc.clientWidth * 0.9;
  sc.scrollBy({ left: dir * step, behavior: 'smooth' });
}
window.photoCardCarouselScroll = photoCardCarouselScroll;

function photoCardGoToSlide(thumbEl, idx) {
  const container = thumbEl.closest('.art-row-img-container');
  const sc = container && container.querySelector('.pc-carousel');
  if (!sc) return;
  const slides = sc.querySelectorAll('.pc-slide');
  if (slides[idx]) sc.scrollTo({ left: slides[idx].offsetLeft, behavior: 'smooth' });
}
window.photoCardGoToSlide = photoCardGoToSlide;

// עדכון מונה התמונות והדגשת הריבוע הפעיל בזמן החלקה/גלילה של הקרוסלה
function photoCardCarouselSync(sc) {
  const slide = sc.querySelector('.pc-slide');
  if (!slide) return;
  const w = slide.getBoundingClientRect().width || 1;
  const total = sc.querySelectorAll('.pc-slide').length;
  const idx = Math.max(0, Math.min(total - 1, Math.round(sc.scrollLeft / w)));
  const container = sc.closest('.art-row-img-container');
  if (!container) return;
  const badge = container.querySelector('.photo-count-badge');
  if (badge) badge.textContent = (idx + 1) + ' / ' + total;
  container.querySelectorAll('.photo-mini-thumb').forEach((t, i) => {
    t.style.borderColor = (i === idx) ? '#e11d48' : '#ddd';
  });
}
window.photoCardCarouselSync = photoCardCarouselSync;

// זום/מסך-מלא לתמונה הנוכחית בקרוסלת הכרטיס
function photoCardZoomCurrent(btn, albumId) {
  const host = btn.closest('.art-row-img-wrap');
  const sc = host && host.querySelector('.pc-carousel');
  if (!sc) return;
  const slide = sc.querySelector('.pc-slide');
  const w = slide ? (slide.getBoundingClientRect().width || 1) : 1;
  const idx = Math.max(0, Math.round(sc.scrollLeft / w));
  const imgs = sc.querySelectorAll('.pc-slide img');
  const img = imgs[idx] || imgs[0];
  if (img && typeof artGalleryById === 'function') artGalleryById('photos', albumId, img.getAttribute('src'));
}
window.photoCardZoomCurrent = photoCardZoomCurrent;

function photoStepDetailImage(dir, btnEl) {
  const container = btnEl.closest('.art-detail') || document;
  const thumbs = Array.from(container.querySelectorAll('.photo-thumb-square'));
  if (!thumbs.length) return;
  let currentIndex = thumbs.findIndex(t => t.style.borderColor === 'rgb(225, 29, 72)' || t.style.borderColor === '#e11d48');
  if (currentIndex === -1) currentIndex = 0;
  let newIndex = (currentIndex + dir + thumbs.length) % thumbs.length;
  thumbs[newIndex].click();
}
window.photoStepDetailImage = photoStepDetailImage;

function photoToggleProfileEdit() {
  const view = document.getElementById('profile-view-state');
  const edit = document.getElementById('profile-edit-state');
  if (view && edit) {
    const isEditing = edit.style.display === 'flex';
    edit.style.display = isEditing ? 'none' : 'flex';
    view.style.display = isEditing ? 'block' : 'none';
  }
}
window.photoToggleProfileEdit = photoToggleProfileEdit;

async function photoSaveProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const nickname = document.getElementById('profile-edit-nickname').value.trim();
  const age = document.getElementById('profile-edit-age').value.trim();
  const location = document.getElementById('profile-edit-location').value.trim();

  let telegram = document.getElementById('profile-edit-telegram').value.trim();
  if (telegram.startsWith('@')) telegram = telegram.substring(1);
  const email = document.getElementById('profile-edit-email').value.trim();

  if (!nickname) {
    alert("חובה להזין כינוי!");
    return;
  }

  const profile = { 
    nickname, 
    age: age || '--', 
    location: location || '--',
    telegram: telegram || '',
    email: email || ''
  };
  let _prev = {};
  try { _prev = JSON.parse(localStorage.getItem(`user_profile_${user.uid}`) || '{}'); } catch (e) {}
  localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify({ ..._prev, ...profile }));

  try {
    const profileRef = ref(db, `website/users/${user.uid}/profile`);
    await update(profileRef, profile); // update — לא מוחקים את "פרטים עליי"

    alert("הפרופיל עודכן בהצלחה! ✨");
    renderPage();
  } catch (e) {
    console.error("שגיאה בעדכון הפרופיל:", e);
    alert("שגיאה בעדכון הפרופיל.");
  }
}
window.photoSaveProfile = photoSaveProfile;

async function openUserProfile(authorId, authorFallbackName) {
  const modal = document.getElementById('user-profile-modal');
  if (!modal) return;

  document.getElementById('profile-modal-nickname').textContent = authorFallbackName;
  document.getElementById('profile-modal-age').textContent = 'גיל: טוען...';
  document.getElementById('profile-modal-location').textContent = 'אזור: טוען...';
  
  const statusEl = document.getElementById('profile-modal-status');
  if (statusEl) statusEl.style.display = 'none';

  const contactWrap = document.getElementById('profile-modal-contact-info');
  if (contactWrap) contactWrap.innerHTML = '';
  
  const postsContainer = document.getElementById('profile-modal-posts');
  postsContainer.innerHTML = '<div style="font-size:13px; color:#666; text-align:center; padding:20px;">טוען גלריות...</div>';
  
  modal.style.display = 'flex';

  try {
    if (authorId) {
      const statusRef = ref(db, `website/users/${authorId}/last_seen`);
      const statusSnap = await get(statusRef);
      if (statusSnap.exists() && statusEl) {
        const lastSeen = statusSnap.val();
        const isOnline = Date.now() - lastSeen < 120000;
        statusEl.style.display = 'inline-flex';
        if (isOnline) {
          statusEl.textContent = '🟢 מחובר כעת';
          statusEl.style.background = 'rgba(16, 185, 129, 0.1)';
          statusEl.style.color = '#10b981';
        } else {
          const dateStr = new Date(lastSeen).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          statusEl.textContent = `נראה לאחרונה: ${dateStr}`;
          statusEl.style.background = 'rgba(107, 114, 128, 0.1)';
          statusEl.style.color = '#6b7280';
        }
      }
    }

    const profileRef = ref(db, `website/users/${authorId}/profile`);
    const snapshot = await get(profileRef);
    if (snapshot.exists()) {
      const profile = snapshot.val();
      document.getElementById('profile-modal-nickname').textContent = profile.nickname || authorFallbackName;
      document.getElementById('profile-modal-age').textContent = `גיל: ${profile.age || '--'}`;
      document.getElementById('profile-modal-location').textContent = `אזור: ${profile.location || '--'}`;
      
      if (contactWrap) {
        let contactHTML = '';
        if (profile.telegram) {
          const cleanTg = profile.telegram.startsWith('@') ? profile.telegram.substring(1) : profile.telegram;
          contactHTML += `
            <a href="https://t.me/${encodeURIComponent(cleanTg)}" target="_blank" rel="noopener" title="@${escHtml(cleanTg)}" style="display:inline-flex; align-items:center; background:#2f2f2f; color:white; padding:4px 8px; border-radius:6px; font-size:11px; text-decoration:none; font-weight:bold; gap:4px; border:1px solid rgba(255,255,255,0.1);">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
              <span>טלגרם</span>
            </a>
          `;
        }
        if (profile.email) {
          contactHTML += `
            <button type="button" onclick="revealAndCopyEmail('${artEsc(profile.email)}', this, event);" title="לחץ לחשיפת והעתקת אימייל (${escHtml(profile.email)})" style="display:inline-flex; align-items:center; background:#2f2f2f; color:white; padding:4px 8px; border-radius:6px; font-size:11px; text-decoration:none; font-weight:bold; gap:4px; border:1px solid rgba(255,255,255,0.1); cursor:pointer;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span>אימייל</span>
            </button>
          `;
        }
        contactWrap.innerHTML = contactHTML;
      }
    } else {
      document.getElementById('profile-modal-age').textContent = 'גיל: --';
      document.getElementById('profile-modal-location').textContent = 'אזור: --';
    }
  } catch(e) {
    console.error("שגיאה בטעינת פרופיל משתמש:", e);
    document.getElementById('profile-modal-age').textContent = 'גיל: --';
    document.getElementById('profile-modal-location').textContent = 'אזור: --';
  }

  const albums = photoGetAlbums();
  const authorAlbums = albums.filter(a => {
    const matchesId = authorId && a.authorId === authorId;
    const matchesName = a.author && a.author.toLowerCase() === authorFallbackName.toLowerCase();
    return ((a.authorId && authorId) ? matchesId : matchesName) && a.approved !== false;
  });

  if (authorAlbums.length > 0) {
    postsContainer.innerHTML = authorAlbums.map(p => {
      const img = p.images && p.images[0] ? p.images[0] : '';
      return `
        <div class="art-popular-item" onclick="document.getElementById('user-profile-modal').style.display='none'; photoOpenDetail('${artEsc(p.id)}')" style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px; background:#f9f9f9; border-radius:12px; border:1px solid #eee; cursor:pointer; transition:background 0.2s;">
          <div style="display:flex; align-items:center; gap:10px; overflow:hidden;">
            ${img ? `<img src="${escHtml(img)}" style="width:40px; height:40px; border-radius:6px; object-fit:cover;">` : '<div style="width:40px; height:40px; border-radius:6px; background:#eee;"></div>'}
            <div style="font-size:13px; font-weight:bold; color:#222; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escHtml(p.title)}</div>
          </div>
          <span style="font-size:11px; color:#e11d48; font-weight:bold; white-space:nowrap;">צפייה ➔</span>
        </div>
      `;
    }).join('');
  } else {
    postsContainer.innerHTML = '<div style="font-size:13px; color:#777; text-align:center; padding:20px 0;">אין גלריות להצגה עבור יוצר זה</div>';
  }
}
window.openUserProfile = openUserProfile;

// ============================================================
// מערכת דירוג משתמשים (עד 5 כוכבים ⭐)
// ============================================================
function getUserRatingData(targetUid) {
  if (!targetUid) return { avg: 0, count: 0, myRating: 0 };
  try {
    const raw = localStorage.getItem(`user_ratings_${targetUid}`);
    if (raw) {
      const data = JSON.parse(raw);
      const ratings = data.ratings || {};
      const list = Object.values(ratings);
      const count = list.length;
      const sum = list.reduce((a, b) => a + Number(b), 0);
      const avg = count > 0 ? (sum / count).toFixed(1) : 0;
      const myUid = auth.currentUser ? auth.currentUser.uid : 'guest';
      const myRating = Number(ratings[myUid]) || 0;
      return { avg, count, myRating };
    }
  } catch(e){}
  return { avg: 0, count: 0, myRating: 0 };
}

function rateUserStars(targetUid, stars) {
  if (!targetUid) return;
  const myUid = auth.currentUser ? auth.currentUser.uid : 'guest';
  try {
    const raw = localStorage.getItem(`user_ratings_${targetUid}`);
    const data = raw ? JSON.parse(raw) : { ratings: {} };
    data.ratings[myUid] = stars;
    localStorage.setItem(`user_ratings_${targetUid}`, JSON.stringify(data));
    set(ref(db, `website/user_ratings/${targetUid}/${myUid}`), stars);
  } catch(e){}

  if (typeof showCopyToast === 'function') showCopyToast(`⭐ ענית בדירוג: ${stars} כוכבים! תודה.`);
  const nameEl = document.getElementById('user-page-name');
  const name = nameEl ? nameEl.textContent : 'משתמש';
  if (typeof openUserPage === 'function') openUserPage(targetUid, name);
}
window.rateUserStars = rateUserStars;

function buildUserRatingWidgetHTML(targetUid) {
  const { avg, count, myRating } = getUserRatingData(targetUid);
  const starsHTML = [1, 2, 3, 4, 5].map(star => {
    const isFilled = star <= (myRating || Math.round(avg));
    return `
      <span class="urb-star" onclick="event.stopPropagation(); rateUserStars('${artEsc(targetUid)}', ${star})"
            style="font-size: 24px; cursor: pointer; color: ${isFilled ? '#f59e0b' : '#cbd5e1'}; transition: transform 0.15s; display: inline-block;"
            title="דרג ${star} כוכבים">★</span>
    `;
  }).join('');

  return `
    <div class="user-rating-box" style="margin-top: 10px; background: #fff8f0; border: 1px solid #fde68a; border-radius: 12px; padding: 10px 14px; display: inline-flex; align-items: center; gap: 14px; direction: rtl; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <span class="urb-avg" style="font-size: 18px; font-weight: 900; color: #d97706;">⭐ ${avg > 0 ? avg : 'חדש'}</span>
        <span class="urb-count" style="font-size: 12px; color: #78350f; font-weight: 700;">(${count} מדרגים)</span>
      </div>
      <div class="urb-stars" style="display: flex; align-items: center; gap: 4px;">
        ${starsHTML}
      </div>
      ${myRating > 0 ? `<span class="urb-mine" style="font-size: 11.5px; color: #16a34a; font-weight: 800;">✓ הדירוג שלך: ${myRating}★</span>` : `<span class="urb-mine" style="font-size: 11.5px; color: #92400e; font-weight: 600;">לחץ לדירוג המשתמש</span>`}
    </div>
  `;
}

// ============================================================
// סרגל בטריה ומשימות התקדמות בחשבון (Battery Checklist & Tasks)
// ============================================================
function getBatteryTaskStatus() {
  const isAgeVerified = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('age_verified') === 'true';
  const isPhotoVerified = typeof localStorage !== 'undefined' && localStorage.getItem('task_photo_verified') === 'true';
  
  let hasUploadedPhoto = false;
  try {
    const albums = photoGetAlbums();
    const myUid = auth.currentUser ? auth.currentUser.uid : '';
    hasUploadedPhoto = albums.some(a => a.authorId === myUid || (auth.currentUser && a.author === (auth.currentUser.displayName || auth.currentUser.email)));
  } catch(e){}

  let hasProfileDetails = false;
  if (auth.currentUser) {
    try {
      const prof = JSON.parse(localStorage.getItem(`user_profile_${auth.currentUser.uid}`) || '{}');
      hasProfileDetails = !!(prof.nickname || prof.age || prof.location || prof.telegram);
    } catch(e){}
  }

  const tasks = [
    { id: 'photo', title: '📸 אימות דרך תמונה (אימות פנים / סלפי)', done: isPhotoVerified, action: 'openSelfieVerificationModal()' },
    { id: 'sidebar', title: '🎛️ אימות בסרגל (אימות 18+ בסרגל הצד)', done: isAgeVerified, action: 'toggleSidebarAgeVerification(true)' },
    { id: 'upload', title: '🖼️ תמונה/גלריה שהעלית באתר', done: hasUploadedPhoto, action: 'openPhotoModal()' },
    { id: 'profile', title: '👤 השלמת פרטי הפרופיל (כינוי/גיל/אזור)', done: hasProfileDetails, action: 'photoToggleProfileEdit()' }
  ];

  const doneCount = tasks.filter(t => t.done).length;
  const percent = Math.round((doneCount / tasks.length) * 100);

  return { tasks, doneCount, total: tasks.length, percent };
}

function updateBatteryBadgeUI() {
  const { percent } = getBatteryTaskStatus();
  const fillRect = document.getElementById('battery-fill-rect');
  const badge = document.getElementById('battery-percent-badge');
  if (badge) badge.style.display = 'none';
  if (fillRect) {
    const w = Math.round((11 * percent) / 100);
    fillRect.setAttribute('width', Math.max(percent > 0 ? 2 : 0, w));
    if (percent === 100) fillRect.setAttribute('fill', '#22c55e');
    else fillRect.setAttribute('fill', '#ffffff');
  }
}
window.updateBatteryBadgeUI = updateBatteryBadgeUI;

function openBatteryTasksModal() {
  // משימות/התקדמות רק למשתמשים רשומים (לא לאורח אנונימי)
  if (!isRegisteredUser()) return;
  const { tasks, doneCount, total, percent } = getBatteryTaskStatus();

  let modal = document.getElementById('battery-tasks-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'battery-tasks-modal';
    modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:999999; align-items:center; justify-content:center; direction:rtl; font-family:system-ui,sans-serif; padding:16px;';
    document.body.appendChild(modal);
  }

  const tasksHTML = tasks.map(t => `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; background:${t.done ? '#f0fdf4' : '#f8fafc'}; border:1.5px solid ${t.done ? '#bbf7d0' : '#e2e8f0'}; border-radius:12px; transition:all 0.2s;">
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:50%; background:${t.done ? '#22c55e' : '#cbd5e1'}; color:#fff; font-size:14px; font-weight:900;">
          ${t.done ? '✓' : '✕'}
        </span>
        <span style="font-size:14px; font-weight:800; color:${t.done ? '#15803d' : '#334155'};">${escHtml(t.title)}</span>
      </div>
      ${t.done ? '<span style="font-size:12px; font-weight:900; color:#16a34a; background:#dcfce7; padding:4px 10px; border-radius:20px;">הושלם ✓</span>' : `
        <button onclick="document.getElementById('battery-tasks-modal').style.display='none'; ${t.action}" style="background:#2563eb; color:#fff; border:none; border-radius:8px; padding:6px 14px; font-size:12.5px; font-weight:800; cursor:pointer; box-shadow:0 2px 6px rgba(37,99,235,0.2);">בצע עכשיו ➔</button>
      `}
    </div>
  `).join('');

  modal.innerHTML = `
    <div style="background:#ffffff; border-radius:20px; padding:24px; width:100%; max-width:480px; box-shadow:0 20px 50px rgba(0,0,0,0.3); border:1px solid #e2e8f0; position:relative;">
      <button onclick="document.getElementById('battery-tasks-modal').style.display='none'" style="position:absolute; top:16px; left:16px; background:#f1f5f9; border:none; border-radius:50%; width:32px; height:32px; font-size:16px; cursor:pointer; color:#64748b;">✕</button>

      <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px; border-bottom:2px solid #f1f5f9; padding-bottom:14px;">
        <span style="font-size:32px;">🔋</span>
        <div>
          <h3 style="margin:0; font-size:19px; font-weight:900; color:#0f172a;">משימות והתקדמות החשבון</h3>
          <div style="font-size:13px; color:#64748b; font-weight:700; margin-top:2px;">השלם משימות כדי להטעין את הבטריה ל-100%</div>
        </div>
      </div>

      <!-- Battery Meter Bar -->
      <div style="background:#f1f5f9; border-radius:30px; padding:4px; height:24px; position:relative; overflow:hidden; margin-bottom:20px; border:1px solid #cbd5e1;">
        <div style="height:100%; width:${percent}%; background:linear-gradient(90deg, #22c55e, #16a34a); border-radius:30px; transition:width 0.5s ease;"></div>
        <span style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:900; color:#0f172a; text-shadow:0 1px 2px rgba(255,255,255,0.8);">${percent}% הושלם (${doneCount} מתוך ${total})</span>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
        ${tasksHTML}
      </div>

      <div style="text-align:center;">
        <button onclick="document.getElementById('battery-tasks-modal').style.display='none'" style="background:#0f172a; color:#fff; border:none; border-radius:10px; padding:10px 24px; font-size:14px; font-weight:800; cursor:pointer; width:100%;">סגור</button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}
window.openBatteryTasksModal = openBatteryTasksModal;

function openSelfieVerificationModal() {
  let modal = document.getElementById('selfie-verify-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'selfie-verify-modal';
    modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.65); z-index:9999999; align-items:center; justify-content:center; direction:rtl; font-family:system-ui,sans-serif; padding:16px;';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background:#ffffff; border-radius:20px; padding:24px; width:100%; max-width:440px; box-shadow:0 20px 50px rgba(0,0,0,0.3); border:1px solid #e2e8f0; position:relative; text-align:center;">
      <button onclick="document.getElementById('selfie-verify-modal').style.display='none'" style="position:absolute; top:16px; left:16px; background:#f1f5f9; border:none; border-radius:50%; width:32px; height:32px; font-size:16px; cursor:pointer; color:#64748b;">✕</button>

      <div style="font-size:40px; margin-bottom:10px;">📸</div>
      <h3 style="margin:0 0 8px; font-size:19px; font-weight:900; color:#0f172a;">אימות זהות דרך תמונה / סלפי</h3>
      <p style="font-size:13.5px; color:#475569; line-height:1.5; margin-bottom:20px; font-weight:600;">
        להשלמת אימות התמונה, העלה תמונת פנים ברורה. לאחר האישור תקבל תג מאומת בחשבונך.
      </p>

      <div style="margin-bottom:20px;">
        <label style="display:inline-block; background:#2563eb; color:#fff; padding:12px 24px; border-radius:10px; font-size:14px; font-weight:800; cursor:pointer; box-shadow:0 4px 12px rgba(37,99,235,0.25);">
          📷 בחר תמונת אימות / סלפי
          <input type="file" accept="image/*" onchange="confirmSelfiePhotoUpload(this)" style="display:none;">
        </label>
      </div>

      <div style="font-size:12px; color:#94a3b8; font-weight:600;">* התמונה תישמר בצורה מאובטחת לאימות חשבונך</div>
    </div>
  `;
  modal.style.display = 'flex';
}
window.openSelfieVerificationModal = openSelfieVerificationModal;

function confirmSelfiePhotoUpload(input) {
  if (input && input.files && input.files[0]) {
    try {
      localStorage.setItem('task_photo_verified', 'true');
    } catch(e){}
    const modal = document.getElementById('selfie-verify-modal');
    if (modal) modal.style.display = 'none';
    if (typeof showCopyToast === 'function') showCopyToast('✓ תמונת האימות נשלחה ואושרה בהצלחה! הבטריה נטענה 🔋');
    updateBatteryBadgeUI();
  }
}
window.confirmSelfiePhotoUpload = confirmSelfiePhotoUpload;

// ============================================================
// עמוד משתמש מלא (במקום מודל "עמוד בתוך עמוד") — כל הגלריות שהעלה, בגריד כמו בתמונות
// ============================================================
function buildUserPageHTML(authorId, authorName) {
  const albums = photoGetAlbums();
  const _isAdminView = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);
  const now = Date.now();
  const authorAlbums = albums.filter(a => {
    const matchesId = authorId && a.authorId === authorId;
    const matchesName = a.author && authorName && a.author.toLowerCase() === String(authorName).toLowerCase();
    const isAuthor = (a.authorId && authorId) ? matchesId : matchesName;
    return isAuthor && a.approved !== false && (!a.adminOnly || _isAdminView) && (!a.expiresAt || a.expiresAt > now);
  });
  const cards = authorAlbums.map(p => renderPhotoCard(p)).join('');
  const json = encodeURIComponent(JSON.stringify(albums));
  const initial = escHtml(String(authorName || '?').charAt(0) || '?');
  const ratingWidget = buildUserRatingWidgetHTML(authorId);

  return `
  <div class="articles-page photos-page user-page photo-cols-${typeof photoGridCols !== 'undefined' ? photoGridCols : 4}" data-photos-json="${json}">
    <div class="art-inner">
      <button onclick="goBackFromUserPage()" style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; padding:8px 16px; font-size:13px; font-weight:800; cursor:pointer; margin-bottom:16px; color:#334155;">← חזרה</button>
      <div style="background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:20px; margin-bottom:24px; display:flex; align-items:center; gap:16px; box-shadow:0 4px 15px rgba(0,0,0,0.03); direction:rtl; flex-wrap:wrap;">
        <div style="width:56px; height:56px; border-radius:50%; background:linear-gradient(135deg,#e11d48,#9f1239); color:#fff; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:900; flex-shrink:0;">${initial}</div>
        <div style="flex:1; min-width:0;">
          <div id="user-page-name" style="font-size:20px; font-weight:900; color:#0f172a;">${escHtml(authorName || 'משתמש')}</div>
          <div id="user-page-meta" style="font-size:13px; color:#64748b; margin-top:2px;">📷 ${authorAlbums.length} גלריות שהועלו</div>
          ${ratingWidget}
          <div id="user-page-contact" style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;"></div>
        </div>
      </div>
      <div id="user-page-about">${userAboutCardHTML(null, isUserVerified(authorId, authorName))}</div>
      <div class="art-rows">${cards || '<div style="grid-column:1/-1; text-align:center; color:#94a3b8; padding:40px; font-weight:700;">אין גלריות להצגה עבור משתמש זה</div>'}</div>
    </div>
  </div>`;
}

async function openUserPage(authorId, authorName) {
  if (typeof mainContent === 'undefined' || !mainContent) return;
  mainContent.innerHTML = buildUserPageHTML(authorId, authorName);
  try { window.scrollTo(0, 0); } catch (e) {}
  if (typeof photoApplyFilters === 'function') photoApplyFilters();

  if (!authorId) return;
  try {
    const snap = await get(ref(db, `website/users/${authorId}/profile`));
    if (!snap.exists()) return;
    const profile = snap.val();
    const nameEl = document.getElementById('user-page-name');
    if (nameEl && profile.nickname) nameEl.textContent = profile.nickname;
    const contactEl = document.getElementById('user-page-contact');
    if (contactEl) {
      let html = '';
      if (profile.telegram) {
        const tg = String(profile.telegram).replace(/^@/, '');
        html += `<a href="https://t.me/${escHtml(tg)}" target="_blank" style="display:inline-flex; align-items:center; gap:4px; background:#2f2f2f; color:#fff; padding:5px 10px; border-radius:6px; font-size:12px; font-weight:800; text-decoration:none;">✈️ טלגרם</a>`;
      }
      if (profile.email) {
        html += `<button type="button" onclick="copyEmailToClipboard('${artEsc(profile.email)}', event)" style="display:inline-flex; align-items:center; gap:4px; background:#2f2f2f; color:#fff; padding:5px 10px; border-radius:6px; font-size:12px; font-weight:800; border:none; cursor:pointer;">✉️ אימייל</button>`;
      }
      contactEl.innerHTML = html;
    }
    const aboutEl = document.getElementById('user-page-about');
    if (aboutEl) aboutEl.innerHTML = userAboutCardHTML(profile, isUserVerified(authorId, profile.nickname || authorName));
  } catch (e) { /* פרופיל לא זמין — משאירים את שם היוצר */ }
}
window.openUserPage = openUserPage;

// חזרה מעמוד המשתמש אל העמוד הנוכחי (renderPage מודולרית, לכן חושפים עוטף גלובלי)
function goBackFromUserPage() {
  window.__detailOpen = false;
  if (typeof renderPage === 'function') renderPage();
}
window.goBackFromUserPage = goBackFromUserPage;

// מעבר ישיר לעמוד התמונות (נקרא אחרי אישור ההסכמה בכניסה לאתר)
function goToPhotosPage() {
  try {
    const photoPage = pages.find(p => p && ((p.content || '').includes('photos-page') || (p.title || '').includes('תמונות')));
    if (photoPage) {
      activePageId = photoPage.id;
      if (typeof saveToStorage === 'function') { try { localforage.setItem('myActivePage_v3', activePageId); } catch (e) {} }
    }
  } catch (e) {}
  window.__detailOpen = false;
  if (typeof renderPage === 'function') renderPage();
}
window.goToPhotosPage = goToPhotosPage;

function photoGoBack() {
  window.__detailOpen = false;
  // אם הגענו לתמונה מעמוד הבית (שורות מתחלפות) — חוזרים לעמוד הבית
  if (activePageId === 'page-home-feed' && typeof renderPage === 'function') {
    renderPage();
    if (isEditMode) applyEditModeToContent();
    return;
  }
  const container = mainContent.querySelector('.photos-page');
  if (!container) return;
  let albums = [];
  try { albums = JSON.parse(decodeURIComponent(container.dataset.photosJson)); } catch(e){}
  mainContent.innerHTML = buildPhotosPage(albums);
  if (isEditMode) applyEditModeToContent();
}

// הסקשן (עמוד) הנוכחי מסוג "תמונות": photos / yad2 / prices. כל עמוד שומר
// את התוכן שלו בנפרד בתוך data-photos-json שלו.
function photoCurrentSection() {
  const el = mainContent.querySelector('.photos-page:not(.community-page):not(.user-page)');
  return (el && el.dataset.section) ? el.dataset.section : 'photos';
}

function photoGetAlbums() {
  // חשוב: לא לקרוא מנתוני עמוד קהילה/משתמש (שגם מסומנים photos-page) כדי לא לדרוס את התמונות
  const container = mainContent.querySelector('.photos-page:not(.community-page):not(.user-page)');
  if (container && container.dataset.photosJson) {
    try {
      const parsed = JSON.parse(decodeURIComponent(container.dataset.photosJson));
      // רשימה קיימת (גם ריקה) — מכבדים אותה. דוגמאות רק כשאין בכלל נתונים,
      // אחרת גלריות שהמנהל מחק "חוזרות".
      if (Array.isArray(parsed)) return parsed;
    } catch(e){}
  }
  return (typeof PHOTOS_SAMPLES !== 'undefined' && Array.isArray(PHOTOS_SAMPLES)) ? PHOTOS_SAMPLES : [];
}

// מוחק פריט (גלריה/סיפור/קומיקס) מכל עמוד שמור שמכיל אותו — לא רק מהעמוד שמוצג כרגע,
// ושומר ל-Firebase. אחרת מחיקה מעמוד הבית/תצוגה אחרת לא נשמרת והפריט "חוזר".
function removeItemFromStoredPages(id) {
  if (!id || typeof pages === 'undefined' || !Array.isArray(pages)) return false;
  let changed = false;
  pages.forEach(p => {
    if (!p || !p.content || p.content.indexOf(id) === -1) return;
    p.content = p.content.replace(/data-(photos|stories)-json="([^"]*)"/g, (full, kind, enc) => {
      let arr;
      try { arr = JSON.parse(decodeURIComponent(enc)); } catch (e) { return full; }
      if (!Array.isArray(arr)) return full;
      const next = arr.filter(x => !(x && x.id === id));
      if (next.length === arr.length) return full;
      changed = true;
      return `data-${kind}-json="${encodeURIComponent(JSON.stringify(next))}"`;
    });
  });
  if (changed) saveToStorage();
  // אם זו הייתה בקשה ממתינה — מוחקים גם אותה
  try { set(ref(db, `website/pending_submissions/${id}`), null).catch(() => {}); } catch (e) {}
  return changed;
}
window.removeItemFromStoredPages = removeItemFromStoredPages;

// מסמן פריט כמאושר בכל עמוד שמור שמכיל אותו. מחזיר כמה עמודים עודכנו.
function _setApprovedInStoredPages(id) {
  if (!id || typeof pages === 'undefined' || !Array.isArray(pages)) return 0;
  let count = 0;
  pages.forEach(p => {
    if (!p || !p.content || p.content.indexOf(id) === -1) return;
    p.content = p.content.replace(/data-(photos|stories)-json="([^"]*)"/g, (full, kind, enc) => {
      let arr;
      try { arr = JSON.parse(decodeURIComponent(enc)); } catch (e) { return full; }
      if (!Array.isArray(arr)) return full;
      let touched = false;
      arr.forEach(x => { if (x && x.id === id) { x.approved = true; delete x.__userSubKey; touched = true; } });
      if (!touched) return full;
      count++;
      return `data-${kind}-json="${encodeURIComponent(JSON.stringify(arr))}"`;
    });
  });
  return count;
}

function photoDelete(id, el) {
  if (!isEditMode) return;
  if (!confirm('האם למחוק גלריה זו?')) return;
  removeItemFromStoredPages(id);
  // פריט בתוך קהילה נשמר ב-website/communities/{id}/items — מוחקים משם
  const comm = mainContent.querySelector('.community-page[data-community-id]');
  if (comm) {
    const cid = comm.getAttribute('data-community-id');
    try { set(ref(db, `website/communities/${cid}/items/${id}`), null).catch(() => {}); } catch (e) {}
    try { if (communitiesData[cid] && communitiesData[cid].items) delete communitiesData[cid].items[id]; } catch (e) {}
    const el = [...mainContent.querySelectorAll('.art-row')].find(r => (r.getAttribute('onclick') || '').includes(id));
    if (el) el.remove();
    return;
  }
  const albums = photoGetAlbums().filter(a => a.id !== id);
  const onHome = !!mainContent.querySelector('.home-feed-page');
  if (onHome) { if (typeof renderPage === 'function') renderPage(); return; }
  mainContent.innerHTML = buildPhotosPage(albums, photoCurrentSection());
  saveCurrentPageContent();
}

function photoSearch(val) {
  if (typeof logSearchQuery === 'function' && val) {
    const sectionName = (typeof photoCurrentSection === 'function' && photoCurrentSection() === 'ideas') ? 'רעיונות' : ((typeof photoCurrentSection === 'function' && photoCurrentSection() === 'communities') ? 'קהילות' : 'תמונות');
    logSearchQuery(val, sectionName);
  }
  photoApplyFilters();
}

function renderExpirationBadge(expiresAt, createdAt, id) {
  return '';
}
window.renderExpirationBadge = renderExpirationBadge;

let photoImgDataList = ['', '', '', '', ''];
let editingPhotoId = null;

function openPhotoModal() {
  editingPhotoId = null;
  document.getElementById('photo-title').value = '';
  document.getElementById('photo-summary').value = '';
  document.getElementById('photo-category').value = '';

  // העלאה מהירה: למשתמש רשום ממלאים מראש מייל וטלגרם מהפרופיל השמור
  // (הפרטים נשמרים, אבל השדות ניתנים לעריכה אם רוצים לשנות)
  let savedEmail = '', savedTelegram = '';
  const _qu = auth.currentUser;
  if (_qu) {
    try {
      const prof = JSON.parse(localStorage.getItem(`user_profile_${_qu.uid}`) || '{}');
      savedEmail = prof.email || _qu.email || '';
      savedTelegram = prof.telegram ? ('@' + String(prof.telegram).replace(/^@/, '')) : '';
    } catch (e) { savedEmail = _qu.email || ''; }
  }
  document.getElementById('photo-telegram').value = savedTelegram;
  const ageInp = document.getElementById('photo-age');
  if (ageInp) ageInp.value = '';
  const regionInp = document.getElementById('photo-region');
  if (regionInp) regionInp.value = '';
  const emailInp = document.getElementById('photo-email');
  if (emailInp) emailInp.value = savedEmail;
  const tempInp = document.getElementById('photo-is-temporary');
  if (tempInp) tempInp.checked = false;
  const adultInp = document.getElementById('photo-is-adult');
  if (adultInp) adultInp.checked = false;
  const adminOnlyInp = document.getElementById('photo-admin-only');
  if (adminOnlyInp) adminOnlyInp.checked = false;

  photoImgDataList = ['', '', '', '', ''];
  for (let i = 1; i <= 5; i++) {
    const btn = document.getElementById('photo-img-pick-' + i);
    const prev = document.getElementById('photo-img-preview-' + i);
    btn.style.display = 'block';
    btn.textContent = i + '️⃣';
    prev.style.display = 'none';
    prev.src = '';
  }
  // התאמת המודל לעמוד יד 2: הצגת "סוג הצעה" + שדה מותנה, הסתרת גיל
  const _isSh = (typeof photoCurrentSection === 'function') && photoCurrentSection() === 'secondhand';
  const _fAge = document.getElementById('photo-field-age');
  const _fOffer = document.getElementById('photo-field-offer');
  const _fOfferVal = document.getElementById('photo-field-offerval');
  if (_fAge) _fAge.style.display = _isSh ? 'none' : '';
  if (_fOffer) _fOffer.style.display = _isSh ? '' : 'none';
  if (_fOfferVal) _fOfferVal.style.display = _isSh ? '' : 'none';
  if (_isSh) {
    const ot = document.getElementById('photo-offer-type'); if (ot) ot.value = 'מכירה';
    const ov = document.getElementById('photo-offer-value'); if (ov) ov.value = '';
    photoLoanTerms = [];
    if (typeof photoOfferTypeChanged === 'function') photoOfferTypeChanged();
  }
  const modalTitle = document.querySelector('#photo-modal h3');
  if (modalTitle) modalTitle.textContent = _isSh ? '🛒 הוספת מוצר יד שניה' : '🖼️ העלאת גלריית תמונות חדשה';
  document.getElementById('photo-modal').style.display = 'flex';
}

// --- מנסח חוזה השאלה: סעיפים מובנים שאפשר להוסיף/להסיר ---
const PHOTO_LOAN_DEFAULT_TERMS = [
  'המוצר יוחזר במצב שבו התקבל',
  'תקופת ההשאלה מוסכמת מראש בין הצדדים',
  'נזק, אובדן או גניבה — באחריות השואל',
  'איסוף והחזרה בתיאום מראש',
  'אין להעביר את המוצר לצד שלישי ללא אישור'
];
let photoLoanTerms = [];
function renderPhotoContract() {
  const box = document.getElementById('photo-contract-list');
  if (!box) return;
  if (!photoLoanTerms.length) { box.innerHTML = '<div style="font-size:12px; color:#94a3b8;">אין סעיפים — הוסיפו למטה.</div>'; return; }
  box.innerHTML = photoLoanTerms.map((t, i) => `
    <div style="display:flex; align-items:center; gap:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 10px;">
      <span style="flex:1; font-size:13px; font-weight:600; color:#1e293b;">${i + 1}. ${escHtml(t)}</span>
      <button type="button" onclick="photoContractRemove(${i})" title="הסר סעיף" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:6px; width:24px; height:24px; cursor:pointer; font-size:12px; flex-shrink:0;">✕</button>
    </div>`).join('');
}
function photoContractAdd() {
  const inp = document.getElementById('photo-contract-input');
  if (!inp) return;
  const v = inp.value.trim();
  if (!v) return;
  photoLoanTerms.push(v.slice(0, 160));
  inp.value = '';
  renderPhotoContract();
}
function photoContractRemove(i) { photoLoanTerms.splice(i, 1); renderPhotoContract(); }
window.photoContractAdd = photoContractAdd;
window.photoContractRemove = photoContractRemove;

// מעדכן את השדה המותנה לפי סוג ההצעה: מכירה→מחיר, השאלה→תקופה+חוזה, החלפה→מוצר
function photoOfferTypeChanged() {
  const ot = document.getElementById('photo-offer-type');
  const lbl = document.getElementById('photo-offerval-label');
  const val = document.getElementById('photo-offer-value');
  if (!ot || !lbl || !val) return;
  const t = ot.value;
  const contractField = document.getElementById('photo-field-contract');
  if (t === 'השאלה') {
    lbl.textContent = 'לכמה זמן? (תקופת ההשאלה)'; val.placeholder = 'לדוגמה: שבוע / חודש';
    if (contractField) contractField.style.display = '';
    if (!photoLoanTerms.length) photoLoanTerms = PHOTO_LOAN_DEFAULT_TERMS.slice();
    renderPhotoContract();
  } else {
    if (contractField) contractField.style.display = 'none';
    if (t === 'החלפה') { lbl.textContent = 'להחלפה תמורת מה?'; val.placeholder = 'לדוגמה: טלפון / אופניים'; }
    else { lbl.textContent = 'מחיר (₪)'; val.placeholder = 'לדוגמה: 250'; }
  }
}
window.photoOfferTypeChanged = photoOfferTypeChanged;

// --- תביעה ייצוגית נגד עסק (בעמוד "ביקורת") ---
function openClassActionModal() {
  let m = document.getElementById('classaction-modal');
  if (!m) { m = document.createElement('div'); m.id = 'classaction-modal'; document.body.appendChild(m); }
  m.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999999; display:flex; align-items:center; justify-content:center; direction:rtl; padding:16px;';
  m.innerHTML = `
    <div style="background:#fff; border-radius:16px; padding:24px; width:100%; max-width:460px; max-height:88vh; overflow-y:auto; display:flex; flex-direction:column; gap:12px; box-shadow:0 20px 60px rgba(0,0,0,0.35);">
      <h3 style="margin:0; font-size:18px; font-weight:900; color:#0f172a;">⚖️ פתיחת תביעה ייצוגית נגד עסק</h3>
      <p style="margin:0; font-size:13px; color:#64748b; line-height:1.5;">תארו את העסק והבעיה. גולשים שנפגעו גם הם יוכלו להצטרף לתביעה.</p>
      <label style="font-size:13px; font-weight:700;">שם העסק <span style="color:red">*</span></label>
      <input id="ca-business" type="text" placeholder="לדוגמה: חברת סלולר XYZ" style="padding:10px 12px; border:1px solid #ddd; border-radius:8px; font-size:14px; box-sizing:border-box;">
      <label style="font-size:13px; font-weight:700;">נושא התביעה <span style="color:red">*</span></label>
      <input id="ca-title" type="text" placeholder="לדוגמה: חיובים כפולים" style="padding:10px 12px; border:1px solid #ddd; border-radius:8px; font-size:14px; box-sizing:border-box;">
      <label style="font-size:13px; font-weight:700;">פירוט</label>
      <textarea id="ca-desc" rows="4" placeholder="מה קרה, מתי, ומה הנזק..." style="padding:10px 12px; border:1px solid #ddd; border-radius:8px; font-size:14px; box-sizing:border-box; resize:vertical;"></textarea>
      <div style="display:flex; gap:10px; margin-top:4px;">
        <button onclick="submitClassAction()" style="flex:2; background:#0f172a; color:#fff; border:none; border-radius:8px; padding:11px; font-size:14px; font-weight:800; cursor:pointer;">⚖️ פרסם תביעה</button>
        <button onclick="document.getElementById('classaction-modal').remove()" style="flex:1; background:#fff; color:#334155; border:1px solid #ddd; border-radius:8px; padding:11px; font-size:14px; cursor:pointer;">ביטול</button>
      </div>
    </div>`;
}
window.openClassActionModal = openClassActionModal;

function submitClassAction() {
  const business = (document.getElementById('ca-business') || {}).value ? document.getElementById('ca-business').value.trim() : '';
  const title = (document.getElementById('ca-title') || {}).value ? document.getElementById('ca-title').value.trim() : '';
  const desc = (document.getElementById('ca-desc') || {}).value ? document.getElementById('ca-desc').value.trim() : '';
  if (!business || !title) { alert('נא למלא שם עסק ונושא תביעה'); return; }
  const user = auth.currentUser;
  let nick = 'אנונימי';
  if (user) { try { const p = JSON.parse(localStorage.getItem(`user_profile_${user.uid}`) || '{}'); nick = p.nickname || user.displayName || (user.email ? user.email.split('@')[0] : 'משתמש'); } catch (e) { nick = user.displayName || 'משתמש'; } }
  const albums = (typeof photoGetAlbums === 'function') ? photoGetAlbums() : [];
  const isApproved = (typeof isEditMode !== 'undefined' && isEditMode);
  const newAlbum = {
    id: 'ph' + Date.now(), title: '⚖️ ' + business, summary: desc, images: [],
    author: nick, authorId: user ? user.uid : '', category: 'תביעה ייצוגית',
    isClassAction: true, businessName: business, region: '', categoryColor: '#0f172a',
    timestamp: new Date().toLocaleDateString('he-IL'), createdAt: Date.now(), likes: 0,
    approved: isApproved
  };
  albums.unshift(newAlbum);
  if (!isApproved && typeof pushPendingSubmission === 'function') pushPendingSubmission(newAlbum);
  if (typeof mainContent !== 'undefined' && mainContent) mainContent.innerHTML = buildPhotosPage(albums, 'reviews');
  if (typeof saveCurrentPageContent === 'function') saveCurrentPageContent();
  const m = document.getElementById('classaction-modal'); if (m) m.remove();
  alert(isApproved ? 'התביעה פורסמה!' : 'התביעה נשלחה לאישור מנהל ותופיע בקרוב.');
}
window.submitClassAction = submitClassAction;

// --- "מחפש מוצר" ביד 2 (מכרז הפוך): מפרסמים בקשה, אחרים מגישים הצעות (דגם+מחיר), בוחרים ---
function openWantedModal() {
  let m = document.getElementById('wanted-modal');
  if (!m) { m = document.createElement('div'); m.id = 'wanted-modal'; document.body.appendChild(m); }
  m.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999999; display:flex; align-items:center; justify-content:center; direction:rtl; padding:16px;';
  m.innerHTML = `
    <div style="background:#fff; border-radius:16px; padding:24px; width:100%; max-width:460px; max-height:88vh; overflow-y:auto; display:flex; flex-direction:column; gap:12px; box-shadow:0 20px 60px rgba(0,0,0,0.35);">
      <h3 style="margin:0; font-size:18px; font-weight:900; color:#0f172a;">🔎 מחפש/ת מוצר</h3>
      <p style="margin:0; font-size:13px; color:#64748b; line-height:1.5;">תארו מה אתם מחפשים. מי שיש לו מוצר כזה (או דומה) יגיש הצעה עם הדגם והמחיר — ותבחרו את העסקה הכי טובה.</p>
      <label style="font-size:13px; font-weight:700;">מה אתם מחפשים? <span style="color:red">*</span></label>
      <input id="wt-title" type="text" placeholder="לדוגמה: אופניים חשמליים" style="padding:10px 12px; border:1px solid #ddd; border-radius:8px; font-size:14px; box-sizing:border-box;">
      <label style="font-size:13px; font-weight:700;">פירוט / דרישות</label>
      <textarea id="wt-desc" rows="3" placeholder="מצב, דגם מועדף, אזור..." style="padding:10px 12px; border:1px solid #ddd; border-radius:8px; font-size:14px; box-sizing:border-box; resize:vertical;"></textarea>
      <label style="font-size:13px; font-weight:700;">תקציב מקסימלי (אופציונלי)</label>
      <input id="wt-budget" type="text" placeholder="לדוגמה: עד 2000 ₪" style="padding:10px 12px; border:1px solid #ddd; border-radius:8px; font-size:14px; box-sizing:border-box;">
      <div style="display:flex; gap:10px; margin-top:4px;">
        <button onclick="submitWanted()" style="flex:2; background:#2563eb; color:#fff; border:none; border-radius:8px; padding:11px; font-size:14px; font-weight:800; cursor:pointer;">🔎 פרסם בקשה</button>
        <button onclick="document.getElementById('wanted-modal').remove()" style="flex:1; background:#fff; color:#334155; border:1px solid #ddd; border-radius:8px; padding:11px; font-size:14px; cursor:pointer;">ביטול</button>
      </div>
    </div>`;
}
window.openWantedModal = openWantedModal;

function submitWanted() {
  const title = ((document.getElementById('wt-title') || {}).value || '').trim();
  if (!title) { alert('נא לתאר מה מחפשים'); return; }
  const desc = ((document.getElementById('wt-desc') || {}).value || '').trim();
  const budget = ((document.getElementById('wt-budget') || {}).value || '').trim();
  const user = auth.currentUser;
  let nick = 'משתמש';
  if (user) { try { const p = JSON.parse(localStorage.getItem(`user_profile_${user.uid}`) || '{}'); nick = p.nickname || user.displayName || (user.email ? user.email.split('@')[0] : 'משתמש'); } catch (e) {} }
  const albums = (typeof photoGetAlbums === 'function') ? photoGetAlbums() : [];
  const isApproved = (typeof isEditMode !== 'undefined' && isEditMode);
  const newAlbum = {
    id: 'ph' + Date.now(), title: '🔎 ' + title, summary: desc, images: [],
    author: nick, authorId: user ? user.uid : '', category: 'מחפש מוצר',
    isWanted: true, budget: budget, offers: {}, region: '', categoryColor: '#2563eb',
    timestamp: new Date().toLocaleDateString('he-IL'), createdAt: Date.now(), likes: 0,
    approved: isApproved
  };
  albums.unshift(newAlbum);
  if (!isApproved && typeof pushPendingSubmission === 'function') pushPendingSubmission(newAlbum);
  if (typeof mainContent !== 'undefined' && mainContent) mainContent.innerHTML = buildPhotosPage(albums, 'secondhand');
  if (typeof saveCurrentPageContent === 'function') saveCurrentPageContent();
  const m = document.getElementById('wanted-modal'); if (m) m.remove();
  alert(isApproved ? 'הבקשה פורסמה!' : 'הבקשה נשלחה לאישור מנהל ותופיע בקרוב.');
}
window.submitWanted = submitWanted;

function secondhandWantedHowBoxHTML() {
  const steps = [
    { n: 1, t: '🔎 פורסמה בקשה', d: 'מישהו מחפש מוצר מסוים.' },
    { n: 2, t: '💰 מגישים הצעות', d: 'מי שיש לו כותב דגם ומחיר.' },
    { n: 3, t: '🏆 בוחרים עסקה', d: 'המחפש בוחר את ההצעה הכי טובה.' },
    { n: 4, t: '🤝 סוגרים', d: 'הצדדים יוצרים קשר ומשלימים עסקה.' }
  ];
  const stepsHTML = steps.map(s => `
      <div style="display:flex; gap:12px; align-items:flex-start; margin-bottom:14px; background:#f8fafc; padding:10px 12px; border-radius:10px; border:1px solid #e2e8f0;">
        <span style="background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; font-weight:900; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0;">${s.n}</span>
        <div><div style="font-size:13.5px; font-weight:800; color:#0f172a;">${s.t}</div><div style="font-size:12px; color:#64748b; line-height:1.4; margin-top:2px;">${s.d}</div></div>
      </div>`).join('');
  return `<div class="idea-exec-box"><div style="font-size:16px; font-weight:900; color:#0f172a; border-bottom:2.5px solid #2563eb; padding-bottom:10px; margin-bottom:16px;">🔎 איך זה עובד</div><div style="display:flex; flex-direction:column;">${stepsHTML}</div></div>`;
}
window.secondhandWantedHowBoxHTML = secondhandWantedHowBoxHTML;

function secondhandOffersBoxHTML(a) {
  const offers = a.offers ? Object.entries(a.offers).map(([oid, o]) => ({ oid, ...o })).filter(o => o && o.price != null) : [];
  offers.sort((x, y) => (Number(x.price) || 0) - (Number(y.price) || 0));
  const isOwner = auth.currentUser && a.authorId === auth.currentUser.uid;
  const isEd = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);
  const canChoose = isOwner || isEd;
  const rows = offers.length ? offers.map((o, i) => {
    const chosen = a.chosenOffer === o.oid;
    return `
      <div style="display:flex; align-items:center; gap:10px; background:${chosen ? '#eff6ff' : '#f8fafc'}; border:1px solid ${chosen ? '#93c5fd' : '#e2e8f0'}; border-radius:10px; padding:10px 12px;">
        <div style="flex:1; min-width:0;">
          <div style="font-size:14px; font-weight:900; color:#1d4ed8;">₪${escHtml(String(o.price))}${i === 0 ? ' <span style="font-size:11px; color:#f59e0b;">🏆 הכי זול</span>' : ''}${chosen ? ' <span style="font-size:11px; color:#2563eb;">✓ נבחר</span>' : ''}</div>
          <div style="font-size:12px; color:#334155; font-weight:700;">${escHtml(o.model || '')}</div>
          <div style="font-size:11.5px; color:#64748b;">${escHtml(o.name || 'משתמש')}</div>
        </div>
        ${canChoose && !a.chosenOffer ? `<button onclick="chooseWantedOffer('${artEsc(a.id)}','${artEsc(o.oid)}')" style="background:#2563eb; color:#fff; border:none; border-radius:8px; padding:6px 12px; font-size:12px; font-weight:800; cursor:pointer;">בחר</button>` : ''}
      </div>`;
  }).join('') : '<div style="font-size:13px; color:#94a3b8; text-align:center; padding:12px;">אין הצעות עדיין — היו הראשונים להציע!</div>';
  return `
    <div class="idea-tech-box">
      <div style="font-size:16px; font-weight:900; color:#0f172a; border-bottom:2.5px solid #2563eb; padding-bottom:10px; margin-bottom:16px;">💰 הצעות (${offers.length})</div>
      ${a.budget ? `<div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:12px 14px; margin-bottom:12px;"><div style="font-size:11.5px; color:#1e40af; font-weight:800; margin-bottom:4px;">🎯 תקציב</div><div style="font-size:15px; font-weight:900; color:#1d4ed8;">${escHtml(a.budget)}</div></div>` : ''}
      <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">${rows}</div>
      ${!a.chosenOffer ? `<button onclick="submitWantedOffer('${artEsc(a.id)}')" style="width:100%; background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; border:none; padding:12px; border-radius:12px; font-weight:800; font-size:14px; cursor:pointer; box-shadow:0 4px 14px rgba(37,99,235,0.3);">💰 הגש הצעה</button>` : '<div style="text-align:center; font-size:13px; font-weight:800; color:#2563eb; padding:8px;">✓ נבחרה הצעה — הבקשה נסגרה</div>'}
    </div>`;
}
window.secondhandOffersBoxHTML = secondhandOffersBoxHTML;

function submitWantedOffer(id) {
  if (!auth.currentUser) { if (typeof openLiveChatLogin === 'function') openLiveChatLogin(); return; }
  const model = prompt('איזה דגם/מוצר יש לך להציע?');
  if (model === null) return;
  const raw = prompt('מה המחיר שאתה מבקש (₪)?');
  if (raw === null) return;
  const price = parseInt(String(raw).replace(/[^\d]/g, ''), 10);
  if (!price) { alert('נא להזין מחיר תקין'); return; }
  let nick = 'משתמש';
  try { const p = JSON.parse(localStorage.getItem(`user_profile_${auth.currentUser.uid}`) || '{}'); nick = p.nickname || auth.currentUser.displayName || (auth.currentUser.email ? auth.currentUser.email.split('@')[0] : 'משתמש'); } catch (e) {}
  const albums = (typeof photoGetAlbums === 'function') ? photoGetAlbums() : [];
  const item = albums.find(x => x.id === id);
  if (!item) return;
  if (!item.offers) item.offers = {};
  item.offers['o' + Date.now()] = { model: (model || '').slice(0, 80), price, name: nick, uid: auth.currentUser.uid, at: Date.now() };
  if (typeof mainContent !== 'undefined' && mainContent) mainContent.innerHTML = buildPhotosPage(albums, 'secondhand');
  if (typeof saveCurrentPageContent === 'function') saveCurrentPageContent();
  setTimeout(() => { if (typeof photoOpenDetail === 'function') photoOpenDetail(id); }, 60);
}
window.submitWantedOffer = submitWantedOffer;

function chooseWantedOffer(id, offerId) {
  const albums = (typeof photoGetAlbums === 'function') ? photoGetAlbums() : [];
  const item = albums.find(x => x.id === id);
  const isEd = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);
  if (!item || !(isEd || (auth.currentUser && item.authorId === auth.currentUser.uid))) { alert('רק מי שפרסם את הבקשה יכול לבחור הצעה'); return; }
  if (!confirm('לבחור בהצעה זו ולסגור את הבקשה?')) return;
  item.chosenOffer = offerId;
  if (typeof mainContent !== 'undefined' && mainContent) mainContent.innerHTML = buildPhotosPage(albums, 'secondhand');
  if (typeof saveCurrentPageContent === 'function') saveCurrentPageContent();
  setTimeout(() => { if (typeof photoOpenDetail === 'function') photoOpenDetail(id); }, 60);
}
window.chooseWantedOffer = chooseWantedOffer;

function openPhotoEditModal(id, e) {
  if (e) {
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
    if (typeof e.preventDefault === 'function') e.preventDefault();
  }
  const albums = photoGetAlbums();
  const album = albums.find(x => x.id === id);
  if (!album) return;
  
  editingPhotoId = id;
  
  document.getElementById('photo-title').value = album.title || '';
  document.getElementById('photo-summary').value = album.summary || '';
  document.getElementById('photo-category').value = album.category || '';
  document.getElementById('photo-telegram').value = (album.telegramUrl || '').replace('https://t.me/', '@');
  const ageInp = document.getElementById('photo-age');
  if (ageInp) ageInp.value = album.ageRange || '';
  const regionInp = document.getElementById('photo-region');
  if (regionInp) regionInp.value = album.region || '';
  const emailInp = document.getElementById('photo-email');
  if (emailInp) emailInp.value = (album.emailUrl || '').replace('mailto:', '');
  const tempInp = document.getElementById('photo-is-temporary');
  if (tempInp) tempInp.checked = !!(album.expiresAt && album.expiresAt > Date.now());
  const adultInp = document.getElementById('photo-is-adult');
  if (adultInp) adultInp.checked = !!album.isAdult;
  const adminOnlyInp = document.getElementById('photo-admin-only');
  if (adminOnlyInp) adminOnlyInp.checked = !!album.adminOnly;

  photoImgDataList = ['', '', '', '', ''];
  const imgs = (album.images && album.images.length) ? album.images : (album.image ? [album.image] : []);
  for (let i = 1; i <= 5; i++) {
    const btn = document.getElementById('photo-img-pick-' + i);
    const prev = document.getElementById('photo-img-preview-' + i);
    const imgData = imgs[i - 1] || '';
    photoImgDataList[i - 1] = imgData;
    if (imgData) {
      prev.src = imgData;
      prev.style.display = 'block';
      btn.style.display = 'none';
    } else {
      btn.style.display = 'block';
      btn.textContent = i + '️⃣';
      prev.style.display = 'none';
      prev.src = '';
    }
  }
  
  // התאמת המודל לעריכת מוצר יד 2
  const _isShEdit = (typeof photoCurrentSection === 'function') && photoCurrentSection() === 'secondhand';
  const _fAge = document.getElementById('photo-field-age');
  const _fOffer = document.getElementById('photo-field-offer');
  const _fOfferVal = document.getElementById('photo-field-offerval');
  if (_fAge) _fAge.style.display = _isShEdit ? 'none' : '';
  if (_fOffer) _fOffer.style.display = _isShEdit ? '' : 'none';
  if (_fOfferVal) _fOfferVal.style.display = _isShEdit ? '' : 'none';
  if (_isShEdit) {
    const ot = document.getElementById('photo-offer-type'); if (ot) ot.value = album.offerType || 'מכירה';
    photoLoanTerms = Array.isArray(album.loanTerms) ? album.loanTerms.slice() : [];
    if (typeof photoOfferTypeChanged === 'function') photoOfferTypeChanged();
    const ov = document.getElementById('photo-offer-value'); if (ov) ov.value = (album.offerType === 'מכירה' ? (album.price || '') : (album.offerDetail || ''));
  }
  const modalTitle = document.querySelector('#photo-modal h3');
  if (modalTitle) modalTitle.textContent = _isShEdit ? '✏️ עריכת מוצר יד שניה' : '✏️ עריכת גלריית תמונות';
  document.getElementById('photo-modal').style.display = 'flex';
}
window.openPhotoEditModal = openPhotoEditModal;

for (let i = 1; i <= 5; i++) {
  const btn = document.getElementById('photo-img-pick-' + i);
  if (btn) {
    btn.addEventListener('click', () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = e => {
        const f = e.target.files[0]; if (!f) return;
        artCompressImage(f).then(data => {
          photoImgDataList[i - 1] = data;
          const p = document.getElementById('photo-img-preview-' + i);
          p.src = data;
          p.style.display = 'block';
          btn.style.display = 'none';
        });
      };
      inp.click();
    });
  }
}

document.getElementById('photo-cancel').addEventListener('click', () => {
  editingPhotoId = null;
  document.getElementById('photo-modal').style.display = 'none';
});

document.getElementById('photo-save').addEventListener('click', async () => {
  const title = document.getElementById('photo-title').value.trim();
  if (!title) { alert('חובה כותרת'); return; }
  const validImages = photoImgDataList.filter(img => !!img);
  if (validImages.length === 0) { alert('חובה להעלות לפחות תמונה אחת'); return; }
  // מי שאינו מחובר ואינו מנהל — מחייבים אותו להיכנס כאורח (אנונימי) לפני השמירה,
  // כדי שהבקשה תיכתב ל-Firebase ותגיע לאישור המנהל.
  if (!auth.currentUser && !(typeof isEditMode !== 'undefined' && isEditMode)) {
    const _ok = await ensureGuestSignedIn();
    if (!_ok) { alert('לא ניתן להתחבר כרגע — נסו שוב בעוד רגע.'); return; }
  }

  const albums = photoGetAlbums();
  const _saveSection = photoCurrentSection();

  let telegramInput = document.getElementById('photo-telegram').value.trim();
  if (telegramInput) {
    if (telegramInput.startsWith('@')) {
      telegramInput = telegramInput.substring(1);
    }
    if (!telegramInput.startsWith('http://') && !telegramInput.startsWith('https://')) {
      if (telegramInput.startsWith('t.me/')) {
        telegramInput = 'https://' + telegramInput;
      } else {
        telegramInput = 'https://t.me/' + telegramInput;
      }
    }
  }

  let emailInput = '';
  const emailInp = document.getElementById('photo-email');
  if (emailInp && emailInp.value.trim()) {
    emailInput = emailInp.value.trim();
    if (!emailInput.startsWith('mailto:')) {
      emailInput = 'mailto:' + emailInput;
    }
  }

  const tempInp = document.getElementById('photo-is-temporary');
  const isTemporary = tempInp ? tempInp.checked : false;
  const newExpiresAt = isTemporary ? (Date.now() + 24 * 60 * 60 * 1000) : null;

  const adultInp = document.getElementById('photo-is-adult');
  const isAdult = adultInp ? adultInp.checked : false;

  const adminOnlyInp = document.getElementById('photo-admin-only');
  const adminOnly = adminOnlyInp ? adminOnlyInp.checked : false;

  const user = auth.currentUser;
  let authorNickname = 'אורח';
  if (user && user.isAnonymous) {
    authorNickname = 'אורח'; // משתמש אנונימי — אין אימייל/שם תצוגה
  } else if (user) {
    try {
      const profile = JSON.parse(localStorage.getItem(`user_profile_${user.uid}`) || '{}');
      authorNickname = profile.nickname || user.displayName || (user.email ? user.email.split('@')[0] : 'אורח');
    } catch(e) {
      authorNickname = user.displayName || (user.email ? user.email.split('@')[0] : 'אורח');
    }
  } else if (isEditMode) {
    authorNickname = 'מנהל';
  }

  // שדות מוצר יד שניה (אם מפרסמים בעמוד יד 2)
  const _isShSave = _saveSection === 'secondhand';
  const _offerType = _isShSave ? ((document.getElementById('photo-offer-type') || {}).value || 'מכירה') : '';
  const _offerVal = _isShSave ? (((document.getElementById('photo-offer-value') || {}).value || '').trim()) : '';
  const _shFields = _isShSave ? { offerType: _offerType, price: (_offerType === 'מכירה' ? _offerVal : ''), offerDetail: (_offerType !== 'מכירה' ? _offerVal : ''), loanTerms: (_offerType === 'השאלה' ? (photoLoanTerms || []).slice() : []) } : {};

  if (editingPhotoId) {
    const existingIdx = albums.findIndex(x => x.id === editingPhotoId);
    if (existingIdx > -1) {
      albums[existingIdx] = {
        ...albums[existingIdx],
        title,
        summary: document.getElementById('photo-summary').value.trim(),
        images: photoImgDataList.filter(Boolean),
        category: _isShSave ? _offerType : (document.getElementById('photo-category').value.trim() || 'כללי'),
        ageRange: (document.getElementById('photo-age') || {}).value || '',
        region: (document.getElementById('photo-region') || {}).value || '',
        ..._shFields,
        telegramUrl: telegramInput,
        emailUrl: emailInput,
        isAdult,
        adminOnly,
        expiresAt: isTemporary ? (albums[existingIdx].expiresAt && albums[existingIdx].expiresAt > Date.now() ? albums[existingIdx].expiresAt : newExpiresAt) : null
      };
    }
    editingPhotoId = null;
  } else {
    const newAlbumObj = {
      id: 'ph' + Date.now(),
      title,
      summary: document.getElementById('photo-summary').value.trim(),
      images: photoImgDataList.filter(Boolean),
      author: authorNickname,
      authorId: user ? user.uid : '',
      category: _isShSave ? _offerType : (document.getElementById('photo-category').value.trim() || 'כללי'),
      ageRange: (document.getElementById('photo-age') || {}).value || '',
      region: (document.getElementById('photo-region') || {}).value || '',
      ..._shFields,
      categoryColor: _isShSave ? '#e11d48' : '#10b981',
      timestamp: new Date().toLocaleDateString('he-IL'),
      createdAt: Date.now(),
      telegramUrl: telegramInput,
      emailUrl: emailInput,
      isAdult,
      adminOnly,
      expiresAt: newExpiresAt,
      approved: isEditMode
    };
    albums.unshift(newAlbumObj);
    if (!isEditMode && typeof pushPendingSubmission === 'function') pushPendingSubmission(newAlbumObj);
  }

  mainContent.innerHTML = buildPhotosPage(albums, _saveSection);
  // רק מנהל שומר את תוכן העמוד הציבורי. אורח — הבקשה נשמרה כבר ל-pending_submissions,
  // ואין לו הרשאה (ואין צורך) לכתוב את כל העמודים ל-Firebase (מונע תקיעה).
  if (isEditMode) saveCurrentPageContent();
  document.getElementById('photo-modal').style.display = 'none';

  if (!isEditMode && !editingPhotoId) {
    alert('✅ הבקשה נשלחה בהצלחה וממתינה לאישור מנהל! היא תופיע באתר לאחר אישור.');
  }
});

const btnAddPhotosPage = document.getElementById('btn-add-photos-page');
if (btnAddPhotosPage) {
  btnAddPhotosPage.addEventListener('click', () => {
    const title = prompt('שם העמוד של התמונות:') || 'תמונות';
    const newId = 'page-' + Date.now();
    pages.push({ id: newId, title: title.trim(), content: buildPhotosPage(PHOTOS_SAMPLES) });
    topNavPages.push(newId);
    activePageId = newId;
    saveToStorage();
    renderSideMenu();
    renderTopNav();
    renderPage();
  });
}

window.buildStoriesPage = buildStoriesPage;
window.storyDelete = storyDelete;
window.openStoryModal = openStoryModal;
window.storySearch = storySearch;
window.storyOpenDetail = storyOpenDetail;
window.storyGoBack = storyGoBack;

window.buildPhotosPage = buildPhotosPage;
window.photoDelete = photoDelete;
window.openPhotoModal = openPhotoModal;
window.photoSearch = photoSearch;
window.photoOpenDetail = photoOpenDetail;
window.photoGoBack = photoGoBack;
window.photoSelectImage = photoSelectImage;

function photoApprove(id) {
  // האישור מתבצע על עמוד התמונות השמור (לא על מה שמוצג כרגע — למשל עמוד הבית)
  if (!isEditMode && !(typeof isAdmin === 'function' && isAdmin())) return;
  _reqMutate(id, 'approve');
}
window.photoApprove = photoApprove;

// ============================================================
// עמוד "בקשות" — אישור העלאות משתמשים (למנהל בלבד + סנכרון Firebase בזמן אמת)
// ============================================================
let pendingSubmissionsData = {};
let pendingSubmissionsSubscribed = false;

async function pushPendingSubmission(album) {
  if (!album || !album.id) return;
  // מוודאים משתמש (אורח אנונימי אם צריך) כדי שהכתיבה תעבור את כללי Firebase
  if (typeof ensureGuestSignedIn === 'function') { try { await ensureGuestSignedIn(); } catch (e) {} }
  try {
    await set(ref(db, `website/pending_submissions/${album.id}`), album);
  } catch (e) {
    // אורח לרוב חסום מכתיבה ל-pending_submissions ע"י כללי Firebase. עוקפים דרך
    // user_submissions — נתיב שאורחים כבר יכולים לכתוב אליו (טופס "מידע") — ומסמנים
    // כ-content כדי שיופיע בעמוד הבקשות לאישור.
    try {
      await push(ref(db, 'website/user_submissions'), {
        submissionType: 'content',
        album: album,
        name: album.author || 'אורח',
        text: 'בקשת פרסום תוכן: ' + (album.title || ''),
        uid: (typeof auth !== 'undefined' && auth.currentUser) ? auth.currentUser.uid : '',
        registered: !!(typeof auth !== 'undefined' && auth.currentUser),
        timestamp: Date.now()
      });
    } catch (e2) {
      console.error('Failed to save pending submission (both paths):', e2);
    }
  }
}
window.pushPendingSubmission = pushPendingSubmission;

// אוסף בקשות-תוכן שהגיעו דרך user_submissions (מסלול העקיפה של אורחים)
function _pendingFromUserSubs() {
  const out = [];
  try {
    Object.entries(userSubmissionsData || {}).forEach(([k, v]) => {
      if (v && v.submissionType === 'content' && v.album && v.album.id) {
        out.push({ ...v.album, approved: false, __userSubKey: k });
      }
    });
  } catch (e) {}
  return out;
}

function subscribePendingSubmissions() {
  if (pendingSubmissionsSubscribed) return;
  pendingSubmissionsSubscribed = true;
  const rebuild = () => { const el = document.getElementById('pending-requests-list'); if (el) el.innerHTML = pendingRequestsListHTML(); };
  onValue(ref(db, 'website/pending_submissions'), (snap) => {
    pendingSubmissionsData = snap.val() || {};
    rebuild();
  });
  // גם בקשות-תוכן שהגיעו דרך user_submissions (עקיפה לאורחים)
  onValue(ref(db, 'website/user_submissions'), (snap) => {
    userSubmissionsData = snap.val() || {};
    rebuild();
  });
}

function _reqPhotosPageObj() {
  if (typeof pages === 'undefined' || !Array.isArray(pages)) return null;
  const isPhotosPage = p => p && (p.content || '').includes('photos-page') && (p.content || '').includes('data-photos-json') && !(p.content || '').includes('community') && !(p.content || '').includes('user-page');
  // עדיפות לעמוד התמונות האמיתי (data-section="photos") ולא ליד שניה/שותפויות וכו'
  return pages.find(p => isPhotosPage(p) && (p.content || '').includes('data-section="photos"'))
    || pages.find(isPhotosPage);
}

function _reqStoriesPageObj() {
  if (typeof pages === 'undefined' || !Array.isArray(pages)) return null;
  return pages.find(p => p && (p.id === 'page-stories-main' || (p.title || '').includes('סיפורים') || (p.title || '') === 'קומיקס'));
}

function _reqGetStoredStories(spObj) {
  const m = ((spObj && spObj.content) || '').match(/data-stories-json="([^"]*)"/);
  if (!m) return [];
  try { return JSON.parse(decodeURIComponent(m[1])) || []; } catch (e) { return []; }
}

function _reqGetStoredAlbums() {
  const pp = _reqPhotosPageObj();
  if (!pp) return [];
  const m = (pp.content || '').match(/data-photos-json="([^"]*)"/);
  if (!m) return [];
  try { return JSON.parse(decodeURIComponent(m[1])) || []; } catch (e) { return []; }
}

function pendingRequestsListHTML() {
  const fbPending = Object.values(pendingSubmissionsData || {});
  const localAlbums = _reqGetStoredAlbums();
  const localPending = localAlbums.filter(p => p && p.approved === false);

  const map = new Map();
  fbPending.forEach(p => { if (p && p.id) map.set(p.id, p); });
  // בקשות-תוכן של אורחים שהגיעו דרך user_submissions (מסלול העקיפה)
  _pendingFromUserSubs().forEach(p => { if (p && p.id && !map.has(p.id)) map.set(p.id, p); });
  localPending.forEach(p => { if (p && p.id && !map.has(p.id)) map.set(p.id, p); });

  const pending = Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (!pending.length) {
    return `<div style="text-align:center; padding:50px 20px; color:#64748b; font-weight:700; font-size:15px;">אין בקשות ממתינות לאישור 🎉</div>`;
  }

  const cards = pending.map(p => {
    const img = (p.images && p.images[0]) ? p.images[0] : (p.image || '');
    const isStory = p.isStory || p.type === 'story';
    const typeBadge = isStory ? '📖 סיפור' : (p.isWanted ? '🔎 מחפש מוצר' : (p.isClassAction ? '⚖️ תביעה' : '🖼️ תמונה/מוצר'));
    return `
      <div class="req-card" style="display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px; border:1px solid #e2e8f0; border-radius:12px; background:#fff; margin-bottom:12px; box-shadow:0 2px 6px rgba(0,0,0,0.03);">
        <div style="display:flex; align-items:center; gap:14px; flex:1; min-width:0;">
          <div class="req-thumb" style="width:60px; height:60px; border-radius:8px; overflow:hidden; background:#f1f5f9; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            ${img ? `<img src="${escHtml(img)}" alt="" style="width:100%; height:100%; object-fit:cover;">` : '<span style="font-size:24px;">🖼️</span>'}
          </div>
          <div class="req-body" style="display:flex; flex-direction:column; gap:4px; flex:1; min-width:0;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:15px; font-weight:900; color:#0f172a;">${escHtml(p.title || 'ללא כותרת')}</span>
              <span style="background:#f1f5f9; color:#475569; font-size:10.5px; font-weight:700; padding:2px 7px; border-radius:6px;">${typeBadge}</span>
            </div>
            <div style="font-size:12px; color:#64748b;">
              <span>מאת: <strong>${escHtml(p.author || 'משתמש')}</strong></span> ${p.timestamp ? ' · ' + escHtml(p.timestamp) : ''}
            </div>
            ${p.summary ? `<div style="font-size:12.5px; color:#475569; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escHtml(p.summary)}</div>` : ''}
          </div>
        </div>
        <div class="req-actions" style="display:flex; gap:8px; flex-shrink:0;">
          <button class="req-approve" onclick="reqApprove('${artEsc(p.id)}')" style="background:#16a34a; color:#fff; border:none; border-radius:8px; padding:8px 16px; font-size:13px; font-weight:800; cursor:pointer;">✓ אשר</button>
          <button class="req-reject" onclick="reqReject('${artEsc(p.id)}')" style="background:#ef4444; color:#fff; border:none; border-radius:8px; padding:8px 16px; font-size:13px; font-weight:800; cursor:pointer;">✕ דחה</button>
        </div>
      </div>`;
  }).join('');

  return `<div class="req-list">${cards}</div>`;
}

function buildRequestsPage() {
  subscribePendingSubmissions();
  const allowed = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);
  if (!allowed) {
    return `<div class="requests-page" data-page-id="page-requests-main"><div class="comm-inner"><div style="text-align:center; padding:60px 20px; color:#64748b; font-size:16px; font-weight:700;">🔒 עמוד זה גלוי למנהל בלבד.</div></div></div>`;
  }
  return `
    <div class="requests-page" data-page-id="page-requests-main">
      <div class="comm-inner">
        <div style="max-width:820px; margin:0 auto; direction:rtl; text-align:right;">
          <h2 style="font-size:24px; font-weight:900; color:#0f172a; margin:0 0 6px;">📥 בקשות לאישור <span style="font-size:14px; color:#e11d48;">(למנהל בלבד)</span></h2>
          <p style="color:#64748b; font-size:14px; margin:0 0 20px; line-height:1.5;">כל תוכן שמשתמש מעלה מופיע כאן וממתין לאישורך לפני שיפורסם באתר.</p>
          <div id="pending-requests-list">${pendingRequestsListHTML()}</div>
        </div>
      </div>
    </div>`;
}
window.buildRequestsPage = buildRequestsPage;

async function _reqMutate(id, action) {
  const allowed = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);
  if (!allowed) return;

  let targetItem = pendingSubmissionsData[id];
  // תמיד עובדים על הגלריות השמורות בעמוד התמונות (ולא על מה שמוצג כרגע במסך,
  // שעלול להיות עמוד הבית או עמוד הבקשות — ואז האישור היה נשמר למקום הלא נכון)
  let albums = _reqGetStoredAlbums();

  if (!targetItem) {
    targetItem = _pendingFromUserSubs().find(x => x.id === id);
  }
  if (!targetItem) {
    targetItem = albums.find(x => x.id === id);
  }
  // הבקשה אולי עוד לא נטענה (לא נכנסו לעמוד הבקשות) — מביאים אותה ישירות
  if (!targetItem) {
    try {
      const snap = await get(ref(db, `website/pending_submissions/${id}`));
      if (snap.exists()) targetItem = snap.val();
    } catch (e) {}
  }
  // אם הבקשה הגיעה דרך user_submissions (עקיפת אורח) — נמחק אותה משם בסיום
  const _userSubKey = targetItem && targetItem.__userSubKey;
  const _cleanupUserSub = async () => { if (_userSubKey) { try { await set(ref(db, `website/user_submissions/${_userSubKey}`), null); } catch (e) {} } };

  // גם מהגלריות שמוצגות כרגע על המסך (אם הפריט לא נמצא באף מקור אחר)
  if (!targetItem && typeof photoGetAlbums === 'function') {
    try { targetItem = photoGetAlbums().find(x => x && x.id === id); } catch (e) {}
  }

  if (action === 'approve') {
    // מסמנים "מאושר" בכל עמוד שמור שמכיל את הפריט (ייתכנו כמה עמודי תמונות/סיפורים) —
    // ורק אם הוא לא קיים באף עמוד, מוסיפים אותו לעמוד התמונות/הסיפורים
    const updatedInPages = _setApprovedInStoredPages(id);
    if (targetItem && !updatedInPages) {
      targetItem.approved = true;
      if (targetItem.__userSubKey) delete targetItem.__userSubKey;
      if (targetItem.isStory || targetItem.type === 'story') {
        const spObj = _reqStoriesPageObj();
        const stories = _reqGetStoredStories(spObj);
        const existingIdx = stories.findIndex(s => s.id === id);
        if (existingIdx >= 0) {
          stories[existingIdx].approved = true;
        } else {
          stories.unshift(targetItem);
        }
        if (typeof buildStoriesPage === 'function') {
          if (spObj) {
            const _k = ((spObj.content || '').match(/data-story-kind="([^"]+)"/) || [])[1] || 'comics';
            spObj.content = buildStoriesPage(stories, _k);
          }
        }
      } else {
        const existingIdx = albums.findIndex(a => a.id === id);
        if (existingIdx >= 0) {
          albums[existingIdx].approved = true;
        } else {
          albums.unshift(targetItem);
        }
        const ppObj = _reqPhotosPageObj();
        if (ppObj) ppObj.content = buildPhotosPage(albums, targetItem.isWanted ? 'secondhand' : 'photos');
      }
    }
    saveToStorage(); // שומרים את עמוד התמונות/הסיפורים המעודכן
    try { await set(ref(db, `website/pending_submissions/${id}`), null); } catch (e) {}
    await _cleanupUserSub();
    if (typeof showCopyToast === 'function') showCopyToast('✓ התוכן אושר ופורסם בהצלחה!');
  } else if (action === 'reject') {
    albums = albums.filter(x => x.id !== id);
    const ppObj = _reqPhotosPageObj();
    if (ppObj) ppObj.content = buildPhotosPage(albums, 'photos');
    saveToStorage(); // שומרים את עמוד התמונות/הסיפורים המעודכן
    try { await set(ref(db, `website/pending_submissions/${id}`), null); } catch (e) {}
    await _cleanupUserSub();
    if (typeof showCopyToast === 'function') showCopyToast('✕ התוכן נדחה ונמחק.');
  }

  if (typeof renderSideMenu === 'function') { try { renderSideMenu(); } catch (e) {} }
  if (typeof renderPage === 'function') renderPage();
}
function reqApprove(id) { _reqMutate(id, 'approve'); }
function reqReject(id) { if (confirm('לדחות ולמחוק בקשה זו?')) _reqMutate(id, 'reject'); }
window.reqApprove = reqApprove;
window.reqReject = reqReject;

function photoIsLikedLocal(id) {
  try {
    const user = auth.currentUser;
    const localKey = user ? `liked_galleries_${user.uid}` : 'guest_liked_galleries';
    const liked = JSON.parse(localStorage.getItem(localKey) || localStorage.getItem('liked_galleries') || '{}');
    return !!liked[id];
  } catch (e) {
    return false;
  }
}
window.photoIsLikedLocal = photoIsLikedLocal;

async function syncUserLikeBudget(user) {
  if (!user) return 0;
  try {
    const budgetRef = ref(db, `website/users/${user.uid}/likes_data`);
    const snapshot = await get(budgetRef);
    let budget = 5;
    let lastUpdate = Date.now();
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      budget = data.budget !== undefined ? data.budget : 5;
      lastUpdate = data.lastUpdate || Date.now();
      
      const elapsedMs = Date.now() - lastUpdate;
      const oneDayMs = 24 * 60 * 60 * 1000;
      const elapsedDays = Math.floor(elapsedMs / oneDayMs);
      
      if (elapsedDays > 0) {
        budget += elapsedDays * 5;
        lastUpdate = lastUpdate + elapsedDays * oneDayMs;
        await set(budgetRef, { budget, lastUpdate });
      }
    } else {
      await set(budgetRef, { budget, lastUpdate });
    }
    
    localStorage.setItem(`like_budget_${user.uid}`, budget);
    localStorage.setItem(`like_budget_update_${user.uid}`, lastUpdate);
    return budget;
  } catch (e) {
    console.error("שגיאה בסנכרון יתרת הלייקים:", e);
    return parseInt(localStorage.getItem(`like_budget_${user.uid}`) || '5', 10);
  }
}
window.syncUserLikeBudget = syncUserLikeBudget;

function photoToggleLike(id) {
  const isHomeFeed = (typeof activePageId !== 'undefined' && activePageId === 'page-home-feed') ||
                     (mainContent && !!mainContent.querySelector('.home-feed-page'));

  let item = null;
  let itemKind = 'photo'; // 'photo' | 'story'
  let storiesContainer = null;
  let photosContainer = null;
  let storiesList = [];
  let photosList = [];

  if (isHomeFeed) {
    // בעמוד הבית מחפשים תחילה בקונטיינר הסיפורים/קומיקס, ואז בקונטיינר התמונות
    storiesContainer = mainContent.querySelector('.home-feed-stories, .stories-page');
    if (storiesContainer && storiesContainer.dataset && storiesContainer.dataset.storiesJson) {
      try {
        storiesList = JSON.parse(decodeURIComponent(storiesContainer.dataset.storiesJson));
        if (Array.isArray(storiesList)) {
          item = storiesList.find(s => s && s.id === id);
          if (item) itemKind = 'story';
        }
      } catch (e) {}
    }

    if (!item) {
      photosContainer = mainContent.querySelector('.home-feed-photos, .photos-page');
      if (photosContainer && photosContainer.dataset && photosContainer.dataset.photosJson) {
        try {
          photosList = JSON.parse(decodeURIComponent(photosContainer.dataset.photosJson));
          if (Array.isArray(photosList)) {
            item = photosList.find(p => p && p.id === id);
            if (item) itemKind = 'photo';
          }
        } catch (e) {}
      }
    }
  } else {
    // עמוד שאינו עמוד הבית — בדיקה האם זה עמוד סיפורים או עמוד תמונות/קהילה
    const sContainer = mainContent.querySelector('.stories-page');
    const pContainer = mainContent.querySelector('.photos-page, .community-page, .user-page');

    if (sContainer && sContainer.dataset && sContainer.dataset.storiesJson) {
      try {
        storiesList = JSON.parse(decodeURIComponent(sContainer.dataset.storiesJson));
        if (Array.isArray(storiesList)) {
          item = storiesList.find(s => s && s.id === id);
          if (item) {
            itemKind = 'story';
            storiesContainer = sContainer;
          }
        }
      } catch (e) {}
    }

    if (!item && pContainer && pContainer.dataset && pContainer.dataset.photosJson) {
      try {
        photosList = JSON.parse(decodeURIComponent(pContainer.dataset.photosJson));
        if (Array.isArray(photosList)) {
          item = photosList.find(p => p && p.id === id);
          if (item) {
            itemKind = 'photo';
            photosContainer = pContainer;
          }
        }
      } catch (e) {}
    }
  }

  // אם הפריט לא נמצא בקונטיינר ה-DOM המקומי, מחפשים אותו במאגר הכללי של העמודים
  if (!item) {
    if (typeof getAllStoriesFromPages === 'function') {
      const allStories = getAllStoriesFromPages();
      item = allStories.find(s => s && s.id === id);
      if (item) itemKind = 'story';
    }
    if (!item && typeof getPhotosForHome === 'function') {
      const allPhotos = getPhotosForHome();
      item = allPhotos.find(p => p && p.id === id);
      if (item) itemKind = 'photo';
    }
  }

  // אם עדיין לא נמצא, יוצאים
  if (!item) return;

  const user = auth.currentUser;
  const localKey = user ? `liked_galleries_${user.uid}` : 'guest_liked_galleries';

  let liked = {};
  try {
    liked = JSON.parse(localStorage.getItem(localKey) || localStorage.getItem('liked_galleries') || '{}');
  } catch (e) {}

  const isAddingLike = !liked[id];
  let budget = 999;
  if (user) {
    budget = parseInt(localStorage.getItem(`like_budget_${user.uid}`) || '5', 10);
    if (isAddingLike && budget <= 0) {
      alert("אין לך לייקים פנויים ביתרה! הלייקים שלך מצטברים בקצב של 5 לייקים נוספים בכל יום.");
      return;
    }
  }

  if (liked[id]) {
    delete liked[id];
    item.likes = Math.max(0, (item.likes || 0) - 1);
    if (user) budget += 1;
  } else {
    liked[id] = true;
    item.likes = (item.likes || 0) + 1;
    if (user) budget = Math.max(0, budget - 1);
  }

  if (user) {
    localStorage.setItem(`like_budget_${user.uid}`, budget);
  }
  localStorage.setItem(localKey, JSON.stringify(liked));
  localStorage.setItem('liked_galleries', JSON.stringify(liked));

  const isNowLiked = !!liked[id];
  if (isNowLiked && typeof trackEvent === 'function') trackEvent('like');

  // מונה הלייקים נשמר ב-Firebase בנתיב נפרד (גולשים לא כותבים ל-pages)
  const likeDelta = isNowLiked ? 1 : -1;
  const likeBase = Math.max(0, (item.likes || 0) - likeDelta);
  try {
    runTransaction(ref(db, `website/item_likes/${id}`), cur =>
      Math.max(0, (typeof cur === 'number' ? cur : likeBase) + likeDelta)
    ).catch(() => {});
  } catch (e) {}

  // 1. עדכון ויזואלי מיידי של כל כפתורי הלב של פריט זה בכל מקום ב-DOM (בעמוד הבית או בכל עמוד אחר)
  const allHearts = document.querySelectorAll('.art-heart-overlay');
  allHearts.forEach(btn => {
    const card = btn.closest('.art-row, .art-card, .story-card');
    const onclickAttr = (btn.getAttribute('onclick') || '') + ' ' + (card ? (card.getAttribute('onclick') || '') : '');
    if (onclickAttr.includes(id)) {
      btn.classList.toggle('liked', isNowLiked);
      const svg = btn.querySelector('svg');
      if (svg) {
        svg.setAttribute('fill', isNowLiked ? '#ff2e4d' : 'none');
        svg.setAttribute('stroke', isNowLiked ? '#ff2e4d' : '#ffffff');
      }
    }
  });

  // 2. עדכון כפתורי לייק תחת photo-like-btn (כגון בעמודי פרטים)
  const allPhotoLikeBtns = document.querySelectorAll('.photo-like-btn');
  allPhotoLikeBtns.forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick') || '';
    if (onclickAttr.includes(id)) {
      btn.style.background = isNowLiked ? '#ffe4e6' : '#ffffff';
      btn.style.borderColor = isNowLiked ? '#e11d48' : '#e2e8f0';
      btn.style.color = isNowLiked ? '#e11d48' : '#1e293b';
      const svg = btn.querySelector('svg');
      if (svg) {
        svg.setAttribute('fill', isNowLiked ? '#e11d48' : 'none');
        svg.setAttribute('stroke', '#e11d48');
      }
      const span = btn.querySelector('span');
      if (span) {
        span.textContent = `${item.likes || 0} לייקים`;
      }
    }
  });

  // 3. עדכון כפתורי art-telegram-btn של לייק
  const allTgLikeBtns = document.querySelectorAll('.art-telegram-btn');
  allTgLikeBtns.forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick') || '';
    if (onclickAttr.includes(id) && onclickAttr.includes('photoToggleLike')) {
      btn.style.color = isNowLiked ? '#ff2e4d' : '#ffffff';
      const svg = btn.querySelector('svg');
      if (svg) {
        svg.setAttribute('fill', isNowLiked ? '#ff2e4d' : 'none');
        svg.setAttribute('stroke', isNowLiked ? '#ff2e4d' : 'currentColor');
      }
      const span = btn.querySelector('span');
      if (span && !isNaN(parseInt(span.textContent, 10))) {
        span.textContent = item.likes || 0;
      }
    }
  });

  // 4. עדכון מונה הלייקים בכרטיסים ובשורות (❤️ X לייקים)
  const allCardsAndRows = document.querySelectorAll('.art-row, .art-card, .story-card');
  allCardsAndRows.forEach(row => {
    const onclickAttr = row.getAttribute('onclick') || '';
    if (onclickAttr.includes(id)) {
      row.querySelectorAll('span').forEach(sp => {
        if (sp.textContent.includes('לייקים')) {
          sp.textContent = `❤️ ${item.likes || 0} לייקים`;
        }
      });
    }
  });

  // 5. שמירת הנתונים המעודכנים ב-DOM של עמוד הבית (dataset)
  if (isHomeFeed) {
    if (itemKind === 'story' && storiesContainer && storiesList.length) {
      storiesContainer.dataset.storiesJson = encodeURIComponent(JSON.stringify(storiesList));
    } else if (itemKind === 'photo' && photosContainer && photosList.length) {
      photosContainer.dataset.photosJson = encodeURIComponent(JSON.stringify(photosList));
    }
  }

  // 6. סנכרון ושמירה במאגר הראשי (pages) וב-localStorage / Firebase
  try {
    if (typeof pages !== 'undefined' && Array.isArray(pages)) {
      let pageModified = false;
      pages.forEach(p => {
        if (!p || !p.content) return;
        if (itemKind === 'story' && p.content.includes('data-stories-json=')) {
          const m = p.content.match(/data-stories-json="([^"]*)"/);
          if (m) {
            try {
              let arr = JSON.parse(decodeURIComponent(m[1]));
              if (Array.isArray(arr)) {
                const target = arr.find(x => x && x.id === id);
                if (target) {
                  target.likes = item.likes;
                  p.content = p.content.replace(/data-stories-json="[^"]*"/, `data-stories-json="${encodeURIComponent(JSON.stringify(arr))}"`);
                  pageModified = true;
                }
              }
            } catch (e) {}
          }
        } else if (itemKind === 'photo' && p.content.includes('data-photos-json=')) {
          const m = p.content.match(/data-photos-json="([^"]*)"/);
          if (m) {
            try {
              let arr = JSON.parse(decodeURIComponent(m[1]));
              if (Array.isArray(arr)) {
                const target = arr.find(x => x && x.id === id);
                if (target) {
                  target.likes = item.likes;
                  p.content = p.content.replace(/data-photos-json="[^"]*"/, `data-photos-json="${encodeURIComponent(JSON.stringify(arr))}"`);
                  pageModified = true;
                }
              }
            } catch (e) {}
          }
        }
      });
      if (pageModified && typeof saveToStorage === 'function') {
        saveToStorage();
      }
    }
  } catch (e) {
    console.error('Error saving updated likes to pages:', e);
  }

  // 7. אם אנחנו בעמוד תמונות רגיל (לא עמוד הבית) ואיננו בתצוגת פיד, נשמור את תוכן העמוד הנוכחי
  if (!isHomeFeed) {
    saveCurrentPageContent();
  }

  // 8. סנכרון תקציב הלייקים ל-Firebase
  if (user) {
    setTimeout(async () => {
      try {
        const budgetRef = ref(db, `website/users/${user.uid}/likes_data`);
        update(budgetRef, { budget: budget }).catch(() => {});
      } catch (e) {}
    }, 0);
  }
}
window.photoToggleLike = photoToggleLike;

function photoIsSavedLocal(id) {
  try {
    const user = auth.currentUser;
    const localKey = user ? `saved_galleries_${user.uid}` : 'guest_saved_galleries';
    const saved = JSON.parse(localStorage.getItem(localKey) || '{}');
    return !!saved[id];
  } catch (e) {
    return false;
  }
}
window.photoIsSavedLocal = photoIsSavedLocal;

function photoToggleSave(id, btnEl) {
  if (typeof trackEvent === 'function') trackEvent('save');
  const user = auth.currentUser;
  const localKey = user ? `saved_galleries_${user.uid}` : 'guest_saved_galleries';

  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(localKey) || '{}');
  } catch (e) {}

  const isNowSaved = !saved[id];
  if (isNowSaved) {
    saved[id] = true;
  } else {
    delete saved[id];
  }

  localStorage.setItem(localKey, JSON.stringify(saved));
  
  if (user) {
    try {
      const userSavedRef = ref(db, `website/users/${user.uid}/saved_galleries`);
      set(userSavedRef, saved);
    } catch (e) {}
  }

  // עדכון מיידי ומקומי של כפתורי שמירה של פריט זה בכל מקום בעמוד
  const allSaveButtons = document.querySelectorAll(`button[onclick*="photoToggleSave('${id}')"], button[onclick*='photoToggleSave("${id}")']`);
  allSaveButtons.forEach(btn => {
    btn.classList.toggle('is-saved', isNowSaved);
    btn.title = isNowSaved ? 'הסר משמורים' : 'שמור לצפייה מאוחרת';
    const span = btn.querySelector('span');
    if (span) span.textContent = isNowSaved ? 'שמור' : 'שמירה';
    const svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', isNowSaved ? '#ffffff' : 'none');
  });

  // אם זה כפתור ספציפי שהועבר
  if (btnEl) {
    btnEl.classList.toggle('is-saved', isNowSaved);
    btnEl.title = isNowSaved ? 'הסר משמורים' : 'שמור לצפייה מאוחרת';
    const span = btnEl.querySelector('span');
    if (span) span.textContent = isNowSaved ? 'שמור' : 'שמירה';
    const svg = btnEl.querySelector('svg');
    if (svg) svg.setAttribute('fill', isNowSaved ? '#ffffff' : 'none');
  }

  if (typeof showCopyToast === 'function') {
    showCopyToast(isNowSaved ? 'הפריט נשמר בהצלחה! 🔖' : 'הפריט הוסר מהשמורים');
  }

  // אם אנחנו בתוך עמוד תצוגת פריט מפורט בלבד
  const isDetailView = mainContent.querySelector('.art-detail') !== null;
  const activeDetailId = isDetailView ? mainContent.querySelector('.art-detail').dataset.photoId : null;
  if (isDetailView && activeDetailId && activeDetailId === id) {
    // שומרים נתון מבלי להעיף את המשתמש
    const container = mainContent.querySelector('.photos-page, .community-page, .user-page');
    if (container && container.dataset && container.dataset.photosJson) {
      try {
        let albums = JSON.parse(decodeURIComponent(container.dataset.photosJson));
        container.dataset.photosJson = encodeURIComponent(JSON.stringify(albums));
      } catch(e) {}
    }
  }
}
window.photoToggleSave = photoToggleSave;

// ---- "שמורים": חלון בסגנון יוניטי עם הגלריות השמורות כריבועים ----
function photoGetSavedAlbums() {
  const user = auth.currentUser;
  if (!user) return [];
  let map = {};
  try { map = JSON.parse(localStorage.getItem(`saved_galleries_${user.uid}`) || '{}'); } catch (e) {}
  const albums = (typeof photoGetAlbums === 'function') ? photoGetAlbums() : [];
  return albums.filter(a => map[a.id]);
}

// drawer גנרי בסגנון "שמורים" — משמש גם להיסטוריה וללייקים
function _drawerCell(id, img, title) {
  return `<div class="saved-cell" onclick="closeSavedModal(); photoOpenDetail('${artEsc(id)}')" title="${escHtml(title || '')}">
    <div class="saved-thumb">${img ? `<img src="${escHtml(img)}" alt="">` : '🖼️'}</div>
    <div class="saved-name">${escHtml(title || 'ללא שם')}</div>
  </div>`;
}

function openSideDrawer(title, inner, headerExtra) {
  let modal = document.getElementById('saved-modal');
  if (!modal) { modal = document.createElement('div'); modal.id = 'saved-modal'; document.body.appendChild(modal); }
  modal.innerHTML = `
    <div class="saved-backdrop" onclick="closeSavedModal()"></div>
    <div class="saved-window">
      <div class="saved-titlebar">
        <span class="saved-title">${title}</span>
        <div style="display:flex; align-items:center; gap:10px;">
          ${headerExtra || ''}
          <button class="saved-close" onclick="closeSavedModal()" title="סגור">✕</button>
        </div>
      </div>
      <div class="saved-body">${inner}</div>
    </div>`;
  modal.style.display = 'flex';
}
window.openSideDrawer = openSideDrawer;

function openSavedModal() {
  const bmHTML = (typeof storyBookmarksHTML === 'function') ? storyBookmarksHTML() : '';
  let galleriesHTML;
  if (!auth.currentUser) {
    galleriesHTML = `<div class="saved-empty">🔒 התחבר כדי לראות את הגלריות השמורות שלך</div>`;
  } else {
    const saved = photoGetSavedAlbums();
    galleriesHTML = saved.length
      ? `<div class="saved-grid">${saved.map(a => _drawerCell(a.id, (a.images && a.images[0]) ? a.images[0] : a.image, a.title)).join('')}</div>`
      : `<div class="saved-empty">אין גלריות שמורות עדיין.<br>לחצו על "שמירה" בכרטיס כדי לשמור.</div>`;
  }
  openSideDrawer('🔖 שמורים', bmHTML + galleriesHTML);
}
window.openSavedModal = openSavedModal;

// drawer "לייקים" — נפתח מאייקון הלב בסרגל העליון
function photoGetLikedAlbums() {
  const user = auth.currentUser;
  const localKey = user ? `liked_galleries_${user.uid}` : 'guest_liked_galleries';
  let map = {};
  try { map = JSON.parse(localStorage.getItem(localKey) || localStorage.getItem('liked_galleries') || '{}'); } catch (e) {}
  const albums = (typeof photoGetAlbums === 'function') ? photoGetAlbums() : [];
  return albums.filter(a => map[a.id]);
}
function openLikesDrawer() {
  const liked = photoGetLikedAlbums();
  const inner = liked.length
    ? `<div class="saved-grid">${liked.map(a => _drawerCell(a.id, (a.images && a.images[0]) ? a.images[0] : a.image, a.title)).join('')}</div>`
    : `<div class="saved-empty">אין פריטים בלייקים עדיין.<br>לחצו על הלב בכרטיס כדי לסמן לייק.</div>`;
  openSideDrawer('❤️ הלייקים שלי', inner);
}
window.openLikesDrawer = openLikesDrawer;

// drawer "היסטוריית צפייה" — נפתח מאייקון השעון בסרגל העליון
function openHistoryDrawer(skipPull) {
  // מציגים מיד את המקומית, ואז מסנכרנים מהחשבון ומרעננים אם השתנה
  if (!skipPull) _historyPull().then(changed => {
    const m = document.getElementById('saved-modal');
    if (changed && m && m.style.display !== 'none') openHistoryDrawer(true);
  });
  let history = [];
  try { history = JSON.parse(localStorage.getItem('watch_history') || '[]'); } catch (e) {}
  const inner = history.length
    ? `<div class="saved-grid">${history.map(item => _historyCell(item)).join('')}</div>`
    : `<div class="saved-empty">היסטוריית הצפייה שלך ריקה.<br>כל תמונה, סיפור או רעיון שתיכנס אליהם יופיעו כאן.</div>`;
  const clearBtn = history.length
    ? `<button onclick="clearHistoryDrawer()" title="נקה את כל ההיסטוריה" style="background:transparent; color:#f87171; border:1px solid rgba(248,113,113,0.5); border-radius:8px; padding:6px 14px; font-size:13px; font-weight:800; cursor:pointer;">🗑️ נקה היסטוריה</button>`
    : '';
  openSideDrawer('🕒 היסטוריית צפייה', inner, clearBtn);
}
window.openHistoryDrawer = openHistoryDrawer;

// תא בהיסטוריה — לחיצה מנתבת לסיפור/תמונה/רעיון המתאים
function _historyCell(item) {
  const t = item.type || '';
  return `<div class="saved-cell" onclick="openHistoryItem('${artEsc(item.id)}','${artEsc(t)}')" title="${escHtml(item.title || '')}">
    <div class="saved-thumb">${item.img ? `<img src="${escHtml(item.img)}" alt="">` : '🖼️'}</div>
    <div class="saved-name">${escHtml(item.title || 'ללא שם')}</div>
  </div>`;
}

// פותח פריט מההיסטוריה לפי סוגו (עם ניחוש לפי קידומת המזהה לפריטים ישנים ללא type)
function openHistoryItem(id, type) {
  closeSavedModal();
  let kind = (type && type !== 'photo') ? type : '';
  if (!kind) {
    if (/^idea/i.test(id)) kind = 'idea';
    else if (/^ph/i.test(id)) kind = 'photo';
    else if (/^s/i.test(id)) kind = 'story';
    else kind = type || 'photo';
  }
  const findPage = (pred) => (typeof pages !== 'undefined' && Array.isArray(pages)) ? pages.find(pred) : null;
  if (kind === 'story') {
    const sp = findPage(p => p && ((p.content || '').includes('stories-page') || (p.title || '').includes('סיפורים')));
    if (sp) { window.__detailOpen = false; activePageId = sp.id; if (typeof renderTopNav === 'function') renderTopNav(); if (typeof renderPage === 'function') renderPage(); }
    setTimeout(() => { if (typeof storyOpenDetail === 'function') storyOpenDetail(id); }, 90);
  } else if (kind === 'idea') {
    const ip = findPage(p => p && (p.id === 'page-ideas-main' || (p.content || '').includes('ideas-page') || (p.title || '').includes('רעיונות')));
    if (ip) { window.__detailOpen = false; activePageId = ip.id; if (typeof renderTopNav === 'function') renderTopNav(); if (typeof renderPage === 'function') renderPage(); }
  } else {
    if (typeof feedOpenGallery === 'function') feedOpenGallery(id);
  }
}
window.openHistoryItem = openHistoryItem;

// ניקוי היסטוריית הצפייה מתוך ה-drawer (מרענן את ה-drawer עצמו)
function clearHistoryDrawer() {
  if (!confirm('האם ברצונך למחוק את כל היסטוריית הצפייה?')) return;
  try { localStorage.removeItem('watch_history'); } catch (e) {}
  _historyPush([]);
  openHistoryDrawer(true);
}
window.clearHistoryDrawer = clearHistoryDrawer;

function closeSavedModal() {
  const m = document.getElementById('saved-modal');
  if (m) m.style.display = 'none';
}
window.closeSavedModal = closeSavedModal;

// ============================================================
// הודעות פרטיות בין משתמשים (DM) — תיבת דואר בסגנון טלגרם/וואטסאפ
// ============================================================
let dmConversations = {};
let dmConvSubscribed = false;
let dmActiveConv = null;
let dmThreadUnsub = null;
let dmThreadMessages = [];
let dmAdminUid = '';

function dmConvId(a, b) { return [a, b].sort().join('__'); }
function dmName() { return (typeof liveChatUserName === 'function') ? liveChatUserName() : 'משתמש'; }
function dmTime(ts) { return ts ? new Date(ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : ''; }

function subscribeMyDMs() {
  const u = auth.currentUser;
  if (!u || dmConvSubscribed) return;
  dmConvSubscribed = true;
  // מביאים את ה-uid של המנהל לשיחה הנעוצה
  try { get(ref(db, 'website/admin_uid')).then(s => { dmAdminUid = s.val() || ''; const el = document.getElementById('dm-conv-list'); if (el) el.innerHTML = dmConvListHTML(); }); } catch (e) {}
  onValue(ref(db, `website/user_dms/${u.uid}`), snap => {
    dmConversations = snap.val() || {};
    const el = document.getElementById('dm-conv-list');
    if (el) el.innerHTML = dmConvListHTML();
    dmUpdateBadge();
  });
}

function dmOpenAdmin() {
  const u = auth.currentUser;
  if (!u) { if (typeof openLiveChatLogin === 'function') openLiveChatLogin(); return; }
  const go = (adminUid) => {
    if (!adminUid || adminUid === u.uid) { if (typeof showCopyToast === 'function') showCopyToast('שיחת מנהל אינה זמינה כרגע'); return; }
    dmOpenConv(dmConvId(u.uid, adminUid), adminUid, 'מנהל האתר 👑');
  };
  if (dmAdminUid) go(dmAdminUid);
  else { try { get(ref(db, 'website/admin_uid')).then(s => { dmAdminUid = s.val() || ''; go(dmAdminUid); }); } catch (e) { go(''); } }
}
window.dmOpenAdmin = dmOpenAdmin;

function dmUnreadCount() {
  let n = 0;
  Object.values(dmConversations || {}).forEach(c => { if (c && c.unread) n++; });
  return n;
}
function dmUpdateBadge() {
  const n = dmUnreadCount();
  document.querySelectorAll('.dm-open-badge').forEach(b => {
    b.textContent = n > 0 ? n : '';
    b.style.display = n > 0 ? 'inline-flex' : 'none';
  });
  const nb = document.getElementById('notif-badge');
  if (nb) { nb.textContent = n > 0 ? n : ''; nb.style.display = n > 0 ? 'inline-flex' : 'none'; }
  const panel = document.getElementById('notif-panel');
  if (panel && panel.style.display === 'block') { const list = panel.querySelector('.notif-list'); if (list) list.innerHTML = notificationsHTML(); }
}

// ---- פעמון התראות (בהדר ליד "אורח") — מציג הודעות שלא נקראו ----
function notificationsHTML() {
  if (!auth.currentUser) return '<div class="notif-empty">התחבר כדי לראות התראות</div>';
  const unread = Object.entries(dmConversations || {}).filter(([id, c]) => c && c.unread).sort((a, b) => (b[1].lastTime || 0) - (a[1].lastTime || 0));
  if (!unread.length) return '<div class="notif-empty">אין התראות חדשות 🔔</div>';
  return unread.map(([cid, c]) => `
    <div class="notif-item" onclick="notifOpen('${artEsc(cid)}','${artEsc(c.otherUid || '')}','${artEsc(c.otherName || '')}')">
      <div class="notif-item-title">💬 הודעה מ${escHtml(c.otherName || 'משתמש')}</div>
      <div class="notif-item-sub">${escHtml((c.lastText || '').slice(0, 42))}</div>
    </div>`).join('');
}
function toggleNotifications(e) {
  if (e) e.stopPropagation();
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  if (panel.style.display === 'block') { panel.style.display = 'none'; return; }
  if (auth.currentUser && typeof subscribeMyDMs === 'function') subscribeMyDMs();
  panel.innerHTML = `<div class="notif-head">🔔 התראות</div><div class="notif-list">${notificationsHTML()}</div>`;
  panel.style.display = 'block';
}
window.toggleNotifications = toggleNotifications;
function notifOpen(cid, uid, name) {
  const p = document.getElementById('notif-panel'); if (p) p.style.display = 'none';
  if (typeof openMessages === 'function') { openMessages(); setTimeout(() => dmOpenConv(cid, uid, name || 'משתמש'), 60); }
}
window.notifOpen = notifOpen;
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const p = document.getElementById('notif-panel');
    const b = document.getElementById('notif-bell');
    if (p && p.style.display === 'block' && !p.contains(e.target) && b && !b.contains(e.target)) p.style.display = 'none';
  });
}

// חלון חיצוני — רשימת שיחות (טלגרם, בלי תמונות פרופיל)
function dmConvListHTML() {
  const isAdminUser = (typeof isAdmin === 'function' && isAdmin());
  // שיחה נעוצה עם מנהל האתר בראש הרשימה (לכל מי שאינו המנהל)
  const _act = (typeof dmActiveConv === 'object' && dmActiveConv) ? dmActiveConv.convId : '';
  const pinned = isAdminUser ? '' : `
    <div class="dm-conv dm-conv-pinned" onclick="dmOpenAdmin()">
      <div class="dm-conv-avatar dm-conv-avatar-admin">👑</div>
      <div class="dm-conv-main">
        <div class="dm-conv-name">מנהל האתר</div>
        <div class="dm-conv-last">שלחו הודעה לצוות האתר</div>
      </div>
    </div>`;
  const adminUid = dmAdminUid;
  const list = Object.entries(dmConversations)
    .filter(([cid, c]) => !(adminUid && c && c.otherUid === adminUid)) // לא לשכפל את שיחת המנהל
    .sort((a, b) => (b[1].lastTime || 0) - (a[1].lastTime || 0));
  if (!list.length) return pinned + '<div class="dm-empty">אין עוד שיחות.<br>אפשר לשלוח הודעה מדף של גלריה.</div>';
  return pinned + list.map(([cid, c]) => {
    const nm = c.otherName || 'משתמש';
    return `
    <div class="dm-conv${cid === _act ? ' active' : ''}" data-cid="${escHtml(cid)}" onclick="dmOpenConv('${artEsc(cid)}','${artEsc(c.otherUid || '')}','${artEsc(nm)}')">
      <div class="dm-conv-avatar">${escHtml(nm.trim().charAt(0))}</div>
      <div class="dm-conv-main">
        <div class="dm-conv-name">${escHtml(nm)}${c.unread ? ' <span class="dm-dot"></span>' : ''}</div>
        <div class="dm-conv-last">${escHtml((c.lastText || '').slice(0, 42))}</div>
      </div>
      <div class="dm-conv-time">${dmTime(c.lastTime)}</div>
    </div>`;
  }).join('');
}

function openMessages() {
  if (!auth.currentUser) { if (typeof openLiveChatLogin === 'function') openLiveChatLogin(); return; }
  subscribeMyDMs();
  let modal = document.getElementById('messages-modal');
  if (!modal) { modal = document.createElement('div'); modal.id = 'messages-modal'; document.body.appendChild(modal); }
  // פריסת שני פאנלים בסגנון iMessage: רשימת שיחות + חלון צ'אט
  modal.innerHTML = `
    <div class="dm-backdrop" onclick="closeMessages()"></div>
    <div class="dm-window dm-imessage">
      <div class="dm-sidebar">
        <div class="dm-titlebar">
          <span class="dm-title">הודעות</span>
          <button class="dm-close" onclick="closeMessages()" title="סגור">✕</button>
        </div>
        <div class="dm-conv-list" id="dm-conv-list">${dmConvListHTML()}</div>
      </div>
      <div class="dm-main" id="dm-main">
        <div class="dm-placeholder"><div class="dm-placeholder-icon">💬</div><div>בחרו שיחה כדי להתחיל</div></div>
      </div>
    </div>`;
  modal.style.display = 'flex';
  dmActiveConv = null;
}
window.openMessages = openMessages;

function closeMessages() {
  const m = document.getElementById('messages-modal');
  if (m) m.style.display = 'none';
  if (dmThreadUnsub) { dmThreadUnsub(); dmThreadUnsub = null; }
  dmActiveConv = null;
}
window.closeMessages = closeMessages;

// רענון רשימת השיחות (הפאנל תמיד גלוי). במובייל — חזרה מהצ'אט לרשימה.
function dmShowList() {
  const el = document.getElementById('dm-conv-list');
  if (el) el.innerHTML = dmConvListHTML();
  const win = document.querySelector('.dm-window');
  if (win) win.classList.remove('dm-show-thread');
  const main = document.getElementById('dm-main');
  if (main && !dmActiveConv) main.innerHTML = `<div class="dm-placeholder"><div class="dm-placeholder-icon">💬</div><div>בחרו שיחה כדי להתחיל</div></div>`;
}
window.dmShowList = dmShowList;

// טעינת שיחה לפאנל הצ'אט (הרשימה נשארת גלויה) — סגנון iMessage
function dmOpenConv(convId, otherUid, otherName, prefill) {
  dmActiveConv = { convId, otherUid, otherName };
  if (dmThreadUnsub) { dmThreadUnsub(); dmThreadUnsub = null; }
  // אם חלון ההודעות לא פתוח — פותחים אותו קודם
  if (!document.getElementById('dm-main')) { openMessages(); dmActiveConv = { convId, otherUid, otherName }; }
  // סימון השיחה הפעילה ברשימה
  document.querySelectorAll('.dm-conv').forEach(c => c.classList.toggle('active', c.getAttribute('data-cid') === convId));
  const win = document.querySelector('.dm-window');
  if (win) win.classList.add('dm-show-thread');
  const initial = (otherName || 'מ').trim().charAt(0);
  const s = document.getElementById('dm-main');
  if (s) s.innerHTML = `
    <div class="dm-thread-head">
      <button class="dm-back" onclick="dmShowList()" title="חזרה">›</button>
      <div class="dm-thread-avatar">${initial}</div>
      <span class="dm-title">${escHtml(otherName || 'משתמש')}</span>
      <button class="dm-close" onclick="closeMessages()" title="סגור">✕</button>
    </div>
    <div class="dm-messages" id="dm-messages"><div class="dm-empty">טוען…</div></div>
    <div class="dm-input-row">
      <input id="dm-input" type="text" maxlength="1000" placeholder="iMessage" onkeydown="if(event.key==='Enter'){event.preventDefault(); dmSendCurrent();}">
      <button class="dm-send" onclick="dmSendCurrent()" title="שלח">➤</button>
    </div>`;
  // מסמנים כנקרא
  const u = auth.currentUser;
  if (u) { try { update(ref(db, `website/user_dms/${u.uid}/${convId}`), { unread: false }); } catch (e) {} }
  dmThreadUnsub = onValue(ref(db, `website/dms/${convId}/messages`), snap => {
    const val = snap.val() || {};
    dmThreadMessages = Object.values(val).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const box = document.getElementById('dm-messages');
    if (box) { box.innerHTML = dmMessagesHTML(); box.scrollTop = box.scrollHeight; }
  });
  setTimeout(() => {
    const i = document.getElementById('dm-input');
    if (i) { if (prefill) i.value = prefill; i.focus(); }
  }, 80);
}
window.dmOpenConv = dmOpenConv;

function dmMessagesHTML() {
  const myUid = auth.currentUser ? auth.currentUser.uid : '';
  if (!dmThreadMessages.length) return '<div class="dm-empty">אין הודעות עדיין — כתבו את הראשונה!</div>';
  return dmThreadMessages.map(m => {
    const mine = m.from === myUid;
    return `<div class="dm-msg ${mine ? 'mine' : 'theirs'}">
      <div class="dm-bubble"><span class="dm-text">${escHtml(m.text || '')}</span><span class="dm-msg-time">${dmTime(m.timestamp)}</span></div>
    </div>`;
  }).join('');
}

async function dmSendCurrent() {
  const u = auth.currentUser;
  if (!u || !dmActiveConv) return;
  const inp = document.getElementById('dm-input');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;
  inp.value = '';
  const { convId, otherUid, otherName } = dmActiveConv;
  const now = Date.now();
  const myName = dmName();
  try {
    await push(ref(db, `website/dms/${convId}/messages`), { from: u.uid, fromName: myName, text: text.slice(0, 1000), timestamp: now });
    if (typeof trackEvent === 'function') trackEvent('dm_send');
    await update(ref(db, `website/user_dms/${u.uid}/${convId}`), { otherUid, otherName, lastText: text.slice(0, 60), lastTime: now, unread: false });
    await update(ref(db, `website/user_dms/${otherUid}/${convId}`), { otherUid: u.uid, otherName: myName, lastText: text.slice(0, 60), lastTime: now, unread: true });
  } catch (e) {
    console.error('dm send failed', e);
    if (typeof showCopyToast === 'function') showCopyToast('שגיאה בשליחת ההודעה');
  }
}
window.dmSendCurrent = dmSendCurrent;

// התחלת שיחה עם משתמש (למשל מדף גלריה)
function dmStartWith(otherUid, otherName, prefill) {
  const u = auth.currentUser;
  if (!u) { if (typeof openLiveChatLogin === 'function') openLiveChatLogin(); return; }
  if (!otherUid) { if (typeof showCopyToast === 'function') showCopyToast('לא ניתן לשלוח הודעה למשתמש זה'); return; }
  if (otherUid === u.uid) { if (typeof showCopyToast === 'function') showCopyToast('זו המודעה שלך 🙂'); return; }
  openMessages();
  setTimeout(() => dmOpenConv(dmConvId(u.uid, otherUid), otherUid, otherName || 'משתמש', prefill), 60);
}
window.dmStartWith = dmStartWith;

// התחלת שיחה עם התייחסות לגלריה מסוימת (מדף התמונה)
function dmStartAboutGallery(otherUid, otherName, albumId) {
  let prefill = '';
  try {
    const albums = (typeof photoGetAlbums === 'function') ? photoGetAlbums() : [];
    const a = albums.find(x => String(x.id) === String(albumId));
    if (a && a.title) prefill = `שלום! פנייה לגבי הגלריה: "${String(a.title).slice(0, 120)}"`;
  } catch (e) {}
  dmStartWith(otherUid, otherName || 'משתמש', prefill);
}
window.dmStartAboutGallery = dmStartAboutGallery;

// ============================================================
// מעקב אחרי משתמשים + תגובות על גלריה
// ============================================================
let followedUids = {};
let followsSubscribed = false;
function subscribeMyFollows() {
  const u = auth.currentUser;
  if (!u || followsSubscribed) return;
  followsSubscribed = true;
  onValue(ref(db, `website/user_follows/${u.uid}`), snap => {
    followedUids = snap.val() || {};
    if (activePageId === 'page-feed-main' && typeof renderPage === 'function') renderPage();
  });
}
function isFollowing(uid) { return !!(uid && followedUids[uid]); }
window.isFollowing = isFollowing;

async function toggleFollow(uid, name, btn) {
  const u = auth.currentUser;
  if (!u) { if (typeof openLiveChatLogin === 'function') openLiveChatLogin(); return; }
  if (!uid || uid === u.uid) { if (typeof showCopyToast === 'function') showCopyToast('אי אפשר לעקוב אחרי עצמך 🙂'); return; }
  const path = `website/user_follows/${u.uid}/${uid}`;
  const willFollow = !followedUids[uid];
  try {
    if (willFollow) { await set(ref(db, path), { name: name || '', since: Date.now() }); followedUids[uid] = { name: name || '', since: Date.now() }; }
    else { await set(ref(db, path), null); delete followedUids[uid]; }
    if (btn) { btn.textContent = willFollow ? '✓ עוקב' : '➕ עקוב'; btn.classList.toggle('following', willFollow); }
    if (typeof showCopyToast === 'function') showCopyToast(willFollow ? '👤 עוקב אחריו!' : 'הפסקת לעקוב');
  } catch (e) { console.error('follow failed', e); }
}
window.toggleFollow = toggleFollow;

let photoCommentsUnsub = null;
let photoCommentsData = {};
function subscribePhotoComments(albumId) {
  if (photoCommentsUnsub) { photoCommentsUnsub(); photoCommentsUnsub = null; }
  photoCommentsUnsub = onValue(ref(db, `website/photo_comments/${albumId}`), snap => {
    photoCommentsData = snap.val() || {};
    const box = document.getElementById('photo-comments-list');
    if (box) box.innerHTML = photoCommentsListHTML();
    const cnt = document.getElementById('photo-comments-count');
    if (cnt) cnt.textContent = Object.keys(photoCommentsData).length;
  });
}
window.subscribePhotoComments = subscribePhotoComments;

function photoCommentsListHTML() {
  const list = Object.values(photoCommentsData).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (!list.length) return '<div class="pc-empty">אין תגובות עדיין. היו הראשונים להגיב!</div>';
  return list.map(c => `
    <div class="pc-comment">
      <div class="pc-head">${escHtml(c.name || 'אורח')} · ${c.createdAt ? new Date(c.createdAt).toLocaleDateString('he-IL') : ''}</div>
      ${c.text ? `<div class="pc-text">${escHtml(c.text)}</div>` : ''}
      ${voiceCommentAudioHTML(c)}
    </div>`).join('');
}

async function submitPhotoComment(albumId) {
  const inp = document.getElementById('photo-comment-input');
  const text = inp ? inp.value.trim() : '';
  if (!text) return;
  const name = (auth.currentUser && typeof liveChatUserName === 'function') ? liveChatUserName() : 'אורח';
  try {
    if (typeof trackEvent === 'function') trackEvent('comment');
    await push(ref(db, `website/photo_comments/${albumId}`), { text: text.slice(0, 1000), name, uid: auth.currentUser ? auth.currentUser.uid : '', createdAt: Date.now() });
    if (inp) inp.value = '';
  } catch (e) { console.error('comment failed', e); if (typeof showCopyToast === 'function') showCopyToast('שגיאה בשליחת התגובה'); }
}
window.submitPhotoComment = submitPhotoComment;

function photoCommentsSectionHTML(albumId) {
  return `
    <div class="pc-section">
      <div class="pc-title">💬 תגובות (<span id="photo-comments-count">0</span>)</div>
      <div class="pc-form">
        <textarea id="photo-comment-input" rows="2" placeholder="כתבו תגובה, שתפו מה דעתכם..."></textarea>
        <div class="pc-actions">
          <button type="button" class="pc-mic" onclick="voiceRecToggle('photo', '${artEsc(albumId)}')" title="תגובה קולית">🎤 הקלטה</button>
          <button onclick="submitPhotoComment('${artEsc(albumId)}')" class="pc-send">שלח תגובה</button>
        </div>
      </div>
      <div class="pc-voice" id="photo-voice-rec"></div>
      <div id="photo-comments-list">${photoCommentsListHTML()}</div>
    </div>`;
}
window.photoCommentsSectionHTML = photoCommentsSectionHTML;

// ---- תגובות לסיפורים ----
let storyCommentsUnsub = null;
let storyCommentsData = {};

function subscribeStoryComments(storyId) {
  if (storyCommentsUnsub) { storyCommentsUnsub(); storyCommentsUnsub = null; }
  storyCommentsUnsub = onValue(ref(db, `website/story_comments/${storyId}`), snap => {
    storyCommentsData = snap.val() || {};
    const box = document.getElementById('story-comments-list');
    if (box) box.innerHTML = storyCommentsListHTML();
    const cnt = document.getElementById('story-comments-count');
    if (cnt) cnt.textContent = Object.keys(storyCommentsData).length;
  });
}
window.subscribeStoryComments = subscribeStoryComments;

function storyCommentsListHTML() {
  const list = Object.values(storyCommentsData).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  if (!list.length) return '<div class="pc-empty">אין תגובות עדיין. היו הראשונים להגיב!</div>';
  return list.map(c => `
    <div class="pc-comment">
      <div class="pc-head">${escHtml(c.name || 'אורח')} · ${c.createdAt ? new Date(c.createdAt).toLocaleDateString('he-IL') : ''}</div>
      ${c.text ? `<div class="pc-text">${escHtml(c.text)}</div>` : ''}
      ${voiceCommentAudioHTML(c)}
    </div>`).join('');
}

async function submitStoryComment(storyId) {
  const inp = document.getElementById('story-comment-input');
  const text = inp ? inp.value.trim() : '';
  if (!text) return;
  const name = (auth.currentUser && typeof liveChatUserName === 'function') ? liveChatUserName() : 'אורח';
  try {
    if (typeof trackEvent === 'function') trackEvent('comment');
    await push(ref(db, `website/story_comments/${storyId}`), { text: text.slice(0, 1000), name, uid: auth.currentUser ? auth.currentUser.uid : '', createdAt: Date.now() });
    if (inp) inp.value = '';
  } catch (e) { console.error('story comment failed', e); if (typeof showCopyToast === 'function') showCopyToast('שגיאה בשליחת התגובה'); }
}
window.submitStoryComment = submitStoryComment;

function storyCommentsSectionHTML(storyId) {
  return `
    <div class="pc-section">
      <div class="pc-title">💬 תגובות (<span id="story-comments-count">0</span>)</div>
      <div class="pc-form">
        <textarea id="story-comment-input" rows="2" placeholder="כתבו תגובה, שתפו מה דעתכם..."></textarea>
        <div class="pc-actions">
          <button type="button" class="pc-mic" onclick="voiceRecToggle('story', '${artEsc(storyId)}')" title="תגובה קולית">🎤 הקלטה</button>
          <button onclick="submitStoryComment('${artEsc(storyId)}')" class="pc-send">שלח תגובה</button>
        </div>
      </div>
      <div class="pc-voice" id="story-voice-rec"></div>
      <div id="story-comments-list">${storyCommentsListHTML()}</div>
    </div>`;
}
window.storyCommentsSectionHTML = storyCommentsSectionHTML;

// ---- תגובות קוליות (לתמונות ולסיפורים) ----
// ההקלטה נשמרת כ-data URL בתוך התגובה עצמה (עד 60 שניות, ביטרייט נמוך)
const VOICE_MAX_SEC = 60;
const VOICE_DATA_RE = /^data:audio\/[a-z0-9.+-]+(;codecs=[a-z0-9.,"'-]+)?;base64,[A-Za-z0-9+/=]+$/i;
let voiceRec = null; // { kind, id, recorder, stream, chunks, start, timer, dataUrl }

function voiceCommentAudioHTML(c) {
  if (!c || typeof c.voice !== 'string' || !VOICE_DATA_RE.test(c.voice)) return '';
  const sec = Number(c.voiceSec) || 0;
  return `<div class="pc-audio"><span class="pc-audio-ico">🎤</span><audio controls preload="none" src="${escHtml(c.voice)}"></audio>${sec ? `<span class="pc-audio-len">${sec}″</span>` : ''}</div>`;
}

function voiceRecBox(kind) { return document.getElementById(`${kind}-voice-rec`); }

function voiceRecRender() {
  if (!voiceRec) return;
  const box = voiceRecBox(voiceRec.kind);
  if (!box) return;
  if (voiceRec.recorder && voiceRec.recorder.state === 'recording') {
    const sec = Math.floor((Date.now() - voiceRec.start) / 1000);
    box.innerHTML = `<div class="pc-voice-bar recording">
      <span class="pc-rec-dot"></span><span class="pc-rec-time">${sec}″ / ${VOICE_MAX_SEC}″</span>
      <button type="button" class="pc-voice-btn stop" onclick="voiceRecStop()">⏹ עצירה</button>
      <button type="button" class="pc-voice-btn ghost" onclick="voiceRecCancel()">ביטול</button>
    </div>`;
  } else if (voiceRec.dataUrl) {
    box.innerHTML = `<div class="pc-voice-bar">
      <audio controls src="${escHtml(voiceRec.dataUrl)}"></audio>
      <button type="button" class="pc-voice-btn send" onclick="voiceRecSend()">📤 שליחת תגובה קולית</button>
      <button type="button" class="pc-voice-btn ghost" onclick="voiceRecCancel()">מחיקה</button>
    </div>`;
  }
}

function voiceRecCleanup() {
  if (!voiceRec) return;
  clearInterval(voiceRec.timer);
  if (voiceRec.stream) voiceRec.stream.getTracks().forEach(t => t.stop());
}

async function voiceRecToggle(kind, id) {
  if (voiceRec && voiceRec.recorder && voiceRec.recorder.state === 'recording') { voiceRecStop(); return; }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
    alert('הדפדפן לא תומך בהקלטה קולית');
    return;
  }
  voiceRecCancel();
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { alert('אין גישה למיקרופון — אשרו הרשאה בדפדפן'); return; }
  const types = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'];
  const mimeType = types.find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
  let recorder;
  try { recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 24000 } : { audioBitsPerSecond: 24000 }); }
  catch (e) { recorder = new MediaRecorder(stream); }
  voiceRec = { kind, id, recorder, stream, chunks: [], start: Date.now(), timer: null, dataUrl: '', sec: 0 };
  const rec = voiceRec;
  recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size) rec.chunks.push(ev.data); };
  recorder.onstop = () => {
    rec.sec = Math.max(1, Math.round((Date.now() - rec.start) / 1000));
    clearInterval(rec.timer);
    rec.stream.getTracks().forEach(t => t.stop());
    if (rec.cancelled || voiceRec !== rec) return;
    const blob = new Blob(rec.chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
    const fr = new FileReader();
    fr.onload = () => { if (voiceRec === rec) { rec.dataUrl = String(fr.result || ''); voiceRecRender(); } };
    fr.readAsDataURL(blob);
  };
  recorder.start();
  rec.timer = setInterval(() => {
    if ((Date.now() - rec.start) / 1000 >= VOICE_MAX_SEC) voiceRecStop();
    else voiceRecRender();
  }, 500);
  voiceRecRender();
}
window.voiceRecToggle = voiceRecToggle;

function voiceRecStop() {
  if (voiceRec && voiceRec.recorder && voiceRec.recorder.state === 'recording') voiceRec.recorder.stop();
}
window.voiceRecStop = voiceRecStop;

function voiceRecCancel() {
  if (!voiceRec) return;
  const rec = voiceRec;
  rec.cancelled = true;
  if (rec.recorder && rec.recorder.state === 'recording') rec.recorder.stop();
  voiceRecCleanup();
  const box = voiceRecBox(rec.kind);
  if (box) box.innerHTML = '';
  voiceRec = null;
}
window.voiceRecCancel = voiceRecCancel;

async function voiceRecSend() {
  const rec = voiceRec;
  if (!rec || !rec.dataUrl) return;
  const dataUrl = rec.dataUrl.replace(/;codecs=[^;,]*/i, ''); // פשטות לאימות
  if (!VOICE_DATA_RE.test(dataUrl) || dataUrl.length > 450000) {
    alert('ההקלטה ארוכה מדי — נסו הקלטה קצרה יותר');
    return;
  }
  const path = rec.kind === 'story' ? `website/story_comments/${rec.id}` : `website/photo_comments/${rec.id}`;
  const name = (auth.currentUser && typeof liveChatUserName === 'function') ? liveChatUserName() : 'אורח';
  const box = voiceRecBox(rec.kind);
  const btn = box && box.querySelector('.pc-voice-btn.send');
  if (btn) { btn.disabled = true; btn.textContent = 'שולח...'; }
  try {
    if (typeof trackEvent === 'function') trackEvent('voice_comment');
    await push(ref(db, path), { text: '', voice: dataUrl, voiceSec: rec.sec || 0, name, uid: auth.currentUser ? auth.currentUser.uid : '', createdAt: Date.now() });
    voiceRecCancel();
    if (typeof showCopyToast === 'function') showCopyToast('🎤 התגובה הקולית נשלחה');
  } catch (e) {
    console.error('voice comment failed', e);
    if (btn) { btn.disabled = false; btn.textContent = '📤 שליחת תגובה קולית'; }
    if (typeof showCopyToast === 'function') showCopyToast('שגיאה בשליחת התגובה הקולית');
  }
}
window.voiceRecSend = voiceRecSend;

// ---- פיד: גלריות של מי שאני עוקב אחריו ----
function getFeedAlbums() {
  let albums = [];
  const el = mainContent.querySelector('.photos-page:not(.community-page):not(.user-page)');
  if (el && el.dataset.photosJson) { try { albums = JSON.parse(decodeURIComponent(el.dataset.photosJson)); } catch (e) {} }
  if ((!albums || !albums.length) && typeof pages !== 'undefined') {
    const pp = pages.find(p => p && (p.content || '').includes('data-photos-json') && (p.content || '').includes('photos-page') && !(p.content || '').includes('community') && !(p.content || '').includes('user-page'));
    if (pp) { const m = pp.content.match(/data-photos-json="([^"]*)"/); if (m) { try { albums = JSON.parse(decodeURIComponent(m[1])); } catch (e) {} } }
  }
  return albums || [];
}

function feedCardHTML(a) {
  const img = (a.images && a.images[0]) ? a.images[0] : '';
  return `<div class="feed-card" onclick="feedOpenGallery('${artEsc(a.id)}')" title="${escHtml(a.title || '')}">
    <div class="feed-card-img">${img ? `<img src="${escHtml(img)}" alt="">` : '🖼️'}</div>
    <div class="feed-card-body">
      <div class="feed-card-title">${escHtml(a.title || '')}</div>
      <div class="feed-card-author">${escHtml(a.author || '')}${a.timestamp ? ' · ' + escHtml(a.timestamp) : ''}</div>
    </div>
  </div>`;
}

// ============================================================
// פיד בסגנון פייסבוק: סטוריז למעלה, פוסטים עם גלילה אינסופית,
// וקיר הרשמה לאורחים אחרי כמה גלילות (מצב אורח)
// ============================================================
let fbFeedPosts = [];
let fbFeedIndex = 0;
const FB_FEED_BATCH = 4;          // כמה פוסטים בכל טעינה
let fbFeedBatchesLoaded = 0;
const FB_GUEST_MAX_BATCHES = 3;   // אחרי כמה טעינות אורח נתקל בקיר ההרשמה
let fbFeedObserver = null;

function fbFeedGetPosts() {
  let posts = [];
  try { if (typeof photoGetAlbums === 'function') posts = posts.concat((photoGetAlbums() || []).map(a => Object.assign({ _kind: 'photo' }, a))); } catch (e) {}
  try { if (typeof ideaGetAlbums === 'function') posts = posts.concat((ideaGetAlbums() || []).map(a => Object.assign({ _kind: 'idea' }, a))); } catch (e) {}
  const _isAdminView = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);
  posts = posts.filter(p => p && p.approved !== false && (!p.adminOnly || _isAdminView) && (!p.expiresAt || p.expiresAt > Date.now()));
  // קודם מי שאני עוקב אחריו, ואז לפי זמן (החדש קודם)
  posts.sort((a, b) => {
    const fa = (typeof isFollowing === 'function' && isFollowing(a.authorId)) ? 1 : 0;
    const fb = (typeof isFollowing === 'function' && isFollowing(b.authorId)) ? 1 : 0;
    if (fa !== fb) return fb - fa;
    return (b.createdAt || 0) - (a.createdAt || 0);
  });
  return posts;
}

function fbFeedStoriesHTML(posts) {
  const seen = {}; const authors = [];
  posts.forEach(p => { const id = p.authorId || p.author; if (id && !seen[id]) { seen[id] = 1; authors.push(p); } });
  const create = `
    <div class="fb-story fb-story-create" onclick="fbFeedCompose()" role="button" tabindex="0">
      <div class="fb-story-create-top">+</div>
      <div class="fb-story-name">יצירת סטורי</div>
    </div>`;
  const items = authors.slice(0, 15).map(p => {
    const img = (p.images && p.images[0]) ? p.images[0] : (p.image || '');
    return `
      <div class="fb-story" onclick="openUserPage('${artEsc(p.authorId || '')}','${artEsc(p.author || '')}')" role="button" tabindex="0" title="${escHtml(p.author || '')}">
        <div class="fb-story-bg">${img ? `<img src="${escHtml(img)}" alt="" loading="lazy">` : ''}</div>
        <div class="fb-story-avatar">${img ? `<img src="${escHtml(img)}" alt="" loading="lazy">` : '👤'}</div>
        <div class="fb-story-name">${escHtml(p.author || 'משתמש')}</div>
      </div>`;
  }).join('');
  return `<div class="fb-stories">${create}${items}</div>`;
}

function fbFeedPostCard(p) {
  const img = (p.images && p.images[0]) ? p.images[0] : (p.image || '');
  const verified = (typeof isUserVerified === 'function') ? isUserVerified(p.authorId, p.author, p.verified || p.verifiedUser) : false;
  const vBadge = verified ? ` <span class="fb-verified" title="מאומת">✓</span>` : '';
  const likes = p.likes || 0;
  const kindTag = p._kind === 'idea' ? '💡 רעיון' : '';
  return `
    <div class="fb-post">
      <div class="fb-post-head">
        <div class="fb-post-avatar" onclick="openUserPage('${artEsc(p.authorId || '')}','${artEsc(p.author || '')}')">${img ? `<img src="${escHtml(img)}" alt="">` : '<span>👤</span>'}</div>
        <div class="fb-post-meta">
          <div class="fb-post-author" onclick="openUserPage('${artEsc(p.authorId || '')}','${artEsc(p.author || '')}')">${escHtml(p.author || 'משתמש')}${vBadge}</div>
          <div class="fb-post-time">${escHtml(p.timestamp || '')}${kindTag ? ' · ' + kindTag : ''}</div>
        </div>
      </div>
      ${p.title ? `<div class="fb-post-text">${escHtml(p.title)}</div>` : ''}
      ${p.summary ? `<div class="fb-post-sub">${escHtml(p.summary)}</div>` : ''}
      ${img ? `<div class="fb-post-img" onclick="fbFeedOpen('${artEsc(p.id)}','${p._kind}')"><img src="${escHtml(img)}" alt="" loading="lazy"></div>` : ''}
      <div class="fb-post-stats"><span>❤️ ${likes}</span><span>👁️ ${(typeof photoGetViews === 'function' ? photoGetViews(p.id) : 0)}</span></div>
      <div class="fb-post-actions">
        <button onclick="fbFeedLike('${artEsc(p.id)}', this)">👍 אהבתי</button>
        <button onclick="fbFeedOpen('${artEsc(p.id)}','${p._kind}')">💬 תגובה</button>
        <button onclick="fbFeedOpen('${artEsc(p.id)}','${p._kind}')">↗️ שיתוף</button>
      </div>
    </div>`;
}

function fbFeedRenderBatch() {
  const list = document.getElementById('fb-feed-list');
  if (!list) return;
  const isGuest = !auth.currentUser;
  if (isGuest && fbFeedBatchesLoaded >= FB_GUEST_MAX_BATCHES) { fbFeedShowWall(); return; }
  if (!fbFeedPosts.length) {
    if (fbFeedObserver) { try { fbFeedObserver.disconnect(); } catch (e) {} }
    if (!document.getElementById('fb-feed-end')) {
      list.insertAdjacentHTML('beforeend', `<div id="fb-feed-end" class="fb-feed-end">אין תוכן להצגה עדיין.</div>`);
    }
    return;
  }
  // גלילה אינסופית: כשנגמר התוכן מתחילים מחדש עם ערבוב (כמו פיד חברתי)
  if (fbFeedIndex >= fbFeedPosts.length) {
    fbFeedIndex = 0;
    for (let i = fbFeedPosts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = fbFeedPosts[i]; fbFeedPosts[i] = fbFeedPosts[j]; fbFeedPosts[j] = t; }
  }
  const slice = fbFeedPosts.slice(fbFeedIndex, fbFeedIndex + FB_FEED_BATCH);
  list.insertAdjacentHTML('beforeend', slice.map(fbFeedPostCard).join(''));
  fbFeedIndex += FB_FEED_BATCH;
  fbFeedBatchesLoaded++;
}

function fbFeedShowWall() {
  if (fbFeedObserver) { try { fbFeedObserver.disconnect(); } catch (e) {} }
  const list = document.getElementById('fb-feed-list');
  if (!list || document.getElementById('fb-feed-wall')) return;
  list.insertAdjacentHTML('beforeend', `
    <div id="fb-feed-wall" class="fb-feed-wall">
      <div class="fb-wall-icon">🔒</div>
      <div class="fb-wall-title">רוצה לראות עוד?</div>
      <div class="fb-wall-sub">הצטרפו בחינם כדי להמשיך לגלול, לראות את כל התוכן, לעקוב אחרי משתמשים ולפרסם בעצמכם.</div>
      <button class="fb-wall-btn" onclick="openLiveChatLogin()">הרשמה / התחברות</button>
    </div>`);
}

function fbFeedStopped() {
  // נעצרנו? (קיר הרשמה הוצג, אין תוכן, או הגענו לסוף)
  return !!document.getElementById('fb-feed-wall') || !!document.getElementById('fb-feed-end') || !fbFeedPosts.length;
}

function fbFeedMaybeLoad() {
  const list = document.getElementById('fb-feed-list');
  if (!list) { window.removeEventListener('scroll', fbFeedOnScroll); return; }
  if (fbFeedStopped()) return;
  const se = document.scrollingElement || document.documentElement;
  if (se.scrollTop + se.clientHeight >= se.scrollHeight - 600) fbFeedRenderBatch();
}

let _fbScrollTick = false;
function fbFeedOnScroll() {
  if (_fbScrollTick) return;
  _fbScrollTick = true;
  requestAnimationFrame(() => { _fbScrollTick = false; fbFeedMaybeLoad(); });
}
window.fbFeedOnScroll = fbFeedOnScroll;

function fbFeedInit() {
  const list = document.getElementById('fb-feed-list');
  if (!list) return;
  window.removeEventListener('scroll', fbFeedOnScroll);
  // מילוי ראשוני: טוענים עד שהעמוד ארוך מספיק לגלילה (או עד שנעצרנו)
  let guard = 0;
  const se = document.scrollingElement || document.documentElement;
  do {
    fbFeedRenderBatch();
    guard++;
  } while (!fbFeedStopped() && se.scrollHeight <= se.clientHeight + 200 && guard < 10);
  window.addEventListener('scroll', fbFeedOnScroll, { passive: true });
}

function fbFeedCompose() {
  if (!auth.currentUser) { if (typeof openLiveChatLogin === 'function') openLiveChatLogin(); return; }
  if (typeof openQuickPublish === 'function') openQuickPublish();
}
window.fbFeedCompose = fbFeedCompose;

function fbFeedLike(id, btn) {
  if (!auth.currentUser) { if (typeof openLiveChatLogin === 'function') openLiveChatLogin(); return; }
  if (typeof photoToggleLike === 'function') { try { photoToggleLike(id); } catch (e) {} }
  if (btn) btn.classList.toggle('liked');
}
window.fbFeedLike = fbFeedLike;

function fbFeedOpen(id, kind) {
  if (kind === 'idea') {
    if (typeof pages !== 'undefined') {
      const ip = pages.find(p => p && (p.content || '').includes('ideas-page'));
      if (ip) { window.__detailOpen = false; activePageId = ip.id; if (typeof renderTopNav === 'function') renderTopNav(); if (typeof renderPage === 'function') renderPage(); }
    }
    return;
  }
  if (typeof feedOpenGallery === 'function') feedOpenGallery(id);
}
window.fbFeedOpen = fbFeedOpen;

// בונה את הפיד (בסגנון פייסבוק) — זמין גם לאורחים
function buildFeedPage() {
  if (typeof subscribeMyFollows === 'function') { try { subscribeMyFollows(); } catch (e) {} }
  fbFeedPosts = fbFeedGetPosts();
  fbFeedIndex = 0;
  fbFeedBatchesLoaded = 0;
  let name = 'אורח';
  try {
    const u = auth.currentUser;
    if (u) {
      const prof = JSON.parse(localStorage.getItem(`user_profile_${u.uid}`) || '{}');
      name = prof.name || (typeof liveChatUserName === 'function' ? liveChatUserName() : '') || (u.email ? u.email.split('@')[0] : 'משתמש');
    }
  } catch (e) {}
  setTimeout(fbFeedInit, 30);
  return `
    <div class="fb-feed">
      ${fbFeedStoriesHTML(fbFeedPosts)}
      <div class="fb-composer" onclick="fbFeedCompose()" role="button" tabindex="0">
        <div class="fb-composer-avatar">👤</div>
        <div class="fb-composer-input">מה בא לך לשתף, ${escHtml(name)}?</div>
        <div class="fb-composer-icons"><span title="תמונה">🖼️</span><span title="וידאו">🎥</span></div>
      </div>
      <div class="fb-feed-list" id="fb-feed-list"></div>
      <div id="fb-feed-sentinel" style="height:1px;"></div>
    </div>`;
}
window.buildFeedPage = buildFeedPage;

// פותח את עמוד הפיד (מכפתור הבית בכותרת)
function openFeed() {
  // הפיד זמין גם לאורחים (מצב אורח) — אחרי כמה גלילות מוצג קיר הרשמה
  if (auth.currentUser && typeof subscribeMyFollows === 'function') subscribeMyFollows();
  if (isEditMode && typeof saveCurrentPageContent === 'function') saveCurrentPageContent();
  window.__detailOpen = false;
  activePageId = 'page-feed-main';
  if (typeof renderSideMenu === 'function') renderSideMenu();
  if (typeof renderTopNav === 'function') renderTopNav();
  renderPage();
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
}
window.openFeed = openFeed;

function feedOpenGallery(id) {
  // מעבר לעמוד התמונות כדי ש-photoOpenDetail ימצא את הגלריה
  if (typeof pages !== 'undefined') {
    const pp = pages.find(p => p && (p.content || '').includes('photos-page') && !(p.content || '').includes('community') && !(p.content || '').includes('user-page'));
    if (pp) { window.__detailOpen = false; activePageId = pp.id; if (typeof renderTopNav === 'function') renderTopNav(); if (typeof renderPage === 'function') renderPage(); }
  }
  setTimeout(() => { if (typeof photoOpenDetail === 'function') photoOpenDetail(id); }, 60);
}
window.feedOpenGallery = feedOpenGallery;



// ערכי הסינון של עמוד התמונות. הם חיים מחוץ ל-buildPhotosPage כדי
// שהבחירה תישמר גם כשהעמוד נבנה מחדש (מחיקה, לייק, עדכון מהענן).
const PHOTO_CATEGORIES = ['הכל', 'גבר', 'אישה', 'זוג'];
const PHOTO_AGE_RANGES = ['הכל', '18-25', '26-35', '36-45', '46+'];
const PHOTO_REGIONS = ['הכל', 'צפון', 'מרכז', 'דרום'];
const PHOTO_DATE_RANGES = ['הכל', 'השבוע', 'החודש', 'השנה'];

const PHOTO_GENERAL_SORTS = ['הכל', 'האחרונים', 'הפופולארים', 'הישנים'];

const PHOTO_FILTER_GROUPS = [
  { kind: 'general',  label: 'כללי',   values: PHOTO_GENERAL_SORTS },
  { kind: 'category', label: 'מין',    values: PHOTO_CATEGORIES },
  { kind: 'age',      label: 'גיל',    values: PHOTO_AGE_RANGES },
  { kind: 'region',   label: 'מיקום',  values: PHOTO_REGIONS },
  { kind: 'date',     label: 'תאריך',  values: PHOTO_DATE_RANGES }
];

let currentPhotoCategoryFilter = 'הכל';
let currentPhotoAgeFilter = 'הכל';
let currentPhotoRegionFilter = 'הכל';
let currentPhotoDateFilter = 'הכל';
let currentPhotoGeneralFilter = 'הכל';
let photoOpenFilterGroup = null;

// גודל הגריד בעמוד התמונות (מספר עמודות: 2 / 3 / 4). ברירת מחדל: 4 עמודות למחשב/לפטופ.
let photoGridCols = (function () {
  const v = parseInt(localStorage.getItem('photo_grid_cols') || '4', 10);
  return (v === 2 || v === 3 || v === 4) ? v : 4;
})();

function photoSetGridSize(n) {
  if (![2, 3, 4].includes(n)) return;
  photoGridCols = n;
  try { localStorage.setItem('photo_grid_cols', String(n)); } catch (e) {}
  const root = mainContent.querySelector('.photos-page');
  if (root) {
    root.classList.remove('photo-cols-2', 'photo-cols-3', 'photo-cols-4');
    root.classList.add('photo-cols-' + n);
  }
  photoOpenFilterGroup = null;
  photoRenderFilterBar();
}
window.photoSetGridSize = photoSetGridSize;

// מצב תצוגה: תמונות (כרטיסים) או רשימת טקסט (רואים יותר). נשמר בין ביקורים.
let photoImagesMode = (function () {
  try { return localStorage.getItem('photo_images_mode') !== '0'; } catch (e) { return true; }
})();
function photoToggleImages(on) {
  photoImagesMode = !!on;
  try { localStorage.setItem('photo_images_mode', on ? '1' : '0'); } catch (e) {}
  const root = mainContent.querySelector('.articles-page');
  if (root) root.classList.toggle('text-mode', !on);
  const boxes = document.querySelectorAll('.view-toggles input[onchange*="photoToggleImages"]');
  boxes.forEach(b => { if (b) b.checked = !!on; });
}
window.photoToggleImages = photoToggleImages;

// סינון משתמשים מאומתים בלבד. נשמר בין ביקורים.
let photoVerifiedOnly = (function () {
  try { return localStorage.getItem('photo_verified_only') === '1'; } catch (e) { return false; }
})();
function photoToggleVerified(on) {
  photoVerifiedOnly = !!on;
  try { localStorage.setItem('photo_verified_only', on ? '1' : '0'); } catch (e) {}
  const boxes = document.querySelectorAll('.view-toggles input[onchange*="photoToggleVerified"]');
  boxes.forEach(b => { if (b) b.checked = !!on; });
  if (typeof pfApplyActive === 'function') pfApplyActive();
  else {
    if (typeof photoApplyFilters === 'function') photoApplyFilters();
    if (typeof storyApplyFilters === 'function') storyApplyFilters();
  }
}
window.photoToggleVerified = photoToggleVerified;

// הסתרת שוליים בתמונות (מצב מחשב) — התמונות בגודל מלא, ממלאות את הכרטיס בלי letterbox. נשמר.
// המתג הוסר מהממשק — תמיד כבוי (גם למי ששמר אותו בעבר)
let photoNoImgMargins = false;
function photoToggleImageMargins(on) {
  photoNoImgMargins = !!on;
  try { localStorage.setItem('photo_no_img_margins', on ? '1' : '0'); } catch (e) {}
  document.querySelectorAll('.photos-page').forEach(el => el.classList.toggle('no-img-margins', !!on));
  const boxes = document.querySelectorAll('.view-toggles input[onchange*="photoToggleImageMargins"]');
  boxes.forEach(b => { if (b) b.checked = !!on; });
}
window.photoToggleImageMargins = photoToggleImageMargins;

// מסך מלא (מצב מחשב) — מסתיר את שני סרגלי הצד בתמונות, בקומיקס ובסיפורים. נשמר.
function togglePageFullWidth(on) {
  pageFullWidth = !!on;
  try { localStorage.setItem('page_full_width', on ? '1' : '0'); } catch (e) {}
  document.documentElement.classList.toggle('page-full-width', pageFullWidth);
  document.querySelectorAll('.view-toggles input[onchange*="togglePageFullWidth"]').forEach(b => { b.checked = pageFullWidth; });
}
window.togglePageFullWidth = togglePageFullWidth;

// זמן היצירה של גלריה. גלריות חדשות שומרות createdAt מספרי; לישנות
// נופלים לפרסור של התאריך המוצג (d.m.yyyy מ-toLocaleDateString בעברית).
function photoAlbumTime(p) {
  if (!p) return 0;
  if (typeof p.createdAt === 'number' && isFinite(p.createdAt) && p.createdAt > 0) return p.createdAt;
  
  const idStr = String(p.id || '');
  const idDigits = idStr.replace(/\D/g, '');
  if (idDigits.length >= 10) {
    const parsedIdTime = parseInt(idDigits, 10);
    if (parsedIdTime && isFinite(parsedIdTime)) return parsedIdTime;
  }

  const str = String(p.timestamp || '').trim();
  const now = Date.now();
  const dayMs = 86400000;

  if (str.includes('היום')) {
    const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const d = new Date();
      d.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
      return d.getTime();
    }
    return now;
  }
  if (str.includes('אתמול')) {
    const timeMatch = str.match(/(\d{1,2}):(\d{2})/);
    const d = new Date(now - dayMs);
    if (timeMatch) d.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
    return d.getTime();
  }
  if (str.includes('לפני יומיים')) return now - 2 * dayMs;
  if (str.includes('לפני 3 ימים')) return now - 3 * dayMs;
  if (str.includes('השבוע') || str.includes('לפני שבוע') || str.includes('עודכן השבוע')) return now - 5 * dayMs;
  if (str.includes('לפני שבועיים')) return now - 14 * dayMs;
  if (str.includes('החודש') || str.includes('לפני חודש')) return now - 25 * dayMs;
  if (str.includes('השנה')) return now - 120 * dayMs;

  const m = str.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
  if (m) {
    const t = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
    if (isFinite(t)) return t;
  }

  const fallbackIdNum = parseInt(idDigits, 10);
  return fallbackIdNum || 0;
}

// גבול תחתון לפי לוח השנה, כדי שהתוויות יהיו נכונות מילולית:
// "השבוע" מתחילת השבוע הנוכחי, "החודש" מה-1 בחודש, "השנה" מ-1 בינואר.
function photoDateThreshold(range) {
  const now = new Date();
  if (range === 'השבוע') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - d.getDay()); // ראשון הוא תחילת השבוע
    return d.getTime();
  }
  if (range === 'החודש') return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  if (range === 'השנה') return new Date(now.getFullYear(), 0, 1).getTime();
  return null;
}

function photoSetFilter(kind, value) {
  const isStories = (typeof pfActivePage === 'function' && pfActivePage() === 'stories');
  if (isStories) {
    if (kind === 'general') currentStoryGeneralFilter = value;
    else if (kind === 'date') currentPhotoDateFilter = value;
  } else {
    if (kind === 'general') currentPhotoGeneralFilter = value;
    else if (kind === 'category') currentPhotoCategoryFilter = value;
    else if (kind === 'age') currentPhotoAgeFilter = value;
    else if (kind === 'region') currentPhotoRegionFilter = value;
    else if (kind === 'date') currentPhotoDateFilter = value;
  }

  // אחרי בחירה סוגרים וחוזרים לשלושת הכפתורים. הרינדור מחליף את
  // הסרגל כולו, ולכן אין טעם לגעת ב-classList של הכפתור שנלחץ.
  photoOpenFilterGroup = null;
  photoRenderFilterBar();
  if (typeof pfApplyActive === 'function') pfApplyActive();
  else photoApplyFilters();
}
window.photoSetFilter = photoSetFilter;

// נשמר לתאימות אחורה עם קריאות ישנות
function photoFilterCategory(category) {
  photoSetFilter('category', category);
}
window.photoFilterCategory = photoFilterCategory;

// מיון "כללי": האחרונים / הפופולארים / הישנים. משנה את סדר הכרטיסים
// בכל מקטע (.art-rows) בעמוד התמונות. "הכל" מחזיר לסדר המקורי של הבנייה.
function photoApplySort() {
  // ממיין את העמוד הפעיל בלבד, לפי מצב המיון שלו
  const stories = (typeof pfActivePage === 'function' && pfActivePage() === 'stories');
  const mode = stories ? currentStoryGeneralFilter : currentPhotoGeneralFilter;
  const containers = mainContent.querySelectorAll(stories ? '.stories-page .art-rows' : '.photos-page .art-rows');
  containers.forEach(container => {
    const rows = Array.from(container.children).filter(el => el.classList && el.classList.contains('art-row'));
    if (!rows.length) return;
    // חותמים את הסדר המקורי פעם אחת כדי שנוכל לשחזר אותו ב"הכל"
    rows.forEach((r, i) => { if (r.dataset.origIndex === undefined) r.dataset.origIndex = String(i); });

    const num = (r, attr) => Number(r.dataset[attr]) || 0;
    let sorted;
    if (mode === 'האחרונים')       sorted = rows.slice().sort((a, b) => num(b, 'time') - num(a, 'time'));
    else if (mode === 'הישנים')    sorted = rows.slice().sort((a, b) => num(a, 'time') - num(b, 'time'));
    else if (mode === 'הפופולארים') sorted = rows.slice().sort((a, b) => num(b, 'score') - num(a, 'score'));
    else                            sorted = rows.slice().sort((a, b) => num(a, 'origIndex') - num(b, 'origIndex'));

    sorted.forEach(r => container.appendChild(r));
  });
}

function photoApplyFilters() {
  photoApplySort();
  const searchInput = mainContent.querySelector('.photos-page .art-search');
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  const rows = mainContent.querySelectorAll('.photos-page .art-row');
  const isAgeVerified = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('age_verified') === 'true';
  const ageActive = (photoAgeMin > 18 || photoAgeMax < 99);
  // אילוצי שורת-הצ׳יפים העליונה (בחירה יחידה). התוצאה היא חיתוך (AND)
  // של שורת הצ׳יפים עם פאנל הצד — שתי מערכות הסינון פועלות יחד.
  const topDateThreshold = photoDateThreshold(currentPhotoDateFilter);
  let visible = 0;

  rows.forEach(r => {
    const rowCategory = r.dataset.category || 'כללי';
    // הכרטיס מציג רק תמונה, ולכן מחפשים בתכונת data-search ולא בטקסט הגלוי
    const text = (r.dataset.search || r.textContent).toLowerCase();

    const rowRegion = r.dataset.region || '';
    const rowAge = r.dataset.age || '';
    const rowTime = r.dataset.time ? Number(r.dataset.time) : null;

    // מין — פאנל הצד (בחירה מרובה) AND שורת הצ׳יפים (בחירה יחידה)
    const categoryMatch =
      (!photoSel.category.length || photoSel.category.includes(rowCategory)) &&
      (currentPhotoCategoryFilter === 'הכל' || rowCategory === currentPhotoCategoryFilter);

    // מיקום — פאנל הצד AND שורת הצ׳יפים
    const regionMatch =
      (!photoSel.region.length || photoSel.region.includes(rowRegion)) &&
      (currentPhotoRegionFilter === 'הכל' || rowRegion === currentPhotoRegionFilter);

    // תאריך — פאנל הצד (OR על הטווחים שנבחרו) AND שורת הצ׳יפים
    const dateMatchSide = (!photoSel.date.length) || photoSel.date.some(dr => {
      const th = photoDateThreshold(dr);
      return th === null ? true : (rowTime !== null && rowTime >= th);
    });
    const dateMatchTop = (topDateThreshold === null) || (rowTime !== null && rowTime >= topDateThreshold);
    const dateMatch = dateMatchSide && dateMatchTop;

    // גיל — טווח שתי-הידיות בפאנל הצד AND בורר הגיל בשורת הצ׳יפים
    let ageMatch = true;
    if (ageActive) {
      const b = photoAgeBucket(rowAge);
      ageMatch = b ? (b[1] >= photoAgeMin && b[0] <= photoAgeMax) : false;
    }
    if (currentPhotoAgeFilter !== 'הכל') {
      const tb = photoAgeBucket(currentPhotoAgeFilter);
      const rb = photoAgeBucket(rowAge);
      ageMatch = ageMatch && !!(tb && rb && rb[1] >= tb[0] && rb[0] <= tb[1]);
    }

    const textMatch = text.includes(q);
    const isVerifiedRow = (r.dataset.verified === '1' || r.dataset.verified === 'true');
    const verifiedMatch = !photoVerifiedOnly || isVerifiedRow;

    const show = categoryMatch && ageMatch && regionMatch && dateMatch && textMatch && verifiedMatch;
    // העימוד הוא זה שקובע display בפועל; כאן רק מסמנים מה תואם
    r.dataset.artMatch = show ? '1' : '0';
    if (show) visible++;

    // הטשטוש של תוכן 18+ מנוהל כולו ע"י CSS (html.age-not-verified + data-adult),
    // ולכן כאן רק מנקים סגנון inline ישן כדי לא להתנגש.
    const imgWrap = r.querySelector('.art-row-img-wrap');
    if (imgWrap) {
      imgWrap.style.filter = '';
      imgWrap.style.removeProperty('-webkit-filter');
      const adult = r.dataset.adult === '1';
      imgWrap.title = (adult && !isAgeVerified) ? 'תוכן 18+ מטושטש - יש לאשר גיל בסרגל הצד' : '';
    }
  });

  // כל שינוי בחיפוש או בקטגוריה מחזיר לעמוד הראשון של התוצאות
  artPageState.photos = 1;
  artSyncPagination();

  const noResults = mainContent.querySelector('.photos-page .art-no-results');
  if (noResults) noResults.style.display = visible === 0 ? 'block' : 'none';
}
window.photoApplyFilters = photoApplyFilters;

// ============================================================
// מערכת קורסים / שיעורים (Courses System)
// ============================================================

const COURSES_SAMPLES = [
  {
    id: 'c1',
    title: 'מבוא לפיתוח אתרים ב-JavaScript',
    summary: 'בשיעור זה נלמד את עקרונות הבסיס של שפת ה-JS, משתנים, לולאות ופונקציות.',
    author: 'אלעד כהן', category: 'פיתוח', categoryColor: '#2196F3', timestamp: 'לפני שבוע',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
    video: 'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-screen-40292-large.mp4'
  },
  {
    id: 'c2',
    title: 'יסודות העיצוב הדיגיטלי',
    summary: 'איך לעצב ממשקים יפהפיים שעובדים? עקרונות הצבע, קומפוזיציה וטיפוגרפיה.',
    author: 'שירה רותם', category: 'עיצוב', categoryColor: '#e91e63', timestamp: 'לפני שבועיים',
    image: 'https://images.unsplash.com/photo-1541462608141-2ff01dd914e0?w=800&q=80',
    video: 'https://assets.mixkit.co/videos/preview/mixkit-graphic-designer-working-on-a-digital-tablet-41617-large.mp4'
  }
];

function buildCoursesPage(courses) {
  const featured = courses.filter(c => c.pinned).slice(0, 3);
  const popular = courses.slice(0, 5);

  const featuredHTML = featured.map(c => `
    <div class="art-featured-card" onclick="courseOpenDetail('${artEsc(c.id)}')">
      <img src="${escHtml(c.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80')}" alt="">
      <div class="art-featured-overlay"></div>
      <div class="art-featured-info">
        <span class="art-category-badge" style="background:${escHtml(c.categoryColor || '#2196F3')}">${escHtml(c.category)}</span>
        <h3>${escHtml(c.title)}</h3>
        <div class="art-featured-meta">${escHtml(c.author)} · ${escHtml(c.timestamp)}</div>
      </div>
    </div>
  `).join('');

  const listHTML = courses.map((c) => `
    <div class="art-row" onclick="courseOpenDetail('${artEsc(c.id)}')">
      <div class="art-row-text">
        <h3>${escHtml(c.title)}</h3>
        <p>${escHtml(c.summary)}</p>
        <div class="art-row-meta">
          <span>${escHtml(c.author)}</span>
          <span class="art-row-sep">|</span>
          <span>${escHtml(c.timestamp)}</span>
        </div>
      </div>
      <div class="art-row-img-wrap" style="--bg-img: url('${artEsc(c.image || '')}');">
        ${c.image ? `<img src="${escHtml(c.image)}" alt="">` : '<div class="art-row-img-placeholder"></div>'}
        ${c.image ? `<button class="art-zoom-btn" onclick="event.stopPropagation();artZoomImage('${artEsc(c.image)}')" title="מסך מלא">⛶</button>` : ''}
        ${isEditMode ? `<button class="art-pin-btn" onclick="event.stopPropagation(); togglePinCourse('${artEsc(c.id)}')" title="${c.pinned ? 'בטל נעץ' : 'נעץ בגריד'}" style="${c.pinned ? 'color:#ffd700;display:flex;' : ''}">${c.pinned ? '★' : '☆'}</button>` : ''}
        <button class="art-delete-btn" onclick="event.stopPropagation();courseDelete('${artEsc(c.id)}',this)">✕</button>
      </div>
    </div>
  `).join('');

  const popularHTML = popular.map((c, i) => `
    <div class="art-popular-item" onclick="courseOpenDetail('${artEsc(c.id)}')">
      <span class="art-popular-num">${String(i+1).padStart(2,'0')}</span>
      <div style="flex:1;font-size:13px;font-weight:600;line-height:1.4;color:#222">${escHtml(c.title)}</div>
    </div>
  `).join('');

  const json = encodeURIComponent(JSON.stringify(courses));
  return `<div class="articles-page courses-page" data-courses-json="${json}">
    <div class="art-inner">
      <div class="art-featured-grid">${featuredHTML}</div>
      <div class="art-layout">
        <div class="art-main">
          <div class="art-search-wrap">
            <input type="text" class="art-search" placeholder="🔍 חיפוש קורסים..." oninput="courseSearch(this.value)">
          </div>
          <div class="art-section-title">כל הקורסים והשיעורים</div>
          <div class="art-rows">${listHTML}</div>
          <div class="art-no-results" style="display:none">לא נמצאו קורסים התואמות לחיפוש</div>
          <button class="art-add-btn" onclick="openCourseModal()" style="background:#2196F3">+ הוסף קורס חדש</button>
        </div>
        <div class="art-sidebar">
          ${buildPromotedSitesBox()}
          <div class="art-sidebar-box">
            <div class="art-sidebar-title">הנצפים ביותר השבוע</div>
            ${popularHTML}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function getCourseVideoPlayerHTML(videoUrl) {
  if (!videoUrl) return '';
  
  // Check if Vimeo link
  const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
  const vimeoMatch = videoUrl.match(vimeoRegex);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return `
      <div style="position:relative; width:100%; aspect-ratio:16/9; max-height:450px; overflow:hidden; border-radius:12px; margin-bottom:20px; background:#000;">
        <iframe src="https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%;"></iframe>
      </div>
    `;
  }
  
  // Check if YouTube link
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const ytMatch = videoUrl.match(ytRegex);
  if (ytMatch) {
    const videoId = ytMatch[1];
    return `
      <div style="position:relative; width:100%; aspect-ratio:16/9; max-height:450px; overflow:hidden; border-radius:12px; margin-bottom:20px; background:#000;">
        <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%;"></iframe>
      </div>
    `;
  }
  
  // HTML5 Local video preview or direct MP4 URL
  return `
    <div style="position:relative; width:100%; max-height:450px; overflow:hidden; border-radius:12px; margin-bottom:20px; background:#000;">
      <video src="${escHtml(videoUrl)}" controls autoplay muted playsinline style="width:100%; height:100%; display:block; max-height:450px; object-fit:contain;"></video>
    </div>
  `;
}

function courseOpenDetail(id) {
  const container = mainContent.querySelector('.courses-page');
  if (!container) return;
  let courses = [];
  try { courses = JSON.parse(decodeURIComponent(container.dataset.coursesJson)); } catch(e){ return; }
  const c = courses.find(x => x.id === id);
  if (!c) return;

  const recommended = courses.filter(x => x.id !== id).slice(0, 3);
  const recHTML = recommended.map(r => `
    <div class="art-rec-card" onclick="courseOpenDetail('${artEsc(r.id)}')">
      <div class="art-rec-img">
        ${r.image ? `<img src="${escHtml(r.image)}" alt="">` : '<div class="art-card-img-placeholder"></div>'}
        <span class="art-rec-badge art-category-badge" style="background:${escHtml(r.categoryColor || '#2196F3')}">${escHtml(r.category)}</span>
      </div>
      <div class="art-rec-text">
        <h4>${escHtml(r.title)}</h4>
        <div class="art-rec-meta">${escHtml(r.author)} · ${escHtml(r.timestamp)}</div>
      </div>
    </div>
  `).join('');

  const json = encodeURIComponent(JSON.stringify(courses));
  mainContent.innerHTML = `
    <div class="art-detail articles-page courses-page" data-course-id="${id}" data-courses-json="${json}">
      <div class="art-detail-inner">
        <button class="art-back-btn" onclick="courseGoBack()">← חזרה לקורסים</button>
        
        <!-- נגן וידאו מובנה במקום תמונת כותרת -->
        ${getCourseVideoPlayerHTML(c.video)}

        <div class="art-detail-body">
          <div class="art-meta" style="margin-bottom:12px">
            <span class="art-category-badge" style="background:${escHtml(c.categoryColor || '#2196F3')}">${escHtml(c.category)}</span>
            <span>מרצה: ${escHtml(c.author)}</span>
            <span>·</span>
            <span>${escHtml(c.timestamp)}</span>
          </div>
          <h1 class="art-detail-title">${escHtml(c.title)}</h1>
          <div class="art-detail-content"><p>${escHtml(c.summary)}</p></div>
        </div>

        <div class="art-rec-section">
          <h3 style="margin:0 0 16px;font-size:18px;font-weight:800">שיעורים נוספים שיעניינו אותך</h3>
          <div class="art-rec-grid">${recHTML}</div>
        </div>
      </div>
    </div>
  `;  detailScrollTop();
}

function courseGoBack() {
  const container = mainContent.querySelector('.courses-page');
  if (!container) return;
  let courses = [];
  try { courses = JSON.parse(decodeURIComponent(container.dataset.coursesJson)); } catch(e){}
  mainContent.innerHTML = buildCoursesPage(courses);
  if (isEditMode) applyEditModeToContent();
}

function courseGetCourses() {
  const container = mainContent.querySelector('.courses-page');
  if (!container) return [];
  try { return JSON.parse(decodeURIComponent(container.dataset.coursesJson)); } catch(e){ return []; }
}

function courseDelete(id, el) {
  if (!isEditMode) return;
  if (!confirm('האם למחוק קורס זה?')) return;
  const courses = courseGetCourses().filter(c => c.id !== id);
  mainContent.innerHTML = buildCoursesPage(courses);
  saveCurrentPageContent();
}

function courseSearch(val) {
  if (typeof logSearchQuery === 'function' && val) {
    logSearchQuery(val, 'קורסים');
  }
  const q = (val || '').toLowerCase().trim();
  const rows = mainContent.querySelectorAll('.courses-page .art-row');
  let visible = 0;
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    const match = text.includes(q);
    r.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  const noResults = mainContent.querySelector('.courses-page .art-no-results');
  if (noResults) noResults.style.display = visible === 0 ? 'block' : 'none';
}

let courseImgData = '';
let courseVidData = '';

function openCourseModal() {
  if (!isEditMode) return;
  document.getElementById('course-title').value = '';
  document.getElementById('course-summary').value = '';
  document.getElementById('course-author').value = '';
  document.getElementById('course-category').value = '';
  document.getElementById('course-vid-url').value = '';
  
  const imgPreview = document.getElementById('course-img-preview');
  imgPreview.style.display = 'none'; imgPreview.src = '';
  courseImgData = '';
  document.getElementById('course-img-pick').textContent = 'לחץ לבחירת תמונה';
  
  const vidPreview = document.getElementById('course-vid-preview');
  vidPreview.style.display = 'none'; vidPreview.src = '';
  courseVidData = '';
  document.getElementById('course-vid-pick').textContent = 'בחר קובץ מקומי מהמחשב (עד 10 שניות)';
  
  document.getElementById('course-modal').style.display = 'flex';
}

document.getElementById('course-img-pick').addEventListener('click', () => {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      courseImgData = ev.target.result;
      const p = document.getElementById('course-img-preview');
      p.src = courseImgData; p.style.display = 'block';
      document.getElementById('course-img-pick').textContent = '✓ תמונה נבחרה';
    };
    r.readAsDataURL(f);
  };
  inp.click();
});

document.getElementById('course-vid-pick').addEventListener('click', () => {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'video/*';
  inp.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    
    // בדיקת גודל הקובץ (עד 20MB) למניעת קריסת מסד הנתונים
    if (f.size > 20 * 1024 * 1024) {
      alert('שגיאה: קובץ הסרטון גדול מדי (מעל 20MB). אנא העלה סרטון קצר ומכווץ יותר כדי שיישמר בהצלחה.');
      return;
    }
    
    // בדיקת אורך הסרטון (עד 10 שניות)
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = URL.createObjectURL(f);
    tempVideo.onloadedmetadata = () => {
      window.URL.revokeObjectURL(tempVideo.src);
      if (tempVideo.duration > 10.5) { // סף קל להבדלים זעירים בקודק
        alert('שגיאה: הסרטון ארוך מ-10 שניות! (' + Math.round(tempVideo.duration) + ' שניות). אנא בחר סרטון קצר יותר.');
        return;
      }
      
      const r = new FileReader();
      r.onload = ev => {
        courseVidData = ev.target.result;
        const p = document.getElementById('course-vid-preview');
        p.src = courseVidData; p.style.display = 'block';
        document.getElementById('course-vid-pick').textContent = '✓ סרטון נבחר';
      };
      r.readAsDataURL(f);
    };
  };
  inp.click();
});

document.getElementById('course-cancel').addEventListener('click', () => {
  document.getElementById('course-modal').style.display = 'none';
});

document.getElementById('course-save').addEventListener('click', () => {
  const title = document.getElementById('course-title').value.trim();
  if (!title) { alert('חובה כותרת קורס'); return; }
  
  const videoUrl = document.getElementById('course-vid-url').value.trim();
  const finalVideo = videoUrl || courseVidData;
  if (!finalVideo) { alert('חובה להדביק קישור לסרטון (Vimeo/YouTube) או לבחור קובץ מקומי'); return; }

  const courses = courseGetCourses();
  courses.unshift({
    id: 'c' + Date.now(),
    title,
    summary: document.getElementById('course-summary').value.trim(),
    image: courseImgData,
    video: finalVideo,
    author: document.getElementById('course-author').value.trim(),
    category: document.getElementById('course-category').value.trim(),
    categoryColor: '#2196F3',
    timestamp: new Date().toLocaleDateString('he-IL')
  });
  mainContent.innerHTML = buildCoursesPage(courses);
  saveCurrentPageContent();
  document.getElementById('course-modal').style.display = 'none';
});

const btnAddCoursesPage = document.getElementById('btn-add-courses-page');
if (btnAddCoursesPage) {
  btnAddCoursesPage.addEventListener('click', () => {
    const title = prompt('שם העמוד של הקורסים:') || 'קורסים';
    const newId = 'page-' + Date.now();
    pages.push({ id: newId, title: title.trim(), content: buildCoursesPage(COURSES_SAMPLES) });
    topNavPages.push(newId);
    activePageId = newId;
    saveToStorage();
    renderSideMenu();
    renderTopNav();
    renderPage();
  });
}

// ============================================================
// צפייה במסך מלא עם דפדוף בין התמונות (Gallery Lightbox)
// עובד בעמוד התמונות ובעמוד הסיפורים, במחשב ובנייד:
// חצים, מקלדת (חצים + Esc), החלקה במגע, ומונה תמונות.
// ============================================================
let lbImages = [];
let lbIndex = 0;

function artBuildLightbox() {
  if (document.getElementById('lightbox-modal')) return;
  const lb = document.createElement('div');
  lb.id = 'lightbox-modal';
  lb.className = 'art-lightbox';
  lb.innerHTML = `
    <button class="art-lb-close" type="button" aria-label="סגור">✕</button>
    <button class="art-lb-nav art-lb-prev" type="button" aria-label="הקודם"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
    <img class="art-lb-img" id="lightbox-img" alt="">
    <button class="art-lb-nav art-lb-next" type="button" aria-label="הבא"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
    <div class="art-lb-counter" id="lightbox-counter"></div>
  `;
  document.body.appendChild(lb);

  lb.querySelector('.art-lb-close').onclick = (e) => { e.stopPropagation(); artCloseLightbox(); };
  lb.querySelector('.art-lb-prev').onclick = (e) => { e.stopPropagation(); artLightboxStep(-1); };
  lb.querySelector('.art-lb-next').onclick = (e) => { e.stopPropagation(); artLightboxStep(1); };
  // לחיצה על הרקע (לא על התמונה או הכפתורים) סוגרת
  lb.onclick = (e) => { if (e.target === lb) artCloseLightbox(); };

  // החלקה בנייד: שמאלה = הבאה, ימינה = הקודמת
  let sx = 0, sy = 0;
  lb.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) artLightboxStep(dx < 0 ? 1 : -1);
  }, { passive: true });
}

function artUpdateLightbox() {
  const img = document.getElementById('lightbox-img');
  const counter = document.getElementById('lightbox-counter');
  const lb = document.getElementById('lightbox-modal');
  if (!img || !lb) return;
  img.src = lbImages[lbIndex];
  const multi = lbImages.length > 1;
  counter.textContent = multi ? `תמונה מס' ${lbIndex + 1} מתוך ${lbImages.length}` : `תמונה 1 מתוך 1`;
  lb.querySelector('.art-lb-prev').style.display = multi ? '' : 'none';
  lb.querySelector('.art-lb-next').style.display = multi ? '' : 'none';
}

function artLightboxStep(dir) {
  if (lbImages.length < 2) return;
  lbIndex = (lbIndex + dir + lbImages.length) % lbImages.length;
  artUpdateLightbox();
}

function artLightboxKey(e) {
  if (e.key === 'Escape') artCloseLightbox();
  else if (e.key === 'ArrowLeft') artLightboxStep(1);   // באתר RTL שמאלה = הבא
  else if (e.key === 'ArrowRight') artLightboxStep(-1); // ימינה = הקודם
}

function artCloseLightbox() {
  const lb = document.getElementById('lightbox-modal');
  if (lb) lb.style.display = 'none';
  document.removeEventListener('keydown', artLightboxKey);
}

// פותח צפייה במסך מלא עם רשימת תמונות ואינדקס התחלתי
function artOpenGallery(images, startIndex) {
  lbImages = (Array.isArray(images) ? images : [images]).filter(Boolean);
  if (!lbImages.length) return;
  lbIndex = Math.min(Math.max(startIndex || 0, 0), lbImages.length - 1);
  artBuildLightbox();
  artUpdateLightbox();
  document.getElementById('lightbox-modal').style.display = 'flex';
  document.addEventListener('keydown', artLightboxKey);
}
window.artOpenGallery = artOpenGallery;

// פותח את הגלריה של פריט לפי המזהה שלו, מהנתונים השמורים בעמוד.
// scope הוא 'photos' או 'stories'. currentSrc קובע באיזו תמונה להתחיל.
function artGalleryById(scope, id, currentSrc) {
  const container = mainContent.querySelector('.' + scope + '-page');
  if (!container) return;
  const key = scope === 'photos' ? 'photosJson' : 'storiesJson';
  let items = [];
  try { items = JSON.parse(decodeURIComponent(container.dataset[key] || '')); } catch (e) { return; }
  const item = (items || []).find(x => x.id === id);
  if (!item) return;
  const imgs = (item.images && item.images.length) ? item.images.filter(Boolean) : (item.image ? [item.image] : []);
  if (!imgs.length) return;
  let idx = currentSrc ? imgs.indexOf(currentSrc) : 0;
  if (idx < 0) idx = 0;
  artOpenGallery(imgs, idx);
}
window.artGalleryById = artGalleryById;

// תאימות אחורה: קריאה עם תמונה אחת פותחת את אותה צפייה עם תמונה יחידה
function artZoomImage(imgUrl) {
  artOpenGallery([imgUrl], 0);
}

window.buildCoursesPage = buildCoursesPage;
window.courseDelete = courseDelete;
window.openCourseModal = openCourseModal;
window.courseSearch = courseSearch;
window.courseOpenDetail = courseOpenDetail;
window.courseGoBack = courseGoBack;
window.artZoomImage = artZoomImage;

// ============================================================================
// מערכת צ'אט תמיכה בזמן אמת (Support Chat Real-time Logic)
// ============================================================================
let chatUnsubscribe = null;
let chatListUnsubscribe = null;
let chatBadgeUnsubscribe = null;
let activeChatUser = null; // מזהה המשתמש שהמנהל מתכתב איתו כרגע

// פתיחה/סגירה של חלונית הצ'אט
function chatTogglePanel() {
  const panel = document.getElementById('global-chat-panel');
  if (!panel) return;
  
  const user = auth.currentUser;
  if (!user) {
    alert("יש להתחבר עם המייל כדי לכתוב הודעה לתמיכה.");
    const authModal = document.getElementById('auth-modal');
    if (authModal) authModal.style.display = 'flex';
    return;
  }

  const isOpening = panel.style.display === 'none';
  panel.style.display = isOpening ? 'flex' : 'none';
  
  if (isOpening) {
    const fab = document.getElementById('global-chat-fab');
    if (fab) {
      fab.classList.add('chat-bump');
      setTimeout(() => fab.classList.remove('chat-bump'), 150);
    }
    loadChatContent(user);
  } else {
    chatCleanup();
  }
}

// ניקוי מאזינים של הצ'אט
function chatCleanup() {
  if (chatUnsubscribe) {
    chatUnsubscribe();
    chatUnsubscribe = null;
  }
  if (chatListUnsubscribe) {
    chatListUnsubscribe();
    chatListUnsubscribe = null;
  }
}

// האזנה והצגת התראות על הודעות חדשות (Badge)
function initChatBadgeListeners(user) {
  if (!user) return;
  
  const badgeEl = document.getElementById('global-chat-badge');
  if (!badgeEl) return;
  
  const ADMIN_EMAIL = "yoni98321@gmail.com";
  
  if (chatBadgeUnsubscribe) chatBadgeUnsubscribe();
  
  if (user.email === ADMIN_EMAIL) {
    // מנהל: סופר כמה שיחות יש שבהן adminRead === false
    const chatsRef = ref(db, 'website/chats');
    chatBadgeUnsubscribe = onValue(chatsRef, (snapshot) => {
      const chats = snapshot.val();
      let unreadCount = 0;
      if (chats) {
        Object.keys(chats).forEach(uid => {
          if (chats[uid].adminRead === false) {
            unreadCount++;
          }
        });
      }
      if (unreadCount > 0) {
        badgeEl.textContent = unreadCount;
        badgeEl.style.display = 'block';
      } else {
        badgeEl.style.display = 'none';
      }
    });
  } else {
    // משתמש רגיל: בודק האם יש הודעה חדשה עבורו מהמנהל
    const userChatRef = ref(db, 'website/chats/' + user.uid);
    chatBadgeUnsubscribe = onValue(userChatRef, (snapshot) => {
      const chatData = snapshot.val();
      if (chatData && chatData.userRead === false) {
        badgeEl.textContent = '1';
        badgeEl.style.display = 'block';
      } else {
        badgeEl.style.display = 'none';
      }
    });
  }
}

// טעינת תוכן השיחה בהתאם לתפקיד המשתמש
function loadChatContent(user) {
  const ADMIN_EMAIL = "yoni98321@gmail.com";
  const chatBody = document.getElementById('chat-body');
  if (!chatBody) return;
  
  chatCleanup(); // ניקוי מאזינים קודמים

  if (user.email === ADMIN_EMAIL) {
    // מנהל רואה רשימת שיחות פעילות
    if (activeChatUser) {
      loadSingleChat(activeChatUser);
    } else {
      loadAdminChatsList();
    }
  } else {
    // משתמש רגיל רואה את השיחה שלו
    loadSingleChat(user.uid);
  }
}

// טעינת רשימת הפניות למנהל
function loadAdminChatsList() {
  const chatBody = document.getElementById('chat-body');
  const titleEl = document.getElementById('chat-title');
  if (titleEl) titleEl.textContent = 'פניות לקוחות';
  
  if (chatBody) chatBody.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">טוען פניות...</div>';
  
  const chatsRef = ref(db, 'website/chats');
  chatListUnsubscribe = onValue(chatsRef, (snapshot) => {
    const chats = snapshot.val();
    if (activeChatUser) return; // הגנה ממרוץ תהליכים
    renderAdminChatList(chats);
  });
}

// רינדור רשימת השיחות של המנהל
function renderAdminChatList(chats) {
  const chatBody = document.getElementById('chat-body');
  if (!chatBody) return;
  
  if (!chats) {
    chatBody.innerHTML = '<div style="text-align:center;color:#999;padding:30px;">אין פניות פעילות כרגע.</div>';
    return;
  }
  
  // מיון השיחות לפי מועד ההודעה האחרונה
  const sortedUids = Object.keys(chats).sort((a, b) => {
    return (chats[b].lastTimestamp || 0) - (chats[a].lastTimestamp || 0);
  });
  
  const listHTML = sortedUids.map(uid => {
    const chat = chats[uid];
    const hasUnread = chat.adminRead === false;
    return `
      <div class="chat-user-item" onclick="loadSingleChat('${uid}')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="user-name">${escHtml(chat.userName || 'משתמש')}</span>
          ${hasUnread ? '<span class="unread-dot"></span>' : ''}
        </div>
        <span class="user-email">${escHtml(chat.userEmail || '')}</span>
        <div style="font-size:12px;color:#888;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${escHtml(chat.lastMessage || 'אין הודעות')}
        </div>
      </div>
    `;
  }).join('');
  
  chatBody.innerHTML = `<div class="chat-list-view">${listHTML}</div>`;
}

// טעינת שיחה בודדת (לגולש או למנהל)
function loadSingleChat(userId) {
  const ADMIN_EMAIL = "yoni98321@gmail.com";
  const user = auth.currentUser;
  if (!user) return;
  
  const isManager = user.email === ADMIN_EMAIL;
  if (isManager) activeChatUser = userId;
  
  const chatBody = document.getElementById('chat-body');
  if (chatBody) chatBody.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">טוען הודעות...</div>';
  
  // מעקב ריל-טיים אחרי השיחה הספציפית הזו
  const userChatRef = ref(db, 'website/chats/' + userId);
  if (chatUnsubscribe) chatUnsubscribe();
  chatUnsubscribe = onValue(userChatRef, (snapshot) => {
    const chatData = snapshot.val();
    if (isManager && activeChatUser !== userId) return; // הגנה ממרוץ תהליכים
    
    // עדכון כותרת השיחה
    const titleEl = document.getElementById('chat-title');
    if (titleEl) {
      if (isManager) {
        titleEl.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
            <button onclick="chatGoBackToAdminList()" style="font-size:16px; font-weight:900; background:none; border:none; color:#fff; cursor:pointer; padding:0 4px;">←</button>
            <span>שיחה עם ${chatData ? (chatData.userName || 'משתמש') : 'תמיכה'}</span>
          </div>
        `;
      } else {
        titleEl.textContent = 'שיחה עם תמיכה';
      }
    }
    
    renderUserChatMessages(chatData);
    
    // סימון שההודעות נקראו
    if (chatData) {
      if (isManager && chatData.adminRead === false) {
        update(ref(db, 'website/chats/' + userId), { adminRead: true });
      } else if (!isManager && chatData.userRead === false) {
        update(ref(db, 'website/chats/' + userId), { userRead: true });
      }
    }
  });
}

// חזרה של מנהל לרשימת הפניות
function chatGoBackToAdminList() {
  activeChatUser = null;
  loadChatContent(auth.currentUser);
}

// מעבר לצ'אט מסך מלא / שחזור
function chatToggleMaximize() {
  const panel = document.getElementById('global-chat-panel');
  if (!panel) return;
  
  panel.classList.toggle('chat-maximized');
  
  const icon = document.getElementById('maximize-icon');
  if (icon) {
    if (panel.classList.contains('chat-maximized')) {
      icon.innerHTML = '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/>';
    } else {
      icon.innerHTML = '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>';
    }
  }
}

// רינדור הודעות הצ'אט (משותף למשתמש ומנהל)
function renderUserChatMessages(chatData) {
  const chatBody = document.getElementById('chat-body');
  if (!chatBody) return;
  
  if (!chatData || !chatData.messages) {
    chatBody.innerHTML = '<div style="text-align:center;color:#999;padding:30px;line-height:1.5;">שלח הודעה כדי להתחיל בשיחה עם מנהל האתר!</div>';
    return;
  }
  
  const user = auth.currentUser;
  const ADMIN_EMAIL = "yoni98321@gmail.com";
  const isCurrentUserAdmin = user && user.email === ADMIN_EMAIL;
  
  const msgs = chatData.messages;
  const msgsHTML = Object.keys(msgs).map(key => {
    const m = msgs[key];
    
    // בודקים האם ההודעה נשלחה על ידי המשתמש המחובר כרגע
    let isSentByMe = false;
    if (isCurrentUserAdmin) {
      isSentByMe = (m.sender === 'admin');
    } else {
      isSentByMe = (m.sender === 'user');
    }
    
    const bubbleClass = isSentByMe ? 'msg-sent' : 'msg-received';
    const timeString = m.timestamp ? new Date(m.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '';
    return `
      <div class="chat-message ${bubbleClass}">
        <div class="chat-msg-text">${escHtml(m.text)}</div>
        <span class="chat-msg-time">${timeString}</span>
      </div>
    `;
  }).join('');
  
  chatBody.innerHTML = msgsHTML;
  chatBody.scrollTop = chatBody.scrollHeight; // גלילה אוטומטית למטה
}

// שליחת הודעה
function chatSendMessage() {
  const inputEl = document.getElementById('chat-input');
  if (!inputEl) return;
  const text = inputEl.value.trim();
  if (!text) return;
  
  const user = auth.currentUser;
  if (!user) return;
  
  const ADMIN_EMAIL = "yoni98321@gmail.com";
  const isManager = user.email === ADMIN_EMAIL;
  const targetUserUid = isManager ? activeChatUser : user.uid;
  
  if (!targetUserUid) {
    alert("שגיאה: לא נבחר משתמש יעד לשליחת הודעה.");
    return;
  }
  
  const messagePayload = {
    text: text,
    sender: isManager ? 'admin' : 'user',
    timestamp: Date.now()
  };
  
  const messagesRef = ref(db, 'website/chats/' + targetUserUid + '/messages');
  push(messagesRef, messagePayload).then(() => {
    const chatRef = ref(db, 'website/chats/' + targetUserUid);
    const updates = {
      lastMessage: text,
      lastTimestamp: Date.now()
    };
    
    if (isManager) {
      updates.adminRead = true;
      updates.userRead = false;
    } else {
      updates.userName = user.displayName || 'משתמש';
      updates.userEmail = user.email;
      updates.adminRead = false;
      updates.userRead = true;
    }
    
    update(chatRef, updates);
  }).catch(err => {
    console.error("שגיאה בשליחת הודעה:", err);
  });
  
  inputEl.value = '';
}

// ייצוא פונקציות לאובייקט החלון עבור ה-HTML
window.chatTogglePanel = chatTogglePanel;
window.chatSendMessage = chatSendMessage;
window.chatGoBackToAdminList = chatGoBackToAdminList;
window.chatCleanup = chatCleanup;
window.initChatBadgeListeners = initChatBadgeListeners;
window.updateFABsVisibility = updateFABsVisibility;

// פונקציות ניהול עבור הלחצנים הצפים (הסתרה ומחיקה ישירה)
async function adminToggleCartHide() {
  hideCart = !hideCart;
  try {
    await update(ref(db, 'website'), { hideCart: hideCart });
    updateFABsVisibility();
  } catch(e) { console.error(e); }
}

async function adminDeleteCart() {
  if (confirm("האם למחוק את כפתור עגלת הקניות לחלוטין מהאתר? (תוכל לשחזר אותו מסרגל הניהול)")) {
    deleteCart = true;
    try {
      await update(ref(db, 'website'), { deleteCart: true });
      updateFABsVisibility();
    } catch(e) { console.error(e); }
  }
}

async function adminToggleChatHide() {
  hideChat = !hideChat;
  try {
    await update(ref(db, 'website'), { hideChat: hideChat });
    updateFABsVisibility();
  } catch(e) { console.error(e); }
}

async function adminDeleteChat() {
  if (confirm("האם למחוק את כפתור הצ'אט לחלוטין מהאתר? (תוכל לשחזר אותו מסרגל הניהול)")) {
    deleteChat = true;
    try {
      await update(ref(db, 'website'), { deleteChat: true });
      updateFABsVisibility();
    } catch(e) { console.error(e); }
  }
}

// שחזור דרך סרגל הניהול
async function adminRestoreCart() {
  deleteCart = false;
  try {
    await update(ref(db, 'website'), { deleteCart: false });
    updateFABsVisibility();
    alert("סל הקניות שוחזר בהצלחה!");
  } catch(e) { console.error(e); }
}

async function adminRestoreChat() {
  deleteChat = false;
  try {
    await update(ref(db, 'website'), { deleteChat: false });
    updateFABsVisibility();
    alert("צ'אט התמיכה שוחזר בהצלחה!");
  } catch(e) { console.error(e); }
}

// האזנה לכפתורי שחזור בסרגל
const btnRestoreChat = document.getElementById('btn-restore-chat');
if (btnRestoreChat) btnRestoreChat.addEventListener('click', adminRestoreChat);

window.adminToggleCartHide = adminToggleCartHide;
window.adminDeleteCart = adminDeleteCart;
window.adminToggleChatHide = adminToggleChatHide;
window.adminDeleteChat = adminDeleteChat;
window.adminRestoreCart = adminRestoreCart;
window.adminRestoreChat = adminRestoreChat;
window.loadSingleChat = loadSingleChat;
window.chatToggleMaximize = chatToggleMaximize;

let promotedSiteImgData = '';

function openPromotedSiteModal() {
  if (!isEditMode) return;
  document.getElementById('promoted-site-name').value = '';
  document.getElementById('promoted-site-url').value = '';
  const preview = document.getElementById('promoted-site-img-preview');
  preview.style.display = 'none'; preview.src = '';
  promotedSiteImgData = '';
  document.getElementById('promoted-site-img-pick').textContent = 'בחר תמונת אייקון';
  document.getElementById('promoted-site-modal').style.display = 'flex';
}

function deletePromotedSite(index) {
  if (!isEditMode) return;
  if (!confirm('האם למחוק קישור זה?')) return;
  PROMOTED_SITES.splice(index, 1);
  localStorage.setItem('promoted_sites', JSON.stringify(PROMOTED_SITES));
  refreshCurrentPage();
}

function refreshCurrentPage() {
  renderPage();
  const currentPage = pages.find(p => p.id === activePageId);
  if (currentPage) {
    currentPage.content = mainContent.innerHTML;
    saveToStorage();
  }
}

// Modal Listeners
const btnPromotedSitePick = document.getElementById('promoted-site-img-pick');
if (btnPromotedSitePick) {
  btnPromotedSitePick.addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = ev => {
        promotedSiteImgData = ev.target.result;
        const p = document.getElementById('promoted-site-img-preview');
        p.src = promotedSiteImgData; p.style.display = 'block';
        btnPromotedSitePick.textContent = '✓ אייקון נבחר';
      };
      r.readAsDataURL(f);
    };
    inp.click();
  });
}

const btnPromotedSiteCancel = document.getElementById('promoted-site-cancel');
if (btnPromotedSiteCancel) {
  btnPromotedSiteCancel.addEventListener('click', () => {
    document.getElementById('promoted-site-modal').style.display = 'none';
  });
}

const btnPromotedSiteSave = document.getElementById('promoted-site-save');
if (btnPromotedSiteSave) {
  btnPromotedSiteSave.addEventListener('click', () => {
    const name = document.getElementById('promoted-site-name').value.trim();
    const url = document.getElementById('promoted-site-url').value.trim();
    if (!name || !url) { alert('חובה למלא שם וכתובת קישור'); return; }

    let formattedUrl = url;
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    PROMOTED_SITES.push({
      name,
      url: formattedUrl,
      icon: promotedSiteImgData || '🌐'
    });

    localStorage.setItem('promoted_sites', JSON.stringify(PROMOTED_SITES));
    refreshCurrentPage();
    document.getElementById('promoted-site-modal').style.display = 'none';
  });
}

window.deletePromotedSite = deletePromotedSite;
window.openPromotedSiteModal = openPromotedSiteModal;
window.refreshCurrentPage = refreshCurrentPage;

function togglePinArticle(id) {
  if (!isEditMode) return;
  const arts = artGetArticles();
  const art = arts.find(a => a.id === id);
  if (art) {
    art.pinned = !art.pinned;
    mainContent.innerHTML = buildArticlesPage(arts);
    saveCurrentPageContent();
  }
}

function togglePinStory(id) {
  if (!isEditMode) return;
  const stories = storyGetStories();
  const story = stories.find(s => s.id === id);
  if (story) {
    story.pinned = !story.pinned;
    mainContent.innerHTML = buildStoriesPage(stories, storyGetCurrentKind());
    saveCurrentPageContent();
  }
}

function togglePinPhoto(id) {
  if (!isEditMode) return;
  const albums = photoGetAlbums();
  const album = albums.find(a => a.id === id);
  if (album) {
    album.pinned = !album.pinned;
    mainContent.innerHTML = buildPhotosPage(albums);
    saveCurrentPageContent();
  }
}

function togglePinCourse(id) {
  if (!isEditMode) return;
  const courses = courseGetCourses();
  const course = courses.find(c => c.id === id);
  if (course) {
    course.pinned = !course.pinned;
    mainContent.innerHTML = buildCoursesPage(courses);
    saveCurrentPageContent();
  }
}

window.togglePinArticle = togglePinArticle;
window.togglePinStory = togglePinStory;
window.togglePinPhoto = togglePinPhoto;
window.togglePinCourse = togglePinCourse;

// ============================================================
// מערכת קהילה ושיתוף פנטזיות (Community System)
// ============================================================

let communityPosts = [];
let communitySearchQuery = '';
let currentCommPostImgData = '';

// סנכרון פוסטים בזמן אמת מול פיירבייס
onValue(ref(db, 'website/community_posts'), (snapshot) => {
  const data = snapshot.val();
  communityPosts = [];
  if (data) {
    for (let key in data) {
      communityPosts.push({ id: key, ...data[key] });
    }
    // מיון לפי תאריך יצירה (הכי חדש בהתחלה)
    communityPosts.sort((a, b) => b.timestamp - a.timestamp);
  }
  // רענון העמוד אם אנחנו כרגע בדף קהילה
  const current = pages.find(p => p.id === activePageId);
  if (current && current.content && current.content.includes('community-page')) {
    const listEl = document.getElementById('community-posts-list');
    if (listEl) {
      listEl.innerHTML = renderCommunityPostsList();
    }
  }
});

function buildCommunityPage() {
  return `
    <div class="articles-page community-page" style="direction: rtl; font-family: system-ui, -apple-system, sans-serif;">
      <!-- כותרת ראשית -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px; border-bottom:2px solid #f0f0f0; padding-bottom:16px;">
        <div>
          <h2 style="font-size:24px; font-weight:800; color:#ec4899; margin:0; display:flex; align-items:center; gap:8px;">👥 קהילת השיתופים והפנטזיות</h2>
          <p style="font-size:14px; color:#6b7280; margin:6px 0 0 0;">מרחב פתוח לשתף סיפורים, פנטזיות ותמונות, לקרוא ולהגיב אחד לשני!</p>
        </div>
        <button onclick="openNewPostModal()" style="background:#ec4899; color:white; border:none; padding:12px 24px; border-radius:14px; font-size:14px; font-weight:bold; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 4px 12px rgba(236,72,153,0.3); transition:transform 0.2s, background 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1.0)'">
          ✍️ שתף פנטזיה חדשה
        </button>
      </div>
      
      <!-- חיפוש וסינון -->
      <div style="margin-bottom:24px; position:relative;">
        <input type="text" id="community-search" placeholder="חפש כותרת, תוכן או יוצר..." oninput="filterCommunityPosts(this.value)" value="${escHtml(communitySearchQuery)}" style="width:100%; padding:12px 16px; border:1.5px solid #e5e7eb; border-radius:14px; font-size:14px; box-sizing:border-box; outline:none; transition:border-color 0.2s;" onfocus="this.style.borderColor='#ec4899'">
      </div>

      <!-- רשימת הפוסטים -->
      <div id="community-posts-list" style="display:flex; flex-direction:column; gap:20px;">
        ${renderCommunityPostsList()}
      </div>
    </div>
  `;
}
window.buildCommunityPage = buildCommunityPage;

function filterCommunityPosts(val) {
  communitySearchQuery = val;
  const listEl = document.getElementById('community-posts-list');
  if (listEl) {
    listEl.innerHTML = renderCommunityPostsList();
  }
}
window.filterCommunityPosts = filterCommunityPosts;

// מציג את אפשרויות הסקר כפסי הצבעה. כל אחד יכול להצביע, וההצבעה שלו
// מודגשת. הפס גדל מימין (RTL) לפי אחוז ההצבעות.
function communityPollHTML(p) {
  if (p.type !== 'poll' || !Array.isArray(p.options) || !p.options.length) return '';
  const votes = p.votes || {};
  const counts = p.options.map((_, i) => Object.values(votes).filter(v => v === i).length);
  const total = counts.reduce((a, b) => a + b, 0);
  const user = auth.currentUser;
  const myVote = (user && votes[user.uid] !== undefined) ? votes[user.uid] : null;

  return `
    <div style="display:flex; flex-direction:column; gap:8px; margin-top:2px;">
      ${p.options.map((opt, i) => {
        const c = counts[i];
        const pct = total ? Math.round((c / total) * 100) : 0;
        const chosen = myVote === i;
        return `
          <button onclick="submitCommunityVote('${artEsc(p.id)}', ${i})" style="position:relative; overflow:hidden; text-align:right; border:1.5px solid ${chosen ? '#ec4899' : '#e5e7eb'}; background:#fff; border-radius:12px; padding:11px 14px; cursor:pointer; font-family:inherit; transition:border-color 0.2s;">
            <span style="position:absolute; top:0; bottom:0; right:0; width:${pct}%; background:${chosen ? 'rgba(236,72,153,0.16)' : 'rgba(0,0,0,0.05)'}; z-index:0; transition:width 0.3s ease;"></span>
            <span style="position:relative; z-index:1; display:flex; justify-content:space-between; align-items:center; gap:10px; font-size:14px; font-weight:600; color:#374151;">
              <span>${chosen ? '✓ ' : ''}${escHtml(opt)}</span>
              <span style="font-size:12px; color:#6b7280; font-weight:700; white-space:nowrap;">${pct}% · ${c}</span>
            </span>
          </button>
        `;
      }).join('')}
      <div style="font-size:12px; color:#9ca3af; font-weight:700;">סה"כ ${total} הצבעות${myVote === null ? ' · לחץ כדי להצביע' : ' · אפשר לשנות בחירה'}</div>
    </div>
  `;
}

window.communityPollHTML = communityPollHTML;

function renderCommunityPostsList() {
  const query = communitySearchQuery.toLowerCase().trim();
  const filtered = communityPosts.filter(p => {
    return (p.title || '').toLowerCase().includes(query) ||
           (p.body || '').toLowerCase().includes(query) ||
           (p.author || '').toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    return `<div style="text-align:center; padding:40px; color:#888; background:#fff; border-radius:16px; border:1px solid #eee; font-size:14px;">לא נמצאו שיתופים תואמים בקהילה. היה הראשון לשתף! ✨</div>`;
  }

  return filtered.map(p => {
    const formattedDate = new Date(p.timestamp).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const commentsList = p.comments ? Object.keys(p.comments).map(k => ({ id: k, ...p.comments[k] })).sort((a,b) => a.timestamp - b.timestamp) : [];
    const isQuestion = p.type === 'question';
    const isPoll = p.type === 'poll';
    // תוויות לפי סוג: שאלה נענית ב"תשובות", השאר ב"תגובות"
    const commentsLabel = isQuestion ? 'תשובות' : 'תגובות';
    const commentPlaceholder = isQuestion ? 'כתוב תשובה...' : 'כתוב תגובה...';
    const typeBadge = isPoll
      ? `<span style="display:inline-block; font-size:11px; font-weight:800; color:#7c3aed; background:rgba(124,58,237,0.1); padding:3px 10px; border-radius:999px; margin-bottom:6px;">🗳️ סקר</span>`
      : isQuestion
      ? `<span style="display:inline-block; font-size:11px; font-weight:800; color:#2563eb; background:rgba(37,99,235,0.1); padding:3px 10px; border-radius:999px; margin-bottom:6px;">❓ שאלה</span>`
      : '';

    return `
      <div class="art-sidebar-box" style="background:#fff; border:1px solid #eee; border-radius:18px; padding:20px; box-shadow:0 4px 15px rgba(0,0,0,0.02); display:flex; flex-direction:column; gap:14px; text-align:right;">
        <!-- כותרת ופרטי כותב -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
          <div>
            ${typeBadge}
            <h3 style="margin:0 0 4px 0; font-size:18px; font-weight:800; color:#111;">${escHtml(p.title)}</h3>
            <div style="font-size:12px; color:#6b7280; display:flex; align-items:center; gap:8px;">
              <span class="photo-author-link" onclick="event.stopPropagation(); openUserPage('${artEsc(p.authorId || '')}', '${artEsc(p.author)}')" style="cursor:pointer; color:#ec4899; text-decoration:underline; font-weight:700;">👤 ${escHtml(p.author)}</span>
              <span>·</span>
              <span>🕒 ${formattedDate}</span>
            </div>
          </div>
          ${isEditMode ? `
            <button onclick="deleteCommunityPost('${artEsc(p.id)}')" style="background:#fef2f2; color:#ef4444; border:none; padding:6px 12px; border-radius:8px; font-size:12px; cursor:pointer; font-weight:bold;">הסר פוסט 🗑️</button>
          ` : ''}
        </div>

        <!-- תוכן הפוסט (מוסתר אם ריק, למשל בסקר בלי הסבר) -->
        ${p.body ? `<p style="margin:0; font-size:15px; line-height:1.7; color:#374151; white-space:pre-wrap; text-align:justify;">${escHtml(p.body)}</p>` : ''}

        <!-- אפשרויות הסקר -->
        ${communityPollHTML(p)}

        <!-- תמונה מצורפת אם קיימת -->
        ${p.image ? `
          <div style="width:100%; max-height:350px; border-radius:12px; overflow:hidden; border:1px solid #f0f0f0; background:#f9f9f9; margin-top:4px;">
            <img src="${escHtml(p.image)}" style="width:100%; height:100%; max-height:350px; object-fit:contain; display:block; cursor:zoom-in;" onclick="artZoomImage('${artEsc(p.image)}')">
          </div>
        ` : ''}

        <!-- שורת פעולות (לייקים ותגובות) -->
        <div style="display:flex; align-items:center; gap:16px; border-top:1px solid #f3f4f6; border-bottom:1px solid #f3f4f6; padding:10px 0; margin-top:6px;">
          <button onclick="toggleCommunityLike('${artEsc(p.id)}')" style="background:none; border:none; cursor:pointer; display:flex; align-items:center; gap:6px; font-weight:bold; font-size:13px; color:#4b5563; padding:4px 8px; border-radius:6px; transition:background 0.2s;" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='none'">
            <span style="font-size:16px;">❤️</span>
            <span>${p.likes || 0} לייקים</span>
          </button>
          <div style="font-size:13px; color:#4b5563; font-weight:bold; display:flex; align-items:center; gap:6px;">
            <span style="font-size:16px;">💬</span>
            <span>${commentsList.length} ${commentsLabel}</span>
          </div>
        </div>

        <!-- רשימת תגובות -->
        ${commentsList.length > 0 ? `
          <div style="display:flex; flex-direction:column; gap:10px; background:#f9fafb; padding:12px; border-radius:12px; border:1px solid #f3f4f6;">
            ${commentsList.map(c => {
              const cDate = new Date(c.timestamp).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
              return `
                <div style="border-bottom:1px solid #f1f2f4; padding-bottom:8px; margin-bottom:8px; &:last-child { border:none; padding-bottom:0; margin-bottom:0; }">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <span class="photo-author-link" onclick="openUserPage('${artEsc(c.authorId || '')}', '${artEsc(c.author)}')" style="font-size:12px; font-weight:800; color:#ec4899; cursor:pointer; text-decoration:underline;">${escHtml(c.author)}</span>
                    <span style="font-size:10px; color:#9ca3af;">${cDate}</span>
                  </div>
                  <p style="margin:0; font-size:13.5px; color:#4b5563; line-height:1.5;">${escHtml(c.body)}</p>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        <!-- כתיבת תגובה חדשה -->
        <div style="display:flex; gap:8px; align-items:center;">
          <input type="text" id="comment-input-${escHtml(p.id)}" placeholder="${commentPlaceholder}" style="flex:1; padding:8px 12px; border:1px solid #ddd; border-radius:10px; font-size:13px; outline:none;" onkeydown="if(event.key==='Enter')submitCommunityComment('${artEsc(p.id)}')">
          <button onclick="submitCommunityComment('${artEsc(p.id)}')" style="background:#ec4899; color:white; border:none; padding:8px 16px; border-radius:10px; font-size:13px; font-weight:bold; cursor:pointer; transition:background 0.2s;">שלח 🚀</button>
        </div>
      </div>
    `;
  }).join('');
}
window.renderCommunityPostsList = renderCommunityPostsList;

// סוג הפרסום שנבחר במודל: 'share' (שיתוף) / 'poll' (סקר) / 'question' (שאלה)
let currentCommPostType = 'share';

function setCommPostType(type) {
  currentCommPostType = type;
  ['share', 'poll', 'question'].forEach(t => {
    const btn = document.getElementById('comm-type-' + t);
    if (btn) btn.classList.toggle('active', t === type);
  });
  const bodyWrap = document.getElementById('comm-body-wrap');
  const pollWrap = document.getElementById('comm-poll-wrap');
  const titleLabel = document.getElementById('comm-title-label');
  const bodyLabel = document.getElementById('comm-body-label');
  const titleInput = document.getElementById('comm-post-title');
  const modalTitle = document.getElementById('comm-modal-title');

  if (type === 'poll') {
    pollWrap.style.display = 'flex';
    bodyWrap.style.display = 'flex';
    if (titleLabel) titleLabel.textContent = 'שאלת הסקר *';
    if (titleInput) titleInput.placeholder = 'על מה מצביעים?';
    if (bodyLabel) bodyLabel.textContent = 'הסבר (אופציונלי)';
    if (modalTitle) modalTitle.textContent = '🗳️ יצירת סקר חדש';
  } else if (type === 'question') {
    pollWrap.style.display = 'none';
    bodyWrap.style.display = 'flex';
    if (titleLabel) titleLabel.textContent = 'השאלה שלך *';
    if (titleInput) titleInput.placeholder = 'מה תרצה לשאול את הקהילה?';
    if (bodyLabel) bodyLabel.textContent = 'פירוט (אופציונלי)';
    if (modalTitle) modalTitle.textContent = '❓ שאלה חדשה לקהילה';
  } else {
    pollWrap.style.display = 'none';
    bodyWrap.style.display = 'flex';
    if (titleLabel) titleLabel.textContent = 'כותרת *';
    if (titleInput) titleInput.placeholder = 'מה כותרת השיתוף?';
    if (bodyLabel) bodyLabel.textContent = 'תוכן *';
    if (modalTitle) modalTitle.textContent = '✍️ שיתוף חדש בקהילה';
  }
}
window.setCommPostType = setCommPostType;

function openNewPostModal() {
  const user = auth.currentUser;
  if (!user) {
    alert("עלייך להתחבר למשתמש על מנת לשתף בקהילה! ❤️");
    return;
  }
  document.getElementById('comm-post-title').value = '';
  document.getElementById('comm-post-body').value = '';
  document.querySelectorAll('#comm-poll-wrap .comm-poll-opt').forEach(inp => inp.value = '');
  const preview = document.getElementById('comm-post-img-preview');
  if (preview) { preview.style.display = 'none'; preview.src = ''; }
  currentCommPostImgData = '';
  document.getElementById('comm-post-img-pick').textContent = '📷 לחץ לבחירת תמונה';
  setCommPostType('share');
  document.getElementById('community-post-modal').style.display = 'flex';
}
window.openNewPostModal = openNewPostModal;

// מאזין לבחירת תמונה לפוסט בקהילה
const commImgPick = document.getElementById('comm-post-img-pick');
if (commImgPick) {
  commImgPick.addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      artCompressImage(f).then(data => {
        currentCommPostImgData = data;
        const p = document.getElementById('comm-post-img-preview');
        if (p) { p.src = currentCommPostImgData; p.style.display = 'block'; }
        commImgPick.textContent = '✓ תמונה נבחרה';
      });
    };
    inp.click();
  });
}

async function submitCommunityPost() {
  const user = auth.currentUser;
  if (!user) return;

  const title = document.getElementById('comm-post-title').value.trim();
  const body = document.getElementById('comm-post-body').value.trim();
  const type = currentCommPostType || 'share';

  if (!title) {
    alert("חובה להזין כותרת!");
    return;
  }
  // בשיתוף רגיל התוכן חובה; בסקר ובשאלה הוא אופציונלי
  if (type === 'share' && !body) {
    alert("חובה להזין תוכן לשיתוף!");
    return;
  }

  let pollOptions = null;
  if (type === 'poll') {
    pollOptions = Array.from(document.querySelectorAll('#comm-poll-wrap .comm-poll-opt'))
      .map(inp => inp.value.trim())
      .filter(Boolean);
    if (pollOptions.length < 2) {
      alert("לסקר צריך לפחות שתי אפשרויות!");
      return;
    }
  }

  // שליפת פרופיל מקומי לכינוי עדכני
  const localProfile = (() => {
    try { return JSON.parse(localStorage.getItem(`user_profile_${user.uid}`) || '{}'); } catch(e) { return {}; }
  })();
  const authorName = localProfile.nickname || user.displayName || (user.email ? user.email.split('@')[0] : 'אורח');

  const postData = {
    type,
    title,
    body,
    author: authorName,
    authorId: user.uid,
    image: currentCommPostImgData,
    timestamp: Date.now(),
    likes: 0
  };
  if (pollOptions) postData.options = pollOptions;

  try {
    const newPostRef = push(ref(db, 'website/community_posts'));
    await set(newPostRef, postData);
    document.getElementById('community-post-modal').style.display = 'none';
    const msg = type === 'poll' ? "הסקר פורסם בקהילה! 🗳️" : type === 'question' ? "השאלה פורסמה בקהילה! ❓" : "השיתוף שלך פורסם בקהילה בהצלחה! 🚀";
    alert(msg);
  } catch(e) {
    console.error(e);
    alert("שגיאה בפרסום הפוסט.");
  }
}
window.submitCommunityPost = submitCommunityPost;

async function toggleCommunityLike(postId) {
  const post = communityPosts.find(p => p.id === postId);
  if (!post) return;
  
  const currentLikes = post.likes || 0;
  try {
    const postRef = ref(db, `website/community_posts/${postId}/likes`);
    await set(postRef, currentLikes + 1);
  } catch(e) { console.error(e); }
}
window.toggleCommunityLike = toggleCommunityLike;

// הצבעה בסקר. כל משתמש מחובר מצביע פעם אחת ויכול לשנות את בחירתו.
async function submitCommunityVote(postId, optionIndex) {
  const user = auth.currentUser;
  if (!user) {
    alert("עלייך להתחבר כדי להצביע בסקר! ❤️");
    return;
  }
  try {
    await set(ref(db, `website/community_posts/${postId}/votes/${user.uid}`), optionIndex);
  } catch (e) {
    console.error(e);
    alert("שגיאה בשליחת ההצבעה.");
  }
}
window.submitCommunityVote = submitCommunityVote;

async function submitCommunityComment(postId) {
  const user = auth.currentUser;
  if (!user) {
    alert("עלייך להתחבר למשתמש על מנת להגיב! ❤️");
    return;
  }

  const inputEl = document.getElementById(`comment-input-${postId}`);
  if (!inputEl) return;

  const body = inputEl.value.trim();
  if (!body) return;

  const localProfile = (() => {
    try { return JSON.parse(localStorage.getItem(`user_profile_${user.uid}`) || '{}'); } catch(e) { return {}; }
  })();
  const authorName = localProfile.nickname || user.displayName || (user.email ? user.email.split('@')[0] : 'אורח');

  const commentData = {
    author: authorName,
    authorId: user.uid,
    body,
    timestamp: Date.now()
  };

  try {
    const commentsRef = push(ref(db, `website/community_posts/${postId}/comments`));
    await set(commentsRef, commentData);
    inputEl.value = '';
  } catch(e) {
    console.error(e);
    alert("שגיאה בשליחת התגובה.");
  }
}
window.submitCommunityComment = submitCommunityComment;

async function deleteCommunityPost(postId) {
  if (confirm("האם אתה בטוח שברצונך למחוק את הפוסט הזה מהקהילה?")) {
    try {
      await set(ref(db, `website/community_posts/${postId}`), null);
      alert("הפוסט נמחק בהצלחה. 🗑️");
    } catch(e) {
      console.error(e);
      alert("שגיאה במחיקת הפוסט.");
    }
  }
}
window.deleteCommunityPost = deleteCommunityPost;

let SOCIAL_LINKS = {
  instagram: 'https://instagram.com',
  facebook: 'https://facebook.com',
  telegram: 'https://t.me',
  discord: 'https://discord.gg',
  reddit: 'https://reddit.com',
  twitter: 'https://twitter.com',
  youtube: 'https://youtube.com',
  linkedin: 'https://linkedin.com'
};

try {
  const savedSocial = localStorage.getItem('social_community_links_v1');
  if (savedSocial) SOCIAL_LINKS = { ...SOCIAL_LINKS, ...JSON.parse(savedSocial) };
} catch(e) {}

// סרטוני האונבורדינג (מדריך) — נשמרים גלובלית ב-Firebase. כל טאב = URL של סרטון.
let ONBOARDING_VIDEOS = { desktop: ['', '', ''], mobile: ['', '', ''] };
try {
  const savedOnb = localStorage.getItem('onboarding_videos_v1');
  if (savedOnb) ONBOARDING_VIDEOS = { ...ONBOARDING_VIDEOS, ...JSON.parse(savedOnb) };
} catch(e) {}

function buildSocialCommunityBox() {
  const isEd = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);

  const ic = {
    facebook: '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.12 1.38C1.35 2.67.94 3.34.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.8.72 1.47 1.38 2.13.66.66 1.33 1.07 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.8-.31 1.47-.72 2.13-1.38.66-.66 1.07-1.33 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.31-.8-.72-1.47-1.38-2.13-.66-.66-1.33-1.07-2.13-1.38-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1018.16 12 6.16 6.16 0 0012 5.84zm0 10.16A4 4 0 1116 12a4 4 0 01-4 4zm6.41-10.4a1.44 1.44 0 11-1.44-1.44 1.44 1.44 0 011.44 1.44z"/></svg>',
    discord: '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M20.32 4.37A19.79 19.79 0 0015.45 2.9a.07.07 0 00-.08.04c-.21.38-.44.87-.6 1.25a18.27 18.27 0 00-5.48 0 12.6 12.6 0 00-.61-1.25.08.08 0 00-.08-.04A19.74 19.74 0 003.68 4.37a.07.07 0 00-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 00.03.05 19.9 19.9 0 005.99 3.03.08.08 0 00.08-.03c.46-.63.87-1.29 1.23-1.99a.08.08 0 00-.04-.11c-.65-.25-1.27-.55-1.87-.89a.08.08 0 01-.01-.13c.13-.09.25-.19.37-.29a.07.07 0 01.08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 01.08.01c.12.1.24.2.37.29a.08.08 0 01-.01.13c-.6.35-1.22.64-1.87.89a.08.08 0 00-.04.11c.36.7.78 1.36 1.23 1.99a.08.08 0 00.08.03 19.84 19.84 0 006-3.03.08.08 0 00.03-.05c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 00-.03-.03zM8.02 15.33c-1.18 0-2.15-1.08-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.17 1.09 2.15 2.42 0 1.34-.95 2.42-2.15 2.42zm7.96 0c-1.18 0-2.15-1.08-2.15-2.42s.95-2.42 2.15-2.42c1.21 0 2.17 1.09 2.15 2.42 0 1.34-.94 2.42-2.15 2.42z"/></svg>',
    twitter: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93zm-1.29 19.5h2.04L6.48 3.24H4.29z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 00.5 6.19C0 8.08 0 12 0 12s0 3.92.5 5.81a3.02 3.02 0 002.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 002.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.81zM9.55 15.57V8.43L15.82 12z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" width="25" height="25" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 110-4.14 2.07 2.07 0 010 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>'
  };
  const link = (key, def) => {
    const url = SOCIAL_LINKS[key] || def;
    return `<a href="${escHtml(safeUrl(url))}" target="_blank" rel="noopener" aria-label="${key}" style="display:flex; align-items:center; justify-content:center; width:44px; height:44px; color:#fff; text-decoration:none; opacity:0.92; transition:opacity 0.2s, transform 0.2s;" onmouseover="this.style.opacity='1'; this.style.transform='translateY(-2px)'" onmouseout="this.style.opacity='0.92'; this.style.transform='none'">${ic[key]}</a>`;
  };

  return `
    <div class="art-sidebar-box art-social-box" style="display:flex; flex-direction:column; gap:10px; padding:18px 14px; border-radius:14px; background:#0b0b0f; box-sizing:border-box; width:100%;">
      ${isEd ? `<div style="display:flex; justify-content:flex-end;"><button type="button" onclick="openSocialLinksModal()" style="background:rgba(255,255,255,0.1); color:#fff; border:none; border-radius:6px; padding:3px 8px; font-size:11px; font-weight:bold; cursor:pointer;">✏️ ערוך קישורים</button></div>` : ''}
      <div style="display:flex; align-items:center; justify-content:space-around; flex-wrap:wrap; gap:8px; width:100%; box-sizing:border-box;">
        ${link('facebook', 'https://facebook.com')}
        ${link('instagram', 'https://instagram.com')}
        ${link('discord', 'https://discord.gg')}
        ${link('twitter', 'https://twitter.com')}
        ${link('youtube', 'https://youtube.com')}
        ${link('linkedin', 'https://linkedin.com')}
      </div>
    </div>
  `;
}

function openSocialLinksModal() {
  let modal = document.getElementById('social-links-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'social-links-modal';
    modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999999; align-items:center; justify-content:center; direction:rtl; padding:20px;';
    modal.innerHTML = `
      <div style="background:#fff; border-radius:16px; padding:24px; width:100%; max-width:440px; box-shadow:0 20px 60px rgba(0,0,0,0.3); display:flex; flex-direction:column; gap:14px; direction:rtl;">
        <h3 style="margin:0; font-size:18px; font-weight:800; color:#ec4899; border-bottom:2px solid #ec4899; padding-bottom:8px;">👥 עריכת קישורי הקהילות ברשת</h3>
        
        <div style="display:flex; flex-direction:column; gap:10px; font-size:13px; font-weight:bold; max-height:60vh; overflow-y:auto; padding-left:5px;">
          <label style="display:flex; flex-direction:column; gap:4px;">
            <span>📸 Instagram:</span>
            <input type="url" id="social-inp-instagram" placeholder="https://instagram.com/your-page" style="padding:8px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px;">
          </label>
          
          <label style="display:flex; flex-direction:column; gap:4px;">
            <span>📘 Facebook:</span>
            <input type="url" id="social-inp-facebook" placeholder="https://facebook.com/your-page" style="padding:8px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px;">
          </label>
          
          <label style="display:flex; flex-direction:column; gap:4px;">
            <span>👾 Discord:</span>
            <input type="url" id="social-inp-discord" placeholder="https://discord.gg/your-server" style="padding:8px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px;">
          </label>

          <label style="display:flex; flex-direction:column; gap:4px;">
            <span>✖️ Twitter / X:</span>
            <input type="url" id="social-inp-twitter" placeholder="https://x.com/your-profile" style="padding:8px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px;">
          </label>

          <label style="display:flex; flex-direction:column; gap:4px;">
            <span>▶️ YouTube:</span>
            <input type="url" id="social-inp-youtube" placeholder="https://youtube.com/@your-channel" style="padding:8px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px;">
          </label>

          <label style="display:flex; flex-direction:column; gap:4px;">
            <span>💼 LinkedIn:</span>
            <input type="url" id="social-inp-linkedin" placeholder="https://linkedin.com/in/your-profile" style="padding:8px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px;">
          </label>
        </div>

        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:8px;">
          <button type="button" onclick="closeSocialLinksModal()" style="background:#f3f4f6; border:none; border-radius:8px; padding:8px 16px; font-weight:bold; cursor:pointer;">ביטול</button>
          <button type="button" onclick="saveSocialLinksModal()" style="background:#ec4899; color:white; border:none; border-radius:8px; padding:8px 20px; font-weight:bold; cursor:pointer;">שמור קישורים 💾</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById('social-inp-instagram').value = SOCIAL_LINKS.instagram || '';
  document.getElementById('social-inp-facebook').value = SOCIAL_LINKS.facebook || '';
  document.getElementById('social-inp-discord').value = SOCIAL_LINKS.discord || '';
  document.getElementById('social-inp-twitter').value = SOCIAL_LINKS.twitter || '';
  document.getElementById('social-inp-youtube').value = SOCIAL_LINKS.youtube || '';
  document.getElementById('social-inp-linkedin').value = SOCIAL_LINKS.linkedin || '';

  modal.style.display = 'flex';
}

function closeSocialLinksModal() {
  const modal = document.getElementById('social-links-modal');
  if (modal) modal.style.display = 'none';
}

function saveSocialLinksModal() {
  SOCIAL_LINKS.instagram = document.getElementById('social-inp-instagram').value.trim() || 'https://instagram.com';
  SOCIAL_LINKS.facebook = document.getElementById('social-inp-facebook').value.trim() || 'https://facebook.com';
  SOCIAL_LINKS.discord = document.getElementById('social-inp-discord').value.trim() || 'https://discord.gg';
  SOCIAL_LINKS.twitter = document.getElementById('social-inp-twitter').value.trim() || 'https://twitter.com';
  SOCIAL_LINKS.youtube = document.getElementById('social-inp-youtube').value.trim() || 'https://youtube.com';
  SOCIAL_LINKS.linkedin = document.getElementById('social-inp-linkedin').value.trim() || 'https://linkedin.com';

  localStorage.setItem('social_community_links_v1', JSON.stringify(SOCIAL_LINKS));
  closeSocialLinksModal();
  if (typeof saveToStorage === 'function') saveToStorage();
  if (typeof renderPage === 'function') renderPage();
}

window.buildSocialCommunityBox = buildSocialCommunityBox;
window.openSocialLinksModal = openSocialLinksModal;
window.closeSocialLinksModal = closeSocialLinksModal;
window.saveSocialLinksModal = saveSocialLinksModal;

// האזנה לשינויים בזמן אמת במסד הנתונים מכל מכשיר (למשל מהמחשב לנייד)
onPublicSiteValue((data) => {
  if (!Object.keys(data).length) return;
  // קטגוריות סרגלי הסינון (תמונות / קומיקס+סיפורים) — מתעדכנות גם במצב עריכה
  if (typeof applyRemoteCategoryBars === 'function') applyRemoteCategoryBars(data, true);
  
  // אם המכשיר הנוכחי נמצא במצב עריכה פעיל, לא נדרוס את השינויים המקומיים שלו באמצע עבודה
  if (isEditMode) return;
  
  let changed = false;
  
  if (data.pages) {
    let pList = data.pages.filter(p => p && p.id !== 'page-ci' && p.id !== 'page-em' && !p.title?.includes('ריבית') && !p.title?.includes('Everything'));
    // מסירים עמודי תמונות/סיפורים כפולים (למשל עמוד סיפורים ריק) — משאירים את זה עם התוכן
    pList = dedupePageList(pList);
    // משאירים רק עמודי תמונות/סיפורים/קהילות (מוחקים כתבות וכל עמוד אחר)
    if (pList.some(p => p && ((p.content || '').includes('photos-page') || (p.content || '').includes('stories-page')))) {
      pList = pList.filter(p => p && (p.id === 'page-home-feed' || p.id === 'page-subscription-main' || (p.content || '').includes('home-feed-page') || (p.content || '').includes('subscription-page') || (p.content || '').includes('photos-page') || (p.content || '').includes('stories-page') || (p.content || '').includes('ideas-page') || (p.content || '').includes('communities-page') || (p.content || '').includes('info-page') || (p.content || '').includes('requests-page') || (p.content || '').includes('questions-page') || (p.content || '').includes('offers-page') || p.id === 'page-ideas-main'));
    }
    // מוודאים שעמוד "רעיונות" קיים
    const _ipd = pList.find(p => p && p.id === 'page-ideas-main');
    const _ipdc = '<div class="ideas-page" data-page-id="page-ideas-main"></div>';
    if (!_ipd) {
      pList.push({ id: 'page-ideas-main', title: 'רעיונות 💡', isHidden: false, content: _ipdc });
    } else {
      if (!_ipd.title) _ipd.title = 'רעיונות 💡';
      _ipd.content = _ipdc;
    }
    // מוודאים שעמוד "קהילות" תמיד קיים (עם תוכן פלייסהולדר תקין)
    const _cp = pList.find(p => p && p.id === 'page-communities-main');
    const _cpc = '<div class="communities-page" data-page-id="page-communities-main"></div>';
    if (!_cp) {
      pList.push({ id: 'page-communities-main', title: 'קהילות 🏘️', content: _cpc });
    } else {
      if (!_cp.title) _cp.title = 'קהילות 🏘️';
      _cp.content = _cpc;
    }
    // עמוד "מוצרי יד שניה" — קיים תמיד (נתונים נשמרים בתוכן העמוד)
    const _shp = pList.find(p => p && p.id === 'page-secondhand-main');
    if (!_shp) {
      const _shpc = (typeof buildPhotosPage === 'function') ? buildPhotosPage([], 'secondhand') : '<div class="photos-page secondhand-page" data-page-id="page-secondhand-main" data-section="secondhand" data-photos-json="%5B%5D"></div>';
      pList.push({ id: 'page-secondhand-main', title: 'מוצרי יד שניה 🛒', content: _shpc });
    } else if (!_shp.title) {
      _shp.title = 'מוצרי יד שניה 🛒';
    }
    // עמוד "שותפויות"
    const _ptp = pList.find(p => p && p.id === 'page-partnerships-main');
    if (!_ptp) {
      const _ptpc = (typeof buildPhotosPage === 'function') ? buildPhotosPage([], 'partnerships') : '<div class="photos-page partnerships-page" data-page-id="page-partnerships-main" data-section="partnerships" data-photos-json="%5B%5D"></div>';
      pList.push({ id: 'page-partnerships-main', title: 'שותפויות 🤝', content: _ptpc });
    } else if (!_ptp.title) {
      _ptp.title = 'שותפויות 🤝';
    }
    // עמוד "ביקורת"
    const _rvp = pList.find(p => p && p.id === 'page-reviews-main');
    if (!_rvp) {
      const _rvpc = (typeof buildPhotosPage === 'function') ? buildPhotosPage([], 'reviews') : '<div class="photos-page reviews-page" data-page-id="page-reviews-main" data-section="reviews" data-photos-json="%5B%5D"></div>';
      pList.push({ id: 'page-reviews-main', title: 'ביקורת ⭐', content: _rvpc });
    } else if (!_rvp.title) {
      _rvp.title = 'ביקורת ⭐';
    }
    // עמוד "מידע" — קיים תמיד אך מוסתר
    const _ip = pList.find(p => p && p.id === 'page-info-main');
    const _ipc = '<div class="info-page" data-page-id="page-info-main"></div>';
    if (!_ip) {
      pList.push({ id: 'page-info-main', title: 'מידע 🔒', isHidden: true, content: _ipc });
    } else {
      if (_ip.isHidden === undefined) _ip.isHidden = true; _ip.content = _ipc; if (!_ip.title) _ip.title = 'מידע 🔒';
    }
    // עמוד "בקשות" — קיים תמיד אך מוסתר (למנהל בלבד)
    const _rp = pList.find(p => p && p.id === 'page-requests-main');
    const _rpc = '<div class="requests-page" data-page-id="page-requests-main"></div>';
    if (!_rp) {
      pList.push({ id: 'page-requests-main', title: 'בקשות 🔒', isHidden: true, content: _rpc });
    } else {
      if (_rp.isHidden === undefined) _rp.isHidden = true; _rp.content = _rpc; if (!_rp.title) _rp.title = 'בקשות 🔒';
    }
    // עמוד "שאלות גולשים" — קיים תמיד
    const _qp = pList.find(p => p && p.id === 'page-questions-main');
    const _qpc = '<div class="questions-page" data-page-id="page-questions-main"></div>';
    if (!_qp) {
      pList.push({ id: 'page-questions-main', title: 'שאלות גולשים ❓', content: _qpc });
    } else {
      _qp.content = _qpc; if (!_qp.title) _qp.title = 'שאלות גולשים ❓';
    }
    // עמוד "הצעות" — קיים תמיד
    const _ofp = pList.find(p => p && p.id === 'page-offers-main');
    const _ofpc = '<div class="offers-page" data-page-id="page-offers-main"></div>';
    if (!_ofp) {
      pList.push({ id: 'page-offers-main', title: 'הצעות 🔥', content: _ofpc });
    } else {
      _ofp.content = _ofpc; if (!_ofp.title) _ofp.title = 'הצעות 🔥';
    }
    // עמוד הבית (שורות מתחלפות קומיקס/סיפורים) — קיים תמיד; התוכן נבנה דינמית ברינדור
    const _hpl = pList.find(p => p && p.id === 'page-home-feed');
    const _hplc = '<div class="home-feed-page" data-page-id="page-home-feed"></div>';
    if (!_hpl) {
      pList.unshift({ id: 'page-home-feed', title: 'בית 🏠', content: _hplc });
    } else {
      if (!_hpl.title || _hpl.title === 'קומיקס') _hpl.title = 'בית 🏠';
      _hpl.content = _hplc;
    }
    // עמוד "מנוי" — קיים תמיד
    const _subp = pList.find(p => p && p.id === 'page-subscription-main');
    const _subpc = '<div class="subscription-page" data-page-id="page-subscription-main"></div>';
    if (!_subp) {
      pList.push({ id: 'page-subscription-main', title: 'מנוי 💎', content: _subpc });
    } else {
      _subp.content = _subpc; if (!_subp.title) _subp.title = 'מנוי 💎';
    }
    // מסירים את העמודים "יד שניה" ו"השוואת מחירים"
    pList = pList.filter(p => p && !REMOVED_PHOTO_PAGE_IDS.includes(p.id));
    applyItemLikesToPages(pList, data.item_likes);
    if (JSON.stringify(pages) !== JSON.stringify(pList)) {
      pages = pList;
      changed = true;
    }
  }

  if (data.topNavPages) {
    let navs = Array.from(new Set(data.topNavPages)).filter(id => id !== 'page-ci' && id !== 'page-em');
    // מסירים מהתפריט זהים של עמודים שכבר לא קיימים (נמחקו/כפולים)
    navs = navs.filter(id => pages.some(p => p && p.id === id));
    let pIdeas = pages.find(p => p && p.id === 'page-ideas-main') || pages.find(p => p && p.title && p.title.includes('רעיונות'));
    if (pIdeas) {
      navs = navs.filter(id => id !== pIdeas.id);
      navs.unshift(pIdeas.id);
    }
    // עמוד הקהילות תמיד מופיע בתפריט העליון
    if (pages.some(p => p && p.id === 'page-communities-main') && !navs.includes('page-communities-main')) navs.push('page-communities-main');
    // עמוד "מוצרי יד שניה" תמיד מופיע בתפריט העליון
    if (pages.some(p => p && p.id === 'page-secondhand-main') && !navs.includes('page-secondhand-main')) navs.push('page-secondhand-main');
    // עמוד "שותפויות" תמיד מופיע בתפריט העליון
    if (pages.some(p => p && p.id === 'page-partnerships-main') && !navs.includes('page-partnerships-main')) navs.push('page-partnerships-main');
    // עמוד "ביקורת" תמיד מופיע בתפריט העליון
    if (pages.some(p => p && p.id === 'page-reviews-main') && !navs.includes('page-reviews-main')) navs.push('page-reviews-main');
    // עמודים כמו "שאלות גולשים", "הצעות", "תמונות" ו"סיפורים" הם עמודי צד בלבד (מוסרים מהתפריט העליון)
    navs = navs.filter(id => !isSideOnlyId(id));
    // מסירים מהתפריט את העמודים שהוסרו
    navs = navs.filter(id => !REMOVED_PHOTO_PAGE_IDS.includes(id));
    // עמוד הבית מוצג בתפריט העליון צמוד ל"קהילות"
    if (pages.some(p => p && p.id === 'page-home-feed')) {
      navs = navs.filter(id => id !== 'page-home-feed');
      const _hci = navs.indexOf('page-communities-main');
      if (_hci >= 0) navs.splice(_hci + 1, 0, 'page-home-feed'); else navs.push('page-home-feed');
    }
    // עמוד "מנוי" תמיד מופיע בתפריט העליון
    if (pages.some(p => p && p.id === 'page-subscription-main') && !navs.includes('page-subscription-main')) {
      navs.push('page-subscription-main');
    }
    if (JSON.stringify(topNavPages) !== JSON.stringify(navs)) {
      topNavPages = navs;
      changed = true;
    }
  }
  if (data.siteBackgrounds && JSON.stringify(siteBackgrounds) !== JSON.stringify(data.siteBackgrounds)) {
    siteBackgrounds = data.siteBackgrounds;
    applyBackgrounds();
    changed = true;
  }
  if (data.hideCart !== undefined && hideCart !== data.hideCart) {
    hideCart = data.hideCart;
    changed = true;
  }
  if (data.hideChat !== undefined && hideChat !== data.hideChat) {
    hideChat = data.hideChat;
    changed = true;
  }
  if (data.deleteCart !== undefined && deleteCart !== data.deleteCart) {
    deleteCart = data.deleteCart;
    changed = true;
  }
  if (data.deleteChat !== undefined && deleteChat !== data.deleteChat) {
    deleteChat = data.deleteChat;
    changed = true;
  }
  if (data.promotedSites) {
    PROMOTED_SITES = data.promotedSites;
    localStorage.setItem('promoted_sites', JSON.stringify(PROMOTED_SITES));
  }
  
  if (changed) {
    renderSideMenu();
    renderTopNav();
    renderPage();
    updateFABsVisibility();
  }
});

// עדכון חי שוטף של טיימר הספירה לאחור האדום (24 שעות לקומיקסים/גלריות זמניות)
setInterval(() => {
  const now = Date.now();
  let needRefresh = false;
  document.querySelectorAll('.comic-countdown-timer').forEach(el => {
    const expiresAt = Number(el.dataset.expiresAt);
    if (!expiresAt) return;
    const diff = expiresAt - now;
    if (diff <= 0) {
      needRefresh = true;
    } else {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const textSpan = el.querySelector('.timer-countdown-text');
      if (textSpan) {
        textSpan.textContent = `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
      }
    }
  });
  if (needRefresh) {
    const container = mainContent.querySelector('.photos-page');
    if (container) {
      let albums = photoGetAlbums();
      mainContent.innerHTML = buildPhotosPage(albums);
    }
  }
}, 1000);

// אתחול עמוד ומדדי הבטריה
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof updateBatteryBadgeUI === 'function') updateBatteryBadgeUI();
  });
  setTimeout(() => {
    if (typeof updateBatteryBadgeUI === 'function') updateBatteryBadgeUI();
  }, 800);
}

// ============================================================
// עמוד "רעיונות" — בנוי במבנה ועיצוב תמונות (Photos)
// ============================================================
let ideasData = {};
let ideasSubscribed = false;

const IDEAS_SAMPLES = [
  {
    id: 'idea_sample_1',
    title: 'הוספת מצב לילה (Dark Mode) מלא לכל עמודי האתר',
    summary: 'אפשרות להחלפה בלחיצת כפתור למצב כהה ונעים לעיניים בשעות הלילה לחיסכון בסוללה ונוחות צפייה.',
    desc: 'הצעה להוסיף מתג בסרגל העליון שמשנה את צבעי הרקע לכהים ואת הטקסטים לבהירים לחיסכון בסוללה ונוחות צפייה בחשיכה.',
    category: 'כללי',
    categoryColor: '#8b5cf6',
    author: 'מנהל האתר',
    authorId: 'admin_yoni',
    verified: true,
    verifiedUser: true,
    images: ['https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80'],
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
    likes: 14,
    views: 45,
    timestamp: '13.9.2026',
    createdAt: Date.now() - 86400000 * 3,
    approved: true
  },
  {
    id: 'idea_sample_2',
    title: 'התראות בזמן אמת על תגובות ולייקים חדשים',
    summary: 'פעמון התראות שיקפוץ בכל פעם שמישהו מגיב לתוכן או לסיפור שהעלית.',
    desc: 'מערכת התראות חכמה בסרגל העליון שמתעדכנת בלייב ומאפשרת לקפוץ ישר לתגובה או לסיפור.',
    category: 'כללי',
    categoryColor: '#3b82f6',
    author: 'xd xd',
    authorId: 'user_xd',
    verified: true,
    verifiedUser: true,
    images: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80'],
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
    likes: 9,
    views: 29,
    timestamp: '10.9.2026',
    createdAt: Date.now() - 86400000 * 2,
    approved: true
  },
  {
    id: 'idea_sample_3',
    title: 'פינת שאלות ותשובות (Q&A) לכל קהילה',
    summary: 'אזור ייעודי בתוך כל קהילה שבו חברים יכולים לשאול שאלות ולקבל תשובות מהקהילה.',
    desc: 'מתן אפשרות לחברי הקהילה להעלות שאלות, להצביע לתשובות הטובות ביותר ולסמן תשובה נבחרת כפתרון.',
    category: 'כללי',
    categoryColor: '#e11d48',
    author: 'דניאל מ.',
    authorId: 'sample3',
    verified: false,
    images: ['https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80'],
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
    likes: 22,
    views: 88,
    timestamp: '12.9.2026',
    createdAt: Date.now() - 86400000 * 1,
    approved: true
  }
];

function subscribeIdeas() {
  if (ideasSubscribed) return;
  ideasSubscribed = true;
  onValue(ref(db, 'website/ideas'), (snap) => {
    const val = snap.val();
    if (!val || !Object.keys(val).length) {
      IDEAS_SAMPLES.forEach(item => {
        set(ref(db, `website/ideas/${item.id}`), item);
      });
      ideasData = {};
      IDEAS_SAMPLES.forEach(i => ideasData[i.id] = i);
    } else {
      ideasData = val;
    }
    const pageEl = mainContent.querySelector('.ideas-page');
    if (pageEl && typeof buildIdeasPage === 'function') {
      mainContent.innerHTML = buildIdeasPage();
    }
  });
}

function ideaGetAlbums() {
  const list = Object.values(ideasData || {});
  if (!list.length) return IDEAS_SAMPLES;
  return list.map(i => {
    const validImages = (i.images && i.images.length) ? i.images.filter(Boolean) : (i.image ? [i.image] : ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80']);
    return {
      ...i,
      images: validImages,
      image: validImages[0],
      approved: i.approved !== false
    };
  });
}

let currentIdeaCategoryFilter = 'הכל';

function setIdeaCategoryFilter(cat) {
  currentIdeaCategoryFilter = cat;
  if (typeof buildIdeasPage === 'function' && typeof mainContent !== 'undefined' && mainContent) {
    mainContent.innerHTML = buildIdeasPage();
  }
}
window.setIdeaCategoryFilter = setIdeaCategoryFilter;

function ideasCategoryBarHTML() {
  const cats = [
    { id: 'הכל', label: 'הכל' },
    { id: 'רעיונות לעסקים', label: '💼 רעיונות לעסקים' },
    { id: 'רעיונות כללי', label: '💡 רעיונות כללי' },
    { id: 'מחקר פרטי', label: '🔬 מחקר פרטי' },
    { id: 'חוקים', label: '⚖️ חוקים' }
  ];

  return `
    <div class="ideas-category-bar" style="display:flex; gap:10px; align-items:center; margin-bottom:16px; flex-wrap:wrap; padding:6px 0;">
      ${cats.map(c => {
        const isActive = currentIdeaCategoryFilter === c.id;
        return `
          <button type="button" onclick="setIdeaCategoryFilter('${artEsc(c.id)}')"
                  style="padding:8px 20px; border-radius:999px; border:${isActive ? 'none' : '1px solid #cbd5e1'}; background:${isActive ? '#3b82f6' : '#fff'}; color:${isActive ? '#fff' : '#334155'}; font-size:14px; font-weight:800; cursor:pointer; box-shadow:${isActive ? '0 4px 14px rgba(59,130,246,0.35)' : '0 1px 3px rgba(0,0,0,0.05)'}; transition:all 0.2s;">
            ${escHtml(c.label)}
          </button>
        `;
      }).join('')}
    </div>
  `;
}
window.ideasCategoryBarHTML = ideasCategoryBarHTML;

// ============================================================
// סרגל קטגוריות גנרי לעמודי "תמונות" ו"קהילות" ("הכל · כללי · לעסקים")
// ============================================================
let sectionCatFilters = {};

function getSectionCategoryFilter(section) {
  return sectionCatFilters[section] || 'הכל';
}

function setSectionCategoryFilter(section, cat) {
  sectionCatFilters[section] = cat;
  if (typeof mainContent === 'undefined' || !mainContent) return;
  if (section === 'communities' && typeof buildCommunitiesPage === 'function') {
    mainContent.innerHTML = buildCommunitiesPage();
  } else if (section === 'secondhand' && typeof buildSecondhandPage === 'function') {
    mainContent.innerHTML = buildSecondhandPage();
  } else if (section === 'partnerships' && typeof buildPartnershipsPage === 'function') {
    mainContent.innerHTML = buildPartnershipsPage();
  } else if (section === 'reviews' && typeof buildReviewsPage === 'function') {
    mainContent.innerHTML = buildReviewsPage();
  } else if (typeof buildPhotosPage === 'function' && typeof photoGetAlbums === 'function') {
    mainContent.innerHTML = buildPhotosPage(photoGetAlbums(), 'photos');
  }
}
window.setSectionCategoryFilter = setSectionCategoryFilter;

function sectionCategoryBarHTML(section) {
  // עמוד התמונות — צבע סגול; שאר העמודים נשארים כחול
  const isPhotos = section === 'photos';
  const cats = isPhotos
    ? [{ id: 'הכל', label: 'הכל' }, ...PHOTO_BAR_CATEGORIES.map(c => ({ id: c, label: c }))]
    : [
      { id: 'הכל', label: 'הכל' },
      { id: 'לעסקים', label: '💼 לעסקים' },
      { id: 'כללי', label: '💡 כללי' }
    ];
  const editBtn = (isPhotos && (isAdmin() || isEditMode))
    ? `<button type="button" onclick="openCategoriesModal('photos')" style="padding:8px 16px; border-radius:999px; border:1px dashed #8b5cf6; background:rgba(139,92,246,0.1); color:#8b5cf6; font-size:14px; font-weight:700; cursor:pointer;">✏️ ניהול קטגוריות</button>`
    : '';
  const active = getSectionCategoryFilter(section);
  const activeBg = isPhotos ? '#8b5cf6' : '#3b82f6';
  const activeShadow = isPhotos ? '0 4px 14px rgba(139,92,246,0.35)' : '0 4px 14px rgba(59,130,246,0.35)';
  return `
    <div class="section-category-bar" style="display:flex; gap:10px; align-items:center; margin-bottom:16px; flex-wrap:wrap; padding:6px 0;">
      ${cats.map(c => {
        const isActive = active === c.id;
        return `
          <button type="button" onclick="setSectionCategoryFilter('${section}','${artEsc(c.id)}')"
                  style="padding:8px 20px; border-radius:999px; border:${isActive ? 'none' : '1px solid #cbd5e1'}; background:${isActive ? activeBg : '#fff'}; color:${isActive ? '#fff' : '#334155'}; font-size:14px; font-weight:800; cursor:pointer; box-shadow:${isActive ? activeShadow : '0 1px 3px rgba(0,0,0,0.05)'}; transition:all 0.2s;">
            ${escHtml(c.label)}
          </button>
        `;
      }).join('')}
      ${editBtn}
    </div>
  `;
}
window.sectionCategoryBarHTML = sectionCategoryBarHTML;

function filterAlbumsByCategory(albums, section) {
  const active = getSectionCategoryFilter(section);
  if (active === 'הכל') return albums;
  return albums.filter(a => {
    const cat = (a.category || '');
    const hay = `${a.title || ''} ${a.summary || ''} ${a.desc || ''} ${cat}`;
    if (active === 'לעסקים') return cat.includes('עסק') || hay.includes('עסק');
    if (active === 'כללי') return !(cat.includes('עסק') || hay.includes('עסק'));
    // קטגוריה שהמנהל הוסיף: התאמה לקטגוריה של הפריט, או מופיעה בכותרת/תיאור
    return cat === active || hay.includes(active);
  });
}
window.filterAlbumsByCategory = filterAlbumsByCategory;

// ============================================================
// סינון ייעודי לעמוד "מוצרי יד שניה": סוג ההצעה, טווח מחירים, מיקום
// ============================================================
const SH_OFFER_TYPES = ['הכל', 'מכירה', 'השאלה', 'החלפה'];
const SH_PRICE_RANGES = ['הכל', 'עד ₪100', '₪100–500', '₪500–1000', '₪1000+'];
const SH_REGIONS = ['הכל', 'צפון', 'מרכז', 'דרום', 'ירושלים', 'שרון', 'שפלה'];
let shOfferFilter = 'הכל';
let shPriceFilter = 'הכל';
let shRegionFilter = 'הכל';
let shLocationEnabled = false;

function setShFilter(kind, val) {
  if (kind === 'offer') shOfferFilter = val;
  else if (kind === 'price') shPriceFilter = val;
  else if (kind === 'region') shRegionFilter = val;
  if (typeof buildSecondhandPage === 'function' && typeof mainContent !== 'undefined' && mainContent) {
    mainContent.innerHTML = buildSecondhandPage();
  }
}
window.setShFilter = setShFilter;

function _shPriceNum(p) {
  const m = String(p && p.price != null ? p.price : '').match(/\d+/g);
  return m ? parseInt(m.join(''), 10) : NaN;
}

function secondhandApplyFilters(albums) {
  return albums.filter(a => {
    if (shOfferFilter !== 'הכל' && (a.offerType || '') !== shOfferFilter) return false;
    if (shRegionFilter !== 'הכל' && (a.region || '') !== shRegionFilter) return false;
    if (shPriceFilter !== 'הכל') {
      const n = _shPriceNum(a);
      if (isNaN(n)) return false;
      if (shPriceFilter === 'עד ₪100' && !(n <= 100)) return false;
      if (shPriceFilter === '₪100–500' && !(n > 100 && n <= 500)) return false;
      if (shPriceFilter === '₪500–1000' && !(n > 500 && n <= 1000)) return false;
      if (shPriceFilter === '₪1000+' && !(n > 1000)) return false;
    }
    return true;
  });
}
window.secondhandApplyFilters = secondhandApplyFilters;

function secondhandFilterBarHTML() {
  const sel = (kind, cur, opts) => `
    <div class="sh-filter">
      <label class="sh-filter-label">${kind === 'offer' ? 'סוג ההצעה' : kind === 'price' ? 'טווח מחירים' : 'מיקום'}</label>
      <select class="sh-filter-select" onchange="setShFilter('${kind}', this.value)">
        ${opts.map(o => `<option value="${escHtml(o)}"${o === cur ? ' selected' : ''}>${escHtml(o)}</option>`).join('')}
      </select>
    </div>`;
  return `
    <div class="sh-filter-bar">
      ${sel('offer', shOfferFilter, SH_OFFER_TYPES)}
      ${sel('price', shPriceFilter, SH_PRICE_RANGES)}
      ${sel('region', shRegionFilter, SH_REGIONS)}
    </div>`;
}
window.secondhandFilterBarHTML = secondhandFilterBarHTML;

function secondhandTogglesHTML() {
  return `
    <div class="view-toggles">
      <label class="tgl">
        <span class="tgl-label">📍 הפעלת מיקום</span>
        <span class="tgl-switch"><input type="checkbox" ${shLocationEnabled ? 'checked' : ''} onchange="toggleShLocation(this.checked)"><span class="tgl-slider"></span></span>
      </label>
    </div>`;
}
window.secondhandTogglesHTML = secondhandTogglesHTML;

function toggleShLocation(on) {
  if (!on) { shLocationEnabled = false; window.shUserLocation = null; return; }
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    if (typeof showCopyToast === 'function') showCopyToast('הדפדפן אינו תומך במיקום');
    shLocationEnabled = false;
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      shLocationEnabled = true;
      window.shUserLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      if (typeof showCopyToast === 'function') showCopyToast('📍 המיקום הופעל בהצלחה');
    },
    () => {
      shLocationEnabled = false;
      if (typeof showCopyToast === 'function') showCopyToast('לא ניתן לקבל מיקום — בדקו הרשאות');
      const cb = document.querySelector('.view-toggles input[onchange*="toggleShLocation"]');
      if (cb) cb.checked = false;
    }
  );
}
window.toggleShLocation = toggleShLocation;

// ריבועי כניסה ל"תמונות" ו"סיפורים" בראש רשת הקהילות
// כרטיס קהילה אחיד ומסודר (בסגנון "חברים מוצעים"): תמונה, שם מלא, שורת מידע, כפתור כניסה
function renderCommunityGridCard(c) {
  const img = (c.images && c.images[0]) ? c.images[0] : (c.image || '');
  const name = c.title || c.name || 'קהילה';
  const count = (typeof c.likes === 'number') ? c.likes : 0;
  const sub = (c.summary || c.desc || '').trim() || (count ? (count + ' תכנים') : 'קהילה חדשה');
  return `
    <div class="comm-grid-card" onclick="openCommunityPage('${artEsc(c.id)}')" role="button" tabindex="0">
      <div class="comm-grid-thumb">${img ? `<img src="${escHtml(img)}" alt="" loading="lazy">` : '<span class="comm-grid-ph">🏘️</span>'}</div>
      <div class="comm-grid-info">
        <div class="comm-grid-name" title="${escHtml(name)}">${escHtml(name)}</div>
        <div class="comm-grid-sub">${escHtml(sub)}</div>
        <button class="comm-grid-btn" onclick="event.stopPropagation(); openCommunityPage('${artEsc(c.id)}')">כניסה לקהילה</button>
      </div>
    </div>
  `;
}
window.renderCommunityGridCard = renderCommunityGridCard;

// ריבועי כניסה ל"תמונות" ו"סיפורים" — באותו סגנון כרטיס אחיד
function communityShortcutsHTML() {
  const findPage = (kind) => {
    if (typeof pages === 'undefined' || !Array.isArray(pages)) return null;
    if (kind === 'photos') return pages.find(p => p && p.id === 'page-photos-main')
      || pages.find(p => p && ((p.content || '').includes('data-section="photos"') || (p.title || '').includes('תמונות')));
    if (kind === 'stories') return pages.find(p => p && (p.id === 'page-stories-text' || (p.title || '') === 'סיפורים'));
    // comics
    return pages.find(p => p && p.id === 'page-stories-main')
      || pages.find(p => p && (p.title || '') === 'קומיקס')
      || pages.find(p => p && p.id !== 'page-stories-text' && (p.content || '').includes('stories-page') && !(p.content || '').includes('photos-page') && !(p.content || '').includes('photos-stories-feed'));
  };
  const card = (title, emoji, page, grad) => {
    const oc = page ? `navigateToPage('${artEsc(page.id)}')` : '';
    return `
      <div class="comm-grid-card comm-grid-shortcut" onclick="${oc}" role="button" tabindex="0">
        <div class="comm-grid-thumb" style="background:${grad};">
          <span style="font-size:56px; line-height:1;">${emoji}</span>
        </div>
        <div class="comm-grid-info">
          <div class="comm-grid-name">${title}</div>
          <div class="comm-grid-sub">לצפייה בכל ה${title}</div>
          <button class="comm-grid-btn" onclick="event.stopPropagation(); ${oc}">כניסה</button>
        </div>
      </div>
    `;
  };
  return card('תמונות', '🖼️', findPage('photos'), 'linear-gradient(135deg,#e11d48,#9f1239)')
       + card('קומיקס', '💥', findPage('comics'), 'linear-gradient(135deg,#8b5cf6,#6d28d9)')
       + card('סיפורים', '📖', findPage('stories'), 'linear-gradient(135deg,#0ea5e9,#0369a1)');
}
window.communityShortcutsHTML = communityShortcutsHTML;

// מובייל: ריבועי כניסה ל"עמודי צד" (שאלות גולשים / הצעות) מתחת לקהילות — באותו סגנון
function sidePagesShortcutsHTML() {
  if (typeof pages === 'undefined' || !Array.isArray(pages)) return '';
  const _canSeeHidden = (typeof isEditMode !== 'undefined' && isEditMode) || (typeof isAdmin === 'function' && isAdmin());
  const find = (id, cls, title) => pages.find(p => p && (!p.isHidden || _canSeeHidden)
    && (p.id === id || (p.content || '').includes(cls) || (p.title || '').includes(title)));
  const items = [
    { page: find('page-questions-main', 'questions-page', 'שאלות גולשים'), title: 'שאלות גולשים', sub: 'שאלות ותשובות מהגולשים', emoji: '❓', grad: 'linear-gradient(135deg,#f59e0b,#b45309)' },
    { page: find('page-offers-main', 'offers-page', 'הצעות'), title: 'הצעות', sub: 'הצעות פעילות להערב', emoji: '🔥', grad: 'linear-gradient(135deg,#10b981,#047857)' }
  ].filter(x => x.page);
  if (!items.length) return '';
  const cards = items.map(x => {
    const oc = `navigateToPage('${artEsc(x.page.id)}')`;
    return `
      <div class="comm-grid-card comm-grid-shortcut" onclick="${oc}" role="button" tabindex="0">
        <div class="comm-grid-thumb" style="background:${x.grad};">
          <span style="font-size:56px; line-height:1;">${x.emoji}</span>
        </div>
        <div class="comm-grid-info">
          <div class="comm-grid-name">${x.title}</div>
          <div class="comm-grid-sub">${x.sub}</div>
          <button class="comm-grid-btn" onclick="event.stopPropagation(); ${oc}">כניסה</button>
        </div>
      </div>`;
  }).join('');
  return `
    <div class="photo-section-row side-pages-mobile-row" style="margin-bottom: 32px; background: #ffffff; padding: 18px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
      <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:2.5px solid #2563eb; padding-bottom:10px; margin-bottom:18px;">
        <h3 style="margin:0; font-size:18px; font-weight:900; color:#1e3a8a;">עמודי צד</h3>
      </div>
      <div class="art-rows">${cards}</div>
    </div>`;
}
window.sidePagesShortcutsHTML = sidePagesShortcutsHTML;

function buildIdeasPage() {
  subscribeIdeas();
  let albums = ideaGetAlbums();
  if (currentIdeaCategoryFilter !== 'הכל') {
    albums = albums.filter(a => {
      const cat = a.category || '';
      const title = a.title || '';
      const summary = a.summary || '';
      const desc = a.desc || '';

      if (currentIdeaCategoryFilter === 'רעיונות לעסקים') {
        return cat === 'רעיונות לעסקים' || title.includes('עסק') || summary.includes('עסק') || desc.includes('עסק');
      }
      if (currentIdeaCategoryFilter === 'רעיונות כללי') {
        return cat === 'רעיונות כללי' || cat === 'כללי' || (!cat.includes('עסק') && !cat.includes('מחקר') && !cat.includes('חוק') && !title.includes('עסק') && !title.includes('מחקר') && !title.includes('חוק'));
      }
      if (currentIdeaCategoryFilter === 'מחקר פרטי') {
        return cat === 'מחקר פרטי' || title.includes('מחקר') || summary.includes('מחקר') || desc.includes('מחקר');
      }
      if (currentIdeaCategoryFilter === 'חוקים') {
        return cat === 'חוקים' || title.includes('חוק') || summary.includes('חוק') || desc.includes('חוק');
      }
      return cat === currentIdeaCategoryFilter;
    });
  }
  return buildPhotosPage(albums, 'ideas');
}
window.buildIdeasPage = buildIdeasPage;

function openIdeaModal() {
  if (!auth.currentUser) { if (typeof openLiveChatLogin === 'function') openLiveChatLogin(); return; }
  const t = document.getElementById('idea-title');
  const s = document.getElementById('idea-summary');
  const d = document.getElementById('idea-desc');
  const ex = document.getElementById('idea-execution');
  const pr = document.getElementById('idea-price');
  const tm = document.getElementById('idea-time');
  const tc = document.getElementById('idea-tech');
  if (t) t.value = '';
  if (s) s.value = '';
  if (d) d.value = '';
  if (ex) ex.value = '';
  if (pr) pr.value = '';
  if (tm) tm.value = '';
  if (tc) tc.value = '';
  const m = document.getElementById('idea-modal');
  if (m) m.style.display = 'flex';
  setTimeout(() => { if (t) t.focus(); }, 100);
}
window.openIdeaModal = openIdeaModal;

(function initIdeaModalEvents() {
  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', () => {
    const c = document.getElementById('idea-cancel');
    if (c) c.addEventListener('click', () => {
      const m = document.getElementById('idea-modal');
      if (m) m.style.display = 'none';
    });
    const s = document.getElementById('idea-save');
    if (s) s.addEventListener('click', saveIdea);
  });
})();

async function saveIdea() {
  if (!auth.currentUser) { if (typeof openLiveChatLogin === 'function') openLiveChatLogin(); return; }
  const title = (document.getElementById('idea-title').value || '').trim();
  if (!title) { alert('חובה להזין כותרת לרעיון'); return; }
  const summary = (document.getElementById('idea-summary').value || '').trim();
  if (!summary) { alert('חובה להזין תקציר קצר'); return; }
  const desc = (document.getElementById('idea-desc').value || '').trim();
  const category = (document.getElementById('idea-category').value || 'כללי');
  const executionStepsText = (document.getElementById('idea-execution')?.value || '').trim();
  const priceRequested = (document.getElementById('idea-price')?.value || '').trim();
  const devTime = (document.getElementById('idea-time')?.value || '').trim();
  const techStack = (document.getElementById('idea-tech')?.value || '').trim();

  let nickname = 'משתמש';
  try {
    const p = JSON.parse(localStorage.getItem(`user_profile_${auth.currentUser.uid}`) || '{}');
    nickname = p.nickname || auth.currentUser.displayName || (auth.currentUser.email ? auth.currentUser.email.split('@')[0] : 'משתמש');
  } catch (e) { nickname = auth.currentUser.displayName || 'משתמש'; }

  const defaultImg = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80';
  const id = 'idea_' + Date.now();
  const idea = {
    id,
    title: title.slice(0, 100),
    summary: summary.slice(0, 200),
    desc: desc.slice(0, 1000),
    category: category,
    executionStepsText: executionStepsText.slice(0, 1500),
    priceRequested: priceRequested.slice(0, 100),
    devTime: devTime.slice(0, 100),
    techStack: techStack.slice(0, 200),
    author: nickname,
    authorId: auth.currentUser.uid,
    verified: true,
    verifiedUser: true,
    image: defaultImg,
    images: [defaultImg],
    likes: 1,
    views: 1,
    timestamp: new Date().toLocaleDateString('he-IL'),
    createdAt: Date.now(),
    approved: true
  };

  try {
    await set(ref(db, `website/ideas/${id}`), idea);
    const m = document.getElementById('idea-modal');
    if (m) m.style.display = 'none';
    if (typeof showCopyToast === 'function') showCopyToast('💡 הרעיון שלך פורסם בהצלחה!');
    if (typeof mainContent !== 'undefined' && mainContent) {
      mainContent.innerHTML = buildIdeasPage();
    }
  } catch (e) {
    console.error('Save idea failed', e);
    alert('שגיאה בשמירת הרעיון');
  }
}
window.saveIdea = saveIdea;

// ============================================================
// "בעיה לפתרון" (מכרז הפוך) — מפרסמים בעיה, מגישים הצעות מחיר, בוחרים את הזולה
// ============================================================
function openProblemModal() {
  if (!auth.currentUser) { if (typeof openLiveChatLogin === 'function') openLiveChatLogin(); return; }
  let m = document.getElementById('problem-modal');
  if (!m) { m = document.createElement('div'); m.id = 'problem-modal'; document.body.appendChild(m); }
  m.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999999; display:flex; align-items:center; justify-content:center; direction:rtl; padding:16px;';
  m.innerHTML = `
    <div style="background:#fff; border-radius:16px; padding:24px; width:100%; max-width:460px; max-height:88vh; overflow-y:auto; display:flex; flex-direction:column; gap:12px; box-shadow:0 20px 60px rgba(0,0,0,0.35);">
      <h3 style="margin:0; font-size:18px; font-weight:900; color:#0f172a;">🎯 פרסום בעיה לפתרון</h3>
      <p style="margin:0; font-size:13px; color:#64748b; line-height:1.5;">תארו בעיה שאתם צריכים לפתור או יעד שתרצו להשיג. פותרים יגישו הצעות מחיר — ותוכלו לבחור את הזולה ביותר.</p>
      <label style="font-size:13px; font-weight:700;">מה צריך לפתור? <span style="color:red">*</span></label>
      <input id="pr-title" type="text" placeholder="לדוגמה: בניית אתר תדמית" style="padding:10px 12px; border:1px solid #ddd; border-radius:8px; font-size:14px; box-sizing:border-box;">
      <label style="font-size:13px; font-weight:700;">פירוט הבעיה / היעד</label>
      <textarea id="pr-desc" rows="4" placeholder="פרטו מה נדרש, לוחות זמנים, דרישות..." style="padding:10px 12px; border:1px solid #ddd; border-radius:8px; font-size:14px; box-sizing:border-box; resize:vertical;"></textarea>
      <label style="font-size:13px; font-weight:700;">תקציב מקסימלי (אופציונלי)</label>
      <input id="pr-budget" type="text" placeholder="לדוגמה: עד 3000 ₪" style="padding:10px 12px; border:1px solid #ddd; border-radius:8px; font-size:14px; box-sizing:border-box;">
      <div style="display:flex; gap:10px; margin-top:4px;">
        <button onclick="submitProblem()" style="flex:2; background:#f59e0b; color:#fff; border:none; border-radius:8px; padding:11px; font-size:14px; font-weight:800; cursor:pointer;">🎯 פרסם בעיה</button>
        <button onclick="document.getElementById('problem-modal').remove()" style="flex:1; background:#fff; color:#334155; border:1px solid #ddd; border-radius:8px; padding:11px; font-size:14px; cursor:pointer;">ביטול</button>
      </div>
    </div>`;
}
window.openProblemModal = openProblemModal;

async function submitProblem() {
  if (!auth.currentUser) { if (typeof openLiveChatLogin === 'function') openLiveChatLogin(); return; }
  const title = ((document.getElementById('pr-title') || {}).value || '').trim();
  if (!title) { alert('נא לתאר מה צריך לפתור'); return; }
  const desc = ((document.getElementById('pr-desc') || {}).value || '').trim();
  const budget = ((document.getElementById('pr-budget') || {}).value || '').trim();
  let nickname = 'משתמש';
  try { const p = JSON.parse(localStorage.getItem(`user_profile_${auth.currentUser.uid}`) || '{}'); nickname = p.nickname || auth.currentUser.displayName || (auth.currentUser.email ? auth.currentUser.email.split('@')[0] : 'משתמש'); } catch (e) {}
  const defaultImg = 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80';
  const id = 'idea_prob_' + Date.now();
  const idea = {
    id, title: '🎯 ' + title.slice(0, 100), summary: desc.slice(0, 200), desc: desc.slice(0, 1000),
    category: 'בעיה לפתרון', isProblem: true, budget: budget.slice(0, 60), bids: {},
    author: nickname, authorId: auth.currentUser.uid, verified: true, verifiedUser: true,
    image: defaultImg, images: [defaultImg], likes: 0, views: 1,
    timestamp: new Date().toLocaleDateString('he-IL'), createdAt: Date.now(), approved: true
  };
  try {
    await set(ref(db, `website/ideas/${id}`), idea);
    const m = document.getElementById('problem-modal'); if (m) m.remove();
    if (typeof showCopyToast === 'function') showCopyToast('🎯 הבעיה פורסמה! ממתין להצעות');
    if (typeof mainContent !== 'undefined' && mainContent) mainContent.innerHTML = buildIdeasPage();
  } catch (e) { console.error('submit problem failed', e); alert('שגיאה בפרסום הבעיה'); }
}
window.submitProblem = submitProblem;

// תיבת ההצעות בעמוד הבעיה (מכרז): הגשת הצעה + רשימת הצעות ממוינת + בחירת הזולה
function ideaBidsBoxHTML(a) {
  const bids = a.bids ? Object.entries(a.bids).map(([bid, b]) => ({ bid, ...b })).filter(b => b && b.price != null) : [];
  bids.sort((x, y) => (Number(x.price) || 0) - (Number(y.price) || 0));
  const isOwner = auth.currentUser && a.authorId === auth.currentUser.uid;
  const isEd = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);
  const canChoose = isOwner || isEd;
  const rowsHTML = bids.length ? bids.map((b, i) => {
    const chosen = a.chosenBid === b.bid;
    const lowest = i === 0;
    return `
      <div style="display:flex; align-items:center; gap:10px; background:${chosen ? '#f0fdf4' : '#f8fafc'}; border:1px solid ${chosen ? '#86efac' : '#e2e8f0'}; border-radius:10px; padding:10px 12px;">
        <div style="flex:1; min-width:0;">
          <div style="font-size:14px; font-weight:900; color:#15803d;">₪${escHtml(String(b.price))}${lowest ? ' <span style="font-size:11px; color:#f59e0b;">🏆 הזול ביותר</span>' : ''}${chosen ? ' <span style="font-size:11px; color:#16a34a;">✓ נבחר</span>' : ''}</div>
          <div style="font-size:12px; color:#64748b;">${escHtml(b.name || 'משתמש')}</div>
        </div>
        ${canChoose && !a.chosenBid ? `<button onclick="chooseBid('${artEsc(a.id)}','${artEsc(b.bid)}')" style="background:#16a34a; color:#fff; border:none; border-radius:8px; padding:6px 12px; font-size:12px; font-weight:800; cursor:pointer;">בחר</button>` : ''}
      </div>`;
  }).join('') : '<div style="font-size:13px; color:#94a3b8; text-align:center; padding:12px;">אין הצעות עדיין — היו הראשונים להגיש!</div>';
  return `
    <div class="idea-tech-box">
      <div style="font-size:16px; font-weight:900; color:#0f172a; border-bottom:2.5px solid #f59e0b; padding-bottom:10px; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
        <span>💰 הצעות מחיר (${bids.length})</span>
      </div>
      ${a.budget ? `<div style="background:#fffbeb; border:1px solid #fde68a; border-radius:12px; padding:12px 14px; margin-bottom:12px;"><div style="font-size:11.5px; color:#92400e; font-weight:800; margin-bottom:4px;">🎯 תקציב מבוקש</div><div style="font-size:15px; font-weight:900; color:#b45309;">${escHtml(a.budget)}</div></div>` : ''}
      <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">${rowsHTML}</div>
      ${!a.chosenBid ? `<button onclick="submitBid('${artEsc(a.id)}')" style="width:100%; background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; border:none; padding:12px; border-radius:12px; font-weight:800; font-size:14px; cursor:pointer; box-shadow:0 4px 14px rgba(245,158,11,0.3);">💰 הגש הצעת מחיר</button>` : '<div style="text-align:center; font-size:13px; font-weight:800; color:#16a34a; padding:8px;">✓ נבחרה הצעה — המכרז נסגר</div>'}
    </div>`;
}
window.ideaBidsBoxHTML = ideaBidsBoxHTML;

function ideaTenderHowBoxHTML() {
  const steps = [
    { n: 1, t: '📝 פורסמה בעיה', d: 'מישהו תיאר בעיה או יעד שצריך לפתור.' },
    { n: 2, t: '💰 מגישים הצעות', d: 'פותרים מגישים הצעות מחיר לביצוע.' },
    { n: 3, t: '🏆 בוחרים את הזולה', d: 'המפרסם בוחר את ההצעה הטובה/זולה ביותר.' },
    { n: 4, t: '🤝 יוצרים קשר', d: 'הצדדים סוגרים את הפרטים ומתחילים.' }
  ];
  const stepsHTML = steps.map(s => `
      <div style="display:flex; gap:12px; align-items:flex-start; margin-bottom:14px; background:#f8fafc; padding:10px 12px; border-radius:10px; border:1px solid #e2e8f0;">
        <span style="background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; font-weight:900; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0;">${s.n}</span>
        <div><div style="font-size:13.5px; font-weight:800; color:#0f172a;">${s.t}</div><div style="font-size:12px; color:#64748b; line-height:1.4; margin-top:2px;">${s.d}</div></div>
      </div>`).join('');
  return `
    <div class="idea-exec-box">
      <div style="font-size:16px; font-weight:900; color:#0f172a; border-bottom:2.5px solid #f59e0b; padding-bottom:10px; margin-bottom:16px; display:flex; align-items:center; gap:8px;">
        <span>🎯 איך המכרז עובד</span>
      </div>
      <div style="display:flex; flex-direction:column;">${stepsHTML}</div>
    </div>`;
}
window.ideaTenderHowBoxHTML = ideaTenderHowBoxHTML;

async function submitBid(ideaId) {
  if (!auth.currentUser) { if (typeof openLiveChatLogin === 'function') openLiveChatLogin(); return; }
  const raw = prompt('הזן/י את הצעת המחיר שלך (₪):');
  if (raw === null) return;
  const price = parseInt(String(raw).replace(/[^\d]/g, ''), 10);
  if (!price) { alert('נא להזין מספר תקין'); return; }
  let nickname = 'משתמש';
  try { const p = JSON.parse(localStorage.getItem(`user_profile_${auth.currentUser.uid}`) || '{}'); nickname = p.nickname || auth.currentUser.displayName || (auth.currentUser.email ? auth.currentUser.email.split('@')[0] : 'משתמש'); } catch (e) {}
  try {
    const bidRef = push(ref(db, `website/ideas/${ideaId}/bids`));
    await set(bidRef, { price, name: nickname, uid: auth.currentUser.uid, at: Date.now() });
    if (ideasData[ideaId]) { if (!ideasData[ideaId].bids) ideasData[ideaId].bids = {}; ideasData[ideaId].bids[bidRef.key] = { price, name: nickname, uid: auth.currentUser.uid, at: Date.now() }; }
    if (typeof showCopyToast === 'function') showCopyToast('💰 ההצעה שלך הוגשה!');
    if (typeof mainContent !== 'undefined' && mainContent) { mainContent.innerHTML = buildIdeasPage(); setTimeout(() => { if (typeof photoOpenDetail === 'function') photoOpenDetail(ideaId); }, 60); }
  } catch (e) { console.error('submit bid failed', e); alert('שגיאה בהגשת ההצעה'); }
}
window.submitBid = submitBid;

async function chooseBid(ideaId, bidId) {
  const item = ideasData[ideaId];
  const isEd = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);
  if (!item || !(isEd || (auth.currentUser && item.authorId === auth.currentUser.uid))) { alert('רק מי שפרסם את הבעיה יכול לבחור הצעה'); return; }
  if (!confirm('לבחור בהצעה זו ולסגור את המכרז?')) return;
  try {
    await set(ref(db, `website/ideas/${ideaId}/chosenBid`), bidId);
    if (ideasData[ideaId]) ideasData[ideaId].chosenBid = bidId;
    if (typeof showCopyToast === 'function') showCopyToast('✓ ההצעה נבחרה!');
    if (typeof mainContent !== 'undefined' && mainContent) { mainContent.innerHTML = buildIdeasPage(); setTimeout(() => { if (typeof photoOpenDetail === 'function') photoOpenDetail(ideaId); }, 60); }
  } catch (e) { console.error('choose bid failed', e); alert('שגיאה בבחירת ההצעה'); }
}
window.chooseBid = chooseBid;

async function deleteIdea(ideaId) {
  const isEd = (typeof isAdmin === 'function' && isAdmin()) || (typeof isEditMode !== 'undefined' && isEditMode);
  if (!isEd) { alert('רק מנהל רשאי למחוק רעיונות'); return; }
  const item = ideasData[ideaId];
  if (!confirm(`האם למחוק את הרעיון "${item ? item.title : 'זה'}"?`)) return;
  try {
    await remove(ref(db, `website/ideas/${ideaId}`));
    delete ideasData[ideaId];
    if (typeof showCopyToast === 'function') showCopyToast('🗑️ הרעיון נמחק');
    if (typeof mainContent !== 'undefined' && mainContent) {
      mainContent.innerHTML = buildIdeasPage();
    }
  } catch (e) {
    console.error('Delete idea failed', e);
  }
}
window.deleteIdea = deleteIdea;

function openIdeaDetailModal(ideaId) {
  const item = ideasData[ideaId] || IDEAS_SAMPLES.find(x => x.id === ideaId);
  if (!item) return;
  if (typeof addToWatchHistory === 'function') addToWatchHistory({ ...item, type: 'idea', category: item.category || 'רעיון' });
  const currentUid = auth.currentUser ? auth.currentUser.uid : null;
  const votes = item.votes || {};
  const hasVoted = currentUid && !!votes[currentUid];
  const count = item.voteCount || Object.keys(votes).length;

  let modal = document.getElementById('idea-detail-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'idea-detail-modal';
    modal.style.cssText = 'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:999999; align-items:center; justify-content:center; direction:rtl; padding:20px;';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#fff; border-radius:18px; padding:28px; width:100%; max-width:550px; max-height:85vh; overflow-y:auto; display:flex; flex-direction:column; gap:16px; box-shadow:0 20px 60px rgba(0,0,0,0.3); direction:rtl; text-align:right;">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <span style="background:${escHtml(item.categoryColor || '#3b82f6')}; color:#fff; font-size:12px; font-weight:800; padding:4px 14px; border-radius:999px;">💡 ${escHtml(item.category || 'רעיון')}</span>
        <button onclick="document.getElementById('idea-detail-modal').style.display='none'" style="background:#f1f5f9; border:none; border-radius:50%; width:32px; height:32px; font-size:16px; font-weight:bold; cursor:pointer; color:#64748b;">✕</button>
      </div>

      <h2 style="margin:0; font-size:20px; font-weight:900; color:#0f172a; line-height:1.35;">${escHtml(item.title || '')}</h2>
      
      <div style="font-size:14px; color:#334155; line-height:1.6; white-space:pre-wrap; background:#f8fafc; padding:14px; border-radius:12px; border:1px solid #e2e8f0;">
        ${escHtml(item.desc || item.summary || '')}
      </div>

      <div style="display:flex; align-items:center; justify-content:space-between; margin-top:8px; border-top:1px solid #f1f5f9; padding-top:14px;">
        <div style="font-size:13px; color:#64748b; font-weight:700;">
          ✍️ מוצע על ידי: <b>${escHtml(item.author || 'אנונימי')}</b>
        </div>
        <button onclick="toggleIdeaVote('${artEsc(item.id)}'); document.getElementById('idea-detail-modal').style.display='none';" 
                style="display:flex; align-items:center; gap:8px; padding:8px 18px; border-radius:999px; border:${hasVoted ? 'none' : '1px solid #cbd5e1'}; background:${hasVoted ? '#3b82f6' : '#f8fafc'}; color:${hasVoted ? '#fff' : '#334155'}; font-size:14px; font-weight:800; cursor:pointer;">
          <span>▲</span>
          <span>${count} הצבעות</span>
        </button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';
}
window.openIdeaDetailModal = openIdeaDetailModal;

// ===== היסטוריית צפייה, מועדפים/לייקים ושפה =====
// היסטוריית צפייה — נשמרת בדפדפן, ולמשתמש מחובר גם בחשבון (website/users/{uid}/watch_history)
// כדי שניקוי/מחיקה יחולו בכל המכשירים ולא רק במכשיר שבו ניקו.
function _historyRemoteRef() {
  const u = auth.currentUser;
  return (u && !u.isAnonymous) ? ref(db, `website/users/${u.uid}/watch_history`) : null;
}
function _historyPush(list) {
  const r = _historyRemoteRef();
  if (!r) return;
  try { set(r, { items: (list && list.length) ? list : null, updatedAt: Date.now() }).catch(() => {}); } catch (e) {}
}
// מושך את ההיסטוריה מהחשבון (המקור הקובע למשתמש מחובר). אם אין עדיין — מעלה את המקומית.
async function _historyPull() {
  const r = _historyRemoteRef();
  if (!r) return false;
  try {
    const snap = await get(r);
    const local = localStorage.getItem('watch_history') || '[]';
    if (!snap.exists()) {
      _historyPush(JSON.parse(local));
      return false;
    }
    const v = snap.val() || {};
    const items = Array.isArray(v.items) ? v.items : (v.items ? Object.values(v.items) : []);
    const next = JSON.stringify(items);
    if (next === local) return false;
    if (items.length) localStorage.setItem('watch_history', next); else localStorage.removeItem('watch_history');
    return true;
  } catch (e) { return false; }
}

function addToWatchHistory(item) {
  if (!item || !item.id) return;
  try {
    let history = JSON.parse(localStorage.getItem('watch_history') || '[]');
    history = history.filter(h => h.id !== item.id);
    const validImg = (item.images && item.images[0]) || item.img || '';
    history.unshift({
      id: item.id,
      title: item.title || 'ללא כותרת',
      category: item.category || 'גלריה',
      author: item.author || '',
      img: validImg,
      type: item.type || 'photo',
      time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('he-IL')
    });
    if (history.length > 50) history = history.slice(0, 50);
    localStorage.setItem('watch_history', JSON.stringify(history));
    _historyPush(history);
  } catch (e) {}
}
window.addToWatchHistory = addToWatchHistory;

function openWatchHistoryPage(skipPull) {
  if (!skipPull) _historyPull().then(changed => { if (changed) openWatchHistoryPage(true); });
  let history = [];
  try { history = JSON.parse(localStorage.getItem('watch_history') || '[]'); } catch (e) {}

  let contentHTML = '';
  if (history.length === 0) {
    contentHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 20px; text-align:center;">
        <div style="font-size:48px; margin-bottom:16px; opacity:0.6;">🕒</div>
        <h3 style="margin:0 0 8px; font-size:20px; font-weight:800;">היסטוריית הצפייה שלך ריקה</h3>
        <p style="margin:0 0 20px; color:#64748b; font-size:14px; max-width:400px;">כל תמונה, סיפור או רעיון שתיכנס אליהם יופיעו כאן באופן אוטומטי.</p>
        <button onclick="if(typeof renderPhotosPage==='function'){renderPhotosPage();}else{location.reload();}" style="background:#e11d48; color:#fff; border:none; padding:10px 24px; border-radius:10px; font-weight:bold; font-size:14px; cursor:pointer; box-shadow:0 4px 12px rgba(225,29,72,0.3);">גלה פריטים באתר</button>
      </div>
    `;
  } else {
    const cardsHTML = history.map(item => {
      const img = item.img || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80';
      return `
        <div class="art-row" style="background:#fff; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; display:flex; flex-direction:column; cursor:pointer; position:relative;" onclick="photoOpenDetail('${artEsc(item.id)}')">
          <div style="aspect-ratio:16/9; width:100%; overflow:hidden; background:#f1f5f9; position:relative;">
            <img src="${escHtml(img)}" style="width:100%; height:100%; object-fit:cover; display:block;">
            <button onclick="event.stopPropagation(); removeFromWatchHistory('${artEsc(item.id)}'); openWatchHistoryPage(true);" style="position:absolute; top:8px; left:8px; background:rgba(0,0,0,0.6); color:#fff; border:none; border-radius:50%; width:28px; height:28px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:12px;" title="הסר מההיסטוריה">✕</button>
          </div>
          <div style="padding:10px 12px;">
            <h3 style="margin:0 0 6px; font-size:14px; font-weight:800; line-height:1.3; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${escHtml(item.title)}</h3>
            <div style="font-size:11px; color:#64748b; display:flex; justify-content:space-between; align-items:center;">
              <span>${escHtml(item.category || 'גלריה')} ${item.author ? '· ' + escHtml(item.author) : ''}</span>
              <span>${escHtml(item.date || '')}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    contentHTML = `
      <div class="art-rows" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:16px;">
        ${cardsHTML}
      </div>
    `;
  }

  mainContent.innerHTML = `
    <div class="history-page-wrapper" style="padding:24px 30px; direction:rtl; max-width:1400px; margin:0 auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; border-bottom:2px solid #f1f5f9; padding-bottom:14px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <h1 style="margin:0; font-size:24px; font-weight:900; letter-spacing:-0.5px;">HISTORY / היסטוריית צפייה</h1>
          <span style="background:#e2e8f0; color:#334155; padding:3px 10px; border-radius:12px; font-size:12px; font-weight:800;">${history.length} פריטים</span>
        </div>
        ${history.length > 0 ? `<button onclick="clearWatchHistory();" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; padding:8px 16px; border-radius:10px; font-weight:bold; font-size:13px; cursor:pointer;">🗑️ ניקוי היסטוריה</button>` : ''}
      </div>
      ${contentHTML}
    </div>
  `;
}
window.openWatchHistoryPage = openWatchHistoryPage;
window.openWatchHistoryModal = openWatchHistoryPage;

function clearWatchHistory() {
  if (confirm("האם ברצונך למחוק את כל היסטוריית הצפייה?")) {
    localStorage.removeItem('watch_history');
    _historyPush([]);
    openWatchHistoryPage(true);
  }
}
window.clearWatchHistory = clearWatchHistory;

function removeFromWatchHistory(id) {
  try {
    let history = JSON.parse(localStorage.getItem('watch_history') || '[]');
    history = history.filter(h => h.id !== id);
    localStorage.setItem('watch_history', JSON.stringify(history));
    _historyPush(history);
  } catch (e) {}
}
window.removeFromWatchHistory = removeFromWatchHistory;

let currentFavTab = 'likes';
function openFavoritesPage(tab) {
  if (tab) currentFavTab = tab;
  
  const user = auth.currentUser;
  const likedKey = user ? `liked_galleries_${user.uid}` : 'guest_liked_galleries';
  const savedKey = user ? `saved_galleries_${user.uid}` : 'guest_saved_galleries';

  let likedObj = {};
  let savedObj = {};
  try { likedObj = JSON.parse(localStorage.getItem(likedKey) || localStorage.getItem('liked_galleries') || '{}'); } catch(e){}
  try { savedObj = JSON.parse(localStorage.getItem(savedKey) || '{}'); } catch(e){}

  const likedIds = Object.keys(likedObj).filter(k => likedObj[k]);
  const savedIds = Object.keys(savedObj).filter(k => savedObj[k]);

  const targetIds = currentFavTab === 'likes' ? likedIds : savedIds;
  const targetCount = targetIds.length;

  let allGalleries = [];
  const container = mainContent.querySelector('.photos-page, .community-page, .user-page, .stories-page');
  if (container) {
    if (container.dataset.photosJson) {
      try { allGalleries = allGalleries.concat(JSON.parse(decodeURIComponent(container.dataset.photosJson))); } catch(e){}
    }
    if (container.dataset.storiesJson) {
      try { allGalleries = allGalleries.concat(JSON.parse(decodeURIComponent(container.dataset.storiesJson))); } catch(e){}
    }
  }

  const matchedItems = allGalleries.filter(a => targetIds.includes(a.id));

  let contentHTML = '';

  if (targetCount === 0) {
    contentHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 20px; text-align:center;">
        <div style="font-size:64px; margin-bottom:16px; opacity:0.8;">${currentFavTab === 'likes' ? '❤️' : '🔖'}</div>
        <h3 style="margin:0 0 8px; font-size:22px; font-weight:800;">${currentFavTab === 'likes' ? 'No liked items / אין פריטים בלייקים' : 'No saved items / אין פריטים שמורים'}</h3>
        <p style="margin:0 0 24px; color:#64748b; font-size:14px; max-width:420px;">
          ${currentFavTab === 'likes' ? 'לחץ ❤️ על גלריה, תמונה או סיפור כדי להוסיף אותם למועדפים שלך.' : 'לחץ על שמירה בגלריה כדי לשמור אותה לצפייה מאוחרת בדפדפן זה.'}
        </p>
        <button onclick="if(typeof renderPhotosPage==='function'){renderPhotosPage();}else{location.reload();}" style="background:#e11d48; color:#fff; border:none; padding:12px 28px; border-radius:10px; font-weight:800; font-size:15px; cursor:pointer; box-shadow:0 4px 14px rgba(225,29,72,0.35);">Browse items / גלה פריטים 🚀</button>
      </div>
    `;
  } else {
    const displayList = matchedItems.length > 0 ? matchedItems : targetIds.map(id => ({ id, title: `פריט #${id}`, category: 'מועדף' }));
    const cardsHTML = displayList.map(item => {
      const img = (item.images && item.images[0]) || item.img || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80';
      return `
        <div class="art-row" style="background:#fff; border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; display:flex; flex-direction:column; cursor:pointer; position:relative;" onclick="photoOpenDetail('${artEsc(item.id)}')">
          <div style="aspect-ratio:16/9; width:100%; overflow:hidden; background:#f1f5f9; position:relative;">
            <img src="${escHtml(img)}" style="width:100%; height:100%; object-fit:cover; display:block;">
          </div>
          <div style="padding:10px 12px;">
            <h3 style="margin:0 0 6px; font-size:14px; font-weight:800; line-height:1.3; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${escHtml(item.title || '')}</h3>
            <div style="font-size:11px; color:#64748b; display:flex; justify-content:space-between; align-items:center;">
              <span>${escHtml(item.category || 'גלריה')} ${item.author ? '· ' + escHtml(item.author) : ''}</span>
              <span style="color:#e11d48; font-weight:bold;">${currentFavTab === 'likes' ? '❤️ בלייק' : '🔖 שמור'}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    contentHTML = `
      <div class="art-rows" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:16px;">
        ${cardsHTML}
      </div>
    `;
  }

  mainContent.innerHTML = `
    <div class="favorites-page-wrapper" style="padding:24px 30px; direction:rtl; max-width:1400px; margin:0 auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:2px solid #f1f5f9; padding-bottom:14px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <h1 style="margin:0; font-size:24px; font-weight:900; letter-spacing:-0.5px;">FAVORITES / מועדפים ושמורים</h1>
          <span style="background:#e11d48; color:#fff; padding:3px 10px; border-radius:12px; font-size:12px; font-weight:800;">${targetCount} פריטים</span>
        </div>
        <div style="display:flex; gap:8px;">
          <button onclick="openFavoritesPage('likes')" style="padding:8px 18px; border-radius:10px; border:none; font-weight:800; font-size:13px; cursor:pointer; transition:all 0.2s; ${currentFavTab === 'likes' ? 'background:#e11d48; color:#fff; box-shadow:0 3px 10px rgba(225,29,72,0.3);' : 'background:#f1f5f9; color:#475569;'}">❤️ בלייקים שלי (${likedIds.length})</button>
          <button onclick="openFavoritesPage('saves')" style="padding:8px 18px; border-radius:10px; border:none; font-weight:800; font-size:13px; cursor:pointer; transition:all 0.2s; ${currentFavTab === 'saves' ? 'background:#e11d48; color:#fff; box-shadow:0 3px 10px rgba(225,29,72,0.3);' : 'background:#f1f5f9; color:#475569;'}">🔖 בשמורים שלי (${savedIds.length})</button>
        </div>
      </div>
      ${contentHTML}
    </div>
  `;
}
window.openFavoritesPage = openFavoritesPage;
window.openLikesModal = openFavoritesPage;

function openLanguageModal(e) {
  if (e) e.stopPropagation();
  const panel = document.getElementById('language-modal');
  if (!panel) return;
  if (panel.style.display === 'block') { panel.style.display = 'none'; return; }
  // סימון השפה הפעילה
  const lang = (typeof getUiLang === 'function') ? getUiLang() : (localStorage.getItem('user_language') || 'he');
  const heActive = document.getElementById('lang-active-he');
  const enActive = document.getElementById('lang-active-en');
  if (heActive) heActive.textContent = lang === 'he' ? '✓' : '';
  if (enActive) enActive.textContent = lang === 'en' ? '✓' : '';
  const heBtn = document.getElementById('lang-btn-he');
  const enBtn = document.getElementById('lang-btn-en');
  if (heBtn) heBtn.classList.toggle('is-active', lang === 'he');
  if (enBtn) enBtn.classList.toggle('is-active', lang === 'en');
  // סוגרים את חלונית ההתראות אם פתוחה
  const np = document.getElementById('notif-panel');
  if (np) np.style.display = 'none';
  // ממקמים מתחת לכפתור הגלובוס
  const btn = document.getElementById('header-lang-btn');
  panel.style.display = 'block';
  if (btn) {
    const z = siteBodyZoom();
    const r = btn.getBoundingClientRect();
    const w = panel.offsetWidth;
    const left = Math.max(12, Math.min(window.innerWidth / z - w - 12, (r.left + r.width / 2) / z - w / 2));
    panel.style.left = Math.round(left) + 'px';
    panel.style.top = Math.round(r.bottom / z + 10) + 'px';
  }
}
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const p = document.getElementById('language-modal');
    const b = document.getElementById('header-lang-btn');
    if (p && p.style.display === 'block' && !p.contains(e.target) && b && !b.contains(e.target)) p.style.display = 'none';
  });
}
window.openLanguageModal = openLanguageModal;

function selectLanguage(lang) {
  localStorage.setItem('user_language', lang);
  const modal = document.getElementById('language-modal');
  if (modal) modal.style.display = 'none';
  if (lang === 'en') {
    // מעבר לאנגלית — מרנדרים מחדש (כדי לעדכן מטבע $ בעמוד המנוי) ומתרגמים מיד
    try { if (typeof renderPage === 'function') renderPage(); } catch (e) {}
    translateChromeToEnglish();
  } else {
    // חזרה לעברית — טוענים מחדש כדי לשחזר את הטקסט המקורי
    try { location.reload(); } catch (e) {}
  }
}
window.selectLanguage = selectLanguage;

// ==========================================
// תרגום ממשק לאנגלית (רק סרגל עליון + סרגלי צד — לא תוכן משתמשים)
// ==========================================
function getUiLang() {
  try { return localStorage.getItem('user_language') || 'he'; } catch (e) { return 'he'; }
}

// מילון: מחרוזת עברית מדויקת -> אנגלית. רק מחרוזות שמופיעות כאן מתורגמות,
// כך שתוכן שהמשתמשים העלו (שאינו במילון) לעולם לא נוגעים בו.
const UI_EN = {
  // סרגל עליון + פריטי ניווט (עם וללא אימוג'י)
  'בית 🏠': 'Home 🏠', 'בית': 'Home',
  'קהילות 🏘️': 'Communities 🏘️', 'קהילות': 'Communities',
  'מנוי 💎': 'Subscription 💎', 'מנוי': 'Subscription',
  'שותפויות 🤝': 'Partnerships 🤝', 'שותפויות': 'Partnerships',
  'מוצרי יד שניה 🛒': 'Second Hand 🛒', 'מוצרי יד שניה': 'Second Hand',
  'ביקורת ⭐': 'Reviews ⭐', 'ביקורת': 'Reviews',
  'רעיונות 💡': 'Ideas 💡', 'רעיונות': 'Ideas',
  'מידע 🔒': 'Info 🔒', 'בקשות 🔒': 'Requests 🔒',
  'אורח': 'Guest',
  'תמונות 🖼️': 'Photos 🖼️', 'תמונות': 'Photos',
  'סיפורים 📖': 'Stories 📖', 'סיפורים': 'Stories',
  'קומיקס 💥': 'Comics 💥', 'קומיקס': 'Comics',
  'שאלות גולשים ❓': 'User Questions ❓', 'שאלות גולשים': 'User Questions',
  'הצעות 🔥': 'Offers 🔥', 'הצעות': 'Offers',
  // תיבת עמודי האתר (סרגל שמאל)
  '📌 עמודי האתר': '📌 Site Pages',
  'ניווט מהיר': 'Quick Nav',
  'עמודי צד': 'Side Pages',
  'פעיל': 'Active',
  // תיבת פרסום מודעה מהיר
  '🤖 פרסום מודעה מהיר': '🤖 Quick Ad Posting',
  'עוזר מונחה שיפרסם עבורך מודעה חדשה בצ׳אט תוך 30 שניות': 'A guided assistant that posts a new ad for you in chat within 30 seconds',
  '🤖 צ׳אט לפרסום מהיר': '🤖 Quick Post Chat',
  '🤖 צ׳אט מהיר לפרסום מודעה': '🤖 Quick Ad Chat',
  // סרגל ימין — סינונים וקישורים
  '👥 הקהילות שלנו ברשת': '👥 Our Communities Online',
  '🔎 סינונים': '🔎 Filters',
  '👥 קהילה': '👥 Community',
  '💬 צ׳אט': '💬 Chat',
  '🤖 פרסום': '🤖 Promote',
  '🎉 אירוע': '🎉 Event',
  '⚡ העלאה': '⚡ Upload',
  '🌐 אתרים': '🌐 Sites',
  '📩 מידע': '📩 Info',
  'מזער': 'Minimize',
  '🔖 שמורים': '🔖 Saved',
  '📨 הודעות': '📨 Messages',
  'טווח גילאים (AGE)': 'Age Range (AGE)',
  'כללי (SORT)': 'Sort (SORT)',
  'האחרונים': 'Newest', 'הפופולארים': 'Popular', 'הישנים': 'Oldest',
  'מין (CATEGORY)': 'Gender (CATEGORY)',
  'גבר': 'Male', 'אישה': 'Female', 'זוג': 'Couple',
  'מיקום (REGION)': 'Region (REGION)',
  'צפון': 'North', 'מרכז': 'Center', 'דרום': 'South',
  'תאריך (DATE)': 'Date (DATE)',
  'השבוע': 'This Week', 'החודש': 'This Month', 'השנה': 'This Year',
  'גודל (SIZE)': 'Size (SIZE)',
  '4 עמודות': '4 Columns', '3 עמודות': '3 Columns', '2 עמודות': '2 Columns',
  'נקה סינון ✕': 'Clear Filters ✕',
  // אירוע קרוב
  '🎉 מפגש ואירוע קרוב': '🎉 Upcoming Event',
  'מפגש קהילה מרכזי': 'Main Community Meetup',
  '📅 מפגש בתאריך:': '📅 Event date:',
  '📍 מיקום:': '📍 Location:',
  'תל אביב / זום אונליין': 'Tel Aviv / Zoom Online',
  '👥 נרשמו עד כה:': '👥 Registered so far:',
  '✍️ להרשמה לאירוע': '✍️ Register for event',
  // הגדרות תצוגה
  '🎛️ הגדרות תצוגה וסינון': '🎛️ Display & Filter Settings',
  'תוכן למבוגרים': 'Adult Content',
  '✓ תוכן למבוגרים (18+) פתוח לצפייה': '✓ Adult content (18+) is visible',
  // העלאה מהירה
  '⚡ העלאה מהירה': '⚡ Quick Upload',
  'הפרטים שלך (מייל/טלגרם) כבר שמורים וימולאו אוטומטית': 'Your details (email/Telegram) are saved and filled automatically',
  'העלאת גלריה חדשה': 'Upload New Gallery',
  'גלריות שמורות': 'Saved Galleries',
  'אין גלריות שמורות עדיין': 'No saved galleries yet',
  // אתרים מומלצים
  'אתרים מומלצים': 'Recommended Sites',
  'גוגל (Google)': 'Google', 'וואלה! (Walla)': 'Walla!',
  'ויינט (Ynet)': 'Ynet', 'יוטיוב (YouTube)': 'YouTube',
  // השאירו מידע / צ'אט
  '📩 השאירו לנו מידע': '📩 Leave us a message',
  'כל אחד יכול לכתוב לנו — גם בלי הרשמה.': 'Anyone can write to us — even without signing up.',
  'שליחה': 'Send', 'שלח': 'Send',
  '💬 צ\'אט חי — דברו זה עם זה': '💬 Live chat — talk to each other',
  '💡 טיפ: הקלד': '💡 Tip: type',
  'ואז שם קהילה כדי לפרסם מודעה מהירה לקהילה': 'then a community name to quickly post an ad',
  // placeholders
  'כתוב הודעה... או / לפרסום לקהילה': 'Write a message... or / to post to a community',
  'שם (אופציונלי)': 'Name (optional)',
  'חיפוש קהילות...': 'Search communities...',
  'הקלד תשובה לבוט...': 'Type your reply to the bot...',

  // ---- עמוד מנוי ----
  'מקצוען': 'Pro', 'מתקדם': 'Advanced', 'בסיס': 'Basic', 'מומלץ': 'Recommended',
  'לעסקים ומקצוענים שרוצים נוכחות חזקה ותוכן שנראה מיליון דולר.': 'For businesses and pros who want a strong presence and content that looks like a million bucks.',
  'לקחת את הפרופיל צעד קדימה עם תוכן ברמה אחרת.': 'Take your profile a step further with next-level content.',
  'להתחיל בקטן עם הפוסט הראשון שלך ב-AI.': 'Start small with your first AI post.',
  'להתחיל לגלות את הקהילה — בלי הגבלות צפייה.': 'Start exploring the community — no viewing limits.',
  'יותר לייקים, יותר חשיפה ויותר חיבורים.': 'More likes, more exposure, more connections.',
  'חשיפה מקסימלית — הפרופיל והתכנים שלך בראש.': 'Maximum exposure — your profile and content on top.',
  '15 לייקים ביום': '15 likes per day', '50 לייקים ביום': '50 likes per day', 'לייקים ללא הגבלה': 'Unlimited likes',
  '10 העלאות בחודש': '10 uploads per month', 'העלאות ללא הגבלה': 'Unlimited uploads',
  'העלאות ללא הגבלה + קידום': 'Unlimited uploads + promotion',
  'הלייקים מתחדשים כל יום': 'Likes renew every day', 'בלי מגבלות בכלל': 'No limits at all',
  'צפייה בתוכן פרימיום': 'Premium content access',
  'גישה לתוכן פרימיום — בלי פרסומות.': 'Premium content access — no ads.',
  'יותר תוכן, יותר חשיפה ויותר חיבורים.': 'More content, more exposure, more connections.',
  'גישה לתוכן פרימיום': 'Premium content access', 'צפייה בתוכן נסתר': 'View hidden content',
  '🎁 שבוע ניסיון חינם': '🎁 Free trial week', '7 ימים בלי לשלם': '7 days free',
  'ביטול בכל עת, בלי התחייבות': 'Cancel anytime, no commitment', 'התחילו שבוע חינם': 'Start free week',
  'הודעות פרטיות ללא הגבלה': 'Unlimited private messages',
  'בלי פרסומות': 'No ads',
  'כל מה שיש בבסיס': 'Everything in Basic',
  'אישור מהיר לתכנים שהעלית': 'Fast approval for your uploads',
  'לראות מי צפה בפרופיל שלך': 'See who viewed your profile',
  'צפייה בתמונות באיכות מלאה': 'Full-quality photo viewing',
  'כל מה שיש במתקדם': 'Everything in Advanced',
  'התכנים שלך מקודמים בראש הקהילות': 'Your content promoted at the top of communities',
  'תג פרופיל פרימיום': 'Premium profile badge',
  '/ חודש': '/ month',
  'בתשלום שנתי': 'billed annually', 'בתשלום חודשי': 'billed monthly',
  'הקרדיטים מתחדשים חודשית': 'Credits renew monthly',
  'בואו נתחיל': 'Get Started',
  'או תשלום מהיר עם': 'Or quick payment with',
  'מה מקבלים:': "What's included:",
  'יצירת תוכן חכם עם AI': 'Smart content creation with AI',
  'חיבור לרשתות החברתיות': 'Connect to social networks',
  'מסלול מהיר ליצירת תוכן': 'Fast track content creation',
  'גישה ראשונה לפיצ׳רים חדשים': 'Early access to new features',
  'תמיכה VIP': 'VIP support',

  // ---- כותרות מקטעים בעמוד הבית ----
  'תמונות אחרונות': 'Latest Photos',
  'סיפורים אחרונים': 'Latest Stories',
  'קומיקס אחרונים': 'Latest Comics',
  'פתח הכל ←': 'Open all ←', 'פתח הכל': 'Open all',
  'בואו להעלות תוכן לויראלי': 'Come upload viral content',
  'לאיזה אזור תרצו להעלות את התוכן שלכם?': 'Which area would you like to upload your content to?',
  'סיפורים קצרים ומאמרים': 'Short stories and articles',
  'רצועות קומיקס ואיורים': 'Comic strips and illustrations',
  'אלבומים וגלריות תמונות': 'Photo albums and galleries',

  // ---- פילטרים מרכזיים ----
  'הכל': 'All', 'לעסקים': 'Business', 'כללי': 'General',
  'מין': 'Gender', 'גיל': 'Age', 'מיקום': 'Location', 'תאריך': 'Date', 'גודל': 'Size',
  'משתמשים מאומתים': 'Verified users',
  '✓ משתמשים מאומתים': '✓ Verified users',
  'תמונות בגודל מלא (ללא שוליים)': 'Full-size images (no margins)',
  'מסך מלא (הסתרת סרגלי הצד)': 'Full screen (hide sidebars)',

  // ---- כרטיסים: מטא ופעולות ----
  'שמירה': 'Save', 'אימייל': 'Email', 'מנהל האתר': 'Site Admin',

  // ---- בוט פרסום מהיר ----
  'עוזר לפרסום מודעה מהיר': 'Quick Ad Posting Assistant',
  'זמין כעת · פרסום ב-30 שניות': 'Available now · Post in 30 seconds',
  'מצוין! מה כותרת המודעה / התמונה שברצונך לפרסם?': "Great! What's the title of the ad / image you'd like to post?",
  'נבחר: 🖼️ תמונות': 'Selected: 🖼️ Photos',
  'נבחר: 📖 קומיקס': 'Selected: 📖 Comics',
  'נבחר: ✍️ סיפורים': 'Selected: ✍️ Stories',

  // ---- מודל התחברות ----
  'התחבר כדי להמשיך': 'Log in to continue',
  'המשך עם גוגל': 'Continue with Google',
  'המשך עם פייסבוק': 'Continue with Facebook',
  'המשך עם אפל': 'Continue with Apple',
  'המשך עם טלפון': 'Continue with Phone',
  'המשך עם כתובת המייל שלך': 'Continue with your email address',
  'שליחת קוד': 'Send code',
  'תנאי השימוש': 'Terms of Service',

  // ---- כרטיסי כניסה לקהילות ----
  'לצפייה בכל התמונות': 'View all photos',
  'לצפייה בכל הקומיקס': 'View all comics',
  'לצפייה בכל הסיפורים': 'View all stories',
  'כניסה': 'Enter',
  'כניסה לקהילה': 'Enter community',

  // ---- קטגוריות ----
  'תמונות גולשים': 'User Photos',

  // ---- אשף תמונות: כותרות טלגרם/אימייל (התאמה מדויקת בלבד) + placeholders ----
  'טלגרם': 'Telegram (optional)',
  'אימייל': 'Email (optional)',
  'עירום': 'Nude',
  'תיאור קצר...': 'Short description...',
  'לדוגמה: 24': 'e.g. 24',
  'לדוגמה: מרכז / תל אביב': 'e.g. Center / Tel Aviv',
  'לדוגמה: @username': 'e.g. @username',
  'לדוגמה: example@mail.com': 'e.g. example@mail.com',

  // ---- אשף העלאה מהירה (5 שלבים) ----
  // קטגוריות שלב 3
  'הרפתקאות': 'Adventure', 'הומור': 'Humor', 'מד״ב ופנטזיה': 'Sci-Fi & Fantasy',
  'רומנטיקה': 'Romance', 'טבע ונופים': 'Nature & Landscapes', 'אמנות': 'Art',
  'חדשות וטכנולוגיה': 'News & Tech',
  // placeholders
  'לדוגמה: יום טיול מדהים בצפון / הרפתקה בחלל...': 'e.g. An amazing trip up north / a space adventure...',
  'או הקלידו קטגוריה אחרת...': 'Or type another category...',
  'כתבו כאן כמה מילים או תיאור מפורט...': 'Write a few words or a detailed description here...',
  'שם היוצר / כינוי / טלגרם (@username)...': 'Creator name / nickname / Telegram (@username)...',
  // תוויות / כפתורים
  'הוסף תמונה': 'Add photo',
  'פרסום': 'Publish'
};

// תבניות למחרוזות עם מספרים דינמיים (החלפת תת-מחרוזת בתוך צומת טקסט)
const UI_EN_PATTERNS = [
  [/([\d,]+)\s*קרדיטים\s*\/\s*חודש/g, '$1 credits / month'],
  [/([\d,]+)\s*קרדיטים/g, '$1 credits'],
  [/([\d,]+)\s*סרטונים/g, '$1 videos'],
  [/([\d,]+)\s*תמונות/g, '$1 images'],
  [/([\d,]+)\s*צפיות/g, '$1 views'],
  [/([\d,]+)\s*לייקים/g, '$1 likes'],
  [/([\d,]+)\s*משתתפים/g, '$1 participants'],
  [/גיל\s+(\d+)/g, 'Age $1'],
  [/שלב\s+(\d+)\s+מתוך\s+(\d+)/g, 'Step $1 of $2'],
  [/קומיקס\s*\((\d+)\s*אחרונים\)/g, 'Comics ($1 latest)'],
  [/סיפורים\s*\((\d+)\s*אחרונים\)/g, 'Stories ($1 latest)'],
  // כותרות מקטעים / כותרת ראשית שמפוצלות ל-spans — החלפת תת-מחרוזת
  [/תמונות אחרונות/g, 'Latest Photos'],
  [/סיפורים אחרונים/g, 'Latest Stories'],
  [/קומיקס אחרונים/g, 'Latest Comics'],
  [/בואו להעלות תוכן/g, 'Come upload viral content'],
  [/לויראלי/g, ''],
  // אשף העלאה — כותרות מפוצלות (מרכזים את כל הכותרת בחלק הראשון)
  [/מה הכותרת/g, "What's your title?"],
  [/של התוכן\?/g, ''],
  [/שלך\?/g, ''],
  [/מה הקטגוריה/g, "What's your category?"],
  [/גבר, אישה או זוג/g, 'Male, female or couple'],
  [/מה שם משתמש/g, "What's your Telegram username?"],
  [/הטלגרם שלך\?/g, ''],
  [/מה לגבי/g, 'What about your email?'],
  [/המייל שלך\?/g, ''],
  [/כותרת קליטה שתמשוך צופים/g, 'A catchy title that attracts viewers'],
  [/הגיל שיוצג בכרטיס/g, 'Your age shown on the card'],
  [/בחרו קטגוריה$/g, 'Choose a category'],
  [/באיזו קטגוריה/g, 'Which category does it fit?'],
  [/זה מתאים\?/g, ''],
  [/ספרו בקצרה/g, 'Tell us briefly about the content'],
  [/על התוכן/g, ''],
  [/מי היוצר \//g, "Who's the creator / contact?"],
  [/פרטי קשר\?/g, ''],
  [/העלאת תמונות/g, 'Upload images & publish'],
  [/ופרסום/g, ''],
  // אשף תמונות — שלבים נוספים
  [/מה התקציר/g, "What's the gallery summary?"],
  [/של הגלריה\?/g, ''],
  [/מה הגיל/g, "What's your age?"],
  [/מה המיקום\?/g, "What's the location? (optional)"],
  [/\(אופציונלי\)/g, ''],
  [/תיאור קצר או תקציר שילווה את הגלריה/g, 'A short description or summary for the gallery'],
  [/גיל שיוצג בכרטיס התוכן/g, 'Age shown on the content card'],
  [/אזור או מיקום שיוצג בכרטיס/g, 'Region or location shown on the card'],
  [/שם משתמש או קישור טלגרם ליצירת קשר/g, 'Telegram username or link for contact'],
  [/אימייל ליצירת קשר שיוצג בכרטיס/g, 'Contact email shown on the card'],
  // אשף העלאה — כותרות משנה
  [/כותרת קליטה שתמשוך קוראים וצופים/g, 'A catchy title that attracts readers and viewers'],
  [/בחרו קטגוריה או הקלידו קטגוריה מותאמת אישית/g, 'Choose a category or type a custom one'],
  [/תיאור קצר, תקציר או הטקסט המלא שילווה את היצירה/g, 'A short description, summary or the full text for your creation'],
  [/שם יוצר, טלגרם או אימייל שיופיע בכרטיס התוכן/g, 'Creator name, Telegram or email shown on the content card'],
  [/בחרו תמונה אחת או יותר ליצירה שלכם ולחצו על פרסום/g, 'Choose one or more images and click publish'],
  [/שלב אחרון:/g, 'Last step:'],
  [/לאיזה אזור תרצו להעלות את התוכן שלכם\?/g, 'Which area would you like to upload your content to?'],
  [/נבחר:\s*🖼️\s*תמונות/g, 'Selected: 🖼️ Photos'],
  [/נבחר:\s*📖\s*קומיקס/g, 'Selected: 📖 Comics'],
  [/נבחר:\s*✍️\s*סיפורים/g, 'Selected: ✍️ Stories'],
  [/נבחר:/g, 'Selected:'],
  // מתגים / פילטרים עליונים / חיפוש (אימוג'י צמוד לטקסט)
  [/תמונות בגודל מלא \(ללא שוליים\)/g, 'Full-size images (no margins)'],
  [/מסך מלא \(הסתרת סרגלי הצד\)/g, 'Full screen (hide sidebars)'],
  [/תוכן למבוגרים \(18\+\) פתוח לצפייה/g, 'Adult content (18+) is visible'],
  [/תוכן למבוגרים/g, 'Adult Content'],
  [/משתמשים מאומתים/g, 'Verified users'],
  [/לעסקים/g, 'Business'],
  [/כללי/g, 'General'],
  [/חיפוש קהילות\.\.\./g, 'Search communities...'],
  // בוט פרסום מהיר
  [/זמין כעת/g, 'Available now'],
  [/פרסום ב-30 שניות/g, 'Post in 30 seconds'],
  [/מצוין!/g, 'Great!'],
  [/מה כותרת המודעה \/ התמונה שברצונך לפרסם\?/g, "What's the title of the ad / image you'd like to post?"],
  // מודל התחברות — משפט תנאי שימוש (מפוצל)
  [/בהרשמה, אתם מסכימים ל/g, 'By signing up, you agree to our '],
  [/ ?שלנו\./g, '.']
];

let __uiTranslating = false;
// לא נוגעים בקוד עצמו. הודעות משתמשים/תוכן מוגנים ממילא כי המילון מתרגם
// רק מחרוזות מוכרות של הממשק — תוכן חופשי שהמשתמשים כתבו לא מופיע במילון.
const UI_SKIP_SEL = 'script, style';
function translateChromeToEnglish() {
  if (getUiLang() !== 'en') return;
  __uiTranslating = true;
  try {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && node.parentElement.closest(UI_SKIP_SEL)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const key = n.nodeValue.trim();
      if (Object.prototype.hasOwnProperty.call(UI_EN, key)) {
        n.nodeValue = n.nodeValue.replace(key, UI_EN[key]);
        return;
      }
      // תבניות (מספרים דינמיים)
      let v = n.nodeValue, changed = false;
      for (const [re, rep] of UI_EN_PATTERNS) {
        if (re.test(v)) { v = v.replace(re, rep); changed = true; }
      }
      if (changed) n.nodeValue = v;
    });
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(inp => {
      const raw = inp.placeholder || '';
      const k = raw.trim();
      if (k && Object.prototype.hasOwnProperty.call(UI_EN, k)) { inp.placeholder = UI_EN[k]; return; }
      let v = raw, changed = false;
      for (const [re, rep] of UI_EN_PATTERNS) {
        if (re.test(v)) { v = v.replace(re, rep); changed = true; }
      }
      if (changed) inp.placeholder = v;
    });
  } catch (e) {}
  __uiTranslating = false;
}
window.translateChromeToEnglish = translateChromeToEnglish;

// ==========================================
// הסרת כל האימוג'ים מהממשק (בשתי השפות). לא נוגע בחצים/סימנים פונקציונליים
// (‹ › ← ▾ ✓), רק באימוג'י ציוריים, דגלים, גווני עור, ומחברי ZWJ/סימני וריאציה.
// פועל בזמן תצוגה בלבד — לא משנה נתונים שמורים.
// ==========================================
function stripEmojisFromNode(str) {
  return str
    // אימוג'י ציוריים ודגלים — משאירים ✓✔✕✖ (2713–2716), חצים (2190–21FF) וצורות (25xx) שהם פונקציונליים
    .replace(/[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{2712}\u{2717}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}]/gu, '')
    .replace(/[\u{1F3FB}-\u{1F3FF}️‍⃣]/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([:!?.,)])/g, '$1')
    .replace(/[ \t]+$/g, '')
    .replace(/^[ \t]+/g, '');
}
function stripUiEmojis() {
  __uiTranslating = true;
  try {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && node.parentElement.closest(UI_SKIP_SEL)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const stripped = stripEmojisFromNode(n.nodeValue);
      if (stripped === n.nodeValue) return;
      // כפתור שכל התוכן שלו הוא אייקון (הסתרה 👁️, עריכה ✏️, מחיקה 🗑️ וכו') — לא נוגעים,
      // אחרת הכפתור נשאר ריק ונעלם (כך נעלמו כפתורי הסתרת העמודים במצב עריכה)
      if (!stripped.trim()) {
        const p = n.parentElement;
        if (p && p.matches('button, a, [onclick], [role="button"], [title], .top-nav-controls > *')) return;
      }
      n.nodeValue = stripped;
    });
    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(inp => {
      const s = stripEmojisFromNode(inp.placeholder || '');
      if (s !== inp.placeholder) inp.placeholder = s;
    });
  } catch (e) {}
  __uiTranslating = false;
}
window.stripUiEmojis = stripUiEmojis;

// מפעיל את התרגום מחדש בכל רינדור/שינוי DOM (כשהשפה אנגלית).
// כשהתרגום עצמו משנה DOM זה יגרום לסבב נוסף, אך מכיוון שהמחרוזות כבר
// באנגלית (לא מתאימות למילון) הסבב הנוסף לא משנה דבר — ומתכנס מיד.
(function initUiLangObserver() {
  let scheduled = false;
  const run = () => {
    scheduled = false;
    if (__uiTranslating) return;
    if (getUiLang() === 'en') translateChromeToEnglish();
    stripUiEmojis();
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || setTimeout)(run);
  };
  const obs = new MutationObserver(schedule);
  const start = () => {
    if (!document.body) { setTimeout(start, 50); return; }
    obs.observe(document.body, { subtree: true, childList: true, characterData: true });
    if (getUiLang() === 'en') translateChromeToEnglish();
    stripUiEmojis();
  };
  start();
})();

// ==========================================
// אונבורדינג — פופ-אפ הדרכה בסגנון Shapr3D (טאבים + פס התקדמות + מעבר אוטומטי)
// גרסה למחשב וגרסה למובייל. סרטונים משובצים ב-ONBOARDING_STEPS (video: נתיב/URL).
// ==========================================
const ONBOARDING_STEPS = {
  desktop: [
    { he: 'ניווט וגלישה', en: 'Browse & Navigate',
      capHe: 'עברו בין תמונות, קומיקס וסיפורים, וסננו לפי קטגוריה, גיל ומיקום מהסרגל.',
      capEn: 'Move between photos, comics and stories, and filter by category, age and location.',
      video: '', poster: '' },
    { he: 'העלאת תוכן', en: 'Upload Content',
      capHe: 'העלו גלריה או סיפור תוך שניות עם כלי ההעלאה המהירה.',
      capEn: 'Upload a gallery or story in seconds with the quick-upload tool.',
      video: '', poster: '' },
    { he: 'קהילות וצ׳אט', en: 'Communities & Chat',
      capHe: 'הצטרפו לקהילות, שוחחו בצ׳אט החי ופרסמו מודעה מהירה.',
      capEn: 'Join communities, use live chat and post a quick ad.',
      video: '', poster: '' }
  ],
  mobile: [
    { he: 'החלקה בין תכנים', en: 'Swipe Through Content',
      capHe: 'החליקו ימינה/שמאלה כדי לעבור בין תמונות, קומיקס וסיפורים.',
      capEn: 'Swipe left/right to move between photos, comics and stories.',
      video: '', poster: '' },
    { he: 'העלאה מהירה', en: 'Quick Upload',
      capHe: 'הקישו על כפתור ההעלאה כדי לפרסם גלריה או סיפור מהנייד.',
      capEn: 'Tap the upload button to post a gallery or story from your phone.',
      video: '', poster: '' },
    { he: 'קהילות וצ׳אט', en: 'Communities & Chat',
      capHe: 'הצטרפו לקהילות ושוחחו בצ׳אט — הכל מותאם למסך הנייד.',
      capEn: 'Join communities and chat — all optimized for mobile.',
      video: '', poster: '' }
  ]
};
let __onboardingTimer = null;
let __onboardingIdx = 0;

function onboardingPlatform() {
  return (window.innerWidth <= 768) ? 'mobile' : 'desktop';
}
function onboardingSteps() {
  return ONBOARDING_STEPS[onboardingPlatform()] || ONBOARDING_STEPS.desktop;
}
function getOnboardingVideo(plat, idx) {
  try { return (ONBOARDING_VIDEOS[plat] && ONBOARDING_VIDEOS[plat][idx]) || ''; } catch (e) { return ''; }
}
// יש סרטונים למכשיר הנוכחי?
function hasOnboardingVideos(plat) {
  plat = plat || onboardingPlatform();
  try { return (ONBOARDING_VIDEOS[plat] || []).some(v => v && v.trim()); } catch (e) { return false; }
}

function buildOnboardingModal() {
  const en = (typeof getUiLang === 'function') && getUiLang() === 'en';
  const steps = onboardingSteps();
  const platLabelHe = onboardingPlatform() === 'mobile' ? 'מדריך למובייל' : 'מדריך למחשב';
  const platLabelEn = onboardingPlatform() === 'mobile' ? 'Mobile guide' : 'Desktop guide';
  const tabs = steps.map((s, i) => `
    <button type="button" class="onb-tab ${i === __onboardingIdx ? 'active' : ''}" onclick="onboardingGoTo(${i})" style="flex:1; position:relative; background:${i === __onboardingIdx ? '#1c1c22' : '#111116'}; color:${i === __onboardingIdx ? '#fff' : '#8b8b96'}; border:none; border-left:1px solid #26262e; padding:14px 10px; font-size:13px; font-weight:800; letter-spacing:0.3px; cursor:pointer; overflow:hidden; text-transform:uppercase;">
      ${en ? s.en : s.he}
      <span class="onb-progress" style="position:absolute; bottom:0; right:0; height:3px; background:#3b6ef5; width:${i < __onboardingIdx ? '100%' : '0'};"></span>
    </button>`).join('');

  const cur = steps[__onboardingIdx] || steps[0];
  const vurl = getOnboardingVideo(onboardingPlatform(), __onboardingIdx);
  const media = vurl
    ? `<video src="${escHtml(vurl)}" autoplay muted loop playsinline style="width:100%; height:100%; object-fit:cover; display:block;"></video>`
    : `<div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; color:#5a5a66; background:radial-gradient(circle at 50% 40%, #1a1a20, #0c0c10);">
         <div style="width:64px; height:64px; border-radius:50%; border:2px solid #3b6ef5; display:flex; align-items:center; justify-content:center;"><div style="width:0;height:0;border-top:12px solid transparent;border-bottom:12px solid transparent;border-right:18px solid #3b6ef5;margin-right:-3px;"></div></div>
         <div style="font-size:13px; font-weight:700;">${en ? 'No video yet' : 'אין עדיין סרטון'}</div>
       </div>`;

  return `
    <div style="width:100%; max-width:1000px; background:#0a0a0d; border-radius:16px; overflow:hidden; box-shadow:0 30px 80px rgba(0,0,0,0.6); direction:rtl; display:flex; flex-direction:column;">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:#0a0a0d; border-bottom:1px solid #1e1e26;">
        <span style="color:#8b8b96; font-size:12px; font-weight:700;">${en ? platLabelEn : platLabelHe}</span>
        <button type="button" onclick="closeOnboarding()" style="background:none; border:none; color:#9a9aa6; font-size:22px; line-height:1; cursor:pointer;">✕</button>
      </div>
      <div style="display:flex; width:100%;">${tabs}</div>
      <div style="position:relative; width:100%; aspect-ratio:16/9; background:#000;">${media}</div>
      <div style="padding:18px 20px 22px; text-align:${en ? 'left' : 'right'}; direction:${en ? 'ltr' : 'rtl'};">
        <div style="color:#fff; font-size:18px; font-weight:800; margin-bottom:6px;">${en ? cur.en : cur.he}</div>
        <div style="color:#9a9aa6; font-size:14px; line-height:1.5;">${en ? cur.capEn : cur.capHe}</div>
        <div style="display:flex; justify-content:${en ? 'flex-start' : 'flex-end'}; gap:10px; margin-top:16px;">
          <button type="button" onclick="closeOnboarding()" style="background:#1c1c22; color:#cfcfd6; border:none; border-radius:10px; padding:9px 18px; font-weight:700; cursor:pointer;">${en ? 'Skip' : 'דלג'}</button>
          <button type="button" onclick="onboardingNext()" style="background:#3b6ef5; color:#fff; border:none; border-radius:10px; padding:9px 22px; font-weight:800; cursor:pointer;">${__onboardingIdx >= steps.length - 1 ? (en ? 'Done' : 'סיום') : (en ? 'Next' : 'הבא')}</button>
        </div>
      </div>
    </div>`;
}

function renderOnboarding() {
  const host = document.getElementById('onboarding-modal');
  if (!host) return;
  host.innerHTML = buildOnboardingModal();
  // אנימציית מילוי פס ההתקדמות של הטאב הפעיל
  const bar = host.querySelector('.onb-tab.active .onb-progress');
  if (bar) {
    bar.style.transition = 'none'; bar.style.width = '0';
    requestAnimationFrame(() => { bar.style.transition = 'width 7s linear'; bar.style.width = '100%'; });
  }
}

function onboardingGoTo(i) {
  const steps = onboardingSteps();
  __onboardingIdx = Math.max(0, Math.min(i, steps.length - 1));
  renderOnboarding();
  scheduleOnboardingAdvance();
}
function onboardingNext() {
  const steps = onboardingSteps();
  if (__onboardingIdx >= steps.length - 1) { closeOnboarding(); return; }
  onboardingGoTo(__onboardingIdx + 1);
}
function scheduleOnboardingAdvance() {
  if (__onboardingTimer) clearTimeout(__onboardingTimer);
  __onboardingTimer = setTimeout(() => {
    const steps = onboardingSteps();
    if (__onboardingIdx >= steps.length - 1) { closeOnboarding(); }
    else { onboardingGoTo(__onboardingIdx + 1); }
  }, 7000);
}
// הצגה אוטומטית לגולש חדש — רק אם קיימים סרטונים למכשיר הנוכחי
function maybeShowOnboarding() {
  if (!hasOnboardingVideos()) return;
  try { if (localStorage.getItem('onboarding_seen_v1')) return; } catch (e) {}
  openOnboarding(false);
}
window.maybeShowOnboarding = maybeShowOnboarding;

function openOnboarding(force) {
  try { if (!force && localStorage.getItem('onboarding_seen_v1')) return; } catch (e) {}
  // בלי סרטונים — לא מציגים כלום (אלא אם המנהל פותח בכפייה לתצוגה מקדימה)
  if (!hasOnboardingVideos() && !force) return;
  let host = document.getElementById('onboarding-modal');
  if (!host) {
    host = document.createElement('div');
    host.id = 'onboarding-modal';
    host.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(6px); z-index:9999999; display:flex; align-items:center; justify-content:center; padding:20px; box-sizing:border-box;';
    document.body.appendChild(host);
  }
  host.style.display = 'flex';
  __onboardingIdx = 0;
  renderOnboarding();
  scheduleOnboardingAdvance();
}
function closeOnboarding() {
  if (__onboardingTimer) clearTimeout(__onboardingTimer);
  const host = document.getElementById('onboarding-modal');
  if (host) host.style.display = 'none';
  try { localStorage.setItem('onboarding_seen_v1', '1'); } catch (e) {}
}
window.openOnboarding = openOnboarding;
window.closeOnboarding = closeOnboarding;
window.onboardingGoTo = onboardingGoTo;
window.onboardingNext = onboardingNext;

// ==========================================
// ניהול (מנהל בלבד) — הוספת/עריכת סרטוני המדריך
// ==========================================
function openOnboardingAdmin() {
  let modal = document.getElementById('onboarding-admin-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'onboarding-admin-modal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:99999999; display:flex; align-items:center; justify-content:center; padding:20px; direction:rtl;';
    document.body.appendChild(modal);
  }
  const row = (plat, idx, label) => {
    const v = getOnboardingVideo(plat, idx);
    return `<label style="display:flex; flex-direction:column; gap:4px; font-size:13px; color:#333;">
      <span>${label} — סרטון ${idx + 1}:</span>
      <input type="url" data-onb-plat="${plat}" data-onb-idx="${idx}" value="${v.replace(/"/g, '&quot;')}" placeholder="הדביקו קישור לסרטון (mp4/webm)" style="padding:8px 12px; border:1px solid #ddd; border-radius:8px; font-size:13px;">
    </label>`;
  };
  modal.innerHTML = `
    <div style="background:#fff; border-radius:16px; padding:22px; width:100%; max-width:520px; max-height:88vh; overflow:auto; box-shadow:0 20px 60px rgba(0,0,0,0.3); display:flex; flex-direction:column; gap:14px;">
      <h3 style="margin:0; font-size:18px; font-weight:800; color:#3b6ef5; border-bottom:2px solid #3b6ef5; padding-bottom:8px;">הגדרות מדריך (אונבורדינג)</h3>
      <p style="margin:0; font-size:12px; color:#777;">הדביקו קישור לכל סרטון. השאירו ריק כדי לא להציג. כשיש לפחות סרטון אחד — המדריך יופיע לגולשים חדשים בעמוד הראשי.</p>
      <div style="font-weight:800; color:#111; margin-top:4px;">מחשב</div>
      ${row('desktop', 0, 'מחשב')}${row('desktop', 1, 'מחשב')}${row('desktop', 2, 'מחשב')}
      <div style="font-weight:800; color:#111; margin-top:8px;">מובייל</div>
      ${row('mobile', 0, 'מובייל')}${row('mobile', 1, 'מובייל')}${row('mobile', 2, 'מובייל')}
      <div style="display:flex; gap:10px; justify-content:space-between; margin-top:8px; flex-wrap:wrap;">
        <button type="button" onclick="openOnboarding(true)" style="background:#f3f4f6; border:none; border-radius:8px; padding:8px 14px; font-weight:bold; cursor:pointer;">תצוגה מקדימה 👁</button>
        <div style="display:flex; gap:10px;">
          <button type="button" onclick="closeOnboardingAdmin()" style="background:#f3f4f6; border:none; border-radius:8px; padding:8px 16px; font-weight:bold; cursor:pointer;">ביטול</button>
          <button type="button" onclick="saveOnboardingAdmin()" style="background:#3b6ef5; color:#fff; border:none; border-radius:8px; padding:8px 20px; font-weight:bold; cursor:pointer;">שמור</button>
        </div>
      </div>
    </div>`;
  modal.style.display = 'flex';
}
function closeOnboardingAdmin() {
  const m = document.getElementById('onboarding-admin-modal');
  if (m) m.style.display = 'none';
}
function saveOnboardingAdmin() {
  const modal = document.getElementById('onboarding-admin-modal');
  if (!modal) return;
  const next = { desktop: ['', '', ''], mobile: ['', '', ''] };
  modal.querySelectorAll('input[data-onb-plat]').forEach(inp => {
    const p = inp.getAttribute('data-onb-plat');
    const i = parseInt(inp.getAttribute('data-onb-idx'), 10);
    if (next[p]) next[p][i] = inp.value.trim();
  });
  ONBOARDING_VIDEOS = next;
  try { localStorage.setItem('onboarding_videos_v1', JSON.stringify(ONBOARDING_VIDEOS)); } catch (e) {}
  // מאפשר לגולשים לראות שוב את המדריך המעודכן
  try { localStorage.removeItem('onboarding_seen_v1'); } catch (e) {}
  if (typeof saveToStorage === 'function') { try { saveToStorage(); } catch (e) {} }
  closeOnboardingAdmin();
  alert('נשמר! המדריך יופיע לגולשים חדשים (וגלובלית לכל המכשירים).');
}
window.openOnboardingAdmin = openOnboardingAdmin;
window.closeOnboardingAdmin = closeOnboardingAdmin;
window.saveOnboardingAdmin = saveOnboardingAdmin;

// הצגה אוטומטית בכניסה ראשונה (רק אם יש סרטונים)
(function initOnboarding() {
  const boot = () => { try { maybeShowOnboarding(); } catch (e) {} };
  if (document.readyState === 'complete') setTimeout(boot, 1400);
  else window.addEventListener('load', () => setTimeout(boot, 1400));
})();

// ==========================================
// עמוד מנויים (Subscription Plans Page)
// ==========================================
let currentSubscriptionBilling = 'yearly'; // 'yearly' | 'monthly'

// כל המסלולים: שבוע ניסיון חינם. כל מסלול מוסיף פיצ'רים שאין במסלולים שמתחתיו (exclusive).
const SUBSCRIPTION_TRIAL_DAYS = 7;
const subscriptionPlansData = [
  {
    id: 'basic',
    title: 'בסיס',
    subtitle: 'גישה לתוכן פרימיום — בלי פרסומות.',
    monthlyOriginal: 20,
    monthlyPrice: 20,
    yearlyOriginal: 20,
    yearlyPrice: 20,
    usd: 6,
    isFeatured: false,
    features: [
      'גישה לתוכן פרימיום',
      'בלי פרסומות',
      'צפייה בתוכן נסתר'
    ],
    exclusive: []
  },
  {
    id: 'advanced',
    title: 'מתקדם',
    subtitle: 'יותר תוכן, יותר חשיפה ויותר חיבורים.',
    badge: 'מומלץ',
    monthlyOriginal: 40,
    monthlyPrice: 40,
    yearlyOriginal: 40,
    yearlyPrice: 40,
    usd: 12,
    isFeatured: true,
    features: [
      'כל מה שיש בבסיס'
    ],
    exclusive: [
      'לראות מי צפה בפרופיל שלך',
      'צפייה בתמונות באיכות מלאה',
      'הודעות פרטיות ללא הגבלה'
    ]
  },
  {
    id: 'pro',
    title: 'מקצוען',
    subtitle: 'חשיפה מקסימלית — הפרופיל והתכנים שלך בראש.',
    monthlyOriginal: 60,
    monthlyPrice: 60,
    yearlyOriginal: 60,
    yearlyPrice: 60,
    usd: 18,
    isFeatured: false,
    features: [
      'כל מה שיש במתקדם'
    ],
    exclusive: [
      'התכנים שלך מקודמים בראש הקהילות',
      'תג פרופיל פרימיום',
      'גישה ראשונה לפיצ׳רים חדשים',
      'תמיכה VIP'
    ]
  }
];

// המסלול המסומן (סגול) — עובר למסלול שנלחץ
let selectedSubscriptionPlan = 'advanced';
function selectSubscriptionPlan(planId) {
  if (!subscriptionPlansData.some(p => p.id === planId) || selectedSubscriptionPlan === planId) return;
  selectedSubscriptionPlan = planId;
  const container = document.querySelector('.subscription-page-wrapper');
  if (container && container.parentElement) container.parentElement.innerHTML = buildSubscriptionPage();
}
window.selectSubscriptionPlan = selectSubscriptionPlan;

function setSubscriptionBilling(period) {
  currentSubscriptionBilling = period;
  const container = document.querySelector('.subscription-page-wrapper');
  if (container) {
    const parent = container.parentElement;
    if (parent) {
      parent.innerHTML = buildSubscriptionPage();
    }
  }
}
window.setSubscriptionBilling = setSubscriptionBilling;

function handleSubscriptionPlanSelect(planId) {
  selectSubscriptionPlan(planId);
  if (typeof trackEvent === 'function') trackEvent('subscribe_click');
  const plan = subscriptionPlansData.find(p => p.id === planId);
  const planName = plan ? plan.title : planId;
  const periodText = currentSubscriptionBilling === 'yearly' ? 'שנתי' : 'חודשי';
  alert(`בחרת במסלול ${planName} (${periodText}) — כולל ${SUBSCRIPTION_TRIAL_DAYS} ימי ניסיון חינם! תהליך ההרשמה יתחבר בקרוב.`);
}
window.handleSubscriptionPlanSelect = handleSubscriptionPlanSelect;


function buildSubscriptionPage() {
  const isYearly = currentSubscriptionBilling === 'yearly';

  // מטבע לפי שפה: אנגלית -> דולר ($), עברית -> שקל (₪)
  const isEnglish = (typeof getUiLang === 'function') && getUiLang() === 'en';
  const currencySym = isEnglish ? '$' : '₪';
  const cardsHtml = subscriptionPlansData.map(plan => {
    const shekelPrice = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
    const price = isEnglish ? (plan.usd != null ? plan.usd : shekelPrice) : shekelPrice;
    const origPrice = (!isEnglish && isYearly) ? plan.yearlyOriginal : null;
    const formattedPrice = price.toLocaleString('he-IL');
    const formattedOrigPrice = origPrice ? origPrice.toLocaleString('he-IL') : '';
    const paymentPeriodLabel = isYearly ? 'בתשלום שנתי' : 'בתשלום חודשי';

    const isSelected = plan.id === selectedSubscriptionPlan;
    const cardBorder = isSelected ? '2px solid #8b5cf6' : '1px solid #e2e8f0';
    const cardShadow = isSelected ? '0 12px 30px rgba(139, 92, 246, 0.15)' : '0 4px 16px rgba(0,0,0,0.04)';
    const btnStyle = isSelected
      ? 'background: #7c3aed; color: #ffffff; border: none;'
      : 'background: #ffffff; color: #6366f1; border: 1.5px solid #a5b4fc;';

    const featuresListHtml = plan.features.map(f => `
      <li style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #475569; line-height: 1.4;">
        <span style="display: inline-block; width: 4px; height: 4px; background: #6366f1; border-radius: 50%; flex-shrink: 0;"></span>
        <span>${f}</span>
      </li>
    `).join('') + (plan.exclusive || []).map(f => `
      <li class="sub-exclusive" style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #5b21b6; font-weight: 700; line-height: 1.4;">
        <span style="flex-shrink: 0; font-size: 11px;">✨</span>
        <span>${f}</span>
      </li>
    `).join('');

    return `
      <div class="sub-pricing-card ${isSelected ? 'featured' : ''}" onclick="selectSubscriptionPlan('${artEsc(plan.id)}')" style="
        position: relative;
        cursor: pointer;
        background: #ffffff;
        border-radius: 18px;
        border: ${cardBorder};
        box-shadow: ${cardShadow};
        padding: 24px 20px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        text-align: center;
        flex: 1 1 200px;
        min-width: 200px;
        max-width: 250px;
        transition: transform 0.2s, box-shadow 0.2s;
      ">
        ${plan.badge ? `
          <div class="sub-badge" style="
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            background: #a855f7;
            color: #ffffff;
            font-size: 11.5px;
            font-weight: 800;
            padding: 2px 14px;
            border-radius: 12px;
            box-shadow: 0 2px 6px rgba(168,85,247,0.3);
            white-space: nowrap;
          ">${plan.badge}</div>
        ` : ''}

        <div>
          <!-- Title & Subtitle -->
          <h3 class="sub-title" style="margin: 0 0 6px 0; font-size: 20px; font-weight: 800; color: #0f172a;">${escHtml(plan.title)}</h3>
          <p class="sub-subtitle" style="margin: 0 0 20px 0; font-size: 11.5px; color: #64748b; line-height: 1.35; min-height: 32px;">${escHtml(plan.subtitle)}</p>

          <!-- Price section -->
          <div class="sub-price-box" style="margin-bottom: 16px; min-height: 80px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center;">
            ${isYearly && origPrice && origPrice > price ? `
              <div style="font-size: 15px; color: #94a3b8; text-decoration: line-through; font-weight: 600; margin-bottom: 2px;">
${currencySym}${formattedOrigPrice}
              </div>
            ` : '<div style="height: 22px;"></div>'}
            
            <div class="sub-price-row" style="display: flex; align-items: baseline; justify-content: center; gap: 4px; direction: rtl;">
              <span class="sub-price" style="font-size: 38px; font-weight: 900; color: #0f172a; line-height: 1; letter-spacing: -1px;">${currencySym}${formattedPrice}</span>
              <div style="display: flex; flex-direction: column; align-items: flex-start; text-align: right; line-height: 1.1;">
                <span style="font-size: 11.5px; color: #64748b; font-weight: 700;">/ חודש</span>
                <span style="font-size: 9.5px; color: #94a3b8;">${paymentPeriodLabel}</span>
              </div>
            </div>
          </div>

          <!-- Credits & Usage details -->
          <div class="sub-credits" style="background: #f5f3ff; border-radius: 10px; padding: 10px 8px; margin-bottom: 18px; border: 1px solid #ede9fe;">
            <div style="font-size: 12.5px; font-weight: 800; color: #5b21b6; margin-bottom: 2px;">🎁 שבוע ניסיון חינם</div>
            <div style="font-size: 11.5px; font-weight: 700; color: #334155; margin-bottom: 2px;">${SUBSCRIPTION_TRIAL_DAYS} ימים בלי לשלם</div>
            <div style="font-size: 10px; color: #94a3b8;">ביטול בכל עת, בלי התחייבות</div>
          </div>

          <!-- Action Button -->
          <button class="sub-start-btn" onclick="event.stopPropagation(); handleSubscriptionPlanSelect('${artEsc(plan.id)}')" style="
            width: 100%;
            padding: 10px 14px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s ease;
            ${btnStyle}
          ">התחילו שבוע חינם</button>

        </div>

        <!-- Features Divider & List -->
        <div class="sub-features" style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 18px; text-align: right;">
          <div class="sub-features-title" style="font-size: 11.5px; font-weight: 800; color: #1e293b; margin-bottom: 10px;">מה מקבלים:</div>
          <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
            ${featuresListHtml}
          </ul>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="subscription-page-wrapper" style="
      max-width: 1350px;
      margin: 0 auto;
      padding: 30px 16px 60px 16px;
      direction: rtl;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Hebrew', sans-serif;
    ">
      <div style="margin-bottom: 24px;"></div>

      <!-- Pricing Cards Grid -->
      <div class="sub-plans-grid" style="
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        justify-content: center;
        align-items: stretch;
      ">
        ${cardsHtml}
      </div>
    </div>
  `;
}
window.buildSubscriptionPage = buildSubscriptionPage;



// ==========================================
// סיור הדרכה (4 שלבים) — מוצג פעם אחת לגולש חדש, עם "הבא" / "הקודם"
// ==========================================
const SITE_TOUR_KEY = 'site_tour_done_v1';
const SITE_TOUR_STEPS = [
  {
    target: '#header-lang-btn',
    he: { title: 'שינוי שפה', text: 'כאן אפשר להחליף את שפת האתר בין עברית לאנגלית.' },
    en: { title: 'Change language', text: 'Switch the site between Hebrew and English here.' },
    bilingual: true
  },
  {
    target: '#header-history-btn',
    he: { title: 'היסטוריית צפייה', text: 'כל מה שצפיתם בו נשמר כאן, כדי שתוכלו לחזור אליו בקלות.' },
    en: { title: 'Watch history', text: 'Everything you viewed is saved here so you can easily go back to it.' }
  },
  {
    target: '.qu-arrow-btn',
    mobile: true, // במובייל מוצג רק השלב הזה
    he: { title: 'העלאת תוכן', text: 'בוחרים אזור ולוחצים על החץ למעלה כדי להעלות תמונות, קומיקס או סיפורים.' },
    en: { title: 'Upload content', text: 'Pick a section and tap the up arrow to upload photos, comics or stories.' }
  },
  {
    target: '#manager-btn',
    he: { title: 'פתיחת משתמש', text: 'לחצו כאן כדי להתחבר או לפתוח משתמש — וכך לשמור לייקים, לעקוב ולשלוח הודעות.' },
    en: { title: 'Create an account', text: 'Tap here to sign in or create an account to save likes, follow and send messages.' }
  }
];

// ה-body מוגדל ב-zoom במסכים רחבים, והדפדפנים מתנהגים שונה: חלק מחזירים ב-getBoundingClientRect
// ערכים מוגדלים וחלק לא. מודדים בפועל: אלמנט fixed ב-left:100px — איפה הוא נמדד?
// היחס בין השניים הוא מה שצריך לחלק בו כדי שאלמנט fixed יונח בדיוק על היעד.
function siteBodyZoom() {
  try {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:100px;top:0;width:1px;height:1px;visibility:hidden;pointer-events:none;';
    document.body.appendChild(probe);
    const ratio = probe.getBoundingClientRect().left / 100;
    probe.remove();
    return ratio > 0.2 && ratio < 5 ? ratio : 1;
  } catch (e) { return 1; }
}

let __tourIdx = 0;   // אינדקס השלב ב-SITE_TOUR_STEPS (גם המפתח ב-tourConfig)
let __tourPos = 0;   // המיקום ברשימת השלבים הפעילים
let __tourList = []; // השלבים הפעילים: במחשב — כולם, במובייל — רק העלאה

function siteTourIsMobile() {
  try { return window.matchMedia('(max-width: 768px)').matches; } catch (e) { return window.innerWidth <= 768; }
}
function siteTourActiveList() {
  const all = SITE_TOUR_STEPS.map((_, i) => i);
  if (!siteTourIsMobile()) return all;
  const mob = all.filter(i => SITE_TOUR_STEPS[i].mobile);
  return mob.length ? mob : all;
}
let __tourEls = null;
let __tourRaf = 0;

// הגדרות מיקום לכל שלב שהמנהל קבע (website/tourConfig): { selector, dx, dy, dw, dh }
let __tourConfig = {};
let __tourEdit = false;   // מצב עריכה של המנהל
let __tourDraft = null;   // טיוטה בזמן עריכה (לפני שמירה)
let __tourPicking = false;
try {
  onValue(ref(db, 'website/tourConfig'), snap => { __tourConfig = Object.assign({}, snap.val() || {}); }, () => {});
} catch (e) {}

// הכיוון נשמר בנפרד למחשב (מפתחות 0..3) ולמובייל (תחת m), כי המיקומים שונים בין המסכים
function siteTourConfBucket(src, create) {
  if (!src) return null;
  if (!siteTourIsMobile()) return src;
  if (!src.m && create) src.m = {};
  return src.m || null;
}
function siteTourStepConf(idx) {
  const src = __tourEdit && __tourDraft ? __tourDraft : __tourConfig;
  const bucket = siteTourConfBucket(src, false);
  return (bucket && bucket[idx]) || {};
}

// העמוד יכול לזוז אחרי פתיחת הסיור (טעינת תמונות, רינדור מחדש) — מעדכנים מיקום בכל פריים
function siteTourTick() {
  siteTourPosition();
  __tourRaf = requestAnimationFrame(siteTourTick);
}

function siteTourIsVisible(el) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function siteTourFindTarget(step, idx) {
  // קודם — האלמנט שהמנהל בחר לשלב הזה (אם קיים וגלוי)
  const conf = siteTourStepConf(idx === undefined ? __tourIdx : idx);
  if (conf.selector) {
    try {
      const custom = document.querySelector(conf.selector);
      if (siteTourIsVisible(custom)) return custom;
    } catch (e) {}
  }
  const els = Array.from(document.querySelectorAll(step.target));
  const visible = els.filter(el => {
    if (step.match && !step.match.test(el.textContent || '')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  return visible[0] || null;
}

function siteTourEnsureEls() {
  if (__tourEls) return __tourEls;
  const spot = document.createElement('div');
  spot.className = 'site-tour-spot';
  const bubble = document.createElement('div');
  bubble.className = 'site-tour-bubble';
  bubble.setAttribute('role', 'dialog');
  bubble.setAttribute('aria-live', 'polite');
  const blocker = document.createElement('div');
  blocker.className = 'site-tour-blocker';
  document.body.append(blocker, spot, bubble);
  __tourEls = { spot, bubble, blocker };
  window.addEventListener('resize', siteTourPosition);
  window.addEventListener('scroll', siteTourPosition, true);
  return __tourEls;
}

function siteTourRender() {
  const { bubble } = siteTourEnsureEls();
  const step = SITE_TOUR_STEPS[__tourIdx];
  const lang = (typeof getUiLang === 'function') ? getUiLang() : 'he';
  const isEn = lang === 'en';
  const total = __tourList.length;
  const last = __tourPos === total - 1;
  const t = isEn ? step.en : step.he;
  // בשלב השפה מציגים שורה בעברית ושורה באנגלית
  const titleHTML = step.bilingual
    ? `<span dir="rtl">${escHtml(step.he.title)}</span><span dir="ltr">${escHtml(step.en.title)}</span>`
    : escHtml(t.title);
  const textHTML = step.bilingual
    ? `<span dir="rtl">${escHtml(step.he.text)}</span><span dir="ltr">${escHtml(step.en.text)}</span>`
    : escHtml(t.text);
  const L = isEn
    ? { next: 'Next', back: 'Back', done: 'Done', of: 'of', close: 'Close' }
    : { next: 'הבא', back: 'הקודם', done: 'סיום', of: 'מתוך', close: 'סגירה' };

  bubble.setAttribute('dir', isEn ? 'ltr' : 'rtl');
  bubble.innerHTML = `
    <span class="site-tour-arrow"></span>
    <div class="site-tour-head">
      <div class="site-tour-title${step.bilingual ? ' is-bilingual' : ''}">${titleHTML}</div>
      <button type="button" class="site-tour-close" onclick="endSiteTour()" aria-label="${L.close}">✕</button>
    </div>
    <div class="site-tour-text${step.bilingual ? ' is-bilingual' : ''}">${textHTML}</div>
    <div class="site-tour-foot">
      ${total > 1 ? `<span class="site-tour-count">${__tourPos + 1} ${L.of} ${total}</span>` : '<span></span>'}
      <div class="site-tour-actions">
        ${__tourPos > 0 ? `<button type="button" class="site-tour-back" onclick="siteTourGo(-1)">${L.back}</button>` : ''}
        <button type="button" class="site-tour-next" onclick="${last ? 'endSiteTour()' : 'siteTourGo(1)'}">${last ? L.done : L.next}</button>
      </div>
    </div>
    ${__tourEdit ? siteTourEditorHTML() : ''}`;
  const target = siteTourFindTarget(step);
  if (target && target.scrollIntoView) {
    const r = target.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) target.scrollIntoView({ block: 'center' });
  }
  siteTourPosition();
  const nextBtn = bubble.querySelector('.site-tour-next');
  if (nextBtn) nextBtn.focus({ preventScroll: true });
}

function siteTourPosition() {
  if (!__tourEls || __tourEls.bubble.style.display === 'none') return;
  const { spot, bubble, blocker } = __tourEls;
  const step = SITE_TOUR_STEPS[__tourIdx];
  if (!step) return;
  const target = siteTourFindTarget(step);
  const z = siteBodyZoom();
  const gutter = 16;
  const gap = 14;
  const vw = window.innerWidth / z;
  const vh = window.innerHeight / z;
  const bw = Math.min(360, vw - gutter * 2);
  bubble.style.width = bw + 'px';
  const bh = bubble.offsetHeight;
  const arrow = bubble.querySelector('.site-tour-arrow');

  // אין יעד גלוי (למשל במובייל) — מציגים את הבועה במרכז המסך
  blocker.classList.toggle('is-dim', !target);
  if (!target) {
    spot.style.display = 'none';
    bubble.style.left = Math.round((vw - bw) / 2) + 'px';
    bubble.style.top = Math.round((vh - bh) / 2) + 'px';
    if (arrow) arrow.style.display = 'none';
    return;
  }

  const rawZ = target.getBoundingClientRect();
  const raw = { left: rawZ.left / z, top: rawZ.top / z, width: rawZ.width / z, height: rawZ.height / z };
  const conf = siteTourStepConf(__tourIdx);
  const dx = +conf.dx || 0, dy = +conf.dy || 0, dw = +conf.dw || 0, dh = +conf.dh || 0;
  const r = {
    left: raw.left + dx, top: raw.top + dy,
    width: Math.max(8, raw.width + dw), height: Math.max(8, raw.height + dh)
  };
  r.right = r.left + r.width;
  r.bottom = r.top + r.height;
  const pad = 6;
  spot.style.display = 'block';
  spot.style.left = (r.left - pad) + 'px';
  spot.style.top = (r.top - pad) + 'px';
  spot.style.width = (r.width + pad * 2) + 'px';
  spot.style.height = (r.height + pad * 2) + 'px';

  const below = r.bottom + gap + bh <= vh - gutter || r.top - gap - bh < gutter;
  const top = below ? r.bottom + gap : r.top - gap - bh;
  const cx = r.left + r.width / 2;
  const left = Math.max(gutter, Math.min(vw - gutter - bw, cx - bw / 2));
  bubble.style.left = Math.round(left) + 'px';
  bubble.style.top = Math.round(Math.max(gutter, top)) + 'px';
  if (arrow) {
    arrow.style.display = 'block';
    arrow.classList.toggle('is-below', below);
    arrow.style.left = Math.round(Math.max(18, Math.min(bw - 18, cx - left))) + 'px';
  }
}

function siteTourGo(delta) {
  __tourPos = Math.max(0, Math.min(__tourList.length - 1, __tourPos + delta));
  __tourIdx = __tourList[__tourPos];
  siteTourRender();
}
window.siteTourGo = siteTourGo;

function startSiteTour(force, edit) {
  try { if (!force && localStorage.getItem(SITE_TOUR_KEY)) return; } catch (e) {}
  __tourEdit = !!edit && isAdmin();
  __tourDraft = __tourEdit ? JSON.parse(JSON.stringify(Object.assign({}, __tourConfig || {}))) : null;
  // אם סרטוני ההדרכה פתוחים — מחכים שייסגרו
  const ob = document.getElementById('onboarding-modal');
  if (ob && ob.style.display !== 'none') { setTimeout(() => startSiteTour(force), 800); return; }
  // השלב של ההעלאה נמצא בעמוד הבית
  if (!document.querySelector('.qu-arrow-btn') && typeof goToHomePage === 'function') {
    try { goToHomePage(); } catch (e) {}
  }
  const els = siteTourEnsureEls();
  els.bubble.style.display = 'block';
  els.blocker.style.display = 'block';
  __tourList = siteTourActiveList();
  __tourPos = 0;
  __tourIdx = __tourList[0];
  siteTourRender();
  cancelAnimationFrame(__tourRaf);
  __tourRaf = requestAnimationFrame(siteTourTick);
  document.addEventListener('keydown', siteTourKeys);
}
window.startSiteTour = startSiteTour;

function endSiteTour() {
  if (!__tourEdit) { try { localStorage.setItem(SITE_TOUR_KEY, '1'); } catch (e) {} }
  if (__tourPicking) siteTourStopPick();
  __tourEdit = false;
  __tourDraft = null;
  cancelAnimationFrame(__tourRaf);
  if (__tourEls) {
    __tourEls.bubble.style.display = 'none';
    __tourEls.spot.style.display = 'none';
    __tourEls.blocker.style.display = 'none';
  }
  document.removeEventListener('keydown', siteTourKeys);
}
window.endSiteTour = endSiteTour;

function siteTourKeys(e) {
  if (e.key === 'Escape') { if (__tourPicking) siteTourStopPick(); else endSiteTour(); }
}

// ==========================================
// עורך הסיור (מנהל בלבד): בחירת האלמנט שכל שלב מצביע עליו + כיוונון עדין
// ==========================================
function siteTourEditorHTML() {
  const conf = siteTourStepConf(__tourIdx);
  const info = (siteTourIsMobile() ? '📱 מובייל · ' : '💻 מחשב · ') + (conf.selector ? 'אלמנט שנבחר ידנית' : 'ברירת מחדל');
  const off = `הזזה ${conf.dx || 0},${conf.dy || 0} · גודל ${conf.dw || 0},${conf.dh || 0}`;
  const b = (label, fn, title) => `<button type="button" class="site-tour-ed-btn" onclick="${fn}" title="${title || ''}">${label}</button>`;
  return `
    <div class="site-tour-editor" dir="rtl">
      <div class="site-tour-ed-row">
        ${b('🎯 בחירת אלמנט', 'siteTourStartPick()', 'לחצו ואז לחצו על האלמנט באתר')}
        <span class="site-tour-ed-info">${info}<br>${off}</span>
      </div>
      <div class="site-tour-ed-row">
        <span class="site-tour-ed-label">הזזה</span>
        ${b('↑', 'siteTourNudge(0,-4,0,0)', 'למעלה')}
        ${b('↓', 'siteTourNudge(0,4,0,0)', 'למטה')}
        ${b('→', 'siteTourNudge(4,0,0,0)', 'ימינה')}
        ${b('←', 'siteTourNudge(-4,0,0,0)', 'שמאלה')}
      </div>
      <div class="site-tour-ed-row">
        <span class="site-tour-ed-label">גודל</span>
        ${b('רחב +', 'siteTourNudge(0,0,4,0)')}
        ${b('רחב −', 'siteTourNudge(0,0,-4,0)')}
        ${b('גבוה +', 'siteTourNudge(0,0,0,4)')}
        ${b('גבוה −', 'siteTourNudge(0,0,0,-4)')}
      </div>
      <div class="site-tour-ed-row">
        ${b('↺ איפוס שלב', 'siteTourResetStep()')}
        <button type="button" class="site-tour-ed-save" onclick="siteTourSaveConfig()">💾 שמירה לכל השלבים</button>
      </div>
    </div>`;
}

function siteTourUpdateDraft(idx, patch) {
  if (!__tourDraft) __tourDraft = {};
  const bucket = siteTourConfBucket(__tourDraft, true);
  const cur = Object.assign({}, bucket[idx] || {}, patch);
  Object.keys(cur).forEach(k => { if (cur[k] === 0 || cur[k] === '' || cur[k] == null) delete cur[k]; });
  if (Object.keys(cur).length) bucket[idx] = cur; else delete bucket[idx];
}
function siteTourClearDraftStep(idx) {
  const bucket = siteTourConfBucket(__tourDraft, false);
  if (bucket) delete bucket[idx];
}

function siteTourNudge(dx, dy, dw, dh) {
  const c = siteTourStepConf(__tourIdx);
  // בממשק מימין לשמאל, "ימינה" = x חיובי
  siteTourUpdateDraft(__tourIdx, {
    dx: (+c.dx || 0) + dx, dy: (+c.dy || 0) + dy,
    dw: (+c.dw || 0) + dw, dh: (+c.dh || 0) + dh
  });
  siteTourRender();
}
window.siteTourNudge = siteTourNudge;

function siteTourResetStep() {
  siteTourClearDraftStep(__tourIdx);
  siteTourRender();
}
window.siteTourResetStep = siteTourResetStep;

async function siteTourSaveConfig() {
  if (!isAdmin()) { alert('רק מנהל יכול לשמור את הגדרות הסיור'); return; }
  try {
    await set(ref(db, 'website/tourConfig'), __tourDraft && Object.keys(__tourDraft).length ? __tourDraft : null);
    __tourConfig = JSON.parse(JSON.stringify(__tourDraft || {}));
    if (typeof showCopyToast === 'function') showCopyToast('✅ מיקומי הסיור נשמרו');
  } catch (e) {
    console.error('tour config save failed', e);
    alert('שגיאה בשמירת הגדרות הסיור');
  }
}
window.siteTourSaveConfig = siteTourSaveConfig;

// בונה סלקטור יציב ככל האפשר לאלמנט שנבחר
function siteTourCssPath(el) {
  const esc = (v) => (window.CSS && CSS.escape) ? CSS.escape(v) : v;
  if (el.id) return '#' + esc(el.id);
  const parts = [];
  while (el && el.nodeType === 1 && el !== document.body) {
    if (el.id) { parts.unshift('#' + esc(el.id)); break; }
    let part = el.tagName.toLowerCase();
    const cls = Array.from(el.classList)
      .filter(c => !/^(active|liked|is-|show|open|selected|hover|focus)/.test(c))
      .slice(0, 2);
    if (cls.length) part += '.' + cls.map(esc).join('.');
    const parent = el.parentElement;
    if (parent) {
      const same = Array.from(parent.children).filter(c => c.tagName === el.tagName);
      if (same.length > 1) part += `:nth-of-type(${same.indexOf(el) + 1})`;
    }
    parts.unshift(part);
    el = parent;
  }
  return parts.join(' > ');
}

let __tourPickHover = null;
function siteTourPickMove(e) {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || !__tourPickHover) return;
  const r = el.getBoundingClientRect();
  const z = siteBodyZoom();
  Object.assign(__tourPickHover.style, {
    display: 'block', left: r.left / z + 'px', top: r.top / z + 'px', width: r.width / z + 'px', height: r.height / z + 'px'
  });
}
function siteTourPickClick(e) {
  e.preventDefault();
  e.stopPropagation();
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (el) {
    const sel = siteTourCssPath(el);
    // מאפסים הזזות קודמות כשבוחרים אלמנט חדש
    siteTourClearDraftStep(__tourIdx);
    siteTourUpdateDraft(__tourIdx, { selector: sel });
  }
  siteTourStopPick();
}
function siteTourBlock(e) { e.preventDefault(); e.stopPropagation(); }

function siteTourStartPick() {
  if (!__tourEls) return;
  __tourPicking = true;
  __tourEls.bubble.style.display = 'none';
  __tourEls.spot.style.display = 'none';
  __tourEls.blocker.style.display = 'none';
  if (!__tourPickHover) {
    __tourPickHover = document.createElement('div');
    __tourPickHover.className = 'site-tour-pick-hover';
    document.body.appendChild(__tourPickHover);
  }
  let hint = document.getElementById('site-tour-pick-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'site-tour-pick-hint';
    hint.className = 'site-tour-pick-hint';
    hint.textContent = 'לחצו על האלמנט שהשלב יצביע עליו (Esc לביטול)';
    document.body.appendChild(hint);
  }
  hint.style.display = 'block';
  document.body.classList.add('site-tour-picking');
  document.addEventListener('mousemove', siteTourPickMove, true);
  document.addEventListener('click', siteTourPickClick, true);
  ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart'].forEach(t => document.addEventListener(t, siteTourBlock, true));
}
window.siteTourStartPick = siteTourStartPick;

function siteTourStopPick() {
  __tourPicking = false;
  document.removeEventListener('mousemove', siteTourPickMove, true);
  document.removeEventListener('click', siteTourPickClick, true);
  ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart'].forEach(t => document.removeEventListener(t, siteTourBlock, true));
  document.body.classList.remove('site-tour-picking');
  if (__tourPickHover) __tourPickHover.style.display = 'none';
  const hint = document.getElementById('site-tour-pick-hint');
  if (hint) hint.style.display = 'none';
  if (__tourEls) {
    __tourEls.bubble.style.display = 'block';
    __tourEls.blocker.style.display = 'block';
    siteTourRender();
  }
}

function openSiteTourEditor() {
  if (!isAdmin()) { alert('רק מנהל יכול לערוך את סיור ההדרכה'); return; }
  startSiteTour(true, true);
}
window.openSiteTourEditor = openSiteTourEditor;

// מתחילים אחרי אישור שער הגיל (או מיד אם כבר אושר בעבר)
function maybeStartSiteTour() {
  try { if (localStorage.getItem(SITE_TOUR_KEY)) return; } catch (e) {}
  setTimeout(() => startSiteTour(false), 1200);
}
window.maybeStartSiteTour = maybeStartSiteTour;
try {
  if (sessionStorage.getItem('age_verified') === 'true') maybeStartSiteTour();
} catch (e) {}

// ==========================================
// CRM (למנהל בלבד) — בתחתית עמוד המידע
// ריכוז נתוני לקוחות, כרטיס לקוח עם ציר זמן, משפך ושלבי מכירה, משימות ואוטומציות,
// מדדים (נטישה/הקלקות), דוחות וחיזוי מגמות מול יעדים. כל נתוני ה-CRM נשמרים ב-website/crm
// (קריאה/כתיבה למנהל בלבד לפי כללי האבטחה).
// ==========================================
const CRM_DAY = 86400000;
const CRM_STAGES = [
  { id: 'lead', label: 'ליד' },
  { id: 'contact', label: 'בקשר' },
  { id: 'active', label: 'לקוח פעיל' },
  { id: 'vip', label: 'VIP' },
  { id: 'lost', label: 'לא רלוונטי' }
];
const CRM_SEGMENTS = {
  new: { label: 'חדש', color: '#2563eb', bg: '#eff6ff' },
  active: { label: 'פעיל', color: '#15803d', bg: '#f0fdf4' },
  risk: { label: 'בסיכון נטישה', color: '#b45309', bg: '#fffbeb' },
  churned: { label: 'נטש', color: '#b91c1c', bg: '#fef2f2' }
};
const CRM_AUTOMATIONS = [
  { id: 'support', label: 'פנייה בצ׳אט שלא נענתה ← משימה "לענות לפנייה"' },
  { id: 'verification', label: 'בקשת אימות ממתינה ← משימה "לבדוק ולאשר אימות"' },
  { id: 'welcome', label: 'לקוח חדש (3 ימים ראשונים) ← משימה "הודעת ברוכים הבאים"' },
  { id: 'risk', label: 'לקוח בסיכון נטישה ← משימה "פנייה לשימור"' }
];
let CRM_TAB = 'customers';
let CRM = { loaded: false, customers: [], data: {}, filter: { q: '', segment: '', stage: '', tag: '' }, sort: 'lastSeen' };

// נרשם בכל התחברות: שם, אימייל ותאריך הצטרפות (לכרטיס הלקוח). נשמר תחת users/{uid}/meta —
// נגיש רק למשתמש עצמו ולמנהל.
async function crmRecordUserMeta(user) {
  if (!user || user.isAnonymous) return;
  const metaRef = ref(db, `website/users/${user.uid}/meta`);
  const now = Date.now();
  try {
    const snap = await get(metaRef);
    const cur = snap.val() || {};
    const upd = {
      name: (user.displayName || '').slice(0, 80),
      email: (user.email || '').slice(0, 120),
      provider: ((user.providerData && user.providerData[0] && user.providerData[0].providerId) || '').slice(0, 40),
      lastLogin: now,
      logins: (Number(cur.logins) || 0) + 1
    };
    if (!cur.firstSeen) upd.firstSeen = now;
    await update(metaRef, upd);
  } catch (e) {}
}
window.crmRecordUserMeta = crmRecordUserMeta;

function crmFmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
}
function crmAgo(ts) {
  if (!ts) return 'אף פעם';
  const days = Math.floor((Date.now() - ts) / CRM_DAY);
  if (days <= 0) return 'היום';
  if (days === 1) return 'אתמול';
  if (days < 30) return `לפני ${days} ימים`;
  const m = Math.floor(days / 30);
  return m === 1 ? 'לפני חודש' : `לפני ${m} חודשים`;
}
function crmNum(n) { return (Number(n) || 0).toLocaleString('he-IL'); }
function crmPct(a, b) { return b ? Math.round((a / b) * 1000) / 10 : 0; }
function crmMonthKey(ts) { return _analyticsMonthKey(new Date(ts)); }
function crmTs(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && /^\d{10,13}$/.test(v)) return Number(v);
  return 0;
}

// ---------- טעינה ובניית רשימת הלקוחות ----------
async function crmLoadAll() {
  const g = p => get(ref(db, 'website/' + p)).then(s => s.val() || {}).catch(() => ({}));
  const keys = ['users', 'chats', 'user_submissions', 'verification_requests', 'verified_users', 'event_registrations',
    'search_history', 'analytics', 'crm', 'photo_comments', 'story_comments', 'user_follows', 'community_posts',
    'questions', 'offers', 'pending_submissions'];
  const vals = await Promise.all(keys.map(g));
  const d = {};
  keys.forEach((k, i) => { d[k] = vals[i] || {}; });
  d.crm.customers = d.crm.customers || {};
  d.crm.tasks = d.crm.tasks || {};
  d.crm.automation = d.crm.automation || {};
  d.crm.goals = d.crm.goals || {};
  // תכנים מתוך העמודים (גלריות, קומיקס, סיפורים, יד שניה)
  const items = [];
  (Array.isArray(pages) ? pages : []).forEach(p => {
    if (!p || !p.content) return;
    const re = /data-(photos|stories)-json="([^"]*)"/g;
    let m;
    while ((m = re.exec(p.content))) {
      try {
        const arr = JSON.parse(decodeURIComponent(m[2]));
        if (Array.isArray(arr)) arr.forEach(it => { if (it && it.id) items.push(Object.assign({ __kind: m[1] }, it)); });
      } catch (e) {}
    }
  });
  const seen = new Set();
  d.items = items.filter(it => { if (seen.has(it.id)) return false; seen.add(it.id); return true; });
  CRM.data = d;
  CRM.customers = crmBuildCustomers(d);
  CRM.loaded = true;
  await crmRunAutomations();
}

function crmBuildCustomers(d) {
  const map = {};
  const get1 = uid => {
    if (!uid) return null;
    if (!map[uid]) map[uid] = { uid, name: '', email: '', events: [], uploads: 0, comments: 0, supportMsgs: 0, submissions: 0, registrations: 0, searches: 0, follows: 0, followers: 0, likesReceived: 0, viewsReceived: 0, firstSeen: 0, lastSeen: 0 };
    return map[uid];
  };
  const ev = (c, ts, type, text) => { if (c) c.events.push({ ts: crmTs(ts), type, text }); };

  Object.entries(d.users).forEach(([uid, u]) => {
    const c = get1(uid);
    const meta = (u && u.meta) || {};
    const prof = (u && u.profile) || {};
    c.name = meta.name || prof.nickname || '';
    c.email = meta.email || prof.email || '';
    c.telegram = prof.telegram || '';
    c.age = prof.age && prof.age !== '--' ? prof.age : '';
    c.location = prof.location && prof.location !== '--' ? prof.location : '';
    c.lastSeen = crmTs(u && u.last_seen) || crmTs(meta.lastLogin);
    c.firstSeen = crmTs(meta.firstSeen);
    c.logins = meta.logins || 0;
    if (meta.firstSeen) ev(c, meta.firstSeen, 'join', 'הצטרף/ה לאתר');
  });
  Object.entries(d.chats).forEach(([uid, ch]) => {
    const c = get1(uid);
    if (!c.name && ch.userName) c.name = ch.userName;
    if (!c.email && ch.userEmail) c.email = ch.userEmail;
    c.unansweredChat = ch.adminRead === false;
    Object.values(ch.messages || {}).forEach(m => {
      if (m.sender === 'user') c.supportMsgs++;
      ev(c, m.timestamp, 'chat', (m.sender === 'admin' ? 'תשובת מנהל: ' : 'פנייה בצ׳אט: ') + String(m.text || '').slice(0, 140));
    });
  });
  Object.entries(d.verification_requests).forEach(([uid, v]) => {
    const c = get1(uid);
    if (!c.name && v.displayName) c.name = v.displayName;
    if (!c.email && v.email) c.email = v.email;
    c.verificationStatus = v.status || 'pending';
    ev(c, v.timestamp, 'verify', 'בקשת אימות חשבון — ' + ({ pending: 'ממתינה', approved: 'אושרה', rejected: 'נדחתה' }[v.status] || v.status || ''));
  });
  Object.keys(d.verified_users).forEach(uid => { const c = map[uid]; if (c) c.verified = true; });
  Object.values(d.user_submissions).forEach(s => {
    const c = map[s.uid];
    if (!c) return;
    c.submissions++;
    ev(c, s.timestamp, 'submit', 'פנייה בטופס: ' + String(s.text || '').slice(0, 140));
  });
  Object.values(d.event_registrations).forEach(r => {
    const c = map[r.userId];
    if (!c) return;
    c.registrations++;
    c.phone = c.phone || r.userPhone || '';
    ev(c, r.timestamp, 'event', 'נרשם/ה לאירוע: ' + (r.eventTitle || ''));
  });
  const commentLists = [d.photo_comments, d.story_comments];
  commentLists.forEach(src => Object.values(src).forEach(list => Object.values(list || {}).forEach(cm => {
    const c = map[cm.uid];
    if (!c) return;
    c.comments++;
    ev(c, cm.createdAt, 'comment', 'תגובה: ' + String(cm.text || '').slice(0, 120));
  })));
  Object.values(d.community_posts).forEach(p => {
    const c = map[p.authorId];
    if (c) { c.uploads++; ev(c, p.timestamp, 'upload', 'פוסט בקהילה: ' + String(p.title || p.body || '').slice(0, 100)); }
    Object.values(p.comments || {}).forEach(cm => { const cc = map[cm.authorId]; if (cc) { cc.comments++; ev(cc, cm.timestamp, 'comment', 'תגובה בקהילה: ' + String(cm.body || '').slice(0, 120)); } });
  });
  Object.values(d.questions).forEach(q => {
    const c = map[q.authorUid];
    if (c) ev(c, q.createdAt, 'question', 'שאלה: ' + String(q.title || q.text || '').slice(0, 120));
    Object.values(q.answers || {}).forEach(a => { const cc = map[a.uid]; if (cc) { cc.comments++; ev(cc, a.createdAt, 'comment', 'עצה לשאלה: ' + String(a.text || '').slice(0, 120)); } });
  });
  Object.values(d.offers).forEach(o => {
    const c = map[o.authorUid];
    if (c) ev(c, o.createdAt, 'offer', 'פרסם/ה הצעה');
    Object.entries(o.requests || {}).forEach(([ruid, r]) => { const cc = map[ruid]; if (cc) ev(cc, r.createdAt || r.timestamp, 'offer', 'ביקש/ה להצטרף להצעה'); });
  });
  Object.entries(d.user_follows).forEach(([uid, list]) => {
    const c = map[uid];
    const n = Object.keys(list || {}).length;
    if (c) c.follows = n;
    Object.keys(list || {}).forEach(t => { if (map[t]) map[t].followers++; });
  });
  Object.values(d.search_history).forEach(s => {
    // חיפושים נשמרים לפי שם תצוגה בלבד — משייכים לפי שם תואם
    if (!s.registered || !s.user) return;
    const c = Object.values(map).find(x => x.name && x.name === s.user);
    if (c) { c.searches++; ev(c, s.timestamp, 'search', 'חיפש/ה: ' + String(s.query || '').slice(0, 80)); }
  });
  (d.items || []).forEach(it => {
    const c = map[it.authorId];
    if (!c) return;
    c.uploads++;
    c.likesReceived += Number(it.likes) || 0;
    c.viewsReceived += Number(it.views) || 0;
    const kind = it.__kind === 'stories' ? (it.id && /^cm/.test(it.id) ? 'קומיקס' : 'סיפור') : 'גלריה';
    ev(c, it.createdAt || crmTs((it.id || '').replace(/^\D+/, '')), 'upload', `העלה/תה ${kind}: ${String(it.title || '').slice(0, 80)}${it.approved === false ? ' (ממתין לאישור)' : ''}`);
  });
  Object.values(d.pending_submissions).forEach(p => { const c = map[p.authorId]; if (c) c.pendingUploads = (c.pendingUploads || 0) + 1; });

  const now = Date.now();
  return Object.values(map).map(c => {
    c.events.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const evTs = c.events.map(e => e.ts).filter(Boolean);
    if (!c.firstSeen && evTs.length) c.firstSeen = Math.min(...evTs);
    if (!c.lastSeen && evTs.length) c.lastSeen = Math.max(...evTs);
    if (!c.name) c.name = 'משתמש ' + c.uid.slice(0, 6);
    const idle = c.lastSeen ? (now - c.lastSeen) / CRM_DAY : 999;
    c.segment = (c.firstSeen && now - c.firstSeen <= 7 * CRM_DAY) ? 'new' : idle <= 14 ? 'active' : idle <= 30 ? 'risk' : 'churned';
    c.interactions = c.uploads + c.comments + c.supportMsgs + c.submissions + c.registrations;
    // ציון מעורבות 0–100: פעילות אחרונה + כמות אינטראקציות
    const recency = Math.max(0, 50 - Math.min(50, idle * 1.7));
    c.score = Math.round(Math.min(100, recency + Math.min(50, c.interactions * 5 + c.follows * 2 + c.followers * 2)));
    const cr = (CRM.data.crm && CRM.data.crm.customers[c.uid]) || {};
    c.stage = cr.stage || (c.interactions > 0 ? 'active' : 'lead');
    c.tags = Object.keys(cr.tags || {});
    c.notes = Object.entries(cr.notes || {}).map(([id, n]) => Object.assign({ id }, n)).sort((a, b) => (b.at || 0) - (a.at || 0));
    return c;
  });
}

// ---------- אוטומציות (רצות בכל פתיחה של ה-CRM; משימות עם מזהה קבוע כדי לא לשכפל) ----------
async function crmRunAutomations() {
  const auto = CRM.data.crm.automation || {};
  const tasks = CRM.data.crm.tasks;
  const now = Date.now();
  const updates = {};
  const add = (id, c, title, dueDays) => {
    if (tasks[id]) return;
    const t = { uid: c.uid, name: c.name, title, due: now + dueDays * CRM_DAY, done: false, createdAt: now, auto: true };
    tasks[id] = t;
    updates[id] = t;
  };
  CRM.customers.forEach(c => {
    if (auto.support && c.unansweredChat) add('auto_chat_' + c.uid, c, 'לענות לפנייה בצ׳אט', 0);
    if (auto.verification && c.verificationStatus === 'pending') add('auto_verif_' + c.uid, c, 'לבדוק ולאשר בקשת אימות', 1);
    if (auto.welcome && c.firstSeen && now - c.firstSeen <= 3 * CRM_DAY) add('auto_welcome_' + c.uid, c, 'לשלוח הודעת ברוכים הבאים', 1);
    if (auto.risk && c.segment === 'risk') add('auto_risk_' + c.uid + '_' + crmMonthKey(now), c, `פנייה לשימור — לא נכנס/ה ${Math.floor((now - c.lastSeen) / CRM_DAY)} ימים`, 2);
  });
  if (Object.keys(updates).length) {
    try { await update(ref(db, 'website/crm/tasks'), updates); } catch (e) { console.error('crm automation', e); }
  }
}

// ---------- רינדור ----------
function crmSectionHTML() {
  // לא טוענים מחדש בכל רינדור של העמוד — רק אם עברה דקה (או בלחיצה על "רענון")
  setTimeout(() => { crmRefresh(!CRM.loaded || Date.now() - (CRM.loadedAt || 0) > 60000); }, 80);
  const tabBtn = (id, label) => `<button type="button" class="crm-tab${CRM_TAB === id ? ' active' : ''}" data-tab="${id}" onclick="crmTab('${id}')">${label}</button>`;
  return `<section class="crm" id="crm-root" dir="rtl">
    <div class="crm-head">
      <div>
        <h2 class="crm-title">CRM — ניהול לקוחות</h2>
        <div class="crm-sub">כל נתוני הלקוחות, הפניות והפעילות במקום אחד</div>
      </div>
      <div class="crm-head-actions">
        <button type="button" class="crm-btn" onclick="crmRefresh(true)">רענון</button>
        <button type="button" class="crm-btn" onclick="crmExportCSV()">ייצוא ל-Excel (CSV)</button>
      </div>
    </div>
    <nav class="crm-tabs" role="tablist">
      ${tabBtn('customers', 'לקוחות')}
      ${tabBtn('pipeline', 'משפך ומכירות')}
      ${tabBtn('tasks', 'משימות ואוטומציות')}
      ${tabBtn('analytics', 'מדדים ודוחות')}
    </nav>
    <div id="crm-body" class="crm-body"><div class="crm-empty">טוען נתוני לקוחות…</div></div>
  </section>`;
}
window.crmSectionHTML = crmSectionHTML;

async function crmRefresh(force) {
  const body = document.getElementById('crm-body');
  if (!body) return;
  if (!(typeof isAdmin === 'function' && isAdmin())) {
    body.innerHTML = '<div class="crm-empty">ה-CRM זמין רק למנהל מחובר.</div>';
    return;
  }
  if (force || !CRM.loaded) {
    body.innerHTML = '<div class="crm-empty">טוען נתוני לקוחות…</div>';
    try { await crmLoadAll(); CRM.loadedAt = Date.now(); } catch (e) { console.error(e); body.innerHTML = '<div class="crm-empty">שגיאה בטעינת הנתונים.</div>'; return; }
  }
  crmRender();
}
window.crmRefresh = crmRefresh;

function crmTab(tab) {
  CRM_TAB = tab;
  document.querySelectorAll('.crm-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  crmRender();
}
window.crmTab = crmTab;

function crmRender() {
  const body = document.getElementById('crm-body');
  if (!body || !CRM.loaded) return;
  if (CRM_TAB === 'pipeline') body.innerHTML = crmPipelineHTML();
  else if (CRM_TAB === 'tasks') body.innerHTML = crmTasksHTML();
  else if (CRM_TAB === 'analytics') { body.innerHTML = crmAnalyticsHTML(); }
  else body.innerHTML = crmCustomersHTML();
}

function crmSegBadge(seg) {
  const s = CRM_SEGMENTS[seg] || CRM_SEGMENTS.active;
  return `<span class="crm-badge" style="color:${s.color}; background:${s.bg};">${s.label}</span>`;
}
function crmStageLabel(id) { const s = CRM_STAGES.find(x => x.id === id); return s ? s.label : id; }

function crmFilteredCustomers() {
  const f = CRM.filter;
  const q = (f.q || '').trim().toLowerCase();
  let list = CRM.customers.filter(c =>
    (!q || [c.name, c.email, c.telegram, c.location, c.phone].some(v => String(v || '').toLowerCase().includes(q))) &&
    (!f.segment || c.segment === f.segment) &&
    (!f.stage || c.stage === f.stage) &&
    (!f.tag || c.tags.indexOf(f.tag) !== -1));
  const by = CRM.sort;
  list.sort((a, b) => by === 'score' ? b.score - a.score : by === 'joined' ? (b.firstSeen || 0) - (a.firstSeen || 0) : by === 'name' ? a.name.localeCompare(b.name, 'he') : (b.lastSeen || 0) - (a.lastSeen || 0));
  return list;
}

function crmKpiTile(label, value, sub) {
  return `<div class="crm-kpi"><div class="crm-kpi-label">${escHtml(label)}</div><div class="crm-kpi-value">${escHtml(value)}</div>${sub ? `<div class="crm-kpi-sub">${escHtml(sub)}</div>` : ''}</div>`;
}

function crmCustomersHTML() {
  const all = CRM.customers;
  const now = Date.now();
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = all.filter(c => c.firstSeen >= monthStart.getTime()).length;
  const active7 = all.filter(c => c.lastSeen && now - c.lastSeen <= 7 * CRM_DAY).length;
  const risk = all.filter(c => c.segment === 'risk').length;
  const churned = all.filter(c => c.segment === 'churned').length;
  const openTasks = Object.values(CRM.data.crm.tasks).filter(t => !t.done).length;
  const allTags = [...new Set(all.flatMap(c => c.tags))].sort();
  const list = crmFilteredCustomers();
  const f = CRM.filter;
  const opt = (v, l, cur) => `<option value="${escHtml(v)}"${cur === v ? ' selected' : ''}>${escHtml(l)}</option>`;
  const rows = list.map(c => `
    <tr onclick="crmOpenCustomer('${artEsc(c.uid)}')" tabindex="0" onkeydown="if(event.key==='Enter')crmOpenCustomer('${artEsc(c.uid)}')">
      <td><div class="crm-name">${escHtml(c.name)}${c.verified ? ' <span class="crm-verified" title="מאומת">✓</span>' : ''}</div><div class="crm-muted">${escHtml(c.email || c.telegram || '')}</div></td>
      <td>${crmSegBadge(c.segment)}</td>
      <td>${escHtml(crmStageLabel(c.stage))}</td>
      <td title="${escHtml(crmFmtDate(c.lastSeen))}">${escHtml(crmAgo(c.lastSeen))}</td>
      <td class="crm-hide-sm">${escHtml(crmFmtDate(c.firstSeen))}</td>
      <td class="crm-num">${crmNum(c.uploads)}</td>
      <td class="crm-num crm-hide-sm">${crmNum(c.interactions)}</td>
      <td class="crm-num"><span class="crm-score" style="--s:${c.score}">${c.score}</span></td>
      <td class="crm-hide-sm">${c.tags.map(t => `<span class="crm-tag">${escHtml(t)}</span>`).join('')}</td>
    </tr>`).join('');
  return `
    <div class="crm-kpis">
      ${crmKpiTile('לקוחות רשומים', crmNum(all.length))}
      ${crmKpiTile('חדשים החודש', crmNum(newThisMonth))}
      ${crmKpiTile('פעילים ב-7 ימים', crmNum(active7), crmPct(active7, all.length) + '% מהלקוחות')}
      ${crmKpiTile('בסיכון נטישה', crmNum(risk), 'לא נכנסו 14–30 ימים')}
      ${crmKpiTile('נטשו', crmNum(churned), crmPct(churned, all.length) + '% · מעל 30 ימים')}
      ${crmKpiTile('משימות פתוחות', crmNum(openTasks))}
    </div>
    <div class="crm-filters">
      <input type="search" class="crm-input" placeholder="חיפוש לפי שם, אימייל, טלגרם, טלפון…" value="${escHtml(f.q)}" oninput="CRM.filter.q=this.value; crmUpdateTable()" aria-label="חיפוש לקוחות">
      <select class="crm-input" onchange="CRM.filter.segment=this.value; crmUpdateTable()" aria-label="סגמנט">${opt('', 'כל הסגמנטים', f.segment)}${Object.entries(CRM_SEGMENTS).map(([k, s]) => opt(k, s.label, f.segment)).join('')}</select>
      <select class="crm-input" onchange="CRM.filter.stage=this.value; crmUpdateTable()" aria-label="שלב">${opt('', 'כל השלבים', f.stage)}${CRM_STAGES.map(s => opt(s.id, s.label, f.stage)).join('')}</select>
      <select class="crm-input" onchange="CRM.filter.tag=this.value; crmUpdateTable()" aria-label="תגית">${opt('', 'כל התגיות', f.tag)}${allTags.map(t => opt(t, t, f.tag)).join('')}</select>
      <select class="crm-input" onchange="CRM.sort=this.value; crmUpdateTable()" aria-label="מיון">${opt('lastSeen', 'מיון: פעילות אחרונה', CRM.sort)}${opt('joined', 'מיון: הצטרפות', CRM.sort)}${opt('score', 'מיון: מעורבות', CRM.sort)}${opt('name', 'מיון: שם', CRM.sort)}</select>
    </div>
    <div class="crm-count">${crmNum(list.length)} לקוחות</div>
    <div class="crm-table-wrap" id="crm-table-wrap">
      <table class="crm-table">
        <thead><tr><th>לקוח</th><th>סגמנט</th><th>שלב</th><th>פעילות אחרונה</th><th class="crm-hide-sm">הצטרפות</th><th>העלאות</th><th class="crm-hide-sm">אינטראקציות</th><th>מעורבות</th><th class="crm-hide-sm">תגיות</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="9" class="crm-empty">אין לקוחות שתואמים לסינון</td></tr>'}</tbody>
      </table>
    </div>`;
}

let _crmTableTimer = null;
function crmUpdateTable() {
  clearTimeout(_crmTableTimer);
  _crmTableTimer = setTimeout(() => {
    const body = document.getElementById('crm-body');
    if (!body) return;
    const active = document.activeElement;
    const isSearch = active && active.type === 'search';
    const pos = isSearch ? active.selectionStart : null;
    body.innerHTML = crmCustomersHTML();
    if (isSearch) { const inp = body.querySelector('input[type="search"]'); if (inp) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (e) {} } }
  }, 120);
}
window.crmUpdateTable = crmUpdateTable;

// ---------- כרטיס לקוח ----------
function crmOpenCustomer(uid) {
  const c = CRM.customers.find(x => x.uid === uid);
  if (!c) return;
  let m = document.getElementById('crm-modal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'crm-modal';
    m.className = 'crm-modal';
    m.addEventListener('click', e => { if (e.target === m) crmCloseCustomer(); });
    document.body.appendChild(m);
  }
  const tasks = Object.entries(CRM.data.crm.tasks).filter(([, t]) => t.uid === uid).map(([id, t]) => Object.assign({ id }, t)).sort((a, b) => (a.done - b.done) || ((a.due || 0) - (b.due || 0)));
  const evColor = { join: '#2563eb', chat: '#7c3aed', verify: '#0891b2', submit: '#7c3aed', event: '#d97706', comment: '#16a34a', upload: '#e11d48', question: '#d97706', offer: '#e11d48', search: '#64748b' };
  const info = [
    ['אימייל', c.email], ['טלגרם', c.telegram ? '@' + c.telegram.replace(/^@/, '') : ''], ['טלפון', c.phone], ['גיל', c.age], ['מיקום', c.location],
    ['הצטרפות', crmFmtDate(c.firstSeen)], ['פעילות אחרונה', crmAgo(c.lastSeen)], ['כניסות', c.logins ? crmNum(c.logins) : ''],
    ['אימות', c.verified ? 'מאומת ✓' : (c.verificationStatus === 'pending' ? 'ממתין לאישור' : '')]
  ].filter(([, v]) => v);
  const stats = [['העלאות', c.uploads], ['תגובות', c.comments], ['פניות לתמיכה', c.supportMsgs + c.submissions], ['לייקים שקיבל/ה', c.likesReceived], ['עוקבים', c.followers], ['עוקב/ת אחרי', c.follows]];
  m.innerHTML = `
    <div class="crm-card" role="dialog" aria-modal="true" aria-label="כרטיס לקוח" dir="rtl">
      <div class="crm-card-head">
        <div>
          <div class="crm-card-name">${escHtml(c.name)}${c.verified ? ' <span class="crm-verified">✓</span>' : ''}</div>
          <div class="crm-card-badges">${crmSegBadge(c.segment)} <span class="crm-muted">ציון מעורבות ${c.score}/100</span></div>
        </div>
        <button type="button" class="crm-x" onclick="crmCloseCustomer()" aria-label="סגירה">✕</button>
      </div>
      <div class="crm-card-actions">
        <label class="crm-inline">שלב:
          <select class="crm-input" onchange="crmSetStage('${artEsc(uid)}', this.value)">${CRM_STAGES.map(s => `<option value="${s.id}"${c.stage === s.id ? ' selected' : ''}>${s.label}</option>`).join('')}</select>
        </label>
        <button type="button" class="crm-btn" onclick="crmCloseCustomer(); if (typeof dmStartWith==='function') dmStartWith('${artEsc(uid)}','${artEsc(c.name)}')">שליחת הודעה</button>
        ${c.email ? `<a class="crm-btn" href="mailto:${escHtml(encodeURIComponent(c.email).replace(/%40/g, '@'))}">מייל</a>` : ''}
      </div>
      <div class="crm-card-grid">
        <div>
          <h4 class="crm-h4">פרטים</h4>
          <dl class="crm-dl">${info.map(([k, v]) => `<dt>${escHtml(k)}</dt><dd>${escHtml(v)}</dd>`).join('') || '<dd class="crm-muted">אין פרטים</dd>'}</dl>
          <h4 class="crm-h4">פעילות</h4>
          <div class="crm-mini-stats">${stats.map(([k, v]) => `<div><b>${crmNum(v)}</b><span>${escHtml(k)}</span></div>`).join('')}</div>
          <h4 class="crm-h4">תגיות</h4>
          <div class="crm-tags-edit">${c.tags.map(t => `<span class="crm-tag">${escHtml(t)} <button type="button" onclick="crmRemoveTag('${artEsc(uid)}','${artEsc(t)}')" aria-label="הסרת תגית">✕</button></span>`).join('')}
            <input class="crm-input crm-input-sm" placeholder="תגית חדשה + Enter" onkeydown="if(event.key==='Enter'){crmAddTag('${artEsc(uid)}', this.value); this.value='';}">
          </div>
          <h4 class="crm-h4">משימות</h4>
          <div class="crm-task-list">${tasks.map(crmTaskRowHTML).join('') || '<div class="crm-muted">אין משימות</div>'}</div>
          <div class="crm-task-add">
            <input class="crm-input" id="crm-new-task-title" placeholder="משימה חדשה…">
            <input class="crm-input crm-input-sm" id="crm-new-task-due" type="date" aria-label="תאריך יעד">
            <button type="button" class="crm-btn crm-btn-primary" onclick="crmAddTask('${artEsc(uid)}')">הוספה</button>
          </div>
          <h4 class="crm-h4">הערות</h4>
          <div class="crm-note-add">
            <textarea class="crm-input" id="crm-new-note" rows="2" placeholder="הערה פנימית על הלקוח…"></textarea>
            <button type="button" class="crm-btn crm-btn-primary" onclick="crmAddNote('${artEsc(uid)}')">שמירת הערה</button>
          </div>
          <div class="crm-notes">${c.notes.map(n => `<div class="crm-note"><div>${escHtml(n.text)}</div><div class="crm-muted">${escHtml(crmFmtDate(n.at))} <button type="button" class="crm-link" onclick="crmDeleteNote('${artEsc(uid)}','${artEsc(n.id)}')">מחיקה</button></div></div>`).join('')}</div>
        </div>
        <div>
          <h4 class="crm-h4">ציר זמן (${crmNum(c.events.length)})</h4>
          <ol class="crm-timeline">${c.events.slice(0, 80).map(e => `<li><span class="crm-tl-dot" aria-hidden="true" style="background:${evColor[e.type] || '#94a3b8'}"></span><div><div>${escHtml(e.text)}</div><div class="crm-muted">${escHtml(e.ts ? crmFmtDate(e.ts) + ' · ' + crmAgo(e.ts) : '')}</div></div></li>`).join('') || '<li class="crm-muted">אין פעילות מתועדת</li>'}</ol>
        </div>
      </div>
    </div>`;
  m.style.display = 'flex';
  document.addEventListener('keydown', crmModalKeys);
}
window.crmOpenCustomer = crmOpenCustomer;
function crmModalKeys(e) { if (e.key === 'Escape') crmCloseCustomer(); }
function crmCloseCustomer() {
  const m = document.getElementById('crm-modal');
  if (m) m.style.display = 'none';
  document.removeEventListener('keydown', crmModalKeys);
}
window.crmCloseCustomer = crmCloseCustomer;

function crmTaskRowHTML(t) {
  const overdue = !t.done && t.due && t.due < Date.now();
  return `<div class="crm-task${t.done ? ' done' : ''}${overdue ? ' overdue' : ''}">
    <label><input type="checkbox"${t.done ? ' checked' : ''} onchange="crmToggleTask('${artEsc(t.id)}', this.checked)"> <span>${escHtml(t.title)}</span></label>
    <span class="crm-muted">${t.name ? escHtml(t.name) + ' · ' : ''}${t.due ? (overdue ? 'באיחור · ' : 'יעד ') + escHtml(crmFmtDate(t.due)) : ''}${t.auto ? ' · אוטומטי' : ''}</span>
  </div>`;
}

// ---------- פעולות (נשמרות ב-website/crm) ----------
async function crmSave(path, value) {
  try { await set(ref(db, 'website/crm/' + path), value); return true; }
  catch (e) { console.error('crm save', e); alert('שגיאה בשמירה'); return false; }
}
async function crmSetStage(uid, stage) {
  if (await crmSave(`customers/${uid}/stage`, stage)) {
    const cr = CRM.data.crm.customers[uid] = CRM.data.crm.customers[uid] || {};
    cr.stage = stage;
    const c = CRM.customers.find(x => x.uid === uid); if (c) c.stage = stage;
    if (typeof showCopyToast === 'function') showCopyToast('✓ השלב עודכן');
  }
}
async function crmAddTag(uid, tag) {
  tag = String(tag || '').trim().replace(/[.#$\[\]\/]/g, '').slice(0, 30);
  if (!tag) return;
  if (await crmSave(`customers/${uid}/tags/${tag}`, true)) {
    const cr = CRM.data.crm.customers[uid] = CRM.data.crm.customers[uid] || {};
    cr.tags = Object.assign({}, cr.tags, { [tag]: true });
    const c = CRM.customers.find(x => x.uid === uid); if (c && c.tags.indexOf(tag) === -1) c.tags.push(tag);
    crmOpenCustomer(uid);
  }
}
async function crmRemoveTag(uid, tag) {
  if (await crmSave(`customers/${uid}/tags/${tag}`, null)) {
    const cr = CRM.data.crm.customers[uid]; if (cr && cr.tags) delete cr.tags[tag];
    const c = CRM.customers.find(x => x.uid === uid); if (c) c.tags = c.tags.filter(t => t !== tag);
    crmOpenCustomer(uid);
  }
}
async function crmAddNote(uid) {
  const el = document.getElementById('crm-new-note');
  const text = el ? el.value.trim().slice(0, 2000) : '';
  if (!text) return;
  const r = push(ref(db, `website/crm/customers/${uid}/notes`));
  const note = { text, at: Date.now() };
  try { await set(r, note); } catch (e) { alert('שגיאה בשמירת ההערה'); return; }
  const c = CRM.customers.find(x => x.uid === uid); if (c) c.notes.unshift(Object.assign({ id: r.key }, note));
  crmOpenCustomer(uid);
}
async function crmDeleteNote(uid, noteId) {
  if (!confirm('למחוק את ההערה?')) return;
  if (await crmSave(`customers/${uid}/notes/${noteId}`, null)) {
    const c = CRM.customers.find(x => x.uid === uid); if (c) c.notes = c.notes.filter(n => n.id !== noteId);
    crmOpenCustomer(uid);
  }
}
async function crmAddTask(uid) {
  const titleEl = document.getElementById('crm-new-task-title');
  const dueEl = document.getElementById('crm-new-task-due');
  const title = titleEl ? titleEl.value.trim().slice(0, 200) : '';
  if (!title) return;
  const c = CRM.customers.find(x => x.uid === uid);
  const due = dueEl && dueEl.value ? new Date(dueEl.value + 'T18:00').getTime() : 0;
  const r = push(ref(db, 'website/crm/tasks'));
  const t = { uid, name: c ? c.name : '', title, due, done: false, createdAt: Date.now() };
  try { await set(r, t); } catch (e) { alert('שגיאה בשמירת המשימה'); return; }
  CRM.data.crm.tasks[r.key] = t;
  crmOpenCustomer(uid);
}
async function crmToggleTask(id, done) {
  if (await crmSave(`tasks/${id}/done`, !!done)) {
    if (CRM.data.crm.tasks[id]) CRM.data.crm.tasks[id].done = !!done;
    const m = document.getElementById('crm-modal');
    if (m && m.style.display !== 'none') { const t = CRM.data.crm.tasks[id]; if (t) crmOpenCustomer(t.uid); }
    if (CRM_TAB === 'tasks') crmRender();
  }
}
async function crmSetAutomation(id, on) {
  if (await crmSave(`automation/${id}`, !!on)) {
    CRM.data.crm.automation[id] = !!on;
    if (on) { await crmRunAutomations(); }
    crmRender();
  }
}
async function crmSetGoal(key, val) {
  const n = Math.max(0, parseInt(val, 10) || 0);
  if (await crmSave(`goals/${key}`, n || null)) {
    CRM.data.crm.goals[key] = n;
    crmRender();
  }
}
Object.assign(window, { crmSetStage, crmAddTag, crmRemoveTag, crmAddNote, crmDeleteNote, crmAddTask, crmToggleTask, crmSetAutomation, crmSetGoal });

// ---------- משפך ושלבי מכירה ----------
function crmHBar(label, value, max, sub) {
  const w = max ? Math.max(value ? 2 : 0, Math.round((value / max) * 100)) : 0;
  return `<div class="crm-hbar" title="${escHtml(label)}: ${crmNum(value)}${sub ? ' · ' + escHtml(sub) : ''}">
    <div class="crm-hbar-label">${escHtml(label)}</div>
    <div class="crm-hbar-track"><div class="crm-hbar-fill" style="width:${w}%"></div></div>
    <div class="crm-hbar-val"><bdi>${crmNum(value)}</bdi>${sub ? `<span class="crm-hbar-sub">${escHtml(sub)}</span>` : ''}</div>
  </div>`;
}
function crmPipelineHTML() {
  const cs = CRM.customers;
  const ev = (CRM.data.analytics && CRM.data.analytics.events) || {};
  const visitors = Number(ev.visit_session) || Number(CRM.data.analytics && CRM.data.analytics.visits) || 0;
  const registered = cs.length;
  const engaged = cs.filter(c => c.interactions > 0 || c.follows > 0).length;
  const creators = cs.filter(c => c.uploads > 0).length;
  const verified = cs.filter(c => c.verified).length;
  const steps = [['מבקרים באתר', visitors], ['נרשמו', registered], ['פעילים (אינטראקציה)', engaged], ['יוצרי תוכן', creators], ['מאומתים', verified]];
  const max = Math.max(1, ...steps.map(s => s[1]));
  const funnel = steps.map((s, i) => crmHBar(s[0], s[1], max, i ? `(${crmPct(s[1], steps[i - 1][1])}% מהשלב הקודם)` : '')).join('');
  const stageCounts = CRM_STAGES.map(s => [s, cs.filter(c => c.stage === s.id)]);
  const board = stageCounts.map(([s, list]) => `
    <div class="crm-col">
      <div class="crm-col-head"><span>${escHtml(s.label)}</span><span class="crm-col-count">${crmNum(list.length)}</span></div>
      ${list.slice().sort((a, b) => b.score - a.score).slice(0, 12).map(c => `<button type="button" class="crm-col-card" onclick="crmOpenCustomer('${artEsc(c.uid)}')"><b>${escHtml(c.name)}</b><span class="crm-muted">${escHtml(crmAgo(c.lastSeen))} · ${c.score}</span></button>`).join('') || '<div class="crm-muted crm-col-empty">—</div>'}
      ${list.length > 12 ? `<button type="button" class="crm-link" onclick="CRM.filter.stage='${s.id}'; crmTab('customers')">עוד ${list.length - 12}…</button>` : ''}
    </div>`).join('');
  return `
    <div class="crm-panel">
      <h3 class="crm-h3">משפך המרה</h3>
      <div class="crm-muted crm-note-line">מבקר ← נרשם ← פעיל ← יוצר תוכן ← מאומת</div>
      ${funnel}
    </div>
    <div class="crm-panel">
      <h3 class="crm-h3">שלבי מכירה</h3>
      <div class="crm-muted crm-note-line">משנים שלב מתוך כרטיס הלקוח. לקוח בלי שלב שנקבע ידנית מסווג אוטומטית ("ליד" או "לקוח פעיל").</div>
      <div class="crm-board">${board}</div>
    </div>`;
}

// ---------- משימות ואוטומציות ----------
function crmTasksHTML() {
  const all = Object.entries(CRM.data.crm.tasks).map(([id, t]) => Object.assign({ id }, t));
  const open = all.filter(t => !t.done).sort((a, b) => (a.due || 9e15) - (b.due || 9e15));
  const done = all.filter(t => t.done).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 20);
  const overdue = open.filter(t => t.due && t.due < Date.now()).length;
  const auto = CRM.data.crm.automation || {};
  return `
    <div class="crm-panel">
      <h3 class="crm-h3">אוטומציות</h3>
      <div class="crm-muted crm-note-line">כשאוטומציה פעילה, בכל פתיחה של ה-CRM נוצרות משימות אוטומטיות ללקוחות המתאימים (בלי כפילויות).</div>
      ${CRM_AUTOMATIONS.map(a => `<label class="crm-switch"><input type="checkbox"${auto[a.id] ? ' checked' : ''} onchange="crmSetAutomation('${a.id}', this.checked)"> <span>${escHtml(a.label)}</span></label>`).join('')}
    </div>
    <div class="crm-panel">
      <h3 class="crm-h3">משימות פתוחות (${crmNum(open.length)}${overdue ? ` · ${crmNum(overdue)} באיחור` : ''})</h3>
      <div class="crm-task-list">${open.map(t => `<div class="crm-task-wrap">${crmTaskRowHTML(t)}${t.uid ? `<button type="button" class="crm-link" onclick="crmOpenCustomer('${artEsc(t.uid)}')">לכרטיס</button>` : ''}</div>`).join('') || '<div class="crm-muted">אין משימות פתוחות 🎉</div>'}</div>
    </div>
    ${done.length ? `<div class="crm-panel"><h3 class="crm-h3">הושלמו לאחרונה</h3><div class="crm-task-list">${done.map(crmTaskRowHTML).join('')}</div></div>` : ''}`;
}

// ---------- מדדים, דוחות וחיזוי ----------
function crmLastDays(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); out.push(_analyticsDayKey(d)); }
  return out;
}
function crmLastMonths(n) {
  const out = [];
  const d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(_analyticsMonthKey(x)); }
  return out;
}
// רגרסיה ליניארית פשוטה לחיזוי הערך הבא
function crmForecastNext(values) {
  const pts = values.map((v, i) => [i, Number(v) || 0]);
  const n = pts.length;
  if (n < 2) return values[0] || 0;
  const sx = pts.reduce((s, p) => s + p[0], 0), sy = pts.reduce((s, p) => s + p[1], 0);
  const sxx = pts.reduce((s, p) => s + p[0] * p[0], 0), sxy = pts.reduce((s, p) => s + p[0] * p[1], 0);
  const den = n * sxx - sx * sx;
  const slope = den ? (n * sxy - sx * sy) / den : 0;
  const icpt = (sy - slope * sx) / n;
  return Math.max(0, Math.round(icpt + slope * n));
}
// גרף עמודות (סדרה אחת): עמודה אחרונה יכולה להיות "חיזוי" (מקווקו)
function crmBarChart(points, opts) {
  opts = opts || {};
  const max = Math.max(1, ...points.map(p => p.value));
  const maxIdx = points.reduce((bi, p, i) => (p.value > points[bi].value ? i : bi), 0);
  const labelEvery = points.length > 14 ? Math.ceil(points.length / 7) : 1;
  return `<div class="crm-chart" role="img" aria-label="${escHtml(opts.title || '')}">
    <div class="crm-chart-bars">
      ${points.map((p, i) => {
        const h = Math.round((p.value / max) * 100);
        const showVal = i === maxIdx || i === points.length - 1;
        return `<div class="crm-bar-col" tabindex="0" data-tip="${escHtml(p.tip || (p.label + ': ' + crmNum(p.value)))}">
          <div class="crm-bar-val">${showVal ? crmNum(p.value) : ''}</div>
          <div class="crm-bar-area"><div class="crm-bar${p.forecast ? ' is-forecast' : ''}" style="height:${h}%"></div></div>
          <div class="crm-bar-label">${i % labelEvery === 0 || i === points.length - 1 ? escHtml(p.short || p.label) : ''}</div>
        </div>`;
      }).join('')}
    </div>
    ${opts.legend ? `<div class="crm-legend"><span><i class="crm-sw"></i> בפועל</span><span><i class="crm-sw is-forecast"></i> חיזוי</span></div>` : ''}
  </div>`;
}
function crmAnalyticsHTML() {
  const an = CRM.data.analytics || {};
  const daily = an.daily || {}, monthly = an.monthly || {};
  const evDaily = an.events_daily || {};
  const cs = CRM.customers;
  const heMonth = k => { const [y, m] = k.split('-'); return new Date(+y, +m - 1, 1).toLocaleDateString('he-IL', { month: 'short' }); };

  // ביקורים — 30 ימים
  const days = crmLastDays(30);
  const visitsPts = days.map(k => ({ label: k, short: k.slice(8), value: Number(daily[k]) || 0, tip: `${k.split('-').reverse().join('.')}: ${crmNum(daily[k] || 0)} כניסות` }));

  // חודשים — כניסות + חיזוי לחודש הבא
  const months = crmLastMonths(6);
  const mVals = months.map(k => Number(monthly[k]) || 0);
  const nowD = new Date();
  const daysInMonth = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 0).getDate();
  const thisMonth = mVals[mVals.length - 1];
  const paceThisMonth = Math.round(thisMonth / Math.max(1, nowD.getDate()) * daysInMonth);
  const fcVisits = crmForecastNext(mVals.slice(0, -1).concat([paceThisMonth]));
  const nextKey = _analyticsMonthKey(new Date(nowD.getFullYear(), nowD.getMonth() + 1, 1));
  const monthPts = months.map((k, i) => ({ label: heMonth(k), value: mVals[i], tip: `${heMonth(k)}: ${crmNum(mVals[i])} כניסות${i === months.length - 1 ? ` (קצב צפוי לסוף החודש: ${crmNum(paceThisMonth)})` : ''}` }))
    .concat([{ label: heMonth(nextKey), value: fcVisits, forecast: true, tip: `חיזוי ${heMonth(nextKey)}: כ-${crmNum(fcVisits)} כניסות` }]);

  // לקוחות חדשים לפי חודש + חיזוי
  const newBy = {};
  cs.forEach(c => { if (c.firstSeen) { const k = crmMonthKey(c.firstSeen); newBy[k] = (newBy[k] || 0) + 1; } });
  const nVals = months.map(k => newBy[k] || 0);
  const paceNew = Math.round(nVals[nVals.length - 1] / Math.max(1, nowD.getDate()) * daysInMonth);
  const fcNew = crmForecastNext(nVals.slice(0, -1).concat([paceNew]));
  const newPts = months.map((k, i) => ({ label: heMonth(k), value: nVals[i], tip: `${heMonth(k)}: ${crmNum(nVals[i])} לקוחות חדשים` }))
    .concat([{ label: heMonth(nextKey), value: fcNew, forecast: true, tip: `חיזוי ${heMonth(nextKey)}: כ-${crmNum(fcNew)} לקוחות חדשים` }]);

  // העלאות תוכן לפי חודש
  const upBy = {};
  (CRM.data.items || []).forEach(it => { const ts = it.createdAt || crmTs((it.id || '').replace(/^\D+/, '')); if (ts) { const k = crmMonthKey(ts); upBy[k] = (upBy[k] || 0) + 1; } });
  const uVals = months.map(k => upBy[k] || 0);
  const paceUp = Math.round(uVals[uVals.length - 1] / Math.max(1, nowD.getDate()) * daysInMonth);

  // נטישה והקלקות (30 ימים)
  let sessions = 0, engagedV = 0;
  const clicksBy = {};
  days.forEach(k => {
    const e = evDaily[k] || {};
    sessions += Number(e.visit_session) || 0;
    engagedV += Number(e.engaged_visit) || 0;
    TRACK_EVENTS.forEach(n => { clicksBy[n] = (clicksBy[n] || 0) + (Number(e[n]) || 0); });
  });
  const bounce = sessions ? Math.max(0, 100 - crmPct(engagedV, sessions)) : null;
  const totalClicks = Object.values(clicksBy).reduce((a, b) => a + b, 0);
  const evLabels = { gallery_open: 'פתיחת גלריה', story_open: 'פתיחת סיפור/קומיקס', like: 'לייק', save: 'שמירה', comment: 'תגובה', search: 'חיפוש', dm_send: 'הודעה פרטית', upload_submit: 'העלאת תוכן', subscribe_click: 'לחיצה על מנוי' };
  const clickRows = Object.entries(clicksBy).sort((a, b) => b[1] - a[1]);
  const clickMax = Math.max(1, ...clickRows.map(r => r[1]));

  // נטישת לקוחות (churn)
  const churned = cs.filter(c => c.segment === 'churned').length;
  const churnRate = crmPct(churned, cs.length);
  const conv = crmPct(cs.length, Number((an.events || {}).visit_session) || Number(an.visits) || 0);

  // חיפושים מובילים
  const qCount = {};
  Object.values(CRM.data.search_history || {}).forEach(s => { const q = String(s.query || '').trim().toLowerCase(); if (q) qCount[q] = (qCount[q] || 0) + 1; });
  const topQ = Object.entries(qCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
  // תכנים מובילים
  const topItems = (CRM.data.items || []).slice().sort((a, b) => ((b.views || 0) + (b.likes || 0) * 3) - ((a.views || 0) + (a.likes || 0) * 3)).slice(0, 6);

  // יעדים
  const goals = CRM.data.crm.goals || {};
  const goalRow = (key, label, current, forecast) => {
    const goal = Number(goals[key]) || 0;
    const pct = goal ? Math.min(100, Math.round((current / goal) * 100)) : 0;
    const willHit = goal ? forecast >= goal : null;
    return `<div class="crm-goal">
      <div class="crm-goal-top"><b>${escHtml(label)}</b>
        <label class="crm-inline">יעד חודשי: <input type="number" min="0" class="crm-input crm-input-sm" value="${goal || ''}" placeholder="—" onchange="crmSetGoal('${key}', this.value)"></label></div>
      <div class="crm-hbar-track" title="${crmNum(current)} מתוך ${goal ? crmNum(goal) : '—'}"><div class="crm-hbar-fill" style="width:${pct}%"></div></div>
      <div class="crm-muted">עד עכשיו החודש: ${crmNum(current)} · צפי לסוף החודש: ${crmNum(forecast)}${goal ? ` · ${willHit ? '✓ צפוי לעמוד ביעד' : '⚠ צפוי לא לעמוד ביעד'}` : ''}</div>
    </div>`;
  };

  return `
    <div class="crm-kpis">
      ${crmKpiTile('כניסות החודש', crmNum(thisMonth), `צפי לסוף החודש: ${crmNum(paceThisMonth)}`)}
      ${crmKpiTile('אחוז נטישה (ביקורים)', bounce === null ? '—' : bounce + '%', bounce === null ? 'יימדד מעכשיו' : 'ביקורים בלי אף פעולה · 30 ימים')}
      ${crmKpiTile('הקלקות ב-30 ימים', crmNum(totalClicks), sessions ? `${(totalClicks / sessions).toFixed(1)} לביקור` : '')}
      ${crmKpiTile('נטישת לקוחות', churnRate + '%', 'לא נכנסו מעל 30 ימים')}
      ${crmKpiTile('המרה מבקר ← נרשם', conv + '%')}
      ${crmKpiTile('חיזוי כניסות לחודש הבא', crmNum(fcVisits))}
    </div>
    <div class="crm-panel">
      <h3 class="crm-h3">כניסות — 30 הימים האחרונים</h3>
      ${crmBarChart(visitsPts, { title: 'כניסות ב-30 הימים האחרונים' })}
    </div>
    <div class="crm-grid-2">
      <div class="crm-panel">
        <h3 class="crm-h3">כניסות לפי חודש + חיזוי</h3>
        ${crmBarChart(monthPts, { title: 'כניסות לפי חודש', legend: true })}
      </div>
      <div class="crm-panel">
        <h3 class="crm-h3">לקוחות חדשים לפי חודש + חיזוי</h3>
        ${crmBarChart(newPts, { title: 'לקוחות חדשים לפי חודש', legend: true })}
      </div>
    </div>
    <div class="crm-panel">
      <h3 class="crm-h3">יעדים וצפי</h3>
      ${goalRow('visits', 'כניסות', thisMonth, paceThisMonth)}
      ${goalRow('newCustomers', 'לקוחות חדשים', nVals[nVals.length - 1], paceNew)}
      ${goalRow('uploads', 'העלאות תוכן', uVals[uVals.length - 1], paceUp)}
    </div>
    <div class="crm-grid-2">
      <div class="crm-panel">
        <h3 class="crm-h3">הקלקות לפי פעולה (30 ימים)</h3>
        ${clickRows.some(r => r[1]) ? clickRows.map(([k, v]) => crmHBar(evLabels[k] || k, v, clickMax, '')).join('') : '<div class="crm-muted">הנתונים נאספים מעכשיו — יופיעו כאן אחרי שגולשים ישתמשו באתר.</div>'}
      </div>
      <div class="crm-panel">
        <h3 class="crm-h3">חיפושים מובילים</h3>
        ${topQ.length ? `<table class="crm-table crm-table-sm"><tbody>${topQ.map(([q, n]) => `<tr><td>${escHtml(q)}</td><td class="crm-num">${crmNum(n)}</td></tr>`).join('')}</tbody></table>` : '<div class="crm-muted">אין חיפושים עדיין</div>'}
      </div>
    </div>
    <div class="crm-panel">
      <h3 class="crm-h3">תכנים מובילים</h3>
      ${topItems.length ? `<table class="crm-table crm-table-sm"><thead><tr><th>תוכן</th><th>מאת</th><th>צפיות</th><th>לייקים</th></tr></thead><tbody>${topItems.map(it => `<tr><td>${escHtml(it.title || '—')}</td><td>${escHtml(it.author || '')}</td><td class="crm-num">${crmNum(it.views)}</td><td class="crm-num">${crmNum(it.likes)}</td></tr>`).join('')}</tbody></table>` : '<div class="crm-muted">אין תכנים</div>'}
    </div>`;
}

// טולטיפ לגרפים (ריחוף/פוקוס)
(function () {
  let tip = null;
  const show = (el) => {
    const text = el.getAttribute('data-tip');
    if (!text) return;
    if (!tip) { tip = document.createElement('div'); tip.className = 'crm-tip'; document.body.appendChild(tip); }
    tip.textContent = text;
    tip.style.display = 'block';
    const r = el.getBoundingClientRect();
    const z = (typeof siteBodyZoom === 'function') ? siteBodyZoom() : 1;
    const w = tip.offsetWidth;
    tip.style.left = Math.max(8, Math.min(window.innerWidth / z - w - 8, (r.left + r.width / 2) / z - w / 2)) + 'px';
    tip.style.top = Math.max(8, r.top / z - tip.offsetHeight - 8) + 'px';
  };
  const hide = () => { if (tip) tip.style.display = 'none'; };
  document.addEventListener('mouseover', e => { const el = e.target.closest && e.target.closest('.crm-bar-col'); if (el) show(el); else hide(); });
  document.addEventListener('focusin', e => { const el = e.target.closest && e.target.closest('.crm-bar-col'); if (el) show(el); });
  document.addEventListener('focusout', hide);
  document.addEventListener('scroll', hide, true);
})();

// ייצוא לקוחות ל-CSV (נפתח ב-Excel)
function crmExportCSV() {
  if (!CRM.loaded) return;
  const head = ['שם', 'אימייל', 'טלגרם', 'טלפון', 'גיל', 'מיקום', 'סגמנט', 'שלב', 'הצטרפות', 'פעילות אחרונה', 'העלאות', 'תגובות', 'פניות', 'עוקבים', 'ציון מעורבות', 'תגיות'];
  const cell = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const rows = crmFilteredCustomers().map(c => [c.name, c.email, c.telegram, c.phone, c.age, c.location, (CRM_SEGMENTS[c.segment] || {}).label, crmStageLabel(c.stage),
    crmFmtDate(c.firstSeen), crmFmtDate(c.lastSeen), c.uploads, c.comments, c.supportMsgs + c.submissions, c.followers, c.score, c.tags.join(' | ')].map(cell).join(','));
  const csv = '﻿' + [head.join(',')].concat(rows).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'crm-customers-' + _analyticsDayKey() + '.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
window.crmExportCSV = crmExportCSV;
window.CRM = CRM;
window.crmBuildCustomers = crmBuildCustomers; // לבדיקה/דיבוג — בונה רשימה מנתונים שמועברים אליה בלבד
