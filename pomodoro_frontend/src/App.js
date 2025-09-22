import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

/**
 * Ocean Professional Theme Pomodoro Timer + Task Manager
 * - Elegant two-panel layout
 * - Pomodoro work/break sessions with start/pause/reset
 * - Task list CRUD with persistent storage via localStorage
 * - Responsive and accessible UI
 */

// Constants for default durations (in seconds)
const DEFAULT_WORK = 25 * 60;
const DEFAULT_BREAK = 5 * 60;

// Keys for localStorage
const LS_KEYS = {
  tasks: 'pomodoro_tasks',
  settings: 'pomodoro_settings',
  state: 'pomodoro_state',
};

// Utility: format seconds to mm:ss
function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// PUBLIC_INTERFACE
function App() {
  /** Theme **/
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  /** Timer State **/
  const [isRunning, setIsRunning] = useState(false);
  const [isWorkSession, setIsWorkSession] = useState(true);
  const [workDuration, setWorkDuration] = useState(DEFAULT_WORK);
  const [breakDuration, setBreakDuration] = useState(DEFAULT_BREAK);
  const [remaining, setRemaining] = useState(DEFAULT_WORK);
  const intervalRef = useRef(null);

  /** Task State **/
  const [tasks, setTasks] = useState([]);
  const [taskInput, setTaskInput] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  /** Effects: Load persisted state **/
  useEffect(() => {
    try {
      const savedTasks = JSON.parse(localStorage.getItem(LS_KEYS.tasks) || '[]');
      if (Array.isArray(savedTasks)) setTasks(savedTasks);

      const savedSettings = JSON.parse(localStorage.getItem(LS_KEYS.settings) || '{}');
      const wd = Number(savedSettings.workDuration || DEFAULT_WORK);
      const bd = Number(savedSettings.breakDuration || DEFAULT_BREAK);
      setWorkDuration(Number.isFinite(wd) ? wd : DEFAULT_WORK);
      setBreakDuration(Number.isFinite(bd) ? bd : DEFAULT_BREAK);

      const savedState = JSON.parse(localStorage.getItem(LS_KEYS.state) || '{}');
      if (typeof savedState.isWorkSession === 'boolean') {
        setIsWorkSession(savedState.isWorkSession);
      }
      if (Number.isFinite(savedState.remaining)) {
        setRemaining(savedState.remaining);
      } else {
        setRemaining(savedState.isWorkSession ? wd : bd);
      }
    } catch {
      // On any parse error, fallback to defaults
      setWorkDuration(DEFAULT_WORK);
      setBreakDuration(DEFAULT_BREAK);
      setRemaining(DEFAULT_WORK);
    }
  }, []);

  /** Effects: Persist settings and state **/
  useEffect(() => {
    const data = { workDuration, breakDuration };
    localStorage.setItem(LS_KEYS.settings, JSON.stringify(data));
  }, [workDuration, breakDuration]);

  useEffect(() => {
    const data = { isWorkSession, remaining };
    localStorage.setItem(LS_KEYS.state, JSON.stringify(data));
  }, [isWorkSession, remaining]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.tasks, JSON.stringify(tasks));
  }, [tasks]);

  /** Timer Ticking **/
  useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev > 0) return prev - 1;

        // Session complete: auto-switch
        const nextIsWork = !isWorkSession;
        const nextRemaining = nextIsWork ? workDuration : breakDuration;

        // Optionally mark progress on selected task when a work session ends
        if (isWorkSession && selectedTaskId) {
          setTasks(ts =>
            ts.map(t => (t.id === selectedTaskId ? { ...t, pomodoros: (t.pomodoros || 0) + 1 } : t))
          );
        }

        setIsWorkSession(nextIsWork);
        return nextRemaining;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning, isWorkSession, workDuration, breakDuration, selectedTaskId]);

  /** Derived data **/
  const sessionLabel = isWorkSession ? 'Focus' : 'Break';
  const totalForProgress = isWorkSession ? workDuration : breakDuration;
  const progress = useMemo(() => {
    return totalForProgress > 0 ? (1 - remaining / totalForProgress) * 100 : 0;
  }, [remaining, totalForProgress]);

  /** Handlers: Timer **/
  // PUBLIC_INTERFACE
  const startPause = () => {
    setIsRunning(prev => !prev);
  };

  // PUBLIC_INTERFACE
  const resetTimer = () => {
    setIsRunning(false);
    setRemaining(isWorkSession ? workDuration : breakDuration);
  };

  // PUBLIC_INTERFACE
  const switchSession = () => {
    setIsRunning(false);
    setIsWorkSession(prev => {
      const next = !prev;
      setRemaining(next ? workDuration : breakDuration);
      return next;
    });
  };

  // PUBLIC_INTERFACE
  const updateDurations = (newWorkMin, newBreakMin) => {
    const w = Math.max(1, Math.min(180, Math.floor(newWorkMin))) * 60;
    const b = Math.max(1, Math.min(60, Math.floor(newBreakMin))) * 60;
    setWorkDuration(w);
    setBreakDuration(b);
    // Reset current remaining to reflect current session with new duration
    setRemaining(isWorkSession ? w : b);
  };

  /** Handlers: Tasks **/
  // PUBLIC_INTERFACE
  const addTask = () => {
    const name = taskInput.trim();
    if (!name) return;
    const newTask = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name,
      done: false,
      pomodoros: 0,
    };
    setTasks(prev => [newTask, ...prev]);
    setTaskInput('');
    if (!selectedTaskId) setSelectedTaskId(newTask.id);
  };

  // PUBLIC_INTERFACE
  const toggleTaskDone = (id) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  // PUBLIC_INTERFACE
  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (selectedTaskId === id) setSelectedTaskId(null);
  };

  // PUBLIC_INTERFACE
  const editTaskName = (id, name) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, name } : t)));
  };

  // PUBLIC_INTERFACE
  const selectTask = (id) => {
    setSelectedTaskId(id);
  };

  /** Accessible labels **/
  const themeAria = `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`;

  return (
    <div className="ocean-app">
      <header className="ocean-header">
        <div className="brand">
          <div className="brand-icon" aria-hidden="true">⏳</div>
          <div className="brand-text">
            <h1 className="brand-title">Pomodoro Focus</h1>
            <p className="brand-sub">Elegant productivity with Ocean Professional</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn subtle" onClick={toggleTheme} aria-label={themeAria}>
            {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
        </div>
      </header>

      <main className="two-panel">
        {/* Timer Panel */}
        <section className="panel timer-panel" aria-label="Pomodoro Timer">
          <div className="panel-surface">
            <div className="timer-header">
              <div className={`chip ${isWorkSession ? 'chip-primary' : 'chip-accent'}`}>
                {sessionLabel}
              </div>
              <div className="session-actions">
                <button
                  className={`btn small ${isWorkSession ? 'outline' : 'solid'}`}
                  onClick={() => {
                    setIsRunning(false);
                    setIsWorkSession(true);
                    setRemaining(workDuration);
                  }}
                >
                  Focus
                </button>
                <button
                  className={`btn small ${!isWorkSession ? 'outline' : 'solid'}`}
                  onClick={() => {
                    setIsRunning(false);
                    setIsWorkSession(false);
                    setRemaining(breakDuration);
                  }}
                >
                  Break
                </button>
              </div>
            </div>

            <div className="timer-display">
              <div className="time">{formatTime(remaining)}</div>
              <div className="progress">
                <div
                  className="progress-bar"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                  role="progressbar"
                />
              </div>
              <div className="timer-controls">
                <button className="btn primary" onClick={startPause}>
                  {isRunning ? 'Pause' : 'Start'}
                </button>
                <button className="btn ghost" onClick={resetTimer}>Reset</button>
                <button className="btn secondary" onClick={switchSession}>Switch</button>
              </div>
            </div>

            <div className="settings">
              <h3 className="section-title">Session lengths</h3>
              <div className="settings-grid">
                <label className="field">
                  <span>Focus (minutes)</span>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={Math.round(workDuration / 60)}
                    onChange={e => updateDurations(Number(e.target.value), Math.round(breakDuration / 60))}
                  />
                </label>
                <label className="field">
                  <span>Break (minutes)</span>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={Math.round(breakDuration / 60)}
                    onChange={e => updateDurations(Math.round(workDuration / 60), Number(e.target.value))}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Task Panel */}
        <section className="panel task-panel" aria-label="Task List">
          <div className="panel-surface">
            <h2 className="panel-title">Tasks</h2>
            <div className="task-input">
              <input
                type="text"
                placeholder="Add a new task..."
                value={taskInput}
                onChange={e => setTaskInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addTask();
                }}
                aria-label="Task name"
              />
              <button className="btn primary" onClick={addTask} aria-label="Add task">
                Add
              </button>
            </div>

            <div className="task-list" role="list">
              {tasks.length === 0 && (
                <div className="empty">
                  <p>No tasks yet. Add one to get started.</p>
                </div>
              )}
              {tasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  selected={selectedTaskId === task.id}
                  onToggle={() => toggleTaskDone(task.id)}
                  onDelete={() => deleteTask(task.id)}
                  onEdit={(name) => editTaskName(task.id, name)}
                  onSelect={() => selectTask(task.id)}
                />
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <p>Made to help you focus — stay in the flow.</p>
      </footer>
    </div>
  );
}

