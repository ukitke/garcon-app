import { Pool } from 'pg';
import { getPool } from '../config/database';
import { 
  Review, 
  CreateReviewRequest, 
  LocationReviewSummary,
  ReviewCategories,
  MonthlyReviewTrend
} from '../types/reservation';

export class ReviewService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createReview(request: CreateReviewRequest): Promise<Review> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if user already reviewed this reservation/session
      if (request.reservationId || request.sessionId) {
        const existingQuery = `
          SELECT id FROM reviews 
          WHERE location_id = $1 
            AND (reservation_id = $2 OR session_id = $3)
            AND (user_id = $4 OR customer_email = $5)
        `;

        const existingResult = await client.query(existingQuery, [
          request.locationId,
          request.reservationId || null,
          request.sessionId || null,
          request.userId || null,
          request.customerEmail || null
        ]);

        if (existingResult.rows.length > 0) {
          throw new Error('Review already exists for this reservation/session');
        }
      }

      // Create review
      const reviewQuery = `
        INSERT INTO reviews (
          location_id, user_id, customer_name, customer_email, reservation_id, session_id,
          rating, review_text, food_rating, service_rating, atmosphere_rating, value_rating,
          is_verified, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending')
        RETURNING id, location_id as "locationId", user_id as "userId", customer_name as "customerName",
                  customer_email as "customerEmail", reservation_id as "reservationId", session_id as "sessionId",
                  rating, review_text as "reviewText", food_rating, service_rating, atmosphere_rating, value_rating,
                  is_verified as "isVerified", status, created_at as "createdAt", updated_at as "updatedAt"
      `;

      const isVerified = !!(request.reservationId || request.sessionId);

      const reviewResult = await client.query(reviewQuery, [
        request.locationId,
        request.userId || null,
        request.customerName || null,
        request.customerEmail || null,
        request.reservationId || null,
        request.sessionId || null,
        request.rating,
        request.reviewText || null,
        request.categories.food,
        request.categories.service,
        request.categories.atmosphere,
        request.categories.value,
        isVerified
      ]);

      const review = reviewResult.rows[0];

      // Auto-approve verified reviews
      if (isVerified) {
        await client.query(
          'UPDATE reviews SET status = $1, moderated_at = NOW() WHERE id = $2',
          ['approved', review.id]
        );
        review.status = 'approved';
        review.moderatedAt = new Date();
      }

      await client.query('COMMIT');

      return {
        ...review,
        categories: {
          food: review.food_rating,
          service: review.service_rating,
          atmosphere: review.atmosphere_rating,
          value: review.value_rating
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getReview(reviewId: string): Promise<Review | null> {
    const query = `
      SELECT r.id, r.location_id as "locationId", r.user_id as "userId", r.customer_name as "customerName",
             r.customer_email as "customerEmail", r.reservation_id as "reservationId", r.session_id as "sessionId",
             r.rating, r.review_text as "reviewText", r.food_rating, r.service_rating, r.atmosphere_rating, r.value_rating,
             r.is_verified as "isVerified", r.status, r.created_at as "createdAt", r.updated_at as "updatedAt",
             r.moderated_at as "moderatedAt", r.moderated_by as "moderatedBy"
      FROM reviews r
      WHERE r.id = $1
    `;

    const result = await this.pool.query(query, [reviewId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const review = result.rows[0];
    return {
      ...review,
      categories: {
        food: review.food_rating,
        service: review.service_rating,
        atmosphere: review.atmosphere_rating,
        value: review.value_rating
      }
    };
  }

  async getReviewsForLocation(locationId: string, status: string = 'approved', limit: number = 20, offset: number = 0): Promise<Review[]> {
    const query = `
      SELECT r.id, r.location_id as "locationId", r.user_id as "userId", r.customer_name as "customerName",
             r.customer_email as "customerEmail", r.reservation_id as "reservationId", r.session_id as "sessionId",
             r.rating, r.review_text as "reviewText", r.food_rating, r.service_rating, r.atmosphere_rating, r.value_rating,
             r.is_verified as "isVerified", r.status, r.created_at as "createdAt", r.updated_at as "updatedAt"
      FROM reviews r
      WHERE r.location_id = $1 AND r.status = $2
      ORDER BY r.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await this.pool.query(query, [locationId, status, limit, offset]);
    
    return result.rows.map(review => ({
      ...review,
      categories: {
        food: review.food_rating,
        service: review.service_rating,
        atmosphere: review.atmosphere_rating,
        value: review.value_rating
      }
    }));
  }

  async moderateReview(reviewId: string, moderatorId: string, action: 'approve' | 'reject'): Promise<Review | null> {
    const status = action === 'approve' ? 'approved' : 'rejected';
    
    const query = `
      UPDATE reviews 
      SET status = $1, moderated_at = NOW(), moderated_by = $2, updated_at = NOW()
      WHERE id = $3 AND status = 'pending'
      RETURNING id, location_id as "locationId", user_id as "userId", customer_name as "customerName",
                customer_email as "customerEmail", reservation_id as "reservationId", session_id as "sessionId",
                rating, review_text as "reviewText", food_rating, service_rating, atmosphere_rating, value_rating,
                is_verified as "isVerified", status, created_at as "createdAt", updated_at as "updatedAt",
                moderated_at as "moderatedAt", moderated_by as "moderatedBy"
    `;

    const result = await this.pool.query(query, [status, moderatorId, reviewId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const review = result.rows[0];
    return {
      ...review,
      categories: {
        food: review.food_rating,
        service: review.service_rating,
        atmosphere: review.atmosphere_rating,
        value: review.value_rating
      }
    };
  }

  async getLocationReviewSummary(locationId: string): Promise<LocationReviewSummary> {
    // Get basic statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        AVG(food_rating) as avg_food,
        AVG(service_rating) as avg_service,
        AVG(atmosphere_rating) as avg_atmosphere,
        AVG(value_rating) as avg_value,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5
      FROM reviews
      WHERE location_id = $1 AND status = 'approved'
    `;

    const statsResult = await this.pool.query(statsQuery, [locationId]);
    const stats = statsResult.rows[0];

    // Get recent reviews
    const recentReviews = await this.getReviewsForLocation(locationId, 'approved', 5, 0);

    // Get monthly trends (last 12 months)
    const trendsQuery = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating
      FROM reviews
      WHERE location_id = $1 
        AND status = 'approved'
        AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
    `;

    const trendsResult = await this.pool.query(trendsQuery, [locationId]);
    const monthlyTrends: MonthlyReviewTrend[] = trendsResult.rows.map(row => ({
      month: row.month,
      totalReviews: parseInt(row.total_reviews),
      averageRating: parseFloat(row.average_rating)
    }));

    return {
      locationId,
      totalReviews: parseInt(stats.total_reviews) || 0,
      averageRating: parseFloat(stats.average_rating) || 0,
      ratingDistribution: {
        1: parseInt(stats.rating_1) || 0,
        2: parseInt(stats.rating_2) || 0,
        3: parseInt(stats.rating_3) || 0,
        4: parseInt(stats.rating_4) || 0,
        5: parseInt(stats.rating_5) || 0
      },
      categoryAverages: {
        food: parseFloat(stats.avg_food) || 0,
        service: parseFloat(stats.avg_service) || 0,
        atmosphere: parseFloat(stats.avg_atmosphere) || 0,
        value: parseFloat(stats.avg_value) || 0
      },
      recentReviews,
      monthlyTrends
    };
  }

  async getPendingReviews(locationId?: string): Promise<Review[]> {
    let query = `
      SELECT r.id, r.location_id as "locationId", r.user_id as "userId", r.customer_name as "customerName",
             r.customer_email as "customerEmail", r.reservation_id as "reservationId", r.session_id as "sessionId",
             r.rating, r.review_text as "reviewText", r.food_rating, r.service_rating, r.atmosphere_rating, r.value_rating,
             r.is_verified as "isVerified", r.status, r.created_at as "createdAt", r.updated_at as "updatedAt",
             l.name as "locationName"
      FROM reviews r
      JOIN locations l ON r.location_id = l.id
      WHERE r.status = 'pending'
    `;

    const params: any[] = [];

    if (locationId) {
      query += ` AND r.location_id = $1`;
      params.push(locationId);
    }

    query += ` ORDER BY r.created_at ASC`;

    const result = await this.pool.query(query, params);
    
    return result.rows.map(review => ({
      ...review,
      categories: {
        food: review.food_rating,
        service: review.service_rating,
        atmosphere: review.atmosphere_rating,
        value: review.value_rating
      }
    }));
  }

  async deleteReview(reviewId: string): Promise<boolean> {
    const query = `
      DELETE FROM reviews
      WHERE id = $1
      RETURNING id
    `;

    const result = await this.pool.query(query, [reviewId]);
    return result.rows.length > 0;
  }

  async getReviewsByUser(userId: string): Promise<Review[]> {
    const query = `
      SELECT r.id, r.location_id as "locationId", r.user_id as "userId", r.customer_name as "customerName",
             r.customer_email as "customerEmail", r.reservation_id as "reservationId", r.session_id as "sessionId",
             r.rating, r.review_text as "reviewText", r.food_rating, r.service_rating, r.atmosphere_rating, r.value_rating,
             r.is_verified as "isVerified", r.status, r.created_at as "createdAt", r.updated_at as "updatedAt",
             l.name as "locationName"
      FROM reviews r
      JOIN locations l ON r.location_id = l.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
    `;

    const result = await this.pool.query(query, [userId]);
    
    return result.rows.map(review => ({
      ...review,
      categories: {
        food: review.food_rating,
        service: review.service_rating,
        atmosphere: review.atmosphere_rating,
        value: review.value_rating
      }
    }));
  }

  async canUserReview(userId: string, locationId: string, reservationId?: string, sessionId?: string): Promise<boolean> {
    // Check if user has a completed reservation or session
    let hasValidExperience = false;

    if (reservationId) {
      const reservationQuery = `
        SELECT id FROM reservations 
        WHERE id = $1 AND location_id = $2 AND user_id = $3 AND status = 'completed'
      `;
      const reservationResult = await this.pool.query(reservationQuery, [reservationId, locationId, userId]);
      hasValidExperience = reservationResult.rows.length > 0;
    }

    if (!hasValidExperience && sessionId) {
      const sessionQuery = `
        SELECT sp.id FROM session_participants sp
        JOIN table_sessions ts ON sp.session_id = ts.id
        JOIN tables t ON ts.table_id = t.id
        WHERE sp.session_id = $1 AND t.location_id = $2 AND sp.user_id = $3
      `;
      const sessionResult = await this.pool.query(sessionQuery, [sessionId, locationId, userId]);
      hasValidExperience = sessionResult.rows.length > 0;
    }

    if (!hasValidExperience) {
      return false;
    }

    // Check if user already reviewed
    const existingQuery = `
      SELECT id FROM reviews 
      WHERE location_id = $1 AND user_id = $2
        AND (reservation_id = $3 OR session_id = $4)
    `;

    const existingResult = await this.pool.query(existingQuery, [
      locationId, userId, reservationId || null, sessionId || null
    ]);

    return existingResult.rows.length === 0;
  }
}

export const reviewService = new ReviewService();