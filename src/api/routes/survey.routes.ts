import { Router } from 'express';
import { createSurvey, getAllSurveys, getSurveyById, updateSurvey, deleteSurvey } from '../controllers/survey.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
router.use(authMiddleware);
router.post('/', createSurvey);
router.get('/', getAllSurveys);
router.get('/:id', getSurveyById);
router.put('/:id', updateSurvey);
router.delete('/:id', deleteSurvey);

export default router;