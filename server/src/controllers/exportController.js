const ExcelJS = require('exceljs');
const prisma = require('../utils/prisma');
const { calcFabricPrice, calcFobPerSize, calcShipment } = require('../services/costingCalculator');

const fullInclude = {
  style: { select: { styleNo: true, description: true, sizes: true, packOf: true } },
  fabricShells: { orderBy: { shellOrder: 'asc' } },
  trims: { orderBy: { sortOrder: 'asc' } },
  cm: true,
  packaging: { orderBy: { sortOrder: 'asc' } },
  embellishments: { orderBy: { sortOrder: 'asc' } },
  washes: { orderBy: { sortOrder: 'asc' } },
  testing: true,
  commercial: true,
  shipment: true,
};

const fmt4 = (v) => (v !== null && v !== undefined ? Number(v).toFixed(4) : 0);

const exportExcel = async (req, res) => {
  const costing = await prisma.costing.findUniqueOrThrow({
    where: { id: req.params.id },
    include: fullInclude,
  });

  const sizes = costing.style.sizes;
  const fob = calcFobPerSize(costing, sizes);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'OCS System';
  wb.created = new Date();

  const ws = wb.addWorksheet('OCS', { pageSetup: { paperSize: 9, orientation: 'landscape' } });

  // Title
  ws.mergeCells('A1:H1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `OPEN COSTING SHEET — ${costing.style.styleNo}`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e293b' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // Meta info
  const meta = [
    ['Style No', costing.style.styleNo, 'Description', costing.style.description],
    ['Version', `v${costing.version}`, 'Status', costing.status],
    ['Costing Date', costing.costingDate ? new Date(costing.costingDate).toLocaleDateString() : '', 'Sizes', sizes.join(' | ')],
  ];
  let row = 2;
  for (const [k1, v1, k2, v2] of meta) {
    ws.getCell(`A${row}`).value = k1; ws.getCell(`A${row}`).font = { bold: true };
    ws.getCell(`B${row}`).value = v1;
    ws.getCell(`C${row}`).value = k2; ws.getCell(`C${row}`).font = { bold: true };
    ws.getCell(`D${row}`).value = v2;
    row++;
  }
  row++;

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4f46e5' } };
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  const subHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe0e7ff' } };
  const totalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFd1fae5' } };
  const fobFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0f172a' } };

  const sizeStart = 4; // Column D onwards for sizes

  const addSectionHeader = (label, color) => {
    ws.mergeCells(`A${row}:H${row}`);
    const c = ws.getCell(`A${row}`);
    c.value = label;
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    c.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    ws.getRow(row).height = 22;
    row++;
  };

  const addTableHeader = (cols) => {
    const headerRow = ws.getRow(row);
    cols.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col;
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = { horizontal: i >= sizeStart - 1 ? 'right' : 'left', vertical: 'middle' };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } } };
    });
    ws.getRow(row).height = 18;
    row++;
  };

  const addDataRow = (cols, isTotalRow = false) => {
    const dataRow = ws.getRow(row);
    cols.forEach((val, i) => {
      const cell = dataRow.getCell(i + 1);
      cell.value = val;
      if (isTotalRow) {
        cell.font = { bold: true };
        cell.fill = totalFill;
      }
      if (i >= sizeStart - 1 && typeof val === 'number') {
        cell.numFmt = '#,##0.0000';
        cell.alignment = { horizontal: 'right' };
      }
    });
    ws.getRow(row).height = 16;
    row++;
  };

  // ── FABRIC ────────────────────────────────────────────────────────────────────
  addSectionHeader('A. FABRIC COST', 'FF6366f1');
  addTableHeader(['Shell', 'Application', 'Fabrication', 'Price/kg', ...sizes.map((s) => `Cost ${s}`), 'Mode']);
  for (const shell of costing.fabricShells) {
    const price = shell.isDirectPrice
      ? Number(shell.directPricePerKg || 0)
      : calcFabricPrice(shell);
    const sizeVals = sizes.map((s) => parseFloat((price * Number(shell.consumptionPerSize?.[s] || 0)).toFixed(4)));
    addDataRow([shell.shellName, shell.application, shell.fabricationDetail, price, ...sizeVals, shell.isDirectPrice ? 'Direct' : 'Yarn Calc']);
  }
  // Fabric total row
  addDataRow(
    ['FABRIC TOTAL', '', '', '', ...sizes.map((s) => parseFloat((fob[s]?.fabric || 0).toFixed(4)))],
    true
  );
  row++;

  // ── TRIMS ─────────────────────────────────────────────────────────────────────
  addSectionHeader('B. TRIMS & ACCESSORIES', 'FFF59e0b');
  addTableHeader(['Item', 'Category', 'Unit', ...sizes]);
  for (const trim of costing.trims) {
    addDataRow([trim.itemName, trim.category, trim.unit, ...sizes.map((s) => parseFloat(Number(trim.costPerSize?.[s] || 0).toFixed(4)))]);
  }
  addDataRow(['TRIMS TOTAL', '', '', ...sizes.map((s) => parseFloat((fob[s]?.trims || 0).toFixed(4)))], true);
  row++;

  // ── CM ────────────────────────────────────────────────────────────────────────
  addSectionHeader('C. CUT, MAKE & TRIM (CM)', 'FF10b981');
  addTableHeader(['Item', ...sizes]);
  addDataRow(['CM - Top', ...sizes.map((s) => parseFloat(Number(costing.cm?.cmTopPerSize?.[s] || 0).toFixed(4)))]);
  addDataRow(['CM - Bottom', ...sizes.map((s) => parseFloat(Number(costing.cm?.cmBottomPerSize?.[s] || 0).toFixed(4)))]);
  addDataRow(['CM TOTAL', ...sizes.map((s) => parseFloat((fob[s]?.cm || 0).toFixed(4)))], true);
  row++;

  // ── PACKAGING ─────────────────────────────────────────────────────────────────
  addSectionHeader('D. PACKAGING', 'FF06b6d4');
  addTableHeader(['Item', ...sizes]);
  for (const pack of costing.packaging) {
    addDataRow([pack.itemName, ...sizes.map((s) => parseFloat(Number(pack.costPerSize?.[s] || 0).toFixed(4)))]);
  }
  addDataRow(['PACKAGING TOTAL', ...sizes.map((s) => parseFloat((fob[s]?.packaging || 0).toFixed(4)))], true);
  row++;

  // ── EMBELLISHMENT ─────────────────────────────────────────────────────────────
  addSectionHeader('E. EMBELLISHMENT', 'FFa855f7');
  addTableHeader(['Item', ...sizes]);
  for (const emb of costing.embellishments) {
    addDataRow([emb.name, ...sizes.map((s) => parseFloat(Number(emb.costPerSize?.[s] || 0).toFixed(4)))]);
  }
  row++;

  // ── WASH ──────────────────────────────────────────────────────────────────────
  addSectionHeader('F. WASH', 'FF0ea5e9');
  addTableHeader(['Wash Type', ...sizes]);
  for (const wash of costing.washes) {
    addDataRow([wash.washType, ...sizes.map((s) => parseFloat(Number(wash.costPerSize?.[s] || 0).toFixed(4)))]);
  }
  row++;

  // ── TESTING ───────────────────────────────────────────────────────────────────
  addSectionHeader('G. TESTING & COMPLIANCE', 'FFf43f5e');
  addTableHeader(['Item', ...sizes]);
  addDataRow(['Testing Cost', ...sizes.map((s) => parseFloat(Number(costing.testing?.costPerSize?.[s] || 0).toFixed(4)))]);
  row++;

  // ── COMMERCIAL ────────────────────────────────────────────────────────────────
  addSectionHeader('H. COMMERCIAL DISCOUNT', 'FF8b5cf6');
  const comm = costing.commercial;
  if (comm) {
    addDataRow(['Buying House Comm', `${(Number(comm.buyingHouseCommPct) * 100).toFixed(2)}%`]);
    addDataRow(['Factory Comm', `${(Number(comm.factoryCommPct) * 100).toFixed(2)}%`]);
    addDataRow(['Profit Margin', `${(Number(comm.profitMarginPct) * 100).toFixed(2)}%`]);
    for (const oc of (comm.otherCharges || [])) {
      addDataRow([oc.label, `${(Number(oc.pct) * 100).toFixed(2)}%`]);
    }
  }
  addDataRow(['SETTLEMENT', ...sizes.map((s) => parseFloat((fob[s]?.settlement || 0).toFixed(4)))], true);
  row++;

  // ── FOB SUMMARY ───────────────────────────────────────────────────────────────
  ws.mergeCells(`A${row}:H${row}`);
  const fobHeaderCell = ws.getCell(`A${row}`);
  fobHeaderCell.value = 'FOB PRICE SUMMARY (USD/pc)';
  fobHeaderCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 13 };
  fobHeaderCell.fill = fobFill;
  fobHeaderCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 28;
  row++;

  addTableHeader(['Cost Item', ...sizes]);
  const fobComponents = [
    ['Fabric', 'fabric'], ['Trims', 'trims'], ['CM', 'cm'],
    ['Packaging', 'packaging'], ['Embellishment', 'embellishment'],
    ['Wash', 'wash'], ['Testing', 'testing'], ['Sub Total', 'subTotal'],
    ['Settlement', 'settlement'],
  ];
  for (const [label, key] of fobComponents) {
    const isSubtotal = key === 'subTotal';
    addDataRow([label, ...sizes.map((s) => parseFloat((fob[s]?.[key] || 0).toFixed(4)))], isSubtotal);
  }

  // FOB row
  const fobRow = ws.getRow(row);
  fobRow.getCell(1).value = 'FOB PRICE';
  sizes.forEach((s, i) => {
    fobRow.getCell(i + 2).value = parseFloat((fob[s]?.fob || 0).toFixed(4));
    fobRow.getCell(i + 2).numFmt = '#,##0.0000';
    fobRow.getCell(i + 2).alignment = { horizontal: 'right' };
    fobRow.getCell(i + 2).font = { bold: true, color: { argb: 'FF065f46' }, size: 12 };
  });
  for (let i = 1; i <= sizes.length + 1; i++) {
    fobRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFd1fae5' } };
    fobRow.getCell(i).font = fobRow.getCell(i).font || { bold: true };
  }
  fobRow.getCell(1).font = { bold: true, color: { argb: 'FF065f46' }, size: 12 };
  ws.getRow(row).height = 24;
  row++;

  // Auto-fit columns
  ws.columns.forEach((col) => {
    let maxLen = 12;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 4, 30);
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=OCS-${costing.style.styleNo}-v${costing.version}.xlsx`);
  await wb.xlsx.write(res);
  res.end();
};

module.exports = { exportExcel };
