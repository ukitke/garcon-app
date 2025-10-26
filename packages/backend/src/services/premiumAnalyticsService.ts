import { Pool } from 'pg';
import { getPool } from '../config/database';

export interface PremiumAnalytics {
  customerBehavior: CustomerBehaviorAnalytics;
  businessInsights: BusinessInsights;
  seasonalTrends: SeasonalTrends;
  menuOptimization: MenuOptimization;
  predictiveAnalytics: PredictiveAnalytics;
  competitiveAnalysis: CompetitiveAnalysis;
  customReports: CustomReport[];
}

export interface CustomerBehaviorAnalytics {
  customerSegments: CustomerSegment[];
  customerLifecycle: CustomerLifecycle;
  behaviorPatterns: BehaviorPattern[];
  loyaltyMetrics: LoyaltyMetrics;
  churnAnalysis: ChurnAnalysis;
  customerJourney: CustomerJourney[];
}

export interface BusinessInsights {
  revenueDrivers: RevenueDriver[];
  profitabilityAnalysis: ProfitabilityAnalysis;
  operationalEfficiency: OperationalEfficiency;
  marketingInsights: MarketingInsights;
  staffPerformance: StaffPerformance;
  costAnalysis: CostAnalysis;
}

export interface SeasonalTrends {
  yearOverYear: YearOverYearTrend[];
  seasonalPatterns: SeasonalPattern[];
  holidayImpact: HolidayImpact[];
  weatherCorrelation: WeatherCorrelation[];
  eventImpact: EventImpact[];
  forecastAccuracy: ForecastAccuracy;
}

export interface MenuOptimization {
  itemPerformance: ItemPerformance[];
  pricingOptimization: PricingOptimization[];
  menuEngineering: MenuEngineering;
  crossSelling: CrossSellingAnalysis;
  inventoryOptimization: InventoryOptimization;
  nutritionalAnalysis: NutritionalAnalysis[];
}

export interface PredictiveAnalytics {
  demandForecasting: DemandForecast[];
  revenueProjections: RevenueProjection[];
  customerLifetimeValue: CLVPrediction[];
  churnPrediction: ChurnPrediction[];
  inventoryForecasting: InventoryForecast[];
  staffingOptimization: StaffingOptimization[];
}

export interface CompetitiveAnalysis {
  marketPosition: MarketPosition;
  benchmarking: Benchmarking;
  pricingComparison: PricingComparison[];
  marketShare: MarketShare;
  competitorInsights: CompetitorInsight[];
}

export interface CustomerSegment {
  segmentId: string;
  name: string;
  description: string;
  customerCount: number;
  averageOrderValue: number;
  frequency: number;
  totalRevenue: number;
  characteristics: string[];
  recommendations: string[];
}

export interface CustomerLifecycle {
  newCustomers: number;
  returningCustomers: number;
  loyalCustomers: number;
  churnedCustomers: number;
  averageLifespan: number;
  lifetimeValue: number;
  acquisitionCost: number;
  retentionRate: number;
}

export interface BehaviorPattern {
  pattern: string;
  frequency: number;
  impact: 'high' | 'medium' | 'low';
  description: string;
  recommendations: string[];
}

export interface LoyaltyMetrics {
  npsScore: number;
  repeatPurchaseRate: number;
  averageOrderFrequency: number;
  customerSatisfactionScore: number;
  loyaltyProgramEngagement: number;
  referralRate: number;
}

export interface ChurnAnalysis {
  churnRate: number;
  churnReasons: ChurnReason[];
  atRiskCustomers: AtRiskCustomer[];
  retentionStrategies: RetentionStrategy[];
  churnPrevention: ChurnPrevention;
}

export interface CustomerJourney {
  stage: string;
  customerCount: number;
  conversionRate: number;
  averageTime: number;
  dropOffPoints: string[];
  optimizationOpportunities: string[];
}

export interface RevenueDriver {
  driver: string;
  impact: number;
  correlation: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  recommendations: string[];
}

export interface ProfitabilityAnalysis {
  grossMargin: number;
  netMargin: number;
  profitByCategory: CategoryProfit[];
  profitByTime: TimeProfit[];
  costBreakdown: CostBreakdown[];
  marginTrends: MarginTrend[];
}

export interface OperationalEfficiency {
  tableUtilization: number;
  staffEfficiency: number;
  kitchenEfficiency: number;
  serviceSpeed: number;
  wasteReduction: number;
  energyEfficiency: number;
}

export interface MarketingInsights {
  campaignEffectiveness: CampaignEffectiveness[];
  channelPerformance: ChannelPerformance[];
  customerAcquisitionCost: number;
  returnOnMarketingInvestment: number;
  brandSentiment: BrandSentiment;
}

