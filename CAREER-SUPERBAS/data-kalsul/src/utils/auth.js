/* ═══════════════════════════════════════════════════
   Auth State Manager
   ═══════════════════════════════════════════════════ */

import { api } from './api.js';

let currentUser = null;
const listeners = [];

export const auth = {
  get user() { return currentUser; },

  async check() {
    try {
      const data = await api.me();
      currentUser = data.user || null;
      return currentUser;
    } catch {
      currentUser = null;
      return null;
    }
  },

  async login(username, password) {
    const data = await api.login(username, password);
    currentUser = data.user;
    listeners.forEach(fn => fn(currentUser));
    return currentUser;
  },

  async logout() {
    await api.logout();
    currentUser = null;
    listeners.forEach(fn => fn(null));
  },

  onChange(fn) {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  }
};
