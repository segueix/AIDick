> **Document del mode novel·la, congelat el 2026-08-01.**
> Descriu funcionalitat que ja no existeix al generador de contes.
> Es conserva com a arxiu del que hi havia i per què.

---

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

## 2. Estratègia proposada (5 etapes: A–D en ordre, E transversal)

### Etapa A — Un sol flux d'entrada (la guanyem més gran amb el mínim esforç) ✅ FETA

1. ✅ **El nou flux (b1–b6) passa a ser l'únic camí de creació.** El botó
   "✨ Premisses (flux clàssic)" de fase-0 queda ocult (`hidden`); el codi de les
   fases 1–6 es conserva per a projectes antics restaurats des de localStorage.
2. ✅ La steps-bar de 25 píndoles queda oculta (`#steps-bar.hidden`); `updateProgress()`
   continua operant sobre els elements ocults sense errors. L'Etapa B la substituirà
   pel panell de 6 macro-etapes.
3. ✅ `nkg_biblia.html` congelat amb avís al fitxer i al planning de
   CODI_UTIL_FUNCIONANT.md. (Decisió explícita: reorganitzar **in situ**,
   no reescriure en paral·lel.) — **Eliminat definitivament a F4**
   (REVISIO_I_PLA_EXCELLENCIA.md); recuperable de l'històric de git.

### Etapa B — De 25 passos a 6 etapes amb gating per dades ✅ FETA

Implementat com a **panell "Progrés de la novel·la"** (`#panell-etapes`,
`renderPanellEtapes()`): 6 macro-etapes amb estat calculat de les dades reals
(✅ feta / 🟡 en curs / 🔒 bloquejada), comptadors (faltants NKG, capítols n/m) i un botó
d'acció per etapa (obrir configuració, continuar fonaments, completar NKG automàticament,
validar arquitectura, escriure, control d'arcs). Es refresca a cada `updateProgress()`,
a l'arrencada, en reprendre projecte i a cada capítol escrit. Les cards de fase existents
fan de "detall" per al control manual fi.

**Inclòs també (avançament de l'Etapa C):** `reglaAmbientacioAutor()` injectada als 7
prompts del nou flux (finals, tema, sinopsi, personatges, món, estructura, escaleta):
l'ambientació, els topònims i els noms són SEMPRE els de l'univers de l'autor (Suècia per
Larsson, EUA distòpics per Dick, Mèxic/Sonora per Castaneda, món secundari per Tolkien) —
mai adaptats a Catalunya, tot i escriure en català.

Macro-etapes definides:

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

### Etapa C — Perfils d'autor com a dada de primera classe ✅ FETA

Implementat: registre únic `PERFILS_AUTOR` (larsson/tolkien/dick/castaneda) amb
`nom`, `deteccio`, `prefill` (gènere+focus), `ambientacio`, `estil` (bloc complet),
`regles_dures` (Larsson) i `intensitat` (Tolkien/Castaneda). Dues funcions úniques:
`obtenirPerfilAutorId(text)` (detecció) i `obtenirAutorIdProjecte()` (punt de veritat,
amb fallback per a snapshots antics via `autor_referencia`/`tematica`).
`ESTAT._autorPerfilId` es fixa a `iniciarNovaCreacio`. Refactoritzats tots els
consumidors: `getGenreStyle`, `getSystemPromptNovella`, `reglaAmbientacioAutor`,
`fase3_personatges`, `escriureContePart`, intensitat narrativa i ganxos de capítol,
preompliment del formulari. **Zero regex de detecció fora del registre.**

Disseny original de referència:

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

### Etapa D — Reducció de mida, només quan tot funcioni ✅ FETA (2 de 3 mòduls)

