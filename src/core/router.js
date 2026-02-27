/**
 * Router - URL state management using location.hash
 * Tracks chapter, event, and biography state
 */
export class Router {
  constructor() {
    this.listeners = [];
    this.currentState = this.getState();
    this.init();
  }

  init() {
    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      const newState = this.getState();
      if (this.hasStateChanged(newState)) {
        this.currentState = newState;
        this.notifyListeners(newState);
      }
    });
  }

  /**
   * Parse current hash into state object
   * @returns {Object} State object with chapter, event, and bio
   */
  getState() {
    const hash = window.location.hash.slice(1); // Remove '#'
    const state = {
      chapter: null,
      event: null,
      bio: null
    };

    if (!hash) {
      return state;
    }

    // Parse key=value pairs
    const pairs = hash.split('&');
    pairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        const decodedValue = decodeURIComponent(value);
        if (state.hasOwnProperty(key)) {
          state[key] = decodedValue;
        }
      }
    });

    return state;
  }

  /**
   * Update URL hash with new state
   * @param {Object} newState - Partial state to update
   */
  setState(newState) {
    // Merge with current state
    const updatedState = { ...this.currentState, ...newState };

    // Build hash string from state
    const hashParts = [];

    if (updatedState.chapter) {
      hashParts.push(`chapter=${encodeURIComponent(updatedState.chapter)}`);
    }

    if (updatedState.event) {
      hashParts.push(`event=${encodeURIComponent(updatedState.event)}`);
    }

    if (updatedState.bio) {
      hashParts.push(`bio=${encodeURIComponent(updatedState.bio)}`);
    }

    // Update URL
    const newHash = hashParts.length > 0 ? `#${hashParts.join('&')}` : '';

    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
      this.currentState = updatedState;
      this.notifyListeners(updatedState);
    }
  }

  /**
   * Clear specific state keys
   * @param {Array<string>} keys - Keys to clear
   */
  clearState(keys = []) {
    const clearedState = { ...this.currentState };

    keys.forEach(key => {
      if (clearedState.hasOwnProperty(key)) {
        clearedState[key] = null;
      }
    });

    this.setState(clearedState);
  }

  /**
   * Check if state has changed
   * @param {Object} newState - New state to compare
   * @returns {boolean}
   */
  hasStateChanged(newState) {
    return (
      newState.chapter !== this.currentState.chapter ||
      newState.event !== this.currentState.event ||
      newState.bio !== this.currentState.bio
    );
  }

  /**
   * Register a callback for state changes
   * @param {Function} callback - Callback function receiving state
   */
  onChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  /**
   * Remove a registered callback
   * @param {Function} callback - Callback to remove
   */
  offChange(callback) {
    this.listeners = this.listeners.filter(cb => cb !== callback);
  }

  /**
   * Notify all listeners of state change
   * @param {Object} state - Current state
   */
  notifyListeners(state) {
    this.listeners.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Router listener error:', error);
      }
    });
  }

  /**
   * Get current state without parsing hash
   * @returns {Object} Current state
   */
  getCurrentState() {
    return { ...this.currentState };
  }

  /**
   * Navigate back in history
   */
  back() {
    window.history.back();
  }

  /**
   * Navigate forward in history
   */
  forward() {
    window.history.forward();
  }

  /**
   * Replace current state without adding to history
   * @param {Object} newState - State to set
   */
  replaceState(newState) {
    const updatedState = { ...this.currentState, ...newState };
    const hashParts = [];

    if (updatedState.chapter) {
      hashParts.push(`chapter=${encodeURIComponent(updatedState.chapter)}`);
    }

    if (updatedState.event) {
      hashParts.push(`event=${encodeURIComponent(updatedState.event)}`);
    }

    if (updatedState.bio) {
      hashParts.push(`bio=${encodeURIComponent(updatedState.bio)}`);
    }

    const newHash = hashParts.length > 0 ? `#${hashParts.join('&')}` : '';

    window.history.replaceState(null, '', window.location.pathname + newHash);
    this.currentState = updatedState;
    this.notifyListeners(updatedState);
  }
}
