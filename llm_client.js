// ═══════════════════════════════════════════════════════════
//  llm_client.js — L'únic punt per on passen les crides a models
//
//  Reprèn la lògica ja validada del mode novel·la (llegat/novella.html):
//  registre de models amb preus, construcció de payload per proveïdor, reserva
//  de pressupost de raonament de GPT-5 i backoff exponencial amb sostre.
//  Hi afegeix el que el generador de contes necessita: un comptador de sessió i
//  un sostre dur de crides que no es pot desactivar des de la interfície.
//
//  parseJsonRobust NO es duplica aquí: es reutilitza el de nkg_core.js.
//  MAX_CRIDES_CONTE NO es duplica aquí: ve de conte_core.js.
// ═══════════════════════════════════════════════════════════

'use strict';

// ═══════════════════════════════════════════════════════════
//  1. FONT ÚNICA DE MODELS
//
//  Els dos registres es publiquen com a globals perquè models_openai.js hi
//  pugui afegir els models econòmics d'OpenAI a DOMContentLoaded, com fa al
//  mode novel·la. TOTES les lectures internes d'aquest fitxer passen per
//  registreModels() i modelsPerProveidor(), que llegeixen la global en el
//  moment de la crida.
//
//  Mai una còpia feta en temps de parseig: models_openai.js muta els registres
//  DESPRÉS que aquest fitxer s'hagi avaluat, i una còpia quedaria congelada amb
//  els models antics sense que res fallés visiblement.
// ═══════════════════════════════════════════════════════════

globalThis.MODELS_PER_PROVEIDOR = globalThis.MODELS_PER_PROVEIDOR || {
  anthropic: { draft: 'claude-haiku-4-5-20251001', generacio: 'claude-sonnet-4-6', arquitectura: 'claude-opus-4-6' },
  openai:    { draft: 'gpt-5-mini',                generacio: 'gpt-5-mini',        arquitectura: 'gpt-5.4-mini' },
  gemini:    { draft: 'gemini-3-flash-preview',    generacio: 'gemini-3-flash-preview', arquitectura: 'gemini-3-pro-preview' }
};

globalThis.MODEL_REGISTRY = globalThis.MODEL_REGISTRY || {
  'claude-haiku-4-5-20251001': {
    nom: 'Claude Haiku 4.5', nomCurt: 'Haiku 4.5',
    proveidor: 'anthropic',
    input_per_m: 1.00, output_per_m: 5.00,
    context_max: 200000, max_output: 4096,
    qualitat: { draft: 72, prosa: 62, arquitectura: 65, extraccio: 78 },
    velocitat: 'molt_rapida',
    notes: 'Ràpid i barat. Bo per tasques mecàniques. Prosa plana.'
  },
  'claude-sonnet-4-6': {
    nom: 'Claude Sonnet 4.6', nomCurt: 'Sonnet 4.6',
    proveidor: 'anthropic',
    input_per_m: 3.00, output_per_m: 15.00,
    context_max: 1000000, max_output: 8192,
    qualitat: { draft: 82, prosa: 84, arquitectura: 86, extraccio: 88 },
    velocitat: 'rapida',
    notes: 'Millor ràtio qualitat/preu. Quasi Opus a 1/5 del preu. Prosa molt bona.'
  },
  'claude-opus-4-6': {
    nom: 'Claude Opus 4.6', nomCurt: 'Opus 4.6',
    proveidor: 'anthropic',
    input_per_m: 5.00, output_per_m: 25.00,
    context_max: 1000000, max_output: 8192,
    qualitat: { draft: 85, prosa: 88, arquitectura: 93, extraccio: 90 },
    velocitat: 'moderada',
    notes: 'Màxima intel·ligència. Millor per judicis literaris subtils i arquitectura complexa.'
  },
  'gemini-3-pro-preview': {
    nom: 'Gemini 3 Pro Preview', nomCurt: 'Gemini 3 Pro',
    proveidor: 'gemini',
    input_per_m: 2.00, output_per_m: 12.00,
    context_max: 1000000, max_output: 8192,
    qualitat: { draft: 78, prosa: 75, arquitectura: 80, extraccio: 82 },
    velocitat: 'rapida',
    notes: 'Bon raonament, context llarg. Prosa en català menys natural que Claude.'
  },
  'gemini-3-flash-preview': {
    nom: 'Gemini 3 Flash Preview', nomCurt: 'Gemini 3 Flash',
    proveidor: 'gemini',
    input_per_m: 0.10, output_per_m: 0.40,
    context_max: 1000000, max_output: 8192,
    qualitat: { draft: 80, prosa: 75, arquitectura: 75, extraccio: 85 },
    velocitat: 'molt_rapida',
    notes: 'Model de nova generació extremadament barat i ràpid.'
  },
  'gpt-5.2': {
    nom: 'GPT-5.2', nomCurt: 'GPT-5.2',
    proveidor: 'openai',
    input_per_m: 1.75, output_per_m: 14.00,
    context_max: 400000, max_output: 16384,
    qualitat: { draft: 80, prosa: 78, arquitectura: 82, extraccio: 85 },
    velocitat: 'rapida',
    notes: 'Fort en raonament i codi. Català acceptable però no natiu. Preu competitiu.'
  },
  'gpt-5-mini': {
    nom: 'GPT-5 Mini', nomCurt: 'GPT-5 Mini',
    proveidor: 'openai',
    input_per_m: 0.25, output_per_m: 2.00,
    context_max: 400000, max_output: 16384,
    qualitat: { draft: 78, prosa: 74, arquitectura: 74, extraccio: 84 },
    velocitat: 'molt_rapida',
    notes: 'Model mini econòmic per a generació creativa i draft.'
  },
  'gpt-5.4-mini': {
    nom: 'GPT-5.4 Mini', nomCurt: 'GPT-5.4 Mini',
    proveidor: 'openai',
    input_per_m: 0.30, output_per_m: 2.40,
    context_max: 400000, max_output: 16384,
    qualitat: { draft: 80, prosa: 76, arquitectura: 82, extraccio: 86 },
    velocitat: 'molt_rapida',
    notes: 'Mini de nova generació, fort en raonament: adequat per a arquitectura i revisió.'
  }
};

