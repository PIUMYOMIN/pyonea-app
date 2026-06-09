import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { BRAND_LOGO_BACKGROUND } from '@/constants/brand';

const loaderStyles = `
:root {
  --app-bg: #f9fafb;
}

html.dark {
  --app-bg: #020617;
}

html,
body {
  min-height: 100%;
  margin: 0;
  background: var(--app-bg);
}

#pyonea-web-loader {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${BRAND_LOGO_BACKGROUND};
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  transition: opacity 220ms ease, visibility 220ms ease;
}

#pyonea-web-loader.is-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.pyonea-loader-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
}

.pyonea-loader-logo {
  width: 120px;
  height: 120px;
  object-fit: contain;
}

.pyonea-loader-spinner {
  width: 28px;
  height: 28px;
  margin-top: 20px;
  border: 3px solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
  border-radius: 999px;
  animation: pyonea-spin 800ms linear infinite;
}

.pyonea-loader-text {
  margin-top: 14px;
  color: rgba(255, 255, 255, 0.92);
  font-size: 14px;
  line-height: 1.5;
  font-weight: 600;
}

@keyframes pyonea-spin {
  to {
    transform: rotate(360deg);
  }
}
`;

const loaderScript = `
(function () {
  var loader = document.getElementById('pyonea-web-loader');
  if (!loader) return;

  function getRoot() {
    return document.getElementById('root') ||
      document.getElementById('__expo') ||
      document.querySelector('[data-expo-root]');
  }

  function rootReady() {
    var root = getRoot();
    return Boolean(root && root.children && root.children.length > 0);
  }

  function hideLoader() {
    loader.classList.add('is-hidden');
    window.setTimeout(function () {
      if (loader && loader.parentNode) {
        loader.parentNode.removeChild(loader);
      }
    }, 260);
  }

  if (rootReady()) {
    hideLoader();
    return;
  }

  var observer = new MutationObserver(function () {
    if (rootReady()) {
      observer.disconnect();
      hideLoader();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('load', function () {
    window.setTimeout(function () {
      if (rootReady()) {
        observer.disconnect();
        hideLoader();
      }
    }, 100);
  });
})();
`;

const themeBootstrapScript = `
(function () {
  try {
    var storageKey = 'pyonea-theme';
    var theme = localStorage.getItem(storageKey);
    if (theme !== 'dark' && theme !== 'light') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var isDark = theme === 'dark';
    var root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.colorScheme = theme;
    root.style.backgroundColor = isDark ? '#020617' : '#f9fafb';
    if (document.body) {
      document.body.style.backgroundColor = isDark ? '#020617' : '#f9fafb';
    }
  } catch (e) {}
})();
`;

export default function RootHtml({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();

  return (
    <html {...htmlAttributes}>
      <head>
        <ScrollViewStyleReset />
        {headNodes}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <style dangerouslySetInnerHTML={{ __html: loaderStyles }} />
      </head>
      <body {...bodyAttributes}>
        <div id="pyonea-web-loader" role="status" aria-live="polite" aria-label="Loading Pyonea marketplace">
          <div className="pyonea-loader-card">
            <img src="/logo.png" alt="Pyonea" className="pyonea-loader-logo" width="120" height="120" />
            <div className="pyonea-loader-spinner" />
            <div className="pyonea-loader-text">Preparing marketplace...</div>
          </div>
        </div>
        {children}
        {bodyNodes}
        <script dangerouslySetInnerHTML={{ __html: loaderScript }} />
      </body>
    </html>
  );
}
