/**
 * @file MastraNode.tsx
 * @description AppCard payload that wraps the local Mastra Agent Studio UI
 * (default: http://localhost:4111) as a spatial window in the EVAIX Grid.
 *
 * Uses the existing WebNode as its iframe engine — no new browser abstraction.
 * Registered in ComponentRegistry as 'mastra-ui'.
 */

import React, { useCallback } from 'react';
import { Box, Stack, Typography, Tooltip, IconButton } from '@mui/material';
import { BrainCircuit, ExternalLink } from 'lucide-react';
import { WebNode } from '../WebNode';

/** Mastra dev-server default port; override via env */
const MASTRA_LOCAL_URL: string =
  (import.meta as any).env?.VITE_MASTRA_UI_URL ?? 'http://localhost:4111';

export interface MastraNodeProps {
  cardId?: string;
  /** Override the Mastra UI URL if running on a non-standard port */
  mastraUrl?: string;
}

export const MastraNode: React.FC<MastraNodeProps> = ({
  cardId,
  mastraUrl = MASTRA_LOCAL_URL,
}) => {
  const handleLoad = useCallback((content: string) => {
    console.debug('[MastraNode] frame loaded:', content);
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        bgcolor: 'background.default',
      }}
    >
      {/* Spatial window chrome — matches EVAIX AppCard header conventions */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          px: 1.5,
          py: 0.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          flexShrink: 0,
          minHeight: 34,
        }}
      >
        <BrainCircuit size={13} style={{ opacity: 0.65 }} />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: '0.08em',
            opacity: 0.75,
            textTransform: 'uppercase',
            fontSize: 10,
          }}
        >
          Mastra Agent Studio
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        <Typography
          variant="caption"
          sx={{ opacity: 0.35, fontFamily: 'monospace', fontSize: 9 }}
        >
          {mastraUrl}
        </Typography>

        <Tooltip title="Open in browser tab">
          <IconButton
            size="small"
            sx={{ p: 0.25, opacity: 0.5 }}
            onClick={() => window.open(mastraUrl, '_blank')}
          >
            <ExternalLink size={11} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* WebNode handles all iframe / Electron webview logic */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <WebNode
          id="mastra-ui-node"
          cardId={cardId}
          initialUrl={mastraUrl}
          onLoad={handleLoad}
          hideWrapper // suppress WebNode's own browser chrome
        />
      </Box>
    </Box>
  );
};

export default MastraNode;
