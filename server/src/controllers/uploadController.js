const prisma = require('../utils/prisma');
const path = require('path');

const uploadStyleImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const imageUrl = `/uploads/${req.file.filename}`;
  const style = await prisma.style.update({
    where: { id: req.params.id },
    data: { imageUrl },
  });
  res.json({ success: true, imageUrl, style });
};

module.exports = { uploadStyleImage };
