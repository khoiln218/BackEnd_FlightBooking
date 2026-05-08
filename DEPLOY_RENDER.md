# Hướng dẫn Deploy BE_FlightBooking lên Render

## Tổng quan

Deploy Express.js API lên **Render** — miễn phí, không cần thẻ, setup đơn giản. Database dùng **Supabase** (PostgreSQL hosted miễn phí).

> **Lưu ý**: Free tier của Render sẽ spin down sau 15 phút không có traffic. Request đầu tiên sau đó sẽ mất ~30-50 giây để cold start.

---

## 1. Chuẩn bị Supabase Project

### 1.1. Tạo Supabase project

1. Vào [https://supabase.com](https://supabase.com) → đăng ký/đăng nhập
2. Click **"New Project"** → nhập tên, password, chọn region gần nhất (Singapore)
3. Đợi ~2 phút để project khởi tạo

### 1.2. Lấy credentials

Vào **Project Settings** → **API**:
- `Project URL` → `SUPABASE_URL`
- `Publishable key` (anon) → `SUPABASE_PUBLISHABLE_KEY`
- `Secret key` (service_role) → `SUPABASE_SECRET_KEY`

### 1.3. Chạy SQL migrations

Vào **SQL Editor** → chạy lần lượt 3 file:

1. `BE_FlightBooking/src/migrations/supabase_schema.sql` — tạo 8 bảng + indexes + `reset_sequence` function
2. `BE_FlightBooking/src/migrations/supabase_rpc_transactions.sql` — 5 transaction RPCs
3. `BE_FlightBooking/src/migrations/supabase_rpc_reports.sql` — 3 report RPCs

Sau khi chạy xong, vào **Database** → **Tables** để verify đã có 8 bảng.

---

## 2. Chuẩn bị code

### Đảm bảo project có các file cần thiết:

- `package.json` — có script `build` và `start`
- `tsconfig.json` — TypeScript config
- Code đã push lên GitHub/GitLab

### Push code lên GitHub (nếu chưa có):

```bash
cd BE_FlightBooking
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/BE_FlightBooking.git
git push -u origin main
```

---

## 3. Tạo tài khoản Render

1. Vào [https://render.com](https://render.com)
2. Đăng ký bằng GitHub (nhanh nhất)
3. Authorize Render truy cập GitHub repos

---

## 4. Tạo Web Service trên Render

### Cách 1: Qua Dashboard (đơn giản nhất)

1. Vào [https://dashboard.render.com](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Chọn **"Build and deploy from a Git repository"**
4. Connect repo `BE_FlightBooking` từ GitHub
5. Cấu hình:

| Field | Giá trị |
|-------|---------|
| **Name** | `doannp-flbooking-api` |
| **Region** | Singapore (Southeast Asia) |
| **Branch** | `main` |
| **Root Directory** | `BE_FlightBooking` (nếu repo chứa cả FE và BE) |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `node dist/server.js` |
| **Instance Type** | Free |

6. Click **"Advanced"** → Thêm Environment Variables:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://your-project-id.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` |
| `JWT_SECRET` | `your_strong_secret_key_here` (random 32+ ký tự) |
| `PORT` | `10000` |
| `CORS_ORIGIN` | `https://your-frontend-domain.com` |
| `NODE_ENV` | `production` |
| `DEBUG` | `false` |

> **Lưu ý**: Render mặc định dùng port `10000`, không phải `4000`.

7. Click **"Create Web Service"**

### Cách 2: Dùng render.yaml (Infrastructure as Code)

Tạo file `render.yaml` ở root của repo:

```yaml
services:
  - type: web
    name: doannp-flbooking-api
    runtime: node
    region: singapore
    plan: free
    rootDir: BE_FlightBooking
    buildCommand: npm install && npm run build
    startCommand: node dist/server.js
    envVars:
      - key: SUPABASE_URL
        sync: false  # Set manually trong Dashboard
      - key: SUPABASE_PUBLISHABLE_KEY
        sync: false
      - key: SUPABASE_SECRET_KEY
        sync: false
      - key: JWT_SECRET
        generateValue: true  # Render tự generate
      - key: PORT
        value: "10000"
      - key: CORS_ORIGIN
        value: https://your-frontend-domain.com
      - key: NODE_ENV
        value: production
      - key: DEBUG
        value: "false"
```

Sau đó vào Dashboard → **"New +"** → **"Blueprint"** → chọn repo.

---

## 5. Kiểm tra sau khi deploy

Render sẽ tự động build và deploy. Sau khi xong:

```bash
# URL sẽ có dạng:
https://doannp-flbooking-api.onrender.com

# Test health check
curl https://doannp-flbooking-api.onrender.com/api/health
# Kết quả: {"status":"ok"}

# Test login
curl -X POST https://doannp-flbooking-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@flightbooking.local","password":"Admin@123"}'
```

Xem logs trực tiếp trên Dashboard → chọn service → tab **"Logs"**.

---

## 6. Seed data (tùy chọn)

Nếu muốn có data mẫu trên production Supabase:

### Cách 1: Chạy seed từ máy local

```bash
cd BE_FlightBooking
# Tạm thời set .env trỏ về production Supabase
# SUPABASE_URL=https://your-project-id.supabase.co
# SUPABASE_SECRET_KEY=sb_secret_...
npm run seed
```

### Cách 2: Seed tự động mỗi lần deploy

Đổi **Start Command** trên Render:

```
node dist/seeds/seed.js && node dist/server.js
```

> **Cảnh báo**: Seed sẽ xóa flights tương lai và regenerate → chỉ dùng cho demo, không dùng cho production thực sự.

---

## 7. Auto Deploy

Render tự động deploy mỗi khi bạn push code lên branch `main`. Không cần làm gì thêm.

Sau mỗi lần thay đổi SQL migrations, cần chạy lại SQL trên Supabase Dashboard — Render không tự làm việc này.

---

## 8. Custom Domain (tùy chọn)

1. Vào Dashboard → chọn service → **"Settings"** → **"Custom Domains"**
2. Thêm domain của bạn
3. Cập nhật DNS record theo hướng dẫn của Render

---

## 9. Ưu điểm Supabase vs SQLite trên Render

| Vấn đề | SQLite | Supabase |
|--------|--------|----------|
| Data persistence | ❌ Mất khi restart (ephemeral filesystem) | ✅ Persistent |
| Concurrent connections | Hạn chế | ✅ Tốt |
| Backup | Thủ công | ✅ Tự động |
| Scale | Chỉ 1 instance | ✅ Nhiều instances OK |
| Chi phí | Free | Free tier (500MB, 50k users) |

---

## Tóm tắt các bước

1. ✅ Tạo Supabase project + chạy 3 SQL migrations
2. ✅ Push code lên GitHub
3. ✅ Tạo tài khoản Render (đăng ký bằng GitHub)
4. ✅ Tạo Web Service, connect repo
5. ✅ Cấu hình build/start commands + env vars (Supabase credentials)
6. ✅ Deploy tự động
7. ✅ Test health check + login
