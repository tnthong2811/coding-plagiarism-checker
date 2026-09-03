# ============================================
# Stage 1: Build
# ============================================
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /build

# Copy pom.xml từ root project
COPY pom.xml .

# Copy tất cả modules
COPY common/ common/
COPY auth/ auth/
COPY submission/ submission/
COPY analyzer/ analyzer/

# Build auth module (skip tests cho tốc độ)
RUN mvn -T 1C clean package -pl auth -am -DskipTests

# ============================================
# Stage 2: Runtime
# ============================================
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Tạo non-root user để chạy application
RUN addgroup -g 1000 appuser && adduser -D -u 1000 -G appuser appuser

# Copy jar từ build stage
COPY --from=builder /build/auth/target/*.jar app.jar

# Set file ownership cho non-root user
RUN chown -R appuser:appuser /app

# Switch sang non-root user
USER appuser

# Set Java memory options cho container
ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseContainerSupport"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=20s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8081/actuator/health || exit 1

# Lệnh khởi động service
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
