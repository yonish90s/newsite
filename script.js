import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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
let isEditMode = false; // ברירת מחדל: אורח (ללא עריכה)
let undoStack = []; // מערך לשמירת היסטוריית שינויים לצורך ביטול (Undo)
let siteBackgrounds = { dashboard: null, topNav: null, main: null };

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

// פונקציית אתחול אסינכרונית - טוענת מהמסד הנתונים של Firebase עם גיבוי מקומי ב-localforage
async function initSite() {
  try {
    // 1. ננסה למשוך קודם כל מ-Firebase DB לעדכון בין מכשירים
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, 'website'));
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log("נטען בהצלחה מענן Firebase:", data);
      
      if (data.pages) pages = data.pages;
      if (data.activePageId) activePageId = data.activePageId;
      if (data.topNavPages) topNavPages = data.topNavPages;
      if (data.siteBackgrounds) siteBackgrounds = data.siteBackgrounds;
      
      if (data.navHTML) {
        navLinksContainer.innerHTML = data.navHTML;
      }
      
      // נעדכן גם את הזיכרון המקומי לגיבוי
      localforage.setItem('mySitePages_v3', pages);
      localforage.setItem('myActivePage_v3', activePageId);
      localforage.setItem('mySiteTopNav_v3', topNavPages);
      if (data.navHTML) localforage.setItem('mySiteTopNavHTML_v3', data.navHTML);
      localforage.setItem('mySiteBackgrounds_v3', siteBackgrounds);
      
      applyBackgrounds();
      
    } else {
      // 2. אם ה-Firebase ריק (פעם ראשונה), נטען מ-localforage
      console.log("לא נמצאו נתונים ב-Firebase, טוען מגיבוי מקומי...");
      
      const savedActive = await localforage.getItem('myActivePage_v3');
      if (savedActive) activePageId = savedActive;
      
      const savedTopNavHTML = await localforage.getItem('mySiteTopNavHTML_v3');
      if (savedTopNavHTML) {
        navLinksContainer.innerHTML = savedTopNavHTML;
      }

      const savedPages = await localforage.getItem('mySitePages_v3');
      if (savedPages) {
        pages = savedPages.filter(p => p.id === 'page-main' || p.isHidden === true);
      }
      
      const savedBackgrounds = await localforage.getItem('mySiteBackgrounds_v3');
      if (savedBackgrounds) {
        siteBackgrounds = savedBackgrounds;
      }
      applyBackgrounds();
    }
  } catch(e) {
    console.error('Error loading data from Firebase DB, trying localforage...', e);
    // גיבוי למקרה של שגיאת חיבור
    try {
      const savedActive = await localforage.getItem('myActivePage_v3');
      if (savedActive) activePageId = savedActive;
      const savedPages = await localforage.getItem('mySitePages_v3');
      if (savedPages) pages = savedPages;
      const savedBackgrounds = await localforage.getItem('mySiteBackgrounds_v3');
      if (savedBackgrounds) siteBackgrounds = savedBackgrounds;
      applyBackgrounds();
    } catch (localErr) {
      console.error("Local load failed too", localErr);
    }
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

  // אחרי שהכל נטען (ואולי תוקן), נצייר את האתר
  renderSideMenu();
  renderTopNav();
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
const btnAddLoopVideo = document.getElementById('btn-add-loop-video');
const navLinksContainer = document.querySelector('.nav-links'); // התפריט העליון
// מגה-מנו הוסר לחלוטין
const megaMenuContainer = { classList: { add: ()=>{}, remove: ()=>{} }, style: {}, innerHTML: '' };

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
          
          localforage.setItem('mySiteLogo_v3', dataUrl);
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
  
  // שמירה ל-Firebase Database
  try {
    const dbRef = ref(db, 'website');
    set(dbRef, {
      pages: pages,
      activePageId: activePageId,
      topNavPages: topNavPages,
      navHTML: navHTML,
      siteBackgrounds: siteBackgrounds
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

// פונקציה שמייצרת את תפריט הצד (מייצרת את שורות ה-HTML של הלינקים לפי מערך העמודים)
function renderSideMenu() {
  if (!sideMenuContainer) return; // הדשבורד הוסר
  sideMenuContainer.innerHTML = ''; // מנקים את התפריט הישן
  
  pages.forEach(page => {
    // אם אנחנו לא במצב עריכה והעמוד מוסתר - לא נציג אותו
    if (!isEditMode && page.isHidden) return;

    const li = document.createElement('li'); // יוצרים אלמנט רשימה חדש
    li.id = page.id;
    
    // אם במצב עריכה והעמוד מוסתר, נציג אותו חצי שקוף
    if (isEditMode && page.isHidden) {
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
    if (!isEditMode && page.isHidden) return; // מסתיר עמודים מוסתרים גם למעלה
    
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = page.title.replace(/[\u1000-\uFFFF]+/g, '').trim();
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
  const currentPage = pages.find(p => p.id === activePageId); // מחפשים את העמוד ברשימה
  if (currentPage) {
    mainContent.innerHTML = currentPage.content; // מזריקים את ה-HTML של העמוד פנימה
    
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
    if (confirm('האם אתה בטוח שברצונך לאפס את האתר? כל העמודים והעיצובים השמורים יימחקו לצמיתות.')) {
      try {
        // איפוס מקומי
        await localforage.clear();
        localStorage.clear();
        
        // איפוס ב-Firebase DB (מוחק את הכל ושומר רק עמוד ראשי נקי)
        const dbRef = ref(db, 'website');
        await set(dbRef, {
          pages: [
            {
              id: 'page-main',
              title: 'ראשי',
              content: ''
            }
          ],
          activePageId: 'page-main',
          topNavPages: ['page-main'],
          navHTML: '<a href="#" id="top-nav-main" data-page-id="page-main">ראשי</a>',
          siteBackgrounds: { dashboard: null, topNav: null, main: null }
        });
        
        alert('האתר אופס בהצלחה! העמוד ייטען מחדש כעת.');
        window.location.reload();
      } catch (e) {
        console.error(e);
        alert('שגיאה במהלך האיפוס.');
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
            <video src="${event.target.result}" autoplay loop muted playsinline style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;"></video>
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
                <span contenteditable="plaintext-only" style="font-size:13px; color:#333; text-align:center; font-weight:600;">${dlFile.name}</span>
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
            el.style.borderRadius = '12px'; // קצת יופי
            
            const img = document.createElement('img');
            img.src = event.target.result;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.style.borderRadius = '12px';
            img.style.display = 'block';
            el.appendChild(img);
            
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
    if (user && user.email === ADMIN_EMAIL) {
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
      }
    } else {
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
      }
    }
  }

  // מאזין לשינויי מצב התחברות
  onAuthStateChanged(auth, (user) => {
    updateManagerUI(user);
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
            alert(`התחברת כמשתמש רגיל (${user.email}). רק מנהל מורשה יכול לערוך את האתר.`);
            signOut(auth);
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
          ${text}
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