Implementat: `perfils_autor.js` (registre + detecció + ambientació + estil) i
`nkg_core.js` (crearNKG, detectarFaltantsNKG, validarNKGPreparatPerCapitol1,
normalitzarVeuAvancada, parseJsonRobust + capa de validació E.1), carregats amb
`<script src>` abans dels blocs inline. Inventari i checks a CODI_UTIL_FUNCIONANT.md.
**Atenció: l'app ja no és un fitxer únic — cal desplegar els 3 fitxers junts.**
Pendent deliberat: `prompts.js` (les funcions de prompt toquen `nouFluxCall`/ESTAT;
extreure-les requereix una passada pròpia amb proves d'app en marxa).

Pla original de referència:

Seguir el full de ruta de CODI_UTIL_FUNCIONANT.md però amb aquest matís: **extreure mòduls
d'`index.html`, no migrar a un HTML nou**. Ordre segur:

1. `perfils_autor.js` (l'objecte de l'Etapa C — pur, sense DOM).
2. `nkg_core.js` (crearNKG, normalitzadors, detectarFaltantsNKG, validadors — purs).
3. `prompts.js` (plantilles de prompts per etapa).
4. La UI i l'orquestració es queden a `index.html` fins al final.

Cada extracció segueix el protocol existent: `node --check`, càrrega sense `ReferenceError`,
happy-path manual, i registre a CODI_UTIL_FUNCIONANT.md.

---

### Etapa E — Capa d'excel·lència: validació transversal i tancament de qualitat ✅ FETA

Implementat:
- **E.1**: `ESQUEMES_LLM` + `validarEsquemaLLM` + `generarJsonValidat` (parseig robust +
  validació + 1 reintent amb el motiu injectat + aturada neta i registre a
  `ESTAT._errorsValidacioLLM`). Connectat a: escaleta de capítol (aturada dura del flux,
  abans continuava amb `{}` buit en silenci), fils narratius (conserva l'estat anterior
  i avisa) i informe d'excel·lència. Esquemes pendents d'estendre: `ksn`,
  `nkg_personatge` (el parseig robust ja els cobreix; afegir-los quan es toquin).
- **E.2**: `registrarContradiccioTardana()` / `tancarContradiccioTardana()`: obre un fil
  tipat `error-continuïtat` d'alta prioritat per reconciliar cap endavant, sense tocar
  capítols bloquejats. Nota: el ganxo automàtic des del jutge queda pendent perquè
  `aplicarCorreccionsJutge` està desactivat (stub) al codi actual.
- **E.3**: `checklistSortidaNovella()` + render a la fase 24 i al panell d'etapes
  (fila 6): capítols complets, fils tancats, contradiccions reconciliades, validacions
  LLM netes. El llibre no es considera acabat fins que tot és verd.
- **E.4**: `criteris_excellencia` per perfil dins `PERFILS_AUTOR` + botó
  "🏅 Informe d'excel·lència" a la fase 24: avaluació LLM per capítol amb sortida
  estructurada validada (compleix/evidència/suggeriment), només informativa — mai
  reescriptura automàtica.

Disseny original de referència:

Les etapes A–D fan el procés consistent; l'Etapa E el fa **fiable i excel·lent**. És una capa
transversal (s'aplica a totes les etapes, no després d'elles) amb quatre peces:

#### E.1 Contracte de validació a cada crida LLM

Tota crida que esperi dades estructurades passa per un únic embolcall:

```js
async function callLLMValidat(prompt, schemaId, userConfig, opts = {}) {
  // 1. crida → 2. parseig JSON tolerant (extreu bloc ```json si cal)
  // 3. validació contra ESQUEMES[schemaId] (camps obligatoris, tipus, límits)
  // 4. si falla: reintent ÚNIC amb el motiu de l'error injectat al prompt
  // 5. si torna a fallar: aturar l'etapa amb error visible (mai continuar amb dades corruptes)
}
```

- `ESQUEMES` és un registre central de validadors per a cada sortida del pipeline
  (NKG, KSN, fils, escaleta, waypoints…). Es comença pels 5 més crítics:
  `ksn`, `fils_narratius`, `escaleta_capitol`, `nkg_personatge`, `estructura_novella`.
- Regla dura: **cap funció del pipeline escriu a `ESTAT` dades que no hagin passat el seu
  esquema**. El bug "Gemini retorna text en lloc de JSON" queda cobert per disseny.
- Els validadors són funcions pures → van a `nkg_core.js` (Etapa D) i són testejables.

#### E.2 Política d'errors cap endavant (compatible amb la immutabilitat)

Les regles d'AGENT.md (jutge single-pass, capítols bloquejats immutables) es mantenen.
La conseqüència — un error detectat tard no es pot corregir enrere — es gestiona així:

1. **Endurir la porta abans del lock**: el jutge d'interval verifica KSN + fets canònics +
   `constraints_next` del capítol anterior abans de bloquejar. Cap interval es bloqueja amb
   contradiccions conegudes pendents.
2. **Registre de contradiccions tardanes**: si una contradicció es detecta amb el capítol
   d'origen ja bloquejat, s'obre un fil de categoria `error-continuïtat` (ja existeix al
   model de fils) amb la instrucció de **reconciliar cap endavant**: el capítol següent
   integra i explica la discrepància, com faria un autor humà.
3. Aquest registre apareix al panell d'estat: cap error es perd en silenci.

#### E.3 Control d'arcs obligatori i checklist de sortida

La fase 24 (Control d'Arcs) passa de pas opcional a **porta de sortida de l'etapa 6**.
El llibre no es dona per acabat fins que el checklist és verd:

- [ ] Tots els fils en estat `tancat`, o `obert` amb justificació explícita (final obert volgut).
- [ ] Tots els waypoints emocionals planificats tenen el seu senyal visible al text.
- [ ] Cap fet canònic contradit (escaneig final KSN vs `canon_facts` acumulats).
- [ ] Cronologia per capítol sense salts no intencionats (`time_anchor` consecutius).
- [ ] Cost emocional dels ganxos de revelació pagat (no hi ha revelacions "gratis").

#### E.4 Llistó d'excel·lència per autor (revisió estètica assistida)

Després del control d'arcs, una passada final per capítol amb **criteris d'acceptació
específics del perfil** (definits dins `PERFILS_AUTOR.criteris_excellencia`), avaluats per
LLM amb sortida estructurada (`compleix: bool`, `evidencia`, `suggeriment`) — informativa,
mai reescriptura automàtica (la decisió de retocar és humana, via mode manual):

| Perfil | Exemples de criteris |
|---|---|
| Tolkien | el llenguatge crea món (topònims amb memòria), almenys un moment d'eucatàstrofe o el seu cost, cap anacronisme contemporani |
| Dick | la realitat s'esquerda almenys un cop sense resoldre's del tot, el sistema menteix de manera verificable, paranoia funcional (no histriònica) |
| Castaneda | tensió mestre-deixeble amb lliçó implícita, la percepció alterada té regles internes coherents, l'escèptic dubta de debò |
| Larsson | la violència té conseqüència institucional, la investigació avança per documents/fonts versemblants, cap heroïcitat gratuïta |

#### Criteri de fet de l'Etapa E

- Els 5 esquemes crítics actius i cap escriptura a `ESTAT` sense validar.
- Prova de resiliència: forçar una resposta malformada (mock) i verificar reintent + aturada neta.
- Una novel·la curta (6–8 capítols) generada de punta a punta **per a cada un dels 4 perfils**
  amb checklist E.3 verd i informe E.4 generat.

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
3. ~~Unificar la llista d'autors de `nkg_biblia.html` amb la d'`index.html` (o congelar el fitxer).~~ → fitxer eliminat a F4.
4. Substituir l'input de text lliure `config-autor` per un select amb els 4 perfils + "Veu original".
5. Un panell d'estat únic i persistent ("On sóc? Què em falta?") alimentat per `detectarFaltantsNKG`.

## 5. Criteri de fet (per a cada etapa A–E)

- `node --check` net dels blocs JS.
- Càrrega en fred sense `ReferenceError`.
- Happy-path complet: configurar → fonaments → NKG verd → escriure capítol 1 amb cada un
  dels 4 perfils d'autor (4 proves, una per autor).
- Snapshots antics de localStorage continuen carregant.
- CODI_UTIL_FUNCIONANT.md actualitzat.
