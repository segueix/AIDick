// Correccions d'interfície de Booki que no alteren el pipeline narratiu.
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

  function installar() {
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installar, { once: true });
  } else {
    installar();
  }
})();
