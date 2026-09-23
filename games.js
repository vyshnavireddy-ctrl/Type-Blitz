/* ===================================================
   TypeBlitz - Arcade Games Canvas Suite (v2.0 Turbo)
   =================================================== */

const ARCADE_FALLBACK_WORDS = [
  "matrix", "cyber", "vector", "laser", "plasma", "shield", "rocket", "hyper",
  "proton", "photon", "quantum", "system", "future", "nexus", "pulsar", "glitch",
  "crypto", "cipher", "neural", "reactor", "bypass", "terminal", "engine", "ignite",
  "speed", "blitz", "runner", "interceptor", "assault", "orbit", "velocity", "core",
  "phantom", "shadow", "strike", "overclock", "disruptor", "valkyrie", "horizon", "vortex",
  "hazard", "beacon", "sensor", "turret", "cannon", "missile", "torpedo", "fusion",
  "subzero", "zenith", "apex", "titan", "cyborg", "android", "command", "protocol",
  "network", "uplink", "packet", "signal", "firewall", "kernel", "override", "payload",
  "binary", "module", "voltage", "circuit", "silicon", "hardware", "firmware", "optical"
];

class BlitzGames {
  constructor() {
    this.activeGameType = 'zombie'; // 'zombie', 'falling', 'spaceshooter', 'boss', 'cyberrunner', 'hackerescape'
    this.canvas = null;
    this.ctx = null;
    this.loopId = null;
    this.isRunning = false;
    this.isPaused = false;
    
    // Core game state
    this.score = 0;
    this.playerHp = 100;
    this.currentTypedInput = '';
    this.targetWord = null; // target object (by reference, not index!)
    this.wordIdCounter = 0;
    
    // Game entities & effects
    this.activeWords = [];
    this.particles = [];
    this.bullets = [];
    this.stars = [];
    this.screenShake = 0;
    this.errorShakeTimer = 0;
    this.combo = 0;
    this.lastFrameTime = performance.now();
    
    // Game specific states
    this.zombieDist = 70;
    this.playerDist = 350;
    this.boss = null;
    this.runnerObstacle = null;
    this.hackerNode = 0;
    this.hackerTrace = 0;
    this.spawnTimer = 0;
    
    // Safe word pool
    this.wordList = (typeof BLITZ_WORDS !== 'undefined' && Array.isArray(BLITZ_WORDS))
      ? BLITZ_WORDS
      : ARCADE_FALLBACK_WORDS;

    // Stable keyboard listener
    this.boundKeyPress = this.handleKeyPress.bind(this);
    this.boundResize = this.resizeCanvas.bind(this);
  }

  // Pick random word from list
  getRandomWord(minLength = 3, maxLength = 8) {
    const pool = (this.wordList && this.wordList.length > 0) ? this.wordList : ARCADE_FALLBACK_WORDS;
    const filtered = pool.filter(w => w.length >= minLength && w.length <= maxLength);
    const chosen = (filtered.length > 0) ? filtered : pool;
    return chosen[Math.floor(Math.random() * chosen.length)].toLowerCase();
  }

  // Initialize Canvas viewport
  init(gameType) {
    this.quit(); // Stop any running loops & clear listeners

    this.activeGameType = gameType || this.activeGameType || 'zombie';
    this.canvas = document.getElementById('game-canvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.isRunning = true;
    this.isPaused = false;
    
    this.score = 0;
    this.playerHp = 100;
    this.currentTypedInput = '';
    this.targetWord = null;
    this.wordIdCounter = 0;
    this.activeWords = [];
    this.particles = [];
    this.bullets = [];
    this.screenShake = 0;
    this.errorShakeTimer = 0;
    this.combo = 0;
    this.lastFrameTime = performance.now();

    // Resume Web Audio Context
    if (window.Sound) {
      if (typeof window.Sound.init === 'function') window.Sound.init();
      if (typeof window.Sound.resume === 'function') window.Sound.resume();
    }

    // Auto-size canvas to viewport
    this.resizeCanvas();
    window.removeEventListener('resize', this.boundResize);
    window.addEventListener('resize', this.boundResize);

    // Bind keyboard inputs on window
    window.removeEventListener('keydown', this.boundKeyPress);
    window.addEventListener('keydown', this.boundKeyPress);

    // Setup initial game specifics
    this.setupGameParameters();
    
    // Start RAF Loop
    this.tick();
  }

  // Responsive Canvas Sizing
  resizeCanvas() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    const w = parent ? parent.clientWidth : 800;
    const h = parent ? parent.clientHeight : 384;
    
    this.canvas.width = Math.max(w || 800, 600);
    this.canvas.height = Math.max(h || 384, 384);
  }

