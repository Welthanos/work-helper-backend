import { Router } from 'express';
import { createAssessment, deleteAssessment, getAllAssessmentsBySurvey, getAssessmentById, updateAssessment } from '../controllers/assessment.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', createAssessment);
router.get('/', getAllAssessmentsBySurvey);
router.get('/:id', getAssessmentById);
router.put('/:id', updateAssessment);
router.delete('/:id', deleteAssessment);

export default router;