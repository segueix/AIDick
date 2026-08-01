// Proves de regressió de la fase 21 (Perspectiva i Cronologia) i del
// pressupost de tokens d'OpenAI a les fases posteriors.
//
// El problema que cobreixen: amb ChatGPT (GPT-5) la fase 21 demanava POV,
// cronologia i timeline de tota la novel·la en una sola resposta de 3.600
// tokens, dels quals el raonament intern del model se'n menjava una part. Amb
// moltes parts per generar la resposta arribava tallada i, segons on quedés el
// tall, o bé es perdien capítols en silenci o bé la fase moria amb "Resposta
// invàlida a Perspectiva i Cronologia".
//
// Ús:
//   npx http-server -p 8099 -c-1 .        # des de l'arrel del projecte
//   node proves/f11_fase21_blocs.mjs
//
// Variables opcionals: BOOKI_URL, CHROMIUM_PATH.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

function carregarPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch (e) { /* provem la instal·lació global */ }
  const arrelGlobal = execSync('npm root -g', { encoding: 'utf8' }).trim();
  return createRequire(arrelGlobal + '/').call(null, 'playwright');
}
const { chromium } = carregarPlaywright();

const URL_BOOKI = process.env.BOOKI_URL || 'http://127.0.0.1:8099/llegat/novella.html';

let passades = 0;
let totals = 0;
function comprova(nom, condicio, detall = '') {
  totals += 1;
  if (condicio) {
    passades += 1;
    console.log(`✅ ${nom}`);
  } else {
    console.error(`❌ ${nom}${detall ? ' — ' + detall : ''}`);
  }
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
await page.goto(URL_BOOKI, { waitUntil: 'load' });
await page.waitForTimeout(1200);

// ── Pressupost de sortida d'OpenAI ───────────────────────────────────────────
const pressupost = await page.evaluate(() => ({
  ambReserva: limitSortidaGPT5('gpt-5-mini', 3600),
  reservaMinima: limitSortidaGPT5('gpt-5-mini', 200),
  sostreModel: limitSortidaGPT5('gpt-5-mini', 128000),
  maxOutput: maxOutputDelModel('gpt-5-mini'),
  payloadGPT5: buildOpenAIPayload([{ role: 'user', content: 'x' }], 's', 'gpt-5-mini', 3600),
  payloadClassic: buildOpenAIPayload([{ role: 'user', content: 'x' }], 's', 'gpt-4o', 3600)
}));

comprova('El raonament de GPT-5 té marge propi i no es menja el contingut demanat',
  pressupost.ambReserva >= 3600 + 4096, `límit ${pressupost.ambReserva}`);
comprova('La reserva de raonament té un mínim ampli per a respostes curtes',
  pressupost.reservaMinima >= 4096, `límit ${pressupost.reservaMinima}`);
comprova('El límit mai supera el max_output del model',
  pressupost.sostreModel === pressupost.maxOutput, `${pressupost.sostreModel} vs ${pressupost.maxOutput}`);
comprova('GPT-5 continua fent servir max_completion_tokens i reasoning_effort',
  !!pressupost.payloadGPT5.max_completion_tokens && pressupost.payloadGPT5.reasoning_effort === 'low');
comprova('Els models no-GPT-5 continuen amb max_tokens sense marge extra',
  pressupost.payloadClassic.max_tokens === 3600 && !pressupost.payloadClassic.max_completion_tokens);

// ── Reintent quan el raonament deixa la resposta a mitges ────────────────────
const reintent = await page.evaluate(async () => {
  const limits = [];
  const RAONAMENT = 5000;
  window.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    const limit = body.max_completion_tokens || body.max_tokens || Infinity;
    limits.push(limit);
    const disponible = Math.max(0, limit - RAONAMENT) * 4;
    const complet = 'A'.repeat(40000);
    const tallat = complet.length > disponible;
    return {
      status: 200, headers: { get: () => null },
      text: async () => JSON.stringify({
        choices: [{ message: { content: complet.slice(0, disponible) }, finish_reason: tallat ? 'length' : 'stop' }],
        usage: { completion_tokens_details: { reasoning_tokens: RAONAMENT } }
      })
    };
  };
  const text = await callOpenAI([{ role: 'user', content: 'x' }], 's', 'sk-test', 'gpt-5-mini', 2000);
  return { limits, llargada: text.length };
});

