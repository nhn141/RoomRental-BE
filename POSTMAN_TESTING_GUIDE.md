# Postman Testing Guide - RoomRental BE API

## Server Configuration
- **Base URL**: `http://localhost:4000`
- **Port**: 4000

## Authentication
Most endpoints require JWT token in the Authorization header:
```
Authorization: Bearer {token}
```

---

## 1. AUTH ENDPOINTS

### 1.1 Register as Tenant
**POST** `/api/auth/register-tenant`

```json
{
  "email": "tenant1@example.com",
  "password": "Password123!",
  "full_name": "Nguyen Van A",
  "phone_number": "0901234567",
  "target_province_code": "01",
  "target_ward_code": "00001",
  "budget_min": 3000000,
  "budget_max": 8000000
}
```

**Response**: Returns user data and JWT token

---

### 1.2 Register as Landlord
**POST** `/api/auth/register-landlord`

```json
{
  "email": "landlord1@example.com",
  "password": "Password123!",
  "full_name": "Tran Van B",
  "phone_number": "0901234568",
  "identity_card": "123456789",
  "address_detail": "123 Nguyen Hue, District 1"
}
```

**Response**: Returns user data and JWT token

---

### 1.3 Login
**POST** `/api/auth/login`

```json
{
  "email": "tenant1@example.com",
  "password": "Password123!"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "tenant1@example.com",
    "full_name": "Nguyen Van A",
    "role": "tenant",
    "is_active": true
  }
}
```

---

### 1.4 Request Password Reset
**POST** `/api/auth/forgot-password`

```json
{
  "email": "tenant1@example.com"
}
```

---

### 1.5 Reset Password
**POST** `/api/auth/reset-password`

```json
{
  "token": "{reset_token_from_email}",
  "new_password": "NewPassword123!"
}
```

---

## 2. USER/PROFILE ENDPOINTS

### 2.1 Get Current User Profile
**GET** `/api/profile/me`

**Headers**:
```
Authorization: Bearer {token}
```

---

### 2.2 Update Tenant Profile
**PUT** `/api/profile/update-tenant`

**Headers**:
```
Authorization: Bearer {token}
```

```json
{
  "phone_number": "0909876543",
  "target_province_code": "02",
  "target_ward_code": "00002",
  "budget_min": 2500000,
  "budget_max": 7000000
}
```

---

### 2.3 Update Landlord Profile
**PUT** `/api/profile/update-landlord`

**Headers**:
```
Authorization: Bearer {token}
```

```json
{
  "phone_number": "0909876544",
  "identity_card": "987654321",
  "address_detail": "456 Tran Hung Dao, District 5"
}
```

---

## 3. RENTAL POST ENDPOINTS

### 3.1 Create Rental Post (Landlord Only)
**POST** `/api/rental-posts/create`

**Headers**:
```
Authorization: Bearer {landlord_token}
Content-Type: application/json
```

```json
{
  "title": "Beautiful apartment in District 1",
  "description": "Modern 2-bedroom apartment with gym and parking",
  "price": 5000000,
  "area": 80,
  "max_tenants": 2,
  "address_detail": "123 Nguyen Hue Str, Dist 1",
  "province_code": "01",
  "ward_code": "00001",
  "amenities": ["wifi", "gym", "parking", "air-conditioner"],
  "images": ["image_url_1", "image_url_2"],
  "electricity_price": 3500,
  "water_price": 15000,
  "is_available": true
}
```

**Response**:
```json
{
  "id": "uuid",
  "landlord_id": "uuid",
  "title": "Beautiful apartment in District 1",
  "price": 5000000,
  "area": 80,
  "status": "pending",
  "created_at": "2025-12-30T10:00:00Z"
}
```

---

### 3.2 Get All Rental Posts
**GET** `/api/rental-posts?status=approved&province_code=01&min_price=3000000&max_price=8000000&limit=10&offset=0`

**Headers**:
```
Authorization: Bearer {token}
```

