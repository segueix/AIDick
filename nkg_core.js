// ═══════════════════════════════════════════════════════════
//  nkg_core.js — Mòdul pur extret d'index.html (Etapa D)
//  Nucli NKG (creació, validació, faltants) + contractes de validació
//  de sortides LLM (Etapa E.1) + parseig robust de JSON.
//  Sense dependències de DOM. registrarErrorValidacioLLM escriu a ESTAT
//  (global) en temps d'execució.
//  Càrrega: <script src="nkg_core.js"> ABANS dels blocs inline.
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  ETAPA E.1 — Contractes de validació de sortides LLM
//  Cap dada estructurada entra a ESTAT sense passar el seu esquema.
// ═══════════════════════════════════════════════════════════
const ESQUEMES_LLM = {
  escaleta_capitol: {
    descripcio: 'Escaleta de capítol (nou flux)',
    validar(d) {
      const errors = [];
      if (!d || typeof d !== 'object' || Array.isArray(d)) return ['La resposta no és un objecte JSON'];
      if (!d.funcio || typeof d.funcio !== 'string') errors.push('falta "funcio"');
      if (!d.detonant_emocional_escena || typeof d.detonant_emocional_escena !== 'string') errors.push('falta "detonant_emocional_escena"');
      if (!d.primera_frase || typeof d.primera_frase !== 'string') errors.push('falta "primera_frase"');
      if (!d.darrera_imatge || typeof d.darrera_imatge !== 'string') errors.push('falta "darrera_imatge"');
      if (!d.ganxo_final || typeof d.ganxo_final !== 'object') errors.push('falta "ganxo_final"');
      else if (!d.ganxo_final.tipus) errors.push('falta "ganxo_final.tipus"');
      if (!d.estat_final_personatges || typeof d.estat_final_personatges !== 'object') errors.push('falta "estat_final_personatges"');
      if (!Array.isArray(d.scene_contracts) || d.scene_contracts.length === 0) errors.push('falta "scene_contracts"');
      else {
        d.scene_contracts.forEach((c, i) => {
          if (typeof detectarFaltantsSceneContract === 'function') {
            const faltants = detectarFaltantsSceneContract(c);
            if (faltants.length > 0) errors.push(`scene_contracts[${i}] incomplet: ${faltants.join(', ')}`);
          }
        });
      }
      return errors;
    }
  },
  fils_narratius: {
    descripcio: 'Actualització de fils narratius post-capítol',
    validar(d) {
      if (!d || typeof d !== 'object' || Array.isArray(d)) return ['La resposta no és un objecte JSON'];
      const errors = [];
      ['nous_fils_oberts', 'fils_tancats_en_aquest_capitol'].forEach(camp => {
        if (d[camp] !== undefined && !Array.isArray(d[camp])) errors.push(`"${camp}" no és una llista`);
      });
      return errors;
    }
  },
  informe_excellencia: {
    descripcio: "Informe d'excel·lència per capítol",
    validar(d) {
      if (!d || typeof d !== 'object') return ['La resposta no és un objecte JSON'];
      if (!Array.isArray(d.criteris) || d.criteris.length === 0) return ['falta la llista "criteris"'];
      const errors = [];
      d.criteris.forEach((c, i) => {
        if (!c || typeof c !== 'object') { errors.push(`criteri ${i + 1} no és un objecte`); return; }
        if (typeof c.compleix !== 'boolean') errors.push(`criteri ${i + 1}: falta "compleix" (booleà)`);
        if (!c.criteri) errors.push(`criteri ${i + 1}: falta "criteri"`);
      });
      return errors;
    }
  }
};

function validarEsquemaLLM(schemaId, dades) {
  const sch = ESQUEMES_LLM[schemaId];
  if (!sch) return { ok: true, errors: [] };
  const errors = sch.validar(dades) || [];
  return { ok: errors.length === 0, errors };
}

function registrarErrorValidacioLLM(schemaId, errors) {
  ESTAT._errorsValidacioLLM = Array.isArray(ESTAT._errorsValidacioLLM) ? ESTAT._errorsValidacioLLM : [];
  ESTAT._errorsValidacioLLM.push({ schemaId, errors: errors.slice(0, 6), quanISO: new Date().toISOString() });
  console.error(`⛔ [validacioLLM] ${schemaId} invàlid després de reintent:`, errors);
}

