# HRMS + Field Force SaaS Platform

A complete, production-ready multi-tenant HRMS and Field Force management SaaS platform.

## 🏗️ Architecture

- **Backend**: NestJS (TypeScript) with PostgreSQL and Prisma ORM
- **Frontend**: React (TypeScript) with MUI/Shadcn UI
- **Mobile**: Flutter (Android + iOS)
- **Database**: PostgreSQL
- **Cache**: Redis

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)
- Flutter SDK (for mobile)

### Setup

1. **Clone and install dependencies:**

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Install mobile dependencies
cd ../mobile && flutter pub get
```

2. **Setup environment:**

```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start Docker services:**

```bash
docker-compose up -d postgres redis
```

4. **Run database migrations:**

```bash
npm run db:migrate
npm run db:seed
```

5. **Start development servers:**

```bash
# Terminal 1: Backend
npm run backend:dev

# Terminal 2: Frontend
npm run frontend:dev

# Terminal 3: Mobile (optional)
npm run mobile:dev
```

## 📦 Project Structure

```
.
├── backend/          # NestJS backend
│   ├── src/
│   │   ├── auth/     # Authentication & RBAC
│   │   ├── tenant/   # Multi-tenant core
│   │   ├── hrms/     # HRMS modules
│   │   ├── field-force/ # Field Force modules
│   │   ├── security/ # PII encryption, audit logs
│   │   └── common/   # Shared utilities
│   └── prisma/       # Prisma schema & migrations
├── frontend/         # React web app
│   ├── src/
│   │   ├── features/ # Feature modules
│   │   ├── components/ # Shared components
│   │   └── lib/      # Utilities & API client
├── mobile/           # Flutter mobile app
│   └── lib/
│       ├── features/ # Feature modules
│       └── core/     # Core utilities
└── docker-compose.yml
```

## 🔐 Default Credentials

After seeding:
- **Super Admin**: admin@hrms.com / admin123
- **Tenant Admin**: tenant@example.com / tenant123

## 📚 API Documentation

Once backend is running, visit: http://localhost:5000/api/docs

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

## 📄 License

MIT

