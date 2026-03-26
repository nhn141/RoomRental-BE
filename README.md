# RoomRental — Backend API

RESTful API server cho hệ thống quản lý thuê phòng trọ. Xử lý xác thực, quản lý bài đăng cho thuê, hợp đồng, hồ sơ người dùng và gợi ý phòng.

## Tech Stack

| Công nghệ | Phiên bản | Mục đích |
|------------|-----------|----------|
| Node.js | >= 18 | Runtime |
| Express | 5 | Web framework |
| PostgreSQL | — | Database chính (Supabase) |
| Redis | — | Caching |
| JWT | — | Xác thực (Authentication) |
| bcrypt | 6 | Hash mật khẩu |
| Nodemailer | 7 | Gửi email (đặt lại mật khẩu) |
| Jest | 30 | Unit testing |

## Yêu cầu hệ thống

- **Node.js** >= 18
- **npm** >= 9
- **PostgreSQL** (hoặc Supabase)
- **Redis** (tuỳ chọn, dùng cho caching)

## Cài đặt & Chạy

```bash
# 1. Clone repo & vào thư mục BE
cd RoomRental-BE

# 2. Cài dependencies
npm install

# 3. Tạo file env
cp .env.example .env
# Hoặc tạo file .env thủ công với các biến bên dưới

# 4. Chạy development server (auto-reload)
npm run dev
```

Server chạy tại `http://localhost:4000`.

## Biến môi trường

Tạo file `.env` ở thư mục gốc với các biến sau:

```env
# Server
PORT=4000
CLIENT_URL=http://localhost:3000

# Database (PostgreSQL connection string)
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Email (SMTP - dùng cho đặt lại mật khẩu)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

> **Lưu ý:** File `.env` chứa thông tin nhạy cảm và **không** được commit vào git.

## Scripts

| Lệnh | Mô tả |
|-------|--------|
| `npm run dev` | Chạy dev server với nodemon (auto-reload) |
| `npm start` | Chạy production server |
| `npm test` | Chạy tests với coverage |
| `npm run test:watch` | Chạy tests ở chế độ watch |

## Cấu trúc thư mục

```
src/
├── config/              # Cấu hình (database, redis, email, ...)
├── controllers/         # Route handlers — nhận request, trả response
├── services/            # Business logic
├── repositories/        # Data access layer (SQL queries)
├── models/              # Database models / schemas
├── middleware/           # Auth middleware, error handling
├── routes/              # Route definitions
│   ├── auth.js          #   POST /api/auth/* (login, register, password reset)
│   ├── profile.js       #   GET/PUT /api/profile/*
│   ├── rentalPost.js    #   CRUD /api/rental-posts/*
│   ├── contract.js      #   CRUD /api/contracts/*
│   ├── admin.js         #   GET/POST /api/admins/*
│   └── location.js      #   GET /api/locations/*
├── utils/               # Utility functions
├── db/                  # Database migrations / seeds
├── app.js               # Express app setup (middleware, routes)
└── index.js             # Entry point (start server)
```

## API Endpoints

| Module | Base Path | Mô tả |
|--------|-----------|--------|
| Auth | `/api/auth` | Đăng ký, đăng nhập, đặt lại mật khẩu |
| Profile | `/api/profile` | Xem & cập nhật hồ sơ cá nhân |
| Rental Posts | `/api/rental-posts` | CRUD bài đăng, duyệt/từ chối, gợi ý phòng |
| Contracts | `/api/contracts` | Tạo, xem, cập nhật, kết thúc hợp đồng |
| Admin | `/api/admins` | Quản lý người dùng, xem tất cả hợp đồng |
| Locations | `/api/locations` | Tra cứu tỉnh/thành phố, phường/xã |

## Kiến trúc

```
Request → Route → Controller → Service → Repository → Database
                                  ↓
                              Redis Cache
```

Kiến trúc 3 lớp (Layered Architecture):
- **Controller**: Nhận request, validate input, trả response
- **Service**: Chứa business logic
- **Repository**: Truy vấn database (SQL)
