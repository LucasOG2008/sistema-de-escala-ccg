function formatarData(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return ano + '-' + mes + '-' + dia;
}

function hoje() {
  return formatarData(new Date());
}

function domingosDoMes(ano, mes) {
  const domingos = [];
  const ultimoDia = new Date(ano, mes, 0).getDate();

  for (let dia = 1; dia <= ultimoDia; dia++) {
    const data = new Date(ano, mes - 1, dia);
    if (data.getDay() == 0) {
      domingos.push(formatarData(data));
    }
  }

  return domingos;
}

function numeroDaSemana(texto) {
  const partes = texto.split('-');
  const data = new Date(Date.UTC(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2])));
  const diaSemana = data.getUTCDay() || 7;
  data.setUTCDate(data.getUTCDate() + 4 - diaSemana);
  const inicioAno = new Date(Date.UTC(data.getUTCFullYear(), 0, 1));
  return Math.ceil(((data - inicioAno) / 86400000 + 1) / 7);
}

function proximoDomingo() {
  const data = new Date();
  const falta = (7 - data.getDay()) % 7;
  data.setDate(data.getDate() + falta);
  return formatarData(data);
}

module.exports = { hoje, domingosDoMes, numeroDaSemana, proximoDomingo };
