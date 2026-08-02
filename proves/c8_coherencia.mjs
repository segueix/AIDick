// c8 — Coherència global post-edició.
//
// aplicarPedacos garanteix que cada pedaç s'aplica on toca. Aquesta passada
// comprova la resta del text, que és on van aparèixer els destrosses reals:
// una classificació canviada en un lloc i encara citada en un altre, una frase
// duplicada, unes clàusules que justificaven unes opcions esborrades.
//
// Cada comprovació porta el cas que ha de detectar I el cas legítim que s'hi
// assembla. Un validador que es queixa de text correcte és pitjor que no
// tenir-lo: la gent n'aprèn a ignorar l'avís.
import { crearComptador, carregarPlaywright, obrirApp, activarDemo, recorrerFins } from './ajudes/comprova.mjs';
import { carregarNucliConte, llegirFitxer } from './ajudes/carrega_moduls.mjs';

const { comprova, acabar } = crearComptador();
const { CONTE_CORE: C } = carregarNucliConte();

const problemesDe = (informe, criteri) => informe.problemes.filter(p => p.criteri === criteri);
const comprovacioDe = (informe, id) => informe.comprovacions.find(c => c.id === id);

// Text base prou llarg perquè les comprovacions treballin sobre un conte, no
// sobre quatre línies. Les deu frases són prou diferents entre elles perquè el
// farciment no dispari cap detector pel seu compte, i es repeteixen a deu
// paràgrafs de distància, molt per sobre del llindar de proximitat.
// No arriba al mínim de 15.000: la comprovació de longitud es prova a part.
const FARCIMENT = [
  'Halloran va obrir el calaix inferior i va comptar les fitxes que quedaven sense classificar.',
  'El ventilador del sostre es va aturar un instant i va tornar a engegar-se amb un espetec sec.',
  'A la finestreta hi havia dues persones esperant amb la mateixa carpeta verda a la mà.',
  'Devereux baixava cada matí al semisoterrani amb un davantal gris que no era reglamentari.',
  'La màquina de segells duia setmanes deixant l\'empremta incompleta i ningú no la reparava.',
  'Farrow mantenia la porta oberta perquè es veiés que la mantenia oberta.',
  'Els fluorescents brunzien quan el pis quedava buit i abans no se sentien.',
  'Va telefonar a verificació i va comptar els segons que trigaven a contestar-li.',
  'Al taulell hi quedava un formulari mig omplert que no era de ningú conegut.',
  'La cafetera de la planta cobrava el doble des del canvi de proveïdor de gener.'
];
const paragraf = (n) => FARCIMENT[n % FARCIMENT.length];
const base = Array.from({ length: 40 }, (_, i) => paragraf(i)).join('\n\n');

// Dossier de referència: el vocabulari canònic del conte surt d'aquí.
const dossierAmbObjecte = {
  objectes_clau: [
    { nom: 'La carpeta de cartró', on_es: 'Al calaix', per_a_que: 'Hi guarda el que no té explicació' },
    { nom: 'L\'armari metàl·lic gris', on_es: 'Al pis buit', per_a_que: 'Conté les fitxes actives' }
  ]
};

// ── 1. Frases duplicades ─────────────────────────────────────────────────────
const ambDuplicat = 'Va abaixar la palanca de Willow Avenue.\n\nVa abaixar la palanca de Willow Avenue.\n\n' + base;
const dup = C.validarCoherenciaGlobal(ambDuplicat, {});
comprova('detecta la mateixa frase repetida en paràgrafs seguits',
  problemesDe(dup, 'frases_duplicades').length === 1,
  JSON.stringify(problemesDe(dup, 'frases_duplicades')));
comprova('la frase duplicada es reporta amb severitat alta i amb la cita',
  problemesDe(dup, 'frases_duplicades')[0].severitat === 'alta' &&
  problemesDe(dup, 'frases_duplicades')[0].cita.includes('palanca'));

const quasiIgual = 'Va abaixar la palanca de Willow Avenue aquella nit.\n\nVa abaixar la palanca de Willow Avenue aquell vespre.\n\n' + base;
comprova('detecta dues frases quasi idèntiques',
  problemesDe(C.validarCoherenciaGlobal(quasiIgual, {}), 'frases_duplicades').length === 1);

