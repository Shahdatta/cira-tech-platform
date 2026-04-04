using System.Collections.Concurrent;

namespace Prism.API.Services
{
    /// <summary>
    /// Simple in-memory rate limiter for authentication endpoints.
    /// Prevents brute-force login attacks.
    /// </summary>
    public class RateLimitService
    {
        private readonly ConcurrentDictionary<string, (int count, DateTime windowStart)> _attempts = new();
        private readonly int _maxAttempts;
        private readonly TimeSpan _window;

        public RateLimitService(int maxAttempts = 10, int windowSeconds = 60)
        {
            _maxAttempts = maxAttempts;
            _window = TimeSpan.FromSeconds(windowSeconds);
        }

        /// <summary>
        /// Returns true if the request should be allowed, false if rate limited.
        /// </summary>
        public bool IsAllowed(string key)
        {
            var now = DateTime.UtcNow;

            var entry = _attempts.AddOrUpdate(key,
                _ => (1, now),
                (_, existing) =>
                {
                    if (now - existing.windowStart > _window)
                        return (1, now);  // Reset window
                    return (existing.count + 1, existing.windowStart);
                });

            return entry.count <= _maxAttempts;
        }

        /// <summary>
        /// Clean up expired entries (call periodically).
        /// </summary>
        public void Cleanup()
        {
            var now = DateTime.UtcNow;
            foreach (var key in _attempts.Keys)
            {
                if (_attempts.TryGetValue(key, out var val) && now - val.windowStart > _window)
                    _attempts.TryRemove(key, out _);
            }
        }
    }
}
