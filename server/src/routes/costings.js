const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/costingController');
const approval = require('../controllers/approvalController');
const { exportExcel } = require('../controllers/exportController');

router.use(protect);

// Costing CRUD
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id/header', ctrl.updateHeader);
router.delete('/:id', ctrl.deleteCosting);

// Clone to new version
router.post('/:id/clone', ctrl.cloneCosting);

// Workflow transitions
router.post('/:id/submit', approval.submitCosting);
router.post('/:id/approve', approval.approveCosting);
router.post('/:id/reject', approval.rejectCosting);
router.post('/:id/revert', approval.revertToDraft);

// Excel export
router.get('/:id/export/excel', exportExcel);

// FOB Summary
router.get('/:id/fob-summary', ctrl.getFobSummary);

// Audit log
router.get('/:id/audit', ctrl.getAuditLog);

// Fabric shells
router.post('/:costingId/shells', ctrl.upsertShell);
router.put('/:costingId/shells', ctrl.upsertShell);
router.delete('/:costingId/shells/:shellId', ctrl.deleteShell);

// All other sections (full-replace pattern)
router.put('/:costingId/trims', ctrl.saveTrims);
router.put('/:costingId/cm', ctrl.saveCm);
router.put('/:costingId/packaging', ctrl.savePackaging);
router.put('/:costingId/embellishments', ctrl.saveEmbellishments);
router.put('/:costingId/wash', ctrl.saveWash);
router.put('/:costingId/testing', ctrl.saveTesting);
router.put('/:costingId/commercial', ctrl.saveCommercial);
router.put('/:costingId/shipment', ctrl.saveShipment);

module.exports = router;