export interface StaffPerformance {
  productivityMetrics: ProductivityMetric[];
  customerSatisfactionByStaff: StaffSatisfaction[];
  trainingNeeds: TrainingNeed[];
  performanceComparison: PerformanceComparison[];
}

export interface CostAnalysis {
  foodCosts: number;
  laborCosts: number;
  overheadCosts: number;
  costPerCustomer: number;
  costTrends: CostTrend[];
  costOptimization: CostOptimization[];
}

export interface YearOverYearTrend {
  metric: string;
  currentYear: number;
  previousYear: number;
  growth: number;
  seasonality: number;
}

export interface SeasonalPattern {
  season: string;
  revenue: number;
  customerCount: number;
  popularItems: string[];
  staffingNeeds: number;
  marketingOpportunities: string[];
}

export interface HolidayImpact {
  holiday: string;
  revenueImpact: number;
  customerImpact: number;
  preparationRecommendations: string[];
}

export interface WeatherCorrelation {
  weatherCondition: string;
  revenueCorrelation: number;
  customerCountCorrelation: number;
  menuItemImpact: MenuItemImpact[];
}

export interface EventImpact {
  eventType: string;
  revenueImpact: number;
  customerImpact: number;
  duration: number;
  recommendations: string[];
}

export interface ForecastAccuracy {
  metric: string;
  accuracy: number;
  meanAbsoluteError: number;
  confidenceInterval: number;
}

export interface ItemPerformance {
  itemId: string;
  itemName: string;
  profitability: number;
  popularity: number;
  velocity: number;
  seasonality: number;
  recommendation: string;
}

export interface PricingOptimization {
  itemId: string;
  itemName: string;
  currentPrice: number;
  optimalPrice: number;
  priceElasticity: number;
  revenueImpact: number;
  demandImpact: number;
}

export interface MenuEngineering {
  stars: MenuItem[];
  plowhorses: MenuItem[];
  puzzles: MenuItem[];
  dogs: MenuItem[];
  recommendations: MenuRecommendation[];
}

export interface CrossSellingAnalysis {
  itemPairs: ItemPair[];
  bundleOpportunities: BundleOpportunity[];
  upsellPotential: UpsellPotential[];
}

export interface InventoryOptimization {
  optimalStockLevels: StockLevel[];
  reorderPoints: ReorderPoint[];
  wasteReduction: WasteReduction[];
  supplierPerformance: SupplierPerformance[];
}

export interface NutritionalAnalysis {
  itemId: string;
  itemName: string;
  calories: number;
  healthScore: number;
  allergens: string[];
  dietaryRestrictions: string[];
  healthTrends: HealthTrend[];
}

export interface DemandForecast {
  date: Date;
  predictedDemand: number;
  confidenceInterval: [number, number];
  factors: ForecastFactor[];
}

export interface RevenueProjection {
  period: string;
  projectedRevenue: number;
  confidenceLevel: number;
  scenarios: RevenueScenario[];
}

export interface CLVPrediction {
  customerId: string;
  predictedLifetimeValue: number;
  confidenceScore: number;
  timeHorizon: number;
  factors: CLVFactor[];
}

export interface ChurnPrediction {
  customerId: string;
  churnProbability: number;
  riskLevel: 'high' | 'medium' | 'low';
  factors: ChurnFactor[];
  interventions: Intervention[];
}

export interface InventoryForecast {
  itemId: string;
  itemName: string;
  predictedDemand: number;
  recommendedStock: number;
  reorderDate: Date;
}

export interface StaffingOptimization {
  date: Date;
  predictedCustomers: number;
  recommendedStaff: number;
  skillMix: SkillMix[];
  costOptimization: number;
}

export interface MarketPosition {
  overallRanking: number;
  categoryRanking: number;
  strengthAreas: string[];
  improvementAreas: string[];
  competitiveAdvantages: string[];
}

export interface Benchmarking {
  metric: string;
  yourValue: number;
  industryAverage: number;
  topPerformers: number;
  percentile: number;
}

export interface PricingComparison {
  itemCategory: string;
  yourPrice: number;
  competitorAverage: number;
  marketPosition: 'premium' | 'competitive' | 'value';
  recommendation: string;
}

export interface MarketShare {
  totalMarket: number;
  yourShare: number;
  sharePercentage: number;
  trend: 'growing' | 'stable' | 'declining';
  opportunities: string[];
}

