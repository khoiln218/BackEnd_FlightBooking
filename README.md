# Full Flight Booking

Hệ thống đặt vé máy bay — full-stack project.

## Cấu trúc

```
Full_FlightBooking/
├── BE_FlightBooking/              # Backend API (Express + TypeScript + Supabase)
│   ├── src/                       # Source code
│   ├── tests/                     # Jest tests
│   ├── scripts/                   # Setup + Supabase management scripts
│   ├── postman/                   # Postman collections
│   ├── supabase/                  # Supabase CLI config (local)
│   └── create_document/           # Docs: BRD, guides, lessons (exclude khỏi public copy)
├── Public_BackEnd_FlightBooking/  # Bản copy public của backend (gitignored)
├── scripts/
│   ├── clean.bat / clean.sh       # Xóa resources có thể rebuild (node_modules, dist, supabase runtime)
│   └── ...
├── DEPLOY_RENDER.md               # Hướng dẫn deploy backend lên Render
├── copy-to-public.bat             # Script copy source sang folder public
└── README.md                      # File này
```

## Backend

Xem `BE_FlightBooking/README.md` để biết chi tiết setup, chạy, test.

Quick start local:

```cmd
cd BE_FlightBooking
scripts\setup-local-supabase.bat
npm run dev
```

## Maintenance

### Clean rebuildable resources

Xóa các folder/file có thể tạo lại từ source (node_modules, dist, supabase runtime, public copy):

```cmd
scripts\clean.bat
```

Sau khi clean, chạy lại `cd BE_FlightBooking && npm install` để restore dependencies.

## Deploy

Xem `DEPLOY_RENDER.md` để deploy backend lên Render + Supabase (miễn phí).

## Tech Stack

- **Backend**: Node.js + TypeScript + Express.js
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT + bcrypt
- **Testing**: Jest + fast-check (property-based testing)
- **Dev**: ts-node-dev, Supabase CLI, Docker

## API Modules

| Module | Public endpoints | Admin endpoints |
|--------|------------------|-----------------|
| Auth | register, login, profile, change-password | — |
| Airlines | list | create, update, delete |
| Airports | list | create, update, delete |
| Flights | search, detail, seats | create, update, delete |
| Bookings | create, list, detail, cancel | list all, update status, cancel flight |
| Payments | process, view by booking | — |
| Reports | — | revenue by airline/route/monthly |

Xem `BE_FlightBooking/README.md` để biết full URLs và request/response format.
