# Coding Plagiarism Checker

Hệ thống hỗ trợ phát hiện đạo văn mã nguồn cho lớp học lập trình. Dự án dùng kiến trúc microservices, lưu file bài nộp trên MinIO, xử lý bất đồng bộ qua RabbitMQ và phân tích độ tương đồng bằng JPlag.

## Thành Phần Chính

- `auth-service` (`8081`): đăng nhập, JWT, Google OAuth, quản lý người dùng và phân quyền.
- `submission-service` (`8082`): quản lý lớp học, bài tập, bài nộp và upload file lên MinIO.
- `analyzer-service` (`8083`): chạy JPlag, lưu và trả báo cáo phân tích trên MongoDB.
- `frontend` (`5173`): giao diện React + TypeScript + Vite.
- Hạ tầng local: PostgreSQL, MongoDB, RabbitMQ và MinIO.

## Kiến Trúc Local

```text
React/Vite Frontend (5173)
        |
        | Vite proxy
        v
+----------------+     +--------------------+     +------------------+
| Auth Service   |     | Submission Service |     | Analyzer Service |
| 8081           |     | 8082               |     | 8083             |
+-------+--------+     +----+----------+----+     +----+--------+----+
        |                   |          |               |        |
        v                   v          v               v        v
  PostgreSQL           PostgreSQL   RabbitMQ        RabbitMQ  MongoDB
                                     |
                                     v
                                    MinIO
```

`docker-compose.yml` chỉ chạy backend và hạ tầng. Frontend chạy riêng bằng Vite để tiện phát triển.

## Yêu Cầu

- Docker Desktop hoặc Docker Engine có Docker Compose.
- Node.js 18+ và npm để chạy frontend.
- Java 17+ nếu muốn chạy Maven/test trực tiếp trên máy.
- Không cần cài Maven global vì repo đã có Maven Wrapper (`mvnw`, `mvnw.cmd`).

## Cài Đặt Và Chạy Local

### 1. Clone repo

```bash
git clone https://github.com/tnthong2811/coding-plagiarism-checker.git
cd coding-plagiarism-checker
```

### 2. Tạo file môi trường

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux/macOS/Git Bash:

```bash
cp .env.example .env
```

Mở `.env` và chỉnh nếu cần. Để có tài khoản quản trị ban đầu khi chạy local, nên bật bootstrap admin:

```env
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=admin123
BOOTSTRAP_ADMIN_ROLE=BUSINESS_ADMIN
```

Ghi chú:

- `APP_FRONTEND_BASE_URL` nên giữ là `http://localhost:5173` khi chạy frontend bằng Vite.
- `APP_MAIL_ENABLED=false` là mặc định. Với cấu hình này, đăng ký bằng email trên `/register` sẽ không dùng được vì hệ thống cần SMTP để gửi mật khẩu tạm thời. Khi phát triển local, hãy dùng bootstrap admin rồi tạo `TEACHER`/`STUDENT` trong trang admin, hoặc cấu hình SMTP thật.
- Google OAuth chỉ hoạt động khi cấu hình client ID/secret trong `.env`.

### 3. Khởi động backend và hạ tầng

```bash
docker compose up --build
```

Nếu máy đang dùng Docker Compose v1:

```bash
docker-compose up --build
```

Lệnh này khởi động PostgreSQL, MongoDB, RabbitMQ, MinIO và ba backend service. Frontend chưa chạy ở bước này.

Kiểm tra service:

```bash
docker compose ps
docker compose logs -f auth-service
docker compose logs -f submission-service
docker compose logs -f analyzer-service
```

Health check:

- Auth Service: http://localhost:8081/actuator/health
- Submission Service: http://localhost:8082/actuator/health
- Analyzer Service: http://localhost:8083/actuator/health

### 4. Chạy frontend

Mở terminal khác:

```bash
cd frontend
npm install
npm run dev
```

Mở trình duyệt tại http://localhost:5173.

Vite proxy mặc định:

- `/api`, `/actuator`, `/oauth2`, `/login/oauth2` -> `http://localhost:8081`
- `/submission-api` -> `http://localhost:8082`
- `/analyzer-api` -> `http://localhost:8083`

### 5. Luồng kiểm tra nhanh

1. Đăng nhập bằng tài khoản bootstrap admin.
2. Vào trang admin để tạo `TEACHER` và `STUDENT`.
3. Tạo lớp học, gán giáo viên và thêm sinh viên hoặc cho sinh viên join bằng mã lớp.
4. Đăng nhập giáo viên, tạo bài tập.
5. Đăng nhập sinh viên, upload bài nộp.
6. Đăng nhập giáo viên/admin để chạy so sánh và xem báo cáo.

