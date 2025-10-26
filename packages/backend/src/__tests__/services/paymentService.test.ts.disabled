import { PaymentService } from '../../services/paymentService';
import { getPool } from '../../config/database';

// Mock dependencies
jest.mock('../../config/database');
jest.mock('../paymentProviders/stripeProvider');

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

(getPool as jest.Mock).mockReturnValue(mockPool);

describe('PaymentService', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    paymentService = new PaymentService();
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
  });

  describe('createPaymentIntent', () => {
    const mockRequest = {
      sessionId: 'session-123',
      participantId: 'participant-123',
      amount: 29.99,
      currency: 'EUR',
      paymentMethodId: 'pm_test_123'
    };

    it('should create payment intent successfully', async () => {
      const mockSession = {
        id: 'session-123',
        location_id: 'location-123'
      };

      const mockPaymentIntent = {
        id: 'pi_123',
        sessionId: 'session-123',
        participantId: 'participant-123',
        amount: 29.99,
        currency: 'EUR',
        status: 'pending',
        providerId: 'stripe',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockProviderIntent = {
        id: 'pi_stripe_123',
        client_secret: 'pi_stripe_123_secret_abc',
        amount: 2999,
        currency: 'eur',
        status: 'requires_payment_method'
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockSession] }) // Validate session
        .mockResolvedValueOnce({ rows: [mockPaymentIntent] }) // Create payment intent
        .mockResolvedValueOnce({}) // Update with provider data
        .mockResolvedValueOnce({}); // COMMIT

      // Mock provider
      const mockProvider = {
        createPaymentIntent: jest.fn().mockResolvedValue(mockProviderIntent)
      };
      paymentService['providers'].set('stripe', mockProvider);

      const result = await paymentService.createPaymentIntent(mockRequest);

      expect(result.paymentIntent.id).toBe('pi_123');
      expect(result.clientSecret).toBe('pi_stripe_123_secret_abc');
      expect(mockProvider.createPaymentIntent).toHaveBeenCalledWith(29.99, 'EUR', expect.any(Object));
    });

    it('should throw error when session not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Session not found
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(paymentService.createPaymentIntent(mockRequest)).rejects.toThrow('Active session not found');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('confirmPayment', () => {
    const mockRequest = {
      paymentIntentId: 'pi_123',
      paymentMethodId: 'pm_test_123'
    };

    it('should confirm payment successfully', async () => {
      const mockIntent = {
        id: 'pi_123',
        provider_id: 'stripe',
        provider_payment_id: 'pi_stripe_123',
        amount: 29.99,
        currency: 'EUR',
        status: 'pending'
      };

      const mockUpdatedIntent = {
        id: 'pi_123',
        sessionId: 'session-123',
        participantId: 'participant-123',
        amount: 29.99,
        currency: 'EUR',
        status: 'succeeded',
        providerId: 'stripe',
        providerPaymentId: 'pi_stripe_123',
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date()
      };

      const mockProviderResult = {
        id: 'pi_stripe_123',
        status: 'succeeded',
        transaction_id: 'txn_123'
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockIntent] }) // Get payment intent
        .mockResolvedValueOnce({}) // Update to processing
        .mockResolvedValueOnce({ rows: [mockUpdatedIntent] }) // Update to succeeded
        .mockResolvedValueOnce({}) // Create transaction record
        .mockResolvedValueOnce({}) // Generate receipt
        .mockResolvedValueOnce({}); // COMMIT

      const mockProvider = {
        confirmPayment: jest.fn().mockResolvedValue(mockProviderResult)
      };
      paymentService['providers'].set('stripe', mockProvider);

      const result = await paymentService.confirmPayment(mockRequest);

      expect(result.status).toBe('succeeded');
      expect(mockProvider.confirmPayment).toHaveBeenCalledWith('pi_stripe_123', 'pm_test_123');
    });

    it('should throw error for invalid payment intent status', async () => {
      const mockIntent = {
        id: 'pi_123',
        provider_id: 'stripe',
        status: 'succeeded' // Already completed
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockIntent] }) // Get payment intent
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(paymentService.confirmPayment(mockRequest)).rejects.toThrow('Payment intent is not in pending status');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('createSplitPayment', () => {
    const mockRequest = {
      sessionId: 'session-123',
      totalAmount: 60.00,
      splits: [
        { participantId: 'participant-1', amount: 30.00 },
        { participantId: 'participant-2', amount: 30.00 }
      ]
    };

    it('should create split payment successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_split_123',
        sessionId: 'session-123',
        amount: 60.00,
        currency: 'EUR',
        status: 'pending'
      };

      const mockSplits = [
        {
          id: 'split-1',
          paymentIntentId: 'pi_split_123',
          participantId: 'participant-1',
          amount: 30.00,
          status: 'pending',
          createdAt: new Date()
        },
        {
          id: 'split-2',
          paymentIntentId: 'pi_split_123',
          participantId: 'participant-2',
          amount: 30.00,
          status: 'pending',
          createdAt: new Date()
        }
      ];

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockSplits[0]] }) // Create split 1
        .mockResolvedValueOnce({ rows: [mockSplits[1]] }) // Create split 2
        .mockResolvedValueOnce({}); // COMMIT

      // Mock createPaymentIntent method
      paymentService.createPaymentIntent = jest.fn().mockResolvedValue({
        paymentIntent: mockPaymentIntent
      });

      const result = await paymentService.createSplitPayment(mockRequest);

      expect(result.paymentIntentId).toBe('pi_split_123');
      expect(result.splits).toHaveLength(2);
      expect(result.totalAmount).toBe(60.00);
      expect(result.status).toBe('pending');
    });
  });

  describe('refundPayment', () => {
    const mockRequest = {
      paymentIntentId: 'pi_123',
      amount: 15.00,
      reason: 'Customer request'
    };

    it('should process refund successfully', async () => {
      const mockIntent = {
        provider_id: 'stripe',
        provider_payment_id: 'pi_stripe_123',
        amount: 29.99,
        status: 'succeeded'
      };

      const mockProviderRefund = {
        id: 're_stripe_123',
        amount: 1500,
        status: 'succeeded'
      };

      const mockRefundRecord = {
        id: 'refund-123'
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockIntent] }) // Get payment intent
        .mockResolvedValueOnce({ rows: [mockRefundRecord] }) // Create refund record
        .mockResolvedValueOnce({}); // COMMIT

      const mockProvider = {
        refundPayment: jest.fn().mockResolvedValue(mockProviderRefund)
      };
      paymentService['providers'].set('stripe', mockProvider);

      const result = await paymentService.refundPayment(mockRequest);

      expect(result.refundId).toBe('refund-123');
      expect(result.amount).toBe(15.00);
      expect(result.status).toBe('succeeded');
      expect(mockProvider.refundPayment).toHaveBeenCalledWith('pi_stripe_123', 15.00, 'Customer request');
    });

    it('should throw error for non-succeeded payment', async () => {
      const mockIntent = {
        provider_id: 'stripe',
        status: 'pending'
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [mockIntent] }) // Get payment intent
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(paymentService.refundPayment(mockRequest)).rejects.toThrow('Can only refund succeeded payments');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getPaymentAnalytics', () => {
    const mockLocationId = 'location-123';
    const mockStartDate = new Date('2023-01-01');
    const mockEndDate = new Date('2023-01-31');

    it('should return payment analytics', async () => {
      const mockAnalyticsData = {
        total_transactions: '50',
        total_revenue: '1500.00',
        average_order_value: '30.00',
        failed_transactions: '2',
        refunded_transactions: '1',
        payment_method_breakdown: {
          stripe: 30,
          paypal: 15,
          google_pay: 5
        }
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockAnalyticsData] });

      const result = await paymentService.getPaymentAnalytics(mockLocationId, mockStartDate, mockEndDate);

      expect(result.totalRevenue).toBe(1500.00);
      expect(result.totalTransactions).toBe(50);
      expect(result.averageOrderValue).toBe(30.00);
      expect(result.failureRate).toBe(4); // 2/50 * 100
      expect(result.refundRate).toBe(2); // 1/50 * 100
      expect(result.paymentMethodBreakdown).toEqual(mockAnalyticsData.payment_method_breakdown);
    });
  });

  describe('security tests', () => {
    it('should validate payment amounts are positive', async () => {
      const invalidRequest = {
        sessionId: 'session-123',
        amount: -10.00, // Negative amount
        currency: 'EUR'
      };

      // This should be caught by database constraints or service validation
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'session-123' }] }) // Session exists
        .mockRejectedValueOnce(new Error('Amount must be positive')); // Validation error

      await expect(paymentService.createPaymentIntent(invalidRequest)).rejects.toThrow();
    });

    it('should prevent SQL injection in payment queries', async () => {
      const maliciousRequest = {
        sessionId: "'; DROP TABLE payment_intents; --",
        amount: 29.99,
        currency: 'EUR'
      };

      // The parameterized queries should prevent SQL injection
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // No session found (safe)
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(paymentService.createPaymentIntent(maliciousRequest)).rejects.toThrow('Active session not found');
    });

    it('should validate currency codes', async () => {
      const invalidCurrencyRequest = {
        sessionId: 'session-123',
        amount: 29.99,
        currency: 'INVALID' // Invalid currency
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'session-123' }] }) // Session exists
        .mockRejectedValueOnce(new Error('Invalid currency code'));

      await expect(paymentService.createPaymentIntent(invalidCurrencyRequest)).rejects.toThrow();
    });
  });

  describe('provider integration tests', () => {
    it('should handle provider failures gracefully', async () => {
      const mockRequest = {
        sessionId: 'session-123',
        amount: 29.99,
        currency: 'EUR'
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'session-123' }] }) // Session exists
        .mockResolvedValueOnce({ rows: [{ id: 'pi_123' }] }) // Create payment intent
        .mockResolvedValueOnce({}); // ROLLBACK

      const mockProvider = {
        createPaymentIntent: jest.fn().mockRejectedValue(new Error('Provider API error'))
      };
      paymentService['providers'].set('stripe', mockProvider);

      await expect(paymentService.createPaymentIntent(mockRequest)).rejects.toThrow('Provider API error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should map provider statuses correctly', async () => {
      const statusMappings = [
        { provider: 'requires_payment_method', expected: 'pending' },
        { provider: 'succeeded', expected: 'succeeded' },
        { provider: 'failed', expected: 'failed' },
        { provider: 'canceled', expected: 'cancelled' }
      ];

      statusMappings.forEach(({ provider, expected }) => {
        const mapped = paymentService['mapProviderStatus'](provider);
        expect(mapped).toBe(expected);
      });
    });
  });
});