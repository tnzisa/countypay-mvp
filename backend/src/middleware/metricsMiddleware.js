/**
 * Metrics Middleware
 * Captures HTTP request metrics for Prometheus
 * Includes request correlation IDs in logs
 */

const metrics = require('../lib/metrics');

/**
 * Middleware to capture HTTP request metrics
 */
function metricsMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Get the route pattern (instead of full URL with IDs)
  let route = req.route?.path || req.path;
  
  // Normalize the route
  if (route) {
    route = route.replace(/\/:[^/]+/g, '/:id');
  } else {
    route = req.method.toLowerCase() + '_' + req.path.split('/')[1];
  }

  // Track active requests
  metrics.activeRequests.inc({ method: req.method, route });

  // Capture response finish
  const onFinish = () => {
    const duration = (Date.now() - startTime) / 1000;
    const statusCode = res.statusCode;

    // Record metrics
    metrics.httpRequestDuration.observe(
      { method: req.method, route, status_code: statusCode },
      duration
    );

    metrics.httpRequestCount.inc({
      method: req.method,
      route,
      status_code: statusCode
    });

    metrics.activeRequests.dec({ method: req.method, route });

    // Track errors
    if (statusCode >= 400) {
      metrics.errorCount.inc({
        type: `http_${statusCode}`,
        route
      });
    }

    // Log slow requests (>1 second)
    if (duration > 1.0) {
      const requestId = req.requestId || 'unknown';
      console.warn(`[SLOW_REQUEST] ${requestId} ${req.method} ${route} took ${duration.toFixed(2)}s (${statusCode})`);
    }
  };

  res.on('finish', onFinish);
  res.on('close', onFinish);

  next();
}

module.exports = metricsMiddleware;
