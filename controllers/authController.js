// ====================================
// CONTROLADOR DE AUTENTICACIÓN
// ====================================
// Maneja registro, login y obtención de perfil de usuario

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const prisma = require("../db");
require("dotenv").config();

/**
 * generateToken
 * =============
 * Genera un token JWT firmado con el ID del usuario
 *
 * @param {string} id - UUID del usuario
 * @returns {string} Token JWT firmado
 *
 * El token contiene:
 * - id: UUID del usuario
 * - iat: timestamp de emisión
 * - exp: timestamp de expiración (30 días)
 */
const generateToken = (id) => {
  return jwt.sign(
    { id }, // Payload: solo el ID
    process.env.JWT_SECRET, // Clave secreta del .env
    { expiresIn: "30d" } // Válido por 30 días
  );
};

/**
 * register
 * ========
 * Registra un nuevo usuario en el sistema
 *
 * @route   POST /api/auth/register
 * @access  Public
 *
 * Body esperado:
 * {
 *   email: string,
 *   password: string,
 *   role: "ADMIN"|"TEACHER"|"STUDENT"|"PARENT",
 *   name: string,
 *   last_name: string,
 *   ...camposAdicionales (según el rol)
 * }
 *
 * Flujo:
 * 1. Validar campos requeridos
 * 2. Verificar si el email ya existe
 * 3. Hashear la contraseña
 * 4. Crear usuario en tabla users
 * 5. Crear perfil específico según el rol
 * 6. Retornar usuario y token
 */
