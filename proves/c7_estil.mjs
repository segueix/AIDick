// c7 — Separació entre generar i avaluar.
//
// La regla és una i és la més fàcil de trencar sense adonar-se'n: cap cadena de
// criteris_avaluacio_conte pot arribar a un prompt de generació. Si un criteri
// d'avaluació hi arriba, l'examen mesura el seu propi enunciat i el veredicte
// deixa de valdre.
//
// El camí invers també importa: criteris_excellencia_conte SÍ que ha d'arribar
// al prompt de redacció; si no hi arriba, l'estil PKD no s'aplica i el conte
// surt genèric.
import { crearComptador, carregarPlaywright, obrirApp, activarDemo, recorrerFins } from './ajudes/comprova.mjs';
import { carregarNucliConte, llegirGlobal, llegirFitxer } from './ajudes/carrega_moduls.mjs';

const { comprova, acabar } = crearComptador();
const { PERFILS_AUTOR: P } = carregarNucliConte();

// ── El perfil ────────────────────────────────────────────────────────────────
comprova('el perfil dick té el subobjecte conte', !!P.dick.conte);
comprova('conte porta forma, obertura, desenllac i les dues llistes',
  ['forma', 'obertura', 'desenllac', 'criteris_excellencia_conte', 'criteris_avaluacio_conte']
    .every(k => P.dick.conte[k]));
comprova('els camps originals del perfil dick són intactes',
  ['estil', 'regles_dures', 'prosa', 'exposicio', 'emocio', 'intensitat', 'humanitzacio',
   'criteris_avaluacio', 'criteris_excellencia', 'ambientacio', 'prefill', 'deteccio'].every(k => P.dick[k]));
comprova('la regex de detecció de dick no ha canviat',
  String(P.dick.deteccio) === String(/philip\s*k\.?\s*dick|philip\s+dick|\bdick\b/i));
comprova('els altres tres perfils segueixen sencers',
  ['larsson', 'tolkien', 'castaneda'].every(id => P[id] && P[id].estil && P[id].criteris_excellencia));
comprova('dick és el perfil per defecte', llegirGlobal('PERFIL_AUTOR_PER_DEFECTE') === 'dick');
comprova('cap criteri apareix a les dues llistes alhora',
  !P.dick.conte.criteris_excellencia_conte.some(x => P.dick.conte.criteris_avaluacio_conte.includes(x)));
comprova('els accessors de generació i d\'avaluació són funcions diferents',
  llegirGlobal('criterisExcellenciaConte') !== llegirGlobal('criterisAvaluacioConte'));

