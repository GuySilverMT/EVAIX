import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useWorkspaceStore } from '../../stores/workspace.store.js';

export const CalendarSettings: React.FC = () => {
  const spawnApp = useWorkspaceStore(s => s.spawnApp);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format date: e.g., "JANUARY 5, 2026"
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).toUpperCase();
  };

  // Format time: e.g., "12:30 PM"
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        width: '100%',
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      <Box
        component="button"
        onClick={() => spawnApp('scheduler')}
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexGrow: 1,
          height: '100%',
          bgcolor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          p: 0,
          '&:hover': {
            opacity: 0.8
          }
        }}
      >
        <Typography
          variant="body1"
          sx={{
            color: 'text.primary',
            fontSize: '0.70rem',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            flex: '0 0 56.9%',
            pl: 2,
          }}
        >
          {formatDate(time)}
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: 'text.primary',
            fontSize: '0.70rem',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            flex: '0 0 35.2%',
          }}
        >
          {formatTime(time)}
        </Typography>
      </Box>

      <Box sx={{ flex: '0 0 7.9%', display: 'flex', justifyContent: 'center' }}>
        <IconButton 
          size="small" 
          sx={{ color: 'text.primary' }}
          onClick={() => spawnApp('scheduler')}
        >
          <SettingsIcon sx={{ fontSize: '0.9rem' }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default CalendarSettings;
