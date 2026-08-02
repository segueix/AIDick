// ═══════════════════════════════════════════════════════════
//  conte_core.js — Nucli pur del generador de contes PKD
//
//  Tota la lògica del conte que no toca el DOM ni la xarxa. Es carrega amb
//  <script src> al navegador i amb require() a les proves, sense navegador.
//
//  Principis que aquest mòdul fa complir:
//   · La mètrica canònica de longitud és el CARÀCTER amb espais.
//   · El que es pot comprovar per codi no es pregunta a cap model.
//   · Cap fallback local produeix un estat que un validador posterior rebutgi.
//   · Cap validador reporta un problema sense una cita o un camp concret.
// ═══════════════════════════════════════════════════════════

'use strict';

// ═══════════════════════════════════════════════════════════
//  1. CONSTANTS
// ═══════════════════════════════════════════════════════════

const CONTE_MIN_CARACTERS = 15000;
const CONTE_MAX_CARACTERS = 20000;
const CONTE_OBJECTIU_CARACTERS = 17500;
const CONTE_MIN_ESCENES = 4;
const CONTE_MAX_ESCENES = 6;
const MAX_CRIDES_CONTE = 24;
const TOLERANCIA_ESCENA = 0.15;

// Separador literal entre escenes dins del text acumulat. És l'única marca que
// permet retallar el conte per escenes sense demanar-ho a cap model.
// La segona constant és la forma que pren el separador DESPRÉS de
// normalitzarTextConte (els salts dobles hi passen a simples): és la que s'ha
// de fer servir per partir un text ja normalitzat.
const SEPARADOR_ESCENA = '\n\n· · ·\n\n';
const SEPARADOR_ESCENA_NORMALITZAT = '\n· · ·\n';

// Funcions PKD que la porta de qualitat exigeix a l'escaleta.
const FUNCIONS_PKD = ['esquerda', 'mentida', 'paranoia', 'empatia', 'cap'];
const FUNCIONS_PKD_OBLIGATORIES = ['esquerda', 'mentida', 'empatia'];

// Un títol és un concepte, no un nom de fitxer descriptiu. El patró
// «nom del protagonista + ofici» queda prohibit i es comprova per codi.
const TITOL_MAX_PARAULES = 4;

// ═══════════════════════════════════════════════════════════
//  2. RECOMPTE DE CARÀCTERS
// ═══════════════════════════════════════════════════════════

