// Proves de regressió dels encàrrecs 3, 4 i 5 de MILLORES_PENDENTS.md:
//   3. El contracte d'escena s'ha de dramatitzar, no anomenar.
//   4. Els motius simbòlics no es poden repetir sense funció dramàtica nova.
//   5. Una resposta tallada per límit de tokens ha de ser visible.
//
// Ús:
//   npx http-server -p 8099 -c-1 .        # des de l'arrel del projecte
//   node proves/f13_maquinaria_motius_truncacio.mjs
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

// ── Encàrrec 3: vocabulari de maquinària ─────────────────────────────────────
const maquinaria = await page.evaluate(() => {
  const frasesReals = [
    'La decisió era irreversible i tothom ho sabia.',
    'El cost es va fer present com una successió de petits cops.',
    'Havia arribat al punt de no retorn.',
    'Va creuar una línia sense tornar enrere.',
    'Calia mesurar la conseqüència narrativa del gest.',
    'El cost emocional del capítol requeia sobre ella.'
  ];
  const prosaNeta = [
    'Va signar. Quan va aixecar la vista, ella ja no el mirava.',
    'El cafè es va quedar allà, fred, fins que algú se l’endugué.',
    'Va decidir quedar-se, i aquella nit va dormir al sofà.',
    'La línia del tren travessava el poble de banda a banda.',
    'El cost del bitllet era de dotze euros.'
  ];
  return {
    detectats: frasesReals.map(f => detectarVocabulariDeMaquinaria(f).length),
    falsosPositius: prosaNeta.map(f => detectarVocabulariDeMaquinaria(f)),
    buit: detectarVocabulariDeMaquinaria(''),
    prompt: document.documentElement.outerHTML.includes("LA MECÀNICA NO S'ANOMENA, ES VEU")
  };
});

comprova('Detecta les sis formulacions de maquinària del text generat',
  maquinaria.detectats.every(n => n > 0), JSON.stringify(maquinaria.detectats));
comprova('No marca prosa legítima com a maquinària',
  maquinaria.falsosPositius.every(m => m.length === 0),
  JSON.stringify(maquinaria.falsosPositius));
comprova('Un text buit retorna llista buida', Array.isArray(maquinaria.buit) && maquinaria.buit.length === 0);
comprova('El prompt d’escena porta la regla amb exemple positiu', maquinaria.prompt);
comprova('El jutge programàtic incorpora la detecció',
  await page.evaluate(() => document.documentElement.outerHTML.includes('detectarVocabulariDeMaquinaria(textNet)')));

// ── Encàrrec 4: motius simbòlics ─────────────────────────────────────────────
const motius = await page.evaluate(() => {
  ESTAT._nkg = crearNKG();
  registrarMotiusSimbolics([{ motiu: 'la tassa trencada', funcio: 'marca la rutina humiliada' }], 1);
  registrarMotiusSimbolics([{ motiu: 'La Tassa Trencada', funcio: 'passa a ser prova pública' }], 2);
  registrarMotiusSimbolics([{ motiu: 'tassa trencada', funcio: 'la deixen caure a la vorera' }], 3);
  registrarMotiusSimbolics([{ motiu: 'el fulard blau', funcio: 'identifica el grup' }], 3);
  const reg = ESTAT._nkg.motius_simbolics;
  const tassa = reg.find(m => m.clau === 'tassa trencada');
  return {
    registrats: reg.length,
    aparicionsTassa: tassa ? tassa.aparicions : null,
    ultimaFuncio: tassa ? tassa.ultima_funcio : null,
    bloc: buildBlocMotiusSimbolics(),
    campAlNkg: Array.isArray(crearNKG().motius_simbolics),
    // Repetir el mateix capítol no ha de duplicar l'aparició
    tornarARegistrar: (() => {
      registrarMotiusSimbolics([{ motiu: 'la tassa trencada', funcio: 'x' }], 3);
      return ESTAT._nkg.motius_simbolics.find(m => m.clau === 'tassa trencada').aparicions.length;
    })(),
    blocBuit: (() => { ESTAT._nkg = crearNKG(); return buildBlocMotiusSimbolics(); })()
  };
});

comprova('El camp motius_simbolics existeix al NKG nou', motius.campAlNkg);
comprova('Les variants del mateix motiu es fusionen en una entrada',
  motius.registrats === 2, `${motius.registrats} entrades`);
comprova('Es compten les aparicions per capítol',
  JSON.stringify(motius.aparicionsTassa) === '[1,2,3]', JSON.stringify(motius.aparicionsTassa));