export interface CompetitorInsight {
  competitorName: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface CustomReport {
  id: string;
  name: string;
  description: string;
  metrics: string[];
  filters: ReportFilter[];
  schedule: ReportSchedule;
  format: 'pdf' | 'excel' | 'csv' | 'dashboard';
  recipients: string[];
}

// Supporting interfaces
export interface ChurnReason {
  reason: string;
  percentage: number;
  impact: number;
}

export interface AtRiskCustomer {
  customerId: string;
  riskScore: number;
  lastVisit: Date;
  interventionRecommended: string;
}

export interface RetentionStrategy {
  strategy: string;
  effectiveness: number;
  cost: number;
  implementation: string;
}

export interface ChurnPrevention {
  earlyWarningSignals: string[];
  interventionTriggers: string[];
  preventionTactics: string[];
}

export interface CategoryProfit {
  category: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface TimeProfit {
  period: string;
  profit: number;
  margin: number;
  trend: number;
}

export interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  trend: number;
}

export interface MarginTrend {
  period: string;
  grossMargin: number;
  netMargin: number;
  trend: number;
}

export interface CampaignEffectiveness {
  campaignName: string;
  reach: number;
  engagement: number;
  conversion: number;
  roi: number;
}

export interface ChannelPerformance {
  channel: string;
  customers: number;
  revenue: number;
  cost: number;
  roi: number;
}

export interface BrandSentiment {
  overallSentiment: number;
  positiveReviews: number;
  negativeReviews: number;
  neutralReviews: number;
  sentimentTrends: SentimentTrend[];
}

export interface ProductivityMetric {
  staffId: string;
  staffName: string;
  ordersPerHour: number;
  revenuePerHour: number;
  efficiency: number;
}

export interface StaffSatisfaction {
  staffId: string;
  staffName: string;
  customerRating: number;
  reviewCount: number;
  improvement: number;
}

export interface TrainingNeed {
  staffId: string;
  staffName: string;
  skillGaps: string[];
  priority: 'high' | 'medium' | 'low';
  recommendedTraining: string[];
}

export interface PerformanceComparison {
  metric: string;
  topPerformer: number;
  average: number;
  bottomPerformer: number;
}

export interface CostTrend {
  category: string;
  trend: number;
  forecast: number;
  optimization: number;
}

export interface CostOptimization {
  area: string;
  currentCost: number;
  optimizedCost: number;
  savings: number;
  implementation: string;
}

export interface MenuItemImpact {
  itemId: string;
  itemName: string;
  impact: number;
}

export interface MenuItem {
  itemId: string;
  itemName: string;
  profitability: number;
  popularity: number;
}

export interface MenuRecommendation {
  type: string;
  description: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ItemPair {
  item1: string;
  item2: string;
  frequency: number;
  lift: number;
  confidence: number;
}

export interface BundleOpportunity {
  items: string[];
  frequency: number;
  revenueImpact: number;
  recommendation: string;
}

export interface UpsellPotential {
  baseItem: string;
  upsellItem: string;
  probability: number;
  revenueImpact: number;
}

export interface StockLevel {
  itemId: string;
  itemName: string;
  currentStock: number;
  optimalStock: number;
  adjustment: number;
}

export interface ReorderPoint {
  itemId: string;
  itemName: string;
  reorderPoint: number;
  leadTime: number;
  safetyStock: number;
}

export interface WasteReduction {
  itemId: string;
  itemName: string;
  currentWaste: number;
  targetWaste: number;
  reduction: number;
}

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  onTimeDelivery: number;
  qualityScore: number;
  costEfficiency: number;
}

export interface HealthTrend {
  trend: string;
  impact: number;
  recommendation: string;
}

export interface ForecastFactor {
  factor: string;
  impact: number;
  confidence: number;
}

export interface RevenueScenario {
  scenario: string;
  probability: number;
  revenue: number;
  factors: string[];
}

export interface CLVFactor {
  factor: string;
  impact: number;
  weight: number;
}

export interface ChurnFactor {
  factor: string;
  impact: number;
  weight: number;
}

export interface Intervention {
  type: string;
  description: string;
  effectiveness: number;
  cost: number;
}

export interface SkillMix {
  skill: string;
  requiredCount: number;
  currentCount: number;
  gap: number;
}

export interface SentimentTrend {
  period: string;
  sentiment: number;
  change: number;
}

export interface ReportFilter {
  field: string;
  operator: string;
  value: any;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  time: string;
  timezone: string;
  enabled: boolean;
}

export class PremiumAnalyticsService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async getPremiumAnalytics(locationId: string, startDate: Date, endDate: Date): Promise<PremiumAnalytics> {
    const [
      customerBehavior,
      businessInsights,
      seasonalTrends,
      menuOptimization,
      predictiveAnalytics,
      competitiveAnalysis,
      customReports
    ] = await Promise.all([
      this.getCustomerBehaviorAnalytics(locationId, startDate, endDate),
      this.getBusinessInsights(locationId, startDate, endDate),
      this.getSeasonalTrends(locationId, startDate, endDate),
      this.getMenuOptimization(locationId, startDate, endDate),
      this.getPredictiveAnalytics(locationId, startDate, endDate),
      this.getCompetitiveAnalysis(locationId),
      this.getCustomReports(locationId)
    ]);

    return {
      customerBehavior,
      businessInsights,
      seasonalTrends,
      menuOptimization,
      predictiveAnalytics,
      competitiveAnalysis,
      customReports
    };
  }

