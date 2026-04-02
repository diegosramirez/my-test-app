import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health';

const app = express();
const PORT = process.env['PORT'] || 3000;

app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());
app.use('/api', healthRouter);

if (process.env['NODE_ENV'] !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app };