// Lectors. Cap altra funció d'aquest fitxer pot tocar les globals directament.
function registreModels() { return globalThis.MODEL_REGISTRY || {}; }
function modelsPerProveidor() { return globalThis.MODELS_PER_PROVEIDOR || {}; }

function configModel(modelId) { return registreModels()[modelId] || null; }

const PROVIDER_DEFAULTS_CONTE = {
  anthropic: {
    apiUrl: 'https://api.anthropic.com/v1/messages',
    get model() { return (modelsPerProveidor().anthropic || {}).generacio; }
  },
  openai: {
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    get model() { return (modelsPerProveidor().openai || {}).generacio; }
  },
  gemini: {
    apiUrlBase: 'https://generativelanguage.googleapis.com/v1beta/models',
    get model() { return (modelsPerProveidor().gemini || {}).generacio; }
  }
};

function normalitzarProveidor(p) {
  const s = String(p || '').toLowerCase().trim();
  if (s === 'google' || s === 'google-gemini') return 'gemini';
  return s;
}

function proveidorDelModel(modelId) {
  const cfg = configModel(modelId);
  return cfg ? normalitzarProveidor(cfg.proveidor) : '';
}

// ═══════════════════════════════════════════════════════════
//  2. SOSTRE DE CRIDES I COMPTADOR DE SESSIÓ
// ═══════════════════════════════════════════════════════════

const PASSOS_AMB_CRIDA = ['llavor', 'dossier', 'escaleta', 'escena', 'costura', 'lectura', 'pedac'];

// El sostre viu a conte_core.js. Es llegeix en temps d'execució per no fer-ne
// una segona còpia que pugui desincronitzar-se.
function sostreCrides() {
  const nucli = (typeof globalThis !== 'undefined' && globalThis.CONTE_CORE) ? globalThis.CONTE_CORE : null;
  if (nucli && Number.isFinite(nucli.MAX_CRIDES_CONTE)) return nucli.MAX_CRIDES_CONTE;
  if (typeof MAX_CRIDES_CONTE !== 'undefined' && Number.isFinite(MAX_CRIDES_CONTE)) return MAX_CRIDES_CONTE;
  return 24;
}

class ErrorSostreCrides extends Error {
  constructor(pas, sostre) {
    super(`Pressupost de crides esgotat al pas «${pas}»: s'han fet ${sostre} crides i el sostre del conte és ${sostre}. L'aplicació no en farà cap més. Exporta el que tinguis o comença un conte nou.`);
    this.name = 'ErrorSostreCrides';
    this.pas = pas;
    this.sostre = sostre;
    this.esSostreCrides = true;
  }
}

function comptadorBuit() {
  return {
    crides: 0,
    represes: 0,
    tokens_entrada: 0,
    tokens_sortida: 0,
    cost_estimat_usd: 0,
    per_pas: {}
  };
}

const comptador = comptadorBuit();

function reiniciarComptador() {
  const nou = comptadorBuit();
  Object.keys(comptador).forEach(k => { delete comptador[k]; });
  Object.assign(comptador, nou);
  return comptador;
}

function restaurarComptador(dades) {
  if (!dades || typeof dades !== 'object') return comptador;
  reiniciarComptador();
  comptador.crides = Math.max(0, Math.round(Number(dades.crides) || 0));
  comptador.represes = Math.max(0, Math.round(Number(dades.represes) || 0));
  comptador.tokens_entrada = Math.max(0, Math.round(Number(dades.tokens_entrada) || 0));
  comptador.tokens_sortida = Math.max(0, Math.round(Number(dades.tokens_sortida) || 0));
  comptador.cost_estimat_usd = Math.max(0, Number(dades.cost_estimat_usd) || 0);
  comptador.per_pas = (dades.per_pas && typeof dades.per_pas === 'object') ? JSON.parse(JSON.stringify(dades.per_pas)) : {};
  return comptador;
}