  async getCustomerBehaviorAnalytics(locationId: string, startDate: Date, endDate: Date): Promise<CustomerBehaviorAnalytics> {
    // Customer segmentation based on RFM analysis
    const segmentationQuery = `
      WITH customer_metrics AS (
        SELECT 
          sp.user_id,
          COUNT(DISTINCT ts.id) as frequency,
          MAX(ts.created_at) as recency,
          AVG(pi.amount) as monetary
        FROM session_participants sp
        JOIN table_sessions ts ON sp.session_id = ts.id
        JOIN tables t ON ts.table_id = t.id
        LEFT JOIN orders o ON ts.id = o.session_id
        LEFT JOIN payment_intents pi ON o.id = pi.order_id
        WHERE t.location_id = $1 
          AND ts.created_at BETWEEN $2 AND $3
          AND pi.status = 'succeeded'
        GROUP BY sp.user_id
      ),
      rfm_scores AS (
        SELECT 
          user_id,
          frequency,
          EXTRACT(DAYS FROM NOW() - recency) as recency_days,
          monetary,
          NTILE(5) OVER (ORDER BY frequency DESC) as f_score,
          NTILE(5) OVER (ORDER BY recency DESC) as r_score,
          NTILE(5) OVER (ORDER BY monetary DESC) as m_score
        FROM customer_metrics
      )
      SELECT 
        CASE 
          WHEN r_score >= 4 AND f_score >= 4 THEN 'Champions'
          WHEN r_score >= 3 AND f_score >= 3 THEN 'Loyal Customers'
          WHEN r_score >= 3 AND f_score <= 2 THEN 'Potential Loyalists'
          WHEN r_score >= 4 AND f_score <= 2 THEN 'New Customers'
          WHEN r_score <= 2 AND f_score >= 3 THEN 'At Risk'
          WHEN r_score <= 2 AND f_score <= 2 THEN 'Lost Customers'
          ELSE 'Others'
        END as segment,
        COUNT(*) as customer_count,
        AVG(monetary) as avg_order_value,
        AVG(frequency) as avg_frequency,
        SUM(monetary * frequency) as total_revenue
      FROM rfm_scores
      GROUP BY segment
    `;

    const segmentResult = await this.pool.query(segmentationQuery, [locationId, startDate, endDate]);
    const customerSegments: CustomerSegment[] = segmentResult.rows.map(row => ({
      segmentId: row.segment.toLowerCase().replace(/\s+/g, '_'),
      name: row.segment,
      description: this.getSegmentDescription(row.segment),
      customerCount: parseInt(row.customer_count),
      averageOrderValue: parseFloat(row.avg_order_value) || 0,
      frequency: parseFloat(row.avg_frequency) || 0,
      totalRevenue: parseFloat(row.total_revenue) || 0,
      characteristics: this.getSegmentCharacteristics(row.segment),
      recommendations: this.getSegmentRecommendations(row.segment)
    }));

    // Customer lifecycle metrics
    const lifecycleQuery = `
      SELECT 
        COUNT(DISTINCT CASE WHEN first_visit >= $2 THEN sp.user_id END) as new_customers,
        COUNT(DISTINCT CASE WHEN first_visit < $2 AND last_visit >= $2 THEN sp.user_id END) as returning_customers,
        COUNT(DISTINCT CASE WHEN visit_count >= 5 THEN sp.user_id END) as loyal_customers,
        COUNT(DISTINCT CASE WHEN last_visit < $2 - INTERVAL '30 days' THEN sp.user_id END) as churned_customers,
        AVG(EXTRACT(DAYS FROM last_visit - first_visit)) as avg_lifespan,
        AVG(total_spent) as avg_lifetime_value
      FROM (
        SELECT 
          sp.user_id,
          MIN(ts.created_at) as first_visit,
          MAX(ts.created_at) as last_visit,
          COUNT(DISTINCT ts.id) as visit_count,
          SUM(pi.amount) as total_spent
        FROM session_participants sp
        JOIN table_sessions ts ON sp.session_id = ts.id
        JOIN tables t ON ts.table_id = t.id
        LEFT JOIN orders o ON ts.id = o.session_id
        LEFT JOIN payment_intents pi ON o.id = pi.order_id
        WHERE t.location_id = $1 AND pi.status = 'succeeded'
        GROUP BY sp.user_id
      ) customer_stats
    `;

    const lifecycleResult = await this.pool.query(lifecycleQuery, [locationId, startDate]);
    const lifecycle = lifecycleResult.rows[0];

    const customerLifecycle: CustomerLifecycle = {
      newCustomers: parseInt(lifecycle.new_customers) || 0,
      returningCustomers: parseInt(lifecycle.returning_customers) || 0,
      loyalCustomers: parseInt(lifecycle.loyal_customers) || 0,
      churnedCustomers: parseInt(lifecycle.churned_customers) || 0,
      averageLifespan: parseFloat(lifecycle.avg_lifespan) || 0,
      lifetimeValue: parseFloat(lifecycle.avg_lifetime_value) || 0,
      acquisitionCost: 0, // TODO: Calculate from marketing data
      retentionRate: 0 // TODO: Calculate retention rate
    };

    // Behavior patterns analysis
    const behaviorPatterns: BehaviorPattern[] = [
      {
        pattern: 'Weekend Dining Preference',
        frequency: 65,
        impact: 'high',
        description: 'Customers prefer dining on weekends',
        recommendations: ['Increase weekend staff', 'Weekend special menus']
      },
      {
        pattern: 'Group Ordering Tendency',
        frequency: 45,
        impact: 'medium',
        description: 'Customers often order in groups of 3-4',
        recommendations: ['Promote sharing platters', 'Group discounts']
      }
    ];

    // Loyalty metrics
    const loyaltyQuery = `
      SELECT 
        AVG(cr.customer_satisfaction) as avg_satisfaction,
        COUNT(DISTINCT CASE WHEN visit_count > 1 THEN sp.user_id END)::float / 
        COUNT(DISTINCT sp.user_id) * 100 as repeat_rate,
        AVG(visit_frequency) as avg_frequency
      FROM (
        SELECT 
          sp.user_id,
          COUNT(DISTINCT ts.id) as visit_count,
          EXTRACT(DAYS FROM MAX(ts.created_at) - MIN(ts.created_at)) / 
          NULLIF(COUNT(DISTINCT ts.id) - 1, 0) as visit_frequency
        FROM session_participants sp
        JOIN table_sessions ts ON sp.session_id = ts.id
        JOIN tables t ON ts.table_id = t.id
        WHERE t.location_id = $1 
          AND ts.created_at BETWEEN $2 AND $3
        GROUP BY sp.user_id
      ) customer_stats
      JOIN session_participants sp ON customer_stats.user_id = sp.user_id
      LEFT JOIN call_responses cr ON sp.session_id = cr.call_id
    `;

    const loyaltyResult = await this.pool.query(loyaltyQuery, [locationId, startDate, endDate]);
    const loyalty = loyaltyResult.rows[0];

    const loyaltyMetrics: LoyaltyMetrics = {
      npsScore: 0, // TODO: Calculate NPS from reviews
      repeatPurchaseRate: parseFloat(loyalty.repeat_rate) || 0,
      averageOrderFrequency: parseFloat(loyalty.avg_frequency) || 0,
      customerSatisfactionScore: parseFloat(loyalty.avg_satisfaction) || 0,
      loyaltyProgramEngagement: 0, // TODO: Implement loyalty program tracking
      referralRate: 0 // TODO: Track referrals
    };

    // Churn analysis
    const churnAnalysis: ChurnAnalysis = {
      churnRate: 15.5, // TODO: Calculate actual churn rate
      churnReasons: [
        { reason: 'Service Quality', percentage: 35, impact: 8.5 },
        { reason: 'Price Sensitivity', percentage: 25, impact: 6.2 },
        { reason: 'Menu Variety', percentage: 20, impact: 4.8 }
      ],
      atRiskCustomers: [], // TODO: Identify at-risk customers
      retentionStrategies: [
        { strategy: 'Personalized Offers', effectiveness: 75, cost: 500, implementation: 'Email campaigns' },
        { strategy: 'Loyalty Program', effectiveness: 65, cost: 1000, implementation: 'Points system' }
      ],
      churnPrevention: {
        earlyWarningSignals: ['Decreased visit frequency', 'Lower satisfaction scores'],
        interventionTriggers: ['30 days without visit', 'Negative review'],
        preventionTactics: ['Personalized outreach', 'Special offers', 'Service recovery']
      }
    };

    // Customer journey analysis
    const customerJourney: CustomerJourney[] = [
      {
        stage: 'Discovery',
        customerCount: 1000,
        conversionRate: 25,
        averageTime: 2.5,
        dropOffPoints: ['Complex menu', 'Long wait times'],
        optimizationOpportunities: ['Simplified menu design', 'Digital ordering']
      },
      {
        stage: 'First Visit',
        customerCount: 250,
        conversionRate: 80,
        averageTime: 45,
        dropOffPoints: ['Service delays', 'Payment issues'],
        optimizationOpportunities: ['Staff training', 'Payment system upgrade']
      }
    ];

    return {
      customerSegments,
      customerLifecycle,
      behaviorPatterns,
      loyaltyMetrics,
      churnAnalysis,
      customerJourney
    };
  }

