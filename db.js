// ====================================
// CONFIGURACIÓN DE PRISMA CLIENT
// ====================================
// Conexión única a la base de datos

const { PrismaClient } = require("@prisma/client");

// Crear instancia única de Prisma Client
// Esta instancia se reutiliza en toda la aplicación
// para mantener un pool de conexiones eficiente
const prisma = new PrismaClient();

// Exportar para usar en controladores
// Ejemplo: const prisma = require("../db");
module.exports = prisma;