// Normalització canònica, documentada perquè la xifra sigui reproduïble entre
// execucions i entre navegador i node:
//   1. Els finals de línia de Windows (\r\n) i de Mac clàssic (\r) es
//      converteixen a \n. Un mateix text enganxat des de dos sistemes ha de
//      donar el mateix número.
//   2. Els espais i tabuladors al final de cada línia s'eliminen: són invisibles
//      i el model n'hi posa un nombre arbitrari.
//   3. Qualsevol seqüència de dos o més salts de línia es redueix a un de sol.
//   4. S'eliminen els espais del principi i del final del text sencer.
// Tot el que queda —lletres, espais interiors, signes de puntuació i els salts
// de línia simples— compta.
function normalitzarTextConte(text) {
  return String(text == null ? '' : text)
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function comptaCaracters(text) {
  return normalitzarTextConte(text).length;
}

// Informació secundària: la mètrica canònica segueix sent el caràcter.
function comptaParaules(text) {
  const net = normalitzarTextConte(text);
  if (!net) return 0;
  return net.split(/\s+/).filter(Boolean).length;
}

// ═══════════════════════════════════════════════════════════
//  3. REPARTIMENT DEL PRESSUPOST DE CARÀCTERS
// ═══════════════════════════════════════════════════════════

// Reparteix `objectiu` entre `nEscenes` segons `pesos` (per defecte iguals).
// La suma del resultat és SEMPRE exactament `objectiu`: l'arrodoniment es
// compensa a l'última escena, que és la que té més marge estilístic.
function repartirCaracters(objectiu, nEscenes, pesos) {
  const total = Math.max(0, Math.round(Number(objectiu) || 0));
  const n = Math.max(1, Math.round(Number(nEscenes) || 1));

  let p = Array.isArray(pesos) && pesos.length === n
    ? pesos.map(x => { const v = Number(x); return Number.isFinite(v) && v > 0 ? v : 0; })
    : new Array(n).fill(1);

  const sumaPesos = p.reduce((a, b) => a + b, 0);
  if (sumaPesos <= 0) p = new Array(n).fill(1);

  const suma = p.reduce((a, b) => a + b, 0);
  const repartiment = p.map(x => Math.round((total * x) / suma));

  // Compensació de l'arrodoniment: la suma ha de quadrar al caràcter.
  let diferencia = total - repartiment.reduce((a, b) => a + b, 0);
  let i = repartiment.length - 1;
  while (diferencia !== 0 && i >= 0) {
    const pas = diferencia > 0 ? 1 : -1;
    // No deixem cap escena en negatiu ni a zero mentre hi hagi marge en una altra.
    if (repartiment[i] + pas >= 1) {
      repartiment[i] += pas;
      diferencia -= pas;
    } else {
      i -= 1;
      continue;
    }
    if (diferencia !== 0 && repartiment.length > 1) i = i === 0 ? repartiment.length - 1 : i - 1;
  }

  return repartiment;
}

// Pesos per defecte del conte: l'escena de l'esquerda i la darrera porten més
// text perquè hi passa el que el lector ha de poder rellegir.
function pesosPerEscenes(escenes) {
  const llista = Array.isArray(escenes) ? escenes : [];
  if (llista.length === 0) return null;
  return llista.map((e, i) => {
    const funcio = e && e.funcio_pkd;
    let pes = 1;
    if (funcio === 'esquerda') pes += 0.25;
    if (i === llista.length - 1) pes += 0.15;
    return pes;
  });
}

// ═══════════════════════════════════════════════════════════
//  4. EL DOSSIER — únic estat narratiu persistent
// ═══════════════════════════════════════════════════════════

function crearDossierBuit() {
  return {
    premissa: '',
    // L'anomalia única del conte, en una frase, i per què no és cap dels
    // mecanismes de MOTIUS_VETATS. La justificació no bloqueja: és la traça de
    // la tria, no material narratiu.
    anomalia: '',
    anomalia_justificacio: '',
    final_obligatori: '',
    esquerda: '',
    mentida_del_sistema: '',
    cost_empatia: '',
    protagonista: {
      nom: '',
      feina_ordinaria: '',
      ferida: '',
      objectiu_extern: '',
      secret: '',
      // Dos problemes de vida quotidiana SENSE cap relació amb la trama. No es
      // resolen ni es connecten amb el desenllaç: són soroll de fons i han de
      // continuar sent-ho.
      problemes_quotidians: [],
      veu: { registre: '', mai_diria: [] }
    },
    secundaris: [],
    mon: { lloc: '', any: '', deteriorament: [], objectes_consum_defectuosos: [] },
    objectes_clau: [],
    fets_canonics: [],
    cronologia: [],
    motius_triats: []
  };
}

function esTextUtil(valor) {
  const t = String(valor == null ? '' : valor).trim();
  if (t.length < 2) return false;
  // "per determinar", "TBD", "?" i companyia són forats disfressats de valor.
  return !/^(per\s+determinar|pendent|tbd|n\/?a|\?+|-+|desconegut)$/i.test(t);
}

// Retorna { valid, faltants: [ { camp, motiu, com_resoldre } ] }.
// 'com_resoldre' és obligatori a cada faltant: la interfície l'ensenya com a
// text del botó que desbloqueja el pas. Un faltant sense sortida seria un
// bloqueig sense acció, que és el mode de fallada que aquest projecte ja ha
// patit.
function validarDossier(dossier) {
  const d = dossier || {};
  const faltants = [];
  const falta = (camp, motiu, com_resoldre) => faltants.push({ camp, motiu, com_resoldre });

  const arrel = [
    ['premissa', "L'anomalia inicial del conte, en una frase."],
    ['anomalia', "L'anomalia única del conte en una frase, que no pot ser cap dels mecanismes vetats."],
    ['final_obligatori', 'El desenllaç concret que la darrera escena ha d\'executar.'],
    ['esquerda', "Què descobrirà el lector que no era real."],
    ['mentida_del_sistema', 'Quina institució menteix i com es comprova dins del text.'],
    ['cost_empatia', "Quina decisió empàtica li costa alguna cosa al protagonista."]
  ];
  arrel.forEach(([camp, motiu]) => {
    if (!esTextUtil(d[camp])) falta(camp, motiu, `Omple «${camp}» a partir de la llavor triada`);
  });

  const p = d.protagonista || {};
  [
    ['nom', 'El protagonista necessita un nom propi.'],
    ['feina_ordinaria', 'La feina de rang baix des de la qual investiga.'],
    ['ferida', "El motiu pel qual segueix quan hauria de parar."],
    ['objectiu_extern', "Què vol aconseguir de manera visible."],
    ['secret', "Què amaga i li pot costar car."]
  ].forEach(([camp, motiu]) => {
    if (!esTextUtil(p[camp])) falta(`protagonista.${camp}`, motiu, `Omple «${camp}» del protagonista`);
  });

  // Els problemes quotidians són la brutícia humana que fa creïble la
  // metafísica: sense ells el protagonista no té res fora de la trama.
  const quotidians = Array.isArray(p.problemes_quotidians) ? p.problemes_quotidians.filter(esTextUtil) : [];
  if (quotidians.length < 2) {
    falta('protagonista.problemes_quotidians',
      `Calen 2 problemes quotidians sense cap relació amb la trama; n'hi ha ${quotidians.length}.`,
      'Genera els problemes quotidians del protagonista');
  } else if (quotidians.length > 2) {
    falta('protagonista.problemes_quotidians',
      `Hi ha ${quotidians.length} problemes quotidians i n'han de ser exactament 2.`,
      'Retalla els problemes quotidians fins a 2');
  }

  const veu = p.veu || {};
  if (!esTextUtil(veu.registre)) {
    falta('protagonista.veu.registre', 'El registre de veu del protagonista.', 'Deriva el registre de la feina i la ferida');
  }
  const maiDiria = Array.isArray(veu.mai_diria) ? veu.mai_diria.filter(esTextUtil) : [];
  if (maiDiria.length < 3) {
    falta('protagonista.veu.mai_diria',
      `Calen 3 frases que aquest personatge no diria mai; n'hi ha ${maiDiria.length}.`,
      'Genera les frases que el protagonista no diria mai');
  }

  const secundaris = Array.isArray(d.secundaris) ? d.secundaris : [];
  const secundarisComplets = secundaris.filter(s => s && esTextUtil(s.nom) && esTextUtil(s.funcio) && esTextUtil(s.vol) && esTextUtil(s.amaga));
  if (secundarisComplets.length < 1) {
    falta('secundaris', 'Cal com a mínim un secundari amb nom, funció, què vol i què amaga.', 'Afegeix un secundari complet');
  } else if (secundarisComplets.length > 3) {
    falta('secundaris', `Hi ha ${secundarisComplets.length} secundaris i el màxim és 3.`, 'Retalla els secundaris fins a 3');
  }

  const mon = d.mon || {};
  if (!esTextUtil(mon.lloc)) falta('mon.lloc', "On passa el conte.", 'Omple el lloc del món');
  if (!esTextUtil(mon.any)) falta('mon.any', "Quan passa el conte.", "Omple l'any del món");
  const deteriorament = Array.isArray(mon.deteriorament) ? mon.deteriorament.filter(esTextUtil) : [];
  if (deteriorament.length < 3) {
    falta('mon.deteriorament',
      `Calen 3 detalls de deteriorament; n'hi ha ${deteriorament.length}.`,
      'Genera els detalls de deteriorament del món');
  }
  const objectesDefectuosos = Array.isArray(mon.objectes_consum_defectuosos) ? mon.objectes_consum_defectuosos.filter(esTextUtil) : [];
  if (objectesDefectuosos.length < 2) {
    falta('mon.objectes_consum_defectuosos',
      `Calen 2 objectes de consum amb el defecte concret; n'hi ha ${objectesDefectuosos.length}.`,
      'Genera els objectes de consum defectuosos');
  }

  const objectes = Array.isArray(d.objectes_clau) ? d.objectes_clau : [];
  if (objectes.length > 4) {
    falta('objectes_clau', `Hi ha ${objectes.length} objectes clau i el màxim és 4.`, 'Retalla els objectes clau fins a 4');
  }
  objectes.forEach((o, i) => {
    if (!o || !esTextUtil(o.nom) || !esTextUtil(o.on_es) || !esTextUtil(o.per_a_que)) {
      falta(`objectes_clau[${i}]`, "Un objecte clau necessita nom, on és i per a què serveix.", `Completa l'objecte clau ${i + 1}`);
    }
  });

  const fets = Array.isArray(d.fets_canonics) ? d.fets_canonics.filter(esTextUtil) : [];
  if (fets.length < 1) {
    falta('fets_canonics', 'Cal com a mínim un fet canònic comprovable dins del text.', 'Genera els fets canònics');
  } else if (fets.length > 8) {
    falta('fets_canonics', `Hi ha ${fets.length} fets canònics i el màxim és 8.`, 'Retalla els fets canònics fins a 8');
  }

  const cronologia = Array.isArray(d.cronologia) ? d.cronologia : [];
  const fites = cronologia.filter(c => c && esTextUtil(c.quan) && esTextUtil(c.que));
  if (fites.length < 1) {
    falta('cronologia', 'Cal com a mínim una fita de cronologia amb «quan» i «què».', 'Genera la cronologia');
  } else if (fites.length > 6) {
    falta('cronologia', `Hi ha ${fites.length} fites i el màxim és 6.`, 'Retalla la cronologia fins a 6 fites');
  }

  return { valid: faltants.length === 0, faltants };
}

// ═══════════════════════════════════════════════════════════
//  4 bis. TÍTOL
//
//  Comprovació determinista i zero tokens. «Denise Holloway, telefonista
//  nocturna d'una asseguradora» descriu el fitxer, no el conte: és el patró
//  nom + ofici, i és el que aquesta funció rebutja.
// ═══════════════════════════════════════════════════════════

function validarTitolConte(titol, dossier) {
  const t = String(titol == null ? '' : titol).trim();
  const no = (motiu, com_resoldre) => ({ valid: false, motiu, com_resoldre });

  if (!esTextUtil(t)) {
    return no('El títol és buit.', `Posa un títol conceptual d'1 a ${TITOL_MAX_PARAULES} paraules tret d'una frase o d'un terme del conte`);
  }
  const paraules = t.split(/\s+/).filter(Boolean);
  if (paraules.length > TITOL_MAX_PARAULES) {
    return no(`El títol té ${paraules.length} paraules i el màxim és ${TITOL_MAX_PARAULES}.`,
      'Retalla el títol al terme que el sosté');
  }
  if (/[,;:]/.test(t)) {
    return no('El títol porta una coma o dos punts: això és una descripció, no un títol.',
      'Queda\'t amb la part que és un concepte');
  }

  const p = (dossier || {}).protagonista || {};
  const tMinuscula = t.toLowerCase();
  const componentsNom = String(p.nom || '').split(/\s+/)
    .filter(x => x.replace(/[^\p{L}]/gu, '').length >= 3)
    .map(x => x.toLowerCase());
  const teNom = componentsNom.some(n => tMinuscula.includes(n));
  const teOfici = paraulesDistintives(p.feina_ordinaria || '').some(f => tMinuscula.includes(f));
  if (teNom && teOfici) {
    return no('El títol és el patró prohibit «nom del protagonista + ofici»: descriu qui és, no de què va.',
      'Tria un terme que aparegui al conte i que en signifiqui el nucli');
  }

  return { valid: true, motiu: '', com_resoldre: '' };
}

// Fusió que MAI buida el que ja tenia valor. Aquesta funció existeix perquè la
// regressió documentada del projecte original era exactament la contrària: una
// compleció parcial que retornava dos camps deixava els altres a zero.
// Regla: la font només escriu on el destí no té res útil.
function fusionarDossierSenseBuidar(basePrevia, novesDades) {
  const base = basePrevia && typeof basePrevia === 'object' ? basePrevia : {};
  const nou = novesDades && typeof novesDades === 'object' ? novesDades : {};

  const fusionarValor = (previ, entrant) => {
    // Un valor entrant buit, nul o inservible no pot esborrar res.
    if (entrant === undefined || entrant === null) return previ;

    if (Array.isArray(entrant)) {
      const netejat = entrant.filter(x => x !== undefined && x !== null && !(typeof x === 'string' && !esTextUtil(x)));
      if (netejat.length === 0) return Array.isArray(previ) ? previ : [];
      return netejat;
    }

    if (typeof entrant === 'object') {
      const previObjecte = (previ && typeof previ === 'object' && !Array.isArray(previ)) ? previ : {};
      const resultat = Object.assign({}, previObjecte);
      Object.keys(entrant).forEach(k => { resultat[k] = fusionarValor(previObjecte[k], entrant[k]); });
      return resultat;
    }

    if (typeof entrant === 'string' && !esTextUtil(entrant)) return previ === undefined ? entrant : previ;
    return entrant;
  };

  return fusionarValor(base, nou);
}

// ═══════════════════════════════════════════════════════════
//  5. CONTRACTES D'ESCENA
//  Hereten l'enfocament de crearSceneContractBase i
//  detectarFaltantsSceneContract de nkg_core.js, amb la forma del conte.
// ═══════════════════════════════════════════════════════════

const CAMPS_CONTRACTE_TEXT = [
  'pov', 'lloc', 'objectiu_pov', 'obstacle', 'objecte_o_informacio_en_disputa',
  'decisio_irreversible', 'cost_immediat', 'consequencia'
];

function crearContracteEscena(i, escena) {
  const e = escena || {};
  const present = Array.isArray(e.present)
    ? e.present.map(x => String(x || '').trim()).filter(Boolean)
    : (esTextUtil(e.present) ? [String(e.present).trim()] : []);

  const contracte = {
    index: Number.isFinite(Number(i)) ? Number(i) : 0,
    pov: String(e.pov || '').trim(),
    lloc: String(e.lloc || '').trim(),
    present,
    objectiu_pov: String(e.objectiu_pov || '').trim(),
    obstacle: String(e.obstacle || '').trim(),
    objecte_o_informacio_en_disputa: String(e.objecte_o_informacio_en_disputa || '').trim(),
    decisio_irreversible: String(e.decisio_irreversible || '').trim(),
    cost_immediat: String(e.cost_immediat || '').trim(),
    consequencia: String(e.consequencia || '').trim(),
    caracters_objectiu: Math.max(0, Math.round(Number(e.caracters_objectiu) || 0)),
    funcio_pkd: FUNCIONS_PKD.indexOf(e.funcio_pkd) >= 0 ? e.funcio_pkd : 'cap',
    // L'escena on la ferida del protagonista és la matèria, no una menció.
    escena_ferida: e.escena_ferida === true
  };
  return contracte;
}

// Índex de l'escena de la ferida, o -1 si no n'hi ha cap. Si l'escaleta en
// marca més d'una, val la primera: la ferida necessita una escena, no un tema
// repartit per tot el conte.
function indexEscenaFerida(escaleta) {
  const escenes = Array.isArray(escaleta) ? escaleta : (escaleta && Array.isArray(escaleta.escenes) ? escaleta.escenes : []);
  return escenes.findIndex(e => e && e.escena_ferida === true);
}

// Retorna la llista de camps incomplets. Cap camp pot quedar buit excepte
// funcio_pkd, que pot valdre 'cap'.
function detectarFaltantsContracte(contracte) {
  const c = contracte || {};
  const faltants = [];

  CAMPS_CONTRACTE_TEXT.forEach(camp => {
    if (!esTextUtil(c[camp])) faltants.push(camp);
  });

  const present = Array.isArray(c.present) ? c.present.filter(esTextUtil) : [];
  if (present.length === 0) faltants.push('present');

  if (!Number.isFinite(Number(c.caracters_objectiu)) || Number(c.caracters_objectiu) <= 0) {
    faltants.push('caracters_objectiu');
  }
  if (FUNCIONS_PKD.indexOf(c.funcio_pkd) < 0) faltants.push('funcio_pkd');

  return faltants;
}

// La porta PKD sobre l'escaleta: hi han d'aparèixer 'esquerda', 'mentida' i
// 'empatia'. 'paranoia' és recomanada però no bloqueja.
function validarGatePKD(escaleta) {
  const escenes = Array.isArray(escaleta) ? escaleta : (escaleta && Array.isArray(escaleta.escenes) ? escaleta.escenes : []);
  const presents = new Set(escenes.map(e => e && e.funcio_pkd).filter(Boolean));

  const faltants = FUNCIONS_PKD_OBLIGATORIES
    .filter(f => !presents.has(f))
    .map(f => ({
      funcio: f,
      motiu: MOTIU_FUNCIO_PKD[f],
      com_resoldre: `Assigna la funció «${f}» a una escena o regenera l'escaleta`
    }));

  return {
    valid: faltants.length === 0,
    faltants,
    paranoia_present: presents.has('paranoia'),
    avis_paranoia: presents.has('paranoia') ? '' : "Cap escena porta la funció «paranoia». No bloqueja, però el raonament metòdic del protagonista queda sense escena pròpia."
  };
}

const MOTIU_FUNCIO_PKD = {
  esquerda: 'Cap escena trenca el marc del que el lector creia real sense recompondre\'l.',
  mentida: 'Cap escena fa que el sistema menteixi d\'una manera comprovable dins del text.',
  paranoia: 'Cap escena mostra el protagonista raonant amb mètode.',
  empatia: 'Cap escena fa que ser empàtic li costi alguna cosa concreta al protagonista.'
};

// Xarxa de seguretat de la regla 8 del briefing: construeix un contracte
// COMPLET a partir del dossier, sense cap crida a model. Ha de passar sempre
// detectarFaltantsContracte.
//
// funcio_pkd queda deliberadament a 'cap': el fallback tapa forats
// estructurals, però la porta PKD l'ha de tancar el model o la persona. Si el
// fallback pogués assignar 'esquerda' o 'empatia', la porta es tancaria sola i
// deixaria de mesurar res.
function contracteFallbackLocal(i, dossier, caracters) {
  const d = dossier || {};
  const p = d.protagonista || {};
  const mon = d.mon || {};
  const secundari = (Array.isArray(d.secundaris) ? d.secundaris : []).find(s => s && esTextUtil(s.nom));
  const objecte = (Array.isArray(d.objectes_clau) ? d.objectes_clau : []).find(o => o && esTextUtil(o.nom));

  const nom = esTextUtil(p.nom) ? String(p.nom).trim() : 'El protagonista';
  const feina = esTextUtil(p.feina_ordinaria) ? String(p.feina_ordinaria).trim() : 'la seva feina de rang baix';
  const lloc = esTextUtil(mon.lloc) ? String(mon.lloc).trim() : 'el lloc de treball habitual';
  const enDisputa = objecte
    ? String(objecte.nom).trim()
    : (esTextUtil(d.mentida_del_sistema) ? `la dada que desmenteix ${retallar(d.mentida_del_sistema, 60)}` : 'un expedient que no quadra');

  const contracte = {
    index: Number.isFinite(Number(i)) ? Number(i) : 0,
    pov: nom,
    lloc,
    present: [nom].concat(secundari ? [String(secundari.nom).trim()] : ['un funcionari de finestreta']),
    objectiu_pov: esTextUtil(p.objectiu_extern)
      ? String(p.objectiu_extern).trim()
      : `Tancar el tràmit pendent de ${feina} sense que ningú hi miri dues vegades`,
    obstacle: secundari && esTextUtil(secundari.amaga)
      ? `El que ${String(secundari.nom).trim()} amaga: ${retallar(secundari.amaga, 80)}`
      : 'El procediment obliga a una autorització que ningú vol signar',
    objecte_o_informacio_en_disputa: enDisputa,
    decisio_irreversible: `${nom} deixa constància escrita del que ha vist i ja no ho pot retirar`,
    cost_immediat: esTextUtil(p.secret)
      ? `Queda exposat: ${retallar(p.secret, 80)}`
      : 'Perd la cobertura administrativa que el protegia',
    consequencia: esTextUtil(d.esquerda)
      ? `El que donava per estable deixa de ser-ho: ${retallar(d.esquerda, 80)}`
      : 'A partir d\'aquí ningú del sistema li torna a respondre igual',
    caracters_objectiu: Math.max(1, Math.round(Number(caracters) || Math.round(CONTE_OBJECTIU_CARACTERS / CONTE_MIN_ESCENES))),
    funcio_pkd: 'cap',
    // Pel mateix motiu que funcio_pkd: si el fallback pogués declarar l'escena
    // de la ferida, la declararia sempre i deixaria de mesurar res.
    escena_ferida: false
  };

  return contracte;
}

function retallar(text, max) {
  const t = String(text || '').trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}

// Completa un contracte parcial: conserva tot el que ja tenia valor i només
// omple els forats amb el fallback local. Mai sobreescriu.
function completarContracteAmbFallback(contracte, dossier, caracters) {
  const actual = crearContracteEscena(contracte && contracte.index, contracte);
  const faltants = detectarFaltantsContracte(actual);
  if (faltants.length === 0) return { contracte: actual, camps_omplerts: [] };

  const fallback = contracteFallbackLocal(actual.index, dossier, caracters || actual.caracters_objectiu);
  const omplerts = [];
  faltants.forEach(camp => {
    if (camp === 'funcio_pkd') { actual.funcio_pkd = 'cap'; omplerts.push(camp); return; }
    actual[camp] = fallback[camp];
    omplerts.push(camp);
  });

  return { contracte: actual, camps_omplerts: omplerts };
}

// ═══════════════════════════════════════════════════════════
//  6. LINT DE CATALÀ (capa parcial, sense corrector ortogràfic)
//
//  Al navegador no hi ha hunspell. Aquesta capa és una LLISTA TANCADA de
//  castellanismes i d'anglicismes documentats: detecta el que hi ha a la
//  llista i res més. NO és una comprovació ortogràfica i la interfície ho ha
//  de dir. La comprovació completa amb hunspell viu a proves/c5_lint.mjs.
// ═══════════════════════════════════════════════════════════

// Cada entrada: [forma incorrecta, forma correcta].
//
// Criteri d'inclusió, estricte a propòsit: només hi entra una forma que NO
// existeixi en català. Paraules que existeixen a totes dues llengües amb el
// mateix sentit (cara, oficina, pantalla, sala, moment) o que són formes
// catalanes legítimes homògrafes d'una paraula castellana ('nada' és tercera
// persona de 'nedar', 'entregar' i 'entrega' són al diccionari) queden fora.
// Marcar text correcte és pitjor que no marcar res: la gent aprèn a ignorar
// l'avís i llavors l'avís ja no serveix per a res.
const CASTELLANISMES = [
  ['bueno', 'bé'], ['vale', "d'acord"], ['entonces', 'llavors'], ['pero', 'però'],
  ['algo', 'alguna cosa'], ['tampoco', 'tampoc'], ['hasta', 'fins'], ['luego', 'després'],
  ['ahora', 'ara'], ['despues', 'després'], ['antes', 'abans'], ['siempre', 'sempre'],
  ['nunca', 'mai'], ['tambien', 'també'], ['aunque', 'encara que'], ['porque', 'perquè'],
  ['barco', 'vaixell'], ['buzon', 'bústia'], ['despedir', 'acomiadar'], ['despedida', 'comiat'],
  ['disfrutar', 'gaudir'], ['guapo', 'maco'], ['guapa', 'maca'], ['rato', 'estona'],
  ['sillon', 'butaca'], ['pálid', 'pàl·lid'], ['palid', 'pàl·lid'], ['promessa', 'promesa'],
  ['ensayada', 'assajada'], ['ensayar', 'assajar'], ['manipul·lat', 'manipulat'],
  ['queure', 'caure'], ['apretar', 'prémer'], ['acera', 'vorera'], ['basura', 'escombraries'],
  ['ventanilla', 'finestreta'], ['pasillo', 'passadís'], ['despacho', 'despatx'],
  ['sello', 'segell'], ['tenir que', 'haver de'], ['donar-se compte', 'adonar-se'],
  ['en quant a', 'quant a'], ['a lo millor', 'potser'], ['vacacions', 'vacances'],
  ['acuerdo', 'acord'], ['trabajo', 'feina'], ['ciudad', 'ciutat'], ['edificio', 'edifici'],
  ['ventana', 'finestra'], ['puerta', 'porta'], ['calle', 'carrer'], ['cabeza', 'cap'],
  ['mano', 'mà'], ['ojos', 'ulls'], ['algún', 'algun'], ['ningún', 'cap'],
  ['mismo', 'mateix'], ['otro', 'altre'], ['todo', 'tot'], ['muy', 'molt'],
  ['poco', 'poc'], ['mucho', 'molt'], ['nuevo', 'nou'], ['viejo', 'vell'],
  ['grande', 'gran'], ['pequeño', 'petit'], ['blanco', 'blanc'], ['negro', 'negre'],
  ['rojo', 'vermell'], ['tarjeta', 'targeta'], ['aixina', 'així'], ['apoyar', 'donar suport'],
  ['assamblea', 'assemblea'], ['ademés', 'a més'], ['despido', 'acomiadament']
];

// Anglicismes. `titolCas` diu si la forma es pot marcar també amb inicial
// majúscula. L'ambientació de Dick és nord-americana i el text n'és ple de noms
// propis anglesos: marcar qualsevol paraula anglesa capitalitzada convertiria
// cada cognom en una falta. Només porten titolCas les interjeccions i renecs
// que no poden ser mai un nom propi ni una marca.
const ANGLICISMES = [
  { forma: 'ok', titolCas: false }, { forma: 'okay', titolCas: true },
  { forma: 'sorry', titolCas: true }, { forma: 'please', titolCas: true },
  { forma: 'thanks', titolCas: true }, { forma: 'hello', titolCas: true },
  { forma: 'yes', titolCas: true }, { forma: 'yeah', titolCas: true },
  { forma: 'no way', titolCas: true }, { forma: 'wow', titolCas: true },
  { forma: 'cool', titolCas: true }, { forma: 'shit', titolCas: true },
  { forma: 'fuck', titolCas: true }, { forma: 'damn', titolCas: true },
  { forma: 'hey', titolCas: false }, { forma: 'boss', titolCas: false },
  { forma: 'office', titolCas: false }, { forma: 'building', titolCas: false },
  { forma: 'downtown', titolCas: false }, { forma: 'highway', titolCas: false },
  { forma: 'manager', titolCas: false }, { forma: 'meeting', titolCas: false },
  { forma: 'briefing', titolCas: false }, { forma: 'feedback', titolCas: false },
  { forma: 'background', titolCas: false }, { forma: 'flashback', titolCas: false },
  { forma: 'business', titolCas: false }, { forma: 'company', titolCas: false },
  { forma: 'report', titolCas: false }, { forma: 'update', titolCas: false },
  { forma: 'sure', titolCas: true }, { forma: 'right now', titolCas: true },
  { forma: 'come on', titolCas: true }, { forma: 'let me', titolCas: true },
  { forma: 'i mean', titolCas: false }, { forma: 'you know', titolCas: true },
  { forma: 'of course', titolCas: true }
];

// Text netejat de noms propis per no comptar l'onomàstica anglosaxona de
// l'ambientació de Dick com a anglicisme.
function paraulesEnMinuscula(text) {
  return String(text || '')
    .replace(/[«»""'']/g, ' ')
    .split(/[^\p{L}\p{N}·'-]+/u)
    .filter(Boolean);
}

function escaparRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Retorna { troballes: [ { tipus, forma, correccio, cita } ], total }.
// `parcial: true` hi és sempre: és un recordatori que aquesta capa no
// substitueix un corrector ortogràfic.
function lintCatalaParcial(text) {
  const net = normalitzarTextConte(text);
  const troballes = [];
  const vistes = new Set();

  const afegir = (tipus, forma, correccio) => {
    const clau = tipus + '|' + forma;
    if (vistes.has(clau)) return;
    const cita = citaAlVoltant(net, forma);
    if (!cita) return;
    vistes.add(clau);
    troballes.push({ tipus, forma, correccio, cita });
  };

  CASTELLANISMES.forEach(([forma, correccio]) => {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escaparRegex(forma)}([^\\p{L}\\p{N}]|$)`, 'iu');
    if (re.test(net)) afegir('castellanisme', forma, correccio);
  });

  ANGLICISMES.forEach(({ forma, titolCas }) => {
    // Sempre la forma en minúscula i la forma en majúscules completes ("OK").
    // La inicial majúscula només si la paraula no pot ser un nom propi.
    const variants = [forma, forma.toUpperCase()];
    if (titolCas) variants.push(forma.charAt(0).toUpperCase() + forma.slice(1));
    const trobada = variants.some(v => {
      const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escaparRegex(v)}([^\\p{L}\\p{N}]|$)`, 'u');
      return re.test(net);
    });
    if (trobada) afegir('anglicisme', forma, 'escriu-ho en català');
  });

  return { parcial: true, total: troballes.length, troballes };
}

