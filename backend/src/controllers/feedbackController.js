const Feedback = require('../models/Feedback');

// @desc    Submit new feedback
// @route   POST /api/feedback
// @access  Public
const submitFeedback = async (req, res, next) => {
  try {
    const { feedbackId, userId, routeId, message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Feedback message is required'
      });
    }

    const finalFeedbackId = feedbackId
      ? feedbackId.trim()
      : `FB${Date.now().toString().slice(-6)}`;

    const feedback = await Feedback.create({
      feedbackId: finalFeedbackId,
      userId: userId || (req.user ? req.user.userId : null),
      routeId: routeId || null,
      message: message.trim()
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all feedback
// @route   GET /api/feedback
// @access  Public / Admin
const getFeedback = async (req, res, next) => {
  try {
    const feedbackList = await Feedback.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: feedbackList.length,
      data: feedbackList
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitFeedback,
  getFeedback
};
