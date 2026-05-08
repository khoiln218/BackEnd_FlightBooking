# Flight Booking Backend API

Backend API cho hệ thống đặt vé máy bay, xây dựng bằng **Express + TypeScript + Supabase (PostgreSQL)**.

## Yêu cầu

- Node.js >= 18
- npm >= 9
- Docker Desktop (cho development local với Supabase)

---

## Cài đặt

### Cách 1: Local Development (recommend — setup 1 lần duy nhất)

```cmd
cd BE_FlightBooking
scripts\setup-local-supabase.bat
```

Script tự động:
1. Cài npm dependencies
2. Cài Supabase CLI (devDependency)
3. Init Supabase + start Docker containers
4. Chạy 3 SQL migrations
5. Tạo `.env` với local credentials
6. Seed data

Lần đầu chạy mất ~10 phút để pull Docker images (~2-3GB).

### Cách 2: Kết nối Supabase Cloud

```bash
# 1. Tạo project tại https://supabase.com
# 2. Chạy 3 file SQL migration trên Supabase Dashboard → SQL Editor:
#    - src/migrations/supabase_schema.sql
#    - src/migrations/supabase_rpc_transactions.sql
#    - src/migrations/supabase_rpc_reports.sql

# 3. Cài dependencies
npm install

# 4. Tạo .env với credentials từ Supabase Dashboard → Settings → API
cp .env.example .env
# Điền SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY

# 5. Seed data
npm run seed
```

---

## Chạy dự án

```bash
# Development (auto-reload)
npm run dev

# Production
npm run build
npm start
```

Server chạy tại: `http://localhost:4000`

---

## Scripts

### NPM scripts

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Start server với ts-node-dev (auto-reload) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Chạy production build |
| `npm test` | Chạy Jest tests |
| `npm run seed` | Seed data mẫu (generate flights từ hôm nay → cuối năm) |

### Supabase local scripts (Windows)

| Script | Mô tả |
|--------|-------|
| `scripts/setup-local-supabase.bat` | Setup đầy đủ lần đầu (install + init + start + migrations + seed) |
| `scripts/supabase-start.bat` | Start local Supabase (data cũ còn nguyên) |
| `scripts/supabase-start-with-sql.bat` | Start + chạy lại SQL migrations |
| `scripts/supabase-stop.bat` | Stop local Supabase |

### Local URLs

| Service | URL |
|---------|-----|
| API | http://localhost:4000 |
| Supabase Studio | http://127.0.0.1:54323 |
| Supabase API | http://127.0.0.1:54321 |
| PostgreSQL | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

---

## API Endpoints

### Auth — `/api/auth`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | /register | Public | Đăng ký |
| POST | /login | Public | Đăng nhập |
| GET | /profile | JWT | Xem profile |
| PUT | /change-password | JWT | Đổi mật khẩu |

### Airline — `/api/airlines` + `/api/admin/airlines`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | /airlines | Public | Danh sách hãng bay |
| POST | /admin/airlines | Admin | Tạo hãng bay |
| PUT | /admin/airlines/:id | Admin | Cập nhật |
| DELETE | /admin/airlines/:id | Admin | Xóa (fail nếu còn flights) |

### Airport — `/api/airports` + `/api/admin/airports`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | /airports | Public | Danh sách sân bay |
| POST | /admin/airports | Admin | Tạo sân bay |
| PUT | /admin/airports/:id | Admin | Cập nhật |
| DELETE | /admin/airports/:id | Admin | Xóa (fail nếu còn flights) |

### Flight — `/api/flights` + `/api/admin/flights`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | /flights/search | Public | Tìm chuyến bay (pagination + filters) |
| GET | /flights/:id | Public | Chi tiết |
| GET | /flights/:id/seats | Public | Danh sách ghế |
| POST | /admin/flights | Admin | Tạo chuyến bay |
| PUT | /admin/flights/:id | Admin | Cập nhật |
| DELETE | /admin/flights/:id | Admin | Xóa |

### Booking — `/api/bookings` + `/api/admin/bookings`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | /bookings | Customer | Đặt vé |
| GET | /bookings | Customer | Lịch sử |
| GET | /bookings/:id | Customer | Chi tiết |
| POST | /bookings/:id/cancel | Customer | Hủy |
| GET | /admin/bookings | Admin | Xem tất cả |
| PUT | /admin/bookings/:id/status | Admin | Cập nhật trạng thái |
| POST | /admin/bookings/flight/:id/cancel | Admin | Hủy chuyến bay |

### Payment — `/api/payments`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | /payments | Customer | Thanh toán |
| GET | /payments/booking/:bookingId | Customer | Xem payment |

### Report — `/api/admin/reports`
| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | /reports/airline | Admin | Doanh thu theo hãng bay |
| GET | /reports/route | Admin | Doanh thu theo tuyến bay |
| GET | /reports/monthly | Admin | Doanh thu theo tháng |

Test API bằng Postman collections trong `postman/`.

---

## Cấu trúc thư mục

```
BE_FlightBooking/
├── src/
│   ├── app.ts                  # Express app setup
│   ├── server.ts               # Entry point
│   ├── config/database.ts      # Supabase client
│   ├── Auth/                   # Module auth
│   ├── AirlineCtrl/            # Module airline (CRUD)
│   ├── AirportCtrl/            # Module airport (CRUD)
│   ├── FlightCtrl/             # Module flight
│   ├── BookingCtrl/            # Module booking
│   ├── PaymentCtrl/            # Module payment
│   ├── ReportCtrl/             # Module report
│   ├── migrations/             # SQL files cho Supabase
│   │   ├── supabase_schema.sql
│   │   ├── supabase_rpc_transactions.sql
│   │   └── supabase_rpc_reports.sql
│   ├── seeds/seed.ts           # Seed dữ liệu mẫu
│   └── shared/                 # Middlewares, utils, types
├── tests/                      # Jest tests
├── scripts/                    # Setup + Supabase management scripts
├── postman/                    # Postman collections
├── supabase/                   # Supabase CLI config (local)
└── create_document/            # BRD, guides, lessons (exclude khỏi public copy)
```

---

## Biến môi trường

| Biến | Mô tả | Mặc định |
|------|-------|----------|
| `SUPABASE_URL` | URL của Supabase project | Bắt buộc |
| `SUPABASE_PUBLISHABLE_KEY` | Public/anon key | Bắt buộc (hoặc SECRET_KEY) |
| `SUPABASE_SECRET_KEY` | Service role key (server-side, bypass RLS) | Ưu tiên hơn PUBLISHABLE_KEY |
| `JWT_SECRET` | Secret key cho JWT | Bắt buộc |
| `PORT` | Port server | 4000 |
| `CORS_ORIGIN` | Domain frontend được phép | http://localhost:3000 |
| `DEBUG` | Bật log debug | false |

Xem `.env.example` để có template đầy đủ.

---

## Tài khoản mẫu (sau khi seed)

| Role | Email | Mật khẩu |
|------|-------|----------|
| Admin | admin@flightbooking.local | Admin@123 |
| Customer | nguyenvana@example.local | Customer@123 |
| Customer | tranthib@example.local | Customer@123 |
| Customer | levanc@example.local | Customer@123 |

---

## Tài liệu

- `DEPLOY_RENDER.md` (root) — Hướng dẫn deploy lên Render + Supabase
- `create_document/CODEBASE_GUIDE.md` — Hướng dẫn chi tiết codebase
- `create_document/lessons/` — 10 bài học từ cơ bản đến nâng cao

---

## Chạy test

```bash
npm test
```
