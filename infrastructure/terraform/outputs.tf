output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = aws_subnet.database[*].id
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "rds_read_replica_endpoint" {
  description = "RDS read replica endpoint"
  value       = aws_db_instance.read_replica.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
  sensitive   = true
}

output "load_balancer_dns" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "load_balancer_zone_id" {
  description = "Zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "backend_ecr_repository_url" {
  description = "URL of the backend ECR repository"
  value       = aws_ecr_repository.backend.repository_url
}

output "admin_web_ecr_repository_url" {
  description = "URL of the admin web ECR repository"
  value       = aws_ecr_repository.admin_web.repository_url
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket for app storage"
  value       = aws_s3_bucket.app_storage.id
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.app_storage.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.app_storage.domain_name
}

output "secrets_manager_arns" {
  description = "ARNs of Secrets Manager secrets"
  value = {
    database_url    = aws_secretsmanager_secret.database_url.arn
    redis_url       = aws_secretsmanager_secret.redis_url.arn
    jwt_secret      = aws_secretsmanager_secret.jwt_secret.arn
    stripe_keys     = aws_secretsmanager_secret.stripe_keys.arn
    paypal_keys     = aws_secretsmanager_secret.paypal_keys.arn
    google_pay_keys = aws_secretsmanager_secret.google_pay_keys.arn
    apple_pay_keys  = aws_secretsmanager_secret.apple_pay_keys.arn
    satispay_keys   = aws_secretsmanager_secret.satispay_keys.arn
  }
  sensitive = true
}