const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { getStats } = require('../controllers/dashboardController');

router.get('/stats', protect, getStats);

module.exports = router;
