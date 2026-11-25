const express = require('express');
const db = require('../db');
const { verificarLogin, somenteAdmin } = require('../auth');
const { hoje, domingosDoMes, numeroDaSemana, proximoDomingo } = require('../datas');

const router = express.Router();

router.use(verificarLogin, somenteAdmin);

router.get('/', async (req, res) => {
  
  try {
    const [escalas] = await db.query('SELECT * FROM escalas ORDER BY data_domingo, id');
    res.json(escalas);
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao buscar as escalas.' });
  }
});

router.get('/sala/:salaId', async (req, res) => {
  try {
    const [escalas] = await db.query(
      'SELECT * FROM escalas WHERE sala_id = ? ORDER BY data_domingo',
      [req.params.salaId]
    );
    res.json(escalas);
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao buscar as escalas.' });
  }
});

router.get('/proximas', async (req, res) => {
  try {
    const [escalas] = await db.query(
      'SELECT * FROM escalas WHERE data_domingo >= ? ORDER BY data_domingo LIMIT 20',
      [hoje()]
    );
    res.json(escalas);
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao buscar as escalas.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const dados = req.body;
    const equipeId = dados.equipe_id;

    if (!equipeId) {
      return res.status(400).json({ detail: 'Informe uma equipe válida.' });
    }

    if (!dados.data_domingo || !dados.numero_licao) {
      return res.status(400).json({ detail: 'Informe o domingo e o número da lição.' });
    }

    const [equipe] = await db.query('SELECT id, sala_id FROM equipes WHERE id = ?', [equipeId]);
    if (equipe.length == 0) {
      return res.status(400).json({ detail: 'Equipe não encontrada.' });
    }

    if (equipe[0].sala_id != dados.sala_id) {
      return res.status(400).json({ detail: 'A equipe selecionada não pertence à sala informada.' });
    }

    const [existe] = await db.query(
      'SELECT id FROM escalas WHERE sala_id = ? AND data_domingo = ?',
      [dados.sala_id, dados.data_domingo]
    );
    if (existe.length > 0) {
      return res.status(400).json({ detail: 'Já existe uma escala cadastrada para esta sala neste domingo.' });
    }

    const [resultado] = await db.query(
      'INSERT INTO escalas (data_domingo, semana_numero, sala_id, equipe_id, numero_licao, observacao) VALUES (?, ?, ?, ?, ?, ?)',
      [dados.data_domingo, dados.semana_numero || null, dados.sala_id, equipeId, dados.numero_licao, dados.observacao || null]
    );

    const [escala] = await db.query('SELECT * FROM escalas WHERE id = ?', [resultado.insertId]);
    res.json({ status: 'ok', escala: escala[0] });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao cadastrar a escala.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const campos = ['data_domingo', 'semana_numero', 'sala_id', 'equipe_id', 'numero_licao', 'observacao'];
    const partes = [];
    const valores = [];

    for (const campo of campos) {
      if (req.body[campo] !== undefined) {
        partes.push(campo + ' = ?');
        valores.push(req.body[campo]);
      }
    }

    if (partes.length > 0) {
      valores.push(req.params.id);
      await db.query('UPDATE escalas SET ' + partes.join(', ') + ' WHERE id = ?', valores);
    }

    const [escala] = await db.query('SELECT * FROM escalas WHERE id = ?', [req.params.id]);
    res.json({ status: 'ok', escala: escala[0] || null });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao salvar a escala.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM escalas WHERE id = ?', [req.params.id]);
    res.json({ status: 'ok' });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao excluir a escala.' });
  }
});

