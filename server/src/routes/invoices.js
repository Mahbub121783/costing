const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { getAll, getOne, create, update, updateStatus, deleteInvoice, getPrint } = require('../controllers/invoiceController');

router.use(protect);

router.get('/', getAll);
router.post('/', create);
router.get('/:id/print', getPrint);
router.get('/:id', getOne);
router.put('/:id', update);
router.put('/:id/status', updateStatus);
router.delete('/:id', deleteInvoice);

module.exports = router;
