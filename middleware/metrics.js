// ====================================
// MIDDLEWARE DE MÉTRICAS PROMETHEUS
// ====================================

const client = require("prom-client");

// Registro de métricas
const register = new client.Registry();

// Métricas por defecto del sistema
client.collectDefaultMetrics({ register });

// Contador de requests HTTP
const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total de peticiones HTTP",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

// Histograma de duración de requests
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duración de peticiones HTTP en segundos",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

// Contador de errores de API
const apiErrorsTotal = new client.Counter({
  name: "api_errors_total",
  help: "Total de errores en la API",
  labelNames: ["route", "error_type"],
  registers: [register],
});

// Middleware para medir requests
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;

    httpRequestsTotal.labels(req.method, route, res.statusCode).inc();
    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);

    if (res.statusCode >= 400) {
      apiErrorsTotal
        .labels(route, res.statusCode >= 500 ? "server" : "client")
        .inc();
    }
  });

  next();
};

module.exports = {
  register,
  metricsMiddleware,
  httpRequestsTotal,
  httpRequestDuration,
  apiErrorsTotal,
};
