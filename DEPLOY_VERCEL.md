# Hướng Dẫn Deploy Dự Án Lên Vercel

Dự án này là một ứng dụng **React (Vite)** tích hợp với **Supabase**. Dưới đây là các bước chi tiết để deploy lên Vercel.

## 1. Chuẩn Bị

Đảm bảo bạn đã có:
- Tài khoản [Vercel](https://vercel.com).
- Tài khoản [Supabase](https://supabase.com) (để lấy thông tin kết nối).
- Project đã được đẩy lên GitHub, GitLab hoặc Bitbucket (Khuyên dùng).

Ngoài ra, xác nhận bạn có các thông tin môi trường (Environment Variables) từ Supabase:
- `VITE_SUPABASE_URL`: Đường dẫn URL của dự án Supabase.
- `VITE_SUPABASE_ANON_KEY`: Khóa API công khai (anon key) của Supabase.

> **Lưu ý:** Bạn có thể tìm thấy các thông tin này trong Dashboard của Supabase: `Project Settings` -> `API`.

## 2. Deploy Thông Qua Giao Diện Web Vercel (Khuyên Dùng)

Đây là cách dễ nhất và tự động cập nhật khi bạn đẩy code mới lên Git.

1.  **Đăng nhập** vào [Vercel Dashboard](https://vercel.com/dashboard).
2.  Bấm nút **"Add New..."** -> **"Project"**.
3.  Trong danh sách "Import Git Repository", tìm repo chứa dự án này và bấm **"Import"**.
4.  Tại màn hình **"Configure Project"**:
    -   **Framework Preset**: Chọn `Vite`.
    -   **Root Directory**: Để mặc định (hoặc `./` nếu nó hỏi).
    -   **Build Command**: `npm run build` (Mặc định).
    -   **Output Directory**: `dist` (Mặc định).
    -   **Install Command**: `npm install` (Mặc định).
5.  **Quan trọng:** Mở phần **"Environment Variables"** và thêm 2 biến sau:
    -   Key: `VITE_SUPABASE_URL` | Value: `(Nhập URL Supabase của bạn)`
    -   Key: `VITE_SUPABASE_ANON_KEY` | Value: `(Nhập Anon Key Supabase của bạn)`
6.  Bấm **"Deploy"**.

Vercel sẽ tiến hành build và deploy. Sau khoảng 1-2 phút, bạn sẽ nhận được đường link truy cập ứng dụng (ví dụ: `project-name.vercel.app`).

---

## 3. Deploy Bằng Vercel CLI (Dòng Lệnh)

Nếu bạn muốn deploy trực tiếp từ máy tính của mình mà không cần qua Git:

1.  Cài đặt Vercel CLI (nếu chưa có):
    ```bash
    npm install -g vercel
    ```
2.  Đăng nhập vào Vercel:
    ```bash
    vercel login
    ```
3.  Tại thư mục gốc của dự án, chạy lệnh:
    ```bash
    vercel
    ```
4.  Làm theo các hướng dẫn trên màn hình:
    -   *Set up and deploy?* -> `y`
    -   *Which scope?* -> Chọn tài khoản của bạn.
    -   *Link to existing project?* -> `n` (nếu là lần đầu).
    -   *Project name?* -> Nhập tên dự án (ví dụ: `xoxo-spa`).
    -   *In which directory is your code located?* -> `./` (Mặc định).
    -   **Auto-detect settings**: Vercel sẽ tự nhận diện Vite. Nếu hỏi `Want to modify these settings?`, chọn `n` (trừ khi bạn cần sửa).

5.  **Cấu hình biến môi trường**:
    Sau khi deploy xong lần đầu, ứng dụng có thể bị lỗi do thiếu biến môi trường. Bạn cần cập nhật chúng:
    ```bash
    vercel env add VITE_SUPABASE_URL
    ```
    (Nhập giá trị khi được hỏi, chọn `Production`, `Preview`, và `Development`).
    
    Tương tự với `VITE_SUPABASE_ANON_KEY`:
    ```bash
    vercel env add VITE_SUPABASE_ANON_KEY
    ```

6.  Deploy lại để áp dụng biến môi trường:
    ```bash
    vercel --prod
    ```

## 4. Kiểm Tra Sau Khi Deploy

-   Truy cập vào đường dẫn Vercel cung cấp.
-   Mở Developer Tools (F12) -> Console xem có lỗi đỏ nào không.
-   Thử đăng nhập hoặc thao tác dữ liệu để đảm bảo kết nối Supabase thành công.

## 5. Lưu Ý Về Routing (Single Page App)

File `vercel.json` trong dự án đã được cấu hình sẵn để hỗ trợ Routing cho ứng dụng React (SPA):

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Điều này đảm bảo khi bạn load trực tiếp một đường dẫn con (ví dụ `/profile`), Vercel sẽ trả về `index.html` để React Router xử lý thay vì báo lỗi 404.
