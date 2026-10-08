/* Captura telas do AgroChain para inspeção visual do design. */
const puppeteer = require('/tmp/node_modules/puppeteer');
const path = '/home/user/prototipo-agrochain/AgroChain.html';
const saida = '/home/user/prototipo-agrochain/design/';

const TELAS = [
  { nome: '01-painel', view: 'painel', usuario: 'U-01' },
  { nome: '02-lavoura', view: 'lavoura', usuario: 'U-01' },
  { nome: '03-erp-visao', view: 'erp', aba: 'visao', usuario: 'U-01' },
  { nome: '04-erp-financeiro', view: 'erp', aba: 'financeiro', usuario: 'U-01', rolar: 700 },
  { nome: '05-erp-custos', view: 'erp', aba: 'custos', usuario: 'U-01', talhao: 'T-01' },
  { nome: '06-erp-estoque', view: 'erp', aba: 'estoque', usuario: 'U-01' },
  { nome: '07-erp-operacoes', view: 'erp', aba: 'operacoes', usuario: 'U-01' },
  { nome: '08-erp-fechamento', view: 'erp', aba: 'fechamento', usuario: 'U-01' },
  { nome: '09-iot', view: 'iot', usuario: 'U-01' },
  { nome: '10-blockchain', view: 'blockchain', usuario: 'U-01' },
  { nome: '11-assistente', view: 'assistente', usuario: 'U-01' },
  { nome: '12-mercado', view: 'mercado', usuario: 'U-04' },
  { nome: '13-ia-safra', view: 'ia', abaIA: 'safra', usuario: 'U-01' },
  { nome: '14-auditoria', view: 'auditoria', usuario: 'U-07' },
];

(async () => {
  const navegador = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
  });
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 1440, height: 980, deviceScaleFactor: 1 });
  await pagina.goto('file://' + path, { waitUntil: 'load' });
  await pagina.waitForFunction('window.App && window.App.view');
  await new Promise(r => setTimeout(r, 1800));

  for (const t of TELAS) {
    await pagina.evaluate((t) => {
      if (t.talhao) window.App4.talhao = t.talhao;
      if (t.aba) window.App4.aba = t.aba;
      if (t.abaIA) window.App.abaIA = t.abaIA;
      window.App.usuario = t.usuario;
      window.App.irPara(t.view);
      if (t.aba) { window.App4.aba = t.aba; window.App.render(); }
    }, t);
    await new Promise(r => setTimeout(r, 900));
    if (t.rolar) {
      await pagina.evaluate((y) => { const c = document.querySelector('.conteudo'); if (c && c.scrollTo) c.scrollTo(0, y); window.scrollTo(0, y); }, t.rolar);
      await new Promise(r => setTimeout(r, 500));
    }
    await pagina.screenshot({ path: saida + t.nome + '.png' });
    console.log('✓', t.nome);
  }

  /* modo imersivo */
  await pagina.evaluate(() => { window.App.usuario = 'U-01'; window.App.irPara('painel'); window.Imersivo.abrir(); });
  await new Promise(r => setTimeout(r, 1500));
  await pagina.screenshot({ path: saida + '15-imersivo.png' });
  console.log('✓ 15-imersivo');
  await pagina.evaluate(() => { window.Imersivo.fechar(); window.App.irPara('erp', 'visao'); });
  await new Promise(r => setTimeout(r, 800));

  /* topo do painel com o menu, em recorte próximo, para ver tipografia */
  await pagina.setViewport({ width: 1280, height: 780, deviceScaleFactor: 2 });
  await pagina.evaluate(() => { window.App.irPara('painel'); });
  await new Promise(r => setTimeout(r, 900));
  await pagina.screenshot({ path: saida + '16-detalhe-topo.png', clip: { x: 0, y: 0, width: 1280, height: 460 } });
  console.log('✓ 16-detalhe-topo');

  await navegador.close();
})();
