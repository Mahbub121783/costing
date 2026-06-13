const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { getAll, create, update, remove } = require('../controllers/buyerController');

const rules = [body('name').trim().notEmpty().withMessage('Buyer name is required')];

router.use(protect);
router.get('/', getAll);
router.post('/', rules, validate, create);
router.put('/:id', rules, validate, update);
router.delete('/:id', remove);

module.exports = router;
