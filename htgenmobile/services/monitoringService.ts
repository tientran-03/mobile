import { API_ENDPOINTS } from "@/config/api";
import { apiClient } from "./api";

export interface DatabaseHealth {
  status: string;
  responseTime?: number;
  activeConnections?: number;
  maxConnections?: number;
  databaseName?: string;
  driverName?: string;
}

export interface RedisHealth {
  status: string;
  responseTime?: number;
  version?: string;
}

export interface JvmHealth {
  status: string;
  uptime?: number;
  memoryUsed?: number;
  memoryMax?: number;
  threads?: number;
}

export interface DiskHealth {
  status: string;
  total?: number;
  free?: number;
  usable?: number;
  threshold?: number;
}

export interface SystemHealthResponse {
  database?: DatabaseHealth;
  redis?: RedisHealth;
  jvm?: JvmHealth;
  disk?: DiskHealth;
}

export interface HttpMetrics {
  requests?: {
    total?: number;
    rate?: number;
    errors?: number;
  };
  responseTime?: {
    avg?: number;
    p50?: number;
    p95?: number;
    p99?: number;
  };
}

export interface JvmMetrics {
  memory?: {
    heapUsed?: number;
    heapMax?: number;
    nonHeapUsed?: number;
    heapCommitted?: number;
  };
  threads?: {
    live?: number;
    daemon?: number;
    peak?: number;
  };
  gc?: {
    pauseTime?: number;
    pauseCount?: number;
  };
  classes?: {
    loaded?: number;
    unloaded?: number;
  };
}

export interface DatabaseMetrics {
  connections?: {
    active?: number;
    idle?: number;
    pending?: number;
    max?: number;
  };
  pool?: {
    size?: number;
    available?: number;
  };
}

export interface ApplicationMetrics {
  totalUsers?: number;
  activeUsers?: number;
  totalOrders?: number;
  pendingOrders?: number;
}

export interface SystemMetricsResponse {
  http?: HttpMetrics;
  jvm?: JvmMetrics;
  database?: DatabaseMetrics;
  application?: ApplicationMetrics;
}

export const monitoringService = {
  /**
   * Get overall system health
   */
  getSystemHealth: async (): Promise<SystemHealthResponse> => {
    const response = await apiClient.get<SystemHealthResponse>(API_ENDPOINTS.METRICS_HEALTH);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to fetch system health");
  },

  /**
   * Get database health
   */
  getDatabaseHealth: async (): Promise<DatabaseHealth> => {
    const response = await apiClient.get<DatabaseHealth>(API_ENDPOINTS.METRICS_HEALTH_DATABASE);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to fetch database health");
  },

  /**
   * Get Redis health
   */
  getRedisHealth: async (): Promise<RedisHealth> => {
    const response = await apiClient.get<RedisHealth>(API_ENDPOINTS.METRICS_HEALTH_REDIS);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to fetch Redis health");
  },

  /**
   * Get JVM health
   */
  getJvmHealth: async (): Promise<JvmHealth> => {
    const response = await apiClient.get<JvmHealth>(API_ENDPOINTS.METRICS_HEALTH_JVM);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to fetch JVM health");
  },

  /**
   * Get Disk health
   */
  getDiskHealth: async (): Promise<DiskHealth> => {
    const response = await apiClient.get<DiskHealth>(API_ENDPOINTS.METRICS_HEALTH_DISK);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to fetch disk health");
  },

  /**
   * Get metrics overview
   */
  getMetricsOverview: async (): Promise<SystemMetricsResponse> => {
    const response = await apiClient.get<SystemMetricsResponse>(API_ENDPOINTS.METRICS_OVERVIEW);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to fetch metrics overview");
  },

  /**
   * Get HTTP metrics
   */
  getHttpMetrics: async (): Promise<HttpMetrics> => {
    const response = await apiClient.get<HttpMetrics>(API_ENDPOINTS.METRICS_HTTP);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to fetch HTTP metrics");
  },

  /**
   * Get JVM metrics
   */
  getJvmMetrics: async (): Promise<JvmMetrics> => {
    const response = await apiClient.get<JvmMetrics>(API_ENDPOINTS.METRICS_JVM);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to fetch JVM metrics");
  },

  /**
   * Get Database metrics
   */
  getDatabaseMetrics: async (): Promise<DatabaseMetrics> => {
    const response = await apiClient.get<DatabaseMetrics>(API_ENDPOINTS.METRICS_DATABASE);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || "Failed to fetch database metrics");
  },
};
