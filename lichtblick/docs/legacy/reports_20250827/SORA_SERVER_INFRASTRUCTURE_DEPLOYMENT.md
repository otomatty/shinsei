# Sora サーバー インフラ・デプロイメント 設計書

## 1. インフラストラクチャ構成

### 1.1 開発環境構成

#### ローカル開発環境 (Docker Compose)

```yaml
# docker-compose.dev.yml
version: "3.8"

services:
  file-server:
    build:
      context: ./file-server
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - S3_BUCKET=sora-dev-bucket
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_REGION=ap-northeast-1
      - ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
      - IP_SALT=${IP_SALT}
    volumes:
      - ./file-server/src:/app/src:ro
      - ./data/cache:/app/cache
    restart: unless-stopped
    command: bun --watch src/app.ts

  feedback-api:
    build:
      context: ./feedback-api
      dockerfile: Dockerfile.dev
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_PATH=/app/data/feedback.db
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - IP_SALT=${IP_SALT}
    volumes:
      - ./feedback-api/src:/app/src:ro
      - ./data/database:/app/data
    restart: unless-stopped
    command: bun --watch src/app.ts

  admin-panel:
    build:
      context: ./admin-panel
      dockerfile: Dockerfile.dev
    ports:
      - "3002:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:3001
      - REACT_APP_FILE_SERVER_URL=http://localhost:3000
    volumes:
      - ./admin-panel/src:/app/src:ro
      - ./admin-panel/public:/app/public:ro
    command: npm start

  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx/nginx.dev.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - file-server
      - feedback-api
      - admin-panel
    restart: unless-stopped

  # 開発用データベース管理
  db-admin:
    image: adminer
    ports:
      - "8081:8080"
    environment:
      - ADMINER_DEFAULT_SERVER=feedback-api

volumes:
  database:
    driver: local
  cache:
    driver: local
```

#### 開発用Nginx設定

```nginx
# nginx/nginx.dev.conf
events {
    worker_connections 1024;
}

http {
    upstream file_server {
        server file-server:3000;
    }

    upstream feedback_api {
        server feedback-api:3001;
    }

    upstream admin_panel {
        server admin-panel:3000;
    }

    # 開発用設定
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    server {
        listen 80;
        server_name localhost;

        # CORS for development
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;

        # Options requests
        location / {
            if ($request_method = 'OPTIONS') {
                return 204;
            }
        }

        # Health checks
        location /health {
            proxy_pass http://file_server;
            access_log off;
        }

        # File server API
        location /api/extensions {
            proxy_pass http://file_server;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /api/layouts {
            proxy_pass http://file_server;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Feedback API
        location /api/feedback {
            proxy_pass http://feedback_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;

            client_max_body_size 1m;
        }

        location /api/recommendations {
            proxy_pass http://feedback_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /api/stats {
            proxy_pass http://feedback_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Admin panel
        location /admin {
            proxy_pass http://admin_panel;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Fallback
        location / {
            return 404 '{"error": "Not found"}';
            add_header Content-Type application/json;
        }
    }
}
```

### 1.2 Production構成 (AWS)

#### AWS ECS with Fargate

