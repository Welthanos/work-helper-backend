import { Request, Response } from 'express';
import db from '../../config/db';

export const getReportBySurveyId = async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { surveyId } = req.params;

    if (!surveyId) {
        return res.status(400).json({ message: 'O ID da pesquisa é obrigatório.' });
    }

    const client = await db.connect();
    try {
        const surveyCheck = await client.query('SELECT id FROM surveys WHERE id = $1 AND user_id = $2', [surveyId, userId]);
        if (surveyCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Pesquisa não encontrada ou não pertence a este usuário.' });
        }

        // Executa todas as consultas em paralelo para mais performance
        const [
            generalStatsResult,
            riskDistributionResult,
            topRecommendationsResult,
            riskBySexResult
        ] = await Promise.all([
            // Query 1: Estatísticas Gerais
            client.query(`
                SELECT
                    COUNT(*) AS total_assessments,
                    AVG(calculated_risk) AS average_risk,
                    COUNT(CASE WHEN calculated_risk > 50 THEN 1 END) AS high_risk_count
                FROM assessments
                WHERE survey_id = $1;
            `, [surveyId]),
            // Query 2: Distribuição de Risco (para o gráfico de pizza)
            client.query(`
                SELECT
                    CASE
                        WHEN calculated_risk <= 25 THEN 'Baixo'
                        WHEN calculated_risk <= 50 THEN 'Moderado'
                        WHEN calculated_risk <= 75 THEN 'Alto'
                        ELSE 'Crítico'
                    END as risk_level,
                    COUNT(*) as count
                FROM assessments
                WHERE survey_id = $1
                GROUP BY risk_level;
            `, [surveyId]),
            // Query 3: Recomendações mais frequentes (para o gráfico de barras)
            client.query(`
                SELECT
                    r.description,
                    COUNT(ar.assessment_id) AS frequency
                FROM recommendations r
                JOIN assessment_recommendations ar ON r.id = ar.recommendation_id
                JOIN assessments a ON a.id = ar.assessment_id
                WHERE a.survey_id = $1
                GROUP BY r.description
                ORDER BY frequency DESC
                LIMIT 5;
            `, [surveyId]),
            // Query 4: Risco por Sexo
            client.query(`
                SELECT
                    w.sex,
                    AVG(a.calculated_risk) AS average_risk
                FROM assessments a
                JOIN workers w ON a.worker_id = w.id
                WHERE a.survey_id = $1
                GROUP BY w.sex;
            `, [surveyId])
        ]);

        const reportData = {
            generalStats: generalStatsResult.rows[0],
            riskDistribution: riskDistributionResult.rows,
            topRecommendations: topRecommendationsResult.rows,
            riskBySex: riskBySexResult.rows,
        };

        res.status(200).json(reportData);
    } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        res.status(500).json({ message: 'Erro interno ao gerar relatório.' });
    } finally {
        client.release();
    }
};