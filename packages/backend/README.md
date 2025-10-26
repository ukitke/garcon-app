# Garçon Backend Services

Node.js backend microservices for the Garçon restaurant platform.

## Features

- RESTful API with Express.js
- Real-time communication with Socket.io
- JWT authentication with refresh tokens
- PostgreSQL database with Redis caching
- Comprehensive security middleware
- Rate limiting and request validation

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev

# Run tests
npm test
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/v1` - API information
- Authentication, locations, menu, orders, payments, reservations, and analytics endpoints (to be implemented)

## Environment Variables

See `.env.example` for required configuration variables.

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run test` - Run test suite
- `npm run test:watch` - Run tests in watch mode