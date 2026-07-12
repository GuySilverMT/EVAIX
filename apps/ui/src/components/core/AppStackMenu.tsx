import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import HandymanIcon from '@mui/icons-material/Handyman';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda'; // Stacks representation
import Diversity1Icon from '@mui/icons-material/Diversity1';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useWorkspaceStore } from '../../stores/workspace.store.js';

export const AppStackMenu: React.FC = () => {
  const spawnApp = useWorkspaceStore(s => s.spawnApp);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        width: '100%',
        bgcolor: 'background.paper',
        opacity: 0.88,
        borderRight: 1,
        borderColor: 'divider',
        px: 1
      }}
    >
      <Tooltip title="Launch Terminal">
        <IconButton 
          sx={{ flex: '0 0 6.1%', color: 'text.primary', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
          onClick={() => spawnApp('terminal')}
        >
          <HandymanIcon sx={{ fontSize: '0.9rem' }} />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Launch File Explorer">
        <IconButton 
          sx={{ flex: '0 0 6.3%', color: 'text.primary', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
          onClick={() => spawnApp('file-explorer')}
        >
          <ViewAgendaIcon sx={{ fontSize: '0.9rem' }} />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Launch Open WebUI">
        <IconButton 
          sx={{ flex: '0 0 6.4%', color: 'text.primary', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
          onClick={() => spawnApp('openwebui')}
        >
          <Diversity1Icon sx={{ fontSize: '0.9rem' }} />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Launch Scheduler">
        <IconButton 
          sx={{ flex: '0 0 6.1%', color: 'text.primary', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
          onClick={() => spawnApp('scheduler')}
        >
          <EditNoteIcon sx={{ fontSize: '0.9rem' }} />
        </IconButton>
      </Tooltip>

      {/* Quick Settings sub-table space reserved here */}
      <Box sx={{ flex: '0 0 75.1%' }} />
    </Box>
  );
};

export default AppStackMenu;
