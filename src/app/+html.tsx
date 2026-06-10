import {
  ScrollViewStyleReset,
  useServerDocumentContext,
} from "expo-router/html";
import type { PropsWithChildren } from "react";

import { BRAND_LOGO_BACKGROUND } from "@/constants/brand";
import { getPreconnectOrigins } from "@/utils/image-optimization";

const loaderStyles = `
:root {
  --app-bg: #f9fafb;
  --welcome-fill: ${BRAND_LOGO_BACKGROUND};
  --welcome-stroke: #cbd5e1;
}

html.dark {
  --app-bg: #020617;
  --welcome-fill: #4ade80;
  --welcome-stroke: #444444;
}

@font-face {
  font-family: 'Torus-SemiBold';
  src: url('/fonts/Torus-SemiBold.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

html,
body {
  min-height: 100%;
  width: 100%;
  max-width: 100%;
  margin: 0;
  overflow-x: hidden;
  background: var(--app-bg);
}

#pyonea-web-loader {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-bg);
  transition: opacity 260ms ease, visibility 260ms ease;
}

#pyonea-web-loader.is-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.pyonea-fill-wrap {
  position: relative;
  display: inline-grid;
  line-height: 1.15;
  overflow: visible;
}

.pyonea-fill-outline,
.pyonea-fill-clip {
  grid-column: 1;
  grid-row: 1;
}

.pyonea-fill-outline,
.pyonea-fill-text {
  font-family: 'Torus-SemiBold', ui-sans-serif, system-ui, sans-serif;
  font-size: clamp(3rem, 12vw, 8rem);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.02em;
  white-space: nowrap;
  user-select: none;
}

.pyonea-fill-outline {
  display: block;
  color: transparent;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke: 2px var(--welcome-stroke);
}

.pyonea-fill-wrap.is-complete .pyonea-fill-outline {
  -webkit-text-stroke: 2px var(--welcome-fill);
}

.pyonea-fill-clip {
  overflow: hidden;
  width: 0%;
  max-width: 100%;
  justify-self: start;
  align-self: stretch;
  transition: width 450ms ease-out;
  will-change: width;
}

.pyonea-fill-text {
  display: block;
  color: var(--welcome-fill);
  -webkit-text-fill-color: var(--welcome-fill);
}
`;

const loaderScript = `
(function () {
  var HALF_MS = 1200;
  var FIRST_TARGET = 80;
  var loader = document.getElementById('pyonea-web-loader');
  if (!loader) return;

  var fillWrap = loader.querySelector('.pyonea-fill-wrap');
  var fillClip = loader.querySelector('.pyonea-fill-clip');
  var startedAt = Date.now();
  var bootstrapRaf = 0;

  function applyProgress(progress) {
    var clamped = Math.max(0, Math.min(100, Number(progress) || 0));
    if (fillClip) {
      fillClip.style.width = clamped + '%';
    }

    if (fillWrap) {
      if (clamped >= 100) {
        fillWrap.classList.add('is-complete');
      } else {
        fillWrap.classList.remove('is-complete');
      }
    }
  }

  function hideLoader() {
    if (bootstrapRaf) {
      cancelAnimationFrame(bootstrapRaf);
      bootstrapRaf = 0;
    }
    loader.classList.add('is-hidden');
    window.setTimeout(function () {
      if (loader && loader.parentNode) {
        loader.parentNode.removeChild(loader);
      }
      delete window.__pyoneaWelcome;
    }, 280);
  }

  function bootstrapHalfFill() {
    var elapsed = Date.now() - startedAt;
    var firstProgress = Math.min(FIRST_TARGET, (elapsed / HALF_MS) * FIRST_TARGET);
    applyProgress(firstProgress);
    if (firstProgress < FIRST_TARGET) {
      bootstrapRaf = requestAnimationFrame(bootstrapHalfFill);
    }
  }

  window.__pyoneaWelcome = {
    setProgress: function (progress) {
      if (bootstrapRaf) {
        cancelAnimationFrame(bootstrapRaf);
        bootstrapRaf = 0;
      }
      applyProgress(progress);
    },
    hide: hideLoader,
    startedAt: startedAt,
  };

  try {
    if (localStorage.getItem('pyonea-welcome-seen') === '1') {
      hideLoader();
      return;
    }
  } catch (e) {}

  applyProgress(0);
  bootstrapRaf = requestAnimationFrame(bootstrapHalfFill);

  window.setTimeout(function () {
    if (window.__pyoneaWelcome) {
      hideLoader();
    }
  }, 30000);
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
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } =
    useServerDocumentContext();
  const preconnectOrigins = getPreconnectOrigins();

  return (
    <html {...htmlAttributes} lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <ScrollViewStyleReset />
        {preconnectOrigins.map((origin) => (
          <link
            key={origin}
            rel="preconnect"
            href={origin}
            crossOrigin="anonymous"
          />
        ))}
        {preconnectOrigins.map((origin) => (
          <link key={`${origin}-dns`} rel="dns-prefetch" href={origin} />
        ))}
        <link
          rel="preload"
          href="/fonts/Torus-SemiBold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {headNodes}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <style dangerouslySetInnerHTML={{ __html: loaderStyles }} />
      </head>
      <body {...bodyAttributes}>
        <div
          id="pyonea-web-loader"
          role="status"
          aria-live="polite"
          aria-label="Loading Pyonea"
        >
          <div className="pyonea-fill-wrap">
            <span className="pyonea-fill-outline" aria-hidden="true">
              Pyonea
            </span>
            <div className="pyonea-fill-clip" aria-hidden="true">
              <span className="pyonea-fill-text">Pyonea</span>
            </div>
          </div>
        </div>
        {children}
        {bodyNodes}
        <script dangerouslySetInnerHTML={{ __html: loaderScript }} />
      </body>
    </html>
  );
}
