// Recuperació conservadora del NKG quan la planificació conté personatges
// però les col·leccions canòniques han quedat buides.
(function installarRecuperacioNKG() {
  'use strict';

  const ID_BOTO = 'btn-reparar-nkg-fase22';
  const MAX_PERSONATGES_RECUPERATS = 10;

  function estatActual() {
    return (typeof ESTAT !== 'undefined' && ESTAT) ? ESTAT : null;
  }

  function normalitzarClau(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function paraulaCapitalitzada(text) {
    return /^[A-ZÀ-ÖØ-Þ][\p{L}'’.-]*$/u.test(String(text || ''));
  }

  function extreureNomPersona(valor) {
    let original = String(valor || '').replace(/_/g, ' ').trim();
    if (!original) return '';

    const generics = new Set([
      'un', 'una', 'el', 'la', 'els', 'les', 'editor', 'editora', 'jove',
      'periodista', 'fotògraf', 'fotografa', 'fotògrafa', 'pescador', 'pescadora',
      'capità', 'capitana', 'barquer', 'barquera', 'arxiver', 'arxivera', 'policia',
      'recepcionista', 'funcionari', 'funcionària', 'infermer', 'infermera',
      'metge', 'doctora', 'doctor', 'dr', 'dra', 'veu', 'trucada', 'breu',
      'missatge', 'ombres', 'ombra', 'habitants', 'habitant', 'figura', 'secundària',
      'secundari', 'anònim', 'anònima', 'local'
    ]);
    const noPersones = new Set([
      'stockholm', 'norrtälje', 'vaxholm', 'socialtjänsten', 'tingsrätt',
      'kommunhälsan', 'gamla stan', 'estocolm'
    ]);

    // Quan el text principal és genèric però el parèntesi conté un nom
    // (p. ex. «una jove periodista (Ellen)»), prioritzem el nom explícit.
    const parentetiques = [...original.matchAll(/\(([^)]+)\)/g)].map(m => m[1].trim());
    for (const p of parentetiques) {
      const paraules = p.split(/\s+/).filter(Boolean);
      if (paraules.length >= 1 && paraules.length <= 3 && paraules.every(paraulaCapitalitzada)) {
        const candidat = paraules.join(' ');
        if (!noPersones.has(candidat.toLowerCase())) return candidat;
      }
    }

    original = original
      .split(/\s*\/\s*/)[0]
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    let paraules = original.split(/\s+/).filter(Boolean);
    while (paraules.length && generics.has(paraules[0].toLowerCase().replace(/[.:,]/g, ''))) {
      paraules.shift();
    }
    while (paraules.length && /^(?:d['’]?|de|del|dels|a|al)$/i.test(paraules[0])) paraules.shift();
    if (!paraules.length) return '';

    // Busca la primera seqüència d'1–3 paraules amb forma de nom propi.
    for (let inici = 0; inici < paraules.length; inici++) {
      if (!paraulaCapitalitzada(paraules[inici])) continue;
      const tros = [paraules[inici].replace(/[,:;]$/g, '')];
      for (let j = inici + 1; j < paraules.length && tros.length < 3; j++) {
        const neta = paraules[j].replace(/[,:;]$/g, '');
        if (!paraulaCapitalitzada(neta)) break;
        tros.push(neta);
      }
      const candidat = tros.join(' ').trim();
      if (!candidat || noPersones.has(candidat.toLowerCase())) continue;
      if (generics.has(candidat.toLowerCase())) continue;
      return candidat;
    }

    return '';
  }

  function pistaOcupacio(valor) {
    const text = String(valor || '');
    const parentesi = text.match(/\(([^)]+)\)/);
    const pista = parentesi ? parentesi[1] : '';
    if (!pista || /absent|veu|videotrucada|presència|segment|figura|anònim/i.test(pista)) return '';
    return pista.split(',')[0].trim().slice(0, 80);
  }

  function recollirCandidats(estat) {
    const candidats = new Map();
    let teFontEscenes = false;

    function afegir(valor, pes, font, capitol, esPov) {
      const nom = extreureNomPersona(valor);
      if (!nom) return;
      const clau = normalitzarClau(nom);
      if (!clau) return;
      const existent = candidats.get(clau) || {
        clau, nom, puntuacio: 0, aparicions: 0, capitols: new Set(),
        fonts: new Set(), ocupacio: '', povs: 0
      };
      existent.puntuacio += pes;
      existent.aparicions += 1;
      if (capitol) existent.capitols.add(Number(capitol));
      existent.fonts.add(font);
      if (esPov) existent.povs += 1;
      if (!existent.ocupacio) existent.ocupacio = pistaOcupacio(valor);
      candidats.set(clau, existent);
    }

    const escaletes = Array.isArray(estat._escaletes) ? estat._escaletes : [];
    escaletes.forEach((escaleta, idx) => {
      const capitol = Number(escaleta?.capitol || idx + 1);
      const escenes = Array.isArray(escaleta?.escenes) ? escaleta.escenes : [];
      escenes.forEach(escena => {
        const contracte = escena?.scene_contract || {};
        const llistes = [escena?.personatges, contracte?.personatges_presents];
        llistes.forEach(llista => {
          (Array.isArray(llista) ? llista : []).forEach(valor => {
            teFontEscenes = true;
            afegir(valor, 4, 'escaleta', capitol, false);
          });
        });
        if (contracte?.pov) afegir(contracte.pov, 5, 'pov', capitol, true);
      });
    });

    (Array.isArray(estat._estructuraCapitols) ? estat._estructuraCapitols : []).forEach((cap, idx) => {
      (Array.isArray(cap?.personatges) ? cap.personatges : []).forEach(valor =>
        afegir(valor, 3, 'estructura', Number(cap?.numero || idx + 1), false));
    });

    const fitxes = Array.isArray(estat.bibliaNarrativa?.fitxes_personatges)
      ? estat.bibliaNarrativa.fitxes_personatges : [];
    fitxes.forEach(f => afegir(f?.nom || f?.name, 6, 'biblia', 0, false));

    // Les trames poden haver derivat cap a un altre repartiment. Només les usem
    // com a font principal quan les escaletes encara no contenen noms.
    if (!teFontEscenes) {
      const subtrames = Array.isArray(estat.trames?.subtrames) ? estat.trames.subtrames : [];
      subtrames.forEach(st => {
        const noms = st?.personatges_implicats || st?.personatges || [];
        (Array.isArray(noms) ? noms : [noms]).forEach(valor => afegir(valor, 4, 'trama', 0, false));
      });
    }

    const synopsis = String(estat._nkg?.macronarrativa?.synopsis_core || '');
    candidats.forEach(c => {
      if (synopsis.toLowerCase().includes(c.nom.toLowerCase())) c.puntuacio += 8;
      c.puntuacio += c.povs * 3;
    });

    // Fusiona «Karin» amb «Karin Lind» o variants equivalents, preferint el nom
    // més complet i acumulant-ne les aparicions.
    const llista = [...candidats.values()].sort((a, b) => b.nom.length - a.nom.length);
    const eliminats = new Set();
    for (let i = 0; i < llista.length; i++) {
      if (eliminats.has(llista[i].clau)) continue;
      const principal = llista[i];
      for (let j = i + 1; j < llista.length; j++) {
        const curt = llista[j];
        if (eliminats.has(curt.clau)) continue;
        const a = principal.nom.toLowerCase();
        const b = curt.nom.toLowerCase();
        if (a === b || a.startsWith(b + ' ') || b.startsWith(a + ' ')) {
          const llarg = principal.nom.length >= curt.nom.length ? principal : curt;
          const breu = llarg === principal ? curt : principal;
          llarg.puntuacio += breu.puntuacio;
          llarg.aparicions += breu.aparicions;
          llarg.povs += breu.povs;
          breu.capitols.forEach(x => llarg.capitols.add(x));
          breu.fonts.forEach(x => llarg.fonts.add(x));
          if (!llarg.ocupacio) llarg.ocupacio = breu.ocupacio;
          eliminats.add(breu.clau);
        }
      }
    }

    return llista
      .filter(c => !eliminats.has(c.clau))
      .filter(c => c.puntuacio >= 4)
      .sort((a, b) => (b.puntuacio - a.puntuacio) || (b.aparicions - a.aparicions))
      .slice(0, MAX_PERSONATGES_RECUPERATS);
  }

  function personatgeMinimal(candidat, esProtagonista) {
    return {
      id: candidat.clau,
      nom: candidat.nom,
      rol: esProtagonista ? 'protagonista' : 'secundari',
      trets_immutables: {
        aspecte_fisic: '',
        ocupacio: candidat.ocupacio || '',
        tret_definitori: ''
      },
      veu: {
        exemples_narratius: [],
        vocabulari_recurrent: [],
        vocabulari_prohibit: [],
        longitud_frases: 'mitjanes'
      },
      objectius: [],
      secrets: [],
      capitols_planificats: [...candidat.capitols].sort((a, b) => a - b),
      origen_recuperacio: 'escaletes_existents'
    };
  }

  function sincronitzarPersonatgesCapitols(estat, candidats) {
    const perCapitol = new Map();
    const perClau = new Map(candidats.map(c => [c.clau, c.nom]));
    const escaletes = Array.isArray(estat._escaletes) ? estat._escaletes : [];

    escaletes.forEach((escaleta, idx) => {
      const capitol = Number(escaleta?.capitol || idx + 1);
      const noms = new Set();
      (Array.isArray(escaleta?.escenes) ? escaleta.escenes : []).forEach(escena => {
        const contracte = escena?.scene_contract || {};
        [escena?.personatges, contracte?.personatges_presents].forEach(llista => {
          (Array.isArray(llista) ? llista : []).forEach(valor => {
            const nom = extreureNomPersona(valor);
            const canon = perClau.get(normalitzarClau(nom));
            if (canon) noms.add(canon);
          });
        });
      });
      perCapitol.set(capitol, [...noms]);
    });

    (Array.isArray(estat._estructuraCapitols) ? estat._estructuraCapitols : []).forEach((cap, idx) => {
      if (!Array.isArray(cap.personatges) || cap.personatges.length === 0) {
        cap.personatges = perCapitol.get(Number(cap?.numero || idx + 1)) || [];
      }
    });
  }

  function reconstruirPersonatgesNKGDesDePlanificacio() {
    const estat = estatActual();
    if (!estat) return { reparat: false, total: 0, noms: [], motiu: 'sense ESTAT' };

    if (!estat._nkg || typeof estat._nkg !== 'object') {
      estat._nkg = (typeof crearNKG === 'function') ? crearNKG() : { personatges: {} };
    }
    if (!estat._nkg.personatges || typeof estat._nkg.personatges !== 'object') {
      estat._nkg.personatges = {};
    }

    const existents = Object.values(estat._nkg.personatges).filter(Boolean);
    if (existents.length > 0) {
      return { reparat: false, total: existents.length, noms: existents.map(p => p.nom).filter(Boolean), motiu: 'ja existien' };
    }

    const candidats = recollirCandidats(estat);
    if (candidats.length === 0) {
      return { reparat: false, total: 0, noms: [], motiu: 'cap nom recuperable' };
    }

    candidats.forEach((c, idx) => {
      estat._nkg.personatges[c.clau] = personatgeMinimal(c, idx === 0);
    });
    sincronitzarPersonatgesCapitols(estat, candidats);

    estat.bibliaNarrativa = estat.bibliaNarrativa || {};
    if (!Array.isArray(estat.bibliaNarrativa.fitxes_personatges) || estat.bibliaNarrativa.fitxes_personatges.length === 0) {
      estat.bibliaNarrativa.fitxes_personatges = candidats.map((c, idx) => ({
        id: c.clau,
        nom: c.nom,
        rol: idx === 0 ? 'protagonista' : 'secundari',
        origen_recuperacio: 'escaletes_existents'
      }));
    }

    estat._recuperacioNKG = {
      quanISO: new Date().toISOString(),
      font: 'escaletes_existents',
      personatges: candidats.map(c => c.nom)
    };

    console.info(`✅ [Booki] Recuperats ${candidats.length} personatges al NKG: ${candidats.map(c => c.nom).join(', ')}`);
    return { reparat: true, total: candidats.length, noms: candidats.map(c => c.nom), motiu: 'recuperats' };
  }

  function calRecuperarPersonatges() {
    const estat = estatActual();
    if (!estat || Number(estat.fase) !== 22) return false;
    const total = Object.values(estat._nkg?.personatges || {}).filter(Boolean).length;
    return total === 0 && Array.isArray(estat._escaletes) && estat._escaletes.length > 0;
  }

  async function repararIContinuarFase22Booki(boto) {
    const btn = boto || document.getElementById(ID_BOTO);
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Recuperant personatges de les escaletes…';
    }

    const resultat = reconstruirPersonatgesNKGDesDePlanificacio();
    if (resultat.total === 0) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '↻ Tornar a intentar la recuperació';
      }
      if (typeof toast === 'function') toast('No s’han trobat noms de personatge recuperables a les escaletes.');
      return resultat;
    }

    try {
      if (typeof mostrarFaltantsNKG === 'function') mostrarFaltantsNKG();
      if (typeof autocompletarNKGSilent === 'function') {
        await autocompletarNKGSilent(missatge => {
          if (btn) btn.textContent = `⏳ ${missatge}`;
        });
      }
      if (typeof mostrarFaltantsNKG === 'function') mostrarFaltantsNKG();
      if (typeof renderPanellEtapes === 'function') renderPanellEtapes();

      const faltants = (typeof detectarFaltantsNKG === 'function')
        ? detectarFaltantsNKG(estatActual()?._nkg || {}, estatActual()?.bibliaNarrativa || {})
        : [];
      if (faltants.length === 0) {
        btn?.remove();
        if (typeof toast === 'function') toast(`✅ NKG recuperat: ${resultat.total} personatges i compleció de la fase 22 finalitzada.`);
      } else if (btn) {
        btn.disabled = false;
        btn.textContent = `▶ Continuar compleció NKG (${faltants.length} pendents)`;
      }
      return Object.assign({}, resultat, { faltants });
    } catch (err) {
      console.warn('Error reprenent la fase 22 després de recuperar personatges:', err);
      if (btn) {
        btn.disabled = false;
        btn.textContent = '▶ Continuar compleció NKG';
      }
      if (typeof toast === 'function') toast('S’han recuperat els personatges, però una crida posterior ha fallat: ' + err.message);
      return Object.assign({}, resultat, { error: err.message });
    }
  }

  function assegurarBotoRecuperacio() {
    const existent = document.getElementById(ID_BOTO);
    if (!calRecuperarPersonatges()) {
      existent?.remove();
      return;
    }
    if (existent) return;

    const boto = document.createElement('button');
    boto.id = ID_BOTO;
    boto.className = 'btn btn-primary';
    boto.style.marginTop = '12px';
    boto.textContent = '🛠️ Reparar personatges i continuar fase 22';
    boto.onclick = () => repararIContinuarFase22Booki(boto);

    const desti = document.getElementById('nkg-faltants-cos')?.parentElement
      || document.getElementById('fase-22');
    desti?.appendChild(boto);
  }

  function embolcallarAmbRecuperacio(nom) {
    const original = window[nom];
    if (typeof original !== 'function' || original.__bookiRecuperaPersonatgesNKG) return false;

    const embolcallada = async function(...args) {
      reconstruirPersonatgesNKGDesDePlanificacio();
      return await original.apply(this, args);
    };
    embolcallada.__bookiRecuperaPersonatgesNKG = true;
    window[nom] = embolcallada;
    return true;
  }

  function embolcallarRenderFaltants() {
    const original = window.mostrarFaltantsNKG;
    if (typeof original !== 'function' || original.__bookiBotoRecuperaNKG) return false;
    const embolcallada = function(...args) {
      const resultat = original.apply(this, args);
      setTimeout(assegurarBotoRecuperacio, 0);
      return resultat;
    };
    embolcallada.__bookiBotoRecuperaNKG = true;
    window.mostrarFaltantsNKG = embolcallada;
    return true;
  }

  function embolcallarRestauracio() {
    const original = window.restaurarInterficieDesDeEstat;
    if (typeof original !== 'function' || original.__bookiRecuperacioFase22) return false;
    const embolcallada = function(...args) {
      const resultat = original.apply(this, args);
      setTimeout(assegurarBotoRecuperacio, 0);
      return resultat;
    };
    embolcallada.__bookiRecuperacioFase22 = true;
    window.restaurarInterficieDesDeEstat = embolcallada;
    return true;
  }

  function installarEmbolcalls() {
    [
      'autocompletarNKGSilent',
      'assegurarMinimPersonatgesPerRelacions',
      'generarBackstoryIRelacions',
      'generarVeuExemples',
      'iniciarFase22'
    ].forEach(embolcallarAmbRecuperacio);
    embolcallarRenderFaltants();
    embolcallarRestauracio();
  }

  function installar() {
    window.reconstruirPersonatgesNKGDesDePlanificacio = reconstruirPersonatgesNKGDesDePlanificacio;
    window.repararIContinuarFase22Booki = repararIContinuarFase22Booki;
    installarEmbolcalls();
    assegurarBotoRecuperacio();

    // Alguns blocs inline poden acabar de declarar-se després del carregador.
    // Reintentem els embolcalls sense iniciar cap crida d’API automàticament.
    let intents = 0;
    const temporitzador = setInterval(() => {
      installarEmbolcalls();
      assegurarBotoRecuperacio();
      intents += 1;
      if (intents >= 8) clearInterval(temporitzador);
    }, 750);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installar, { once: true });
  } else {
    installar();
  }
})();