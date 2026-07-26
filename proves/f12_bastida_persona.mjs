// Proves de regressió dels encàrrecs 1 i 2 de MILLORES_PENDENTS.md:
//   1. La bastida de generació (capçaleres d'escena, anotacions de POV,
//      separadors "/") no pot arribar al text que llegeix el lector.
//   2. El tipus de narrador ha d'arribar al prompt com una regla explícita,
//      no com un slug ("tercera_limitada") enterrat entre línies de context.
//
// Ús:
//   npx http-server -p 8099 -c-1 .        # des de l'arrel del projecte
//   node proves/f12_bastida_persona.mjs
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

const URL_BOOKI = process.env.BOOKI_URL || 'http://127.0.0.1:8099/index.html';

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

// ── Encàrrec 1: neteja de bastida ────────────────────────────────────────────
const brut = [
  'Escena 1 — Sastre de pancartes',
  '(POV: Olof)',
  '',
  'La sala parroquial tenia una sola làmpada.',
  '',
  '[[ESCENA_2]]',
  '/',
  'ESCENA 2',
  '(POV: Karin, tercera persona limitada)',
  '',
  '— No posis això sobre la taula —va dir Lars.',
  '',
  'CAPÍTOL 3',
  '/ Escena 1 — La carpeta al soterrani',
  '',
  'Va recordar l’escena del matí amb una claredat incòmoda.',
  '',
  '***',
  '',
  '—I ara què? —va preguntar ella.'
].join('\n');

const neteja = await page.evaluate((text) => {
  const net = netejarBastidaCapitol(text);
  return {
    net,
    viaTabulacions: netejarTabulacionsInicials(text),
    // Casos negatius: prosa que NO s'ha de perdre
    prosaAmbEscena: netejarBastidaCapitol('Va recordar l’escena del matí.'),
    prosaAmbPov: netejarBastidaCapitol('El punt de vista del jutge era un altre.'),
    dialegGuio: netejarBastidaCapitol('—Escena 1, va dir en broma.'),
    trencamentAsteriscs: netejarBastidaCapitol('Una frase.\n\n***\n\nUna altra frase.'),
    buit: netejarBastidaCapitol('')
  };
}, brut);

comprova('Les capçaleres d’escena desapareixen',
  !/Escena 1 — Sastre/.test(neteja.net) && !/^ESCENA 2$/m.test(neteja.net), neteja.net.slice(0, 120));
comprova('Les capçaleres de capítol desapareixen', !/CAP[IÍ]TOL 3/.test(neteja.net));
comprova('Les anotacions de POV desapareixen', !/POV\s*:/i.test(neteja.net));
comprova('Els marcadors [[ESCENA_N]] desapareixen', !/\[\[ESCENA_\d+\]\]/.test(neteja.net));
comprova('El separador "/" sol desapareix', !/^\s*\/+\s*$/m.test(neteja.net));
comprova('La capçalera amb barra al davant desapareix', !/La carpeta al soterrani/.test(neteja.net));

comprova('La prosa es conserva sencera',
  neteja.net.includes('La sala parroquial tenia una sola làmpada.') &&
  neteja.net.includes('— No posis això sobre la taula —va dir Lars.') &&
  neteja.net.includes('—I ara què? —va preguntar ella.'), neteja.net);
comprova('Una frase que conté la paraula "escena" no es perd',
  neteja.prosaAmbEscena === 'Va recordar l’escena del matí.');
comprova('Una frase que parla del punt de vista no es perd',
  neteja.prosaAmbPov === 'El punt de vista del jutge era un altre.');
comprova('Una rèplica de diàleg amb guió no es perd',
  neteja.dialegGuio === '—Escena 1, va dir en broma.', neteja.dialegGuio);
comprova('El trencament d’escena "***" es conserva',
  neteja.trencamentAsteriscs.includes('***'));
