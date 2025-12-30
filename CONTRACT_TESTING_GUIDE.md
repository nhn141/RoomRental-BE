# CONTRACT MANAGEMENT - POSTMAN TESTING GUIDE

Base URL: `http://localhost:4000/api`
Auth Header: `Authorization: Bearer {access_token}`

---

## 1. CREATE CONTRACT (Tenant tạo hợp đồng mới)

**Endpoint:** `POST /contracts`

**Method:** POST

**Headers:**
```
Authorization: Bearer {tenant_access_token}
Content-Type: application/json
```

**Body:**
```json
{
  "post_id": "550e8400-e29b-41d4-a716-446655440000",
  "start_date": "2025-01-01",
  "end_date": "2026-01-01",
  "monthly_rent": 5000000,
  "deposit_amount": 10000000,
  "contract_url": "https://example.com/contract.pdf"
}
```

**cURL Command:**
```bash
curl -X POST http://localhost:4000/api/contracts \
  -H "Authorization: Bearer {tenant_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "post_id": "550e8400-e29b-41d4-a716-446655440000",
    "start_date": "2025-01-01",
    "end_date": "2026-01-01",
    "monthly_rent": 5000000,
    "deposit_amount": 10000000,
    "contract_url": "https://example.com/contract.pdf"
  }'
```

**Expected Response (201 Created):**
```json
{
  "message": "Tạo hợp đồng thành công",
  "contract": {
    "id": "contract-uuid",
    "post_id": "550e8400-e29b-41d4-a716-446655440000",
    "tenant_id": "tenant-uuid",
    "landlord_id": "landlord-uuid",
    "start_date": "2025-01-01",
    "end_date": "2026-01-01",
    "monthly_rent": 5000000,
    "deposit_amount": 10000000,
    "contract_url": "https://example.com/contract.pdf",
    "status": "active",
    "created_at": "2025-12-30T10:00:00Z",
    "updated_at": "2025-12-30T10:00:00Z"
  }
}
```

**Notes:**
- Chỉ TENANT mới có thể tạo contract
- Bài đăng (post_id) phải là APPROVED
- Tenant chỉ được tạo 1 contract cho mỗi bài đăng
- Khi tạo thành công, rental_post.is_available sẽ set = false
- monthly_rent, deposit_amount, contract_url là optional (có default)

---

## 2. GET ALL MY CONTRACTS (Tenant xem hợp đồng của mình)

**Endpoint:** `GET /contracts/my/contracts`

**Method:** GET

**Headers:**
```
Authorization: Bearer {tenant_access_token}
Content-Type: application/json
```

**Query Parameters (optional):**
```
?status=active
?status=terminated
```

**cURL Command:**
```bash
curl -X GET "http://localhost:4000/api/contracts/my/contracts" \
  -H "Authorization: Bearer {tenant_token}" \
  -H "Content-Type: application/json"
```

**cURL with Filter:**
```bash
curl -X GET "http://localhost:4000/api/contracts/my/contracts?status=active" \
  -H "Authorization: Bearer {tenant_token}" \
  -H "Content-Type: application/json"
```

**Expected Response (200 OK):**
```json
{
  "message": "Lấy danh sách hợp đồng thành công",
  "total": 2,
  "contracts": [
    {
      "id": "contract-uuid-1",
      "post_id": "post-uuid-1",
      "post_title": "Phòng cho thuê gần trung tâm",
      "post_price": 5000000,
      "tenant_id": "tenant-uuid",
      "landlord_id": "landlord-uuid-1",
      "landlord_name": "Nguyễn Văn A",
      "start_date": "2025-01-01",
      "end_date": "2026-01-01",
      "monthly_rent": 5000000,
      "deposit_amount": 10000000,
      "status": "active",
      "created_at": "2025-12-30T10:00:00Z"
    }
  ]
}
```

**Notes:**
- Chỉ TENANT mới có thể xem
- Trả về danh sách contracts của tenant hiện tại
- Có thể filter theo status (active/terminated)

