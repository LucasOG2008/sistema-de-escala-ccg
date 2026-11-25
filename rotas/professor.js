const express = require('express');
const db = require('../db');
const { verificarLogin } = require('../auth');
const { hoje } = require('../datas');

const router = express.Router();

router.get('/minha-proxima-escala', verificarLogin, async (req, res) => {
  try {
    const professor = req.usuario;

    if ((professor.tipo_usuario || '').toUpperCase() != 'PROFESSOR') {
      return res.status(403).json({ detail: 'Acesso restrito ao professor.' });
    }

    const semEscala = {
      professor: professor.nome,
      sala: '',
      livro: '',
      equipe: '',
      parceiro: '',
      data_domingo: null,
      numero_licao: null,
      mensagem: 'Nenhuma escala encontrada. Você não possui uma próxima escala cadastrada no momento. Caso isso esteja incorreto, entre em contato com o administrador.'
    };

    const [escalas] = await db.query(
      'SELECT e.*, eq.nome AS equipe_nome, s.nome AS sala_nome, s.livro_nome ' +
      'FROM escalas e ' +
      'JOIN equipe_membros m ON m.equipe_id = e.equipe_id ' +
      'JOIN equipes eq ON eq.id = e.equipe_id ' +
      'JOIN salas s ON s.id = eq.sala_id ' +
      'WHERE m.professor_id = ? AND e.data_domingo >= ? ' +
      'ORDER BY e.data_domingo LIMIT 1',
      [professor.id, hoje()]
    );

    if (escalas.length == 0) {
      return res.json(semEscala);
    }

    const proxima = escalas[0];

    const [parceiros] = await db.query(
      'SELECT u.nome FROM equipe_membros m JOIN usuarios u ON u.id = m.professor_id WHERE m.equipe_id = ? AND m.professor_id <> ?',
      [proxima.equipe_id, professor.id]
    );

    res.json({
      professor: professor.nome,
      sala: proxima.sala_nome,
      livro: proxima.livro_nome,
      equipe: proxima.equipe_nome,
      parceiro: parceiros.map((p) => p.nome).join(', '),
      data_domingo: proxima.data_domingo,
      numero_licao: proxima.numero_licao
    });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao buscar sua escala.' });
  }
});

module.exports = router;
