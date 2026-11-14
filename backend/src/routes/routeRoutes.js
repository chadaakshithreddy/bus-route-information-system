const express = require('express');
const router = express.Router();
const {
  getRoutes,
  getRouteById,
  searchRoutes,
  findRouteBetweenStops,
  createRoute,
  updateRoute,
  deleteRoute,
  getDashboardStats
} = require('../controllers/routeController');
const { protect, admin } = require('../middleware/authMiddleware');

// Specialized search & dashboard endpoints (must come before /:id)
router.get('/search', searchRoutes);
router.get('/path', findRouteBetweenStops);
router.get('/stats/dashboard', getDashboardStats);

// Base route endpoints
router.route('/')
  .get(getRoutes)
  .post(protect, admin, createRoute);

// ID-based endpoints
router.route('/:id')
  .get(getRouteById)
  .put(protect, admin, updateRoute)
  .delete(protect, admin, deleteRoute);

module.exports = router;
