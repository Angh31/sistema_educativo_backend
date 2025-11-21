// ====================================
// RUTAS DE PERFIL
// ====================================

const express = require("express");
const router = express.Router();
const {
  getMyProfile,
  updateMyProfile,
  changePassword,
  updateEmail,
} = require("../controllers/profileController");
const { protect } = require("../middleware/authMiddleware");

// Todas las rutas requieren autenticación
router.use(protect);

// Obtener mi perfil
router.get("/", getMyProfile);

// Actualizar mi perfil
router.put("/", updateMyProfile);

// Cambiar contraseña
router.put("/password", changePassword);

// Actualizar email
router.put("/email", updateEmail);

module.exports = router;
