import React, { useState } from 'react';
import { 
  Box, IconButton, Tooltip, Menu, MenuItem, Typography, Badge, Chip
} from '@mui/material';
import { 
  PlayArrow as PlayArrowIcon,
  Psychology as PsychologyIcon,
  Dns as DnsIcon,
  Memory as MemoryIcon,
  Person as PersonIcon,
  AutoAwesome as AutoAwesomeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { toast } from 'sonner';

interface MatrixState {
  logic: string;
  provider: string;
  providerEnabled: boolean;
  model: string;
  modelEnabled: boolean;
  role: string;
  tokensUsed: number;
  maxTokens: number;
}

export const ModelBar: React.FC = () => {
  const [state, setState] = useState<MatrixState>({
    logic: 'Round Robin',
    provider: 'Google Gemini',
    providerEnabled: true,
    model: 'Gemini 2.5 Flash',
    modelEnabled: true,
    role: 'Junior Coder',
    tokensUsed: 48,
    maxTokens: 256
  });

  // Menu Anchor States
  const [anchorLogic, setAnchorLogic] = useState<null | HTMLElement>(null);
  const [anchorProvider, setAnchorProvider] = useState<null | HTMLElement>(null);
  const [anchorModel, setAnchorModel] = useState<null | HTMLElement>(null);
  const [anchorRole, setAnchorRole] = useState<null | HTMLElement>(null);
  const [anchorPlay, setAnchorPlay] = useState<null | HTMLElement>(null);

  // Right-click toggles
  const handleToggleProvider = (e: React.MouseEvent) => {
    e.preventDefault();
    const nextState = !state.providerEnabled;
    setState(p => ({ ...p, providerEnabled: nextState }));
    toast.info(`Provider [${state.provider}] toggled ${nextState ? 'ON (Green)' : 'OFF (Red)'}`);
  };

  const handleToggleModel = (e: React.MouseEvent) => {
    e.preventDefault();
    const nextState = !state.modelEnabled;
    setState(p => ({ ...p, modelEnabled: nextState }));
    toast.info(`Model [${state.model}] toggled ${nextState ? 'ON (Green)' : 'OFF (Red)'}`);
  };

  const handleRunAgent = () => {
    if (!state.providerEnabled || !state.modelEnabled) {
      toast.error('Cannot run agent: Selected Provider or Model is toggled OFF (Red).');
      return;
    }
    toast.success(`Agent executed via ${state.provider} / ${state.model} [${state.role}]`);
  };

  const isTokenLimitExceeded = state.tokensUsed > state.maxTokens;

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        bgcolor: '#464649', 
        height: '36px',
        px: 1,
        gap: '4px',
        fontFamily: "'Syne', sans-serif"
      }}
    >
      {/* 1. [S] - Selection Logic */}
      <Tooltip title={`Routing Logic: ${state.logic} (Left-click to change)`} arrow>
        <IconButton
          onClick={(e) => setAnchorLogic(e.currentTarget)}
          sx={{
            width: 28,
            height: 28,
            borderRadius: '4px',
            bgcolor: '#2d2d30',
            border: '1px solid #16c522',
            color: '#16c522',
            '&:hover': { bgcolor: '#3e3e42' }
          }}
        >
          <PsychologyIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorLogic}
        open={Boolean(anchorLogic)}
        onClose={() => setAnchorLogic(null)}
        PaperProps={{ sx: { bgcolor: '#252526', color: '#fff', border: '1px solid #3c3c3c' } }}
      >
        {['Round Robin', 'Free Tier Priority', 'Arbitration Mode', 'Off', 'Smart Adaptive'].map((logic) => (
          <MenuItem 
            key={logic} 
            onClick={() => { setState(p => ({ ...p, logic })); setAnchorLogic(null); }}
            selected={state.logic === logic}
            sx={{ fontSize: '12px', fontFamily: 'monospace' }}
          >
            {logic}
          </MenuItem>
        ))}
      </Menu>

      {/* 2. [P] - Provider Selector (Square Icon Matrix Cell) */}
      <Tooltip title={`Provider: ${state.provider} (${state.providerEnabled ? 'ENABLED' : 'DISABLED'}) | Left-click: select, Right-click: toggle`} arrow>
        <IconButton
          onClick={(e) => setAnchorProvider(e.currentTarget)}
          onContextMenu={handleToggleProvider}
          sx={{
            width: 28,
            height: 28,
            borderRadius: '4px',
            bgcolor: state.providerEnabled ? 'success.main' : 'error.main',
            color: '#fff',
            border: '1px solid',
            borderColor: state.providerEnabled ? '#16c522' : '#ff4d4d',
            transition: 'all 0.15s ease',
            '&:hover': { opacity: 0.85 }
          }}
        >
          <DnsIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorProvider}
        open={Boolean(anchorProvider)}
        onClose={() => setAnchorProvider(null)}
        PaperProps={{ sx: { bgcolor: '#252526', color: '#fff', border: '1px solid #3c3c3c' } }}
      >
        {['Google Gemini', 'Anthropic Claude', 'OpenAI', 'Ollama Local'].map((prov) => (
          <MenuItem 
            key={prov} 
            onClick={() => { setState(p => ({ ...p, provider: prov })); setAnchorProvider(null); }}
            selected={state.provider === prov}
            sx={{ fontSize: '12px', fontFamily: 'monospace' }}
          >
            {prov}
          </MenuItem>
        ))}
      </Menu>

      {/* 3. [M] - Model Selector (Square Icon Matrix Cell) */}
      <Tooltip title={`Model: ${state.model} (${state.modelEnabled ? 'ENABLED' : 'DISABLED'}) | Left-click: select, Right-click: toggle`} arrow>
        <IconButton
          onClick={(e) => setAnchorModel(e.currentTarget)}
          onContextMenu={handleToggleModel}
          sx={{
            width: 28,
            height: 28,
            borderRadius: '4px',
            bgcolor: state.modelEnabled ? 'success.main' : 'error.main',
            color: '#fff',
            border: '1px solid',
            borderColor: state.modelEnabled ? '#16c522' : '#ff4d4d',
            transition: 'all 0.15s ease',
            '&:hover': { opacity: 0.85 }
          }}
        >
          <MemoryIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorModel}
        open={Boolean(anchorModel)}
        onClose={() => setAnchorModel(null)}
        PaperProps={{ sx: { bgcolor: '#252526', color: '#fff', border: '1px solid #3c3c3c' } }}
      >
        {['Gemini 2.5 Flash', 'Claude 3.5 Sonnet', 'GPT-4o', 'DeepSeek R1'].map((m) => (
          <MenuItem 
            key={m} 
            onClick={() => { setState(p => ({ ...p, model: m })); setAnchorModel(null); }}
            selected={state.model === m}
            sx={{ fontSize: '12px', fontFamily: 'monospace' }}
          >
            {m}
          </MenuItem>
        ))}
      </Menu>

      {/* 4. [R] - Role Selector */}
      <Tooltip title={`Active Role: ${state.role}`} arrow>
        <IconButton
          onClick={(e) => setAnchorRole(e.currentTarget)}
          sx={{
            width: 28,
            height: 28,
            borderRadius: '4px',
            bgcolor: '#2d2d30',
            border: '1px solid #892481',
            color: '#e056d5',
            '&:hover': { bgcolor: '#3e3e42' }
          }}
        >
          <PersonIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorRole}
        open={Boolean(anchorRole)}
        onClose={() => setAnchorRole(null)}
        PaperProps={{ sx: { bgcolor: '#252526', color: '#fff', border: '1px solid #3c3c3c' } }}
      >
        {['Junior Coder', 'System Architect', 'UI Designer', 'Code Reviewer'].map((role) => (
          <MenuItem 
            key={role} 
            onClick={() => { setState(p => ({ ...p, role })); setAnchorRole(null); }}
            selected={state.role === role}
            sx={{ fontSize: '12px', fontFamily: 'monospace' }}
          >
            {role}
          </MenuItem>
        ))}
      </Menu>

      {/* 5. Token Estimator */}
      <Tooltip title={`Token Context: ${state.tokensUsed}K / ${state.maxTokens}K`} arrow>
        <Box 
          sx={{ 
            px: 1, 
            py: 0.5, 
            borderRadius: '4px',
            bgcolor: isTokenLimitExceeded ? 'error.dark' : '#252526', 
            border: '1px solid',
            borderColor: isTokenLimitExceeded ? 'error.main' : '#3c3c3c',
            color: isTokenLimitExceeded ? '#ff4d4d' : '#892481',
            fontFamily: 'monospace',
            fontSize: '11px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {state.tokensUsed}/{state.maxTokens}K
        </Box>
      </Tooltip>

      {/* 6. Run Agent Play Button */}
      <Tooltip title="Run Agent (Left-click: Run, Right-click: Execution Stack)" arrow>
        <IconButton
          onClick={handleRunAgent}
          onContextMenu={(e) => { e.preventDefault(); setAnchorPlay(e.currentTarget); }}
          sx={{
            width: 32,
            height: 28,
            borderRadius: '4px',
            bgcolor: '#16c522',
            color: '#000',
            '&:hover': { bgcolor: '#13a81c' }
          }}
        >
          <PlayArrowIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorPlay}
        open={Boolean(anchorPlay)}
        onClose={() => setAnchorPlay(null)}
        PaperProps={{ sx: { bgcolor: '#252526', color: '#fff', border: '1px solid #3c3c3c' } }}
      >
        <MenuItem onClick={() => { handleRunAgent(); setAnchorPlay(null); }} sx={{ fontSize: '12px' }}>
          Execute Active Card
        </MenuItem>
        <MenuItem onClick={() => { toast.info('Queued Full Column Stack'); setAnchorPlay(null); }} sx={{ fontSize: '12px' }}>
          Execute Column Stack
        </MenuItem>
      </Menu>
    </Box>
  );
};
