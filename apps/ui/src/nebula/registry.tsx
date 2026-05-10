import React from 'react';
import { CooperativeButton } from "../components/cooperative/primitives/CooperativeButton.js";
import { CooperativeCard } from "../components/cooperative/primitives/CooperativeCard.js";
import { CooperativeGrid } from "../components/cooperative/primitives/CooperativeGrid.js";
import { RoleManagementGrid } from "../features/roles/RoleManagementGrid.js";
import { Canvas } from "../components/nebula/system/Canvas.js";
import { PropertyPanel } from "../components/nebula/system/PropertyPanel.js";
import { cn } from "../lib/utils.js";
import { AgentWorkbenchScaffold } from "../pages/AgentWorkbench.js";


export type ComponentCategory = 'layout' | 'atom' | 'molecule' | 'data' | 'feature' | 'system' | 'logic';

export interface PropSchema {
  type: 'string' | 'number' | 'boolean' | 'select' | 'color' | 'function' | 'json';
  options?: string[];
  defaultValue?: unknown;
  description?: string;
}

export interface ComponentDefinition {
  component: React.ElementType;
  meta: {
    label: string;
    category: ComponentCategory;
    icon?: string;
    hidden?: boolean;
    slots?: string[];
  };
  propSchema: {
    [key: string]: PropSchema;
  };
}

interface BaseProps {
    className?: string;
    children?: React.ReactNode;
    style?: Record<string, string>;
    layout?: Record<string, string>;
    [key: string]: unknown;
}

