> **Document del mode novel·la, congelat el 2026-08-01.**
> Descriu funcionalitat que ja no existeix al generador de contes.
> Es conserva com a arxiu del que hi havia i per què.

---

# Millores pendents — encàrrecs llestos per aplicar

> **Estat:** els encàrrecs **1, 2, 3, 4, 5, 6 i 8 estan aplicats** a la branca
> `claude/millores-pipeline-narratiu`. Queda pendent només el **7** (salt a
> Sonnet 5 / Opus 5), que s'ha deixat expressament per més endavant.
>
> Proves afegides: `f12_bastida_persona.mjs` (26), `f13_maquinaria_motius_truncacio.mjs` (23),
> `f14_cens_personatges.mjs` (18), `f15_lint_catala.mjs` (3). Suite completa: 281/281.

Cada secció és un encàrrec autònom: es pot enganxar tal qual a una sessió nova
sense context previ. Estan ordenats per valor sobre la propera generació.

**Configuració de models per a la propera generació** (no la canviïs fins que
l'encàrrec 7 estigui fet):

| Rol | Model |
|---|---|
| Draft / Extracció | `claude-haiku-4-5-20251001` |
| Generació | `claude-sonnet-4-6` |
| Arquitectura | `claude-opus-4-6` |

Cost estimat: ~$3.9 per una novel·la de 12 capítols.

> ⚠️ **No passis a Sonnet 5 / Opus 5 abans de l'encàrrec 7.** A la generació 4.6,
> ometre el camp `thinking` vol dir "sense raonament". A Sonnet 5 i Opus 5 vol dir
> "raonament adaptatiu activat", i `max_tokens` limita raonament i resposta
> **juntes**. Com que `callAnthropic` no envia mai `thinking`, les respostes
> arribarien tallades — el mateix problema que ja es va arreglar per a GPT-5.

---

## 1. La bastida de generació surt al text final

**Problema.** Als capítols generats hi apareixen capçaleres tècniques que el
lector no hauria de veure mai:

```
Escena 1 — Sastre de pancartes
(POV: Olof)
(POV: Karin, tercera persona limitada)
/ Escena 1 — La carpeta al soterrani
```

**On és.** La neteja ja existeix però està al lloc equivocat: `obtenirTextEnllac()`
elimina `[[ESCENA_N]]` i filtra línies amb `/^\s*(ESCENA\s+\d+|CAP[IÍ]TOL\s+\d+)\b/i`,
però només sobre el fragment d'enllaç que es passa a la generació de l'escena
següent. El text que es mostra, es desa a `ESTAT._capitols_generats` i s'exporta
no passa per cap filtre equivalent.

**Encàrrec.**

> Al fitxer `index.html` hi ha `obtenirTextEnllac()`, que neteja marcadors tècnics
> (`[[ESCENA_N]]`) i línies de capçalera (`ESCENA 1`, `CAPÍTOL 2`) del fragment
> d'enllaç entre escenes. Aquesta neteja no s'aplica al text final del capítol,
> i per això als capítols generats hi surten capçaleres com `Escena 1 — Sastre de
> pancartes`, `(POV: Olof)`, `(POV: Karin, tercera persona limitada)` i separadors
> `/` solts entre blocs.
>
> Extreu la neteja a una funció `netejarBastidaCapitol(text)` i aplica-la al text
> del capítol just abans de desar-lo i abans de mostrar-lo/exportar-lo. Ha de
> treure, com a mínim:
> - marcadors `[[ESCENA_N]]`
> - línies de capçalera d'escena o capítol (`Escena 3 — …`, `CAPÍTOL 2`, amb o
>   sense guió, accent o numeració)
> - línies que només siguin una anotació de POV entre parèntesis
>   (`(POV: X)`, `(POV: X, tercera persona limitada)`, `(POV: narrador extern…)`)
> - separadors `/` solts en una línia pròpia
>
> No ha de tocar mai text narratiu: una línia de diàleg que comenci per una
> barra, o una frase que contingui la paraula "escena", s'han de conservar.
> Afegeix també una instrucció al prompt d'escriptura d'escena dient que no ha
> d'emetre capçaleres ni anotacions de POV: el text ha de ser només prosa.
>
> Afegeix les comprovacions a `proves/` seguint la convenció del repositori
> (fitxer `fNN_*.mjs`, funció `comprova()`, línia final `N/M comprovacions
> passades`, `process.exit`). Han de cobrir els casos negatius: prosa que conté
> "escena" o comença amb `/` no es pot perdre.

