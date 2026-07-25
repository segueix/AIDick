// Extensió de configuració OpenAI per a Booki.
// Es carrega abans del bloc principal i registra els models just abans
// de la inicialització DOMContentLoaded de l'aplicació.
(function registrarModelsOpenAI() {
  'use strict';

  const defaultsOpenAI = Object.freeze({
    draft: 'gpt-5.4-nano',
    generacio: 'gpt-5.6-luna',
    arquitectura: 'gpt-5.6-terra'
  });

  const modelsOpenAI = {
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

    const proveidor = document.getElementById('config-provider');
    const opcioOpenAI = proveidor && proveidor.querySelector('option[value="openai"]');
    if (opcioOpenAI) opcioOpenAI.textContent = 'OpenAI (GPT-5.6)';

    const presetOpenAI = document.querySelector('button[onclick="aplicarPreset(\'barat_gpt\')"]');
    if (presetOpenAI) {
      presetOpenAI.textContent = '🤖 OpenAI recomanat';
      presetOpenAI.title = 'GPT-5.4 Nano + GPT-5.6 Luna + GPT-5.6 Terra';
    }

    window.BOOKI_OPENAI_MODELS = { ...defaultsOpenAI };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installar, { once: true });
  } else {
    installar();
  }
})();
