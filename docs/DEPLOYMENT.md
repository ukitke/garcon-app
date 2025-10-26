# Deployment Guide

## Architecture Overview

The Garçon app uses a cloud-native architecture deployed on AWS:

- **Backend**: ECS/Fargate containers
- **Database**: RDS PostgreSQL with read replicas
- **Cache**: ElastiCache Redis cluster
- **Storage**: S3 for file uploads
- **CDN**: CloudFront for static assets
- **Load Balancer**: Application Load Balancer

## Environments

### Staging

- **URL**: https://staging-api.garcon.app
- **Database**: RDS staging instance
- **Branch**: `develop`
- **Auto-deploy**: Yes

### Production

- **URL**: https://api.garcon.app
- **Database**: RDS production with backups
- **Branch**: `main`
- **Auto-deploy**: Yes (with approval)

## CI/CD Pipeline

### GitHub Actions Workflow

1. **Code Quality**: ESLint, Prettier, TypeScript checks
2. **Testing**: Unit, integration, and E2E tests
3. **Security**: Dependency audit and vulnerability scan
4. **Build**: Docker images for all services
5. **Deploy**: Automated deployment to staging/production

### Deployment Steps

1. Push to `develop` → Deploy to staging
2. Create PR to `main` → Run full test suite
3. Merge to `main` → Deploy to production

## Infrastructure as Code

### AWS Resources

- VPC with public/private subnets
- ECS cluster with Fargate tasks
- RDS PostgreSQL with Multi-AZ
- ElastiCache Redis cluster
- S3 buckets for assets and backups
- CloudFront distribution
- Route 53 for DNS

### Environment Variables

Production secrets are managed through AWS Secrets Manager:

- Database credentials
- JWT secrets
- API keys (Stripe, Google Maps, etc.)
- Third-party service tokens

## Monitoring and Logging

### CloudWatch

- Application logs from all services
- Custom metrics for business KPIs
- Alarms for error rates and latency

### Health Checks

- `/health` endpoint for all services
- Database connectivity checks
- External service availability

## Backup and Recovery

### Database Backups

- Automated daily backups with 30-day retention
- Point-in-time recovery enabled
- Cross-region backup replication

### Disaster Recovery

- Multi-AZ deployment for high availability
- Auto-scaling for traffic spikes
- Rollback procedures for failed deployments

## Security

### Network Security

- VPC with private subnets for databases
- Security groups with minimal access
- WAF for DDoS protection

### Application Security

- HTTPS everywhere with SSL certificates
- JWT token authentication
- Input validation and sanitization
- Regular security audits

## Performance Optimization

### Caching Strategy

- Redis for session and menu data
- CloudFront for static assets
- Database query optimization

### Scaling

- Auto-scaling based on CPU/memory
- Load balancing across multiple instances
- Database read replicas for queries