---

## 2. La persona narrativa no s'imposa

**Problema.** La novel·la barreja primera i tercera persona entre capítols
(`vaig sentir` / `va sentir`), i dins d'una mateixa escena marcada com a tercera
persona hi apareix `va tornar a mirar-me`.

**On és.** El camp existeix: `normalitzarPerspectivaNarrativa()` valida
`tipus` contra `['primera_persona', 'tercera_limitada', 'tercera_omniscient', 'alternada']`
i `nkgGenerarContextMinim()` l'escriu al prompt com a `- Tipus narrador: tercera_limitada`.
El problema és que arriba com un *slug* enterrat entre desenes de línies de
context, no com una restricció.

**Encàrrec.**

> A `index.html`, `nkgGenerarContextMinim()` injecta al prompt d'escena la línia
> `- Tipus narrador: tercera_limitada` (el valor ve de
> `ESTAT._nkg.context_creacio.estil.perspectiva.tipus`). Això no és prou explícit:
> els capítols generats barregen primera i tercera persona, i fins i tot dins
> d'una escena en tercera persona hi apareixen pronoms de primera.
>
> Converteix el slug en una regla en català, clara i inequívoca, dins del prompt
> d'escena. Per exemple, per a `tercera_limitada`: indica que s'escriu **sempre**
> en tercera persona, que no es pot fer servir mai la primera persona per al
> narrador (fora del diàleg entre cometes), i que el narrador només pot accedir
> als pensaments del personatge POV del capítol. Escriu la formulació equivalent
> per als altres tres valors (`primera_persona`, `tercera_omniscient`,
> `alternada`), cadascuna amb la seva restricció pròpia.
>
> Posa-ho on tingui pes al prompt, no al final d'una llista de context.
>
> Afegeix comprovacions a `proves/` (convenció `fNN_*.mjs`) que verifiquin que
> cada un dels quatre valors de `tipus` genera la seva instrucció corresponent i
> que la instrucció apareix al prompt d'escena.

---

## 3. El contracte d'escena es narra en comptes de dramatitzar-se

**Problema.** El pipeline exigeix cost immediat i decisió irreversible a cada
escena, i el model ho resol **dient-ho**:

> "La decisió era irreversible", "El cost es va fer present com una successió de
> petits cops", "va creuar una línia sense tornar enrere"

Això és *telling*, precisament el que les regles de `AGENT.md` volen evitar
("Regles de dramatització 9/10").

**Encàrrec.**

> A `index.html`, el prompt d'escriptura d'escena rep el `scene_contract` amb
> camps com `decisio_irreversible`, `cost_immediat` i `consequencia_narrativa`.
> El model els resol narrant-los literalment: als capítols generats hi ha frases
> com "La decisió era irreversible" i "el cost es va fer present".
>
> Reescriu la part del prompt que presenta el contracte perquè quedi clar que
> aquests camps són **el que ha de passar a l'escena**, no el que s'ha d'escriure.
> Afegeix una prohibició explícita: no es pot anomenar el cost, la decisió o la
> conseqüència amb paraules abstractes ("irreversible", "el cost", "la decisió",
> "un punt de no retorn"); s'han de veure en acció, gest, objecte o diàleg.
> Dona un exemple curt del que sí i del que no — els exemples positius funcionen
> millor que les prohibicions soles.
>
> Comprova si `detectarTellingEmocional()` (ja existeix al fitxer) es pot ampliar
> per detectar aquest patró concret i afegir-lo al jutge programàtic
> d'`avaluarQualitatLiteraria()`, que no gasta tokens.
>
> Afegeix comprovacions a `proves/` seguint la convenció del repositori.

---

## 4. La regla de motius simbòlics no està implementada

**Problema.** `AGENT.md` diu, a "Regles de dramatització 9/10":

> "No repetir motius simbòlics sense una nova funció dramàtica."