function cridesRestants() { return Math.max(0, sostreCrides() - comptador.crides); }

function registrarUs(pas, modelId, entrada, sortida, esRepresa) {
  const cfg = configModel(modelId) || {};
  const cost = ((Number(entrada) || 0) / 1e6) * (Number(cfg.input_per_m) || 0)
             + ((Number(sortida) || 0) / 1e6) * (Number(cfg.output_per_m) || 0);

  comptador.crides += 1;
  if (esRepresa) comptador.represes += 1;
  comptador.tokens_entrada += Number(entrada) || 0;
  comptador.tokens_sortida += Number(sortida) || 0;
  comptador.cost_estimat_usd += cost;

  const p = comptador.per_pas[pas] || { crides: 0, tokens_entrada: 0, tokens_sortida: 0, cost_usd: 0, models: [] };
  p.crides += 1;
  p.tokens_entrada += Number(entrada) || 0;
  p.tokens_sortida += Number(sortida) || 0;
  p.cost_usd += cost;
  if (modelId && p.models.indexOf(modelId) < 0) p.models.push(modelId);
  comptador.per_pas[pas] = p;

  return cost;
}

// ═══════════════════════════════════════════════════════════
//  3. TRANSPORT
// ═══════════════════════════════════════════════════════════

const MAX_INTENTS_TRANSPORT = 5;

// Backoff exponencial amb sostre d'intents. Els reintents d'aquesta funció són
// de transport (429, 5xx): el model no ha arribat a respondre i no costen res,
// per això no toquen el comptador. Els reintents que SÍ que costen —la represa
// per raonament de GPT-5— es compten com a crida i es marquen com a represa.
async function fetchSegurConte(url, options, maxIntents = MAX_INTENTS_TRANSPORT) {
  const REINTENTABLES = new Set([429, 500, 502, 503, 504, 529]);
  let ultimErrorXarxa = null;

  for (let intent = 0; intent < maxIntents; intent++) {
    let response;
    try {
      response = await fetch(url, options);
    } catch (netErr) {
      ultimErrorXarxa = netErr;
      if (intent === maxIntents - 1) throw netErr;
      const espera = Math.min(4000 * Math.pow(2, intent), 30000) + Math.random() * 1500;
      console.warn(`[llm_client] Error de xarxa — reintent ${intent + 1}/${maxIntents - 1} en ${(espera / 1000).toFixed(1)} s`);
      await new Promise(r => setTimeout(r, espera));
      continue;
    }

    if (!REINTENTABLES.has(response.status)) return response;
    if (intent === maxIntents - 1) return response;

    let espera;
    const retryAfter = response.headers.get('Retry-After') || response.headers.get('retry-after');
    if (retryAfter && !isNaN(Number(retryAfter))) {
      espera = Number(retryAfter) * 1000 + 1500;
    } else {
      espera = Math.min((response.status === 429 ? 15000 : 6000) * Math.pow(2, intent), 90000) + Math.random() * 2000;
    }
    console.warn(`[llm_client] HTTP ${response.status} — reintent ${intent + 1}/${maxIntents - 1} en ${(espera / 1000).toFixed(1)} s`);
    await new Promise(r => setTimeout(r, espera));
  }

  if (ultimErrorXarxa) throw ultimErrorXarxa;
  throw new Error('llm_client: intents de transport exhaurits sense resposta vàlida.');
}

async function llegirResposta(rawResponse, nomProveidor) {
  const codi = rawResponse.status;
  const cru = (await rawResponse.text()) || '';
  let parsed;
  try {
    parsed = JSON.parse(cru);
  } catch (e) {
    throw new Error(`${nomProveidor} HTTP ${codi} — la resposta no és JSON. Inici: ${cru.slice(0, 200).replace(/\s+/g, ' ')}`);
  }
  if (codi >= 400) {
    const missatge = parsed && parsed.error ? (parsed.error.message || JSON.stringify(parsed.error)) : cru.slice(0, 200);
    throw new Error(`${nomProveidor} HTTP ${codi}: ${missatge}`);
  }
  return parsed;
}

function extreureText(contingut) {
  if (typeof contingut === 'string') return contingut;
  if (Array.isArray(contingut)) {
    return contingut.map(x => (typeof x === 'string' ? x : (x && typeof x.text === 'string' ? x.text : ''))).join('\n');
  }
  if (contingut && typeof contingut.text === 'string') return contingut.text;
  return contingut ? String(contingut) : '';
}

