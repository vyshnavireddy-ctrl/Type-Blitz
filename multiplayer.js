/* ==========================================
   TypeBlitz - Multiplayer Arena Engine
   ========================================== */

class BlitzMultiplayer {
  constructor() {
    this.botDifficulty = 'medium'; // 'medium', 'hard', 'godlike'
    this.isMatchmaking = false;
    this.isRaceActive = false;
    
    // Matched Racers telemetry
    this.racers = [
      { name: 'You (GuestBlitzer)', progress: 0, wpm: 0, isUser: true },
      { name: 'CyberBot Alpha', progress: 0, wpm: 0, isUser: false, speedMin: 45, speedMax: 60 },
      { name: 'PhantomRunner', progress: 0, wpm: 0, isUser: false, speedMin: 50, speedMax: 65 }
    ];

    // Race text variables
    this.raceWords = [];
    this.currentWordIdx = 0;
    this.currentCharIdx = 0;
    this.correctTypedChars = 0;
    this.totalTypedChars = 0;
    this.errorsCount = 0;

    // Tick timers
    this.botInterval = null;
    this.raceTimer = null;
    this.elapsedTime = 0;
    
    // Connection ID
    this.myP2PId = 'BLITZ-HOST-' + Math.floor(1000 + Math.random() * 9000);
  }

  // Set the Bot skill level
  setBotDifficulty(diff) {
    this.botDifficulty = diff;
    
    // Update bot speed configurations
    const b1 = this.racers[1];
    const b2 = this.racers[2];
    
    if (diff === 'medium') {
      b1.speedMin = 45; b1.speedMax = 58;
      b2.speedMin = 48; b2.speedMax = 62;
    } else if (diff === 'hard') {
      b1.speedMin = 70; b1.speedMax = 82;
      b2.speedMin = 72; b2.speedMax = 86;
    } else if (diff === 'godlike') {
      b1.speedMin = 100; b1.speedMax = 112;
      b2.speedMin = 102; b2.speedMax = 115;
    }

    // Toggle button UI classes
    const buttons = document.querySelectorAll('.mp-bot-diff');
    buttons.forEach(btn => {
      if (btn.textContent.toLowerCase() === (diff === 'hard' ? 'pro' : diff)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.logComment(`Bot speed settings set toCherry MX: ${diff.toUpperCase()}`);
  }

  // Start matchmaking lobby simulation
  startMatchmaking() {
    if (this.isMatchmaking || this.isRaceActive) return;
    this.isMatchmaking = true;
    
    // Reset racers
    this.racers.forEach(r => {
      r.progress = 0;
      r.wpm = 0;
    });
    this.updateRacersProgressBars();

    this.logComment("Connecting to Blitz multiplayer cluster...");
    document.getElementById('mp-active-racers-count').textContent = "1 / 3 Racers joined";

    setTimeout(() => {
      this.logComment("Racer linked: CyberBot Alpha connected (ping: 18ms)");
      document.getElementById('mp-active-racers-count').textContent = "2 / 3 Racers joined";
      if (window.Sound) window.Sound.playCountdownTick(false);
    }, 1200);

    setTimeout(() => {
      this.logComment("Racer linked: PhantomRunner connected (ping: 24ms)");
      document.getElementById('mp-active-racers-count').textContent = "3 / 3 Racers joined";
      if (window.Sound) window.Sound.playCountdownTick(false);
    }, 2400);

    setTimeout(() => {
      this.logComment("Room secured! Calibrating racer countdown slots...");
      if (window.Sound) window.Sound.playCountdownTick(true);
      this.triggerMatchCountdown();
    }, 3600);
  }

  // Start countdown trigger
  triggerMatchCountdown() {
    this.isMatchmaking = false;
    
    // Reveal countdown panel
    const overlay = document.getElementById('mp-countdown-overlay');
    const container = document.getElementById('mp-race-typing-container');
    
    overlay.classList.remove('hidden');
    container.classList.remove('hidden');
    
    // Reset typing fields
    this.generateRaceText();
    this.currentWordIdx = 0;
    this.currentCharIdx = 0;
    this.correctTypedChars = 0;
    this.totalTypedChars = 0;
    this.errorsCount = 0;
    
    this.renderDisplay();

    let count = 3;
    const numEl = document.getElementById('mp-countdown-num');
    numEl.textContent = count;

    const timer = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(timer);
        overlay.classList.add('hidden');
        this.startRaceRun();
      } else {
        numEl.textContent = count;
        if (window.Sound) window.Sound.playCountdownTick(false);
      }
    }, 1000);
  }

