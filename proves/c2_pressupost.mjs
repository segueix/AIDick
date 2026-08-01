// c2 — El pressupost de crides es respecta en tots els camins.
// Sostre global de 24, una crida per escena a P4, mai més de dues a P5 i mai
// més de tres a P7. Un bucle de reintent sense sostre és un defecte greu encara
// que "normalment" no s'activi, així que aquí es força.
import { crearComptador, carregarPlaywright, obrirApp, activarDemo, recorrerFins } from './ajudes/comprova.mjs';
import { carregarNucliConte } from './ajudes/carrega_moduls.mjs';

const { comprova, acabar } = crearComptador();

// ── Part 1: el sostre del client, sense navegador ────────────────────────────
const { LLM_CLIENT: L, CONTE_CORE: C } = carregarNucliConte();

globalThis.fetch = async () => ({
  status: 200, headers: { get: () => null },
  text: async () => JSON.stringify({
    content: [{ type: 'text', text: 'resposta' }], stop_reason: 'end_turn',
    usage: { input_tokens: 100, output_tokens: 50 }
  })
});

L.reiniciarComptador();
let errSostre = null;
for (let i = 0; i < 40; i++) {
  try { await L.cridarModel({ pas: 'escena', model: 'claude-sonnet-4-6', apiKey: 'k', missatges: [{ role: 'user', content: 'x' }], maxTokens: 500 }); }
  catch (e) { errSostre = e; break; }
}
comprova('el sostre global és MAX_CRIDES_CONTE i no se supera mai',
  L.comptador.crides === C.MAX_CRIDES_CONTE && !!errSostre && errSostre.esSostreCrides,
  `${L.comptador.crides} crides`);
comprova('l\'error del sostre identifica el pas on s\'ha esgotat',
  /pas «escena»/.test(errSostre.message), errSostre.message);
comprova('el sostre no es pot desactivar des de fora: no hi ha cap API per pujar-lo',
  typeof L.pujarSostre === 'undefined' && typeof L.desactivarSostre === 'undefined');

// Un cop esgotat, cap pas més pot cridar.
let errAltrePas = null;
try { await L.cridarModel({ pas: 'lectura', model: 'claude-sonnet-4-6', apiKey: 'k', missatges: [], maxTokens: 100 }); }
catch (e) { errAltrePas = e; }
comprova('amb el sostre esgotat, cap altre pas pot cridar',
  !!errAltrePas && errAltrePas.esSostreCrides && L.comptador.crides === C.MAX_CRIDES_CONTE);

// Els reintents de transport (429) no gasten pressupost: el model no respon.
let intents = 0;
globalThis.fetch = async () => {
  intents += 1;
  if (intents < 3) return { status: 429, headers: { get: () => '0' }, text: async () => '{"error":{"message":"rate"}}' };
  return {
    status: 200, headers: { get: () => null },
    text: async () => JSON.stringify({ content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 5 } })
  };
};
L.reiniciarComptador();
await L.cridarModel({ pas: 'escena', model: 'claude-sonnet-4-6', apiKey: 'k', missatges: [{ role: 'user', content: 'x' }], maxTokens: 500 });
comprova('un reintent de transport no gasta pressupost de crides',
  L.comptador.crides === 1 && intents === 3, `${L.comptador.crides} crides amb ${intents} peticions`);
comprova('els reintents de transport tenen sostre',
  Number.isFinite(L.MAX_INTENTS_TRANSPORT) && L.MAX_INTENTS_TRANSPORT <= 7, String(L.MAX_INTENTS_TRANSPORT));

// ── Part 2: el pipeline sencer al navegador ──────────────────────────────────
const { chromium } = carregarPlaywright();
const navegador = await chromium.launch();
const { pagina, externes } = await obrirApp(navegador);
await activarDemo(pagina);

await recorrerFins(pagina, 4);
const p4 = await pagina.evaluate(() => ({
  escenes: ESTAT_CONTE.escaleta.escenes.length,
  crides: LLM_CLIENT.comptador.per_pas.escena.crides,
  totals: LLM_CLIENT.comptador.crides
}));
comprova('P4 gasta exactament una crida per escena', p4.crides === p4.escenes, `${p4.crides} per ${p4.escenes}`);
comprova('fins a P4 el total és 3 + una per escena',
  p4.totals === 3 + p4.escenes, `${p4.totals} amb ${p4.escenes} escenes`);

// Reescriure una escena ja escrita no ha de tornar a cridar.
await pagina.evaluate(() => accio('b-escena', escriureSeguent));
await pagina.waitForTimeout(500);
comprova('escriure quan ja està tot escrit no gasta cap crida',
  await pagina.evaluate(() => LLM_CLIENT.comptador.per_pas.escena.crides) === p4.escenes);

// P5: es força cinc vegades; mai més de dues.
for (let i = 0; i < 5; i++) {
  await pagina.evaluate(() => accio('b-costura', costuraEstil));
  await pagina.waitForTimeout(350);
  await pagina.evaluate(() => accio('b-costura-b', costuraLongitud));
  await pagina.waitForTimeout(350);
}
comprova('P5 no supera mai les 2 crides, forçant-lo cinc vegades',
  await pagina.evaluate(() => LLM_CLIENT.comptador.per_pas.costura.crides) <= 2,
  String(await pagina.evaluate(() => LLM_CLIENT.comptador.per_pas.costura.crides)));

// P6: zero crides, executada tres vegades.
const abansP6 = await pagina.evaluate(() => LLM_CLIENT.comptador.crides);
await pagina.evaluate(() => { executarAuditoria(); executarAuditoria(); executarAuditoria(); });
comprova('P6 fa zero crides encara que s\'executi tres vegades',
  await pagina.evaluate(() => LLM_CLIENT.comptador.crides) === abansP6);

// P7: es força set vegades; mai més de tres en total.
for (let i = 0; i < 7; i++) {
  await pagina.evaluate(() => accio('b-lectura', lecturaHostil));
  await pagina.waitForTimeout(300);
  await pagina.evaluate(() => { if (ESTAT_CONTE.lectura && ESTAT_CONTE.lectura.defectes[0]) ESTAT_CONTE.lectura.defectes[0].triat = true; });
  await pagina.evaluate(() => accio('b-pedac', aplicarPedacDirigit));
  await pagina.waitForTimeout(300);
}
const p7 = await pagina.evaluate(() => ({
  lectura: (LLM_CLIENT.comptador.per_pas.lectura || {}).crides || 0,
  pedac: (LLM_CLIENT.comptador.per_pas.pedac || {}).crides || 0
}));
comprova('P7 no supera mai les 3 crides, forçant-lo set vegades',
  p7.lectura + p7.pedac <= 3, `lectura ${p7.lectura} + pedaç ${p7.pedac}`);
comprova('la lectura hostil es fa una sola vegada', p7.lectura === 1, String(p7.lectura));

const total = await pagina.evaluate(() => LLM_CLIENT.comptador.crides);
comprova('un conte sencer, amb tots els passos forçats, es manté sota el sostre',
  total <= 24, `${total} crides`);
comprova('un conte pel camí típic gasta entre 9 i 15 crides',
  total >= 9 && total <= 15, `${total} crides`);

// La UI ho ha de dir en lloc d'amagar-ho.
await pagina.evaluate(() => { ESTAT_CONTE.pas_obert = 5; renderitzar(); });
comprova('la UI mostra les crides gastades del pas de costura',
  (await pagina.locator('#pas-5').innerText()).includes('/ 2'));

comprova('cap prova ha tocat la xarxa externa', externes.length === 0, externes.join(', '));

await navegador.close();
acabar();
