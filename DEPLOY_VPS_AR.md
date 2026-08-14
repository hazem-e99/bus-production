# دليل النشر على VPS — El Renad Bus System (el-renad.com)

نظام النشر بالكامل مؤتمت داخل مجلد `deploy/`. أمر واحد يجهز السيرفر من الصفر
ويشغّل كل شيء، وهو نفس الأمر الذي تستخدمه لاحقًا لأي تحديث.

## المعمارية

| الطبقة | التفاصيل |
|---|---|
| Frontend | Next.js 15 (SSR)، يعمل عبر `next start` على المنفذ الداخلي `3000` |
| Backend | NestJS 10 + Mongoose، يعمل عبر `node dist/main.js` على المنفذ الداخلي `7126` |
| قاعدة البيانات | MongoDB (محلي على نفس السيرفر)، قاعدة `bus-system` |
| الدومين | `https://el-renad.com` (الواجهة + `/api` + `/uploads` + `/socket.io`) |
| `www.el-renad.com` | إعادة توجيه 301 إلى `el-renad.com` |
| العملية | كل من الـ backend والـ frontend يعملان كخدمتَي systemd تحت مستخدم غير جذري `elrenad` |
| الويب سيرفر | Nginx كـ reverse proxy أمام الاثنين، مع شهادة SSL من Let's Encrypt |

الواجهة والـ API على نفس الدومين (`el-renad.com/api`) بدل استخدام
`api.el-renad.com` — هذا يلغي الحاجة لإعداد CORS بين نطاقين، ويقلل عدد
سجلات الـ DNS وشهادات SSL المطلوبة.

---

## المرحلة أ) أول نشر على سيرفر جديد

### 1) الدخول على السيرفر وسحب المشروع

```bash
ssh root@SERVER_IP
mkdir -p /opt && cd /opt
git clone https://github.com/hazem-e99/bus-production.git
cd bus-production
```

> يفضَّل استنساخ المشروع في مسار يمكن لأي مستخدم آخر المرور منه (مثل
> `/opt/bus-production` أو `/var/www/bus-production`) بدلاً من `/root/...`،
> لأن خدمة التطبيق تعمل تحت مستخدم مخصص غير جذري (`elrenad`) ويحتاج صلاحية
> عبور (`x`) على كل مجلد أب. إذا استنسخته داخل `/root` سيطبع السكربت تحذيرًا
> واضحًا بالحل بدل الفشل الصامت.

### 2) أمر النشر الوحيد

```bash
sudo ./deploy/deploy.sh
```

هذا السكربت يقوم تلقائيًا بكل شيء:

1. يتحقق من إصدار أوبنتو ويهيّئ مستخدم النظام `elrenad` والمجلدات اللازمة.
2. يثبّت الحزم الأساسية (Nginx، Certbot، git، build-essential...).
3. يثبّت Node.js 22 (LTS) عبر NodeSource.
4. يولّد أسرارًا عشوائية آمنة (JWT، كلمة مرور مستخدم MongoDB) ويحفظها خارج
   المستودع في `/etc/elrenad/secrets.env` (صلاحيات 600، جذر فقط).
5. يثبّت MongoDB محليًا، يقفله على `127.0.0.1` فقط، ويفعّل صلاحيات الدخول
   (`authorization: enabled`) بمستخدم تطبيق مخصص (`elrenad_app`) بصلاحية
   `readWrite` على قاعدة `bus-system` فقط — **وليس** حساب المشرف الأعلى.
6. يُنشئ `backend/.env` و`frontend/.env` عند أول تشغيل فقط (لا يمسهما بعد
   ذلك أبدًا — هذا ما يحافظ على الأسرار بين عمليات النشر).
7. يربط `backend/uploads` برابط رمزي (`symlink`) إلى تخزين دائم خارج
   المستودع (`/var/lib/elrenad/uploads`) — الصور المرفوعة لا تُحذف أبدًا عند
   إعادة النشر.
