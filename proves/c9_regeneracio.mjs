// c9 — Pedaç o regeneració.
//
// Un pedaç canvia una frase. La premissa, el registre de la prosa i la
// profunditat del personatge no són frases: apedaçar-los només amaga el defecte
// sota una redacció millor. Aquesta suite comprova que la decisió es pren, que
// es pren pel motiu correcte i que el codi la fa complir encara que la
// interfície falli.
import { crearComptador, carregarPlaywright, obrirApp, activarDemo, recorrerFins } from './ajudes/comprova.mjs';
import { carregarNucliConte } from './ajudes/carrega_moduls.mjs';

const { comprova, acabar } = crearComptador();
const { CONTE_CORE: C } = carregarNucliConte();

// ── La taula de categories ───────────────────────────────────────────────────
comprova('hi ha sis categories de diagnòstic', C.CATEGORIES_DIAGNOSTIC.length === 6);
comprova('tres demanen regenerar i tres es corregeixen amb un pedaç',
  C.CATEGORIES_DIAGNOSTIC.filter(c => c.accio === 'regenerar').length === 3 &&
  C.CATEGORIES_DIAGNOSTIC.filter(c => c.accio === 'pedac').length === 3);
comprova('les que demanen regenerar són premissa, prosa i personatge',
  ['premissa', 'prosa', 'personatge'].every(id =>
    C.CATEGORIES_DIAGNOSTIC.find(c => c.id === id).accio === 'regenerar'));
comprova('les locals són llengua, continuïtat i mecànica',
  ['llengua', 'continuitat', 'mecanica'].every(id =>
    C.CATEGORIES_DIAGNOSTIC.find(c => c.id === id).accio === 'pedac'));
comprova('cada categoria diu què és i com es resol',
  C.CATEGORIES_DIAGNOSTIC.every(c => c.nom && c.que_es && c.com_resoldre && c.claus.length));
comprova('només les de regeneració porten el pas al qual s\'ha de tornar',
  C.CATEGORIES_DIAGNOSTIC.every(c => c.accio === 'regenerar' ? Number.isInteger(c.pas) : c.pas === null));
comprova('cada categoria de regeneració apunta a un pas del pipeline que existeix',
  C.CATEGORIES_DIAGNOSTIC.filter(c => c.accio === 'regenerar').every(c => c.pas >= 1 && c.pas <= 4));

// ── La categoria declarada pel lector mana ───────────────────────────────────
comprova('si el lector declara la categoria, es fa servir la seva',
  C.classificarDiagnostic({ categoria: 'premissa', per_que: 'el diàleg no té guions' }).categoria === 'premissa');
comprova('la categoria declarada no es marca com a deduïda per paraules clau',
  C.classificarDiagnostic({ categoria: 'prosa', per_que: 'x' }).per_paraules_clau === false);
comprova('una categoria inventada pel model cau a la classificació per paraules clau',
  (() => {
    const r = C.classificarDiagnostic({ categoria: 'estructura_general', per_que: 'La premissa és un clixé ja vist mil vegades.' });
    return r.categoria === 'premissa' && r.per_paraules_clau === true;
  })());

// ── Classificació per paraules clau, cas per cas ─────────────────────────────
const casos = [
  ['La premissa recombina anomalies ja vistes i és previsible des de la segona pàgina.', 'premissa', 'regenerar'],
  ['El registre és monòton: totes les frases tenen la mateixa llargada i no hi ha cap digressió.', 'prosa', 'regenerar'],
  ['El protagonista és un instrument de la trama i no té vida fora del cas.', 'personatge', 'regenerar'],
  ['Hi ha un castellanisme i un verb que no existeix en català.', 'llengua', 'pedac'],
  ['El text es contradiu: abans deia que l\'expedient era duplicat i ara diu que no.', 'continuitat', 'pedac'],
  ['El format de diàleg barreja guió i cometes dins de la mateixa escena.', 'mecanica', 'pedac']
];
casos.forEach(([frase, categoria, accio]) => {
  const r = C.classificarDiagnostic(frase);
  comprova(`«${frase.slice(0, 42)}…» es classifica com a ${categoria}`,
    r.categoria === categoria && r.accio === accio, `ha sortit ${r.categoria}/${r.accio}`);
});

// ── El defecte que no es pot classificar ─────────────────────────────────────
const sense = C.classificarDiagnostic('Aquest fragment no acaba de funcionar.');
comprova('un diagnòstic que no encaixa enlloc es declara sense classificar',
  sense.categoria === 'sense_classificar');
