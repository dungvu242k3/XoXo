# Hướng dẫn Deploy

## Deploy lên Vercel (Khuyến nghị)

### Bước 1: Cài đặt Vercel CLI
```bash
npm i -g vercel
```

### Bước 2: Đăng nhập Vercel
```bash
vercel login
```

### Bước 3: Deploy
```bash
vercel
```

Hoặc deploy production:
```bash
vercel --prod
```

### Bước 4: Deploy qua GitHub (Tự động)
1. Đẩy code lên GitHub
2. Vào https://vercel.com
3. Import project từ GitHub
4. Vercel sẽ tự động detect Vite và deploy

---

## Deploy lên Netlify

### Bước 1: Cài đặt Netlify CLI
```bash
npm i -g netlify-cli
```

### Bước 2: Deploy
```bash
netlify deploy --prod --dir=dist
```

---

## Deploy lên Vercel (Khuyến nghị)

### Bước 1: Cài đặt Vercel CLI
```bash
npm i -g vercel
```

### Bước 2: Login
```bash
vercel login
```

### Bước 3: Deploy
```bash
vercel
```

Hoặc deploy qua GitHub:
1. Push code lên GitHub
2. Kết nối repository với Vercel
3. Cấu hình environment variables trong Vercel Dashboard
4. Deploy tự động

---

## Lưu ý

- Đảm bảo file `.env` có các biến môi trường cần thiết:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Supabase config đã được setup trong `supabase.ts`
- Build output nằm trong thư mục `dist/`




