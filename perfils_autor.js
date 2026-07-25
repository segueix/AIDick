// ═══════════════════════════════════════════════════════════
//  perfils_autor.js — Mòdul pur extret d'index.html (Etapa D)
//  Registre únic de perfils d'autor i utilitats d'estil/ambientació.
//  Sense dependències de DOM. Llegeix les globals ESTAT en temps d'execució.
//  Càrrega: <script src="perfils_autor.js"> ABANS dels blocs inline.
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//  PERFILS_AUTOR (Etapa C) — registre únic de perfils d'autor
//  Tota detecció i injecció d'estil/ambientació surt d'aquí.
// ═══════════════════════════════════════════════════════════
const PERFILS_AUTOR = {
  larsson: {
    nom: 'Stieg Larsson',
    deteccio: /larsson/i,
    prefill: {
      genere: 'Thriller / Nordic Noir',
      focus: 'Cost físic extrem, esgotament mental, entorns freds i hostils, cinisme'
    },
    ambientacio: "la Suècia de Stieg Larsson: Estocolm, província sueca, redaccions, jutjats i serveis socials, hiverns nòrdics; noms i cognoms suecs, topònims i institucions sueques",
    estil: `── ESTIL STIEG LARSSON ──
AMBIENTACIÓ I PERSONATGES (OBLIGATORI): L'acció i els personatges han de ser nòrdics/escandinaus. Mantén noms, topònims, institucions, clima i codis socials del nord d'Europa. Evita desplaçar el marc a contextos mediterranis o llatinoamericans.
Pensament i visió del món: Larsson era periodista d'investigació i antifeixista militant. Les seves obres neixen de la convicció que la violència contra les dones i la corrupció institucional són sistèmiques, no excepcions. Escrius des d'aquesta consciència política sense abanderats ni discursos.
Prosa directa i funcional, carregada de detall procedimental: cada acció d'investigació —una trucada, un arxiu consultat, una font protegida— s'explica amb lògica interna creïble i concreta.
L'entorn nòrdic (hivern escandinau, foscor, aïllament geogràfic i social) actua com a personatge amb pes propi: el fred és moral tant com climàtic.
Secrets familiars soterrats durant dècades que quan surten a la llum destapen patrons de violència i complicitat que ningú volia veure.
Protagonistes traumatitzats amb una obstinació quasi patològica: no investiguen per heroisme sinó perquè no poden parar, la ferida personal és el motor.
Crítica social concreta i documentada integrada a la trama: noms d'institucions, mecanismes de poder, estadístiques de violència que apareixen de forma natural al text.
Estructura de revelació progressiva: el que semblava un cas aïllat obre pas a un sistema podrit que implica tothom.
Ritme metòdic i pausat en la investigació, amb pics d'acció breu, directa i brutal quan la violència irromp.`,
    regles_dures: `• TO BRUTAL I EXPLÍCIT: La prosa ha de ser crua i directa, a l'estil de Stieg Larsson. No endolceixis les escenes denses ni la visceralitat psicològica.
• DIÀLEGS AL GRA: No allarguis les converses. Quan la tensió o el subtext ja ha quedat clar per al lector, talla l'escena immediatament.
• ECONOMIA PSICOLÒGICA: No repeteixis estructures de pensament (racionalització, càlcul). Un cop el lector entén com processa la informació un personatge, no ho tornis a descriure.
`,
    prosa: `• PROSA: Frase declarativa i funcional. Màxim 1 adjectiu rellevant per substantiu; evita el lirisme i la metàfora ornamental. El detall procedimental (una trucada, un expedient, un horari, una xifra) val més que qualsevol imatge poètica.`,
    exposicio: `• EXPOSICIÓ: Cap personatge explica els seus plans ni les seves motivacions. Les figures de poder parlen en eufemismes i to institucional. La informació arriba per documents, arxius, transcripcions, actes i fonts — no per confessió.`,
    emocio: `• EMOCIÓ: Show, don't tell estricte. PROHIBIT etiquetar emocions ("estava trist", "sentia por"). L'estat intern es llegeix en la rutina, el cos, el fred i el que el personatge deixa de fer.`,
    intensitat: "INTENSITAT NARRATIVA (MODE LARSSON): Ritme metòdic d'investigació amb pics d'acció breu, directa i brutal. La tensió creix per acumulació documental i per la sensació que el sistema protegeix qui no hauria de protegir, no per persecucions constants.",
    humanitzacio: {
      gest_inutil: "una rutina de cafè i tabac, o revisar el mòbil sense arribar a llegir-lo",
      objecte_emocional: "una carpeta d'arxiu amb l'etiqueta mig esborrada",
      temps_mort: "el soroll del radiador, el trànsit llunyà i la llum d'hivern que s'apaga aviat"
    },
    criteris_excellencia: [
      "La violència té conseqüència institucional o social dins la trama, mai és gratuïta",
      "La investigació avança per documents, fonts i procediments versemblants",
      "Cap heroïcitat gratuïta: el cost físic i mental dels personatges és visible",
      "Crítica social concreta integrada al text sense discurs explícit"
    ]
  },
  tolkien: {
    nom: 'J.R.R. Tolkien',
    deteccio: /tolkien/i,
    prefill: {
      genere: 'Fantasia èpica / mitopoètica',
      focus: 'Sacrifici, pes moral de les decisions, esperança fràgil davant la foscor'
    },
    ambientacio: "un món secundari de fantasia èpica a l'òrbita de Tolkien: races, regnes, llengües i geografia inventades amb coherència interna; CAP topònim ni nom del món real",
    estil: `── ESTIL J.R.R. TOLKIEN ──
AMBIENTACIÓ I PERSONATGES (OBLIGATORI): Els personatges i el món han de ser imaginaris dins l'òrbita tolkieniana (Terra Mitjana-like): races, regnes, llengües, mites i geografia pròpia de fantasia èpica. Evita marcs contemporanis realistes.
Pensament i visió del món: Tolkien era filòleg, catòlic i veterà de la Primera Guerra Mundial. El seu univers neix de la convicció que el llenguatge crea realitat, que el bé i el mal existeixen com a forces còsmiques, i que la humilitat dels petits pot transformar la història. Escrius des d'aquesta fe en la bellesa i el sacrifici.
Prosa èpica, lírica i detallada: les descripcions de paisatge i arquitectura transmeten profunditat i antiguitat immemorial, com si el món existís des d'abans que comencés la història.
Univers tolkienià complet: races (Eldar, Khazad, hobits, homes, orcs, ents), geografies amb nom i memòria pròpia, llenguatges inventats amb fonologia coherent, cançons i poemes intercalats quan l'escena ho demana.
Temes centrals: la corrupció del poder i la tentació dels anells, el pes de la responsabilitat sobre les espatlles dels humils, la camaraderia com a valor suprem, la bellesa efímera davant el pas implacable del temps i l'oblit.
Llenguatge solemne però accessible: frases llargues i rítmiques, construccions arcaiques mesurades, èmfasi en els noms propis com a portadors de destí.
La natura com a presència viva i moral: boscos, rius i muntanyes tenen memòria, voluntat i opinió sobre els esdeveniments dels mortals.
El mal té pes físic i sensorial: no s'explica, es percep en l'aire que s'espesseix, la llum que s'apaga, el silenci sobtat dels ocells i la por als ulls dels animals.`,
    regles_dures: `• AMPLITUD DE LA FRASE: La prosa pot i ha de respirar. Frases llargues, subordinades i cadència rítmica són benvingudes; l'arcaisme mesurat també. No retallis el període per fer-lo àgil.
• EL NOM COM A DESTÍ: Els noms propis, els topònims i els llinatges porten memòria. Quan n'apareix un de nou, ha de sonar antic i coherent amb la seva llengua.
• RESPIRACIÓ ÈPICA: Una escena pot aturar-se a mirar el paisatge, cantar o recordar. Aquesta pausa no és farciment: és el que dona pes al que vindrà.
`,
    prosa: `• PROSA: Èpica, lírica i detallada. NO t'apliquis la regla d'un sol adjectiu: aquí l'acumulació mesurada d'epítets crea antiguitat. Les descripcions de paisatge i arquitectura han de transmetre profunditat immemorial.`,
    exposicio: `• EXPOSICIÓ: El relat dins del relat és legítim. Els personatges expliquen llegendes, genealogies i consells, i canten. El que queda PROHIBIT és que un antagonista reciti els seus plans: el mal actua i s'insinua, no s'explica.`,
    emocio: `• EMOCIÓ: La veu narrativa elevada pot nomenar el dolor, l'esperança o la por. Però cada emoció nomenada ha de tenir el seu correlat físic: la llum que canvia, el silenci dels ocells, una mà que no arriba a tancar-se.`,
    intensitat: "INTENSITAT NARRATIVA (MODE TOLKIEN): Prioritza gravetat mítica, memòria del paisatge i pes moral de les decisions. La tensió no ha de ser sempre frenètica: alterna amplitud èpica, respiració lírica i conseqüència històrica.",
    humanitzacio: {
      gest_inutil: "polir o endreçar una eina que ja està neta",
      objecte_emocional: "un anell, una fíbula o una moneda antiga amb una inscripció il·legible",
      temps_mort: "el vent damunt l'herba alta, una campana llunyana i l'olor de pedra molla"
    },
    criteris_excellencia: [
      "El llenguatge crea món: topònims i noms propis amb memòria i coherència fonològica",
      "Hi ha un moment d'eucatàstrofe, o el seu cost es fa físicament present",
      "Cap anacronisme contemporani ni topònim o nom del món real",
      "La natura té presència moral activa en alguna escena"
    ]
  },
  dick: {
    nom: 'Philip K. Dick',
    deteccio: /philip\s*k\.?\s*dick|philip\s+dick|\bdick\b/i,
    prefill: {
      genere: 'Ciència-ficció distòpica / paranoica',
      focus: 'Col·lapse de la realitat, paranoia funcional, cost psíquic de descobrir la veritat'
    },
    ambientacio: "els EUA distòpics de Philip K. Dick: Califòrnia futurista, megacorporacions, suburbis decadents, colònies fora-món; noms anglosaxons, topònims i marques nord-americanes o inventades",
    estil: `── ESTIL PHILIP K. DICK ──
AMBIENTACIÓ I PERSONATGES (OBLIGATORI): L'ambientació i els personatges han de ser nord-americans (Estats Units): ciutats, suburbis, burocràcies, corporacions i codis culturals propis del context nord-americà, encara que sigui en clau distòpica/futurista.
Pensament i visió del món: Dick era un paranoic funcional fascinat per la gnosi, les drogues, la simulació i la pregunta de si alguna cosa és real. Les seves obres neixen de la convicció que la realitat és una capa prima que pot trencar-se en qualsevol moment i que el sistema —qualsevol sistema— menteix. Escrius des d'aquesta desconfiança radical.
Paranoia com a estat cognitiu del protagonista i del lector: les institucions (estat, corporacions, androïdes, drogues prescrites) manipulen la percepció; ningú sap mai si el que veu és real o induït.
Les drogues —legals, il·legals, prescrites per l'estat— com a eina de control social i com a porta ambigua a altres realitats: poden revelar la veritat o ser la mentida més sofisticada.
Distopia quotidiana i desgastada: el futur és una extensió deteriorada del present, amb publicitat agressiva, burocràcia kafkiana, androïdes indistingibles dels humans i guerres consumides en segon pla.
Canvis sobtats i irreversibles de realitat: una frase, un objecte, una conversa trenquen el marc que el lector creia ferm. No es recupera l'estat anterior.
Protagonistes ordinaris —venedors, taxistes, policies de baixa graduació— que descobreixen que el món que habiten és una construcció i han de decidir si prefereixen la mentida còmoda o la veritat devastadora.
Prosa àgil, nerviosa i plena de diàleg: les espirals de pensament paranoic del protagonista s'intercalen amb l'acció sense aturar el ritme.
Empatia com a única brúixola moral: en un món on res és real, la capacitat de sentir el dolor de l'altre és l'únic criteri per distingir l'humà de la màquina.`,
    regles_dures: `• FRASE CURTA I GIR ONTOLÒGIC: Període breu, nerviós, molt diàleg. Cada escena ha de deixar una escletxa: una dada que no encaixa, un objecte que no hauria de ser-hi, una resposta massa assajada.
• PARANOIA FUNCIONAL: El protagonista raona bé. Dubta amb mètode, no amb histrionisme. Les seves conclusions són versemblants encara que siguin falses.
• DISTOPIA DESGASTADA: La tecnologia falla, la publicitat interromp, la burocràcia respon amb formularis. El futur és el present deteriorat, mai lluent.
`,
    prosa: `• PROSA: Àgil i nerviosa, dominada pel diàleg. Les espirals de pensament paranoic del protagonista s'intercalen amb l'acció sense aturar el ritme: el monòleg intern hi és una eina, no un defecte.`,
    exposicio: `• EXPOSICIÓ: Qui explica el món és el sistema, i menteix. La informació arriba per anuncis, veus de màquina, impresos oficials i manuals. Cap personatge resumeix la trama en veu alta.`,
    emocio: `• EMOCIÓ: El narrador pot nomenar el que sent el protagonista, perquè la introspecció és el motor del llibre. Però el personatge ha de desconfiar de la pròpia emoció: preguntar-se si és seva o si l'hi han posat.`,
    intensitat: "INTENSITAT NARRATIVA (MODE DICK): La tensió és epistemològica abans que física. Puja quan el marc de realitat s'escletxa i no es recompon; una conversa banal pot ser més amenaçadora que una persecució.",
    humanitzacio: {
      gest_inutil: "comprovar dues vegades un aparell que ja funciona",
      objecte_emocional: "un objecte de consum quotidià amb la marca mal impresa o el logotip desalineat",
      temps_mort: "el brunzit d'un electrodomèstic, un anunci que es repeteix a l'altra habitació"
    },
    criteris_excellencia: [
      "La realitat s'esquerda almenys un cop i no es resol del tot",
      "El sistema (estat, corporació, tecnologia) menteix de manera verificable dins la trama",
      "La paranoia és funcional i quotidiana, mai histriònica",
      "L'empatia funciona com a criteri moral en alguna decisió del capítol"
    ]
  },
  castaneda: {
    nom: 'Carlos Castaneda',
    deteccio: /castaneda/i,
    prefill: {
      genere: 'Realisme xamànic / relat iniciàtic',
      focus: 'Desgast perceptiu, por al desconegut, dissolució del jo racional'
    },
    ambientacio: "el Mèxic de Carlos Castaneda: desert de Sonora, Oaxaca, mercats, muntanyes i xaparral; noms mexicans i yaquis, topònims mexicans",
    estil: `── ESTIL CARLOS CASTANEDA ──
AMBIENTACIÓ I PERSONATGES (OBLIGATORI): L'ambientació i els personatges han de ser mexicans, amb context cultural i territorial de Mèxic (desert, serres, pobles, ciutats, llenguatge i cosmovisions locals), sense desplaçar-ho a marcs genèrics.
Pensament i visió del món: Castaneda partia de la tradició tolteca i xamànica per demostrar que la realitat ordinària és un acord social, no una veritat absoluta. Les seves obres neixen de la convicció que la percepció es pot estendre més enllà dels límits racionals i que hi ha un "punt d'assemblatge" que pot moure's. Escrius des d'aquesta epistemologia alternativa.
Marc antropològic o periodístic que es dissol progressivament: el narrador arriba com a investigador racional i occidental i surt transformat per experiències que la seva formació no pot contenir.
Relació mestre-aprenent com a eix narratiu: el personatge guia (el bruixot, el nagual, el curandero) no explica mai directament, ensenya a través de tasques impossibles, silencis deliberats, paradoxes i situacions límit.
Els estats alterats de consciència —induïts per plantes de poder, per privació sensorial, per esforç físic extrem o per la voluntat del mestre— es descriuen amb precisió sensorial absoluta: colors, sons, sensacions corporals, distorsions temporals. No s'expliquen des de fora, es viuen des de dins.
El món natural com a text viu: cada animal, planta, vent o lloc porta intenció i missatge per als qui han après a llegir-los.
Diàleg com a vehicle principal de l'ensenyament: les converses entre aprenent i mestre marquen el ritme i transformen la percepció del lector.
Tensió irresoluble entre la racionalitat occidental del protagonista i la "realitat separada" que se li ofereix: el text no resol aquesta tensió, la manté viva fins al final.
El desert, la nit, els somnis lúcids i les plantes de poder com a espais on les fronteres entre mons es fan permeables.`,
    regles_dures: `• EL DIÀLEG ENSENYA: La conversa mestre-aprenent és el vehicle central. El mestre pot explicar-se llargament, contradir-se, negar-se a respondre o riure's de la pregunta. Això NO és exposició prohibida: és la forma del llibre.
• LA LLIÇÓ NO ES FORMULA: Cap frase pot resumir la moral de l'escena. Si el sentit queda tancat, l'escena ha fallat.
• PRECISIÓ DE L'ESTRANY: Els estats alterats es descriuen amb exactitud de quadern de camp: colors, temperatures, distorsions de temps. Res de vaguetat mística.
`,
    prosa: `• PROSA: Registre etnogràfic en primera persona, clar i concret, que es va esquerdant. La frase és sòbria fins i tot quan descriu l'impossible; és aquest contrast el que fa creïble la "realitat separada".`,
    exposicio: `• EXPOSICIÓ: Permesa i necessària dins del diàleg didàctic. El que queda PROHIBIT és que el narrador expliqui al lector què significa una lliçó: el sentit s'ha de mantenir obert i incòmode.`,
    emocio: `• EMOCIÓ: El narrador pot nomenar la seva pròpia por, fatiga o vergonya, perquè escriu un diari de camp. Mai nomena el que sent el mestre: d'ell només se'n veuen gestos, silencis i decisions.`,
    intensitat: "INTENSITAT NARRATIVA (MODE CASTANEDA): Prioritza desplaçament perceptiu, ambigüitat ontològica i procés iniciàtic. La tensió pot ser interior i cognitiva: sostén silencis, paradoxes i fractures de percepció sense accelerar artificialment l'acció.",
    humanitzacio: {
      gest_inutil: "endreçar i tornar a endreçar les pertinences abans d'una tasca del mestre",
      objecte_emocional: "una planta seca guardada dins un drap plegat",
      temps_mort: "el xiscle d'un ocell al xaparral, el vent sec i la calor que puja del terra"
    },
    criteris_excellencia: [
      "Tensió mestre-deixeble amb lliçó implícita, mai explicada directament",
      "La percepció alterada té regles internes coherents i precisió sensorial",
      "L'escèptic dubta de debò: la racionalitat oposa resistència real",
      "El món natural actua com a text viu amb intenció i missatge"
    ]
  }
};

