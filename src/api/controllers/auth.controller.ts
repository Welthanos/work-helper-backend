import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../config/db';

export const registerUser = async (req: Request, res: Response) => {
    const { cpf, name, email, password } = req.body;
    if (!name || !email || !password || !cpf) return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });

    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const newUserQuery = 'INSERT INTO "user" (cpf, name, email, password_hash ) VALUES ($1, $2, $3, $4) RETURNING id, name, email';
        const { rows } = await db.query(newUserQuery, [cpf, name, email, password_hash]);
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
        const userQuery = 'SELECT * FROM "user" WHERE email = $1';
        const { rows } = await db.query(userQuery, [email]);
        const user = rows[0];

        if (!user) return res.status(401).json({ message: 'E-mail ou senha inválidos.' });

        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordCorrect) return res.status(401).json({ message: 'E-mail ou senha inválidos.' });

        const token = jwt.sign({ id: user.id, name: user.name }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
        delete user.password_hash;

        res.status(200).json({ user, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
}