comprova('el defecte sense classificar es tracta com a local i ho explica',
  sense.accio === 'pedac' && !!sense.motiu && !!sense.com_resoldre);
comprova('classificarDiagnostic no peta amb entrades buides',
  (() => {
    try { C.classificarDiagnostic(); C.classificarDiagnostic(null); C.classificarDiagnostic({}); return true; }
    catch (e) { return false; }
  })());

// ── El filtre de lot ─────────────────────────────────────────────────────────
const lot = [
  { per_que: 'Hi ha un castellanisme al tercer paràgraf.', categoria: 'llengua' },
  { per_que: 'La premissa ja s\'ha llegit mil vegades.', categoria: 'premissa' },
  { per_que: 'El registre de la prosa és pla.', categoria: 'prosa' }
];
comprova('diagnosticsQueDemanenRegenerar filtra els dos que no es poden apedaçar',
  C.diagnosticsQueDemanenRegenerar(lot).length === 2);
comprova('cada diagnòstic filtrat porta la decisió amb el pas i el com resoldre',
  C.diagnosticsQueDemanenRegenerar(lot).every(d => d.decisio.pas && d.decisio.com_resoldre));
comprova('diagnosticsQueDemanenRegenerar tolera una llista buida o inservible',
  C.diagnosticsQueDemanenRegenerar([]).length === 0 && C.diagnosticsQueDemanenRegenerar(null).length === 0);

// ── Sobre l'app real ─────────────────────────────────────────────────────────
const { chromium } = carregarPlaywright();
const navegador = await chromium.launch();
const { pagina, errors } = await obrirApp(navegador);
await activarDemo(pagina);
await recorrerFins(pagina, 7);

comprova('el prompt de lectura demana la categoria amb la llista tancada',
  await pagina.evaluate(() => {
    const p = promptLectura(textActual());
    return CONTE_CORE.CATEGORIES_DIAGNOSTIC.every(c => p.includes(c.id)) && p.includes('"categoria"');
  }));
comprova('el prompt de lectura explica que els tres primers obliguen a regenerar',
  await pagina.evaluate(() => promptLectura(textActual()).includes('obliguen a tornar a generar')));

const defectes = await pagina.evaluate(() => ESTAT_CONTE.lectura.defectes);
comprova('cada defecte acceptat arriba amb la seva decisió presa',
  defectes.every(d => d.decisio && d.decisio.accio),
  JSON.stringify(defectes.map(d => d.categoria)));
comprova('el defecte de prosa de la demostració es classifica com a regeneració',
  defectes.some(d => d.categoria === 'prosa' && d.decisio.accio === 'regenerar' && d.decisio.pas === 4));
comprova('el defecte de mecànica es queda com a pedaç local',
  defectes.some(d => d.categoria === 'mecanica' && d.decisio.accio === 'pedac'));

// El codi ha de fer complir la decisió encara que la casella s'hagi marcat per
// una altra via: la interfície no és l'últim control.
const guardat = await pagina.evaluate(async () => {
  const i = ESTAT_CONTE.lectura.defectes.findIndex(d => d.decisio.accio === 'regenerar');
  ESTAT_CONTE.lectura.defectes[i].triat = true;
  const abans = LLM_CLIENT.comptador.crides;
  let missatge = '';
  try { await aplicarPedacDirigit(); } catch (e) { missatge = e.message; }
  ESTAT_CONTE.lectura.defectes[i].triat = false;
  return { missatge, crides: LLM_CLIENT.comptador.crides - abans };
});
comprova('apedaçar un defecte de regeneració es rebutja amb el motiu i el pas',
  guardat.missatge.includes('no es poden corregir amb un pedaç') && guardat.missatge.includes('Torna a'),
  guardat.missatge);
comprova('el rebuig no gasta cap crida', guardat.crides === 0);

comprova('el conjunt de defectes locals segueix sent apedaçable',
  await pagina.evaluate(async () => {
    const i = ESTAT_CONTE.lectura.defectes.findIndex(d => d.decisio.accio === 'pedac');
    if (i < 0) return false;
    ESTAT_CONTE.lectura.defectes[i].triat = true;
    let ok = true;
    try { await aplicarPedacDirigit(); } catch (e) { ok = false; }
    return ok;
  }));
comprova('després del pedaç dirigit també s\'ha executat la coherència global',
  await pagina.evaluate(() => ESTAT_CONTE.coherencia && ESTAT_CONTE.coherencia.origen === 'pedaç dirigit'));

comprova('cap error de consola en tot el pas de lectura i pedaç',
  errors.length === 0, errors.join(' | '));

await navegador.close();
acabar();
