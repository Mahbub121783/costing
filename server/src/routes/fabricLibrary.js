const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/fabricLibraryController');

router.use(protect);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.post('/preview-price', ctrl.previewPrice);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
