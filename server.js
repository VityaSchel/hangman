import { init, start, guess, w } from './guess.js'
import express from 'express'
import { nanoid } from 'nanoid'

const app = express()
const prize = 'helloworld'

app.use(express.static('public'))

app.post('/start', async (req, res) => {
  let db = await init()
  let gameID = nanoid(24)
  let { lives, wordTemplate, actualWord } = await start()
  await db.collection('games').insertOne({ gameID, lives, guessedWord: wordTemplate, actualWord, attempts: [] })
  res.status(200)
  res.json({ gameID, wordLength: actualWord.length, lives, wordTemplate })
})

app.post('/guess/:gameID/:letter', async (req, res) => {
  let db = await init(), letter = decodeURI(req.params.letter), gameID = req.params.gameID
  let game = await db.collection('games').findOne({ gameID })
  if(game === null) { return res.status(404).json({ error: 'Game with gameID not found' }) }
  if(!/^[а-я]$/.test(letter) || game.attempts.includes(letter) || game.guessedWord.includes(letter)) {
    return res.status(400).json({ error: 'Letter must be in range а-я and it cannot repeat previous attempts including guessed letters' })
  }
  if (game.lives === 0) return res.status(401).json({ error: 'You lost' })
  let newWord = await guess(game.guessedWord, game.attempts, letter)
  if(newWord === null) {
    if(game.actualWord.includes(letter)) {
      game.actualWord.split('').reduce((last, cur, i) => {
        return cur === letter ? [...last, i] : last
      }, []).forEach(i => game.guessedWord[i] = letter)
      await db.collection('games').updateOne({ gameID: game.gameID }, { $set: { guessedWord: game.guessedWord } })
      if(game.guessedWord.filter(l => l === '_').length === 0) {
        res.status(200).json({ guessed: true, won: true, lives: game.lives, word: game.actualWord.split(''), prize })
      } else {
        // some letters were guessed, but not the whole word; continue
        res.status(200).json({ guessed: true, won: false, lives: game.lives, word: game.guessedWord })
      }
    } else {
      let lives = await hangman(db, game, letter)
      res.status(200).json({ guessed: false, lives, word: game.guessedWord, prize })
    }
  } else {
    newWord = w(newWord)
    console.log('changing from', game.actualWord, 'to', newWord)
    await db.collection('games').updateOne({ gameID: game.gameID }, { $set: { actualWord: newWord } })
    let lives = await hangman(db, game, letter)
    if(lives <= 0){
      res.status(200).json({ guessed: false, lives, word: newWord.split('') })
    } else {
      // letters werent guesed; continue
      res.status(200).json({ guessed: false, lives, word: game.guessedWord })
    }
  }
})

const hangman = async (db, game, letter) => {
  await db.collection('games').updateOne({ gameID: game.gameID }, { $set: { attempts: [...game.attempts, letter], lives: game.lives-1 } })
  return game.lives-1
}

app.use((req, res, next) => {
  res.status(404).end()
})

app.listen(17635)
console.log('Server for hangman started, listening at 17635')
