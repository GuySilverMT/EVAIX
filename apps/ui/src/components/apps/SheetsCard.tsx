import React from 'react';
import { WebBrowserView } from './WebBrowserView.js';

interface SheetsCardProps {
  src?: string;
}

export function SheetsCard({ 
  src = 'https://docs.google.com/spreadsheets' 
}: SheetsCardProps) {
  return (
    <WebBrowserView 
      src={src} 
      title="Google Sheets App Card" 
    />
  );
}
