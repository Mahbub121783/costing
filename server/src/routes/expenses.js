const router = require('express').Router();
const { protect, requireRole } = require('../middleware/auth');
const { getAll, getOne, create, update, approve, markPaid, deleteExpense } = require('../controllers/businessExpenseController');

router.use(protect);

router.get('/', getAll);
router.post('/', create);
router.get('/:id', getOne);
router.put('/:id', update);
router.put('/:id/approve', requireRole('ADMIN'), approve);
router.put('/:id/pay', markPaid);
router.delete('/:id', deleteExpense);

module.exports = router;