8. يثبّت الحزم ويبني الـ backend ثم الـ frontend (`npm ci && npm run build`).
9. يُنشئ حساب المشرف `admin@elrenad.com` (أو يتأكد من صلاحياته إن كان
   موجودًا) عبر سكربت idempotent يستخدم موديل المستخدم الحقيقي وتشفير bcrypt
   نفسه المستخدم في تسجيل الدخول.
10. يثبّت خدمتَي systemd (`elrenad-backend`, `elrenad-frontend`) ويشغّلهما.
11. يضبط جدار الحماية UFW (يسمح فقط بـ SSH و80 و443).
12. يضبط Nginx ويتحقق من صحة الإعداد قبل أي `reload`.
13. يكتشف IP السيرفر العام ويقارنه بـ DNS الحالي للدومين.
14. إذا كان DNS صحيحًا: يصدر شهادة SSL عبر Certbot تلقائيًا ويفعّل التجديد
    التلقائي. إذا لم يكن DNS جاهزًا بعد: يطبع لك بالضبط السجلات المطلوبة
    ويكمل النشر على HTTP بدون توقف.
15. يشغّل فحوصات صحة شاملة (Mongo، Nginx، الخدمتان، واستجابة API فعليًا).

السكربت **آمن لإعادة التشغيل** في أي وقت — لا يحذف بيانات، لا يكرر حساب
المشرف، لا يعيد توليد الأسرار، ولا يصدر شهادة SSL مكررة.

### 3) إعداد DNS

عند مزوّد الدومين أنشئ:

```
A     @       <IP السيرفر العام>
A     www     <IP السيرفر العام>
```

(استخدم A record لكل من `@` و`www` — ليس CNAME — لأن كلاهما يشير لنفس IP
السيرفر مباشرة.)

إذا شغّلت `deploy.sh` قبل ضبط DNS، سيخبرك بذلك بوضوح ويتجاوز خطوة SSL فقط.
بعد انتشار DNS (عادة 5–30 دقيقة) نفّذ نفس الأمر مرة أخرى:

```bash
sudo ./deploy/deploy.sh
```

وسيكمل إصدار الشهادة تلقائيًا دون التأثير على أي شيء آخر يعمل بالفعل.

### 4) تسجيل الدخول

```
البريد:     admin@elrenad.com
كلمة المرور: elrenad99
```

**غيّر كلمة المرور هذه فور أول تسجيل دخول من داخل لوحة التحكم.** كلمة
المرور الابتدائية موجودة فقط كنص عادي في ملف محمي على السيرفر نفسه
(`/etc/elrenad/secrets.env`, صلاحيات 600) — لا وجود لها في Git، ولا تُطبع في
أي سجل (log)، وقاعدة البيانات لا تخزّنها إلا كـ bcrypt hash.

---

## المرحلة ب) أي تحديث لاحق

```bash
cd bus-production
git pull
sudo ./deploy/deploy.sh
```

نفس الأمر بالضبط. عند إعادة التشغيل سيقوم فقط بما تغيّر فعليًا: يعيد تثبيت
الحزم إذا تغيّر `package-lock.json`، يعيد البناء، يعيد تشغيل الخدمتين، ويترك
كل شيء آخر (قاعدة البيانات، الأسرار، الشهادة، الملفات المرفوعة) كما هو.

---

## أوامر التشغيل اليومي

### الحالة العامة

```bash
sudo ./deploy/status.sh
```

يعرض حالة كل خدمة، مساحة القرص، الذاكرة، المنافذ المفتوحة، وتاريخ انتهاء شهادة SSL.

### السجلات (Logs)

```bash
./deploy/logs.sh backend
./deploy/logs.sh frontend
./deploy/logs.sh nginx
./deploy/logs.sh mongo
```

### إعادة تشغيل التطبيق فقط

```bash
sudo ./deploy/restart.sh
```

