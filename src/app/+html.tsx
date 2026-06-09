import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const loaderStyles = `
html,
body {
  min-height: 100%;
  margin: 0;
  background: #f9fafb;
}

#pyonea-web-loader {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  transition: opacity 220ms ease, visibility 220ms ease;
}

#pyonea-web-loader.is-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.pyonea-loader-card {
  width: min(86vw, 360px);
  padding: 32px 28px;
  border: 1px solid #f3f4f6;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 20px 45px rgba(15, 23, 42, 0.08);
  text-align: center;
}

.pyonea-loader-mark {
  display: flex;
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #f0fdf4;
}

.pyonea-loader-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #bbf7d0;
  border-top-color: #16a34a;
  border-radius: 999px;
  animation: pyonea-spin 800ms linear infinite;
}

.pyonea-loader-brand {
  color: #16a34a;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.2;
}

.pyonea-loader-brand span {
  color: #9ca3af;
}

.pyonea-loader-text {
  margin-top: 8px;
  color: #6b7280;
  font-size: 14px;
  line-height: 1.5;
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

export default function RootHtml({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();

  return (
    <html {...htmlAttributes}>
      <head>
        <ScrollViewStyleReset />
        {headNodes}
        <style dangerouslySetInnerHTML={{ __html: loaderStyles }} />
      </head>
      <body {...bodyAttributes}>
        <div id="pyonea-web-loader" role="status" aria-live="polite" aria-label="Loading Pyonea marketplace">
          <div className="pyonea-loader-card">
            <div className="pyonea-loader-mark">
              <div className="pyonea-loader-spinner" />
            </div>
            <div className="pyonea-loader-brand">
              Pyonea<span>.com</span>
            </div>
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
