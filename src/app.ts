import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './api/routes/auth.routes';
import surveyRoutes from './api/routes/survey.routes';
import assessmentRoutes from './api/routes/assessment.routes';
import reportRoutes from './api/routes/report.routes';

const app = express();

dotenv.config();
app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/surveys', surveyRoutes);
app.use('/assessments', assessmentRoutes);
app.use('/reports', reportRoutes);

export default app;