// Extreu text, detecta el tall per límit de tokens i llegeix l'ús real de
// tokens. L'ús real és el que alimenta el cost: si el proveïdor no l'informa,
// s'estima i es marca com a estimat, mai es dona per bo en silenci.
function analitzarResposta(json, proveidor) {
  let text = '';
  let incomplet = false;
  let entrada = null;
  let sortida = null;

  if (proveidor === 'anthropic') {
    text = Array.isArray(json.content)
      ? json.content.filter(p => p && p.type === 'text').map(p => p.text || '').join('\n')
      : '';
    incomplet = json.stop_reason === 'max_tokens';
    if (json.usage) { entrada = json.usage.input_tokens; sortida = json.usage.output_tokens; }

  } else if (proveidor === 'openai') {
    const tria = json.choices && json.choices[0];
    text = extreureText(tria && tria.message ? tria.message.content : '');
    incomplet = !!(tria && tria.finish_reason === 'length');
    if (json.usage) { entrada = json.usage.prompt_tokens; sortida = json.usage.completion_tokens; }

  } else if (proveidor === 'gemini') {
    const cand = json.candidates && json.candidates[0];
    if (cand && cand.finishReason === 'SAFETY') {
      throw new Error('Gemini ha bloquejat la resposta pels filtres de seguretat.');
    }
    const parts = cand && cand.content ? cand.content.parts : [];
    text = (Array.isArray(parts) ? parts.filter(p => p && p.text && !p.thought) : []).map(p => p.text).join('\n');
    incomplet = !!(cand && cand.finishReason === 'MAX_TOKENS');
    const um = json.usageMetadata;
    if (um) { entrada = um.promptTokenCount; sortida = um.candidatesTokenCount; }

  } else {
    throw new Error(`Proveïdor desconegut: "${proveidor}"`);
  }

  return {
    text: String(text || '').replace(/^\s+|\s+$/g, ''),
    incomplet,
    tokens_entrada: Number.isFinite(Number(entrada)) ? Number(entrada) : null,
    tokens_sortida: Number.isFinite(Number(sortida)) ? Number(sortida) : null
  };
}

// ═══════════════════════════════════════════════════════════
//  4. RESERVA DE RAONAMENT DE GPT-5
//
//  A GPT-5 el raonament intern es descompta de max_completion_tokens: el
//  pressupost real de contingut és (límit − tokens de raonament). Amb una
//  reserva fixa la resposta arribava tallada a mitja frase i el JSON quedava
//  incomplet. La reserva és proporcional a la sortida demanada i mai per sota
//  de 4096, amb un sostre pel max_output del model.
// ═══════════════════════════════════════════════════════════

const RESERVA_RAONAMENT_MIN = 4096;
const RESERVA_RAONAMENT_MAX = 16000;

function esGPT5(modelId) {
  return typeof modelId === 'string' && modelId.toLowerCase().startsWith('gpt-5');
}

function reservaRaonamentGPT5(maxTokens) {
  const base = Number.isFinite(Number(maxTokens)) ? Number(maxTokens) : RESERVA_RAONAMENT_MIN;
  return Math.min(RESERVA_RAONAMENT_MAX, Math.max(RESERVA_RAONAMENT_MIN, Math.round(base)));
}

function maxSortidaDelModel(modelId) {
  const cfg = configModel(modelId);
  return (cfg && Number(cfg.max_output)) || 0;
}

function limitSortidaGPT5(modelId, maxTokens) {
  const total = maxTokens + reservaRaonamentGPT5(maxTokens);
  const maxOut = maxSortidaDelModel(modelId);
  return maxOut ? Math.min(total, maxOut) : total;
}

// Sostre de tokens de sortida: mai per sobre del que el model admet.
function acotarMaxTokens(modelId, demanats) {
  const maxOut = maxSortidaDelModel(modelId) || 4096;
  const n = Math.max(256, Math.round(Number(demanats) || 0));
  return Math.min(n, maxOut);
}

// ═══════════════════════════════════════════════════════════
//  5. PAYLOADS PER PROVEÏDOR
// ═══════════════════════════════════════════════════════════

const SISTEMA_PER_DEFECTE = 'Ets un escriptor de contes literaris en català. Escrius exclusivament en català.';

function payloadAnthropic(missatges, sistema, modelId, maxTokens) {
  return {
    model: modelId || PROVIDER_DEFAULTS_CONTE.anthropic.model,
    max_tokens: maxTokens,
    system: sistema || SISTEMA_PER_DEFECTE,
    messages: missatges
  };
}

function payloadOpenAI(missatges, sistema, modelId, maxTokens) {
  const model = modelId || PROVIDER_DEFAULTS_CONTE.openai.model;
  const payload = {
    model,
    messages: [{ role: 'system', content: sistema || SISTEMA_PER_DEFECTE }]
      .concat((missatges || []).map(m => ({ role: m.role, content: extreureText(m.content) })))
  };
  if (esGPT5(model)) {
    payload.reasoning_effort = 'low';
    if (Number.isFinite(Number(maxTokens))) payload.max_completion_tokens = limitSortidaGPT5(model, maxTokens);
  } else if (Number.isFinite(Number(maxTokens))) {
    payload.max_tokens = maxTokens;
  }
  return payload;
}

