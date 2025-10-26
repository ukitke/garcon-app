#!/bin/bash

# Deployment script for Garçon App
set -e

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT_NAME="garcon-app"

echo "🚀 Starting deployment for environment: $ENVIRONMENT"

# Check required environment variables
if [ -z "$AWS_ACCOUNT_ID" ]; then
    echo "❌ AWS_ACCOUNT_ID environment variable is required"
    exit 1
fi

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ DB_PASSWORD environment variable is required"
    exit 1
fi

if [ -z "$CERTIFICATE_ARN" ]; then
    echo "❌ CERTIFICATE_ARN environment variable is required"
    exit 1
fi

# Set ECR repository URLs
BACKEND_ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME/backend"
ADMIN_WEB_ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME/admin-web"

echo "📦 Building and pushing Docker images..."

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push backend image
echo "🔨 Building backend image..."
docker build -t $BACKEND_ECR_URI:latest -f packages/backend/Dockerfile .
docker tag $BACKEND_ECR_URI:latest $BACKEND_ECR_URI:$(git rev-parse --short HEAD)
docker push $BACKEND_ECR_URI:latest
docker push $BACKEND_ECR_URI:$(git rev-parse --short HEAD)

echo "✅ Docker images pushed successfully"

# Deploy infrastructure with Terraform
echo "🏗️  Deploying infrastructure with Terraform..."
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Plan the deployment
terraform plan \
    -var="environment=$ENVIRONMENT" \
    -var="aws_region=$AWS_REGION" \
    -var="db_password=$DB_PASSWORD" \
    -var="certificate_arn=$CERTIFICATE_ARN" \
    -out=tfplan

# Apply the plan
terraform apply tfplan

echo "✅ Infrastructure deployed successfully"

# Update ECS service to use new image
echo "🔄 Updating ECS service..."
aws ecs update-service \
    --cluster "$PROJECT_NAME-cluster" \
    --service "$PROJECT_NAME-backend" \
    --force-new-deployment \
    --region $AWS_REGION

echo "⏳ Waiting for deployment to complete..."
aws ecs wait services-stable \
    --cluster "$PROJECT_NAME-cluster" \
    --services "$PROJECT_NAME-backend" \
    --region $AWS_REGION

echo "✅ Deployment completed successfully!"

# Get load balancer DNS name
LB_DNS=$(terraform output -raw load_balancer_dns)
echo "🌐 Application available at: https://$LB_DNS"

echo "🎉 Deployment finished!"