/**
 * TaskItem: Single task row with inline edit, completion toggle, selection, delete
 */
// PUBLIC_INTERFACE
function TaskItem({ task, selected, onToggle, onDelete, onEdit, onSelect }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(task.name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const confirmEdit = () => {
    const name = value.trim();
    if (name && name !== task.name) onEdit(name);
    setEditing(false);
  };

  return (
    <div className={`task-item ${selected ? 'selected' : ''}`} role="listitem">
      <button className={`select-dot ${selected ? 'active' : ''}`} onClick={onSelect} aria-label="Select task" />
      <label className="checkbox">
        <input type="checkbox" checked={task.done} onChange={onToggle} aria-label="Mark task done" />
        <span className="checkmark" />
      </label>
      <div className="task-content" onClick={onSelect}>
        {editing ? (
          <input
            ref={inputRef}
            className="task-edit"
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={confirmEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') confirmEdit();
              if (e.key === 'Escape') {
                setValue(task.name);
                setEditing(false);
              }
            }}
            aria-label="Edit task name"
          />
        ) : (
          <div className={`task-text ${task.done ? 'done' : ''}`}>
            <span className="name">{task.name}</span>
            <span className="meta">Pomodoros: {task.pomodoros || 0}</span>
          </div>
        )}
      </div>
      <div className="task-actions">
        {!editing && (
          <button className="icon-btn" onClick={() => setEditing(true)} aria-label="Edit task">
            ✏️
          </button>
        )}
        <button className="icon-btn danger" onClick={onDelete} aria-label="Delete task">
          🗑️
        </button>
      </div>
    </div>
  );
}

export default App;