const register = async (req, res, next) => {
  try {
    // Extraer datos del body
    const { email, password, role, name, last_name, ...extraData } = req.body;

    // ===== VALIDACIONES =====
    if (!email || !password || !role || !name || !last_name) {
      res.status(400); // 400 = Bad Request
      throw new Error("Por favor, proporciona todos los campos requeridos.");
    }

    // Verificar si el email ya está registrado
    const userExists = await prisma.users.findUnique({
      where: { email },
    });

    if (userExists) {
      res.status(400);
      throw new Error("El usuario ya existe.");
    }

    // ===== HASHEAR CONTRASEÑA =====
    // genSalt(10): genera un "salt" con factor de costo 10
    // Mayor número = más seguro pero más lento
    const salt = await bcrypt.genSalt(10);
    // Hash de la contraseña + salt
    const hashedPassword = await bcrypt.hash(password, salt);

    // ===== CREAR USUARIO BASE =====
    // Tabla users: almacena credenciales y rol
    const user = await prisma.users.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
    });

    // ===== CREAR PERFIL ESPECÍFICO =====
    // Según el rol, crear registro en tabla correspondiente
    let profile;

    switch (role) {
      // ----- ADMINISTRADOR -----
      case "ADMIN":
        profile = await prisma.admins.create({
          data: {
            user_id: user.id, // Relación con users
            name: `${name} ${last_name}`, // Nombre completo
          },
        });
        break;

      // ----- DOCENTE -----
      case "TEACHER":
        profile = await prisma.teachers.create({
          data: {
            user_id: user.id,
            name,
            last_name,
            specialty: extraData.specialty || null, // Especialidad opcional
            phone: extraData.phone || null, // Teléfono opcional
          },
        });
        break;

      // ----- ESTUDIANTE -----
      // Busca la sección donde se genera el PIN y actualízala:

      case "STUDENT":
        // Generar PIN único con retry
        let pin_code;
        let pinExists = true;
        let attempts = 0;
        const maxAttempts = 10;

        while (pinExists && attempts < maxAttempts) {
          pin_code = Math.floor(100000 + Math.random() * 900000).toString();

          // Verificar si ya existe
          const existingPin = await prisma.students.findFirst({
            where: { pin_code },
          });

          pinExists = !!existingPin;
          attempts++;
        }

        if (pinExists) {
          res.status(500);
          throw new Error("Error generando PIN único. Intenta nuevamente.");
        }

        // Generar QR único (ya tiene timestamp, muy baja probabilidad de colisión)
        const qr_code = `QR-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        profile = await prisma.students.create({
          data: {
            user_id: user.id,
            name,
            last_name,
            birth_date: new Date(extraData.birth_date),
            gender: extraData.gender,
            address: extraData.address || null,
            phone: extraData.phone || null,
            qr_code,
            pin_code,
            parent_id: extraData.parent_id || null,
          },
        });
        break;
      // ----- PADRE -----
      case "PARENT":
        profile = await prisma.parents.create({
          data: {
            user_id: user.id,
            name,
            last_name,
            phone: extraData.phone || null,
          },
        });
        break;

      default:
        res.status(400);
        throw new Error("Rol no válido.");
    }

    // ===== RESPUESTA EXITOSA =====
    // 201 = Created (recurso creado exitosamente)
    res.status(201).json({
      id: user.id, // UUID del usuario
      email: user.email, // Email
      role: user.role, // Rol
      profile, // Datos del perfil específico
      token: generateToken(user.id), // Token JWT para autenticación
    });
  } catch (error) {
    // Pasar error al middleware errorHandler
    next(error);
  }
};

/**
 * login
 * =====
 * Autentica un usuario existente
 *
 * @route   POST /api/auth/login
 * @access  Public
 *
 * Body esperado:
 * {
 *   email: string,
 *   password: string
 * }
 *
 * Flujo:
 * 1. Buscar usuario por email
 * 2. Comparar contraseña
 * 3. Retornar token y datos del usuario
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // ===== BUSCAR USUARIO =====
    // include: traer también los perfiles relacionados
    const user = await prisma.users.findUnique({
      where: { email },
      include: {
        student: true, // Si es estudiante, traer datos
        teacher: true, // Si es docente, traer datos
        parent: true, // Si es padre, traer datos
        admin: true, // Si es admin, traer datos
      },
    });

    // ===== VERIFICAR CREDENCIALES =====
    // user && (await bcrypt.compare()):
    // 1. Verifica que el usuario existe
    // 2. Compara la contraseña hasheada con la ingresada
    if (user && (await bcrypt.compare(password, user.password))) {
      // Determinar qué perfil retornar según el rol
      let profile;
      switch (user.role) {
        case "ADMIN":
          profile = user.admin;
          break;
        case "TEACHER":
          profile = user.teacher;
          break;
        case "STUDENT":
          profile = user.student;
          break;
        case "PARENT":
          profile = user.parent;
          break;
      }

      // ===== RESPUESTA EXITOSA =====
      res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        profile, // Datos del perfil
        token: generateToken(user.id), // Token JWT
      });
    } else {
      // Credenciales inválidas
      res.status(401); // 401 = Unauthorized
      throw new Error("Credenciales inválidas.");
    }
  } catch (error) {
    next(error);
  }
};

/**
 * getMe
 * =====
 * Obtiene el perfil del usuario autenticado
 *
 * @route   GET /api/auth/me
 * @access  Private (requiere token)
 *
 * Uso: El frontend puede llamar este endpoint después del login
 * para obtener los datos actualizados del usuario
 */
const getMe = async (req, res, next) => {
  try {
    // req.user viene del middleware "protect"
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        student: true, // Incluir perfil de estudiante si aplica
        teacher: true, // Incluir perfil de docente si aplica
        parent: true, // Incluir perfil de padre si aplica
        admin: true, // Incluir perfil de admin si aplica
      },
    });

    // Determinar perfil según rol
    let profile;
    switch (user.role) {
      case "ADMIN":
        profile = user.admin;
        break;
      case "TEACHER":
        profile = user.teacher;
        break;
      case "STUDENT":
        profile = user.student;
        break;
      case "PARENT":
        profile = user.parent;
        break;
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      profile, // ✅ Ahora sí tiene "profile"
    });
  } catch (error) {
    next(error);
  }
};

// Exportar funciones para usar en las rutas
module.exports = {
  register,
  login,
  getMe,
};
