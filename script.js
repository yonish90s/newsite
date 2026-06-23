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
 */

// --- אתחול Firebase Auth & Firestore ---
const firebaseConfig = {
  apiKey: "AIzaSyCpVZS9qEnpPz-gyu12yD3FLiu3Lf-Tg04",
  authDomain: "newsite-f76e2.firebaseapp.com",
  databaseURL: "https://newsite-f76e2-default-rtdb.firebaseio.com",
  projectId: "newsite-f76e2",
  storageBucket: "newsite-f76e2.firebasestorage.app",
  messagingSenderId: "484000020563",
  appId: "1:484000020563:web:d1a6f7c80419a6173d6ea6",
  measurementId: "G-VH9TFF4TQT"
};

// אתחול Firebase רק אם הוא לא מאותחל כבר וקיים בדף
let db;
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();
}

// --- שלב 1: הגדרות בסיס ומצב התחלתי (State) ---

// נגדיר את רשימת העמודים ההתחלתית שלנו (ברירת המחדל למקרה שאין כלום בזיכרון)
const defaultPages = [
  {
    id: 'page-main',
    title: '🏠 ראשי',
    content: ''
  },
  {
    id: 'page-shop',
    title: '🛍️ חנות',
    content: ''
  },
  {
    id: 'page-charts',
    title: '📈 גרפים ונתשדשונים',
    content: ''
  },
  {
    id: 'page-forum',
    title: '💬 פורום',
    content: ''
  }
];

// הגדרות ברירת מחדל (יוחלפו אם יש שמירה)
let pages = defaultPages;
let activePageId = 'page-main';
let topNavPages = ['page-main', 'page-shop', 'page-charts', 'page-forum']; // העמודים שמופיעים בתפריט העליון
let isEditMode = false;
let undoStack = []; // מערך לשמירת היסטוריית שינויים לצורך ביטול (Undo)
let siteBackgrounds = { dashboard: null, topNav: null, main: null };

// --- מערכות דינמיות ---
// פונקציה ליישום הרקעים למסך
function applyBackgrounds() {
  const dash = document.querySelector('.side-dashboard');
  const top = document.querySelector('.top-bar');
  const mainWrapper = document.getElementById('mainContent');
  
  if (siteBackgrounds.dashboard) {
    dash.style.backgroundImage = `url(${siteBackgrounds.dashboard})`;
    dash.style.backgroundSize = 'cover';
    dash.style.backgroundPosition = 'center';
  } else {
    dash.style.backgroundImage = '';
  }
  
  if (siteBackgrounds.topNav) {
    top.style.backgroundImage = `url(${siteBackgrounds.topNav})`;
    top.style.backgroundSize = 'cover';
    top.style.backgroundPosition = 'center';
  } else {
    top.style.backgroundImage = '';
  }
  
  if (siteBackgrounds.main) {
    mainWrapper.style.backgroundImage = `url(${siteBackgrounds.main})`;
    mainWrapper.style.backgroundSize = 'cover';
    mainWrapper.style.backgroundPosition = 'center';
    mainWrapper.style.backgroundColor = 'transparent';
  } else {
    mainWrapper.style.backgroundImage = '';
    mainWrapper.style.backgroundColor = '';
  }
}

// פונקציית אתחול אסינכרונית - טוענת מהענן של Firebase (ומגבה מ-localForage במידת הצורך)
async function initSite() {
  try {
    if (db) {
      const doc = await db.collection("site").doc("config").get();
      if (doc.exists) {
        const data = doc.data();
        if (data.pages) pages = data.pages;
        if (data.activePageId) activePageId = data.activePageId;
        if (data.topNavPages) topNavPages = data.topNavPages;
        if (data.topNavHTML) {
          navLinksContainer.innerHTML = data.topNavHTML;
          // מחיקת 4 קישורי ברירת מחדל כדי שלא יופיעו במובייל אם לא נמחקו ידנית
          const unwantedTitles = ["גרפים ונתונים", "פורום", "שירותים", "הזמנת פגישה", "📈 גרפים ונתונים", "💬 פורום"];
          navLinksContainer.querySelectorAll('a').forEach(a => {
            const linkText = (a.childNodes[0]?.nodeValue || a.textContent).replace('⌄', '').trim();
            if (unwantedTitles.includes(linkText)) {
              a.remove();
            }
          });
        }
        if (data.siteBackgrounds) {
          siteBackgrounds = data.siteBackgrounds;
          applyBackgrounds();
        }
        if (data.logo) {
          const mainLogo = document.getElementById('main-logo');
          const loaderImg = document.getElementById('loader-img');
          const favicon = document.getElementById('favicon');
          if (mainLogo) mainLogo.src = data.logo;
          if (loaderImg) loaderImg.src = data.logo;
          if (favicon) favicon.href = data.logo;
        }
        if (data.logoText) {
          const logoTextEl = document.getElementById('main-logo-text');
          if (logoTextEl) logoTextEl.textContent = data.logoText;
        }
        console.log("הנתונים נטענו בהצלחה מהענן!");
        
        // סינון עמודי דוגמה גם מהענן (ליתר ביטחון)
        const demoPageIds = ['page-articles-example', 'page-forum-example', 'page-store-example'];
        pages = pages.filter(p => !demoPageIds.includes(p.id));
        topNavPages = topNavPages.filter(id => !demoPageIds.includes(id));
        
        // מחיקה חד פעמית של 4 העמודים שנוצרו אוטומטית (כדי שלא יופיעו במובייל או במחשב אם לא רוצים אותם)
        const unwantedTitles = ["גרפים ונתונים", "פורום", "שירותים", "הזמנת פגישה", "📈 גרפים ונתונים", "💬 פורום"];
        const pagesToRemove = pages.filter(p => unwantedTitles.includes(p.title.trim()));
        if (pagesToRemove.length > 0) {
          const idsToRemove = pagesToRemove.map(p => p.id);
          pages = pages.filter(p => !idsToRemove.includes(p.id));
          topNavPages = topNavPages.filter(id => !idsToRemove.includes(id));
          // שומרים מיד את העדכון לענן
          db.collection("site").doc("config").set({ pages: pages, topNavPages: topNavPages }, { merge: true });
        }
        
        return; // סיימנו לטעון מהענן
      }
    }
  } catch(e) {
    console.error("שגיאה בטעינה מהענן, מנסה לטעון מהזיכרון המקומי:", e);
  }

  // --- גיבוי: משיכה מ-localForage אם הענן ריק ---
  console.log("אין מידע שמור בענן, טוען נתונים מהדפדפן (ומגבה לענן)");
  try {
    const savedActive = await localforage.getItem('myActivePage_v3');
    if (savedActive) activePageId = savedActive;
    
    const savedLogo = await localforage.getItem('mySiteLogo_v3');
    const savedLogoText = await localforage.getItem('mySiteLogoText_v3');
    
    if (savedLogo) {
      const mainLogo = document.getElementById('main-logo');
      const loaderImg = document.getElementById('loader-img');
      const favicon = document.getElementById('favicon');
      if (mainLogo) mainLogo.src = savedLogo;
      if (loaderImg) loaderImg.src = savedLogo;
      if (favicon) favicon.href = savedLogo;
      if (db) db.collection("site").doc("config").set({ logo: savedLogo }, { merge: true });
    }
    
    if (savedLogoText) {
      const logoTextEl = document.getElementById('main-logo-text');
      if (logoTextEl) logoTextEl.textContent = savedLogoText;
      if (db) db.collection("site").doc("config").set({ logoText: savedLogoText }, { merge: true });
    }
    
    const savedTopNav = await localforage.getItem('mySiteTopNav_v3');
    if (savedTopNav) {
      const demoPageIds = ['page-articles-example', 'page-forum-example', 'page-store-example'];
      topNavPages = savedTopNav.filter(id => !demoPageIds.includes(id));
    }

    const savedTopNavHTML = await localforage.getItem('mySiteTopNavHTML_v3');
    if (savedTopNavHTML) {
      navLinksContainer.innerHTML = savedTopNavHTML;
      // מחיקת 4 קישורי ברירת מחדל כדי שלא יופיעו במובייל
      const unwantedTitles = ["גרפים ונתונים", "פורום", "שירותים", "הזמנת פגישה", "📈 גרפים ונתונים", "💬 פורום"];
      navLinksContainer.querySelectorAll('a').forEach(a => {
        const linkText = (a.childNodes[0]?.nodeValue || a.textContent).replace('⌄', '').trim();
        if (unwantedTitles.includes(linkText)) {
          a.remove();
        }
      });
      navLinksContainer.querySelectorAll('.top-nav-controls').forEach(el => el.remove());
      const addBtn = document.getElementById('add-nav-link-btn');
      if (addBtn) addBtn.remove();
    }

    const savedPages = await localforage.getItem('mySitePages_v3');
    if (savedPages) {
      pages = savedPages;
    }
    
    const demoPageIds = ['page-articles-example', 'page-forum-example', 'page-store-example'];
    pages = pages.filter(p => !demoPageIds.includes(p.id));
    
    const savedBackgrounds = await localforage.getItem('mySiteBackgrounds_v3');
    if (savedBackgrounds) {
      siteBackgrounds = savedBackgrounds;
      applyBackgrounds();
    }
    
    // שמירה לענן כדי לגבות את הנתונים
    saveToStorage();
  } catch(e) {
    console.error('Error loading data from fallback', e);
  }
  
  // תיקון אוטומטי (Migration) לקישורים מתים בתפריט העליון
  const allNavLinks = navLinksContainer.querySelectorAll('a');
  let madeChanges = false;
  allNavLinks.forEach(a => {
    // בדיקה האם הקישור מת (אין לו מזהה עמוד שקיים במערכת)
    let isDead = false;
    if (a.dataset.pageId) {
      if (!pages.find(p => p.id === a.dataset.pageId)) isDead = true;
    } else if (a.id && topNavMapping[a.id]) {
      if (!pages.find(p => p.id === topNavMapping[a.id])) isDead = true;
    } else {
      isDead = true;
    }

    if (isDead) {
      // מנסים למצוא עמוד עם שם זהה לטקסט של הקישור
      const linkText = (a.childNodes[0]?.nodeValue || a.textContent).replace('⌄', '').trim();
      const matchingPage = pages.find(p => p.title.trim() === linkText);
      
      if (matchingPage) {
        // חיבור אוטומטי לעמוד הקיים
        a.dataset.pageId = matchingPage.id;
        if (!topNavPages.includes(matchingPage.id)) {
          topNavPages.push(matchingPage.id);
        }
        madeChanges = true;
      } else if (linkText) {
        // אם אין עמוד כזה, נייצר אחד כדי שהקישור לא יהיה שבור
        const newPageId = 'page-' + Date.now() + Math.floor(Math.random() * 1000);
        pages.push({
          id: newPageId,
          title: linkText,
          content: ''
        });
        a.dataset.pageId = newPageId;
        topNavPages.push(newPageId);
        madeChanges = true;
      }
    }
  });

  if (madeChanges) {
    saveToStorage();
  }

  // שורת החיפוש העליונה - הרחבה בלחיצה
  const searchTopIcon = document.getElementById('search-top-icon');
  const searchTopInput = document.getElementById('search-top-input');
  if (searchTopIcon && searchTopInput) {
    searchTopIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      searchTopInput.classList.toggle('expanded');
      if (searchTopInput.classList.contains('expanded')) {
        searchTopInput.focus();
      }
    });
    // סגירה בלחיצה בחוץ
    document.addEventListener('click', (e) => {
      if (!searchTopInput.contains(e.target) && e.target !== searchTopIcon) {
        searchTopInput.classList.remove('expanded');
      }
    });
  }

  // אחרי שהכל נטען (ואולי תוקן), נצייר את האתר
  renderSideMenu();
  renderPage();
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
const navLinksContainer = document.querySelector('.nav-links'); // התפריט העליון
const megaMenuContainer = document.createElement('div'); // הקונטיינר של מגה-תפריט
megaMenuContainer.className = 'mega-menu-panel';
document.body.appendChild(megaMenuContainer);

