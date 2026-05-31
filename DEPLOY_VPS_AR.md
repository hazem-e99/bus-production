# دليل رفع نهائي على VPS (Hostinger) بدون تعديلات كل مرة

الهدف من هذا الدليل:
- تجهيز أول مرة فقط
- بعد ذلك أي تحديث يكون بنفس 4 أوامر ثابتة

معمارية النشر:
- Frontend: el-renad.com
- Backend API: api.el-renad.com
- MongoDB: على نفس السيرفر داخليا

----------------------------------------
## المرحلة A) تجهيز مرة واحدة فقط
----------------------------------------

### ⚡ الطريقة السريعة التلقائية (موصى بها):
لتجهيز السيرفر بالكامل بضغطة واحدة (تنزيل وتفعيل MongoDB 7.0، تثبيت Node.js 20، تثبيت PM2 و Nginx، ضبط جدار الحماية، إنشاء ملفات .env، وبناء الواجهة والخلفية، وعمل Seed لقاعدة البيانات المحلية وتشغيل كل شيء):

1. اسحب المشروع في السيرفر أولاً:
   ```bash
   mkdir -p /var/www ; cd /var/www
   git clone <رابط_المستودع> production2026
   cd /var/www/production2026
   ```
2. نفذ أمر تشغيل السكربت التلقائي كـ root:
   ```bash
   chmod +x deploy/setup-and-deploy.sh
   ./deploy/setup-and-deploy.sh
   ```

*بعد انتهاء السكربت بنجاح، اذهب للخطوة رقم (12) لعمل شهادة الـ SSL مباشرة.*

----------------------------------------
### 🛠️ الطريقة اليدوية (خطوة بخطوة):

### 1) DNS عند شركة الدومين
اعمل السجلات التالية (A Records):
- el-renad.com -> IP السيرفر
- www.el-renad.com -> IP السيرفر
- api.el-renad.com -> IP السيرفر

انتظر انتشار DNS (غالبا من 5 دقائق إلى 30 دقيقة).

### 2) دخول السيرفر

  ssh root@SERVER_IP

### 3) تحديث النظام وتثبيت الأدوات

  apt update ; apt upgrade -y
  apt install -y curl git nginx ufw

### 4) تثبيت Node.js 20 + PM2

  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
  npm i -g pm2
  node -v
  npm -v
  pm2 -v

### 5) تثبيت MongoDB على Ubuntu 22.04 (Jammy)

  curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
  echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
  apt update
  apt install -y mongodb-org
  systemctl enable mongod
  systemctl start mongod
  systemctl status mongod --no-pager
  mongosh --eval "db.runCommand({ ping: 1 })"

### 6) Firewall

  ufw allow OpenSSH
  ufw allow 'Nginx Full'
  ufw --force enable
  ufw status

مهم:
- لا تفتح 27017 ولا 7126 للعالم
- MongoDB والBackend شغالين داخليا فقط

### 7) سحب المشروع

  mkdir -p /var/www ; cd /var/www
  git clone REPO_URL production2026
  cd /var/www/production2026

### 8) إعداد Backend مرة واحدة

  cd /var/www/production2026/backend
  cp .env.example .env
  nano .env

ضع هذا المحتوى (كما هو وعدل JWT_SECRET فقط):

  NODE_ENV=production
  PORT=7126
  MONGODB_URI=mongodb://127.0.0.1:27017/bus-system
  DB_NAME=bus-system
  JWT_SECRET=PUT_LONG_RANDOM_SECRET_HERE
  JWT_EXPIRATION=7d
  CORS_ORIGIN=https://el-renad.com,https://www.el-renad.com
  UPLOAD_DIR=/var/www/production2026/backend/uploads
  MAIL_USER=
  MAIL_PASS=

ثم:

  npm install
  npm run build
  npm run seed

### 9) إعداد Frontend مرة واحدة

  cd /var/www/production2026/frontend
  cp .env.example .env
  nano .env

ضع هذا المحتوى:

  NODE_ENV=production
  NEXT_PUBLIC_APP_URL=https://el-renad.com
  NEXT_PUBLIC_API_BASE_URL=https://api.el-renad.com/api
  NEXT_PUBLIC_BACKEND_ORIGIN=https://api.el-renad.com
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=
  NEXT_PUBLIC_CURRENCY=EGP

ثم:

  npm install
  npm run build

### 10) تشغيل PM2 مرة واحدة

  cd /var/www/production2026
  pm2 start deploy/ecosystem.config.cjs
  pm2 save
  pm2 startup

تحقق:

  pm2 status
  pm2 logs bus-backend --lines 100
  pm2 logs bus-frontend --lines 100

### 11) Nginx مرة واحدة

  cp /var/www/production2026/deploy/nginx/bus-system.conf /etc/nginx/sites-available/bus-system
  ln -s /etc/nginx/sites-available/bus-system /etc/nginx/sites-enabled/bus-system
  nginx -t
  systemctl reload nginx

### 12) SSL مرة واحدة

  apt install -y certbot python3-certbot-nginx
  certbot --nginx -d el-renad.com -d www.el-renad.com -d api.el-renad.com

----------------------------------------
## المرحلة B) تحديثات لاحقة بدون تعديل إعدادات
----------------------------------------

بعد أول مرة، لا تعدل Nginx ولا env كل مرة.
نفذ فقط:

  cd /var/www/production2026
  git pull
  cd backend ; npm install ; npm run build
  cd ../frontend ; npm install ; npm run build
  cd .. ; pm2 restart deploy/ecosystem.config.cjs

أو استخدم السكربت الجاهز (أفضل):

  cd /var/www/production2026
  chmod +x deploy/update-production.sh
  ./deploy/update-production.sh

ولو في migration/seed جديد فقط وقت الحاجة:

  cd /var/www/production2026/backend
  npm run seed

----------------------------------------
## فحص سريع بعد أي تحديث
----------------------------------------

  pm2 status
  systemctl status nginx --no-pager
  systemctl status mongod --no-pager

اختبار URLs:
- https://el-renad.com
- https://api.el-renad.com

----------------------------------------
## أخطاء شائعة وحلها بسرعة
----------------------------------------

1. Nginx يعطي 502
- تحقق أن PM2 شغال
- راجع logs للتطبيقين

2. CORS Error في المتصفح
- راجع CORS_ORIGIN في backend .env
- لازم يحتوي el-renad.com و www.el-renad.com

3. الصور لا تظهر
- راجع NEXT_PUBLIC_BACKEND_ORIGIN في frontend .env
- لازم تكون https://api.el-renad.com

4. التطبيق لا يتصل بMongoDB
- تحقق mongod شغال
- تحقق MONGODB_URI = mongodb://127.0.0.1:27017/bus-system
