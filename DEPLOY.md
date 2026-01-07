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

## Deploy lên Firebase Hosting

### Bước 1: Cài đặt Firebase CLI
```bash
npm i -g firebase-tools
```

### Bước 2: Login
```bash
firebase login
```

### Bước 3: Init Firebase
```bash
firebase init hosting
```

### Bước 4: Deploy
```bash
firebase deploy --only hosting
```

---

## Lưu ý

- Đảm bảo file `.env` có các biến môi trường cần thiết (nếu có)
- Firebase config đã được setup trong `firebase.ts`
- Build output nằm trong thư mục `dist/`




