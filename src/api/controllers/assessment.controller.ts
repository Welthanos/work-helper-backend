import { Request, Response } from 'express';
import db from '../../config/db';
import { calculateLombalgyRisk, getRecommendationCodes } from '../../utils/assessment.utils';
import { RecommendationRow } from '../../interfaces/assessment.interfaces';

export const createAssessment = async (req: Request, res: Response) => {
    const userId = req.user.id;

    const { survey_id, worker_details, assessment_details, assessment_date } = req.body;
    if (!survey_id || !worker_details || !assessment_details) return res.status(400).json({ message: 'Dados insuficientes para criar a avaliação.' });

    const { cpf, name, sex } = worker_details;
    if (!cpf || !name || !sex) return res.status(400).json({ message: 'Os dados de identificação do trabalhador são obrigatórios.' });

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const surveyCheck = await client.query('SELECT id FROM surveys WHERE id = $1 AND user_id = $2', [survey_id, userId]);
        if (surveyCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: 'A pesquisa não pertence a este usuário ou não existe.' });
        }

        let workerId;
        const existingWorker = await client.query('SELECT id FROM workers WHERE cpf = $1', [cpf]);

        if (existingWorker.rows.length > 0) {
            workerId = existingWorker.rows[0].id;
        } else {
            const newWorker = await client.query('INSERT INTO workers (cpf, name, sex) VALUES ($1, $2, $3) RETURNING id', [cpf, name, sex]);
            workerId = newWorker.rows[0].id;
        }

        const calculated_risk = calculateLombalgyRisk(assessment_details);
        const assessmentQuery = `
            INSERT INTO assessments (
                user_id, survey_id, worker_id, assessment_date, worker_age, worker_weight_kg, 
                worker_height_m, service_time_years, work_shift_hours, load_unitization_n, 
                has_package_grip, load_weight_kg, distance_traveled_m, lifting_frequency_per_min, 
                trunk_flexion_angle, trunk_rotation_angle, calculated_risk
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING id;
        `;
        const assessmentValues = [
            userId, survey_id, workerId, assessment_date, assessment_details.worker_age,
            assessment_details.worker_weight_kg, assessment_details.worker_height_m,
            assessment_details.service_time_years, assessment_details.work_shift_hours,
            assessment_details.load_unitization_n, assessment_details.has_package_grip,
            assessment_details.load_weight_kg, assessment_details.distance_traveled_m,
            assessment_details.lifting_frequency_per_min, assessment_details.trunk_flexion_angle,
            assessment_details.trunk_rotation_angle, calculated_risk
        ];
        const newAssessment = await client.query(assessmentQuery, assessmentValues);
        const newAssessmentId = newAssessment.rows[0].id;

        const recommendationCodes = getRecommendationCodes(assessment_details, sex);
        await linkRecommendations(client, newAssessmentId, recommendationCodes);

        await client.query('COMMIT');

        const finalAssessmentData = { id: newAssessmentId, ...req.body, calculated_risk };
        res.status(201).json(finalAssessmentData);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Erro interno ao criar avaliação.' });
    } finally {
        client.release();
    }
}

