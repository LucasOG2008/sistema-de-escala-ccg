require('dotenv').config();

const express = require('express');
const path = require('path');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.log('Coloque um JWT_SECRET com pelo menos 32 caracteres no arquivo .env');
  process.exit(1);
}

const app = express();
app.use(express.json());

app.use('/static', express.static(path.join(__dirname, 'static')));

app.use('/auth', require('./rotas/auth'));
app.use('/salas', require('./rotas/salas'));
app.use('/professores', require('./rotas/professores'));
app.use('/equipes', require('./rotas/equipes'));
app.use('/escalas', require('./rotas/escalas'));
app.use('/professor', require('./rotas/professor'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'login.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'login.html'));
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

app.get('/healthcheck', (req, res) => {
  res.json({ status: 'ok' });
});

const porta = process.env.PORT || 8000;

app.listen(porta, () => {
  console.log('Servidor rodando em http://localhost:' + porta);
});
