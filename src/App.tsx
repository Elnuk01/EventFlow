import React, { useState, useEffect, useCallback } from 'react';
import { Radio, CalendarDays, FileEdit, MonitorPlay, Menu } from 'lucide-react';
import { Sidebar, ActiveTab } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { DashboardPage } from './pages/DashboardPage';
import { EventsPage } from './pages/EventsPage';
import { EventBuilderPage } from './pages/EventBuilderPage';
import { LiveControlPage } from './pages/LiveControlPage';
import { PresenterPage } from './pages/PresenterPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { HistoryPage } from './pages/HistoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PresenterScreen } from './components/presenter/PresenterScreen';
import { useEventFlow } from './stores/eventStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { timerEngine } from './services/timerEngine';
import { db } from './database/db';
import { EventSchedule, EventTemplate, EventHistoryRecord } from './types';
import { DEMO_EVENT } from './database/defaultData';

export default function App() {
  const {
    activeEvent,
    settings,
    timerSnapshot,
    notes,
    scheduleCalculations,
    compensationProposal,
    selectEvent,
    updateActiveEvent,
    loadSegment,
    nextSegment,
    prevSegment,
    skipCurrentSegment,
    switchScenario,
    addNote,
    deleteNote,
    applyCompensation,
    completeEventAndSaveHistory,
    updateSettings,
  } = useEventFlow();

  const [activeTab, setActiveTab] = useState<ActiveTab>('live');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isPresenterFullscreen, setIsPresenterFullscreen] = useState<boolean>(false);
  const [eventsList, setEventsList] = useState<EventSchedule[]>(() => db.getAllEvents());
  const [historyList, setHistoryList] = useState<EventHistoryRecord[]>(() => db.getAllHistory());
  const [panicConfirmModalOpen, setPanicConfirmModalOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Refresh lists
  const refreshLists = useCallback(() => {
    setEventsList(db.getAllEvents());
    setHistoryList(db.getAllHistory());
  }, []);

  // Launch event in Live Control
  const handleLaunchLive = (event: EventSchedule) => {
    selectEvent(event);
    setActiveTab('live');
  };

  // Create brand new blank event
  const handleCreateNewEvent = () => {
    const newEvt: EventSchedule = {
      id: `evt-${Date.now()}`,
      name: 'New Event Schedule',
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      location: 'Main Auditorium',
      organizer: 'Production Staff',
      description: 'Order of service and timing segments.',
      currentSegmentIndex: 0,
      status: 'READY',
      activeScenario: 'NORMAL',
      scenarioAdjustments: {
        shortReductionPercent: 15,
        emergencyReductionPercent: 35,
      },
      totalPlannedDurationSeconds: 15 * 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      segments: [
        {
          id: `seg-${Date.now()}-1`,
          eventId: `evt-${Date.now()}`,
          order: 1,
          name: 'Welcome & Opening',
          plannedDurationSeconds: 5 * 60,
          category: 'General',
          colorTag: 'emerald',
          warningTimesSeconds: [180, 60],
          soundEnabled: true,
          autoAdvance: false,
          isOptional: false,
          isSkipped: false,
          segmentType: 'TIMER',
        },
        {
          id: `seg-${Date.now()}-2`,
          eventId: `evt-${Date.now()}`,
          order: 2,
          name: 'Main Session',
          plannedDurationSeconds: 10 * 60,
          category: 'Speech',
          colorTag: 'blue',
          warningTimesSeconds: [300, 60],
          soundEnabled: true,
          autoAdvance: false,
          isOptional: false,
          isSkipped: false,
          segmentType: 'SPEAKER',
        },
      ],
    };

    db.saveEvent(newEvt);
    refreshLists();
    selectEvent(newEvt);
    setActiveTab('builder');
  };

  // Instantiate template into an active event
  const handleUseTemplate = (template: EventTemplate) => {
    const newEvt: EventSchedule = {
      id: `evt-${Date.now()}`,
      name: `${template.name} - ${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })}`,
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      location: 'Sanctuary / Main Hall',
      organizer: 'EventFlow Operator',
      description: template.description,
      currentSegmentIndex: 0,
      status: 'READY',
      activeScenario: 'NORMAL',
      scenarioAdjustments: {
        shortReductionPercent: 15,
        emergencyReductionPercent: 35,
      },
      totalPlannedDurationSeconds: template.estimatedTotalDurationSeconds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      segments: template.segments.map((seg, idx) => ({
        ...seg,
        id: `seg-${Date.now()}-${idx}`,
        eventId: `evt-${Date.now()}`,
      })),
    };

    db.saveEvent(newEvt);
    refreshLists();
    selectEvent(newEvt);
    setActiveTab('builder');
  };

  // Delete event
  const handleDeleteEvent = (id: string) => {
    db.deleteEvent(id);
    refreshLists();
    const remaining = db.getAllEvents();
    if (remaining.length > 0) {
      if (activeEvent?.id === id) {
        selectEvent(remaining[0]);
      }
    } else {
      handleCreateNewEvent();
    }
  };

  // Duplicate event
  const handleDuplicateEvent = (evt: EventSchedule) => {
    const duplicated: EventSchedule = {
      ...evt,
      id: `evt-${Date.now()}`,
      name: `${evt.name} (Copy)`,
      status: 'READY',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      segments: evt.segments.map((s, idx) => ({
        ...s,
        id: `seg-${Date.now()}-${idx}`,
        eventId: `evt-${Date.now()}`,
      })),
    };

    db.saveEvent(duplicated);
    refreshLists();
  };

  // Import event
  const handleImportEvent = (importedEvent: EventSchedule) => {
    db.saveEvent(importedEvent);
    refreshLists();
    selectEvent(importedEvent);
  };

  // Complete and save to history
  const handleCompleteEvent = () => {
    const record = completeEventAndSaveHistory();
    if (record) {
      refreshLists();
      setActiveTab('history');
    }
  };

  // Trigger Panic Action (+5 MIN Buffer)
  const handleTriggerPanic = () => {
    if (settings.panicButton?.requireConfirmation) {
      setPanicConfirmModalOpen(true);
    } else {
      executePanicAction();
    }
  };

  const executePanicAction = () => {
    timerEngine.adjustTime(300); // Add 5 mins
    addNote('PANIC ACTION TRIGGERED: Added +5 MIN buffer to current segment');
    setPanicConfirmModalOpen(false);
  };

  // Pop-out external window for dual monitors / secondary displays
  const handleOpenExternalPresenter = () => {
    setIsPresenterFullscreen(true);
  };

  // Broadcast Keyboard Shortcuts
  useKeyboardShortcuts(
    {
      onTogglePlayPause: () => timerEngine.togglePlayPause(),
      onNextSegment: () => nextSegment(true),
      onPrevSegment: prevSegment,
      onResetSegment: () => timerEngine.reset(),
      onAdd1Min: () => timerEngine.adjustTime(60),
      onSub1Min: () => timerEngine.adjustTime(-60),
      onTogglePresenter: () => setIsPresenterFullscreen((prev) => !prev),
      onToggleFocusMode: () => setIsFocusMode((prev) => !prev),
      onPanicAction: handleTriggerPanic,
    },
    !isPresenterFullscreen
  );

  const isLiveRunning =
    timerSnapshot.state === 'RUNNING' || timerSnapshot.state === 'OVERTIME';

  const currentSegment = activeEvent?.segments[timerSnapshot.currentSegmentIndex] || null;
  const nextUpSegment = activeEvent?.segments[timerSnapshot.currentSegmentIndex + 1] || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans">
      {/* Collapsible Left Sidebar */}
      {!isFocusMode && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            refreshLists();
          }}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          isLiveRunning={isLiveRunning}
          onOpenPresenterWindow={handleOpenExternalPresenter}
        />
      )}

      {/* Mobile Slide-Over Drawer with Backdrop */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full bg-neutral-950 border-r border-neutral-800 shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <Sidebar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                refreshLists();
                setIsMobileMenuOpen(false);
              }}
              isCollapsed={false}
              setIsCollapsed={() => {}}
              isLiveRunning={isLiveRunning}
              onOpenPresenterWindow={() => {
                handleOpenExternalPresenter();
                setIsMobileMenuOpen(false);
              }}
              onCloseMobile={() => setIsMobileMenuOpen(false)}
              isMobile={true}
            />
          </div>
        </div>
      )}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Bar Header */}
        <Header
          activeEvent={activeEvent}
          settings={settings}
          isFocusMode={isFocusMode}
          onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
          onOpenPresenter={() => setIsPresenterFullscreen(true)}
          onTriggerPanic={handleTriggerPanic}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        {/* Viewport Content Tabs */}
        <main className="flex-1 overflow-y-auto relative pb-16 md:pb-0">
          {activeTab === 'dashboard' && (
            <DashboardPage
              events={eventsList}
              history={historyList}
              onSelectEvent={selectEvent}
              onNavigate={(tab) => {
                setActiveTab(tab);
                refreshLists();
              }}
              onLaunchLive={handleLaunchLive}
              onCreateNew={handleCreateNewEvent}
              onOpenTemplates={() => setActiveTab('templates')}
              onImportBackup={() => setActiveTab('settings')}
              onImportEvent={handleImportEvent}
            />
          )}

          {activeTab === 'events' && (
            <EventsPage
              events={eventsList}
              onSelectEvent={selectEvent}
              onLaunchLive={handleLaunchLive}
              onCreateNew={handleCreateNewEvent}
              onDeleteEvent={handleDeleteEvent}
              onDuplicateEvent={handleDuplicateEvent}
              onEditInBuilder={(evt) => {
                selectEvent(evt);
                setActiveTab('builder');
              }}
              onImportEvent={handleImportEvent}
            />
          )}

          {activeTab === 'builder' && activeEvent && (
            <EventBuilderPage
              event={activeEvent}
              onSaveEvent={(evt) => {
                updateActiveEvent(evt);
                refreshLists();
              }}
              onLaunchLive={handleLaunchLive}
            />
          )}

          {activeTab === 'live' && activeEvent && (
            <LiveControlPage
              event={activeEvent}
              timerSnapshot={timerSnapshot}
              notes={notes}
              scheduleCalculations={scheduleCalculations}
              compensationProposal={compensationProposal}
              onLoadSegment={loadSegment}
              onNextSegment={nextSegment}
              onPrevSegment={prevSegment}
              onSkipCurrentSegment={skipCurrentSegment}
              onSwitchScenario={switchScenario}
              onAddNote={addNote}
              onDeleteNote={deleteNote}
              onApplyCompensation={applyCompensation}
              onCompleteEvent={handleCompleteEvent}
              isFocusMode={isFocusMode}
              onToggleFocusMode={() => setIsFocusMode(!isFocusMode)}
            />
          )}

          {activeTab === 'presenter' && activeEvent && (
            <PresenterPage
              event={activeEvent}
              timerSnapshot={timerSnapshot}
              totalEventElapsedSeconds={scheduleCalculations.totalElapsedSeconds}
              totalEventPlannedSeconds={scheduleCalculations.totalPlannedSeconds}
              onOpenExternalWindow={handleOpenExternalPresenter}
              onNavigateToLive={() => setActiveTab('live')}
            />
          )}

          {activeTab === 'templates' && (
            <TemplatesPage onUseTemplate={handleUseTemplate} />
          )}

          {activeTab === 'history' && (
            <HistoryPage history={historyList} onRefreshHistory={refreshLists} />
          )}

          {activeTab === 'reports' && <ReportsPage history={historyList} />}

          {activeTab === 'settings' && (
            <SettingsPage settings={settings} onUpdateSettings={updateSettings} />
          )}
        </main>

        {/* Mobile Bottom Navigation Bar (Phone/Tablet quick switch) */}
        {!isFocusMode && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800/80 flex items-center justify-around px-2 z-30 select-none pb-safe">
            <button
              onClick={() => {
                setActiveTab('live');
                refreshLists();
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
                activeTab === 'live' ? 'text-emerald-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <div className="relative">
                <Radio size={18} />
                {isLiveRunning && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                )}
              </div>
              <span className="text-[10px] mt-0.5">Live</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('events');
                refreshLists();
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
                activeTab === 'events' ? 'text-emerald-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <CalendarDays size={18} />
              <span className="text-[10px] mt-0.5">Events</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('builder');
                refreshLists();
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
                activeTab === 'builder' ? 'text-emerald-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileEdit size={18} />
              <span className="text-[10px] mt-0.5">Builder</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('presenter');
                refreshLists();
              }}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
                activeTab === 'presenter' ? 'text-emerald-400 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <MonitorPlay size={18} />
              <span className="text-[10px] mt-0.5">Stage</span>
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex flex-col items-center justify-center flex-1 py-1 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            >
              <Menu size={18} />
              <span className="text-[10px] mt-0.5">Menu</span>
            </button>
          </nav>
        )}
      </div>

      {/* Panic Button Confirmation Modal */}
      {panicConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-rose-800 max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-rose-300">
              Trigger Quick Action (+5 Min Buffer)?
            </h3>
            <p className="text-xs text-neutral-300">
              This will immediately extend the current segment by 5 minutes and record an emergency
              note in the stage log.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPanicConfirmModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-medium hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                onClick={executePanicAction}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow"
              >
                Add +5 Minutes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Presenter / Projector Overlay Screen */}
      {isPresenterFullscreen && activeEvent && (
        <PresenterScreen
          segment={currentSegment}
          state={timerSnapshot.state}
          remainingSeconds={timerSnapshot.remainingSeconds}
          overtimeSeconds={timerSnapshot.overtimeSeconds}
          theme={settings.presenter.theme}
          onClose={() => setIsPresenterFullscreen(false)}
        />
      )}
    </div>
  );
}
