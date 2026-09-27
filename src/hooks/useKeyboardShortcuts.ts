import { useEffect } from 'react';
import { timerEngine } from '../services/timerEngine';
import { audioService } from '../services/audioService';

interface ShortcutHandlers {
  onTogglePlayPause: () => void;
  onNextSegment: () => void;
  onPrevSegment: () => void;
  onResetSegment: () => void;
  onAdd1Min: () => void;
  onSub1Min: () => void;
  onTogglePresenter: () => void;
  onToggleFocusMode?: () => void;
  onPanicAction?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if typing in input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlers.onTogglePlayPause();
          break;

        case 'KeyN':
          e.preventDefault();
          handlers.onNextSegment();
          break;

        case 'KeyP':
          e.preventDefault();
          handlers.onPrevSegment();
          break;

        case 'KeyR':
          e.preventDefault();
          handlers.onResetSegment();
          break;

        case 'Equal': // + key
        case 'NumpadAdd':
          e.preventDefault();
          handlers.onAdd1Min();
          break;

        case 'Minus': // - key
        case 'NumpadSubtract':
          e.preventDefault();
          handlers.onSub1Min();
          break;

        case 'KeyF':
          e.preventDefault();
          handlers.onTogglePresenter();
          break;

        case 'KeyM':
          e.preventDefault();
          audioService.toggleMute();
          break;

        case 'KeyO':
          if (handlers.onToggleFocusMode) {
            e.preventDefault();
            handlers.onToggleFocusMode();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handlers]);
}
