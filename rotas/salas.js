const express = require('express');
const db = require('../db');
const { verificarLogin, somenteAdmin } = require('../auth');

const router = express.Router();

router.use(verificarLogin, somenteAdmin);

router.get('/', async (req, res) => {
  try {
    const [salas] = await db.query('SELECT * FROM salas ORDER BY id');
    res.json(salas);
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao buscar as salas.' });
  }

});

router.get('/:id', async (req, res) => {
  try {
    const [salas] = await db.query('SELECT * FROM salas WHERE id = ?', [req.params.id]);
    if (salas.length == 0) {
      return res.status(404).json({ detail: 'Sala não encontrada.' });
    }
    res.json(salas[0]);
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao buscar a sala.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const nome = req.body.nome;
    const livro = req.body.livro_nome;

    if (!nome || !livro) {

      return res.status(400).json({ detail: 'Informe o nome da sala e o livro.' });
    }

    const [existe] = await db.query('SELECT id FROM salas WHERE nome = ?', [nome]);
    if (existe.length > 0) {
      return res.status(400).json({ detail: 'Sala já cadastrada.' });
    }

    const licaoInicial = req.body.licao_inicial || 1;
    const licaoLimit = req.body.licao_limit || 50;
    const licaoAtual = req.body.licao_atual || licaoInicial;

    const [resultado] = await db.query(
      'INSERT INTO salas (nome, livro_nome, licao_inicial, licao_limit, licao_atual) VALUES (?, ?, ?, ?, ?)',
      [nome, livro, licaoInicial, licaoLimit, licaoAtual]
    );

    const [sala] = await db.query('SELECT * FROM salas WHERE id = ?', [resultado.insertId]);
    res.json({ status: 'ok', sala: sala[0] });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao cadastrar a sala.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const campos = ['nome', 'livro_nome', 'licao_inicial', 'licao_limit', 'licao_atual'];
    const partes = [];
    const valores = [];

    for (const campo of campos) {
      if (req.body[campo] !== undefined) {
        partes.push(campo + ' = ?');
        valores.push(req.body[campo]);
      }
    }

    if (partes.length == 0) {
      return res.json({ status: 'ok', sala: null });
    }

    valores.push(req.params.id);
    await db.query('UPDATE salas SET ' + partes.join(', ') + ' WHERE id = ?', valores);

    const [sala] = await db.query('SELECT * FROM salas WHERE id = ?', [req.params.id]);
    res.json({ status: 'ok', sala: sala[0] || null });
  } catch (erro) {
    
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao salvar a sala.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM salas WHERE id = ?', [req.params.id]);
    res.json({ status: 'ok' });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao excluir a sala.' });
  }
});

module.exports = router;
