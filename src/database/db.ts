import {
  EventSchedule,
  EventTemplate,
  EventHistoryRecord,
  EventNote,
  AppSettings,
} from '../types';
import { DEFAULT_SETTINGS, BUILT_IN_TEMPLATES, DEMO_EVENT } from './defaultData';

const STORAGE_KEYS = {
  EVENTS: 'eventflow_events_v1',
  TEMPLATES: 'eventflow_templates_v1',
  HISTORY: 'eventflow_history_v1',
  NOTES: 'eventflow_notes_v1',
  SETTINGS: 'eventflow_settings_v1',
  ACTIVE_EVENT_ID: 'eventflow_active_event_id_v1',
  AUTOSAVE_BACKUP: 'eventflow_autosave_state_v1',
};

class LocalDatabase {
  private memoryEvents: Map<string, EventSchedule> = new Map();
  private memoryTemplates: Map<string, EventTemplate> = new Map();
  private memoryHistory: Map<string, EventHistoryRecord> = new Map();
  private memoryNotes: Map<string, EventNote[]> = new Map();
  private memorySettings: AppSettings = DEFAULT_SETTINGS;
  private activeEventId: string | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.init();
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      // 1. Settings
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (savedSettings) {
        this.memorySettings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
      } else {
        this.memorySettings = DEFAULT_SETTINGS;
        this.saveSettings(DEFAULT_SETTINGS);
      }

      // 2. Templates
      const savedTemplates = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      if (savedTemplates) {
        const parsed: EventTemplate[] = JSON.parse(savedTemplates);
        parsed.forEach((t) => this.memoryTemplates.set(t.id, t));
      } else {
        BUILT_IN_TEMPLATES.forEach((t) => this.memoryTemplates.set(t.id, t));
        this.persistTemplates();
      }

      // 3. Events
      const savedEvents = localStorage.getItem(STORAGE_KEYS.EVENTS);
      if (savedEvents) {
        const parsed: EventSchedule[] = JSON.parse(savedEvents);
        parsed.forEach((e) => this.memoryEvents.set(e.id, e));
      } else {
        // Seed initial demo event
        this.memoryEvents.set(DEMO_EVENT.id, DEMO_EVENT);
        this.persistEvents();
      }

      // 4. History
      const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (savedHistory) {
        const parsed: EventHistoryRecord[] = JSON.parse(savedHistory);
        parsed.forEach((h) => this.memoryHistory.set(h.id, h));
      } else {
        // Seed sample completed event for rich initial reports and history view
        const sampleHistory: EventHistoryRecord = {
          id: 'hist-prev-sunday',
          eventId: 'evt-demo-sunday-service',
          eventName: 'Sunday Worship Service (Previous Week)',
          date: '2026-09-20',
          startedAt: Date.now() - 7 * 86400000,
          endedAt: Date.now() - 7 * 86400000 + 5220 * 1000,
          plannedDurationSeconds: 5100, // 85 mins
          actualDurationSeconds: 5220, // 87 mins
          scheduleVarianceSeconds: 120, // +2 min behind
          segmentRecords: [
            {
              segmentId: 'seg-1',
              segmentName: 'Opening Prayer',
              speaker: 'Associate Pastor',
              category: 'Prayer',
              plannedDurationSeconds: 300,
              actualDurationSeconds: 312,
              overtimeSeconds: 12,
              isSkipped: false,
              varianceSeconds: 12,
            },
            {
              segmentId: 'seg-2',
              segmentName: 'Praise & Worship',
              speaker: 'Worship Team',
              category: 'Worship',
              plannedDurationSeconds: 900,
              actualDurationSeconds: 990,
              overtimeSeconds: 90,
              isSkipped: false,
              varianceSeconds: 90,
            },
            {
              segmentId: 'seg-3',
              segmentName: 'Announcements',
              speaker: 'Media Host',
              category: 'Announcements',
              plannedDurationSeconds: 420,
              actualDurationSeconds: 375,
              overtimeSeconds: 0,
              isSkipped: false,
              varianceSeconds: -45,
            },
            {
              segmentId: 'seg-4',
              segmentName: 'Special Presentation',
              speaker: 'Guest Speaker',
              category: 'Presentation',
              plannedDurationSeconds: 600,
              actualDurationSeconds: 600,
              overtimeSeconds: 0,
              isSkipped: false,
              varianceSeconds: 0,
            },
            {
              segmentId: 'seg-5',
              segmentName: 'Sermon',
              speaker: 'Senior Pastor',
              category: 'Speech',
              plannedDurationSeconds: 2100,
              actualDurationSeconds: 2190,
              overtimeSeconds: 90,
              isSkipped: false,
              varianceSeconds: 90,
            },
            {
              segmentId: 'seg-6',
              segmentName: 'Offering',
              speaker: 'Deacons',
              category: 'Ceremony',
              plannedDurationSeconds: 480,
              actualDurationSeconds: 480,
              overtimeSeconds: 0,
              isSkipped: false,
              varianceSeconds: 0,
            },
            {
              segmentId: 'seg-7',
              segmentName: 'Closing Prayer',
              speaker: 'Senior Pastor',
              category: 'Prayer',
              plannedDurationSeconds: 300,
              actualDurationSeconds: 273,
              overtimeSeconds: 0,
              isSkipped: false,
              varianceSeconds: -27,
            },
          ],
          notes: [
            {
              id: 'note-prev-1',
              eventId: 'evt-demo-sunday-service',
              timestamp: '09:22 AM',
              segmentIndex: 1,
              segmentName: 'Praise & Worship',
              text: 'Band encored 4th chorus per pastoral cue',
              createdAt: Date.now() - 7 * 86400000 + 1320 * 1000,
            },
          ],
        };
        this.memoryHistory.set(sampleHistory.id, sampleHistory);
        this.persistHistory();
      }