function citaAlVoltant(text, fragment, maxParaules = 12) {
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escaparRegex(fragment)}([^\\p{L}\\p{N}]|$)`, 'iu');
  const m = re.exec(text);
  if (!m) return '';
  const pos = m.index;
  const inici = Math.max(0, pos - 60);
  const tros = text.slice(inici, Math.min(text.length, pos + fragment.length + 60));
  return retallarParaules(tros.replace(/\s+/g, ' ').trim(), maxParaules);
}

function retallarParaules(text, max) {
  const parts = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= max) return parts.join(' ');
  return parts.slice(0, max).join(' ') + '…';
}

// ═══════════════════════════════════════════════════════════
//  7. ADVERBIS EN -MENT
//
//  Es fa amb LLISTA TANCADA d'adverbis, no amb el sufix. En català hi ha
//  desenes de substantius acabats en -ment i en -ament (pagament, coneixement,
//  plantejament, casament, raonament, esdeveniment…) i una regla per sufix els
//  comptaria tots: seria un fals positiu sistemàtic sobre text correcte, que és
//  el defecte més car d'aquesta auditoria.
// ═══════════════════════════════════════════════════════════

const ADVERBIS_MENT = new Set([
  'absolutament', 'automàticament', 'breument', 'certament', 'clarament', 'completament',
  'constantment', 'contínuament', 'correctament', 'curiosament', 'definitivament',
  'deliberadament', 'directament', 'discretament', 'efectivament', 'evidentment',
  'exactament', 'excessivament', 'extremadament', 'fàcilment', 'falsament', 'finalment',
  'físicament', 'formalment', 'francament', 'freqüentment', 'generalment', 'gradualment',
  'igualment', 'immediatament', 'impecablement', 'inevitablement', 'innecessàriament',
  'instintivament', 'intensament', 'lentament', 'literalment', 'llargament', 'lleugerament',
  'majoritàriament', 'manualment', 'mecànicament', 'mentalment', 'metòdicament',
  'naturalment', 'necessàriament', 'nerviosament', 'normalment', 'novament', 'obertament',
  'obviament', 'òbviament', 'ocasionalment', 'oficialment', 'pacientment', 'parcialment',
  'perfectament', 'permanentment', 'personalment', 'plenament', 'possiblement',
  'pràcticament', 'precisament', 'previsiblement', 'primerament', 'principalment',
  'probablement', 'profundament', 'progressivament', 'públicament', 'purament',
  'ràpidament', 'raonablement', 'realment', 'recentment', 'regularment', 'relativament',
  'repetidament', 'rigorosament', 'sencerament', 'seriosament', 'silenciosament',
  'simplement', 'sistemàticament', 'sobtadament', 'sofisticadament', 'solament',
  'suaument', 'suficientment', 'summament', 'tècnicament', 'temporalment', 'totalment',
  'tranquil·lament', 'últimament', 'únicament', 'vagament', 'veritablement',
  'visiblement', 'voluntàriament', 'lògicament', 'estranyament', 'amablement',
  'amargament', 'cegament', 'dolçament', 'durament', 'fermament', 'fredament',
  'greument', 'humilment', 'lliurement', 'llunyanament', 'obligatòriament',
  'oportunament', 'penosament', 'pesadament', 'quietament', 'secament', 'sortosament',
  'tímidament', 'tristament', 'urgentment', 'vivament'
]);

// Llindar deliberadament generós: 3,5 adverbis per 1000 caràcters. La prosa
// catalana literària correcta se sol moure entre 0,5 i 2. Un llindar més
// estricte marcaria text bo i la gent aprendria a ignorar l'avís.
const LLINDAR_ADVERBIS_PER_MIL = 3.5;

// Sostre d'avisos de repetició a l'informe.
const MAX_REPETICIONS_REPORTADES = 8;

function densitatAdverbisMent(text) {
  const net = normalitzarTextConte(text);
  const caracters = net.length;
  if (caracters === 0) return { caracters: 0, adverbis: 0, per_mil: 0, formes: [] };

  const formes = new Map();
  paraulesEnMinuscula(net).forEach(p => {
    const b = p.toLowerCase();
    if (ADVERBIS_MENT.has(b)) formes.set(b, (formes.get(b) || 0) + 1);
  });

  const adverbis = [...formes.values()].reduce((a, b) => a + b, 0);
  return {
    caracters,
    adverbis,
    per_mil: Number(((adverbis / caracters) * 1000).toFixed(2)),
    formes: [...formes.entries()].map(([forma, n]) => ({ forma, n })).sort((a, b) => b.n - a.n)
  };
}

// ═══════════════════════════════════════════════════════════
//  8. REPETICIONS LITERALS
// ═══════════════════════════════════════════════════════════

// Frases de 8 paraules o més repetides literalment. Les finestres solapades
// d'una mateixa repetició es fusionen perquè una repetició de 12 paraules no
// es reporti cinc vegades.
function frasesRepetides(text, minParaules = 8) {
  const net = normalitzarTextConte(text);
  const paraules = net.split(/\s+/).filter(Boolean);
  const normalitzada = paraules.map(p => p.toLowerCase().replace(/[^\p{L}\p{N}·'-]/gu, ''));

  const posicions = new Map();
  for (let i = 0; i + minParaules <= normalitzada.length; i++) {
    const clau = normalitzada.slice(i, i + minParaules).join(' ');
    if (clau.replace(/\s/g, '').length < minParaules) continue; // finestres de només puntuació
    if (!posicions.has(clau)) posicions.set(clau, []);
    posicions.get(clau).push(i);
  }

  const repeticions = [];
  const cobert = new Set();
  [...posicions.entries()]
    .filter(([, pos]) => pos.length > 1)
    .sort((a, b) => a[1][0] - b[1][0])
    .forEach(([clau, pos]) => {
      // Si aquesta finestra ja forma part d'una repetició més llarga ja
      // reportada, no la tornem a treure.
      if (pos.every(p => cobert.has(p))) return;
      pos.forEach(p => { for (let k = 0; k < minParaules; k++) cobert.add(p + k); });
      repeticions.push({
        frase: paraules.slice(pos[0], pos[0] + minParaules).join(' '),
        ocurrencies: pos.length,
        clau
      });
    });

  return repeticions;
}

// ═══════════════════════════════════════════════════════════
//  9. FORMAT DE DIÀLEG
// ═══════════════════════════════════════════════════════════

// El format canònic del projecte és el guió llarg (—) a principi de paràgraf.
// Les cometes dins d'un paràgraf (rètols, anuncis, impresos oficials) són
// legítimes en un conte de Dick i no es marquen mai. Només es marca l'ús de
// cometes com a OBERTURA de paràgraf, que és quan de debò substitueixen el
// guió, i només a partir de 3 ocurrències: una o dues poden ser una citació
// llarga d'un document.
function formatDialegInconsistent(text) {
  const net = normalitzarTextConte(text);
  const linies = net.split('\n').map(l => l.trim()).filter(Boolean);

  const ambGuio = linies.filter(l => /^[—–]/.test(l));
  const ambCometes = linies.filter(l => /^[«"]/.test(l));

  if (ambGuio.length === 0 || ambCometes.length < 3) {
    return { inconsistent: false, guions: ambGuio.length, cometes: ambCometes.length, cita: '' };
  }
  return {
    inconsistent: true,
    guions: ambGuio.length,
    cometes: ambCometes.length,
    cita: retallarParaules(ambCometes[0], 12)
  };
}

// ═══════════════════════════════════════════════════════════
//  10. AUDITORIA DETERMINISTA — zero tokens
// ═══════════════════════════════════════════════════════════

const PARAULES_BUIDES = new Set([
  'el', 'la', 'els', 'les', 'un', 'una', 'uns', 'unes', 'de', 'del', 'dels', 'a', 'al',
  'als', 'en', 'amb', 'per', 'que', 'què', 'i', 'o', 'no', 'es', 'se', 'ha', 'han',
  'va', 'van', 'ser', 'era', 'eren', 'és', 'són', 'com', 'més', 'ja', 'tot', 'aquest',
  'aquesta', 'aquell', 'aquella', 'seu', 'seva', 'però', 'quan', 'fins', 'sobre',
  'entre', 'sense', 'també', 'perquè', 'des', 'seus', 'seves', 'hi', 'ho', 'li'
]);

function paraulesDistintives(text) {
  return paraulesEnMinuscula(text)
    .map(p => p.toLowerCase())
    .filter(p => p.length >= 5 && !PARAULES_BUIDES.has(p));
}

function extreureNombres(text) {
  return (String(text || '').match(/\d[\d.,]*/g) || [])
    .map(n => n.replace(/[.,]$/, ''))
    .filter(Boolean);
}

function fraseAmbCita(text, index) {
  const frases = String(text || '').split(/(?<=[.!?…])\s+/);
  return frases[index] || '';
}

// Retorna { caracters, paraules, dins_interval, problemes: [...] }.
// Cada problema porta o bé una cita literal curta del text (màxim 12 paraules)
// o bé el camp concret que falla. Un problema sense cap de les dues coses no
// es reporta: no es pot actuar sobre un avís que no assenyala res.
function auditoriaDeterministaConte(text, escaleta, dossier) {
  const net = normalitzarTextConte(text);
  const caracters = net.length;
  const problemes = [];
  const escenes = Array.isArray(escaleta) ? escaleta : (escaleta && Array.isArray(escaleta.escenes) ? escaleta.escenes : []);
  const d = dossier || {};

  const afegir = (id, severitat, detall, cita, camp, extra) => {
    if (!esTextUtil(cita) && !esTextUtil(camp)) return; // regla: cita o camp, sempre
    problemes.push(Object.assign({ id, severitat, detall, cita: cita || '', camp: camp || '' }, extra || {}));
  };

  // ── Longitud ──────────────────────────────────────────────
  const dinsInterval = caracters >= CONTE_MIN_CARACTERS && caracters <= CONTE_MAX_CARACTERS;
  if (!dinsInterval) {
    const desviacio = caracters < CONTE_MIN_CARACTERS
      ? `${CONTE_MIN_CARACTERS - caracters} caràcters per sota del mínim`
      : `${caracters - CONTE_MAX_CARACTERS} caràcters per sobre del màxim`;
    afegir('longitud', 'alta',
      `El conte té ${caracters} caràcters: ${desviacio}. L'interval vàlid és ${CONTE_MIN_CARACTERS}–${CONTE_MAX_CARACTERS}.`,
      '', 'longitud');
  }

  // ── Repeticions literals ──────────────────────────────────
  // Dues ocurrències poden ser una represa deliberada —en un conte de Dick
  // repetir una fórmula administrativa és un recurs, no un descuit—, així que
  // es reporten com a severitat mitjana. A partir de tres, ja és un tic.
  // Es reporten com a màxim MAX_REPETICIONS_REPORTADES: una llista de vuitanta
  // avisos no la llegeix ningú i equival a no avisar.
  const repeticions = frasesRepetides(net, 8);
  repeticions.slice(0, MAX_REPETICIONS_REPORTADES).forEach((r, i) => {
    afegir(`repeticio_${i}`, r.ocurrencies >= 3 ? 'alta' : 'mitjana',
      `Frase de 8 paraules o més repetida literalment ${r.ocurrencies} vegades.`,
      retallarParaules(r.frase, 12));
  });
  if (repeticions.length > MAX_REPETICIONS_REPORTADES) {
    afegir('repeticions_excedents', 'alta',
      `Hi ha ${repeticions.length} frases de 8 paraules o més repetides; se n'han llistat les ${MAX_REPETICIONS_REPORTADES} primeres.`,
      '', 'repeticions');
  }

  // ── Densitat d'adverbis en -ment ──────────────────────────
  const adv = densitatAdverbisMent(net);
  if (adv.per_mil > LLINDAR_ADVERBIS_PER_MIL) {
    const mesFreq = adv.formes.slice(0, 3).map(f => `${f.forma} (${f.n})`).join(', ');
    afegir('adverbis_ment', 'mitjana',
      `${adv.adverbis} adverbis en -ment: ${adv.per_mil}‰, per sobre del llindar de ${LLINDAR_ADVERBIS_PER_MIL}‰.`,
      '', `adverbis més freqüents: ${mesFreq}`);
  }

  // ── Castellanismes i anglicismes (capa parcial) ───────────
  const lint = lintCatalaParcial(net);
  lint.troballes.forEach((t, i) => {
    afegir(`lint_${t.tipus}_${i}`, 'alta',
      t.tipus === 'castellanisme'
        ? `Castellanisme «${t.forma}» (en català: ${t.correccio}).`
        : `Paraula en anglès «${t.forma}» dins del text narratiu.`,
      t.cita, '', { parcial: true });
  });

  // ── Format de diàleg ──────────────────────────────────────
  const dialeg = formatDialegInconsistent(net);
  if (dialeg.inconsistent) {
    afegir('format_dialeg', 'mitjana',
      `El conte barreja ${dialeg.guions} paràgrafs de diàleg amb guió llarg i ${dialeg.cometes} amb cometes. El format ha de ser únic.`,
      dialeg.cita);
  }

  // ── Personatges del dossier absents del text ──────────────
  const personatges = [];
  if (d.protagonista && esTextUtil(d.protagonista.nom)) personatges.push(String(d.protagonista.nom).trim());
  (Array.isArray(d.secundaris) ? d.secundaris : []).forEach(s => {
    if (s && esTextUtil(s.nom)) personatges.push(String(s.nom).trim());
  });
  const netMinuscula = net.toLowerCase();
  personatges.forEach(nom => {
    // Un nom compost es dona per present si hi apareix qualsevol dels seus
    // components significatius: al text s'hi sol dir només el cognom.
    const parts = nom.split(/\s+/).filter(p => p.replace(/[^\p{L}]/gu, '').length >= 3);
    const candidats = parts.length ? parts : [nom];
    const present = candidats.some(p => netMinuscula.includes(p.toLowerCase()));
    if (!present) {
      afegir(`personatge_absent_${nom}`, 'alta',
        `El personatge «${nom}» és al dossier però no apareix mai al text.`,
        '', `personatge: ${nom}`);
    }
  });

  // ── Fets canònics contradits per una xifra diferent ───────
  // Heurística explícita: només mira frases que comparteixen dues paraules
  // distintives amb el fet i que contenen una xifra del mateix format que la
  // del fet sense contenir la del fet. Marcada com a heurística perquè la
  // interfície no la presenti com una comprovació.
  const frases = net.split(/(?<=[.!?…])\s+/);
  (Array.isArray(d.fets_canonics) ? d.fets_canonics : []).filter(esTextUtil).forEach((fet, iFet) => {
    const nombresFet = extreureNombres(fet);
    if (nombresFet.length === 0) return;
    const clausFet = new Set(paraulesDistintives(fet));
    if (clausFet.size < 2) return;

    for (let i = 0; i < frases.length; i++) {
      const frase = frases[i];
      const nombresFrase = extreureNombres(frase);
      if (nombresFrase.length === 0) continue;
      const comuns = paraulesDistintives(frase).filter(p => clausFet.has(p));
      if (new Set(comuns).size < 2) continue;
      // Si la xifra del fet hi és, no hi ha contradicció.
      if (nombresFet.some(n => nombresFrase.indexOf(n) >= 0)) continue;
      // Només comparem xifres del mateix format (mateix nombre de dígits):
      // un any contra un any, un import contra un import.
      const mateixFormat = nombresFrase.some(n => nombresFet.some(f => n.length === f.length));
      if (!mateixFormat) continue;

      afegir(`fet_canonic_${iFet}`, 'mitjana',
        `Possible contradicció amb el fet canònic «${retallar(fet, 90)}»: la frase porta ${nombresFrase.join(', ')} i el fet diu ${nombresFet.join(', ')}.`,
        retallarParaules(frase, 12), '', { heuristica: true });
      break; // una troballa per fet: la resta serien la mateixa notícia
    }
  });

  // ── Frases que el protagonista no diria mai ───────────────
  const maiDiria = ((d.protagonista || {}).veu || {}).mai_diria;
  (Array.isArray(maiDiria) ? maiDiria : []).filter(esTextUtil).forEach((frase, i) => {
    const nucli = String(frase).trim().replace(/^[—–"«]\s*/, '').replace(/[.!?…"»]+$/, '');
    if (nucli.split(/\s+/).length < 3) return; // massa curt: marcaria qualsevol cosa
    if (netMinuscula.includes(nucli.toLowerCase())) {
      afegir(`mai_diria_${i}`, 'alta',
        `Al text hi apareix literalment una frase que el dossier declara que el protagonista no diria mai.`,
        retallarParaules(nucli, 12));
    }
  });

  // ── Desviació de cada escena respecte del seu pressupost ──
  const trossos = net.split(SEPARADOR_ESCENA_NORMALITZAT);
  if (escenes.length > 0 && trossos.length === escenes.length) {
    trossos.forEach((tros, i) => {
      const objectiu = Number((escenes[i] || {}).caracters_objectiu) || 0;
      if (objectiu <= 0) return;
      const reals = tros.length;
      const desviacio = Math.abs(reals - objectiu) / objectiu;
      if (desviacio > TOLERANCIA_ESCENA) {
        afegir(`escena_longitud_${i}`, 'baixa',
          `L'escena ${i + 1} té ${reals} caràcters i en tenia ${objectiu} d'objectiu (${Math.round(desviacio * 100)}% de desviació, tolerància ${Math.round(TOLERANCIA_ESCENA * 100)}%).`,
          '', `escena ${i + 1}`);
      }
    });
  } else if (escenes.length > 0) {
    afegir('escenes_no_delimitades', 'baixa',
      `No s'ha pogut retallar el text per escenes (${trossos.length} trossos per ${escenes.length} escenes): la comprovació de longitud per escena s'ha saltat.`,
      '', 'delimitació d\'escenes');
  }

  // ── Compliment heurístic dels contractes d'escena ─────────
  if (escenes.length > 0 && trossos.length === escenes.length) {
    trossos.forEach((tros, i) => {
      const c = escenes[i] || {};
      const trosMinuscula = tros.toLowerCase();
      const absents = [];
      [['obstacle', c.obstacle], ['cost_immediat', c.cost_immediat], ['consequencia', c.consequencia]]
        .forEach(([camp, valor]) => {
          if (!esTextUtil(valor)) return;
          const claus = paraulesDistintives(valor);
          if (claus.length === 0) return;
          const encerts = claus.filter(k => trosMinuscula.includes(k)).length;
          // Amb menys d'un terç de les paraules distintives al text, la
          // presència del contracte és dubtosa. És una pista, no un veredicte.
          if (encerts / claus.length < 0.34) absents.push(camp);
        });
      if (absents.length > 0) {
        afegir(`contracte_escena_${i}`, 'baixa',
          `A l'escena ${i + 1} costa trobar el contracte: ${absents.join(', ')}. Comprovació heurística per coincidència de vocabulari, no un veredicte.`,
          retallarParaules(tros.slice(0, 200), 12), '', { heuristica: true });
      }
    });
  }

  return {
    caracters,
    paraules: comptaParaules(net),
    dins_interval: dinsInterval,
    objectiu: CONTE_OBJECTIU_CARACTERS,
    interval: [CONTE_MIN_CARACTERS, CONTE_MAX_CARACTERS],
    lint_parcial: true,
    problemes
  };
}

