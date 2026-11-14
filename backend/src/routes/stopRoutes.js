const express = require('express');
const router = express.Router();
const {
  getStops,
  getStopById,
  createStop,
  updateStop,
  deleteStop
} = require('../controllers/stopController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(getStops)
  .post(protect, admin, createStop);

router.route('/:id')
  .get(getStopById)
  .put(protect, admin, updateStop)
  .delete(protect, admin, deleteStop);

module.exports = router;