function payloadGemini(missatges, sistema, maxTokens) {
  return {
    contents: (missatges || []).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: extreureText(m.content) }]
    })),
    generationConfig: { maxOutputTokens: maxTokens },
    systemInstruction: { parts: [{ text: sistema || SISTEMA_PER_DEFECTE }] },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ]
  };
}

async function enviarPeticio(proveidor, payload, apiKey) {
  if (proveidor === 'anthropic') {
    const raw = await fetchSegurConte(PROVIDER_DEFAULTS_CONTE.anthropic.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(payload)
    });
    return await llegirResposta(raw, 'Anthropic');
  }

  if (proveidor === 'openai') {
    const raw = await fetchSegurConte(PROVIDER_DEFAULTS_CONTE.openai.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify(payload)
    });
    return await llegirResposta(raw, 'OpenAI');
  }

  if (proveidor === 'gemini') {
    const endpoint = PROVIDER_DEFAULTS_CONTE.gemini.apiUrlBase + '/' +
      encodeURIComponent(payload.__model) + ':generateContent?key=' + encodeURIComponent(apiKey);
    const cos = Object.assign({}, payload);
    delete cos.__model;
    const raw = await fetchSegurConte(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cos)
    });
    return await llegirResposta(raw, 'Gemini');
  }

  throw new Error(`Proveïdor no suportat: ${proveidor}`);
}

// ═══════════════════════════════════════════════════════════
//  6. LA CRIDA
// ═══════════════════════════════════════════════════════════

// Única porta d'entrada als models.
//   opcions = { pas, missatges, sistema, model, apiKey, maxTokens }
// `pas` és obligatori i ha de ser un dels PASSOS_AMB_CRIDA: sense etiqueta de
// pas no es pot saber on s'ha gastat el pressupost, i llavors el comptador no
// serveix per a res.
async function cridarModel(opcions) {
  const o = opcions || {};
  const pas = String(o.pas || '').trim();

  if (PASSOS_AMB_CRIDA.indexOf(pas) < 0) {
    throw new Error(`Cada crida necessita una etiqueta de pas vàlida (${PASSOS_AMB_CRIDA.join(', ')}); s'ha rebut «${pas}».`);
  }

  // Sostre dur. Es comprova ABANS de tocar la xarxa i no hi ha cap manera
  // d'evitar-lo des de la interfície: no s'exposa cap manera de pujar-lo.
  const sostre = sostreCrides();
  if (comptador.crides >= sostre) throw new ErrorSostreCrides(pas, sostre);

  const modelId = String(o.model || '').trim();
  const cfgModel = configModel(modelId);
  if (!cfgModel) {
    throw new Error(`El model «${modelId}» no és al registre. Cap identificador de model pot venir de fora de MODEL_REGISTRY.`);
  }
  const proveidor = normalitzarProveidor(cfgModel.proveidor);
  const apiKey = o.apiKey;
  if (!apiKey) throw new Error(`Falta la clau API del proveïdor ${proveidor}.`);

  const maxTokens = acotarMaxTokens(modelId, o.maxTokens || 2048);
  const missatges = Array.isArray(o.missatges) ? o.missatges : [{ role: 'user', content: String(o.missatges || '') }];
  const sistema = o.sistema || SISTEMA_PER_DEFECTE;

  const construir = (tokens) => {
    if (proveidor === 'anthropic') return payloadAnthropic(missatges, sistema, modelId, tokens);
    if (proveidor === 'openai') return payloadOpenAI(missatges, sistema, modelId, tokens);
    const g = payloadGemini(missatges, sistema, tokens);
    g.__model = modelId;
    return g;
  };

  const json = await enviarPeticio(proveidor, construir(maxTokens), apiKey);
  let analisi = analitzarResposta(json, proveidor);

  const entradaEstimada = Math.round(JSON.stringify(missatges).length / 3.5 + String(sistema).length / 3.5);
  let entrada = analisi.tokens_entrada;
  let sortida = analisi.tokens_sortida;
  let usEstimat = false;
  if (entrada === null || sortida === null) {
    usEstimat = true;
    if (entrada === null) entrada = entradaEstimada;
    if (sortida === null) sortida = Math.round(analisi.text.length / 3.5);
  }
  registrarUs(pas, modelId, entrada, sortida, false);

  // Represa de GPT-5: si el raonament s'ha menjat el límit, el contingut arriba
  // buit o clarament curt. Es reintenta UNA sola vegada amb el pressupost
  // restituït, i el reintent es compta com a crida perquè costa diners.
  let represa = false;
  if (esGPT5(modelId) && analisi.incomplet && comptador.crides < sostre) {
    const contingutAprox = Math.round(analisi.text.length / 4);
    if (contingutAprox < maxTokens * 0.9) {
      const nouLimit = acotarMaxTokens(modelId, Math.max(maxTokens * 2, maxTokens + RESERVA_RAONAMENT_MIN));
      if (nouLimit > maxTokens) {
        console.warn(`[llm_client] GPT-5 ha lliurat ~${contingutAprox} tokens dels ${maxTokens} demanats. Represa única amb límit ${nouLimit}.`);
        try {
          const json2 = await enviarPeticio(proveidor, construir(nouLimit), apiKey);
          const analisi2 = analitzarResposta(json2, proveidor);
          registrarUs(pas, modelId,
            analisi2.tokens_entrada === null ? entradaEstimada : analisi2.tokens_entrada,
            analisi2.tokens_sortida === null ? Math.round(analisi2.text.length / 3.5) : analisi2.tokens_sortida,
            true);
          represa = true;
          if (analisi2.text.length > analisi.text.length) analisi = analisi2;
        } catch (err) {
          console.warn('[llm_client] La represa ha fallat; es conserva la primera resposta.', err && err.message);
        }
      }
    }
  }

  if (!analisi.text) {
    throw new Error(`El model ${modelId} ha retornat una resposta buida al pas «${pas}».`);
  }

  return {
    text: analisi.text,
    incomplet: analisi.incomplet,
    represa,
    model: modelId,
    proveidor,
    pas,
    us_estimat: usEstimat,
    tokens_entrada: entrada,
    tokens_sortida: sortida
  };
}

