/* ==========================================
   TypeBlitz - Web Audio API Synthesizer
   ========================================== */

class BlitzSoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.activeClickPack = 'blue'; // 'blue', 'red', 'green'
    this.ambientOsc = null;
    this.ambientGain = null;
  }

  // Initialize Audio Context (must be triggered by user gesture, like Enter button)
  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      console.log('Blitz Sound Engine initialized successfully!');
    } catch (e) {
      console.error('Web Audio API not supported in this browser.', e);
    }
  }

  // Resume context if suspended
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Toggle Mute State
  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.ambientGain) {
      this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    return this.muted;
  }

  // Programmatic Mechanical Keyboard Keystroke Click Synthesizer
  playKeystrokeClick() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    
    // Switch Type Sound Profiles
    if (this.activeClickPack === 'blue') {
      // Tactile Blue: Muffled bottoming out thud + high mechanical snap
      
      // 1. The Bottom Out Thud (low sine wave decay)
      const oscThud = this.ctx.createOscillator();
      const gainThud = this.ctx.createGain();
      oscThud.type = 'sine';
      oscThud.frequency.setValueAtTime(140, now);
      oscThud.frequency.exponentialRampToValueAtTime(60, now + 0.04);
      
      gainThud.gain.setValueAtTime(0.3, now);
      gainThud.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      
      oscThud.connect(gainThud);
      gainThud.connect(this.ctx.destination);
      oscThud.start(now);
      oscThud.stop(now + 0.05);

      // 2. High Mechanical Click (Short high-pass noise or fast spike)
      const oscClick = this.ctx.createOscillator();
      const gainClick = this.ctx.createGain();
      oscClick.type = 'triangle';
      oscClick.frequency.setValueAtTime(4200, now);
      oscClick.frequency.exponentialRampToValueAtTime(3200, now + 0.008);
      
      gainClick.gain.setValueAtTime(0.12, now);
      gainClick.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
      
      oscClick.connect(gainClick);
      gainClick.connect(this.ctx.destination);
      oscClick.start(now);
      oscClick.stop(now + 0.01);

    } else if (this.activeClickPack === 'red') {
      // Linear Red: Smooth bottoming out, no high metallic click
      const oscThud = this.ctx.createOscillator();
      const gainThud = this.ctx.createGain();
      oscThud.type = 'sine';
      oscThud.frequency.setValueAtTime(110, now);
      oscThud.frequency.exponentialRampToValueAtTime(45, now + 0.035);
      
      gainThud.gain.setValueAtTime(0.45, now);
      gainThud.gain.exponentialRampToValueAtTime(0.01, now + 0.035);
      
      oscThud.connect(gainThud);
      gainThud.connect(this.ctx.destination);
      oscThud.start(now);
      oscThud.stop(now + 0.04);

    } else if (this.activeClickPack === 'green') {
      // Clicky Heavy Green: Loud high pitched click + heavy deep thud
      
      // 1. Heavy Deep Thud
      const oscThud = this.ctx.createOscillator();
      const gainThud = this.ctx.createGain();
      oscThud.type = 'sine';
      oscThud.frequency.setValueAtTime(100, now);
      oscThud.frequency.exponentialRampToValueAtTime(40, now + 0.07);
      
      gainThud.gain.setValueAtTime(0.5, now);
      gainThud.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
      
      oscThud.connect(gainThud);
      gainThud.connect(this.ctx.destination);
      oscThud.start(now);
      oscThud.stop(now + 0.08);

      // 2. Twin High Bells (Clicky metal ping)
      const oscClick1 = this.ctx.createOscillator();
      const oscClick2 = this.ctx.createOscillator();
      const gainClick = this.ctx.createGain();
      
      oscClick1.type = 'sine';
      oscClick1.frequency.setValueAtTime(5000, now);
      oscClick2.type = 'sine';
      oscClick2.frequency.setValueAtTime(6200, now);
      
      gainClick.gain.setValueAtTime(0.18, now);
      gainClick.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
      
      oscClick1.connect(gainClick);
      oscClick2.connect(gainClick);
      gainClick.connect(this.ctx.destination);
      
      oscClick1.start(now);
      oscClick2.start(now);
      oscClick1.stop(now + 0.02);
      oscClick2.stop(now + 0.02);
    }
  }

  // Synthesize Error Buzz Sound
  playErrorBuzz() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(70, now + 0.15);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, now);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  // Alias for compatibility
  playErrorBuzzer() {
    this.playErrorBuzz();
  }

  // Synthesize Level Up / Achievement unlocked melody
  playSuccessBell() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 chord
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.5);
    });
  }

  // Synthesize Countdown Ticking for multiplayer
  playCountdownTick(isFinal = false) {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isFinal ? 1200 : 800, now);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.25 : 0.08));
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + (isFinal ? 0.3 : 0.1));
  }

  // Synthesize Game Over Victory Fanfare
  playVictoryFanfare() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const notes = [587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50]; // Progression
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      
      gain.gain.setValueAtTime(0.12, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.3);
    });
  }

  // Synthesize Defeat Downward chord sweep
  playDefeatSoundscape() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const notes = [392.00, 349.23, 311.13, 261.63]; // Downward C-Minor sweep
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);
      
      gain.gain.setValueAtTime(0.1, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.4);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.5);
    });
  }

  // UI hovering tick tick click
  playHoverTick() {
    if (this.muted || !this.ctx) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, now);
    
    gain.gain.setValueAtTime(0.015, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.03);
  }
}

// Global Single Instance export
const Sound = new BlitzSoundEngine();
window.Sound = Sound; // expose to window for external referencing
