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
    deteccio: /larsson|noir|negr[ae]|nòrdi/i,
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
    criteris_excellencia: [
      "La violència té conseqüència institucional o social dins la trama, mai és gratuïta",
      "La investigació avança per documents, fonts i procediments versemblants",
      "Cap heroïcitat gratuïta: el cost físic i mental dels personatges és visible",
      "Crítica social concreta integrada al text sense discurs explícit"
    ]
  },
  tolkien: {
    nom: 'J.R.R. Tolkien',
    deteccio: /tolkien|fantàstic|fantastic|èpic/i,
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
    intensitat: "INTENSITAT NARRATIVA (MODE TOLKIEN): Prioritza gravetat mítica, memòria del paisatge i pes moral de les decisions. La tensió no ha de ser sempre frenètica: alterna amplitud èpica, respiració lírica i conseqüència històrica.",
    criteris_excellencia: [
      "El llenguatge crea món: topònims i noms propis amb memòria i coherència fonològica",
      "Hi ha un moment d'eucatàstrofe, o el seu cost es fa físicament present",
      "Cap anacronisme contemporani ni topònim o nom del món real",
      "La natura té presència moral activa en alguna escena"
    ]
  },
  dick: {
    nom: 'Philip K. Dick',
    deteccio: /philip k\. dick|philip.*dick|dick/i,
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
    criteris_excellencia: [
      "La realitat s'esquerda almenys un cop i no es resol del tot",
      "El sistema (estat, corporació, tecnologia) menteix de manera verificable dins la trama",
      "La paranoia és funcional i quotidiana, mai histriònica",
      "L'empatia funciona com a criteri moral en alguna decisió del capítol"
    ]
  },
  castaneda: {
    nom: 'Carlos Castaneda',
    deteccio: /castaneda|xamànic/i,
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
    intensitat: "INTENSITAT NARRATIVA (MODE CASTANEDA): Prioritza desplaçament perceptiu, ambigüitat ontològica i procés iniciàtic. La tensió pot ser interior i cognitiva: sostén silencis, paradoxes i fractures de percepció sense accelerar artificialment l'acció.",
    criteris_excellencia: [
      "Tensió mestre-deixeble amb lliçó implícita, mai explicada directament",
      "La percepció alterada té regles internes coherents i precisió sensorial",
      "L'escèptic dubta de debò: la racionalitat oposa resistència real",
      "El món natural actua com a text viu amb intenció i missatge"
    ]
  }
};

// Detecta l'id de perfil a partir de qualsevol text (univers, autor lliure, tematica)
function obtenirPerfilAutorId(text) {
  const t = String(text || '');
  if (!t) return '';
  for (const id of Object.keys(PERFILS_AUTOR)) {
    if (PERFILS_AUTOR[id].deteccio.test(t)) return id;
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

// ─── Regla d'ambientació per autor: el món narrat és SEMPRE el de l'autor ───
function reglaAmbientacioAutor(autor) {
  const id = obtenirPerfilAutorId(autor) || obtenirAutorIdProjecte();
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
  const id = obtenirPerfilAutorId(tematica) || obtenirAutorIdProjecte();
  if (id && PERFILS_AUTOR[id]) return '\n\n' + PERFILS_AUTOR[id].estil;

  // Per a QUALSEVOL autor no reconegut: crear ambientació en el seu món propi
  return `

── AMBIENTACIÓ I MÓN DE L'AUTOR ──
AMBIENTACIÓ (OBLIGATORI): Crea l'ambientació en el món propi de l'autor/gènere de referència (${tematica || 'no especificat'}). Mantén els noms propis, topònims, institucions, clima, codis socials i culturals coherents amb l'univers literari de l'autor.
NO facis cap mena d'adaptació a Catalunya ni al context català: els noms dels personatges, els llocs, les institucions i els codis culturals han de ser fidels al món de l'autor original.
El paisatge, l'arquitectura, el clima i l'atmosfera social han de funcionar com a personatges amb pes propi dins la narració.
La llengua d'escriptura és el català, però l'univers narratiu és el de l'autor de referència — no el transposeu.`;
}

