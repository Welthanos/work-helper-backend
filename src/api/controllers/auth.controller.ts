import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import db from '../../config/db';

export const registerUser = async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ message: 'Formato de e-mail inválido.' });

    if (password.length < 8) return res.status(400).json({ message: 'A senha deve ter no mínimo 8 caracteres.' });

    try {
        const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: 'Este e-mail já está em uso.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUserQuery = 'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email';
        const { rows } = await db.query(newUserQuery, [name, email, hashedPassword]);

        res.status(201).json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao registrar usuário.' });
    }
}

export const loginUser = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });

    try {
        const userQuery = 'SELECT * FROM users WHERE email = $1';
        const { rows } = await db.query(userQuery, [email]);
        const user = rows[0];

        if (!user) return res.status(401).json({ message: 'Credenciais inválidas.' });

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) return res.status(401).json({ message: 'Credenciais inválidas.' });

        const token = jwt.sign({ id: user.id, name: user.name }, process.env.JWT_SECRET as string, { expiresIn: '1d' });

        res.status(200).json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
}