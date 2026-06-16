const router = require('express').Router();
const { protect } = require('../middleware/auth');
const {
  getAll, getOne, create, update, updateStatus,
  addSalaryStructure, getHistory, addExpense, getExpenses,
} = require('../controllers/employeeController');

router.use(protect);

router.get('/', getAll);
router.post('/', create);
router.get('/:id', getOne);
router.put('/:id', update);
router.put('/:id/status', updateStatus);
router.post('/:id/salary', addSalaryStructure);
router.get('/:id/history', getHistory);
router.get('/:id/expenses', getExpenses);
router.post('/:id/expenses', addExpense);

module.exports = router;
