// Extensió de configuració OpenAI per a Booki.
// Es carrega abans del bloc principal i registra els models just abans
// de la inicialització DOMContentLoaded de l'aplicació.
(function registrarModelsOpenAI() {
  'use strict';

  // Configuració econòmica però prou fiable per validar el pipeline complet:
  // Nano només per a tasques mecàniques; Mini per a prosa i arquitectura.
  const defaultsOpenAI = Object.freeze({
    draft: 'gpt-5-nano',
    generacio: 'gpt-5-mini',
    arquitectura: 'gpt-5-mini'
  });

  const modelsOpenAI = {
    'gpt-5-nano': {
      nom: 'GPT-5 Nano', nomCurt: 'GPT-5 Nano',
      proveidor: 'openai',
      input_per_m: 0.05, output_per_m: 0.40,
      context_max: 400000, max_output: 128000,
      qualitat: { draft: 80, prosa: 66, arquitectura: 70, extraccio: 91 },
      velocitat: 'molt_rapida',
      notes: 'Model més econòmic per a extracció, classificació, resums, NKG i tasques auxiliars.'
    },
    'gpt-5-mini': {
      nom: 'GPT-5 Mini', nomCurt: 'GPT-5 Mini',
      proveidor: 'openai',
      input_per_m: 0.25, output_per_m: 2.00,
      context_max: 400000, max_output: 128000,
      qualitat: { draft: 86, prosa: 82, arquitectura: 84, extraccio: 88 },
      velocitat: 'rapida',
      notes: 'Equilibri econòmic per a redacció literària, estructura, coherència i revisió del pipeline.'
    },
    'gpt-5.4-nano': {
      nom: 'GPT-5.4 Nano', nomCurt: 'GPT-5.4 Nano',
      proveidor: 'openai',
      input_per_m: 0.20, output_per_m: 1.25,
      context_max: 400000, max_output: 128000,
      qualitat: { draft: 84, prosa: 70, arquitectura: 76, extraccio: 92 },
      velocitat: 'molt_rapida',
      notes: 'Per a extracció, classificació, resums, esquelets i tasques auxiliars d’alt volum.'
    },
    'gpt-5.6-luna': {
      nom: 'GPT-5.6 Luna', nomCurt: 'GPT-5.6 Luna',
      proveidor: 'openai',
      input_per_m: 1.00, output_per_m: 6.00,
      context_max: 1050000, max_output: 128000,
      qualitat: { draft: 88, prosa: 88, arquitectura: 88, extraccio: 91 },
      velocitat: 'rapida',
      notes: 'Model eficient per a la redacció creativa, l’expansió i la reescriptura de capítols.'
    },
    'gpt-5.6-terra': {
      nom: 'GPT-5.6 Terra', nomCurt: 'GPT-5.6 Terra',
      proveidor: 'openai',
      input_per_m: 2.50, output_per_m: 15.00,
      context_max: 1050000, max_output: 128000,
      qualitat: { draft: 91, prosa: 92, arquitectura: 95, extraccio: 94 },
      velocitat: 'moderada',
      notes: 'Per a arquitectura, coherència global, diagnòstic literari i revisió editorial.'
    }
  };

  function assegurarCampDraftVisible() {
    if (document.getElementById('config-model-draft')) return;

    const inputGeneracio = document.getElementById('config-model-generacio');
    const etiquetaGeneracio = document.querySelector('label[for="config-model-generacio"]');
    if (!inputGeneracio || !etiquetaGeneracio || !etiquetaGeneracio.parentNode) return;

    const etiquetaDraft = document.createElement('label');
    etiquetaDraft.className = 'field-label';
    etiquetaDraft.htmlFor = 'config-model-draft';
    etiquetaDraft.innerHTML = 'Model de Draft / Extracció <span style="color:var(--text2);font-size:.78rem;">— esquelets, resums i NKG</span>';

    const inputDraft = document.createElement('input');
    inputDraft.type = 'text';
    inputDraft.id = 'config-model-draft';
    inputDraft.value = (typeof ESTAT !== 'undefined' && ESTAT._modelDraft) || defaultsOpenAI.draft;
    inputDraft.placeholder = defaultsOpenAI.draft;
    inputDraft.autocomplete = 'off';
    inputDraft.addEventListener('change', aplicarDraftDesDelCamp);

    etiquetaGeneracio.parentNode.insertBefore(etiquetaDraft, etiquetaGeneracio);
    etiquetaGeneracio.parentNode.insertBefore(inputDraft, etiquetaGeneracio);
  }

  function aplicarDraftDesDelCamp() {
    const input = document.getElementById('config-model-draft');
    const modelId = String((input && input.value) || '').trim();
    if (!modelId || typeof MODEL_REGISTRY === 'undefined' || !MODEL_REGISTRY[modelId]) return;

    if (typeof ESTAT !== 'undefined') ESTAT._modelDraft = modelId;
    const selector = document.getElementById('selectModelDraft');
    if (selector) selector.value = modelId;
  }

  function sincronitzarCampDraft() {
    const input = document.getElementById('config-model-draft');
    if (!input) return;
    const modelId = (typeof ESTAT !== 'undefined' && ESTAT._modelDraft) || defaultsOpenAI.draft;
    input.value = modelId;
    input.placeholder = modelId;
  }

  function embolcallarFuncioGlobal(nom, abans, despres) {
    const original = window[nom];
    if (typeof original !== 'function' || original.__bookiDraftVisible) return;

    const embolcallada = function(...args) {
      if (typeof abans === 'function') abans();
      const resultat = original.apply(this, args);
      if (typeof despres === 'function') despres();
      return resultat;
    };
    embolcallada.__bookiDraftVisible = true;
    window[nom] = embolcallada;
  }

  function connectarCampDraft() {
    // Els presets, el canvi de proveïdor i el selector inferior han de reflectir-se
    // també al tercer camp visible de la capçalera.
    embolcallarFuncioGlobal('sincronitzarCampsConfigModels', null, sincronitzarCampDraft);
    embolcallarFuncioGlobal('actualitzarConfigProvider', null, sincronitzarCampDraft);
    embolcallarFuncioGlobal('poblarSelectorsModels', null, sincronitzarCampDraft);

    // Si l’usuari escriu manualment el model Draft, s’aplica abans de desar.
    embolcallarFuncioGlobal('guardarIComencar', aplicarDraftDesDelCamp, sincronitzarCampDraft);
    embolcallarFuncioGlobal('actualitzarConfiguracioActiva', aplicarDraftDesDelCamp, sincronitzarCampDraft);
  }

  function installar() {
    if (typeof MODEL_REGISTRY === 'undefined' || typeof MODELS_PER_PROVEIDOR === 'undefined') {
      console.error('No s’han pogut registrar els models OpenAI: falta el registre principal de Booki.');
      return;
    }

    Object.assign(MODEL_REGISTRY, modelsOpenAI);
    MODELS_PER_PROVEIDOR.openai = { ...defaultsOpenAI };

    // Corregeix també les dades de cost del model antic que continua disponible.
    if (MODEL_REGISTRY['gpt-5.4-mini']) {
      Object.assign(MODEL_REGISTRY['gpt-5.4-mini'], {
        input_per_m: 0.75,
        output_per_m: 4.50,
        context_max: 400000,
        max_output: 128000
      });
    }

    assegurarCampDraftVisible();
    connectarCampDraft();
    sincronitzarCampDraft();

    const proveidor = document.getElementById('config-provider');
    const opcioOpenAI = proveidor && proveidor.querySelector('option[value="openai"]');
    if (opcioOpenAI) opcioOpenAI.textContent = 'OpenAI econòmic (GPT-5 Nano/Mini)';

    const presetOpenAI = document.querySelector('button[onclick="aplicarPreset(\'barat_gpt\')"]');
    if (presetOpenAI) {
      presetOpenAI.textContent = '🤖 OpenAI econòmic coherent';
      presetOpenAI.title = 'GPT-5 Nano per Draft + GPT-5 Mini per Generació i Arquitectura';
    }

    window.BOOKI_OPENAI_MODELS = { ...defaultsOpenAI };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installar, { once: true });
  } else {
    installar();
  }
})();