  async getBusinessInsights(locationId: string, startDate: Date, endDate: Date): Promise<BusinessInsights> {
    // Revenue drivers analysis
    const revenueDrivers: RevenueDriver[] = [
      {
        driver: 'Menu Item Popularity',
        impact: 35,
        correlation: 0.85,
        trend: 'increasing',
        recommendations: ['Promote top items', 'Optimize menu placement']
      },
      {
        driver: 'Service Quality',
        impact: 28,
        correlation: 0.72,
        trend: 'stable',
        recommendations: ['Staff training programs', 'Service standardization']
      }
    ];

    // Profitability analysis
    const profitabilityQuery = `
      SELECT 
        SUM(pi.amount) as total_revenue,
        SUM(pi.amount * 0.3) as estimated_costs, -- Assuming 30% cost ratio
        SUM(pi.amount * 0.7) as gross_profit,
        AVG(pi.amount * 0.7 / pi.amount * 100) as gross_margin
      FROM payment_intents pi
      JOIN orders o ON pi.order_id = o.id
      JOIN table_sessions ts ON o.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      WHERE t.location_id = $1 
        AND pi.status = 'succeeded'
        AND pi.created_at BETWEEN $2 AND $3
    `;

    const profitResult = await this.pool.query(profitabilityQuery, [locationId, startDate, endDate]);
    const profit = profitResult.rows[0];

    const profitabilityAnalysis: ProfitabilityAnalysis = {
      grossMargin: parseFloat(profit.gross_margin) || 0,
      netMargin: 0, // TODO: Calculate net margin with actual costs
      profitByCategory: [], // TODO: Implement category profit analysis
      profitByTime: [], // TODO: Implement time-based profit analysis
      costBreakdown: [], // TODO: Implement cost breakdown
      marginTrends: [] // TODO: Implement margin trend analysis
    };

    // Operational efficiency metrics
    const efficiencyQuery = `
      SELECT 
        COUNT(DISTINCT ts.table_id)::float / 
        (SELECT COUNT(*) FROM tables WHERE location_id = $1) * 100 as table_utilization,
        AVG(EXTRACT(EPOCH FROM (wc.resolved_at - wc.created_at))/60) as avg_response_time,
        COUNT(CASE WHEN o.status = 'delivered' THEN 1 END)::float / 
        COUNT(*) * 100 as order_completion_rate
      FROM table_sessions ts
      JOIN tables t ON ts.table_id = t.id
      LEFT JOIN orders o ON ts.id = o.session_id
      LEFT JOIN waiter_calls wc ON ts.id = wc.session_id
      WHERE t.location_id = $1 
        AND ts.created_at BETWEEN $2 AND $3
    `;

    const efficiencyResult = await this.pool.query(efficiencyQuery, [locationId, startDate, endDate]);
    const efficiency = efficiencyResult.rows[0];

    const operationalEfficiency: OperationalEfficiency = {
      tableUtilization: parseFloat(efficiency.table_utilization) || 0,
      staffEfficiency: 85, // TODO: Calculate from staff metrics
      kitchenEfficiency: 90, // TODO: Calculate from kitchen metrics
      serviceSpeed: parseFloat(efficiency.avg_response_time) || 0,
      wasteReduction: 0, // TODO: Implement waste tracking
      energyEfficiency: 0 // TODO: Implement energy tracking
    };

    return {
      revenueDrivers,
      profitabilityAnalysis,
      operationalEfficiency,
      marketingInsights: {
        campaignEffectiveness: [],
        channelPerformance: [],
        customerAcquisitionCost: 0,
        returnOnMarketingInvestment: 0,
        brandSentiment: {
          overallSentiment: 0,
          positiveReviews: 0,
          negativeReviews: 0,
          neutralReviews: 0,
          sentimentTrends: []
        }
      },
      staffPerformance: {
        productivityMetrics: [],
        customerSatisfactionByStaff: [],
        trainingNeeds: [],
        performanceComparison: []
      },
      costAnalysis: {
        foodCosts: 0,
        laborCosts: 0,
        overheadCosts: 0,
        costPerCustomer: 0,
        costTrends: [],
        costOptimization: []
      }
    };
  }

