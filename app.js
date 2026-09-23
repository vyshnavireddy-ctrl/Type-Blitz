/* ==========================================
   TypeBlitz - Master Application Controller
   ========================================== */

// 1. Particle Background Canvas System
class ParticleBackground {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.mouse = { x: null, y: null, radius: 100 };
  }

  init() {
    this.canvas = document.getElementById('bg-particles');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.resize();
    
    // Spawn baseline particles
    const particleCount = Math.min(65, Math.floor((this.canvas.width * this.canvas.height) / 18000));
    this.particles = [];
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: 1 + Math.random() * 2,
        color: 'rgba(0, 240, 255, 0.25)'
      });
    }

    // Bind events
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener('mouseleave', () => {
      this.mouse.x = null;
      this.mouse.y = null;
    });

    this.animate();
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw grid lines
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.015)';
    this.ctx.lineWidth = 1;
    const gridSize = 45;
    for (let x = 0; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    // Render particles
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      // Bounce bounds
      if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

      // Mouse attraction forces
      if (this.mouse.x !== null) {
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < this.mouse.radius) {
          const force = (this.mouse.radius - dist) / this.mouse.radius;
          p.x += (dx / dist) * force * 0.5;
          p.y += (dy / dist) * force * 0.5;
        }
      }

      this.ctx.save();
      // Neon green or neon red theme colors
      let pColor = 'rgba(0, 240, 255, 0.25)';
      if (document.body.classList.contains('theme-matrix')) pColor = 'rgba(0, 255, 0, 0.25)';
      else if (document.body.classList.contains('theme-synthwave')) pColor = 'rgba(255, 0, 127, 0.25)';
      
      this.ctx.fillStyle = pColor;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    requestAnimationFrame(() => this.animate());
  }
}


// 2. Neon Cursor Trail Tracker
class CursorTrailTracker {
  constructor() {
    this.container = null;
    this.lastTime = 0;
  }

  init() {
    this.container = document.getElementById('cursor-trail-container');
    if (!this.container) return;

    window.addEventListener('mousemove', (e) => {
      const now = Date.now();
      if (now - this.lastTime > 30) { // throttle spawn
        this.spawnTrail(e.clientX, e.clientY);
        this.lastTime = now;
      }
    });
  }

  spawnTrail(x, y) {
    const dot = document.createElement('div');
    dot.className = 'cursor-trail';
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    
    // adjust colors depending on active themes
    let glowColor = '#00f0ff';
    if (document.body.classList.contains('theme-matrix')) glowColor = '#00ff00';
    else if (document.body.classList.contains('theme-synthwave')) glowColor = '#ff007f';
    
    dot.style.boxShadow = `0 0 8px ${glowColor}`;
    dot.style.background = glowColor;

    this.container.appendChild(dot);
    
    // remove element after animation completes
    setTimeout(() => dot.remove(), 400);
  }
}


