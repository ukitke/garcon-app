// Security configuration
export interface SecurityConfig {
  rateLimit: {
    windowMs: number;
    max: number;
  };
  cors: {
    origin: string[];
    credentials: boolean;
  };
  helmet: {
    contentSecurityPolicy: boolean;
    hsts: boolean;
  };
}

export const securityConfig: SecurityConfig = {
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true
  },
  helmet: {
    contentSecurityPolicy: true,
    hsts: true
  }
};

export default securityConfig;