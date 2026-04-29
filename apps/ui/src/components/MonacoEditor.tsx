import React, { useEffect } from 'react';
import { Editor, type EditorProps, useMonaco } from '@monaco-editor/react';

interface MonacoEditorProps extends EditorProps {
  className?: string;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({ 
  className, 
  language = 'javascript', 
  theme, 
  value, 
  onChange, 
  options,
  ...props 
}) => {
  const monaco = useMonaco();

  useEffect(() => {
    if (!monaco) return;
    try {
      const root = getComputedStyle(document.documentElement);
      const bg = root.getPropertyValue('--color-background')?.trim() || '#0b0b0b';
      const fg = root.getPropertyValue('--color-text')?.trim() || '#e6e6e6';
      monaco.editor.defineTheme('core-theme', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': bg,
          'editor.foreground': fg,
          'editorLineNumber.foreground': fg,
        },
      });
    } catch (e) {
      // ignore
    }
  }, [monaco]);
  return (
    <div className={className} style={{ overflow: 'hidden' }}> 
      {/* ^ overflow: hidden is crucial here to stop the parent from expanding */}
      <Editor
        height="100%"
        width="100%"
        language={language}
        theme={theme ?? 'core-theme'}
        value={value}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onChange={(val) => onChange && onChange(val, {} as any)} 
        options={{
          ...options,
          // 👇 THIS IS THE FIX FOR THE SLIDER
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

export default MonacoEditor;