const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const { authenticate } = require('../middleware/auth');

// Get all active trackings for current user (Farmer, Owner, Admin)
router.get('/tracking/active', authenticate, trackingController.getActiveTrackings);

// Get specific booking tracking details
router.get('/tracking/:bookingId', authenticate, trackingController.getBookingTracking);

// Update live GPS coordinates
router.post('/tracking/:bookingId/location', authenticate, trackingController.updateTractorLocation);

// Update tracking lifecycle status
router.post('/tracking/:bookingId/status', authenticate, trackingController.updateTrackingStatus);

// Verify OTP
router.post('/tracking/:bookingId/verify-otp', authenticate, trackingController.verifyOtp);

module.exports = router;
