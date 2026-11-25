const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { verificarLogin, somenteAdmin } = require('../auth');

const router = express.Router();

router.use(verificarLogin, somenteAdmin);

const colunas = 'id, nome, email, telefone, tipo_usuario, sala_id, ativo, criado_em';

function arrumar(professor) {
  professor.ativo = professor.ativo == 1;
  return professor;
}

async function buscarProfessor(id) {
  const [lista] = await db.query('SELECT ' + colunas + ' FROM usuarios WHERE id = ?', [id]);
  if (lista.length == 0) {
    return null;
  }
  return arrumar(lista[0]);
}

router.get('/', async (req, res) => {
  try {
    const [professores] = await db.query(
      'SELECT ' + colunas + " FROM usuarios WHERE tipo_usuario = 'PROFESSOR' ORDER BY id"
    );
    res.json(professores.map(arrumar));
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao buscar os professores.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const professor = await buscarProfessor(req.params.id);
    if (!professor) {
      return res.status(404).json({ detail: 'Professor não encontrado.' });
    }
    res.json(professor);
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao buscar o professor.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const nome = String(req.body.nome || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.password || '').trim();
    const telefone = req.body.telefone || null;
    const salaId = req.body.sala_id || null;

    if (!nome || !email || !senha) {
      return res.status(400).json({ detail: 'Preencha nome, e-mail e senha.' });
    }

    if (salaId) {
      const [sala] = await db.query('SELECT id FROM salas WHERE id = ?', [salaId]);
      if (sala.length == 0) {
        return res.status(400).json({ detail: 'Sala informada não existe.' });
      }
    }

    const [existe] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existe.length > 0) {
      return res.status(400).json({ detail: 'E-mail já cadastrado.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const [resultado] = await db.query(
      "INSERT INTO usuarios (nome, email, senha_hash, telefone, tipo_usuario, sala_id, ativo) VALUES (?, ?, ?, ?, 'PROFESSOR', ?, 1)",
      [nome, email, senhaHash, telefone, salaId]
    );

    const professor = await buscarProfessor(resultado.insertId);
    res.json({ status: 'ok', professor: professor });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao cadastrar o professor.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const dados = req.body;
    const partes = [];
    const valores = [];

    if (dados.nome !== undefined) {
      const nome = String(dados.nome || '').trim();
      if (!nome) {
        return res.status(400).json({ detail: 'O nome do professor não pode ficar vazio.' });
      }
      partes.push('nome = ?');
      valores.push(nome);
    }

    if (dados.email !== undefined) {
      const email = String(dados.email || '').trim().toLowerCase();
      if (!email) {
        return res.status(400).json({ detail: 'O campo email não pode ficar vazio.' });
      }
      const [outro] = await db.query('SELECT id FROM usuarios WHERE email = ? AND id <> ?', [email, id]);
      if (outro.length > 0) {
        return res.status(409).json({ detail: 'E-mail já cadastrado para outro usuário.' });
      }
      partes.push('email = ?');
      valores.push(email);
    }

    if (dados.telefone !== undefined) {
      partes.push('telefone = ?');
      valores.push(dados.telefone || null);
    }

    if (dados.sala_id !== undefined) {
      if (dados.sala_id) {
        const [sala] = await db.query('SELECT id FROM salas WHERE id = ?', [dados.sala_id]);
        if (sala.length == 0) {
          return res.status(400).json({ detail: 'A sala selecionada não existe mais.' });
        }
      }
      partes.push('sala_id = ?');
      valores.push(dados.sala_id || null);
    }

    if (dados.ativo !== undefined && dados.ativo !== null) {
      partes.push('ativo = ?');
      valores.push(dados.ativo ? 1 : 0);
    }

    const senha = dados.password || dados.senha;
    if (senha && String(senha).trim()) {
      partes.push('senha_hash = ?');
      valores.push(await bcrypt.hash(String(senha).trim(), 10));
    }

    if (partes.length == 0) {
      return res.status(400).json({ detail: 'Informe ao menos um campo para atualizar.' });
    }

    valores.push(id);
    await db.query('UPDATE usuarios SET ' + partes.join(', ') + ' WHERE id = ?', valores);

    const professor = await buscarProfessor(id);
    res.json({ status: 'ok', professor: professor });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Não foi possível salvar o professor.' });
  }
});

router.patch('/:id/ativar', async (req, res) => {
  try {
    await db.query('UPDATE usuarios SET ativo = 1 WHERE id = ?', [req.params.id]);
    const professor = await buscarProfessor(req.params.id);
    res.json({ status: 'ok', professor: professor });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao ativar o professor.' });
  }
});

router.patch('/:id/inativar', async (req, res) => {
  try {
    await db.query('UPDATE usuarios SET ativo = 0 WHERE id = ?', [req.params.id]);
    const professor = await buscarProfessor(req.params.id);
    res.json({ status: 'ok', professor: professor });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao inativar o professor.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
    res.json({ status: 'ok' });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao excluir o professor.' });
  }
});

module.exports = router;