// Crida + parseig + validació amb UN reintent (el motiu de l'error s'injecta
// al reintent). Si torna a fallar: registre i aturada neta (ok:false), mai
// continuar amb dades corruptes.
async function generarJsonValidat(schemaId, ferCrida) {
  let raw = await ferCrida('');
  let dades = parseJsonRobust(raw);
  let v = dades ? validarEsquemaLLM(schemaId, dades) : { ok: false, errors: ['resposta no parsejable com a JSON'] };
  if (v.ok) return { ok: true, dades, reintents: 0 };

  const motiu = v.errors.join('; ');
  console.warn(`⚠️ [validacioLLM] ${schemaId} invàlid (${motiu}). Reintentant amb el motiu injectat…`);
  raw = await ferCrida(motiu);
  dades = parseJsonRobust(raw);
  v = dades ? validarEsquemaLLM(schemaId, dades) : { ok: false, errors: ['resposta no parsejable com a JSON'] };
  if (v.ok) return { ok: true, dades, reintents: 1 };

  registrarErrorValidacioLLM(schemaId, v.errors);
  return { ok: false, dades: null, errors: v.errors, reintents: 1 };
}

// ═══════════════════════════════════════════════════════════
//  UTILITAT: Parse robust de JSON (evita errors LLM)
// ═══════════════════════════════════════════════════════════
function parseJsonRobust(text, expectedKeys = []) {
  if (!text || typeof text !== 'string') {
    console.error("⛔ [parseJsonRobust] Error: El text d'entrada és buit o no és un string.");
    return null;
  }
  const s = text.trim();

  function netejarCandidate(candidate = '') {
    return String(candidate || '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/,\s*([}\]])/g, '$1')
      .trim();
  }

  function tancarJsonIncomplet(candidate = '') {
    const src = String(candidate || '');
    if (!src) return src;

    const stack = [];
    let inString = false;
    let escaped = false;

    for (let i = 0; i < src.length; i++) {
      const ch = src[i];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\') { escaped = true; continue; }
        if (ch === '"') { inString = false; }
        continue;
      }

      if (ch === '"') { inString = true; continue; }
      if (ch === '{') stack.push('}');
      else if (ch === '[') stack.push(']');
      else if ((ch === '}' || ch === ']') && stack.length > 0 && stack[stack.length - 1] === ch) stack.pop();
    }

    let out = src;
    if (inString) out += '"';
    while (stack.length > 0) out += stack.pop();
    return out;
  }

  // Escapa salts de línia literals dins strings JSON (l'LLM a vegades en genera)
  function escaparNovaLiniaEnStrings(src) {
    let out = '';
    let inStr = false;
    let escaped = false;
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (inStr) {
        if (escaped) { escaped = false; out += ch; continue; }
        if (ch === '\\') { escaped = true; out += ch; continue; }
        if (ch === '"') { inStr = false; out += ch; continue; }
        if (ch === '\n') { out += '\\n'; continue; }
        if (ch === '\r') { out += '\\r'; continue; }
        if (ch === '\t') { out += '\\t'; continue; }
        out += ch;
      } else {
        if (ch === '"') inStr = true;
        out += ch;
      }
    }
    return out;
  }

  // Elimina una clau penjant sense valor al final (p.ex. `"clau"}` → `}`)
  function repararClauSenseValor(src) {
    // Detecta patró: coma i/o espais, cometa, contingut, cometa, espais, tancament
    return src.replace(/,\s*"[^"\\]*"\s*([}\]])/g, '$1')
              .replace(/\{\s*"[^"\\]*"\s*\}/g, '{}');
  }

  function parseLenientJson(candidate) {
    if (!candidate || typeof candidate !== 'string') return null;

    const cleaned = netejarCandidate(candidate);
    try { return JSON.parse(cleaned); } catch (e) {}

    // Heurística: escapa salts de línia literals dins strings (l'LLM a vegades en genera)
    const escapat = netejarCandidate(escaparNovaLiniaEnStrings(cleaned));
    try { return JSON.parse(escapat); } catch (e) {}

    // Heurística clau: si la resposta s'ha tallat, intentem tancar l'objecte/array i parsejar.
    const repaired = netejarCandidate(tancarJsonIncomplet(escapat));
    try { return JSON.parse(repaired); } catch (e) {}

    // Heurística addicional: elimina clau penjant sense valor generada per truncació mid-key
    const repairedNoKey = netejarCandidate(repararClauSenseValor(repaired));
    try { return JSON.parse(repairedNoKey); } catch (e) { return null; }
  }

  function extreureObjectesJSONTopLevel(candidate = '') {
    const txt = String(candidate || '');
    const spans = [];
    let inString = false;
    let escaped = false;
    let depth = 0;
    let start = -1;

    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];
      if (inString) {
        if (escaped) { escaped = false; continue; }
        if (ch === '\\') { escaped = true; continue; }
        if (ch === '"') inString = false;
        continue;
      }

      if (ch === '"') { inString = true; continue; }
      if (ch === '{') {
        if (depth === 0) start = i;
        depth += 1;
        continue;
      }
      if (ch === '}') {
        if (depth > 0) depth -= 1;
        if (depth === 0 && start >= 0) {
          spans.push(txt.slice(start, i + 1));
          start = -1;
        }
      }
    }

    return spans;
  }

  function validar(resultat, metode) {
    if (!resultat) return null;
    if (expectedKeys && expectedKeys.length > 0) {
      const missing = expectedKeys.filter(k => !(k in resultat));
      if (missing.length > 0) {
        console.warn(`⚠️ [parseJsonRobust] JSON recuperat via ${metode}, però falten claus: ${missing.join(', ')} — es retorna igualment.`);
      }
    }
    if (metode !== 'Directe') {
      console.info(`✅ [parseJsonRobust] JSON recuperat amb èxit usant heurística: ${metode}`);
    }
    return resultat;
  }

  // 1. Parse directe
  let direct = parseLenientJson(s);
  if (direct) return validar(direct, 'Directe');

  console.warn("⚠️ [parseJsonRobust] Fallada al parse directe. Intentant heurístiques...");

  // 2. Bloc de codi markdown ```json ... ```
  const codeMatch = s.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
  if (codeMatch) {
    let parsedCode = parseLenientJson(codeMatch[1].trim());
    if (parsedCode) return validar(parsedCode, 'Markdown Block');
  }

  // 3. Primer objecte { ... } (també prova reparació si està truncat)
  const objStart = s.indexOf('{');
  const objEnd   = s.lastIndexOf('}');
  if (objStart !== -1) {
    const objectCandidate = objEnd > objStart ? s.slice(objStart, objEnd + 1) : s.slice(objStart);
    let parsedObject = parseLenientJson(objectCandidate);
    if (parsedObject) return validar(parsedObject, 'Extracció Objecte {}');
  }

  // 4. Primer array [ ... ] (també prova reparació si està truncat)
  const arrStart = s.indexOf('[');
  const arrEnd   = s.lastIndexOf(']');
  if (arrStart !== -1) {
    const arrayCandidate = arrEnd > arrStart ? s.slice(arrStart, arrEnd + 1) : s.slice(arrStart);
    let parsedArray = parseLenientJson(arrayCandidate);
    if (parsedArray) return validar(parsedArray, 'Extracció Array []');
  }

  // 5. Quan hi ha text extra abans/després o múltiples JSON consecutius, prova cada objecte top-level.
  const objectesTop = extreureObjectesJSONTopLevel(s);
  if (objectesTop.length > 0) {
    const parsedCandidates = objectesTop
      .map(c => parseLenientJson(c))
      .filter(Boolean);
    if (parsedCandidates.length > 0) {
      if (expectedKeys && expectedKeys.length > 0) {
        const ambClaus = parsedCandidates.find(obj => expectedKeys.every(k => k in obj));
        if (ambClaus) return validar(ambClaus, 'Top-level Object Scan');
      }
      return validar(parsedCandidates[0], 'Top-level Object Scan');
    }
  }

  console.error("⛔ [parseJsonRobust] Totes les heurístiques han fallat. No s'ha pogut extreure JSON. Text rebut:\n", s.substring(0, 300) + "...");
  return null;
}

