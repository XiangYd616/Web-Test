const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const environmentController = require('../controllers/environmentController');

router.get('/', authMiddleware, asyncHandler(environmentController.listEnvironments));
router.post('/', authMiddleware, asyncHandler(environmentController.createEnvironment));
router.get('/globals', authMiddleware, asyncHandler(environmentController.getGlobalVariables));
router.get('/:environmentId', authMiddleware, asyncHandler(environmentController.getEnvironment));
router.delete('/:environmentId', authMiddleware, asyncHandler(environmentController.deleteEnvironment));
router.post('/:environmentId/activate', authMiddleware, asyncHandler(environmentController.setActiveEnvironment));
router.post('/:environmentId/variables', authMiddleware, asyncHandler(environmentController.setVariable));

module.exports = router;
