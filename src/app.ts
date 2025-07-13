import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './api/routes/auth.routes';

const app = express();

dotenv.config();
app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);

export default app;