No hi ha cap línia de codi que ho comprovi. A la novel·la generada, la tassa
trencada apareix a pràcticament totes les escenes i el text l'explica cada
vegada ("una petita arqueologia de la seva vida", "la mesura d'aquella
distància", "la nostra prova"). El motiu es dilueix fins a perdre força.

**Encàrrec.**

> `AGENT.md` estableix la regla "No repetir motius simbòlics sense una nova
> funció dramàtica", però no està implementada enlloc del codi. A la novel·la
> generada, un mateix objecte simbòlic apareix a gairebé totes les escenes i el
> text n'explica el significat cada vegada.
>
> Implementa un seguiment de motius: quan un objecte o element simbòlic apareix
> en una escena, registra'l (l'estructura natural és el NKG, mira
> `ESTAT._nkg` i com es registren `beats_gastats` — hi ha precedent). Al prompt
> de l'escena següent, si el motiu ja ha aparegut, indica quantes vegades i
> exigeix que si torna a sortir sigui amb una funció dramàtica nova, i que no se
> n'expliqui el significat.
>
> Reutilitza el mecanisme de `beats_gastats` si encaixa, en comptes de crear una
> estructura paral·lela.
>
> Afegeix comprovacions a `proves/` seguint la convenció del repositori.

---

## 5. Les respostes tallades són invisibles a tot el pipeline

**Problema.** `analitzarRespostaGenerica()` retorna `{ text, textIncomplet }`,
però `callLLMMulti()` només retorna `.text` i llença el senyal. Qualsevol
resposta tallada per límit de tokens es "repara" a `parseJsonRobust()` i el
pipeline continua amb dades incompletes sense avisar. Només la fase 21 està
protegida (es va arreglar en una sessió anterior).

**Encàrrec.**

> A `index.html`, `analitzarRespostaGenerica()` retorna `{ text, textIncomplet }`,
> però `callLLMMulti()` descarta `textIncomplet` i retorna només el text. Això fa
> que qualsevol resposta tallada per límit de tokens sigui invisible: les
> heurístiques de `parseJsonRobust()` la "reparen" i el pipeline continua amb
> capítols o personatges que falten, sense cap avís.
>
> Fes que la truncació sigui visible a tot el pipeline. Com a mínim, un avís de
> consola amb el tag de la crida i el model quan la resposta arriba tallada.
> Millor encara: exposa el senyal als qui criden `callLLMMulti` sense trencar les
> signatures existents (per exemple una variant que retorni l'objecte sencer, i
> que `callLLMMulti` es mantingui com a embolcall que retorna el text).
>
> Revisa quins passos generen llistes per capítol o per personatge i haurien de
> reaccionar al senyal en comptes d'acceptar dades parcials. La fase 21 ja té el
> patró implementat (`faltantsPerspectivaCronologia`, `completarLlistaPerCapitol`)
> — segueix-lo.
>
> Afegeix comprovacions a `proves/` seguint la convenció del repositori.

---

## 6. No hi ha porta per als noms de personatge nous

**Problema.** A la novel·la generada, un mateix nom designa tres persones
diferents (una periodista, una adolescent que pinta pancartes i una responsable
de logística), un personatge central desapareix a partir del capítol 2, i
n'apareix un de nou ocupant exactament la mateixa funció narrativa que un altre
d'anterior. També s'inventa una relació familiar que no existeix al NKG.

Part d'això venia de la fase 21 truncada (ja arreglat), però el NKG té registre
de personatges i res impedeix que el model n'inventi de nous.

**Encàrrec.**

> El NKG (`ESTAT._nkg.personatges`) és el registre canònic de personatges, però
> cap pas del pipeline impedeix que el model n'introdueixi de nous a mitja
> novel·la ni que reutilitzi un nom per a una persona diferent. Als capítols
> generats, un mateix nom designa tres personatges diferents i un personatge
> central desapareix sense explicació.
>
> Implementa una comprovació posterior a l'escriptura de cada capítol: extreu els
> noms propis del text (ja hi ha `nkgNormalitzarNom()` per normalitzar-los),
> compara'ls amb el registre del NKG, i informa dels que no hi consten. Decideix
> si el nom nou s'ha de registrar com a personatge secundari o marcar com a error
> de continuïtat — mira com funciona `registrarContradiccioTardana()`, que ja
> gestiona fils d'`error-continuïtat`, i reutilitza'l si encaixa.
>
> Afegeix també al prompt del capítol la llista de personatges canònics amb la
> instrucció que no se'n poden introduir de nous sense necessitat, i que un
> personatge ja presentat no pot desaparèixer sense que el text ho justifiqui.
>
> Compte amb els falsos positius: topònims, marques i noms de lloc no són
> personatges.
>
> Afegeix comprovacions a `proves/` seguint la convenció del repositori.

