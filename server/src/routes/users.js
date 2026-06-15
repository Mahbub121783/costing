const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const { listUsers, getUser, updateUser, adminResetPassword } = require('../controllers/userController');

// All user management routes require ADMIN role
router.use(protect, requireRole('ADMIN'));

router.get('/', listUsers);
router.get('/:id', getUser);
router.put('/:id', updateUser);
router.post('/:id/reset-password', adminResetPassword);

module.exports = router;
