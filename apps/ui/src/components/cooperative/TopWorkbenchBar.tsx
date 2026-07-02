import React, { useState } from 'react';
import { 
  Box, IconButton, Tooltip, Menu, MenuItem, Typography, Grid
} from '@mui/material';
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
import { ModelBar } from './ModelBar.js';
import { useWorkspaceStore } from '../../stores/workspace.store.js';
import { toast } from 'sonner';

export const TopWorkbenchBar: React.FC = () => {
  const [anchorSettings, setAnchorSettings] = useState<null | HTMLElement>(null);
  const [anchorApps, setAnchorApps] = useState<null | HTMLElement>(null);

  const toggleSystemApp = useWorkspaceStore(s => s.toggleSystemApp);

  return (
    <Box 
      sx={{ 
        height: '48px', 
        width: '100%', 
        bgcolor: '#18181a', 
        borderBottom: '1px solid #2a2a2d',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        px: '8px' 
      }}
    >
      {/* System Menu Buttons (Settings + Apps Dropdowns) */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {/* Settings Dropdown -> 3-Column Icon Grid */}
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
          PaperProps={{
            sx: {
              bgcolor: '#18181a',
              border: '1px solid #3c3c3c',
              p: 1,
              width: '180px'
            }
          }}
        >
          <Grid container spacing={1} columns={3}>
            <Grid item xs={1}>
              <Tooltip title="Project Manager">
                <IconButton 
                  onClick={() => { toggleSystemApp('project-manager'); setAnchorSettings(null); }}
                  sx={{ color: '#16c522', border: '1px solid #16c522', width: 44, height: 44 }}
                >
                  <ProjectManagerIcon />
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item xs={1}>
              <Tooltip title="Accounts & Profile">
                <IconButton 
                  onClick={() => { toggleSystemApp('accounts'); setAnchorSettings(null); }}
                  sx={{ color: '#892481', border: '1px solid #892481', width: 44, height: 44 }}
                >
                  <AccountsIcon />
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item xs={1}>
              <Tooltip title="Theme & Aesthetics">
                <IconButton 
                  onClick={() => { toggleSystemApp('settings'); setAnchorSettings(null); }}
                  sx={{ color: '#00bcd4', border: '1px solid #00bcd4', width: 44, height: 44 }}
                >
                  <ThemeIcon />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </Menu>

        {/* Apps Dropdown -> 2-Column Icon Grid */}
        <Tooltip title="App Stack Matrix">
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
          PaperProps={{
            sx: {
              bgcolor: '#18181a',
              border: '1px solid #3c3c3c',
              p: 1,
              width: '120px'
            }
          }}
        >
          <Grid container spacing={1} columns={2}>
            <Grid item xs={1}>
              <Tooltip title="Google Docs Card">
                <IconButton 
                  onClick={() => { toast.info('Spawned Docs App Card'); setAnchorApps(null); }}
                  sx={{ color: '#4285f4', border: '1px solid #4285f4', width: 44, height: 44 }}
                >
                  <DocsIcon />
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item xs={1}>
              <Tooltip title="Sheets Card">
                <IconButton 
                  onClick={() => { toast.info('Spawned Sheets App Card'); setAnchorApps(null); }}
                  sx={{ color: '#0f9d58', border: '1px solid #0f9d58', width: 44, height: 44 }}
                >
                  <SheetsIcon />
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item xs={1}>
              <Tooltip title="Gemini WebUI Chat">
                <IconButton 
                  onClick={() => { toast.info('Spawned Gemini Chat Card'); setAnchorApps(null); }}
                  sx={{ color: '#ab47bc', border: '1px solid #ab47bc', width: 44, height: 44 }}
                >
                  <ChatIcon />
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item xs={1}>
              <Tooltip title="Terminal Card">
                <IconButton 
                  onClick={() => { toast.info('Spawned Terminal Card'); setAnchorApps(null); }}
                  sx={{ color: '#ff9800', border: '1px solid #ff9800', width: 44, height: 44 }}
                >
                  <TerminalIcon />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </Menu>
      </Box>

      {/* Matrix Model Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <ModelBar />
      </Box>
    </Box>
  );
};
