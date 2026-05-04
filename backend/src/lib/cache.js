class InMemoryCache {
  constructor(defaultTTL = 300000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key, value, ttl = this.defaultTTL) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  deletePattern(pattern) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Create cache instances with different TTLs
const shortCache = new InMemoryCache(60000); // 1 minute - frequently changing data
const mediumCache = new InMemoryCache(300000); // 5 minutes - moderately changing data
const longCache = new InMemoryCache(600000); // 10 minutes - rarely changing data

// Clean up expired entries every 5 minutes
setInterval(() => {
  shortCache.cleanup();
  mediumCache.cleanup();
  longCache.cleanup();
}, 300000);

module.exports = {
  shortCache,
  mediumCache,
  longCache,
};