## Tài Khoản Và Cổng Local

| Thành phần | URL/Cổng | Thông tin mặc định |
|---|---:|---|
| Frontend | http://localhost:5173 | Chạy bằng `npm run dev` |
| Auth Service | http://localhost:8081 | JWT API |
| Submission Service | http://localhost:8082 | Submission API |
| Analyzer Service | http://localhost:8083 | Report API |
| RabbitMQ Management | http://localhost:15672 | `guest` / `guest` |
| MinIO Console | http://localhost:9001 | `minioadmin` / `changeme_minio_password_here` |
| PostgreSQL | localhost:5432 | `postgres` / `changeme_secure_password_here`, DB `plagiarism_db` |
| MongoDB | localhost:27017 | Không bật auth trong compose local |

## Cấu Trúc Project

```text
coding-plagiarism-checker/
├── .github/workflows/ci.yml
├── analyzer/                 # Analyzer service, JPlag, MongoDB, RabbitMQ, MinIO
├── auth/                     # Auth service, JWT, OAuth, user management
├── common/                   # DTO/entity/exception dùng chung
├── docs/                     # Tài liệu dự án và sơ đồ
├── frontend/                 # React + TypeScript + Vite
├── scripts/                  # Script hỗ trợ local
├── submission/               # Classroom, assignment, submission service
├── docker-compose.yml        # Backend + infrastructure cho local
├── .env.example              # Mẫu biến môi trường
└── pom.xml                   # Maven multi-module root
```

## Lệnh Hữu Ích

### Backend Maven

Windows:

```powershell
.\mvnw.cmd clean verify
.\mvnw.cmd -DskipTests clean package
.\mvnw.cmd -pl auth -am clean package
```

Linux/macOS:

```bash
./mvnw clean verify
./mvnw -DskipTests clean package
./mvnw -pl auth -am clean package
```

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build
npm run preview
```

### Docker Compose

```bash
docker compose up --build
docker compose up -d
docker compose down
docker compose down -v
docker compose logs -f submission-service
docker compose exec auth-service sh
```

`docker compose down -v` sẽ xóa volume local, toàn bộ dữ liệu database/object storage sẽ mất.

## API Chính

### Auth Service

```text
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/password/forgot
POST   /api/auth/password/temporary
POST   /api/auth/password/reset
GET    /api/auth/me
POST   /api/auth/me/username
POST   /api/auth/me/avatar
GET    /api/auth/admin/users
POST   /api/auth/admin/users
POST   /api/auth/admin/users/{id}/role
DELETE /api/auth/admin/users/{id}
GET    /oauth2/authorization/google
GET    /login/oauth2/code/google
```

### Submission Service

```text
GET    /api/classes
GET    /api/classes/{id}
POST   /api/classes
PUT    /api/classes/{id}
DELETE /api/classes/{id}
POST   /api/classes/join
GET    /api/assignments
GET    /api/assignments/{id}
POST   /api/assignments
PUT    /api/assignments/{id}
DELETE /api/assignments/{id}
GET    /api/assignments/{id}/submissions
GET    /api/assignments/{id}/submissions/mine
POST   /api/submissions/upload
GET    /api/submissions/mine
GET    /api/submissions/history
```

### Analyzer Service

```text
POST   /api/reports/compare
GET    /api/reports
GET    /api/reports/{id}
DELETE /api/reports/{id}
```

## Troubleshooting

### Không đăng ký được bằng email

Nếu gặp lỗi mail khi dùng trang `/register`, nguyên nhân thường là `APP_MAIL_ENABLED=false`. Với local dev, dùng bootstrap admin để tạo user. Nếu muốn dùng đăng ký email/reset password thật, cấu hình SMTP trong `.env` rồi restart `auth-service`.

### Service không khởi động

```bash
docker compose logs --tail=80
docker compose ps
```

Kiểm tra các cổng hay bị chiếm: `5173`, `8081`, `8082`, `8083`, `5432`, `27017`, `5672`, `15672`, `9000`, `9001`.

### Thay đổi `.env` không có tác dụng

Restart các container:

```bash
docker compose down
docker compose up --build
```

### Muốn làm sạch dữ liệu local

```bash
docker compose down -v
docker compose up --build
```

## Bảo Mật

- Không commit `.env`.
- Chỉ commit `.env.example`.
- Đổi các giá trị mặc định trong `.env` nếu chạy ngoài máy cá nhân.
- Không hard-code password, JWT secret, OAuth key hoặc MinIO key trong source.

## License

MIT License © 2026 tnthong2811
