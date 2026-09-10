const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/dashboard', authenticate, authorize('ADMIN'), adminController.getDashboard);
router.get('/resources', authenticate, authorize('ADMIN'), adminController.getAllResources);
router.get('/requests', authenticate, authorize('ADMIN'), adminController.getAllRequests);
router.get('/bookings', authenticate, authorize('ADMIN'), adminController.getAllBookings);
router.get('/conflicts', authenticate, authorize('ADMIN'), adminController.getConflicts);
router.get('/priority-queue', authenticate, authorize('ADMIN'), adminController.getPriorityQueue);
router.get('/schedule', authenticate, authorize('ADMIN'), adminController.getMasterSchedule);
router.post('/disruptions', authenticate, authorize('ADMIN'), adminController.simulateDisruption);
router.post('/reallocate', authenticate, authorize('ADMIN'), adminController.runReallocation);

module.exports = router;
