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
        
        {/* Accounts & Settings */}
        <IconButton 
          onClick={() => toast.info('Account profile details')}
          sx={{ color: 'primary.main', borderRight: 1, borderColor: 'divider', width: '36px', height: '36px' }}
        >
          <AccountCircleIcon fontSize="small" />
        </IconButton>
        <IconButton 
          onClick={() => useWorkspaceStore.getState().setActiveWorkflow('settings')}
          sx={{ color: 'primary.main', borderRight: 1, borderColor: 'divider', width: '36px', height: '36px' }}
        >
          <SettingsIcon fontSize="small" />
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

      {/* RIGHT: MODEL BAR (Hovering / Preempting active app stack) */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '40%', bgcolor: '#464649' }}>
        
        {/* Orchestrator Mode Toggle: JSON-mode vs Code-mode (LSP) */}
        <Box 
          onClick={handleToggleMode}
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            px: 1.5, 
            height: '100%', 
            cursor: 'pointer', 
            borderRight: 1, 
            borderColor: 'divider',
            bgcolor: orchestratorMode === 'code' ? '#1e1b4b' : 'transparent',
            '&:hover': { bgcolor: orchestratorMode === 'code' ? '#312e81' : '#374151' }
          }}
        >
          <Typography sx={{ 
            fontSize: '11px', 
            fontFamily: 'monospace', 
            fontWeight: 'bold',
            color: orchestratorMode === 'code' ? '#818cf8' : '#9ca3af'
          }}>
            MODE: {orchestratorMode === 'code' ? 'CODE (LSP)' : 'JSON'}
          </Typography>
        </Box>

        {/* Model Selection Logic (S) & Provider (P) */}
        <IconButton 
          onClick={() => useWorkspaceStore.getState().setActiveWorkflow('settings')}
          sx={{ color: 'success.main', borderRight: 1, borderColor: 'divider', width: '36px', height: '36px' }}
        >
          <Typography sx={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 'bold' }}>S</Typography>
        </IconButton>
        <IconButton 
          onClick={() => useWorkspaceStore.getState().setActiveWorkflow('provider')}
          sx={{ color: 'success.main', borderRight: 1, borderColor: 'divider', width: '36px', height: '36px' }}
        >
          <Typography sx={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 'bold' }}>P</Typography>
        </IconButton>

        {/* Context Estimator */}
        <Box sx={{ px: 2, height: '100%', display: 'flex', alignItems: 'center', borderRight: 1, borderColor: 'divider' }}>
          <Typography sx={{ color: 'primary.main', fontSize: '12px', fontFamily: "'Playfair Display', serif" }}>
            48/256K
          </Typography>
        </Box>

        {/* Run Agent / Context Context Menu */}
        <IconButton 
          onClick={() => handleExecuteAgent('default')}
          onContextMenu={handlePlayRightClick}
          sx={{ color: 'primary.main', width: '36px', height: '36px', bgcolor: '#18181a', '&:hover': { bgcolor: '#2a2a2d' } }}
        >
          <PlayArrowIcon fontSize="small" />
        </IconButton>

        {/* Right-Click Context Stack Selector */}
        <Menu
          open={contextMenu !== null}
          onClose={handleClose}
          anchorReference="anchorPosition"
          anchorPosition={
            contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
          }
          sx={{ '& .MuiPaper-root': { bgcolor: '#0e0e0f', color: '#7c6bff', border: '1px solid #606062', borderRadius: 0 } }}
        >
          <MenuItem onClick={() => handleExecuteAgent('Visible Tab')} sx={{ fontSize: '12px', py: 0.5 }}>Visible Tab</MenuItem>
          <MenuItem onClick={() => handleExecuteAgent('Visible Card')} sx={{ fontSize: '12px', py: 0.5 }}>Visible Card</MenuItem>
          <MenuItem onClick={() => handleExecuteAgent('Full Stack')} sx={{ fontSize: '12px', py: 0.5 }}>Full Stack</MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