// ═══════════════════════════════════════════════════════════
//  F3.5 — Detecció de perfil blindada
//  `deteccio` només conté identificadors inequívocs de l'autor. Les pistes de
//  gènere viuen a `deteccio_debil` i només s'apliquen com a últim recurs.
//  Motiu: la detecció antiga de Larsson incloïa /negr[ae]/, que activava el
//  perfil noir amb el to "humor negre" del selector; i la de Dick incloïa el
//  fragment /dick/ dins de qualsevol paraula.
// ═══════════════════════════════════════════════════════════
const DETECCIONS_DEBILS = {
  larsson:   /noir|nòrdic|nordic|escandinau|periodisme d'investigaci/i,
  tolkien:   /fantasia èpica|fantasia epica|terra mitjana|mitopo|èpic mitològic/i,
  dick:      /distòpi|distopi|paranoi|simulacre|realitat simulada|ciència-ficció paranoica/i,
  castaneda: /xamàni|xamani|nagual|tolteca|iniciàtic|percepció alterada/i
};

// Detecta l'id de perfil a partir de qualsevol text (univers, autor lliure, tematica).
// `opcions.nomesFortes` limita la cerca als identificadors inequívocs.
function obtenirPerfilAutorId(text, opcions = {}) {
  const t = String(text || '');
  if (!t) return '';
  for (const id of Object.keys(PERFILS_AUTOR)) {
    if (PERFILS_AUTOR[id].deteccio.test(t)) return id;
  }
  if (opcions.nomesFortes) return '';
  for (const id of Object.keys(DETECCIONS_DEBILS)) {
    if (DETECCIONS_DEBILS[id].test(t)) return id;
  }
  return '';
}

