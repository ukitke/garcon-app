# CloudWatch Log Insights Queries for Garçon App

This document contains useful CloudWatch Log Insights queries for monitoring and troubleshooting the Garçon application.

## Error Analysis

### Top Errors by Count
```
fields @timestamp, level, message, stack
| filter level = "error"
| stats count() by message
| sort count desc
| limit 20
```

### Recent Application Errors
```
fields @timestamp, level, message, stack, requestId, userId
| filter level = "error"
| sort @timestamp desc
| limit 50
```

### Errors by User
```
fields @timestamp, message, userId, requestId
| filter level = "error" and ispresent(userId)
| stats count() by userId
| sort count desc
| limit 10
```

## Performance Analysis

### Slow API Requests (>1 second)
```
fields @timestamp, method, url, responseTime, statusCode, requestId
| filter ispresent(responseTime) and responseTime > 1000
| sort @timestamp desc
| limit 50
```

### Average Response Time by Endpoint
```
fields @timestamp, url, responseTime
| filter ispresent(responseTime)
| stats avg(responseTime) as avgResponseTime, count() as requestCount by url
| sort avgResponseTime desc
```

### 5xx Errors
```
fields @timestamp, method, url, statusCode, requestId, userId
| filter statusCode >= 500
| sort @timestamp desc
| limit 50
```

### 4xx Errors (Client Errors)
```
fields @timestamp, method, url, statusCode, requestId, userId, userAgent
| filter statusCode >= 400 and statusCode < 500
| stats count() by statusCode, url
| sort count desc
```

## Database Monitoring

### Slow Database Queries (>1 second)
```
fields @timestamp, query, duration
| filter ispresent(duration) and duration > 1000
| sort @timestamp desc
| limit 20
```

### Database Errors
```
fields @timestamp, query, error, duration
| filter ispresent(error)
| sort @timestamp desc
| limit 50
```

### Most Frequent Queries
```
fields @timestamp, query
| filter ispresent(query)
| stats count() by query
| sort count desc
| limit 20
```

## Business Metrics

### Order Creation Events
```
fields @timestamp, event, orderId, userId, amount
| filter event = "order_created"
| sort @timestamp desc
| limit 100
```

### Payment Events
```
fields @timestamp, event, paymentId, amount, method, status
| filter event like /payment/
| sort @timestamp desc
| limit 100
```

### Failed Payments
```
fields @timestamp, event, paymentId, amount, method, error
| filter event = "payment_failed"
| sort @timestamp desc
| limit 50
```

### Waiter Calls
```
fields @timestamp, event, locationId, tableId, responseTime
| filter event = "waiter_call"
| sort @timestamp desc
| limit 100
```

## Security Monitoring

### Authentication Failures
```
fields @timestamp, success, reason, ip, userAgent, email
| filter success = false
| sort @timestamp desc
| limit 50
```

### Suspicious Activity
```
fields @timestamp, activity, details, ip, userAgent, userId
| filter level = "warn" and ispresent(activity)
| sort @timestamp desc
| limit 50
```

### Rate Limit Violations
```
fields @timestamp, limit, ip, userAgent, endpoint
| filter message like /rate limit/i
| stats count() by ip
| sort count desc
```

## User Activity

### User Registration Events
```
fields @timestamp, event, userId, email
| filter event = "user_registered"
| sort @timestamp desc
| limit 100
```

### User Login Activity
```
fields @timestamp, success, userId, ip, userAgent
| filter message like /login/i
| sort @timestamp desc
| limit 100
```

### Active Users by Location
```
fields @timestamp, userId, locationId, activity
| filter ispresent(locationId) and ispresent(userId)
| stats count_distinct(userId) by locationId
| sort count_distinct desc
```

## System Health

### Application Startup Events
```
fields @timestamp, message, environment, version, port
| filter message like /started/i
| sort @timestamp desc
| limit 20
```

### Health Check Failures
```
fields @timestamp, status, checks
| filter status != "OK"
| sort @timestamp desc
| limit 50
```

### Memory Usage Trends
```
fields @timestamp, system.memory.heapUsed, system.memory.heapTotal
| filter ispresent(system.memory.heapUsed)
| sort @timestamp desc
| limit 100
```

## Request Analysis

### Top User Agents
```
fields @timestamp, userAgent
| filter ispresent(userAgent)
| stats count() by userAgent
| sort count desc
| limit 20
```

### Requests by IP Address
```
fields @timestamp, ip, method, url
| filter ispresent(ip)
| stats count() by ip
| sort count desc
| limit 20
```

### API Usage by Endpoint
```
fields @timestamp, method, url, statusCode
| filter url like /^\/api\//
| stats count() by url, method
| sort count desc
| limit 30
```

## Time-based Analysis

### Hourly Request Volume
```
fields @timestamp
| filter ispresent(method)
| stats count() by bin(5m)
| sort @timestamp desc
```

### Daily Error Rate
```
fields @timestamp, level
| filter level = "error"
| stats count() by bin(1h)
| sort @timestamp desc
```

### Peak Usage Hours
```
fields @timestamp, method, url
| filter ispresent(method)
| stats count() as requests by bin(1h)
| sort requests desc
| limit 24
```

## Custom Filters

### Filter by Request ID
```
fields @timestamp, level, message, requestId
| filter requestId = "your-request-id-here"
| sort @timestamp asc
```

### Filter by User ID
```
fields @timestamp, level, message, userId, activity
| filter userId = "your-user-id-here"
| sort @timestamp desc
| limit 100
```

### Filter by Location ID
```
fields @timestamp, level, message, locationId, event
| filter locationId = "your-location-id-here"
| sort @timestamp desc
| limit 100
```

## Usage Instructions

1. Go to AWS CloudWatch Console
2. Navigate to "Logs" > "Insights"
3. Select the log group: `/aws/ecs/garcon-app/backend`
4. Copy and paste any of the above queries
5. Adjust the time range as needed
6. Click "Run query"

## Tips

- Use `bin()` function for time-based aggregations
- Use `stats` for aggregations and counting
- Use `filter` to narrow down results
- Use `sort` to order results
- Use `limit` to control result size
- Combine multiple filters with `and` / `or`
- Use `ispresent()` to check if a field exists
- Use `like` for pattern matching with regex