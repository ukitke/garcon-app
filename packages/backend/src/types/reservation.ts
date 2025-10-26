export interface Reservation {
  id: string;
  locationId: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  partySize: number;
  reservationDate: Date;
  reservationTime: string; // HH:MM format
  duration: number; // in minutes
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  tableId?: string;
  specialRequests?: string;
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  seatedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export interface Review {
  id: string;
  locationId: string;
  userId?: string;
  customerName?: string;
  customerEmail?: string;
  reservationId?: string;
  sessionId?: string;
  rating: number; // 1-5 stars
  reviewText?: string;
  categories: ReviewCategories;
  isVerified: boolean;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  moderatedAt?: Date;
  moderatedBy?: string;
}

export interface ReviewCategories {
  food: number;
  service: number;
  atmosphere: number;
  value: number;
}

export interface ReservationAvailability {
  date: string;
  timeSlots: TimeSlot[];
}

export interface TimeSlot {
  time: string;
  available: boolean;
  availableTables: number;
  maxPartySize: number;
  estimatedWaitTime?: number;
}

export interface CreateReservationRequest {
  locationId: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  partySize: number;
  reservationDate: string; // YYYY-MM-DD
  reservationTime: string; // HH:MM
  specialRequests?: string;
}

export interface UpdateReservationRequest {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  partySize?: number;
  reservationDate?: string;
  reservationTime?: string;
  specialRequests?: string;
}

export interface CreateReviewRequest {
  locationId: string;
  userId?: string;
  customerName?: string;
  customerEmail?: string;
  reservationId?: string;
  sessionId?: string;
  rating: number;
  reviewText?: string;
  categories: ReviewCategories;
}

export interface ReservationSettings {
  locationId: string;
  maxAdvanceBookingDays: number;
  minAdvanceBookingHours: number;
  defaultReservationDuration: number;
  maxPartySize: number;
  allowWalkIns: boolean;
  requireConfirmation: boolean;
  autoConfirmationMinutes: number;
  operatingHours: OperatingHours;
  blackoutDates: string[];
  specialHours: SpecialHours[];
}

export interface OperatingHours {
  [key: string]: {
    open: string;
    close: string;
    isOpen: boolean;
    reservationSlots: string[];
  };
}

export interface SpecialHours {
  date: string;
  open?: string;
  close?: string;
  isClosed: boolean;
  reason?: string;
}

export interface ReservationReminder {
  id: string;
  reservationId: string;
  type: 'confirmation' | 'reminder' | 'follow_up';
  scheduledAt: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed';
  method: 'email' | 'sms' | 'push';
}

export interface LocationReviewSummary {
  locationId: string;
  totalReviews: number;
  averageRating: number;
  ratingDistribution: { [key: number]: number };
  categoryAverages: ReviewCategories;
  recentReviews: Review[];
  monthlyTrends: MonthlyReviewTrend[];
}

export interface MonthlyReviewTrend {
  month: string;
  totalReviews: number;
  averageRating: number;
}

export interface ReservationAnalytics {
  locationId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalReservations: number;
  confirmedReservations: number;
  cancelledReservations: number;
  noShowReservations: number;
  averagePartySize: number;
  peakHours: { [hour: string]: number };
  peakDays: { [day: string]: number };
  confirmationRate: number;
  cancellationRate: number;
  noShowRate: number;
}