
import { Routes, Route } from "react-router-dom";
import './App.css';
import { CooperativeShell } from './components/cooperative/CooperativeShell.js';
import { Toaster } from './components/ui/toaster.js';
import { ThemeProvider } from './theme/ThemeProvider.js';
import { FileSystemProvider } from './stores/FileSystemStore.js';
import { VoiceKeyboardProvider } from './contexts/VoiceKeyboardContext.js';
import { BuilderPage } from "./nebula/pages/BuilderPage.js";
import { ThemeManager } from "./features/constitution/components/ThemeManager.js";
import { CooperativeLayout } from "./components/cooperative/layout/CooperativeLayout.js";


function App() {
  return (
    <ThemeProvider>
      <VoiceKeyboardProvider>
        <FileSystemProvider>
      <Routes>
        {/* 1. THE PUBLIC APP (The Player) */}
        <Route path="/*" element={
          <CooperativeLayout>
            <CooperativeShell />
            <Toaster />
          </CooperativeLayout>
        } />

        {/* 2. THE ADMIN TOOLS (The Workbench) */}
        <Route path="/ui-studio/:projectId" element={<BuilderPage />} />
        <Route path="/admin/theme" element={<ThemeManager />} />
      </Routes>
        </FileSystemProvider>
      </VoiceKeyboardProvider>
    </ThemeProvider>
  );
}

export default App;
