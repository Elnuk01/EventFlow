import { EventSegment, PresenterTheme, TimerState } from '../types';

export interface StageDisplayState {
  segment: EventSegment | null;
  nextSegment: EventSegment | null;
  eventName: string;
  state: TimerState;
  remainingSeconds: number;
  elapsedSeconds: number;
  overtimeSeconds: number;
  plannedDurationSeconds: number;
  theme: PresenterTheme;
  timestamp: number;
}

export interface OpenStageDisplayResult {
  success: boolean;
  blocked?: boolean;
  isExtended?: boolean;
  screenLabel?: string;
  error?: string;
}

const BROADCAST_CHANNEL_NAME = 'eventflow_stage_display_channel';
const STORAGE_SYNC_KEY = 'eventflow_stage_sync_payload';

class StageDisplayService {
  private channel: BroadcastChannel | null = null;
  private stageWindowRef: Window | null = null;
  private lastState: StageDisplayState | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      } catch (err) {
        console.warn('BroadcastChannel initialization error:', err);
      }
    }
  }

  /**
   * Checks if current window is running in dedicated stage display mode
   */
  public isStageWindow(): boolean {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return (
      urlParams.get('display') === 'stage' ||
      urlParams.get('display') === 'presenter' ||
      window.location.hash === '#stage-display'
    );
  }

  /**
   * Broadcast current stage state to all connected stage displays
   */
  public broadcastState(state: StageDisplayState) {
    this.lastState = state;

    // Send over BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'STAGE_STATE_UPDATE',
          payload: state,
        });
      } catch (e) {
        console.warn('Error broadcasting stage state:', e);
      }
    }

    // Also persist in localStorage for backup / initial hydration
    try {
      localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota errors
    }
  }

  /**
   * Subscribe to stage state changes (used by the stage display window)
   */
  public subscribeToState(
    onState: (state: StageDisplayState) => void,
    onRequestSync?: () => void
  ): () => void {
    // 1. Initial hydration from storage if available
    try {
      const stored = localStorage.getItem(STORAGE_SYNC_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StageDisplayState;
        if (parsed && typeof parsed.remainingSeconds === 'number') {
          onState(parsed);
        }
      }
    } catch {
      // ignore
    }

    // 2. BroadcastChannel handler
    const channelHandler = (event: MessageEvent) => {
      if (!event.data) return;
      if (event.data.type === 'STAGE_STATE_UPDATE' && event.data.payload) {
        onState(event.data.payload);
      } else if (event.data.type === 'REQUEST_STAGE_SYNC' && onRequestSync) {
        onRequestSync();
      }
    };

    if (this.channel) {
      this.channel.addEventListener('message', channelHandler);
    }

    // 3. Storage event fallback handler
    const storageHandler = (e: StorageEvent) => {
      if (e.key === STORAGE_SYNC_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as StageDisplayState;
          if (parsed && typeof parsed.remainingSeconds === 'number') {
            onState(parsed);
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', storageHandler);

    // Request fresh state from main window
    this.requestStateSync();

    return () => {
      if (this.channel) {
        this.channel.removeEventListener('message', channelHandler);
      }
      window.removeEventListener('storage', storageHandler);
    };
  }

  /**
   * Request state synchronization from the operator window
   */
  public requestStateSync() {
    if (this.channel) {
      try {
        this.channel.postMessage({ type: 'REQUEST_STAGE_SYNC' });
      } catch {
        // ignore
      }
    }
  }

  /**
   * Send back current cached state in response to sync request
   */
  public respondToSyncRequest() {
    if (this.lastState) {
      this.broadcastState(this.lastState);
    }
  }

  /**
   * Open the Stage Display on an extended screen
   */
  public async openOnExtendedScreen(): Promise<OpenStageDisplayResult> {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Window not available' };
    }

    // If already open and valid, bring to focus
    if (this.stageWindowRef && !this.stageWindowRef.closed) {
      try {
        this.stageWindowRef.focus();
        this.respondToSyncRequest();
        return { success: true, isExtended: true };
      } catch {
        // window might be restricted or closed
      }
    }

    let left = 0;
    let top = 0;
    let width = 1920;
    let height = 1080;
    let isExtended = false;
    let screenLabel = '';

    // Check Multi-Screen Window Management API
    if ('getScreenDetails' in window) {
      try {
        // Request or query screen details
        const screenDetails = await (window as any).getScreenDetails();
        if (screenDetails && screenDetails.screens && screenDetails.screens.length > 1) {
          isExtended = true;
          // Find extended screen (one that is not currentScreen)
          const extScreen =
            screenDetails.screens.find((s: any) => s !== screenDetails.currentScreen) ||
            screenDetails.screens[1];

          if (extScreen) {
            left = extScreen.availLeft ?? extScreen.left ?? 0;
            top = extScreen.availTop ?? extScreen.top ?? 0;
            width = extScreen.availWidth ?? extScreen.width ?? 1920;
            height = extScreen.availHeight ?? extScreen.height ?? 1080;
            screenLabel = extScreen.label || 'Extended Display';
          }
        }
      } catch {
        // Permission was denied or not supported, continue to fallback calculation
      }
    }

    // Fallback: If not detected via getScreenDetails, use standard multi-monitor geometry
    if (!isExtended) {
      const screenAny = window.screen as any;
      const isExtScreen = screenAny.isExtended ?? false;

      // In multi-monitor OS setups, secondary monitor is adjacent to primary screen
      const currentAvailLeft = screenAny.availLeft ?? 0;
      const currentAvailTop = screenAny.availTop ?? 0;
      const currentWidth = window.screen.availWidth ?? window.screen.width ?? 1920;
      const currentHeight = window.screen.availHeight ?? window.screen.height ?? 1080;

      // If current window is already on the primary monitor, place on the adjacent right monitor
      left = currentAvailLeft + currentWidth;
      top = currentAvailTop;
      width = currentWidth;
      height = currentHeight;
      isExtended = isExtScreen || (screenAny.availLeft !== undefined && screenAny.availLeft !== 0);
    }

    // Construct stage URL
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const stageUrl = `${baseUrl}?display=stage#stage-display`;

    const windowFeatures = [
      `left=${left}`,
      `top=${top}`,
      `width=${width}`,
      `height=${height}`,
      'menubar=no',
      'toolbar=no',
      'location=no',
      'status=no',
      'scrollbars=no',
      'resizable=yes',
    ].join(',');

    try {
      const newWin = window.open(stageUrl, 'EventFlowStageDisplay', windowFeatures);

      if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
        return {
          success: false,
          blocked: true,
          error: 'Browser blocked pop-up window',
        };
      }

      this.stageWindowRef = newWin;
      newWin.focus();

      // Broadcast current state to ensure the new window is hydrated immediately
      if (this.lastState) {
        this.broadcastState(this.lastState);
      }

      return {
        success: true,
        isExtended,
        screenLabel: screenLabel || (isExtended ? 'Extended Screen' : 'Secondary Window'),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to open window',
      };
    }
  }

  /**
   * Close stage display window if open
   */
  public closeStageDisplay() {
    if (this.stageWindowRef && !this.stageWindowRef.closed) {
      try {
        this.stageWindowRef.close();
      } catch {
        // ignore
      }
      this.stageWindowRef = null;
    }
  }
}

export const stageDisplayService = new StageDisplayService();
