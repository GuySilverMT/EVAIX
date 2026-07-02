import React, { useState } from 'react';
import { Box, Typography, IconButton, InputBase, Menu, MenuItem } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BatteryStdIcon from '@mui/icons-material/BatteryStd';
import GridViewIcon from '@mui/icons-material/GridView';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { useWorkspaceStore } from '../../stores/workspace.store.js';
import { ModelBar } from './ModelBar.js';
import { toast } from 'sonner';

export default function EvaixDenseWorkbench() {
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);

  const projectName = useWorkspaceStore(s => s.projectName);
  const setProjectName = useWorkspaceStore(s => s.setProjectName);
  const columns = useWorkspaceStore(s => s.columns);
  const setColumns = useWorkspaceStore(s => s.setColumns);

  // Right-click handler for the Play/Run Agent button
  const handlePlayRightClick = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu(
      contextMenu === null ? { mouseX: event.clientX + 2, mouseY: event.clientY - 6 } : null
    );
  };

  const handleClose = () => setContextMenu(null);

  const handleSave = () => {
    window.dispatchEvent(new CustomEvent('coop:save'));
    toast.success('Saving project configuration...');
  };

  const handleCycleColumns = () => {
    const nextColumns = (columns % 4) + 1;
    setColumns(nextColumns);
    toast.info(`Grid Layout set to ${nextColumns} columns`);
  };

  const handleExecuteAgent = (scope: string) => {
    console.log(`Executing Agent with Scope: ${scope}`);
    toast.success(`Agent executed with ${scope} context`);
    window.dispatchEvent(new CustomEvent('coop:run-agent', { detail: { scope } }));
    handleClose();
  };

  const orchestratorMode = useWorkspaceStore(s => s.orchestratorMode);
  const toggleOrchestratorMode = useWorkspaceStore(s => s.toggleOrchestratorMode);

  const handleToggleMode = () => {
    toggleOrchestratorMode();
    const nextMode = orchestratorMode === 'json' ? 'CODE (LSP)' : 'JSON';
    toast.info(`Orchestrator Mode toggled to: ${nextMode}`);
  };

  return (
    <Box sx={{ display: 'flex', width: '100vw', height: '36px', bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
      
      {/* LEFT: SYSTEM & PROJECT MENU */}
      <Box sx={{ display: 'flex', alignItems: 'center', width: '60%', borderRight: 1, borderColor: 'divider' }}>
        
        {/* Accounts, Settings & Property Manager System Apps */}
        <IconButton 
          onClick={() => {
            useWorkspaceStore.getState().toggleSystemApp('accounts');
            toast.info('Toggled Accounts System App');
          }}
          title="Accounts System App"
          sx={{ color: 'primary.main', borderRight: 1, borderColor: 'divider', width: '36px', height: '36px' }}
        >
          <AccountCircleIcon fontSize="small" />
        </IconButton>
        <IconButton 
          onClick={() => {
            useWorkspaceStore.getState().toggleSystemApp('settings');
            toast.info('Toggled Settings System App');
          }}
          title="Settings System App"
          sx={{ color: 'primary.main', borderRight: 1, borderColor: 'divider', width: '36px', height: '36px' }}
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
        <IconButton 
          onClick={() => {
            useWorkspaceStore.getState().toggleSystemApp('project-manager');
            toast.info('Toggled Project Tree System App');
          }}
          title="Project Tree Manager"
          sx={{ color: 'secondary.main', borderRight: 1, borderColor: 'divider', width: '36px', height: '36px' }}
        >
          <Typography sx={{ fontFamily: "monospace", fontSize: '11px', fontWeight: 'bold' }}>PT</Typography>
        </IconButton>

        {/* Date & Time (Google Calendar / Scheduler Triggers) */}
        <Box 
          onClick={() => toast.info('Google Calendar & Scheduler triggers active')}
          sx={{ display: 'flex', px: 1, borderRight: 1, borderColor: 'divider', height: '100%', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: '#2a2a2d' } }}
        >
          <Typography sx={{ color: 'primary.main', fontSize: '12px' }}>01/05/26</Typography>
        </Box>
        <Box 
          onClick={() => toast.info('Current workbench system time')}
          sx={{ display: 'flex', px: 1, borderRight: 1, borderColor: 'divider', height: '100%', alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: '#2a2a2d' } }}
        >
          <Typography sx={{ color: 'primary.main', fontSize: '12px' }}>10:58 AM</Typography>
        </Box>

        {/* Project Name TextBox */}
        <Box sx={{ flexGrow: 1, px: 1, borderRight: 1, borderColor: 'divider', height: '100%', display: 'flex', alignItems: 'center' }}>
          <InputBase 
            value={projectName || ''} 
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project Name" 
            sx={{ color: 'primary.main', width: '100%', fontFamily: "'Playfair Display', serif" }} 
          />
        </Box>

        {/* Save/Load (VFS) */}
        <IconButton 
          onClick={handleSave}
          sx={{ color: 'primary.main', borderRight: 1, borderColor: 'divider', width: '36px', height: '36px' }}
        >
          <SaveIcon fontSize="small" />
        </IconButton>

        {/* Quick Settings (Sound, Battery, Layout) */}
        <IconButton 
          onClick={() => toast.info('Sound output toggled')}
          sx={{ color: 'primary.main', borderRight: 1, borderColor: 'divider', width: '24px', height: '36px' }}
        >
          <VolumeUpIcon sx={{ fontSize: '14px' }} />
        </IconButton>
        <IconButton 
          onClick={() => toast.info('Battery status nominal (100%)')}
          sx={{ color: 'primary.main', borderRight: 1, borderColor: 'divider', width: '24px', height: '36px' }}
        >
          <BatteryStdIcon sx={{ fontSize: '14px' }} />
        </IconButton>
        <IconButton 
          onClick={handleCycleColumns}
          sx={{ color: 'primary.main', width: '24px', height: '36px' }}
        >
          <GridViewIcon sx={{ fontSize: '14px' }} />
        </IconButton>
      </Box>

      {/* RIGHT: MODEL BAR (The Preemptive Model Bar) */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '40%', bgcolor: '#464649' }}>
        <ModelBar />
      </Box>
    </Box>
  );
}
