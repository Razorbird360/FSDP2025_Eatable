import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Create a dedicated registry
export const register = new Registry();

// Collect default Node.js metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ register });

// ============ HTTP Metrics ============

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// ============ Business Metrics ============

export const ordersCreated = new Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
  labelNames: ['stall_id', 'payment_method'],
  registers: [register],
});

export const orderValue = new Histogram({
  name: 'order_value_cents',
  help: 'Order value distribution in cents',
  buckets: [500, 1000, 2000, 5000, 10000, 20000, 50000],
  registers: [register],
});

export const cartAdditions = new Counter({
  name: 'cart_additions_total',
  help: 'Total number of items added to cart',
  labelNames: ['stall_id'],
  registers: [register],
});

export const searchQueries = new Counter({
  name: 'search_queries_total',
  help: 'Total number of search queries',
  labelNames: ['type'],
  registers: [register],
});

// ============ AI Agent Metrics ============

export const agentRequestsTotal = new Counter({
  name: 'agent_requests_total',
  help: 'Total number of agent requests',
  labelNames: ['status'],
  registers: [register],
});

export const agentResponseTime = new Histogram({
  name: 'agent_response_seconds',
  help: 'Agent response time in seconds',
  buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
  registers: [register],
});

export const toolCalls = new Counter({
  name: 'agent_tool_calls_total',
  help: 'Total number of tool invocations by the agent',
  labelNames: ['tool_name', 'status'],
  registers: [register],
});

export const toolDuration = new Histogram({
  name: 'agent_tool_duration_seconds',
  help: 'Duration of tool executions',
  labelNames: ['tool_name'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// ============ Infrastructure Metrics ============

export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['type'],
  registers: [register],
});

// ============ Payment Metrics ============

export const paymentAttempts = new Counter({
  name: 'payment_attempts_total',
  help: 'Total payment attempts',
  labelNames: ['method', 'status'],
  registers: [register],
});
