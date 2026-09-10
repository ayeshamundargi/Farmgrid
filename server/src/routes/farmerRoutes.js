const express = require('express');
const router = express.Router();
const farmerController = require('../controllers/farmerController');
const { authenticate, authorize } = require('../middleware/auth');

// Profile
router.get('/farmers/profile', authenticate, authorize('FARMER', 'ADMIN'), farmerController.getProfile);
router.put('/farmers/profile', authenticate, authorize('FARMER', 'ADMIN'), farmerController.updateProfile);

// Farms
router.post('/farms', authenticate, authorize('FARMER', 'ADMIN'), farmerController.createFarm);
router.get('/farms', authenticate, authorize('FARMER', 'ADMIN'), farmerController.getFarms);

// Requests
router.post('/requests', authenticate, authorize('FARMER', 'ADMIN'), farmerController.createRequest);
router.get('/requests/my', authenticate, authorize('FARMER', 'ADMIN'), farmerController.getMyRequests);
router.get('/requests/:id', authenticate, farmerController.getRequestById);
router.get('/requests/:id/priority', authenticate, farmerController.getRequestPriority);
router.get('/requests/:id/schedule', authenticate, farmerController.getRequestSchedule);
router.post('/requests/:id/cancel', authenticate, authorize('FARMER', 'ADMIN'), farmerController.cancelRequest);

module.exports = router;