// Cas legítim A: la mateixa frase lluny, que en un conte de Dick és una represa
// deliberada d'una fórmula administrativa.
const lluny = 'Va abaixar la palanca de Willow Avenue.\n\n' + base + '\n\nVa abaixar la palanca de Willow Avenue.';
comprova('NO marca la mateixa frase a més de tres paràgrafs de distància',
  problemesDe(C.validarCoherenciaGlobal(lluny, {}), 'frases_duplicades').length === 0);

// Cas legítim B: rèpliques curtes de diàleg, que es repeteixen per força.
const dialeg = '—Sí, senyor.\n\n—Sí, senyor.\n\n—Un moment.\n\n—Un moment.\n\n' + base;
comprova('NO marca les rèpliques curtes de diàleg repetides',
  problemesDe(C.validarCoherenciaGlobal(dialeg, {}), 'frases_duplicades').length === 0);

// Cas legítim C: dues frases del mateix tema amb contingut diferent.
const mateixTema = 'Va comprovar el número de sèrie de l\'imprès que tenia a la safata.\n\nVa comparar el segell d\'entrada amb el que duia la còpia del març.\n\n' + base;
comprova('NO marca dues frases del mateix tema amb contingut diferent',
  problemesDe(C.validarCoherenciaGlobal(mateixTema, {}), 'frases_duplicades').length === 0);

// ── 2. Referències trencades ─────────────────────────────────────────────────
// El cas documentat: la revisió canvia la classificació impresa i deixa quatre
// línies més avall una frase que parla de la paraula que ja no hi és.
const abansRef = 'La tira deia HOLLOWAY, DENISE. HABITATGE i prou.\n\n' +
  'Va doblegar la tira fins que la paraula habitatge va desaparèixer sota el polze.\n\n' +
  'A l\'expedient hi constava com a habitatge sinistrat des del mes de març.\n\n' + base;
const despresRef = abansRef.replace('HOLLOWAY, DENISE. HABITATGE', 'FITXA ACTIVA');
const ref = C.validarCoherenciaGlobal(despresRef, {
  textAnterior: abansRef,
  pedacos: [{ cerca: 'HOLLOWAY, DENISE. HABITATGE', substitueix: 'FITXA ACTIVA' }]
});
comprova('detecta el terme que l\'edició ha tret i que encara apareix al text',
  problemesDe(ref, 'referencies_trencades').some(p => p.camp.includes('habitatge')),
  JSON.stringify(problemesDe(ref, 'referencies_trencades').map(p => p.camp)));
comprova('la referència trencada és d\'alta severitat i porta la cita del text que queda penjat',
  problemesDe(ref, 'referencies_trencades')[0].severitat === 'alta' &&
  problemesDe(ref, 'referencies_trencades')[0].cita.length > 0);

// Cas legítim A: el terme tret no torna a sortir enlloc.
const abansNet = 'La tira deia FITXA PROVISIONAL i prou.\n\n' + base;
comprova('NO marca res si el terme tret no apareix en cap altre lloc',
  problemesDe(C.validarCoherenciaGlobal(abansNet.replace('FITXA PROVISIONAL', 'FITXA ACTIVA'), {
    textAnterior: abansNet,
    pedacos: [{ cerca: 'FITXA PROVISIONAL', substitueix: 'FITXA ACTIVA' }]
  }), 'referencies_trencades').length === 0);

// Cas legítim B: un pedaç d'estil que canvia vocabulari corrent. Dotze pedaços
// de costura en fan dotze de canvis així; si cadascun generés un avís, els
// avisos deixarien de significar res.
const abansVocab = base + '\n\nVa obrir el calaix número 41 i va comptar les fitxes.';
const despresVocab = abansVocab.replace('Va obrir el calaix número 41 i va comptar les fitxes.', 'Va obrir la caixa número 41 i va comptar els fulls.');
comprova('NO marca el vocabulari corrent que un pedaç d\'estil canvia de lloc',
  problemesDe(C.validarCoherenciaGlobal(despresVocab, {
    textAnterior: abansVocab,
    pedacos: [{ cerca: 'Va obrir el calaix número 41 i va comptar les fitxes.', substitueix: 'Va obrir la caixa número 41 i va comptar els fulls.' }]
  }), 'referencies_trencades').length === 0,
  JSON.stringify(problemesDe(C.validarCoherenciaGlobal(despresVocab, {
    textAnterior: abansVocab,
    pedacos: [{ cerca: 'Va obrir el calaix número 41 i va comptar les fitxes.', substitueix: 'Va obrir la caixa número 41 i va comptar els fulls.' }]
  }), 'referencies_trencades').map(p => p.camp)));

