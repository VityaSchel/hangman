import { default as mongodb } from 'mongodb'

let dbclient = {}, dbInitiated
export async function init() {
  if(dbInitiated) { return dbInitiated }
  const url = 'mongodb://localhost:12133'
  const mongoClient = mongodb.MongoClient
  const client = await (new mongoClient(url, { useUnifiedTopology: true })).connect()
  dbclient.client = client
  const db = client.db('dict')
  dbInitiated = db
  return db
}

async function wordExists(guessedLetters, excludeLetters) {
  let db = await init()
  let word
  const regex = '^'+guessedLetters.split('').map(l => l === '_' ? '[^'+excludeLetters.join('').replace('е', 'её')+'-]' : l).join('')+'$'
  word = await db.collection('words').aggregate([
    { $match: { word: { $regex: regex, $options: 'i' } } },
    { $sample: { size: 1 } }
  ]).toArray()
  return word[0] ? word[0].word : null
}

export const w = word => word.replace('ё', 'е').toLowerCase()

export async function start() {
  let wordLength = Math.floor(Math.random()*8)+5
  let db = await init()
  let actualWord = await db.collection('words').aggregate([
    {
      $redact: {
        $cond: [
          { $eq: [ { $strLenCP: '$word' }, wordLength] },
          '$$KEEP',
          '$$PRUNE'
        ]
      }
    },
    { $sample: { size: 1 } }
  ]).toArray()
  actualWord = w(actualWord[0].word)
  let wordTemplate = actualWord.split('').map(l => /[а-я]/.test(l) ? '_' : l)
  let lives = wordLength > 7 ? 7 : 5
  return { lives, wordTemplate, actualWord }
}

export async function guess(guessedWord, attempts, letter) {
  let newWord = await wordExists(guessedWord.join(''), [...attempts, letter])
  return newWord
}
