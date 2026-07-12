import React, { useState } from 'react';
import { Box, InputBase } from '@mui/material';
import { CalendarSettings } from './CalendarSettings.js';
import { AppStackMenu } from './AppStackMenu.js';
import { ModelBar } from '../ui/ModelBar.js';
import { useProviderStore } from '../../stores/provider.store.js';
import { trpc } from '../../utils/trpc.js';
import { toast } from 'sonner';

export const NavBar: React.FC = () => {
  const activeModelId = useProviderStore(s => s.activeModelId);
  const activeRoleId = useProviderStore(s => s.activeRoleId);
  
  const [contextDepth, setContextDepth] = useState(10);
  const [prompt, setPrompt] = useState('');
  const [isPromptMode, setIsPromptMode] = useState(false);

  const runSession = trpc.llm.runAgentSession.useMutation({
    onSuccess: (data) => {
      toast.success('Agent execution completed');
      console.log('Agent response:', data.text);
    },
    onError: (error) => {
      toast.error('Agent execution failed', { description: error.message });
      console.error('Agent execution error:', error);
    }
  });

  const handlePlayClick = () => {
    if (!activeModelId || !activeRoleId) {
      toast.error('Please select a model and role first');
      return;
    }
    
    if (!prompt.trim()) {
      setIsPromptMode(true);
      return;
    }

    runSession.mutate({
      modelId: activeModelId,
      roleId: activeRoleId,
      contextDepth,
      prompt
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100%',
        height: '40px', // Corresponds to the 100x40 relative sizing
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        alignItems: 'center'
      }}
    >
      {/* Left Column: Calendar & Settings (25.7%) */}
      <Box sx={{ flex: '0 0 25.7%', height: '100%' }}>
        <CalendarSettings />
      </Box>

      {/* Middle Column: App Stack (27.4%) */}
      <Box sx={{ flex: '0 0 27.4%', height: '100%' }}>
        <AppStackMenu />
      </Box>

      {/* Right Column: Model Bar (46.9%) */}
      <Box 
        sx={{ 
          flex: '0 0 46.9%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'flex-end', 
          pr: 2,
          gap: 2
        }}
      >
        {isPromptMode && (
          <InputBase
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handlePlayClick();
              } else if (e.key === 'Escape') {
                setIsPromptMode(false);
              }
            }}
            placeholder="Enter prompt..."
            sx={{
              width: 180,
              bgcolor: 'rgba(255,255,255,0.05)',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              px: 1.5,
              py: 0.25,
              fontSize: '0.70rem',
              color: 'text.primary',
              fontFamily: 'monospace'
            }}
            autoFocus
          />
        )}

        <ModelBar 
          contextLocation="main-nav" 
          isCondensed={false} 
          expandDirection="left" 
          onPlayClick={handlePlayClick}
          contextDepth={contextDepth}
          onContextDepthChange={setContextDepth}
        />
      </Box>
    </Box>
  );
};

export default NavBar;
