# Knowledge Gym Frontend (m4b)

Next.js 15 App Router + TypeScript + Tailwind. Nói chuyện với backend qua
`NEXT_PUBLIC_API_BASE` (mặc định `http://localhost:8080/api/v1`).

## Chạy local

```bash
# Terminal 1 — API (cần Postgres/Redis theo docker-compose)
cd knowledge-gym && ./gradlew :kg-presentation:bootRun

# Terminal 2 — FE
cd knowledge-gym-frontend
cp .env.example .env.local   # chỉnh nếu cần
npm ci
npm run dev:local            # http://localhost:3100
```

## Auth

| Route | Việc |
|---|---|
| `/login` | email/password + nút Google |
| `/register` | tạo tài khoản |
| `/forgot-password` | 3 bước: email → mã 6 số → mật khẩu mới |
| `/auth/oauth2/success` | đọc `#accessToken=…` từ OAuth redirect |

- Access JWT: **in-memory** (`lib/api-client.ts`) — không localStorage.
- Refresh: httpOnly cookie, `credentials: "include"`, tự refresh khi 401 / reload.
- Google: `window.location = ${API_BASE}/oauth2/authorization/google`.

## Questions

| Route | Việc |
|---|---|
| `/questions` | filter module / difficulty / tag + search `q` + phân trang |
| `/questions/[id]` | render `answerHtml` (đã sanitize phía server) |

Backend cần allow đúng origin frontend (local: `http://localhost:3100`) và credentials.

## Khu quản trị

Admin mở `/admin/content` để biên tập câu hỏi, tổ chức chủ đề/module và theo dõi import; `/admin/posts` để soạn và xuất bản bài viết thủ công. Writer và Search Admin vẫn giữ các chức năng hiện có.

Các chức năng cần API mới được đánh dấu **chờ backend**, không giả lập lưu thành công. Xem [hợp đồng tích hợp và ba cờ rollout](docs/ADMIN-WORKSPACE.md) trước khi bật chúng trên Vercel.

## CI/CD và favicon

CI kiểm tra lint, types, tests, audit production, build và các route icon. Chỉ `main` sau khi CI pass mới deploy Vercel, dùng ba secret trong GitHub environment **`production`**. Vercel Git auto-deploy được tắt trong `vercel.json` để không deploy trùng/bỏ qua CI.

Cấu hình `NEXT_PUBLIC_API_BASE` bằng URL backend HTTPS trong Vercel **Production Environment Variables** trước khi deploy. Favicon SVG/ICO và icon iOS dùng biểu tượng stack hiện tại của Knowledge Gym.

Xem [hướng dẫn deployment và kết quả kiểm tra](docs/DEPLOYMENT.md), bao gồm giới hạn smoke test và các cảnh báo dependency phát triển còn tồn tại.