**Query Parameters**:
- `status`: approved, pending, rejected
- `province_code`: Province ID
- `min_price`: Minimum price
- `max_price`: Maximum price
- `min_area`: Minimum area
- `max_area`: Maximum area
- `limit`: Number of results (default: 10)
- `offset`: Pagination offset (default: 0)

---

### 3.3 Get Rental Post Details
**GET** `/api/rental-posts/{post_id}`

**Headers**:
```
Authorization: Bearer {token}
```

---

### 3.4 Update Rental Post
**PUT** `/api/rental-posts/{post_id}`

**Headers**:
```
Authorization: Bearer {landlord_token}
```

```json
{
  "title": "Updated apartment title",
  "price": 5500000,
  "electricity_price": 4000,
  "water_price": 15000,
  "is_available": true,
  "amenities": ["wifi", "gym", "parking", "air-conditioner", "washing-machine"]
}
```

---

### 3.5 Delete Rental Post
**DELETE** `/api/rental-posts/{post_id}`

**Headers**:
```
Authorization: Bearer {landlord_token}
```

---

### 3.6 Approve Rental Post (Admin Only)
**PUT** `/api/rental-posts/{post_id}/approve`

**Headers**:
```
Authorization: Bearer {admin_token}
```

---

### 3.7 Reject Rental Post (Admin Only)
**PUT** `/api/rental-posts/{post_id}/reject`

**Headers**:
```
Authorization: Bearer {admin_token}
```

```json
{
  "rejection_reason": "Images quality is poor"
}
```

---

### 3.8 Get Posts by Landlord
**GET** `/api/rental-posts/landlord/{landlord_id}`

**Headers**:
```
Authorization: Bearer {token}
```

---

## 4. CONTRACT ENDPOINTS

### 4.1 Create Contract (Admin Only)
**POST** `/api/contracts/create`

**Headers**:
```
Authorization: Bearer {admin_token}
```

```json
{
  "post_id": "uuid",
  "tenant_id": "uuid",
  "landlord_id": "uuid",
  "start_date": "2025-01-15",
  "end_date": "2026-01-15",
  "actual_price": 5000000
}
```

**Response**:
```json
{
  "id": "uuid",
  "post_id": "uuid",
  "tenant_id": "uuid",
  "landlord_id": "uuid",
  "start_date": "2025-01-15",
  "end_date": "2026-01-15",
  "actual_price": 5000000,
  "status": "active",
  "created_at": "2025-12-30T10:00:00Z"
}
```

---

### 4.2 Get Contract Details
**GET** `/api/contracts/{contract_id}`

**Headers**:
```
Authorization: Bearer {token}
```

---

### 4.3 Get Contracts by Tenant
**GET** `/api/contracts/tenant/{tenant_id}?status=active`

**Headers**:
```
Authorization: Bearer {token}
```

**Query Parameters**:
- `status`: active, completed, terminated (optional)

---

### 4.4 Get Contracts by Landlord
**GET** `/api/contracts/landlord/{landlord_id}?status=active`

**Headers**:
```
Authorization: Bearer {token}
```

**Query Parameters**:
- `status`: active, completed, terminated (optional)

---

### 4.5 Update Contract Status
**PUT** `/api/contracts/{contract_id}`

**Headers**:
```
Authorization: Bearer {token}
```

```json
{
  "status": "completed",
  "actual_price": 5000000
}
```

---

### 4.6 Get All Contracts (Admin Only)
**GET** `/api/contracts?tenant_id=uuid&landlord_id=uuid&status=active&limit=10&offset=0`

**Headers**:
```
Authorization: Bearer {admin_token}
```

**Query Parameters**:
- `tenant_id`: Filter by tenant
- `landlord_id`: Filter by landlord
- `status`: Filter by status
- `limit`: Number of results
- `offset`: Pagination offset

---

## 5. ADMIN ENDPOINTS

### 5.1 Create Admin
**POST** `/api/admin/create`

**Headers**:
```
Authorization: Bearer {admin_token}
```