// ── Anàlisi estàtica del codi de l'app ───────────────────────────────────────
const app = llegirFitxer('index.html');
comprova('criterisAvaluacioConte només es crida des de blocSistemaLectura',
  (app.match(/criterisAvaluacioConte\(/g) || []).length === 1 &&
  /function blocSistemaLectura[\s\S]{0,600}criterisAvaluacioConte\(/.test(app),
  String((app.match(/criterisAvaluacioConte\(/g) || []).length) + ' crides');
comprova('blocSistemaGeneracio no menciona mai criterisAvaluacioConte',
  !/function blocSistemaGeneracio[\s\S]*?\n}/.exec(app)[0].includes('criterisAvaluacioConte'));
// Es compten els punts de CRIDA, descartant la definició de la funció.
const cridesLectura = (app.match(/blocSistemaLectura\(\)/g) || []).length
  - (app.match(/function\s+blocSistemaLectura\(\)/g) || []).length;
comprova('blocSistemaLectura només es crida des d\'un lloc', cridesLectura === 1, `${cridesLectura} crides`);
comprova('l\'únic lloc que la crida és el pas de lectura hostil',
  /async function lecturaHostil\([\s\S]{0,800}blocSistemaLectura\(\)/.test(app));

// ── Els prompts muntats de debò, no el codi que els munta ────────────────────
const { chromium } = carregarPlaywright();
const navegador = await chromium.launch();
const { pagina } = await obrirApp(navegador);
await activarDemo(pagina);
await recorrerFins(pagina, 4);

const prompts = await pagina.evaluate(() => ({
  llavor: { sistema: blocSistemaGeneracio({ forma: true }), usuari: promptLlavors(CONTE_CORE.triarMotius([], 3)) },
  dossier: { sistema: blocSistemaGeneracio({ forma: true }), usuari: promptDossier() },
  escaleta: { sistema: blocSistemaGeneracio({ forma: true, obertura: true, desenllac: true }), usuari: promptEscaleta() },
  escena: { sistema: blocSistemaGeneracio({ prosa: true, forma: true, excellencia: true }), usuari: promptEscena(0) },
  escenaFinal: { sistema: blocSistemaGeneracio({ prosa: true, forma: true, excellencia: true }), usuari: promptEscena(ESTAT_CONTE.escaleta.escenes.length - 1) },
  costura: { sistema: blocSistemaGeneracio({ corrector: true, forma: false }), usuari: promptCosturaEstil(textActual()) },
  pedac: {
    sistema: blocSistemaGeneracio({ corrector: true, forma: false }),
    usuari: promptPedacDirigit(textActual(), [{ cita: 'Va comprovar la data.', per_que: 'verb repetit' }])
  },
  lectura: { sistema: blocSistemaLectura(), usuari: promptLectura(textActual()) }
}));

const avaluacio = P.dick.conte.criteris_avaluacio_conte;
const excellencia = P.dick.conte.criteris_excellencia_conte;

['llavor', 'dossier', 'escaleta', 'escena', 'escenaFinal', 'costura'].forEach(pas => {
  const sencer = prompts[pas].sistema + '\n' + prompts[pas].usuari;
  const filtrats = avaluacio.filter(c => sencer.includes(c));
  comprova(`cap criteri d'avaluació arriba al prompt de ${pas}`,
    filtrats.length === 0, filtrats.join(' | '));
});

// Els criteris d'avaluació són preguntes; que no n'hi arribi ni el fragment.
['llavor', 'dossier', 'escaleta', 'escena', 'costura'].forEach(pas => {
  const sencer = prompts[pas].sistema + '\n' + prompts[pas].usuari;
  const fragments = avaluacio.map(c => c.split(/[,?]/)[0].trim()).filter(f => f.length > 25);
  const trobats = fragments.filter(f => sencer.includes(f));
  comprova(`ni un fragment llarg d'un criteri d'avaluació apareix al prompt de ${pas}`,
    trobats.length === 0, trobats.join(' | '));
});

comprova('els criteris d\'avaluació SÍ que arriben al prompt de lectura',
  avaluacio.every(c => prompts.lectura.sistema.includes(c)));
comprova('els criteris d\'excel·lència arriben al prompt de redacció',
  excellencia.every(c => prompts.escena.sistema.includes(c)),
  excellencia.filter(c => !prompts.escena.sistema.includes(c)).join(' | '));
comprova('els criteris d\'excel·lència NO arriben al prompt de lectura',
  !excellencia.some(c => prompts.lectura.sistema.includes(c)));

// ── El contingut dels prompts de redacció ────────────────────────────────────
comprova('el prompt d\'escena porta la forma del conte PKD',
  prompts.escena.sistema.includes(P.dick.conte.forma.slice(0, 60)));
comprova('la primera escena rep les regles d\'obertura',
  prompts.escena.usuari.includes(P.dick.conte.obertura.slice(0, 50)));
comprova('l\'última escena rep les regles de desenllaç i el final obligatori',
  prompts.escenaFinal.usuari.includes(P.dick.conte.desenllac.slice(0, 50)) &&
  prompts.escenaFinal.usuari.includes('final obligatori'));
comprova('la primera escena NO rep les regles de desenllaç',
  !prompts.escena.usuari.includes(P.dick.conte.desenllac.slice(0, 50)));
comprova('el prompt d\'escena demana la longitud en CARÀCTERS',
  /\d+ CARÀCTERS amb espais/.test(prompts.escena.usuari) && prompts.escena.usuari.includes('No comptis paraules'));
comprova('el prompt d\'escena imposa el guió llarg com a format únic',
  prompts.escena.usuari.includes('guió llarg'));
comprova('el prompt d\'escena prohibeix l\'anglès i el castellà',
  prompts.escena.usuari.includes('Cap paraula en anglès ni en castellà'));
comprova('el prompt d\'escena porta el dossier i el contracte',
  prompts.escena.usuari.includes('DOSSIER DEL CONTE') && prompts.escena.usuari.includes("CONTRACTE D'AQUESTA ESCENA"));
comprova('el prompt de llavors prohibeix els tòpics de l\'obra de Dick',
  prompts.llavor.usuari.includes('Deckard') && prompts.llavor.usuari.includes('Ubik'));
comprova('el prompt de llavors porta el clixé a esquivar de cada motiu',
  prompts.llavor.usuari.includes("Clixé que has d'esquivar"));
comprova('la directiva de llengua és a tots els prompts de sistema',
  ['llavor', 'dossier', 'escaleta', 'escena', 'costura', 'lectura']
    .every(p => prompts[p].sistema.includes('EXCLUSIVAMENT en català')));
comprova('el prompt de lectura prohibeix posar nota, resumir i elogiar',
  /PROHIBIT[\s\S]*nota[\s\S]*resumir[\s\S]*elogiar/.test(prompts.lectura.sistema));
comprova('el prompt de lectura exigeix cita literal a cada defecte',
  prompts.lectura.usuari.includes('fragment LITERAL'));

// ── Els sis defectes sistemàtics que el prompt nou ha de tancar ─────────────
// 1.1 Premissa: llista negra de MECANISMES, no només de noms propis.
const vetats = await pagina.evaluate(() => CONTE_CORE.MOTIUS_VETATS.map(m => m.mecanisme));
comprova('els vuit mecanismes vetats arriben sencers al prompt de llavors',
  vetats.every(m => prompts.llavor.usuari.includes(m)),
  vetats.filter(m => !prompts.llavor.usuari.includes(m)).join(' | '));
comprova('el prompt de llavors porta també la disfressa de cada mecanisme vetat',
  prompts.llavor.usuari.includes('Com torna disfressat:'));
comprova('el prompt de llavors demana una anomalia única justificada com a original',
  /anomalia: UNA anomalia nova/.test(prompts.llavor.usuari) &&
  prompts.llavor.usuari.includes('justificacio_originalitat'));
comprova('cada escena rep la forma compacta dels mecanismes vetats',
  vetats.every(m => prompts.escena.usuari.includes(m)) &&
  !prompts.escena.usuari.includes('Com torna disfressat:'));
comprova('la llista de vetats no viu dins de cap string de prompt',
  llegirFitxer('index.html').includes('NUCLI.MOTIUS_VETATS') &&
  !/const MOTIUS_VETATS/.test(llegirFitxer('index.html')));

// 1.2 Vida quotidiana: dos problemes, tres aparicions repartides per codi.
comprova('el prompt de llavors demana dos problemes quotidians sense relació amb la trama',
  prompts.llavor.usuari.includes('problemes_quotidians') &&
  /sense CAP relació amb l'anomalia/.test(prompts.llavor.usuari));
comprova('el prompt de dossier porta el bloc de soroll de fons',
  prompts.dossier.usuari.includes('SOROLL DE FONS'));
const soroll = await pagina.evaluate(() => {
  const total = ESTAT_CONTE.escaleta.escenes.length;
  return ESTAT_CONTE.escaleta.escenes.map((_, i) => promptEscena(i).includes('SOROLL DE FONS OBLIGATORI'))
    .concat([total]);
});
const totalEscenes = soroll.pop();
comprova('exactament tres escenes porten soroll de fons obligatori',
  soroll.filter(Boolean).length === 3, `${soroll.filter(Boolean).length} de ${totalEscenes}`);
comprova('les tres escenes amb soroll són la primera, una del mig i l\'última',
  soroll[0] === true && soroll[totalEscenes - 1] === true && soroll.slice(1, -1).filter(Boolean).length === 1,
  JSON.stringify(soroll));
comprova('els dos problemes quotidians apareixen repartits, no el mateix tres cops',
  await pagina.evaluate(() => {
    const q = ESTAT_CONTE.dossier.protagonista.problemes_quotidians;
    const textos = ESTAT_CONTE.escaleta.escenes.map((_, i) => promptEscena(i));
    return q.every(p => textos.some(t => t.includes(p)));
  }));

// 1.3 Prosa: variació de registre obligatòria, i només al redactor.
comprova('el prompt d\'escena porta la variació de registre obligatòria',
  prompts.escena.sistema.includes('VARIACIÓ DE REGISTRE') &&
  prompts.escena.sistema.includes('estil indirecte lliure') &&
  prompts.escena.sistema.includes('digressió'));
comprova('la variació de registre s\'exigeix a CADA escena, no al conte sencer',
  prompts.escena.usuari.includes("s'apliquen a AQUESTA escena"));
comprova('la variació de registre NO arriba al corrector ni al lector',
  !prompts.costura.sistema.includes('VARIACIÓ DE REGISTRE') &&
  !prompts.lectura.sistema.includes('VARIACIÓ DE REGISTRE'));
comprova('el corrector té prohibit uniformitzar la longitud de les frases',
  prompts.costura.usuari.includes('No retallis les frases llargues subordinades'));

// 1.4 Nucli emocional: escena pròpia, no menció.
comprova('el prompt d\'escaleta exigeix exactament una escena de la ferida',
  /EXACTAMENT una escena amb escena_ferida: true/.test(prompts.escaleta.usuari) &&
  prompts.escaleta.usuari.includes('LA FERIDA'));
comprova('només l\'escena marcada rep el bloc de la ferida',
  await pagina.evaluate(() => {
    const i = CONTE_CORE.indexEscenaFerida(ESTAT_CONTE.escaleta.escenes);
    if (i < 0) return false;
    const ambBloc = ESTAT_CONTE.escaleta.escenes
      .map((_, k) => promptEscena(k).includes("AQUESTA ÉS L'ESCENA DE LA FERIDA"))
      .reduce((a, hi, k) => hi ? a.concat(k) : a, []);
    return ambBloc.length === 1 && ambBloc[0] === i;
  }));
comprova('el bloc de la ferida prohibeix liquidar-la amb una frase de revelació',
  await pagina.evaluate(() => {
    const i = CONTE_CORE.indexEscenaFerida(ESTAT_CONTE.escaleta.escenes);
    return i >= 0 && /PROHIBIT liquidar-la amb una frase de revelació/.test(promptEscena(i));
  }));

// 1.5 Final: ni gir d'O. Henry ni cadena causal afirmada.
comprova('l\'última escena prohibeix la revelació d\'última línia',
  /L'última frase NO pot ser una revelació que reordeni el conte/.test(prompts.escenaFinal.usuari));
comprova('el bloc de desenllaç ja no demana reencuadrar amb l\'última frase',
  !prompts.escenaFinal.usuari.includes('ha de REENCUADRAR') &&
  prompts.escenaFinal.usuari.includes("PROHIBIDA LA REVELACIÓ D'ÚLTIMA LÍNIA"));
comprova('cada escena exigeix la cadena causal explicada',
  prompts.escena.usuari.includes('escriu la cadena sencera') &&
  prompts.escaleta.usuari.includes('cadena causal'));

// 1.6 Títol: conceptual, d'1 a 4 paraules, mai nom + ofici.
comprova('el prompt de llavors demana el títol amb el format i la prohibició',
  /titol: d'UNA a QUATRE paraules/.test(prompts.llavor.usuari) &&
  prompts.llavor.usuari.includes('nom del protagonista + ofici'));
comprova('el títol que proposa el pipeline compleix el format',
  await pagina.evaluate(() => CONTE_CORE.validarTitolConte(ESTAT_CONTE.titol, ESTAT_CONTE.dossier).valid),
  await pagina.evaluate(() => ESTAT_CONTE.titol + ' — ' + CONTE_CORE.validarTitolConte(ESTAT_CONTE.titol, ESTAT_CONTE.dossier).motiu));

// 1.7 Llengua: només al corrector, mai al redactor.
const criterisLlengua = await pagina.evaluate(() => CONTE_CORE.CRITERIS_LLENGUA_REVISIO.map(c => c.criteri));
comprova('els tres criteris de llengua arriben a la costura i al pedaç dirigit',
  criterisLlengua.every(c => prompts.costura.usuari.includes(c)) &&
  criterisLlengua.every(c => prompts.pedac.usuari.includes(c)));
comprova('els criteris de llengua porten l\'exemple del defecte real',
  prompts.costura.usuari.includes('gargamellejar') && prompts.costura.usuari.includes('gorgotejar'));
comprova('els criteris de llengua NO arriben al prompt de redacció',
  !criterisLlengua.some(c => prompts.escena.sistema.includes(c) || prompts.escena.usuari.includes(c)));
comprova('el pedaç dirigit avisa que cada canvi es llegeix sobre el conte sencer',
  prompts.pedac.usuari.includes('NO SOBRE EL FRAGMENT') &&
  prompts.pedac.usuari.includes('clàusula que la justificava'));
comprova('la costura rebutja els diagnòstics que demanen regenerar, no apedaçar',
  prompts.costura.usuari.includes('el conte s\'ha de tornar a generar, no apedaçar'));

// ── Divergència: que dues generacions no caiguin al mateix lloc ─────────────
const coordenades = await pagina.evaluate(() => ESTAT_CONTE.divergencia);
comprova('la generació fixa les sis coordenades abans de demanar res',
  !!coordenades && Object.keys(coordenades).length === 6);
comprova('les coordenades arriben senceres al prompt de llavors, amb la seva instrucció',
  await pagina.evaluate(() =>
    CONTE_CORE.EIXOS_DIVERGENCIA.every(e =>
      promptLlavors(CONTE_CORE.triarMotius([], 3)).includes(ESTAT_CONTE.divergencia[e.id]) &&
      promptLlavors(CONTE_CORE.triarMotius([], 3)).includes(e.instruccio))));
comprova('les coordenades arriben també a l\'escaleta i a cada escena',
  await pagina.evaluate(() =>
    CONTE_CORE.EIXOS_DIVERGENCIA.every(e =>
      promptEscaleta().includes(ESTAT_CONTE.divergencia[e.id]) &&
      promptEscena(0).includes(ESTAT_CONTE.divergencia[e.id]))));
comprova('a la redacció es demana complir-les, no declarar-les',
  await pagina.evaluate(() => promptEscena(0).includes('no es declaren')));
comprova('els noms de protagonista ja utilitzats arriben com a prohibició',
  await pagina.evaluate(() => {
    const noms = nomsUsats();
    const p = promptLlavors(CONTE_CORE.triarMotius([], 3));
    return noms.length > 0 && noms.every(n => p.includes(n)) && p.includes('cap dels quals pot tornar a sortir');
  }));
comprova('el nom del protagonista triat queda registrat per prohibir-lo després',
  await pagina.evaluate(() => nomsUsats().includes(ESTAT_CONTE.dossier.protagonista.nom)));

// La prova de debò: dues generacions seguides amb el mateix model.
const dosContes = await pagina.evaluate(async () => {
  const primera = Object.assign({}, ESTAT_CONTE.divergencia);
  await accio('b-llavors', generarLlavors);
  const segona = Object.assign({}, ESTAT_CONTE.divergencia);
  return { primera, segona };
});
comprova('la segona generació no comparteix cap coordenada amb la primera',
  Object.keys(dosContes.primera).every(k => dosContes.primera[k] !== dosContes.segona[k]),
  JSON.stringify(dosContes));
comprova('l\'històric de coordenades es desa entre generacions',
  await pagina.evaluate(() => divergenciaUsada().length === 12));

// ── L'entrada de les escenes no creix amb la longitud del conte ─────────────
const midaPrompts = await pagina.evaluate(() => ESTAT_CONTE.escaleta.escenes.map((_, i) => promptEscena(i).length));
const creixement = midaPrompts[midaPrompts.length - 1] - midaPrompts[0];
comprova('el prompt de l\'última escena no és gaire més gran que el de la primera',
  creixement < 3000, `${midaPrompts[0]} → ${midaPrompts[midaPrompts.length - 1]} (+${creixement})`);
comprova('cap prompt d\'escena porta el text sencer de les escenes anteriors',
  await pagina.evaluate(() => {
    const anterior = ESTAT_CONTE.escenes_text[0];
    return anterior.length > 500 && !promptEscena(1).includes(anterior);
  }));
comprova('el prompt d\'escena porta com a molt els últims 400 caràcters escrits',
  await pagina.evaluate(() => {
    const p = promptEscena(2);
    const m = p.match(/«…([\s\S]*?)»/);
    return !!m && m[1].length <= 400;
  }));

await navegador.close();
acabar();
