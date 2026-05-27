// ====================================
// RUTAS DE AUTENTICACIÓN
// ====================================

const express = require("express");
const router = express.Router();
const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Registro de nuevo usuario (público)
router.post("/register", register);

// Login de usuario (público)
router.post("/login", login);

// Obtener perfil del usuario autenticado (protegido)
router.get("/me", protect, getMe);

module.exports = router;
