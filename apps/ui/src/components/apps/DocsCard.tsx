import React from 'react';
import { WebBrowserView } from './WebBrowserView.js';

interface DocsCardProps {
  src?: string;
}

export function DocsCard({ 
  src = 'https://docs.google.com/document/d/18Hepe4NJCv6qdI3oSNye0yctWW03OURVOz7_rvb_Wvk/edit?tab=t.0' 
}: DocsCardProps) {
  return (
    <WebBrowserView 
      src={src} 
      title="Google Docs App Card" 
    />
  );
}