comprova('Una resposta tallada pel raonament es torna a demanar amb més límit',
  reintent.limits.length === 2 && reintent.limits[1] > reintent.limits[0],
  `límits ${reintent.limits.join(' → ')}`);
comprova('El reintent recupera el pressupost de contingut que s’havia demanat',
  reintent.llargada / 4 >= 2000, `~${Math.round(reintent.llargada / 4)} tokens`);

// ── Fase 21 sencera amb una novel·la gran ────────────────────────────────────
const fase21 = await page.evaluate(async () => {
  const NCAPS = 24, NPERS = 6, RAONAMENT = 3000;
  const MARCA_BIOGRAFIA = 'BIOGRAFIA_QUE_NO_HA_DANAR_AL_PROMPT';

  ESTAT._estructuraCapitols = Array.from({ length: NCAPS }, (_, i) => ({
    numero: i + 1, titol: `Capítol ${i + 1}`,
    resum: 'Funció narrativa del capítol.', intensity_level: 3,
    ganxo_final: { tipus: 'cliffhanger_revelacio', element: 'una carta' },
    personatges: ['pers_1', 'pers_2']
  }));
  ESTAT._escaletes = Array.from({ length: NCAPS }, (_, i) => ({
    capitol: i + 1,
    escenes: Array.from({ length: 6 }, (_, j) => ({
      nom: `Escena ${j + 1}`, funcio_narrativa: 'Fa avançar el conflicte',
      personatges: ['pers_1', 'pers_2'],
      scene_contract: { id: `C${i + 1}E${j + 1}`, pov: 'pers_1', objectiu_visible_pov: 'x'.repeat(150) }
    }))
  }));
  ESTAT._nkg = crearNKG();
  for (let i = 1; i <= NPERS; i++) {
    ESTAT._nkg.personatges['pers_' + i] = {
      nom: 'Personatge ' + i, veu: {}, arc: { waypoints: [] },
      trets_immutables: { ocupacio: 'ofici' },
      motivacions_base: { necessitat_interna: 'ser vist' },
      biografia: MARCA_BIOGRAFIA
    };
  }
  ESTAT._nkg.llocs = { lloc_a: {}, lloc_b: {} };

  // Quins capítols demana la petició: es llegeix del context que hi viatja.
  const capitolsDeLaPeticio = (messages) => {
    const usuari = (messages || []).find(m => m.role === 'user' && String(m.content).startsWith('Context:'));
    if (!usuari) return [];
    try {
      const ctx = JSON.parse(String(usuari.content).replace(/^Context:\s*/, ''));
      return (ctx.capitols || []).map(c => Number(c.capitol)).filter(Boolean);
    } catch (e) { return []; }
  };

  const peticions = [];
  window.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    const promptText = JSON.stringify(body.messages);
    const caps = capitolsDeLaPeticio(body.messages);
    const capsFinals = caps.length ? caps : Array.from({ length: NCAPS }, (_, i) => i + 1);

    const complet = JSON.stringify({
      perspectiva: {
        tipus: 'tercera_limitada',
        pov_per_capitol: capsFinals.map(n => ({
          capitol: n, personatge_pov: 'pers_1',
          justificacio: 'El capítol es viu des del seu punt de vista perquè és qui pateix el conflicte.'
        })),
        restriccions_informacio: 'El narrador no sap res que el POV no sàpiga.'
      },
      cronologia: {
        data_inici_historia: '1998-03-04', duracio_total_estimada: 'sis mesos',
        per_capitol: capsFinals.map(n => ({
          capitol: n, data_ficticia: '1998-03-04', duracio_capitol: 'unes hores',
          moment_del_dia: 'tarda', ubicacio_principal: 'lloc_a'
        }))
      },
      timeline_accions: capsFinals.flatMap(n => Array.from({ length: NPERS }, (_, k) => ({
        capitol: n, personatge: 'pers_' + (k + 1),
        accio: 'Fa una acció concreta i observable dins del capítol.',
        hora_aproximada: '21:00', ubicacio: 'lloc_a'
      })))
    }, null, 2);

    const limit = body.max_completion_tokens || body.max_tokens || Infinity;
    const disponible = Math.max(0, limit - RAONAMENT) * 4;
    const tallat = complet.length > disponible;
    peticions.push({
      capitolsDemanats: capsFinals.length,
      tallat,
      tokensPrompt: Math.round(promptText.length / 4),
      portaBiografies: promptText.includes(MARCA_BIOGRAFIA)
    });

    return {
      status: 200, headers: { get: () => null },
      text: async () => JSON.stringify({
        choices: [{ message: { content: tallat ? complet.slice(0, disponible) : complet }, finish_reason: tallat ? 'length' : 'stop' }],
        usage: { completion_tokens_details: { reasoning_tokens: RAONAMENT } }
      })
    };
  };

  ESTAT._openaiApiKey = 'sk-test';
  const cfg = { provider: 'openai', providerArquitectura: 'openai', apiKey: 'sk-test', modelArquitectura: 'gpt-5-mini' };

  const progres = [];
  let error = null;
  try {
    const dades = await generarPerspectivaCronologia(cfg, m => progres.push(m));
    injectarPerspectivaCronologia(dades);
  } catch (e) { error = e.message; }

  const persp = ESTAT._nkg.context_creacio?.estil?.perspectiva || {};
  const crono = ESTAT._nkg.context_creacio?.cronologia || {};
  return {
    NCAPS, NPERS, error, peticions, progres,
    povs: (persp.pov_per_capitol || []).length,
    cronoCaps: (crono.per_capitol || []).length,
    timeline: (ESTAT._nkg.timeline_accions || []).length,
    faltants: faltantsPerspectivaCronologia(),
    preparada: tePerspectivaCronologiaPreparada(),
    teRellotge: construirBlocEstatInicialCapitol(5).includes('Moment:')
  };
});

