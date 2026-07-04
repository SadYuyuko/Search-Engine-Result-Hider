// ==UserScript==
// @name         搜索引擎结果屏蔽器 Dev Loader
// @name:zh-CN   搜索引擎结果屏蔽器 Dev Loader
// @name:en      Search Engine Result Hider Dev Loader
// @namespace    https://github.com/SadYuyuko
// @version      0.1.0
// @description        Local Vite development loader for Search Engine Result Hider.
// @description:zh-CN  用于搜索引擎结果屏蔽器的本地 Vite 开发加载器。
// @description:en     Local Vite development loader for Search Engine Result Hider.
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZWQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCI+PC9jaXJjbGU+PGxpbmUgeDE9IjQuOTMiIHkxPSI0LjkzIiB4Mj0iMTkuMDciIHkyPSIxOS4wNyI+PC9saW5lPjwvc3ZnPg==
// @author       南雪莲
// @homepageURL  https://greasyfork.org/zh-CN/scripts/552394
// @homepageURL  https://github.com/SadYuyuko/Search-Engine-Result-Hider
// @license      MIT
// @match        *://*.bing.com/*
// @match        *://*.google.com/*
// @match        *://*.yandex.com/*
// @match        *://*.duckduckgo.com/*
// @include      /^https?:\/\/([\w-]+\.)?ya\.ru\/.*$/
// @include      /^https?:\/\/([\w-]+\.)?(?:duckduckgo\.com|ddg\.gg)\/.*$/
// @include      /^https?:\/\/([\w-]+\.)?bing\.(?:com|[a-z]{2}(?:\.[a-z]{2})?)\/.*$/
// @include      /^https?:\/\/([\w-]+\.)?google\.(?:com|[a-z]{2,3}(?:\.[a-z]{2})?|[a-z]{4,})\/.*$/
// @include      /^https?:\/\/([\w-]+\.)?yandex\.(?:com|[a-z]{2,3}(?:\.[a-z]{2})?|[a-z]{4,})\/.*$/
// @connect      127.0.0.1
// @connect      localhost
// @connect      dav.jianguoyun.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  const DEV_ORIGIN = 'http://127.0.0.1:5173';
  const DEV_WS_URL = 'ws://127.0.0.1:5173/';
  const ENTRY_PATH = '/Search-Engine-Result-Hider_autoupdate.user.js';
  const RELOAD_DEBOUNCE_MS = 150;

  let reloadTimer = 0;

  function scheduleReload(reason) {
    console.info(`[SERH Dev Loader] ${reason}; reloading page...`);
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => location.reload(), RELOAD_DEBOUNCE_MS);
  }

  function loadUserscript() {
    const url = `${DEV_ORIGIN}${ENTRY_PATH}?t=${Date.now()}`;
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      nocache: true,
      onload(response) {
        if (response.status < 200 || response.status >= 300) {
          console.error(`[SERH Dev Loader] Failed to load ${url}: HTTP ${response.status}`);
          return;
        }

        try {
          eval(`${response.responseText}\n//# sourceURL=${url}`);
          console.info(`[SERH Dev Loader] Loaded ${url}`);
        } catch (error) {
          console.error('[SERH Dev Loader] Failed to execute userscript:', error);
        }
      },
      onerror(error) {
        console.error(`[SERH Dev Loader] Failed to request ${url}. Is Vite running?`, error);
      }
    });
  }

  function connectViteHmr() {
    let socket;

    try {
      socket = new WebSocket(DEV_WS_URL, 'vite-hmr');
    } catch (error) {
      console.error('[SERH Dev Loader] Failed to connect Vite HMR websocket:', error);
      return;
    }

    socket.addEventListener('open', () => {
      console.info('[SERH Dev Loader] Connected to Vite HMR websocket.');
    });

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'update' || payload.type === 'full-reload') {
          scheduleReload(`Vite ${payload.type}`);
        }
      } catch (error) {
        console.debug('[SERH Dev Loader] Ignored non-JSON Vite websocket message:', event.data);
      }
    });

    socket.addEventListener('close', () => {
      console.warn('[SERH Dev Loader] Vite HMR websocket closed; reconnecting soon...');
      setTimeout(connectViteHmr, 1000);
    });

    socket.addEventListener('error', (error) => {
      console.error('[SERH Dev Loader] Vite HMR websocket error:', error);
    });
  }

  loadUserscript();
  connectViteHmr();
})();
