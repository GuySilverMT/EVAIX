import React, { useEffect } from 'react';
import { DiffEditor, type DiffEditorProps, useMonaco } from '@monaco-editor/react';

interface MonacoDiffEditorProps extends DiffEditorProps {
  className?: string;
}

const MonacoDiffEditor: React.FC<MonacoDiffEditorProps> = ({ 
  className, 
  language = 'javascript', 
  theme, 
  original,
  modified,
  options,
  ...props 
}) => {
  const monaco = useMonaco();

  useEffect(() => {
    if (!monaco) return;
    try {
        const root = getComputedStyle(document.documentElement);
        // We can reuse the same theme logic or rely on the one set by the main editor
        const bg = root.getPropertyValue('--color-background')?.trim() || '#0b0b0b';
        const fg = root.getPropertyValue('--color-text')?.trim() || '#e6e6e6';
        
        monaco.editor.defineTheme('diff-theme', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': bg,
                'editor.foreground': fg,
                'diffEditor.insertedTextBackground': '#2ea04333',
                'diffEditor.removedTextBackground': '#da363333',
            },
        });
    } catch {
      // ignore
    }
  }, [monaco]);

  return (
    <div className={className} style={{ overflow: 'hidden', height: '100%', width: '100%' }}> 
      <DiffEditor
        height="100%"
        width="100%"
        language={language}
        theme={theme ?? 'diff-theme'}
        original={original}
        modified={modified}
        options={{
          ...options,
          originalEditable: false,
          readOnly: true,
          renderSideBySide: true,
          automaticLayout: true, 
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontLigatures: true,
          minimap: { enabled: false },
        }}
        {...props}
      />
    </div>
  );
};

export default MonacoDiffEditor;
