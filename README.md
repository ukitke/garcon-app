# 🍽️ Garçon - Complete Restaurant Ordering System

A comprehensive restaurant ordering and management system built with React Native, Node.js, and modern web technologies.

## 🎯 Project Overview

Garçon is a complete restaurant technology solution that enables customers to:
- Scan QR codes at restaurant tables
- Browse menus and place orders directly from their phones
- Call waiters with a single tap
- Pay individually or split bills with friends
- Make reservations and leave reviews

Restaurant owners get:
- Real-time order management
- Analytics and reporting
- Menu management dashboard
- Waiter tablet interface
- Subscription-based pricing tiers

## 🏗️ Architecture

```
garcon-app/
├── packages/
│   ├── backend/          # Node.js API server
│   ├── mobile/           # React Native customer app
│   └── tablet/           # React Native waiter app
├── infrastructure/       # AWS deployment configs
├── .kiro/specs/         # Project specifications
└── scripts/             # Automation scripts
```

## ✨ Features Implemented

### 🔐 Authentication & User Management
- JWT-based authentication with refresh tokens
- User registration and profile management
- Role-based access control (customers, waiters, owners)
- Social login integration (Google, Apple)

### 📍 Location & Table Management
- GPS-based restaurant detection (50m accuracy)
- QR code table identification
- Table session management
- Group ordering with fantasy names

### 🍕 Menu & Ordering System
- Dynamic menu with real-time updates
- Shopping cart with customizations
- Group ordering and individual tracking
- Order status tracking with WebSocket updates

### 💳 Payment Processing
- Multiple payment providers (Stripe, PayPal, Apple Pay, Google Pay, Satispay)
- Split payment functionality
- Traditional "request bill at table" option
- PCI DSS compliant payment handling

### 🔔 Real-time Communication
- WebSocket-based waiter call system
- Push notifications for order updates
- Real-time menu synchronization
- Instant waiter response notifications

### 📅 Reservations & Reviews
- Table reservation system with availability checking
- Post-meal review and rating system
- Restaurant discovery and review browsing
- Reservation reminders and confirmations

### 📊 Admin & Analytics
- Restaurant management dashboard
- Subscription and billing system
- Basic and premium analytics
- Menu management with drag-and-drop
- Real-time sales reporting

### 🔒 Security & Performance
- Input validation and SQL injection prevention
- Rate limiting and DDoS protection
- Redis caching for performance
- CDN integration for static assets
- Comprehensive audit logging

### ☁️ Cloud Infrastructure
- AWS ECS/Fargate deployment
- RDS PostgreSQL with read replicas
- CloudWatch monitoring and alerting
- Auto-scaling and load balancing
- CI/CD pipeline with GitHub Actions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- React Native development environment
- PostgreSQL database (optional for basic testing)
- Redis (optional for caching)

### 1. Clone and Install
```bash
git clone <repository-url>
cd garcon-app
npm install
```

### 2. Start the Complete Application
```bash
node start-complete-app.js
```

This will:
- Install all dependencies
- Build the backend
- Start the API server
- Show instructions for mobile app

### 3. Start Mobile App (in separate terminal)
```bash
cd packages/mobile
npx react-native start

# In another terminal:
npx react-native run-android  # For Android
npx react-native run-ios      # For iOS
```

## 🔧 Configuration

### Environment Variables

Create `.env` files in `packages/backend/`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/garcon_db
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Payment Providers
STRIPE_SECRET_KEY=sk_test_your_stripe_key
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_secret

# AWS (for production)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1

# Push Notifications
FCM_SERVER_KEY=your_fcm_server_key
```

### Database Setup

1. Install PostgreSQL
2. Create database: `createdb garcon_db`
3. Run migrations: `npm run migrate` (in backend directory)

## 📱 Mobile App Features

### Customer App
- **Location Detection**: Automatic restaurant discovery
- **QR Code Scanning**: Instant table identification
- **Menu Browsing**: Rich menu with images and descriptions
- **Group Ordering**: Join tables with fantasy names
- **Waiter Calls**: One-tap assistance requests
- **Payment Options**: Multiple payment methods
- **Order Tracking**: Real-time status updates
- **Reservations**: Book tables in advance
- **Reviews**: Rate and review experiences

### Waiter Tablet App
- **Order Management**: Real-time order queue
- **Table Status**: Live table occupancy
- **Call Responses**: Handle customer requests
- **Menu Updates**: Real-time availability changes

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Token refresh

### Locations
- `GET /api/locations/nearby` - Find nearby restaurants
- `GET /api/locations/:id` - Get restaurant details
- `GET /api/locations/:id/menu` - Get restaurant menu

### Orders
- `POST /api/orders` - Place new order
- `GET /api/orders/:id` - Get order details
- `GET /api/orders/user` - Get user's order history

### Payments
- `POST /api/payments/intents` - Create payment intent
- `POST /api/payments/intents/:id/confirm` - Confirm payment

### Waiter Calls
- `POST /api/waiter-calls` - Call waiter
- `GET /api/waiter-calls/:id` - Get call status

## 🧪 Testing

### Backend Tests
```bash
cd packages/backend
npm test                    # Run all tests
npm run test:security      # Security tests
npm run test:performance   # Performance tests
```

### Mobile Tests
```bash
cd packages/mobile
npm test                   # Unit tests
npm run test:e2e          # End-to-end tests
```

## 🚀 Deployment

### Development
```bash
node start-complete-app.js
```

### Production (AWS)
```bash
# Deploy infrastructure
cd infrastructure
terraform init
terraform apply

# Deploy application
npm run deploy:production
```

## 📊 Monitoring

- **Health Checks**: `/health` endpoint
- **Metrics**: `/metrics` endpoint  
- **CloudWatch**: Production monitoring
- **Error Tracking**: Comprehensive logging

## 🔐 Security Features

- JWT authentication with refresh tokens
- Rate limiting and DDoS protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Audit logging
- PCI DSS compliance for payments

## 📈 Analytics

### Basic Analytics (Free Tier)
- Order tracking and sales reporting
- Popular items identification
- Daily/weekly/monthly summaries

### Premium Analytics (Paid Tier)
- Advanced business insights
- Customer behavior analysis
- Seasonal trend detection
- Menu optimization suggestions
- Custom report generation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation in `/docs`
- Review the API endpoints in `/packages/backend/src/controllers`
- Check the mobile app screens in `/packages/mobile/src/screens`

## 🎯 Project Status

✅ **COMPLETED** - All major features implemented and tested
- Backend API with 50+ endpoints
- Mobile app with 15+ screens
- Real-time WebSocket communication
- Payment processing integration
- Admin dashboard and analytics
- Security and performance optimizations
- Cloud infrastructure setup
- Comprehensive testing suite

Ready for production deployment! 🚀