import {
  ScrollViewStyleReset,
  useServerDocumentContext,
} from "expo-router/html";
import type { PropsWithChildren } from "react";

import { BRAND_LOGO_BACKGROUND } from "@/constants/brand";
import { IMAGE_BASE_URL, SITE_PUBLIC_URL } from "@/config/native";

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
  transition: opacity 120ms ease, visibility 120ms ease;
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
  font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
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
  var loader = document.getElementById('pyonea-web-loader');
  if (!loader) return;

  var fillWrap = loader.querySelector('.pyonea-fill-wrap');
  var fillClip = loader.querySelector('.pyonea-fill-clip');
  var startedAt = Date.now();

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
    loader.classList.add('is-hidden');
    window.setTimeout(function () {
      if (loader && loader.parentNode) {
        loader.parentNode.removeChild(loader);
      }
      delete window.__pyoneaWelcome;
    }, 130);
  }

  window.__pyoneaWelcome = {
    setProgress: applyProgress,
    hide: hideLoader,
    startedAt: startedAt,
  };

  try {
    if (localStorage.getItem('pyonea-welcome-seen') === '1') {
      hideLoader();
      return;
    }
  } catch (e) {}

  applyProgress(72);

  window.setTimeout(function () {
    if (window.__pyoneaWelcome) {
      hideLoader();
    }
  }, 5000);
})();
`;

const themeBootstrapScript = `
(function () {
  try {
    var root = document.documentElement;
    var urlLang = new URLSearchParams(window.location.search).get('lang');
    var storedLang = localStorage.getItem('pyonea_language') || localStorage.getItem('i18nextLng');
    var langSource = urlLang || storedLang || '';
    var normalizedLang = String(langSource).toLowerCase();
    if (normalizedLang.indexOf('en') === 0) {
      root.lang = 'en';
    } else if (normalizedLang.indexOf('my') === 0 || normalizedLang.indexOf('mm') === 0) {
      root.lang = 'my';
    }

    var storageKey = 'pyonea-theme';
    var theme = localStorage.getItem(storageKey);
    if (theme !== 'dark' && theme !== 'light') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var isDark = theme === 'dark';
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
  const preconnectOrigins = [...new Set(
    [SITE_PUBLIC_URL, IMAGE_BASE_URL]
      .map((value) => {
        try {
          return new URL(value).origin;
        } catch {
          return null;
        }
      })
      .filter((origin): origin is string => Boolean(origin)),
  )];

  return (
    <html {...htmlAttributes} lang="my">
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
        {headNodes}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=new URLSearchParams(location.search).get('lang');document.documentElement.lang=(l==='my'||l==='en')?l:'my';}catch(e){}})();`,
          }}
        />
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