  // Generate simple typing words for the race
  generateRaceText() {
    const wordsArray = [];
    for (let i = 0; i < 40; i++) {
      const randWord = BLITZ_WORDS[Math.floor(Math.random() * BLITZ_WORDS.length)];
      wordsArray.push(randWord);
    }
    this.raceWords = wordsArray;
  }

  // Render multiplayer displays
  renderDisplay() {
    const container = document.getElementById('mp-text-display');
    if (!container) return;
    
    container.innerHTML = '';
    this.raceWords.forEach((word, wIdx) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'mp-word flex inline-block';
      wordSpan.dataset.wordIdx = wIdx;
      
      for (let cIdx = 0; cIdx < word.length; cIdx++) {
        const charSpan = document.createElement('span');
        charSpan.className = 'mp-char text-slate-500';
        charSpan.textContent = word[cIdx];
        charSpan.dataset.charIdx = cIdx;
        wordSpan.appendChild(charSpan);
      }
      
      // trailing space
      const spaceSpan = document.createElement('span');
      spaceSpan.className = 'mp-char text-slate-600 space-char';
      spaceSpan.textContent = ' ';
      spaceSpan.dataset.charIdx = word.length;
      wordSpan.appendChild(spaceSpan);
      
      container.appendChild(wordSpan);
    });

