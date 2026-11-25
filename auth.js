const jwt = require('jsonwebtoken');
const db = require('./db');

async function verificarLogin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ detail: 'Token ausente.' });
  }

  try {
    const dados = jwt.verify(token, process.env.JWT_SECRET);
    const [usuarios] = await db.query('SELECT * FROM usuarios WHERE email = ?', [dados.sub]);

    if (usuarios.length == 0) {
      return res.status(401).json({ detail: 'Usuário não encontrado.' });
    }

    req.usuario = usuarios[0];
    next();
  } catch (erro) {
    return res.status(401).json({ detail: 'Token inválido.' });
  }
}

function somenteAdmin(req, res, next) {
  const tipo = (req.usuario.tipo_usuario || '').toUpperCase();

  if (tipo != 'ADMIN' && tipo != 'ADM') {
    return res.status(403).json({ detail: 'Acesso restrito ao administrador.' });
  }

  next();
}

module.exports = { verificarLogin, somenteAdmin };
