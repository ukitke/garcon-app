import { ReservationService } from '../../services/reservationService';
import { getPool } from '../../config/database';

jest.mock('../../config/database');

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

(getPool as jest.Mock).mockReturnValue(mockPool);

describe('ReservationService', () => {
  let reservationService: ReservationService;

  beforeEach(() => {
    reservationService = new ReservationService();
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
  });

  describe('createReservation', () => {
    const mockRequest = {
      locationId: 'location-123',
      userId: 'user-123',
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      customerPhone: '+1234567890',
      partySize: 4,
      reservationDate: '2024-01-15',
      reservationTime: '19:00',
      specialRequests: 'Window table preferred'
    };

    it('should create reservation successfully', async () => {
      const mockReservation = {
        id: 'reservation-123',
        locationId: 'location-123',
        userId: 'user-123',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerPhone: '+1234567890',
        partySize: 4,
        reservationDate: '2024-01-15',
        reservationTime: '19:00',
        duration: 120,
        status: 'pending',
        tableId: null,
        specialRequests: 'Window table preferred',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock availability check
      reservationService.checkAvailability = jest.fn().mockResolvedValue(true);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockReservation] }) // INSERT reservation
        .mockResolvedValueOnce({}) // Schedule reminder
        .mockResolvedValueOnce({}); // COMMIT

      const result = await reservationService.createReservation(mockRequest);

      expect(result).toEqual(mockReservation);
      expect(reservationService.checkAvailability).toHaveBeenCalledWith(
        'location-123', '2024-01-15', '19:00', 4
      );
    });

    it('should throw error when no availability', async () => {
      reservationService.checkAvailability = jest.fn().mockResolvedValue(false);

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(reservationService.createReservation(mockRequest))
        .rejects.toThrow('No availability for the requested time slot');
    });
  });

  describe('checkAvailability', () => {
    it('should return true when tables are available', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ available_tables: '5' }] }) // Total tables
        .mockResolvedValueOnce({ rows: [{ booked_tables: '2' }] }); // Booked tables

      const result = await reservationService.checkAvailability(
        'location-123', '2024-01-15', '19:00', 4
      );

      expect(result).toBe(true);
    });

    it('should return false when no tables available', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ available_tables: '3' }] }) // Total tables
        .mockResolvedValueOnce({ rows: [{ booked_tables: '3' }] }); // All booked

      const result = await reservationService.checkAvailability(
        'location-123', '2024-01-15', '19:00', 4
      );

      expect(result).toBe(false);
    });

    it('should return false when no suitable tables for party size', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ available_tables: '0' }] }); // No suitable tables

      const result = await reservationService.checkAvailability(
        'location-123', '2024-01-15', '19:00', 12
      );

      expect(result).toBe(false);
    });
  });

  describe('confirmReservation', () => {
    it('should confirm pending reservation', async () => {
      const mockConfirmedReservation = {
        id: 'reservation-123',
        status: 'confirmed',
        confirmedAt: new Date(),
        reservationDate: '2024-01-15',
        reservationTime: '19:00'
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockConfirmedReservation] });

      const result = await reservationService.confirmReservation('reservation-123');

      expect(result).toEqual(mockConfirmedReservation);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'confirmed'"),
        ['reservation-123']
      );
    });

    it('should return null for non-pending reservation', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await reservationService.confirmReservation('reservation-123');

      expect(result).toBeNull();
    });
  });

  describe('getAvailability', () => {
    it('should return availability for open day', async () => {
      const mockSettings = {
        operating_hours: {
          monday: {
            isOpen: true,
            open: '18:00',
            close: '22:00',
            reservationSlots: ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30']
          }
        },
        default_reservation_duration: 120
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      // Mock availability checks
      reservationService.checkAvailability = jest.fn().mockResolvedValue(true);
      reservationService['getAvailableTablesCount'] = jest.fn().mockResolvedValue(3);
      reservationService['getMaxPartySizeForSlot'] = jest.fn().mockResolvedValue(8);

      const result = await reservationService.getAvailability('location-123', '2024-01-15');

      expect(result.date).toBe('2024-01-15');
      expect(result.timeSlots).toHaveLength(8);
      expect(result.timeSlots[0]).toEqual({
        time: '18:00',
        available: true,
        availableTables: 3,
        maxPartySize: 8,
        estimatedWaitTime: 0
      });
    });

    it('should return empty slots for closed day', async () => {
      const mockSettings = {
        operating_hours: {
          monday: {
            isOpen: false
          }
        }
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockSettings] });

      const result = await reservationService.getAvailability('location-123', '2024-01-15');

      expect(result.date).toBe('2024-01-15');
      expect(result.timeSlots).toEqual([]);
    });
  });

  describe('getReservationAnalytics', () => {
    it('should return comprehensive analytics', async () => {
      const mockAnalyticsData = {
        total_reservations: '100',
        confirmed_reservations: '85',
        cancelled_reservations: '10',
        no_show_reservations: '5',
        average_party_size: '3.5',
        peak_hours: { '19': 25, '20': 30, '21': 20 },
        peak_days: { '5': 20, '6': 35, '0': 25 } // Friday, Saturday, Sunday
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockAnalyticsData] });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await reservationService.getReservationAnalytics('location-123', startDate, endDate);

      expect(result.totalReservations).toBe(100);
      expect(result.confirmedReservations).toBe(85);
      expect(result.cancelledReservations).toBe(10);
      expect(result.noShowReservations).toBe(5);
      expect(result.averagePartySize).toBe(3.5);
      expect(result.confirmationRate).toBe(85);
      expect(result.cancellationRate).toBe(10);
      expect(result.noShowRate).toBe(5);
      expect(result.peakHours).toEqual({ '19': 25, '20': 30, '21': 20 });
    });
  });

  describe('seatReservation', () => {
    it('should seat confirmed reservation', async () => {
      const mockSeatedReservation = {
        id: 'reservation-123',
        status: 'seated',
        tableId: 'table-5',
        seatedAt: new Date()
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockSeatedReservation] });

      const result = await reservationService.seatReservation('reservation-123', 'table-5');

      expect(result).toEqual(mockSeatedReservation);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("SET status = 'seated'"),
        ['table-5', 'reservation-123']
      );
    });
  });

  describe('completeReservation', () => {
    it('should complete seated reservation and schedule follow-up', async () => {
      const mockCompletedReservation = {
        id: 'reservation-123',
        status: 'completed',
        completedAt: new Date()
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCompletedReservation] }) // UPDATE reservation
        .mockResolvedValueOnce({}) // Schedule follow-up reminder
        .mockResolvedValueOnce({}); // COMMIT

      const result = await reservationService.completeReservation('reservation-123');

      expect(result).toEqual(mockCompletedReservation);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('time utility methods', () => {
    it('should convert time to minutes correctly', () => {
      expect(reservationService['timeToMinutes']('09:30')).toBe(570);
      expect(reservationService['timeToMinutes']('18:00')).toBe(1080);
      expect(reservationService['timeToMinutes']('23:45')).toBe(1425);
    });

    it('should convert minutes to time correctly', () => {
      expect(reservationService['minutesToTime'](570)).toBe('09:30');
      expect(reservationService['minutesToTime'](1080)).toBe('18:00');
      expect(reservationService['minutesToTime'](1425)).toBe('23:45');
    });

    it('should generate time slots correctly', () => {
      const slots = reservationService['generateTimeSlots']('18:00', '21:00');
      
      expect(slots).toEqual([
        '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
      ]);
    });
  });
});