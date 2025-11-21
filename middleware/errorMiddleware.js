// =========================================
// MIDDLEWARE DE MANEJO DE ERRORES
// =========================================
// Centraliza el manejo de errores de toda la aplicación

/**
 * errorHandler
 * ============
 * Middleware global que captura todos los errores
 * Se ejecuta cuando se llama next(error) en cualquier controlador
 *
 * Flujo:
 * 1. Obtiene el código de estado (si no hay, usa 500)
 * 2. Responde con JSON que incluye mensaje y stack trace
 *
 * Nota: En producción no se debe mostrar el stack trace por seguridad
 */
const errorHandler = (err, req, res, next) => {
  // Si res.statusCode ya fue establecido (ej: 400, 404), usarlo
  // Si no, usar 500 (error interno del servidor)
  const statusCode = res.statusCode ? res.statusCode : 500;

  // Establecer el código de estado HTTP
  res.status(statusCode);

  // Responder con JSON
  res.json({
    message: err.message, // Mensaje del error
    // Stack trace: útil en desarrollo, oculto en producción
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = { errorHandler };