      // 5. Notes
      const savedNotes = localStorage.getItem(STORAGE_KEYS.NOTES);
      if (savedNotes) {
        const parsed: Record<string, EventNote[]> = JSON.parse(savedNotes);
        Object.entries(parsed).forEach(([k, notes]) => this.memoryNotes.set(k, notes));
      }

      // 6. Active Event ID
      const savedActiveId = localStorage.getItem(STORAGE_KEYS.ACTIVE_EVENT_ID);
      this.activeEventId = savedActiveId || DEMO_EVENT.id;

      this.isInitialized = true;
    } catch (e) {
      console.error('Error initializing database:', e);
      this.isInitialized = true;
    }
  }

  // EVENTS
  public getAllEvents(): EventSchedule[] {
    return Array.from(this.memoryEvents.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public getEvent(id: string): EventSchedule | undefined {
    return this.memoryEvents.get(id);
  }

  public saveEvent(event: EventSchedule): EventSchedule {
    const updated = {
      ...event,
      updatedAt: new Date().toISOString(),
      totalPlannedDurationSeconds: event.segments.reduce((acc, s) => acc + (s.isSkipped ? 0 : s.plannedDurationSeconds), 0),
    };
    this.memoryEvents.set(updated.id, updated);
    this.persistEvents();
    return updated;
  }

  public deleteEvent(id: string): boolean {
    const res = this.memoryEvents.delete(id);
    if (res) {
      this.persistEvents();
      if (this.activeEventId === id) {
        const remaining = Array.from(this.memoryEvents.keys());
        this.activeEventId = remaining.length > 0 ? remaining[0] : null;
        if (this.activeEventId) {
          localStorage.setItem(STORAGE_KEYS.ACTIVE_EVENT_ID, this.activeEventId);
        } else {
          localStorage.removeItem(STORAGE_KEYS.ACTIVE_EVENT_ID);
        }
      }
    }
    return res;
  }

  public setActiveEventId(id: string) {
    this.activeEventId = id;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_EVENT_ID, id);
    }
  }

  public getActiveEventId(): string | null {
    return this.activeEventId;
  }

  // TEMPLATES
  public getAllTemplates(): EventTemplate[] {
    return Array.from(this.memoryTemplates.values());
  }

  public getTemplate(id: string): EventTemplate | undefined {
    return this.memoryTemplates.get(id);
  }

  public saveTemplate(template: EventTemplate): EventTemplate {
    this.memoryTemplates.set(template.id, template);
    this.persistTemplates();
    return template;
  }

  public deleteTemplate(id: string): boolean {
    const res = this.memoryTemplates.delete(id);
    if (res) this.persistTemplates();
    return res;
  }

  // NOTES
  public getNotesForEvent(eventId: string): EventNote[] {
    return this.memoryNotes.get(eventId) || [];
  }

  public addNote(note: EventNote): EventNote[] {
    const current = this.memoryNotes.get(note.eventId) || [];
    const updated = [note, ...current];
    this.memoryNotes.set(note.eventId, updated);
    this.persistNotes();
    return updated;
  }

  public deleteNote(eventId: string, noteId: string): EventNote[] {
    const current = this.memoryNotes.get(eventId) || [];
    const updated = current.filter((n) => n.id !== noteId);
    this.memoryNotes.set(eventId, updated);
    this.persistNotes();
    return updated;
  }

  // HISTORY
  public getAllHistory(): EventHistoryRecord[] {
    return Array.from(this.memoryHistory.values()).sort((a, b) => b.endedAt - a.endedAt);
  }

  public getHistory(id: string): EventHistoryRecord | undefined {
    return this.memoryHistory.get(id);
  }

  public saveHistoryRecord(record: EventHistoryRecord) {
    this.memoryHistory.set(record.id, record);
    this.persistHistory();
  }

  public deleteHistoryRecord(id: string): boolean {
    const res = this.memoryHistory.delete(id);
    if (res) this.persistHistory();
    return res;
  }

  // SETTINGS
  public getSettings(): AppSettings {
    return this.memorySettings;
  }

  public saveSettings(settings: AppSettings) {
    this.memorySettings = settings;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }
  }

  // CRASH RECOVERY & AUTOSAVE
  public saveRecoveryState(state: unknown) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.AUTOSAVE_BACKUP, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save recovery state', e);
    }
  }

  public getRecoveryState<T>(): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTOSAVE_BACKUP);
      return saved ? (JSON.parse(saved) as T) : null;
    } catch {
      return null;
    }
  }

  public clearRecoveryState() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.AUTOSAVE_BACKUP);
    }
  }

  // PERSISTENCE HELPERS
  private persistEvents() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      STORAGE_KEYS.EVENTS,
      JSON.stringify(Array.from(this.memoryEvents.values()))
    );
  }

  private persistTemplates() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      STORAGE_KEYS.TEMPLATES,
      JSON.stringify(Array.from(this.memoryTemplates.values()))
    );
  }

  private persistHistory() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      STORAGE_KEYS.HISTORY,
      JSON.stringify(Array.from(this.memoryHistory.values()))
    );
  }

  private persistNotes() {
    if (typeof window === 'undefined') return;
    const obj: Record<string, EventNote[]> = {};
    this.memoryNotes.forEach((v, k) => {
      obj[k] = v;
    });
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(obj));
  }

  // EXPORT / IMPORT
  public exportFullBackup(): string {
    return JSON.stringify(
      {
        version: '1.4.2',
        exportedAt: new Date().toISOString(),
        events: Array.from(this.memoryEvents.values()),
        templates: Array.from(this.memoryTemplates.values()),
        history: Array.from(this.memoryHistory.values()),
        settings: this.memorySettings,
      },
      null,
      2
    );
  }

  public importFullBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.events && Array.isArray(data.events)) {
        data.events.forEach((e: EventSchedule) => this.memoryEvents.set(e.id, e));
        this.persistEvents();
      }
      if (data.templates && Array.isArray(data.templates)) {
        data.templates.forEach((t: EventTemplate) => this.memoryTemplates.set(t.id, t));
        this.persistTemplates();
      }
      if (data.history && Array.isArray(data.history)) {
        data.history.forEach((h: EventHistoryRecord) => this.memoryHistory.set(h.id, h));
        this.persistHistory();
      }
      if (data.settings) {
        this.memorySettings = { ...DEFAULT_SETTINGS, ...data.settings };
        this.saveSettings(this.memorySettings);
      }
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }
}

export const db = new LocalDatabase();
