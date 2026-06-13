require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { errorHandler, notFound } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const buyerRoutes = require('./routes/buyers');
const factoryRoutes = require('./routes/factories');
const fabricLibraryRoutes = require('./routes/fabricLibrary');
const trimLibraryRoutes = require('./routes/trimLibrary');
const styleRoutes = require('./routes/styles');
const costingRoutes = require('./routes/costings');
const dashboardRoutes = require('./routes/dashboard');
const upload = require('./middleware/upload');
const { protect } = require('./middleware/auth');
const { uploadStyleImage } = require('./controllers/uploadController');
const path = require('path');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/buyers', buyerRoutes);
app.use('/api/factories', factoryRoutes);
app.use('/api/fabric-library', fabricLibraryRoutes);
app.use('/api/trim-library', trimLibraryRoutes);
app.use('/api/styles', styleRoutes);
app.use('/api/costings', costingRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Style image upload (multer)
app.post('/api/styles/:id/image', protect, upload.single('image'), uploadStyleImage);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../public'); // server/public/
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  app.use(notFound);
}

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