export const ComponentManifest: Record<string, ComponentDefinition> = {
  // ==============================
  // 🟢 PRIMITIVES (The Body)
  // ==============================
  
  "Primitive:Button": {
    component: CooperativeButton,
    meta: { label: "Cooperative Button", category: "atom", icon: "cursor-click" },
    propSchema: {
      label: { type: "string", defaultValue: "Click Me" },
      variant: { type: "select", options: ["primary", "secondary", "ghost"], defaultValue: "primary" },
      onClick: { type: "function" }
    }
  },

  "Primitive:Card": {
    component: CooperativeCard,
    meta: { label: "Cooperative Card", category: "atom", icon: "card" },
    propSchema: {
      title: { type: "string", defaultValue: "Card Title" }
    }
  },

  "Primitive:Grid": {
    component: CooperativeGrid,
    meta: { label: "Empty Grid", category: "data", icon: "table" },
    propSchema: { 
        title: { type: "string" }, 
        columns: { type: "json" } 
    }
  },

  "Box": {
    component: ({ className, children, style, layout, ...props }: BaseProps) => {
        const tokenClasses = cn(
            style?.padding, style?.background, style?.color, style?.radius, 
            style?.shadow, style?.width, style?.height, style?.border,
            layout?.mode, layout?.direction, layout?.align, layout?.justify, layout?.gap
        );
        return <div className={cn(tokenClasses, className)} {...props}>{children}</div>;
    },
    meta: { label: "Container (Div)", category: "layout", icon: "box" },
    propSchema: {
      className: { type: "string", defaultValue: "p-4" }
    }
  },

  "Text": {
    component: ({ content, children, className, style, layout, ...props }: BaseProps & { content?: string }) => {
        const tokenClasses = cn(
            style?.padding, style?.color, style?.fontSize, style?.fontWeight, style?.textAlign,
            layout?.mode
        );
        return <span className={cn(tokenClasses, className)} {...props}>{content}{children}</span>;
    },
    meta: { label: "Text / Span", category: "atom", icon: "text-t" },
    propSchema: {
      content: { type: "string", defaultValue: "" },
      className: { type: "string", defaultValue: "" }
    }
  },

  "Image": {
    component: ({ src, alt, className, style, layout, ...props }: BaseProps & { src?: string, alt?: string }) => {
        const tokenClasses = cn(
            style?.padding, style?.radius, style?.width, style?.height, style?.border,
            layout?.mode
        );
        return <img src={src} alt={alt} className={cn(tokenClasses, className)} {...props} />;
    },
    meta: { label: "Image", category: "atom", icon: "image" },
    propSchema: {
      src: { type: "string", defaultValue: "" },
      alt: { type: "string", defaultValue: "" }
    }
  },

  "Input": {
    component: ({ placeholder, value, type = "text", className, style, layout, ...props }: BaseProps & { placeholder?: string, value?: string, type?: string }) => {
        const tokenClasses = cn(
            style?.padding, style?.background, style?.color, style?.radius, 
            style?.width, style?.height, style?.border,
            layout?.mode
        );
        return (
            <input 
                type={type}
                placeholder={placeholder} 
                value={value as string} 
                className={cn("bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs", tokenClasses, className)} 
                {...props} 
            />
        );
    },
    meta: { label: "Input Field", category: "atom", icon: "text-input" },
    propSchema: {
      placeholder: { type: "string", defaultValue: "Enter text..." },
      type: { type: "select", options: ["text", "password", "email", "number"], defaultValue: "text" }
    }
  },

  "Button": {
    component: CooperativeButton,
    meta: { label: "Primitive Button", category: "atom", icon: "cursor-click" },
    propSchema: {
      label: { type: "string", defaultValue: "Button" },
      variant: { type: "select", options: ["primary", "secondary", "ghost"], defaultValue: "primary" },
      onClick: { type: "function" }
    }
  },

  "Component": {
    component: ({ name, children, ...props }: BaseProps & { name?: string, componentName?: string }) => (
        <div className="border border-dashed border-indigo-500/50 rounded p-2 bg-indigo-500/5">
            <div className="text-[9px] text-indigo-400 font-bold uppercase mb-1">Component: {name || props.componentName}</div>
            {children}
            {!children && <div className="text-[8px] text-zinc-600 italic">Custom Logic Block</div>}
        </div>
    ),
    meta: { label: "Custom Component", category: "molecule", icon: "box" },
    propSchema: {
        name: { type: "string" }
    }
  },

  "Icon": {
    component: ({ name, size = 16, className, ...props }: { name?: string, size?: number, className?: string, [key: string]: unknown }) => (
      <div 
        className={cn("inline-flex items-center justify-center bg-zinc-800 rounded p-1", className)}
        style={{ width: size, height: size }}
        {...props}
      >
        <div className="text-[8px] text-zinc-400 font-mono">ICON:{name}</div>
      </div>
    ),
    meta: { label: "Semantic Icon", category: "atom", icon: "image" },
    propSchema: {
        name: { type: "string" },
        size: { type: "number", defaultValue: 16 }
    }
  },

  // ==============================
  // 🔵 FEATURES (The Soul)
  // ==============================

  "Feature:RoleGrid": {
    component: RoleManagementGrid,
    meta: { label: "Role Manager", category: "feature", icon: "users" },
    propSchema: {} 
  },

  // ==============================
  // 🔴 SYSTEM (The Engine)
  // ==============================

  "System:Canvas": {
    component: Canvas,
    meta: { label: "Builder Canvas", category: "system", hidden: true },
    propSchema: {}
  },

  "System:PropPanel": {
    component: PropertyPanel,
    meta: { label: "Property Editor", category: "system", hidden: true },
    propSchema: {}
  },

  "AgentWorkbench": {
    component: React.lazy(() => import("../pages/AgentWorkbench.js")),
    meta: { label: "Agent Workbench", category: "feature", icon: "layout" },
    propSchema: {}
  },
  "Feature:SwappableCard": {
    component: React.lazy(() => import("../components/work-order/SwappableCard.js").then(m => ({ default: m.SwappableCard }))),
    meta: { label: "Swappable Card", category: "feature", icon: "square" },
    propSchema: {
        id: { type: "string" }
    }
  },

  "GlobalContextBar": {
    component: React.lazy(() => import("./features/navigation/GlobalContextBar.js").then(m => ({ default: m.GlobalContextBar }))),
    meta: { label: "Context Bar", category: "layout", icon: "sidebar" },
    propSchema: {}
  },
  "UnifiedMenuBar": {
    component: React.lazy(() => import("./features/navigation/GlobalContextBar.js").then(m => ({ default: m.GlobalContextBar }))),
    meta: { label: "Menu Bar (Alias)", category: "layout", icon: "sidebar", hidden: true },
    propSchema: {}
  },
  "Flex": {
    component: ({ children, className }: BaseProps) => <div className={cn("flex", className)}>{children}</div>,
    meta: { label: "Flex Box", category: "layout" },
    propSchema: {
        className: { type: "string" }
    }
  },
  "Scaffold": {
    component: AgentWorkbenchScaffold,
    meta: { 
        label: "Workbench Shell", 
        category: "layout",
        slots: ["header", "sidebar", "content"]
    },
    propSchema: {
        header: { type: "json" },
        sidebar: { type: "json" },
        content: { type: "json" }
    }
  },
  "NebulaCanvas": {
    component: ({ children, className }: BaseProps) => <div className={cn("flex flex-1", className)}>{children}</div>,
    meta: { label: "Canvas Slot", category: "layout", icon: "layout" },
    propSchema: {
        className: { type: "string" }
    }
  },
  "FloatingNavigation": {
    component: ({ className }: BaseProps) => <div className={cn("w-16 border-r border-zinc-800 bg-zinc-900 flex flex-col items-center py-4", className)}>NAV</div>,
    meta: { label: "Floating Nav", category: "layout", icon: "navigation" },
    propSchema: {
        className: { type: "string" }
    }
  },

  // ==============================
  // 🧠 LOGIC (The Brain) - Headless Components
  // ==============================

  "Logic:DataFetcher": {
    component: (_props: { url?: string, onData?: (data: unknown) => void }) => { console.log('DataFetcher logic'); return null; },
    meta: { label: "Data Fetcher", category: "logic", icon: "download" },
    propSchema: {
        url: { type: "string", defaultValue: "https://api.example.com/data" },
        onData: { type: "function" }
    }
  },

  "Logic:StateProvider": {
    component: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    meta: { label: "State Provider", category: "logic", icon: "database" },
    propSchema: {
        initialState: { type: "json", defaultValue: {} }
    }
  },

  "Logic:KeyboardListener": {
    component: (_props: { onKey?: (key: string) => void }) => { console.log('KeyboardListener logic'); return null; },
    meta: { label: "Keyboard Listener", category: "logic", icon: "keyboard" },
    propSchema: {
        keys: { type: "string", defaultValue: "cmd+s" },
        onKey: { type: "function" }
    }
  }
};

/**
 * Component Map for fast lookup
 */
export const ComponentMap: Record<string, React.ElementType> = Object.keys(ComponentManifest).reduce(
  (acc, key) => {
    acc[key] = ComponentManifest[key].component;
    return acc;
  }, 
  {} as Record<string, React.ElementType>
);

/**
 * Resolve a component by its manifest name
 */
export const resolveComponent = (name: string): React.ElementType => {
    return ComponentMap[name] || ComponentMap['Box'];
};
