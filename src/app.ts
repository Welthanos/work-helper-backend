import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './api/routes/auth.routes';
import surveyRoutes from './api/routes/survey.routes';

const app = express();

dotenv.config();
app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/surveys', surveyRoutes);

export default app;