```json
{
  "email": "admin1@example.com",
  "password": "Password123!",
  "full_name": "Admin User",
  "department": "Operations",
  "phone_number": "0901111111"
}
```

---

### 5.2 Get All Admins
**GET** `/api/admin/all`

**Headers**:
```
Authorization: Bearer {admin_token}
```

---

### 5.3 Get Admin Details
**GET** `/api/admin/{admin_id}`

**Headers**:
```
Authorization: Bearer {admin_token}
```

---

### 5.4 Update Admin
**PUT** `/api/admin/{admin_id}`

**Headers**:
```
Authorization: Bearer {admin_token}
```

```json
{
  "department": "Support",
  "phone_number": "0902222222"
}
```

---

### 5.5 Delete Admin
**DELETE** `/api/admin/{admin_id}`

**Headers**:
```
Authorization: Bearer {admin_token}
```

---

## 6. LOCATION ENDPOINTS

### 6.1 Get All Provinces
**GET** `/api/locations/provinces`

**Response**:
```json
{
  "data": [
    {
      "id": "01",
      "name": "Hà Nội",
      "full_name": "Thành phố Hà Nội",
      "type": "Thành phố"
    }
  ]
}
```

---

### 6.2 Get Province Details
**GET** `/api/locations/provinces/{province_id}`

---

### 6.3 Get Wards by Province
**GET** `/api/locations/wards?province_id=01`

**Query Parameters**:
- `province_id`: Province code (required)

**Response**:
```json
{
  "data": [
    {
      "id": "00001",
      "province_id": "01",
      "name": "Ba Đình",
      "name_with_type": "Quận Ba Đình",
      "type": "Quận"
    }
  ]
}
```

---

## 7. TESTING WORKFLOW

### Step 1: Register Users
1. Register a Tenant
2. Register a Landlord
3. Save their tokens for further requests

### Step 2: Create Rental Posts
1. Login as Landlord
2. Create a rental post (status will be "pending")

### Step 3: Approve Rental Posts
1. Create an Admin account (or use existing admin)
2. Use Admin token to approve the rental post

### Step 4: Search Rental Posts
1. Login as Tenant
2. Search rental posts by various filters
3. Get details of specific posts

### Step 5: Create Contracts
1. Use Admin token to create a contract
2. View contract details
3. Get contracts by tenant/landlord

### Step 6: Update Contract Status
1. Update contract status to "completed" or "terminated"

---

## 8. COMMON ERRORS

| Status | Error | Solution |
|--------|-------|----------|
| 400 | Missing required fields | Check request body |
| 401 | Unauthorized | Check JWT token validity |
| 403 | Forbidden | Check user role permissions |
| 404 | Not found | Check ID validity |
| 409 | Conflict (email exists) | Use different email |
| 500 | Server error | Check server logs |

---

## 9. POSTMAN ENVIRONMENT VARIABLES

Create an environment with these variables:

```json
{
  "base_url": "http://localhost:4000",
  "tenant_token": "{{save_from_login}}",
  "landlord_token": "{{save_from_login}}",
  "admin_token": "{{save_from_login}}",
  "post_id": "{{save_from_create_post}}",
  "contract_id": "{{save_from_create_contract}}"
}
```

Use in requests like:
```
{{base_url}}/api/rental-posts/{{post_id}}
Authorization: Bearer {{tenant_token}}
```

---

## 10. IMPORTANT NOTES

- **JWT Tokens**: Valid for a specific duration (check backend config)
- **Database Fields**: Updated to match the latest Supabase schema
- **New Fields**:
  - `contracts` table for managing rental agreements
  - `electricity_price`, `water_price` for rental posts
  - `target_province_code`, `target_ward_code`, `budget_min`, `budget_max` for tenants
  - `password_reset_token`, `password_reset_expires` for users
- **Status Values**:
  - Post Status: pending → approved/rejected
  - Contract Status: active → completed/terminated

---

Generated: December 30, 2025
