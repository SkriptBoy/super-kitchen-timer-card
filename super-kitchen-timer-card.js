/**
 * Super Kitchen Timer Card
 * A community card for Home Assistant
 * Created by Claude & Wolfgang
 * 
 * Version: 1.5.0
 */

class SuperKitchenTimerCard extends HTMLElement {
  
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._audioContext = null;
    this._alertActive = false;
    this._soundPlaying = false;
    this._updateInterval = null;
    this._lastState = null;
    this._gongCount = 0;
    this._activeFood = null; // Aktuell gewähltes Gericht
  }

  // ============ HASS Integration ============
  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    
    const timerState = hass.states[this._config.timer_entity];
    if (!timerState) {
      this._renderError();
      return;
    }

    // Live-Update für aktiven Timer
    if (timerState.state === 'active' && !this._updateInterval) {
      this._startLiveUpdate();
    } else if (timerState.state !== 'active' && this._updateInterval) {
      this._stopLiveUpdate();
    }

    // Sound bei Timer-Ende
    const remaining = this._calculateRemaining(timerState);
    if (timerState.state === 'idle' && this._alertActive && !this._soundPlaying) {
      this._playGong();
    }
    if (timerState.state === 'active' && remaining <= this._config.alert_threshold) {
      this._alertActive = true;
    }
    if (timerState.state === 'idle' && remaining === 0 && !this._alertActive) {
      // Timer wurde manuell gestoppt
      this._alertActive = false;
    }

    this._render();
  }

  // ============ Lokalisierung ============
  static get translations() {
    return {
      de: {
        ready: 'Bereit',
        running: 'Läuft',
        paused: 'Pause',
        pause: 'Pause',
        resume: 'Weiter',
        stop: 'Stop',
        ok: 'OK',
        min: 'Min',
        sec: 'Sek',
        selectDish: 'Gericht wählen...',
        // Food presets
        eggSoft: 'Ei weich',
        eggMedium: 'Ei wachsweich', 
        eggHard: 'Ei hart',
        pastaAlDente: 'Nudeln al dente',
        pastaSoft: 'Nudeln weich',
        rice: 'Reis',
        potatoes: 'Kartoffeln',
        roastAromas: 'Röstaromen 🔥',
      },
      en: {
        ready: 'Ready',
        running: 'Running',
        paused: 'Paused',
        pause: 'Pause',
        resume: 'Resume',
        stop: 'Stop',
        ok: 'OK',
        min: 'Min',
        sec: 'Sec',
        selectDish: 'Select dish...',
        // Food presets
        eggSoft: 'Egg soft',
        eggMedium: 'Egg medium',
        eggHard: 'Egg hard',
        pastaAlDente: 'Pasta al dente',
        pastaSoft: 'Pasta soft',
        rice: 'Rice',
        potatoes: 'Potatoes',
        roastAromas: 'Roast aromas 🔥',
      },
      es: {
        ready: 'Listo',
        running: 'En marcha',
        paused: 'Pausado',
        pause: 'Pausa',
        resume: 'Continuar',
        stop: 'Parar',
        ok: 'OK',
        min: 'Min',
        sec: 'Seg',
        selectDish: 'Elegir plato...',
        // Food presets
        eggSoft: 'Huevo pasado',
        eggMedium: 'Huevo mollet',
        eggHard: 'Huevo duro',
        pastaAlDente: 'Pasta al dente',
        pastaSoft: 'Pasta blanda',
        rice: 'Arroz',
        potatoes: 'Patatas',
        roastAromas: 'Tostado 🔥',
      },
      nds: {
        // Plattdüütsch! 🐺⚓
        ready: 'Kloar',
        running: 'Löppt',
        paused: 'Tööv man',
        pause: 'Tööv',
        resume: 'Wieder',
        stop: 'Holl an',
        ok: 'Jau',
        min: 'Min',
        sec: 'Sek',
        selectDish: 'Wat schall dat ween...',
        // Food presets
        eggSoft: 'Ei week',
        eggMedium: 'Ei middel', 
        eggHard: 'Ei hart',
        pastaAlDente: 'Nudeln mit Beten',
        pastaSoft: 'Nudeln week',
        rice: 'Ries',
        potatoes: 'Tüffeln',
        roastAromas: 'Bruun warm 🔥',
      }
    };
  }

  _t(key) {
    const lang = this._config?.language || 'de';
    const translations = SuperKitchenTimerCard.translations[lang] || SuperKitchenTimerCard.translations.de;
    return translations[key] || key;
  }

  _getDefaultFoodPresets() {
    return [
      { name: this._t('eggSoft'), icon: '🥚', seconds: 240 },
      { name: this._t('eggMedium'), icon: '🥚', seconds: 360 },
      { name: this._t('eggHard'), icon: '🥚', seconds: 540 },
      { name: this._t('pastaAlDente'), icon: '🍝', seconds: 480 },
      { name: this._t('pastaSoft'), icon: '🍝', seconds: 600 },
      { name: this._t('rice'), icon: '🍚', seconds: 720 },
      { name: this._t('potatoes'), icon: '🥔', seconds: 1200 },
      { name: this._t('roastAromas'), icon: '🔥', seconds: 180 },
    ];
  }

  setConfig(config) {
    if (!config.timer_entity) {
      throw new Error('Please specify timer_entity');
    }
    
    // Sprache zuerst setzen für Übersetzungen
    const language = config.language || 'de';
    
    this._config = {
      timer_entity: config.timer_entity,
      name: config.name || 'Kitchen Timer',
      icon: config.icon || 'mdi:timer-outline',
      language: language,
      presets: config.presets || [5, 10, 15, 20],
      food_presets: (config.food_presets && config.food_presets.length > 0) ? config.food_presets : null,
      show_food_presets: config.show_food_presets !== false,
      alert_threshold: config.alert_threshold ?? 60,
      alert_sound: config.alert_sound !== false,
      custom_sound: config.custom_sound || null,
      sound_volume: config.sound_volume ?? 0.7,
      sound_repeat: config.sound_repeat ?? 3,
      primary_color: config.primary_color || '#4CAF50',
      alert_color: config.alert_color || '#FF5722',
      show_seconds: config.show_seconds !== false,
    };
    
    this._render();
  }

  // ============ Live Update ============
  _startLiveUpdate() {
    if (this._updateInterval) return;
    this._updateInterval = setInterval(() => {
      if (this._hass) this._render();
    }, 500);
  }

  _stopLiveUpdate() {
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
      this._updateInterval = null;
    }
  }

  disconnectedCallback() {
    this._stopLiveUpdate();
    this._stopSound();
  }

  // ============ Timer Berechnung ============
  _calculateRemaining(timerState) {
    if (!timerState || timerState.state === 'idle') return 0;
    
    if (timerState.state === 'paused') {
      // Bei Pause: remaining direkt aus Attributen
      const remaining = timerState.attributes.remaining;
      if (remaining) {
        return this._parseTime(remaining);
      }
      return 0;
    }
    
    // Bei active: Berechne aus finishes_at
    const finishTime = new Date(timerState.attributes.finishes_at).getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.floor((finishTime - now) / 1000));
    return diff;
  }

  _parseTime(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(p => parseInt(p) || 0);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parseInt(timeStr) || 0;
  }

  _formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }



  // ============ Sound System ============
  _playGong() {
    if (!this._config.alert_sound) return;
    this._soundPlaying = true;
    this._gongCount = 0;
    
    // Priorität: 1. custom_sound (Pfad), 2. sound_data (Base64), 3. Web Audio Gong
    if (this._config.custom_sound) {
      this._playCustomSound(this._config.custom_sound);
    } else if (this._config.sound_data) {
      this._playCustomSound(this._config.sound_data);
    } else {
      this._playWebAudioGong();
    }
  }

  _playCustomSound(soundSource) {
    const audio = new Audio(soundSource);
    audio.volume = this._config.sound_volume;
    
    const playCount = () => {
      this._gongCount++;
      audio.currentTime = 0;
      audio.play().catch(e => console.warn('Audio play failed:', e));
      
      if (this._gongCount < this._config.sound_repeat && this._soundPlaying) {
        audio.onended = () => {
          setTimeout(playCount, 500);
        };
      }
    };
    
    this._currentAudio = audio;
    playCount();
  }

  _playWebAudioGong() {
    if (!this._audioContext) {
      this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const ctx = this._audioContext;
    const vol = this._config.sound_volume;
    
    const playOnce = () => {
      this._gongCount++;
      const now = ctx.currentTime;
      
      // Gong-artiger Klang mit mehreren Frequenzen
      const frequencies = [
        { freq: 261.63, gain: 0.35, decay: 2.5 },   // C4 - Grundton
        { freq: 329.63, gain: 0.25, decay: 2.0 },   // E4 - Terz
        { freq: 392.00, gain: 0.20, decay: 1.8 },   // G4 - Quinte
        { freq: 523.25, gain: 0.15, decay: 1.5 },   // C5 - Oktave
        { freq: 783.99, gain: 0.08, decay: 1.2 },   // G5 - Oberton
      ];
      
      frequencies.forEach(({ freq, gain, decay }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(freq, now);
        osc.type = 'sine';
        
        // Attack + Decay Envelope
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(vol * gain, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + decay);
        
        osc.start(now);
        osc.stop(now + decay);
      });
      
      // Nächster Gong nach Pause
      if (this._gongCount < this._config.sound_repeat && this._soundPlaying) {
        setTimeout(playOnce, 2800);
      }
    };
    
    playOnce();
  }

  _stopSound() {
    this._soundPlaying = false;
    this._alertActive = false;
    this._gongCount = 0;
    if (this._currentAudio) {
      this._currentAudio.pause();
      this._currentAudio = null;
    }
  }

  // ============ Timer Actions ============
  _startTimer(seconds) {
    this._stopSound();
    this._alertActive = false;
    
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const duration = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    this._hass.callService('timer', 'start', {
      entity_id: this._config.timer_entity,
      duration: duration
    });
  }

  _pauseTimer() {
    this._hass.callService('timer', 'pause', {
      entity_id: this._config.timer_entity
    });
  }

  _resumeTimer() {
    this._hass.callService('timer', 'start', {
      entity_id: this._config.timer_entity
    });
  }

  _cancelTimer() {
    this._stopSound();
    this._alertActive = false;
    this._activeFood = null;
    this._hass.callService('timer', 'cancel', {
      entity_id: this._config.timer_entity
    });
  }

  _acknowledgeAlert() {
    this._stopSound();
    this._alertActive = false;
    this._activeFood = null;
    this._render();
  }



  // ============ Render ============
  _renderError() {
    this.shadowRoot.innerHTML = `
      <ha-card>
        <div style="padding: 16px; color: var(--error-color, red);">
          ⚠️ Timer Entity nicht gefunden: ${this._config.timer_entity}
        </div>
      </ha-card>
    `;
  }

  _render() {
    if (!this._hass || !this._config) return;
    
    const timerState = this._hass.states[this._config.timer_entity];
    if (!timerState) {
      this._renderError();
      return;
    }

    const state = timerState.state;
    const remaining = this._calculateRemaining(timerState);
    const isAlert = state === 'active' && remaining <= this._config.alert_threshold && remaining > 0;
    const isFinished = this._alertActive && state === 'idle';
    
    // Food presets: Custom oder Default
    const foodPresets = this._config.food_presets || this._getDefaultFoodPresets();
    const showFoodPresets = this._config.show_food_presets && foodPresets.length > 0;

    this.shadowRoot.innerHTML = `
      <style>${this._getStyles()}</style>
      <ha-card>
        <div class="card-content">
          
          <div class="header">
            <ha-icon icon="${this._config.icon}" class="${isAlert || isFinished ? 'pulse' : ''}"></ha-icon>
            <span class="title">${this._config.name}</span>
          </div>
          
          <div class="timer-display ${isAlert ? 'alert' : ''} ${isFinished ? 'finished' : ''}">
            ${this._activeFood && state === 'active' ? `<span class="active-food">${this._activeFood.icon} ${this._activeFood.name}</span>` : ''}
            <span class="time">${this._formatTime(remaining)}</span>
            <span class="state-badge ${state}">${this._getStateLabel(state)}</span>
          </div>
          
          <div class="presets">
            ${this._config.presets.map(min => `
              <button class="preset-btn" data-minutes="${min}">${min} ${this._t('min')}</button>
            `).join('')}
          </div>
          
          ${showFoodPresets ? `
          <div class="food-presets">
            <select id="food-select" class="food-select">
              <option value="">🍳 ${this._t('selectDish')}</option>
              ${foodPresets.map((fp, i) => `
                <option value="${i}">${fp.icon} ${fp.name} (${Math.floor(fp.seconds/60)}:${(fp.seconds%60).toString().padStart(2,'0')})</option>
              `).join('')}
            </select>
          </div>
          ` : ''}
          
          <div class="custom-input">
            <input type="number" class="time-input" id="inp-min" min="0" max="180" placeholder="${this._t('min')}">
            <span class="separator">:</span>
            <input type="number" class="time-input" id="inp-sec" min="0" max="59" placeholder="${this._t('sec')}">
            <button class="start-btn" id="btn-start">▶</button>
          </div>
          
          <div class="controls">
            ${state === 'active' ? `<button class="ctrl-btn pause" id="btn-pause">⏸ ${this._t('pause')}</button>` : ''}
            ${state === 'paused' ? `<button class="ctrl-btn resume" id="btn-resume">▶ ${this._t('resume')}</button>` : ''}
            ${state !== 'idle' ? `<button class="ctrl-btn stop" id="btn-stop">■ ${this._t('stop')}</button>` : ''}
            ${isFinished ? `<button class="ctrl-btn ok" id="btn-ok">✓ ${this._t('ok')}</button>` : ''}
          </div>
          
        </div>
      </ha-card>
    `;

    this._bindEvents();
  }

  _getStateLabel(state) {
    const labels = { 
      idle: this._t('ready'), 
      active: this._t('running'), 
      paused: this._t('paused') 
    };
    return labels[state] || state;
  }

  _bindEvents() {
    // Preset Buttons - löschen aktives Gericht
    this.shadowRoot.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._activeFood = null;
        this._startTimer(parseInt(btn.dataset.minutes) * 60);
      });
    });

    // Food Preset Dropdown - setzt aktives Gericht
    const foodSelect = this.shadowRoot.getElementById('food-select');
    const foodPresets = this._config.food_presets || this._getDefaultFoodPresets();
    foodSelect?.addEventListener('change', (e) => {
      const idx = e.target.value;
      if (idx !== '' && foodPresets[idx]) {
        this._activeFood = foodPresets[idx];
        this._startTimer(foodPresets[idx].seconds);
        e.target.value = ''; // Reset dropdown
      }
    });

    // Custom Start - löscht aktives Gericht
    const startBtn = this.shadowRoot.getElementById('btn-start');
    startBtn?.addEventListener('click', () => {
      this._activeFood = null;
      const mins = parseInt(this.shadowRoot.getElementById('inp-min')?.value) || 0;
      const secs = parseInt(this.shadowRoot.getElementById('inp-sec')?.value) || 0;
      if (mins + secs > 0) this._startTimer(mins * 60 + secs);
    });

    // Controls
    this.shadowRoot.getElementById('btn-pause')?.addEventListener('click', () => this._pauseTimer());
    this.shadowRoot.getElementById('btn-resume')?.addEventListener('click', () => this._resumeTimer());
    this.shadowRoot.getElementById('btn-stop')?.addEventListener('click', () => this._cancelTimer());
    this.shadowRoot.getElementById('btn-ok')?.addEventListener('click', () => this._acknowledgeAlert());
  }



  _getStyles() {
    return `
      :host {
        --skt-primary: ${this._config.primary_color};
        --skt-alert: ${this._config.alert_color};
      }
      ha-card { padding: 16px; }
      .card-content { display: flex; flex-direction: column; gap: 16px; }
      
      .header {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .header ha-icon {
        --mdc-icon-size: 28px;
        color: var(--primary-text-color);
      }
      .header ha-icon.pulse {
        animation: pulse 0.6s ease-in-out infinite;
        color: var(--skt-alert);
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.3); }
      }
      .title {
        font-size: 18px;
        font-weight: 500;
        color: var(--primary-text-color);
      }
      
      .timer-display {
        text-align: center;
        padding: 20px;
        border-radius: 16px;
        background: var(--secondary-background-color, rgba(0,0,0,0.1));
        transition: all 0.3s ease;
      }
      .timer-display.alert {
        background: linear-gradient(135deg, #FF9800, var(--skt-alert));
      }
      .timer-display.finished {
        background: linear-gradient(135deg, #f44336, #c62828);
        animation: alertPulse 0.8s ease-in-out infinite;
      }
      @keyframes alertPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(244,67,54,0.5); }
        50% { box-shadow: 0 0 20px 8px rgba(244,67,54,0.3); }
      }
      
      .time {
        display: block;
        font-size: 52px;
        font-weight: bold;
        font-family: 'Roboto Mono', 'SF Mono', monospace;
        color: var(--primary-text-color);
        letter-spacing: 2px;
      }
      .timer-display.alert .time,
      .timer-display.finished .time {
        color: white;
        text-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      
      .active-food {
        display: block;
        font-size: 16px;
        font-weight: 600;
        color: white;
        margin-bottom: 4px;
        text-shadow: 0 1px 3px rgba(0,0,0,0.3);
        opacity: 0.95;
      }
      
      .state-badge {
        display: inline-block;
        margin-top: 8px;
        padding: 4px 16px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .state-badge.idle { background: #78909C; color: white; }
      .state-badge.active { background: var(--skt-primary); color: white; }
      .state-badge.paused { background: #FF9800; color: white; }
      
      .presets {
        display: flex;
        gap: 8px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .preset-btn {
        padding: 10px 18px;
        border: none;
        border-radius: 20px;
        background: var(--skt-primary);
        color: white;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .preset-btn:hover { transform: scale(1.05); filter: brightness(1.1); }
      .preset-btn:active { transform: scale(0.95); }
      
      .food-presets {
        display: flex;
        justify-content: center;
      }
      .food-select {
        width: 100%;
        max-width: 280px;
        padding: 12px 16px;
        border: 2px solid var(--divider-color, #444);
        border-radius: 12px;
        background: var(--card-background-color, #1c1c1c);
        color: var(--primary-text-color);
        font-size: 15px;
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%23888' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 8px center;
      }
      .food-select:focus {
        outline: none;
        border-color: var(--skt-primary);
      }
      .food-select:hover {
        border-color: var(--skt-primary);
      }
      
      .custom-input {
        display: flex;
        gap: 8px;
        justify-content: center;
        align-items: center;
      }
      .time-input {
        width: 60px;
        padding: 10px;
        border: 2px solid var(--divider-color, #444);
        border-radius: 10px;
        background: var(--card-background-color, #1c1c1c);
        color: var(--primary-text-color);
        font-size: 16px;
        text-align: center;
      }
      .time-input:focus { outline: none; border-color: var(--skt-primary); }
      .separator { font-size: 20px; font-weight: bold; color: var(--secondary-text-color); }
      .start-btn {
        width: 44px;
        height: 44px;
        border: none;
        border-radius: 50%;
        background: var(--skt-primary);
        color: white;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .start-btn:hover { transform: scale(1.1); }
      
      .controls {
        display: flex;
        gap: 10px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .ctrl-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .ctrl-btn:hover { transform: scale(1.05); }
      .ctrl-btn.pause { background: #FF9800; color: white; }
      .ctrl-btn.resume { background: var(--skt-primary); color: white; }
      .ctrl-btn.stop { background: #78909C; color: white; }
      .ctrl-btn.ok { background: var(--skt-primary); color: white; padding: 12px 32px; font-size: 16px; }
    `;
  }

  // ============ Card Config ============
  getCardSize() {
    return 4;
  }

  static getConfigElement() {
    return document.createElement('super-kitchen-timer-card-editor');
  }

  static getStubConfig() {
    return {
      timer_entity: '',
      name: 'Kitchen Timer',
      presets: [5, 10, 15, 20]
    };
  }
}