// 3. Master Boot & Page Router
window.addEventListener('DOMContentLoaded', () => {
  // A. Boot Progression Scans (Splash screen terminal lines)
  const steps = [
    { id: 'terminal-line-1', delay: 400 },
    { id: 'terminal-line-2', delay: 1000 },
    { id: 'terminal-line-3', delay: 1600 },
    { id: 'terminal-line-4', delay: 2200 },
    { id: 'terminal-line-5', delay: 2800 }
  ];

  steps.forEach(step => {
    setTimeout(() => {
      const line = document.getElementById(step.id);
      if (line) line.classList.remove('hidden');
    }, step.delay);
  });

  // Reveal ENTER CTA button
  setTimeout(() => {
    const btn = document.getElementById('btn-enter');
    if (btn) btn.classList.remove('opacity-0', 'translate-y-4');
  }, 3200);

  // Enter button gesture trigger
  document.getElementById('btn-enter').addEventListener('click', () => {
    // Start audio ctx
    if (window.Sound) {
      window.Sound.init();
      window.Sound.playKeystrokeClick();
    }
    
    // Fade out splash
    const splash = document.getElementById('splash-screen');
    splash.classList.add('opacity-0', 'scale-105', 'pointer-events-none');
    
    // Fade in app
    const app = document.getElementById('main-app');
    app.classList.remove('opacity-0');
    app.classList.add('opacity-100');

    // Run dynamic particles
    const bg = new ParticleBackground();
    bg.init();

    // Run cursor trail
    const trails = new CursorTrailTracker();
    trails.init();

    // Load user databases
    if (window.Dashboard) {
      window.Dashboard.init();
    }

    // Load initial typing texts
    if (window.Engine) {
      window.Engine.reset();
    }

    // Spawn mini typist loops
    startMiniSimulatorLoop();
  });

  // B. Global Sidebar Nav Hover Ticks
  const sidebarButtons = document.querySelectorAll('.sidebar-btn');
  sidebarButtons.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      if (window.Sound) window.Sound.playHoverTick();
    });
  });

  // C. Global Keystrokes Redirect Listeners
  window.addEventListener('keydown', (e) => {
    // Focus speed test textbox on any standard character press
    const activePage = document.querySelector('.page-view:not(.hidden)');
    if (!activePage) return;

    const pageId = activePage.id;
    
    // Redirect
    if (pageId === 'page-test') {
      const overlay = document.getElementById('test-focus-overlay');
      if (overlay && !overlay.classList.contains('hidden')) {
        // focus text box container
        const txtCon = document.getElementById('typing-textbox-container');
        if (txtCon) txtCon.focus();
      }

      // TAB + ENTER quick resets
      if (e.key === 'Enter' && e.altKey) {
        e.preventDefault();
        resetTypingTest();
        return;
      }
      
      // forward keypresses
      if (document.activeElement === document.getElementById('typing-textbox-container')) {
        window.Engine.handleKeystroke(e.key);
      }
    } 
    else if (pageId === 'page-multiplayer') {
      if (document.activeElement === document.getElementById('mp-textbox-container')) {
        window.Multiplayer.handleKeyPress(e);
      }
    }
  });

  // Ensure textbox container click triggers cursor focus
  document.getElementById('typing-textbox-container').addEventListener('click', () => {
    document.getElementById('typing-textbox-container').focus();
    const overlay = document.getElementById('test-focus-overlay');
    if (overlay) overlay.classList.add('hidden');
  });

  document.getElementById('mp-textbox-container').addEventListener('click', () => {
    document.getElementById('mp-textbox-container').focus();
  });
});