function crearNKG() {
  return {
    macronarrativa: {
      synopsis_core: "",
      theme: "",
      ending: {
        emocio_final_lector: "",
        desti_protagonista: "",
        imatge_o_escena_final: "",
        veritat_que_es_revela: ""
      },
      backstory_canonic: {
        fets_previs: [],
        cronologia_previa: []
      },
      thematic_count: 0,
      thematic_count_max: 3
    },
    threads: {
      oberts: [],
      tancats: [],
      pendents_resolucio: []
    },
    personatges: {},
    llocs: {},
    mapa_adjacencies: [],
    objectes: {},
    fets_canonics: [],
    esdeveniments: [],
    relacions: [], // { personatge_a, personatge_b, tipus, descripcio, coneixement_mutu, evolucio }
    timeline_accions: [], // [{ capitol, personatge, accio, hora_aproximada, ubicacio }]
    timeline_objectes: [], // Registre de moviment d'objectes: C3E2: [Claus] Personatge A -> Personatge B (motiu)
    timeline_personatges: [], // Registre de canvis de personatge: ubicació/roba/estat per escena
    context_creacio: {
      estil: {
        perspectiva: {
          tipus: 'tercera_limitada',
          pov_per_capitol: [],
          restriccions_informacio: ''
        }
      },
      cronologia: {
        data_inici_historia: '',
        duracio_total_estimada: '',
        per_capitol: []
      }
    },
    transicions_capitols: [], // Regles de pas capítol->capítol per evitar salts i pèrdua de continuïtat
    beats_gastats: [], // Registre de beats narratius consumits (anti-repetició dramàtica)
    scene_contracts: [], // Capa estructural per evitar capítols massa resumits, abstractes o sense conflicte dramàtic.
    ultima_actualitzacio: { capitol: 0, escena: 0 },
    versio: 6
  };
}


