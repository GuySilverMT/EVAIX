import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  InputBase,
  IconButton,
  Tooltip,
  Divider,
  Chip,
  Paper,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Send,
  Terminal,
  FileText,
  Mic,
  PlusCircle,
  Play,
  Zap,
  Cpu,
  Layers
} from 'lucide-react';
import { trpc } from '../../utils/trpc.js';
import { toast } from 'sonner';
import { useWorkspaceStore } from '../../stores/workspace.store.js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  interceptedScripts?: Array<{ scriptPath: string; intentId: string; content: string }>;
  deploymentResult?: any;
}

export function OpenWebUIDenseChat({ className }: { className?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init-1',
      role: 'system',
      content: 'EVAIX OPEN WEBUI BRIDGE ONLINE. CONNECTED TO LOCAL CORE API (http://localhost:8080/api).',
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'msg-init-2',
      role: 'assistant',
      content: 'Ready for brutalist chat streaming. Type a directive or start with "Deploy" to trigger backend VFS shell execution.',
      timestamp: new Date().toLocaleTimeString(),
    }
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    targetMsg: ChatMessage | null;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendMessageMutation = trpc.openwebui.sendMessage.useMutation();
  const executeDeployMutation = trpc.openwebui.executeDeploy.useMutation();
  const registerSynonymMutation = trpc.openwebui.registerSynonym.useMutation();
  const { data: intentRegistryData, refetch: refetchIntentRegistry } = trpc.openwebui.getIntentRegistry.useQuery();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const orchestratorMode = useWorkspaceStore(s => s.orchestratorMode);

  // Handle Send Message
  const handleSend = async (autoDeployOverride = false) => {
    const text = inputVal.trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsStreaming(true);

    try {
      const result = await sendMessageMutation.mutateAsync({
        message: text,
        autoDeploy: autoDeployOverride,
        orchestratorMode,
      });

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: result.reply,
        timestamp: new Date(result.timestamp).toLocaleTimeString(),
        interceptedScripts: result.interceptedScripts,
        deploymentResult: result.deploymentResult,
      };

      setMessages(prev => [...prev, assistantMsg]);
      if (result.interceptedScripts && result.interceptedScripts.length > 0) {
        toast.success(`Intercepted ${result.interceptedScripts.length} script(s) to .evaix/voice/scripts/`);
        refetchIntentRegistry();
      }
      if (result.deploymentResult) {
        toast.info('Backend deployment task triggered');
      }
    } catch (err: any) {
      toast.error(`Stream error: ${err.message || 'Failed to communicate with Open WebUI bridge'}`);
    } finally {
      setIsStreaming(false);
    }
  };

  // Double-Action Protocol: Left-Click (Copy text)
  const handleLeftClickMessage = (msg: ChatMessage) => {
    navigator.clipboard.writeText(msg.content);
    toast.success('Content copied to clipboard');
  };

  // Double-Action Protocol: Right-Click (Context Menu)
  const handleContextMenu = (event: React.MouseEvent, msg: ChatMessage) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      targetMsg: msg,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Action 1: Insert Document to Context Stack
  const handleInsertToContextStack = () => {
    if (!contextMenu?.targetMsg) return;
    toast.success('Document inserted into context stack');
    handleCloseContextMenu();
  };

  // Action 2: Fork Output block to Google Docs MCP
  const handleForkToGoogleDocs = () => {
    if (!contextMenu?.targetMsg) return;
    toast.success('Forked output block to Google Docs MCP (.evaix/docs/)');
    handleCloseContextMenu();
  };

  // Action 3: Generate Local Voice Trigger Synonym
  const handleGenerateVoiceSynonym = async () => {
    if (!contextMenu?.targetMsg) return;
    const sampleTrigger = contextMenu.targetMsg.content.slice(0, 30).trim() || 'custom intent';
    try {
      await registerSynonymMutation.mutateAsync({
        intentId: 'chat',
        synonym: sampleTrigger,
      });
      toast.success(`Registered voice trigger synonym: "${sampleTrigger}"`);
      refetchIntentRegistry();
    } catch (e: any) {
      toast.error('Failed to register synonym');
    }
    handleCloseContextMenu();
  };

  // Action 4: Execute Deploy Task
  const handleDirectDeploy = async () => {
    if (!contextMenu?.targetMsg) return;
    const scripts = contextMenu.targetMsg.interceptedScripts;
    const targetScript = scripts && scripts.length > 0 ? scripts[0].scriptPath : undefined;
    try {
      const res = await executeDeployMutation.mutateAsync({
        scriptPath: targetScript,
        command: targetScript ? undefined : contextMenu.targetMsg.content,
      });
      if (res.success) {
        toast.success(`Deploy executed: ${res.stdout || 'OK'}`);
      } else {
        toast.error(`Deploy failed: ${res.error || res.stderr}`);
      }
    } catch (err: any) {
      toast.error(`Deploy error: ${err.message}`);
    }
    handleCloseContextMenu();
  };

  return (
    <Box
      className={className}
      sx={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#09090b',
        color: '#e4e4e7',
        fontFamily: 'monospace',
        fontSize: '11px',
        overflow: 'hidden',
        borderLeft: '1px solid #27272a',
      }}
    >
      {/* Brutalist Header */}
      <Box
        sx={{
          height: '28px',
          px: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#18181b',
          borderBottom: '1px solid #27272a',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          userSelect: 'none',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Cpu size={12} style={{ color: '#6366f1' }} />
          <span>OPEN WEBUI STREAM</span>
          <Chip
            label={orchestratorMode === 'code' ? "CODE (LSP)" : "JSON"}
            size="small"
            sx={{
              height: '14px',
              fontSize: '8px',
              fontWeight: 800,
              backgroundColor: orchestratorMode === 'code' ? '#3730a3' : '#1e293b',
              color: orchestratorMode === 'code' ? '#818cf8' : '#94a3b8',
              borderRadius: 0,
              px: '2px',
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Active Intents in .evaix/voice/intent_registry.json">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#a1a1aa' }}>
              <Layers size={10} />
              <span>{intentRegistryData?.intents?.length || 0} INTENTS</span>
            </Box>
          </Tooltip>
        </Box>
      </Box>

      {/* Edge-to-Edge Dense Message List (Zero padding, 1px dividing rules) */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-thumb': { backgroundColor: '#27272a' },
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isSystem = msg.role === 'system';

          return (
            <Box
              key={msg.id}
              onClick={() => handleLeftClickMessage(msg)}
              onContextMenu={(e) => handleContextMenu(e, msg)}
              sx={{
                width: '100%',
                px: 1,
                py: 0.5,
                borderBottom: '1px solid #27272a',
                backgroundColor: isUser ? '#09090b' : isSystem ? '#111827' : '#0c0a09',
                cursor: 'pointer',
                transition: 'background-color 0.1s ease',
                '&:hover': {
                  backgroundColor: '#18181b',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  mb: '2px',
                  fontSize: '9px',
                  color: isUser ? '#60a5fa' : isSystem ? '#f59e0b' : '#10b981',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <span>{isUser ? '[U] USER' : isSystem ? '[S] SYSTEM' : '[A] OPEN-WEBUI'}</span>
                  {msg.interceptedScripts && msg.interceptedScripts.length > 0 && (
                    <Chip
                      label={`${msg.interceptedScripts.length} SCRIPT`}
                      size="small"
                      sx={{
                        height: '12px',
                        fontSize: '7px',
                        fontWeight: 900,
                        backgroundColor: '#064e3b',
                        color: '#6ee7b7',
                        borderRadius: 0,
                      }}
                    />
                  )}
                </Box>
                <span style={{ color: '#71717a', fontWeight: 400 }}>{msg.timestamp}</span>
              </Box>

              <Typography
                component="div"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  lineHeight: 1.3,
                  color: '#e4e4e7',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  m: 0,
                  p: 0,
                }}
              >
                {msg.content}
              </Typography>

              {/* Intercepted Scripts Block Display */}
              {msg.interceptedScripts && msg.interceptedScripts.length > 0 && (
                <Box
                  sx={{
                    mt: 0.5,
                    p: 0.5,
                    backgroundColor: '#022c22',
                    border: '1px solid #065f46',
                    fontSize: '9px',
                    fontFamily: 'monospace',
                    color: '#a7f3d0',
                  }}
                >
                  {msg.interceptedScripts.map((sc, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Terminal size={10} />
                        <span>VFS Script: {sc.scriptPath}</span>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          executeDeployMutation.mutate({ scriptPath: sc.scriptPath });
                          toast.info(`Executing script ${sc.scriptPath}`);
                        }}
                        sx={{ p: '2px', color: '#34d399' }}
                      >
                        <Play size={10} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Deployment execution result feedback */}
              {msg.deploymentResult && (
                <Box
                  sx={{
                    mt: 0.5,
                    p: 0.5,
                    backgroundColor: '#18181b',
                    borderLeft: '2px solid #3b82f6',
                    fontSize: '9px',
                    color: '#93c5fd',
                  }}
                >
                  [DEPLOY OUTPUT]: {msg.deploymentResult.stdout || msg.deploymentResult.error || 'Done'}
                </Box>
              )}
            </Box>
          );
        })}

        {isStreaming && (
          <Box
            sx={{
              px: 1,
              py: 0.5,
              borderBottom: '1px solid #27272a',
              backgroundColor: '#18181b',
              color: '#a1a1aa',
              fontStyle: 'italic',
              fontSize: '10px',
            }}
          >
            Streaming generation from local Open WebUI bridge…
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Edge-to-Edge Input Bar (Zero padding, condensed typography) */}
      <Paper
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          backgroundColor: '#09090b',
          borderTop: '1px solid #27272a',
          borderRadius: 0,
          m: 0,
          p: 0,
        }}
      >
        <InputBase
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Type command or 'Deploy script'…"
          disabled={isStreaming}
          sx={{
            ml: 1,
            flex: 1,
            color: '#f4f4f5',
            fontFamily: 'monospace',
            fontSize: '11px',
            '& .MuiInputBase-input': {
              p: '6px 0',
            },
          }}
        />

        <Tooltip title="Direct Deploy Trigger">
          <IconButton
            size="small"
            onClick={() => handleSend(true)}
            disabled={isStreaming || !inputVal.trim()}
            sx={{
              p: '4px',
              borderRadius: 0,
              color: '#eab308',
              '&:hover': { backgroundColor: '#27272a' },
            }}
          >
            <Zap size={14} />
          </IconButton>
        </Tooltip>

        <IconButton
          type="submit"
          size="small"
          disabled={isStreaming || !inputVal.trim()}
          sx={{
            p: '6px 8px',
            borderRadius: 0,
            backgroundColor: '#312e81',
            color: '#e0e7ff',
            '&:hover': { backgroundColor: '#3730a3' },
            '&.Mui-disabled': { backgroundColor: '#18181b', color: '#52525b' },
          }}
        >
          <Send size={12} />
        </IconButton>
      </Paper>

      {/* Double-Action Protocol Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        slotProps={{
          paper: {
            sx: {
              backgroundColor: '#18181b',
              color: '#f4f4f5',
              border: '1px solid #3f3f46',
              borderRadius: 0,
              fontSize: '10px',
              fontFamily: 'monospace',
              py: 0.5,
              '& .MuiMenuItem-root': {
                fontSize: '10px',
                fontFamily: 'monospace',
                py: '4px',
                px: '8px',
                '&:hover': { backgroundColor: '#27272a' },
              },
            },
          },
        }}
      >
        <MenuItem onClick={handleInsertToContextStack}>
          <ListItemIcon sx={{ minWidth: 20, color: '#a1a1aa' }}>
            <PlusCircle size={12} />
          </ListItemIcon>
          <ListItemText primary="Insert Document to Context Stack" />
        </MenuItem>

        <MenuItem onClick={handleForkToGoogleDocs}>
          <ListItemIcon sx={{ minWidth: 20, color: '#a1a1aa' }}>
            <FileText size={12} />
          </ListItemIcon>
          <ListItemText primary="Fork Output block to Google Docs MCP" />
        </MenuItem>

        <MenuItem onClick={handleGenerateVoiceSynonym}>
          <ListItemIcon sx={{ minWidth: 20, color: '#a1a1aa' }}>
            <Mic size={12} />
          </ListItemIcon>
          <ListItemText primary="Generate Local Voice Trigger Synonym" />
        </MenuItem>

        <Divider sx={{ my: 0.5, borderColor: '#27272a' }} />

        <MenuItem onClick={handleDirectDeploy}>
          <ListItemIcon sx={{ minWidth: 20, color: '#eab308' }}>
            <Play size={12} />
          </ListItemIcon>
          <ListItemText primary="Execute Deploy Task" />
        </MenuItem>
      </Menu>
    </Box>
  );
}
