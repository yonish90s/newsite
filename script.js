import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase, ref, set, get, child, onValue, push, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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
let hideCart = false;
let hideChat = false;
let deleteCart = false;
let deleteChat = false;

// פונקציית עזר לבדיקה האם המשתמש המחובר כרגע הוא המנהל המורשה
const isAdmin = () => auth.currentUser && auth.currentUser.email === "yoni98321@gmail.com";

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
    cartHideIcon.textContent = hideCart ? '👁️' : '🙈';
    cartHideIcon.title = hideCart ? 'הצג עגלה' : 'הסתר עגלה';
  }
  if (chatHideIcon) {
    chatHideIcon.textContent = hideChat ? '👁️' : '🙈';
    chatHideIcon.title = hideChat ? 'הצג צ\'אט' : 'הסתר צ\'אט';
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
      if (data.hideCart !== undefined) hideCart = data.hideCart;
      if (data.hideChat !== undefined) hideChat = data.hideChat;
      if (data.deleteCart !== undefined) deleteCart = data.deleteCart;
      if (data.deleteChat !== undefined) deleteChat = data.deleteChat;
      
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

  // הוספת עמוד כתבות אוטומטית אם עוד לא קיים
  if (!pages.find(p => p.content && p.content.includes('articles-page') && !p.content.includes('stories-page') && !p.content.includes('photos-page') && !p.content.includes('courses-page'))) {
    const mainPage = pages.find(p => p.id === 'page-main');
    if (mainPage) {
      mainPage.content = buildArticlesPage(ARTICLES_SAMPLES);
      mainPage.title = 'כתבות';
    } else {
      const newPageId = 'page-articles-' + Date.now();
      pages.unshift({ id: newPageId, title: 'כתבות', content: buildArticlesPage(ARTICLES_SAMPLES) });
      if (!topNavPages.includes(newPageId)) topNavPages.unshift(newPageId);
      activePageId = newPageId;
    }
    saveToStorage();
  }

  // העברת עמוד הכתבות לעמוד הראשי ושינוי שמו ל"כתבות" אם הוא קיים בנפרד
  const mainPage = pages.find(p => p.id === 'page-main');
  const separateArticlesPage = pages.find(p => p.content && p.content.includes('articles-page') && !p.content.includes('stories-page') && !p.content.includes('photos-page') && !p.content.includes('courses-page') && p.id !== 'page-main');
  if (mainPage && separateArticlesPage) {
    mainPage.content = separateArticlesPage.content;
    mainPage.title = 'כתבות';
    pages = pages.filter(p => p.id !== separateArticlesPage.id);
    topNavPages = topNavPages.filter(id => id !== separateArticlesPage.id);
    activePageId = mainPage.id;
    saveToStorage();
  }

  // הוספת עמוד חנות אוטומטית אם עוד לא קיים
  if (!pages.find(p => p.content && p.content.includes('shop-page'))) {
    const shopPage = { id: 'page-shop-' + Date.now(), title: 'חנות', content: buildShopPage(SHOP_SAMPLES) };
    pages.push(shopPage);
    if (!topNavPages.includes(shopPage.id)) topNavPages.push(shopPage.id);
    saveToStorage();
  }

  // הוספת עמוד סיפורים אוטומטית אם עוד לא קיים
  if (!pages.find(p => p.content && p.content.includes('stories-page'))) {
    const storyPage = { id: 'page-stories-' + Date.now(), title: 'סיפורים', content: buildStoriesPage(STORIES_SAMPLES) };
    pages.push(storyPage);
    if (!topNavPages.includes(storyPage.id)) topNavPages.push(storyPage.id);
    saveToStorage();
  }

  // הוספת עמוד תמונות אוטומטית אם עוד לא קיים
  if (!pages.find(p => p.content && p.content.includes('photos-page'))) {
    const photoPage = { id: 'page-photos-' + Date.now(), title: 'תמונות', content: buildPhotosPage(PHOTOS_SAMPLES) };
    pages.push(photoPage);
    if (!topNavPages.includes(photoPage.id)) topNavPages.push(photoPage.id);
    saveToStorage();
  }

  // הוספת עמוד קורסים אוטומטית אם עוד לא קיים
  if (!pages.find(p => p.content && p.content.includes('courses-page'))) {
    const coursePage = { id: 'page-courses-' + Date.now(), title: 'קורסים', content: buildCoursesPage(COURSES_SAMPLES) };
    pages.push(coursePage);
    if (!topNavPages.includes(coursePage.id)) topNavPages.push(coursePage.id);
    saveToStorage();
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

  // החזרת עמוד הבית כעמוד הראשי הפעיל כברירת מחדל ושמירה על דף הכתבות כראשון
  if (pages && pages.length) {
    let pageMap = new Map();
    let madeCleanChanges = false;
    
    pages.forEach(p => {
      // הסרת תווים בלתי נראים ואימוג'ים
      const normalizedTitle = p.title.replace(/[\u200b-\u200d\uFEFF]/g, '').replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').replace(/[\u1000-\uFFFF]+/g, '').trim();
      
      // הסרת עמודי "ראשי" ריקים
      if ((normalizedTitle === 'ראשי' || normalizedTitle === '🏠 ראשי' || normalizedTitle === '🏠ראשי') && (!p.content || p.content.trim() === '')) {
        madeCleanChanges = true;
        return;
      }
      
      if (!normalizedTitle) return;
      
      // מניעת כפילויות של עמודים עם כותרות דומות - מעדיפים תמיד את העמוד שיש בו תוכן
      if (pageMap.has(normalizedTitle)) {
        madeCleanChanges = true;
        const existingPage = pageMap.get(normalizedTitle);
        const existingEmpty = !existingPage.content || existingPage.content.trim() === '';
        const currentEmpty = !p.content || p.content.trim() === '';
        
        if (existingEmpty && !currentEmpty) {
          pageMap.set(normalizedTitle, p); // מחליפים בעמוד שיש לו תוכן אמיתי
        }
      } else {
        pageMap.set(normalizedTitle, p);
      }
    });
    
    let cleanedPages = Array.from(pageMap.values());
    
    // מציאת עמוד הכתבות (מכיל articles-page ולא stories-page)
    let articlesPage = cleanedPages.find(p => p.content && p.content.includes('articles-page') && !p.content.includes('stories-page') && !p.content.includes('photos-page') && !p.content.includes('courses-page'));
    
    if (!articlesPage) {
      articlesPage = cleanedPages[0];
    }
    
    if (articlesPage) {
      // העברת עמוד הכתבות לתחילת התפריט והרשימה
      cleanedPages = [articlesPage, ...cleanedPages.filter(p => p.id !== articlesPage.id)];
      activePageId = articlesPage.id;
    }
    
    pages = cleanedPages;
    topNavPages = pages.map(p => p.id);
    
    if (madeCleanChanges) {
      saveToStorage();
    }
  }

  // אחרי שהכל נטען (ואולי תוקן), נצייר את האתר
  renderSideMenu();
  renderTopNav();
  renderPage();
  updateFABsVisibility();
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
      hideBtn.textContent = page.isHidden ? '👁️' : '🙈';
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
    if (!isEditMode && page.isHidden && !isAdmin()) return; // מסתיר עמודים מוסתרים גם למעלה
    
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = page.title.replace(/[\u1000-\uFFFF]+/g, '').trim();
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
      const telegramLink = document.createElement('a');
      telegramLink.href = 'https://t.me/yhsh98321';
      telegramLink.target = '_blank';
      telegramLink.className = 'nav-telegram-link';
      telegramLink.style.display = 'inline-flex';
      telegramLink.style.alignItems = 'center';
      telegramLink.style.justifyContent = 'center';
      telegramLink.style.padding = '0 10px';
      telegramLink.style.verticalAlign = 'middle';
      telegramLink.title = 'טלגרם';
      telegramLink.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: inherit; display: block;">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>
      `;
      navLinksContainer.appendChild(telegramLink);
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
  
  // הגנה: אם העמוד מוסתר והמשתמש הוא לא מנהל/עורך, מפנים אותו לעמוד הראשי של הכתבות
  if (currentPage && currentPage.isHidden && !isEditMode && !isAdmin()) {
    const articlesPage = pages.find(p => p.content && p.content.includes('articles-page') && !p.content.includes('stories-page') && !p.content.includes('photos-page') && !p.content.includes('courses-page'));
    activePageId = articlesPage ? articlesPage.id : pages[0].id;
    renderPage();
    return;
  }

  if (currentPage) {
    mainContent.innerHTML = currentPage.content; // מזריקים את ה-HTML של העמוד פנימה

    // עמוד כתבות: בונים מחדש מהנתונים השמורים כדי ששינויי מבנה (חיפוש, עיצוב) תמיד ייכנסו
    const artPageEl = mainContent.querySelector('.articles-page:not(.stories-page):not(.photos-page):not(.courses-page)');
    if (artPageEl && typeof buildArticlesPage === 'function') {
      let savedArts = [];
      try { savedArts = JSON.parse(decodeURIComponent(artPageEl.dataset.articlesJson)); } catch(e){}
      if (savedArts.length) mainContent.innerHTML = buildArticlesPage(savedArts);
    }

    // עמוד סיפורים: בונים מחדש מהנתונים השמורים
    const storyPageEl = mainContent.querySelector('.stories-page');
    if (storyPageEl && typeof buildStoriesPage === 'function') {
      let savedStories = [];
      try { savedStories = JSON.parse(decodeURIComponent(storyPageEl.dataset.storiesJson)); } catch(e){}
      if (savedStories.length) mainContent.innerHTML = buildStoriesPage(savedStories);
    }

    // עמוד קורסים: בונים מחדש מהנתונים השמורים
    const coursePageEl = mainContent.querySelector('.courses-page');
    if (coursePageEl && typeof buildCoursesPage === 'function') {
      let savedCourses = [];
      try { savedCourses = JSON.parse(decodeURIComponent(coursePageEl.dataset.coursesJson)); } catch(e){}
      if (savedCourses.length) mainContent.innerHTML = buildCoursesPage(savedCourses);
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
        await set(dbRef, {
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

function artEsc(str) {
  return String(str||'').replace(/\\/g,'\\\\').replace(/'/g,'&#39;').replace(/"/g,'&quot;');
}

function buildArticlesPage(articles) {
  const featured = articles.slice(0, 3);
  const popular = articles.slice(0, 5);

  const featuredHTML = featured.map(a => `
    <div class="art-featured-card" onclick="artOpenDetail('${artEsc(a.id)}')">
      <img src="${a.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80'}" alt="">
      <div class="art-featured-overlay"></div>
      <div class="art-featured-info">
        <span class="art-category-badge" style="background:${a.categoryColor||'#e65100'}">${a.category}</span>
        <h3>${a.title}</h3>
        <div class="art-featured-meta">${a.author} · ${a.timestamp}</div>
      </div>
    </div>
  `).join('');

  const listHTML = articles.map((a) => `
    <div class="art-row" onclick="artOpenDetail('${artEsc(a.id)}')">
      <div class="art-row-text">
        <h3>${a.title}</h3>
        <p>${a.summary}</p>
        <div class="art-row-meta">
          <span>${a.author}</span>
          <span class="art-row-sep">|</span>
          <span>${a.timestamp}</span>
        </div>
      </div>
      <div class="art-row-img-wrap">
        ${a.image ? `<img src="${a.image}" alt="">` : '<div class="art-row-img-placeholder"></div>'}
        ${a.image ? `<button class="art-zoom-btn" onclick="event.stopPropagation();artZoomImage('${artEsc(a.image)}')" title="מסך מלא">⛶</button>` : ''}
        <button class="art-delete-btn" onclick="event.stopPropagation();artDelete('${artEsc(a.id)}',this)">✕</button>
      </div>
    </div>
  `).join('');

  const popularHTML = popular.map((a, i) => `
    <div class="art-popular-item" onclick="artOpenDetail('${artEsc(a.id)}')">
      <span class="art-popular-num">${String(i+1).padStart(2,'0')}</span>
      <div style="flex:1;font-size:13px;font-weight:600;line-height:1.4;color:#222">${a.title}</div>
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
          <button class="art-add-btn" onclick="openArtModal()">+ הוסף כתבה חדשה</button>
        </div>
        <div class="art-sidebar">
          <div class="art-sidebar-box art-newsletter">
            <h4 style="margin:0 0 6px;font-size:16px;font-weight:800">הישארו מעודכנים!</h4>
            <p style="font-size:12px;color:#777;margin:0 0 12px;line-height:1.5">הירשמו לניוזלטר וקבלו עדכונים ישירות למייל.</p>
            <input type="text" placeholder="השם שלכם">
            <input type="email" placeholder="כתובת אימייל">
            <button onclick="alert('תודה על ההרשמה!')">הרשמה לניוזלטר</button>
          </div>
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
        ${r.image ? `<img src="${r.image}" alt="">` : '<div class="art-card-img-placeholder"></div>'}
        <span class="art-rec-badge art-category-badge" style="background:${r.categoryColor||'#e65100'}">${r.category}</span>
      </div>
      <div class="art-rec-text">
        <h4>${r.title}</h4>
        <div class="art-rec-meta">${r.author} · ${r.timestamp}</div>
      </div>
    </div>
  `).join('');

  const json = encodeURIComponent(JSON.stringify(arts));
  mainContent.innerHTML = `
    <div class="art-detail articles-page" data-article-id="${id}" data-articles-json="${json}">
      <div class="art-detail-inner">
        <button class="art-back-btn" onclick="artGoBack()">← חזרה לכתבות</button>
        ${a.image ? `<img class="art-detail-hero" src="${a.image}" alt="">` : ''}
        <div class="art-detail-body">
          <div class="art-meta" style="margin-bottom:12px">
            <span class="art-category-badge" style="background:${a.categoryColor||'#e65100'}">${a.category}</span>
            <span>${a.author}</span>
            <span>·</span>
            <span>${a.timestamp}</span>
          </div>
          <h1 class="art-detail-title">${a.title}</h1>
          <div class="art-detail-content">${bodyHTML}</div>
          ${a.link ? `<a href="${a.link}" target="_blank" class="art-detail-link">קרא באתר המקור ↗</a>` : ''}
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
  renderPage();
}

function artSearch(query) {
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
    const r = new FileReader();
    r.onload = ev => {
      artImgData = ev.target.result;
      const p = document.getElementById('art-img-preview');
      p.src = artImgData; p.style.display = 'block';
      document.getElementById('art-img-pick').textContent = '✓ תמונה נבחרה';
    };
    r.readAsDataURL(f);
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
    <div class="shop-card" ${p.link ? `onclick="window.open('${p.link}','_blank')"` : ''} style="${p.link ? 'cursor:pointer' : ''}">
      <button class="shop-delete-btn" onclick="event.stopPropagation();shopDelete('${artEsc(p.id)}')">✕</button>
      <div class="shop-card-img">
        ${p.image ? `<img src="${p.image}" alt="">` : '<div class="shop-img-placeholder"></div>'}
        <button class="shop-cart-btn" title="הוסף לסל" onclick="event.stopPropagation();shopAddToCart('${artEsc(p.id)}')">${cartSvg}<span class="shop-cart-plus">+</span></button>
      </div>
      <div class="shop-card-info">
        ${p.label ? `<div class="shop-label">${p.label}</div>` : ''}
        <h3 class="shop-name">${p.name}</h3>
        <div class="shop-price">${p.price || ''}</div>
      </div>
    </div>
  `).join('');

  const bestSellers = products.slice(0, 5);
  const bestHTML = bestSellers.map((p, i) => `
    <div class="shop-best-item" ${p.link ? `onclick="window.open('${p.link}','_blank')"` : ''} style="${p.link ? 'cursor:pointer' : ''}">
      <span class="shop-best-num">${String(i+1).padStart(2,'0')}</span>
      ${p.image ? `<img class="shop-best-img" src="${p.image}" alt="">` : ''}
      <div class="shop-best-text">
        <div class="shop-best-name">${p.name}</div>
        <div class="shop-best-price">${p.price || ''}</div>
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
          ${x.image ? `<img src="${x.image}" alt="">` : ''}
          <div class="shop-cart-row-text">
            <div class="shop-cart-row-name">${x.name}</div>
            <div class="shop-cart-row-price">${x.price || ''} ${x.qty > 1 ? '× ' + x.qty : ''}</div>
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
    const r = new FileReader();
    r.onload = ev => {
      shopImgData = ev.target.result;
      const p = document.getElementById('shop-img-preview');
      p.src = shopImgData; p.style.display = 'block';
      document.getElementById('shop-img-pick').textContent = '✓ תמונה נבחרה';
    };
    r.readAsDataURL(f);
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
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80', link: ''
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

function buildStoriesPage(stories) {
  const featured = stories.slice(0, 3);
  const popular = stories.slice(0, 5);

  const featuredHTML = featured.map(s => `
    <div class="art-featured-card" onclick="storyOpenDetail('${artEsc(s.id)}')">
      <img src="${s.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80'}" alt="">
      <div class="art-featured-overlay"></div>
      <div class="art-featured-info">
        <span class="art-category-badge" style="background:${s.categoryColor||'#8b5cf6'}">${s.category}</span>
        <h3>${s.title}</h3>
        <div class="art-featured-meta">${s.author} · ${s.timestamp}</div>
      </div>
    </div>
  `).join('');

  const listHTML = stories.map((s) => `
    <div class="art-row" onclick="storyOpenDetail('${artEsc(s.id)}')">
      <div class="art-row-text">
        <h3>${s.title}</h3>
        <p>${s.summary}</p>
        <div class="art-row-meta">
          <span>${s.author}</span>
          <span class="art-row-sep">|</span>
          <span>${s.timestamp}</span>
        </div>
      </div>
      <div class="art-row-img-wrap">
        ${s.image ? `<img src="${s.image}" alt="">` : '<div class="art-row-img-placeholder"></div>'}
        ${s.image ? `<button class="art-zoom-btn" onclick="event.stopPropagation();artZoomImage('${artEsc(s.image)}')" title="מסך מלא">⛶</button>` : ''}
        <button class="art-delete-btn" onclick="event.stopPropagation();storyDelete('${artEsc(s.id)}',this)">✕</button>
      </div>
    </div>
  `).join('');

  const popularHTML = popular.map((s, i) => `
    <div class="art-popular-item" onclick="storyOpenDetail('${artEsc(s.id)}')">
      <span class="art-popular-num">${String(i+1).padStart(2,'0')}</span>
      <div style="flex:1;font-size:13px;font-weight:600;line-height:1.4;color:#222">${s.title}</div>
    </div>
  `).join('');

  const json = encodeURIComponent(JSON.stringify(stories));
  return `<div class="articles-page stories-page" data-stories-json="${json}">
    <div class="art-inner">
      <div class="art-featured-grid">${featuredHTML}</div>
      <div class="art-layout">
        <div class="art-main">
          <div class="art-search-wrap">
            <input type="text" class="art-search" placeholder="🔍 חיפוש סיפורים..." oninput="storySearch(this.value)">
          </div>
          <div class="art-section-title">כל הסיפורים</div>
          <div class="art-rows">${listHTML}</div>
          <div class="art-no-results" style="display:none">לא נמצאו סיפורים התואמים לחיפוש</div>
          <button class="art-add-btn" onclick="openStoryModal()" style="background:#8b5cf6">+ הוסף סיפור חדש</button>
        </div>
        <div class="art-sidebar">
          <div class="art-sidebar-box art-newsletter">
            <h4 style="margin:0 0 6px;font-size:16px;font-weight:800">הישארו מעודכנים!</h4>
            <p style="font-size:12px;color:#777;margin:0 0 12px;line-height:1.5">הירשמו לקבלת סיפורים חמים ישירות אליכם.</p>
            <input type="text" placeholder="השם שלכם">
            <input type="email" placeholder="כתובת אימייל">
            <button onclick="alert('תודה על ההרשמה!')" style="background:#8b5cf6">הרשמה לעדכונים</button>
          </div>
          <div class="art-sidebar-box">
            <div class="art-sidebar-title">הסיפורים הנקראים ביותר</div>
            ${popularHTML}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function storyOpenDetail(id) {
  const container = mainContent.querySelector('.stories-page');
  if (!container) return;
  let stories = [];
  try { stories = JSON.parse(decodeURIComponent(container.dataset.storiesJson)); } catch(e){ return; }
  const s = stories.find(x => x.id === id);
  if (!s) return;

  const bodyHTML = (s.body || s.summary || '').split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('');

  const recommended = stories.filter(x => x.id !== id).slice(0, 3);
  const recHTML = recommended.map(r => `
    <div class="art-rec-card" onclick="storyOpenDetail('${artEsc(r.id)}')">
      <div class="art-rec-img">
        ${r.image ? `<img src="${r.image}" alt="">` : '<div class="art-card-img-placeholder"></div>'}
        <span class="art-rec-badge art-category-badge" style="background:${r.categoryColor||'#8b5cf6'}">${r.category}</span>
      </div>
      <div class="art-rec-text">
        <h4>${r.title}</h4>
        <div class="art-rec-meta">${r.author} · ${r.timestamp}</div>
      </div>
    </div>
  `).join('');

  const json = encodeURIComponent(JSON.stringify(stories));
  mainContent.innerHTML = `
    <div class="art-detail articles-page stories-page" data-story-id="${id}" data-stories-json="${json}">
      <div class="art-detail-inner">
        <button class="art-back-btn" onclick="storyGoBack()">← חזרה לסיפורים</button>
        ${s.image ? `<img class="art-detail-hero" src="${s.image}" alt="">` : ''}
        <div class="art-detail-body">
          <div class="art-meta" style="margin-bottom:12px">
            <span class="art-category-badge" style="background:${s.categoryColor||'#8b5cf6'}">${s.category}</span>
            <span>${s.author}</span>
            <span>·</span>
            <span>${s.timestamp}</span>
          </div>
          <h1 class="art-detail-title">${s.title}</h1>
          <div class="art-detail-content">${bodyHTML}</div>
          ${s.link ? `<a href="${s.link}" target="_blank" class="art-detail-link">קרא באתר המקור ↗</a>` : ''}
        </div>
        <div class="art-rec-section">
          <h3 style="margin:0 0 16px;font-size:18px;font-weight:800">סיפורים נוספים שיעניינו אותך</h3>
          <div class="art-rec-grid">${recHTML}</div>
        </div>
      </div>
    </div>
  `;
}

function storyGoBack() {
  const container = mainContent.querySelector('.stories-page');
  if (!container) return;
  let stories = [];
  try { stories = JSON.parse(decodeURIComponent(container.dataset.storiesJson)); } catch(e){}
  mainContent.innerHTML = buildStoriesPage(stories);
  if (isEditMode) applyEditModeToContent();
}

function storyGetStories() {
  const container = mainContent.querySelector('.stories-page');
  if (!container) return [];
  try { return JSON.parse(decodeURIComponent(container.dataset.storiesJson)); } catch(e){ return []; }
}

function storyDelete(id, el) {
  if (!isEditMode) return;
  if (!confirm('האם למחוק סיפור זה?')) return;
  const stories = storyGetStories().filter(s => s.id !== id);
  mainContent.innerHTML = buildStoriesPage(stories);
  saveCurrentPageContent();
}

function storySearch(val) {
  const q = (val || '').toLowerCase().trim();
  const rows = mainContent.querySelectorAll('.stories-page .art-row');
  let visible = 0;
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    const match = text.includes(q);
    r.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  const noResults = mainContent.querySelector('.stories-page .art-no-results');
  if (noResults) noResults.style.display = visible === 0 ? 'block' : 'none';
}

let storyImgData = '';

function openStoryModal() {
  if (!isEditMode) return;
  document.getElementById('story-title').value = '';
  document.getElementById('story-summary').value = '';
  document.getElementById('story-body').value = '';
  document.getElementById('story-author').value = '';
  document.getElementById('story-category').value = '';
  document.getElementById('story-link').value = '';
  const preview = document.getElementById('story-img-preview');
  preview.style.display = 'none'; preview.src = '';
  storyImgData = '';
  document.getElementById('story-img-pick').textContent = 'לחץ לבחירת תמונה מהמחשב';
  document.getElementById('story-modal').style.display = 'flex';
}

document.getElementById('story-img-pick').addEventListener('click', () => {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      storyImgData = ev.target.result;
      const p = document.getElementById('story-img-preview');
      p.src = storyImgData; p.style.display = 'block';
      document.getElementById('story-img-pick').textContent = '✓ תמונה נבחרה';
    };
    r.readAsDataURL(f);
  };
  inp.click();
});

document.getElementById('story-cancel').addEventListener('click', () => {
  document.getElementById('story-modal').style.display = 'none';
});

document.getElementById('story-save').addEventListener('click', () => {
  const title = document.getElementById('story-title').value.trim();
  if (!title) { alert('חובה כותרת'); return; }
  const stories = storyGetStories();
  stories.unshift({
    id: 's' + Date.now(),
    title,
    summary: document.getElementById('story-summary').value.trim(),
    body: document.getElementById('story-body').value.trim(),
    author: document.getElementById('story-author').value.trim(),
    category: document.getElementById('story-category').value.trim(),
    categoryColor: '#8b5cf6',
    timestamp: 'הרגע',
    image: storyImgData,
    link: document.getElementById('story-link').value.trim()
  });
  mainContent.innerHTML = buildStoriesPage(stories);
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

// ============================================================
// מערכת תמונות / גלריות (Photos System)
// ============================================================

const PHOTOS_SAMPLES = [
  {
    id: 'ph1',
    title: 'זוהר הקוטב באיסלנד',
    summary: 'אלבום תמונות מרהיב המתעד את האורות הירוקים של הצפון בלילות הקרים של החורף האיסלנדי.',
    images: [
      'https://images.unsplash.com/photo-1483168527879-c66136b56105?w=800&q=80',
      'https://images.unsplash.com/photo-1529963183134-61a90db47eaf?w=800&q=80',
      'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?w=800&q=80',
      'https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?w=800&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80'
    ],
    author: 'אלכס לוין', category: 'טבע', categoryColor: '#10b981', timestamp: 'היום, 16:50'
  },
  {
    id: 'ph2',
    title: 'קצב הרחוב של טוקיו',
    summary: 'סדרת צילומים אורבנית של רובע שיבויה, שלטי הניאון והאנשים בלילה גשום.',
    images: [
      'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&q=80',
      'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?w=800&q=80',
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
      'https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&q=80',
      'https://images.unsplash.com/photo-1518826778787-1636e297f069?w=800&q=80'
    ],
    author: 'יוקי סאטו', category: 'אורבני', categoryColor: '#3b82f6', timestamp: 'אתמול, 22:30'
  }
];

function buildPhotosPage(albums) {
  const featured = albums.slice(0, 3);
  const popular = albums.slice(0, 5);

  const featuredHTML = featured.map(p => {
    const mainImg = p.images && p.images[0] ? p.images[0] : 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80';
    return `
      <div class="art-featured-card" onclick="photoOpenDetail('${artEsc(p.id)}')">
        <img src="${mainImg}" alt="">
        <div class="art-featured-overlay"></div>
        <div class="art-featured-info">
          <span class="art-category-badge" style="background:${p.categoryColor||'#10b981'}">${p.category}</span>
          <h3>${p.title}</h3>
          <div class="art-featured-meta">${p.author} · ${p.timestamp}</div>
        </div>
      </div>
    `;
  }).join('');

  const listHTML = albums.map((p) => {
    const mainImg = p.images && p.images[0] ? p.images[0] : '';
    return `
      <div class="art-row" onclick="photoOpenDetail('${artEsc(p.id)}')">
        <div class="art-row-text">
          <h3>${p.title}</h3>
          <p>${p.summary}</p>
          <div class="art-row-meta">
            <span>${p.author}</span>
            <span class="art-row-sep">|</span>
            <span>${p.timestamp}</span>
          </div>
        </div>
        <div class="art-row-img-wrap">
          ${mainImg ? `<img src="${mainImg}" alt="">` : '<div class="art-row-img-placeholder"></div>'}
          ${mainImg ? `<button class="art-zoom-btn" onclick="event.stopPropagation();artZoomImage('${artEsc(mainImg)}')" title="מסך מלא">⛶</button>` : ''}
          <button class="art-delete-btn" onclick="event.stopPropagation();photoDelete('${artEsc(p.id)}',this)">✕</button>
        </div>
      </div>
    `;
  }).join('');

  const popularHTML = popular.map((p, i) => `
    <div class="art-popular-item" onclick="photoOpenDetail('${artEsc(p.id)}')">
      <span class="art-popular-num">${String(i+1).padStart(2,'0')}</span>
      <div style="flex:1;font-size:13px;font-weight:600;line-height:1.4;color:#222">${p.title}</div>
    </div>
  `).join('');

  const json = encodeURIComponent(JSON.stringify(albums));
  return `<div class="articles-page photos-page" data-photos-json="${json}">
    <div class="art-inner">
      <div class="art-featured-grid">${featuredHTML}</div>
      <div class="art-layout">
        <div class="art-main">
          <div class="art-search-wrap">
            <input type="text" class="art-search" placeholder="🔍 חיפוש גלריות..." oninput="photoSearch(this.value)">
          </div>
          <div class="art-section-title">כל הגלריות והתמונות</div>
          <div class="art-rows">${listHTML}</div>
          <div class="art-no-results" style="display:none">לא נמצאו גלריות התואמות לחיפוש</div>
          <button class="art-add-btn" onclick="openPhotoModal()" style="background:#10b981">+ הוסף גלריה חדשה</button>
        </div>
        <div class="art-sidebar">
          <div class="art-sidebar-box art-newsletter">
            <h4 style="margin:0 0 6px;font-size:16px;font-weight:800">הישארו מעודכנים!</h4>
            <p style="font-size:12px;color:#777;margin:0 0 12px;line-height:1.5">הירשמו לקבלת גלריות מדהימות חדשות ישירות למייל.</p>
            <input type="text" placeholder="השם שלכם">
            <input type="email" placeholder="כתובת אימייל">
            <button onclick="alert('תודה על ההרשמה!')" style="background:#10b981">הרשמה לעדכונים</button>
          </div>
          <div class="art-sidebar-box">
            <div class="art-sidebar-title">הגלריות הנצפות ביותר</div>
            ${popularHTML}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function photoOpenDetail(id) {
  const container = mainContent.querySelector('.photos-page');
  if (!container) return;
  let albums = [];
  try { albums = JSON.parse(decodeURIComponent(container.dataset.photosJson)); } catch(e){ return; }
  const a = albums.find(x => x.id === id);
  if (!a) return;

  const validImages = (a.images || []).filter(img => !!img);
  const mainImg = validImages[0] || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80';

  // יצירת ריבועי דפדוף (Thumbnails)
  const thumbnailsHTML = validImages.map((imgUrl, idx) => `
    <div class="photo-thumb-square" onclick="photoSelectImage('${artEsc(imgUrl)}', this)" style="width:60px; height:60px; border-radius:8px; overflow:hidden; cursor:pointer; border:2.5px solid ${idx === 0 ? '#10b981' : '#ddd'}; transition:all 0.2s; flex-shrink:0;">
      <img src="${imgUrl}" style="width:100%; height:100%; object-fit:cover;">
    </div>
  `).join('');

  const recommended = albums.filter(x => x.id !== id).slice(0, 3);
  const recHTML = recommended.map(r => {
    const rImg = r.images && r.images[0] ? r.images[0] : '';
    return `
      <div class="art-rec-card" onclick="photoOpenDetail('${artEsc(r.id)}')">
        <div class="art-rec-img">
          ${rImg ? `<img src="${rImg}" alt="">` : '<div class="art-card-img-placeholder"></div>'}
          <span class="art-rec-badge art-category-badge" style="background:${r.categoryColor||'#10b981'}">${r.category}</span>
        </div>
        <div class="art-rec-text">
          <h4>${r.title}</h4>
          <div class="art-rec-meta">${r.author} · ${r.timestamp}</div>
        </div>
      </div>
    `;
  }).join('');

  const json = encodeURIComponent(JSON.stringify(albums));
  mainContent.innerHTML = `
    <div class="art-detail articles-page photos-page" data-photo-id="${id}" data-photos-json="${json}">
      <div class="art-detail-inner">
        <button class="art-back-btn" onclick="photoGoBack()">← חזרה לגלריות</button>
        
        <!-- תמונה ראשית גדולה עם מזהה ספציפי -->
        <div style="position:relative; width:100%; max-height:450px; overflow:hidden; border-radius:12px; margin-bottom:12px;">
          <img id="photo-gallery-main-img" src="${mainImg}" style="width:100%; height:auto; max-height:450px; object-fit:cover; display:block;">
        </div>

        <!-- ריבועי דפדוף (Thumbnails) -->
        <div style="display:flex; justify-content:center; gap:10px; margin-bottom:24px; flex-wrap:wrap; padding:5px;">
          ${thumbnailsHTML}
        </div>

        <div class="art-detail-body">
          <div class="art-meta" style="margin-bottom:12px">
            <span class="art-category-badge" style="background:${a.categoryColor||'#10b981'}">${a.category}</span>
            <span>צילום: ${a.author}</span>
            <span>·</span>
            <span>${a.timestamp}</span>
          </div>
          <h1 class="art-detail-title">${a.title}</h1>
          <div class="art-detail-content"><p>${a.summary}</p></div>
        </div>

        <div class="art-rec-section">
          <h3 style="margin:0 0 16px;font-size:18px;font-weight:800">גלריות נוספות שיעניינו אותך</h3>
          <div class="art-rec-grid">${recHTML}</div>
        </div>
      </div>
    </div>
  `;
}

function photoSelectImage(imgUrl, el) {
  const mainImg = document.getElementById('photo-gallery-main-img');
  if (mainImg) {
    mainImg.src = imgUrl;
  }
  const squares = el.parentNode.querySelectorAll('.photo-thumb-square');
  squares.forEach(sq => {
    sq.style.borderColor = '#ddd';
  });
  el.style.borderColor = '#10b981';
}

function photoGoBack() {
  const container = mainContent.querySelector('.photos-page');
  if (!container) return;
  let albums = [];
  try { albums = JSON.parse(decodeURIComponent(container.dataset.photosJson)); } catch(e){}
  mainContent.innerHTML = buildPhotosPage(albums);
  if (isEditMode) applyEditModeToContent();
}

function photoGetAlbums() {
  const container = mainContent.querySelector('.photos-page');
  if (!container) return [];
  try { return JSON.parse(decodeURIComponent(container.dataset.photosJson)); } catch(e){ return []; }
}

function photoDelete(id, el) {
  if (!isEditMode) return;
  if (!confirm('האם למחוק גלריה זו?')) return;
  const albums = photoGetAlbums().filter(a => a.id !== id);
  mainContent.innerHTML = buildPhotosPage(albums);
  saveCurrentPageContent();
}

function photoSearch(val) {
  const q = (val || '').toLowerCase().trim();
  const rows = mainContent.querySelectorAll('.photos-page .art-row');
  let visible = 0;
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    const match = text.includes(q);
    r.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  const noResults = mainContent.querySelector('.photos-page .art-no-results');
  if (noResults) noResults.style.display = visible === 0 ? 'block' : 'none';
}

let photoImgDataList = ['', '', '', '', ''];

function openPhotoModal() {
  if (!isEditMode) return;
  document.getElementById('photo-title').value = '';
  document.getElementById('photo-summary').value = '';
  document.getElementById('photo-author').value = '';
  document.getElementById('photo-category').value = '';
  
  photoImgDataList = ['', '', '', '', ''];
  for (let i = 1; i <= 5; i++) {
    const btn = document.getElementById('photo-img-pick-' + i);
    const prev = document.getElementById('photo-img-preview-' + i);
    btn.style.display = 'block';
    btn.textContent = i + '️⃣';
    prev.style.display = 'none';
    prev.src = '';
  }
  document.getElementById('photo-modal').style.display = 'flex';
}

for (let i = 1; i <= 5; i++) {
  const btn = document.getElementById('photo-img-pick-' + i);
  if (btn) {
    btn.addEventListener('click', () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = e => {
        const f = e.target.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = ev => {
          photoImgDataList[i - 1] = ev.target.result;
          const p = document.getElementById('photo-img-preview-' + i);
          p.src = ev.target.result;
          p.style.display = 'block';
          btn.style.display = 'none';
        };
        r.readAsDataURL(f);
      };
      inp.click();
    });
  }
}

document.getElementById('photo-cancel').addEventListener('click', () => {
  document.getElementById('photo-modal').style.display = 'none';
});

document.getElementById('photo-save').addEventListener('click', () => {
  const title = document.getElementById('photo-title').value.trim();
  if (!title) { alert('חובה כותרת'); return; }
  const validImages = photoImgDataList.filter(img => !!img);
  if (validImages.length === 0) { alert('חובה להעלות לפחות תמונה אחת'); return; }

  const albums = photoGetAlbums();
  albums.unshift({
    id: 'ph' + Date.now(),
    title,
    summary: document.getElementById('photo-summary').value.trim(),
    images: photoImgDataList,
    author: document.getElementById('photo-author').value.trim(),
    category: document.getElementById('photo-category').value.trim(),
    categoryColor: '#10b981',
    timestamp: 'הרגע'
  });
  mainContent.innerHTML = buildPhotosPage(albums);
  saveCurrentPageContent();
  document.getElementById('photo-modal').style.display = 'none';
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
  const featured = courses.slice(0, 3);
  const popular = courses.slice(0, 5);

  const featuredHTML = featured.map(c => `
    <div class="art-featured-card" onclick="courseOpenDetail('${artEsc(c.id)}')">
      <img src="${c.image || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80'}" alt="">
      <div class="art-featured-overlay"></div>
      <div class="art-featured-info">
        <span class="art-category-badge" style="background:${c.categoryColor||'#2196F3'}">${c.category}</span>
        <h3>${c.title}</h3>
        <div class="art-featured-meta">${c.author} · ${c.timestamp}</div>
      </div>
    </div>
  `).join('');

  const listHTML = courses.map((c) => `
    <div class="art-row" onclick="courseOpenDetail('${artEsc(c.id)}')">
      <div class="art-row-text">
        <h3>${c.title}</h3>
        <p>${c.summary}</p>
        <div class="art-row-meta">
          <span>${c.author}</span>
          <span class="art-row-sep">|</span>
          <span>${c.timestamp}</span>
        </div>
      </div>
      <div class="art-row-img-wrap">
        ${c.image ? `<img src="${c.image}" alt="">` : '<div class="art-row-img-placeholder"></div>'}
        ${c.image ? `<button class="art-zoom-btn" onclick="event.stopPropagation();artZoomImage('${artEsc(c.image)}')" title="מסך מלא">⛶</button>` : ''}
        <button class="art-delete-btn" onclick="event.stopPropagation();courseDelete('${artEsc(c.id)}',this)">✕</button>
      </div>
    </div>
  `).join('');

  const popularHTML = popular.map((c, i) => `
    <div class="art-popular-item" onclick="courseOpenDetail('${artEsc(c.id)}')">
      <span class="art-popular-num">${String(i+1).padStart(2,'0')}</span>
      <div style="flex:1;font-size:13px;font-weight:600;line-height:1.4;color:#222">${c.title}</div>
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
          <div class="art-sidebar-box art-newsletter">
            <h4 style="margin:0 0 6px;font-size:16px;font-weight:800">הישארו מעודכנים!</h4>
            <p style="font-size:12px;color:#777;margin:0 0 12px;line-height:1.5">הירשמו לקבלת עדכונים על קורסים חדשים ושיעורים מעניינים.</p>
            <input type="text" placeholder="השם שלכם">
            <input type="email" placeholder="כתובת אימייל">
            <button onclick="alert('תודה על ההרשמה!')" style="background:#2196F3">הרשמה לעדכונים</button>
          </div>
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
      <video src="${videoUrl}" controls autoplay muted playsinline style="width:100%; height:100%; display:block; max-height:450px; object-fit:contain;"></video>
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
        ${r.image ? `<img src="${r.image}" alt="">` : '<div class="art-card-img-placeholder"></div>'}
        <span class="art-rec-badge art-category-badge" style="background:${r.categoryColor||'#2196F3'}">${r.category}</span>
      </div>
      <div class="art-rec-text">
        <h4>${r.title}</h4>
        <div class="art-rec-meta">${r.author} · ${r.timestamp}</div>
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
            <span class="art-category-badge" style="background:${c.categoryColor||'#2196F3'}">${c.category}</span>
            <span>מרצה: ${c.author}</span>
            <span>·</span>
            <span>${c.timestamp}</span>
          </div>
          <h1 class="art-detail-title">${c.title}</h1>
          <div class="art-detail-content"><p>${c.summary}</p></div>
        </div>

        <div class="art-rec-section">
          <h3 style="margin:0 0 16px;font-size:18px;font-weight:800">שיעורים נוספים שיעניינו אותך</h3>
          <div class="art-rec-grid">${recHTML}</div>
        </div>
      </div>
    </div>
  `;
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
    timestamp: 'הרגע'
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

function artZoomImage(imgUrl) {
  let lightbox = document.getElementById('lightbox-modal');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'lightbox-modal';
    lightbox.style.position = 'fixed';
    lightbox.style.inset = '0';
    lightbox.style.background = 'rgba(0,0,0,0.9)';
    lightbox.style.zIndex = '999999';
    lightbox.style.display = 'flex';
    lightbox.style.alignItems = 'center';
    lightbox.style.justifyContent = 'center';
    lightbox.style.cursor = 'zoom-out';
    
    const img = document.createElement('img');
    img.id = 'lightbox-img';
    img.style.maxWidth = '95%';
    img.style.maxHeight = '95%';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 5px 25px rgba(0,0,0,0.5)';
    
    lightbox.appendChild(img);
    lightbox.onclick = () => {
      lightbox.style.display = 'none';
    };
    document.body.appendChild(lightbox);
  }
  
  const img = document.getElementById('lightbox-img');
  img.src = imgUrl;
  lightbox.style.display = 'flex';
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
          <span class="user-name">${chat.userName || 'משתמש'}</span>
          ${hasUnread ? '<span class="unread-dot"></span>' : ''}
        </div>
        <span class="user-email">${chat.userEmail || ''}</span>
        <div style="font-size:12px;color:#888;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${chat.lastMessage || 'אין הודעות'}
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
        <div class="chat-msg-text">${m.text}</div>
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