```hcl
# infrastructure/terraform/main.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "sora-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "ap-northeast-1"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Sora"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-1"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "api.sora.example.com"
}

variable "s3_bucket_name" {
  description = "S3 bucket name for file storage"
  type        = string
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# S3 Bucket for file storage
resource "aws_s3_bucket" "sora_files" {
  bucket = var.s3_bucket_name
}

resource "aws_s3_bucket_versioning" "sora_files" {
  bucket = aws_s3_bucket.sora_files.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "sora_files" {
  bucket = aws_s3_bucket.sora_files.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "sora_files" {
  bucket = aws_s3_bucket.sora_files.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# VPC
resource "aws_vpc" "sora_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "sora-vpc-${var.environment}"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "sora_igw" {
  vpc_id = aws_vpc.sora_vpc.id

  tags = {
    Name = "sora-igw-${var.environment}"
  }
}

# Public Subnets
resource "aws_subnet" "sora_public" {
  count = 2

  vpc_id                  = aws_vpc.sora_vpc.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "sora-public-${count.index + 1}-${var.environment}"
    Type = "Public"
  }
}

# Private Subnets
resource "aws_subnet" "sora_private" {
  count = 2

  vpc_id            = aws_vpc.sora_vpc.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "sora-private-${count.index + 1}-${var.environment}"
    Type = "Private"
  }
}

# NAT Gateway
resource "aws_eip" "sora_nat" {
  count = 2
  domain = "vpc"

  tags = {
    Name = "sora-nat-eip-${count.index + 1}-${var.environment}"
  }
}

resource "aws_nat_gateway" "sora_nat" {
  count = 2

  allocation_id = aws_eip.sora_nat[count.index].id
  subnet_id     = aws_subnet.sora_public[count.index].id

  tags = {
    Name = "sora-nat-${count.index + 1}-${var.environment}"
  }

  depends_on = [aws_internet_gateway.sora_igw]
}

# Route Tables
resource "aws_route_table" "sora_public" {
  vpc_id = aws_vpc.sora_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.sora_igw.id
  }

  tags = {
    Name = "sora-public-rt-${var.environment}"
  }
}

resource "aws_route_table" "sora_private" {
  count = 2

  vpc_id = aws_vpc.sora_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.sora_nat[count.index].id
  }

  tags = {
    Name = "sora-private-rt-${count.index + 1}-${var.environment}"
  }
}

# Route Table Associations
resource "aws_route_table_association" "sora_public" {
  count = length(aws_subnet.sora_public)

  subnet_id      = aws_subnet.sora_public[count.index].id
  route_table_id = aws_route_table.sora_public.id
}

resource "aws_route_table_association" "sora_private" {
  count = length(aws_subnet.sora_private)

  subnet_id      = aws_subnet.sora_private[count.index].id
  route_table_id = aws_route_table.sora_private[count.index].id
}
```

#### ECS Configuration