// ═══════════════════════════════════════════════════════════
//  11. PEDAÇOS — l'única manera de tocar el text acabat
// ═══════════════════════════════════════════════════════════

const MOTIUS_CANVI_LONGITUD = new Set(['expansio', 'retall']);
const MARGE_LONGITUD_PEDAC = 0.25;

function comptarOcurrencies(text, fragment) {
  if (!fragment) return 0;
  let n = 0;
  let i = text.indexOf(fragment);
  while (i !== -1) {
    n += 1;
    i = text.indexOf(fragment, i + fragment.length);
  }
  return n;
}

// Aplica una llista de pedaços { cerca, substitueix, motiu }.
// Un pedaç es rebutja si:
//   · 'cerca' no apareix EXACTAMENT un cop al text del moment
//   · 'substitueix' canvia la longitud més d'un 25% sense motiu 'expansio' o 'retall'
//   · deixaria un paràgraf sencer buit
// Mai llança: sempre retorna un text (l'original si no s'aplica res).
function aplicarPedacos(text, pedacos) {
  let actual = String(text == null ? '' : text);
  const aplicats = [];
  const rebutjats = [];
  const llista = Array.isArray(pedacos) ? pedacos : [];

  llista.forEach((pedac, i) => {
    try {
      const p = pedac || {};
      const cerca = typeof p.cerca === 'string' ? p.cerca : '';
      const substitueix = typeof p.substitueix === 'string' ? p.substitueix : '';
      const motiu = String(p.motiu || '').trim().toLowerCase();

      if (!cerca) {
        rebutjats.push({ pedac: p, motiu: "el pedaç no porta cap fragment a cercar" });
        return;
      }

      const n = comptarOcurrencies(actual, cerca);
      if (n === 0) {
        rebutjats.push({ pedac: p, motiu: "el fragment a cercar no apareix al text (el model no l'ha citat literalment)" });
        return;
      }
      if (n > 1) {
        rebutjats.push({ pedac: p, motiu: `el fragment a cercar apareix ${n} vegades: no es pot saber quina s'ha de canviar` });
        return;
      }

      const delta = Math.abs(substitueix.length - cerca.length) / Math.max(1, cerca.length);
      if (delta > MARGE_LONGITUD_PEDAC && !MOTIUS_CANVI_LONGITUD.has(motiu)) {
        rebutjats.push({
          pedac: p,
          motiu: `canvia la longitud un ${Math.round(delta * 100)}% (màxim ${Math.round(MARGE_LONGITUD_PEDAC * 100)}%) i el motiu no és «expansio» ni «retall»`
        });
        return;
      }

      const proposta = actual.split(cerca).join(substitueix);
      if (buidaUnParagraf(actual, proposta)) {
        rebutjats.push({ pedac: p, motiu: 'deixaria un paràgraf sencer buit' });
        return;
      }

      actual = proposta;
      aplicats.push({ pedac: p, ordre: i });
    } catch (err) {
      rebutjats.push({ pedac: pedac || {}, motiu: 'error en aplicar el pedaç: ' + (err && err.message ? err.message : String(err)) });
    }
  });

  return { text: actual, aplicats, rebutjats };
}