---

## 3. GET LANDLORD CONTRACTS (Landlord xem hợp đồng của mình)

**Endpoint:** `GET /contracts/landlord/contracts`

**Method:** GET

**Headers:**
```
Authorization: Bearer {landlord_access_token}
Content-Type: application/json
```

**Query Parameters (optional):**
```
?status=active
?status=terminated
```

**cURL Command:**
```bash
curl -X GET "http://localhost:4000/api/contracts/landlord/contracts?status=active" \
  -H "Authorization: Bearer {landlord_token}" \
  -H "Content-Type: application/json"
```

**Expected Response (200 OK):**
```json
{
  "message": "Lấy danh sách hợp đồng thành công",
  "total": 1,
  "contracts": [
    {
      "id": "contract-uuid",
      "post_id": "post-uuid",
      "post_title": "Phòng cho thuê gần trung tâm",
      "post_price": 5000000,
      "tenant_id": "tenant-uuid",
      "tenant_name": "Trần Thị B",
      "landlord_id": "landlord-uuid",
      "start_date": "2025-01-01",
      "end_date": "2026-01-01",
      "monthly_rent": 5000000,
      "deposit_amount": 10000000,
      "status": "active",
      "created_at": "2025-12-30T10:00:00Z"
    }
  ]
}
```

**Notes:**
- Chỉ LANDLORD mới có thể xem
- Trả về danh sách contracts liên quan đến bài đăng của landlord

---

## 4. GET CONTRACT DETAILS (Xem chi tiết hợp đồng)

**Endpoint:** `GET /contracts/:id`

**Method:** GET

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Path Parameters:**
```
:id = contract-uuid
```

**cURL Command:**
```bash
curl -X GET "http://localhost:4000/api/contracts/contract-uuid" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

**Expected Response (200 OK):**
```json
{
  "message": "Lấy thông tin hợp đồng thành công",
  "contract": {
    "id": "contract-uuid",
    "post_id": "post-uuid",
    "post_title": "Phòng cho thuê gần trung tâm",
    "address_detail": "Ngõ 45 Hàng Bồ, Tầng 3",
    "post_price": 5000000,
    "tenant_id": "tenant-uuid",
    "tenant_name": "Trần Thị B",
    "tenant_email": "tran@example.com",
    "landlord_id": "landlord-uuid",
    "landlord_name": "Nguyễn Văn A",
    "landlord_email": "nguyen@example.com",
    "landlord_phone": "0912345678",
    "start_date": "2025-01-01",
    "end_date": "2026-01-01",
    "monthly_rent": 5000000,
    "deposit_amount": 10000000,
    "contract_url": "https://example.com/contract.pdf",
    "status": "active",
    "created_at": "2025-12-30T10:00:00Z",
    "updated_at": "2025-12-30T10:00:00Z"
  }
}
```

**Notes:**
- Chỉ tenant, landlord chủ, hoặc admin mới xem được
- Trả về chi tiết đầy đủ của contract

---

## 5. UPDATE CONTRACT (Cập nhật hợp đồng)

**Endpoint:** `PUT /contracts/:id`

**Method:** PUT

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body (chỉ cần gửi fields cần update):**
```json
{
  "start_date": "2025-02-01",
  "end_date": "2026-02-01",
  "monthly_rent": 5500000,
  "deposit_amount": 11000000,
  "contract_url": "https://example.com/contract-v2.pdf"
}
```

**cURL Command:**
```bash
curl -X PUT "http://localhost:4000/api/contracts/contract-uuid" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "start_date": "2025-02-01",
    "end_date": "2026-02-01",
    "monthly_rent": 5500000,
    "deposit_amount": 11000000
  }'