// Cas legítim C: un nom propi que surt a tot el conte. Treure'l d'una frase per
// substituir-lo per un pronom no trenca cap cadena.
const abansNom = Array.from({ length: 12 }, () => 'Halloran va tornar a la seva taula sense dir res a ningú.').join('\n\n') +
  '\n\nHalloran va obrir la safata del matí i va comptar-ne els documents.';
const despresNom = abansNom.replace('Halloran va obrir la safata del matí i va comptar-ne els documents.', 'Va obrir la safata del matí i va comptar-ne els documents.');
comprova('NO marca un nom propi que surt a tot el conte',
  problemesDe(C.validarCoherenciaGlobal(despresNom, {
    textAnterior: abansNom,
    pedacos: [{ cerca: 'Halloran va obrir la safata del matí i va comptar-ne els documents.', substitueix: 'Va obrir la safata del matí i va comptar-ne els documents.' }]
  }), 'referencies_trencades').length === 0);

// Cas que SÍ que s'ha de detectar: un objecte clau del dossier tret d'un lloc i
// encara citat en un altre. El vocabulari canònic surt del dossier, que és
// l'única font de veritat narrativa del conte.
const abansCanonic = base +
  '\n\nVa desar els dos impresos dins de la carpeta de cartró que tenia al calaix.' +
  '\n\nA la carpeta hi havia quinze documents i cap d\'ells tenia explicació.';
const despresCanonic = abansCanonic.replace(
  'Va desar els dos impresos dins de la carpeta de cartró que tenia al calaix.',
  'Va desar els dos impresos dins d\'un sobre tancat que tenia al calaix.');
comprova('SÍ que marca un objecte clau del dossier tret d\'un lloc i citat en un altre',
  problemesDe(C.validarCoherenciaGlobal(despresCanonic, {
    textAnterior: abansCanonic,
    dossier: dossierAmbObjecte,
    pedacos: [{
      cerca: 'Va desar els dos impresos dins de la carpeta de cartró que tenia al calaix.',
      substitueix: 'Va desar els dos impresos dins d\'un sobre tancat que tenia al calaix.'
    }]
  }), 'referencies_trencades').some(p => p.camp.includes('carpeta')));

// Sense context d'edició, la comprovació NO es dona per bona: es declara no
// executada. Una comprovació que no s'ha fet no és una comprovació que passa.
const senseContext = C.validarCoherenciaGlobal(despresRef, {});
comprova('sense context d\'edició, referències trencades es declara NO executada',
  comprovacioDe(senseContext, 'referencies_trencades').executada === false &&
  !!comprovacioDe(senseContext, 'referencies_trencades').motiu_no_executada);
comprova('sense context d\'edició, clàusules òrfenes també es declara NO executada',
  comprovacioDe(senseContext, 'clausules_orfenes').executada === false);
comprova('les tres comprovacions que no depenen de l\'edició sí que s\'executen sempre',
  ['frases_duplicades', 'setups_sense_pagament', 'longitud']
    .every(id => comprovacioDe(senseContext, id).executada === true));

// ── 3. Setups sense pagament ─────────────────────────────────────────────────
const textAmbObjectes = base +
  '\n\nLa carpeta de cartró era al calaix inferior.' +
  '\n\nVa tornar a obrir la carpeta i va comptar-ne els documents.' +
  '\n\nA la carpeta hi havia quinze papers sense explicació.' +
  '\n\nL\'armari metàl·lic era al fons de l\'habitació buida.';
const setups = C.validarCoherenciaGlobal(textAmbObjectes, { dossier: dossierAmbObjecte });
comprova('detecta l\'objecte clau que apareix una sola vegada',
  problemesDe(setups, 'setups_sense_pagament').some(p => p.camp.includes('armari')),
  JSON.stringify(problemesDe(setups, 'setups_sense_pagament').map(p => p.camp)));
