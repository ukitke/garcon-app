# Garçon App Infrastructure

This directory contains the infrastructure as code (IaC) for deploying the Garçon App to AWS using Terraform.

## Architecture Overview

The infrastructure includes:

- **VPC** with public, private, and database subnets across 2 AZs
- **ECS Fargate** cluster for containerized microservices
- **Application Load Balancer** with SSL termination
- **RDS PostgreSQL** with read replica for high availability
- **ElastiCache Redis** cluster for caching and sessions
- **S3** buckets for file storage with CloudFront CDN
- **ECR** repositories for Docker images
- **Secrets Manager** for secure configuration
- **CloudWatch** for monitoring and logging
- **Auto Scaling** policies for ECS services

## Prerequisites

1. **AWS CLI** configured with appropriate permissions
2. **Terraform** >= 1.0 installed
3. **Docker** for building images
4. **ACM Certificate** for your domain (create manually)
5. **Domain** configured in Route 53 or external DNS

## Required AWS Permissions

Your AWS user/role needs the following permissions:
- EC2, VPC, ECS, RDS, ElastiCache
- S3, CloudFront, Route 53
- IAM, Secrets Manager, CloudWatch
- ECR, Application Load Balancer

## Deployment Steps

### 1. Configure Terraform Backend (Optional but Recommended)

Create an S3 bucket for Terraform state:

```bash
aws s3 mb s3://garcon-terraform-state-$(date +%s)
```

Update `main.tf` with your bucket name:

```hcl
backend "s3" {
  bucket = "your-terraform-state-bucket"
  key    = "production/terraform.tfstate"
  region = "us-east-1"
}
```

### 2. Create ACM Certificate

Create an SSL certificate in AWS Certificate Manager:

```bash
aws acm request-certificate \
  --domain-name api.garcon-app.com \
  --validation-method DNS \
  --region us-east-1
```

Note the certificate ARN for later use.

### 3. Set Environment Variables

```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export DB_PASSWORD="your-secure-database-password"
export CERTIFICATE_ARN="arn:aws:acm:us-east-1:123456789012:certificate/..."
```

### 4. Deploy Infrastructure

```bash
# Navigate to terraform directory
cd infrastructure/terraform

# Copy and customize variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var="db_password=$DB_PASSWORD" -var="certificate_arn=$CERTIFICATE_ARN"

# Apply changes
terraform apply -var="db_password=$DB_PASSWORD" -var="certificate_arn=$CERTIFICATE_ARN"
```

### 5. Build and Push Docker Images

```bash
# From project root
./infrastructure/scripts/deploy.sh production
```

Or manually:

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push backend
docker build -t $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/garcon-app/backend:latest -f packages/backend/Dockerfile .
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/garcon-app/backend:latest
```

### 6. Configure DNS

Point your domain to the load balancer:

```bash
# Get load balancer DNS name
terraform output load_balancer_dns

# Create CNAME record: api.garcon-app.com -> <load-balancer-dns>
```

## Configuration

### Environment Variables

The application uses the following environment variables (managed via Secrets Manager):

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string  
- `JWT_SECRET` - JWT signing secret
- Payment provider keys (Stripe, PayPal, etc.)

### Secrets Management

Payment provider credentials must be manually added to Secrets Manager:

```bash
# Example: Add Stripe keys
aws secretsmanager put-secret-value \
  --secret-id garcon-app/stripe-keys \
  --secret-string '{"publishable_key":"pk_...","secret_key":"sk_..."}'
```

## Monitoring

### CloudWatch Dashboards

Access CloudWatch to monitor:
- ECS service metrics (CPU, memory, task count)
- RDS performance (connections, queries, storage)
- Load balancer metrics (requests, latency, errors)
- Application logs

### Alarms

Set up CloudWatch alarms for:
- High CPU/memory usage
- Database connection issues
- Application errors
- Load balancer 5xx errors

## Scaling

### Auto Scaling

ECS services automatically scale based on:
- CPU utilization (target: 70%)
- Memory utilization (target: 80%)

### Manual Scaling

Adjust capacity in `terraform.tfvars`:

```hcl
min_capacity = 3
max_capacity = 20
```

Then run `terraform apply`.

## Backup and Recovery

### Database Backups

- Automated daily backups (7-day retention)
- Point-in-time recovery available
- Read replica for disaster recovery

### Application Data

- S3 versioning enabled
- Cross-region replication (configure separately)

## Security

### Network Security

- Private subnets for application and database
- Security groups with minimal required access
- NAT gateways for outbound internet access

### Data Security

- Encryption at rest (RDS, S3, Secrets Manager)
- Encryption in transit (TLS 1.2+)
- IAM roles with least privilege

### Secrets

- All sensitive data in Secrets Manager
- Automatic secret rotation (configure separately)
- No hardcoded credentials

## Troubleshooting

### Common Issues

1. **ECS tasks failing to start**
   - Check CloudWatch logs: `/aws/ecs/garcon-app/backend`
   - Verify secrets are properly configured
   - Check security group rules

2. **Database connection issues**
   - Verify RDS security group allows ECS access
   - Check database credentials in Secrets Manager
   - Ensure database is in correct subnets

3. **Load balancer health checks failing**
   - Verify application `/health` endpoint
   - Check ECS task security groups
   - Review target group configuration

### Useful Commands

```bash
# Check ECS service status
aws ecs describe-services --cluster garcon-app-cluster --services garcon-app-backend

# View ECS logs
aws logs tail /aws/ecs/garcon-app/backend --follow

# Check RDS status
aws rds describe-db-instances --db-instance-identifier garcon-app-db

# Test load balancer
curl -I https://$(terraform output -raw load_balancer_dns)/health
```

## Cost Optimization

### Right-sizing

Monitor and adjust:
- ECS task CPU/memory allocation
- RDS instance class
- ElastiCache node type

### Reserved Instances

Consider reserved instances for:
- RDS database instances
- ElastiCache nodes (if usage is predictable)

### Storage Optimization

- S3 lifecycle policies for old images
- CloudWatch log retention policies
- RDS storage auto-scaling

## Cleanup

To destroy all resources:

```bash
terraform destroy -var="db_password=$DB_PASSWORD" -var="certificate_arn=$CERTIFICATE_ARN"
```

**Warning**: This will permanently delete all data. Ensure you have backups!

## Support

For infrastructure issues:
1. Check CloudWatch logs and metrics
2. Review Terraform state and plan
3. Consult AWS documentation
4. Contact DevOps team