function crearSceneContractBase(capitol, escena) {
  const cap = Number.isFinite(Number(capitol)) && Number(capitol) > 0 ? Number(capitol) : 1;
  const esc = Number.isFinite(Number(escena)) && Number(escena) > 0 ? Number(escena) : 1;
  return {
    id: `C${cap}E${esc}`,
    capitol: cap,
    escena: esc,
    pov: "",
    personatges_presents: [],
    objectiu_visible_pov: "",
    objectiu_ocult_pov: "",
    objectiu_visible_oponent: "",
    objectiu_ocult_oponent: "",
    obstacle_concret: "",
    asimetria_poder: "",
    objecte_en_disputa: "",
    informacio_en_disputa: "",
    decisio_irreversible: "",
    cost_immediat: "",
    consequencia_narrativa: "",
    gir_emocional: "",
    subtext_dialog: "",
    detall_sensorial_funcional: "",
    prohibicio_escena: "No resumir el conflicte: mostrar-lo en acció, gest, diàleg o decisió."
  };
}

function normalitzarSceneContract(contracte, capitolFallback, escenaFallback) {
  const dades = (contracte && typeof contracte === 'object') ? contracte : {};
  const capitol = Number.isFinite(Number(dades.capitol)) && Number(dades.capitol) > 0
    ? Number(dades.capitol)
    : (Number.isFinite(Number(capitolFallback)) && Number(capitolFallback) > 0 ? Number(capitolFallback) : 1);
  const escena = Number.isFinite(Number(dades.escena)) && Number(dades.escena) > 0
    ? Number(dades.escena)
    : (Number.isFinite(Number(escenaFallback)) && Number(escenaFallback) > 0 ? Number(escenaFallback) : 1);
  const base = crearSceneContractBase(capitol, escena);
  const normalitzat = Object.assign({}, base, dades, {
    capitol,
    escena,
    id: dades.id ? String(dades.id) : base.id,
    personatges_presents: Array.isArray(dades.personatges_presents)
      ? dades.personatges_presents
      : (dades.personatges_presents ? [String(dades.personatges_presents)] : [])
  });
  if (!normalitzat.prohibicio_escena) normalitzat.prohibicio_escena = base.prohibicio_escena;
  return normalitzat;
}

function detectarFaltantsSceneContract(contracte) {
  const c = (contracte && typeof contracte === 'object') ? contracte : {};
  const campsObligatoris = [
    'pov',
    'objectiu_visible_pov',
    'obstacle_concret',
    'asimetria_poder',
    'decisio_irreversible',
    'cost_immediat',
    'consequencia_narrativa'
  ];
  return campsObligatoris.filter(camp => !String(c[camp] || '').trim());
}

function validarSceneContract(contracte) {
  const faltants = detectarFaltantsSceneContract(contracte);
  return { ok: faltants.length === 0, errors: faltants };
}

