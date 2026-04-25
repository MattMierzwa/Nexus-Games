/**
 * Nexus Games - Main Application
 * Vanilla ES6+ | IIFE Pattern | Strict Mode
 * @version 1.0.0
 */

'use strict';

(function NexusGames() {
  
  // ===== Application State =====
  const AppState = {
    activeGame: null,
    modalOpen: false,
    previousActiveElement: null,
    scores: {
      clicker: [],
      memory: []
    },
    gameInstances: {
      clicker: null,
      memory: null
    }
  };

  // ===== DOM Elements Cache =====
  const DOM = {
    // Navigation
    navToggle: null,
    navMenu: null,
    navLinks: null,
    
    // Modal
    modal: null,
    modalOverlay: null,
    modalClose: null,
    modalContent: null,
    modalResult: null,
    modalTitle: null,
    modalMessage: null,
    modalRestart: null,
    modalCloseBtn: null,
    
    // Scores
    scoreTabs: null,
    scorePanels: null,
    clickerHighscores: null,
    memoryHighscores: null,
    clickerEmpty: null,
    memoryEmpty: null,
    
    // Footer
    currentYear: null
  };

  // ===== Constants =====
  const CONSTANTS = {
    STORAGE_KEY: 'nexus_games_scores',
    CLICKER_DURATION: 10000, // 10 seconds
    CLICKER_THRESHOLDS: {
      legend: 80,
      pro: 60,
      beginner: 40
    },
    MEMORY_GRID_SIZE: 4, // 4x4 = 16 cards, 8 pairs
    MEMORY_EMOJIS: ['🎮', '🎯', '🎲', '🃏', '🎪', '🎨', '🎭', '🎵'],
    FOCUSABLE_SELECTORS: 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  };

  // ===== Utility Functions =====
  
  /**
   * Sanitize and escape HTML to prevent XSS
   * @param {string} str - Raw string input
   * @returns {string} - Escaped string safe for textContent
   */
  const sanitize = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  /**
   * Fisher-Yates shuffle algorithm for array randomization
   * @param {Array} array - Array to shuffle
   * @returns {Array} - New shuffled array
   */
  const shuffle = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  /**
   * Format number with leading zeros
   * @param {number} num - Number to format
   * @param {number} size - Desired length
   * @returns {string} - Formatted string
   */
  const formatNumber = (num, size = 2) => num.toString().padStart(size, '0');

  /**
   * Format milliseconds to MM:SS
   * @param {number} ms - Milliseconds
   * @returns {string} - Formatted time string
   */
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${formatNumber(minutes)}:${formatNumber(seconds)}`;
  };

  // ===== Storage Management =====
  
  /**
   * Load scores from localStorage with error handling
   */
  const loadScores = () => {
    try {
      const stored = localStorage.getItem(CONSTANTS.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        AppState.scores = {
          clicker: Array.isArray(parsed.clicker) ? parsed.clicker : [],
          memory: Array.isArray(parsed.memory) ? parsed.memory : []
        };
      }
    } catch (error) {
      console.warn('Failed to load scores:', error);
      AppState.scores = { clicker: [], memory: [] };
    }
  };

  /**
   * Save scores to localStorage with error handling
   */
  const saveScores = () => {
    try {
      localStorage.setItem(CONSTANTS.STORAGE_KEY, JSON.stringify(AppState.scores));
    } catch (error) {
      console.warn('Failed to save scores:', error);
    }
  };

  /**
   * Add new score and maintain top 10
   * @param {string} game - Game identifier
   * @param {number} score - Numeric score (higher is better for clicker, lower for memory)
   * @param {object} meta - Additional metadata
   */
  const addScore = (game, score, meta = {}) => {
    const scoreEntry = {
      id: Date.now(),
      score,
      date: new Date().toISOString(),
      ...meta
    };
    
    const scores = AppState.scores[game] || [];
    scores.push(scoreEntry);
    
    // Sort and limit to top 10
    if (game === 'clicker') {
      // Higher score is better for clicker
      scores.sort((a, b) => b.score - a.score);
    } else {
      // Lower score (moves) is better for memory
      scores.sort((a, b) => a.score - b.score);
    }
    
    AppState.scores[game] = scores.slice(0, 10);
    saveScores();
    renderHighScores();
  };

  // ===== UI Rendering =====
  
  /**
   * Render high scores lists for both games
   */
  const renderHighScores = () => {
    // Clicker scores
    if (DOM.clickerHighscores) {
      DOM.clickerHighscores.innerHTML = '';
      const scores = AppState.scores.clicker;
      
      if (scores.length === 0) {
        DOM.clickerEmpty.hidden = false;
      } else {
        DOM.clickerEmpty.hidden = true;
        scores.forEach((entry, index) => {
          const li = document.createElement('li');
          li.innerHTML = `
            <span class="highscores-list__rank">#${index + 1}</span>
            <span class="highscores-list__score">${entry.score} cliques</span>
            <span class="highscores-list__meta">${new Date(entry.date).toLocaleDateString('pt-BR')}</span>
          `;
          DOM.clickerHighscores.appendChild(li);
        });
      }
    }
    
    // Memory scores
    if (DOM.memoryHighscores) {
      DOM.memoryHighscores.innerHTML = '';
      const scores = AppState.scores.memory;
      
      if (scores.length === 0) {
        DOM.memoryEmpty.hidden = false;
      } else {
        DOM.memoryEmpty.hidden = true;
        scores.forEach((entry, index) => {
          const li = document.createElement('li');
          li.innerHTML = `
            <span class="highscores-list__rank">#${index + 1}</span>
            <span class="highscores-list__score">${entry.score} movimentos</span>
            <span class="highscores-list__meta">${formatTime(entry.time)} • ${new Date(entry.date).toLocaleDateString('pt-BR')}</span>
          `;
          DOM.memoryHighscores.appendChild(li);
        });
      }
    }
  };

  /**
   * Update footer year dynamically
   */
  const updateFooterYear = () => {
    if (DOM.currentYear) {
      DOM.currentYear.textContent = new Date().getFullYear();
    }
  };

  // ===== Modal Management =====
  
  /**
   * Open modal with focus trap and accessibility
   * @param {HTMLElement} trigger - Element that triggered the modal
   */
  const openModal = (trigger = null) => {
    if (!DOM.modal) return;
    
    AppState.previousActiveElement = document.activeElement;
    AppState.modalOpen = true;
    
    DOM.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Focus first focusable element or close button
    setTimeout(() => {
      const focusable = DOM.modalContent?.querySelector(CONSTANTS.FOCUSABLE_SELECTORS);
      if (focusable) focusable.focus();
    }, 100);
    
    // Add event listeners
    document.addEventListener('keydown', handleModalKeydown);
    DOM.modalOverlay?.addEventListener('click', closeModal);
  };

  /**
   * Close modal and restore focus
   */
  const closeModal = () => {
    if (!DOM.modal || !AppState.modalOpen) return;
    
    AppState.modalOpen = false;
    DOM.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    // Remove event listeners
    document.removeEventListener('keydown', handleModalKeydown);
    DOM.modalOverlay?.removeEventListener('click', closeModal);
    
    // Restore focus
    if (AppState.previousActiveElement && typeof AppState.previousActiveElement.focus === 'function') {
      AppState.previousActiveElement.focus();
    }
    
    // Reset modal content
    resetModal();
  };

  /**
   * Handle keyboard navigation in modal
   * @param {KeyboardEvent} event
   */
  const handleModalKeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
      return;
    }
    
    if (event.key === 'Tab') {
      const focusable = DOM.modal?.querySelectorAll(CONSTANTS.FOCUSABLE_SELECTORS);
      if (!focusable || focusable.length === 0) return;
      
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  /**
   * Reset modal to initial state
   */
  const resetModal = () => {
    if (DOM.modalContent) DOM.modalContent.innerHTML = '';
    if (DOM.modalResult) DOM.modalResult.hidden = true;
    if (DOM.modalContent) DOM.modalContent.hidden = false;
    
    // Cleanup game instances
    if (AppState.gameInstances.clicker) {
      AppState.gameInstances.clicker.destroy?.();
      AppState.gameInstances.clicker = null;
    }
    if (AppState.gameInstances.memory) {
      AppState.gameInstances.memory.destroy?.();
      AppState.gameInstances.memory = null;
    }
    AppState.activeGame = null;
  };

  /**
   * Show result screen in modal
   * @param {string} title - Result title
   * @param {string} message - Result message with HTML support (sanitized)
   * @param {boolean} showRestart - Whether to show restart button
   */
  const showResult = (title, message, showRestart = true) => {
    if (DOM.modalContent) DOM.modalContent.hidden = true;
    if (DOM.modalResult) DOM.modalResult.hidden = false;
    if (DOM.modalTitle) DOM.modalTitle.textContent = title;
    if (DOM.modalMessage) DOM.modalMessage.innerHTML = sanitize(message);
    if (DOM.modalRestart) DOM.modalRestart.hidden = !showRestart;
  };

  // ===== Game: Clicker Speed =====
  
  /**
   * Clicker Speed Game Class
   */
  class ClickerGame {
    constructor(container) {
      this.container = container;
      this.score = 0;
      this.timeRemaining = CONSTANTS.CLICKER_DURATION;
      this.isActive = false;
      this.timerId = null;
      this.startTime = null;
      
      this.init();
    }
    
    init() {
      this.render();
      this.bindEvents();
    }
    
    render() {
      this.container.innerHTML = `
        <div class="clicker__container">
          <div class="clicker__timer" id="clicker-timer" aria-live="polite">10.0s</div>
          <button 
            id="clicker-btn" 
            class="clicker__button" 
            aria-label="Clique rapidamente para marcar pontos"
            type="button"
            disabled
          >
            CLIQUE!
          </button>
          <div class="clicker__score" id="clicker-score" aria-live="assertive">0</div>
          <p class="clicker__instructions">Clique o máximo que puder em 10 segundos!</p>
          <button id="clicker-start" class="btn btn--primary" type="button">Iniciar</button>
        </div>
      `;
      
      this.elements = {
        timer: this.container.querySelector('#clicker-timer'),
        button: this.container.querySelector('#clicker-btn'),
        score: this.container.querySelector('#clicker-score'),
        startBtn: this.container.querySelector('#clicker-start')
      };
    }
    
    bindEvents() {
      this.elements.startBtn?.addEventListener('click', () => this.start());
      this.elements.button?.addEventListener('click', () => this.handleClick());
      
      // Anti-cheat: prevent text selection and context menu
      this.container.addEventListener('selectstart', (e) => e.preventDefault());
      this.container.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    start() {
      if (this.isActive) return;
      
      this.score = 0;
      this.timeRemaining = CONSTANTS.CLICKER_DURATION;
      this.isActive = true;
      this.startTime = performance.now();
      
      // Update UI
      this.elements.score.textContent = '0';
      this.elements.button.disabled = false;
      this.elements.startBtn.disabled = true;
      this.elements.startBtn.textContent = 'Jogando...';
      
      // Start timer
      this.updateTimer();
      this.timerId = setInterval(() => this.updateTimer(), 100);
    }
    
    updateTimer() {
      const elapsed = performance.now() - this.startTime;
      const remaining = Math.max(0, CONSTANTS.CLICKER_DURATION - elapsed);
      
      this.timeRemaining = remaining;
      this.elements.timer.textContent = (remaining / 1000).toFixed(1) + 's';
      
      if (remaining <= 0) {
        this.end();
      }
    }
    
    handleClick() {
      if (!this.isActive) return;
      
      // Anti-cheat: simple rate limiting (max 20 clicks per 100ms)
      const now = performance.now();
      if (!this.lastClickTime || now - this.lastClickTime > 50) {
        this.score++;
        this.elements.score.textContent = this.score;
        this.elements.button.classList.add('clicked');
        
        // Remove animation class after completion
        setTimeout(() => {
          this.elements.button?.classList.remove('clicked');
        }, 150);
        
        this.lastClickTime = now;
      }
    }
    
    end() {
      clearInterval(this.timerId);
      this.isActive = false;
      
      // Update UI
      this.elements.button.disabled = true;
      this.elements.startBtn.disabled = false;
      this.elements.startBtn.textContent = 'Jogar Novamente';
      
      // Determine rank
      let rank = 'Iniciante';
      let color = 'var(--color-text-muted)';
      
      if (this.score >= CONSTANTS.CLICKER_THRESHOLDS.legend) {
        rank = '🏆 LENDA';
        color = 'var(--color-accent-primary)';
      } else if (this.score >= CONSTANTS.CLICKER_THRESHOLDS.pro) {
        rank = '⭐ PRO';
        color = 'var(--color-accent-secondary)';
      } else if (this.score >= CONSTANTS.CLICKER_THRESHOLDS.beginner) {
        rank = '👍 Bom';
        color = 'var(--color-success)';
      }
      
      // Save score
      addScore('clicker', this.score);
      
      // Show result
      showResult(
        'Clicker Speed - Resultado',
        `<strong style="font-size: 2rem; color: ${color}">${this.score}</strong> cliques!<br>
         Classificação: <strong>${rank}</strong>`,
        true
      );
    }
    
    destroy() {
      clearInterval(this.timerId);
      this.isActive = false;
    }
  }

  // ===== Game: Memory Challenge =====
  
  /**
   * Memory Challenge Game Class
   */
  class MemoryGame {
    constructor(container) {
      this.container = container;
      this.cards = [];
      this.flippedCards = [];
      this.matchedPairs = 0;
      this.moves = 0;
      this.startTime = null;
      this.timerId = null;
      this.isProcessing = false;
      this.totalPairs = CONSTANTS.MEMORY_EMOJIS.length;
      
      this.init();
    }
    
    init() {
      this.render();
      this.bindEvents();
      this.startGame();
    }
    
    render() {
      this.container.innerHTML = `
        <div class="memory__header">
          <div class="memory__stats">
            <div class="memory__stat">
              <span class="memory__stat-value" id="memory-moves">0</span>
              <span>Movimentos</span>
            </div>
            <div class="memory__stat">
              <span class="memory__stat-value" id="memory-time">00:00</span>
              <span>Tempo</span>
            </div>
          </div>
          <button id="memory-restart" class="btn btn--secondary" type="button" aria-label="Reiniciar jogo">
            🔄 Reiniciar
          </button>
        </div>
        <div id="memory-grid" class="memory__grid" role="grid" aria-label="Grade do jogo da memória"></div>
      `;
      
      this.elements = {
        moves: this.container.querySelector('#memory-moves'),
        time: this.container.querySelector('#memory-time'),
        grid: this.container.querySelector('#memory-grid'),
        restartBtn: this.container.querySelector('#memory-restart')
      };
    }
    
    bindEvents() {
      // Event delegation for card clicks
      this.elements.grid?.addEventListener('click', (e) => {
        const card = e.target.closest('.memory__card');
        if (card && !this.isProcessing) {
          this.handleCardClick(card);
        }
      });
      
      this.elements.restartBtn?.addEventListener('click', () => this.startGame());
    }
    
    createCards() {
      // Create pairs and shuffle
      const pairs = [...CONSTANTS.MEMORY_EMOJIS, ...CONSTANTS.MEMORY_EMOJIS];
      const shuffled = shuffle(pairs);
      
      return shuffled.map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false
      }));
    }
    
    renderCards() {
      if (!this.elements.grid) return;
      
      this.elements.grid.innerHTML = '';
      
      this.cards.forEach((card) => {
        const cardEl = document.createElement('button');
        cardEl.className = 'memory__card';
        cardEl.setAttribute('role', 'gridcell');
        cardEl.setAttribute('aria-label', 'Carta virada para baixo');
        cardEl.dataset.id = card.id;
        cardEl.innerHTML = `
          <div class="memory__card-face memory__card-front">?</div>
          <div class="memory__card-face memory__card-back">${card.emoji}</div>
        `;
        this.elements.grid.appendChild(cardEl);
      });
    }
    
    startGame() {
      // Reset state
      this.cards = this.createCards();
      this.flippedCards = [];
      this.matchedPairs = 0;
      this.moves = 0;
      this.isProcessing = false;
      this.startTime = Date.now();
      
      // Reset UI
      if (this.elements.moves) this.elements.moves.textContent = '0';
      if (this.elements.time) this.elements.time.textContent = '00:00';
      
      // Render and start timer
      this.renderCards();
      this.startTimer();
    }
    
    startTimer() {
      if (this.timerId) clearInterval(this.timerId);
      
      this.timerId = setInterval(() => {
        const elapsed = Date.now() - this.startTime;
        if (this.elements.time) {
          this.elements.time.textContent = formatTime(elapsed);
        }
      }, 1000);
    }
    
    handleCardClick(cardEl) {
      const cardId = parseInt(cardEl.dataset.id, 10);
      const card = this.cards.find(c => c.id === cardId);
      
      // Ignore if already flipped, matched, or processing
      if (!card || card.isFlipped || card.isMatched || this.isProcessing) return;
      
      // Flip card
      card.isFlipped = true;
      cardEl.classList.add('flipped');
      cardEl.setAttribute('aria-label', `Carta: ${card.emoji}`);
      
      this.flippedCards.push({ card, element: cardEl });
      
      // Check for match when two cards are flipped
      if (this.flippedCards.length === 2) {
        this.moves++;
        if (this.elements.moves) this.elements.moves.textContent = this.moves;
        this.isProcessing = true;
        this.checkMatch();
      }
    }
    
    checkMatch() {
      const [first, second] = this.flippedCards;
      
      if (first.card.emoji === second.card.emoji) {
        // Match found
        first.card.isMatched = true;
        second.card.isMatched = true;
        first.element.classList.add('matched');
        second.element.classList.add('matched');
        this.matchedPairs++;
        
        // Check win condition
        if (this.matchedPairs === this.totalPairs) {
          this.endGame();
        }
      } else {
        // No match - flip back after delay
        setTimeout(() => {
          first.card.isFlipped = false;
          second.card.isFlipped = false;
          first.element.classList.remove('flipped');
          second.element.classList.remove('flipped');
          first.element.setAttribute('aria-label', 'Carta virada para baixo');
          second.element.setAttribute('aria-label', 'Carta virada para baixo');
        }, 800);
      }
      
      // Reset flipped cards and processing flag
      this.flippedCards = [];
      setTimeout(() => { this.isProcessing = false; }, 800);
    }
    
    endGame() {
      clearInterval(this.timerId);
      
      const totalTime = Date.now() - this.startTime;
      
      // Save score (lower moves is better)
      addScore('memory', this.moves, { time: totalTime });
      
      // Determine rating
      let rating = 'Bom trabalho!';
      if (this.moves <= 16) rating = '🏆 Perfeito!';
      else if (this.moves <= 24) rating = '⭐ Excelente!';
      
      // Show result
      showResult(
        'Memory Challenge - Vitória!',
        `<strong>${rating}</strong><br>
         Movimentos: <strong>${this.moves}</strong><br>
         Tempo: <strong>${formatTime(totalTime)}</strong>`,
        true
      );
    }
    
    destroy() {
      clearInterval(this.timerId);
      this.isProcessing = true;
    }
  }

  // ===== Game Launcher =====
  
  /**
   * Launch selected game in modal
   * @param {string} gameName - Game identifier ('clicker' or 'memory')
   */
  const launchGame = (gameName) => {
    if (!DOM.modalContent) return;
    
    resetModal();
    openModal();
    AppState.activeGame = gameName;
    
    if (gameName === 'clicker') {
      AppState.gameInstances.clicker = new ClickerGame(DOM.modalContent);
    } else if (gameName === 'memory') {
      AppState.gameInstances.memory = new MemoryGame(DOM.modalContent);
    }
    
    // Handle restart from result screen
    if (DOM.modalRestart) {
      DOM.modalRestart.onclick = () => {
        if (AppState.activeGame === 'clicker' && AppState.gameInstances.clicker) {
          AppState.gameInstances.clicker.start();
          DOM.modalResult.hidden = true;
          DOM.modalContent.hidden = false;
        } else if (AppState.activeGame === 'memory' && AppState.gameInstances.memory) {
          AppState.gameInstances.memory.startGame();
          DOM.modalResult.hidden = true;
          DOM.modalContent.hidden = false;
        }
      };
    }
    
    if (DOM.modalCloseBtn) {
      DOM.modalCloseBtn.onclick = closeModal;
    }
  };

  // ===== Event Handlers =====
  
  /**
   * Handle smooth scroll navigation
   * @param {Event} event
   */
  const handleNavClick = (event) => {
    const link = event.target.closest('.nav__link, .footer__link, .hero__actions a');
    if (!link) return;
    
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('#')) return;
    
    event.preventDefault();
    const target = document.querySelector(href);
    
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Close mobile menu if open
      if (DOM.navToggle?.getAttribute('aria-expanded') === 'true') {
        toggleMobileMenu(false);
      }
      
      // Update URL without jump
      history.pushState(null, null, href);
    }
  };

  /**
   * Toggle mobile navigation menu
   * @param {boolean} force - Force open/close state
   */
  const toggleMobileMenu = (force = null) => {
    if (!DOM.navToggle || !DOM.navMenu) return;
    
    const shouldOpen = force !== null ? force : DOM.navToggle.getAttribute('aria-expanded') === 'false';
    
    DOM.navToggle.setAttribute('aria-expanded', shouldOpen.toString());
    DOM.navMenu.setAttribute('aria-hidden', (!shouldOpen).toString());
    
    // Focus management
    if (shouldOpen) {
      const firstLink = DOM.navMenu.querySelector('.nav__link');
      firstLink?.focus();
    }
  };

  /**
   * Handle score tab switching
   * @param {Event} event
   */
  const handleScoreTabClick = (event) => {
    const tab = event.target.closest('.scores__tab');
    if (!tab) return;
    
    const targetPanelId = tab.getAttribute('aria-controls');
    
    // Update tabs
    DOM.scoreTabs?.forEach(t => {
      t.setAttribute('aria-selected', 'false');
      t.classList.remove('scores__tab--active');
      t.setAttribute('tabindex', '-1');
    });
    tab.setAttribute('aria-selected', 'true');
    tab.classList.add('scores__tab--active');
    tab.setAttribute('tabindex', '0');
    
    // Update panels
    DOM.scorePanels?.forEach(panel => {
      panel.hidden = true;
      panel.classList.remove('scores__panel--active');
    });
    const targetPanel = document.getElementById(targetPanelId);
    if (targetPanel) {
      targetPanel.hidden = false;
      targetPanel.classList.add('scores__panel--active');
    }
  };

  /**
   * Handle game card interactions (click/keyboard)
   * @param {Event} event
   */
  const handleGameCardActivate = (event) => {
    // Support click and keyboard activation (Enter/Space)
    const isKeyboard = event.type === 'keydown' && 
      (event.key === 'Enter' || event.key === ' ');
    
    if (event.type === 'click' || isKeyboard) {
      event.preventDefault();
      
      const card = event.target.closest('.game-card');
      if (!card || card.classList.contains('game-card--coming-soon')) return;
      
      const gameName = card.dataset.game;
      if (gameName) {
        launchGame(gameName);
      }
    }
  };

  /**
   * Global event delegation setup
   */
  const setupEventDelegation = () => {
    // Navigation clicks
    document.addEventListener('click', handleNavClick);
    
    // Mobile menu toggle
    DOM.navToggle?.addEventListener('click', () => toggleMobileMenu());
    
    // Close mobile menu on link click (handled in handleNavClick)
    
    // Score tabs
    document.addEventListener('click', handleScoreTabClick);
    
    // Game cards - event delegation for click and keyboard
    document.addEventListener('click', handleGameCardActivate);
    document.addEventListener('keydown', (e) => {
      if (e.target?.closest('.game-card')) {
        handleGameCardActivate(e);
      }
    });
    
    // Modal close buttons
    DOM.modalClose?.addEventListener('click', closeModal);
  };

  // ===== Initialization =====
  
  /**
   * Cache DOM elements
   */
  const cacheDOM = () => {
    // Navigation
    DOM.navToggle = document.querySelector('.nav__toggle');
    DOM.navMenu = document.querySelector('.nav__menu');
    DOM.navLinks = document.querySelectorAll('.nav__link, .footer__link');
    
    // Modal
    DOM.modal = document.getElementById('game-modal');
    DOM.modalOverlay = DOM.modal?.querySelector('.modal__overlay');
    DOM.modalClose = DOM.modal?.querySelector('.modal__close');
    DOM.modalContent = document.getElementById('modal-content');
    DOM.modalResult = document.getElementById('modal-result');
    DOM.modalTitle = document.getElementById('modal-title');
    DOM.modalMessage = document.getElementById('modal-message');
    DOM.modalRestart = document.getElementById('modal-restart');
    DOM.modalCloseBtn = document.getElementById('modal-close');
    
    // Scores
    DOM.scoreTabs = document.querySelectorAll('.scores__tab');
    DOM.scorePanels = document.querySelectorAll('.scores__panel');
    DOM.clickerHighscores = document.getElementById('clicker-highscores');
    DOM.memoryHighscores = document.getElementById('memory-highscores');
    DOM.clickerEmpty = document.getElementById('clicker-empty');
    DOM.memoryEmpty = document.getElementById('memory-empty');
    
    // Footer
    DOM.currentYear = document.getElementById('current-year');
  };

  /**
   * Main initialization function
   */
  const init = () => {
    cacheDOM();
    loadScores();
    renderHighScores();
    updateFooterYear();
    setupEventDelegation();
    
    // Handle hash navigation on load
    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'auto', block: 'start' });
        }, 100);
      }
    }
    
    // Log initialization (removed in production per requirements)
    // console.log('Nexus Games initialized');
  };

  // Start application when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
