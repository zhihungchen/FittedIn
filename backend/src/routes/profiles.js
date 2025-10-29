const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const profileController = require('../controllers/profileController');
const ResponseHandler = require('../utils/response');

const router = express.Router();

/**
 * Validation middleware
 */
const validate = (req, res, next) => {
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
        return ResponseHandler.validationError(res, errors.array());
    }
    next();
};

// Get current user's profile
router.get('/me', authenticateToken, profileController.getMyProfile);

// Update current user's profile
router.put('/me', authenticateToken, [
    body('pronouns').optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
    body('bio').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
    body('location').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
    body('date_of_birth').optional({ checkFalsy: true }).isISO8601().toDate(),
    body('height').optional({ checkFalsy: true }).trim().toInt().isInt({ min: 50, max: 300 }),
    body('weight').optional({ checkFalsy: true }).trim().toFloat().isFloat({ min: 10, max: 500 }),
    body('fitness_level').optional({ checkFalsy: true }).trim().toLowerCase().isIn(['beginner', 'intermediate', 'advanced']),
    body('primary_goals').optional().isArray(),
    body('skills').optional().isArray(),
    body('privacy_settings').optional().isObject()
], validate, profileController.updateMyProfile);

// Get another user's public profile
router.get('/:userId', authenticateToken, profileController.getUserProfile);

module.exports = router;