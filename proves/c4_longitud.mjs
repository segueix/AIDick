// c4 — Control de longitud.
// Un conte curt i un de llarg activen la crida B de P5 una sola vegada, i el
// resultat es reporta encara que segueixi fora d'interval. També es comprova
// que la compensació entre escenes és per codi i no regenera res.
import { crearComptador, carregarPlaywright, obrirApp, activarDemo, recorrerFins } from './ajudes/comprova.mjs';
import { carregarNucliConte } from './ajudes/carrega_moduls.mjs';

const { comprova, acabar } = crearComptador();
const { CONTE_CORE: C } = carregarNucliConte();

const { chromium } = carregarPlaywright();
const navegador = await chromium.launch();

// ── Compensació entre escenes, sense regenerar ───────────────────────────────
{
  const { pagina } = await obrirApp(navegador);
  await activarDemo(pagina);
  await recorrerFins(pagina, 3);

  const objectiusInicials = await pagina.evaluate(() => ESTAT_CONTE.escaleta.escenes.map(e => e.caracters_objectiu));

  // S'escriu una primera escena deliberadament curta i es compensa per codi.
  const cridesAbans = await pagina.evaluate(() => LLM_CLIENT.comptador.crides);
  await pagina.evaluate(() => {
    ESTAT_CONTE.escenes_text[0] = 'Text curt a propòsit.';
    compensarPressupost(0);
  });
  const objectiusDespres = await pagina.evaluate(() => ESTAT_CONTE.escaleta.escenes.map(e => e.caracters_objectiu));

  comprova('una escena curta redistribueix el dèficit a les següents',
    objectiusDespres.slice(1).reduce((a, b) => a + b, 0) > objectiusInicials.slice(1).reduce((a, b) => a + b, 0),
    `${JSON.stringify(objectiusInicials)} → ${JSON.stringify(objectiusDespres)}`);
  comprova('la compensació és per codi i no gasta cap crida',
    await pagina.evaluate(() => LLM_CLIENT.comptador.crides) === cridesAbans);
  comprova('la compensació ho registra com a avís en lloc d\'amagar-ho',
    await pagina.evaluate(() => ESTAT_CONTE.avisos.some(a => /repartit entre les escenes/.test(a))));

  // Una escena llarga fa el contrari.
  await pagina.evaluate(() => {
    ESTAT_CONTE.escenes_text[1] = 'x'.repeat(9000);
    compensarPressupost(1);
  });
  const desprésLlarga = await pagina.evaluate(() => ESTAT_CONTE.escaleta.escenes.map(e => e.caracters_objectiu));
  comprova('una escena llarga redueix el pressupost de les següents',
    desprésLlarga.slice(2).reduce((a, b) => a + b, 0) < objectiusDespres.slice(2).reduce((a, b) => a + b, 0),
    `${JSON.stringify(objectiusDespres)} → ${JSON.stringify(desprésLlarga)}`);
  comprova('cap escena queda amb un pressupost inservible',
    desprésLlarga.every(x => x >= 600), JSON.stringify(desprésLlarga));
  await pagina.close();
}

// ── Conte massa curt: la crida B s'activa una sola vegada ────────────────────
{
  const { pagina } = await obrirApp(navegador);
  await activarDemo(pagina);
  await recorrerFins(pagina, 4);

  await pagina.evaluate(() => {
    ESTAT_CONTE.escenes_text = ESTAT_CONTE.escenes_text.map(t => t.slice(0, 1200));
    ESTAT_CONTE.text_conte = '';
    renderitzar();
  });
  const curt = await pagina.evaluate(() => CONTE_CORE.comptaCaracters(textActual()));
  comprova('el conte de prova queda per sota del mínim', curt < 15000, `${curt} caràcters`);

  const abans = await pagina.evaluate(() => (LLM_CLIENT.comptador.per_pas.costura || {}).crides || 0);
  for (let i = 0; i < 4; i++) {
    await pagina.evaluate(() => accio('b-costura-b', costuraLongitud));
    await pagina.waitForTimeout(350);
  }
  const despres = await pagina.evaluate(() => (LLM_CLIENT.comptador.per_pas.costura || {}).crides || 0);
  comprova('l\'ajust de longitud s\'activa quan el conte és curt', despres > abans);
  comprova('l\'ajust de longitud mai passa de 2 crides encara que es forci quatre vegades',
    despres <= 2, `${despres} crides`);

  await pagina.evaluate(() => { ESTAT_CONTE.pas_obert = 5; renderitzar(); });
  const textP5 = await pagina.locator('#pas-5').innerText();
  comprova('la UI reporta que segueix fora d\'interval en lloc d\'amagar-ho',
    /Dins de l'interval[\s\S]{0,20}no/.test(textP5) || textP5.includes('interval vàlid') || textP5.includes('caràcters i l\'interval'),
    textP5.slice(0, 200));
  comprova('amb el pas esgotat i el text fora d\'interval, hi ha acció de resolució',
    (await pagina.locator('#pas-5 .blocatge button').count()) >= 1);
  const accions = await pagina.locator('#pas-5 .blocatge button').allInnerTexts();
  comprova('les accions ofertes són editar a mà o acceptar-ho',
    accions.some(a => /a mà/i.test(a)) && accions.some(a => /Accepta/i.test(a)), accions.join(' | '));
  await pagina.close();
}

