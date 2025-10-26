export interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  ownerId: string;
  subscriptionTier: 'free' | 'premium';
  isActive: boolean;
  settings: LocationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationSettings {
  coverageRadius?: number; // meters, default 50
  autoAcceptOrders?: boolean;
  operatingHours?: OperatingHours;
  maxTableCapacity?: number;
}

export interface OperatingHours {
  [key: string]: {
    open: string; // HH:MM format
    close: string; // HH:MM format
    isOpen: boolean;
  };
}

export interface Table {
  id: string;
  locationId: string;
  number: string;
  capacity: number;
  isActive: boolean;
  currentSession?: TableSession;
  createdAt: Date;
}

export interface TableSession {
  id: string;
  tableId: string;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  participants: SessionParticipant[];
  createdAt: Date;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId?: string;
  fantasyName: string;
  joinedAt: Date;
}

export interface LocationDetectionRequest {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface LocationDetectionResponse {
  locations: NearbyLocation[];
  detectedLocation?: NearbyLocation;
  requiresManualSelection: boolean;
}

export interface NearbyLocation {
  id: string;
  name: string;
  address: string;
  distance: number; // meters
  isWithinRange: boolean;
}

export interface CheckinRequest {
  locationId: string;
  tableNumber: string;
  userId?: string;
}

export interface CheckinResponse {
  sessionId: string;
  participantId: string;
  fantasyName: string;
  tableInfo: {
    id: string;
    number: string;
    capacity: number;
  };
}

export interface CreateLocationRequest {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  settings?: Partial<LocationSettings>;
}

export interface UpdateLocationRequest {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  settings?: Partial<LocationSettings>;
  isActive?: boolean;
}