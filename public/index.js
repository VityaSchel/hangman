const $ = selector => document.querySelector(selector)

async function submitLetter(e) {
  e.preventDefault()

  const form = new FormData(e.target)
  const letter = form.get('letter')
  if(attempts.includes(letter) || guessedWord.includes(letter)) { return }
  e.target.reset()

  let response_raw = await fetch(`/guess/${gameID}/${letter}`, {
    method: 'POST'
  })
  let response = await response_raw.json()

  lives = response.lives
  guessedWord = response.word
  $('#state').innerText = guessedWord.join(' ')
  if(response.guessed){
    if(response.won) {
      blockGame()
      $('#game').style.display = 'none'
      $('#prize').style.display = ''
      $('#prize').innerText = response.prize
    }
  } else {
    attempts.push(letter)
    $('#attempts').innerText = 'Попытки: '+attempts.join(' ')

    const frameN = longGame ? 8-lives : (6-lives < 6 ? 6-lives : 8)
    $('#hangman').src = '/frames/frame'+frameN+'.png'

    if(lives === 0)
      blockGame()
  }

  return false
}

function blockGame() {
  $('#letterinput').setAttribute('disabled', 'disabled')
  $('#submitbtn').setAttribute('disabled', 'disabled')
}

let gameID, attempts = [], lives, longGame, guessedWord
async function start() {
  let response_raw = await fetch('/start', { method: 'POST' })
  let response = await response_raw.json()
  gameID = response.gameID
  lives = response.lives
  longGame = response.lives !== 5
  guessedWord = response.wordTemplate
  $('#game').style.display = ''
  $('#state').innerText = guessedWord.join(' ')
  $('#attempts').innerText = 'Попытки: '+attempts.join(' ')
}

$('#submit').addEventListener('submit', submitLetter)
start()