// Punt únic de veritat del perfil del projecte actual.
// Compatibilitat amb snapshots antics: si no hi ha id explícit, es deriva
// d'autor_referencia o de tematica (els camps que ja existien).
function obtenirAutorIdProjecte() {
  if (ESTAT && typeof ESTAT._autorPerfilId === 'string' && ESTAT._autorPerfilId) return ESTAT._autorPerfilId;
  const autorRef = (ESTAT && ESTAT.configProjecte && ESTAT.configProjecte.autor_referencia) || '';
  return obtenirPerfilAutorId(autorRef) || obtenirPerfilAutorId((ESTAT && ESTAT.tematica) || '');
}

// F3.5: el perfil triat pel projecte mana sempre; la detecció per text només és
// el pla B. Abans era al revés (`obtenirPerfilAutorId(text) || obtenirAutorIdProjecte()`),
// de manera que una temàtica escrita a mà podia canviar l'estil d'un projecte
// que ja tenia autor seleccionat.
function resoldrePerfilAutor(text) {
  return obtenirAutorIdProjecte() || obtenirPerfilAutorId(text);
}

// ─── Regla d'ambientació per autor: el món narrat és SEMPRE el de l'autor ───
function reglaAmbientacioAutor(autor) {
  const id = resoldrePerfilAutor(autor);
  const univers = (id && PERFILS_AUTOR[id])
    ? PERFILS_AUTOR[id].ambientacio
    : "l'univers literari propi de l'autor o gènere de referència (mai el context local de la llengua de redacció)";
  return `
REGLA D'AMBIENTACIÓ INVIOLABLE:
L'ambientació, els topònims, els noms de personatges, les institucions i els codis culturals han de ser SEMPRE els de ${univers}.
PROHIBIT situar l'acció a Catalunya o als Països Catalans, usar topònims catalans (Barcelona, Girona, l'Empordà...) o noms de persona catalans. La llengua de redacció és el català, però el món narrat és el de l'autor de referència.`;
}