comprova('No queden més de dues línies en blanc seguides', !/\n{3,}/.test(neteja.net));
comprova('Un text buit no peta', neteja.buit === '');
comprova('netejarTabulacionsInicials aplica també la neteja de bastida',
  !/POV\s*:/i.test(neteja.viaTabulacions) && !/\[\[ESCENA_\d+\]\]/.test(neteja.viaTabulacions));

const html = await page.evaluate(() => document.documentElement.outerHTML.length > 0);
comprova('El prompt d’escena prohibeix emetre capçaleres i anotacions',
  await page.evaluate(() => {
    const src = document.documentElement.outerHTML;
    return src.includes('NOMÉS PROSA') && src.includes('(POV: …)');
  }) && html);

// ── Encàrrec 2: persona narrativa com a regla ────────────────────────────────
const persona = await page.evaluate(() => ({
  limitada: reglaPersonaNarrativa('tercera_limitada', 'Olof'),
  primera: reglaPersonaNarrativa('primera_persona', 'Olof'),
  omniscient: reglaPersonaNarrativa('tercera_omniscient', 'Olof'),
  alternada: reglaPersonaNarrativa('alternada', 'Olof'),
  desconegut: reglaPersonaNarrativa('valor_que_no_existeix', 'Olof'),
  senseNom: reglaPersonaNarrativa('tercera_limitada', '')
}));

comprova('Tercera limitada prohibeix explícitament la primera persona',
  /TERCERA PERSONA LIMITADA/.test(persona.limitada) && /PROHIBIT/.test(persona.limitada));
comprova('Tercera limitada nomena el personatge POV', persona.limitada.includes('Olof'));
comprova('Primera persona exigeix "jo" i prohibeix el canvi a tercera',
  /PRIMERA PERSONA/.test(persona.primera) && /"jo"/.test(persona.primera));
comprova('Omniscient permet més d’un personatge però prohibeix la primera persona',
  /OMNISCIENT/.test(persona.omniscient) && /primera persona/i.test(persona.omniscient));
comprova('Alternada fixa el focus dins del capítol',
  /ALTERNADA/.test(persona.alternada) && /no pot canviar dins del capítol/.test(persona.alternada));
comprova('Un tipus desconegut cau a tercera limitada',
  /TERCERA PERSONA LIMITADA/.test(persona.desconegut));
comprova('Sense nom de POV la regla continua sent vàlida',
  /TERCERA PERSONA LIMITADA/.test(persona.senseNom) && persona.senseNom.includes('el personatge POV'));
comprova('Les quatre regles són diferents entre si',
  new Set([persona.limitada, persona.primera, persona.omniscient, persona.alternada]).size === 4);

// El prompt d'escena ha de portar la regla, no el slug
const alPrompt = await page.evaluate(() => {
  ESTAT._nkg = crearNKG();
  ESTAT._nkg.context_creacio = { estil: { perspectiva: {
    tipus: 'tercera_limitada',
    pov_per_capitol: [{ capitol: 1, personatge_pov: 'Olof', justificacio: 'j' }],
    restriccions_informacio: 'r'
  } } };
  ESTAT._estructuraCapitols = [{ numero: 1, titol: 'C1' }];
  const ctx = nkgGenerarContextMinim({ capitol: 1, escena: 1 });
  return { ctx, teRegla: /TERCERA PERSONA LIMITADA/.test(ctx), teSlug: /Tipus narrador: tercera_limitada/.test(ctx) };
});

comprova('El context d’escena porta la regla de persona narrativa', alPrompt.teRegla,
  alPrompt.ctx.slice(0, 200));
comprova('El slug cru ja no arriba al prompt', !alPrompt.teSlug);

comprova('Cap error de pàgina durant les proves', pageErrors.length === 0, pageErrors.join(' | '));

console.log(`\n${passades}/${totals} comprovacions passades`);
await browser.close();
process.exit(passades === totals ? 0 : 1);
