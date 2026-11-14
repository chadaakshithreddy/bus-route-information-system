const express = require('express');
const router = express.Router();
const {
  submitFeedback,
  getFeedback
} = require('../controllers/feedbackController');

router.route('/')
  .get(getFeedback)
  .post(submitFeedback);

module.exports = router;
