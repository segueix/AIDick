// Correccions d'interfície i recuperació de flux de Booki.
(function installarCorreccionsUI() {
  'use strict';

  function aplicarMarcatgeEstructura(idx) {
    const seleccionat = Number(idx);
    const opcions = [
      { id: 'estructura-nou-a', lletra: 'A' },
      { id: 'estructura-nou-b', lletra: 'B' }
    ];

    opcions.forEach((opcio, i) => {
      const contenidor = document.getElementById(opcio.id);
      if (!contenidor) return;

      const activa = i === seleccionat;
      contenidor.style.border = activa ? '2px solid var(--accent)' : '1px solid var(--border)';
      contenidor.style.background = activa ? '#1e1b38' : 'transparent';
      contenidor.style.borderRadius = '10px';
      contenidor.style.padding = '12px';
      contenidor.style.transition = 'border-color .2s, background .2s';
      contenidor.setAttribute('aria-selected', String(activa));

      const boto = contenidor.querySelector('button.btn');
      if (!boto) return;

      // No poden coexistir btn-primary i btn-ghost: btn-ghost es declara després
      // al CSS i anul·lava visualment l'estat seleccionat.
      boto.classList.toggle('btn-primary', activa);
      boto.classList.toggle('btn-ghost', !activa);
      boto.setAttribute('aria-pressed', String(activa));
      boto.textContent = activa
        ? `✓ Estructura ${opcio.lletra} seleccionada`
        : `Triar Estructura ${opcio.lletra}`;
    });
  }

  function embolcallarSeleccioEstructura() {
    const original = window.seleccionarEstructuraNou;
    if (typeof original !== 'function' || original.__bookiMarcatgeEstructura) return;

    const corregida = function seleccionarEstructuraNouCorregida(idx) {
      const resultat = original.apply(this, arguments);
      aplicarMarcatgeEstructura(idx);
      return resultat;
    };
    corregida.__bookiMarcatgeEstructura = true;
    window.seleccionarEstructuraNou = corregida;

    // En restaurar un projecte, reflecteix també una selecció ja desada.
    if (typeof ESTAT !== 'undefined' && ESTAT._idxEstructuraNou !== null && ESTAT._idxEstructuraNou !== undefined) {
      aplicarMarcatgeEstructura(ESTAT._idxEstructuraNou);
    }
  }

  function dormir(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function reforcarValidacioEscaleta() {
    const original = window.generarJsonValidat;
    if (typeof original !== 'function' || original.__bookiEscaletaRobusta) return;

    const reforcada = async function generarJsonValidatRobust(schemaId, ferCrida) {
      if (schemaId !== 'escaleta_capitol') {
        return original.apply(this, arguments);
      }

      const MAX_INTENTS = 3;
      let errors = ['resposta no parsejable com a JSON'];

      for (let intent = 0; intent < MAX_INTENTS; intent++) {
        const motiu = intent === 0
          ? ''
          : `${errors.join('; ')}. Retorna EXCLUSIVAMENT un únic objecte JSON complet, sense Markdown ni text exterior. Si cal, escurça els textos, però conserva totes les claus i tots els scene_contracts.`;

        const raw = await ferCrida(motiu);
        const dades = (typeof parseJsonRobust === 'function') ? parseJsonRobust(raw) : null;
        const validacio = dades && typeof validarEsquemaLLM === 'function'
          ? validarEsquemaLLM(schemaId, dades)
          : { ok: false, errors: ['resposta no parsejable com a JSON'] };

        if (validacio.ok) {
          return { ok: true, dades, reintents: intent };
        }

        errors = Array.isArray(validacio.errors) && validacio.errors.length
          ? validacio.errors
          : ['resposta no parsejable com a JSON'];

        if (intent < MAX_INTENTS - 1) {
          console.warn(`⚠️ [Booki] Escaleta invàlida. Reintent ${intent + 2}/${MAX_INTENTS}: ${errors.join('; ')}`);
          await dormir(300 * (intent + 1));
        }
      }

      if (typeof registrarErrorValidacioLLM === 'function') {
        registrarErrorValidacioLLM(schemaId, errors);
      }
      return { ok: false, dades: null, errors, reintents: MAX_INTENTS - 1 };
    };

    reforcada.__bookiEscaletaRobusta = true;
    window.generarJsonValidat = reforcada;
  }

  function sceneContractsExistents(escaleta) {
    if (!escaleta || !Array.isArray(escaleta.escenes)) return [];
    return escaleta.escenes
      .map(escena => escena && escena.scene_contract)
      .filter(contracte => contracte && typeof contracte === 'object');
  }

  function esEscaletaReutilitzable(escaleta, numero) {
    return Boolean(
      escaleta &&
      Number(escaleta.capitol) === Number(numero) &&
      typeof escaleta.funcio === 'string' &&
      escaleta.funcio.trim() &&
      sceneContractsExistents(escaleta).length > 0
    );
  }

  function prefixEscaletesValides() {
    if (typeof ESTAT === 'undefined') return [];
    const escaletes = Array.isArray(ESTAT._escaletes) ? ESTAT._escaletes : [];
    const estructura = Array.isArray(ESTAT._estructuraCapitols) ? ESTAT._estructuraCapitols : [];
    const prefix = [];

    for (let i = 0; i < estructura.length; i++) {
      const numero = Number(estructura[i]?.numero || i + 1);
      const existent = escaletes.find(e => Number(e?.capitol) === numero);
      if (!esEscaletaReutilitzable(existent, numero)) break;
      prefix.push(existent);
    }
    return prefix;
  }

  function reconstruirRespostaEscaleta(escaleta, capInfo, idx) {
    const numero = Number(capInfo?.numero || escaleta?.capitol || idx + 1);
    const estructura = (typeof ESTAT !== 'undefined' && Array.isArray(ESTAT._estructuraCapitols))
      ? (ESTAT._estructuraCapitols[numero - 1] || capInfo || {})
      : (capInfo || {});

    return {
      funcio: escaleta.funcio || estructura.resum || '',
      detonant_emocional_escena: escaleta.detonant_emocional_escena || 'Una prova concreta obliga el personatge POV a actuar.',
      primera_frase: escaleta.primera_frase || `El capítol ${numero} comença amb una decisió que ja no es pot ajornar.`,
      darrera_imatge: escaleta.darrera_imatge || 'Una imatge concreta deixa oberta la conseqüència del capítol.',
      ganxo_final: escaleta.ganxo_final || estructura.ganxo_final || {
        tipus: 'ganxo_pregunta',
        intensitat: Number(estructura.intensity_level || 3),
        element: 'la conseqüència visible de la decisió',
        pregunta_implicita: 'Quin preu tindrà la decisió que acaba de prendre?'
      },
      estat_final_personatges: escaleta.estat_final_personatges || {},
      scene_contracts: sceneContractsExistents(escaleta),
      fils_obren: [],
      fils_avancen: Array.isArray(estructura.threads_advancing) ? estructura.threads_advancing : [],
      fils_tanquen: Array.isArray(estructura.threads_closing) ? estructura.threads_closing : []
    };
  }

  function netejarErrorsEscaletaResolts() {
    if (typeof ESTAT === 'undefined' || !Array.isArray(ESTAT._errorsValidacioLLM)) return;
    ESTAT._errorsValidacioLLM = ESTAT._errorsValidacioLLM.filter(e => e?.schemaId !== 'escaleta_capitol');
  }

  function assegurarBotoReprendreEscaleta() {
    if (typeof ESTAT === 'undefined') return;
    const total = Array.isArray(ESTAT._estructuraCapitols) ? ESTAT._estructuraCapitols.length : 0;
    const fets = prefixEscaletesValides().length;
    const existent = document.getElementById('btn-reprendre-escaleta-booki');

    if (!total || fets >= total || ESTAT.fase !== 'b6') {
      existent?.remove();
      return;
    }
    if (existent) {
      existent.textContent = `▶ Reprendre escaleta des del capítol ${fets + 1}`;
      return;
    }

    const boto = document.createElement('button');
    boto.id = 'btn-reprendre-escaleta-booki';
    boto.className = 'btn btn-primary';
    boto.style.marginTop = '14px';
    boto.textContent = `▶ Reprendre escaleta des del capítol ${fets + 1}`;
    boto.onclick = () => window.iniciarEscaletaSeqNou?.();

    const desti = document.getElementById('escaleta-nou-result')?.parentElement
      || document.getElementById('fase-b6');
    desti?.appendChild(boto);
  }

  function embolcallarRestauracio() {
    const original = window.restaurarInterficieDesDeEstat;
    if (typeof original !== 'function' || original.__bookiBotoReprendre) return;

    const corregida = function restaurarInterficieAmbReprendre() {
      const resultat = original.apply(this, arguments);
      setTimeout(assegurarBotoReprendreEscaleta, 0);
      return resultat;
    };
    corregida.__bookiBotoReprendre = true;
    window.restaurarInterficieDesDeEstat = corregida;
  }

  function embolcallarEscaletaSeq() {
    const original = window.iniciarEscaletaSeqNou;
    const cridaOriginal = window.nouFlux_escaletaCapitol;
    if (
      typeof original !== 'function' ||
      typeof cridaOriginal !== 'function' ||
      original.__bookiEscaletaReprenible
    ) return;

    const executarRonda = async prefix => {
      const perCapitol = new Map(prefix.map(e => [Number(e.capitol), e]));
      const funcioReal = window.nouFlux_escaletaCapitol;

      window.nouFlux_escaletaCapitol = function nouFluxEscaletaAmbReutilitzacio(capInfo) {
        const numero = Number(capInfo?.numero || 0);
        const existent = perCapitol.get(numero);
        if (existent) {
          const dades = reconstruirRespostaEscaleta(existent, capInfo, numero - 1);
          return Promise.resolve(JSON.stringify(dades));
        }
        return funcioReal.apply(this, arguments);
      };

      try {
        return await original();
      } finally {
        window.nouFlux_escaletaCapitol = funcioReal;
      }
    };

    const corregida = async function iniciarEscaletaSeqNouReprenible() {
      const total = (typeof ESTAT !== 'undefined' && Array.isArray(ESTAT._estructuraCapitols))
        ? ESTAT._estructuraCapitols.length
        : 0;
      const MAX_RONDES = 3;

      for (let ronda = 0; ronda < MAX_RONDES; ronda++) {
        const prefix = prefixEscaletesValides();
        const abans = prefix.length;

        if (abans >= total && total > 0) {
          netejarErrorsEscaletaResolts();
          assegurarBotoReprendreEscaleta();
          return;
        }

        if (ronda > 0) {
          const loaderText = document.getElementById('loader-b6-text');
          if (loaderText) loaderText.textContent = `Reprenent des del capítol ${abans + 1}…`;
          await dormir(500 * ronda);
        }

        await executarRonda(prefix);

        const despres = prefixEscaletesValides().length;
        if (despres >= total && total > 0) {
          netejarErrorsEscaletaResolts();
          assegurarBotoReprendreEscaleta();
          return;
        }
      }

      assegurarBotoReprendreEscaleta();
      const fets = prefixEscaletesValides().length;
      if (typeof toast === 'function') {
        toast(`No s'ha pogut completar l'escaleta. S'han conservat ${fets}/${total} capítols; reprèn des del capítol ${fets + 1}.`);
      }
    };

    corregida.__bookiEscaletaReprenible = true;
    window.iniciarEscaletaSeqNou = corregida;
  }

  function installar() {
    embolcallarSeleccioEstructura();
    reforcarValidacioEscaleta();
    embolcallarEscaletaSeq();
    embolcallarRestauracio();
    assegurarBotoReprendreEscaleta();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installar, { once: true });
  } else {
    installar();
  }
})();
