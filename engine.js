/* ==========================================
   TypeBlitz - Core Typing Speed Test Engine
   ========================================== */

const BLITZ_WORDS = [
  "system", "future", "network", "cyberpunk", "lightning", "esports", "accuracy", "mechanical", "precision", 
  "synthesizer", "glitch", "neon", "dashboard", "gamified", "multiplayer", "keyboard", "controller", "blitz", 
  "velocity", "matrix", "hologram", "tactile", "switch", "quantum", "digital", "terminal", "console", "arena", 
  "champion", "streak", "multiplier", "fire", "posture", "focus", "posture", "coaching", "challenges", "trophy", 
  "achievements", "unlockable", "themes", "soundpack", "cherry", "linear", "customization", "leaderboard", 
  "progression", "experience", "levels", "avatar", "battlepass", "adrenaline", "unboxing", "easteregg", 
  "performance", "analytics", "tracking", "history", "heatmap", "weakness", "drills", "posture", "webcam", 
  "pomodoro", "interactive", "retro", "arcade", "survival", "laser", "plasma", "missiles", "shields", "megabot", 
  "zombie", "escape", "shooter", "spectator", "matchmaking", "lobby", "latency", "realtime", "webrtc", "p2p", 
  "connection", "credentials", "database", "supabase", "firebase", "tailwind", "framer", "threejs", "canvas", 
  "particles", "vignette", "cybernetic", "futuristic", "premium", "addictive", "responsive", "optimized"
];

const CODE_WORDS = [
  "const", "let", "function", "class", "async", "await", "import", "export", "return", "document.getElementById", 
  "addEventListener", "console.log", "Math.random()", "localStorage.setItem", "new Promise()", "fetch(url)", 
  "map(x => x * 2)", "filter(Boolean)", "reduce((a, b) => a + b)", "setTimeout(() => {})", "JSON.stringify", 
  "window.AudioContext", "canvas.getContext('2d')", "biquadFilter.connect()", "oscillator.start()", 
  "try { } catch (e) { }", "document.body.classList.add()", "Array.from()", "Object.keys()", "window.onload"
];

const NUMBER_WORDS = [
  "100", "2026", "99.9%", "42.0", "3.14159", "0xFA57", "#ff0055", "101010", "127.0.0.1", "port:8080", 
  "19.99$", "+81-3-555", "x = y * 12", "lvl_99", "xp += 150", "4, 8, 15, 16, 23, 42", "2.4GHz", "3500Hz", "100/100"
];

class TypingEngine {
  constructor() {
    this.wordsList = BLITZ_WORDS;
    this.testMode = 'classic'; // 'classic', 'timeattack', 'zen', 'hardcore'
    this.testTimeLimit = 30; // in seconds
    this.timer = null;
    this.timeElapsed = 0;
    this.timeRemaining = 30;
    this.isRunning = false;
    this.isFinished = false;

    this.activeWords = [];
    this.currentWordIdx = 0;
    this.currentCharIdx = 0;
    
    // Keystroke statistics
    this.totalTypedChars = 0;
    this.correctTypedChars = 0;
    this.errorsCount = 0;
    
    // Live streak combos
    this.streak = 0;
    
    // Log for replay and charting
    this.keystrokeLog = []; // format: { time: offsetMs, wpm: currentWpm, acc: currentAcc }
    this.startTime = null;
    
    // Ghost racer variables
    this.ghostActive = false;
    this.ghostWPM = 55; // personal best or fallback
    this.ghostInterval = null;
    this.ghostCharIndex = 0;

    // Last completed run cache for replay
    this.lastRunWords = [];
    this.lastRunLog = []; // array of key press offsets
    this.isReplaying = false;
    this.replayTimeout = null;
  }

  // Set the Active Test Mode
  setMode(mode) {
    this.testMode = mode;
    if (mode === 'zen') {
      document.getElementById('time-options-container').classList.add('hidden');
      document.getElementById('ghost-metric-container').classList.add('hidden');
    } else {
      document.getElementById('time-options-container').classList.remove('hidden');
      document.getElementById('ghost-metric-container').classList.remove('hidden');
    }
    this.reset();
  }

  // Set the Active Test Time Limit
  setTimeLimit(seconds) {
    this.testTimeLimit = parseInt(seconds);
    this.reset();
  }

  // Generate dynamic text string for the test
  generateText() {
    const list = this.wordsList;
    const wordsArray = [];
    // generate about 60-80 words based on time limit
    const count = this.testMode === 'zen' ? 100 : (this.testTimeLimit > 30 ? 120 : 70);
    for (let i = 0; i < count; i++) {
      const randWord = list[Math.floor(Math.random() * list.length)];
      wordsArray.push(randWord);
    }
    this.activeWords = wordsArray;
  }

