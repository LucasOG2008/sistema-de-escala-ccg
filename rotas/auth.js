const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.password || '');

    const [usuarios] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);

    if (usuarios.length == 0) {
      return res.status(401).json({ detail: 'Credenciais inválidas.' });
    }

    const usuario = usuarios[0];

    if (!usuario.ativo) {
      return res.status(401).json({ detail: 'Usuário inativo.' });
    }

    const senhaCerta = await bcrypt.compare(senha.trim(), usuario.senha_hash);
    if (!senhaCerta) {
      return res.status(401).json({ detail: 'Credenciais inválidas.' });
    }

    const token = jwt.sign(
      { sub: usuario.email, tipo_usuario: usuario.tipo_usuario },
      process.env.JWT_SECRET,
      { expiresIn: (process.env.TOKEN_MINUTOS || 60) * 60 }
    );

    res.json({
      access_token: token,
      token_type: 'bearer',
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario,
        ativo: usuario.ativo == 1
      }
      
    });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao fazer login.' });
  }
});

module.exports = router;
