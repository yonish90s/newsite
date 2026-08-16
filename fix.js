const fs = require('fs');
let code = fs.readFileSync('script.js', 'utf8');

// 1. mousedown
code = code.replace(
  `mainContent.addEventListener('mousedown', (e) => {\n  // בודקים שלחצו בדיוק על משטח העבודה`,
  `mainContent.addEventListener('mousedown', (e) => {\n  if (!isEditMode) return;\n  // בודקים שלחצו בדיוק על משטח העבודה`
);

// 2. mousemove
code = code.replace(
  `mainContent.addEventListener('mousemove', (e) => {\n  if (!isDrawingSelection || !selectionBox) return;`,
  `mainContent.addEventListener('mousemove', (e) => {\n  if (!isEditMode || !isDrawingSelection || !selectionBox) return;`
);

// 3. interact move
code = code.replace(
  `move(event) {\n        const target = event.target;`,
  `move(event) {\n        if (!isEditMode) return;\n        const target = event.target;`
);

// 4. default to manager mode at the end of initSite
code = code.replace(
  `// אחרי שהכל נטען (ואולי תוקן), נצייר את האתר\n  renderSideMenu();\n  renderPage();\n}`,
  `// אחרי שהכל נטען (ואולי תוקן), נצייר את האתר\n  renderSideMenu();\n  renderPage();\n\n  // ברירת מחדל: הפעלת מצב עריכה/מנהל עם כניסה לאתר\n  if (!isEditMode && btnEditMode) {\n    btnEditMode.click();\n  }\n}`
);

fs.writeFileSync('script.js', code);
console.log("Applied features successfully.");
