const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/financeController');

router.use(protect);

router.get('/stats', getDashboardStats);

module.exports = router;