function capitolSceneContractBloquejat(nkg, contracte) {
  const capitol = Number((contracte || {}).capitol || 0);
  if ((contracte || {}).locked === true || (contracte || {}).bloquejat === true) return true;
  const estat = (typeof ESTAT !== 'undefined' && ESTAT)
    ? ESTAT
    : ((typeof globalThis !== 'undefined' && globalThis.ESTAT) ? globalThis.ESTAT : null);
  const fontsLocks = [
    (nkg && typeof nkg === 'object') ? (nkg._capitolsLocked || nkg.capitols_locked || nkg.capitolsBloquejats) : null,
    estat && estat._capitolsLocked,
    estat && estat._chapterLocks
  ].filter(Boolean);
  if (!capitol || fontsLocks.length === 0) return false;
  const candidats = [capitol, capitol - 1, String(capitol), String(capitol - 1)];
  return fontsLocks.some(locks => candidats.some(k => {
    const lock = locks[k];
    if (lock === true) return true;
    if (!lock || typeof lock !== 'object') return false;
    if (lock.locked === true) return true;
    if (lock.lockState === 'final') return true;
    if (lock.lockState === 'provisional') return true;
    return false;
  }));
}

function assegurarSceneContractsNKG(nkg) {
  if (!nkg || typeof nkg !== 'object') return nkg;
  // Aquesta capa prepara conflictes escènics concrets i evita capítols massa resumits, abstractes o sense tensió dramàtica.
  if (!Array.isArray(nkg.scene_contracts)) {
    nkg.scene_contracts = [];
    return nkg;
  }
  nkg.scene_contracts = nkg.scene_contracts.map((contracte, idx) => {
    if (capitolSceneContractBloquejat(nkg, contracte)) return contracte;
    return normalitzarSceneContract(contracte, (contracte || {}).capitol || 1, (contracte || {}).escena || idx + 1);
  });
  return nkg;
}


function normalitzarVeuAvancada(veu = {}) {
  const longitudValida = ['curtes_telegrafiques', 'mitjanes', 'llargues_subordinades'];
  const existMaiDiria = Array.isArray(veu.mai_diria) ? veu.mai_diria : (veu.mai_diria ? String(veu.mai_diria).split(/[,;]+/).map(x => x.trim()).filter(Boolean) : []);
  const vocabProhibit = Array.isArray(veu.vocabulari_prohibit) ? veu.vocabulari_prohibit : [];
  return Object.assign({}, veu, {
    exemples_narratius: Array.isArray(veu.exemples_narratius) ? veu.exemples_narratius.map(x => String(x || '').trim()).filter(Boolean).slice(0, 3) : [],
    vocabulari_recurrent: Array.isArray(veu.vocabulari_recurrent) ? veu.vocabulari_recurrent.map(x => String(x || '').trim()).filter(Boolean).slice(0, 12) : [],
    vocabulari_prohibit: [...new Set([...vocabProhibit, ...existMaiDiria].map(x => String(x || '').trim()).filter(Boolean))].slice(0, 12),
    longitud_frases: longitudValida.includes(veu.longitud_frases) ? veu.longitud_frases : 'mitjanes'
  });
}


function esModeCompatibilitatSnapshotsAntics() {
  try {
    return !!((typeof ESTAT !== 'undefined' && ESTAT && ESTAT._modeCompatibilitatSnapshotsAntics === true) || (typeof globalThis !== 'undefined' && globalThis.ESTAT && globalThis.ESTAT._modeCompatibilitatSnapshotsAntics === true));
  } catch (e) {
    return false;
  }
}

function llistaAmbContingut(valor) {
  if (!Array.isArray(valor)) return false;
  return valor.some(v => {
    if (typeof v === 'string') return v.trim().length > 0;
    if (!v || typeof v !== 'object') return false;
    return ['descripcio', 'objectiu', 'contingut', 'pressio', 'secret', 'resum', 'nom'].some(k => String(v[k] || '').trim());
  });
}

function obtenirPersonatgesDramatics(nkg = {}) {
  return Object.values((nkg && nkg.personatges) || {}).filter(p => {
    if (!p || typeof p !== 'object') return false;
    const rol = String(p.rol || p.tipus || p.funcio || '').toLowerCase();
    if (!rol) return true;
    return /protagon|principal|secundari|important|antagon|deuteragon|coprotagon/.test(rol) || p.es_principal === true || p.important === true;
  });
}

