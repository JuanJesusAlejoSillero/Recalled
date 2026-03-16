import { useContext, useEffect } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';

/**
 * Full navigation guard: intercepts in-app navigation (Link clicks, navigate()),
 * browser close/refresh (beforeunload), and browser back/forward (popstate).
 */
export function useNavigationPrompt(when, message) {
  const { navigator } = useContext(UNSAFE_NavigationContext);

  // In-app navigation (Link clicks, navigate() calls)
  useEffect(() => {
    if (!when) return;

    const originalPush = navigator.push;
    const originalReplace = navigator.replace;

    navigator.push = (...args) => {
      if (window.confirm(message)) {
        originalPush.apply(navigator, args);
      }
    };

    navigator.replace = (...args) => {
      if (window.confirm(message)) {
        originalReplace.apply(navigator, args);
      }
    };

    return () => {
      navigator.push = originalPush;
      navigator.replace = originalReplace;
    };
  }, [when, message, navigator]);

  // Browser close/refresh
  useEffect(() => {
    if (!when) return;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [when]);

  // Browser back/forward buttons
  useEffect(() => {
    if (!when) return;
    // Push an extra history entry so popstate fires on back
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      if (window.confirm(message)) {
        // Allow – go back for real
        window.history.back();
      } else {
        // Stay – push again so further back presses are caught
        window.history.pushState(null, '', window.location.href);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [when, message]);
}
