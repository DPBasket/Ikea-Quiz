# IKEA QUIZ & RACE 🛒🏁❓

Party game per la serata: **quiz IKEA in stile "Sapere è Potere"** + **gare di kart** in 3D nel negozio IKEA.
La TV o il proiettore mostra la presentazione, ognuno gioca dal proprio telefono. Fino a **15 giocatori**.

> Questo è un sito **separato** da IKEA RACE: il vecchio sito di prova resta com'era.

## Mettere online (nuovo sito, nessuna installazione per chi gioca)

1. Su GitHub crea un **nuovo** repository, per esempio `Ikea-Quiz`.
2. Premi **Add file → Upload files** e trascina **tutto il contenuto** della cartella `ikea-quiz`: la cartella `public` (con dentro `quiz/`), `server.js`, `quiz.js`, `quiz-data.js`, `package.json` e `README.md`. Poi premi **Commit changes**.
3. Su render.com: **New + → Web Service → Git Provider → GitHub**, scegli `Ikea-Quiz` e premi **Connect**.
4. Imposta **Build** `npm install`, **Start** `npm start`, **Instance Type** Free, poi premi **Deploy Web Service**.
5. Quando compare **Live**, apri il link sul PC collegato alla TV: è lo schermo della serata.

Il piano gratuito "si addormenta" dopo ~15 minuti senza uso: apri il link qualche minuto prima di iniziare.

## La serata

```
Benvenuto → 🏁 Gara 1 (Showroom) → PARTE 1 Storia IKEA
          → 🏁 Gara 2 (Magazzino) → PARTE 2 Indovina l'oggetto
          → 🏁 Gara 3 (Ristorante) → PARTE 3 Persona o mobile?
          → 🏁 Gara 4 (Småland) → PARTE 4 Città svedese o mobile?
          → 🏁 GARA FINALE (Casse, punti ×2) → 🏆 Classifica finale
```

Ogni parte inizia con una schermata di istruzioni. Ogni domanda segue questi passi:

1. **⚡ Poteri** (dalla 2ª domanda di ogni parte, mai subito dopo una gara): 15 s per scegliere **un** potere gratis, oppure nessuno. Prima si sceglie il potere, poi contro chi.
2. **Lettura**: la domanda appare su TV e telefoni, tutti premono **PRONTO**.
3. **Risposte**: appaiono quando tutti sono pronti. Si tocca la risposta sul telefono: è **definitiva**. Gli ostacoli ricevuti si attivano qui.
4. **Soluzione**: sulla TV la risposta giusta, chi ha scelto cosa e i punti guadagnati.

**Punti quiz:** risposta giusta da 500 a 1000 punti (più veloce = più punti), sbagliata 0.
Nella domanda dei loghi i punti sono proporzionali ai loghi messi al posto giusto.

**Punti gara:** 1° +800 … ultimo 0, distribuiti in modo proporzionale tra i piazzamenti. La gara finale vale doppio.
La **griglia di partenza** di ogni gara segue la classifica del quiz: chi è primo parte in pole.

### Comandi sullo schermo (host)
- **AVANTI ▶** (o freccia destra / spazio / invio) per andare avanti. Durante poteri, lettura e risposte serve a saltare l'attesa.
- Durante la gara: **✕ ANNULLA GARA**, poi **RIAVVIA** o **SALTA GARA**.
- Con un solo giocatore le gare vengono saltate.

### Uscire e rientrare senza perdere nulla
Se un telefono si spegne o si chiude la pagina, basta riaprire il link: si rientra **esattamente dov'eri**, con punti, risposta già data e potere scelto.
Il gioco aspetta chi è uscito fino allo scadere del tempo, così chi rientra in tempo può ancora rispondere.
Lo stato viene salvato anche su disco: se il server si riavvia, la partita riprende dalla stessa domanda.
Anche lo schermo TV si può ricaricare: con **RIPRENDI LA PARTITA** si torna alla serata.

## Modificare domande e poteri
Tutto sta in **`quiz-data.js`**: domande, risposte (`correct` = indice della risposta giusta), immagini (in `public/quiz/`), istruzioni delle parti, ordine delle gare, tempi e poteri.

I **poteri** attuali sono provvisori: GHIACCIO, MELMA e SCATOLONI come ostacoli, SCUDO e PUNTI ×2 come bonus.
Per aggiungerne uno nuovo serve una voce in `POWERS` (`quiz-data.js`) e il suo effetto in `public/quiz-player.js` (funzione `applyEffects`).

## Provare senza amici
Nella lobby: **+ 3 BOT DEMO** / **+ 7 BOT**. I bot rispondono, usano i poteri e corrono in gara.
Apri `/player.html` in un'altra finestra per giocare anche tu.

In locale: `npm install` e poi `npm start`, quindi apri `http://localhost:3000/host.html`.

## File
```
server.js        server: gare (fisica, oggetti, bot) + collegamento al quiz
quiz.js          regia della serata: fasi, punti, poteri, rientro, salvataggio
quiz-data.js     contenuto: 41 domande, gare, poteri, tempi
public/host.html, quiz-host.js, quiz-host.css        schermo TV
public/player.html, quiz-player.js, quiz-player.css  telefono
public/render.js, tracks.js                          grafica 3D, piste, avatar
public/quiz/                                         immagini delle domande e loghi
```
