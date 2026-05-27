// ============================================
// MIDDLEWARE DE AUTENTICACIÓN Y AUTORIZACIÓN
// ============================================
// Este archivo maneja la protección de rutas y verificación de roles

const jwt = require("jsonwebtoken");
const prisma = require("../db");

/**
 * Middleware: protect
 * ==================
 * Protege las rutas verificando que el usuario tenga un token JWT válido
 *
 * Flujo:
 * 1. Extrae el token del header Authorization
 * 2. Verifica que el token sea válido
 * 3. Obtiene el usuario de la BD
 * 4. Adjunta el usuario al objeto req para usarlo en los controladores
 *
 * Uso: router.get("/ruta", protect, miControlador)
 */
const protect = async (req, res, next) => {
  let token;

  // Verificar si existe el header Authorization y si empieza con "Bearer"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extraer el token (formato: "Bearer TOKEN_AQUI")
      token = req.headers.authorization.split(" ")[1];

      // Verificar y decodificar el token usando la clave secreta
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Buscar el usuario en la BD usando el ID del token
      req.user = await prisma.users.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });

      // Si el usuario no existe
      if (!req.user) {
        return res.status(401).json({
          error: "No autorizado, usuario no encontrado.",
        });
      }

      // Usuario válido, continuar
      return next();
    } catch (error) {
      console.error("Error en protect middleware:", error.message);
      return res.status(401).json({
        error: "No autorizado, token inválido o expirado.",
      });
    }
  }

  // Si no hay token en el header
  return res.status(401).json({
    error: "No autorizado, no se proporcionó un token.",
  });
};

/**
 * Middleware: authorize
 * ====================
 * Verifica que el usuario tenga uno de los roles permitidos
 *
 * Uso: router.post("/ruta", protect, authorize("ADMIN", "TEACHER"), controller)
 *
 * @param {...string} roles - Lista de roles permitidos
 * @returns {Function} Middleware que verifica el rol
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Verificar si el rol del usuario está en la lista de roles permitidos
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `El rol ${req.user.role} no tiene permiso para esta acción.`,
      });
    }

    // Rol válido, continuar
    next();
  };
};

// Exportar para usar en las rutas
module.exports = { protect, authorize };