```

**Expected Response (200 OK):**
```json
{
  "message": "Cập nhật hợp đồng thành công",
  "contract": {
    "id": "contract-uuid",
    "post_id": "post-uuid",
    "tenant_id": "tenant-uuid",
    "landlord_id": "landlord-uuid",
    "start_date": "2025-02-01",
    "end_date": "2026-02-01",
    "monthly_rent": 5500000,
    "deposit_amount": 11000000,
    "status": "active",
    "updated_at": "2025-12-30T11:00:00Z"
  }
}
```

**Notes:**
- Chỉ tenant hoặc landlord chủ có thể edit
- Chỉ admin hoặc landlord mới có thể thay đổi status

---

## 6. TERMINATE CONTRACT (Kết thúc hợp đồng)

**Endpoint:** `PUT /contracts/:id/terminate`

**Method:** PUT

**Headers:**
```
Authorization: Bearer {landlord_access_token}
Content-Type: application/json
```

**Body:** (không cần body, nhưng có thể gửi rỗng)
```json
{}
```

**cURL Command:**
```bash
curl -X PUT "http://localhost:4000/api/contracts/contract-uuid/terminate" \
  -H "Authorization: Bearer {landlord_token}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response (200 OK):**
```json
{
  "message": "Kết thúc hợp đồng thành công",
  "contract": {
    "id": "contract-uuid",
    "post_id": "post-uuid",
    "tenant_id": "tenant-uuid",
    "landlord_id": "landlord-uuid",
    "start_date": "2025-01-01",
    "end_date": "2026-01-01",
    "monthly_rent": 5000000,
    "status": "terminated",
    "updated_at": "2025-12-30T12:00:00Z"
  }
}
```

**Notes:**
- Chỉ LANDLORD hoặc ADMIN mới có thể kết thúc
- Khi kết thúc, rental_post.is_available sẽ set = true
- Chỉ có thể kết thúc contract có status != 'terminated'

---

## 7. DELETE CONTRACT (Xóa hợp đồng)

**Endpoint:** `DELETE /contracts/:id`

**Method:** DELETE

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**cURL Command:**
```bash
curl -X DELETE "http://localhost:4000/api/contracts/contract-uuid" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

**Expected Response (200 OK):**
```json
{
  "message": "Xóa hợp đồng thành công"
}
```

**Notes:**
- Tenant chỉ xóa được hợp đồng của mình
- Landlord chỉ xóa được hợp đồng liên quan đến bài của mình
- Admin xóa được tất cả
- Khi xóa, rental_post.is_available sẽ set = true

---

## 8. GET ALL CONTRACTS (Admin xem tất cả, có filter)

**Endpoint:** `GET /contracts`

**Method:** GET

**Headers:**
```
Authorization: Bearer {admin_access_token}
Content-Type: application/json
```

**Query Parameters (optional):**
```
?status=active
?status=terminated
?tenant_id={tenant_uuid}
?landlord_id={landlord_uuid}
?post_id={post_uuid}
```

**cURL Command:**
```bash
curl -X GET "http://localhost:4000/api/contracts?status=active" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json"
```

**cURL with Multiple Filters:**
```bash
curl -X GET "http://localhost:4000/api/contracts?status=active&landlord_id=landlord-uuid" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json"
```

**Expected Response (200 OK):**
```json
{
  "message": "Lấy danh sách hợp đồng thành công",
  "total": 5,
  "contracts": [
    {
      "id": "contract-uuid-1",
      "post_id": "post-uuid-1",
      "post_title": "Phòng cho thuê gần trung tâm",
      "post_price": 5000000,
      "tenant_id": "tenant-uuid-1",
      "tenant_name": "Trần Thị B",
      "landlord_id": "landlord-uuid-1",
      "landlord_name": "Nguyễn Văn A",
      "start_date": "2025-01-01",
      "end_date": "2026-01-01",
      "monthly_rent": 5000000,
      "status": "active"
    }
  ]
}
```

---

## TESTING FLOW EXAMPLE

### Scenario: Tenant tạo contract cho bài đăng approved

**Step 1:** Tenant login → lấy token
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "tenant@example.com", "password": "password"}'
```
Save `access_token`