// Cert si el canvi fa desaparèixer un paràgraf que abans tenia contingut.
function buidaUnParagraf(abans, despres) {
  const parAbans = abans.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).length;
  const parDespres = despres.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).length;
  if (parDespres < parAbans) return true;
  // Un paràgraf que existeix però que ha quedat buit de lletres.
  return despres.split(/\n\s*\n/).some(p => p.length > 0 && p.trim().length === 0);
}

// ═══════════════════════════════════════════════════════════
//  11 bis. COHERÈNCIA GLOBAL POST-EDICIÓ
//
//  aplicarPedacos garanteix que cada pedaç s'aplica on toca. No garanteix res
//  sobre la RESTA del text, i és allà on van aparèixer els destrosses reals:
//
//   · una revisió que va tocar 90 caràcters sobre 18.700 va canviar una
//     classificació impresa i va deixar quatre línies més avall una frase que
//     parlava d'una paraula que ja no hi era;
//   · un altre pedaç va deixar la mateixa frase dues vegades seguides;
//   · un tercer va esborrar unes opcions i va deixar les clàusules que les
//     justificaven penjades de res.
//
//  Aquesta passada mira SEMPRE el text sencer, mai el fragment editat, i no
//  gasta cap token. Les cinc comprovacions viuen a CRITERIS_COHERENCIA_GLOBAL i
//  els seus paràmetres, a les constants de sota: totes dues coses són
//  editables sense tocar cap prompt.
// ═══════════════════════════════════════════════════════════

// Dues frases iguals a més distància que aquesta ja no són un descuit d'edició:
// en un conte de Dick, repetir una fórmula administrativa és un recurs.
const DISTANCIA_PARAGRAFS_DUPLICAT = 3;
// Coeficient de Dice sobre les paraules. 1 és idèntica. A 0,75 hi entra la
// frase repetida amb dues paraules canviades («…aquella nit» / «…aquell
// vespre»), que és el residu d'edició típic, i encara queda molt marge per
// sobre de dues frases del mateix tema amb contingut diferent, que es queden
// al voltant de 0,3. Per sota d'1 es reporta com a heurística.
const LLINDAR_SIMILITUD_FRASE = 0.75;
const MIN_PARAULES_FRASE_DUPLICADA = 5;
// Un terme que surt més vegades que això al conte és vocabulari, no una
// designació concreta: canviar-lo en un lloc no trenca cap cadena.
const MAX_OCURRENCIES_REFERENCIA = 6;
const MAX_PROBLEMES_PER_CRITERI = 6;

// Obertures que depenen d'alguna cosa dita abans. Llista tancada, com la dels
// castellanismes: no es dedueix per categoria gramatical.
const CONNECTORS_DEPENDENTS = [
  'perquè', 'ja que', 'atès que', 'com que', 'per això', 'per tant',
  'de manera que', 'en canvi', 'l\'altra', 'la primera', 'la segona',
  'aquesta opció', 'aquesta possibilitat', 'l\'altra opció', 'cap de les dues',
  'totes dues', 'la diferència'
];

// Marques amb què s'anuncia una cosa que ha de tornar: una condició, un horari,
// una amenaça ajornada. Serveixen per no acusar de setup sense pagament
// qualsevol paraula llarga que aparegui un sol cop.
const MARCADORS_ANUNCI = [
  'si ', 'quan ', 'abans que', 'després de', 'a partir de', 'cada nit',
  'cada matí', 'a partir d\'', 'hauria de', 'hauria d\'', 'podria', 'pot arribar a',
  'en cas de', 'mai no s\'ha de', 'no s\'ha de', 'està prohibit', 'obliga a'
];

const CRITERIS_COHERENCIA_GLOBAL = [
  {
    id: 'frases_duplicades',
    nom: 'Frases duplicades',
    que_detecta: `Frases idèntiques o quasi idèntiques a menys de ${DISTANCIA_PARAGRAFS_DUPLICAT} paràgrafs de distància.`,
    necessita_edicio: false
  },
  {
    id: 'referencies_trencades',
    nom: 'Referències trencades',
    que_detecta: 'Termes que una edició ha tret d\'un lloc i que segueixen apareixent en un altre, on ja no tenen a què referir-se.',
    necessita_edicio: true
  },
  {
    id: 'setups_sense_pagament',
    nom: 'Setups sense pagament',
    que_detecta: 'Objectes, dades o amenaces que s\'introdueixen i no es recuperen mai.',
    necessita_edicio: false
  },
  {
    id: 'clausules_orfenes',
    nom: 'Clàusules òrfenes',
    que_detecta: 'Fragments que justifiquen o contrasten una cosa que l\'edició ha esborrat.',
    necessita_edicio: true
  },
  {
    id: 'longitud',
    nom: 'Comptador de caràcters',
    que_detecta: `El text ha de quedar dins de ${CONTE_MIN_CARACTERS}–${CONTE_MAX_CARACTERS} caràcters amb espais.`,
    necessita_edicio: false
  }
];

// Un paràgraf és un bloc de línia no buida. Es compta sobre el text tal com
// arriba, perquè normalitzarTextConte ja converteix els salts dobles en simples
// i la distància s'ha de poder mesurar en tots dos casos.
function paragrafsDeText(text) {
  return String(text == null ? '' : text)
    .split(/\n\s*\n|\n/)
    .map(p => p.trim())
    .filter(Boolean);
}