---

## 7. Preparar el salt a Sonnet 5 / Opus 5

**Fes-ho només quan vulguis passar a la generació 5.** Amb els models 4.6 el codi
actual funciona correctament.

**Problema.** `callAnthropic()` i `callAnthropicWithFinishReason()` envien
`{model, max_tokens, system, messages}` i mai el camp `thinking`. A Sonnet 4.6 i
Opus 4.6 això vol dir "sense raonament". A Sonnet 5 i Opus 5, ometre `thinking`
activa el raonament adaptatiu, i `max_tokens` limita raonament **i** resposta
juntes: les respostes arribarien tallades.

**Encàrrec.**

> A `index.html`, `callAnthropic()` i `callAnthropicWithFinishReason()` no envien
> mai el camp `thinking`. Amb Sonnet 4.6 i Opus 4.6 això significa "sense
> raonament", però a Sonnet 5 i Opus 5 el raonament adaptatiu s'activa per
> defecte quan s'omet el camp, i `max_tokens` limita raonament i resposta juntes
> — les respostes arribarien tallades.
>
> Al mateix fitxer hi ha el patró ja resolt per a OpenAI: `reservaRaonamentGPT5()`,
> `limitSortidaGPT5()` i `executarOpenAIAmbControlBuit()`, que reserven marge per
> al raonament i tornen a demanar la resposta si arriba tallada amb menys
> contingut del demanat. Aplica el mateix criteri al camí d'Anthropic.
>
> Tingues en compte:
> - `thinking: {type: "disabled"}` només s'accepta amb `effort` `high` o inferior
>   a Opus 5; combinat amb `xhigh` o `max` retorna 400.
> - `budget_tokens` està eliminat a la generació 5 (retorna 400). La profunditat
>   es controla amb `output_config.effort`.
> - Els models 4.6 han de continuar funcionant exactament igual: la lògica nova
>   s'ha d'aplicar només als models que ho requereixen.
>
> Actualitza `MODEL_REGISTRY` amb els IDs i preus de la generació 5
> (`claude-sonnet-5` $3/$15, `claude-opus-5` $5/$25, `claude-haiku-4-5` $1/$5),
> mantenint les entrades 4.6 perquè els projectes en curs no es trenquin.
>
> Afegeix comprovacions a `proves/` seguint la convenció del repositori.

---

## 8. Lint de català automàtic

**Per què.** El defecte més greu de la generació anterior era lèxic: paraules que
no existeixen (`esquerdé`, `espartia`, `ungulaments`, `obrefilera`, `sanguinitat`)
i castellanismes (`ensayada`, `promessa`, `manipul·lat`, `pálid`, `va queure`).
Amb els models d'Anthropic això hauria de desaparèixer, però cal **mesurar-ho**,
no intuir-ho.

**Encàrrec.**

> Afegeix a `proves/` un comprovador de qualitat lèxica del català per als textos
> generats, seguint la convenció del repositori (`fNN_*.mjs`, funció `comprova()`,
> línia final `N/M comprovacions passades`, `process.exit`).
>
> Ha de:
> - acceptar un fitxer de text o un backup de projecte (`exportarCopiaSeguretat()`
>   genera un JSON amb `estat._capitols_generats`)
> - passar un corrector ortogràfic de català (hunspell amb el diccionari `ca`, o
>   LanguageTool si ja hi és) sobre el text
> - reportar **paraules inexistents per cada 1000** i la llista dels casos
> - fallar per damunt d'un llindar configurable
>
> Ha de degradar amb elegància si el diccionari no està instal·lat: informar-ne i
> sortir sense fallar, no petar.
>
> Ignora noms propis i topònims (el NKG del backup en té la llista a
> `estat._nkg.personatges` i `estat._nkg.llocs`) per no inflar el recompte.

---

## Ordre suggerit

1. Encàrrecs **1 i 2** — visibles al text, barats, milloren la propera generació.
2. Encàrrec **8** — el necessites per mesurar si la generació nova és millor.
3. Genera amb els models 4.6 i mesura.
4. Encàrrecs **3, 4, 5, 6** segons el que surti de la mesura.
5. Encàrrec **7** quan vulguis passar a Sonnet 5.