  // Render Spans inside display block
  renderDisplay() {
    const container = document.getElementById('test-text-display');
    if (!container) return;
    
    container.innerHTML = '';
    
    this.activeWords.forEach((word, wIdx) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'word flex inline-block';
      wordSpan.dataset.wordIdx = wIdx;
      
      // letters span
      for (let cIdx = 0; cIdx < word.length; cIdx++) {
        const charSpan = document.createElement('span');
        charSpan.className = 'char text-slate-500 transition-colors';
        charSpan.textContent = word[cIdx];
        charSpan.dataset.charIdx = cIdx;
        wordSpan.appendChild(charSpan);
      }
      
      // add extra trailing space span for word spacing visualizer
      const spaceSpan = document.createElement('span');
      spaceSpan.className = 'char text-slate-600 transition-colors space-char';
      spaceSpan.textContent = ' ';
      spaceSpan.dataset.charIdx = word.length;
      wordSpan.appendChild(spaceSpan);
      
      container.appendChild(wordSpan);
    });

    // highlight starting current letter
    this.highlightCurrentChar();
  }

  // Highlight active character and active word
  highlightCurrentChar() {
    // clean previous current highlights
    const prevCurrent = document.querySelectorAll('.char-current');
    prevCurrent.forEach(el => el.classList.remove('char-current'));

    const prevWordActive = document.querySelector('.word.active-word');
    if (prevWordActive) prevWordActive.classList.remove('active-word');

    const activeWordElement = document.querySelector(`.word[data-word-idx="${this.currentWordIdx}"]`);
    if (activeWordElement) {
      activeWordElement.classList.add('active-word');
      
      const activeCharElement = activeWordElement.querySelector(`.char[data-char-idx="${this.currentCharIdx}"]`);
      if (activeCharElement) {
        activeCharElement.classList.add('char-current');
        
        // Auto scroll text block down if typing goes too far
        const container = document.getElementById('typing-textbox-container');
        if (container) {
          const charOffset = activeCharElement.offsetTop;
          if (charOffset > 90) {
            container.scrollTop = charOffset - 60;
          } else {
            container.scrollTop = 0;
          }
        }
      }
    }
  }

  // Start Speed Test run
  start() {
    if (this.isRunning) return;
    
    // Ensure sound context is active
    if (window.Sound) window.Sound.resume();

    this.isRunning = true;
    this.startTime = Date.now();
    this.timeElapsed = 0;
    this.timeRemaining = this.testTimeLimit;
    
    // Hide overlay focus instructions
    const overlay = document.getElementById('test-focus-overlay');
    if (overlay) overlay.classList.add('hidden');

    // Run dynamic countdown loop
    if (this.testMode !== 'zen') {
      this.timer = setInterval(() => {
        this.timeElapsed++;
        this.timeRemaining = Math.max(0, this.testTimeLimit - this.timeElapsed);
        
        // Update timer clock
        const min = String(Math.floor(this.timeRemaining / 60)).padStart(2, '0');
        const sec = String(this.timeRemaining % 60).padStart(2, '0');
        const clock = document.getElementById('live-timer');
        if (clock) clock.textContent = `${min}:${sec}`;

        // Check if countdown tick triggers sound
        if (this.timeRemaining <= 5 && this.timeRemaining > 0) {
          if (window.Sound) window.Sound.playCountdownTick(false);
        }

        // Compute metrics
        this.updateLiveStats();

        // Check if limit exceeded
        if (this.timeRemaining <= 0) {
          this.finish();
        }
      }, 1000);

      // Start Ghost Racer Interval
      if (this.ghostActive) {
        this.startGhostMoving();
      }
    } else {
      const clock = document.getElementById('live-timer');
      if (clock) clock.textContent = "∞ ZEN";
    }

    // Commentator speech
    this.sayAIComment("Let's go! Keep up high accuracy!");
  }

  // Stop speed test run and trigger final score card modal
  finish() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.isFinished = true;
    
    if (this.timer) clearInterval(this.timer);
    if (this.ghostInterval) clearInterval(this.ghostInterval);
    
    // Play Victory or defeat synth sounds
    const finalWpm = parseInt(document.getElementById('live-wpm').textContent);
    const finalAcc = parseInt(document.getElementById('live-acc').textContent);
    
    if (window.Sound) {
      if (finalWpm >= 50 && finalAcc >= 90) {
        window.Sound.playVictoryFanfare();
      } else {
        window.Sound.playDefeatSoundscape();
      }
    }

    // Capture logs for replay before clearing
    this.lastRunWords = [...this.activeWords];
    this.lastRunLog = [...this.keystrokeLog];

    // Award leveling currency and XP database logs
    if (window.Dashboard) {
      const xpEarned = Math.floor(finalWpm * (finalAcc / 100) * (this.testMode === 'hardcore' ? 1.5 : 1));
      const coinsEarned = Math.floor(xpEarned / 4);
      
      window.Dashboard.logSpeedRun(finalWpm, finalAcc, this.errorsCount, xpEarned, coinsEarned);
      
      // Update result dashboard UI
      document.getElementById('res-wpm').textContent = finalWpm;
      document.getElementById('res-acc').textContent = finalAcc;
      document.getElementById('res-errors').textContent = this.errorsCount;
      document.getElementById('res-xp').textContent = `+${xpEarned} XP`;
      
      // Highlight unlock trophies if completed
      window.Dashboard.checkTrophiesAward(finalWpm, finalAcc, this.errorsCount);
    }

    // Open score card modals
    document.getElementById('typing-textbox-container').classList.add('hidden');
    document.getElementById('test-result-panel').classList.remove('hidden');

    // Draw Recharts Chart.js line
    this.drawChartLogs();

    this.sayAIComment("Speed run registered successfully. Review your telemetry!");
  }

  // Draw dynamic line chart of speed logs
  drawChartLogs() {
    const canvas = document.getElementById('res-chart');
    if (!canvas) return;

    // Clean previous chart instance if exists
    if (window.activeResultChart) {
      window.activeResultChart.destroy();
    }

    const labels = [];
    const wpms = [];
    const accs = [];

    this.keystrokeLog.forEach((item, idx) => {
      labels.push(`${idx + 1}s`);
      wpms.push(item.wpm);
      accs.push(item.acc);
    });

    const ctx = canvas.getContext('2d');
    window.activeResultChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Words Per Minute (WPM)',
            data: wpms,
            borderColor: '#00f0ff',
            backgroundColor: 'rgba(0, 240, 255, 0.1)',
            borderWidth: 3,
            tension: 0.35,
            fill: true
          },
          {
            label: 'Accuracy (%)',
            data: accs,
            borderColor: '#9b30ff',
            backgroundColor: 'rgba(155, 48, 255, 0.05)',
            borderWidth: 2.5,
            tension: 0.35,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#64748b' } },
          y: { grid: { color: 'rgba(255, 255, 255, 0.03)' }, ticks: { color: '#64748b' } }
        }
      }
    });
  }

  // Reset core typing state variables
  reset() {
    if (this.timer) clearInterval(this.timer);
    if (this.ghostInterval) clearInterval(this.ghostInterval);
    if (this.replayTimeout) clearTimeout(this.replayTimeout);

    this.isRunning = false;
    this.isFinished = false;
    this.isReplaying = false;
    this.timeElapsed = 0;
    this.timeRemaining = this.testTimeLimit;
    
    this.currentWordIdx = 0;
    this.currentCharIdx = 0;
    this.totalTypedChars = 0;
    this.correctTypedChars = 0;
    this.errorsCount = 0;
    this.streak = 0;
    
    this.keystrokeLog = [];
    this.ghostCharIndex = 0;

    // Load word array category based on lesson
    this.generateText();

    // Reset layout UI elements
    const overlay = document.getElementById('test-focus-overlay');
    if (overlay) overlay.classList.remove('hidden');

    document.getElementById('live-wpm').textContent = '0';
    document.getElementById('live-acc').textContent = '100';
    document.getElementById('live-streak').textContent = '0';
    
    const clock = document.getElementById('live-timer');
    if (clock) {
      if (this.testMode === 'zen') {
        clock.textContent = "∞ ZEN";
      } else {
        const min = String(Math.floor(this.testTimeLimit / 60)).padStart(2, '0');
        const sec = String(this.testTimeLimit % 60).padStart(2, '0');
        clock.textContent = `${min}:${sec}`;
      }
    }

    const streakGlow = document.getElementById('test-streak-glow');
    if (streakGlow) streakGlow.classList.add('opacity-0');

    document.getElementById('typing-textbox-container').classList.remove('hidden');
    document.getElementById('test-result-panel').classList.add('hidden');

    this.renderDisplay();
    this.sayAIComment("Awaiting typing test init. Calibrating fingers...");
  }

  // Update Live analytics metrics
  updateLiveStats() {
    if (this.timeElapsed <= 0) return;
    
    // WPM Formula: (correct characters / 5) / elapsed minutes
    const elapsedMins = this.timeElapsed / 60;
    const computedWpm = Math.round((this.correctTypedChars / 5) / elapsedMins);
    
    // Accuracy Formula: (correct typed / total typed) * 100
    const computedAcc = this.totalTypedChars > 0 ? Math.round((this.correctTypedChars / this.totalTypedChars) * 100) : 100;
    
    document.getElementById('live-wpm').textContent = computedWpm;
    document.getElementById('live-acc').textContent = computedAcc;

    // Add telemetry log
    this.keystrokeLog.push({
      time: this.timeElapsed,
      wpm: computedWpm,
      acc: computedAcc
    });

    // Check combo streaks multiplier flames
    const flamesEnabled = document.getElementById('settings-flames-toggle')?.checked ?? true;
    const streakGlow = document.getElementById('test-streak-glow');
    
    if (computedWpm >= 70 && flamesEnabled) {
      if (streakGlow) {
        streakGlow.classList.remove('opacity-0');
        streakGlow.classList.add('flame-streak-fx');
      }
      this.sayAIComment("FIRE STREAK ACTIVE! BLASTING THE BARRIER!");
    } else {
      if (streakGlow) {
        streakGlow.classList.add('opacity-0');
        streakGlow.classList.remove('flame-streak-fx');
      }
    }
  }

  // Handle keyboard active keystroke typing verification
  handleKeystroke(key) {
    if (this.isFinished || this.isReplaying) return;
    if (!this.isRunning) {
      this.start();
    }

    const currentWord = this.activeWords[this.currentWordIdx];
    if (!currentWord) return;

    const wordEl = document.querySelector(`.word[data-word-idx="${this.currentWordIdx}"]`);
    if (!wordEl) return;

    // 1. Backspace logic
    if (key === 'Backspace') {
      if (this.currentCharIdx > 0) {
        this.currentCharIdx--;
        const charEl = wordEl.querySelector(`.char[data-char-idx="${this.currentCharIdx}"]`);
        if (charEl) {
          // decrement counts if it was correct
          if (charEl.classList.contains('char-correct')) {
            this.correctTypedChars = Math.max(0, this.correctTypedChars - 1);
          }
          charEl.className = 'char text-slate-500'; // reset style
          this.totalTypedChars = Math.max(0, this.totalTypedChars - 1);
        }
        this.streak = Math.max(0, this.streak - 1);
        document.getElementById('live-streak').textContent = this.streak;
      }
      this.highlightCurrentChar();
      if (window.Sound) window.Sound.playKeystrokeClick();
      return;
    }

    // 2. Spacebar (word commit) logic
    if (key === ' ' || key === 'Spacebar') {
      // mark remaining letters of current word as incorrect if skipped early
      const remainingLetters = wordEl.querySelectorAll('.char:not(.char-correct):not(.char-incorrect):not(.space-char)');
      remainingLetters.forEach(el => {
        el.classList.add('char-incorrect');
        this.errorsCount++;
      });

      // mark active word space character as correct
      const spaceCharEl = wordEl.querySelector('.space-char');
      if (spaceCharEl) {
        spaceCharEl.classList.add('char-correct');
      }

      this.currentWordIdx++;
      this.currentCharIdx = 0;
      
      // check if words completed
      if (this.currentWordIdx >= this.activeWords.length) {
        this.finish();
      } else {
        this.highlightCurrentChar();
      }
      
      if (window.Sound) window.Sound.playKeystrokeClick();
      return;
    }

    // 3. Normal character logic
    if (key.length === 1) {
      const targetChar = this.currentCharIdx === currentWord.length ? ' ' : currentWord[this.currentCharIdx];
      const charEl = wordEl.querySelector(`.char[data-char-idx="${this.currentCharIdx}"]`);
      
      if (!charEl) return;

      this.totalTypedChars++;

      if (key === targetChar) {
        charEl.classList.add('char-correct');
        this.correctTypedChars++;
        this.streak++;
        document.getElementById('live-streak').textContent = this.streak;
        
        // play synth sound
        if (window.Sound) window.Sound.playKeystrokeClick();
      } else {
        charEl.classList.add('char-incorrect');
        this.errorsCount++;
        this.streak = 0;
        document.getElementById('live-streak').textContent = 0;

        // Hardcore Mode instant death
        if (this.testMode === 'hardcore') {
          this.finish();
          this.sayAIComment("CRITICAL ERROR! HARDCORE ENGAGEMENT SHUTDOWN!");
          return;
        }

        // play error sound
        if (window.Sound) window.Sound.playErrorBuzz();
        this.sayAIComment("Watch that letter! Recalibrating rest indices.");
      }

      // Advance cursor
      this.currentCharIdx++;
      
      // If we typed all characters including the word space (space char index is currentWord.length)
      if (this.currentCharIdx > currentWord.length) {
        this.currentWordIdx++;
        this.currentCharIdx = 0;
        
        if (this.currentWordIdx >= this.activeWords.length) {
          this.finish();
          return;
        }
      }

      this.highlightCurrentChar();
    }
  }

  // Say AI comment
  sayAIComment(speech) {
    const el = document.getElementById('ai-commentator-speech');
    if (el) el.textContent = `"${speech}"`;
  }

  // Active/Deactivate Ghost Challenge
  toggleGhostRacer() {
    this.ghostActive = !this.ghostActive;
    const btnText = document.getElementById('btn-ghost-toggle-text');
    
    if (this.ghostActive) {
      if (btnText) btnText.textContent = "DEACTIVATE GHOST RACING";
      
      // Load personal best from localStorage
      if (window.Dashboard) {
        this.ghostWPM = window.Dashboard.personalBestWpm || 55;
      }
      document.getElementById('ghost-target-wpm').textContent = `${this.ghostWPM} WPM`;
      this.sayAIComment(`Ghost challenger active. Target speed: ${this.ghostWPM} WPM!`);
    } else {
      if (btnText) btnText.textContent = "ACTIVATE GHOST RACING";
      document.getElementById('ghost-target-wpm').textContent = `--`;
      if (this.ghostInterval) clearInterval(this.ghostInterval);
    }
  }

  // Move the ghost progress index along
  startGhostMoving() {
    const intervalMs = 200; // updates every 200ms
    // Ghost speed in char index per interval: (GhostWpm * 5 chars) / 60s * 0.2s
    const charPerInterval = (this.ghostWPM * 5) / 60 * (intervalMs / 1000);
    
    this.ghostCharIndex = 0;
    this.ghostInterval = setInterval(() => {
      this.ghostCharIndex += charPerInterval;
      
      // Render ghost visualizer relative to user index
      const ghostWpmBar = document.getElementById('ghost-wpm-bar');
      if (ghostWpmBar) {
        ghostWpmBar.textContent = `${Math.round(this.ghostCharIndex / 5 / (this.timeElapsed / 60 || 0.01))} WPM`;
      }
    }, intervalMs);
  }

  // Replay playback loop simulation
  replayLastTypingRun() {
    if (this.isReplaying) return;
    this.isReplaying = true;

    // Reset result panel and show textbox
    document.getElementById('typing-textbox-container').classList.remove('hidden');
    document.getElementById('test-result-panel').classList.add('hidden');
    
    // Load last run words list
    this.activeWords = [...this.lastRunWords];
    this.renderDisplay();
    
    this.currentWordIdx = 0;
    this.currentCharIdx = 0;
    this.highlightCurrentChar();

    // Prepare absolute playback logs
    const log = [...this.lastRunLog];
    
    this.sayAIComment("Replay loading. Sit back and watch.");
    
    // Synthesize tick logs
    let index = 0;
    const playNext = () => {
      if (index >= log.length) {
        this.isReplaying = false;
        // Restore result modal
        document.getElementById('typing-textbox-container').classList.add('hidden');
        document.getElementById('test-result-panel').classList.remove('hidden');
        return;
      }
      
      const item = log[index];
      // simulate correct typing keys color changes
      const word = this.activeWords[this.currentWordIdx];
      const wordEl = document.querySelector(`.word[data-word-idx="${this.currentWordIdx}"]`);
      if (wordEl) {
        const charEl = wordEl.querySelector(`.char[data-char-idx="${this.currentCharIdx}"]`);
        if (charEl) {
          charEl.classList.add('char-correct');
          if (window.Sound) window.Sound.playKeystrokeClick();
        }
      }
      
      this.currentCharIdx++;
      if (this.currentCharIdx > word.length) {
        this.currentWordIdx++;
        this.currentCharIdx = 0;
      }
      
      this.highlightCurrentChar();
      index++;
      this.replayTimeout = setTimeout(playNext, 350); // standard pace playback
    };

    playNext();
  }
}

// Global Single Instance export
const Engine = new TypingEngine();
window.Engine = Engine; // expose to window