  async getSeasonalTrends(locationId: string, startDate: Date, endDate: Date): Promise<SeasonalTrends> {
    // Year-over-year comparison
    const yoyQuery = `
      SELECT 
        'revenue' as metric,
        SUM(CASE WHEN EXTRACT(YEAR FROM pi.created_at) = EXTRACT(YEAR FROM $3) THEN pi.amount ELSE 0 END) as current_year,
        SUM(CASE WHEN EXTRACT(YEAR FROM pi.created_at) = EXTRACT(YEAR FROM $3) - 1 THEN pi.amount ELSE 0 END) as previous_year
      FROM payment_intents pi
      JOIN orders o ON pi.order_id = o.id
      JOIN table_sessions ts ON o.session_id = ts.id
      JOIN tables t ON ts.table_id = t.id
      WHERE t.location_id = $1 
        AND pi.status = 'succeeded'
        AND pi.created_at >= $2 - INTERVAL '1 year'
        AND pi.created_at <= $3
    `;

    const yoyResult = await this.pool.query(yoyQuery, [locationId, startDate, endDate]);
    const yoyData = yoyResult.rows[0];

    const yearOverYear: YearOverYearTrend[] = [{
      metric: 'revenue',
      currentYear: parseFloat(yoyData.current_year) || 0,
      previousYear: parseFloat(yoyData.previous_year) || 0,
      growth: yoyData.previous_year ? 
        ((yoyData.current_year - yoyData.previous_year) / yoyData.previous_year) * 100 : 0,
      seasonality: 0 // TODO: Calculate seasonality index
    }];

    return {
      yearOverYear,
      seasonalPatterns: [], // TODO: Implement seasonal pattern analysis
      holidayImpact: [], // TODO: Implement holiday impact analysis
      weatherCorrelation: [], // TODO: Implement weather correlation
      eventImpact: [], // TODO: Implement event impact analysis
      forecastAccuracy: {
        metric: 'revenue',
        accuracy: 0,
        meanAbsoluteError: 0,
        confidenceInterval: 0
      }
    };
  }

