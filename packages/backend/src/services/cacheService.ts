// Cache service
export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
}

export class CacheService {
  private cache = new Map<string, { value: any; expires: number }>();
  private options: CacheOptions;

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl || 300000, // 5 minutes
      maxSize: options.maxSize || 1000
    };
  }

  set(key: string, value: any, ttl?: number): void {
    const expires = Date.now() + (ttl || this.options.ttl!);
    this.cache.set(key, { value, expires });
    
    // Simple LRU eviction
    if (this.cache.size > this.options.maxSize!) {
      const firstKey = this.cache.keys().next().value; if (firstKey) {
      this.cache.delete(firstKey); }
    }
  }

  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export default CacheService;