/* ==========================================
   TypeBlitz - Progression & Local Database
   ========================================== */

class BlitzDashboard {
  constructor() {
    this.username = 'GuestBlitzer';
    this.avatarSeed = 'Blitzer';
    this.totalXp = 0;
    this.coins = 0;
    this.streakDays = 0;
    
    // Stats telemetry
    this.testsRun = 0;
    this.personalBestWpm = 0;
    this.averageWpmSum = 0;
    this.personalBestAcc = 0;
    
    // Customize unlocks (unlocked items stored as strings)
    this.unlockedItems = ['cyberpunk', 'blue'];
    this.activeTheme = 'cyberpunk';
    this.activeClickPack = 'blue';

    // Medals trophies checklist
    this.unlockedTrophies = [];

    // Timestamps
    this.lastTestTimestamp = null;
  }

  // Load from localStorage or load baseline defaults
  init() {
    const data = localStorage.getItem('blitz_telemetry');
    if (data) {
      try {
        const saved = JSON.parse(data);
        this.username = saved.username || 'GuestBlitzer';
        this.avatarSeed = saved.avatarSeed || 'Blitzer';
        this.totalXp = saved.totalXp || 0;
        this.coins = saved.coins || 0;
        this.streakDays = saved.streakDays || 0;
        
        this.testsRun = saved.testsRun || 0;
        this.personalBestWpm = saved.personalBestWpm || 0;
        this.averageWpmSum = saved.averageWpmSum || 0;
        this.personalBestAcc = saved.personalBestAcc || 0;
        
        this.unlockedItems = saved.unlockedItems || ['cyberpunk', 'blue'];
        this.activeTheme = saved.activeTheme || 'cyberpunk';
        this.activeClickPack = saved.activeClickPack || 'blue';
        
        this.unlockedTrophies = saved.unlockedTrophies || [];
        this.lastTestTimestamp = saved.lastTestTimestamp || null;
      } catch (e) {
        console.error('Error loading local storage data, re-init baseline', e);
      }
    }

    this.calibrateDailyStreak();
    this.updateGlobalTelemetryUI();
    this.syncShopUnlockVisuals();
    this.syncTrophyUnlocksVisuals();
  }

  // Save state to localStorage
  save() {
    const payload = {
      username: this.username,
      avatarSeed: this.avatarSeed,
      totalXp: this.totalXp,
      coins: this.coins,
      streakDays: this.streakDays,
      testsRun: this.testsRun,
      personalBestWpm: this.personalBestWpm,
      averageWpmSum: this.averageWpmSum,
      personalBestAcc: this.personalBestAcc,
      unlockedItems: this.unlockedItems,
      activeTheme: this.activeTheme,
      activeClickPack: this.activeClickPack,
      unlockedTrophies: this.unlockedTrophies,
      lastTestTimestamp: this.lastTestTimestamp
    };
    localStorage.setItem('blitz_telemetry', JSON.stringify(payload));
  }

  // Daily Streak Calibration
  calibrateDailyStreak() {
    if (!this.lastTestTimestamp) {
      this.streakDays = 0;
      return;
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const lastDay = new Date(this.lastTestTimestamp);
    lastDay.setHours(0,0,0,0);

    const diffTime = Math.abs(today - lastDay);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // consecutive day, maintain or increment in next run
    } else if (diffDays > 1) {
      // broke streak, reset
      this.streakDays = 0;
      this.save();
    }
  }

  // Calculate Level and XP margins
  calculateLevelStats() {
    // Level boundary formula: 100 XP per level
    const level = Math.floor(this.totalXp / 100) + 1;
    const progressXp = this.totalXp % 100;
    
    // Tier Titles
    let tier = 'Bronze Pilot';
    if (level >= 5 && level < 10) tier = 'Silver Flier';
    else if (level >= 10 && level < 20) tier = 'Gold Interceptor';
    else if (level >= 20 && level < 35) tier = 'Diamond Elite';
    else if (level >= 35 && level < 50) tier = 'Master Assassin';
    else if (level >= 50) tier = 'Legendary Overlord';

    return { level, progressXp, tier };
  }

  // Add stats run metrics
  logSpeedRun(wpm, acc, errors, xpEarned, coinsEarned) {
    this.testsRun++;
    this.totalXp += xpEarned;
    this.coins += coinsEarned;
    
    // Streak calculations
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (!this.lastTestTimestamp) {
      this.streakDays = 1;
    } else {
      const lastDay = new Date(this.lastTestTimestamp);
      lastDay.setHours(0,0,0,0);
      const diffDays = Math.ceil(Math.abs(today - lastDay) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        this.streakDays++;
      } else if (diffDays > 1) {
        this.streakDays = 1;
      }
    }
    
    this.lastTestTimestamp = Date.now();

    // High WPM PB tracking
    if (wpm > this.personalBestWpm) {
      this.personalBestWpm = wpm;
      this.showBlitzToast("Personal Best!", `Accelerated to a new top speed of ${wpm} WPM!`, "zap");
    }

    // High Acc tracking
    if (acc > this.personalBestAcc) {
      this.personalBestAcc = acc;
    }

    this.averageWpmSum += wpm;

    this.save();
    this.updateGlobalTelemetryUI();
  }