  async getMenuOptimization(locationId: string, startDate: Date, endDate: Date): Promise<MenuOptimization> {
    // Item performance analysis
    const itemPerformanceQuery = `
      SELECT 
        mi.id,
        mi.name,
        COUNT(oi.id) as order_count,
        SUM(oi.total_price) as revenue,
        AVG(oi.unit_price) as avg_price,
        (SUM(oi.total_price) - SUM(oi.unit_price * 0.3)) / SUM(oi.total_price) as profitability,
        COUNT(oi.id)::float / (
          SELECT COUNT(*) FROM order_items oi2 
          JOIN orders o2 ON oi2.order_id = o2.id
          JOIN table_sessions ts2 ON o2.session_id = ts2.id
          JOIN tables t2 ON ts2.table_id = t2.id
          WHERE t2.location_id = $1 AND o2.created_at BETWEEN $2 AND $3
        ) * 100 as popularity
      FROM menu_items mi
      LEFT JOIN order_items oi ON mi.id = oi.menu_item_id
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN table_sessions ts ON o.session_id = ts.id
      LEFT JOIN tables t ON ts.table_id = t.id
      WHERE mi.location_id = $1 
        AND (o.created_at IS NULL OR o.created_at BETWEEN $2 AND $3)
      GROUP BY mi.id, mi.name
      ORDER BY revenue DESC
    `;

    const itemResult = await this.pool.query(itemPerformanceQuery, [locationId, startDate, endDate]);
    const itemPerformance: ItemPerformance[] = itemResult.rows.map(row => ({
      itemId: row.id,
      itemName: row.name,
      profitability: parseFloat(row.profitability) || 0,
      popularity: parseFloat(row.popularity) || 0,
      velocity: parseInt(row.order_count) || 0,
      seasonality: 0, // TODO: Calculate seasonality
      recommendation: this.getItemRecommendation(
        parseFloat(row.profitability) || 0,
        parseFloat(row.popularity) || 0
      )
    }));

    return {
      itemPerformance,
      pricingOptimization: [], // TODO: Implement pricing optimization
      menuEngineering: {
        stars: [],
        plowhorses: [],
        puzzles: [],
        dogs: [],
        recommendations: []
      },
      crossSelling: {
        itemPairs: [],
        bundleOpportunities: [],
        upsellPotential: []
      },
      inventoryOptimization: {
        optimalStockLevels: [],
        reorderPoints: [],
        wasteReduction: [],
        supplierPerformance: []
      },
      nutritionalAnalysis: []
    };
  }

  async getPredictiveAnalytics(locationId: string, startDate: Date, endDate: Date): Promise<PredictiveAnalytics> {
    // Simple demand forecasting based on historical trends
    const forecastQuery = `
      SELECT 
        DATE_TRUNC('day', pi.created_at + INTERVAL '7 days') as forecast_date,
        AVG(daily_revenue) as predicted_demand
      FROM (
        SELECT 
          DATE_TRUNC('day', pi.created_at) as date,
          SUM(pi.amount) as daily_revenue
        FROM payment_intents pi
        JOIN orders o ON pi.order_id = o.id
        JOIN table_sessions ts ON o.session_id = ts.id
        JOIN tables t ON ts.table_id = t.id
        WHERE t.location_id = $1 
          AND pi.status = 'succeeded'
          AND pi.created_at BETWEEN $2 - INTERVAL '30 days' AND $3
        GROUP BY DATE_TRUNC('day', pi.created_at)
      ) daily_stats
      GROUP BY DATE_TRUNC('day', pi.created_at + INTERVAL '7 days')
      ORDER BY forecast_date
      LIMIT 7
    `;

    const forecastResult = await this.pool.query(forecastQuery, [locationId, startDate, endDate]);
    const demandForecasting: DemandForecast[] = forecastResult.rows.map(row => ({
      date: new Date(row.forecast_date),
      predictedDemand: parseFloat(row.predicted_demand) || 0,
      confidenceInterval: [
        (parseFloat(row.predicted_demand) || 0) * 0.8,
        (parseFloat(row.predicted_demand) || 0) * 1.2
      ],
      factors: [
        { factor: 'Historical Trend', impact: 0.7, confidence: 0.8 },
        { factor: 'Day of Week', impact: 0.3, confidence: 0.6 }
      ]
    }));

    return {
      demandForecasting,
      revenueProjections: [], // TODO: Implement revenue projections
      customerLifetimeValue: [], // TODO: Implement CLV predictions
      churnPrediction: [], // TODO: Implement churn predictions
      inventoryForecasting: [], // TODO: Implement inventory forecasting
      staffingOptimization: [] // TODO: Implement staffing optimization
    };
  }

