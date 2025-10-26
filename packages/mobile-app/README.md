# Garçon Mobile App

React Native mobile application for Garçon customers and waiters.

## Features

- Cross-platform (iOS & Android)
- Location-based restaurant detection
- Menu browsing and ordering
- Real-time waiter calls
- Multiple payment options
- Table reservations and reviews

## Quick Start

### Prerequisites

- React Native development environment
- Node.js 18+
- iOS: Xcode and iOS Simulator
- Android: Android Studio and Android SDK

### Installation

```bash
# Install dependencies
npm install

# iOS setup (macOS only)
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Development

- `npm start` - Start Metro bundler
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm test` - Run test suite
- `npm run lint` - Run ESLint

## Build for Production

```bash
# Android
npm run build:android

# iOS
npm run build:ios
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── screens/        # Screen components
├── navigation/     # Navigation configuration
├── store/          # Redux store and slices
├── services/       # API and external services
├── utils/          # Utility functions
└── types/          # TypeScript type definitions
```