// Crida que espera JSON. Reutilitza parseJsonRobust de nkg_core.js — no se'n fa
// cap segona còpia.
//
// REGLA DURA: si el proveïdor diu que la resposta ha arribat TALLADA pel límit
// de tokens, es llança, encara que parseJsonRobust n'hagi tret un objecte amb
// totes les claus. Les heurístiques de recuperació tanquen claudàtors i cometes
// i produeixen un objecte sintàcticament vàlid al qual li falten elements: un
// array de sis llavors se'n torna amb dues i el pas continua com si res. És el
// mode de fallada que aquest projecte ja ha patit i el que fa que una resposta
// truncada sembli una resposta correcta.
async function cridarModelJSON(opcions, clausEsperades) {
  const resultat = await cridarModel(opcions);
  const claus = Array.isArray(clausEsperades) ? clausEsperades : [];

  const parser = (typeof globalThis.parseJsonRobust === 'function')
    ? globalThis.parseJsonRobust
    : (typeof parseJsonRobust === 'function' ? parseJsonRobust : null);
  if (!parser) throw new Error('parseJsonRobust no està disponible: carrega nkg_core.js abans de llm_client.js.');

  const dades = parser(resultat.text, claus);

  if (resultat.incomplet) {
    const e = new Error(`La resposta del pas «${opcions.pas}» ha arribat TALLADA pel límit de tokens. El que se n'hagi pogut recuperar està incomplet i no s'utilitza. Torna-ho a provar o redueix el que demanes en aquesta crida.`);
    e.esRespostaTruncada = true;
    e.truncada = true;
    e.dadesParcials = dades || null;
    e.textCru = resultat.text;
    throw e;
  }

  if (!dades) {
    const e = new Error(`La resposta del pas «${opcions.pas}» no s'ha pogut llegir com a JSON${resultat.incomplet ? ' i a més ha arribat TALLADA pel límit de tokens' : ''}.`);
    e.esRespostaIllegible = true;
    e.textCru = resultat.text;
    e.truncada = resultat.incomplet;
    throw e;
  }

  const absents = claus.filter(k => dades[k] === undefined);
  if (absents.length > 0) {
    const e = new Error(`La resposta del pas «${opcions.pas}» no porta ${absents.join(', ')}${resultat.incomplet ? ' i ha arribat TALLADA pel límit de tokens' : ''}.`);
    e.esRespostaIncompleta = true;
    e.truncada = resultat.incomplet;
    e.dadesParcials = dades;
    throw e;
  }

  return { dades, truncada: false, meta: resultat };
}

// ═══════════════════════════════════════════════════════════
//  7. TRIA DE MODEL PER PAS
// ═══════════════════════════════════════════════════════════

const PASSOS_ARQUITECTURA = ['llavor', 'dossier', 'escaleta'];
const PASSOS_PROSA = ['escena', 'costura', 'pedac'];

function clauDisponible(config, proveidor) {
  const claus = (config && config.claus) || {};
  return !!String(claus[proveidor] || '').trim();
}