function teObjectiuExternConcret(p = {}) {
  return llistaAmbContingut(p.objectius) || llistaAmbContingut(p.objectius_externs) || llistaAmbContingut(p.objectius_dramatics);
}

function teSecretOPressioInterna(p = {}) {
  return llistaAmbContingut(p.secrets) || llistaAmbContingut(p.pressions_ocultes) || llistaAmbContingut(p.pressions_internes) || llistaAmbContingut(p.informacio_retinguda);
}

function obtenirTramesDisponibles(nkg = {}, biblia = {}) {
  const globals = (typeof ESTAT !== 'undefined' && ESTAT) ? ESTAT : ((typeof globalThis !== 'undefined' && globalThis.ESTAT) ? globalThis.ESTAT : {});
  return [nkg.trames, biblia.trames, globals.trames, nkg.macronarrativa && nkg.macronarrativa.trames].filter(t => t && typeof t === 'object');
}

function teTramaPrincipalClara(nkg = {}, biblia = {}) {
  return obtenirTramesDisponibles(nkg, biblia).some(t => {
    const principal = t.trama_principal || t.principal || t.main || t.tramaPrincipal;
    if (typeof principal === 'string') return principal.trim().length > 0;
    if (principal && typeof principal === 'object') {
      return ['conflicte', 'conflicte_causal', 'descripcio', 'objectiu', 'resum', 'causalitat'].some(k => String(principal[k] || '').trim());
    }
    return false;
  });
}

function teSubtramesConnectades(nkg = {}, biblia = {}) {
  return obtenirTramesDisponibles(nkg, biblia).some(t => {
    const subs = t.subtrames || t.subtrames_connectades || t.secondary || [];
    if (!Array.isArray(subs) || subs.length === 0) return false;
    return subs.some(st => {
      if (typeof st === 'string') return st.trim().length > 0;
      if (!st || typeof st !== 'object') return false;
      const connexio = st.personatge || st.personatge_secundari || st.personatges || st.connectada_a || st.relacio_personatge;
      return String(st.descripcio || st.conflicte || st.objectiu || '').trim() && (Array.isArray(connexio) ? connexio.length > 0 : String(connexio || '').trim());
    });
  });
}

function esdevenimentTeConseqüencia(e = {}) {
  if (typeof e === 'string') return false;
  return ['consequencia', 'consequencies', 'conseqüencia', 'conseqüencies', 'consequencia_narrativa', 'cost', 'cost_immediat', 'canvi_estat', 'canvi_d_estat', 'impacte_narratiu'].some(k => {
    const v = e[k];
    return Array.isArray(v) ? v.length > 0 : String(v || '').trim();
  });
}

function escaletaJaPreparada() {
  try {
    const estat = (typeof ESTAT !== 'undefined' && ESTAT) ? ESTAT : ((typeof globalThis !== 'undefined' && globalThis.ESTAT) ? globalThis.ESTAT : null);
    if (!estat) return true;
    const fase = Number(estat.fase || 0);
    const escaletes = estat._escaletes;
    return fase >= 22 || (Array.isArray(escaletes) && escaletes.length > 0);
  } catch (e) {
    return true;
  }
}

function detectarFaltantsDramaNKG(nkg = {}, biblia = {}) {
  const errors = [];
  if (!nkg || typeof nkg !== 'object' || Object.keys(nkg).length === 0) return ['NKG no inicialitzat.'];

  const personatges = obtenirPersonatgesDramatics(nkg);
  let funcionals = 0;
  personatges.forEach(p => {
    const nom = p.nom || p.id || 'Personatge';
    const teObjectiu = teObjectiuExternConcret(p);
    const teSecret = teSecretOPressioInterna(p);
    if (!teObjectiu) errors.push(`${nom} no té objectius dramàtics accionables.`);
    if (!teSecret) errors.push(`${nom} no té secrets, pressions ocultes o informació retinguda.`);
    if (!teObjectiu && !teSecret) funcionals++;
  });

  if (!teTramaPrincipalClara(nkg, biblia)) errors.push('Falta trama principal amb conflicte causal.');
  if (!teSubtramesConnectades(nkg, biblia)) errors.push('Falten subtrames connectades a personatges secundaris.');

  if (Array.isArray(nkg.esdeveniments) && nkg.esdeveniments.length > 0 && nkg.esdeveniments.some(e => !esdevenimentTeConseqüencia(e))) {
    errors.push('Hi ha esdeveniments sense conseqüències narratives registrades.');
  }

  if (!Array.isArray(nkg.scene_contracts) || nkg.scene_contracts.length === 0) {
    if (escaletaJaPreparada()) errors.push('Falten contractes d’escena amb conflicte dramàtic concret.');
  } else if (typeof detectarFaltantsSceneContract === 'function') {
    nkg.scene_contracts.forEach((contracte, idx) => {
      const faltants = detectarFaltantsSceneContract(contracte);
      if (faltants.length > 0) errors.push(`Contracte d’escena ${(contracte && contracte.id) || idx + 1} incomplet: ${faltants.join(', ')}.`);
    });
  }

  if (personatges.length >= 3 && funcionals > Math.floor(personatges.length / 2)) {
    errors.push('Hi ha massa personatges purament funcionals sense motor dramàtic propi.');
  }

  return [...new Set(errors)];
}

