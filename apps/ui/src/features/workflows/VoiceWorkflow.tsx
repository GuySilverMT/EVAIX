/**
 * Voice Workflow — Phase 6
 *
 * 2-column layout:
 *   Left:  Voice Playground UI (extracted from VoicePlayground.tsx)
 *   Right: A SwappableCard for output monitoring and engine settings
 */
import { Mic, Radio } from 'lucide-react';
import { UniversalCardWrapper } from '../../components/work-order/UniversalCardWrapper.js';
import VoicePlayground from '../../pages/VoicePlayground.js';

export default function VoiceWorkflow() {
  return (
    <div className="h-full w-full flex overflow-hidden bg-zinc-950">

      {/* LEFT: Voice Playground */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-zinc-800">
        <UniversalCardWrapper
          title="Voice Playground"
          icon={Mic}
          aiContext="voice_playground"
          settings={
            <div className="text-xs text-zinc-400 space-y-2">
              <p>Configure STT, TTS, and bidirectional engines. Assign an AI role/personality for the active session.</p>
            </div>
          }
        >
          <div className="flex-1 overflow-auto">
            <VoicePlayground embedded />
          </div>
        </UniversalCardWrapper>
      </div>

      {/* RIGHT: Output monitor / settings */}
      <div className="w-[360px] min-w-[280px] flex flex-col overflow-hidden">
        <UniversalCardWrapper
          title="Voice Monitor"
          icon={Radio}
          aiContext="voice_monitor"
          settings={
            <div className="text-xs text-zinc-400">
              <p>Live transcription output and synthesis playback will appear here.</p>
            </div>
          }
        >
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4 text-zinc-600">
            <Radio size={32} className="opacity-30" />
            <p className="text-xs text-center">Voice output and transcription will stream here during active sessions.</p>
          </div>
        </UniversalCardWrapper>
      </div>

    </div>
  );
}
