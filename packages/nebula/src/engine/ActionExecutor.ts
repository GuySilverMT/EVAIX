import { NebulaAction } from '../core/actions.js';

// We need to inject capabilities like navigation
// In a real app, you might pass these via Context or props
export const useActionExecutor = () => {

  // Mock implementations for now
  const navigate = (url: string) => {
      console.log(`[Nebula] Navigating to ${url}`);
      window.location.hash = url; // Simple hash routing support
  };

  const toast = (message: string) => {
      console.log(`[Nebula] Toast: ${message}`);
      // In a real app, use a toast library hook here
      // alert(message);
  };

  const execute = async (action: NebulaAction) => {
    console.log(`[Nebula] Executing ${action.type}`, action.payload);

    switch(action.type) {
      case 'navigate':
        navigate(action.payload.url);
        break;
      case 'toast':
        toast(action.payload.message);
        break;
      case 'state_update':
        console.log("State update not fully implemented yet", action.payload);
        break;
      case 'mutation':
        console.log("Mutation not fully implemented yet", action.payload);
        break;
    }
  };

  return { execute };
};
