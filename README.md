# Booki

Booki és una aplicació web per convertir una idea breu en una novel·la completa. Combina planificació narrativa, Bíblia, NKG, escaleta per escenes, redacció de capítols i revisió editorial amb un sistema dual de models.

## Flux general

1. Configura proveïdor, models i estil.
2. Defineix tema, final, món i personatges.
3. Genera trames, estructura i escaleta.
4. Completa el NKG i la Bíblia narrativa.
5. Escriu capítols amb revisió i registre narratiu.
6. Exporta la novel·la, el NKG+Bíblia o el diagnòstic.

## Fitxers principals

- `index.html`: aplicació principal, UI, prompts, flux de generació, exportació i diagnòstics.
- `nkg_core.js`: nucli pur del NKG, parseig JSON, validacions, scene contracts i gates dramàtics.
- `perfils_autor.js`: perfils d'autor i guies d'estil.
- `AGENT.md`: normes de treball al repositori, immutabilitat i qualitat narrativa.

## Sistema NKG

El Narrative Knowledge Graph conserva macronarrativa, personatges, llocs, objectes, fets canònics, fils, timelines i estat narratiu. Serveix per evitar contradiccions i per donar context compacte als prompts.

## Scene Conflict Layer

Cada escena pot tenir un `scene_contract`: POV, personatges presents, objectius incompatibles, obstacle, asimetria de poder, objecte o informació en disputa, decisió irreversible, cost immediat i conseqüència narrativa. Aquesta capa evita capítols només temàtics o resumits.

## Jutge d'interval

Cada 4 capítols (i al final), Booki tanca el bloc: consolida derivats i resums i passa
un jutge de coherència que compara KSN, fets canònics i timelines. El jutge s'executa
**un sol cop per bloc**.

Per defecte **no reescriu res**: quan detecta una incoherència, obre un fil
`error-continuïtat` perquè el capítol següent la reconciliï cap endavant, com faria un
autor humà. Si actives «El jutge pot reescriure capítols» a la configuració, corregeix
el text directament i congela els capítols del bloc, que passen a ser immutables.

El progrés i les incidències es veuen al panell «⚖️ Jutge d'interval» de la fase
d'escriptura.

## Quality Gate 9

El diagnòstic literari 9/10 analitza heurísticament abstractesa, repetició de motius, acció concreta, diàleg, contractes incomplets, tensió massa uniforme i personatges funcionals. No reescriu automàticament: diagnostica i proposa prioritats.

## Flux recomanat

- Completa personatges amb objectius externs i secrets.
- Genera trames abans de l'estructura.
- Revisa la fase de compleció NKG+Bíblia abans d'escriure.
- Obre la Bíblia Narrativa per veure motors dramàtics pendents.
- Exporta `NKG + Bíblia` i `Diagnòstic resums` si vols auditar la qualitat.

## Compatibilitat amb snapshots antics

Els projectes antics continuen important-se. Si falten `scene_contracts` o camps nous, Booki activa mode de compatibilitat: pots continuar, però és recomanable completar motors dramàtics abans de redactar nous capítols.

## Criteris de qualitat literària

- Cap escena sense objectiu visible.
- Cap escena sense obstacle concret.
- Cap escena sense cost immediat.
- Cap escena sense conseqüència narrativa.
- Mostrar conflicte amb acció, gest, objecte, espai o diàleg.
- Repetir motius només si canvien de funció dramàtica.
