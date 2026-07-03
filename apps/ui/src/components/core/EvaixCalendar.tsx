/**
 * @file EvaixCalendar.tsx
 * @description EVAIX Scheduler visual interface built on @aldabil/react-scheduler.
 *
 * - Reads from / writes to the local API endpoint (GET/POST/DELETE /api/scheduler)
 * - Inherits the active MUI theme automatically (dark mode, accent colour)
 * - Can be spawned as a dockable AppCard tile via `spawnApp('scheduler')`
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Scheduler, type ProcessedEvent, type SchedulerHelpers } from '@aldabil/react-scheduler';
import { nanoid } from 'nanoid';

const API_BASE = 'http://localhost:5555';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScheduledJob {
  id: string;
  title: string;
  start: string;
  end: string;
  cron?: string;
  automationPayload?: {
    agent: string;
    action: string;
    prompt?: string;
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const EvaixCalendar: React.FC = () => {
  const [events, setEvents] = useState<ProcessedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Fetch jobs from the API on mount
  // -------------------------------------------------------------------------
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/scheduler`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const jobs: ScheduledJob[] = await res.json();

      setEvents(
        jobs.map(job => ({
          event_id: job.id,
          title: job.title,
          start: new Date(job.start),
          end: new Date(job.end),
          // Surface the cron tag in the colour slot for visual distinction
          color: job.cron ? 'var(--scheduler-cron-color, #6366f1)' : undefined,
          // Stash raw fields so we can round-trip them on edit
          extendedProps: {
            cron: job.cron,
            automationPayload: job.automationPayload,
          },
        }))
      );
      setError(null);
    } catch (err: any) {
      console.error('[EvaixCalendar] Failed to load jobs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  // -------------------------------------------------------------------------
  // Confirm callback – handles both CREATE and EDIT
  // -------------------------------------------------------------------------
  const handleConfirm = useCallback(
    async (event: ProcessedEvent, action: string): Promise<ProcessedEvent> => {
      // On create the scheduler provides a temporary numeric id – replace it
      const jobId =
        action === 'create'
          ? nanoid()
          : String(event.event_id);

      const job: ScheduledJob = {
        id: jobId,
        title: event.title,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        cron: (event.extendedProps as any)?.cron,
        automationPayload: (event.extendedProps as any)?.automationPayload,
      };

      try {
        const res = await fetch(`${API_BASE}/api/scheduler`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(job),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err: any) {
        console.error('[EvaixCalendar] Failed to save job:', err);
      }

      // Return the confirmed event with our canonical id
      return { ...event, event_id: jobId };
    },
    []
  );

  // -------------------------------------------------------------------------
  // Delete callback
  // -------------------------------------------------------------------------
  const handleDelete = useCallback(async (eventId: string | number): Promise<string | number | void> => {
    try {
      const res = await fetch(`${API_BASE}/api/scheduler/${eventId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err: any) {
      console.error('[EvaixCalendar] Failed to delete job:', err);
    }
    return eventId;
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--colors-background, #09090b)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 16px',
          borderBottom: '1px solid var(--colors-divider, #27272a)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--colors-primary, #fff)' }}>
          EVAIX SCHEDULER
        </span>
        {error && (
          <span style={{ fontSize: 11, color: '#f87171', marginLeft: 'auto' }}>
            ⚠ {error}
          </span>
        )}
        <button
          onClick={fetchJobs}
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background: 'transparent',
            border: '1px solid var(--colors-divider, #27272a)',
            borderRadius: 4,
            color: 'var(--colors-secondary, #a1a1aa)',
            cursor: 'pointer',
            padding: '3px 10px',
          }}
        >
          Refresh
        </button>
      </div>

      {/* ── Scheduler ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {!loading && (
          <Scheduler
            view="week"
            events={events}
            onConfirm={handleConfirm}
            onDelete={handleDelete}
            week={{
              weekDays: [0, 1, 2, 3, 4, 5, 6],
              weekStartOn: 1,
              startHour: 6,
              endHour: 22,
              step: 30,
            }}
            day={{
              startHour: 6,
              endHour: 22,
              step: 30,
            }}
          />
        )}
        {loading && (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--colors-secondary, #a1a1aa)',
              fontSize: 13,
              fontFamily: 'monospace',
              letterSpacing: '0.05em',
            }}
          >
            Loading schedule...
          </div>
        )}
      </div>
    </div>
  );
};
