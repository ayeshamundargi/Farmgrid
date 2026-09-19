const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const { authenticate } = require('../middleware/auth');

router.get('/available', authenticate, resourceController.getAvailableResources);
router.get('/:id', authenticate, resourceController.getResourceById);

module.exports = router;
