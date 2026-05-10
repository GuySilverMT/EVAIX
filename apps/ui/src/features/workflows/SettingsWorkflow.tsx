/**
 * Settings Workflow — Phase 6
 *
 * Single-column layout: vertical list of setting panels inside a UniversalCardWrapper.
 * Merges: Project Settings, Theme Editor link, Coding Rules, Glossary, Sources.
 */
import { Settings } from 'lucide-react';
import { UniversalCardWrapper } from '../../components/work-order/UniversalCardWrapper.js';
import Constitution from '../../pages/Constitution.js';

export default function SettingsWorkflow() {
  return (
    <div className="h-full w-full flex overflow-hidden bg-zinc-950 justify-center">
      <div className="w-full max-w-4xl flex flex-col overflow-hidden">
        <UniversalCardWrapper
          title="Settings & Constitution"
          icon={Settings}
          aiContext="settings_workflow"
          settings={
            <div className="text-xs text-zinc-400">
              <p>All system settings, coding rules, glossary, and knowledge sources are managed here.</p>
            </div>
          }
        >
          <Constitution embedded />
        </UniversalCardWrapper>
      </div>
    </div>
  );
}
