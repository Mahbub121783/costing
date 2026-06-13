const router = require('express').Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { getAll, getOne, create, update, remove } = require('../controllers/styleController');

const rules = [
  body('styleNo').trim().notEmpty().withMessage('Style number is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('sizes').isArray({ min: 1 }).withMessage('At least one size must be selected'),
];

router.use(protect);
router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', rules, validate, create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