router.post('/gerar-mensal', async (req, res) => {
  try {
    const agora = new Date();
    const ano = Number(req.body.ano || agora.getFullYear());
    const mes = Number(req.body.mes || agora.getMonth() + 1);
    const salaId = Number(req.body.sala_id);

    if (!ano || !mes || !salaId) {
      return res.status(400).json({ detail: 'Informe mês, ano e sala válidos.' });
    }

    if (mes < 1 || mes > 12) {
      return res.status(400).json({ detail: 'Mês inválido.' });
    }

    const [salas] = await db.query('SELECT * FROM salas WHERE id = ?', [salaId]);
    if (salas.length == 0) {
      return res.status(404).json({ detail: 'Sala não encontrada.' });
    }
    const sala = salas[0];

    const [equipes] = await db.query('SELECT * FROM equipes WHERE sala_id = ? ORDER BY id', [salaId]);
    if (equipes.length == 0) {
      return res.status(400).json({ detail: 'Não existem equipes cadastradas para esta sala. Cadastre pelo menos uma equipe antes de gerar a escala.' });
    }

    const domingos = domingosDoMes(ano, mes);

    const [jaExistem] = await db.query(
      'SELECT data_domingo FROM escalas WHERE sala_id = ? AND data_domingo IN (?)',
      [salaId, domingos]
    );
    const datasOcupadas = jaExistem.map((e) => e.data_domingo);

    const licaoAtual = sala.licao_atual || sala.licao_inicial || 1;
    const licaoLimit = sala.licao_limit || 50;
    const novas = [];

    for (let i = 0; i < domingos.length; i++) {
      const domingo = domingos[i];

      if (datasOcupadas.includes(domingo)) {
        continue;
      }

      const licao = licaoAtual + i;
      if (licao > licaoLimit) {
        break;
      }

      const equipe = equipes[i % equipes.length];

      novas.push({
        data_domingo: domingo,
        semana_numero: numeroDaSemana(domingo),
        sala_id: salaId,
        equipe_id: equipe.id,
        numero_licao: licao,
        observacao: 'Gerada automaticamente - ' + mes + '/' + ano + ' - Sala ' + sala.nome
      });
    }

    if (novas.length == 0) {
      return res.status(400).json({ detail: 'Não foi possível gerar novas escalas neste mês. Verifique as lições, as equipes da sala ou as datas já cadastradas.' });
    }

    const itens = [];
    for (const nova of novas) {
      const [resultado] = await db.query(
        'INSERT INTO escalas (data_domingo, semana_numero, sala_id, equipe_id, numero_licao, observacao) VALUES (?, ?, ?, ?, ?, ?)',
        [nova.data_domingo, nova.semana_numero, nova.sala_id, nova.equipe_id, nova.numero_licao, nova.observacao]
      );
      nova.id = resultado.insertId;
      itens.push(nova);
    }

    const proximaLicao = novas[novas.length - 1].numero_licao + 1;
    await db.query('UPDATE salas SET licao_atual = ? WHERE id = ?', [proximaLicao, salaId]);

    res.json({ status: 'ok', mes: mes, ano: ano, geradas: itens.length, itens: itens });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao gerar a escala do mês.' });
  }
});

router.post('/gerar-proximo-domingo/:salaId', async (req, res) => {
  try {
    const salaId = req.params.salaId;

    const [equipes] = await db.query('SELECT * FROM equipes WHERE sala_id = ? ORDER BY id', [salaId]);
    if (equipes.length == 0) {
      return res.status(400).json({ detail: 'Não é possível gerar a escala. Cadastre pelo menos uma equipe para esta sala.' });
    }

    const [salas] = await db.query('SELECT * FROM salas WHERE id = ?', [salaId]);
    if (salas.length == 0) {
      return res.status(404).json({ detail: 'Sala não encontrada.' });
    }

    const licao = salas[0].licao_atual || 1;
    if (licao > salas[0].licao_limit) {
      return res.status(400).json({ detail: 'O limite de lições desta sala foi atingido.' });
    }

    const domingo = proximoDomingo();

    const [existe] = await db.query(
      'SELECT id FROM escalas WHERE sala_id = ? AND data_domingo = ?',
      [salaId, domingo]
    );
    if (existe.length > 0) {
      return res.status(400).json({ detail: 'Já existe uma escala cadastrada para esta sala neste domingo.' });
    }

    const [resultado] = await db.query(
      'INSERT INTO escalas (data_domingo, sala_id, equipe_id, numero_licao) VALUES (?, ?, ?, ?)',
      [domingo, salaId, equipes[0].id, licao]
    );

    await db.query('UPDATE salas SET licao_atual = ? WHERE id = ?', [licao + 1, salaId]);

    const [escala] = await db.query('SELECT * FROM escalas WHERE id = ?', [resultado.insertId]);
    res.json({ status: 'ok', escala: escala[0] });
  } catch (erro) {
    console.log(erro);
    res.status(500).json({ detail: 'Erro ao gerar a escala.' });
  }
});

module.exports = router;