comprova('NO marca l\'objecte clau que es recupera tres vegades',
  !problemesDe(setups, 'setups_sense_pagament').some(p => p.camp.includes('carpeta')));

// El cas documentat: una amenaça anunciada amb horari que no torna mai.
const ambAnunci = 'Després de mitjanit el sistema de ventilació allibera un sedant i ningú no hi pot fer res.\n\n' + base;
comprova('detecta el que s\'anuncia amb condició o horari i no torna mai',
  problemesDe(C.validarCoherenciaGlobal(ambAnunci, {}), 'setups_sense_pagament')
    .some(p => p.detall.includes('ventilació')),
  JSON.stringify(problemesDe(C.validarCoherenciaGlobal(ambAnunci, {}), 'setups_sense_pagament').map(p => p.detall)));
comprova('l\'anunci sense pagament es marca com a heurística i amb severitat baixa',
  problemesDe(C.validarCoherenciaGlobal(ambAnunci, {}), 'setups_sense_pagament')
    .filter(p => p.detall.includes('ventilació'))
    .every(p => p.heuristica === true && p.severitat === 'baixa'));

comprova('també detecta l\'anunci que comença amb una condició',
  problemesDe(C.validarCoherenciaGlobal(
    'Si el nivell baixa, la comporta del dipòsit es tanca sola i no la pot tornar a obrir ningú.\n\n' + base, {}),
    'setups_sense_pagament').some(p => p.detall.includes('comporta')));

// Cas legítim: una paraula llarga que surt un sol cop dins d'una descripció
// normal, sense cap marca d'anunci. Un conte de 18.000 caràcters en té desenes.
const descripcioNormal = 'El passadís feia una llum groga que ho aplanava tot i olor de pols escalfada.\n\n' + base;
comprova('NO marca una paraula llarga que surt un cop en una frase descriptiva',
  problemesDe(C.validarCoherenciaGlobal(descripcioNormal, {}), 'setups_sense_pagament').length === 0,
  JSON.stringify(problemesDe(C.validarCoherenciaGlobal(descripcioNormal, {}), 'setups_sense_pagament').map(p => p.detall)));

// Cas legítim, i el més car de tots: les subordinades amb «si» i «quan» al mig
// de la frase. Amb el marcador sense ancorar a l'inici, tres contes reals de
// 18.000 caràcters van donar trenta-nou avisos i els trenta-nou eren falsos.
const subordinades =
  'El Merle va arronsar les espatlles amb una satisfacció íntima, com si acabés de guanyar una cosa petita.\n\n' +
  'El pis feia olor de la fregidora del bar de sota, que era una olor que ja no notava excepte quan tornava d\'algun lloc molt fred.\n\n' +
  'Feia el fred sec de finals de febrer, el que et deixa els dits sense sensibilitat abans que et facin mal.\n\n' + base;
comprova('NO marca les subordinades amb «si», «quan» o «abans que» al mig de la frase',
  problemesDe(C.validarCoherenciaGlobal(subordinades, {}), 'setups_sense_pagament').length === 0,
  JSON.stringify(problemesDe(C.validarCoherenciaGlobal(subordinades, {}), 'setups_sense_pagament').map(p => p.detall)));

// Cas legítim: una hora concreta obre narració, no anuncia res. Un conte
// estructurat per hores en té una a cada escena.
const ambHora = 'A les 23.40 entra la sisena trucada de la nit i cap de les sis no és una urgència.\n\n' + base;
comprova('NO marca una frase que comença amb una hora concreta',
  problemesDe(C.validarCoherenciaGlobal(ambHora, {}), 'setups_sense_pagament').length === 0,
  JSON.stringify(problemesDe(C.validarCoherenciaGlobal(ambHora, {}), 'setups_sense_pagament').map(p => p.detall)));

// ── 4. Clàusules òrfenes ─────────────────────────────────────────────────────
// El cas documentat: s'esborren les opcions i es queden les clàusules que les
// justificaven.
const abansOrfe = base +
  '\n\nTenia dues sortides: la reclamació ordinària o el recurs extraordinari de la Junta.' +
  '\n\nPerquè el recurs extraordinari trigava sis mesos i ell no tenia sis mesos.';
