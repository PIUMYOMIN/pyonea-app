import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import {
  computeWelcomeDisplayProgress,
  getWelcomeLoaderStartedAt,
  hidePyoneaWelcomeLoader,
  isWelcomeLoaderReadyToHide,
  PYONEA_WELCOME_COMPLETE_DELAY_MS,
  PYONEA_WELCOME_FIRST_TARGET,
  setPyoneaWelcomeProgress,
} from '@/utils/pyonea-welcome-loader';
import { hasSeenWelcomeLoader } from '@/utils/welcome-loader-storage';

export function usePyoneaWelcomeLoader(dataProgress: number, enabled = Platform.OS === 'web') {
  const dataProgressRef = useRef(dataProgress);
  dataProgressRef.current = dataProgress;

  useEffect(() => {
    if (!enabled) return;

    if (hasSeenWelcomeLoader()) {
      hidePyoneaWelcomeLoader();
      return;
    }

    let raf = 0;
    let completeTimeout: ReturnType<typeof setTimeout> | null = null;
    let finished = false;
    let lastLogAt = 0;
    let loggedFirstTarget = false;
    const startedAt = getWelcomeLoaderStartedAt();

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const data = dataProgressRef.current;
      const display = computeWelcomeDisplayProgress(elapsed, data);

      setPyoneaWelcomeProgress(display);

      const now = Date.now();
      if (!loggedFirstTarget && display >= PYONEA_WELCOME_FIRST_TARGET - 0.5) {
        loggedFirstTarget = true;
        // #region agent log
        fetch('http://127.0.0.1:7881/ingest/2abef94f-5c12-4a0b-a31b-9ad0887d232d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'763aef'},body:JSON.stringify({sessionId:'763aef',runId:'pre-fix',hypothesisId:'H3',location:'use-pyonea-welcome-loader.ts:tick',message:'Welcome loader reached first target',data:{elapsed,display,data,firstTarget:PYONEA_WELCOME_FIRST_TARGET},timestamp:now})}).catch(()=>{});
        // #endregion
      } else if (now - lastLogAt > 400) {
        lastLogAt = now;
        // #region agent log
        fetch('http://127.0.0.1:7881/ingest/2abef94f-5c12-4a0b-a31b-9ad0887d232d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'763aef'},body:JSON.stringify({sessionId:'763aef',runId:'pre-fix',hypothesisId:'H3',location:'use-pyonea-welcome-loader.ts:tick',message:'Welcome loader progress tick',data:{elapsed,display,data,firstTarget:PYONEA_WELCOME_FIRST_TARGET},timestamp:now})}).catch(()=>{});
        // #endregion
      }

      if (isWelcomeLoaderReadyToHide(elapsed, data, display) && !finished) {
        finished = true;
        // #region agent log
        fetch('http://127.0.0.1:7881/ingest/2abef94f-5c12-4a0b-a31b-9ad0887d232d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'763aef'},body:JSON.stringify({sessionId:'763aef',runId:'pre-fix',hypothesisId:'H3',location:'use-pyonea-welcome-loader.ts:ready',message:'Welcome loader ready to hide',data:{elapsed,display,data},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        completeTimeout = window.setTimeout(() => {
          hidePyoneaWelcomeLoader(true);
        }, PYONEA_WELCOME_COMPLETE_DELAY_MS);
        return;
      }

      if (!finished) {
        raf = window.requestAnimationFrame(tick);
      }
    };

    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      if (completeTimeout) {
        window.clearTimeout(completeTimeout);
      }
    };
  }, [enabled]);
}