// Retorna { pas, model, proveidor, rol, mateix_model_que_prosa, avis }.
//
// El pas de LECTURA ha d'anar amb un model DIFERENT del que ha escrit. Si no
// n'hi ha cap de disponible, no s'amaga: es retorna mateix_model_que_prosa amb
// l'avís, perquè la interfície ho pugui dir ABANS de llegir. Un lector que és
// el mateix model que el generador comparteix els seus punts cecs i tendeix a
// aprovar-se a si mateix.
function triarModelPerPas(pas, config) {
  const cfg = config || {};
  const models = cfg.models || {};
  const arquitecte = models.arquitecte || '';
  const prosa = models.prosa || '';

  if (PASSOS_ARQUITECTURA.indexOf(pas) >= 0) {
    return { pas, model: arquitecte, proveidor: proveidorDelModel(arquitecte), rol: 'arquitecte', mateix_model_que_prosa: arquitecte === prosa, avis: '' };
  }
  if (PASSOS_PROSA.indexOf(pas) >= 0) {
    return { pas, model: prosa, proveidor: proveidorDelModel(prosa), rol: 'prosa', mateix_model_que_prosa: true, avis: '' };
  }
  if (pas !== 'lectura') {
    return { pas, model: prosa, proveidor: proveidorDelModel(prosa), rol: 'prosa', mateix_model_que_prosa: true, avis: '' };
  }

  // Lectura hostil.
  const triat = models.lectura || '';
  if (triat && triat !== prosa && configModel(triat) && clauDisponible(cfg, proveidorDelModel(triat))) {
    return { pas, model: triat, proveidor: proveidorDelModel(triat), rol: 'lectura', mateix_model_que_prosa: false, avis: '' };
  }

  const proveidorProsa = proveidorDelModel(prosa);
  const candidats = Object.keys(registreModels())
    .filter(id => id !== prosa)
    .filter(id => clauDisponible(cfg, proveidorDelModel(id)));

  // Prioritat 1: un model d'un altre proveïdor. Els punts cecs es comparteixen
  // sobretot dins d'una mateixa família.
  const altreProveidor = candidats
    .filter(id => proveidorDelModel(id) !== proveidorProsa)
    .sort((a, b) => qualitat(b, 'arquitectura') - qualitat(a, 'arquitectura'))[0];
  if (altreProveidor) {
    return { pas, model: altreProveidor, proveidor: proveidorDelModel(altreProveidor), rol: 'lectura', mateix_model_que_prosa: false, avis: '' };
  }

  // Prioritat 2: un altre model del mateix proveïdor. Millor que res, i es diu.
  const mateixProveidor = candidats
    .sort((a, b) => qualitat(b, 'arquitectura') - qualitat(a, 'arquitectura'))[0];
  if (mateixProveidor) {
    return {
      pas, model: mateixProveidor, proveidor: proveidorDelModel(mateixProveidor), rol: 'lectura',
      mateix_model_que_prosa: false,
      avis: `El lector és un altre model però del mateix proveïdor (${proveidorDelModel(mateixProveidor)}). Comparteix part dels punts cecs del generador.`
    };
  }

  // Cap alternativa: es diu clarament i no s'amaga darrere d'un model qualsevol.
  return {
    pas, model: prosa, proveidor: proveidorProsa, rol: 'lectura',
    mateix_model_que_prosa: true,
    avis: 'No hi ha cap model diferent disponible amb clau configurada: la lectura hostil la faria el MATEIX model que ha escrit el conte. Un lector que és el generador comparteix els seus punts cecs i tendeix a aprovar-se a si mateix. Configura un segon proveïdor per obtenir una lectura que valgui.'
  };
}

function qualitat(modelId, clau) {
  const cfg = configModel(modelId);
  return (cfg && cfg.qualitat && Number(cfg.qualitat[clau])) || 0;
}

// ═══════════════════════════════════════════════════════════
//  8. ESTIMACIÓ DE COST (abans de començar)
// ═══════════════════════════════════════════════════════════

// Tokens per caràcter en català. És una aproximació: per això tot el que en
// surt s'ha d'etiquetar com a ESTIMACIÓ a la interfície, mai com a cost.
const CARACTERS_PER_TOKEN = 3.5;

const PERFIL_CRIDES_ESTIMAT = {
  llavor:   { crides: 1, entrada: 2600, sortida: 2000 },
  dossier:  { crides: 1, entrada: 3200, sortida: 1300 },
  escaleta: { crides: 1, entrada: 2900, sortida: 1900 },
  costura:  { crides: 1, entrada: 6000, sortida: 1600 },
  lectura:  { crides: 1, entrada: 5800, sortida: 1300 },
  pedac:    { crides: 1, entrada: 5800, sortida: 1300 }
};

