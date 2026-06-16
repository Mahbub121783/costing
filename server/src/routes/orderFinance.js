const router = require('express').Router();
const { protect } = require('../middleware/auth');
const {
  getAll, getOne, create, update,
  addPayment, deletePayment, getApprovedCostings,
} = require('../controllers/orderFinanceController');

router.use(protect);

router.get('/approved-costings', getApprovedCostings);
router.get('/', getAll);
router.post('/', create);
router.get('/:id', getOne);
router.put('/:id', update);
router.post('/:id/payments', addPayment);
router.delete('/:id/payments/:paymentId', deletePayment);

module.exports = router;