// ─── Extensió d'estil per autor (reutilitzable per conte i novel·la) ───
// Etapa C: llegeix del registre PERFILS_AUTOR; les regex disperses han desaparegut.
function getGenreStyle(tematica) {
  const id = resoldrePerfilAutor(tematica);
  if (id && PERFILS_AUTOR[id]) return '\n\n' + PERFILS_AUTOR[id].estil;

  // Per a QUALSEVOL autor no reconegut: crear ambientació en el seu món propi
  return `

── AMBIENTACIÓ I MÓN DE L'AUTOR ──
AMBIENTACIÓ (OBLIGATORI): Crea l'ambientació en el món propi de l'autor/gènere de referència (${tematica || 'no especificat'}). Mantén els noms propis, topònims, institucions, clima, codis socials i culturals coherents amb l'univers literari de l'autor.
NO facis cap mena d'adaptació a Catalunya ni al context català: els noms dels personatges, els llocs, les institucions i els codis culturals han de ser fidels al món de l'autor original.
El paisatge, l'arquitectura, el clima i l'atmosfera social han de funcionar com a personatges amb pes propi dins la narració.
La llengua d'escriptura és el català, però l'univers narratiu és el de l'autor de referència — no el transposeu.`;
}

// ═══════════════════════════════════════════════════════════
//  F3.1 — Regles d'estil per perfil (substitueixen les globals)
//  El prompt base imposava a totes les novel·les les tècniques de Tartt,
//  Ferrante i Zafón, "màxim 1 adjectiu per substantiu", show-don't-tell
//  absolut i prohibició total d'exposició. Tres d'aquestes quatre regles
//  contradiuen algun dels quatre perfils, així que passen a ser per autor.
// ═══════════════════════════════════════════════════════════
const REGLES_ESTIL_GENERIQUES = {
  prosa: `• PROSA: Evita el barroquisme. Màxim 1 adjectiu rellevant per substantiu. Pren-te el teu temps: descriu l'atmosfera, explora el monòleg intern, coreografia els moviments per l'espai.`,
  exposicio: `• EXPOSICIÓ: PROHIBIT que cap personatge expliqui directament els seus plans o motivacions. Cap personatge explicarà res que l'interlocutor ja sàpiga.`,
  emocio: `• EMOCIÓ (SHOW, DON'T TELL): PROHIBIT etiquetar emocions explícitament ("estava trist", "sentia por"). MOSTRA l'emoció a través d'accions físiques, gestualitat, interaccions amb objectes o detalls d'entorn.`
};

