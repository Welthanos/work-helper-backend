import { Request, Response } from 'express';
import db from '../../config/db';

export const createAssessment = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { survey_id, workerDetails, assessmentDetails, assessment_date } = req.body;

    if (!survey_id || !workerDetails || !assessmentDetails) {
        return res.status(400).json({ message: 'Dados insuficientes para criar a avaliação.' });
    }

    const { cpf, name, gender } = workerDetails;
    if (!cpf || !name) {
        return res.status(400).json({ message: 'CPF e Nome do trabalhador são obrigatórios.' });
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const surveyCheck = await client.query('SELECT user_id FROM survey WHERE id = $1', [survey_id]);
        if (surveyCheck.rows.length === 0 || surveyCheck.rows[0].user_id !== userId) {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: 'A pesquisa não pertence a este usuário.' });
        }

        let workerId;
        const existingWorker = await client.query('SELECT id FROM worker WHERE cpf = $1', [cpf]);

        if (existingWorker.rows.length > 0) {
            workerId = existingWorker.rows[0].id;
        } else {
            const newWorkerQuery = 'INSERT INTO worker (cpf, name, gender) VALUES ($1, $2, $3) RETURNING id';
            const newWorker = await client.query(newWorkerQuery, [cpf, name, gender]);
            workerId = newWorker.rows[0].id;
        }

        const {
            worker_age, worker_weight_kg, worker_height_m, service_time_years, work_shift_hours,
            load_unitization_n, has_package_grip, load_weight_kg, distance_traveled_m,
            lifting_frequency_per_min, trunk_flexion_angle, trunk_rotation_angle, calculated_risk
        } = assessmentDetails;

        const assessmentQuery = `
            INSERT INTO assessment (
                user_id, worker_id, survey_id, worker_age, worker_weight_kg, worker_height_m, 
                service_time_years, work_shift_hours, load_unitization_n, has_package_grip, 
                load_weight_kg, distance_traveled_m, lifting_frequency_per_min, 
                trunk_flexion_angle, trunk_rotation_angle, calculated_risk, assessment_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *;
        `;

        const values = [
            userId, workerId, survey_id, worker_age, worker_weight_kg, worker_height_m,
            service_time_years, work_shift_hours, load_unitization_n, has_package_grip,
            load_weight_kg, distance_traveled_m, lifting_frequency_per_min,
            trunk_flexion_angle, trunk_rotation_angle, calculated_risk, assessment_date
        ];

        const { rows } = await client.query(assessmentQuery, values);
        await client.query('COMMIT');
        res.status(201).json(rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Erro ao criar avaliação.' });
    } finally {
        client.release();
    }
}

export const getAllAssessmentsBySurvey = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { surveyId } = req.query;

    if (!surveyId) {
        return res.status(400).json({ message: 'O ID da pesquisa é obrigatório.' });
    }

    try {
        const query = `
            SELECT a.*, w.name as worker_name 
            FROM assessment a
            JOIN worker w ON a.worker_id = w.id
            WHERE a.survey_id = $1 AND a.user_id = $2 
            ORDER BY a.id DESC
        `;
        const { rows } = await db.query(query, [surveyId, userId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar avaliações.' });
    }
}

export const getAssessmentById = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        const { rows } = await db.query('SELECT * FROM assessment WHERE id = $1 AND user_id = $2', [id, userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Avaliação não encontrada para este usuário.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar avaliação.' });
    }
}

export const updateAssessment = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { details } = req.body;

    try {
        const query = `
            UPDATE assessment 
            SET calculated_risk = $1
            WHERE id = $2 AND user_id = $3
            RETURNING *;
        `;
        const { rows } = await db.query(query, [details.calculated_risk, id, userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Avaliação não encontrada para este usuário.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao atualizar avaliação.' });
    }
}

export const deleteAssessment = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        const { rowCount } = await db.query('DELETE FROM assessment WHERE id = $1 AND user_id = $2', [id, userId]);
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Avaliação não encontrada para este usuário.' });
        }
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao deletar avaliação.' });
    }
}