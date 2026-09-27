import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Keyboard,
  Sliders,
  Monitor,
  Clock,
  Save,
  Check,
  Play,
  RotateCcw,
  Download,
  Upload,
} from 'lucide-react';
import { AppSettings, PresenterTheme, PresenterMode } from '../types';
import { audioService } from '../services/audioService';
import { db } from '../database/db';

interface SettingsPageProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onUpdateSettings }) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleSave = () => {
    onUpdateSettings(formData);
    audioService.setVolume(formData.alerts.masterVolume);
    audioService.setMuted(!formData.alerts.soundEnabled);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestSound = (
    sound: 'soft-chime' | 'single-beep' | 'double-beep' | 'countdown-beep' | 'timeup-chime'
  ) => {
    audioService.setVolume(formData.alerts.masterVolume);
    audioService.setMuted(false);
    audioService.playAlert(sound);
  };

  const handleExportBackup = () => {
    const backupStr = db.exportFullBackup();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(backupStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `EventFlow_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = db.importFullBackup(content);
        if (success) {
          setImportStatus('Backup successfully imported! Please reload or navigate.');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setImportStatus('Failed to import backup file. Invalid format.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto overflow-y-auto max-h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Settings</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Configure broadcast timing defaults, audio synthesis, and presenter styling.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow"
        >
          <Save size={14} />
          <span>Save Changes</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-600 rounded-lg text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
          <Check size={14} />
          <span>Settings saved successfully.</span>
        </div>
      )}

      {importStatus && (
        <div className="p-3 bg-neutral-900 border border-neutral-700 rounded-lg text-xs text-neutral-200">
          {importStatus}
        </div>
      )}

      {/* General Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold">
          General & Clock Format
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-neutral-400 font-mono mb-1">TIME DISPLAY FORMAT</label>
            <select
              value={formData.general.timeFormat}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  general: { ...formData.general, timeFormat: e.target.value as '12h' | '24h' },
                })
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none"
            >
              <option value="12h">12-Hour (e.g. 09:30 AM)</option>
              <option value="24h">24-Hour (e.g. 09:30:00)</option>
            </select>
          </div>

          <div>
            <label className="block text-neutral-400 font-mono mb-1">DEFAULT TIMER FORMAT</label>
            <select
              value={formData.timer.displayFormat}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  timer: { ...formData.timer, displayFormat: e.target.value as 'MM:SS' | 'HH:MM:SS' },
                })
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none"
            >
              <option value="MM:SS">MM:SS (Standard)</option>
              <option value="HH:MM:SS">HH:MM:SS (Full Telemetry)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audio Synthesis & Alerts Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold">
          Audio Alerts & Synthesizer
        </h2>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-neutral-200 block">Enable Stage Sounds</span>
              <span className="text-[11px] text-neutral-400">
                Audible chimes at warning thresholds and overtime
              </span>
            </div>
            <input
              type="checkbox"
              checked={formData.alerts.soundEnabled}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  alerts: { ...formData.alerts, soundEnabled: e.target.checked },
                })
              }
              className="rounded bg-neutral-950 border-neutral-800 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-neutral-400 font-mono mb-1">
              <span>ALERT VOLUME</span>
              <span>{Math.round(formData.alerts.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={formData.alerts.masterVolume}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                setFormData({
                  ...formData,
                  alerts: { ...formData.alerts, masterVolume: vol },
                });
                audioService.setVolume(vol);
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Test Sound Triggers */}
          <div className="pt-2">
            <span className="block text-neutral-400 font-mono mb-2">TEST BUILT-IN SOUNDS</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleTestSound('soft-chime')}
                className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-mono flex items-center gap-1.5"
              >
                <Play size={11} className="text-emerald-400" />
                <span>Soft Chime</span>
              </button>
              <button
                type="button"
                onClick={() => handleTestSound('single-beep')}
                className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-mono flex items-center gap-1.5"
              >
                <Play size={11} className="text-emerald-400" />
                <span>Single Beep</span>
              </button>
              <button
                type="button"
                onClick={() => handleTestSound('double-beep')}
                className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-mono flex items-center gap-1.5"
              >
                <Play size={11} className="text-emerald-400" />
                <span>Double Beep</span>
              </button>
              <button
                type="button"
                onClick={() => handleTestSound('timeup-chime')}
                className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-mono flex items-center gap-1.5"
              >
                <Play size={11} className="text-rose-400" />
                <span>Time Up Alert</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Presenter Display Defaults */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold">
          Presenter & Stage Display Defaults
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-neutral-400 font-mono mb-1">DEFAULT THEME</label>
            <select
              value={formData.presenter.theme}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  presenter: { ...formData.presenter, theme: e.target.value as PresenterTheme },
                })
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none"
            >
              <option value="minimal-dark">Minimal Dark</option>
              <option value="professional">Professional</option>
              <option value="led">LED Broadcast</option>
              <option value="cinema">Cinema Gold</option>
              <option value="corporate">Corporate Navy</option>
              <option value="church">Sanctuary</option>
              <option value="elegant">Elegant</option>
              <option value="light">Studio Light</option>
            </select>
          </div>

          <div>
            <label className="block text-neutral-400 font-mono mb-1">DEFAULT LAYOUT MODE</label>
            <select
              value={formData.presenter.mode}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  presenter: { ...formData.presenter, mode: e.target.value as PresenterMode },
                })
              }
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none"
            >
              <option value="minimal">Mode 1: Minimal</option>
              <option value="event">Mode 2: Event + Next</option>
              <option value="timeline">Mode 3: Timeline + Progress</option>
              <option value="clock">Mode 4: Clock Master</option>
              <option value="cinematic">Mode 5: Cinematic</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-neutral-400 font-mono mb-1">STAGE TICKER MESSAGE</label>
          <input
            type="text"
            value={formData.presenter.customMessage}
            onChange={(e) =>
              setFormData({
                ...formData,
                presenter: { ...formData.presenter, customMessage: e.target.value },
              })
            }
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            placeholder="e.g. Welcome to the Sanctuary. Please silence devices."
          />
        </div>
      </div>

      {/* Keyboard Shortcuts Reference */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Keyboard size={16} className="text-neutral-400" />
          <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold">
            Live Keyboard Shortcuts Reference
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 flex justify-between">
            <span className="text-neutral-400">Space</span>
            <span className="text-white font-semibold">Start / Pause</span>
          </div>
          <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 flex justify-between">
            <span className="text-neutral-400">N</span>
            <span className="text-white font-semibold">Next Segment</span>
          </div>
          <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 flex justify-between">
            <span className="text-neutral-400">P</span>
            <span className="text-white font-semibold">Previous Segment</span>
          </div>
          <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 flex justify-between">
            <span className="text-neutral-400">R</span>
            <span className="text-white font-semibold">Reset Segment</span>
          </div>
          <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 flex justify-between">
            <span className="text-neutral-400">+ / =</span>
            <span className="text-white font-semibold">+1 Minute</span>
          </div>
          <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 flex justify-between">
            <span className="text-neutral-400">-</span>
            <span className="text-white font-semibold">-1 Minute</span>
          </div>
          <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 flex justify-between">
            <span className="text-neutral-400">F</span>
            <span className="text-white font-semibold">Presenter Mode</span>
          </div>
          <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 flex justify-between">
            <span className="text-neutral-400">M</span>
            <span className="text-white font-semibold">Mute Audio</span>
          </div>
          <div className="p-2.5 rounded bg-neutral-950 border border-neutral-800 flex justify-between">
            <span className="text-neutral-400">O</span>
            <span className="text-white font-semibold">Focus Mode</span>
          </div>
        </div>
      </div>

      {/* Backup and Restore Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold">
          Database Backup & Restore (Offline)
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700/60"
          >
            <Download size={14} className="text-emerald-400" />
            <span>Export Complete Backup</span>
          </button>

          <label className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700/60 cursor-pointer">
            <Upload size={14} className="text-blue-400" />
            <span>Restore from File</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};
