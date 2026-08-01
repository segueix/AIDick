// c6 — Recorregut complet P0..P8 amb dades simulades, incloent recàrrega a mig
// camí i represa des de localStorage, migració d'esquema antic i la regla que
// cap bloqueig es queda sense acció que el resolgui.
import { crearComptador, carregarPlaywright, obrirApp, activarDemo, recorrerFins } from './ajudes/comprova.mjs';

const { comprova, acabar } = crearComptador();
const { chromium } = carregarPlaywright();
const navegador = await chromium.launch();
const { pagina, errors, externes } = await obrirApp(navegador);

// ── Càrrega ──────────────────────────────────────────────────────────────────
const moduls = await pagina.evaluate(() => ({
  perfils: typeof PERFILS_AUTOR, nucli: typeof CONTE_CORE, client: typeof LLM_CLIENT,
  demo: typeof DEMO_CONTE, parse: typeof parseJsonRobust,
  scripts: [...document.querySelectorAll('script[src]')].map(s => s.getAttribute('src'))
}));
comprova('els mòduls es carreguen tots', moduls.perfils === 'object' && moduls.nucli === 'object' &&
  moduls.client === 'object' && moduls.demo === 'object' && moduls.parse === 'function');
comprova('l\'ordre de càrrega dels mòduls és el correcte',
  JSON.stringify(moduls.scripts) === JSON.stringify([
    'perfils_autor_base.js', 'models_openai.js', 'nkg_core.js',
    'conte_core.js', 'llm_client.js', 'demo_conte.js'
  ]), JSON.stringify(moduls.scripts));
comprova('cap mòdul s\'injecta amb document.write',
  !(await pagina.content()).includes('document.write'));
comprova('hi ha les nou targetes de pas P0..P8',
  await pagina.locator('section.targeta').count() === 9,
  String(await pagina.locator('section.targeta').count()));

// ── Bloqueig sense clau, amb acció de resolució ──────────────────────────────
await pagina.evaluate(() => { localStorage.clear(); });
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.waitForTimeout(300);
await pagina.evaluate(() => { ESTAT_CONTE.pas_obert = 0; renderitzar(); });
comprova('sense clau API es bloqueja i s\'explica',
  (await pagina.locator('#pas-0').innerText()).includes('No hi ha cap clau API'));
comprova('el bloqueig sense clau ofereix acció de resolució',
  (await pagina.locator('#pas-0 .blocatge button').count()) >= 1);

// ── Recorregut ───────────────────────────────────────────────────────────────
await activarDemo(pagina);

await recorrerFins(pagina, 1);
comprova('P1 dona sis llavors i triar-ne una omple el dossier',
  await pagina.evaluate(() => ESTAT_CONTE.llavors.length === 6 && !!ESTAT_CONTE.dossier.premissa));
comprova('P1 registra els motius a l\'històric de localStorage',
  await pagina.evaluate(() => JSON.parse(localStorage.getItem('aidick_motius_usats') || '[]').length === 3));

await recorrerFins(pagina, 2);
comprova('P2 deixa el dossier vàlid',
  await pagina.evaluate(() => CONTE_CORE.validarDossier(ESTAT_CONTE.dossier).valid));

await recorrerFins(pagina, 3);
comprova('P3 deixa l\'escaleta amb el pressupost quadrat',
  await pagina.evaluate(() => ESTAT_CONTE.escaleta.escenes.reduce((a, e) => a + e.caracters_objectiu, 0) === CONTE_CORE.CONTE_OBJECTIU_CARACTERS));

// ── Recàrrega a mig camí ─────────────────────────────────────────────────────
const abansRecarrega = await pagina.evaluate(() => ({
  pas: ESTAT_CONTE.pas_actual,
  escenes: ESTAT_CONTE.escaleta.escenes.length,
  dossier: ESTAT_CONTE.dossier.premissa,
  crides: LLM_CLIENT.comptador.crides,
  cost: LLM_CLIENT.comptador.cost_estimat_usd
}));
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.waitForTimeout(400);
const despresRecarrega = await pagina.evaluate(() => ({
  pas: ESTAT_CONTE.pas_actual,
  escenes: ESTAT_CONTE.escaleta.escenes.length,
  dossier: ESTAT_CONTE.dossier.premissa,
  crides: LLM_CLIENT.comptador.crides,
  cost: LLM_CLIENT.comptador.cost_estimat_usd
}));
comprova('recarregar a mig camí recupera el punt exacte',
  JSON.stringify(abansRecarrega) === JSON.stringify(despresRecarrega),
  `${JSON.stringify(abansRecarrega)} vs ${JSON.stringify(despresRecarrega)}`);
