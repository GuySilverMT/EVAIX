import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in grid boundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-red-400 bg-red-950/15 border border-red-900/50 rounded-lg m-2 p-4 font-mono text-[10px]">
          <AlertTriangle size={16} className="text-red-500 animate-bounce" />
          <span className="font-bold uppercase tracking-wider">Grid Render Error</span>
          <span className="text-[9px] text-zinc-500 text-center break-all">
            {this.state.error?.message || "An unexpected rendering error occurred."}
          </span>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-2.5 py-1 bg-red-900/30 hover:bg-red-900/50 border border-red-800/40 text-red-300 rounded font-bold uppercase transition-all"
          >
            Retry Render
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