comprova('Es conserva la darrera funció dramàtica',
  motius.ultimaFuncio === 'la deixen caure a la vorera', motius.ultimaFuncio);
comprova('Registrar dues vegades el mateix capítol no duplica',
  motius.tornarARegistrar === 3, String(motius.tornarARegistrar));
comprova('El bloc marca com a SATURAT el motiu amb 3 aparicions',
  /SATURAT/.test(motius.bloc), motius.bloc.slice(0, 160));
comprova('El bloc prohibeix explicar el significat del motiu',
  /No expliquis mai què significa/.test(motius.bloc));
comprova('Sense motius registrats el bloc queda buit', motius.blocBuit === '');
comprova('El post-capítol demana els motius al model',
  await page.evaluate(() => document.documentElement.outerHTML.includes('"motius_simbolics"')));
comprova('El bloc s’injecta al prompt del capítol',
  await page.evaluate(() => document.documentElement.outerHTML.includes('buildBlocMotiusSimbolics()')));

// ── Encàrrec 5: truncació visible ────────────────────────────────────────────
const truncacio = await page.evaluate(async () => {
  ESTAT._anthropicApiKey = 'sk-ant-test';
  ESTAT._respostesTallades = [];
  const avisos = [];
  const warnOriginal = console.warn;
  console.warn = (...a) => { avisos.push(a.join(' ')); };

  let cosRebut = null;
  window.fetch = async (url, options) => {
    cosRebut = JSON.parse(options.body);
    return {
      status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify({
        content: [{ type: 'text', text: 'Text tallat a mitja fra' }],
        stop_reason: 'max_tokens'
      })
    };
  };

  const cfg = { provider: 'anthropic', providerArquitectura: 'anthropic', apiKey: 'sk-ant-test', modelArquitectura: 'claude-sonnet-4-6' };
  const detallat = await callLLMMultiDetallat([{ role: 'user', content: 'x' }], 's', cfg, 'arquitectura');
  const pla = await callLLMMulti([{ role: 'user', content: 'x' }], 's', cfg, 'arquitectura');

  console.warn = warnOriginal;
  return {
    textIncomplet: detallat.textIncomplet,
    text: detallat.text,
    model: detallat.model,
    tipusPla: typeof pla,
    registrades: ESTAT._respostesTallades.length,
    rolRegistrat: (ESTAT._respostesTallades[0] || {}).tag,
    avisConsola: avisos.some(a => /TALLADA/.test(a))
  };
});

comprova('callLLMMultiDetallat exposa el senyal de truncació', truncacio.textIncomplet === true);
comprova('callLLMMultiDetallat retorna també el text i el model',
  truncacio.text === 'Text tallat a mitja fra' && truncacio.model === 'claude-sonnet-4-6');
comprova('callLLMMulti manté la signatura antiga (retorna string)', truncacio.tipusPla === 'string');
comprova('Cada resposta tallada queda registrada a ESTAT', truncacio.registrades === 2, String(truncacio.registrades));
comprova('El registre desa el rol de la crida', truncacio.rolRegistrat === 'arquitectura', truncacio.rolRegistrat);
comprova('La truncació deixa avís a la consola', truncacio.avisConsola);

// El jutge d'interval passa responseMimeType a través de callLLMMulti: el camí
// de Gemini l'ha de continuar respectant després del canvi de routing.
const mime = await page.evaluate(async () => {
  ESTAT._geminiApiKey = 'k';
  let cos = null;
  window.fetch = async (url, options) => {
    cos = JSON.parse(options.body);
    return {
      status: 200,
      headers: { get: () => null },
      text: async () => JSON.stringify({
        candidates: [{ content: { parts: [{ text: '{"ok":true}' }] }, finishReason: 'STOP' }]
      })
    };
  };
  await callLLMMulti([{ role: 'user', content: 'x' }], 'sistema', {
    provider: 'gemini', providerArquitectura: 'gemini', apiKey: 'k',
    modelArquitectura: 'gemini-3-pro-preview', responseMimeType: 'application/json'
  }, 'arquitectura');
  return cos && cos.generationConfig && cos.generationConfig.responseMimeType;
});

comprova('El responseMimeType explícit arriba a Gemini', mime === 'application/json', String(mime));

comprova('Cap error de pàgina durant les proves', pageErrors.length === 0, pageErrors.join(' | '));

console.log(`\n${passades}/${totals} comprovacions passades`);
await browser.close();
process.exit(passades === totals ? 0 : 1);
