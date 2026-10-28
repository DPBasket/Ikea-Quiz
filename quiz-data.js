'use strict';
/*
 * IKEA QUIZ – contenuto della serata (dal PowerPoint "IKEA.pptx").
 * Resta SOLO sul server: i telefoni ricevono le soluzioni solo al momento della rivelazione.
 *
 * Tipi di domanda:
 *   choice : risposte multiple, `correct` = indice della risposta giusta
 *   order  : mettere in ordine (logo → anni); `items` sono già nell'ordine corretto
 * Campi immagine:
 *   img       : mostrata insieme alla domanda
 *   revealImg : mostrata solo quando si rivela la soluzione (per non suggerirla)
 * Per modificare il quiz basta cambiare questo file.
 */

const PARTS = [
  {
    n: 1, title: 'Storia IKEA', subtitle: 'Da una fattoria svedese al mondo',
    rules: [
      'Leggi la domanda e premi «Pronto» sul telefono',
      'Quando tutti sono pronti appaiono le risposte',
      'Tocca la risposta: non si può cambiare',
      'Chi risponde giusto per primo prende più punti'
    ],
    questions: [
      { type: 'choice', q: 'In quale anno è nata IKEA?', answers: ['1942', '1943', '1944', '1945'], correct: 1 },
      { type: 'choice', q: 'Il nome IKEA è un acronimo: le iniziali del fondatore, della fattoria di famiglia e del villaggio d\'origine. Quali sono?',
        answers: ['Ingvar Kamprad, Elmtaryd, Agunnaryd', 'Ingvar Karlsson, Elmhult, Agnestad', 'Ivar Andersson, Elmstad, Agnaryd', 'Ingvar Kampe, Elmtaryd, Agnaryd'], correct: 0 },
      { type: 'choice', q: 'Come nacque per caso l\'imballaggio piatto (flat-pack) di IKEA nel 1956?',
        answers: ['Per far stare un tavolo in auto', 'Per risparmiare sul magazzino', 'Per ridurre i costi di trasporto', 'Una geniale intuizione di Ingvar'], correct: 0 },
      { type: 'choice', q: 'Cosa introdusse IKEA nel 1960?',
        answers: ['Il primo ristorante', 'Il primo negozio negli USA', 'Le polpette', 'Il carrello'], correct: 0 },
      { type: 'choice', q: 'Cosa spinse IKEA a dare un nome ai prodotti invece di usare semplici numeri?',
        answers: ['La dislessia del fondatore', 'Il marketing svedese', 'Un\'idea della sua ragazza', 'Una richiesta dei clienti'], correct: 0 },
      { type: 'order', q: 'Metti in ordine i loghi IKEA, dal più vecchio al più recente',
        hint: 'Sul telefono trascinate i loghi in ordine, poi confermate',
        items: [
          { img: 'q-logo-1951.png', label: '1951' }, { img: 'q-logo-1954.png', label: '1954' }, { img: 'q-logo-1967.png', label: '1967' },
          { img: 'q-logo-1981.png', label: '1981' }, { img: 'q-logo-1983.png', label: '1983' }, { img: 'q-logo-2018.png', label: '2018' }
        ] }
    ]
  },
  {
    n: 2, title: 'Indovina l\'oggetto', subtitle: 'Come si chiama?',
    rules: [
      'Appare la foto di un prodotto IKEA',
      'Scegli il suo vero nome tra 5 nomi svedesi',
      'Risposta definitiva: chi è giusto e più veloce prende di più'
    ],
    questions: [
      { type: 'choice', q: 'Come si chiama?', img: 'q-img2.jpg', answers: ['GÅRDSMÄSTARE', 'DIMPA', 'STUK', 'KNAPPER', 'BAXNA'], correct: 0 },
      { type: 'choice', q: 'Come si chiama?', img: 'q-img3.jpg', answers: ['BRÄNNBOLL', 'SANDBI', 'EKET', 'JERKER', 'IVAR'], correct: 0 },
      { type: 'choice', q: 'Come si chiama?', img: 'q-img4.jpg', answers: ['HUVUDROLL', 'REFRÄNG', 'KNÄCKEBRÖD RÅG', 'DRYCK LINGON', 'SJÖRAPPORT'], correct: 0 },
      { type: 'choice', q: 'Come si chiama?', img: 'q-img5.jpg', answers: ['GRÄDDAT', 'HJÄLTEROLL', 'KORVBRÖD', 'LEKSANDS KNÄCKEBRÖD', 'SÅS SENAP & DILL'], correct: 0 },
      { type: 'choice', q: 'Come si chiama?', img: 'q-img6.jpg', answers: ['TIMMERFLOTTE', 'KAJPLATS', 'MYGGSPRAY', 'PILSKOTT', 'DUBBELKISEL'], correct: 0 },
      { type: 'choice', q: 'Come si chiama questa pianta?', img: 'q-img7.jpg', answers: ['MONSTERA DELICIOSA', 'SUCCULENT', 'FICUS MICROCARPA', 'FICUS ELASTICA ROBUSTA', 'HEDERA HELIX'], correct: 4 },
      { type: 'choice', q: 'Come si chiama?', img: 'q-img8.jpg', answers: ['RANTÄNEN', 'TANDÅN', 'BACKSJÖN', 'RÄNNILEN', 'BJÖRKÅN'], correct: 1 },
      { type: 'choice', q: 'Come si chiama?', img: 'q-img9.jpg', answers: ['STORKLINTA', 'KULLEN', 'GILLERSBERG', 'GILLERSBERGER', 'IKEA PS 2026'], correct: 0 },
      { type: 'choice', q: 'Come si chiama?', img: 'q-img10.jpg', answers: ['MALM', 'LAGKAPTEN / ALEX', 'LAGKAPTEN / ADILS', 'MULLSJÖ', 'HAALAND'], correct: 0 },
      { type: 'choice', q: 'Come si chiama?', img: 'q-img11.jpg', answers: ['FRIHETEN', 'SOLBAKKEN', 'BÅRSLÖV', 'SKÖNABÄCK', 'SALTSJÖBADEN'], correct: 0 }
    ]
  },
  {
    n: 3, title: 'Persona o mobile?', subtitle: 'Un nome… ma di chi?',
    rules: [
      'Appare un nome svedese',
      'Decidi: è una persona vera o un mobile IKEA?',
      'Poi si scopre la foto',
      'Risposta definitiva: chi è giusto e più veloce prende di più'
    ],
    questions: [
      { type: 'choice', word: 'TORBJÖRN', q: 'Persona o mobile?', answers: ['Persona', 'Mobile'], correct: 1, revealImg: 'q-img12.jpg' },
      { type: 'choice', word: 'JERKA', q: 'Persona o mobile?', answers: ['Persona', 'Mobile'], correct: 0, revealImg: 'q-img13.jpg' },
      { type: 'choice', word: 'INGVAR', q: 'Persona o mobile?', answers: ['Persona', 'Mobile'], correct: 0, revealImg: 'q-img14.jpg' },
      { type: 'choice', word: 'KRONWALL', q: 'Persona o mobile?', answers: ['Persona', 'Mobile'], correct: 0, revealImg: 'q-img15.jpg' },
      { type: 'choice', word: 'BONDHOLMEN', q: 'Persona o mobile?', answers: ['Persona', 'Mobile'], correct: 1, revealImg: 'q-img16.jpg' },
      { type: 'choice', word: 'KJELLBERG', q: 'Persona o mobile?', answers: ['Persona', 'Mobile'], correct: 0, revealImg: 'q-img17.jpg' },
      { type: 'choice', word: 'LUSTIGT', q: 'Persona o mobile?', answers: ['Persona', 'Mobile'], correct: 1, revealImg: 'q-img18.jpg' }
    ]
  },
  {
    n: 4, title: 'Città svedese o mobile?', subtitle: 'Svezia vera o catalogo IKEA?',
    rules: [
      'Prime tre domande: tre nomi sono mobili, uno è una città. Trova la città',
      'Ultime tre domande: al contrario, trova il mobile',
      'La foto si scopre alla fine',
      'Risposta definitiva: chi è giusto e più veloce prende di più'
    ],
    questions: [
      { type: 'choice', q: 'Quale di questi quattro è una città? Gli altri tre sono mobili', answers: ['Svappavaara', 'DRAGON', 'SPJUTBO', 'FÖNSTERBLAD'], correct: 0, revealImg: 'q-img19.jpg' },
      { type: 'choice', q: 'Quale di questi quattro è una città? Gli altri tre sono mobili', answers: ['Färjestaden', 'KLIPPAN', 'POÄNG', 'VÄRDERA'], correct: 0, revealImg: 'q-img20.jpg' },
      { type: 'choice', q: 'Quale di questi quattro è una città? Gli altri tre sono mobili', answers: ['Luleå', 'KIVIK', 'LANDSKRONA', 'JÄTTEBO'], correct: 0, revealImg: 'q-img21.jpg' },
      { type: 'choice', q: 'E ora al contrario: quale di questi quattro è un mobile?', answers: ['Båtskärsnäs', 'Piteå', 'Hej', 'NÄMMARÖ'], correct: 3, revealImg: 'q-img22.jpg' },
      { type: 'choice', q: 'Quale di questi quattro è un mobile? Gli altri tre sono città', answers: ['Skänninge', 'TIGERFINK', 'Åre', 'Nybro'], correct: 1, revealImg: 'q-img23.jpg' },
      { type: 'choice', q: 'Quale di questi quattro è un mobile? Gli altri tre sono città', answers: ['Jönköping', 'Sjöbo', 'Baskemölla', 'SOLHETTA'], correct: 3, revealImg: 'q-img24.jpg' }
    ]
  }
];