```hcl
# infrastructure/terraform/ecs.tf

# ECS Cluster
resource "aws_ecs_cluster" "sora_cluster" {
  name = "sora-cluster-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "sora-cluster-${var.environment}"
  }
}

# ECR Repository
resource "aws_ecr_repository" "sora_file_server" {
  name                 = "sora/file-server"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "sora_feedback_api" {
  name                 = "sora/feedback-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Application Load Balancer
resource "aws_lb" "sora_alb" {
  name               = "sora-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.sora_alb.id]
  subnets            = aws_subnet.sora_public[*].id

  enable_deletion_protection = var.environment == "prod"

  tags = {
    Name = "sora-alb-${var.environment}"
  }
}

# Security Groups
resource "aws_security_group" "sora_alb" {
  name        = "sora-alb-sg-${var.environment}"
  description = "Security group for Sora ALB"
  vpc_id      = aws_vpc.sora_vpc.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sora-alb-sg-${var.environment}"
  }
}

resource "aws_security_group" "sora_ecs" {
  name        = "sora-ecs-sg-${var.environment}"
  description = "Security group for Sora ECS tasks"
  vpc_id      = aws_vpc.sora_vpc.id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 3000
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [aws_security_group.sora_alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sora-ecs-sg-${var.environment}"
  }
}

# IAM Roles
resource "aws_iam_role" "ecs_execution_role" {
  name = "sora-ecs-execution-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task_role" {
  name = "sora-ecs-task-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "ecs_task_s3_policy" {
  name = "sora-ecs-task-s3-policy-${var.environment}"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.sora_files.arn,
          "${aws_s3_bucket.sora_files.arn}/*"
        ]
      }
    ]
  })
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "sora_file_server" {
  name              = "/ecs/sora-file-server-${var.environment}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name = "sora-file-server-logs-${var.environment}"
  }
}

resource "aws_cloudwatch_log_group" "sora_feedback_api" {
  name              = "/ecs/sora-feedback-api-${var.environment}"
  retention_in_days = var.environment == "prod" ? 30 : 7

  tags = {
    Name = "sora-feedback-api-logs-${var.environment}"
  }
}

# ECS Task Definitions
resource "aws_ecs_task_definition" "sora_file_server" {
  family                   = "sora-file-server-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.environment == "prod" ? 512 : 256
  memory                   = var.environment == "prod" ? 1024 : 512
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "file-server"
      image = "${aws_ecr_repository.sora_file_server.repository_url}:latest"

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "S3_BUCKET"
          value = aws_s3_bucket.sora_files.id
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.sora_file_server.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval = 30
        timeout = 5
        retries = 3
        startPeriod = 60
      }
    }
  ])
}

resource "aws_ecs_task_definition" "sora_feedback_api" {
  family                   = "sora-feedback-api-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.environment == "prod" ? 512 : 256
  memory                   = var.environment == "prod" ? 1024 : 512
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "feedback-api"
      image = "${aws_ecr_repository.sora_feedback_api.repository_url}:latest"

      portMappings = [
        {
          containerPort = 3001
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "DATABASE_PATH"
          value = "/app/data/feedback.db"
        }
      ]

      mountPoints = [
        {
          sourceVolume  = "database"
          containerPath = "/app/data"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.sora_feedback_api.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }

      healthCheck = {
        command = ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"]
        interval = 30
        timeout = 5
        retries = 3
        startPeriod = 60
      }
    }
  ])

  volume {
    name = "database"

    efs_volume_configuration {
      file_system_id = aws_efs_file_system.sora_database.id
      root_directory = "/"
    }
  }
}

# EFS for persistent database storage
resource "aws_efs_file_system" "sora_database" {
  creation_token = "sora-database-${var.environment}"
  encrypted      = true

  performance_mode = "generalPurpose"
  throughput_mode  = "provisioned"
  provisioned_throughput_in_mibps = var.environment == "prod" ? 10 : 5

  tags = {
    Name = "sora-database-${var.environment}"
  }
}

resource "aws_efs_mount_target" "sora_database" {
  count = length(aws_subnet.sora_private)

  file_system_id  = aws_efs_file_system.sora_database.id
  subnet_id       = aws_subnet.sora_private[count.index].id
  security_groups = [aws_security_group.sora_efs.id]
}

resource "aws_security_group" "sora_efs" {
  name        = "sora-efs-sg-${var.environment}"
  description = "Security group for Sora EFS"
  vpc_id      = aws_vpc.sora_vpc.id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.sora_ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sora-efs-sg-${var.environment}"
  }
}

# ECS Services
resource "aws_ecs_service" "sora_file_server" {
  name            = "sora-file-server-${var.environment}"
  cluster         = aws_ecs_cluster.sora_cluster.id
  task_definition = aws_ecs_task_definition.sora_file_server.arn
  desired_count   = var.environment == "prod" ? 2 : 1
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.sora_ecs.id]
    subnets          = aws_subnet.sora_private[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.sora_file_server.arn
    container_name   = "file-server"
    container_port   = 3000
  }

  depends_on = [
    aws_lb_listener.sora_alb_http
  ]
}

resource "aws_ecs_service" "sora_feedback_api" {
  name            = "sora-feedback-api-${var.environment}"
  cluster         = aws_ecs_cluster.sora_cluster.id
  task_definition = aws_ecs_task_definition.sora_feedback_api.arn
  desired_count   = var.environment == "prod" ? 2 : 1
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.sora_ecs.id]
    subnets          = aws_subnet.sora_private[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.sora_feedback_api.arn
    container_name   = "feedback-api"
    container_port   = 3001
  }

  depends_on = [
    aws_lb_listener.sora_alb_http
  ]
}

# Target Groups
resource "aws_lb_target_group" "sora_file_server" {
  name     = "sora-file-server-${var.environment}"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = aws_vpc.sora_vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "sora-file-server-tg-${var.environment}"
  }
}

resource "aws_lb_target_group" "sora_feedback_api" {
  name     = "sora-feedback-api-${var.environment}"
  port     = 3001
  protocol = "HTTP"
  vpc_id   = aws_vpc.sora_vpc.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "sora-feedback-api-tg-${var.environment}"
  }
}

# Load Balancer Listener
resource "aws_lb_listener" "sora_alb_http" {
  load_balancer_arn = aws_lb.sora_alb.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "application/json"
      message_body = jsonencode({
        error = "Not found"
      })
      status_code = "404"
    }
  }
}

# Load Balancer Listener Rules
resource "aws_lb_listener_rule" "file_server_extensions" {
  listener_arn = aws_lb_listener.sora_alb_http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.sora_file_server.arn
  }

  condition {
    path_pattern {
      values = ["/api/extensions*", "/api/layouts*"]
    }
  }
}

resource "aws_lb_listener_rule" "feedback_api" {
  listener_arn = aws_lb_listener.sora_alb_http.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.sora_feedback_api.arn
  }

  condition {
    path_pattern {
      values = ["/api/feedback*", "/api/recommendations*", "/api/stats*"]
    }
  }
}

resource "aws_lb_listener_rule" "health_check" {
  listener_arn = aws_lb_listener.sora_alb_http.arn
  priority     = 300

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.sora_file_server.arn
  }

  condition {
    path_pattern {
      values = ["/health"]
    }
  }
}
```