// Retorna una ESTIMACIÓ, no un pressupost tancat: { crides, cost_usd, per_pas }.
function estimarCostConte(dossier, escaleta, models) {
  const m = models || {};
  const modelArquitecte = m.arquitecte || '';
  const modelProsa = m.prosa || '';
  const modelLectura = m.lectura || modelProsa;

  const escenes = Array.isArray(escaleta)
    ? escaleta
    : (escaleta && Array.isArray(escaleta.escenes) ? escaleta.escenes : []);
  const nEscenes = escenes.length || 5;

  const nucli = globalThis.CONTE_CORE || {};
  const objectiu = Number(nucli.CONTE_OBJECTIU_CARACTERS) || 17500;
  const perEscena = escenes.length
    ? escenes.map(e => Number(e.caracters_objectiu) || Math.round(objectiu / nEscenes))
    : new Array(nEscenes).fill(Math.round(objectiu / nEscenes));

  const perPas = {};
  let cost = 0;
  let crides = 0;

  const afegir = (pas, modelId, entrada, sortida, n) => {
    const cfg = configModel(modelId) || { input_per_m: 0, output_per_m: 0 };
    const c = n * ((entrada / 1e6) * cfg.input_per_m + (sortida / 1e6) * cfg.output_per_m);
    perPas[pas] = { crides: n, model: modelId, tokens_entrada: entrada * n, tokens_sortida: sortida * n, cost_usd: c };
    cost += c;
    crides += n;
  };

  ['llavor', 'dossier', 'escaleta'].forEach(pas => {
    const p = PERFIL_CRIDES_ESTIMAT[pas];
    afegir(pas, modelArquitecte, p.entrada, p.sortida, p.crides);
  });

  // Escenes: una crida per escena. L'entrada és constant (perfil + dossier +
  // contracte + cua): NO creix amb la longitud del conte.
  const entradaEscena = 3400;
  const sortidaEscenes = perEscena.reduce((a, c) => a + Math.round(c / CARACTERS_PER_TOKEN), 0);
  const cfgProsa = configModel(modelProsa) || { input_per_m: 0, output_per_m: 0 };
  const costEscenes = (entradaEscena * nEscenes / 1e6) * cfgProsa.input_per_m + (sortidaEscenes / 1e6) * cfgProsa.output_per_m;
  perPas.escena = { crides: nEscenes, model: modelProsa, tokens_entrada: entradaEscena * nEscenes, tokens_sortida: sortidaEscenes, cost_usd: costEscenes };
  cost += costEscenes;
  crides += nEscenes;

  afegir('costura', modelProsa, PERFIL_CRIDES_ESTIMAT.costura.entrada, PERFIL_CRIDES_ESTIMAT.costura.sortida, 1);
  afegir('lectura', modelLectura, PERFIL_CRIDES_ESTIMAT.lectura.entrada, PERFIL_CRIDES_ESTIMAT.lectura.sortida, 1);
  afegir('pedac', modelProsa, PERFIL_CRIDES_ESTIMAT.pedac.entrada, PERFIL_CRIDES_ESTIMAT.pedac.sortida, 1);

  return {
    es_estimacio: true,
    escenes: nEscenes,
    crides,
    sostre: sostreCrides(),
    cost_usd: cost,
    per_pas: perPas
  };
}

// ═══════════════════════════════════════════════════════════
//  9. VALIDACIÓ DELS MODELS PER DEFECTE
// ═══════════════════════════════════════════════════════════

// Comprova, en temps d'execució i llegint SEMPRE per getter, que cap
// identificador per defecte apunta fora del registre i que cap camp del
// registre necessari per estimar el cost falta.
function validarDefaultsModels() {
  const problemes = [];
  const registre = registreModels();
  const perProveidor = modelsPerProveidor();

  Object.keys(perProveidor).forEach(prov => {
    const rols = perProveidor[prov] || {};
    Object.keys(rols).forEach(rol => {
      const id = rols[rol];
      if (!registre[id]) {
        problemes.push(`${prov}.${rol} → "${id}" no és a MODEL_REGISTRY`);
        return;
      }
      const declarat = normalitzarProveidor(registre[id].proveidor);
      if (declarat !== normalitzarProveidor(prov)) {
        problemes.push(`${prov}.${rol} → "${id}" consta al registre com a model de ${declarat}`);
      }
    });
  });

  Object.keys(registre).forEach(id => {
    const c = registre[id];
    ['input_per_m', 'output_per_m', 'max_output'].forEach(camp => {
      if (!Number.isFinite(Number(c[camp]))) problemes.push(`El model "${id}" no té ${camp}: el cost i el límit de sortida quedarien cecs`);
    });
  });

  if (problemes.length > 0) console.warn('⚠️ Models per defecte desalineats amb el registre:', problemes);
  return problemes;
}

// ═══════════════════════════════════════════════════════════
//  10. EXPORTACIÓ AMB PATRÓ DE DOBLE ENTORN
// ═══════════════════════════════════════════════════════════

const LLM_CLIENT_API = {
  PASSOS_AMB_CRIDA, PASSOS_ARQUITECTURA, PASSOS_PROSA,
  PROVIDER_DEFAULTS_CONTE, RESERVA_RAONAMENT_MIN, RESERVA_RAONAMENT_MAX,
  MAX_INTENTS_TRANSPORT, CARACTERS_PER_TOKEN,
  ErrorSostreCrides,
  comptador, reiniciarComptador, restaurarComptador, cridesRestants, sostreCrides,
  cridarModel, cridarModelJSON,
  triarModelPerPas, estimarCostConte, validarDefaultsModels,
  registreModels, modelsPerProveidor, configModel, proveidorDelModel,
  normalitzarProveidor, acotarMaxTokens, limitSortidaGPT5, reservaRaonamentGPT5, esGPT5,
  analitzarResposta, payloadAnthropic, payloadOpenAI, payloadGemini
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LLM_CLIENT_API;
}
if (typeof globalThis !== 'undefined') {
  globalThis.LLM_CLIENT = LLM_CLIENT_API;
}
