'use strict';

/**
 * Nexus Games v2.0 - Core Application
 * Lead Frontend Engineer & QA Architect Implementation
 */

(function() {
    // ============================================
    // STATE CONTROLLER (PubSub Pattern)
    // ============================================
    const StateController = (function() {
        const subscribers = new Map();
        let state = {
            currentView: 'home',
            soundEnabled: true,
            highContrast: false,
            focusMode: false,
            username: 'Jogador',
            xp: 0,
            level: 1,
            matches: [],
            reactionBest: null,
            reactionLast: null,
            reactionAverage: null,
            reactionTrend: [],
            patternBest: null,
            patternRound: 0
        };

        /**
         * Subscribe to state changes
         * @param {string} key - State key to observe
         * @param {Function} callback - Function to call on change
         */
        function subscribe(key, callback) {
            if (!subscribers.has(key)) {
                subscribers.set(key, []);
            }
            subscribers.get(key).push(callback);
            return () => unsubscribe(key, callback);
        }

        /**
         * Unsubscribe from state changes
         * @param {string} key - State key
         * @param {Function} callback - Callback to remove
         */
        function unsubscribe(key, callback) {
            if (subscribers.has(key)) {
                const cbs = subscribers.get(key);
                const idx = cbs.indexOf(callback);
                if (idx > -1) cbs.splice(idx, 1);
            }
        }

        /**
         * Update state and notify subscribers
         * @param {string} key - State key
         * @param {*} value - New value
         */
        function setState(key, value) {
            const oldValue = state[key];
            state[key] = value;
            
            if (subscribers.has(key)) {
                subscribers.get(key).forEach(cb => cb(value, oldValue));
            }
            
            if (subscribers.has('*')) {
                subscribers.get('*').forEach(cb => cb(key, value, oldValue));
            }
        }

        /**
         * Get state value
         * @param {string} key - State key
         * @returns {*} State value
         */
        function getState(key) {
            return key ? state[key] : { ...state };
        }

        /**
         * Reset state to defaults
         */
        function reset() {
            state = {
                currentView: 'home',
                soundEnabled: true,
                highContrast: false,
                focusMode: false,
                username: 'Jogador',
                xp: 0,
                level: 1,
                matches: [],
                reactionBest: null,
                reactionLast: null,
                reactionAverage: null,
                reactionTrend: [],
                patternBest: null,
                patternRound: 0
            };
        }

        return { subscribe, setState, getState, reset };
    })();

    // ============================================
    // STORAGE MANAGER (with fallback)
    // ============================================
    const StorageManager = (function() {
        let useMemoryFallback = false;
        const memoryStore = {};

        /**
         * Initialize storage, detect if localStorage is available
         */
        function init() {
            try {
                const testKey = '__nexus_test__';
                localStorage.setItem(testKey, 'test');
                localStorage.removeItem(testKey);
            } catch (e) {
                useMemoryFallback = true;
                Toast.show('Armazenamento local indisponível. Dados temporários.', 'warning');
            }
        }

        /**
         * Save data to storage
         * @param {string} key - Storage key
         * @param {*} data - Data to save
         */
        function save(key, data) {
            try {
                if (useMemoryFallback) {
                    memoryStore[key] = data;
                } else {
                    localStorage.setItem(key, JSON.stringify(data));
                }
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    Toast.show('Armazenamento cheio. Alguns dados não foram salvos.', 'error');
                }
                memoryStore[key] = data;
            }
        }

        /**
         * Load data from storage
         * @param {string} key - Storage key
         * @param {*} defaultValue - Default if not found
         * @returns {*} Loaded data or default
         */
        function load(key, defaultValue = null) {
            try {
                if (useMemoryFallback) {
                    return memoryStore[key] !== undefined ? memoryStore[key] : defaultValue;
                }
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                Toast.show('Erro ao carregar dados.', 'error');
                return defaultValue;
            }
        }

        /**
         * Remove data from storage
         * @param {string} key - Storage key
         */
        function remove(key) {
            try {
                if (useMemoryFallback) {
                    delete memoryStore[key];
                } else {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                // Silent fail
            }
        }

        /**
         * Clear all storage
         */
        function clear() {
            try {
                if (useMemoryFallback) {
                    Object.keys(memoryStore).forEach(k => delete memoryStore[k]);
                } else {
                    localStorage.clear();
                }
            } catch (e) {
                // Silent fail
            }
        }

        return { init, save, load, remove, clear };
    })();

    // ============================================
    // TOAST NOTIFICATION SYSTEM
    // ============================================
    const Toast = (function() {
        const container = null;
        const queue = [];
        const autoDismissDelay = 4000;
        let isAnimating = false;

        /**
         * Show a toast notification
         * @param {string} message - Toast message
         * @param {string} type - Toast type (success, error, warning, info)
         */
        function show(message, type = 'info') {
            const container = document.getElementById('toast-container');
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.setAttribute('role', 'alert');
            toast.textContent = message;

            queue.push(toast);
            container.appendChild(toast);

            setTimeout(() => dismiss(toast), autoDismissDelay);
        }

        /**
         * Dismiss a toast
         * @param {HTMLElement} toast - Toast element
         */
        function dismiss(toast) {
            if (!toast || toast.classList.contains('hiding')) return;

            toast.classList.add('hiding');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                const idx = queue.indexOf(toast);
                if (idx > -1) queue.splice(idx, 1);
            }, 250);
        }

        return { show, dismiss };
    })();

    // ============================================
    // AUDIO MANAGER (Web Audio API Simulation)
    // ============================================
    const AudioManager = (function() {
        let audioContext = null;
        let enabled = true;

        /**
         * Initialize audio context
         */
        function init() {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                enabled = false;
            }
        }

        /**
         * Play a tone
         * @param {number} frequency - Frequency in Hz
         * @param {number} duration - Duration in ms
         * @param {string} type - Wave type (sine, square, triangle, sawtooth)
         */
        function playTone(frequency, duration, type = 'sine') {
            if (!enabled || !audioContext) return;

            try {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.type = type;
                oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
                
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration / 1000);
            } catch (e) {
                // Silent fail
            }
        }

        /**
         * Play success sound
         */
        function playSuccess() {
            playTone(523.25, 150, 'sine');
            setTimeout(() => playTone(659.25, 150, 'sine'), 100);
        }

        /**
         * Play error sound
         */
        function playError() {
            playTone(196, 300, 'sawtooth');
        }

        /**
         * Play click sound
         */
        function playClick() {
            playTone(800, 50, 'triangle');
        }

        /**
         * Set enabled state
         * @param {boolean} value - Enable/disable
         */
        function setEnabled(value) {
            enabled = value;
            if (value && audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }
        }

        return { init, playSuccess, playError, playClick, setEnabled };
    })();

    // ============================================
    // ROUTER (SPA-like Hash Routing)
    // ============================================
    const Router = (function() {
        let previousView = 'home';

        /**
         * Navigate to a view
         * @param {string} viewName - View name
         */
        function navigate(viewName) {
            const views = document.querySelectorAll('.view');
            views.forEach(view => {
                view.classList.remove('view-active');
            });

            const targetView = document.getElementById(`view-${viewName}`);
            if (targetView) {
                targetView.classList.add('view-active');
                StateController.setState('currentView', viewName);
                previousView = StateController.getState('currentView');
                window.location.hash = viewName;
            }
        }

        /**
         * Handle hash change
         */
        function handleHashChange() {
            const hash = window.location.hash.slice(1) || 'home';
            const validViews = ['home', 'reaction-racer', 'pattern-decoder'];
            
            if (validViews.includes(hash)) {
                navigate(hash);
            } else {
                navigate('home');
            }
        }

        /**
         * Go back to previous view
         */
        function back() {
            navigate(previousView);
        }

        /**
         * Initialize router
         */
        function init() {
            window.addEventListener('hashchange', handleHashChange);
            handleHashChange();
        }

        return { navigate, back, init };
    })();

    // ============================================
    // MODAL MANAGER
    // ============================================
    const ModalManager = (function() {
        let previouslyFocused = null;
        let focusableElements = [];
        let firstFocusable = null;
        let lastFocusable = null;

        /**
         * Open modal
         * @param {string} modalId - Modal element ID
         */
        function open(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;

            previouslyFocused = document.activeElement;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Setup focus trap
            focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            firstFocusable = focusableElements[0];
            lastFocusable = focusableElements[focusableElements.length - 1];

            // Focus first element
            if (firstFocusable) {
                setTimeout(() => firstFocusable.focus(), 100);
            }

            // Add keyboard listener
            modal.addEventListener('keydown', handleKeyDown);
        }

        /**
         * Close modal
         * @param {string} modalId - Modal element ID
         */
        function close(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;

            modal.classList.remove('active');
            document.body.style.overflow = '';
            modal.removeEventListener('keydown', handleKeyDown);

            // Restore focus
            if (previouslyFocused) {
                previouslyFocused.focus();
            }
        }

        /**
         * Handle keyboard events for focus trap
         * @param {KeyboardEvent} e - Keyboard event
         */
        function handleKeyDown(e) {
            if (e.key === 'Escape') {
                const modal = e.target.closest('.modal-overlay');
                if (modal) {
                    close(modal.id);
                }
            }

            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
            }
        }

        return { open, close };
    })();

    // ============================================
    // GAME ENGINE BASE CLASS
    // ============================================
    class GameEngine {
        constructor(name) {
            this.name = name;
            this.isRunning = false;
            this.isPaused = false;
            this.listeners = [];
            this.intervals = [];
            this.timeouts = [];
            this.animationFrames = [];
        }

        init() {}
        start() { this.isRunning = true; }
        pause() { this.isPaused = true; }
        resume() { this.isPaused = false; }
        cleanup() {
            this.isRunning = false;
            this.isPaused = false;

            // Remove all listeners
            this.listeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
            this.listeners = [];

            // Clear all intervals
            this.intervals.forEach(id => clearInterval(id));
            this.intervals = [];

            // Clear all timeouts
            this.timeouts.forEach(id => clearTimeout(id));
            this.timeouts = [];

            // Cancel all animation frames
            this.animationFrames.forEach(id => cancelAnimationFrame(id));
            this.animationFrames = [];
        }

        addListener(element, event, handler) {
            element.addEventListener(event, handler);
            this.listeners.push({ element, event, handler });
        }

        addInterval(callback, delay) {
            const id = setInterval(callback, delay);
            this.intervals.push(id);
            return id;
        }

        addTimeout(callback, delay) {
            const id = setTimeout(callback, delay);
            this.timeouts.push(id);
            return id;
        }

        addAnimationFrame(callback) {
            const id = requestAnimationFrame(callback);
            this.animationFrames.push(id);
            return id;
        }

        handleInput(input) {}
    }

    // ============================================
    // REACTION RACER GAME
    // ============================================
    class ReactionRacer extends GameEngine {
        constructor() {
            super('reaction-racer');
            this.state = 'idle'; // idle, waiting, ready, finished
            this.startTime = 0;
            this.waitTimeout = null;
            this.lastTimes = [];
            this.display = null;
            this.area = null;
        }

        init() {
            this.display = document.getElementById('reaction-display');
            this.area = document.getElementById('reaction-area');

            if (!this.display || !this.area) return;

            this.addListener(this.display, 'click', () => this.handleClick());
            this.addListener(this.display, 'touchstart', (e) => {
                e.preventDefault();
                this.handleClick();
            });

            this.updateStats();
            this.updateTrendChart();
        }

        start() {
            super.start();
            this.resetState();
        }

        resetState() {
            this.state = 'waiting';
            this.display.className = 'reaction-display waiting';
            this.display.querySelector('.instruction').textContent = 'Aguarde...';

            const delay = this.randomDelay(1500, 4000);
            this.waitTimeout = this.addTimeout(() => this.showReady(), delay);
        }

        randomDelay(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        showReady() {
            if (!this.isRunning || this.state !== 'waiting') return;

            this.state = 'ready';
            this.startTime = performance.now();
            this.display.className = 'reaction-display ready';
            this.display.querySelector('.instruction').textContent = 'CLIQUE!';
            AudioManager.playClick();
        }

        handleClick() {
            if (!this.isRunning) return;

            if (this.state === 'waiting') {
                // Early click
                clearTimeout(this.waitTimeout);
                this.state = 'finished';
                this.display.className = 'reaction-display clicked';
                this.display.querySelector('.instruction').textContent = 'Muito cedo! Clique para tentar novamente.';
                AudioManager.playError();
                return;
            }

            if (this.state === 'ready') {
                const reactionTime = performance.now() - this.startTime;
                this.recordTime(reactionTime);
                this.state = 'finished';
                this.display.className = 'reaction-display';
                this.display.querySelector('.instruction').textContent = `${Math.round(reactionTime)}ms - Clique para jogar novamente`;
                AudioManager.playSuccess();
                return;
            }

            if (this.state === 'finished' || this.state === 'idle') {
                this.resetState();
            }
        }

        recordTime(time) {
            this.lastTimes.push(time);
            if (this.lastTimes.length > 5) {
                this.lastTimes.shift();
            }

            const best = Math.min(...this.lastTimes);
            const average = this.lastTimes.reduce((a, b) => a + b, 0) / this.lastTimes.length;

            StateController.setState('reactionLast', Math.round(time));
            StateController.setState('reactionBest', Math.round(best));
            StateController.setState('reactionAverage', Math.round(average));
            StateController.setState('reactionTrend', [...this.lastTimes]);

            // Save to storage
            const savedData = StorageManager.load('nexus_reaction_data', {});
            savedData.best = Math.round(best);
            savedData.times = this.lastTimes.map(t => Math.round(t));
            StorageManager.save('nexus_reaction_data', savedData);

            // Add XP
            this.addXP(time);

            // Record match
            this.recordMatch(time);

            this.updateStats();
            this.updateTrendChart();
        }

        addXP(time) {
            let xpGained = 0;
            if (time < 200) xpGained = 25;
            else if (time < 250) xpGained = 20;
            else if (time < 300) xpGained = 15;
            else xpGained = 10;

            const currentXP = StateController.getState('xp');
            const currentLevel = StateController.getState('level');
            const newXp = currentXP + xpGained;
            const newLevel = Math.floor(newXp / 100) + 1;

            StateController.setState('xp', newXp % 100);
            if (newLevel > currentLevel) {
                StateController.setState('level', newLevel);
                Toast.show(`Nível ${newLevel} alcançado!`, 'success');
                AudioManager.playSuccess();
            }

            this.updateXPDisplay();
        }

        recordMatch(time) {
            const matches = StateController.getState('matches');
            matches.unshift({
                game: 'Reaction Racer',
                score: `${Math.round(time)}ms`,
                timestamp: Date.now()
            });
            if (matches.length > 10) matches.pop();
            StateController.setState('matches', matches);
            StorageManager.save('nexus_matches', matches);
        }

        updateStats() {
            const best = StateController.getState('reactionBest');
            const last = StateController.getState('reactionLast');
            const average = StateController.getState('reactionAverage');

            const bestEl = document.getElementById('reaction-current-best');
            const lastEl = document.getElementById('reaction-last');
            const avgEl = document.getElementById('reaction-average');
            const homeBestEl = document.getElementById('reaction-best');

            if (bestEl) bestEl.textContent = best !== null ? `${best} ms` : '-- ms';
            if (lastEl) lastEl.textContent = last !== null ? `${last} ms` : '-- ms';
            if (avgEl) avgEl.textContent = average !== null ? `${average} ms` : '-- ms';
            if (homeBestEl) homeBestEl.textContent = best !== null ? `${best} ms` : '-- ms';
        }

        updateTrendChart() {
            const trendLine = document.getElementById('trend-line');
            if (!trendLine) return;

            const times = StateController.getState('reactionTrend');
            if (times.length < 2) {
                trendLine.setAttribute('points', '');
                return;
            }

            const maxTime = Math.max(...times);
            const minTime = Math.min(...times);
            const range = maxTime - minTime || 1;

            const points = times.map((time, index) => {
                const x = (index / (times.length - 1)) * 200;
                const y = 60 - ((time - minTime) / range) * 50 - 5;
                return `${x},${y}`;
            }).join(' ');

            trendLine.setAttribute('points', points);
        }

        updateXPDisplay() {
            const xp = StateController.getState('xp');
            const level = StateController.getState('level');
            const fill = document.getElementById('xp-fill');
            const text = document.getElementById('xp-text');

            if (fill) fill.style.width = `${xp}%`;
            if (text) text.textContent = `Nível ${level} • ${xp}/100 XP`;
        }

        cleanup() {
            super.cleanup();
            this.state = 'idle';
        }
    }

    // ============================================
    // PATTERN DECODER GAME
    // ============================================
    class PatternDecoder extends GameEngine {
        constructor() {
            super('pattern-decoder');
            this.sequence = [];
            this.userSequence = [];
            this.round = 0;
            this.isShowingSequence = false;
            this.buttons = [];
        }

        init() {
            this.buttons = Array.from(document.querySelectorAll('.pattern-btn'));
            
            this.buttons.forEach(btn => {
                this.addListener(btn, 'click', () => this.handleButtonClick(parseInt(btn.dataset.index)));
            });

            const startBtn = document.getElementById('pattern-start');
            if (startBtn) {
                this.addListener(startBtn, 'click', () => this.startGame());
            }

            this.updateStats();
        }

        start() {
            super.start();
        }

        startGame() {
            this.sequence = [];
            this.userSequence = [];
            this.round = 0;
            this.isShowingSequence = false;

            this.buttons.forEach(btn => {
                btn.disabled = false;
            });

            this.nextRound();
        }

        nextRound() {
            this.round++;
            this.userSequence = [];
            StateController.setState('patternRound', this.round);

            const roundEl = document.getElementById('pattern-round');
            const statusEl = document.getElementById('pattern-status');

            if (roundEl) roundEl.textContent = this.round;
            if (statusEl) statusEl.textContent = 'Observe a sequência';

            // Add new step to sequence
            this.sequence.push(Math.floor(Math.random() * 4));

            // Show sequence after delay
            this.addTimeout(() => this.showSequence(), 1000);
        }

        showSequence() {
            if (!this.isRunning) return;

            this.isShowingSequence = true;
            this.buttons.forEach(btn => btn.disabled = true);

            let index = 0;
            const showStep = () => {
                if (!this.isRunning || index >= this.sequence.length) {
                    this.isShowingSequence = false;
                    this.buttons.forEach(btn => btn.disabled = false);
                    const statusEl = document.getElementById('pattern-status');
                    if (statusEl) statusEl.textContent = 'Sua vez!';
                    return;
                }

                const btnIndex = this.sequence[index];
                this.flashButton(btnIndex);

                index++;
                this.addTimeout(showStep, 600);
            };

            showStep();
        }

        flashButton(index) {
            const btn = this.buttons[index];
            if (!btn) return;

            btn.classList.add('active');
            AudioManager.playTone([523.25, 659.25, 783.99, 1046.50][index], 200, 'sine');

            this.addTimeout(() => {
                btn.classList.remove('active');
            }, 300);
        }

        handleButtonClick(index) {
            if (!this.isRunning || this.isShowingSequence) return;

            this.flashButton(index);
            this.userSequence.push(index);

            // Check if correct
            const currentIndex = this.userSequence.length - 1;
            if (this.userSequence[currentIndex] !== this.sequence[currentIndex]) {
                this.gameOver();
                return;
            }

            // Check if sequence complete
            if (this.userSequence.length === this.sequence.length) {
                this.addTimeout(() => this.nextRound(), 1000);
            }
        }

        gameOver() {
            this.isRunning = false;
            AudioManager.playError();

            const statusEl = document.getElementById('pattern-status');
            if (statusEl) statusEl.textContent = 'Fim de jogo!';

            this.buttons.forEach(btn => btn.disabled = true);

            // Update best score
            const currentBest = StateController.getState('patternBest');
            if (currentBest === null || this.round - 1 > currentBest) {
                StateController.setState('patternBest', this.round - 1);
                StorageManager.save('nexus_pattern_data', { best: this.round - 1 });
                Toast.show('Novo recorde!', 'success');
            }

            // Add XP
            const xpGained = Math.min(this.round * 5, 50);
            const currentXP = StateController.getState('xp');
            const currentLevel = StateController.getState('level');
            const newXp = currentXP + xpGained;
            const newLevel = Math.floor(newXp / 100) + 1;

            StateController.setState('xp', newXp % 100);
            if (newLevel > currentLevel) {
                StateController.setState('level', newLevel);
                Toast.show(`Nível ${newLevel} alcançado!`, 'success');
            }

            // Record match
            const matches = StateController.getState('matches');
            matches.unshift({
                game: 'Pattern Decoder',
                score: `Round ${this.round - 1}`,
                timestamp: Date.now()
            });
            if (matches.length > 10) matches.pop();
            StateController.setState('matches', matches);
            StorageManager.save('nexus_matches', matches);

            this.updateStats();
            this.updateXPDisplay();
        }

        updateStats() {
            const best = StateController.getState('patternBest');
            const bestEl = document.getElementById('pattern-current-best');
            const homeBestEl = document.getElementById('pattern-best');

            if (bestEl) bestEl.textContent = best !== null ? `${best}` : '--';
            if (homeBestEl) homeBestEl.textContent = best !== null ? `${best} rounds` : '-- rounds';
        }

        updateXPDisplay() {
            const xp = StateController.getState('xp');
            const level = StateController.getState('level');
            const fill = document.getElementById('xp-fill');
            const text = document.getElementById('xp-text');

            if (fill) fill.style.width = `${xp}%`;
            if (text) text.textContent = `Nível ${level} • ${xp}/100 XP`;
        }

        cleanup() {
            super.cleanup();
            this.sequence = [];
            this.userSequence = [];
            this.round = 0;
            this.isShowingSequence = false;
            this.buttons.forEach(btn => {
                btn.disabled = true;
                btn.classList.remove('active');
            });
        }
    }

    // ============================================
    // APP CONTROLLER
    // ============================================
    const AppController = (function() {
        let games = {};
        let currentGame = null;

        /**
         * Initialize application
         */
        function init() {
            StorageManager.init();
            AudioManager.init();
            Router.init();
            loadSavedData();
            setupEventListeners();
            initializeGames();
            updateUI();

            StateController.subscribe('soundEnabled', AudioManager.setEnabled);
            StateController.subscribe('highContrast', value => {
                document.documentElement.setAttribute('data-high-contrast', value);
            });
            StateController.subscribe('focusMode', value => {
                document.documentElement.setAttribute('data-focus-mode', value);
            });
            StateController.subscribe('username', value => {
                const el = document.getElementById('username');
                if (el) el.textContent = value;
            });
            StateController.subscribe('xp', updateXPUI);
            StateController.subscribe('level', updateXPUI);
            StateController.subscribe('matches', updateMatchesList);
        }

        /**
         * Load saved data from storage
         */
        function loadSavedData() {
            const settings = StorageManager.load('nexus_settings', {});
            if (settings.soundEnabled !== undefined) {
                StateController.setState('soundEnabled', settings.soundEnabled);
                AudioManager.setEnabled(settings.soundEnabled);
            }
            if (settings.highContrast !== undefined) {
                StateController.setState('highContrast', settings.highContrast);
                document.documentElement.setAttribute('data-high-contrast', settings.highContrast);
            }
            if (settings.focusMode !== undefined) {
                StateController.setState('focusMode', settings.focusMode);
                document.documentElement.setAttribute('data-focus-mode', settings.focusMode);
            }
            if (settings.username) {
                StateController.setState('username', settings.username);
            }

            const reactionData = StorageManager.load('nexus_reaction_data', {});
            if (reactionData.best) StateController.setState('reactionBest', reactionData.best);
            if (reactionData.times) StateController.setState('reactionTrend', reactionData.times);

            const patternData = StorageManager.load('nexus_pattern_data', {});
            if (patternData.best) StateController.setState('patternBest', patternData.best);

            const matches = StorageManager.load('nexus_matches', []);
            StateController.setState('matches', matches);

            const xpData = StorageManager.load('nexus_xp', { xp: 0, level: 1 });
            StateController.setState('xp', xpData.xp);
            StateController.setState('level', xpData.level);
        }

        /**
         * Setup global event listeners
         */
        function setupEventListeners() {
            // Settings button
            const settingsBtn = document.getElementById('settings-btn');
            const settingsClose = document.getElementById('settings-close');
            const settingsModal = document.getElementById('settings-modal');

            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => ModalManager.open('settings-modal'));
            }
            if (settingsClose) {
                settingsClose.addEventListener('click', () => ModalManager.close('settings-modal'));
            }
            if (settingsModal) {
                settingsModal.addEventListener('click', (e) => {
                    if (e.target === settingsModal) {
                        ModalManager.close('settings-modal');
                    }
                });
            }

            // Settings toggles
            const soundToggle = document.getElementById('sound-toggle');
            const contrastToggle = document.getElementById('contrast-toggle');
            const focusToggle = document.getElementById('focus-toggle');
            const usernameInput = document.getElementById('username-input');
            const resetBtn = document.getElementById('reset-data');

            if (soundToggle) {
                soundToggle.addEventListener('click', () => {
                    const newValue = soundToggle.getAttribute('aria-checked') !== 'true';
                    soundToggle.setAttribute('aria-checked', newValue);
                    StateController.setState('soundEnabled', newValue);
                    saveSettings();
                });
            }

            if (contrastToggle) {
                contrastToggle.addEventListener('click', () => {
                    const newValue = contrastToggle.getAttribute('aria-checked') !== 'true';
                    contrastToggle.setAttribute('aria-checked', newValue);
                    StateController.setState('highContrast', newValue);
                    saveSettings();
                });
            }

            if (focusToggle) {
                focusToggle.addEventListener('click', () => {
                    const newValue = focusToggle.getAttribute('aria-checked') !== 'true';
                    focusToggle.setAttribute('aria-checked', newValue);
                    StateController.setState('focusMode', newValue);
                    saveSettings();
                });
            }

            if (usernameInput) {
                usernameInput.addEventListener('change', () => {
                    const value = usernameInput.value.trim() || 'Jogador';
                    StateController.setState('username', value);
                    saveSettings();
                });
            }

            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    StorageManager.clear();
                    StateController.reset();
                    location.reload();
                });
            }

            // Game cards
            const playButtons = document.querySelectorAll('.play-btn');
            playButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const card = btn.closest('.game-card');
                    if (card) {
                        const gameName = card.dataset.game;
                        Router.navigate(gameName);
                    }
                });
            });

            // Back buttons
            const reactionBack = document.getElementById('reaction-back');
            const patternBack = document.getElementById('pattern-back');

            if (reactionBack) {
                reactionBack.addEventListener('click', () => {
                    if (games['reaction-racer']) games['reaction-racer'].cleanup();
                    Router.back();
                });
            }

            if (patternBack) {
                patternBack.addEventListener('click', () => {
                    if (games['pattern-decoder']) games['pattern-decoder'].cleanup();
                    Router.back();
                });
            }

            // Keyboard navigation
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const activeModal = document.querySelector('.modal-overlay.active');
                    if (activeModal) {
                        ModalManager.close(activeModal.id);
                    }
                }
            });
        }

        /**
         * Initialize game instances
         */
        function initializeGames() {
            games['reaction-racer'] = new ReactionRacer();
            games['pattern-decoder'] = new PatternDecoder();

            games['reaction-racer'].init();
            games['pattern-decoder'].init();
        }

        /**
         * Save settings to storage
         */
        function saveSettings() {
            StorageManager.save('nexus_settings', {
                soundEnabled: StateController.getState('soundEnabled'),
                highContrast: StateController.getState('highContrast'),
                focusMode: StateController.getState('focusMode'),
                username: StateController.getState('username')
            });
        }

        /**
         * Update XP UI
         */
        function updateXPUI() {
            const xp = StateController.getState('xp');
            const level = StateController.getState('level');
            const fill = document.getElementById('xp-fill');
            const text = document.getElementById('xp-text');

            if (fill) fill.style.width = `${xp}%`;
            if (text) text.textContent = `Nível ${level} • ${xp}/100 XP`;
        }

        /**
         * Update matches list
         */
        function updateMatchesList(matches) {
            const list = document.getElementById('matches-list');
            if (!list) return;

            if (matches.length === 0) {
                list.innerHTML = '<p class="empty-state">Nenhuma partida recente</p>';
                return;
            }

            list.innerHTML = matches.slice(0, 5).map(match => `
                <div class="match-item" role="listitem">
                    <span class="match-game">${match.game}</span>
                    <span class="match-score">${match.score}</span>
                </div>
            `).join('');
        }

        /**
         * Update UI based on state
         */
        function updateUI() {
            updateXPUI();
            updateMatchesList(StateController.getState('matches'));

            // Update settings toggles
            const soundToggle = document.getElementById('sound-toggle');
            const contrastToggle = document.getElementById('contrast-toggle');
            const focusToggle = document.getElementById('focus-toggle');
            const usernameInput = document.getElementById('username-input');

            if (soundToggle) soundToggle.setAttribute('aria-checked', StateController.getState('soundEnabled'));
            if (contrastToggle) contrastToggle.setAttribute('aria-checked', StateController.getState('highContrast'));
            if (focusToggle) focusToggle.setAttribute('aria-checked', StateController.getState('focusMode'));
            if (usernameInput) usernameInput.value = StateController.getState('username');

            // Update stats displays
            if (games['reaction-racer']) games['reaction-racer'].updateStats();
            if (games['pattern-decoder']) games['pattern-decoder'].updateStats();
        }

        return { init };
    })();

    // ============================================
    // INITIALIZE APPLICATION
    // ============================================
    document.addEventListener('DOMContentLoaded', AppController.init);
})();
