# Secrets Manager for sensitive configuration
resource "aws_secretsmanager_secret" "database_url" {
  name        = "${var.project_name}/database-url"
  description = "Database connection URL for ${var.project_name}"

  tags = {
    Name = "${var.project_name}-database-url"
  }
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id = aws_secretsmanager_secret.database_url.id
  secret_string = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}:5432/garcon_production"
}

resource "aws_secretsmanager_secret" "redis_url" {
  name        = "${var.project_name}/redis-url"
  description = "Redis connection URL for ${var.project_name}"

  tags = {
    Name = "${var.project_name}-redis-url"
  }
}

resource "aws_secretsmanager_secret_version" "redis_url" {
  secret_id = aws_secretsmanager_secret.redis_url.id
  secret_string = "rediss://:${random_password.redis_auth_token.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${var.project_name}/jwt-secret"
  description = "JWT signing secret for ${var.project_name}"

  tags = {
    Name = "${var.project_name}-jwt-secret"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

# Payment provider secrets (to be populated manually)
resource "aws_secretsmanager_secret" "stripe_keys" {
  name        = "${var.project_name}/stripe-keys"
  description = "Stripe API keys for ${var.project_name}"

  tags = {
    Name = "${var.project_name}-stripe-keys"
  }
}

resource "aws_secretsmanager_secret" "paypal_keys" {
  name        = "${var.project_name}/paypal-keys"
  description = "PayPal API keys for ${var.project_name}"

  tags = {
    Name = "${var.project_name}-paypal-keys"
  }
}

resource "aws_secretsmanager_secret" "google_pay_keys" {
  name        = "${var.project_name}/google-pay-keys"
  description = "Google Pay API keys for ${var.project_name}"

  tags = {
    Name = "${var.project_name}-google-pay-keys"
  }
}

resource "aws_secretsmanager_secret" "apple_pay_keys" {
  name        = "${var.project_name}/apple-pay-keys"
  description = "Apple Pay certificates for ${var.project_name}"

  tags = {
    Name = "${var.project_name}-apple-pay-keys"
  }
}

resource "aws_secretsmanager_secret" "satispay_keys" {
  name        = "${var.project_name}/satispay-keys"
  description = "Satispay API keys for ${var.project_name}"

  tags = {
    Name = "${var.project_name}-satispay-keys"
  }
}