  // Quit and clean up listeners
  quit() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.loopId) cancelAnimationFrame(this.loopId);
    this.loopId = null;
    window.removeEventListener('keydown', this.boundKeyPress);
    window.removeEventListener('resize', this.boundResize);
  }

  // Setup initial variables per game mode
  setupGameParameters() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    this.spawnTimer = 0;

    // Generate space stars background
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: 0.5 + Math.random() * 2,
        size: 0.8 + Math.random() * 1.8,
        alpha: 0.3 + Math.random() * 0.7
      });
    }

    if (this.activeGameType === 'zombie') {
      this.zombieDist = 60;
      this.playerDist = W * 0.45;
      this.spawnZombieWord();
    } 
    else if (this.activeGameType === 'falling') {
      this.spawnFallingWord();
      this.spawnFallingWord();
    } 
    else if (this.activeGameType === 'spaceshooter') {
      this.spawnShooterEnemy();
      this.spawnShooterEnemy();
    } 
    else if (this.activeGameType === 'boss') {
      this.boss = {
        hp: 1000,
        maxHp: 1000,
        laserCharge: 0,
        state: 'attack', // 'attack' or 'defense'
        eyeColor: '#ff0055'
      };
      this.spawnBossWord('attack');
    }
    else if (this.activeGameType === 'cyberrunner') {
      this.runnerPlayerY = H - 90;
      this.runnerJumpVelocity = 0;
      this.spawnRunnerObstacle();
    }
    else if (this.activeGameType === 'hackerescape') {
      this.hackerNode = 1;
      this.hackerTrace = 0;
      this.spawnHackerWord();
    }

    this.updateHUD();
  }

  // Spawners for each game mode
  spawnZombieWord() {
    const text = this.getRandomWord(4, 7);
    this.activeWords = [{
      id: ++this.wordIdCounter,
      text: text,
      x: this.playerDist,
      y: this.canvas.height - 130
    }];
    this.currentTypedInput = '';
  }

  spawnFallingWord() {
    const W = this.canvas.width;
    const text = this.getRandomWord(4, 7);
    const padding = 120;
    const x = padding + Math.random() * (W - padding * 2);
    this.activeWords.push({
      id: ++this.wordIdCounter,
      text: text,
      x: x,
      y: -25 - (Math.random() * 30),
      speed: 0.65 + (this.score / 4000)
    });
  }

  spawnShooterEnemy() {
    const W = this.canvas.width;
    const text = this.getRandomWord(4, 7);
    const padding = 140;
    const x = padding + Math.random() * (W - padding * 2);
    this.activeWords.push({
      id: ++this.wordIdCounter,
      text: text,
      x: x,
      y: -30 - (Math.random() * 40),
      speed: 0.55 + (this.score / 5000),
      color: '#9b30ff'
    });
  }

  spawnBossWord(type = 'attack') {
    const W = this.canvas.width;
    let text;
    if (type === 'defense') {
      text = 'shield';
    } else {
      const bossVocab = ['plasma', 'overclock', 'rocket', 'quantum', 'strike', 'ionize', 'vortex', 'missile', 'blast', 'laser'];
      text = bossVocab[Math.floor(Math.random() * bossVocab.length)];
    }
    this.activeWords = [{
      id: ++this.wordIdCounter,
      text: text,
      x: W / 2,
      y: this.canvas.height - 110,
      isShield: (type === 'defense')
    }];
    this.currentTypedInput = '';
  }

  spawnRunnerObstacle() {
    const W = this.canvas.width;
    const parkourWords = ['jump', 'slide', 'dash', 'vault', 'phase', 'warp', 'blink', 'leap'];
    const text = parkourWords[Math.floor(Math.random() * parkourWords.length)];
    this.runnerObstacle = {
      id: ++this.wordIdCounter,
      text: text,
      x: W + 50,
      speed: 2.2 + (this.score / 3000),
      width: 40,
      cleared: false
    };
    this.currentTypedInput = '';
  }

  spawnHackerWord() {
    const hackerLines = [
      'bypass.proxy', 'sudo.override', 'crypto.decrypt', 'inject.payload',
      'disable.firewall', 'root.access', 'neural.dump', 'packet.sniff'
    ];
    const text = hackerLines[(this.hackerNode - 1) % hackerLines.length] || this.getRandomWord(5, 8);
    this.activeWords = [{
      id: ++this.wordIdCounter,
      text: text,
      x: this.canvas.width / 2,
      y: this.canvas.height / 2 + 10
    }];
    this.currentTypedInput = '';
  }

  // Master frame loop with delta-time
  tick() {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    if (!this.isPaused) {
      this.update(dt);
    }
    this.draw();

    this.loopId = requestAnimationFrame(() => this.tick());
  }

  // Master keyboard handler
  handleKeyPress(e) {
    if (!this.isRunning) return;

    // Pause toggle
    if (e.key === 'Escape') {
      this.isPaused = !this.isPaused;
      return;
    }

    if (this.isPaused) return;

    // Ignore Tab, Enter, Alt, Ctrl, Shift, CapsLock, Arrow keys, etc.
    if (e.key === 'Tab' || e.key === 'Enter') return;
    if (e.key.length > 1 && e.key !== 'Backspace') return;

    e.preventDefault();

    // 1. Backspace: delete last character
    if (e.key === 'Backspace') {
      if (this.currentTypedInput.length > 0) {
        this.currentTypedInput = this.currentTypedInput.slice(0, -1);
        if (window.Sound) window.Sound.playKeystrokeClick();
      }
      return;
    }

    const key = e.key.toLowerCase();

    // Route to active game mode handler
    switch (this.activeGameType) {
      case 'zombie':
        this.handleZombieKey(key);
        break;
      case 'falling':
        this.handleFallingKey(key);
        break;
      case 'spaceshooter':
        this.handleShooterKey(key);
        break;
      case 'boss':
        this.handleBossKey(key);
        break;
      case 'cyberrunner':
        this.handleRunnerKey(key);
        break;
      case 'hackerescape':
        this.handleHackerKey(key);
        break;
    }
  }

  // --- Game-specific Key Handlers ---

  handleZombieKey(key) {
    const activeWord = this.activeWords[0];
    if (!activeWord) return;

    const nextChar = activeWord.text[this.currentTypedInput.length];
    if (key === nextChar) {
      this.currentTypedInput += key;
      this.playerDist = Math.min(this.canvas.width - 70, this.playerDist + 12);
      this.spawnHitParticles(activeWord.x, activeWord.y, '#00f0ff');
      if (window.Sound) window.Sound.playKeystrokeClick();

      // Check full word match
      if (this.currentTypedInput === activeWord.text) {
        this.score += activeWord.text.length * 25;
        this.combo++;
        this.playerDist = Math.min(this.canvas.width - 60, this.playerDist + 85);
        this.spawnExplosion(activeWord.x, activeWord.y, '#00ff66');
        if (window.Sound) window.Sound.playSuccessBell();
        this.spawnZombieWord();
      }
    } else {
      this.triggerMistake();
      this.zombieDist += 10; // Zombie surges slightly on error
    }
  }

  handleFallingKey(key) {
    // If not targeting, find matching falling word
    if (!this.targetWord) {
      const candidates = this.activeWords.filter(w => w.text[0] === key);
      if (candidates.length > 0) {
        // Pick lowest (closest to laser)
        candidates.sort((a, b) => b.y - a.y);
        this.targetWord = candidates[0];
        this.currentTypedInput = key;
        this.fireDefenseLaser(this.targetWord);
        if (window.Sound) window.Sound.playKeystrokeClick();
      } else {
        this.triggerMistake();
      }
    } else {
      const nextChar = this.targetWord.text[this.currentTypedInput.length];
      if (key === nextChar) {
        this.currentTypedInput += key;
        this.fireDefenseLaser(this.targetWord);
        this.spawnHitParticles(this.targetWord.x, this.targetWord.y, '#00f0ff');
        if (window.Sound) window.Sound.playKeystrokeClick();

        if (this.currentTypedInput === this.targetWord.text) {
          this.score += this.targetWord.text.length * 30;
          this.combo++;
          this.spawnExplosion(this.targetWord.x, this.targetWord.y, '#00f0ff');
          this.activeWords = this.activeWords.filter(w => w.id !== this.targetWord.id);
          this.targetWord = null;
          this.currentTypedInput = '';
          if (window.Sound) window.Sound.playSuccessBell();
        }
      } else {
        this.triggerMistake();
      }
    }
  }

  handleShooterKey(key) {
    if (!this.targetWord) {
      const candidates = this.activeWords.filter(w => w.text[0] === key);
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.y - a.y);
        this.targetWord = candidates[0];
        this.currentTypedInput = key;
        this.fireShipLaser(this.targetWord);
        if (window.Sound) window.Sound.playKeystrokeClick();
      } else {
        this.triggerMistake();
      }
    } else {
      const nextChar = this.targetWord.text[this.currentTypedInput.length];
      if (key === nextChar) {
        this.currentTypedInput += key;
        this.fireShipLaser(this.targetWord);
        this.spawnHitParticles(this.targetWord.x, this.targetWord.y, '#9b30ff');
        if (window.Sound) window.Sound.playKeystrokeClick();

        if (this.currentTypedInput === this.targetWord.text) {
          this.score += this.targetWord.text.length * 35;
          this.combo++;
          // Launch heavy homing torpedo
          this.spawnTorpedo(this.targetWord);
          this.activeWords = this.activeWords.filter(w => w.id !== this.targetWord.id);
          this.targetWord = null;
          this.currentTypedInput = '';
          if (window.Sound) window.Sound.playSuccessBell();
        }
      } else {
        this.triggerMistake();
      }
    }
  }

  handleBossKey(key) {
    const activeWord = this.activeWords[0];
    if (!activeWord) return;

    const nextChar = activeWord.text[this.currentTypedInput.length];
    if (key === nextChar) {
      this.currentTypedInput += key;
      this.spawnHitParticles(activeWord.x, activeWord.y, activeWord.isShield ? '#00ff66' : '#ffaa00');
      if (window.Sound) window.Sound.playKeystrokeClick();

      if (this.currentTypedInput === activeWord.text) {
        if (activeWord.isShield) {
          // Shield defused boss death ray!
          this.boss.laserCharge = 0;
          this.boss.state = 'attack';
          this.spawnExplosion(this.canvas.width / 2, this.canvas.height - 60, '#00ff66');
          this.score += 250;
          if (window.Sound) window.Sound.playSuccessBell();
          this.spawnBossWord('attack');
        } else {
          // Direct missile attack on boss
          this.fireBossMissile();
          this.score += 200;
          this.boss.hp = Math.max(0, this.boss.hp - 100);
          if (this.boss.hp <= 0) {
            this.score += 5000;
            this.victoryEnd();
            return;
          }
          if (window.Sound) window.Sound.playSuccessBell();
          this.spawnBossWord('attack');
        }
      }
    } else {
      this.triggerMistake();
      if (this.boss) this.boss.laserCharge = Math.min(100, this.boss.laserCharge + 5);
    }
  }

  handleRunnerKey(key) {
    if (!this.runnerObstacle) return;

    const nextChar = this.runnerObstacle.text[this.currentTypedInput.length];
    if (key === nextChar) {
      this.currentTypedInput += key;
      if (window.Sound) window.Sound.playKeystrokeClick();

      if (this.currentTypedInput === this.runnerObstacle.text) {
        // Vault / Jump over obstacle!
        this.score += 150;
        this.combo++;
        this.runnerObstacle.cleared = true;
        this.runnerJumpVelocity = -8;
        this.spawnExplosion(this.runnerObstacle.x, this.canvas.height - 90, '#00ff66');
        if (window.Sound) window.Sound.playSuccessBell();
        this.currentTypedInput = '';
      }
    } else {
      this.triggerMistake();
    }
  }

  handleHackerKey(key) {
    const activeWord = this.activeWords[0];
    if (!activeWord) return;

    const nextChar = activeWord.text[this.currentTypedInput.length];
    if (key === nextChar) {
      this.currentTypedInput += key;
      this.spawnHitParticles(activeWord.x, activeWord.y, '#00ff66');
      if (window.Sound) window.Sound.playKeystrokeClick();

      if (this.currentTypedInput === activeWord.text) {
        this.score += 300;
        this.hackerNode++;
        this.hackerTrace = Math.max(0, this.hackerTrace - 15);
        this.spawnExplosion(activeWord.x, activeWord.y, '#00ff66');
        if (window.Sound) window.Sound.playSuccessBell();

        if (this.hackerNode > 5) {
          this.score += 4000;
          this.victoryEnd();
        } else {
          this.spawnHackerWord();
        }
      }
    } else {
      this.triggerMistake();
      this.hackerTrace = Math.min(100, this.hackerTrace + 6);
    }
  }

  // Trigger mistake feedback (shakes word, does NOT erase correct characters!)
  triggerMistake() {
    this.errorShakeTimer = 0.15; // 150ms shake
    this.combo = 0;
    if (window.Sound) window.Sound.playErrorBuzz();
  }

  // Visual Lasers & Projectiles
  fireDefenseLaser(target) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    this.bullets.push({
      x: W / 2,
      y: H - 35,
      targetX: target.x,
      targetY: target.y,
      color: '#00f0ff',
      progress: 0,
      speed: 16
    });
  }

  fireShipLaser(target) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    // Twin lasers from wings
    this.bullets.push({
      x: W / 2 - 12,
      y: H - 55,
      targetX: target.x - 6,
      targetY: target.y,
      color: '#9b30ff',
      progress: 0,
      speed: 18
    });
    this.bullets.push({
      x: W / 2 + 12,
      y: H - 55,
      targetX: target.x + 6,
      targetY: target.y,
      color: '#9b30ff',
      progress: 0,
      speed: 18
    });
  }

  spawnTorpedo(target) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    this.bullets.push({
      x: W / 2,
      y: H - 50,
      targetX: target.x,
      targetY: target.y,
      color: '#ffaa00',
      progress: 0,
      speed: 10,
      isHeavy: true
    });
  }

  fireBossMissile() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    this.bullets.push({
      x: W / 2,
      y: H - 60,
      targetX: W / 2 + (Math.random() - 0.5) * 80,
      targetY: 80,
      color: '#ffaa00',
      progress: 0,
      speed: 12,
      isHeavy: true
    });
  }

  // --- Physics & Entity Updates ---
  update(dt) {
    const W = this.canvas.width;
    const H = this.canvas.height;

    // Timers & Shake
    if (this.errorShakeTimer > 0) this.errorShakeTimer -= dt;
    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 20);

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= dt * 2.2;
      if (p.alpha <= 0) this.particles.splice(i, 1);
    }

    // Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.progress += dt * (b.speed || 14);
      b.currX = b.x + (b.targetX - b.x) * Math.min(1, b.progress);
      b.currY = b.y + (b.targetY - b.y) * Math.min(1, b.progress);

      if (b.progress >= 1) {
        this.spawnExplosion(b.targetX, b.targetY, b.color, b.isHeavy ? 20 : 6);
        this.bullets.splice(i, 1);
      }
    }

    // Update Stars
    this.stars.forEach(s => {
      s.y += s.speed;
      if (s.y > H) {
        s.y = 0;
        s.x = Math.random() * W;
      }
    });

    // Update Mode-specific physics
    switch (this.activeGameType) {
      case 'zombie':
        this.updateZombieMode(dt);
        break;
      case 'falling':
        this.updateFallingMode(dt);
        break;
      case 'spaceshooter':
        this.updateShooterMode(dt);
        break;
      case 'boss':
        this.updateBossMode(dt);
        break;
      case 'cyberrunner':
        this.updateRunnerMode(dt);
        break;
      case 'hackerescape':
        this.updateHackerMode(dt);
        break;
    }

    this.updateHUD();
  }

  updateZombieMode(dt) {
    const W = this.canvas.width;
    // Zombie moves towards player
    const zombieSpeed = 24 + (this.score / 250); // pixels per second
    this.zombieDist += zombieSpeed * dt;

    // Player slow baseline jog
    this.playerDist = Math.max(120, this.playerDist - 8 * dt);

    // Update active word position to follow player
    if (this.activeWords[0]) {
      this.activeWords[0].x = this.playerDist;
    }

    // Check if player reached safe edge -> stage clear bonus!
    if (this.playerDist >= W - 80) {
      this.score += 500;
      this.playerDist = W * 0.45;
      this.zombieDist = Math.max(40, this.zombieDist - 120);
      this.spawnExplosion(W / 2, this.canvas.height / 2, '#00ff66', 30);
      if (window.Sound) window.Sound.playSuccessBell();
    }

    // Check game over
    if (this.zombieDist >= this.playerDist - 25) {
      this.gameOverEnd("Caught by Cyber-Zombie!");
    }
  }

  updateFallingMode(dt) {
    const H = this.canvas.height;
    this.spawnTimer += dt;
    if (this.spawnTimer > 2.0 && this.activeWords.length < 5) {
      this.spawnFallingWord();
      this.spawnTimer = 0;
    }

    for (let i = this.activeWords.length - 1; i >= 0; i--) {
      const w = this.activeWords[i];
      w.y += w.speed * dt * 60;

      // Laser breach line
      if (w.y >= H - 45) {
        this.playerHp = Math.max(0, this.playerHp - 20);
        this.screenShake = 6;
        this.spawnExplosion(w.x, H - 45, '#ff0055', 18);
        if (window.Sound) window.Sound.playErrorBuzz();

        // If target was this word, reset target
        if (this.targetWord && this.targetWord.id === w.id) {
          this.targetWord = null;
          this.currentTypedInput = '';
        }

        this.activeWords.splice(i, 1);

        if (this.playerHp <= 0) {
          this.gameOverEnd("Laser Defense Barrier Breached!");
        }
      }
    }
  }

  updateShooterMode(dt) {
    const H = this.canvas.height;
    this.spawnTimer += dt;
    if (this.spawnTimer > 2.2 && this.activeWords.length < 5) {
      this.spawnShooterEnemy();
      this.spawnTimer = 0;
    }

    for (let i = this.activeWords.length - 1; i >= 0; i--) {
      const w = this.activeWords[i];
      w.y += w.speed * dt * 60;

      if (w.y >= H - 65) {
        this.playerHp = Math.max(0, this.playerHp - 20);
        this.screenShake = 6;
        this.spawnExplosion(w.x, H - 60, '#ff0055', 20);
        if (window.Sound) window.Sound.playErrorBuzz();

        if (this.targetWord && this.targetWord.id === w.id) {
          this.targetWord = null;
          this.currentTypedInput = '';
        }

        this.activeWords.splice(i, 1);

        if (this.playerHp <= 0) {
          this.gameOverEnd("Interceptor Starship Destroyed!");
        }
      }
    }
  }

  updateBossMode(dt) {
    if (!this.boss) return;

    // Boss laser charge builds up
    this.boss.laserCharge += dt * 14;

    if (this.boss.laserCharge >= 65 && this.boss.state !== 'defense') {
      this.boss.state = 'defense';
      this.spawnBossWord('defense');
    }

    if (this.boss.laserCharge >= 100) {
      // Boss unleashes laser blast!
      this.playerHp = Math.max(0, this.playerHp - 30);
      this.boss.laserCharge = 0;
      this.boss.state = 'attack';
      this.screenShake = 12;
      this.spawnExplosion(this.canvas.width / 2, this.canvas.height - 60, '#ff0055', 25);
      if (window.Sound) window.Sound.playErrorBuzz();
      this.spawnBossWord('attack');

      if (this.playerHp <= 0) {
        this.gameOverEnd("Obliterated by Megabot Orbital Ray!");
      }
    }
  }

  updateRunnerMode(dt) {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const groundY = H - 90;

    // Jump physics
    if (this.runnerPlayerY < groundY || this.runnerJumpVelocity !== 0) {
      this.runnerPlayerY += this.runnerJumpVelocity;
      this.runnerJumpVelocity += 22 * dt; // gravity
      if (this.runnerPlayerY >= groundY) {
        this.runnerPlayerY = groundY;
        this.runnerJumpVelocity = 0;
      }
    }

    // Move obstacle
    if (this.runnerObstacle) {
      this.runnerObstacle.x -= this.runnerObstacle.speed * dt * 60;

      // Check collision
      const playerX = 140;
      if (!this.runnerObstacle.cleared && Math.abs(this.runnerObstacle.x - playerX) < 30) {
        this.playerHp = Math.max(0, this.playerHp - 25);
        this.screenShake = 8;
        this.spawnExplosion(playerX, groundY, '#ff0055', 18);
        this.runnerObstacle.cleared = true;
        if (window.Sound) window.Sound.playErrorBuzz();

        if (this.playerHp <= 0) {
          this.gameOverEnd("Tripped by Cyber-Laser Barrier!");
          return;
        }
      }

      // Despawn & spawn next obstacle
      if (this.runnerObstacle.x < -60) {
        this.spawnRunnerObstacle();
      }
    }
  }

  updateHackerMode(dt) {
    // Trace slowly increases
    this.hackerTrace += dt * 3.2;

    if (this.hackerTrace >= 100) {
      this.gameOverEnd("Trace at 100% // Signal Intercepted!");
    }
  }

  // Update DOM HUD metrics
  updateHUD() {
    const scoreEl = document.getElementById('game-hud-score');
    const lifeEl = document.getElementById('game-hud-life');
    if (scoreEl) scoreEl.textContent = String(this.score).padStart(5, '0');
    if (lifeEl) {
      if (this.activeGameType === 'hackerescape') {
        lifeEl.textContent = `TRACE ${Math.min(100, Math.round(this.hackerTrace))}%`;
        lifeEl.className = 'text-xl font-bold text-amber-500';
      } else {
        lifeEl.textContent = `${this.playerHp}%`;
        lifeEl.className = this.playerHp > 40 ? 'text-xl font-bold text-greenGlow' : 'text-xl font-bold text-redGlow';
      }
    }
  }

  // --- Rendering Loop ---
  draw() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const ctx = this.ctx;

    ctx.save();

    // Screen Shake Offset
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(sx, sy);
    }

    ctx.clearRect(0, 0, W, H);

    // 1. Draw Starfield & Grid Lines
    this.drawBackground(ctx, W, H);

    // 2. Draw Bullets & Lasers
    this.drawBullets(ctx);

    // 3. Draw Game Specific Layers
    switch (this.activeGameType) {
      case 'zombie':
        this.drawZombieMode(ctx, W, H);
        break;
      case 'falling':
        this.drawFallingMode(ctx, W, H);
        break;
      case 'spaceshooter':
        this.drawShooterMode(ctx, W, H);
        break;
      case 'boss':
        this.drawBossMode(ctx, W, H);
        break;
      case 'cyberrunner':
        this.drawRunnerMode(ctx, W, H);
        break;
      case 'hackerescape':
        this.drawHackerMode(ctx, W, H);
        break;
    }

    // 4. Draw Explosions & Sparks
    this.drawParticles(ctx);

    // 5. Draw Pause Overlay
    if (this.isPaused) {
      ctx.fillStyle = 'rgba(4, 4, 8, 0.75)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#00f0ff';
      ctx.font = '900 24px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED // PRESS ESC TO RESUME', W / 2, H / 2);
    }

    ctx.restore();
  }

  drawBackground(ctx, W, H) {
    // Stars
    ctx.fillStyle = '#ffffff';
    this.stars.forEach(s => {
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Perspective Grid floor
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 45) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
  }

  drawBullets(ctx) {
    this.bullets.forEach(b => {
      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = b.color;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.currX || b.x, b.currY || b.y, b.isHeavy ? 6 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawParticles(ctx) {
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  // --- Specific Mode Renderers ---

  drawZombieMode(ctx, W, H) {
    const groundY = H - 85;

    // Ground line
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();

    // Distance HUD bar at top
    this.drawDistanceTracker(ctx, W, 25, this.zombieDist, this.playerDist, W - 80);

    // Zombie Avatar (Red bio-mechanical terror)
    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#ff0055';
    ctx.fillStyle = '#ff0055';
    ctx.beginPath();
    ctx.arc(this.zombieDist, groundY - 30, 16, 0, Math.PI * 2); // head
    ctx.fill();
    ctx.fillRect(this.zombieDist - 8, groundY - 26, 16, 26); // torso
    // Glowing red eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.zombieDist + 5, groundY - 32, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Player Avatar (Cyan neon runner)
    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#00ff66';
    ctx.fillStyle = '#00ff66';
    ctx.beginPath();
    ctx.arc(this.playerDist, groundY - 30, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(this.playerDist - 7, groundY - 26, 14, 26);
    // Cyan Visor
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(this.playerDist + 2, groundY - 34, 7, 5);
    ctx.restore();

    // Active Word Card (Always highlighted!)
    if (this.activeWords[0]) {
      this.drawWordBox(ctx, this.activeWords[0], true);
    }
  }

  drawFallingMode(ctx, W, H) {
    // Defensive Laser Fence Line
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ff0055';
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, H - 45);
    ctx.lineTo(W, H - 45);
    ctx.stroke();

    // Defense Turret in Center
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(W / 2, H - 25, 20, Math.PI, 0);
    ctx.fill();
    ctx.restore();

    // Falling Word Pods
    this.activeWords.forEach(w => {
      const isTarget = this.targetWord && this.targetWord.id === w.id;
      this.drawWordBox(ctx, w, isTarget);
    });
  }

  drawShooterMode(ctx, W, H) {
    // Starfighter at bottom center
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#00f0ff';
    ctx.fillStyle = '#00f0ff';
    const cx = W / 2;
    const cy = H - 55;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 20); // nose
    ctx.lineTo(cx - 22, cy + 18); // left wing
    ctx.lineTo(cx, cy + 10);
    ctx.lineTo(cx + 22, cy + 18); // right wing
    ctx.closePath();
    ctx.fill();

    // Thruster engine fire
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy + 12);
    ctx.lineTo(cx, cy + 26 + (Math.random() * 6));
    ctx.lineTo(cx + 6, cy + 12);
    ctx.fill();
    ctx.restore();

    // Enemy Gunships
    this.activeWords.forEach(w => {
      const isTarget = this.targetWord && this.targetWord.id === w.id;
      
      // Draw Alien Craft Hull
      ctx.save();
      ctx.fillStyle = isTarget ? '#9b30ff' : '#475569';
      ctx.shadowBlur = isTarget ? 14 : 4;
      ctx.shadowColor = '#9b30ff';
      ctx.beginPath();
      ctx.moveTo(w.x, w.y + 20);
      ctx.lineTo(w.x - 20, w.y - 10);
      ctx.lineTo(w.x + 20, w.y - 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      this.drawWordBox(ctx, w, isTarget);
    });
  }

  drawBossMode(ctx, W, H) {
    if (!this.boss) return;

    // Boss Mech Body (Top Center)
    const bx = W / 2;
    const by = 55;

    ctx.save();
    ctx.shadowBlur = 24;
    ctx.shadowColor = '#ff0055';
    ctx.fillStyle = '#1c0510';
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(bx - 100, by - 40);
    ctx.lineTo(bx - 130, by + 30);
    ctx.lineTo(bx + 130, by + 30);
    ctx.lineTo(bx + 100, by - 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing Boss Eye
    ctx.fillStyle = (this.boss.state === 'defense') ? '#ffaa00' : '#ff0055';
    ctx.beginPath();
    ctx.arc(bx, by, 12, 0, Math.PI * 2);
    ctx.fill();

    // Boss HP Bar
    const barW = 280;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bx - barW / 2, by + 40, barW, 9);
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(bx - barW / 2, by + 40, (this.boss.hp / this.boss.maxHp) * barW, 9);

    // Laser Charge Bar
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(bx - barW / 2, by + 52, (this.boss.laserCharge / 100) * barW, 4);
    ctx.restore();

    // Laser Charging Warning
    if (this.boss.state === 'defense') {
      ctx.save();
      ctx.fillStyle = '#ffd700';
      ctx.font = '700 13px "Space Grotesk"';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️ WARNING: DEATH RAY CHARGING! TYPE: [ S H I E L D ]', W / 2, H - 150);
      ctx.restore();
    }

    if (this.activeWords[0]) {
      this.drawWordBox(ctx, this.activeWords[0], true);
    }
  }

  drawRunnerMode(ctx, W, H) {
    const groundY = H - 90;

    // Ground Grid Line
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();

    // Player runner
    const px = 140;
    const py = this.runnerPlayerY;
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ff66';
    ctx.fillStyle = '#00ff66';
    ctx.beginPath();
    ctx.arc(px, py - 24, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(px - 6, py - 20, 12, 20);
    ctx.restore();

    // Runner Obstacle
    if (this.runnerObstacle) {
      const ox = this.runnerObstacle.x;
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.runnerObstacle.cleared ? '#00ff66' : '#ff0055';
      ctx.strokeStyle = this.runnerObstacle.cleared ? '#00ff66' : '#ff0055';
      ctx.lineWidth = 3;
      ctx.strokeRect(ox - 15, groundY - 45, 30, 45);
      ctx.restore();

      this.drawWordBox(ctx, { text: this.runnerObstacle.text, x: ox, y: groundY - 65 }, true);
    }
  }

  drawHackerMode(ctx, W, H) {
    // Matrix terminal screen
    ctx.save();
    ctx.fillStyle = '#00ff66';
    ctx.font = '700 14px "Space Grotesk", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`MAINFRAME SECURITY BREACH // NODE ${this.hackerNode} OF 5`, W / 2, 70);

    // Trace status bar
    const barW = 320;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(W / 2 - barW / 2, 95, barW, 10);
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(W / 2 - barW / 2, 95, (this.hackerTrace / 100) * barW, 10);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 11px "Space Grotesk"';
    ctx.fillText(`TRACE STATUS: ${Math.round(this.hackerTrace)}%`, W / 2, 125);
    ctx.restore();

    if (this.activeWords[0]) {
      this.drawWordBox(ctx, this.activeWords[0], true);
    }
  }

  // Draw Top Distance Progress Bar for Zombie Escape
  drawDistanceTracker(ctx, W, y, zombieX, playerX, finishX) {
    const barW = W - 160;
    const startX = 80;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(startX, y, barW, 8, 4);
    ctx.fill();
    ctx.stroke();

    // Map zombie position (0..finishX -> startX..startX+barW)
    const zNorm = Math.min(1, Math.max(0, zombieX / finishX));
    const pNorm = Math.min(1, Math.max(0, playerX / finishX));

    // Zombie dot (red)
    ctx.fillStyle = '#ff0055';
    ctx.beginPath();
    ctx.arc(startX + zNorm * barW, y + 4, 6, 0, Math.PI * 2);
    ctx.fill();

    // Player dot (cyan)
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.arc(startX + pNorm * barW, y + 4, 6, 0, Math.PI * 2);
    ctx.fill();

    // Labels
    ctx.font = '700 9px "Space Grotesk"';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText('🧟 ZOMBIE', startX, y - 5);
    ctx.textAlign = 'right';
    ctx.fillText('🏁 SAFE ZONE', startX + barW, y - 5);
    ctx.restore();
  }

  // --- Core Word Box Renderer ---
  drawWordBox(ctx, wordObj, isTarget = false) {
    if (!wordObj || !wordObj.text) return;

    ctx.save();

    // Apply error shake if active
    let shakeX = 0;
    if (isTarget && this.errorShakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * 8;
    }

    ctx.font = '700 14px "Space Grotesk", sans-serif';
    const textWidth = ctx.measureText(wordObj.text).width;
    const bw = textWidth + 24;
    const bh = 30;
    const bx = wordObj.x - bw / 2 + shakeX;
    const by = wordObj.y - bh / 2;

    // Card Background
    ctx.fillStyle = 'rgba(8, 10, 20, 0.92)';
    ctx.shadowBlur = isTarget ? 14 : 5;
    ctx.shadowColor = (this.errorShakeTimer > 0 && isTarget) 
      ? '#ff0055' 
      : (isTarget ? '#00f0ff' : (wordObj.isShield ? '#00ff66' : '#64748b'));
    
    ctx.strokeStyle = (this.errorShakeTimer > 0 && isTarget)
      ? '#ff0055'
      : (isTarget ? '#00f0ff' : (wordObj.isShield ? '#00ff66' : '#334155'));
    ctx.lineWidth = isTarget ? 2 : 1.2;

    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 8);
    ctx.fill();
    ctx.stroke();

    // Text Rendering
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const textStartX = bx + 12;

    if (isTarget && this.currentTypedInput.length > 0) {
      const typedLen = Math.min(this.currentTypedInput.length, wordObj.text.length);
      const typedText = wordObj.text.slice(0, typedLen);
      const currentChar = wordObj.text[typedLen] || '';
      const remainingText = wordObj.text.slice(typedLen + (currentChar ? 1 : 0));

      const typedW = ctx.measureText(typedText).width;
      const currentW = ctx.measureText(currentChar).width;

      // 1. Correctly typed portion: Glowing Neon Green/Cyan
      ctx.fillStyle = '#00ff66';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#00ff66';
      ctx.fillText(typedText, textStartX, wordObj.y);

      // 2. Active character to type: Pulsating Cyan Underline
      if (currentChar) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#00f0ff';
        ctx.fillText(currentChar, textStartX + typedW, wordObj.y);

        // Caret underline
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(textStartX + typedW, wordObj.y + 8);
        ctx.lineTo(textStartX + typedW + currentW, wordObj.y + 8);
        ctx.stroke();
      }

      // 3. Remaining characters: Crisp Light Slate
      if (remainingText) {
        ctx.fillStyle = '#94a3b8';
        ctx.shadowBlur = 0;
        ctx.fillText(remainingText, textStartX + typedW + currentW, wordObj.y);
      }
    } else {
      // Untargeted word: Clean Crisp Text
      ctx.fillStyle = isTarget ? '#ffffff' : '#cbd5e1';
      ctx.shadowBlur = isTarget ? 6 : 0;
      ctx.shadowColor = '#00f0ff';
      ctx.fillText(wordObj.text, textStartX, wordObj.y);
    }

    ctx.restore();
  }

  // --- Particles & FX ---
  spawnExplosion(tx, ty, color = '#00f0ff', count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x: tx,
        y: ty,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 2.5,
        color: color,
        alpha: 1.0
      });
    }
  }

  spawnHitParticles(tx, ty, color = '#00f0ff') {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.2;
      this.particles.push({
        x: tx,
        y: ty,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.2,
        color: color,
        alpha: 0.85
      });
    }
  }

  // --- Termination Handlers ---
  victoryEnd() {
    this.quit();

    if (window.Dashboard) {
      window.Dashboard.logGameRewards(this.score, 150, 50);
      window.Dashboard.showBlitzToast("VICTORY ACHIEVED!", `Arcade score: ${this.score}. Earned +150 XP & 50 Coins!`, "trophy");
    }

    const titleEl = document.getElementById('game-start-title');
    const descEl = document.getElementById('game-start-desc');
    const btnEl = document.getElementById('btn-start-loaded-game');
    const overlay = document.getElementById('game-start-overlay');

    if (titleEl) titleEl.textContent = "VICTORY ACHIEVED!";
    if (descEl) descEl.textContent = `Stage Completed! Final Score: ${this.score}. +150 XP & 50 Blitz-Coins awarded.`;
    if (btnEl) btnEl.textContent = "PLAY AGAIN";
    if (overlay) overlay.classList.remove('hidden');

    if (window.Sound && typeof window.Sound.playVictoryFanfare === 'function') {
      window.Sound.playVictoryFanfare();
    }
  }

  gameOverEnd(cause = "Mission Failed") {
    this.quit();

    if (window.Dashboard) {
      window.Dashboard.logGameRewards(this.score, 35, 10);
    }

    const titleEl = document.getElementById('game-start-title');
    const descEl = document.getElementById('game-start-desc');
    const btnEl = document.getElementById('btn-start-loaded-game');
    const overlay = document.getElementById('game-start-overlay');

    if (titleEl) titleEl.textContent = "SURVIVAL DEFEATED";
    if (descEl) descEl.textContent = `${cause} Final Score: ${this.score}. Earned +35 XP.`;
    if (btnEl) btnEl.textContent = "TRY AGAIN";
    if (overlay) overlay.classList.remove('hidden');

    if (window.Sound && typeof window.Sound.playDefeatSoundscape === 'function') {
      window.Sound.playDefeatSoundscape();
    }
  }
}

// Global Single Instance Export
const Games = new BlitzGames();
window.Games = Games;
