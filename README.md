# Garçon App

Digital restaurant service platform that digitalizes table service experience in restaurants.

## Architecture

This is a monorepo containing:

- **Backend Services** (`packages/backend`) - Node.js microservices with TypeScript
- **Mobile App** (`packages/mobile-app`) - React Native app for customers and waiters
- **Admin Web Panel** (`packages/admin-web`) - React.js web interface for restaurant owners

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- React Native development environment (for mobile development)

### Installation

```bash
# Install dependencies
npm install

# Start development environment
npm run docker:up
npm run dev
```

### Development Commands

```bash
# Start all services in development mode
npm run dev

# Start individual services
npm run dev:backend
npm run dev:admin
npm run dev:mobile

# Code quality
npm run lint
npm run format
npm run test

# Docker management
npm run docker:up    # Start databases and services
npm run docker:down  # Stop all containers
npm run docker:logs  # View container logs
```

## Project Structure

```
garcon-app/
├── packages/
│   ├── backend/          # Node.js backend services
│   ├── mobile-app/       # React Native mobile app
│   └── admin-web/        # React.js admin panel
├── docker/               # Docker configurations
├── .github/              # GitHub Actions workflows
└── docs/                 # Documentation
```

## Development Workflow

1. Create feature branch from `main`
2. Make changes in appropriate package
3. Run tests and linting
4. Create pull request
5. Automated CI/CD pipeline runs tests and deploys

## Environment Setup

See individual package README files for specific setup instructions:

- [Backend Setup](packages/backend/README.md)
- [Mobile App Setup](packages/mobile-app/README.md)
- [Admin Web Setup](packages/admin-web/README.md)