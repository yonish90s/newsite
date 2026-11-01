#!/bin/sh
# העלאה מיידית של האתר ל-Firebase Hosting — בלי המגבלה היומית של Vercel.
# בונה את הקבצים (כמו build.sh) ומעלה. אחרי זה האתר זמין ב-https://newsite-f76e2.web.app
# (וגם בדומיין, אחרי שמחברים אותו ל-Firebase Hosting).
#   sh tools/deploy.sh
# לפני ההעלאה: לקדם את ?v= ב-index.html לכל קובץ min שהשתנה (אחרת דפדפנים יגישו גרסה ישנה מהמטמון).
set -e
cd "$(dirname "$0")/.."
sh tools/build.sh
firebase deploy --only hosting --project newsite-f76e2
echo "live: https://newsite-f76e2.web.app"
