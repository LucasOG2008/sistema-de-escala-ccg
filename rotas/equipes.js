const express = require('express');
const db = require('../db');
const { verificarLogin, somenteAdmin } = require('../auth');

const router = express.Router();

router.use(verificarLogin, somenteAdmin);

router.get('/', async (req, res) => {
  try {
    const [equipes] = await db.query('SELECT * FROM equipes ORDER BY id');
    res.json(equipes);
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao buscar as equipes.' });
  }
});

router.get('/sala/:salaId', async (req, res) => {
  try {
    const [equipes] = await db.query('SELECT * FROM equipes WHERE sala_id = ? ORDER BY id', [req.params.salaId]);
    res.json(equipes);
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao buscar as equipes.' });
  }
});

router.get('/:id/membros', async (req, res) => {
  try {
    const [membros] = await db.query(
      'SELECT m.id, m.equipe_id, m.professor_id, u.nome FROM equipe_membros m JOIN usuarios u ON u.id = m.professor_id WHERE m.equipe_id = ? ORDER BY m.id',
      [req.params.id]
    );

    const lista = membros.map((m) => {
      return {
        id: m.id,
        equipe_id: m.equipe_id,
        professor_id: m.professor_id,
        usuarios: { id: m.professor_id, nome: m.nome }
      };
    });

    res.json(lista);
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao buscar os membros.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const nome = req.body.nome;
    const salaId = req.body.sala_id;

    if (!nome) {
      return res.status(400).json({ detail: 'Informe o nome da equipe.' });
    }

    const [sala] = await db.query('SELECT id FROM salas WHERE id = ?', [salaId]);
    if (sala.length == 0) {
      return res.status(400).json({ detail: 'Sala informada não existe.' });
    }

    const [resultado] = await db.query('INSERT INTO equipes (nome, sala_id) VALUES (?, ?)', [nome, salaId]);
    const [equipe] = await db.query('SELECT * FROM equipes WHERE id = ?', [resultado.insertId]);
    res.json({ status: 'ok', equipe: equipe[0] });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao cadastrar a equipe.' });
  }
});

router.post('/:id/membros', async (req, res) => {
  try {
    const equipeId = req.params.id;
    const professorId = req.body.professor_id;

    const [equipe] = await db.query('SELECT id, sala_id FROM equipes WHERE id = ?', [equipeId]);
    if (equipe.length == 0) {
      return res.status(404).json({ detail: 'Equipe não encontrada.' });
    }

    const [professor] = await db.query('SELECT id, sala_id FROM usuarios WHERE id = ?', [professorId]);
    if (professor.length == 0) {
      return res.status(404).json({ detail: 'Professor não encontrado.' });
    }

    if (professor[0].sala_id != equipe[0].sala_id) {
      return res.status(400).json({ detail: 'O professor não pertence à sala da equipe.' });
    }

    const [jaTem] = await db.query(
      'SELECT id FROM equipe_membros WHERE equipe_id = ? AND professor_id = ?',
      [equipeId, professorId]
    );
    if (jaTem.length > 0) {
      return res.status(400).json({ detail: 'Este professor já está na equipe.' });
    }

    const [resultado] = await db.query(
      'INSERT INTO equipe_membros (equipe_id, professor_id) VALUES (?, ?)',
      [equipeId, professorId]
    );

    res.json({
      status: 'ok',
      membro: { id: resultado.insertId, equipe_id: Number(equipeId), professor_id: Number(professorId) }
    });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao adicionar o membro.' });
  }
});

router.delete('/:id/membros/:professorId', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM equipe_membros WHERE equipe_id = ? AND professor_id = ?',
      [req.params.id, req.params.professorId]
    );
    res.json({ status: 'ok' });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao remover o membro.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const partes = [];
    const valores = [];

    if (req.body.nome !== undefined) {
      partes.push('nome = ?');
      valores.push(req.body.nome);
    }

    if (req.body.sala_id !== undefined) {
      const [sala] = await db.query('SELECT id FROM salas WHERE id = ?', [req.body.sala_id]);
      if (sala.length == 0) {
        return res.status(400).json({ detail: 'Sala informada não existe.' });
      }
      partes.push('sala_id = ?');
      valores.push(req.body.sala_id);
    }

    if (partes.length > 0) {
      valores.push(req.params.id);
      await db.query('UPDATE equipes SET ' + partes.join(', ') + ' WHERE id = ?', valores);
    }

    const [equipe] = await db.query('SELECT * FROM equipes WHERE id = ?', [req.params.id]);
    res.json({ status: 'ok', equipe: equipe[0] || null });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao salvar a equipe.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM equipe_membros WHERE equipe_id = ?', [req.params.id]);
    await db.query('DELETE FROM equipes WHERE id = ?', [req.params.id]);
    res.json({ status: 'ok' });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao excluir a equipe.' });
  }
});

module.exports = router;
