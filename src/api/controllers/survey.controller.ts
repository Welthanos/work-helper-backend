import { Request, Response } from 'express';
import db from '../../config/db';

export const createSurvey = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { title, description, start_date, end_date } = req.body;

    if (!title) return res.status(400).json({ message: 'O título é obrigatório.' });

    try {
        const query = `
            INSERT INTO survey (user_id, title, description, start_date, end_date)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const { rows } = await db.query(query, [userId, title, description, start_date, end_date]);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao criar pesquisa.' });
    }
};

export const getAllSurveys = async (req: Request, res: Response) => {
    const userId = req.user.id;

    try {
        const { rows } = await db.query('SELECT * FROM survey WHERE user_id = $1 ORDER BY id DESC', [userId]);
        res.status(200).json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar pesquisas.' });
    }
};

export const getSurveyById = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        const { rows } = await db.query('SELECT * FROM survey WHERE id = $1 AND user_id = $2', [id, userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Pesquisa não encontrada ou não pertence a este usuário.' });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar pesquisa.' });
    }
};

export const updateSurvey = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, description, start_date, end_date } = req.body;

    if (!title) {
        return res.status(400).json({ message: 'O título é obrigatório.' });
    }

    try {
        const query = `
            UPDATE survey 
            SET title = $1, description = $2, start_date = $3, end_date = $4
            WHERE id = $5 AND user_id = $6
            RETURNING *;
        `;
        const { rows } = await db.query(query, [title, description, start_date, end_date, id, userId]);

        if (rows.length === 0) return res.status(404).json({ message: 'Pesquisa não encontrada ou não pertence a este usuário.' });
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao atualizar pesquisa.' });
    }
};

export const deleteSurvey = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        const { rowCount } = await db.query('DELETE FROM survey WHERE id = $1 AND user_id = $2', [id, userId]);
        if (rowCount === 0) {
            return res.status(404).json({ message: 'Pesquisa não encontrada ou não pertence a este usuário.' });
        }
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao deletar pesquisa.' });
    }
};