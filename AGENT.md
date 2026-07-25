# AGENTS.md — Booki

## Descripció del projecte

Booki és una aplicació web (single-file `index.html` amb JS incrustat) que transforma un conte breu en una novel·la completa mitjançant un pipeline seqüencial: configuració de models → món/personatges/veus/psicologia → disseny de trames → estructura → escaleta → escriptura de capítols amb revisió.

## Idioma

- Tot el text visible a la UI ha de ser en català.
- Tots els prompts interns enviats als LLM han de ser en català.
- Els comentaris al codi poden ser en català o anglès, però els noms de funcions i variables es mantenen tal com estan (no canviar noms existents sense instrucció explícita).

## Regles d'immutabilitat

1. **Capítols bloquejats són immutables.** Cap funció pot modificar el text d'un capítol que tingui `ESTAT._capitolsLocked[idx].locked === true`.
2. **Intervals bloquejats no es re-jutgen.** Si `ESTAT._intervalLocks[intervalId]` existeix i està bloquejat, el jutge d'interval no s'hi torna a executar.
3. **No hi ha reescriptures destructives.** Sobre capítols bloquejats només es permeten actualitzacions "gratuïtes": perfils, fets canònics, KSN. Mai retocar el text.

## Regles del jutge d'interval

- El jutge s'executa **exactament 1 vegada** per interval (single-pass). `MAX_ITER = 1`.
- Si cal reescriure capítols dins l'interval, es fa **en ordre descendent** (índex més alt primer: cap.4 → cap.3 → cap.2 → cap.1).
- Després de cada reescriptura individual, es resincronitzen registre i NKG abans de passar al capítol següent.
- Un cop el jutge acaba, l'interval queda bloquejat (`_intervalLocks`).

## Context als prompts (estalvi de tokens)

- **Capítols bloquejats** entren als prompts només com a KSN + resum curt. Mai text complet.
- **Capítols de l'interval actiu** entren com a KSN + resum llarg. Text complet només si cal verificar una contradicció factual concreta.
- **Fils narratius** entren com a estructura tipada (id, categoria, estat), no com a text lliure.

## Estructura KSN (Kernel de Seguiment Narratiu)

Cada capítol té un objecte `llibreRegistre.capitols[idx].ksn` amb:

```json
{
  "ksn_core": "string (80-140 paraules: situació final i ganxos)",
  "canon_facts": ["string (màx. 8 fets inamovibles)"],
  "character_end_state": { "nom": "ubicació + intenció + estat emocional" },
  "object_moves": [{ "objecte": "de/a + ubicació" }],
  "time_anchor": "string (opcional: data/hora si rellevant)",
  "threads_delta": {
    "opened_ids": ["màx. 3"],
    "advanced_ids": ["màx. 3"],
    "closed_ids": ["màx. 2"]
  },
  "constraints_next": ["string (màx. 6: 'No fer X / Has de mantenir Y')"]
}
```

## Fils narratius

- Límit dur: màxim **30 fils vius** simultàniament.
- Cada fil té: `id` estable, `descripció`, `categoria` (trama principal / subtrama / atmosfèric / worldbuilding / error-continuïtat), `prioritat`, `capitol_origen`, `capitol_objectiu_tancament`, `estat` (obert / avançat / tancat).
- La deduplicació es fa per `id` i per mapa d'aliassos, no per coincidència de text.
- Un fil nou ha de ser: aliàs d'un fil existent, part d'una subtrama existent, o rebutjat.

## Funcions principals (referència ràpida)

| Àrea | Funcions |
|---|---|
| Jutge d'interval | `executarJutgeInterval`, `jutgeIntervalInconsistencies`, `aplicarCorreccionsJutge` |
| Pipeline post-capítol | `arxitectePostCapitol` |
| Reescriptura | `microReescripturaBlocOpus`, `executarLoopCoherenciaFinal` |
| Seguiment narratiu | `actualitzarFilsNarratius`, `reconciliarFilsRegistre`, `generarDirectivaFils` |
| NKG | `nkgActualitzarPostEscena` |
| Diagnòstic | `exportarDiagnosticResums` |