function validarNKGPreparatPerCapitol1(nkg, biblia = {}) {
  const errorsContinuïtat = detectarFaltantsNKG(nkg, biblia);
  const errorsDrama = detectarFaltantsDramaNKG(nkg, biblia);
  const warningsDrama = [];
  if ((!Array.isArray((nkg || {}).scene_contracts) || (nkg || {}).scene_contracts.length === 0) && !escaletaJaPreparada()) {
    warningsDrama.push('Encara no hi ha contractes d’escena; es revisaran abans de començar l’escriptura.');
  }
  const errors = [...new Set([...(errorsContinuïtat || []), ...(errorsDrama || [])])];
  if (esModeCompatibilitatSnapshotsAntics()) {
    return { ok: true, errors: [], warnings: [...new Set([...errors, ...warningsDrama])], errorsContinuïtat, errorsDrama, warningsDrama, compatibilitat: true };
  }
  return { ok: errors.length === 0, errors, errorsContinuïtat, errorsDrama, warnings: warningsDrama, warningsDrama };
}

function detectarFaltantsNKG(nkg = {}, biblia = {}) {
  const errors = [];
  if (!nkg || Object.keys(nkg).length === 0) return ['NKG no inicialitzat.'];
  const bs = nkg.macronarrativa && nkg.macronarrativa.backstory_canonic;
  if (!bs || !Array.isArray(bs.fets_previs) || bs.fets_previs.length === 0) errors.push('Falten fets previs de backstory canònic.');
  if (!Array.isArray(nkg.relacions) || nkg.relacions.length === 0) errors.push('Falta graf de relacions.');
  if (!nkg.objectes || Object.keys(nkg.objectes).length === 0) errors.push('Falten objectes narratius.');
  if (!nkg.llocs || Object.keys(nkg.llocs).length < 3) errors.push('Mapa de llocs insuficient.');
  if (!Array.isArray(biblia.regles_mon) || biblia.regles_mon.length === 0) errors.push('Falten regles del món.');
  const perspectiva = (((nkg.context_creacio || {}).estil || {}).perspectiva || {});
  const cronologia = ((nkg.context_creacio || {}).cronologia || {});
  if (!perspectiva.tipus) errors.push('Falta tipus de perspectiva narrativa.');
  if (!Array.isArray(perspectiva.pov_per_capitol) || perspectiva.pov_per_capitol.length === 0) errors.push('Falta POV per capítol.');
  if (!Array.isArray(cronologia.per_capitol) || cronologia.per_capitol.length === 0) errors.push('Falta cronologia per capítol.');
  const pers = Object.values(nkg.personatges || {});
  if (pers.length === 0) errors.push('No hi ha personatges al NKG.');
  pers.forEach(p => {
    const t = p.trets_immutables || {};
    if (!t.aspecte_fisic || !t.ocupacio || !t.tret_definitori) errors.push(`${p.nom || 'Personatge'} sense trets immutables complets.`);
    const veu = normalitzarVeuAvancada(p.veu || {});
    if (!Array.isArray(veu.exemples_narratius) || veu.exemples_narratius.length < 2) errors.push(`${p.nom || 'Personatge'} sense exemples narratius de veu.`);
    if (!Array.isArray(veu.vocabulari_recurrent) || veu.vocabulari_recurrent.length < 3) errors.push(`${p.nom || 'Personatge'} sense vocabulari recurrent suficient.`);
  });
  return [...new Set(errors)];
}