// טיפול בלוגו ובטקסט הלוגו
const mainLogo = document.getElementById('main-logo');
const mainLogoText = document.getElementById('main-logo-text');

if (mainLogo) {
  mainLogo.addEventListener('click', function() {
    if (!isEditMode) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = event => {
          const dataUrl = event.target.result;
          this.src = dataUrl;
          
          const loaderImg = document.getElementById('loader-img');
          const favicon = document.getElementById('favicon');
          if (loaderImg) loaderImg.src = dataUrl;
          if (favicon) favicon.href = dataUrl;
          
          if (db) {
            db.collection("site").doc("config").set({ logo: dataUrl }, { merge: true })
              .then(() => console.log("הלוגו נשמר בענן!"))
              .catch(err => console.error("שגיאה בשמירת לוגו לענן", err));
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  });
}

if (mainLogoText) {
  mainLogoText.addEventListener('blur', () => {
    if (isEditMode) {
      if (db) {
        db.collection("site").doc("config").set({ logoText: mainLogoText.textContent }, { merge: true });
      }
    }
  });
}

// מנגנון פתיחה וסגירה של התפריט במובייל
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener('click', () => {
    navLinksContainer.classList.toggle('mobile-open');
    sideMenuContainer.classList.toggle('mobile-open');
  });
}

// סגירת התפריט בלחיצה על קישור במובייל
navLinksContainer.addEventListener('click', (e) => {
  if (window.innerWidth <= 900 && e.target.tagName === 'A') {
    navLinksContainer.classList.remove('mobile-open');
    sideMenuContainer.classList.remove('mobile-open');
  }
});

// התאמת חווית עריכה למובייל בזמן אמת בשינוי גודל מסך
window.addEventListener('resize', () => {
  if (isEditMode) {
    const isMobile = window.innerWidth <= 900;
    interact('.draggable-resizable').draggable({ enabled: !isMobile }).resizable({ enabled: !isMobile });
  }
});

// --- שלב 3: פונקציות ליבה (Rendering & Logic) ---

// פונקציה לשמירת הנתונים לענן (Firebase)
function saveToStorage() {
  const tempNav = navLinksContainer.cloneNode(true);
  tempNav.querySelectorAll('.top-nav-controls').forEach(el => el.remove());
  const addBtn = tempNav.querySelector('#add-nav-link-btn');
  if (addBtn) addBtn.remove();
  
  if (db) {
    db.collection("site").doc("config").set({
      pages: pages,
      activePageId: activePageId,
      topNavPages: topNavPages,
      topNavHTML: tempNav.innerHTML,
      siteBackgrounds: siteBackgrounds
    }, { merge: true })
    .then(() => console.log("הנתונים נשמרו בהצלחה בענן!"))
    .catch((error) => console.error("שגיאה בשמירה:", error));
  }
  
  // הוספה למערך ההיסטוריה עבור פעולת Undo (שומרים את 20 הפעולות האחרונות)
  undoStack.push(JSON.stringify({ pages, topNavPages }));
  if (undoStack.length > 20) {
    undoStack.shift(); // מוחק את הישן ביותר כדי לא לפוצץ את זיכרון הראם
  }
}

// פונקציה שמייצרת את תפריט הצד (מייצרת את שורות ה-HTML של הלינקים לפי מערך העמודים)
function renderSideMenu() {
  sideMenuContainer.innerHTML = ''; // מנקים את התפריט הישן
  
  const btnAddPage = document.getElementById('btn-add-page');
  if (btnAddPage) {
    btnAddPage.style.display = isEditMode ? 'block' : 'none';
  }
  
  pages.forEach(page => {
    // עמודים נסתרי-מנהל (adminOnly) לא מופיעים בתפריט בכלל
    if (page.adminOnly) return;

    // אם העמוד מוסתר – לא מציגים אותו בכלל (גם לא במצב עריכה)
    if (page.isHidden) return;
    
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
      hideBtn.textContent = page.isHidden ? '👁️' : '🙈';
      hideBtn.style.cursor = 'pointer';
      hideBtn.title = page.isHidden ? 'הצג עמוד' : 'הסתר עמוד ממבקרים';
      hideBtn.onclick = (e) => {
        e.stopPropagation();
        page.isHidden = !page.isHidden;
        saveToStorage();
        renderSideMenu();
      };
      
      // כפתור מחיקה
      const deleteBtn = document.createElement('span');
      deleteBtn.textContent = '🗑️';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.title = 'מחק עמוד';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        if (pages.length === 1) {
          console.log('אי אפשר למחוק את העמוד האחרון באתר!');
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
  navLinksContainer.innerHTML = ''; // מנקה את התפריט הסטטי מה-HTML
  
  topNavPages.forEach(pageId => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return; // במקרה שהעמוד נמחק
    if (page.adminOnly) return; // עמודים נסתרי-מנהל לא מופיעים בתפריט העליון
    if (!isEditMode && page.isHidden) return; // מסתיר עמודים מוסתרים גם למעלה
    
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = page.title;
    a.dataset.pageId = pageId; // שמירת המזהה כדי שנוכל למחוק אותו מהמערך בעריכה
    
    // סימון עמוד פעיל למעלה
    if (pageId === activePageId) {
      a.classList.add('active-top-nav');
    }
    
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (isEditMode) saveCurrentPageContent();
      activePageId = page.id;
      saveToStorage();
      renderSideMenu();
      renderTopNav();
      renderPage();
    });
    
    // מגה-תפריט מופיע בעת מעבר עכבר
    let hoverTimeout;
    a.addEventListener('mouseenter', () => {
      clearTimeout(hoverTimeout);
      // מציגים את המגה תפריט שמכיל את התוכן המלא של העמוד
      megaMenuContainer.innerHTML = `<div class="mega-menu-content">${page.content}</div>`;
      
      // מיקום ה-Mega Menu מתחת לתפריט בדיוק
      const rect = navLinksContainer.getBoundingClientRect();
      megaMenuContainer.style.top = (rect.bottom) + 'px';
      megaMenuContainer.classList.add('visible');
    });
    
    a.addEventListener('mouseleave', () => {
      hoverTimeout = setTimeout(() => {
        megaMenuContainer.classList.remove('visible');
      }, 300); // מחכה 300 מילישניות לפני העלמה (כדי שהעכבר יספיק לעבור אליו)
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

// מאזינים גם ל-Mega Menu עצמו כדי שלא ייסגר כשהעכבר בתוכו
megaMenuContainer.addEventListener('mouseenter', () => {
  megaMenuContainer.classList.add('visible');
});
megaMenuContainer.addEventListener('mouseleave', () => {
  megaMenuContainer.classList.remove('visible');
});



// פונקציה שמציגה את התוכן של העמוד הנוכחי במרכז המסך
function renderPage() {
  const currentPage = pages.find(p => p.id === activePageId); // מחפשים את העמוד ברשימה
  if (currentPage) {
    mainContent.innerHTML = currentPage.content; // מזריקים את ה-HTML של העמוד פנימה
    
    // המרת מיקומים (Migration): הפיכת טרנספורמציות ישנות למיקום אבסולוטי (left/top)
    // זה קריטי כדי שגלילת המסך (Scroll) תעבוד כשיש הרבה תוכן למטה
    const draggables = mainContent.querySelectorAll('.draggable-resizable');
    draggables.forEach(el => {
      if (el.style.transform && el.style.transform.includes('translate')) {
        const x = el.getAttribute('data-x') || 0;
        const y = el.getAttribute('data-y') || 0;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.transform = 'none'; // מוחקים את הטרנספורמציה
      }
    });
  }
  
  // אם מצב עריכה דלוק כרגע, אנחנו צריכים להחיל אותו מיד על התוכן החדש שנטען
  if (isEditMode) {
    applyEditModeToContent();
  }
  
  // הפעלת מצגות תמונות (Slideshows)
  initSlideshows();
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
  const isMobile = window.innerWidth <= 900;
  interact('.draggable-resizable').draggable({ enabled: !isMobile }).resizable({ enabled: !isMobile });

  // --- עריכת תפריט עליון ---
  Array.from(navLinksContainer.children).forEach(child => {
    if (child.id === 'add-nav-link-btn' || child.classList.contains('top-nav-controls')) return;

    // ניקוי כפתורים ישנים למקרה שנשארו
    const oldControls = child.querySelectorAll('.top-nav-controls');
    oldControls.forEach(c => c.remove());

    const targetLink = child.tagName === 'A' ? child : child.querySelector('.mega-drop-trigger');
    if (!targetLink) return;

    const controls = document.createElement('span');
    controls.className = 'top-nav-controls';
    controls.style.position = 'absolute';
    controls.style.top = '-25px';
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
    hideBtn.textContent = child.classList.contains('hidden-nav') ? '👁️' : '🙈';
    hideBtn.style.cursor = 'pointer';
    hideBtn.title = 'הסתר/הצג';
    hideBtn.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (child.classList.contains('hidden-nav')) {
        child.classList.remove('hidden-nav');
        hideBtn.textContent = '🙈';
      } else {
        child.classList.add('hidden-nav');
        hideBtn.textContent = '👁️';
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

  // הסרת אירועי עריכת תמונות
  mainContent.querySelectorAll('img').forEach(img => {
    img.style.cursor = 'default';
    img.title = '';
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

// פונקציה ששומרת את מה שערכנו לתוך המערך ואז לזיכרון
function saveCurrentPageContent() {
  // קודם נוריד את מצב העריכה ואת סימוני הבחירה של הגרירה (כדי שהם לא יישמרו לקוד הסטטי!)
  removeEditModeFromContent();
  if (typeof removeSelection === 'function') removeSelection();
  
  // נמצא את העמוד הנוכחי במערך שלנו
  const currentPage = pages.find(p => p.id === activePageId);
  if (currentPage) {
    currentPage.content = mainContent.innerHTML; // שומרים את ה-HTML החדש בחזרה לעמוד
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
});

// --- שלב 5: הוספת עמודים חדשים ---

// האזנה ללחיצה על כפתור "+ הוסף עמוד חדש"
btnAddPage.addEventListener('click', () => {
  const newTitle = prompt('איך תרצה לקרוא לעמוד החדש? (למשל: 📞 צור קשר)');
  
  if (newTitle && newTitle.trim() !== '') {
    const newPage = {
      id: 'page-' + Date.now(),
      title: newTitle,
      content: ''
    };
    
    pages.push(newPage);
    activePageId = newPage.id;
    
    saveToStorage();
    renderSideMenu();
    renderHiddenPages();
    renderPage();
  }
});

// --- עמודים נסתרים (Admin-only hidden pages) ---

function renderHiddenPages() {
  const section = document.getElementById('hidden-pages-section');
  const list    = document.getElementById('hidden-pages-list-sidebar');
  if (!section || !list) return;

  // מציג את האזור רק כשמנהל מחובר
  section.style.display = isEditMode ? 'block' : 'none';
  list.innerHTML = '';

  const hiddenPages = pages.filter(p => p.isHidden && p.adminOnly);

  if (hiddenPages.length === 0) {
    list.innerHTML = '<li style="font-size:12px; color:#666; padding:4px 8px;">אין עמודים נסתרים</li>';
    return;
  }

  hiddenPages.forEach(page => {
    const li = document.createElement('li');
    li.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:6px 8px; border-radius:6px; margin-bottom:3px; background:rgba(108,63,197,0.08);';

    // שם העמוד
    const nameSpan = document.createElement('span');
    nameSpan.textContent = page.title;
    nameSpan.style.cssText = 'font-size:13px; color:#c0a8f0; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';

    // כפתורי ניהול
    const actions = document.createElement('span');
    actions.style.cssText = 'display:flex; gap:6px; flex-shrink:0;';

    // פתח / ערוך
    const openBtn = document.createElement('span');
    openBtn.textContent = '📂';
    openBtn.title = 'פתח לעריכה';
    openBtn.style.cursor = 'pointer';
    openBtn.onclick = (e) => {
      e.stopPropagation();
      if (isEditMode) saveCurrentPageContent();
      activePageId = page.id;
      saveToStorage();
      renderPage();
      renderSideMenu();
      renderHiddenPages();
    };

    // שינוי שם
    const renameBtn = document.createElement('span');
    renameBtn.textContent = '✏️';
    renameBtn.title = 'שנה שם';
    renameBtn.style.cursor = 'pointer';
    renameBtn.onclick = (e) => {
      e.stopPropagation();
      const newName = prompt('שם חדש לעמוד הנסתר:', page.title);
      if (newName && newName.trim()) {
        page.title = newName.trim();
        saveToStorage();
        renderHiddenPages();
      }
    };

    // מחיקה
    const delBtn = document.createElement('span');
    delBtn.textContent = '🗑️';
    delBtn.title = 'מחק עמוד';
    delBtn.style.cursor = 'pointer';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      if (!confirm(`למחוק את "${page.title}"?`)) return;
      pages.splice(pages.findIndex(p => p.id === page.id), 1);
      if (activePageId === page.id && pages.length > 0) {
        activePageId = pages[0].id;
        renderPage();
      }
      saveToStorage();
      renderSideMenu();
      renderHiddenPages();
    };

    actions.appendChild(openBtn);
    actions.appendChild(renameBtn);
    actions.appendChild(delBtn);

    // אם זה העמוד הפעיל – הדגש
    if (page.id === activePageId) {
      li.style.background = 'rgba(108,63,197,0.25)';
      nameSpan.style.color = '#d4baff';
    }

    li.appendChild(nameSpan);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

// כפתור יצירת עמוד נסתר חדש
const btnAddHiddenSidebar = document.getElementById('btn-add-hidden-page-sidebar');
if (btnAddHiddenSidebar) {
  btnAddHiddenSidebar.addEventListener('click', () => {
    const newTitle = prompt('שם לעמוד הנסתר החדש:');
    if (!newTitle || !newTitle.trim()) return;

    const newPage = {
      id: 'hidden-' + Date.now(),
      title: newTitle.trim(),
      content: '',
      isHidden: true,   // לא יופיע בתפריטים
      adminOnly: true   // סימון עמוד נסתר-מנהל
    };

    pages.push(newPage);
    activePageId = newPage.id; // נפתח ישירות לעריכה
    saveToStorage();
    renderPage();
    renderSideMenu();
    renderHiddenPages();
  });
}

// האזנה ללחיצה על כפתור "איפוס אתר"
if (btnResetSite) {
  btnResetSite.addEventListener('click', async () => {
    if (confirm('האם אתה בטוח שברצונך לאפס את האתר? כל העמודים והעיצובים השמורים יימחקו לצמיתות.')) {
      try {
        await localforage.clear();
        localStorage.clear();
        console.log('האתר אופס בהצלחה! העמוד ייטען מחדש כעת.');
        window.location.reload();
      } catch (e) {
        console.error(e);
        console.error('שגיאה במהלך האיפוס.');
      }
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
    linkBtn.title = 'הוסף/ערוך קישור';
    linkBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      currentEditingLinkElement = target;
      const currentLink = target.getAttribute('data-href') || '';
      
      const linkInternalSelect = document.getElementById('link-internal-select');
      const linkExternalInput = document.getElementById('link-external-input');
      const linkModal = document.getElementById('link-modal');

      linkInternalSelect.innerHTML = '<option value="">-- בחר עמוד פנימי --</option>';
      pages.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.title;
        linkInternalSelect.appendChild(opt);
      });
      
      linkExternalInput.value = '';
      linkInternalSelect.value = '';
      
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
    actionsContainer.appendChild(linkBtn);

    // 1.5. כפתור כניסה לקישור (מוצג רק אם יש קישור) - האייקון של הכניסה
    if (target.getAttribute('data-href')) {
      const goBtn = document.createElement('button');
      goBtn.className = 'action-btn go-btn';
      goBtn.innerHTML = '🚪'; // אייקון כניסה
      goBtn.title = 'כנס לקישור (אייקון כניסה)';
      goBtn.style.background = '#4CAF50'; // צבע ירוק בולט
      goBtn.style.color = 'white';
      goBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        // מדמה לחיצה של 3 פעמים כדי לעקוף את חסימת העריכה ולעבור לעמוד
        target.dispatchEvent(new MouseEvent('click', { detail: 3, bubbles: true }));
      });
      actionsContainer.appendChild(goBtn);
    }


    // 2. כפתור העתקה
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn copy-btn';
    copyBtn.innerHTML = '📄';
    copyBtn.title = 'העתק אלמנט';
    copyBtn.addEventListener('mousedown', async (e) => {
      e.stopPropagation();
      await copySelectedElements([target]);
      console.log('האלמנט הועתק! עכשיו אפשר להדביק אותו בעמוד אחר בעזרת כפתור "הדבק" או Ctrl+V.');
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
        if (db) {
          db.collection("site").doc("config").set({ siteBackgrounds: siteBackgrounds }, { merge: true });
        }
        applyBackgrounds();
        
        target.remove();
        removeSelection();
        saveCurrentPageContent();
      });
      actionsContainer.appendChild(burnBtn);
    }

    actionsContainer.appendChild(linkBtn);

    // כפתור "כנס לעמוד הנסתר" – מופיע רק אם האלמנט מקושר לעמוד נסתר
    const linkedHref = target.getAttribute('data-href');
    if (linkedHref) {
      const linkedPage = pages.find(p => p.id === linkedHref && p.adminOnly);
      if (linkedPage) {
        const enterBtn = document.createElement('button');
        enterBtn.className = 'action-btn';
        enterBtn.innerHTML = '↩️';
        enterBtn.title = `כנס לעמוד הנסתר: ${linkedPage.title}`;
        enterBtn.style.background = 'rgba(108,63,197,0.15)';
        enterBtn.style.border = '1px solid rgba(108,63,197,0.4)';
        enterBtn.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          saveCurrentPageContent();
          activePageId = linkedPage.id;
          saveToStorage();
          renderPage();
          renderSideMenu();
          if (typeof renderHiddenPages === 'function') renderHiddenPages();
        });
        actionsContainer.appendChild(enterBtn);
      }
    }

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
          const reader = new FileReader();
          reader.onload = event => {
            urls[index] = event.target.result;
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
              
              el.style.backgroundImage = 'url(' + urls[0] + ')';
              el.style.backgroundSize = 'cover';
              el.style.backgroundRepeat = 'no-repeat';
              el.style.backgroundPosition = 'center';
              el.style.borderRadius = '12px';
              
              el.dataset.slideshowUrls = JSON.stringify(urls);
              el.dataset.slideshowIndex = '0';
              
              mainContent.appendChild(el);
              saveCurrentPageContent();
              initSlideshows(); // מפעיל מיד את המצגת
              console.log('נוצרה מצגת עם ' + files.length + ' תמונות בהצלחה! התמונות יתחלפו כל 3 שניות.');
            }
          };
          reader.readAsDataURL(file);
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
            <video src="${event.target.result}" controls style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;"></video>
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
    const input = document.createElement('input');
    input.type = 'file';
    
    input.onchange = e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = event => {
          const el = document.createElement('div');
          el.className = 'draggable-resizable';
          
          el.style.width = '250px';
          el.style.left = '200px';
          el.style.top = '200px';
          el.setAttribute('data-x', '200');
          el.setAttribute('data-y', '200');
          
          // שומרים את מידע ההורדה
          el.dataset.downloadUrl = event.target.result;
          el.dataset.downloadName = file.name;
          el.title = "לחיצה תוריד קובץ: " + file.name;
          
          // עיצוב כפתור ההורדה שיופיע על המסך
          el.innerHTML = `
            <div style="background: linear-gradient(135deg, #4CAF50, #2E7D32); color: white; border-radius: 12px; padding: 15px 20px; display: flex; align-items: center; justify-content: center; gap: 10px; font-family: 'Inter', sans-serif; font-size: 16px; font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.1); cursor: pointer; height: 100%; box-sizing: border-box;">
              <span style="font-size: 24px;">📥</span>
              <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" contenteditable="plaintext-only">הורד קובץ</span>
            </div>
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
        const reader = new FileReader();
        reader.onload = event => {
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
            
            el.style.backgroundImage = `url("${event.target.result}")`;
            el.style.backgroundSize = 'contain';
            el.style.backgroundRepeat = 'no-repeat';
            el.style.backgroundPosition = 'center';
            el.style.borderRadius = '12px'; // קצת יופי
            
            mainContent.appendChild(el);
            saveCurrentPageContent();
          };
          imgObj.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    };
    input.click(); // לוחצים "וירטואלית" על שדה העלאת הקובץ
  });
}

// 9.3 הוספת רקע ישיר לאתר - לחיצה אחת = בחר תמונה = רקע קבוע
const bgModal = document.getElementById('bg-modal');
const bgFileInput = document.getElementById('bg-file-input');
let currentBgTarget = null;

// פתיחת חלונית בחירת אזור הרקע
if (btnAddBg) {
  btnAddBg.addEventListener('click', () => {
    if (bgModal) bgModal.style.display = 'flex';
  });
}

// כפתורי בחירת אזור – כל אחד שומר את היעד ופותח בורר קובץ
['dashboard', 'topnav', 'main'].forEach(target => {
  const btn = document.getElementById(`bg-target-${target}`);
  if (btn) {
    btn.addEventListener('click', () => {
      currentBgTarget = target;
      bgFileInput.click();
    });
  }
});

// קריאת הקובץ שנבחר ושמירה לפי אזור
if (bgFileInput) {
  bgFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentBgTarget) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;

      if (currentBgTarget === 'dashboard')  siteBackgrounds.dashboard = dataUrl;
      else if (currentBgTarget === 'topnav') siteBackgrounds.topNav    = dataUrl;
      else if (currentBgTarget === 'main')   siteBackgrounds.main      = dataUrl;
      
      if (db) {
        db.collection("site").doc("config").set({ siteBackgrounds: siteBackgrounds }, { merge: true });
      }
      applyBackgrounds();
      if (bgModal) bgModal.style.display = 'none';
    };
    reader.readAsDataURL(file);
    bgFileInput.value = '';
  });
}

// ניקוי כל הרקעים
const bgClearBtn = document.getElementById('bg-clear-all');
if (bgClearBtn) {
  bgClearBtn.addEventListener('click', async () => {
    siteBackgrounds = { dashboard: null, topNav: null, main: null };
    if (db) {
      db.collection("site").doc("config").set({ siteBackgrounds: siteBackgrounds }, { merge: true });
    }
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
    if (!silent) console.log('לא העתקת שום דבר עדיין!');
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
      console.log('יש לסמן לפחות 2 אלמנטים כדי ליצור בלוק, או לסמן בלוק קיים כדי לפרק אותו!');
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
      console.log('יש לסמן אלמנט שברצונך לחתוך!');
      return;
    }
    if (selectedEls.length > 1) {
      console.log('אפשר לחתוך רק אלמנט אחד בכל פעם!');
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
    console.log('כל השינויים שלך נשמרו בהצלחה! 💾✨');
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


  // 13.6 ביטול פעולה אחרונה (Undo) בעזרת Command + Z
  if (isCmdOrCtrl && event.key.toLowerCase() === 'z') {
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
      saveToStorage();
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
let chatModal, adminView, convView, guestView;
let chatBtn, convList, convTitle, backBtn, messagesBox, chatInput, chatSendBtn, chatImageBtn, chatImageInput;
const linkInternalSelect = document.getElementById('link-internal-select');
const linkExternalInput = document.getElementById('link-external-input');
const btnCancelLink = document.getElementById('btn-cancel-link');
const btnRemoveLink = document.getElementById('btn-remove-link');
const btnSaveLink = document.getElementById('btn-save-link');
let currentEditingLinkElement = null;

function initChat() {
  chatModal       = document.getElementById('support-chat-modal');
  adminView       = document.getElementById('chat-admin-view');
  convView        = document.getElementById('chat-conversation-view');
  guestView       = document.getElementById('chat-guest-view');
  
  chatBtn         = document.querySelector('.chat-btn');
  convList        = document.getElementById('chat-conversations-list');
  convTitle       = document.getElementById('chat-conv-title');
  backBtn         = document.getElementById('chat-back-btn');
  messagesBox     = document.getElementById('chat-messages-container');
  chatInput       = document.getElementById('support-chat-input');
  chatSendBtn     = document.getElementById('support-chat-send');
  chatImageBtn    = document.getElementById('support-chat-image-btn');
  chatImageInput  = document.getElementById('support-chat-image-input');

  if (!chatModal || !chatBtn) return;
  if (chatSendBtn) chatSendBtn.addEventListener('click', () => handleSend(null));
  if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(null); });

  if (chatImageBtn && chatImageInput) {
    chatImageBtn.addEventListener('click', () => chatImageInput.click());
    chatImageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        handleSend(ev.target.result);
      };
      reader.readAsDataURL(file);
      chatImageInput.value = '';
    });
  }

  const guestLoginBtn = document.getElementById('chat-login-prompt-btn');
}

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
  if (currentEditingLinkElement) {
    const internalVal = linkInternalSelect.value;
    const externalVal = linkExternalInput.value.trim();
    
    const finalVal = externalVal || internalVal; // עדיפות לקישור חיצוני אם הוזן
    
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

// כפתור יצירת עמוד נסתר וקישור אליו – ללא שאלת שם, מיידי
document.addEventListener('click', (e) => {
  const btn = e.target.closest('#btn-create-hidden-link');
  if (!btn) return;
  e.preventDefault();

  // שם אוטומטי
  const hiddenCount = pages.filter(p => p.adminOnly).length + 1;
  const newPage = {
    id: 'hidden-' + Date.now(),
    title: `עמוד נסתר ${hiddenCount}`,
    content: '',
    isHidden: true,
    adminOnly: true
  };
  pages.push(newPage);
  saveToStorage();
  if (typeof renderHiddenPages === 'function') renderHiddenPages();

  // קישור האלמנט הנוכחי לעמוד החדש
  if (currentEditingLinkElement) {
    currentEditingLinkElement.setAttribute('data-href', newPage.id);
    currentEditingLinkElement.style.cursor = 'pointer';
    saveCurrentPageContent();
  }

  if (linkModal) linkModal.style.display = 'none';
  currentEditingLinkElement = null;
});


// --- Cookie Consent Logic ---
document.addEventListener('DOMContentLoaded', () => {
  const cookieBanner = document.getElementById('cookie-consent-banner');
  const btnAcceptCookie = document.getElementById('accept-cookie-btn');
  const btnCloseCookie = document.getElementById('close-cookie-btn');

  // Check if user already consented
  const hasConsented = localStorage.getItem('cookieConsent');

  if (!hasConsented) {
    // Show banner if no consent
    cookieBanner.style.display = 'block';
  }

  // Handle accept button
  btnAcceptCookie.addEventListener('click', () => {
    localStorage.setItem('cookieConsent', 'true');
    cookieBanner.style.display = 'none';
  });

  // Handle close button
  btnCloseCookie.addEventListener('click', () => {
    localStorage.setItem('cookieConsent', 'true');
    cookieBanner.style.display = 'none';
  });
});

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
        // נווט לעמוד הפנימי (כולל עמודים נסתרים)
        activePageId = internalPage.id;
        saveToStorage();
        renderSideMenu();
        renderTopNav();
        renderHiddenPages();
        renderPage();
      } else {
        // זה קישור חיצוני
        const finalLink = link.startsWith('http') ? link : 'https://' + link;
        
        // יצירת חלון קופץ (Modal) עם iframe להצגת הכתבה בתוך האתר
        const modalOverlay = document.createElement('div');
        modalOverlay.style.position = 'fixed';
        modalOverlay.style.top = '0';
        modalOverlay.style.left = '0';
        modalOverlay.style.width = '100vw';
        modalOverlay.style.height = '100vh';
        modalOverlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
        modalOverlay.style.zIndex = '999999';
        modalOverlay.style.display = 'flex';
        modalOverlay.style.justifyContent = 'center';
        modalOverlay.style.alignItems = 'center';
        modalOverlay.style.backdropFilter = 'blur(5px)';
        
        const modalContainer = document.createElement('div');
        modalContainer.style.width = '90%';
        modalContainer.style.height = '90%';
        modalContainer.style.backgroundColor = '#fff';
        modalContainer.style.borderRadius = '12px';
        modalContainer.style.overflow = 'hidden';
        modalContainer.style.position = 'relative';
        modalContainer.style.boxShadow = '0 10px 40px rgba(0,0,0,0.5)';
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✖';
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '15px';
        closeBtn.style.left = '15px';
        closeBtn.style.background = '#e53935';
        closeBtn.style.color = 'white';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '50%';
        closeBtn.style.width = '40px';
        closeBtn.style.height = '40px';
        closeBtn.style.fontSize = '20px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.zIndex = '10';
        closeBtn.style.display = 'flex';
        closeBtn.style.alignItems = 'center';
        closeBtn.style.justifyContent = 'center';
        
        closeBtn.onclick = () => {
          document.body.removeChild(modalOverlay);
        };
        
        const iframe = document.createElement('iframe');
        iframe.src = finalLink;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        
        modalContainer.appendChild(closeBtn);
        modalContainer.appendChild(iframe);
        modalOverlay.appendChild(modalContainer);
        document.body.appendChild(modalOverlay);
      }
    }
  }
});



// --- מערכת צ'אט מלאה עם Firebase ---
(function initChatSystem() {

  const ADMIN_EMAIL = 'yoni98321@gmail.com';
  let db = null;
  let currentChatUid = null;     // UID של השיחה הפתוחה (למנהל)
  let chatListener = null;       // listener פעיל ל-Firebase
  let unreadListeners = {};      // listeners לספירת הודעות חדשות

  // DOM Elements
  const chatBtn       = document.querySelector('.chat-btn');
  const chatModal     = document.getElementById('support-chat-modal');
  const adminView     = document.getElementById('chat-admin-view');
  const convView      = document.getElementById('chat-conversation-view');
  const guestView     = document.getElementById('chat-guest-view');
  const convList      = document.getElementById('chat-conversations-list');
  const messagesBox   = document.getElementById('chat-messages-container');
  const chatInput     = document.getElementById('support-chat-input');
  const sendBtn       = document.getElementById('support-chat-send');
  const convTitle     = document.getElementById('chat-conv-title');
  const backBtn       = document.getElementById('chat-back-btn');

  if (!chatBtn || !chatModal) return;

  // ─── פתיחה/סגירה בטוגל ──────────────────────────────
  chatBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (chatModal.classList.contains('chat-open')) {
      closeChat();
    } else {
      openChat();
    }
  });

  // סגירה בלחיצה על ✕
  ['support-chat-close','support-chat-close-2','support-chat-close-3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', closeChat);
  });

  // כפתור חזרה למנהל
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      detachChatListener();
      showAdminView();
    });
  }

  // כפתור כניסה (אורח)
  const loginPromptBtn = document.getElementById('chat-login-prompt-btn');
  if (loginPromptBtn) {
    loginPromptBtn.addEventListener('click', () => {
      closeChat();
      const loginModal = document.getElementById('login-modal');
      if (loginModal) loginModal.style.display = 'flex';
    });
  }

  // סגירה בלחיצה מחוץ
  document.addEventListener('click', (e) => {
    if (chatModal.classList.contains('chat-open') &&
        !chatModal.contains(e.target) &&
        !chatBtn.contains(e.target)) {
      closeChat();
    }
  });

  // שליחה
  if (sendBtn)  sendBtn.addEventListener('click', handleSend);
  if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });

  // ─── Firebase Ready ──────────────────────────────────
  if (typeof firebase !== 'undefined') {
    try {
      db = firebase.database();
    } catch(err) {
      console.warn('Firebase Database לא זמין:', err);
    }

    firebase.auth().onAuthStateChanged((user) => {
      // עדכון כפתורי header
      updateHeaderButtons(user);
      // עדכון badge אם יש הודעות חדשות (למנהל ולמשתמש)
      if (user && db) {
        listenForUnreadBadge();
      } else {
        clearUnreadListeners();
        removeBadge();
      }
    });
  }

  // ─── פונקציות פתיחה/סגירה ───────────────────────────
  function openChat() {
    chatModal.classList.add('chat-open');
    const user = firebase && firebase.auth ? firebase.auth().currentUser : null;

    if (!user) {
      // אורח לא מחובר
      showGuestView();
    } else if (user.email === ADMIN_EMAIL) {
      // מנהל: הצג רשימת שיחות
      showAdminView();
      loadConversationsList();
    } else {
      // משתמש רגיל: פתח ישירות את השיחה שלו
      openConversation(user.uid, user.displayName || user.email.split('@')[0]);
    }
  }

  function closeChat() {
    chatModal.classList.remove('chat-open');
    detachChatListener();
  }

  function showAdminView() {
    adminView.style.display   = 'flex';
    convView.style.display    = 'none';
    guestView.style.display   = 'none';
    currentChatUid = null;
  }

  function showConvView() {
    adminView.style.display   = 'none';
    convView.style.display    = 'flex';
    guestView.style.display   = 'none';
  }

  function showGuestView() {
    adminView.style.display   = 'none';
    convView.style.display    = 'none';
    guestView.style.display   = 'flex';
  }

  // ─── רשימת שיחות (מנהל) ─────────────────────────────
  function loadConversationsList() {
    if (!db) { convList.innerHTML = '<div class="chat-empty-state">Firebase לא זמין</div>'; return; }

    convList.innerHTML = '<div class="chat-empty-state">טוען שיחות...</div>';

    db.ref('chats').on('value', (snap) => {
      convList.innerHTML = '';
      if (!snap.exists()) {
        convList.innerHTML = '<div class="chat-empty-state">אין שיחות עדיין</div>';
        return;
      }

      const chatsData = snap.val();
      const sorted = Object.entries(chatsData)
        .map(([uid, data]) => ({ uid, ...data }))
        .sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0));

      sorted.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'conv-list-item';
        if (chat.hasUnread) item.classList.add('conv-unread');

        const name = chat.displayName || chat.uid.slice(0,8);
        const lastMsg = chat.lastMessage || '';
        const time = chat.lastTimestamp
          ? formatTime(new Date(chat.lastTimestamp))
          : '';

        item.innerHTML = `
          <div class="conv-info">
            <div class="conv-name">${escHtml(name)}</div>
            <div class="conv-last">${escHtml(lastMsg.slice(0,50))}</div>
          </div>
          <div class="conv-meta">
            <div class="conv-time">${time}</div>
            ${chat.hasUnread ? '<div class="conv-dot"></div>' : ''}
          </div>
        `;
        item.addEventListener('click', () => {
          // סמן כנקרא
          db.ref(`chats/${chat.uid}/hasUnread`).set(false);
          openConversation(chat.uid, name);
        });
        convList.appendChild(item);
      });
    });
  }

  // ─── פתיחת שיחה ─────────────────────────────────────
  function openConversation(uid, name) {
    currentChatUid = uid;
    if (convTitle) convTitle.textContent = name;

    // כפתור חזרה רק למנהל
    const user = firebase.auth().currentUser;
    if (backBtn) backBtn.style.display = (user && user.email === ADMIN_EMAIL) ? 'inline' : 'none';

    showConvView();
    if (messagesBox) messagesBox.innerHTML = '';

    if (!db) return;

    detachChatListener();

    chatListener = db.ref(`chats/${uid}/messages`).on('value', (snap) => {
      if (!messagesBox) return;
      messagesBox.innerHTML = '';
      if (!snap.exists()) return;

      snap.forEach(child => {
        const msg = child.val();
        renderMessage(msg);
      });
      messagesBox.scrollTop = messagesBox.scrollHeight;
    });

    // כשהמשתמש פותח את השיחה, מאפסים את התראת "לא נקרא"
    const isUserAdmin = user && user.email === ADMIN_EMAIL;
    if (!isUserAdmin) {
      db.ref(`chats/${uid}/hasUnreadUser`).set(false);
    }

    setTimeout(() => { if (chatInput) chatInput.focus(); }, 300);
  }

  // ─── שליחת הודעה ─────────────────────────────────────
  function handleSend(imageUrl = null) {
    let text = '';
    if (!imageUrl) {
      if (!chatInput) return;
      text = chatInput.value.trim();
      if (!text) return;
    }

    const user = firebase && firebase.auth ? firebase.auth().currentUser : null;

    // אורח לא מחובר
    if (!user) {
      showGuestView();
      return;
    }

    if (!db) return;

    const isAdmin = user.email === ADMIN_EMAIL;
    const targetUid = isAdmin ? currentChatUid : user.uid;
    if (!targetUid) return;

    const senderName = isAdmin
      ? 'מנהל האתר'
      : (user.displayName || user.email.split('@')[0]);

    const msg = {
      text,
      sender: isAdmin ? 'admin' : 'user',
      senderName,
      timestamp: Date.now()
    };
    if (imageUrl) msg.imageUrl = imageUrl;

    const chatRef = db.ref(`chats/${targetUid}`);

    // שמור הודעה
    chatRef.child('messages').push(msg).catch(err => {
      console.error('Error pushing message:', err);
      console.error('שגיאה בשליחת הודעה (ייתכן ואין הרשאות לכתוב למסד הנתונים)');
    });

    // עדכן מטא-דאטה של שיחה
    chatRef.update({
      lastMessage: imageUrl ? '📷 תמונה' : text,
      lastTimestamp: Date.now(),
      displayName: isAdmin ? (convTitle ? convTitle.textContent : targetUid) : senderName,
      hasUnread: !isAdmin,  // הודעה מהמשתמש = לא נקראה על ידי המנהל
      hasUnreadUser: isAdmin // הודעה ממנהל = לא נקראה על ידי המשתמש
    }).catch(err => console.error('Error updating chat metadata:', err));

    // תגובה אוטומטית למשתמש
    if (!isAdmin) {
      // בדיקה אם עברו 5 דקות מהתגובה האוטומטית האחרונה כדי לא להציף
      if (!window.lastAutoReplyTime || Date.now() - window.lastAutoReplyTime > 1000 * 60 * 5) {
        window.lastAutoReplyTime = Date.now();
        setTimeout(() => {
          const autoMsg = {
            text: 'מנהל האתר בקרוב יחזור אליכם',
            sender: 'admin',
            senderName: 'מערכת',
            timestamp: Date.now()
          };
          chatRef.child('messages').push(autoMsg).catch(err => console.error(err));
          chatRef.update({
            lastMessage: autoMsg.text,
            lastTimestamp: autoMsg.timestamp,
            hasUnreadUser: true 
          });
        }, 1000);
      }
    }

    if (!imageUrl && chatInput) {
      chatInput.value = '';
      chatInput.focus();
    }
  }

  // ─── ציור הודעה ─────────────────────────────────────
  function renderMessage(msg) {
    if (!messagesBox) return;
    const user = firebase && firebase.auth ? firebase.auth().currentUser : null;
    const isAdmin = user && user.email === ADMIN_EMAIL;

    // מצד מי ההודעה הזו?
    const isMine = isAdmin ? (msg.sender === 'admin') : (msg.sender === 'user');

    const div = document.createElement('div');
    div.className = `chat-message ${isMine ? 'user-msg' : 'automated-msg'}`;

    const time = msg.timestamp ? formatTime(new Date(msg.timestamp)) : '';
    const timeAlign = isMine ? 'text-align:left;' : '';
    const senderLabel = isMine ? 'אתה' : escHtml(msg.senderName || '');

    let imgHtml = '';
    if (msg.imageUrl) {
      imgHtml = `<img src="${msg.imageUrl}" style="max-width: 100%; border-radius: 8px; margin-bottom: 5px; display: block; cursor: pointer;" onclick="window.open(this.src)">`;
    }

    div.innerHTML = `
      <div class="msg-content">
        <div class="msg-sender" style="${isMine ? 'text-align:left;display:block;width:100%;' : ''}">${senderLabel}</div>
        ${imgHtml}
        ${msg.text ? escHtml(msg.text) : ''}
        <div class="msg-time" style="${timeAlign}">${time}</div>
      </div>
    `;
    messagesBox.appendChild(div);
  }

  // ─── badge הודעות חדשות ──────────────────────────────
  function listenForUnreadBadge() {
    if (!db) return;
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const isAdmin = user.email === ADMIN_EMAIL;

    if (isAdmin) {
      db.ref('chats').on('value', (snap) => {
        if (!snap.exists()) { removeBadge(); return; }
        let hasAny = false;
        snap.forEach(child => { if (child.val().hasUnread) hasAny = true; });
        hasAny ? addBadge() : removeBadge();
      });
    } else {
      db.ref(`chats/${user.uid}/hasUnreadUser`).on('value', (snap) => {
        if (snap.exists() && snap.val() === true) {
          addBadge();
        } else {
          removeBadge();
        }
      });
    }
  }

  function addBadge() {
    if (!chatBtn) return;
    if (!chatBtn.querySelector('.chat-badge')) {
      const b = document.createElement('span');
      b.className = 'chat-badge';
      chatBtn.appendChild(b);
    }
  }

  function removeBadge() {
    if (!chatBtn) return;
    const b = chatBtn.querySelector('.chat-badge');
    if (b) b.remove();
  }

  function clearUnreadListeners() {
    if (db) {
      db.ref('chats').off();
      const user = firebase.auth().currentUser;
      if (user) db.ref(`chats/${user.uid}/hasUnreadUser`).off();
    }
  }

  // ─── ניתוק listener ──────────────────────────────────
  function detachChatListener() {
    if (chatListener && db && currentChatUid) {
      db.ref(`chats/${currentChatUid}/messages`).off('value', chatListener);
      chatListener = null;
    }
  }

  // ─── עזרים ───────────────────────────────────────────
  function formatTime(date) {
    return `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function updateHeaderButtons(user) {
    const managerBtn = document.querySelector('.manager-btn');
    const loginBtn   = document.querySelector('.login-btn');
    const ft         = document.getElementById('floating-toolbar');

    if (user) {
      const name = user.email ? user.email.split('@')[0] : 'אורח';
      if (loginBtn) loginBtn.textContent = `התנתק (${name}) 👤`;

      if (user.email === ADMIN_EMAIL) {
        isEditMode = true;
        if (managerBtn) managerBtn.textContent = 'מנהל (התנתק) 🟢';
        if (ft) ft.style.display = 'flex';
        applyEditModeToContent();
        renderSideMenu();
        renderTopNav();
      } else {
        isEditMode = false;
        if (managerBtn) managerBtn.textContent = 'התנתק (אורח) 👤';
        if (ft) ft.style.display = 'none';
        removeEditModeFromContent();
        renderSideMenu();
        renderTopNav();
      }
    } else {
      isEditMode = false;
      if (loginBtn)   loginBtn.textContent   = 'התחבר 👤';
      if (managerBtn) managerBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 6px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>התחברות';
      const ft2 = document.getElementById('floating-toolbar');
      if (ft2) ft2.style.display = 'none';
      removeEditModeFromContent();
      renderSideMenu();
      renderTopNav();
    }
  }

  // כפתורי manager/login
  const managerBtnEl = document.querySelector('.manager-btn');
  const loginBtnEl   = document.querySelector('.login-btn');

  if (managerBtnEl) {
    managerBtnEl.addEventListener('click', () => {
      if (typeof firebase === 'undefined') { console.error('Firebase לא נטען'); return; }
      const user = firebase.auth().currentUser;
      if (user) {
        firebase.auth().signOut();
      } else {
        const lm = document.getElementById('login-modal');
        if (lm) lm.style.display = 'flex';
      }
    });
  }

  if (loginBtnEl) {
    loginBtnEl.addEventListener('click', () => {
      if (typeof firebase === 'undefined') { console.error('Firebase לא נטען'); return; }
      const user = firebase.auth().currentUser;
      if (user) {
        firebase.auth().signOut();
      } else {
        const lm = document.getElementById('login-modal');
        if (lm) lm.style.display = 'flex';
      }
    });
  }

})();

// --- מנגנון הורדת קבצים ---
// מאזין ללחיצות על אזור התוכן הראשי. אם לחצו על אלמנט שיש לו data-download-url במצב אורח, מוריד את הקובץ
mainContent.addEventListener('click', (e) => {
  // אם אנחנו במצב עריכה - הלחיצה מיועדת לבחירת האלמנט, לא להורדה
  if (isEditMode) return;
  
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



document.addEventListener('DOMContentLoaded', () => {
  const loginModal = document.getElementById('login-modal');
  const btnCloseLogin = document.getElementById('btn-close-login');
  const btnSubmitLogin = document.getElementById('btn-submit-login');
  const btnTogglePassword = document.getElementById('btn-toggle-password-visibility');
  const authEmailInput = document.getElementById('auth-email');
  const authPasswordInput = document.getElementById('auth-password');
  const authErrorDiv = document.getElementById('auth-error');
  
  // אלמנטים לשינוי מצב התחברות / הרשמה
  const btnToggleAuthMode = document.getElementById('btn-toggle-auth-mode');
  const authToggleText = document.getElementById('auth-toggle-text');
  const authTitle = loginModal ? loginModal.querySelector('.auth-title') : null;
  const authSubtitle = loginModal ? loginModal.querySelector('.auth-subtitle') : null;
  
  // כפתורים חברתיים
  const btnLoginGoogle = document.getElementById('btn-login-google');
  const btnLoginAnonymous = document.getElementById('btn-login-anonymous');

  let isSignUpMode = false;

  if (btnToggleAuthMode) {
    btnToggleAuthMode.addEventListener('click', (e) => {
      e.preventDefault();
      isSignUpMode = !isSignUpMode;
      
      if (authErrorDiv) authErrorDiv.style.display = 'none';
      
      if (isSignUpMode) {
        if (authTitle) authTitle.textContent = 'יצירת חשבון';
        if (authSubtitle) authSubtitle.textContent = 'הרשמו כדי להצטרף אלינו וליצור אתר בחינם';
        if (btnSubmitLogin) btnSubmitLogin.textContent = 'הרשמה ←';
        if (authToggleText) authToggleText.textContent = 'כבר יש לך חשבון?';
        btnToggleAuthMode.textContent = 'התחברות';
      } else {
        if (authTitle) authTitle.textContent = 'ברוכים הבאים';
        if (authSubtitle) authSubtitle.textContent = 'הזינו את הפרטים שלכם כדי להמשיך';
        if (btnSubmitLogin) btnSubmitLogin.textContent = 'התחברות ←';
        if (authToggleText) authToggleText.textContent = 'אין לך חשבון?';
        btnToggleAuthMode.textContent = 'הרשמה עכשיו';
      }
    });
  }

  if (btnTogglePassword && authPasswordInput) {
    btnTogglePassword.addEventListener('click', () => {
      const isPassword = authPasswordInput.type === 'password';
      authPasswordInput.type = isPassword ? 'text' : 'password';
      btnTogglePassword.textContent = isPassword ? '🙈' : '👁️';
    });
  }
  
  if (btnCloseLogin && loginModal) {
    btnCloseLogin.addEventListener('click', () => {
      loginModal.style.display = 'none';
      if (authErrorDiv) authErrorDiv.style.display = 'none';
    });
  }
  
  if (btnSubmitLogin && loginModal) {
    btnSubmitLogin.addEventListener('click', async () => {
      const email = authEmailInput.value.trim();
      const password = authPasswordInput.value;
      
      if (authErrorDiv) authErrorDiv.style.display = 'none';
      
      if (!email || !password) {
        if (authErrorDiv) {
          authErrorDiv.textContent = 'נא להזין אימייל וסיסמה!';
          authErrorDiv.style.display = 'block';
        }
        return;
      }
      
      try {
        if (isSignUpMode) {
          await firebase.auth().createUserWithEmailAndPassword(email, password);
        } else {
          await firebase.auth().signInWithEmailAndPassword(email, password);
        }
        loginModal.style.display = 'none';
        authEmailInput.value = '';
        authPasswordInput.value = '';
      } catch (error) {
        console.error(error);
        if (authErrorDiv) {
          let errorMsg = 'שגיאה בפעולה זו. אנא בדוק את הפרטים שהזנת.';
          if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMsg = 'אימייל או סיסמה שגויים!';
          } else if (error.code === 'auth/email-already-in-use') {
            errorMsg = 'כתובת האימייל הזו כבר רשומה במערכת!';
          } else if (error.code === 'auth/weak-password') {
            errorMsg = 'הסיסמה חלשה מדי! יש להזין לפחות 6 תווים.';
          } else if (error.code === 'auth/invalid-email') {
            errorMsg = 'כתובת אימייל לא תקינה!';
          }
          authErrorDiv.textContent = errorMsg;
          authErrorDiv.style.display = 'block';
        }
      }
    });
  }

  // התחברות עם Google
  if (btnLoginGoogle) {
    btnLoginGoogle.addEventListener('click', async () => {
      if (authErrorDiv) authErrorDiv.style.display = 'none';
      try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await firebase.auth().signInWithPopup(provider);
        loginModal.style.display = 'none';
      } catch (error) {
        console.error(error);
        if (authErrorDiv) {
          authErrorDiv.textContent = 'התחברות באמצעות Google נכשלה. אנא נסה שנית.';
          authErrorDiv.style.display = 'block';
        }
      }
    });
  }

  // התחברות אנונימית
  if (btnLoginAnonymous) {
    btnLoginAnonymous.addEventListener('click', async () => {
      if (authErrorDiv) authErrorDiv.style.display = 'none';
      try {
        await firebase.auth().signInAnonymously();
        loginModal.style.display = 'none';
      } catch (error) {
        console.error(error);
        if (authErrorDiv) {
          authErrorDiv.textContent = 'התחברות כאורח נכשלה. אנא נסה שנית.';
          authErrorDiv.style.display = 'block';
        }
      }
    });
  }
});