// Cada frase amb el número de paràgraf on viu.
function frasesAmbParagraf(text) {
  const resultat = [];
  paragrafsDeText(text).forEach((paragraf, iParagraf) => {
    paragraf.split(/(?<=[.!?…])\s+/).forEach(frase => {
      const neta = frase.trim();
      if (neta) resultat.push({ frase: neta, paragraf: iParagraf });
    });
  });
  return resultat;
}

function tokensFrase(frase) {
  return String(frase || '').toLowerCase()
    .split(/[^\p{L}\p{N}·']+/u)
    .filter(Boolean);
}

// Coeficient de Dice sobre multiconjunts de paraules: 1 si són la mateixa
// frase, i baixa de pressa quan canvia el contingut i no només l'ordre.
function similitudFrases(a, b) {
  const ta = tokensFrase(a);
  const tb = tokensFrase(b);
  if (!ta.length || !tb.length) return 0;
  const restants = new Map();
  tb.forEach(t => restants.set(t, (restants.get(t) || 0) + 1));
  let comuns = 0;
  ta.forEach(t => {
    const n = restants.get(t) || 0;
    if (n > 0) { comuns += 1; restants.set(t, n - 1); }
  });
  return (2 * comuns) / (ta.length + tb.length);
}

// Les paraules amb contingut d'un fragment. Serveix per saber si una edició ha
// esborrat material del conte, no per acusar ningú de trencar cap referència.
function termesDestacats(fragment) {
  const text = String(fragment || '');
  const majuscules = (text.match(/\b[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ·'-]{3,}\b/g) || []).map(t => t.toLowerCase());
  return [...new Set(paraulesDistintives(text).concat(majuscules))];
}

// El vocabulari propi d'aquest conte: noms de personatge, objectes clau, lloc i
// fets canònics. Surt del dossier, que és l'única font de veritat narrativa.
function vocabulariCanonic(dossier) {
  const d = dossier || {};
  const trossos = [(d.protagonista || {}).nom || '', (d.mon || {}).lloc || ''];
  (Array.isArray(d.secundaris) ? d.secundaris : []).forEach(s => trossos.push((s && s.nom) || ''));
  (Array.isArray(d.objectes_clau) ? d.objectes_clau : []).forEach(o => trossos.push((o && o.nom) || ''));
  (Array.isArray(d.fets_canonics) ? d.fets_canonics : []).forEach(f => trossos.push(f || ''));
  const paraules = new Set();
  trossos.forEach(t => paraulesDistintives(t).forEach(p => paraules.add(p)));
  return paraules;
}

// Les DESIGNACIONS d'un fragment: el que anomena una cosa concreta i sosté una
// cadena al llarg del conte. Tres orígens i cap més:
//   · majúscules —les classificacions impreses i els noms d'imprès—,
//   · noms propis, descomptant la paraula que obre cada frase,
//   · vocabulari canònic del dossier.
// Sense aquest filtre, la comprovació marcaria qualsevol paraula que un pedaç
// d'estil hagi canviat de lloc ('calaix' per 'caixa'), i dotze pedaços de
// costura produirien dotze avisos que no assenyalen res.
function designacionsDelFragment(fragment, canonic) {
  const text = String(fragment || '');
  const majuscules = (text.match(/\b[A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ·'-]{3,}\b/g) || []).map(t => t.toLowerCase());

  const propis = [];
  text.split(/(?<=[.!?…])\s+|\n+/).forEach(frase => {
    frase.trim().split(/\s+/).slice(1).forEach(paraula => {
      const net = paraula.replace(/^[—–«"(]+/, '').replace(/[.,;:!?…»")]+$/, '');
      if (/^[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ·'-]{2,}$/.test(net)) propis.push(net.toLowerCase());
    });
  });

  const delDossier = paraulesDistintives(text).filter(t => canonic && canonic.has(t));
  return [...new Set(majuscules.concat(propis, delDossier))];
}

function ocurrenciesInsensibles(text, terme) {
  if (!terme) return 0;
  const re = new RegExp(escaparRegex(terme), 'gi');
  return (String(text || '').match(re) || []).length;
}

// Retorna { caracters, dins_interval, comprovacions, problemes, moment }.
//
// 'context' pot portar { textAnterior, pedacos, dossier, escaleta, origen }.
// Sense textAnterior i pedaços, les dues comprovacions que necessiten saber què
// s'ha canviat no s'executen i ho DIUEN: una comprovació que no s'ha fet no es
// pot presentar com una comprovació que ha passat.
function validarCoherenciaGlobal(text, context) {
  const ctx = context || {};
  const sencer = String(text == null ? '' : text);
  const net = normalitzarTextConte(sencer);
  const problemes = [];
  const comptador = {};

  const afegir = (criteri, severitat, detall, cita, camp, extra) => {
    if (!esTextUtil(cita) && !esTextUtil(camp)) return; // la mateixa regla de l'auditoria
    comptador[criteri] = (comptador[criteri] || 0) + 1;
    if (comptador[criteri] > MAX_PROBLEMES_PER_CRITERI) return;
    problemes.push(Object.assign(
      { id: `${criteri}_${comptador[criteri]}`, criteri, severitat, detall, cita: cita || '', camp: camp || '' },
      extra || {}));
  };

  const pedacos = (Array.isArray(ctx.pedacos) ? ctx.pedacos : [])
    .map(p => (p && p.pedac) ? p.pedac : p)
    .filter(p => p && typeof p.cerca === 'string');
  const textAnterior = typeof ctx.textAnterior === 'string' ? ctx.textAnterior : '';
  const teEdicio = pedacos.length > 0 && !!textAnterior;

  // ── 1. Frases duplicades ──────────────────────────────────
  const frases = frasesAmbParagraf(sencer);
  for (let i = 0; i < frases.length; i++) {
    const a = frases[i];
    if (tokensFrase(a.frase).length < MIN_PARAULES_FRASE_DUPLICADA) continue;
    for (let j = i + 1; j < frases.length; j++) {
      const b = frases[j];
      if (b.paragraf - a.paragraf > DISTANCIA_PARAGRAFS_DUPLICAT) break;
      if (tokensFrase(b.frase).length < MIN_PARAULES_FRASE_DUPLICADA) continue;
      const s = similitudFrases(a.frase, b.frase);
      if (s < LLINDAR_SIMILITUD_FRASE) continue;
      afegir('frases_duplicades', s === 1 ? 'alta' : 'mitjana',
        s === 1
          ? `Aquesta frase apareix dues vegades a ${b.paragraf - a.paragraf} paràgrafs de distància.`
          : `Dues frases quasi idèntiques (${Math.round(s * 100)}% de coincidència) a ${b.paragraf - a.paragraf} paràgrafs de distància: «${retallarParaules(b.frase, 12)}».`,
        retallarParaules(a.frase, 12), '', s === 1 ? undefined : { heuristica: true });
      break; // una troballa per frase: la resta serien la mateixa notícia
    }
  }

  // ── 2. Referències trencades ──────────────────────────────
  if (teEdicio) {
    const canonic = vocabulariCanonic(ctx.dossier);
    const jaReportat = new Set();
    pedacos.forEach(p => {
      const treguts = designacionsDelFragment(p.cerca, canonic)
        .filter(t => ocurrenciesInsensibles(p.substitueix || '', t) === 0);
      treguts.forEach(terme => {
        if (jaReportat.has(terme)) return;
        const abans = ocurrenciesInsensibles(textAnterior, terme);
        if (abans === 0 || abans > MAX_OCURRENCIES_REFERENCIA) return; // vocabulari, no designació
        const despres = ocurrenciesInsensibles(sencer, terme);
        if (despres === 0) return;
        jaReportat.add(terme);
        const frase = frases.find(f => ocurrenciesInsensibles(f.frase, terme) > 0);
        afegir('referencies_trencades', 'alta',
          `L'edició ha tret «${terme}» d'un lloc i el terme encara apareix ${despres} ${despres === 1 ? 'vegada' : 'vegades'} més al conte. Comprova que el que hi queda segueix tenint a què referir-se.`,
          frase ? retallarParaules(frase.frase, 14) : '', `terme: ${terme}`);
      });
    });
  }

  // ── 3. Setups sense pagament ──────────────────────────────
  // Part determinista: el que el dossier i l'escaleta havien promès.
  const d = ctx.dossier || {};
  const netMinuscula = net.toLowerCase();
  (Array.isArray(d.objectes_clau) ? d.objectes_clau : []).forEach(o => {
    if (!o || !esTextUtil(o.nom)) return;
    const claus = paraulesDistintives(o.nom);
    if (!claus.length) return;
    const aparicions = Math.max(...claus.map(k => ocurrenciesInsensibles(netMinuscula, k)));
    if (aparicions === 1) {
      afegir('setups_sense_pagament', 'mitjana',
        `L'objecte clau «${retallar(o.nom, 60)}» apareix una sola vegada al conte: s'introdueix i no es recupera.`,
        '', `objecte_clau: ${retallar(o.nom, 60)}`);
    }
  });

  const escenes = Array.isArray(ctx.escaleta)
    ? ctx.escaleta
    : (ctx.escaleta && Array.isArray(ctx.escaleta.escenes) ? ctx.escaleta.escenes : []);
  escenes.forEach((e, i) => {
    const enDisputa = e && e.objecte_o_informacio_en_disputa;
    if (!esTextUtil(enDisputa)) return;
    const claus = paraulesDistintives(enDisputa);
    if (claus.length === 0) return;
    const presents = claus.filter(k => netMinuscula.includes(k));
    if (presents.length === 0) {
      afegir('setups_sense_pagament', 'mitjana',
        `El que l'escena ${i + 1} posava en disputa —«${retallar(enDisputa, 60)}»— no apareix enlloc del text.`,
        '', `escena ${i + 1}`, { heuristica: true });
    }
  });

  // Part heurística, i marcada com a tal: una cosa anunciada amb condició o amb
  // horari («el sedant de ventilació de després de mitjanit») que no torna mai.
  // El filtre és estret a propòsit: sense el marcador d'anunci, qualsevol
  // paraula llarga que surti un sol cop seria una acusació, i un validador que
  // es queixa de text correcte s'acaba ignorant.
  const meitat = Math.floor(frases.length * 0.6);
  const anunciats = new Set();
  frases.slice(0, meitat).forEach(f => {
    const minuscula = f.frase.toLowerCase();
    if (!MARCADORS_ANUNCI.some(m => minuscula.includes(m))) return;
    paraulesDistintives(f.frase)
      .filter(t => t.length >= 8 && !anunciats.has(t))
      .forEach(terme => {
        if (ocurrenciesInsensibles(netMinuscula, terme) !== 1) return;
        anunciats.add(terme);
        afegir('setups_sense_pagament', 'baixa',
          `«${terme}» s'anuncia en una frase condicional o d'horari i no torna a aparèixer mai més.`,
          retallarParaules(f.frase, 14), '', { heuristica: true });
      });
  });

  // ── 4. Clàusules òrfenes ──────────────────────────────────
  if (teEdicio) {
    const paragrafs = paragrafsDeText(sencer);
    pedacos.forEach(p => {
      const treguts = termesDestacats(p.cerca)
        .filter(t => ocurrenciesInsensibles(p.substitueix || '', t) === 0)
        .filter(t => ocurrenciesInsensibles(sencer, t) === 0);
      if (treguts.length === 0) return; // no s'ha esborrat res que es pugui haver quedat orfe

      const iParagraf = paragrafs.findIndex(x => p.substitueix && x.includes(p.substitueix));
      if (iParagraf < 0) return;
      paragrafs.slice(iParagraf, iParagraf + 2).forEach(paragraf => {
        paragraf.split(/(?<=[.!?…])\s+/).forEach(frase => {
          const neta = frase.trim();
          // La frase que acaba d'escriure el pedaç no pot quedar òrfena d'ella
          // mateixa: el que es busca és el que ha quedat penjat al voltant.
          if (p.substitueix && p.substitueix.includes(neta)) return;
          const minuscula = neta.toLowerCase().replace(/^[—–«"]\s*/, '');
          const connector = CONNECTORS_DEPENDENTS.find(c => minuscula.startsWith(c));
          if (!connector) return;
          afegir('clausules_orfenes', 'mitjana',
            `Aquesta frase comença per «${connector}» i l'edició acaba d'esborrar del conte ${treguts.length === 1 ? 'el terme' : 'els termes'} ${treguts.map(t => `«${t}»`).join(', ')}. Comprova que encara justifica alguna cosa que hi consti.`,
            retallarParaules(neta, 14), '', { heuristica: true });
        });
      });
    });
  }

  // ── 5. Comptador de caràcters ─────────────────────────────
  const caracters = net.length;
  const dinsInterval = caracters >= CONTE_MIN_CARACTERS && caracters <= CONTE_MAX_CARACTERS;
  if (!dinsInterval) {
    afegir('longitud', 'alta',
      caracters < CONTE_MIN_CARACTERS
        ? `Després de l'edició el conte té ${caracters} caràcters: ${CONTE_MIN_CARACTERS - caracters} per sota del mínim.`
        : `Després de l'edició el conte té ${caracters} caràcters: ${caracters - CONTE_MAX_CARACTERS} per sobre del màxim.`,
      '', 'longitud');
  }

  // Cada criteri diu si s'ha executat i quantes troballes ha tingut. Un criteri
  // que no s'ha pogut executar no es pot presentar com un criteri superat.
  const comprovacions = CRITERIS_COHERENCIA_GLOBAL.map(c => {
    const executada = c.necessita_edicio ? teEdicio : true;
    const trobades = comptador[c.id] || 0;
    return {
      id: c.id,
      nom: c.nom,
      que_detecta: c.que_detecta,
      executada,
      motiu_no_executada: executada ? '' : 'Necessita saber què s\'ha canviat: no hi ha ni text anterior ni llista de pedaços.',
      trobades,
      reportades: Math.min(trobades, MAX_PROBLEMES_PER_CRITERI)
    };
  });

  return {
    caracters,
    dins_interval: dinsInterval,
    interval: [CONTE_MIN_CARACTERS, CONTE_MAX_CARACTERS],
    sobre: 'text sencer',
    origen: String(ctx.origen || ''),
    amb_context_d_edicio: teEdicio,
    comprovacions,
    problemes,
    moment: new Date().toISOString()
  };
}

// ═══════════════════════════════════════════════════════════
//  12. MOTIUS VETATS
//
//  TOPICS_PROHIBITS prohibeix NOMS: escriure «Ubik» o «Precrim». Això no impedeix
//  reproduir el mecanisme amb un altre nom, que és exactament el que passava: un
//  conte que recombinava quatre invencions conegudes del cànon de Dick sense
//  citar-ne cap paraula.
//
//  Aquesta llista prohibeix MECANISMES. Cada entrada porta:
//   · mecanisme — el nom del dispositiu, perquè el model no el pugui reproduir
//     sense adonar-se'n que l'està reproduint;
//   · disfressa — la forma en què torna quan se li canvia la superfície, que és
//     com tornen sempre.
//
//  L'estil de Dick és la manera d'escriure la paranoia burocràtica i
//  ontològica, no aquest catàleg d'objectes. La llista és editable: treure'n una
//  entrada torna a obrir el mecanisme al generador.
// ═══════════════════════════════════════════════════════════

const MOTIUS_VETATS = [
  {
    id: 'entropia_regressiva',
    mecanisme: "Regressió o entropia d'objectes: coses que es desfan, envelleixen, perden massa o retrocedeixen a una forma anterior d'elles mateixes.",
    disfressa: "El producte que caduca abans d'hora i es converteix en el que era abans de ser fabricat; l'habitació que torna a ser com era fa vint anys."
  },
  {
    id: 'precrim',
    mecanisme: "Predicció o autorització administrativa d'un fet abans que passi: l'expedient, la condemna, la indemnització o la factura arriben abans que allò que registren.",
    disfressa: "L'asseguradora que paga el sinistre el dia abans; l'oficina que arxiva com a ferma una resolució sobre demà."
  },
  {
    id: 'entorn_fals',
    mecanisme: "Ciutat, poble, barri o centre de treball falsos que amaguen al darrere una realitat devastada.",
    disfressa: "El decorat que s'acaba a la sortida del poble; la finestra que dona a una projecció; la vila reconstruïda damunt d'una plana cremada o vitrificada."
  },
  {
    id: 'aparell_que_cobra',
    mecanisme: "Electrodomèstics, portes, ascensors o mobiliari que exigeixen un pagament per fer la seva funció.",
    disfressa: "La nevera que factura per obrir-se; l'ascensor que demana un suplement per pujar; la cadira de casa que es cobra per hores."
  },
  {
    id: 'records_comprats',
    mecanisme: "Records implantats, comprats, venuts o extrets com a servei.",
    disfressa: "L'agència que ven un viatge que no s'ha fet; la clínica que esborra un dol; el personatge que descobreix que la seva infantesa és d'algú altre."
  },
  {
    id: 'simulacre_que_dubta',
    mecanisme: "Simulacres, androides, clons o màquines que dubten de la seva pròpia humanitat, o protagonista que descobreix que no és humà.",
    disfressa: "El test que el personatge no supera; la ferida que ensenya cables; el company de feina que resulta fabricat."
  },
  {
    id: 'droga_que_obre_realitats',
    mecanisme: "Una droga —clandestina, prescrita o obligatòria— que obre, revela o travessa capes de realitat.",
    disfressa: "La pastilla que deixa veure el món de debò; la substància compartida que porta tothom al mateix lloc."
  },
  {
    id: 'entitat_gravada',
    mecanisme: "L'entitat divina, fundacional o corporativa que resulta ser una gravació, un bucle o un mort que continua emetent.",
    disfressa: "El déu que repeteix sempre la mateixa frase; la veu del sistema que és un enregistrament antic; el fundador que continua signant des d'una cinta."
  }
];

// ═══════════════════════════════════════════════════════════
//  12 bis. CRITERIS DE REVISIÓ LINGÜÍSTICA
//
//  Control de qualitat de llengua, no d'estil. Cap d'aquests tres no es pot
//  comprovar amb la llista tancada de lintCatalaParcial —fan falta el context i
//  el conte sencer—, i per això són l'única part de la llengua que sí que es
//  pregunta a un model. Van al prompt de costura i al de pedaç dirigit.
//
//  Els exemples surten de defectes reals observats a la sortida del generador.
// ═══════════════════════════════════════════════════════════

const CRITERIS_LLENGUA_REVISIO = [
  {
    id: 'verbs_inventats',
    criteri: "Verbs i paraules que no existeixen en català, formats per analogia a partir d'un substantiu. Si dubtes que una forma sigui al diccionari, substitueix-la per la que hi és.",
    exemple: "«gargamellejar» no existeix; la paraula que es volia dir era «gorgotejar»."
  },
  {
    id: 'tractament',
    criteri: "Coherència de tractament: per cada parella de personatges, un sol tractament (vostè, tu o vós) de la primera frase a l'última. Un canvi només val si és un gest narratiu deliberat i el text el marca.",
    exemple: "La protagonista tracta el supervisor de vostè tot el conte i de sobte li diu «Digueu:»."
  },
  {
    id: 'designacio_objectes',
    criteri: "Coherència de designació dels objectes i les accions recurrents: una mateixa cosa es diu sempre igual, tret que el canvi de nom signifiqui alguna cosa.",
    exemple: "«va prémer el silenci» i «va prémer el botó de silenci» per a la mateixa acció."
  }
];

// ═══════════════════════════════════════════════════════════
//  12 ter. BANC DE MOTIUS PKD
//
//  Un generador PKD sense control escriu sempre el mateix conte: androides,
//  drogues, simulació. El banc reparteix el ventall real de Dick i cada motiu
//  porta el clixé concret que tendeix a produir, perquè el prompt el pugui
//  prohibir pel seu nom.
//
//  Els motius amb 'vetat_per' són els que coincidien amb un mecanisme de
//  MOTIUS_VETATS: es conserven amb el motiu del veto a la vista, però
//  triarMotius no els proposa mai. Oferir-los i prohibir-los al mateix prompt
//  seria demanar-li al model dues coses contràries alhora.
// ═══════════════════════════════════════════════════════════

const BANC_MOTIUS_PKD = [
  {
    id: 'precognicio_administrativa',
    vetat_per: 'precrim',
    motiu: "Una oficina emet resolucions sobre fets que encara no han passat i les arxiva com si ja fossin ferms.",
    tensio: "Si la decisió ja està presa i registrada, què queda del que el protagonista farà demà?",
    evita: "El vident torturat en una banyera amb elèctrodes, i la persecució per evitar un assassinat anunciat."
  },
  {
    id: 'historia_alternativa_domestica',
    motiu: "El resultat d'una guerra que tothom recorda d'una manera consta a l'inrevés a tots els impresos oficials.",
    tensio: "Quina versió del passat és la que sosté el present que el protagonista habita?",
    evita: "El mapa amb les banderes de l'imperi vencedor i el discurs del dirigent uniformat com a escena d'obertura."
  },
  {
    id: 'entropia_dels_objectes',
    vetat_per: 'entropia_regressiva',
    motiu: "Els objectes de casa es degraden més de pressa del que haurien i ningú no en porta el compte.",
    tensio: "Si tot es desfà a un ritme que no quadra, quant fa que dura de debò el que sembla d'ahir?",
    evita: "L'apartament ple de deixalles descrit com a metàfora de la decadència moral del protagonista."
  },
  {
    id: 'replica_d_antiguitats',
    motiu: "Un taller fabrica peces d'època amb certificat i el certificat és més antic que la peça.",
    tensio: "Què fa que un objecte sigui autèntic si l'única prova és un paper que també es pot fabricar?",
    evita: "L'expert que descobreix la falsificació mirant una peça amb lupa i proclamant-ho en veu alta."
  },
  {
    id: 'religio_de_subscripcio',
    motiu: "Una confessió religiosa es rep per abonament mensual i la comunió arriba per canal domèstic.",
    tensio: "L'experiència compartida és sagrada o només és sincronització d'aparells?",
    evita: "El profeta carismàtic que apareix en pantalla i resulta ser un actor contractat."
  },
  {
    id: 'venedor_de_porta_a_porta',
    motiu: "Un comercial de productes menors descobreix que el seu catàleg conté un article que ningú ha fabricat.",
    tensio: "Qui ha posat aquesta línia al catàleg, i per a qui?",
    evita: "El venedor simpàtic i derrotat que fa de comic relief mentre el món s'ensorra al voltant."
  },
  {
    id: 'test_d_empatia_laboral',
    motiu: "Una empresa avalua l'empatia dels empleats amb un qüestionari trimestral i acomiada els qui puntuen massa alt.",
    tensio: "Per què li convé al sistema que la gent senti menys?",
    evita: "La prova amb la pupil·la que es dilata i la pregunta sobre la tortuga girada de panxa enlaire."
  },
  {
    id: 'lliscament_de_torn',
    motiu: "El protagonista fitxa a l'entrada i a la sortida i entre les dues xifres hi falten hores que no recorda.",
    tensio: "On és el temps que el rellotge de l'empresa registra i el cos no?",
    evita: "El rellotge que va enrere i el protagonista que crida el nom de l'any davant d'un mirall."
  },
  {
    id: 'record_facturat',
    vetat_per: 'records_comprats',
    motiu: "Un servei ven records de vacances que no s'han fet i n'emet la factura amb la data del viatge.",
    tensio: "Un record que va acompanyat de justificant, és més fals o més real que un que no en té?",
    evita: "El client que entra a la botiga a comprar un viatge a un altre planeta i acaba disparant a tothom."
  },
  {
    id: 'corporacio_postuma',
    vetat_per: 'entitat_gravada',
    motiu: "L'empresa segueix signant contractes amb la signatura d'un fundador que consta mort fa dècades.",
    tensio: "Qui decideix, quan la persona que decideix ja no hi és i el sistema continua igual?",
    evita: "El cap conservat en una cambra freda que parla per un altaveu i dona ordres criptiques."
  },
  {
    id: 'telepata_de_finestreta',
    motiu: "Els funcionaris amb capacitat telepàtica tenen la seva pròpia categoria laboral i cobren un complement.",
    tensio: "Què passa amb la intimitat quan llegir el pensament és una competència professional regulada?",
    evita: "L'agència d'anti-telèpates i la guerra secreta de talents psíquics entre corporacions rivals."
  },
  {
    id: 'recepta_obligatoria',
    motiu: "Una medicació d'estat és obligatòria per conservar el lloc de treball i el prospecte no diu què conté.",
    tensio: "Si el que sent és el que la pastilla vol que senti, què és seu?",
    evita: "El viatge psicodèlic descrit amb colors i espirals com a escena central, i que la pastilla obri cap capa de realitat que sense ella no es veiés."
  },
  {
    id: 'consens_fabricat',
    motiu: "Els mitjans donen una notícia amb dades que no coincideixen entre edicions i ningú no rectifica.",
    tensio: "Quantes versions d'un fet poden conviure abans que el fet deixi d'existir?",
    evita: "El periodista heroic que destapa la manipulació i publica la veritat contra tots."
  },
  {
    id: 'colonia_avortada',
    motiu: "Una colònia fora del planeta rep subministraments per a més gent de la que hi queda viva.",
    tensio: "Per a qui es continua enviant el que ningú no recull?",
    evita: "El cúpula geodèsica sota una tempesta de sorra vermella amb l'últim supervivent al centre."
  },
  {
    id: 'burocracia_de_l_existencia',
    motiu: "Un error de registre deixa el protagonista sense constar enlloc i el procediment per constar-hi exigeix constar-hi.",
    tensio: "Existeix qui no surt a cap registre, si tots els drets es demostren amb un registre?",
    evita: "El funcionari kafkià que riu amb malícia darrere d'un mostrador mentre segella un formulari."
  },
  {
    id: 'garantia_que_es_renova_sola',
    vetat_per: 'aparell_que_cobra',
    motiu: "Un electrodomèstic renova la seva garantia sense que ningú l'hagi renovada i factura el càrrec.",
    tensio: "Qui ha acceptat el contracte, si el titular no ha signat res?",
    evita: "L'aparell parlant que xantatgeja el propietari i li exigeix monedes per obrir la porta."
  },
  {
    id: 'doble_de_baixa',
    motiu: "Un company de feina agafa la baixa i el substitut que arriba fa la feina exactament igual, amb els mateixos errors.",
    tensio: "Què es transmet d'una persona a una altra quan el que es transmet és el lloc?",
    evita: "El doble idèntic que apareix a casa del protagonista i lluita per ocupar-ne la vida, i que el substitut resulti ser una màquina que es pregunta si és humana."
  },
  {
    id: 'assegurança_predictiva',
    vetat_per: 'precrim',
    motiu: "Una asseguradora cobra la prima segons un càlcul del que el client farà i el càlcul es compleix.",
    tensio: "La predicció descriu el futur o el fabrica cobrant-lo per endavant?",
    evita: "L'ordinador central omniscient amb una veu freda que anuncia la data de la mort del protagonista."
  },
  {
    id: 'inventari_que_no_quadra',
    motiu: "L'inventari del magatzem porta anys quadrant amb una unitat de més que ningú no ha vist mai.",
    tensio: "Quina cosa hi ha al magatzem que existeix als papers i no a les prestatgeries?",
    evita: "La caixa misteriosa que s'obre al final i conté una llum que ho explica tot."
  },
  {
    id: 'traduccio_automatica_del_dol',
    motiu: "Un servei transcriu les últimes converses dels difunts i les torna en un registre lleugerament diferent.",
    tensio: "Si la veu que respon no diu res que el mort no digués, per què no és ell?",
    evita: "El fantasma digital que demana ser desconnectat en una escena de comiat plorosa."
  },
  {
    id: 'permis_de_residencia_condicional',
    motiu: "El dret a viure en un barri depèn d'una puntuació de conducta que es calcula amb dades que ningú no pot consultar.",
    tensio: "Com es defensa algú d'una acusació que no és una acusació sinó una xifra?",
    evita: "La resistència clandestina als túnels amb un líder que arenga els oprimits."
  },
  {
    id: 'reparador_de_maquines_empatiques',
    motiu: "El protagonista repara aparells de companyia domèstica i comença a trobar-hi reparacions que ell no ha fet.",
    tensio: "Qui més entra a les cases i per què arregla el que no li han demanat?",
    evita: "La màquina que declara el seu amor al tècnic i li demana que no l'apagui, i qualsevol aparell que dubti de si és humà o cobri per funcionar."
  },
  {
    id: 'publicitat_que_respon',
    motiu: "Els anuncis del transport públic contesten preguntes que el protagonista només ha pensat.",
    tensio: "Escolta l'anunci o simplement el protagonista pensa el que li han venut?",
    evita: "L'anunci hologràfic que persegueix el protagonista pel carrer cridant-li el nom."
  },
  {
    id: 'arxiu_que_es_corregeix_sol',
    motiu: "Un expedient consultat dues vegades el mateix dia dona dues versions i totes dues porten segell de validesa.",
    tensio: "Quin dels dos documents és la còpia i quin és l'original, si tots dos són originals?",
    evita: "El ministeri de la veritat amb treballadors que cremen papers en un forn."
  },
  {
    id: 'menjar_que_recorda',
    motiu: "Un producte alimentari de marca blanca reprodueix el gust exacte d'un àpat concret de la infantesa del client.",
    tensio: "D'on ha tret la fàbrica una cosa que només era dins d'un cap?",
    evita: "El menjar sintètic gris descrit amb fàstic com a prova que el futur és trist, i que el gust resulti ser un record implantat, comprat o extret del client."
  },
  {
    id: 'assemblea_de_propietaris',
    motiu: "La comunitat de veïns aprova per unanimitat acords als quals el protagonista no ha assistit mai.",
    tensio: "Qui vota en nom seu, i des de quan?",
    evita: "El veí sinistre que espia per l'espiell i resulta ser un agent del govern."
  },
  {
    id: 'servei_tecnic_del_son',
    motiu: "Una empresa optimitza el son dels treballadors i el contracte inclou la cessió del contingut dels somnis.",
    tensio: "Què és el que la gent lliura quan lliura el que no controla?",
    evita: "La seqüència onírica surrealista narrada en present com a clímax del conte."
  },
  {
    id: 'moneda_local_de_l_empresa',
    motiu: "Part del sou es paga en vals de la companyia i el tipus de canvi el fixa la mateixa companyia cada matí.",
    tensio: "Quant val el treball d'algú quan el que el mesura el fabrica qui el paga?",
    evita: "La revolta dels treballadors amb pancartes i un discurs final sobre la dignitat."
  },
  {
    id: 'peritatge_de_realitat',
    motiu: "Existeix un cos de perits que certifica oficialment si un episodi ha passat, i cobra per informe.",
    tensio: "Si cal un certificat per confirmar el que has viscut, què tens tu sense el certificat?",
    evita: "L'inspector amb gavardina que apareix al final i revela que tot era una simulació."
  },
  {
    id: 'llista_d_espera_hereditaria',
    motiu: "Una llista d'espera d'habitatge es transmet per herència i hi ha gent que hi consta des d'abans de néixer.",
    tensio: "Quina vida s'està vivint mentre s'espera una vida que arribarà per torn?",
    evita: "El sorteig distòpic amb un presentador somrient i una multitud que aplaudeix."
  }
];

// Noms propis i marques de l'obra de Dick i de les seves adaptacions. El
// generador no els pot fer servir mai literalment: l'objectiu és Dick, no un
// pastitx de les seves pel·lícules.
const TOPICS_PROHIBITS = [
  'Rick Deckard', 'Deckard', 'Rachael Rosen', 'Roy Batty', 'Nexus-6', 'Nexus 6',
  'Tyrell', 'Voight-Kampff', 'Voigt-Kampff', 'replicant', 'replicants', 'Blade Runner',
  'Wilbur Mercer', 'mercerisme', 'Buster Friendly', 'caixa d\'empatia', 'empathy box',
  'kipple', 'Rosen Association', 'orgue d\'estats d\'ànim', 'Penfield',
  'Ubik', 'Joe Chip', 'Glen Runciter', 'Runciter', 'semivida', 'half-life',
  'Palmer Eldritch', 'Chew-Z', 'Can-D', 'Perky Pat', 'Barney Mayerson', 'Leo Bulero',
  'Rekal', 'Douglas Quaid', 'Total Recall', 'Desafiament total',
  'Precrim', 'Precrime', 'John Anderton', 'Minority Report', 'informe de la minoria',
  'Mr. Tagomi', 'Tagomi', 'Hawthorne Abendsen', 'The Man in the High Castle',
  'L\'home del castell', 'La llagosta s\'ha posat', 'The Grasshopper Lies Heavy',
  'Substància D', 'Substance D', 'Bob Arctor', 'Scanner Darkly', 'vestit borrós',
  'VALIS', 'Horselover Fat', 'Jason Taverner', 'Autofac', 'Vulcan 3',
  'Sidney\'s', 'WPO', 'Ganímedes de Dick', 'Mars colònia Dick'
];

// Els motius que no estan vetats per cap mecanisme de MOTIUS_VETATS. És l'única
// llista que arriba mai a un prompt.
function motiusDisponibles() {
  return BANC_MOTIUS_PKD.filter(m => !m.vetat_per);
}

// Tria n motius no presents a 'usats'. Si no n'hi ha prou de nous, completa amb
// els MENYS RECENTS (els que apareixen abans a l'històric).
// Determinista: donat el mateix estat, retorna sempre el mateix resultat.
function triarMotius(usats, n) {
  const quants = Math.max(1, Math.round(Number(n) || 3));
  const historic = (Array.isArray(usats) ? usats : []).map(x => String(x && x.id ? x.id : x));
  const disponibles = motiusDisponibles();

  const noUsats = disponibles.filter(m => historic.indexOf(m.id) < 0);
  const triats = noUsats.slice(0, quants);
  if (triats.length >= quants) return triats;

  // Els menys recents primer: l'històric va del més antic al més nou.
  const perAntiguitat = disponibles
    .filter(m => historic.indexOf(m.id) >= 0)
    .sort((a, b) => historic.indexOf(a.id) - historic.indexOf(b.id));

  perAntiguitat.forEach(m => {
    if (triats.length < quants && triats.indexOf(m) < 0) triats.push(m);
  });

  return triats;
}

// ═══════════════════════════════════════════════════════════
//  13. EXPORTACIÓ AMB PATRÓ DE DOBLE ENTORN
//  (el mateix que nkg_core.js: global al navegador, module.exports a node)
// ═══════════════════════════════════════════════════════════

const CONTE_CORE_API = {
  CONTE_MIN_CARACTERS, CONTE_MAX_CARACTERS, CONTE_OBJECTIU_CARACTERS,
  CONTE_MIN_ESCENES, CONTE_MAX_ESCENES, MAX_CRIDES_CONTE, TOLERANCIA_ESCENA,
  SEPARADOR_ESCENA, SEPARADOR_ESCENA_NORMALITZAT, FUNCIONS_PKD, FUNCIONS_PKD_OBLIGATORIES,
  LLINDAR_ADVERBIS_PER_MIL, MARGE_LONGITUD_PEDAC, TITOL_MAX_PARAULES,
  normalitzarTextConte, comptaCaracters, comptaParaules,
  repartirCaracters, pesosPerEscenes,
  crearDossierBuit, validarDossier, fusionarDossierSenseBuidar, esTextUtil,
  validarTitolConte,
  crearContracteEscena, detectarFaltantsContracte, validarGatePKD, indexEscenaFerida,
  contracteFallbackLocal, completarContracteAmbFallback,
  lintCatalaParcial, densitatAdverbisMent, frasesRepetides, formatDialegInconsistent,
  auditoriaDeterministaConte, aplicarPedacos,
  validarCoherenciaGlobal, CRITERIS_COHERENCIA_GLOBAL,
  DISTANCIA_PARAGRAFS_DUPLICAT, LLINDAR_SIMILITUD_FRASE, MAX_OCURRENCIES_REFERENCIA,
  BANC_MOTIUS_PKD, TOPICS_PROHIBITS, triarMotius, motiusDisponibles,
  MOTIUS_VETATS, CRITERIS_LLENGUA_REVISIO,
  CASTELLANISMES, ANGLICISMES, ADVERBIS_MENT,
  retallarParaules, retallar
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONTE_CORE_API;
}
if (typeof globalThis !== 'undefined') {
  globalThis.CONTE_CORE = CONTE_CORE_API;
}
