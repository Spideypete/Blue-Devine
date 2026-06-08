class RateLimiter {
  constructor(maxRequests = 5, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.userTimestamps = new Map();
  }

  isLimited(userId) {
    const now = Date.now();
    const userRequests = this.userTimestamps.get(userId) || [];
    const recentRequests = userRequests.filter((ts) => now - ts < this.windowMs);

    if (recentRequests.length >= this.maxRequests) {
      return true;
    }

    recentRequests.push(now);
    this.userTimestamps.set(userId, recentRequests);
    return false;
  }

  getRemainingTime(userId) {
    const userRequests = this.userTimestamps.get(userId) || [];
    if (userRequests.length === 0) return 0;

    const oldestInWindow = userRequests.filter((ts) => Date.now() - ts < this.windowMs)[0];
    if (!oldestInWindow) return 0;

    return Math.ceil((oldestInWindow + this.windowMs - Date.now()) / 1000);
  }
}

export const rateLimiter = new RateLimiter(5, 60000);
