/**
 * Central configuration and constants for DevMate extension
 */

export const CONFIG = {
  UI: {
    POPUP_HEIGHT: 540,
    POPUP_WIDTH: 800,
    SNACKBAR_TIMEOUT: 1400,
    MAX_CAPTURED_REQUESTS: 200,
    MAX_RESPONSE_BODY_SIZE: 1000,
    PASSWORD_LENGTH: 12
  },
  
  STORAGE_KEYS: {
    CAPTURE_ENABLED: 'captureEnabled',
    CAPTURED_REQUESTS: 'capturedRequests',
    SIDE_COLLAPSED: 'sideCollapsed'
  },
  
  DB: {
    NAME: 'DevToolsDB',
    VERSION: 4,
    STORES: {
      USEFUL_LINKS: 'usefulLinks',
      CREDENTIALS: 'credentials',
      PING_REQUESTS: 'pingRequests',
      CODE_SNIPPETS: 'codeSnippets'
    }
  },
  
  ACTION_TYPES: {
    USEFUL_LINKS: 'usefulLinks',
    CREDENTIALS: 'credentials'
  },
  
  ACTIONS: {
    USEFUL_LINKS: 'usefulLinks',
    CREDENTIALS: 'credentials'
  },
  
  GENERATORS: {
    ADJECTIVES: ['fast', 'cool', 'smart', 'silent', 'brave', 'lucky', 'happy', 'wild'],
    ANIMALS: ['lion', 'tiger', 'bear', 'wolf', 'fox', 'eagle', 'hawk', 'owl'],
    EMAIL_PROVIDERS: ['gmail.com', 'yahoo.com', 'outlook.com', 'mail.com'],
    PASSWORD_CHARS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-='
  }
};

export const PANEL_KEYS = {
  LOCAL_STORAGE: 'localStorageVisible',
  LINKS: 'linksListVisible', 
  CREDENTIALS: 'credentialsVisible',
  FETCHES: 'fetchListVisible',
  GENERATOR: 'generateCredentialsVisible',
  CODE_KEEPER: 'codeKeeperVisible',
  PINGER: 'pingerVisible'
};