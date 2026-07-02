import React from 'react';
import { Box } from '@mui/material';

interface WebBrowserViewProps {
  src?: string;
  title?: string;
}

export const WebBrowserView: React.FC<WebBrowserViewProps> = ({ 
  src = 'https://docs.google.com/document/d/18Hepe4NJCv6qdI3oSNye0yctWW03OURVOz7_rvb_Wvk/edit?tab=t.0',
  title = 'Chromeless View'
}) => {
  return (
    <Box sx={{ width: '100%', height: '100%', bgcolor: '#121212', overflow: 'hidden' }}>
      <iframe 
        src={src} 
        title={title} 
        style={{ 
          width: '100%', 
          height: '100%', 
          border: 'none',
          display: 'block'
        }}
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
      />
    </Box>
  );
};
