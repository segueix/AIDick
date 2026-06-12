# Estratègia de reorganització de Booki

> Objectiu: que una persona pugui crear una novel·la completa i coherent ("el llibre perfecte")
> amb l'estil de Tolkien, Philip K. Dick, Castaneda o Larsson, **sense perdre's pels passos**.

---

## 1. Diagnòstic: per què "sembla trencat"

El codi **no està trencat sintàcticament**: els dos blocs `<script>` d'`index.html`
(~18.000 línies de JS, 579 funcions, 117 botons) passen `node --check` sense errors.
El problema és **estructural i d'experiència d'ús**:

### 1.1 Dos fluxos d'entrada paral·lels que conviuen

| Flux | Fases | Estat |
|---|---|---|
| Flux clàssic "conte" | `fase-1` … `fase-6` (premissa → estil → protagonista → localització → final → conte) + steps-bar de 25 píndoles | Viu, però redundant |
| Nou flux | `fase-b1` … `fase-b6` (final → tema → personatges → món → estructura → escaleta) | Viu, és el bo |

Tots dos generen els mateixos fonaments per camins diferents. Resultat: doble manteniment,
estats inconsistents a `ESTAT`, i l'usuari mai sap quin camí és "l'oficial".

### 1.2 25 passos manuals en ordre estricte