// ============================================================
// VISUAL CONFIG EDITOR
// ============================================================

class SuperKitchenTimerCardEditor extends HTMLElement {
  
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }

  _getDefaultFoodPresetsForEditor() {
    const lang = this._config?.language || 'de';
    const t = SuperKitchenTimerCard.translations[lang] || SuperKitchenTimerCard.translations.de;
    return [
      { name: t.eggSoft, icon: '🥚', seconds: 240 },
      { name: t.eggMedium, icon: '🥚', seconds: 360 },
      { name: t.eggHard, icon: '🥚', seconds: 540 },
      { name: t.pastaAlDente, icon: '🍝', seconds: 480 },
      { name: t.pastaSoft, icon: '🍝', seconds: 600 },
      { name: t.rice, icon: '🍚', seconds: 720 },
      { name: t.potatoes, icon: '🥔', seconds: 1200 },
      { name: t.roastAromas, icon: '🔥', seconds: 180 },
    ];
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  _render() {
    if (!this._hass) return;

    // Alle Timer-Entities finden
    const timerEntities = Object.keys(this._hass.states)
      .filter(e => e.startsWith('timer.'))
      .sort();

    this.shadowRoot.innerHTML = `
      <style>
        .editor {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px;
        }
        .row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        label {
          font-weight: 500;
          font-size: 12px;
          color: var(--secondary-text-color);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        select, input {
          padding: 10px 12px;
          border: 1px solid var(--divider-color, #444);
          border-radius: 8px;
          background: var(--card-background-color, #1c1c1c);
          color: var(--primary-text-color);
          font-size: 14px;
        }
        select:focus, input:focus {
          outline: none;
          border-color: var(--primary-color);
        }
        .presets-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .preset-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: var(--primary-color);
          color: white;
          border-radius: 16px;
          font-size: 13px;
        }
        .preset-chip button {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0;
          font-size: 14px;
          opacity: 0.8;
        }
        .preset-chip button:hover { opacity: 1; }
        .add-preset {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .add-preset input {
          width: 60px;
        }
        .add-preset button {
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          background: var(--primary-color);
          color: white;
          cursor: pointer;
          font-size: 13px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--primary-text-color);
          margin-top: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--divider-color);
        }
        .toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .toggle-row label {
          text-transform: none;
          font-size: 14px;
          color: var(--primary-text-color);
        }
        input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }
        .food-list {
          max-height: 150px;
          overflow-y: auto;
          margin: 8px 0;
        }
        .food-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 8px;
          background: var(--secondary-background-color);
          border-radius: 6px;
          margin-bottom: 4px;
          font-size: 13px;
        }
        .food-item .remove-food {
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 12px;
        }
        .add-food-row {
          display: flex;
          gap: 6px;
          align-items: center;
          margin-top: 8px;
        }
        .add-food-row input {
          padding: 8px;
          border: 1px solid var(--divider-color);
          border-radius: 6px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 13px;
        }
        .add-btn {
          background: var(--primary-color, #4CAF50);
          color: white;
          border: none;
          border-radius: 6px;
          width: 36px;
          height: 36px;
          font-size: 20px;
          cursor: pointer;
        }
        .add-btn:hover {
          filter: brightness(1.1);
        }
        .help-text {
          font-size: 11px;
          color: var(--secondary-text-color);
          margin-top: 2px;
        }
      </style>
      
      <div class="editor">
        
        <div class="section-title">Grundeinstellungen</div>
        
        <div class="row">
          <label>Timer Entity *</label>
          <select id="timer_entity">
            <option value="">-- Timer wählen --</option>
            ${timerEntities.map(e => `
              <option value="${e}" ${this._config.timer_entity === e ? 'selected' : ''}>${e}</option>
            `).join('')}
          </select>
        </div>
        
        <div class="row">
          <label>Sprache / Language</label>
          <select id="language">
            <option value="de" ${this._config.language === 'de' ? 'selected' : ''}>🇩🇪 Deutsch</option>
            <option value="en" ${this._config.language === 'en' ? 'selected' : ''}>🇬🇧 English</option>
            <option value="es" ${this._config.language === 'es' ? 'selected' : ''}>🇪🇸 Español</option>
            <option value="nds" ${this._config.language === 'nds' ? 'selected' : ''}>⚓ Plattdüütsch</option>
          </select>
        </div>
        
        <div class="row">
          <label>Name</label>
          <input type="text" id="name" value="${this._config.name || 'Kitchen Timer'}" placeholder="Kitchen Timer">
        </div>
        
        <div class="row">
          <label>Icon</label>
          <input type="text" id="icon" value="${this._config.icon || 'mdi:timer-outline'}" placeholder="mdi:timer-outline">
        </div>
        
        <div class="section-title">Preset-Buttons (Minuten)</div>
        
        <div class="row">
          <div class="presets-row" id="presets-container">
            ${(this._config.presets || [5, 10, 15, 20]).map((p, i) => `
              <span class="preset-chip">
                ${p} Min
                <button data-index="${i}" class="remove-preset">✕</button>
              </span>
            `).join('')}
          </div>
          <div class="add-preset">
            <input type="number" id="new-preset" min="1" max="180" placeholder="Min">
            <button id="add-preset-btn">+ Hinzufügen</button>
          </div>
        </div>
        
        <div class="section-title">Sound & Alert</div>
        
        <div class="toggle-row">
          <label>Sound bei Timer-Ende</label>
          <input type="checkbox" id="alert_sound" ${this._config.alert_sound !== false ? 'checked' : ''}>
        </div>
        
        <div class="row">
          <label>Custom Sound (optional)</label>
          <input type="text" id="custom_sound" value="${this._config.custom_sound || ''}" placeholder="/local/sounds/gong.mp3">
          <span class="help-text">Leer = eingebauter Gong | Pfad zu MP3/WAV in /config/www/</span>
        </div>
        
        <div class="row">
          <label>Lautstärke (0.1 - 1.0)</label>
          <input type="number" id="sound_volume" min="0.1" max="1" step="0.1" value="${this._config.sound_volume ?? 0.7}">
        </div>
        
        <div class="row">
          <label>Sound Wiederholungen</label>
          <input type="number" id="sound_repeat" min="1" max="10" value="${this._config.sound_repeat ?? 3}">
        </div>
        
        <div class="row">
          <label>Alert-Schwelle (Sekunden)</label>
          <input type="number" id="alert_threshold" min="0" max="300" value="${this._config.alert_threshold ?? 60}">
          <span class="help-text">Visueller Alert wenn Timer unter dieser Zeit</span>
        </div>
        
        <div class="section-title">Gericht-Presets</div>
        
        <div class="toggle-row">
          <label>🍳 Gericht-Auswahl anzeigen</label>
          <input type="checkbox" id="show_food_presets" ${this._config.show_food_presets !== false ? 'checked' : ''}>
        </div>
        
        <div class="food-list">
          ${(this._config.food_presets || this._getDefaultFoodPresetsForEditor()).map((fp, i) => `
            <div class="food-item">
              <span>${fp.icon} ${fp.name} (${Math.floor(fp.seconds/60)}:${(fp.seconds%60).toString().padStart(2,'0')})</span>
              <button class="remove-food" data-index="${i}" title="Entfernen">✕</button>
            </div>
          `).join('')}
        </div>
        
        <div class="add-food-row">
          <input type="text" id="new_food_icon" placeholder="🍳" maxlength="4" style="width: 50px; text-align: center;">
          <input type="text" id="new_food_name" placeholder="Gericht Name" style="flex: 1;">
          <input type="number" id="new_food_min" placeholder="Min" min="0" max="180" style="width: 60px;">
          <span>:</span>
          <input type="number" id="new_food_sec" placeholder="Sek" min="0" max="59" style="width: 60px;">
          <button id="add_food" class="add-btn" title="Hinzufügen">+</button>
        </div>
        <span class="help-text">Eigene Gerichte hinzufügen (z.B. 🥩 Steak 3:00)</span>
        
        <div class="section-title">Design</div>
        
        <div class="row">
          <label>Primärfarbe</label>
          <input type="color" id="primary_color" value="${this._config.primary_color || '#4CAF50'}">
        </div>
        
        <div class="row">
          <label>Alert-Farbe</label>
          <input type="color" id="alert_color" value="${this._config.alert_color || '#FF5722'}">
        </div>
        
      </div>
    `;

    this._bindEditorEvents();
  }



  _bindEditorEvents() {
    const $ = (id) => this.shadowRoot.getElementById(id);

    // Simple inputs
    ['timer_entity', 'name', 'icon', 'language', 'custom_sound', 'alert_threshold', 'sound_volume', 'sound_repeat', 'primary_color', 'alert_color'].forEach(field => {
      $(field)?.addEventListener('change', (e) => {
        let value = e.target.value;
        
        // Type conversion
        if (['alert_threshold', 'sound_repeat'].includes(field)) {
          value = parseInt(value) || 0;
        } else if (field === 'sound_volume') {
          value = parseFloat(value) || 0.7;
        }
        
        this._updateConfig(field, value);
      });
    });

    // Checkbox
    $('alert_sound')?.addEventListener('change', (e) => {
      this._updateConfig('alert_sound', e.target.checked);
    });

    // Food Presets Toggle
    $('show_food_presets')?.addEventListener('change', (e) => {
      this._updateConfig('show_food_presets', e.target.checked);
    });

    // Food Preset entfernen
    this.shadowRoot.querySelectorAll('.remove-food').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        // Wenn noch keine custom presets, erst defaults kopieren
        const foodPresets = [...(this._config.food_presets || this._getDefaultFoodPresetsForEditor())];
        foodPresets.splice(index, 1);
        this._updateConfig('food_presets', foodPresets);
      });
    });

    // Food Preset hinzufügen
    $('add_food')?.addEventListener('click', () => {
      const icon = $('new_food_icon')?.value || '🍽️';
      const name = $('new_food_name')?.value?.trim();
      const mins = parseInt($('new_food_min')?.value) || 0;
      const secs = parseInt($('new_food_sec')?.value) || 0;
      const totalSeconds = mins * 60 + secs;
      
      if (name && totalSeconds > 0) {
        // Wenn noch keine custom presets, erst defaults kopieren
        const foodPresets = [...(this._config.food_presets || this._getDefaultFoodPresetsForEditor())];
        foodPresets.push({ name, icon, seconds: totalSeconds });
        this._updateConfig('food_presets', foodPresets);
        
        // Felder leeren
        $('new_food_icon').value = '';
        $('new_food_name').value = '';
        $('new_food_min').value = '';
        $('new_food_sec').value = '';
      }
    });

    // Minuten Preset entfernen
    this.shadowRoot.querySelectorAll('.remove-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index);
        const presets = [...(this._config.presets || [5, 10, 15, 20])];
        presets.splice(index, 1);
        this._updateConfig('presets', presets);
      });
    });

    // Preset hinzufügen
    $('add-preset-btn')?.addEventListener('click', () => {
      const input = $('new-preset');
      const value = parseInt(input.value);
      if (value > 0 && value <= 180) {
        const presets = [...(this._config.presets || [5, 10, 15, 20])];
        if (!presets.includes(value)) {
          presets.push(value);
          presets.sort((a, b) => a - b);
          this._updateConfig('presets', presets);
        }
        input.value = '';
      }
    });
  }

  _updateConfig(key, value) {
    this._config = {
      ...this._config,
      [key]: value
    };
    
    // Custom Event für HA
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    }));
    
    this._render();
  }
}


// ============================================================
// REGISTER COMPONENTS
// ============================================================

customElements.define('super-kitchen-timer-card', SuperKitchenTimerCard);
customElements.define('super-kitchen-timer-card-editor', SuperKitchenTimerCardEditor);

// Card Picker Registration
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'super-kitchen-timer-card',
  name: 'Super Kitchen Timer',
  description: 'Timer mit Presets, Alert und Sound',
  preview: true,
  documentationURL: 'https://github.com/yourusername/super-kitchen-timer-card'
});

console.info(
  '%c SUPER-KITCHEN-TIMER %c v1.5.0 ',
  'color: white; background: #4CAF50; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;',
  'color: #4CAF50; background: #E8F5E9; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;'
);