const despresOrfe = abansOrfe.replace(
  'Tenia dues sortides: la reclamació ordinària o el recurs extraordinari de la Junta.',
  'Tenia una sola sortida i ho sabia des del primer dia.');
const orfe = C.validarCoherenciaGlobal(despresOrfe, {
  textAnterior: abansOrfe,
  pedacos: [{
    cerca: 'Tenia dues sortides: la reclamació ordinària o el recurs extraordinari de la Junta.',
    substitueix: 'Tenia una sola sortida i ho sabia des del primer dia.'
  }]
});
comprova('detecta la clàusula que justifica una cosa que l\'edició ha esborrat',
  problemesDe(orfe, 'clausules_orfenes').length >= 1,
  JSON.stringify(problemesDe(orfe, 'clausules_orfenes')));
comprova('la clàusula òrfena porta la cita i el connector que la delata',
  problemesDe(orfe, 'clausules_orfenes')[0].cita.toLowerCase().includes('perquè') &&
  problemesDe(orfe, 'clausules_orfenes')[0].heuristica === true);

// Cas legítim: una reescriptura que no esborra cap terme del conte. La frase
// justificativa segueix tenint a què referir-se i no s'ha de marcar.
const abansRefres = base +
  '\n\nTenia dues sortides: la reclamació ordinària o el recurs extraordinari de la Junta.' +
  '\n\nPerquè el recurs extraordinari trigava sis mesos i ell no tenia sis mesos.';
const despresRefres = abansRefres.replace(
  'Perquè el recurs extraordinari trigava sis mesos i ell no tenia sis mesos.',
  'Perquè el recurs extraordinari trigava mig any i ell no tenia mig any.');
comprova('NO marca la clàusula si l\'edició no ha esborrat res del que justificava',
  problemesDe(C.validarCoherenciaGlobal(despresRefres, {
    textAnterior: abansRefres,
    pedacos: [{
      cerca: 'Perquè el recurs extraordinari trigava sis mesos i ell no tenia sis mesos.',
      substitueix: 'Perquè el recurs extraordinari trigava mig any i ell no tenia mig any.'
    }]
  }), 'clausules_orfenes').length === 0);

// ── 5. Comptador de caràcters ────────────────────────────────────────────────
const curt = C.validarCoherenciaGlobal(base, {});
comprova('un text per sota del mínim es reporta amb els caràcters que falten',
  problemesDe(curt, 'longitud').length === 1 &&
  problemesDe(curt, 'longitud')[0].detall.includes('per sota del mínim'));
comprova('el comptador de la passada és el mateix comptaCaracters de tot el projecte',
  curt.caracters === C.comptaCaracters(base) && curt.dins_interval === false);

const dinsInterval = Array.from({ length: 200 }, (_, i) => paragraf(i % 40)).join('\n\n').slice(0, 16000);
comprova('un text dins de l\'interval no reporta cap problema de longitud',
  problemesDe(C.validarCoherenciaGlobal(dinsInterval, {}), 'longitud').length === 0 &&
  C.validarCoherenciaGlobal(dinsInterval, {}).dins_interval === true);

// ── Forma de l'informe ───────────────────────────────────────────────────────
comprova('CRITERIS_COHERENCIA_GLOBAL són els cinc de l\'encàrrec',
  C.CRITERIS_COHERENCIA_GLOBAL.length === 5 &&
  ['frases_duplicades', 'referencies_trencades', 'setups_sense_pagament', 'clausules_orfenes', 'longitud']
    .every(id => C.CRITERIS_COHERENCIA_GLOBAL.some(c => c.id === id)));
comprova('cada criteri diu què detecta i si necessita context d\'edició',
  C.CRITERIS_COHERENCIA_GLOBAL.every(c => c.nom && c.que_detecta && typeof c.necessita_edicio === 'boolean'));
comprova('l\'informe diu sempre que s\'ha executat sobre el text sencer',
  curt.sobre === 'text sencer');
comprova('tot problema porta o cita o camp, com a l\'auditoria',
  [dup, ref, setups, orfe, curt].every(i => i.problemes.every(p => p.cita || p.camp)));
comprova('cap criteri no pot inundar l\'informe',
  (() => {
    const molts = Array.from({ length: 30 }, () => 'Va abaixar la palanca de Willow Avenue.').join('\n\n');
    return problemesDe(C.validarCoherenciaGlobal(molts, {}), 'frases_duplicades').length <= 6;
  })());