export const updateAssessment = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { id: assessmentId } = req.params;
    const { worker_details, assessment_details, assessment_date } = req.body;

    if (!worker_details || !assessment_details || !worker_details.cpf) {
        return res.status(400).json({ message: 'Dados insuficientes para atualizar a avaliação.' });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        const assessmentCheck = await client.query('SELECT worker_id FROM assessments WHERE id = $1 AND user_id = $2', [assessmentId, userId]);

        if (assessmentCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Avaliação não encontrada para este usuário.' });
        }

        const { worker_id } = assessmentCheck.rows[0];
        const { cpf, name, sex } = worker_details;

        await client.query('UPDATE workers SET cpf = $1, name = $2, sex = $3 WHERE id = $4', [cpf, name, sex, worker_id]);

        const calculated_risk = calculateLombalgyRisk(assessment_details);

        const updateQuery = `
            UPDATE assessments SET 
                assessment_date = $1, worker_age = $2, worker_weight_kg = $3, worker_height_m = $4,
                service_time_years = $5, work_shift_hours = $6, load_unitization_n = $7,
                has_package_grip = $8, load_weight_kg = $9, distance_traveled_m = $10,
                lifting_frequency_per_min = $11, trunk_flexion_angle = $12,
                trunk_rotation_angle = $13, calculated_risk = $14
            WHERE id = $15
            RETURNING *;
        `;
        const updateValues = [
            assessment_date, assessment_details.worker_age, assessment_details.worker_weight_kg,
            assessment_details.worker_height_m, assessment_details.service_time_years,
            assessment_details.work_shift_hours, assessment_details.load_unitization_n,
            assessment_details.has_package_grip, assessment_details.load_weight_kg,
            assessment_details.distance_traveled_m, assessment_details.lifting_frequency_per_min,
            assessment_details.trunk_flexion_angle, assessment_details.trunk_rotation_angle,
            calculated_risk, assessmentId
        ];
        const { rows } = await client.query(updateQuery, updateValues);

        const recommendationCodes = getRecommendationCodes(assessment_details, sex);
        await linkRecommendations(client, parseInt(assessmentId, 10), recommendationCodes);

        await client.query('COMMIT');
        res.status(200).json(rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Erro interno ao atualizar avaliação.' });
    } finally {
        client.release();
    }
};

export const getAllAssessmentsBySurvey = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { surveyId } = req.query;

    if (!surveyId) return res.status(400).json({ message: 'O ID da pesquisa é obrigatório.' });

    try {
        const query = `
            SELECT a.*, w.cpf as worker_cpf, w.name as worker_name, w.sex as worker_sex
            FROM assessments a
            JOIN workers w ON a.worker_id = w.id
            WHERE a.survey_id = $1 AND a.user_id = $2 
            ORDER BY a.id DESC
        `;
        const { rows } = await db.query(query, [surveyId, userId]);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar avaliações.' });
    }
}

export const getAssessmentById = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        const assessmentQuery = `
            SELECT a.*, w.cpf as worker_cpf, w.name as worker_name, w.sex as worker_sex
            FROM assessments a
            JOIN workers w ON a.worker_id = w.id
            WHERE a.id = $1 AND a.user_id = $2
        `;
        const assessmentResult = await db.query(assessmentQuery, [id, userId]);

        if (assessmentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Avaliação não encontrada para este usuário.' });
        }

        const recommendationsQuery = `
            SELECT r.recommendation_code, r.description
            FROM recommendations r
            JOIN assessment_recommendations ar ON r.id = ar.recommendation_id
            WHERE ar.assessment_id = $1
        `;
        const recommendationsResult = await db.query(recommendationsQuery, [id]);

        const assessmentData = assessmentResult.rows[0];
        assessmentData.recommendations = recommendationsResult.rows;

        res.status(200).json(assessmentData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar avaliação.' });
    }
}

export const deleteAssessment = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        const { rowCount } = await db.query('DELETE FROM assessments WHERE id = $1 AND user_id = $2', [id, userId]);
        if (rowCount === 0) return res.status(404).json({ message: 'Avaliação não encontrada para este usuário.' });

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao deletar avaliação.' });
    }
}

async function linkRecommendations(client: any, assessmentId: number, recommendationCodes: string[]) {
    await client.query('DELETE FROM assessment_recommendations WHERE assessment_id = $1', [assessmentId]);

    if (recommendationCodes.length === 0) return;

    const placeholders = recommendationCodes.map((_, i) => `$${i + 1}`).join(',');
    const recommendationsResult = await client.query(`SELECT id FROM recommendations WHERE recommendation_code IN (${placeholders})`, recommendationCodes);

    if (recommendationsResult.rows.length > 0) {
        const recommendationIds = recommendationsResult.rows.map((row: RecommendationRow) => row.id);
        const insertValues = recommendationIds.map((recId: number) => `(${assessmentId}, ${recId})`).join(',');

        if (insertValues) await client.query(`INSERT INTO assessment_recommendations (assessment_id, recommendation_id) VALUES ${insertValues}`);
    }
}