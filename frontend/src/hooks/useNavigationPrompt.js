import { useContext, useEffect } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';

/**
 * Intercepts in-app navigation (Link clicks, navigate() calls) when `when` is true.
 * Shows a confirm dialog with the given message before allowing navigation.
 */
export function useNavigationPrompt(when, message) {
  const { navigator } = useContext(UNSAFE_NavigationContext);

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
}
