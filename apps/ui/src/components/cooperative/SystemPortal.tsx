import React, { useState } from 'react';
import { Box, IconButton, Tooltip, Menu } from '@mui/material';
import { 
  Settings as SettingsIcon,
  Apps as AppsIcon,
  AccountCircle as AccountsIcon,
  Palette as ThemeIcon,
  AccountTree as ProjectManagerIcon,
  Description as DocsIcon,
  TableChart as SheetsIcon,
  ChatBubble as ChatIcon,
  Terminal as TerminalIcon
} from '@mui/icons-material';
import { useWorkspaceStore } from '../../stores/workspace.store.js';
import { toast } from 'sonner';

/**
 * @file SystemPortal.tsx
 * @description The dropdown matrix that spawns new App Cards into TheGrid and opens System App overlays.
 * Serves as the gateway for system tools and agentic applications.
 */

export const SystemPortal: React.FC = () => {
  const [anchorSettings, setAnchorSettings] = useState<null | HTMLElement>(null);
  const [anchorApps, setAnchorApps] = useState<null | HTMLElement>(null);

  const toggleSystemApp = useWorkspaceStore(s => s.toggleSystemApp);
  const addCard = useWorkspaceStore(s => s.addCard);

  const handleSpawnCard = (viewMode: string) => {
    addCard({
      id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      roleId: '',
      column: 0,
      screenspaceId: 1,
      activeTool: viewMode,
      metadata: { viewMode }
    });
    toast.success(`Spawned App Card: ${viewMode}`);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {/* Settings Matrix Portal */}
      <Tooltip title="System Settings Matrix">
        <IconButton 
          onClick={(e) => setAnchorSettings(e.currentTarget)}
          sx={{ 
            color: '#892481', 
            width: 36, 
            height: 36, 
            borderRadius: '4px',
            border: '1px solid #3c3c3c',
            '&:hover': { bgcolor: '#2a2a2d' }
          }}
        >
          <SettingsIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorSettings}
        open={Boolean(anchorSettings)}
        onClose={() => setAnchorSettings(null)}
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#18181a',
              border: '1px solid #3c3c3c',
              p: 1
            }
          }
        }}
      >
        <Box sx={{ display: 'flex', gap: '8px', p: '4px' }}>
          <Tooltip title="Project Navigator">
            <IconButton 
              onClick={() => { toggleSystemApp('project-manager'); setAnchorSettings(null); }}
              sx={{ color: '#16c522', border: '1px solid #16c522', width: 44, height: 44 }}
            >
              <ProjectManagerIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Accounts & Profile">
            <IconButton 
              onClick={() => { toggleSystemApp('accounts'); setAnchorSettings(null); }}
              sx={{ color: '#892481', border: '1px solid #892481', width: 44, height: 44 }}
            >
              <AccountsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Theme & Settings">
            <IconButton 
              onClick={() => { toggleSystemApp('settings'); setAnchorSettings(null); }}
              sx={{ color: '#00bcd4', border: '1px solid #00bcd4', width: 44, height: 44 }}
            >
              <ThemeIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Menu>

      {/* Apps Matrix Portal */}
      <Tooltip title="App Card Spawner Matrix">
        <IconButton 
          onClick={(e) => setAnchorApps(e.currentTarget)}
          sx={{ 
            color: '#16c522', 
            width: 36, 
            height: 36, 
            borderRadius: '4px',
            border: '1px solid #3c3c3c',
            '&:hover': { bgcolor: '#2a2a2d' }
          }}
        >
          <AppsIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorApps}
        open={Boolean(anchorApps)}
        onClose={() => setAnchorApps(null)}
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#18181a',
              border: '1px solid #3c3c3c',
              p: 1
            }
          }
        }}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', p: '4px' }}>
          <Tooltip title="Docs Card">
            <IconButton 
              onClick={() => { handleSpawnCard('editor'); setAnchorApps(null); }}
              sx={{ color: '#4285f4', border: '1px solid #4285f4', width: 44, height: 44 }}
            >
              <DocsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Data Grid Card">
            <IconButton 
              onClick={() => { handleSpawnCard('databrowser'); setAnchorApps(null); }}
              sx={{ color: '#0f9d58', border: '1px solid #0f9d58', width: 44, height: 44 }}
            >
              <SheetsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Chat Card">
            <IconButton 
              onClick={() => { handleSpawnCard('chat'); setAnchorApps(null); }}
              sx={{ color: '#ab47bc', border: '1px solid #ab47bc', width: 44, height: 44 }}
            >
              <ChatIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Terminal Card">
            <IconButton 
              onClick={() => { handleSpawnCard('terminal'); setAnchorApps(null); }}
              sx={{ color: '#ff9800', border: '1px solid #ff9800', width: 44, height: 44 }}
            >
              <TerminalIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Menu>
    </Box>
  );
};