  // Add arcade game reward metrics
  logGameRewards(score, xpEarned, coinsEarned) {
    this.totalXp += xpEarned;
    this.coins += coinsEarned;

    this.save();
    this.updateGlobalTelemetryUI();
  }

  // Update whole App UI telemetry cards immediately
  updateGlobalTelemetryUI() {
    const { level, progressXp, tier } = this.calculateLevelStats();
    
    // Top Bar Sync
    document.getElementById('coin-counter').textContent = this.coins;
    document.getElementById('streak-counter').textContent = `${this.streakDays} Days`;
    document.getElementById('level-counter').textContent = level;
    document.getElementById('xp-text').textContent = `${progressXp} / 100 XP`;
    document.getElementById('xp-progress-bar').style.width = `${progressXp}%`;
    document.getElementById('xp-tier-label').textContent = tier;
    
    // Sidebar Header Sync
    document.getElementById('header-username').textContent = this.username;
    document.getElementById('header-tier').textContent = `Lvl ${level} ${tier.split(' ')[0]}`;
    document.getElementById('header-avatar').src = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${this.avatarSeed}`;

    // Main Homepage Preview Widget Sync
    const avgWpm = this.testsRun > 0 ? Math.round(this.averageWpmSum / this.testsRun) : 0;
    
    document.getElementById('card-avg-wpm').textContent = avgWpm || '--';
    document.getElementById('card-avg-acc').textContent = this.testsRun > 0 ? `${Math.round(this.personalBestAcc)}%` : '--%';
    document.getElementById('card-global-rank').textContent = this.testsRun > 0 ? `#${Math.max(1, 480 - (this.personalBestWpm * 3))}` : '#--';

    // Profile Settings UI Sync
    document.getElementById('profile-username').textContent = this.username;
    document.getElementById('profile-tier-lbl').textContent = `${tier} (${this.username})`;
    document.getElementById('profile-avatar').src = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${this.avatarSeed}`;
    
    document.getElementById('profile-tests-run').textContent = this.testsRun;
    document.getElementById('profile-best-wpm').textContent = this.personalBestWpm > 0 ? `${this.personalBestWpm} WPM` : '--';
    document.getElementById('profile-avg-wpm').textContent = avgWpm > 0 ? `${avgWpm} WPM` : '--';
    document.getElementById('profile-best-acc').textContent = this.personalBestAcc > 0 ? `${this.personalBestAcc}%` : '--%';

    // Settings username default input sync
    const userInp = document.getElementById('settings-username');
    if (userInp && userInp.value === '') {
      userInp.value = this.username;
    }
  }

  // Achievement trophy checker
  checkTrophiesAward(wpm, acc, errors) {
    if (wpm >= 70 && !this.unlockedTrophies.includes('speed-demon')) {
      this.unlockTrophy('speed-demon', 'SPEED DEMON', 'Reached 70 WPM in Classic Speed Test.');
    }
    if (acc === 100 && !this.unlockedTrophies.includes('precision-master')) {
      this.unlockTrophy('precision-master', 'PRECISION KING', 'Achieved 100% typing accuracy.');
    }
    if (this.testsRun >= 10 && !this.unlockedTrophies.includes('marathon-runner')) {
      this.unlockTrophy('marathon-runner', 'BLITZ VETERAN', 'Completed 10 speed runs in command center.');
    }
  }

  // Perform core unlock trophy routine
  unlockTrophy(id, name, desc) {
    this.unlockedTrophies.push(id);
    this.save();
    
    this.syncTrophyUnlocksVisuals();
    this.showBlitzToast("Achievement Unlocked!", name, "trophy");
    
    if (window.Sound) window.Sound.playSuccessBell();
  }

  // Render glowing icons for unlocked medals
  syncTrophyUnlocksVisuals() {
    this.unlockedTrophies.forEach(id => {
      const el = document.getElementById(`trophy-${id}`);
      if (el) {
        el.classList.remove('opacity-40');
        el.classList.add('opacity-100', 'border-cyanGlow/25', 'bg-cyanGlow/5');
        
        // Find inside container and color the icon container
        let iconCon;
        if (id === 'speed-demon') iconCon = document.getElementById('icon-container-sd');
        else if (id === 'precision-master') iconCon = document.getElementById('icon-container-pm');
        else if (id === 'marathon-runner') iconCon = document.getElementById('icon-container-mr');
        else if (id === 'arcade-god') iconCon = document.getElementById('icon-container-ag');
        
        if (iconCon) {
          iconCon.className = 'bg-cyanGlow/10 text-cyanGlow p-3 rounded-xl border border-cyanGlow/30 shadow-[0_0_8px_rgba(0,240,255,0.25)]';
        }
      }
    });
  }

  // Shop Unlock Purchases
  purchaseSkinItem(itemId, price) {
    if (this.unlockedItems.includes(itemId)) {
      // Already unlocked, simply apply it!
      this.applyShopItem(itemId);
      return;
    }

    if (this.coins >= price) {
      this.coins -= price;
      this.unlockedItems.push(itemId);
      this.save();
      
      this.syncShopUnlockVisuals();
      this.updateGlobalTelemetryUI();
      this.showBlitzToast("Unlock Secured!", `Unlocked item: ${itemId.toUpperCase()} successfully!`, "shopping-bag");
      
      if (window.Sound) window.Sound.playSuccessBell();
      this.applyShopItem(itemId);
    } else {
      this.showBlitzToast("Access Denied", "Insufficient Blitz-Coins! Run more Speed Tests.", "alert-triangle");
      if (window.Sound) window.Sound.playErrorBuzz();
    }
  }

  // Synchronize item indicators (Lock/Unlock button styles)
  syncShopUnlockVisuals() {
    // Theme Matrix
    if (this.unlockedItems.includes('matrix')) {
      const lbl = document.getElementById('lbl-status-matrix');
      const btn = document.getElementById('btn-theme-matrix');
      if (lbl) lbl.textContent = "UNLOCKED";
      if (btn) btn.textContent = "APPLY MATRIX STYLE";
    }
    // Theme Synthwave
    if (this.unlockedItems.includes('synthwave')) {
      const lbl = document.getElementById('lbl-status-synthwave');
      const btn = document.getElementById('btn-theme-synthwave');
      if (lbl) lbl.textContent = "UNLOCKED";
      if (btn) btn.textContent = "APPLY SYNTHWAVE STYLE";
    }
    // Sound linear red
    if (this.unlockedItems.includes('redsound')) {
      const lbl = document.getElementById('lbl-status-redsound');
      const btn = document.getElementById('btn-sound-red');
      if (lbl) lbl.textContent = "UNLOCKED";
      if (btn) btn.textContent = "APPLY LINEAR SOUND";
    }
    // Sound clicky green
    if (this.unlockedItems.includes('greensound')) {
      const lbl = document.getElementById('lbl-status-greensound');
      const btn = document.getElementById('btn-sound-green');
      if (lbl) lbl.textContent = "UNLOCKED";
      if (btn) btn.textContent = "APPLY HEAVY SOUND";
    }
  }

  // Apply purchased shop item
  applyShopItem(itemId) {
    if (itemId === 'matrix' || itemId === 'synthwave' || itemId === 'cyberpunk') {
      this.activeTheme = itemId;
      this.save();
      // Apply class to body
      document.body.className = document.body.className.replace(/theme-\S+/g, '');
      if (itemId !== 'cyberpunk') {
        document.body.classList.add(`theme-${itemId}`);
      }
      this.showBlitzToast("Style Applied", `Theme visualizer is now locked to ${itemId.toUpperCase()}.`, "palette");
    } else if (itemId === 'redsound' || itemId === 'greensound' || itemId === 'blue') {
      this.activeClickPack = itemId === 'redsound' ? 'red' : (itemId === 'greensound' ? 'green' : 'blue');
      this.save();
      if (window.Sound) {
        window.Sound.activeClickPack = this.activeClickPack;
      }
      this.showBlitzToast("Sound Applied", `Audio mechanical switch is now Cherry MX ${itemId.toUpperCase()}.`, "volume-2");
    }
  }

  // Top level customized notification popup alerts
  showBlitzToast(title, msg, icon) {
    const toast = document.getElementById('blitz-toast');
    if (!toast) return;

    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-message').textContent = msg;
    document.getElementById('toast-detail').textContent = new Date().toLocaleTimeString();

    // Swap icons if Lucide is loaded
    const iconContainer = document.getElementById('toast-icon-container');
    if (iconContainer) {
      iconContainer.innerHTML = `<i data-lucide="${icon}" class="w-6 h-6 animate-bounce"></i>`;
      if (window.lucide) window.lucide.createIcons();
    }

    toast.classList.remove('hidden');
    // animate entrance slide in
    setTimeout(() => {
      toast.classList.remove('translate-x-20', 'opacity-0');
      toast.classList.add('translate-x-0', 'opacity-100');
    }, 50);

    // clear timer to close
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('translate-x-0', 'opacity-100');
      toast.classList.add('translate-x-20', 'opacity-0');
      setTimeout(() => toast.classList.add('hidden'), 350);
    }, 4500);
  }
}

// Global Single Instance export
const Dashboard = new BlitzDashboard();
window.Dashboard = Dashboard; // expose to window
