# Hướng dẫn chạy Automation Test

## Setup

1. **Cài đặt dependencies:**
```cmd
npm install
```

2. **Cấu hình môi trường:**
   - Đảm bảo file `.env` có DATABASE_URL đúng
   - Test sẽ tự động tạo và xóa dữ liệu test

## Chuẩn bị dữ liệu test

**KHÔNG CẦN** tạo dữ liệu thủ công! 

Test framework đã tự động:
- ✅ Tạo test users trước khi chạy test (beforeAll)
- ✅ Xóa test users sau khi test xong (afterAll)

Test users được tạo tự động:
1. `tenant@test.com` - Tenant hợp lệ
2. `landlord@test.com` - Landlord (test cross-role)
3. `admin@test.com` - Admin (test cross-role)
4. `inactive@test.com` - Tenant bị vô hiệu hóa

## Chạy Test

### Chạy tất cả tests:
```cmd
npm test
```

### Chạy test với watch mode (tự động chạy lại khi có thay đổi):
```cmd
npm run test:watch
```

### Chạy test cụ thể:
```cmd
npm test -- auth.test.js
```

### Xem coverage report:
```cmd
npm test -- --coverage
```

## Cấu trúc Test Cases

### Tenant Login Tests (10 test cases):

1. **TC01**: ✅ Login thành công với thông tin hợp lệ
2. **TC02**: ❌ Thiếu email
3. **TC03**: ❌ Thiếu password
4. **TC04**: ❌ Email không tồn tại
5. **TC05**: ❌ Password sai
6. **TC06**: ❌ Sử dụng tài khoản landlord (wrong role)
7. **TC07**: ❌ Tài khoản bị vô hiệu hóa
8. **TC08**: ❌ Email format không hợp lệ
9. **TC09**: ✅ JWT token có thể decode
10. **TC10**: ✅ Response time < 2s

## Expected Results

```
PASS  __tests__/auth.test.js
  Tenant Authentication
    POST /api/auth/tenant/login
      ✓ TC01: Login thành công với thông tin hợp lệ
      ✓ TC02: Login thất bại - thiếu email
      ✓ TC03: Login thất bại - thiếu password
      ✓ TC04: Login thất bại - email không tồn tại
      ✓ TC05: Login thất bại - password sai
      ✓ TC06: Login thất bại - sử dụng tài khoản landlord
      ✓ TC07: Login thất bại - tài khoản bị vô hiệu hóa
      ✓ TC08: Login thất bại - email format không hợp lệ
      ✓ TC09: Token JWT có thể decode được
      ✓ TC10: Response time dưới 2 giây

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```

## Troubleshooting

### Lỗi: Cannot find module '../src/app'
- Đảm bảo đã tạo file `src/app.js`

### Lỗi: Database connection failed
- Kiểm tra DATABASE_URL trong file .env
- Đảm bảo database đang chạy

### Lỗi: Duplicate key violation
- Test đã tự động cleanup
- Nếu vẫn lỗi, xóa thủ công: 
```sql
DELETE FROM public.users WHERE email LIKE '%@test.com';
```

### Test chạy chậm
- Bình thường, vì phải tạo/xóa users trong database
- Mỗi test suite mất ~3-5s

## Mở rộng

Để thêm test cases khác:
1. Tạo file mới trong `__tests__/`
2. Import `app` và `supertest`
3. Viết test cases theo pattern trên

Ví dụ:
- `__tests__/landlord-auth.test.js` - Test login landlord
- `__tests__/rental-post.test.js` - Test CRUD rental posts
- `__tests__/profile.test.js` - Test profile management