لإعادة تشغيل Nginx وMongoDB أيضًا:

```bash
sudo ./deploy/restart.sh --all
```

### نسخة احتياطية

```bash
sudo ./deploy/backup.sh
```

ينسخ احتياطيًا: قاعدة MongoDB كاملة (`mongodump`)، الملفات المرفوعة، وملفات
`.env`. يُخزَّن كل شيء في `/var/backups/elrenad/<التاريخ_والوقت>/` مع
الاحتفاظ بآخر 14 نسخة فقط. النسخ الاحتياطي للقراءة فقط — لا يغيّر شيئًا في
قاعدة البيانات الحيّة.

**لاستعادة نسخة احتياطية من MongoDB (يدويًا فقط، لا تشغّل هذا تلقائيًا):**

```bash
source /etc/elrenad/secrets.env
mongorestore \
  --uri="mongodb://elrenad_app:${MONGO_APP_PASSWORD}@127.0.0.1:27017/bus-system?authSource=bus-system" \
  --drop \
  /var/backups/elrenad/<التاريخ_والوقت>/mongodb/bus-system
```

`--drop` يستبدل كل مجموعة (collection) موجودة بمحتوى النسخة الاحتياطية —
استخدمها فقط عندما تنوي فعلاً التراجع عن بيانات الإنتاج الحالية.

---

## استكشاف الأخطاء

**Nginx يعطي 502 Bad Gateway**
```bash
sudo ./deploy/status.sh          # هل elrenad-backend/elrenad-frontend فعّالة؟
./deploy/logs.sh backend
./deploy/logs.sh frontend
```

**قاعدة البيانات لا تتصل**
```bash
systemctl status mongod --no-pager
./deploy/logs.sh mongo
```
تأكد أن `MONGODB_URI` داخل `backend/.env` يطابق كلمة المرور الموجودة في
`/etc/elrenad/secrets.env` (يجب ألا تتغيّر هذه الملفات يدويًا عادةً).

**الصور المرفوعة (صور البروفايل) لا تظهر**
تأكد أن `backend/uploads` رابط رمزي فعليًا:
```bash
ls -la backend/uploads   # يجب أن يظهر -> /var/lib/elrenad/uploads
```

**"another deployment is already running"**
هناك تشغيل سابق لـ `deploy.sh` لم ينته بعد (أو تعطّل بشكل غير متوقع). انتظر
انتهاءه، أو تحقق يدويًا:
```bash
ps aux | grep deploy.sh
```

**الخدمة تفشل بسبب صلاحيات (Permission denied)**
غالبًا لأن المستودع مستنسخ داخل مسار لا يستطيع المستخدم `elrenad` المرور منه
(مثل `/root/...`). شغّل `sudo ./deploy/deploy.sh` وسيطبع لك بالضبط أي مجلد
يحتاج `chmod o+x`، أو انقل المستودع إلى `/opt/bus-production` وأعد التشغيل.

---

## ملاحظات أمنية مهمة

- MongoDB لا يستمع إلا على `127.0.0.1` — غير متاح من الإنترنت إطلاقًا، ولا
  حاجة لفتح المنفذ 27017 في جدار الحماية (ولم يُفتح).
- منفذا التطبيق الداخليان (`3000` للـ frontend، `7126` للـ backend) مربوطان
  على `127.0.0.1` فقط؛ Nginx هو الوحيد الذي يتحدث معهما.
- الخدمتان تعملان تحت مستخدم نظام غير جذري (`elrenad`)، وليس root.
- `backend/.env` و`frontend/.env` و`/etc/elrenad/secrets.env` كلها خارج Git
  (`.gitignore`) ولا تُدفع أبدًا للمستودع.
- Nginx يرفض تقديم أي ملف يبدأ اسمه بنقطة (`.env`, `.git`, ...).
- شهادات SSL تتجدد تلقائيًا عبر `certbot.timer`.
