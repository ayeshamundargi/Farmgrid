const express = require('express');
const router = express.Router();
const ownerController = require('../controllers/ownerController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/resources', authenticate, authorize('OWNER', 'ADMIN'), ownerController.createResource);
router.get('/resources/my', authenticate, authorize('OWNER', 'ADMIN'), ownerController.getMyResources);
router.put('/resources/:id', authenticate, authorize('OWNER', 'ADMIN'), ownerController.updateResource);
router.delete('/resources/:id', authenticate, authorize('OWNER', 'ADMIN'), ownerController.deleteResource);
router.get('/resources/:id/bookings', authenticate, authorize('OWNER', 'ADMIN'), ownerController.getResourceBookings);
router.post('/resources/:id/maintenance', authenticate, authorize('OWNER', 'ADMIN'), ownerController.setMaintenanceStatus);
router.post('/resources/:id/breakdown', authenticate, authorize('OWNER', 'ADMIN'), ownerController.reportBreakdown);

module.exports = router;