    this.highlightCurrentChar();
  }

  // Highlight characters
  highlightCurrentChar() {
    const prevCurrent = document.querySelectorAll('.mp-char-current');
    prevCurrent.forEach(el => el.classList.remove('mp-char-current', 'char-current'));

    const prevWordActive = document.querySelector('.mp-word.active-word');
    if (prevWordActive) prevWordActive.classList.remove('active-word');

    const activeWordElement = document.querySelector(`.mp-word[data-word-idx="${this.currentWordIdx}"]`);
    if (activeWordElement) {
      activeWordElement.classList.add('active-word');
      
      const activeCharElement = activeWordElement.querySelector(`.mp-char[data-char-idx="${this.currentCharIdx}"]`);
      if (activeCharElement) {
        activeCharElement.classList.add('mp-char-current', 'char-current');
        
        // scroll
        const container = document.getElementById('mp-textbox-container');
        if (container) {
          const charOffset = activeCharElement.offsetTop;
          if (charOffset > 60) {
            container.scrollTop = charOffset - 40;
          } else {
            container.scrollTop = 0;
          }
        }
      }
    }
  }

  // Run the race
  startRaceRun() {
    this.isRaceActive = true;
    this.elapsedTime = 0;
    this.logComment("RACE COMMENCED! PILOTS POWER THROTTLES!");

    // Focus textbox
    const txtbox = document.getElementById('mp-textbox-container');
    if (txtbox) txtbox.focus();

    // Start bots interval loops
    this.startBotsMovement();

    // Start race limits clock
    this.raceTimer = setInterval(() => {
      this.elapsedTime++;
      
      // Update WPM
      const elapsedMins = this.elapsedTime / 60;
      const userWpm = Math.round((this.correctTypedChars / 5) / elapsedMins);
      this.racers[0].wpm = userWpm;
      
      document.getElementById('mp-user-wpm-live').textContent = `${userWpm} WPM`;

      if (this.elapsedTime >= 30) {
        this.finishRace();
      }
    }, 1000);
  }

  // Move the Bots along
  startBotsMovement() {
    const intervalMs = 500;
    
    // Total character count to type
    const totalChars = this.raceWords.join(' ').length;

    this.botInterval = setInterval(() => {
      if (!this.isRaceActive) return;

      this.racers.forEach((r, idx) => {
        if (r.isUser) return; // handled by keystrokes

        // Random typing progress for this tick
        const randWpm = Math.floor(r.speedMin + Math.random() * (r.speedMax - r.speedMin));
        r.wpm = randWpm;
        
        // Progress delta = (wpm * 5) / 60 * 0.5s / totalChars
        const deltaProgress = (randWpm * 5) / 60 * (intervalMs / 1000) / totalChars * 100;
        r.progress = Math.min(100, r.progress + deltaProgress);

        // Update WPM indicator
        const wpmLbl = document.getElementById(`mp-bot${idx}-wpm-live`);
        if (wpmLbl) wpmLbl.textContent = `${randWpm} WPM`;

        // Check bot win
        if (r.progress >= 100) {
          this.finishRace(r.name);
        }
      });

      this.updateRacersProgressBars();
      this.evaluateRaceComments();
    }, intervalMs);
  }

  // Update racer progress bars immediately
  updateRacersProgressBars() {
    document.getElementById('mp-bar-user').style.width = `${this.racers[0].progress}%`;
    document.getElementById('mp-bar-bot1').style.width = `${this.racers[1].progress}%`;
    document.getElementById('mp-bar-bot2').style.width = `${this.racers[2].progress}%`;
  }

  // Generate dynamic live commentary details
  evaluateRaceComments() {
    const sorted = [...this.racers].sort((a,b) => b.progress - a.progress);
    
    // 10% chance to comment per tick to avoid spamming
    if (Math.random() > 0.4) {
      if (sorted[0].progress > 0 && sorted[0].progress < 95) {
        this.logComment(`${sorted[0].name} has captured the leading edge!`);
      }
    }
  }

  // Handle keys inside race
  handleKeyPress(e) {
    if (!this.isRaceActive) return;

    if (e.key === 'Backspace' || e.key === 'Tab' || e.key === 'Enter') return;
    
    const key = e.key;
    const currentWord = this.raceWords[this.currentWordIdx];
    if (!currentWord) return;

    const wordEl = document.querySelector(`.mp-word[data-word-idx="${this.currentWordIdx}"]`);
    if (!wordEl) return;

    // Spacebar word change
    if (key === ' ') {
      // missed chars
      const remaining = wordEl.querySelectorAll('.mp-char:not(.char-correct):not(.char-incorrect):not(.space-char)');
      remaining.forEach(el => {
        el.classList.add('char-incorrect');
        this.errorsCount++;
      });
      const space = wordEl.querySelector('.space-char');
      if (space) space.classList.add('char-correct');

      this.currentWordIdx++;
      this.currentCharIdx = 0;
      
      // Update progress percent
      const totalChars = this.raceWords.join(' ').length;
      this.racers[0].progress = Math.min(100, (this.correctTypedChars / totalChars) * 100);
      this.updateRacersProgressBars();

      if (this.currentWordIdx >= this.raceWords.length) {
        this.finishRace("You (GuestBlitzer)");
      } else {
        this.highlightCurrentChar();
      }
      
      if (window.Sound) window.Sound.playKeystrokeClick();
      return;
    }

    // Letter comparison
    if (key.length === 1) {
      const targetChar = this.currentCharIdx === currentWord.length ? ' ' : currentWord[this.currentCharIdx];
      const charEl = wordEl.querySelector(`.mp-char[data-char-idx="${this.currentCharIdx}"]`);
      
      if (!charEl) return;

      this.totalTypedChars++;

      if (key === targetChar) {
        charEl.classList.add('char-correct');
        this.correctTypedChars++;
        if (window.Sound) window.Sound.playKeystrokeClick();
      } else {
        charEl.classList.add('char-incorrect');
        this.errorsCount++;
        if (window.Sound) window.Sound.playErrorBuzz();
      }

      this.currentCharIdx++;
      
      // Update progress percent
      const totalChars = this.raceWords.join(' ').length;
      this.racers[0].progress = Math.min(100, (this.correctTypedChars / totalChars) * 100);
      this.updateRacersProgressBars();

      if (this.currentCharIdx > currentWord.length) {
        this.currentWordIdx++;
        this.currentCharIdx = 0;
        
        if (this.currentWordIdx >= this.raceWords.length) {
          this.finishRace("You (GuestBlitzer)");
          return;
        }
      }

      this.highlightCurrentChar();
    }
  }

  // End active race
  finishRace(winnerName = null) {
    if (!this.isRaceActive) return;
    this.isRaceActive = false;

    if (this.botInterval) clearInterval(this.botInterval);
    if (this.raceTimer) clearInterval(this.raceTimer);

    // If no winner is provided, check who had highest progress
    if (!winnerName) {
      const sorted = [...this.racers].sort((a,b) => b.progress - a.progress);
      winnerName = sorted[0].name;
    }

    this.logComment(`RACE CONCLUDED! Winner: ${winnerName.toUpperCase()}!`);
    
    // Display rankings popup
    const userWpm = this.racers[0].wpm;
    let rank = 3;
    if (winnerName.includes('You')) rank = 1;
    else {
      // user is either 2 or 3
      rank = this.racers[0].progress > this.racers[2].progress ? 2 : 3;
    }

    if (window.Sound) {
      if (rank === 1) window.Sound.playVictoryFanfare();
      else window.Sound.playDefeatSoundscape();
    }

    // Award rewards
    if (window.Dashboard) {
      const xp = rank === 1 ? 150 : (rank === 2 ? 80 : 40);
      const coins = rank === 1 ? 45 : (rank === 2 ? 20 : 10);
      
      window.Dashboard.logGameRewards(0, xp, coins);
      window.Dashboard.showBlitzToast(
        rank === 1 ? "Victory Achieved!" : "Race Concluded",
        `Finished Rank #${rank} with ${userWpm} WPM. Earned +${xp} XP.`,
        rank === 1 ? "trophy" : "zap"
      );
    }

    // Hide race textbox
    setTimeout(() => {
      document.getElementById('mp-race-typing-container').classList.add('hidden');
    }, 4000);
  }

  // Log comment to commentator panel
  logComment(msg) {
    const el = document.getElementById('mp-comment-logger');
    if (!el) return;

    const line = document.createElement('div');
    line.className = 'text-slate-400';
    line.textContent = `> ${msg}`;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }

  // Simulate WebRTC Connect ID
  connectP2PNetwork() {
    const connectId = document.getElementById('p2p-join-id').value.trim();
    if (connectId === '') {
      this.logComment("P2P Link error: Connection ID empty!");
      if (window.Sound) window.Sound.playErrorBuzz();
      return;
    }

    this.logComment(`Initializing WebRTC handshake with host: ${connectId}...`);
    
    setTimeout(() => {
      this.logComment("STUN Server resolution: OK (127.0.0.1)");
      this.logComment("ICE Candidate matching: SECURED");
    }, 800);

    setTimeout(() => {
      this.logComment(`P2P LINK SECURED! Connected to peer host. latency: 14ms.`);
      this.logComment("Awaiting Host room start dispatch...");
      if (window.Sound) window.Sound.playSuccessBell();
    }, 1800);
  }

  copyP2PId() {
    navigator.clipboard.writeText(this.myP2PId);
    if (window.Dashboard) {
      window.Dashboard.showBlitzToast("ID Copied", "Your P2P host key was copied to clipboard.", "copy");
    }
  }
}

// Global Single Instance export
const Multiplayer = new BlitzMultiplayer();
window.Multiplayer = Multiplayer; // expose to window