comprova('La fase 21 acaba sense error amb una novel·la de 24 capítols',
  fase21.error === null, String(fase21.error));
comprova('La fase 21 es genera per blocs, no en una sola crida',
  fase21.peticions.length >= 4 && fase21.peticions.every(p => p.capitolsDemanats <= 5),
  `${fase21.peticions.length} crides`);
comprova('Cap bloc arriba tallat pel límit de tokens',
  fase21.peticions.every(p => !p.tallat),
  `${fase21.peticions.filter(p => p.tallat).length} tallades`);
comprova('Tots els capítols reben POV',
  fase21.povs === fase21.NCAPS, `${fase21.povs}/${fase21.NCAPS}`);
comprova('Tots els capítols reben entrada de cronologia',
  fase21.cronoCaps === fase21.NCAPS, `${fase21.cronoCaps}/${fase21.NCAPS}`);
comprova('La timeline cobreix tots els personatges de tots els capítols',
  fase21.timeline === fase21.NCAPS * fase21.NPERS, `${fase21.timeline}/${fase21.NCAPS * fase21.NPERS}`);
comprova('El control de faltants informa per capítol, no només de llistes buides',
  fase21.faltants.senseP.length === 0 && fase21.faltants.senseC.length === 0,
  JSON.stringify(fase21.faltants));
comprova('El prompt de cada bloc no arrossega el NKG sencer',
  fase21.peticions.every(p => !p.portaBiografies));
comprova('El prompt de cada bloc es manté petit',
  fase21.peticions.every(p => p.tokensPrompt < 20000),
  `màxim ${Math.max(...fase21.peticions.map(p => p.tokensPrompt))} tokens`);
comprova('El loader informa del progrés bloc a bloc',
  fase21.progres.length >= 4 && fase21.progres.some(m => /capítols \d+-\d+/.test(m)));
comprova('La fase 22 veu la fase 21 com a preparada', fase21.preparada);
comprova('La cronologia arriba al prompt del capítol (data i moment del dia)', fase21.teRellotge);

