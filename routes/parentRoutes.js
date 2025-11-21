// ====================================
// RUTAS DE PADRES
// ====================================

const express = require("express");
const router = express.Router();
const {
  getParents,
  getParentById,
  updateParent,
  deleteParent,
  getChildrenSummary,
} = require("../controllers/parentController");
const { protect, authorize } = require("../middleware/authMiddleware");

// Obtener todos los padres (solo Admin)
router.get("/", protect, authorize("ADMIN"), getParents);

// Obtener padre por ID (todos los roles autenticados)
router.get("/:id", protect, getParentById);

// Obtener resumen de hijos (todos los roles autenticados)
router.get("/:id/children-summary", protect, getChildrenSummary);

// Actualizar padre (solo Admin)
router.put("/:id", protect, authorize("ADMIN"), updateParent);

// Eliminar padre (solo Admin)
router.delete("/:id", protect, authorize("ADMIN"), deleteParent);

module.exports = router;