// ── Conte massa llarg ────────────────────────────────────────────────────────
{
  const { pagina } = await obrirApp(navegador);
  await activarDemo(pagina);
  await recorrerFins(pagina, 4);

  await pagina.evaluate(() => {
    ESTAT_CONTE.escenes_text = ESTAT_CONTE.escenes_text.map(t => t + '\n\n' + t + '\n\n' + t);
    ESTAT_CONTE.text_conte = '';
    renderitzar();
  });
  const llarg = await pagina.evaluate(() => CONTE_CORE.comptaCaracters(textActual()));
  comprova('el conte de prova queda per sobre del màxim', llarg > 20000, `${llarg} caràcters`);

  for (let i = 0; i < 4; i++) {
    await pagina.evaluate(() => accio('b-costura-b', costuraLongitud));
    await pagina.waitForTimeout(350);
  }
  comprova('amb un conte llarg l\'ajust tampoc passa de 2 crides',
    await pagina.evaluate(() => (LLM_CLIENT.comptador.per_pas.costura || {}).crides || 0) <= 2);

  const aud = await pagina.evaluate(() => { executarAuditoria(); return ESTAT_CONTE.auditoria; });
  comprova('l\'auditoria reporta la longitud fora d\'interval amb la xifra exacta',
    aud.problemes.some(p => p.id === 'longitud' && /caràcters per sobre del màxim/.test(p.detall)),
    JSON.stringify(aud.problemes.filter(p => p.id === 'longitud')));
  await pagina.close();
}

// ── Distribució: quants contes cauen dins d'interval sense intervenció ───────
// La suma del repartiment sempre quadra, així que el risc real és la desviació
// del model. Es simulen cinc contes amb desviacions diferents per escena.
const desviacions = [
  [1.0, 1.0, 1.0, 1.0, 1.0],
  [0.85, 1.1, 0.95, 1.05, 1.0],
  [1.15, 0.9, 1.1, 0.95, 1.0],
  [0.8, 0.9, 1.0, 1.1, 1.2],
  [1.2, 1.15, 1.1, 0.9, 0.85]
];
let dins = 0;
desviacions.forEach(d => {
  const objectius = C.repartirCaracters(C.CONTE_OBJECTIU_CARACTERS, 5);
  let acumulat = 0;
  const restants = objectius.slice();
  for (let i = 0; i < 5; i++) {
    const reals = Math.round(restants[i] * d[i]);
    acumulat += reals;
    // Compensació per codi, igual que a l'app.
    const pendents = 5 - i - 1;
    if (pendents > 0) {
      const queda = Math.max(pendents * 600, C.CONTE_OBJECTIU_CARACTERS - acumulat);
      const nou = C.repartirCaracters(queda, pendents);
      nou.forEach((v, j) => { restants[i + 1 + j] = v; });
    }
  }
  if (acumulat >= C.CONTE_MIN_CARACTERS && acumulat <= C.CONTE_MAX_CARACTERS) dins += 1;
});
comprova('la majoria de contes simulats cauen dins d\'interval sense intervenció',
  dins >= 4, `${dins} de 5`);

await navegador.close();
acabar();