## Regles de dramatització 9/10

- Cap escena sense objectiu visible del POV.
- Cap escena sense obstacle concret o oposició activa.
- Cap escena sense cost immediat per algun personatge.
- Cap escena sense conseqüència narrativa o decisió irreversible.
- No substituir una escena per resum temàtic o formulació moral abstracta.
- No repetir motius simbòlics sense una nova funció dramàtica.

## Estat persistent (localStorage)

- `ESTAT._capitolsLocked`: `{ [idx]: { locked, lockedAtISO, intervalId, hash } }`
- `ESTAT._intervalLocks`: `{ [intervalId]: { fromIdx, toIdx, lockedAtISO, net } }`
- Les snapshots d'ESTAT es guarden a localStorage. No trencar l'estructura existent; afegir camps nous és acceptable.

## Regles de flux i validació (F0/F1)

- **Cap validador pot bloquejar un botó sense oferir l'acció que resol el bloqueig.**
  Si s'afegeix un error nou a `detectarFaltantsNKG` o `detectarFaltantsDramaNKG`, cal
  afegir-hi també el mapatge a `obtenirAccioGeneracioPerFaltant` i el pas corresponent
  a `autocompletarNKGSilent`.
- **Cap fallback pot generar un estat invàlid.** Si una funció de fallback construeix
  una estructura que després es valida (p. ex. `crearSceneContractFallbackLocal` contra
  `detectarFaltantsSceneContract`), ha d'omplir tots els camps obligatoris.
- **Tota transició de flux ha de deixar la vista al destí**: usa `mostrarIAnarA(id)` en
  lloc de `showCard(id)` a soles.
- **Cap efecte visual de llarga durada sense cancel·lació.** `efecteEscripturaHTML`
  manté un token viu per contenidor; qualsevol animació incremental futura sobre un
  element compartit ha de seguir el mateix patró.
- `ESTAT.fase` ha de reflectir el pas real (`'b1'`…`'b6'` als fonaments, número a la
  resta): el panell d'etapes hi confia per tornar on eres.

## Regles d'estil per perfil d'autor (F3)

- **El prompt base no imposa cap autor de referència.** La identitat literària surt
  sempre de `PERFILS_AUTOR[id]`. No hi tornis a posar noms d'autors que no siguin un
  dels quatre perfils.
- **Cap regla d'estil discutible és global.** Prosa, exposició i emoció viuen als
  camps `prosa`, `exposicio` i `emocio` de cada perfil, perquè el que és correcte per
  a Larsson (frase curta, zero exposició) és fals per a Tolkien i Castaneda. Al prompt
  base només hi queden les regles realment invariables: llengua, format de diàleg,
  metadades i continuïtat d'escena.
- **Un camp nou al perfil s'ha d'omplir per als quatre**, o tenir un valor genèric de
  fallback a `REGLES_ESTIL_GENERIQUES` / `HUMANITZACIO_GENERICA`.
- `criteris_excellencia` són alhora condicions de generació i criteris d'avaluació:
  si en canvies un, canvia el que es demana i el que es mesura.
- El perfil del projecte (`ESTAT._autorPerfilId`) mana sobre qualsevol detecció per
  text. Usa `resoldrePerfilAutor(text)`, mai `obtenirPerfilAutorId(text) || ...`.

## Restriccions generals per a qualsevol canvi

- No refactoritzar funcions que no estiguin explícitament mencionades al prompt.
- `index.html` carrega dos mòduls purs extrets (Etapa D): `perfils_autor.js` (perfils
  d'autor, estil, ambientació) i `nkg_core.js` (nucli NKG, validació LLM, parseig JSON).
  Els tres fitxers van junts. No extreure més mòduls tret que s'indiqui.
- No canviar el comportament de fases anteriors a l'escriptura de capítols (món, personatges, trames, escaleta) tret que s'indiqui.
- Preservar compatibilitat amb snapshots existents a localStorage.
