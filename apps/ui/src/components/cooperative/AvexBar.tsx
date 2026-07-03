import React, { useState } from 'react';
import { 
  Box, IconButton, Tooltip, Menu, MenuItem
} from '@mui/material';
import { 
  PlayArrow as PlayArrowIcon,
  Psychology as PsychologyIcon,
  Dns as DnsIcon,
  Memory as MemoryIcon,
  Person as PersonIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { SystemPortal } from './SystemPortal.js';
import { useProviderStore } from '../../stores/provider.store.js';
import { useWorkspaceStore } from '../../stores/workspace.store.js';
import { toast } from 'sonner';

/**
 * @file AvexBar.tsx
 * @description The global HUD and preemptive AI routing control center for EVAIX Spatial Window Manager.
 * Dynamically subscribes to useProviderStore. When 0 providers are configured, Provider [P] and Model [M]
 * display an inactive state and direct the user to the setup configuration portal.
 */

export const AvexBar: React.FC = () => {
  const { 
    routingLogic, setRoutingLogic,
    providers, activeProviderId, activeModelId, activeRoleId,
    setActiveProvider, setActiveModel, setActiveRole,
    toggleProvider, toggleModel
  } = useProviderStore();

  const toggleSystemApp = useWorkspaceStore(s => s.toggleSystemApp);

  // Menu Anchor States
  const [anchorLogic, setAnchorLogic] = useState<null | HTMLElement>(null);
  const [anchorProvider, setAnchorProvider] = useState<null | HTMLElement>(null);
  const [anchorModel, setAnchorModel] = useState<null | HTMLElement>(null);
  const [anchorRole, setAnchorRole] = useState<null | HTMLElement>(null);
  const [anchorPlay, setAnchorPlay] = useState<null | HTMLElement>(null);

  const activeProvider = providers.find(p => p.id === activeProviderId);
  const activeModel = activeProvider?.models.find(m => m.id === activeModelId);

  const hasProviders = providers.length > 0;
  const isProviderEnabled = activeProvider ? activeProvider.enabled : false;
  const isModelEnabled = activeModel ? activeModel.enabled : false;

  const handleOpenSetupPortal = () => {
    toggleSystemApp('provider');
    toast.info('Opening Provider Setup Configuration Portal...');
  };

  const handleRunAgent = () => {
    if (!hasProviders) {
      toast.error('No Provider Configured. Open Provider Setup Portal to add one.');
      handleOpenSetupPortal();
      return;
    }
    if (!isProviderEnabled || !isModelEnabled) {
      toast.error('Cannot run agent: Selected Provider or Model is toggled OFF.');
      return;
    }
    toast.success(`Agent executed via ${activeProvider?.name} / ${activeModel?.name} [${activeRoleId || 'Default'}]`);
  };

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
      {/* System Portal (Settings & Apps Matrix Dropdowns) */}
      <SystemPortal />

      {/* Avex Preemptive AI Routing Control Center */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          bgcolor: '#252528', 
          height: '34px',
          px: 1,
          gap: '6px',
          borderRadius: '4px',
          border: '1px solid #3c3c3c',
          fontFamily: "'Syne', sans-serif"
        }}
      >
        {/* 1. [S] - Selection Logic */}
        <Tooltip title={`Routing Logic: ${routingLogic} (Click to change)`} arrow>
          <IconButton
            onClick={(e) => setAnchorLogic(e.currentTarget)}
            sx={{
              width: 26,
              height: 26,
              borderRadius: '4px',
              bgcolor: '#1c1c1e',
              border: '1px solid #16c522',
              color: '#16c522',
              '&:hover': { bgcolor: '#3e3e42' }
            }}
          >
            <PsychologyIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchorLogic}
          open={Boolean(anchorLogic)}
          onClose={() => setAnchorLogic(null)}
          slotProps={{ paper: { sx: { bgcolor: '#252526', color: '#fff', border: '1px solid #3c3c3c' } } }}
        >
          {['Round Robin', 'Free Tier Priority', 'Arbitration Mode', 'Smart Adaptive'].map((logic) => (
            <MenuItem 
              key={logic} 
              onClick={() => { setRoutingLogic(logic); setAnchorLogic(null); }}
              selected={routingLogic === logic}
              sx={{ fontSize: '12px', fontFamily: 'monospace' }}
            >
              {logic}
            </MenuItem>
          ))}
        </Menu>

        {/* 2. [P] - Provider Selector (Square Icon Matrix Cell) */}
        <Tooltip 
          title={
            hasProviders 
              ? `Provider: ${activeProvider?.name ?? 'None'} (${isProviderEnabled ? 'ENABLED' : 'DISABLED'})`
              : '0 Providers Configured (Click to setup)'
          } 
          arrow
        >
          <IconButton
            onClick={(e) => {
              if (!hasProviders) {
                handleOpenSetupPortal();
              } else {
                setAnchorProvider(e.currentTarget);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (activeProviderId) toggleProvider(activeProviderId);
            }}
            sx={{
              width: 26,
              height: 26,
              borderRadius: '4px',
              bgcolor: !hasProviders ? '#333336' : (isProviderEnabled ? 'success.main' : 'error.main'),
              color: !hasProviders ? '#888' : '#fff',
              border: '1px solid',
              borderColor: !hasProviders ? '#555' : (isProviderEnabled ? '#16c522' : '#ff4d4d'),
              transition: 'all 0.15s ease',
              '&:hover': { opacity: 0.85 }
            }}
          >
            {hasProviders ? <DnsIcon sx={{ fontSize: 16 }} /> : <AddIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchorProvider}
          open={Boolean(anchorProvider)}
          onClose={() => setAnchorProvider(null)}
          slotProps={{ paper: { sx: { bgcolor: '#252526', color: '#fff', border: '1px solid #3c3c3c' } } }}
        >
          {providers.map((prov) => (
            <MenuItem 
              key={prov.id} 
              onClick={() => { setActiveProvider(prov.id); setAnchorProvider(null); }}
              selected={activeProviderId === prov.id}
              sx={{ fontSize: '12px', fontFamily: 'monospace' }}
            >
              {prov.name} {prov.enabled ? '' : '(Disabled)'}
            </MenuItem>
          ))}
          <MenuItem 
            onClick={() => { setAnchorProvider(null); handleOpenSetupPortal(); }}
            sx={{ fontSize: '12px', fontFamily: 'monospace', color: '#16c522', fontWeight: 'bold' }}
          >
            + Add Provider
          </MenuItem>
        </Menu>

        {/* 3. [M] - Model Selector (Square Icon Matrix Cell) */}
        <Tooltip 
          title={
            hasProviders && activeProvider
              ? `Model: ${activeModel?.name ?? 'Select Model'} (${isModelEnabled ? 'ENABLED' : 'DISABLED'})`
              : '0 Models Available (Configure Provider)'
          } 
          arrow
        >
          <IconButton
            onClick={(e) => {
              if (!hasProviders || !activeProvider) {
                handleOpenSetupPortal();
              } else {
                setAnchorModel(e.currentTarget);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (activeProviderId && activeModelId) toggleModel(activeProviderId, activeModelId);
            }}
            sx={{
              width: 26,
              height: 26,
              borderRadius: '4px',
              bgcolor: (!hasProviders || !activeProvider) ? '#333336' : (isModelEnabled ? 'success.main' : 'error.main'),
              color: (!hasProviders || !activeProvider) ? '#888' : '#fff',
              border: '1px solid',
              borderColor: (!hasProviders || !activeProvider) ? '#555' : (isModelEnabled ? '#16c522' : '#ff4d4d'),
              transition: 'all 0.15s ease',
              '&:hover': { opacity: 0.85 }
            }}
          >
            <MemoryIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchorModel}
          open={Boolean(anchorModel)}
          onClose={() => setAnchorModel(null)}
          slotProps={{ paper: { sx: { bgcolor: '#252526', color: '#fff', border: '1px solid #3c3c3c' } } }}
        >
          {activeProvider?.models.map((m) => (
            <MenuItem 
              key={m.id} 
              onClick={() => { setActiveModel(m.id); setAnchorModel(null); }}
              selected={activeModelId === m.id}
              sx={{ fontSize: '12px', fontFamily: 'monospace' }}
            >
              {m.name}
            </MenuItem>
          ))}
        </Menu>

        {/* 4. [R] - Role Selector */}
        <Tooltip title={`Active Role: ${activeRoleId || 'Junior Coder'}`} arrow>
          <IconButton
            onClick={(e) => setAnchorRole(e.currentTarget)}
            sx={{
              width: 26,
              height: 26,
              borderRadius: '4px',
              bgcolor: '#1c1c1e',
              border: '1px solid #892481',
              color: '#e056d5',
              '&:hover': { bgcolor: '#3e3e42' }
            }}
          >
            <PersonIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchorRole}
          open={Boolean(anchorRole)}
          onClose={() => setAnchorRole(null)}
          slotProps={{ paper: { sx: { bgcolor: '#252526', color: '#fff', border: '1px solid #3c3c3c' } } }}
        >
          {['Junior Coder', 'System Architect', 'UI Designer', 'Code Reviewer'].map((role) => (
            <MenuItem 
              key={role} 
              onClick={() => { setActiveRole(role); setAnchorRole(null); }}
              selected={activeRoleId === role}
              sx={{ fontSize: '12px', fontFamily: 'monospace' }}
            >
              {role}
            </MenuItem>
          ))}
        </Menu>

        {/* 5. Run Agent Play Button */}
        <Tooltip title="Run Agent (Left-click: Run, Right-click: Options)" arrow>
          <IconButton
            onClick={handleRunAgent}
            onContextMenu={(e) => { e.preventDefault(); setAnchorPlay(e.currentTarget); }}
            sx={{
              width: 28,
              height: 26,
              borderRadius: '4px',
              bgcolor: hasProviders ? '#16c522' : '#555558',
              color: '#000',
              '&:hover': { bgcolor: hasProviders ? '#13a81c' : '#444' }
            }}
          >
            <PlayArrowIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchorPlay}
          open={Boolean(anchorPlay)}
          onClose={() => setAnchorPlay(null)}
          slotProps={{ paper: { sx: { bgcolor: '#252526', color: '#fff', border: '1px solid #3c3c3c' } } }}
        >
          <MenuItem onClick={() => { handleRunAgent(); setAnchorPlay(null); }} sx={{ fontSize: '12px' }}>
            Execute Active Card
          </MenuItem>
          <MenuItem onClick={() => { handleOpenSetupPortal(); setAnchorPlay(null); }} sx={{ fontSize: '12px' }}>
            Configure LLM Providers
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

// Alias exports for backward compatibility
export const TopWorkbenchBar = AvexBar;
export const ModelBar = AvexBar;
