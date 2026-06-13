import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import { initDataDirs, getExtractionRuns } from './services/dataStore';
import { isQwenAvailable, getVisionModel, getTextModel } from './services/qwen';
import { findMenuPdf } from './services/pdfExtractor';
import restaurantRouter from './routes/restaurant';
import retailRouter from './routes/retail';
import exportRouter from './routes/export';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve logo from assets
app.use('/assets', express.static(path.resolve(process.cwd(), 'assets')));

// Initialize data directories
initDataDirs();

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Config / mode endpoint
app.get('/api/config/mode', (_req, res) => {
  const pdfPath = findMenuPdf();
  res.json({
    qwenAvailable: isQwenAvailable(),
    visionModel: getVisionModel(),
    textModel: getTextModel(),
    pdfFound: !!pdfPath,
    pdfName: pdfPath ? path.basename(pdfPath) : null,
    demoMode: !isQwenAvailable(),
    recentRuns: getExtractionRuns().slice(0, 5),
  });
});

// Routes
app.use('/api/restaurant', restaurantRouter);
app.use('/api/retail', retailRouter);
app.use('/api/export', exportRouter);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🚀 CatalogPilot server running on http://localhost:${PORT}`);
  console.log(`   Qwen API: ${isQwenAvailable() ? '✅ Connected' : '⚠️  Not configured (demo mode)'}`);
  console.log(`   PDF: ${findMenuPdf() ?? '⚠️  Not found'}\n`);
});

export default app;
