# Development Guide

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Git

### Initial Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy environment files: `cp packages/backend/.env.example packages/backend/.env`
4. Start services: `npm run docker:up`
5. Start development: `npm run dev`

## Project Structure

```
garcon-app/
├── packages/
│   ├── backend/          # Node.js API services
│   ├── mobile-app/       # React Native app
│   └── admin-web/        # React.js admin panel
├── docker/               # Docker configurations
├── .github/              # CI/CD workflows
└── docs/                 # Documentation
```

## Development Workflow

### Code Quality

- ESLint and Prettier are configured for all packages
- Pre-commit hooks run linting and formatting
- CI pipeline enforces code quality standards

### Testing

- Backend: Jest with Supertest for API testing
- Admin Web: Vitest with React Testing Library
- Mobile: Jest with React Native Testing Library

### Git Workflow

1. Create feature branch from `develop`
2. Make changes and commit with conventional commits
3. Push and create pull request
4. CI runs tests and quality checks
5. Merge after approval

## Environment Configuration

### Backend (.env)

```bash
PORT=3000
DATABASE_URL=postgresql://garcon:password@localhost:5432/garcon_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
```

### Docker Services

- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Backend API: localhost:3000
- Admin Web: localhost:3001

## Debugging

### Backend

- Use `npm run dev` for hot reload
- Debug with VS Code Node.js debugger
- Check logs with `npm run docker:logs`

### Frontend

- React DevTools for component debugging
- Redux DevTools for state management
- Network tab for API calls

## Common Issues

### Port Conflicts

If ports are in use, update docker-compose.yml or stop conflicting services.

### Database Connection

Ensure PostgreSQL is running and credentials match .env file.

### Node Modules

If dependencies are out of sync, run `npm ci` in root and packages.