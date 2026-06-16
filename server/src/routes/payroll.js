const router = require('express').Router();
const { protect } = require('../middleware/auth');
const {
  getAll, getOne, generate, updateItem,
  markItemPaid, markAllPaid, finalizePayroll, deletePayroll,
} = require('../controllers/payrollController');

router.use(protect);

router.get('/', getAll);
router.post('/generate', generate);
router.get('/:id', getOne);
router.put('/:id/items/:itemId', updateItem);
router.put('/:id/items/:itemId/paid', markItemPaid);
router.put('/:id/finalize', finalizePayroll);
router.put('/:id/pay-all', markAllPaid);
router.delete('/:id', deletePayroll);

module.exports = router;
