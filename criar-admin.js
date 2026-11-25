require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('./db');

async function criarAdmin() {
  const nome = process.argv[2];
  const email = process.argv[3];
  const senha = process.argv[4];

  if (!nome || !email || !senha) {
    console.log('Use assim: npm run criar-admin -- "Nome" email@exemplo.com senha');
    process.exit(1);
  }

  try {
    const senhaHash = await bcrypt.hash(senha, 10);

    await db.query(
      "INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo) VALUES (?, ?, ?, 'ADMIN', 1)",
      [nome, email.toLowerCase(), senhaHash]
    );

    console.log('Administrador criado!');
  } catch (erro) {
    console.log('Erro ao criar o administrador: ' + erro.message);
  }

  process.exit(0);
}

criarAdmin();
