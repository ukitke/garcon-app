import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, requireRole, optionalAuthMiddleware } from '../../middleware/authMiddleware';

jest.mock('jsonwebtoken');

const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('should authenticate valid token successfully', () => {
      const mockPayload = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'customer',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockJwt.verify.mockReturnValue(mockPayload);

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).user).toEqual({
        userId: 'user-id',
        email: 'test@example.com',
        role: 'customer',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when no authorization header', () => {
      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authorization header is required',
          timestamp: expect.any(String),
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when no token provided', () => {
      mockRequest.headers = {
        authorization: 'Bearer',
      };

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token is required',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 401 for expired token', () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token',
      };

      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      mockJwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 401 for invalid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      const invalidError = new Error('Invalid token');
      invalidError.name = 'JsonWebTokenError';
      mockJwt.verify.mockImplementation(() => {
        throw invalidError;
      });

      authMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('requireRole', () => {
    it('should allow access for authorized role', () => {
      (mockRequest as any).user = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'owner',
      };

      const roleMiddleware = requireRole(['owner', 'waiter']);
      roleMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', () => {
      (mockRequest as any).user = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'customer',
      };

      const roleMiddleware = requireRole(['owner', 'waiter']);
      roleMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Required roles: owner, waiter',
          timestamp: expect.any(String),
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when no user in request', () => {
      const roleMiddleware = requireRole(['owner']);
      roleMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: expect.any(String),
        },
      });
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('should set user when valid token provided', () => {
      const mockPayload = {
        userId: 'user-id',
        email: 'test@example.com',
        role: 'customer',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      mockJwt.verify.mockReturnValue(mockPayload);

      optionalAuthMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).user).toEqual({
        userId: 'user-id',
        email: 'test@example.com',
        role: 'customer',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without user when no token provided', () => {
      optionalAuthMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue without user when invalid token provided', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      optionalAuthMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});