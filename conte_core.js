(function (arrel) {
  'use strict';

  const CONTE_MIN_CARACTERS = 15000;
  const CONTE_MAX_CARACTERS = 20000;
  const CONTE_OBJECTIU_CARACTERS = 17500;
  const CONTE_MIN_ESCENES = 4;
  const CONTE_MAX_ESCENES = 6;
  const MAX_CRIDES_CONTE = 24;
  const TOLERANCIA_ESCENA = 0.15;

  /**
   * Compta caràcters després d'una normalització estable: converteix CRLF i CR
   * a LF, elimina espais i tabuladors al final de cada línia i redueix qualsevol
   * successió de dos o més salts de línia a un sol LF. No retalla els extrems.
   * Així, la mateixa seqüència lògica de línies dona sempre la mateixa xifra.
   */
  function comptaCaracters(text) {
    return String(text == null ? '' : text)
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{2,}/g, '\n').length;
  }

  function repartirCaracters(objectiu, nEscenes, pesos) {
    const total = Math.max(0, Math.round(Number(objectiu) || 0));
    const n = Math.max(0, Math.floor(Number(nEscenes) || 0));
    if (!n) return [];
    const p = Array.from({ length: n }, (_, i) => {
      const valor = Array.isArray(pesos) ? Number(pesos[i]) : 1;
      return Number.isFinite(valor) && valor > 0 ? valor : 0;
    });
    if (!p.some(Boolean)) p.fill(1);
    const suma = p.reduce((a, b) => a + b, 0);
    const exactes = p.map(pes => total * pes / suma);
    const resultat = exactes.map(Math.floor);
    let resta = total - resultat.reduce((a, b) => a + b, 0);
    exactes.map((valor, i) => ({ i, fraccio: valor - resultat[i] }))
      .sort((a, b) => b.fraccio - a.fraccio || a.i - b.i)
      .slice(0, resta)
      .forEach(x => { resultat[x.i] += 1; });
    return resultat;
  }

  function crearDossierBuit() {
    return {
      premissa: '', final_obligatori: '', esquerda: '', mentida_del_sistema: '', cost_empatia: '',
      protagonista: {
        nom: '', feina_ordinaria: '', ferida: '', objectiu_extern: '', secret: '',
        veu: { registre: '', mai_diria: [] }
      },
      secundaris: [],
      mon: { lloc: '', any: '', deteriorament: [], objectes_consum_defectuosos: [] },
      objectes_clau: [], fets_canonics: [], cronologia: [], motius_triats: []
    };
  }

  function validarDossier(dossier) {
    const d = dossier && typeof dossier === 'object' ? dossier : {};
    const faltants = [];
    const afegir = (camp, motiu) => faltants.push({ camp, motiu, com_resoldre: `Completa ${camp}` });
    const text = (valor, camp) => { if (!String(valor == null ? '' : valor).trim()) afegir(camp, 'El camp és obligatori.'); };
    ['premissa', 'final_obligatori', 'esquerda', 'mentida_del_sistema', 'cost_empatia'].forEach(c => text(d[c], c));
    const p = d.protagonista || {};
    ['nom', 'feina_ordinaria', 'ferida', 'objectiu_extern', 'secret'].forEach(c => text(p[c], `protagonista.${c}`));
    text((p.veu || {}).registre, 'protagonista.veu.registre');
    if (!Array.isArray((p.veu || {}).mai_diria)) afegir('protagonista.veu.mai_diria', 'Ha de ser una llista.');
    if (!Array.isArray(d.secundaris) || d.secundaris.length < 1 || d.secundaris.length > 3) {
      afegir('secundaris', 'Cal incloure entre un i tres personatges secundaris.');
    } else d.secundaris.forEach((s, i) => ['nom', 'funcio', 'vol', 'amaga'].forEach(c => text((s || {})[c], `secundaris[${i}].${c}`)));
    const mon = d.mon || {};
    ['lloc', 'any'].forEach(c => text(mon[c], `mon.${c}`));
    ['deteriorament', 'objectes_consum_defectuosos'].forEach(c => {
      if (!Array.isArray(mon[c])) afegir(`mon.${c}`, 'Ha de ser una llista.');
    });
    if (!Array.isArray(d.objectes_clau) || d.objectes_clau.length > 4) afegir('objectes_clau', 'Ha de ser una llista de zero a quatre objectes.');
    else d.objectes_clau.forEach((o, i) => ['nom', 'on_es', 'per_a_que'].forEach(c => text((o || {})[c], `objectes_clau[${i}].${c}`)));
    if (!Array.isArray(d.fets_canonics) || d.fets_canonics.length < 1 || d.fets_canonics.length > 8) afegir('fets_canonics', 'Cal incloure entre un i vuit fets canònics.');
    else d.fets_canonics.forEach((fet, i) => text(fet, `fets_canonics[${i}]`));
    if (!Array.isArray(d.cronologia) || d.cronologia.length < 1 || d.cronologia.length > 6) afegir('cronologia', 'Cal incloure entre una i sis entrades cronològiques.');
    else d.cronologia.forEach((e, i) => ['quan', 'que'].forEach(c => text((e || {})[c], `cronologia[${i}].${c}`)));
    if (!Array.isArray(d.motius_triats)) afegir('motius_triats', 'Ha de ser una llista.');
    return { valid: faltants.length === 0, faltants };
  }

  function crearContracteEscena(i, escena) {
    const e = escena && typeof escena === 'object' ? escena : {};
    return {
      index: Number.isInteger(Number(i)) && Number(i) >= 0 ? Number(i) : 0,
      pov: String(e.pov || ''), lloc: String(e.lloc || ''),
      present: Array.isArray(e.present) ? e.present.slice() : [],
      objectiu_pov: String(e.objectiu_pov || ''), obstacle: String(e.obstacle || ''),
      objecte_o_informacio_en_disputa: String(e.objecte_o_informacio_en_disputa || ''),
      decisio_irreversible: String(e.decisio_irreversible || ''), cost_immediat: String(e.cost_immediat || ''),
      consequencia: String(e.consequencia || ''), caracters_objectiu: Math.round(Number(e.caracters_objectiu) || 0),
      funcio_pkd: ['esquerda', 'mentida', 'paranoia', 'empatia', 'cap'].includes(e.funcio_pkd) ? e.funcio_pkd : 'cap'
    };
  }

  function detectarFaltantsContracte(contracte) {
    const c = contracte && typeof contracte === 'object' ? contracte : {};
    const camps = ['pov', 'lloc', 'objectiu_pov', 'obstacle', 'objecte_o_informacio_en_disputa', 'decisio_irreversible', 'cost_immediat', 'consequencia'];
    const faltants = camps.filter(camp => !String(c[camp] || '').trim());
    if (!Array.isArray(c.present) || c.present.length === 0) faltants.push('present');
    if (!Number.isInteger(c.caracters_objectiu) || c.caracters_objectiu <= 0) faltants.push('caracters_objectiu');
    if (!Number.isInteger(c.index) || c.index < 0) faltants.push('index');
    if (!['esquerda', 'mentida', 'paranoia', 'empatia', 'cap'].includes(c.funcio_pkd)) faltants.push('funcio_pkd');
    return faltants;
  }

  function validarGatePKD(escaleta) {
    const funcions = new Set((Array.isArray(escaleta) ? escaleta : []).map(e => e && e.funcio_pkd));
    const faltants = ['esquerda', 'mentida', 'empatia'].filter(f => !funcions.has(f));
    return { valid: faltants.length === 0, faltants };
  }

  function contracteFallbackLocal(i, dossier, caracters) {
    const d = dossier || {};
    const p = d.protagonista || {};
    const secundari = (Array.isArray(d.secundaris) && d.secundaris[0]) || {};
    const objecte = (Array.isArray(d.objectes_clau) && d.objectes_clau[0]) || {};
    const funcions = ['esquerda', 'mentida', 'paranoia', 'empatia', 'cap'];
    return crearContracteEscena(i, {
      pov: p.nom || 'La protagonista', lloc: (d.mon || {}).lloc || 'el lloc establert',
      present: [p.nom || 'La protagonista', secundari.nom || 'un testimoni'],
      objectiu_pov: p.objectiu_extern || 'obtenir una resposta verificable',
      obstacle: d.mentida_del_sistema || 'el sistema li nega la resposta',
      objecte_o_informacio_en_disputa: objecte.nom || d.esquerda || 'la prova de la contradicció',
      decisio_irreversible: d.final_obligatori || 'fa pública la prova i perd la protecció del sistema',
      cost_immediat: d.cost_empatia || p.ferida || 'perd la confiança del testimoni',
      consequencia: d.premissa || 'la realitat oficial deixa de ser sostenible',
      caracters_objectiu: Math.max(1, Math.round(Number(caracters) || 3500)),
      funcio_pkd: funcions[Math.abs(Math.trunc(Number(i) || 0)) % funcions.length]
    });
  }

  function citaCurta(fragment) {
    return String(fragment || '').trim().split(/\s+/).slice(0, 12).join(' ');
  }

  function auditoriaDeterministaConte(text, escaleta, dossier) {
    const original = String(text == null ? '' : text);
    const caracters = comptaCaracters(original);
    const problemes = [];
    const posar = (id, severitat, detall, cita) => { if (String(cita || '').trim()) problemes.push({ id, severitat, detall, cita: citaCurta(cita) }); };
    if (caracters < CONTE_MIN_CARACTERS || caracters > CONTE_MAX_CARACTERS) posar('longitud', 'error', `El conte té ${caracters} caràcters.`, 'text complet');

    const paraulesAmbPosicio = Array.from(original.matchAll(/[\p{L}\p{N}'’]+/gu));
    const vistes = new Map();
    for (let i = 0; i <= paraulesAmbPosicio.length - 8; i += 1) {
      const grup = paraulesAmbPosicio.slice(i, i + 8);
      const literal = original.slice(grup[0].index, grup[7].index + grup[7][0].length);
      if (vistes.has(literal)) {
        posar('frase_repetida', 'error', 'Una frase de vuit paraules o més es repeteix literalment.', literal);
        break;
      }
      vistes.set(literal, true);
    }
    const adverbis = original.match(/\b[\p{L}]+ment\b/giu) || [];
    const densitat = caracters ? adverbis.length * 1000 / caracters : 0;
    if (densitat > 3) posar('densitat_adverbis', 'avis', `Hi ha ${densitat.toFixed(1)} adverbis en -ment per 1.000 caràcters (llindar: 3).`, adverbis[0]);
    const estrangeres = original.match(/\b(?:the|and|but|because|actually|maybe|bueno|entonces|aunque|mientras|todavía|desde|hasta)\b/giu) || [];
    estrangeres.forEach(paraula => posar('llengua_estrangera', 'avis', 'Paraula anglesa o castellana evident dins del text narratiu.', paraula));
    if (/—/.test(original) && /[“”«»]/.test(original)) posar('dialeg_inconsistent', 'avis', 'Es barregen el guió llarg i les cometes per marcar diàleg.', original.match(/—[^\n]*|[“«][^”»\n]*/u)[0]);

    const d = dossier || {};
    const noms = [(d.protagonista || {}).nom].concat((d.secundaris || []).map(s => s && s.nom)).filter(Boolean);
    noms.forEach(nom => { if (!original.toLocaleLowerCase('ca').includes(String(nom).toLocaleLowerCase('ca'))) posar('personatge_absent', 'error', `El personatge no apareix al conte: ${nom}.`, `dossier: ${nom}`); });
    (d.fets_canonics || []).forEach((fet, i) => {
      const tokens = String(fet).match(/[\p{L}'’]+|\d{1,4}/gu) || [];
      tokens.forEach((xifra, posicio) => {
        if (!/^\d{1,4}$/.test(xifra) || new RegExp(`\\b${xifra}\\b`).test(original)) return;
        const context = tokens.slice(Math.max(0, posicio - 3), posicio).filter(t => !/^\d+$/.test(t));
        if (!context.length) return;
        const escapar = valor => valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const patro = context.map(escapar).join('[\\s,;:–—-]+');
        const coincidencia = original.match(new RegExp(`${patro}[\\s,;:–—-]+(\\d{1,4})`, 'iu'));
        if (coincidencia && coincidencia[1] !== xifra) posar('fet_canonic_contradit', 'error', `El fet canònic ${i} fixa ${xifra}, però el text usa ${coincidencia[1]}.`, coincidencia[0]);
      });
    });

    const escenes = Array.isArray(escaleta) ? escaleta : [];
    let textos = escenes.map(e => String((e && (e.text || e.text_escena || e.contingut)) || ''));
    if (!textos.some(Boolean) && escenes.length) textos = original.split(/\n\s*(?:#{1,3}\s*)?(?:ESCENA\s+\d+|\*\s*\*\s*\*)\s*\n/iu);
    escenes.forEach((e, i) => {
      const objectiu = Number(e && e.caracters_objectiu);
      const fragment = textos[i] || '';
      if (fragment && objectiu > 0 && Math.abs(comptaCaracters(fragment) - objectiu) / objectiu > TOLERANCIA_ESCENA) {
        posar('longitud_escena', 'error', `L'escena ${i} se separa més d'un 15% dels ${objectiu} caràcters objectiu.`, fragment);
      }
    });
    return { caracters, dins_interval: caracters >= CONTE_MIN_CARACTERS && caracters <= CONTE_MAX_CARACTERS, problemes };
  }

  function aplicarPedacos(text, pedacos) {
    let resultat = String(text == null ? '' : text);
    const aplicats = [], rebutjats = [];
    (Array.isArray(pedacos) ? pedacos : []).forEach(pedac => {
      const p = pedac && typeof pedac === 'object' ? pedac : {};
      const cerca = String(p.cerca == null ? '' : p.cerca);
      const substitueix = String(p.substitueix == null ? '' : p.substitueix);
      const aparicions = cerca ? resultat.split(cerca).length - 1 : 0;
      let motiu = '';
      if (aparicions !== 1) motiu = `La cerca apareix ${aparicions} cops; n'ha d'aparèixer exactament un.`;
      else if (cerca.length && Math.abs(substitueix.length - cerca.length) / cerca.length > 0.25 && !['expansio', 'retall'].includes(p.motiu)) motiu = "El canvi de longitud supera el 25% i no està marcat com a expansio o retall.";
      else if (!substitueix.trim() && (resultat.split(/\n{2,}/).some(paragraf => paragraf === cerca) || /\n\s*\n/.test(cerca))) motiu = 'El pedaç buidaria un paràgraf sencer.';
      if (motiu) rebutjats.push({ pedac, motiu });
      else {
        const posicio = resultat.indexOf(cerca);
        resultat = resultat.slice(0, posicio) + substitueix + resultat.slice(posicio + cerca.length);
        aplicats.push(pedac);
      }
    });
    return { text: resultat, aplicats, rebutjats };
  }

  const BANC_MOTIUS_PKD = [
    ['precognicio_subhasta', 'Els futurs probables es venen en una subhasta municipal.', 'Una predicció crea el futur que vol evitar?', 'l’endeví infal·lible'],
    ['historia_rebut', 'Un rebut domèstic prova que una guerra va acabar al revés.', 'Quina història és real si només una deixa documents?', 'el gran portal temporal'],
    ['objecte_cansat', 'Els electrodomèstics perden funcions i després records dels propietaris.', 'La matèria pot oblidar-nos abans que morim?', 'la màquina malvada'],
    ['antiguitat_falsa', 'Una restauradora descobreix que totes les antiguitats són rèpliques contemporànies.', 'L’autenticitat existeix sense un original?', 'la falsificació perfecta sense cost'],
    ['reliquia_directe', 'Una litúrgia només és vàlida si una plataforma en certifica l’audiència.', 'La fe sobreviu quan depèn de la seva mètrica?', 'la religió simplement fanàtica'],
    ['venedor_identitats', 'Un venedor ambulant ofereix identitats administratives de segona mà.', 'Som allò que recordem o allò que consta?', 'el mercader omnipotent'],
    ['funcionari_existencia', 'Una funcionària de finestreta decideix quines persones continuen constant.', 'Es pot existir fora del registre que ho acredita?', 'la burocràcia absurda sense víctimes'],
    ['test_empatia', 'Un test d’empatia suspèn precisament qui ajuda sense exhibir emoció.', 'L’empatia és un acte o una resposta mesurable?', 'la prova que detecta robots'],
    ['dimarts_repetit', 'Un barri viu cada setmana un dimarts d’un any diferent.', 'Quin present té autoritat sobre els altres?', 'el bucle temporal net'],
    ['record_recepta', 'Els records implantats arriben amb efectes adversos impresos al prospecte.', 'Un record fals pot imposar una culpa real?', 'l’amnèsia convenient'],
    ['empresa_orfe', 'Una corporació continua obeint un fundador que potser mai no va existir.', 'Pot una institució inventar retrospectivament la seva causa?', 'la corporació superordinador'],
    ['telepata_finestreta', 'Els telèpates públics només poden llegir pensaments amb cita prèvia.', 'La intimitat depèn d’un procediment?', 'la telepatia sense límits'],
    ['farmac_prescrit', 'Una droga obligatòria adapta la percepció a la versió oficial del dia.', 'La lucidesa és una patologia quan discrepa del consens?', 'la droga com a simple al·lucinogen'],
    ['noticiari_previ', 'El noticiari anuncia consensos abans que ningú els comparteixi.', 'La majoria existeix abans que els mitjans la declarin?', 'la conspiració periodística total'],
    ['colonia_maqueta', 'Una colònia fracassada envia a la Terra filmacions d’una maqueta pròspera.', 'Quan una supervivència fingida esdevé l’única vida comuna?', 'el planeta hostil genèric'],
    ['mort_administrativa', 'Un error de padró converteix una persona viva en beneficiària del seu llegat.', 'Quina mort pesa més, la corporal o la reconeguda?', 'el mort que no sap que ho és'],
    ['lloguer_cos', 'Els cossos de recanvi acumulen deutes dels ocupants anteriors.', 'La responsabilitat segueix la consciència o la carn?', 'la immortalitat sense factura'],
    ['mascota_fiscal', 'Una mascota artificial exigeix declarar els somnis dels seus amos.', 'Qui domestica qui quan la cura comporta vigilància?', 'l’animal mecànic adorable'],
    ['mapa_variable', 'Els mapes oficials eliminen carrers que encara es poden recórrer.', 'Un lloc persisteix si deixa de ser representable?', 'la ciutat que canvia arbitràriament'],
    ['moneda_veritat', 'Una moneda local perd valor cada vegada que el govern rectifica un fet.', 'La veritat pot tenir inflació?', 'la metàfora econòmica literal fàcil'],
    ['doble_laboral', 'Una rèplica cobreix les vacances d’un empleat i es nega a tornar-li la vida.', 'El treball pot demostrar millor la identitat que la memòria?', 'el clon assassí'],
    ['somni_sindicat', 'Els somnis recurrents s’afilien a un sindicat i convoquen vaga.', 'De qui és l’inconscient quan negocia col·lectivament?', 'tot era un somni'],
    ['garantia_passat', 'Una garantia comercial permet retornar una infància defectuosa.', 'Canviar l’origen conserva la persona que reclama?', 'el trauma esborrat sense conseqüències'],
    ['idioma_caducat', 'Cada paraula necessita una llicència vigent per continuar significant.', 'El poder pot anul·lar una idea retirant-ne el nom?', 'la neolengua calcada'],
    ['veins_programa', 'Una comunitat sospita que només existeix durant les visites d’un inspector.', 'La continuïtat necessita un testimoni?', 'la simulació digital revelada'],
    ['judici_futur', 'Un jutjat condemna pels delictes que les víctimes recordaran demà.', 'Una conseqüència futura pot provar una causa present?', 'la policia predictiva infal·lible'],
    ['servei_postvenda', 'El servei postvenda repara personalitats que ja no agraden a la família.', 'Qui té dret a definir que una persona funciona?', 'el rentat de cervell instantani'],
    ['arxiu_clima', 'El clima només canvia quan un arxiver corregeix les actes antigues.', 'El passat descriu el món o el fabrica?', 'el controlador del temps totpoderós'],
    ['impost_realitat', 'L’ajuntament cobra un recàrrec per cada versió privada de la realitat.', 'El desacord ontològic és un luxe o un dret?', 'la realitat alternativa decorativa'],
    ['ascensor_social', 'Un ascensor d’oficines assigna literalment la classe social de cada passatger.', 'La jerarquia és real perquè organitza tots els trajectes?', 'l’objecte màgic moralitzador']
  ].map(([id, motiu, tensio, evita]) => ({ id, motiu, tensio, evita }));

  const TOPICS_PROHIBITS = [
    'Rick Deckard', 'Roy Batty', 'Rachael Rosen', 'Tyrell Corporation', 'Nexus-6', 'Voight-Kampff',
    'Blade Runner', 'Do Androids Dream of Electric Sheep?', 'Ubik', 'Palmer Eldritch', 'VALIS',
    'The Man in the High Castle', 'Minority Report', 'Precrime', 'Total Recall', 'Rekall',
    'A Scanner Darkly', 'Flow My Tears, the Policeman Said', 'Electric Ant', 'Mercerism'
  ];

  function triarMotius(usats, n) {
    const historial = Array.isArray(usats) ? usats.map(x => typeof x === 'string' ? x : x && x.id).filter(Boolean) : [];
    const quantitat = Math.max(0, Math.min(BANC_MOTIUS_PKD.length, Math.floor(Number(n) || 0)));
    const posicio = new Map();
    historial.forEach((id, i) => posicio.set(id, i));
    return BANC_MOTIUS_PKD.slice().sort((a, b) => {
      const aUsat = posicio.has(a.id), bUsat = posicio.has(b.id);
      if (aUsat !== bUsat) return aUsat ? 1 : -1;
      if (aUsat) return posicio.get(a.id) - posicio.get(b.id);
      return 0;
    }).slice(0, quantitat);
  }

  const API = {
    CONTE_MIN_CARACTERS, CONTE_MAX_CARACTERS, CONTE_OBJECTIU_CARACTERS,
    CONTE_MIN_ESCENES, CONTE_MAX_ESCENES, MAX_CRIDES_CONTE, TOLERANCIA_ESCENA,
    comptaCaracters, repartirCaracters, crearDossierBuit, validarDossier,
    crearContracteEscena, detectarFaltantsContracte, validarGatePKD,
    contracteFallbackLocal, auditoriaDeterministaConte, aplicarPedacos,
    BANC_MOTIUS_PKD, TOPICS_PROHIBITS, triarMotius
  };
  if (arrel) Object.assign(arrel, API);
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