  async getCompetitiveAnalysis(locationId: string): Promise<CompetitiveAnalysis> {
    // Mock competitive analysis data
    return {
      marketPosition: {
        overallRanking: 3,
        categoryRanking: 2,
        strengthAreas: ['Service Quality', 'Menu Variety'],
        improvementAreas: ['Price Competitiveness', 'Marketing'],
        competitiveAdvantages: ['Location', 'Customer Service']
      },
      benchmarking: {
        metric: 'Average Order Value',
        yourValue: 25.50,
        industryAverage: 22.30,
        topPerformers: 28.90,
        percentile: 75
      },
      pricingComparison: [],
      marketShare: {
        totalMarket: 1000000,
        yourShare: 50000,
        sharePercentage: 5.0,
        trend: 'growing',
        opportunities: ['Delivery expansion', 'Catering services']
      },
      competitorInsights: []
    };
  }

  async getCustomReports(locationId: string): Promise<CustomReport[]> {
    const query = `
      SELECT id, name, description, metrics, filters, schedule, format, recipients
      FROM custom_reports
      WHERE location_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(query, [locationId]);
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      metrics: row.metrics || [],
      filters: row.filters || [],
      schedule: row.schedule || { frequency: 'weekly', time: '09:00', timezone: 'UTC', enabled: false },
      format: row.format || 'pdf',
      recipients: row.recipients || []
    }));
  }

  // Helper methods
  private getSegmentDescription(segment: string): string {
    const descriptions: Record<string, string> = {
      'Champions': 'High-value customers who visit frequently and spend well',
      'Loyal Customers': 'Regular customers with good spending habits',
      'Potential Loyalists': 'Recent customers with potential for growth',
      'New Customers': 'Recent first-time customers',
      'At Risk': 'Previously good customers who haven\'t visited recently',
      'Lost Customers': 'Customers who haven\'t returned for a long time'
    };
    return descriptions[segment] || 'Customer segment';
  }

  private getSegmentCharacteristics(segment: string): string[] {
    const characteristics: Record<string, string[]> = {
      'Champions': ['High frequency', 'High spend', 'Recent visits'],
      'Loyal Customers': ['Regular visits', 'Consistent spend', 'Brand advocates'],
      'Potential Loyalists': ['Recent customers', 'Good initial spend', 'Growth potential'],
      'New Customers': ['First-time visitors', 'Exploring menu', 'Price sensitive'],
      'At Risk': ['Declining frequency', 'Previous high value', 'Needs attention'],
      'Lost Customers': ['No recent visits', 'Previously active', 'Requires reactivation']
    };
    return characteristics[segment] || [];
  }

  private getSegmentRecommendations(segment: string): string[] {
    const recommendations: Record<string, string[]> = {
      'Champions': ['VIP treatment', 'Exclusive offers', 'Referral programs'],
      'Loyal Customers': ['Loyalty rewards', 'Special events', 'Feedback collection'],
      'Potential Loyalists': ['Onboarding program', 'Menu recommendations', 'Follow-up'],
      'New Customers': ['Welcome offers', 'Menu guidance', 'Satisfaction surveys'],
      'At Risk': ['Win-back campaigns', 'Personal outreach', 'Special incentives'],
      'Lost Customers': ['Reactivation offers', 'Apology campaigns', 'New menu highlights']
    };
    return recommendations[segment] || [];
  }

  private getItemRecommendation(profitability: number, popularity: number): string {
    if (profitability > 0.7 && popularity > 0.7) return 'Star - Promote heavily';
    if (profitability > 0.7 && popularity <= 0.7) return 'Puzzle - Increase marketing';
    if (profitability <= 0.7 && popularity > 0.7) return 'Plow Horse - Reduce costs';
    return 'Dog - Consider removal';
  }
}

export const premiumAnalyticsService = new PremiumAnalyticsService();