// 4. Page View Swapper
function switchPage(pageId) {
  // Terminate active engine state loops
  if (window.Engine) window.Engine.reset();
  if (window.Games) window.Games.quit();
  if (window.Multiplayer) window.Multiplayer.finishRace();

  // Hide HUD in games if moving away
  document.getElementById('game-active-hud').classList.add('hidden');
  document.getElementById('game-selector-view').classList.remove('hidden');

  // Hide all sections
  const views = document.querySelectorAll('.page-view');
  views.forEach(v => v.classList.add('hidden'));

  // Reveal target section
  const target = document.getElementById(`page-${pageId}`);
  if (target) target.classList.remove('hidden');

  // Update top bar text title
  const titleMap = {
    'home': 'Esport Command Center',
    'test': 'Speed Test Laboratory',
    'practice': 'Tactile Training Ground',
    'games': 'Arcade Arena Mode',
    'multiplayer': 'Competitive Matching Arena',
    'leaderboard': 'Global Champions High Score',
    'shop': 'Customization Shop',
    'settings': 'Matrix System Configs',
    'profile': 'Telemetry Pilot Profile',
    'admin': 'Supreme System Debugger Console',
    'aicoach': 'AI Mentor Intelligence Center',
    'clans': 'Cooperative Cybernetic Guilds',
    'battlepass': 'Tactile Battle Pass Overdrive'
  };
  document.getElementById('header-page-title').textContent = titleMap[pageId] || 'Command Center';

  // Toggle active class on sidebar buttons
  const buttons = document.querySelectorAll('#sidebar-nav .sidebar-btn, aside .sidebar-btn');
  buttons.forEach(btn => {
    const pageAttr = btn.getAttribute('data-page');
    if (pageAttr === pageId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Sound click welcome
  if (window.Sound) {
    window.Sound.playKeystrokeClick();
  }

  // Recreate Lucide SVGs
  if (window.lucide) {
    window.lucide.createIcons();
  }
}


// 5. Sound audio controller
function toggleMuteState() {
  if (!window.Sound) return;
  const isMuted = window.Sound.toggleMute();
  
  // Update icons immediately
  const icons = [document.getElementById('sound-icon'), document.getElementById('test-sound-toggle-icon')];
  const text = document.getElementById('sound-text');

  icons.forEach(icon => {
    if (icon) {
      icon.setAttribute('data-lucide', isMuted ? 'volume-x' : 'volume-2');
    }
  });
  
  if (text) {
    text.textContent = isMuted ? 'Sound: MUTED' : 'Sound: ON';
  }

  if (window.lucide) window.lucide.createIcons();
}


// 6. Practice Lessons Launcher
function startPracticeLesson(lessonId) {
  // Swap page
  switchPage('test');
  
  if (lessonId === 'homerow') {
    window.Engine.wordsList = ['asdf', 'jkl;', 'fdsa', 'jkl;', 'asdfjkl;', 'jkl;asdf', 'a;sldkfj'];
  } else if (lessonId === 'numbers') {
    window.Engine.wordsList = NUMBER_WORDS;
  } else if (lessonId === 'coding') {
    window.Engine.wordsList = CODE_WORDS;
  }
  
  window.Engine.reset();
  
  // close overlays directly
  const overlay = document.getElementById('test-focus-overlay');
  if (overlay) overlay.classList.add('hidden');
  document.getElementById('typing-textbox-container').focus();
}

function startAIWeakDrill() {
  switchPage('test');
  // Dynamic weakness loops based on common letters
  window.Engine.wordsList = ['quaver', 'pixel', 'zodiac', 'flux', 'jockey', 'blitz', 'quartz', 'hex', 'matrix', 'wpm'];
  window.Engine.reset();
  
  const overlay = document.getElementById('test-focus-overlay');
  if (overlay) overlay.classList.add('hidden');
  document.getElementById('typing-textbox-container').focus();
}

function uploadCustomPractice() {
  const text = document.getElementById('practice-custom-text').value.trim();
  if (text === '') {
    if (window.Dashboard) {
      window.Dashboard.showBlitzToast("Custom upload error", "Uploader field cannot be blank!", "alert-triangle");
    }
    return;
  }

  switchPage('test');
  window.Engine.wordsList = text.split(/\s+/);
  window.Engine.reset();

  const overlay = document.getElementById('test-focus-overlay');
  if (overlay) overlay.classList.add('hidden');
  document.getElementById('typing-textbox-container').focus();
}


// 7. Interactive Arcade Launcher
function launchArcadeGame(gameType) {
  document.getElementById('game-selector-view').classList.add('hidden');
  document.getElementById('game-active-hud').classList.remove('hidden');

  // Load game specifics
  const titles = {
    'zombie': 'ZOMBIE ESCAPE SURVIVAL',
    'falling': 'HORIZON DEFENSE LASER FENCE',
    'spaceshooter': 'INTERCEPTOR SPACE SHOOTER',
    'boss': 'MEGABOT BOSS FIGHT',
    'cyberrunner': 'CYBER RUNNER NEON PARKOUR',
    'hackerescape': 'HACKER ESCAPE TERMINAL BREACH'
  };

  const descs = {
    'zombie': 'A cyber-zombie horde is sprinting closer! Type target words to fire your nitro sprint thrusters. Each correct letter gives speed boosts!',
    'falling': 'Incoming data pods are falling from the cloud! Type words to target defense turrets and blast them before they cross the laser line.',
    'spaceshooter': 'Command the orbital starfighter! Type enemy words to lock targeting crosshairs and launch homing quantum torpedoes.',
    'boss': 'Engage Megabot Alpha! Type attack phrases to launch rockets, and type SHIELD when the warning alarm sounds to deflect death rays!',
    'cyberrunner': 'High-speed rooftop parkour! Obstacles are rushing from the right. Type the parkour words to jump and phase across barriers!',
    'hackerescape': 'Corporate trace program initiated! Crack 5 mainframe security nodes by typing decryption algorithms before trace reaches 100%!'
  };

  document.getElementById('game-hud-title').textContent = titles[gameType] || 'ARCADE ARENA';
  
  // Set overlay
  document.getElementById('game-start-title').textContent = titles[gameType] || 'ARCADE ARENA';
  document.getElementById('game-start-desc').textContent = descs[gameType] || "Prepare your fingers. Press button to ignite plasma reactors.";
  document.getElementById('btn-start-loaded-game').textContent = "IGNITE ENGINES";
  document.getElementById('game-start-overlay').classList.remove('hidden');

  // Click start game
  document.getElementById('btn-start-loaded-game').onclick = () => {
    document.getElementById('game-start-overlay').classList.add('hidden');
    if (window.Games) {
      window.Games.init(gameType);
    }
  };
}

function quitActiveArcadeGame() {
  if (window.Games) window.Games.quit();
  switchPage('games');
}


// 8. Multiplayer Launcher
function triggerMPMatchmaking() {
  if (window.Multiplayer) {
    window.Multiplayer.startMatchmaking();
  }
}

function setMPBotDifficulty(diff) {
  if (window.Multiplayer) {
    window.Multiplayer.setBotDifficulty(diff);
  }
}

function connectP2PNetwork() {
  if (window.Multiplayer) {
    window.Multiplayer.connectP2PNetwork();
  }
}

function copyP2PId() {
  if (window.Multiplayer) {
    window.Multiplayer.copyP2PId();
  }
}


// 9. Profile configurations updates
function saveProfileConfiguration() {
  const username = document.getElementById('settings-username').value.trim();
  if (username === '') return;

  if (window.Dashboard) {
    window.Dashboard.username = username;
    window.Dashboard.save();
    window.Dashboard.updateGlobalTelemetryUI();
    window.Dashboard.showBlitzToast("Profile Updated", `Your codename is now successfully saved as ${username}.`, "user");
  }
}

function randomizeUserAvatar() {
  const seeds = ['Striker', 'Runner', 'Volt', 'Pixel', 'Sonic', 'Blitz', 'Mech', 'Matrix', 'Neon', 'Quantum'];
  const randSeed = seeds[Math.floor(Math.random() * seeds.length)] + Math.floor(Math.random() * 99);
  
  if (window.Dashboard) {
    window.Dashboard.avatarSeed = randSeed;
    window.Dashboard.save();
    window.Dashboard.updateGlobalTelemetryUI();
  }
}

function simulateAuthLink(provider) {
  if (window.Dashboard) {
    window.Dashboard.showBlitzToast("Handshake complete", `Successfully authorized credentials using ${provider}!`, "shield");
    if (window.Sound) window.Sound.playSuccessBell();
  }
}


// 10. Visual configurations toggling
function togglePostureUI() {
  const active = document.getElementById('settings-posture-toggle').checked;
  if (window.Dashboard) {
    window.Dashboard.showBlitzToast("Posture Assist", active ? "Posture webcam guidelines overlay loaded." : "Posture overlay dismissed.", "video");
  }
}

function toggleFlamesFX() {
  const active = document.getElementById('settings-flames-toggle').checked;
  if (window.Dashboard) {
    window.Dashboard.showBlitzToast("Telemetry FX", active ? "Flame combo animations enabled." : "Flame combo animations disabled.", "flame");
  }
}

function changeAppFontFamily(fontId) {
  // Remove font classes
  document.body.classList.remove('font-sans', 'font-mono');
  
  if (fontId === 'sans') {
    document.body.classList.add('font-sans');
  } else {
    document.body.classList.add('font-mono');
  }

  // Toggle buttons active classes
  const buttons = document.querySelectorAll('.settings-font-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('data-font') === fontId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (window.Dashboard) {
    window.Dashboard.showBlitzToast("Font Swapped", `Main typeface adjusted to Cherry MX font: ${fontId.toUpperCase()}`, "type");
  }
}


// 11. Typing test control delegates
function setTestMode(mode) {
  // Toggle btn active classes
  const buttons = document.querySelectorAll('.test-config-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('data-mode') === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (window.Engine) {
    window.Engine.setMode(mode);
  }
}

// 12. Dynamic Mini simulator loops inside Dashboard Hero Card
let miniTypeInterval = null;
function startMiniSimulatorLoop() {
  const lines = [
    "typeblitz accelerates your fingers across mechanical Cherry MX layouts.",
    "ignite plasma interceptor lasers and lock targets using key speeds.",
    "earn gold, upgrade custom visual skins, and unlock cyber neon themes.",
    "type faster. think faster. command the dashboard matrix terminals."
  ];

  let currentLineIdx = 0;
  const container = document.getElementById('mini-typing-demo');
  if (!container) return;

  const typeOut = () => {
    const text = lines[currentLineIdx];
    let charIdx = 0;
    container.innerHTML = '';

    const addChar = () => {
      if (charIdx >= text.length) {
        // finished line, wait and switch
        setTimeout(() => {
          currentLineIdx = (currentLineIdx + 1) % lines.length;
          typeOut();
        }, 3000);
        return;
      }

      // style first few words correct, current word typing, rest gray
      const words = text.slice(0, charIdx + 1).split(' ');
      const restText = text.slice(charIdx + 1);

      let renderedHtml = '';
      words.forEach((w, idx) => {
        if (idx < words.length - 1) {
          renderedHtml += `<span class="text-greenGlow">${w}</span> `;
        } else {
          renderedHtml += `<span class="text-slate-200 border-r-2 border-cyanGlow animate-caret">${w}</span>`;
        }
      });
      renderedHtml += `<span class="text-slate-600">${restText}</span>`;

      container.innerHTML = renderedHtml;
      charIdx++;
      setTimeout(addChar, 45 + Math.random() * 50);
    };

    addChar();
  };

  typeOut();
}

function setTestTime(seconds) {
  // Toggle time active classes
  const buttons = document.querySelectorAll('.time-btn');
  buttons.forEach(btn => {
    if (btn.getAttribute('data-time') === String(seconds)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  if (window.Engine) {
    window.Engine.setTimeLimit(seconds);
  }
}

function resetTypingTest() {
  if (window.Engine) {
    window.Engine.reset();
  }
}

function replayLastTypingRun() {
  if (window.Engine) {
    window.Engine.replayLastTypingRun();
  }
}


// 13. Shop purchase delegates
function purchaseSkinItem(itemId, price) {
  if (window.Dashboard) {
    window.Dashboard.purchaseSkinItem(itemId, price);
  }
}

function applyThemeStyle(themeId) {
  if (window.Dashboard) {
    window.Dashboard.applyShopItem(themeId);
  }
}

function applyAudioClickPack(clickId) {
  if (window.Dashboard) {
    window.Dashboard.applyShopItem(clickId);
  }
}


// 14. Admin Dev Console Actions
function triggerCheatCoins() {
  if (window.Dashboard) {
    window.Dashboard.coins += 500;
    window.Dashboard.save();
    window.Dashboard.updateGlobalTelemetryUI();
    window.Dashboard.showBlitzToast("Admin Power Up!", "Injected +500 Blitz-Coins successfully.", "terminal");
    
    appendAdminLog("ADMIN: Injected +500 Coins into Guest wallet balance.");
    if (window.Sound) window.Sound.playSuccessBell();
  }
}

function triggerCheatXP() {
  if (window.Dashboard) {
    window.Dashboard.totalXp += 350;
    window.Dashboard.save();
    window.Dashboard.updateGlobalTelemetryUI();
    window.Dashboard.showBlitzToast("XP Overclock!", "Added +350 Experience Points successfully.", "sparkles");
    
    appendAdminLog("ADMIN: Injected +350 XP. Level up matrices recalculated.");
    if (window.Sound) window.Sound.playSuccessBell();
  }
}

function triggerCheatTrophy() {
  if (window.Dashboard) {
    window.Dashboard.unlockedTrophies = ['speed-demon', 'precision-master', 'marathon-runner', 'arcade-god'];
    window.Dashboard.save();
    window.Dashboard.syncTrophyUnlocksVisuals();
    window.Dashboard.showBlitzToast("Glory Achieved", "Unlocked all medals. View profile records.", "award");
    
    appendAdminLog("ADMIN: Unlocked all 4 legendary medals.");
    if (window.Sound) window.Sound.playSuccessBell();
  }
}

function triggerCheatReset() {
  appendAdminLog("ADMIN: Initiating local telemetry clean wipe...");
  localStorage.removeItem('blitz_telemetry');
  
  setTimeout(() => {
    location.reload();
  }, 1000);
}

function appendAdminLog(msg) {
  const container = document.getElementById('admin-terminal-log');
  if (!container) return;
  
  const div = document.createElement('div');
  div.textContent = `> ${msg}`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}


// 15. AI Coach Interactive Modules
const AI_ROASTS = [
  "Your finger transitions are so slow they are practically running a retro dial-up connection! Double check your posture.",
  "Are you typing with mechanical Cherry MX switches or soggy lettuce leaves? Pick up the pace, pilot!",
  "A sleeping typist gets higher WPM marks than that last run. Let's calibrate ring-finger extensions immediately.",
  "Your keyboard is practically yawning. Overclock your neurons and let's try a Left-Hand weakness drill!",
  "I've seen assembly line robots with better tactile rhythms. Engage laser grids and focus!"
];

const AI_PRAISES = [
  "Incredible speed index, pilot! Your left ring-finger transitions show sub-8ms latencies.",
  "Cherry MX oscillators in absolute sync. Excellent posture alignment, commander!",
  "Now that is what I call supreme overclocked tactile precision! Keep holding this streak.",
  "Flawless sweep! You are commanding the matrix command terminals like a legendary champion.",
  "Fingers gliding like a neon stream! You are ready for the multiplayer arena races."
];

function triggerAICoachRoast() {
  const container = document.getElementById('ai-coach-bubble');
  if (!container) return;

  const randRoast = AI_ROASTS[Math.floor(Math.random() * AI_ROASTS.length)];
  container.innerHTML = `"${randRoast}"`;
  
  if (window.Sound) window.Sound.playErrorBuzzer();
  if (window.Dashboard) {
    window.Dashboard.showBlitzToast("BLITZ-BOT Roast", "AI has roasted your typing alignment!", "skull");
  }
}

function triggerAICoachPraise() {
  const container = document.getElementById('ai-coach-bubble');
  if (!container) return;

  const randPraise = AI_PRAISES[Math.floor(Math.random() * AI_PRAISES.length)];
  container.innerHTML = `"${randPraise}"`;
  
  if (window.Sound) window.Sound.playSuccessBell();
  if (window.Dashboard) {
    window.Dashboard.showBlitzToast("BLITZ-BOT Praise", "AI bot is thoroughly impressed!", "sparkles");
  }
}

function generateAICodingExercise(lang) {
  const scripts = {
    'javascript': [
      "const blitz = new TypeBlitzEngine({ wpmLimit: 120, rgbLights: true });",
      "function overclockFingers(typist) { return typist.speed > 80 ? 'Master' : 'Bronze'; }",
      "import { SoundSynthesizer } from './sound.js'; SoundSynthesizer.igniteMXOscillators();",
      "export const neonRouter = (pageId) => { document.getElementById(pageId).show(); };"
    ],
    'python': [
      "def calculate_typing_wpm(words, total_ms): return (len(words) / (total_ms / 60000))",
      "class BlitzBotAssistant: def roast_typist(self): print('Overclock needed, pilot!')",
      "import socketio, SupabaseClientConfig; client = SupabaseClientConfig.init()",
      "for MX_key in mechanical_keyboard_layout: MX_key.trigger_glowing_pulse_fx()"
    ],
    'css': [
      "@keyframes pulseGlow { 0% { box-shadow: 0 0 5px #00f0ff; } 100% { box-shadow: 0 0 25px #00f0ff; } }",
      ".glass-panel { background: rgba(8, 10, 22, 0.45); backdrop-filter: blur(12px); border-color: #1e293b; }",
      ".theme-synthwave { --cyanGlow: #ff007f; --purpleGlow: #9d4edd; --greenGlow: #00f0ff; }",
      ".btn-neon-zap { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); filter: brightness(1.15); }"
    ]
  };

  const selectedList = scripts[lang] || scripts['javascript'];
  switchPage('test');
  
  // Set custom code words
  window.Engine.wordsList = selectedList.join(' ').split(/\s+/);
  window.Engine.reset();

  const overlay = document.getElementById('test-focus-overlay');
  if (overlay) overlay.classList.add('hidden');
  document.getElementById('typing-textbox-container').focus();

  if (window.Dashboard) {
    window.Dashboard.showBlitzToast("AI Challenge Generated", `Loaded custom ${lang.toUpperCase()} code practice block.`, "code");
  }
}

// 16. Cyber Guild Clans Actions
function triggerJoinClan(clanName) {
  if (window.Dashboard) {
    window.Dashboard.showBlitzToast("Clan Request Sent", `Sent verification request to [${clanName}] database. Check status in 24h.`, "shield");
    if (window.Sound) window.Sound.playSuccessBell();
  }
}

function triggerJoinClanRaid() {
  if (window.Dashboard) {
    window.Dashboard.showBlitzToast("Raid Engaged", "Initiated cooperative Boss Fight Raid! Defeat Megabot Alpha.", "flame");
  }
  // Launch Boss Game!
  launchArcadeGame('boss');
}

// 17. Quests Arena Actions
function triggerClaimQuestReward(questName) {
  if (window.Dashboard) {
    window.Dashboard.coins += 25;
    window.Dashboard.save();
    window.Dashboard.updateGlobalTelemetryUI();
    window.Dashboard.showBlitzToast("Quest Rewarded", "Claimed +25 Coins for completing Daily Quest!", "ticket");
    
    if (window.Sound) window.Sound.playSuccessBell();
    
    // Hide or disable trigger button
    const btn = event.currentTarget;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "COINS CLAIMED";
      btn.className = "w-full py-1.5 bg-slate-800 text-slate-500 font-bold text-[9px] rounded-lg tracking-wider uppercase cursor-not-allowed";
    }
  }
}