// ── Cronologia incoherent entre blocs ────────────────────────────────────────
const crono = await page.evaluate(() => {
  const cronologia = {
    data_inici_historia: '2020-01-01', duracio_total_estimada: 'un any',
    per_capitol: [
      { capitol: 1, data_ficticia: '2020-06-01', moment_del_dia: 'vespre', duracio_capitol: '', ubicacio_principal: '' },
      { capitol: 2, data_ficticia: '2020-03-01', moment_del_dia: 'matinada', duracio_capitol: '', ubicacio_principal: '' },
      { capitol: 3, data_ficticia: '2020-07-01', moment_del_dia: 'mati', duracio_capitol: '', ubicacio_principal: '' }
    ]
  };
  const correccions = sanejarCronologiaPerCapitol(cronologia);
  let validaDespres = true;
  try { validarCronologiaPerCapitol(cronologia); } catch (e) { validaDespres = false; }
  return { correccions, validaDespres, dates: cronologia.per_capitol.map(c => c.data_ficticia) };
});

comprova('Una cronologia que retrocedeix es corregeix en lloc de matar la fase',
  crono.correccions.length > 0 && crono.validaDespres,
  JSON.stringify(crono));
comprova('La correcció no inventa dates: reutilitza la del capítol anterior',
  crono.dates[1] === '2020-06-01');

// ── Xarxa de seguretat local i compleció de llistes per capítol ──────────────
const xarxa = await page.evaluate(async () => {
  ESTAT._estructuraCapitols = Array.from({ length: 4 }, (_, i) => ({
    numero: i + 1, titol: `Cap ${i + 1}`, personatges: ['pers_2']
  }));
  ESTAT._escaletes = Array.from({ length: 4 }, (_, i) => ({
    capitol: i + 1,
    escenes: [{ nom: 'e', funcio_narrativa: 'f', personatges: ['pers_2'], scene_contract: { pov: 'pers_2' } }]
  }));

  const acumulat = {
    perspectiva: { tipus: 'tercera_limitada', pov_per_capitol: [{ capitol: 1, personatge_pov: 'pers_1' }], restriccions_informacio: '' },
    cronologia: { data_inici_historia: '2020-01-01', duracio_total_estimada: '', per_capitol: [{ capitol: 1, data_ficticia: '2020-01-01', moment_del_dia: 'tarda' }] },
    timeline_accions: []
  };
  const completats = completarPerspectivaCronologiaLocal(acumulat, capitolsPerspectiva());

  // Compleció d'una llista per capítol (temperatura / ratio de diàleg)
  const tots = [{ capitol: 1 }, { capitol: 2 }, { capitol: 3 }, { capitol: 4 }];
  const demanades = [];
  const llista = await completarLlistaPerCapitol([{ capitol: 1, temperatura: 5 }], tots, async (faltants) => {
    demanades.push(faltants.map(f => f.capitol).join(','));
    return faltants.map(f => ({ capitol: f.capitol, temperatura: 4 }));
  });

  return {
    completats,
    povs: acumulat.perspectiva.pov_per_capitol.map(e => `${e.capitol}:${e.personatge_pov}`),
    cronoCaps: acumulat.cronologia.per_capitol.map(e => e.capitol),
    llista: llista.map(e => e.capitol),
    demanades
  };
});

comprova('Cap capítol es queda sense POV encara que el model no respongui',
  xarxa.povs.length === 4 && xarxa.povs.includes('2:pers_2'), JSON.stringify(xarxa.povs));
comprova('El POV deduït surt de l’escaleta del capítol, no d’un valor fix',
  xarxa.povs.slice(1).every(p => p.endsWith(':pers_2')));
comprova('Cap capítol es queda sense entrada de cronologia',
  xarxa.cronoCaps.join(',') === '1,2,3,4', xarxa.cronoCaps.join(','));
comprova('Els capítols completats sense model queden registrats',
  xarxa.completats.join(',') === '2,3,4', xarxa.completats.join(','));
comprova('Una llista per capítol incompleta es reclama en una segona passada',
  xarxa.llista.join(',') === '1,2,3,4' && xarxa.demanades.join('|') === '2,3,4',
  JSON.stringify(xarxa));

comprova('Cap error de pàgina durant les proves', pageErrors.length === 0, pageErrors.join(' | '));

console.log(`\n${passades}/${totals} comprovacions passades`);
await browser.close();
process.exit(passades === totals ? 0 : 1);
