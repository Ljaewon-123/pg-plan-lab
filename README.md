## PostgreSQL 확장(Extension) 설정

## localhost전용으로 만들어져 SQL-INJECTION같은 취약점 공격은 생각 하지 않고 raw query를 그대로 사용한다.

### 기본 제공 확장 (CREATE EXTENSION으로 바로 활성화)

- `pg_trgm` — 삼중 문자(trigram) 기반 유사 문자열 검색

### 별도 설치 필요 확장

- `pg_cron` — DB 내부 크론 스케줄러
- `pgmq` — PostgreSQL 기반 메시지 큐

---

### 설치 가능한 확장 목록 확인

```bash
docker exec -it postgres psql -U postgres -c "SELECT name FROM pg_available_extensions ORDER BY name;"
```

### 특정 확장 설치 여부 확인

```bash
docker exec -it postgres psql -U postgres -c "SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';"
```

---

### pg_cron 설치 (PostgreSQL 18 기준)

```bash
# 1. 컨테이너에 pg_cron 바이너리 설치
docker exec -it --user root postgres bash -c "
  apt-get update && apt-get install -y postgresql-18-cron
"

# 2. postgresql.conf 경로 확인
docker exec -it postgres find /var/lib/postgresql -name "postgresql.conf"

# 3. shared_preload_libraries 설정 추가
docker exec -it --user postgres postgres bash -c "
  echo \"shared_preload_libraries = 'pg_cron'\" >> /var/lib/postgresql/18/docker/postgresql.conf
"

# 4. 컨테이너 재시작
docker restart postgres
```

> 주의: 컨테이너를 삭제하면 설치한 바이너리가 사라집니다. 영구 적용은 `Dockerfile.postgres`로 이미지를 빌드하세요.

### docker-compose로 영구 적용 (권장)

```bash
docker stop postgres && docker rm postgres
docker-compose up -d --build
```

---

### 확장 활성화 (서버 시작 시 자동 실행)

`server/plugins/db.ts`의 `EXTENSIONS` 배열에 확장명을 추가하면 서버 시작 시 자동으로 `CREATE EXTENSION IF NOT EXISTS`를 실행합니다.

```ts
const EXTENSIONS: string[] = [
  'pg_trgm',
  'pg_cron',
]
```
