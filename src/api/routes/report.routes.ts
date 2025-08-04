import { Router } from 'express';
import { getReportBySurveyId } from '../controllers/report.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.get('/:surveyId', authMiddleware, getReportBySurveyId);

export default router;