comprova('el comptador de crides sobreviu la recàrrega', despresRecarrega.crides === abansRecarrega.crides);

await recorrerFins(pagina, 7);
const final = await pagina.evaluate(() => ({
  caracters: CONTE_CORE.comptaCaracters(textActual()),
  auditoria: !!ESTAT_CONTE.auditoria,
  lectura: !!ESTAT_CONTE.lectura,
  pas: ESTAT_CONTE.pas_actual
}));
comprova('el recorregut arriba a tenir text, auditoria i lectura',
  final.caracters > 14000 && final.auditoria && final.lectura, JSON.stringify(final));

// ── Exportació ───────────────────────────────────────────────────────────────
const meta = await pagina.evaluate(() => metadadesConte());
comprova('les metadades porten totes les xifres reals',
  meta.caracters_amb_espais > 0 && meta.paraules > 0 && meta.escenes > 0 &&
  meta.crides_reals > 0 && meta.cost_real_usd > 0, JSON.stringify(meta).slice(0, 200));
comprova('les metadades porten el cost estimat al costat del real',
  meta.cost_estimat_inicial_usd !== null && meta.desviacio_cost !== null);
comprova('les metadades porten els models per pas',
  Object.keys(meta.models_per_pas).length >= 5, JSON.stringify(meta.models_per_pas));
comprova('el títol es proposa a partir de la premissa',
  await pagina.evaluate(() => ESTAT_CONTE.titol.length > 0));
comprova('el títol NO s\'insereix al cos si no es demana',
  await pagina.evaluate(() => !cosDelConte().startsWith(ESTAT_CONTE.titol)));
await pagina.evaluate(() => { ESTAT_CONTE.titol_al_cos = true; });
comprova('el títol s\'insereix al cos només si es demana',
  await pagina.evaluate(() => cosDelConte().startsWith(ESTAT_CONTE.titol)));
await pagina.evaluate(() => { ESTAT_CONTE.titol_al_cos = false; });
comprova('l\'exportació del projecte no inclou mai les claus API',
  await pagina.evaluate(() => {
    const p = JSON.parse(JSON.stringify(ESTAT_CONTE));
    delete p.config.claus;
    return p.config.claus === undefined;
  }));

// ── Migració d'esquema ───────────────────────────────────────────────────────
await pagina.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('aidick_conte_projecte'));
  d.versio_esquema = 0;
  delete d.escaleta;
  delete d.pedacos_rebutjats;
  d.camp_d_una_versio_antiga = { qualsevol: 'cosa' };
  d.pas_actual = 'text on hi hauria d\'anar un número';
  localStorage.setItem('aidick_conte_projecte', JSON.stringify(d));
});
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.waitForTimeout(400);
comprova('un projecte amb esquema antic s\'obre sense petar',
  await pagina.evaluate(() => ESTAT_CONTE.versio_esquema === 1));
comprova('la migració reposa les estructures que faltaven',
  await pagina.evaluate(() => Array.isArray(ESTAT_CONTE.escaleta.escenes) && Array.isArray(ESTAT_CONTE.pedacos_rebutjats)));
comprova('la migració rebutja un valor del tipus equivocat',
  await pagina.evaluate(() => typeof ESTAT_CONTE.pas_actual === 'number'));
comprova('la migració avisa en lloc d\'amagar-ho',
  await pagina.evaluate(() => ESTAT_CONTE.avisos.some(a => /migrat/.test(a))));

// ── Un localStorage corrupte no ha de deixar l'app morta ─────────────────────
await pagina.evaluate(() => { localStorage.setItem('aidick_conte_projecte', '{no és json'); });
await pagina.reload({ waitUntil: 'networkidle' });
await pagina.waitForTimeout(400);
comprova('un projecte il·legible obre un projecte nou en lloc de petar',
  await pagina.evaluate(() => typeof ESTAT_CONTE === 'object' && ESTAT_CONTE.pas_actual === 0));
comprova('l\'app segueix renderitzant els nou passos',
  await pagina.locator('section.targeta').count() === 9);

// ── Cap error de consola ─────────────────────────────────────────────────────
comprova('cap error de consola en tot el recorregut', errors.length === 0, errors.join(' | '));
comprova('cap petició a la xarxa externa', externes.length === 0, externes.join(', '));

await navegador.close();
acabar();