// Bloc complet de "REGLES D'ESTIL" per al prompt de novel·la.
function blocReglesEstilAutor(idPerfil) {
  const p = (idPerfil && PERFILS_AUTOR[idPerfil]) || null;
  const tria = camp => (p && p[camp]) || REGLES_ESTIL_GENERIQUES[camp];
  const linies = [
    p && p.regles_dures ? String(p.regles_dures).trim() : '',
    tria('prosa'),
    tria('exposicio'),
    tria('emocio'),
    `• RITME: Alterna escenes de tensió activa amb moments de respiració. El contrast de ritme és el que crea la il·lusió de velocitat.`,
    `• SENSORIALITAT: PROHIBIT la prosa asèptica. Integra textura física i sensorial (olors, suor, fred, fricció material, sons ambientals) especialment quan la tensió és alta.`,
    `• NOMS I CONTEXT D'AUTOR: Escriu en català, però preserva l'onomàstica i el món de referència. NO facis catalanització automàtica de noms o llocs (no converteixis John→Joan, London→Londres).`
  ].filter(Boolean);
  return linies.join('\n');
}

// ═══════════════════════════════════════════════════════════
//  F3.3 — Els criteris d'excel·lència com a restricció de generació
//  Fins ara només s'usaven a l'informe posterior: es demanava prosa genèrica
//  i després s'avaluava estil d'autor. Ara entren al prompt del capítol.
// ═══════════════════════════════════════════════════════════
function blocCriterisExcellenciaGeneracio(idPerfil) {
  const p = (idPerfil && PERFILS_AUTOR[idPerfil]) || null;
  const criteris = (p && Array.isArray(p.criteris_excellencia)) ? p.criteris_excellencia : [];
  if (criteris.length === 0) return '';
  return `
CONDICIONS D'ACCEPTACIÓ D'AQUEST CAPÍTOL (llistó ${p.nom}):
${criteris.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Com a mínim UNA d'aquestes condicions s'ha de manifestar de manera verificable en aquest capítol: un lector ha de poder assenyalar el passatge concret que la compleix. No les enunciïs ni les comentis dins del text; encarna-les en acció, gest, objecte, diàleg o decisió.`;
}

// ─── Paràmetres d'humanització per perfil (F3.6) ───
const HUMANITZACIO_GENERICA = {
  gest_inutil: "ordenar tres vegades seguides un objecte menor de l'espai i deixar-lo igual que al principi",
  objecte_emocional: "un rellotge analògic lleugerament ratllat",
  temps_mort: "els sons de fons de l'espai on transcorre l'escena"
};

function humanitzacioPerfil(idPerfil) {
  const p = (idPerfil && PERFILS_AUTOR[idPerfil]) || null;
  return Object.assign({}, HUMANITZACIO_GENERICA, (p && p.humanitzacio) || {});
}
