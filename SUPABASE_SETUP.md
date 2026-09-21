# Hướng Dẫn Kết Nối Supabase & Kích Hoạt Đăng Nhập Google (animon)

Ứng dụng **animon** (tại `animon.io.vn`) được thiết kế đặc biệt cho giới trẻ khám phá địa điểm ăn uống, sử dụng **Supabase** làm database và **chỉ sử dụng phương thức đăng nhập bằng Google OAuth**.

---

## Bước 1: Tạo Dự Án Supabase

1. Truy cập [https://supabase.com](https://supabase.com) và đăng nhập/đăng ký.
2. Bấm **"New Project"**, đặt tên dự án (ví dụ: `spotshare-foodies`), chọn mật khẩu Database và chọn khu vực gần Việt Nam (ví dụ: `Southeast Asia (Singapore)`).
3. Đợi 1-2 phút để Supabase khởi tạo dự án.

---

## Bước 2: Chạy Database Schema (SQL)

1. Trên Supabase Dashboard bên trái, chọn biểu tượng **SQL Editor**.
2. Mở file [supabase/schema.sql](./supabase/schema.sql) trong thư mục dự án này, copy toàn bộ nội dung.
3. Dán vào **SQL Editor** trên Supabase và bấm nút **"Run"**.
4. Script sẽ tự động tạo:
   - Bảng `profiles`: Tự động đồng bộ tên và avatar khi user đăng nhập Google.
   - Bảng `spots`: Quản lý các quán ăn, giá cả, vibe tags, hình ảnh.
   - Bảng `reviews`: Đánh giá sao và nhận xét từ người dùng.
   - Bảng `bookmarks`: Lưu danh sách quán yêu thích.
   - Toàn bộ chính sách bảo mật **Row Level Security (RLS)**.

---

## Bước 3: Cấu hình Đăng Nhập Bằng Google (Google OAuth)

### 3.1. Tạo Client ID trên Google Cloud Console
1. Truy cập [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Tạo một dự án mới (hoặc chọn dự án có sẵn).
3. Cấu hình màn hình đồng ý OAuth (OAuth consent screen):
   - Chọn **External**, điền tên app (ví dụ: `SpotShare`).
4. Vào mục **Credentials** -> Bấm **Create Credentials** -> Chọn **OAuth client ID**:
   - Application type: **Web application**.
   - Name: `SpotShare Supabase Auth`.
   - Authorized redirect URIs: Nhập URL Callback của Supabase:
     ```
     https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
     ```
     *(Lấy URL này tại: Supabase Dashboard -> Authentication -> Providers -> Google)*.
5. Bấm **Create**, bạn sẽ nhận được **Client ID** và **Client Secret**.

### 3.2. Kích hoạt Provider Google trong Supabase
1. Tại Supabase Dashboard, vào menu **Authentication** -> **Providers** -> Chọn **Google**.
2. Bật công tắc **"Enable Google"**.
3. Dán **Client ID** và **Client Secret** vừa lấy ở Google Cloud Console.
4. Bấm **Save**.

---

## Bước 4: Thêm Biến Môi Trường Vào Dự Án

Tạo file `.env.local` ở thư mục gốc của dự án:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...
```

*(Lấy tại: Supabase Dashboard -> **Project Settings** -> **API** -> `Project URL` và `anon/public key`)*.

---

## Bước 5: Khởi động Ứng Dụng

Chạy lệnh:
```bash
npm run dev
```
Truy cập [http://localhost:3000](http://localhost:3000) để trải nghiệm ứng dụng!