/* Ordine della serata: una gara prima di ogni parte + la gara finale (vale doppio). */
const RACES = [
  { before: 1, trackId: 'showroom' },
  { before: 2, trackId: 'magazzino' },
  { before: 3, trackId: 'ristorante' },
  { before: 4, trackId: 'smaland' },
  { before: null, trackId: 'casse', final: true }
];

/*
 * POTERI (bonus e ostacoli). Prima di ogni domanda (dalla 2ª di ogni parte) ognuno vede 3 poteri estratti a caso.
 * kind: 'obstacle' → si sceglie un avversario  |  'bonus' → vale per te
 * cost: punti che paghi subito  ·  maxUses: quante volte in tutta la partita  ·  weightLow: esce più spesso a chi è indietro
 * Gli effetti sul telefono sono in public/quiz-player.js (applyEffects); quelli sui punti in quiz.js (reveal).
 */
const POWERS = {
  SCUDO:      { kind: 'bonus',    label: 'Scudo',            desc: 'Ti protegge da tutti gli ostacoli in questa domanda. Al massimo 2 volte a partita.', maxUses: 2 },
  RUBA:       { kind: 'obstacle', label: 'Ruba i punti',     desc: 'I punti che fa in questa domanda vanno a te, lui prende 0. Se indovini prendi anche i tuoi.' },
  SCAMBIO:    { kind: 'obstacle', label: 'Scambio punti',    desc: 'Dopo questa domanda il tuo totale e il suo si scambiano.', weightLow: true },
  POLE:       { kind: 'bonus',    label: 'Pole position',    desc: 'Paghi 30 punti e alla prossima gara parti primo.', cost: 30 },
  ULTIMO:     { kind: 'obstacle', label: 'In fondo alla griglia', desc: 'Paghi 20 punti e alla prossima gara lui parte ultimo.', cost: 20 },
  RICKROLL:   { kind: 'obstacle', label: 'Rick roll',        desc: 'Gli parte un video sul telefono e finché dura non può fare nulla.' },
  FAAAH:      { kind: 'obstacle', label: 'Faaah',            desc: 'Al primo tocco su una risposta: suono, gattino, e la risposta non vale. Poi riprova.' },
  CLASSIFICA: { kind: 'bonus',    label: 'Sbircia la classifica', desc: 'Vedi la classifica di adesso sul tuo telefono.' },
  DOPPIO:     { kind: 'bonus',    label: 'Punti ×2',         desc: 'Se rispondi giusto, punti doppi.' },
  POLPETTE:   { kind: 'obstacle', label: 'Polpette',         desc: 'Polpette IKEA che vanno e vengono su tutto il suo schermo.' },
  SCATOLE:    { kind: 'obstacle', label: 'Scatoloni',        desc: 'Scatoloni gli coprono le risposte per 4 secondi.' },
  LETTERE:    { kind: 'obstacle', label: 'Mangia lettere',   desc: 'Sul suo telefono spariscono lettere da domanda e risposte: riappaiono poco a poco in 12 secondi.' },
  TOGLI:      { kind: 'bonus',    label: 'Togli una sbagliata', desc: 'Una risposta sbagliata sparisce dal tuo telefono.', needsChoices: 3 }
};
const POWER_OFFER = 3;          // poteri estratti per ognuno a ogni domanda
const RICKROLL_MS = 10000;      // quanto dura il blocco del rick roll
const LETTERS_MS = 12000;      // mangia lettere: in quanto tempo tornano tutte

const TIMES = {
  powers: 30000,        // scelta del potere
  reading: 30000,       // max per leggere la domanda (poi le risposte appaiono comunque)
  answer: 30000,        // tempo per rispondere
  order: 35000          // tempo per la domanda "metti in ordine"
};

module.exports = { PARTS, RACES, POWERS, POWER_OFFER, RICKROLL_MS, LETTERS_MS, TIMES };
