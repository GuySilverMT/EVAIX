/**
 * Voice Playground Page
 * 
 * Universal voice processing and experimentation interface
 * Supports STT, TTS, keyword listening, Android bridge, and AI role management
 */

import { useState, useEffect } from 'react';
import { Mic, Play, Pause, Settings, Smartphone, Radio, Zap, Keyboard } from 'lucide-react';
import { trpc } from '../utils/trpc.js';
import { Button } from '../components/ui/button.js';
import AudioPlayer from '../components/AudioPlayer.js';
import { VoiceKeyboard } from '../components/VoiceKeyboard.js';

type InputSource = 'microphone' | 'file' | 'android' | 'keyword';

interface VoiceEngine {
  id: string;
  name: string;
  provider: string;
  type: string;
}

interface VoiceRole {
  id: string;
  name: string;
  description: string;
}

export default function VoicePlayground({ embedded = false }: { embedded?: boolean }) {
  const [selectedInputSource, setSelectedInputSource] = useState<InputSource>('microphone');
  const [selectedSTTEngine, setSelectedSTTEngine] = useState<string>('');
  const [selectedTTSEngine, setSelectedTTSEngine] = useState<string>('');
  const [selectedBidirectionalEngine, setSelectedBidirectionalEngine] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [synthesizedAudioUrl, setSynthesizedAudioUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceKeyboardOpen, setVoiceKeyboardOpen] = useState(false);

  // Queries
  const { data: sttEngines } = trpc.voice.listEngines.useQuery({ type: 'STT' });
  const { data: ttsEngines } = trpc.voice.listEngines.useQuery({ type: 'TTS' });
  const { data: bidirectionalEngines } = trpc.voice.listEngines.useQuery({ type: 'BIDIRECTIONAL' });
  const { data: roles } = trpc.voice.listRoles.useQuery();
  const { data: activeRole } = trpc.voice.getActiveRole.useQuery();
  const { data: androidDevices } = trpc.voice.getAndroidDevices.useQuery();
  const { data: keywordStatus } = trpc.voice.getKeywordListenerStatus.useQuery();

  // Mutations
  const setActiveRoleMutation = trpc.voice.setActiveRole.useMutation();
  const synthesizeMutation = trpc.voice.synthesizeSpeech.useMutation();
  const startKeywordListenerMutation = trpc.voice.startKeywordListener.useMutation();
  const stopKeywordListenerMutation = trpc.voice.stopKeywordListener.useMutation();

  useEffect(() => {
    if (activeRole) {
      setSelectedRole(activeRole.id);
    }
  }, [activeRole]);

  const handleRoleChange = async (roleId: string) => {
    setSelectedRole(roleId);
    await setActiveRoleMutation.mutateAsync({ roleId });
  };

  const handleSynthesize = async () => {
    if (!transcribedText.trim()) return;
    
    setIsProcessing(true);
    try {
      const result = await synthesizeMutation.mutateAsync({
        text: transcribedText,
        engineId: selectedTTSEngine || undefined,
      });
      
      if (result.audioData) {
        // Create blob URL from base64 audio data
        const audioBlob = new Blob(
          [Uint8Array.from(atob(result.audioData), c => c.charCodeAt(0))],
          { type: 'audio/wav' }
        );
        const url = URL.createObjectURL(audioBlob);
        setSynthesizedAudioUrl(url);
      }
    } catch (error) {
      console.error('Synthesis error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartKeywordListener = async () => {
    try {
      await startKeywordListenerMutation.mutateAsync({});
    } catch (error) {
      console.error('Error starting keyword listener:', error);
    }
  };

  const handleStopKeywordListener = async () => {
    try {
      await stopKeywordListenerMutation.mutateAsync();
    } catch (error) {
      console.error('Error stopping keyword listener:', error);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950">
      {/* Header — hidden when embedded inside a workflow card */}
      {!embedded && (
        <div className="flex-none h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="font-bold text-xl text-zinc-200 tracking-tight leading-none">
              VOICE PLAYGROUND
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              UNIVERSAL VOICE PROCESSING LAB
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <Settings className="w-4 h-4 mr-1" />
            Settings
          </Button>
        </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Input Source Selection */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <h3 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Input Sources
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => setSelectedInputSource('microphone')}
              className={`p-4 rounded-lg border transition-all ${
                selectedInputSource === 'microphone'
                  ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <Mic className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Microphone</div>
            </button>
            
            <button
              onClick={() => setSelectedInputSource('file')}
              className={`p-4 rounded-lg border transition-all ${
                selectedInputSource === 'file'
                  ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <Play className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">File Upload</div>
            </button>
            
            <button
              onClick={() => setSelectedInputSource('android')}
              className={`p-4 rounded-lg border transition-all ${
                selectedInputSource === 'android'
                  ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <Smartphone className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Android</div>
              {androidDevices && androidDevices.length > 0 && (
                <div className="text-xs text-green-400 mt-1">
                  {androidDevices.length} connected
                </div>
              )}
            </button>
            
            <button
              onClick={() => setSelectedInputSource('keyword')}
              className={`p-4 rounded-lg border transition-all ${
                selectedInputSource === 'keyword'
                  ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <Radio className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Keyword</div>
              {keywordStatus?.isListening && (
                <div className="text-xs text-green-400 mt-1">Active</div>
              )}
            </button>
          </div>
          
          {selectedInputSource === 'keyword' && (
            <div className="mt-4 flex items-center gap-2">
              {keywordStatus?.isListening ? (
                <Button
                  onClick={() => void handleStopKeywordListener()}
                  variant="outline"
                  size="sm"
                  className="text-red-400 border-red-400 hover:bg-red-400/10"
                >
                  <Pause className="w-4 h-4 mr-1" />
                  Stop Listening
                </Button>
              ) : (
                <Button
                  onClick={() => void handleStartKeywordListener()}
                  variant="outline"
                  size="sm"
                  className="text-green-400 border-green-400 hover:bg-green-400/10"
                >
                  <Radio className="w-4 h-4 mr-1" />
                  Start Listening
                </Button>
              )}
              
              {keywordStatus?.registeredKeywords && keywordStatus.registeredKeywords.length > 0 && (
                <div className="text-xs text-zinc-400">
                  Keywords: {keywordStatus.registeredKeywords.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Engine Selection - 3 Boxes */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* STT Engine (Input Only) */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-200 mb-2 flex items-center gap-2">
              <Mic className="w-5 h-5 text-blue-400" />
              STT (Input)
            </h3>
            <p className="text-xs text-zinc-500 mb-4">Speech-to-Text only</p>
            
            <select
              value={selectedSTTEngine}
              onChange={(e) => setSelectedSTTEngine(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200 text-sm"
            >
              <option value="">Default</option>
              {sttEngines?.map((engine: VoiceEngine) => (
                <option key={engine.id} value={engine.id}>
                  {engine.name}
                </option>
              ))}
            </select>
            
            <div className="mt-3 text-xs text-zinc-500">
              {sttEngines?.length || 0} engines
            </div>
            
            {/* Voice Keyboard Button */}
            <Button
              onClick={() => setVoiceKeyboardOpen(true)}
              className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white"
              size="sm"
            >
              <Keyboard className="w-4 h-4 mr-2" />
              Voice Keyboard
            </Button>
          </div>

          {/* TTS Engine (Output Only) */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-200 mb-2 flex items-center gap-2">
              <Play className="w-5 h-5 text-green-400" />
              TTS (Output)
            </h3>
            <p className="text-xs text-zinc-500 mb-4">Text-to-Speech only</p>
            
            <select
              value={selectedTTSEngine}
              onChange={(e) => setSelectedTTSEngine(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200 text-sm"
            >
              <option value="">Default</option>
              {ttsEngines?.map((engine: VoiceEngine) => (
                <option key={engine.id} value={engine.id}>
                  {engine.name}
                </option>
              ))}
            </select>
            
            <div className="mt-3 text-xs text-zinc-500">
              {ttsEngines?.length || 0} engines
            </div>
          </div>

          {/* Bidirectional Engine (Both) */}
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-zinc-200 mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              Bidirectional
            </h3>
            <p className="text-xs text-zinc-500 mb-4">Both input & output</p>
            
            <select
              value={selectedBidirectionalEngine}
              onChange={(e) => setSelectedBidirectionalEngine(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-zinc-200 text-sm"
            >
              <option value="">Default</option>
              {bidirectionalEngines?.map((engine: VoiceEngine) => (
                <option key={engine.id} value={engine.id}>
                  {engine.name}
                </option>
              ))}
            </select>
            
            <div className="mt-3 text-xs text-zinc-500">
              {bidirectionalEngines?.length || 0} engines
            </div>
          </div>
        </div>

        {/* AI Role/Personality */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <h3 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            AI Role / Personality
          </h3>
          
          <div className="grid md:grid-cols-3 gap-3">
            {roles?.map((role: VoiceRole) => (
              <button
                key={role.id}
                onClick={() => void handleRoleChange(role.id)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  selectedRole === role.id
                    ? 'bg-purple-500/20 border-purple-500'
                    : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <div className="font-medium text-zinc-200 mb-1">{role.name}</div>
                <div className="text-xs text-zinc-400">{role.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Processing Area */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <h3 className="text-lg font-semibold text-zinc-200 mb-4">
            Experiment Panel
          </h3>
          
          {/* Transcribed Text */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Transcribed / Input Text
            </label>
            <textarea
              value={transcribedText}
              onChange={(e) => setTranscribedText(e.target.value)}
              placeholder="Transcribed text will appear here, or type text to synthesize..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 min-h-[120px] resize-none"
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              onClick={() => void handleSynthesize()}
              disabled={!transcribedText.trim() || isProcessing}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Synthesize Speech'}
            </Button>
          </div>
          
          {/* Audio Player */}
          {synthesizedAudioUrl && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Output Audio
              </label>
              <AudioPlayer src={synthesizedAudioUrl} />
            </div>
          )}
        </div>
      </div>

      {/* Voice Keyboard Overlay */}
      <VoiceKeyboard
        isOpen={voiceKeyboardOpen}
        onClose={() => setVoiceKeyboardOpen(false)}
        onTextSubmit={(text) => {
          setTranscribedText(text);
          setVoiceKeyboardOpen(false);
        }}
        position={{ x: window.innerWidth / 2, y: window.innerHeight / 2 }}
      />
    </div>
  );
}
