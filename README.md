# Coding Plagiarism Checker

Hệ thống phát hiện đạo văn mã nguồn sử dụng kiến trúc microservices. Tích hợp jPlag và Moss để so sánh mã nguồn, lưu trữ bài nộp trên MinIO, và quản lý báo cáo phân tích trên MongoDB.

## Kiến trúc Hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client / UI                              │
└──────────────────────────────┬──────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
    [Auth Service]      [Submission Service]    [Analyzer Service]
      (8081)              (8082)                    (8083)
        │                      │                      │
    ┌───┴───────────┬──────────┴───────┬─────────────┴──────────┐
    │               │                  │                        │
[PostgreSQL]  [PostgreSQL]      [RabbitMQ]                [MongoDB]
  (5432)       (5432)            (5672)                    (27017)
    │               │                  │                        │
    └───────────────┴──────────────────┴────────────────────────┘
                    [MinIO] (9000)
                  Object Storage
```

**3 Microservices:**
- **Auth Service (8081):** Xác thực, cấp JWT token
- **Submission Service (8082):** Nhận bài nộp, lưu MinIO, gửi job qua RabbitMQ
- **Analyzer Service (8083):** Chạy jPlag/Moss, lưu báo cáo MongoDB

**Infrastructure:**
- PostgreSQL: User, submissions metadata
- MongoDB: Analysis reports
- RabbitMQ: Message queue (submission → analyzer)
- MinIO: Object storage cho source code files

## Yêu Cầu

- Java 17+
- Maven 3.9+
- Docker & Docker Compose
- PowerShell (Windows) hoặc Bash (Linux/macOS)

## Khởi Động Cục Bộ (Development)

### 1. Clone Repository
```bash
git clone https://github.com/tnthong2811/coding-plagiarism-checker.git
cd coding-plagiarism-checker
```

### 2. Cấu Hình Environment
```bash
# Copy .env.example thành .env
cp .env.example .env

# Chỉnh sửa .env nếu cần (passwords, ports, ...)
# Lưu ý: các giá trị mặc định trong .env.example chỉ dùng cho dev
```

### 3. Build Project
```powershell
# Windows PowerShell
.\mvnw.cmd clean package

# Linux/macOS
./mvnw clean package
```

### 4. Khởi Động Docker Compose
```bash
docker-compose up --build
```

**Hoặc (nếu images đã build trước):**
```bash
docker-compose up
```

### 5. Kiểm Tra Services

Services sẽ lần lượt khởi động. Kiểm tra logs:
```bash
docker-compose logs -f auth-service
docker-compose logs -f submission-service
docker-compose logs -f analyzer-service
```

**Health Checks:**
- Auth Service: `curl http://localhost:8081/actuator/health`
- Submission Service: `curl http://localhost:8082/actuator/health`
- Analyzer Service: `curl http://localhost:8083/actuator/health`

### 6. Truy Cập Management Interfaces

| Service | URL | Purpose |
|---------|-----|---------|
| RabbitMQ Management | http://localhost:15672 | Queue monitoring (guest/guest) |
| MinIO Console | http://localhost:9001 | Object storage UI (minioadmin/minioadmin) |
| PostgreSQL | localhost:5432 | DB access (postgres/password) |
| MongoDB | localhost:27017 | Report DB access |

## Cấu Trúc Project

```
coding-plagiarism-checker/
├── pom.xml                    # Root Maven POM (multi-module)
├── docker-compose.yml         # Orchestration
├── .env.example              # Environment variables template
├── .env                      # Local environment (git-ignored)
├── auth/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/
├── submission/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/
├── analyzer/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/
└── common/
    ├── pom.xml
    └── src/                  # Shared models & utilities
```

## Các Lệnh Hữu Ích

### Maven
```powershell
# Build mà không chạy test
.\mvnw.cmd -DskipTests clean package

# Chỉ build một module
.\mvnw.cmd -pl auth clean package

# Chạy test
.\mvnw.cmd clean verify
```

### Docker Compose
```bash
# Khởi động tất cả services
docker-compose up --build

# Khởi động background
docker-compose up -d

# Dừng tất cả
docker-compose down

# Xóa volumes (dữ liệu sẽ mất)
docker-compose down -v

# Xem logs của service cụ thể
docker-compose logs -f submission-service

# Vào container shell
docker-compose exec auth-service sh
```

### Docker
```bash
# Build image cho 1 service
docker build -t coding-plagiarism-checker/auth:local ./auth

# Run container
docker run -p 8081:8081 coding-plagiarism-checker/auth:local
```

## API Endpoints (Tham khảo)

### Auth Service (8081)
```
POST   /api/auth/login         - Đăng nhập
POST   /api/auth/register      - Đăng ký
POST   /api/auth/verify        - Xác thực token
```

### Submission Service (8082)
```
POST   /api/submissions/upload       - Nộp bài
GET    /api/submissions/{id}         - Lấy chi tiết nộp bài
GET    /api/submissions              - Danh sách nộp bài
```

### Analyzer Service (8083)
```
GET    /api/reports/{submissionId}   - Lấy báo cáo phân tích
GET    /api/reports                  - Danh sách báo cáo
```

## Bảo Mật

### Environment Variables
Các bí mật (passwords, JWT secret, API keys) được quản lý qua `.env`:
- Không commit `.env` vào git (đã thêm vào `.gitignore`)
- Chỉ commit `.env.example` (template)
- Mỗi developer/environment sử dụng `.env` riêng

### Production
Cho production, sử dụng:
- Docker Secrets (Swarm mode)
- Kubernetes Secrets
- Secret Manager (AWS Secrets Manager, HashiCorp Vault, ...)

Cập nhật `docker-compose.yml` hoặc `secrets` field trong compose file để sử dụng external secrets.

## Troubleshooting

### Services không khởi động
1. Kiểm tra logs:
   ```bash
   docker-compose logs --tail=50
   ```
2. Kiểm tra ports có bị chiếm không:
   ```bash
   netstat -ano | findstr :8081  # Windows
   lsof -i :8081                 # Linux/macOS
   ```
3. Xóa volumes cũ:
   ```bash
   docker-compose down -v
   docker-compose up --build
   ```

### Database connection error
- Kiểm tra Postgres healthcheck pass: `docker-compose ps` xem STATUS
- Đợi Postgres ready (~15s)
- Kiểm tra environment variables trong `.env`

### Memory issues
- Điều chỉnh `JAVA_OPTS` trong Dockerfile (Xms, Xmx)
- Mặc định: `-Xms256m -Xmx512m` (cần tối thiểu 256MB)

## Deployment

### GitHub Actions (CI/CD)
Workflow tự động:
1. Build & test Maven
2. Build Docker images
3. Push to registry (nếu có secrets)

`.github/workflows/ci.yml` — xem file để cấu hình registry.

### Docker Stack / Kubernetes
- Stack: `docker stack deploy -c docker-compose.yml plagiarism`
- K8s: (manifests coming soon)

## Đóng Góp

1. Fork repository
2. Tạo branch feature (`git checkout -b feature/abc`)
3. Commit changes (`git commit -m 'Add abc'`)
4. Push (`git push origin feature/abc`)
5. Tạo Pull Request

## License

MIT License © 2026 tnthong2811

## Liên Hệ

- GitHub Issues: https://github.com/tnthong2811/coding-plagiarism-checker/issues
- Email: tnthong2811@example.com