## 2. CI/CD パイプライン

### 2.1 GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy Sora Server

on:
  push:
    branches: [main, develop]
    paths:
      - "file-server/**"
      - "feedback-api/**"
      - "admin-panel/**"
      - "infrastructure/**"
      - ".github/workflows/**"
  pull_request:
    branches: [main, develop]

env:
  AWS_REGION: ap-northeast-1
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.ap-northeast-1.amazonaws.com

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [file-server, feedback-api]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: |
          cd ${{ matrix.service }}
          bun install --frozen-lockfile

      - name: Run linting
        run: |
          cd ${{ matrix.service }}
          bun run lint

      - name: Run type checking
        run: |
          cd ${{ matrix.service }}
          bun run type-check

      - name: Run unit tests
        run: |
          cd ${{ matrix.service }}
          bun test

      - name: Run security audit
        run: |
          cd ${{ matrix.service }}
          bun audit

  integration-test:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Docker
        uses: docker/setup-docker@v3

      - name: Build test environment
        run: |
          cp .env.example .env
          docker-compose -f docker-compose.test.yml up -d

      - name: Wait for services
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:3000/health; do sleep 2; done'
          timeout 60 bash -c 'until curl -f http://localhost:3001/health; do sleep 2; done'

      - name: Run integration tests
        run: |
          npm run test:integration

      - name: Cleanup
        if: always()
        run: |
          docker-compose -f docker-compose.test.yml down -v

  security-scan:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: "fs"
          scan-ref: "."
          format: "sarif"
          output: "trivy-results.sarif"

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: "trivy-results.sarif"

  build:
    runs-on: ubuntu-latest
    needs: [test, integration-test, security-scan]
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'

    strategy:
      matrix:
        service: [file-server, feedback-api]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push Docker image
        env:
          REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          REPOSITORY: sora/${{ matrix.service }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd ${{ matrix.service }}

          # Build image
          docker build -t $REGISTRY/$REPOSITORY:$IMAGE_TAG .
          docker build -t $REGISTRY/$REPOSITORY:latest .

          # Push image
          docker push $REGISTRY/$REPOSITORY:$IMAGE_TAG
          docker push $REGISTRY/$REPOSITORY:latest

      - name: Update ECS service
        env:
          CLUSTER_NAME: sora-cluster-${{ github.ref == 'refs/heads/main' && 'prod' || 'dev' }}
          SERVICE_NAME: sora-${{ matrix.service }}-${{ github.ref == 'refs/heads/main' && 'prod' || 'dev' }}
        run: |
          aws ecs update-service \
            --cluster $CLUSTER_NAME \
            --service $SERVICE_NAME \
            --force-new-deployment

  deploy-infrastructure:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.0

      - name: Terraform Init
        run: |
          cd infrastructure/terraform
          terraform init

      - name: Terraform Plan
        run: |
          cd infrastructure/terraform
          terraform plan \
            -var="environment=prod" \
            -var="s3_bucket_name=${{ secrets.S3_BUCKET_NAME }}" \
            -out=tfplan

      - name: Terraform Apply
        run: |
          cd infrastructure/terraform
          terraform apply -auto-approve tfplan

  notify:
    runs-on: ubuntu-latest
    needs: [build, deploy-infrastructure]
    if: always()

    steps:
      - name: Notify deployment status
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: "#deployments"
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### 2.2 テスト設定

```yaml
# docker-compose.test.yml
version: "3.8"

services:
  file-server-test:
    build:
      context: ./file-server
      dockerfile: Dockerfile.test
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=test
      - S3_BUCKET=test-bucket
      - AWS_ACCESS_KEY_ID=test
      - AWS_SECRET_ACCESS_KEY=test
      - AWS_REGION=ap-northeast-1
      - ALLOWED_ORIGINS=http://localhost:3000
      - IP_SALT=test-salt
    depends_on:
      - localstack

  feedback-api-test:
    build:
      context: ./feedback-api
      dockerfile: Dockerfile.test
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=test
      - DATABASE_PATH=/tmp/test.db
      - ENCRYPTION_KEY=test-key-32-characters-long-key
      - IP_SALT=test-salt
    volumes:
      - /tmp:/tmp

  localstack:
    image: localstack/localstack:latest
    ports:
      - "4566:4566"
    environment:
      - SERVICES=s3
      - DEBUG=1
      - DATA_DIR=/tmp/localstack/data
    volumes:
      - ./localstack:/docker-entrypoint-initaws.d

  nginx-test:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx/nginx.test.conf:/etc/nginx/nginx.conf
    depends_on:
      - file-server-test
      - feedback-api-test
```

## 3. 監視・ログ設定

### 3.1 CloudWatch設定

```hcl
# infrastructure/terraform/monitoring.tf

# CloudWatch Dashboard
resource "aws_cloudwatch_dashboard" "sora_dashboard" {
  dashboard_name = "Sora-Server-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", aws_lb.sora_alb.arn_suffix],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.sora_alb.arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_Target_2XX_Count", "LoadBalancer", aws_lb.sora_alb.arn_suffix],
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", aws_lb.sora_alb.arn_suffix],
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "Application Load Balancer Metrics"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6

        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.sora_file_server.name, "ClusterName", aws_ecs_cluster.sora_cluster.name],
            ["AWS/ECS", "MemoryUtilization", "ServiceName", aws_ecs_service.sora_file_server.name, "ClusterName", aws_ecs_cluster.sora_cluster.name],
            ["AWS/ECS", "CPUUtilization", "ServiceName", aws_ecs_service.sora_feedback_api.name, "ClusterName", aws_ecs_cluster.sora_cluster.name],
            ["AWS/ECS", "MemoryUtilization", "ServiceName", aws_ecs_service.sora_feedback_api.name, "ClusterName", aws_ecs_cluster.sora_cluster.name],
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ECS Service Metrics"
          period  = 300
        }
      }
    ]
  })
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "high_cpu_file_server" {
  alarm_name          = "sora-file-server-high-cpu-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ECS CPU utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = aws_ecs_service.sora_file_server.name
    ClusterName = aws_ecs_cluster.sora_cluster.name
  }

  tags = {
    Name = "sora-file-server-high-cpu-${var.environment}"
  }
}

resource "aws_cloudwatch_metric_alarm" "high_memory_file_server" {
  alarm_name          = "sora-file-server-high-memory-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors ECS memory utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ServiceName = aws_ecs_service.sora_file_server.name
    ClusterName = aws_ecs_cluster.sora_cluster.name
  }

  tags = {
    Name = "sora-file-server-high-memory-${var.environment}"
  }
}

resource "aws_cloudwatch_metric_alarm" "high_error_rate" {
  alarm_name          = "sora-alb-high-error-rate-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "This metric monitors ALB 5XX error rate"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.sora_alb.arn_suffix
  }

  tags = {
    Name = "sora-alb-high-error-rate-${var.environment}"
  }
}

resource "aws_cloudwatch_metric_alarm" "high_response_time" {
  alarm_name          = "sora-alb-high-response-time-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "300"
  statistic           = "Average"
  threshold           = "2.0"
  alarm_description   = "This metric monitors ALB response time"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    LoadBalancer = aws_lb.sora_alb.arn_suffix
  }

  tags = {
    Name = "sora-alb-high-response-time-${var.environment}"
  }
}

# SNS Topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "sora-server-alerts-${var.environment}"

  tags = {
    Name = "sora-server-alerts-${var.environment}"
  }
}

resource "aws_sns_topic_subscription" "email_alerts" {
  count     = var.alert_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

variable "alert_email" {
  description = "Email address for alerts"
  type        = string
  default     = ""
}
```

### 3.2 Log Aggregation

```yaml
# infrastructure/fluentd/fluent.conf
<source>
@type forward
port 24224
bind 0.0.0.0
</source>

<filter sora.**>
@type parser
key_name log
reserve_data true
<parse>
@type json
</parse>
</filter>

<filter sora.**>
@type record_transformer
<record>
environment "#{ENV['ENVIRONMENT']}"
service "#{ENV['SERVICE_NAME']}"
timestamp ${Time.now.iso8601}
</record>
</filter>

<match sora.file-server.**>
@type cloudwatch_logs
log_group_name "/ecs/sora-file-server-#{ENV['ENVIRONMENT']}"
log_stream_name "#{ENV['HOSTNAME']}"
auto_create_stream true
region "#{ENV['AWS_REGION']}"
</match>

<match sora.feedback-api.**>
@type cloudwatch_logs
log_group_name "/ecs/sora-feedback-api-#{ENV['ENVIRONMENT']}"
log_stream_name "#{ENV['HOSTNAME']}"
auto_create_stream true
region "#{ENV['AWS_REGION']}"
</match>

<match **>
@type stdout
</match>
```

## 4. バックアップ・災害復旧

### 4.1 自動バックアップ

```bash
#!/bin/bash
# scripts/backup-database.sh

set -euo pipefail

# 設定
EFS_MOUNT_POINT="/mnt/efs"
BACKUP_DIR="/backups"
S3_BUCKET="${S3_BACKUP_BUCKET}"
RETENTION_DAYS=30
ENVIRONMENT="${ENVIRONMENT:-prod}"

# ログ設定
LOG_FILE="/var/log/backup.log"
exec 1> >(tee -a "${LOG_FILE}")
exec 2>&1

echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting database backup for environment: ${ENVIRONMENT}"

# バックアップディレクトリ作成
mkdir -p "${BACKUP_DIR}"

# タイムスタンプ
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="sora-feedback-${ENVIRONMENT}-${TIMESTAMP}.db"

# SQLiteデータベースバックアップ
if [ -f "${EFS_MOUNT_POINT}/feedback.db" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Creating database backup..."
    sqlite3 "${EFS_MOUNT_POINT}/feedback.db" ".backup ${BACKUP_DIR}/${BACKUP_FILE}"

    # 圧縮
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Compressing backup..."
    gzip "${BACKUP_DIR}/${BACKUP_FILE}"
    BACKUP_FILE="${BACKUP_FILE}.gz"

    # S3アップロード
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Uploading to S3..."
    aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" "s3://${S3_BUCKET}/database/${ENVIRONMENT}/${BACKUP_FILE}" \
        --storage-class STANDARD_IA

    # ローカルクリーンアップ
    rm -f "${BACKUP_DIR}/${BACKUP_FILE}"

    echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup completed: ${BACKUP_FILE}"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Database file not found: ${EFS_MOUNT_POINT}/feedback.db"
    exit 1
fi

# 古いバックアップクリーンアップ
echo "$(date '+%Y-%m-%d %H:%M:%S') - Cleaning up old backups..."
aws s3 ls "s3://${S3_BUCKET}/database/${ENVIRONMENT}/" \
    | while read -r line; do
        backup_date=$(echo "$line" | awk '{print $1}')
        backup_file=$(echo "$line" | awk '{print $4}')

        if [[ -n "$backup_date" && -n "$backup_file" ]]; then
            backup_timestamp=$(date -d "$backup_date" +%s)
            cutoff_timestamp=$(date -d "${RETENTION_DAYS} days ago" +%s)

            if [[ $backup_timestamp -lt $cutoff_timestamp ]]; then
                echo "$(date '+%Y-%m-%d %H:%M:%S') - Deleting old backup: ${backup_file}"
                aws s3 rm "s3://${S3_BUCKET}/database/${ENVIRONMENT}/${backup_file}"
            fi
        fi
    done

echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup process completed"
```

### 4.2 災害復旧手順

```yaml
# disaster-recovery/playbook.yml
---
- name: Disaster Recovery Playbook
  hosts: localhost
  vars:
    environment: "{{ env | default('prod') }}"
    backup_date: "{{ date | default('latest') }}"

  tasks:
    - name: Validate environment
      assert:
        that:
          - environment in ['dev', 'staging', 'prod']
        fail_msg: "Invalid environment. Must be dev, staging, or prod"

    - name: Check AWS credentials
      command: aws sts get-caller-identity
      register: aws_identity

    - name: Display AWS identity
      debug:
        msg: "Running as: {{ (aws_identity.stdout | from_json).Arn }}"

    - name: Get latest backup if date not specified
      shell: |
        aws s3 ls s3://{{ s3_backup_bucket }}/database/{{ environment }}/ \
          --recursive | tail -1 | awk '{print $4}'
      register: latest_backup
      when: backup_date == 'latest'

    - name: Set backup file
      set_fact:
        backup_file: "{{ latest_backup.stdout | basename if backup_date == 'latest' else backup_date }}"

    - name: Download backup from S3
      command: |
        aws s3 cp s3://{{ s3_backup_bucket }}/database/{{ environment }}/{{ backup_file }} \
          /tmp/{{ backup_file }}

    - name: Extract backup
      command: gunzip /tmp/{{ backup_file }}
      when: backup_file.endswith('.gz')

    - name: Set extracted filename
      set_fact:
        extracted_file: "{{ backup_file | regex_replace('\\.gz$', '') }}"

    - name: Stop ECS services
      command: |
        aws ecs update-service \
          --cluster sora-cluster-{{ environment }} \
          --service sora-feedback-api-{{ environment }} \
          --desired-count 0

    - name: Wait for services to stop
      command: |
        aws ecs wait services-stable \
          --cluster sora-cluster-{{ environment }} \
          --services sora-feedback-api-{{ environment }}

    - name: Mount EFS (if not already mounted)
      mount:
        path: /mnt/efs
        src: "{{ efs_file_system_id }}.efs.{{ aws_region }}.amazonaws.com:/"
        fstype: nfs4
        opts: nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2
        state: mounted
      become: yes

    - name: Backup current database
      command: |
        cp /mnt/efs/feedback.db /mnt/efs/feedback.db.backup.{{ ansible_date_time.epoch }}
      ignore_errors: yes

    - name: Restore database
      command: |
        cp /tmp/{{ extracted_file }} /mnt/efs/feedback.db

    - name: Set proper permissions
      file:
        path: /mnt/efs/feedback.db
        owner: root
        group: root
        mode: "0644"
      become: yes

    - name: Restart ECS services
      command: |
        aws ecs update-service \
          --cluster sora-cluster-{{ environment }} \
          --service sora-feedback-api-{{ environment }} \
          --desired-count {{ service_desired_count | default(2) }}

    - name: Wait for services to be stable
      command: |
        aws ecs wait services-stable \
          --cluster sora-cluster-{{ environment }} \
          --services sora-feedback-api-{{ environment }}

    - name: Health check
      uri:
        url: "{{ alb_endpoint }}/health"
        method: GET
        status_code: 200
      retries: 10
      delay: 30

    - name: Cleanup temporary files
      file:
        path: "{{ item }}"
        state: absent
      loop:
        - "/tmp/{{ backup_file }}"
        - "/tmp/{{ extracted_file }}"

    - name: Notify completion
      debug:
        msg: "Disaster recovery completed successfully for environment: {{ environment }}"
```

## 5. スケーリング戦略

### 5.1 Auto Scaling設定

```hcl
# infrastructure/terraform/autoscaling.tf

# Application Auto Scaling Target
resource "aws_appautoscaling_target" "sora_file_server" {
  max_capacity       = var.environment == "prod" ? 10 : 3
  min_capacity       = var.environment == "prod" ? 2 : 1
  resource_id        = "service/${aws_ecs_cluster.sora_cluster.name}/${aws_ecs_service.sora_file_server.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_target" "sora_feedback_api" {
  max_capacity       = var.environment == "prod" ? 10 : 3
  min_capacity       = var.environment == "prod" ? 2 : 1
  resource_id        = "service/${aws_ecs_cluster.sora_cluster.name}/${aws_ecs_service.sora_feedback_api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# CPU-based scaling policy
resource "aws_appautoscaling_policy" "sora_file_server_cpu" {
  name               = "sora-file-server-cpu-scaling-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.sora_file_server.resource_id
  scalable_dimension = aws_appautoscaling_target.sora_file_server.scalable_dimension
  service_namespace  = aws_appautoscaling_target.sora_file_server.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
    scale_in_cooldown = 300
    scale_out_cooldown = 300
  }
}

# Memory-based scaling policy
resource "aws_appautoscaling_policy" "sora_file_server_memory" {
  name               = "sora-file-server-memory-scaling-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.sora_file_server.resource_id
  scalable_dimension = aws_appautoscaling_target.sora_file_server.scalable_dimension
  service_namespace  = aws_appautoscaling_target.sora_file_server.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value = 80.0
    scale_in_cooldown = 300
    scale_out_cooldown = 300
  }
}

# Request count-based scaling policy for ALB
resource "aws_appautoscaling_policy" "sora_file_server_requests" {
  name               = "sora-file-server-requests-scaling-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.sora_file_server.resource_id
  scalable_dimension = aws_appautoscaling_target.sora_file_server.scalable_dimension
  service_namespace  = aws_appautoscaling_target.sora_file_server.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.sora_alb.arn_suffix}/${aws_lb_target_group.sora_file_server.arn_suffix}"
    }
    target_value = 1000.0
    scale_in_cooldown = 300
    scale_out_cooldown = 300
  }
}
```

### 5.2 コスト最適化

```hcl
# infrastructure/terraform/cost-optimization.tf

# Spot instances for non-critical workloads
resource "aws_ecs_capacity_provider" "spot" {
  count = var.environment != "prod" ? 1 : 0
  name  = "sora-spot-${var.environment}"

  auto_scaling_group_provider {
    auto_scaling_group_arn = aws_autoscaling_group.spot[0].arn

    managed_scaling {
      status          = "ENABLED"
      target_capacity = 100
    }

    managed_termination_protection = "DISABLED"
  }
}

# Scheduled scaling for predictable traffic patterns
resource "aws_appautoscaling_scheduled_action" "scale_down_evening" {
  count = var.environment == "prod" ? 1 : 0

  name               = "sora-scale-down-evening-${var.environment}"
  service_namespace  = "ecs"
  resource_id        = aws_appautoscaling_target.sora_file_server.resource_id
  scalable_dimension = "ecs:service:DesiredCount"
  schedule           = "cron(0 22 * * *)" # 10 PM UTC

  scalable_target_action {
    min_capacity = 1
    max_capacity = 5
  }
}

resource "aws_appautoscaling_scheduled_action" "scale_up_morning" {
  count = var.environment == "prod" ? 1 : 0

  name               = "sora-scale-up-morning-${var.environment}"
  service_namespace  = "ecs"
  resource_id        = aws_appautoscaling_target.sora_file_server.resource_id
  scalable_dimension = "ecs:service:DesiredCount"
  schedule           = "cron(0 6 * * *)" # 6 AM UTC

  scalable_target_action {
    min_capacity = 2
    max_capacity = 10
  }
}

# S3 Lifecycle policies
resource "aws_s3_bucket_lifecycle_configuration" "sora_files" {
  bucket = aws_s3_bucket.sora_files.id

  rule {
    id     = "transition_to_ia"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = var.environment == "prod" ? 2555 : 365 # 7 years for prod, 1 year for others
    }
  }

  rule {
    id     = "cleanup_incomplete_uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
```
