import { Redis } from 'ioredis';
import { Pool } from 'pg';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  compress?: boolean; // Enable compression for large values
  serialize?: boolean; // Custom serialization
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  avgResponseTime: number;
}

interface CacheEntry {
  value: any;
  timestamp: number;
  ttl: number;
  tags: string[];
  compressed: boolean;
}

class CacheService extends EventEmitter {
  private redis: Redis;
  private dbPool: Pool;
  private stats: CacheStats;
  private defaultTTL: number = 3600; // 1 hour
  private compressionThreshold: number = 1024; // 1KB
  private maxKeyLength: number = 250;

  constructor(redis: Redis, dbPool: Pool) {
    super();
    this.redis = redis;
    this.dbPool = dbPool;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      avgResponseTime: 0,
    };
    
    this.setupEventHandlers();
    this.startStatsCollection();
  }

  private setupEventHandlers() {
    this.redis.on('error', (error) => {
      console.error('Redis cache error:', error);
      this.emit('error', error);
    });

    this.redis.on('connect', () => {
      console.log('Redis cache connected');
      this.emit('connected');
    });

    this.redis.on('disconnect', () => {
      console.log('Redis cache disconnected');
      this.emit('disconnected');
    });
  }

  private startStatsCollection() {
    // Update stats every minute
    setInterval(() => {
      this.updateStats();
    }, 60000);
  }

  private async updateStats() {
    try {
      const total = this.stats.hits + this.stats.misses;
      this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
      
      // Store stats in Redis for monitoring
      await this.redis.hset('cache:stats', {
        hits: this.stats.hits,
        misses: this.stats.misses,
        sets: this.stats.sets,
        deletes: this.stats.deletes,
        hitRate: this.stats.hitRate.toFixed(2),
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Failed to update cache stats:', error);
    }
  }

  private generateKey(key: string, namespace?: string): string {
    const fullKey = namespace ? `${namespace}:${key}` : key;
    
    // Ensure key length doesn't exceed Redis limits
    if (fullKey.length > this.maxKeyLength) {
      const hash = require('crypto').createHash('sha256').update(fullKey).digest('hex');
      return `${fullKey.substring(0, this.maxKeyLength - 65)}:${hash}`;
    }
    
    return fullKey;
  }

  private async compress(data: string): Promise<string> {
    const zlib = require('zlib');
    return new Promise((resolve, reject) => {
      zlib.gzip(data, (err: any, compressed: Buffer) => {
        if (err) reject(err);
        else resolve(compressed.toString('base64'));
      });
    });
  }

  private async decompress(data: string): Promise<string> {
    const zlib = require('zlib');
    return new Promise((resolve, reject) => {
      const buffer = Buffer.from(data, 'base64');
      zlib.gunzip(buffer, (err: any, decompressed: Buffer) => {
        if (err) reject(err);
        else resolve(decompressed.toString());
      });
    });
  }

  public async get<T = any>(key: string, namespace?: string): Promise<T | null> {
    const startTime = performance.now();
    
    try {
      const fullKey = this.generateKey(key, namespace);
      const cached = await this.redis.get(fullKey);
      
      if (cached === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      
      const entry: CacheEntry = JSON.parse(cached);
      
      // Check if entry has expired (additional check beyond Redis TTL)
      if (entry.timestamp + (entry.ttl * 1000) < Date.now()) {
        await this.delete(key, namespace);
        this.stats.misses++;
        return null;
      }

      let value = entry.value;
      
      // Decompress if needed
      if (entry.compressed) {
        value = await this.decompress(value);
        value = JSON.parse(value);
      }

      const responseTime = performance.now() - startTime;
      this.updateAvgResponseTime(responseTime);
      
      return value;
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  public async set(
    key: string, 
    value: any, 
    options: CacheOptions = {}, 
    namespace?: string
  ): Promise<boolean> {
    try {
      const fullKey = this.generateKey(key, namespace);
      const ttl = options.ttl || this.defaultTTL;
      
      let serializedValue = JSON.stringify(value);
      let compressed = false;
      
      // Compress large values
      if (options.compress || serializedValue.length > this.compressionThreshold) {
        serializedValue = await this.compress(serializedValue);
        compressed = true;
      }

      const entry: CacheEntry = {
        value: compressed ? serializedValue : value,
        timestamp: Date.now(),
        ttl,
        tags: options.tags || [],
        compressed,
      };

      const result = await this.redis.setex(fullKey, ttl, JSON.stringify(entry));
      
      // Store tags for invalidation
      if (options.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          await this.redis.sadd(`tag:${tag}`, fullKey);
          await this.redis.expire(`tag:${tag}`, ttl + 300); // Tag expires 5 minutes after cache
        }
      }

      this.stats.sets++;
      return result === 'OK';
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  public async delete(key: string, namespace?: string): Promise<boolean> {
    try {
      const fullKey = this.generateKey(key, namespace);
      const result = await this.redis.del(fullKey);
      
      if (result > 0) {
        this.stats.deletes++;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  public async invalidateByTag(tag: string): Promise<number> {
    try {
      const keys = await this.redis.smembers(`tag:${tag}`);
      
      if (keys.length === 0) {
        return 0;
      }

      const pipeline = this.redis.pipeline();
      
      // Delete all keys with this tag
      for (const key of keys) {
        pipeline.del(key);
      }
      
      // Delete the tag set
      pipeline.del(`tag:${tag}`);
      
      const results = await pipeline.exec();
      const deletedCount = results?.filter(([err, result]) => !err && result === 1).length || 0;
      
      this.stats.deletes += deletedCount;
      return deletedCount;
    } catch (error) {
      console.error('Cache invalidate by tag error:', error);
      return 0;
    }
  }

  public async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      this.stats.deletes += result;
      
      return result;
    } catch (error) {
      console.error('Cache invalidate by pattern error:', error);
      return 0;
    }
  }

  public async exists(key: string, namespace?: string): Promise<boolean> {
    try {
      const fullKey = this.generateKey(key, namespace);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  public async ttl(key: string, namespace?: string): Promise<number> {
    try {
      const fullKey = this.generateKey(key, namespace);
      return await this.redis.ttl(fullKey);
    } catch (error) {
      console.error('Cache TTL error:', error);
      return -1;
    }
  }

  public async extend(key: string, additionalTTL: number, namespace?: string): Promise<boolean> {
    try {
      const fullKey = this.generateKey(key, namespace);
      const currentTTL = await this.redis.ttl(fullKey);
      
      if (currentTTL > 0) {
        const newTTL = currentTTL + additionalTTL;
        const result = await this.redis.expire(fullKey, newTTL);
        return result === 1;
      }
      
      return false;
    } catch (error) {
      console.error('Cache extend error:', error);
      return false;
    }
  }

  public async getOrSet<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {},
    namespace?: string
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, namespace);
    
    if (cached !== null) {
      return cached;
    }

    // Fetch data and cache it
    try {
      const data = await fetcher();
      await this.set(key, data, options, namespace);
      return data;
    } catch (error) {
      console.error('Cache getOrSet fetcher error:', error);
      throw error;
    }
  }

  public async mget(keys: string[], namespace?: string): Promise<(any | null)[]> {
    try {
      const fullKeys = keys.map(key => this.generateKey(key, namespace));
      const results = await this.redis.mget(...fullKeys);
      
      return results.map((result, index) => {
        if (result === null) {
          this.stats.misses++;
          return null;
        }
        
        try {
          this.stats.hits++;
          const entry: CacheEntry = JSON.parse(result);
          
          // Check expiration
          if (entry.timestamp + (entry.ttl * 1000) < Date.now()) {
            this.delete(keys[index], namespace);
            this.stats.misses++;
            this.stats.hits--;
            return null;
          }

          return entry.compressed ? JSON.parse(entry.value) : entry.value;
        } catch (error) {
          console.error('Cache mget parse error:', error);
          return null;
        }
      });
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  public async mset(entries: Array<{ key: string; value: any; options?: CacheOptions }>, namespace?: string): Promise<boolean> {
    try {
      const pipeline = this.redis.pipeline();
      
      for (const entry of entries) {
        const fullKey = this.generateKey(entry.key, namespace);
        const ttl = entry.options?.ttl || this.defaultTTL;
        
        let serializedValue = JSON.stringify(entry.value);
        let compressed = false;
        
        if (entry.options?.compress || serializedValue.length > this.compressionThreshold) {
          serializedValue = await this.compress(serializedValue);
          compressed = true;
        }

        const cacheEntry: CacheEntry = {
          value: compressed ? serializedValue : entry.value,
          timestamp: Date.now(),
          ttl,
          tags: entry.options?.tags || [],
          compressed,
        };

        pipeline.setex(fullKey, ttl, JSON.stringify(cacheEntry));
        
        // Handle tags
        if (entry.options?.tags) {
          for (const tag of entry.options.tags) {
            pipeline.sadd(`tag:${tag}`, fullKey);
            pipeline.expire(`tag:${tag}`, ttl + 300);
          }
        }
      }

      const results = await pipeline.exec();
      const successCount = results?.filter(([err, result]) => !err && result === 'OK').length || 0;
      
      this.stats.sets += successCount;
      return successCount === entries.length;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  public async flush(): Promise<boolean> {
    try {
      await this.redis.flushdb();
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        hitRate: 0,
        avgResponseTime: 0,
      };
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  public getStats(): CacheStats {
    return { ...this.stats };
  }

  public async getMemoryUsage(): Promise<{ used: number; peak: number; fragmentation: number }> {
    try {
      const info = await this.redis.memory('usage');
      const stats = await this.redis.memory('stats');
      
      return {
        used: info || 0,
        peak: stats?.['peak.allocated'] || 0,
        fragmentation: stats?.['fragmentation.ratio'] || 0,
      };
    } catch (error) {
      console.error('Cache memory usage error:', error);
      return { used: 0, peak: 0, fragmentation: 0 };
    }
  }

  private updateAvgResponseTime(responseTime: number) {
    const totalRequests = this.stats.hits + this.stats.misses;
    if (totalRequests === 1) {
      this.stats.avgResponseTime = responseTime;
    } else {
      this.stats.avgResponseTime = (this.stats.avgResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
    }
  }

  // Specialized cache methods for common use cases

  public async cacheMenuData(locationId: string, menuData: any, ttl: number = 1800): Promise<boolean> {
    return this.set(
      `menu:${locationId}`,
      menuData,
      { 
        ttl, 
        tags: ['menu', `location:${locationId}`],
        compress: true 
      },
      'menu'
    );
  }

  public async getCachedMenuData(locationId: string): Promise<any | null> {
    return this.get(`menu:${locationId}`, 'menu');
  }

  public async invalidateMenuCache(locationId?: string): Promise<number> {
    if (locationId) {
      return this.invalidateByTag(`location:${locationId}`);
    }
    return this.invalidateByTag('menu');
  }

  public async cacheUserSession(sessionId: string, sessionData: any, ttl: number = 86400): Promise<boolean> {
    return this.set(
      sessionId,
      sessionData,
      { 
        ttl,
        tags: ['session', `user:${sessionData.userId}`] 
      },
      'session'
    );
  }

  public async getCachedUserSession(sessionId: string): Promise<any | null> {
    return this.get(sessionId, 'session');
  }

  public async invalidateUserSessions(userId: string): Promise<number> {
    return this.invalidateByTag(`user:${userId}`);
  }

  public async cacheLocationData(coordinates: { lat: number; lng: number }, locationData: any, ttl: number = 3600): Promise<boolean> {
    const key = `${coordinates.lat.toFixed(4)},${coordinates.lng.toFixed(4)}`;
    return this.set(
      key,
      locationData,
      { 
        ttl,
        tags: ['location', 'geolocation'] 
      },
      'location'
    );
  }

  public async getCachedLocationData(coordinates: { lat: number; lng: number }): Promise<any | null> {
    const key = `${coordinates.lat.toFixed(4)},${coordinates.lng.toFixed(4)}`;
    return this.get(key, 'location');
  }

  public async cacheAnalyticsData(key: string, data: any, ttl: number = 900): Promise<boolean> {
    return this.set(
      key,
      data,
      { 
        ttl,
        tags: ['analytics'],
        compress: true 
      },
      'analytics'
    );
  }

  public async getCachedAnalyticsData(key: string): Promise<any | null> {
    return this.get(key, 'analytics');
  }

  public async invalidateAnalyticsCache(): Promise<number> {
    return this.invalidateByTag('analytics');
  }
}

// Singleton instance
let cacheServiceInstance: CacheService;

export const initializeCacheService = (redis: Redis, dbPool: Pool): CacheService => {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService(redis, dbPool);
  }
  return cacheServiceInstance;
};

export const cacheService = cacheServiceInstance;

export default CacheService;