const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // Users can only access their own profile for now
        if (userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                displayName: user.display_name,
                avatarUrl: user.avatar_url,
                createdAt: user.created_at,
                updatedAt: user.updated_at
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user profile'
        });
    }
});

// Update user profile
router.put('/:id', authenticateToken, [
    body('displayName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Display name must be between 2 and 100 characters'),
    body('avatarUrl')
        .optional({ checkFalsy: false })
        .custom((value) => {
            if (value && typeof value === 'string') {
                const trimmedValue = value.trim();
                // Skip validation if empty string after trim
                if (!trimmedValue) {
                    return true;
                }

                // Accept both HTTP/HTTPS URLs and data URLs (base64 encoded images)
                // Data URL format: data:image/[type];base64,[data]
                // HTTP URL format: http:// or https://
                const isHttpUrl = /^https?:\/\/.+/.test(trimmedValue);
                // More lenient data URL regex to handle various formats
                const isDataUrl = /^data:image\/[a-zA-Z0-9+.-]+\s*;\s*base64\s*,\s*.+/.test(trimmedValue);

                if (!isHttpUrl && !isDataUrl) {
                    // Log for debugging
                    console.log('Avatar URL validation failed. Value length:', trimmedValue.length);
                    console.log('Value preview:', trimmedValue.substring(0, 50) + '...');
                    throw new Error('Avatar URL must be a valid HTTP/HTTPS URL or data URL (data:image/...;base64,...)');
                }
            }
            return true;
        })
        .withMessage('Avatar URL must be a valid HTTP/HTTPS URL or data URL')
], async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // Users can only update their own profile
        if (userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { displayName, avatarUrl } = req.body;
        const updateData = {};

        if (displayName) updateData.display_name = displayName;
        if (avatarUrl) updateData.avatar_url = avatarUrl;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await user.update(updateData);

        // Reload user to get updated data
        await user.reload();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                email: user.email,
                displayName: user.display_name,
                avatarUrl: user.avatar_url,
                updatedAt: user.updated_at
            }
        });

    } catch (error) {
        console.error('Update user error:', error);

        // Provide more specific error messages
        let errorMessage = 'Failed to update profile';
        let statusCode = 500;

        if (error.name === 'SequelizeValidationError') {
            statusCode = 400;
            errorMessage = 'Validation error: ' + error.errors.map(e => e.message).join(', ');
        } else if (error.name === 'SequelizeDatabaseError') {
            statusCode = 500;
            errorMessage = 'Database error occurred. Please try again.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        res.status(statusCode).json({
            success: false,
            message: errorMessage
        });
    }
});

module.exports = router;