comprova('validarCoherenciaGlobal no peta amb entrades buides',
  (() => {
    try {
      C.validarCoherenciaGlobal('', {});
      C.validarCoherenciaGlobal(null, null);
      C.validarCoherenciaGlobal(undefined, { pedacos: [null], textAnterior: '' });
      return true;
    } catch (e) { return false; }
  })());

// ── Que cap edició se la pugui saltar ────────────────────────────────────────
const app = llegirFitxer('index.html');
comprova('aplicarPedacos només es crida des d\'aplicarLotDePedacos',
  (app.match(/NUCLI\.aplicarPedacos\(/g) || []).length === 1 &&
  /function aplicarLotDePedacos[\s\S]{0,400}NUCLI\.aplicarPedacos\(/.test(app));
comprova('aplicarLotDePedacos crida sempre la validació de coherència',
  /function aplicarLotDePedacos[\s\S]{0,900}executarCoherencia\(/.test(app));
comprova('l\'edició a mà del text també passa per la validació',
  /function editarTextAMa[\s\S]{0,400}executarCoherencia\(/.test(app) &&
  app.includes('onchange="editarTextAMa(this.value)"'));

// ── Sobre l'app real, amb el pipeline de debò ────────────────────────────────
const { chromium } = carregarPlaywright();
const navegador = await chromium.launch();
const { pagina, errors } = await obrirApp(navegador);
await activarDemo(pagina);
await recorrerFins(pagina, 5);

const desprésDeCostura = await pagina.evaluate(() => ESTAT_CONTE.coherencia);
comprova('la costura d\'estil dispara la validació sola, sense tocar cap botó',
  !!desprésDeCostura && desprésDeCostura.origen === "costura d'estil");
comprova('la validació s\'executa sobre el text sencer i no sobre el fragment editat',
  await pagina.evaluate(() =>
    ESTAT_CONTE.coherencia.caracters === CONTE_CORE.comptaCaracters(textActual()) &&
    ESTAT_CONTE.coherencia.sobre === 'text sencer'));
comprova('amb pedaços aplicats, les cinc comprovacions s\'executen',
  desprésDeCostura.amb_context_d_edicio === true &&
  desprésDeCostura.comprovacions.every(c => c.executada));
comprova('la validació no gasta cap crida',
  await pagina.evaluate(() => {
    const abans = LLM_CLIENT.comptador.crides;
    executarCoherencia({ origen: 'prova' });
    return LLM_CLIENT.comptador.crides === abans;
  }));

const abansEdicio = await pagina.evaluate(() => LLM_CLIENT.comptador.crides);
await pagina.evaluate(() => editarTextAMa(textActual() + '\n\nVa abaixar la palanca de Willow Avenue.\n\nVa abaixar la palanca de Willow Avenue.'));
const desprésEdicio = await pagina.evaluate(() => ESTAT_CONTE.coherencia);
comprova('l\'edició a mà torna a disparar la validació',
  desprésEdicio.origen === 'edició a mà');
comprova('la validació troba el duplicat que acaba d\'introduir l\'edició a mà',
  desprésEdicio.problemes.some(p => p.criteri === 'frases_duplicades' && p.cita.includes('palanca')),
  JSON.stringify(desprésEdicio.problemes.map(p => p.criteri)));
comprova('sense llista de pedaços, l\'edició a mà declara les dues comprovacions no executades',
  desprésEdicio.comprovacions.filter(c => !c.executada).length === 2);
comprova('tampoc l\'edició a mà gasta cap crida',
  await pagina.evaluate(() => LLM_CLIENT.comptador.crides) === abansEdicio);

comprova('la coherència global viatja a les metadades exportades',
  await pagina.evaluate(() => {
    const m = metadadesConte();
    return !!m.coherencia_global && m.coherencia_global.executada_sobre === 'text sencer' &&
      Array.isArray(m.coherencia_global.comprovacions) && m.coherencia_global.comprovacions.length === 5;
  }));

comprova('cap error de consola ni cap excepció mentre es renderitza l\'informe',
  errors.length === 0, errors.join(' | '));

await navegador.close();
acabar();