Després del commit `18f8475` ("Elimina mode automàtic i fa tots els passos visibles i manuals"),
cal clicar manualment ~25 passos seguits (fases 7–24: món, elenc, veus, psicologia, ferida/arc,
matriu relacional, backstory, completar personatges, objectius/secrets, objectes, mapa/regles,
trames, estructura, escaleta, perspectiva/cronologia, veu, escriptura, control d'arcs).
Si te'n saltes un, els errors apareixen molt més tard (faltants NKG). El control és per
**ordre de clic**, no per **estat de dades**.

### 1.3 L'estil d'autor està repartit en 3 mecanismes desconnectats

1. Input de text lliure `config-autor` (per defecte "Stieg Larsson").
2. Select de `tematica` amb valors tipus `"univers Larsson — evita tòpics"`.
3. Detecció per **regex sobre `tematica`** (`/larsson|noir/`, `/tolkien|èpic/`, `/dick/`,
   `/castaneda|xamànic/`) repetida en ≥5 punts del codi (línies ~12361, 12475, 12579, 13250, 13766).

Si l'usuari escriu "fantasia èpica" sense dir "Tolkien", alguns prompts activen l'estil i
d'altres no → llibre estilísticament incoherent. A més, `nkg_biblia.html` té una llista
d'autors diferent (Rodoreda, Le Guin, Murakami) que no coincideix amb la d'`index.html`.

### 1.4 Migració paral·lela encallada

`nkg_biblia.html` (el pla de CODI_UTIL_FUNCIONANT.md) està a Fase 0+1 amb les fases 2–9 com a
placeholders. Una reescriptura paral·lela d'un fitxer de 19.700 línies repetirà el problema
dels dos fluxos: dues apps a mig fer en lloc d'una de sencera.

---

## 2. Estratègia proposada (4 etapes, en aquest ordre)

### Etapa A — Un sol flux d'entrada (la guanyem més gran amb el mínim esforç)

1. **El nou flux (b1–b6) passa a ser l'únic camí de creació.**
2. El flux clàssic (fase-1…6 + steps-bar de 25 píndoles) s'amaga de la UI
   (no s'esborra encara el codi: només `hidden` + es deixa de linkar des de fase-0).
3. `nkg_biblia.html` es congela: no s'hi migra res més fins que `index.html` estigui ordenat.
   (Decisió explícita: reorganitzar **in situ**, no reescriure en paral·lel.)

### Etapa B — De 25 passos a 6 etapes amb gating per dades

Agrupar les fases en **6 macro-etapes** visibles com a acordions, cadascuna amb un botó
"Completar etapa" (que executa en seqüència els passos interns que faltin) i amb el detall
de passos desplegable per a control manual fi:

| Macro-etapa | Conté les fases actuals | Porta d'entrada |
|---|---|---|
| 1. Configuració | API, models, gènere, **perfil d'autor** | — |
| 2. Fonaments | b1–b6 (final, tema, personatges, món, estructura, escaleta) | Config completa |
| 3. Bíblia + NKG | 10–17 (psicologia, ferida/arc, relacions, backstory, completar personatges, objectius/secrets, objectes, mapa/regles) | Fonaments complets |
| 4. Arquitectura | 18–22 (trames, estructura novel·la, escaleta per escenes, perspectiva/cronologia, veu) | NKG sense faltants crítics |
| 5. Escriptura | 23 (capítols + jutge d'interval + humanització) | `validarNKGPreparatPerCapitol1` en verd |
| 6. Revisió i export | 24 (control d'arcs, epíleg, bíblia, descàrregues) | Capítols escrits |

**Clau:** el gating deixa de ser "has clicat el pas anterior?" i passa a ser
"`detectarFaltantsNKG` diu que tens les dades?". Cada etapa mostra el seu checklist de
faltants amb un botó per ítem (això ja existeix: `mostrarFaltantsNKG` + `generarFaltantNKG`;
només cal fer-lo el mecanisme central en lloc d'un apèndix).

Això recupera la comoditat del mode automàtic (un botó per etapa) sense perdre la
visibilitat manual que es va voler amb `18f8475`.

### Etapa C — Perfils d'autor com a dada de primera classe

Substituir els 3 mecanismes actuals per **un únic objecte de configuració**, triat una sola
vegada a l'etapa 1 i injectat a cada prompt segons l'etapa:

```js
const PERFILS_AUTOR = {
  tolkien:   { nom: 'J.R.R. Tolkien',     ... },
  dick:      { nom: 'Philip K. Dick',     ... },
  castaneda: { nom: 'Carlos Castaneda',   ... },
  larsson:   { nom: 'Stieg Larsson',      ... },
  original:  { nom: 'Veu original',       ... }   // l'actual generador de manifest_veu
};
```

Cada perfil defineix blocs **per etapa del pipeline** (no un text únic):

| Camp del perfil | S'injecta a | Exemple Tolkien / Dick / Castaneda / Larsson |
|---|---|---|
| `cosmovisio` | tema, finals, trames | bé/mal còsmic i sacrifici · la realitat menteix · la percepció és un acord social · la violència és sistèmica |
| `worldbuilding` | món, mapa/regles, objectes | races, llengües, geografia amb memòria · corporacions, simulacres, tecnologia que falla · desert, plantes de poder, el nagual · institucions, Suècia, arxius i diners |
| `personatges` | elenc, psicologia, ferida | l'humil que carrega el pes · el paranoic funcional · l'aprenent escèptic · la investigadora danyada |
| `prosa` | veu, exemples, capítols | èpica pausada amb cançons · frase curta i gir ontològic · diàleg didàctic mestre-deixeble · crua, processal, explícita |
| `estructura` | estructura, escaleta | viatge i retorn · revelació en capes (res era real) · escalada d'experiències + lliçó · investigació amb doble trama |
| `tabus` | tots ("evita tòpics") | no clixés medievals genèrics · no "tot era un somni" barat · no misticisme new-age tou · no gore gratuït sense crítica |

Els blocs d'estil que **ja existeixen** a `index.html` (~línia 12361+: són bons) es trasllladen
dins d'aquest objecte; les ≥5 deteccions per regex es redueixen a una sola lectura de
`ESTAT.configuracio.autorPerfilId`. Mantenir `perfil_autor` (text) com a camp derivat per
compatibilitat amb snapshots de localStorage.

### Etapa D — Reducció de mida, només quan tot funcioni

Seguir el full de ruta de CODI_UTIL_FUNCIONANT.md però amb aquest matís: **extreure mòduls
d'`index.html`, no migrar a un HTML nou**. Ordre segur:

1. `perfils_autor.js` (l'objecte de l'Etapa C — pur, sense DOM).
2. `nkg_core.js` (crearNKG, normalitzadors, detectarFaltantsNKG, validadors — purs).
3. `prompts.js` (plantilles de prompts per etapa).
4. La UI i l'orquestració es queden a `index.html` fins al final.

Cada extracció segueix el protocol existent: `node --check`, càrrega sense `ReferenceError`,
happy-path manual, i registre a CODI_UTIL_FUNCIONANT.md.

---

## 3. Palanques de qualitat ja existents (no tocar, només connectar)

Per al "llibre perfecte" ja hi ha les peces bones; l'estratègia és que **totes** rebin el
perfil d'autor de manera consistent:

- **Jutge d'interval single-pass** amb locks (AGENT.md) → coherència factual.
- **KSN per capítol** → continuïtat sense regastar tokens.
- **Fils narratius tipats** (màx. 30 vius) → cap subtrama orfe.
- **Bloc d'humanització per capítol** (humanitzacio_capitol_bloc.md) → anti-prosa-de-plàstic.
  Afegir-hi una línia parametritzada pel perfil (p. ex. el "gest inútil" de Castaneda és un
  ritual de percepció; el de Larsson, una rutina de cafè i tabac).
- **Temperatura emocional i waypoints per capítol** → arc emocional controlat.

## 4. Quick wins (es poden fer ja, independents de la resta)

1. Omplir el README (ara és buit): què és Booki, quin és el flux oficial, com s'arrenca.
2. Amagar el flux clàssic 1–6 i la steps-bar de 25 píndoles (Etapa A.2).
3. Unificar la llista d'autors de `nkg_biblia.html` amb la d'`index.html` (o congelar el fitxer).
4. Substituir l'input de text lliure `config-autor` per un select amb els 4 perfils + "Veu original".
5. Un panell d'estat únic i persistent ("On sóc? Què em falta?") alimentat per `detectarFaltantsNKG`.

## 5. Criteri de fet (per a cada etapa A–D)

- `node --check` net dels blocs JS.
- Càrrega en fred sense `ReferenceError`.
- Happy-path complet: configurar → fonaments → NKG verd → escriure capítol 1 amb cada un
  dels 4 perfils d'autor (4 proves, una per autor).
- Snapshots antics de localStorage continuen carregant.
- CODI_UTIL_FUNCIONANT.md actualitzat.