**Step 2:** Xem bài đăng approved
```bash
curl -X GET "http://localhost:4000/api/rental-posts?status=approved" \
  -H "Authorization: Bearer {tenant_token}"
```
Save `post_id` từ response

**Step 3:** Tạo contract
```bash
curl -X POST http://localhost:4000/api/contracts \
  -H "Authorization: Bearer {tenant_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "post_id": "{post_id}",
    "start_date": "2025-01-01",
    "end_date": "2026-01-01",
    "monthly_rent": 5000000,
    "deposit_amount": 10000000
  }'
```
Save `contract_id` từ response

**Step 4:** Xem chi tiết contract vừa tạo
```bash
curl -X GET "http://localhost:4000/api/contracts/{contract_id}" \
  -H "Authorization: Bearer {tenant_token}"
```

**Step 5:** Xem tất cả contracts của tenant
```bash
curl -X GET "http://localhost:4000/api/contracts/my/contracts" \
  -H "Authorization: Bearer {tenant_token}"
```

**Step 6:** Landlord login và xem contracts của mình
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "landlord@example.com", "password": "password"}'
```
Save `landlord_token`

```bash
curl -X GET "http://localhost:4000/api/contracts/landlord/contracts" \
  -H "Authorization: Bearer {landlord_token}"
```

**Step 7:** Landlord update contract
```bash
curl -X PUT "http://localhost:4000/api/contracts/{contract_id}" \
  -H "Authorization: Bearer {landlord_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "monthly_rent": 5500000
  }'
```

**Step 8:** Landlord kết thúc contract
```bash
curl -X PUT "http://localhost:4000/api/contracts/{contract_id}/terminate" \
  -H "Authorization: Bearer {landlord_token}" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## ERROR RESPONSES

### 403 Forbidden
```json
{
  "message": "Chỉ tenant mới có quyền tạo hợp đồng."
}
```

### 400 Bad Request
```json
{
  "message": "Thiếu thông tin bắt buộc: post_id, start_date"
}
```

### 404 Not Found
```json
{
  "message": "Không tìm thấy hợp đồng"
}
```

### 400 Validation Error
```json
{
  "message": "Chỉ có thể tạo hợp đồng cho bài đăng đã được duyệt"
}
```

---

## POSTMAN COLLECTION IMPORT

Bạn có thể import JSON collection này vào Postman:

```json
{
  "info": {
    "name": "Contract Management API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Contract",
      "request": {
        "method": "POST",
        "header": [
          {"key": "Authorization", "value": "Bearer {{tenant_token}}"},
          {"key": "Content-Type", "value": "application/json"}
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"post_id\": \"{{post_id}}\",\"start_date\": \"2025-01-01\",\"end_date\": \"2026-01-01\",\"monthly_rent\": 5000000}"
        },
        "url": {
          "raw": "{{base_url}}/contracts",
          "host": ["{{base_url}}"],
          "path": ["contracts"]
        }
      }
    }
  ]
}
```

---

## SUMMARY

| Endpoint | Method | Auth | Role | Purpose |
|----------|--------|------|------|---------|
| `/contracts` | POST | ✅ | Tenant | Tạo contract mới |
| `/contracts/my/contracts` | GET | ✅ | Tenant | Xem contracts của mình |
| `/contracts/landlord/contracts` | GET | ✅ | Landlord | Xem contracts của mình |
| `/contracts/:id` | GET | ✅ | Tenant/Landlord/Admin | Xem chi tiết |
| `/contracts/:id` | PUT | ✅ | Tenant/Landlord | Cập nhật |
| `/contracts/:id/terminate` | PUT | ✅ | Landlord/Admin | Kết thúc |
| `/contracts/:id` | DELETE | ✅ | Tenant/Landlord/Admin | Xóa |
| `/contracts` | GET | ✅ | Admin | Xem tất cả |
