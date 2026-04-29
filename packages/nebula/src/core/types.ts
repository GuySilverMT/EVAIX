import { z } from "zod"; // Use Zod for runtime validation if needed later
import type { NebulaAction } from "./actions.js";

export type NebulaId = string;

// Node Types: Primitives, Logic, and Black-Box Components
export type NodeType =
  | "Box"
  | "Flex"
  | "Grid"
  | "Text"
  | "Button"
  | "Input"
  | "Icon"
  | "Image" // Primitives
  | "Loop"
  | "Condition" // Logic
  | "Component"; // Black Box (Custom Components)

// The "DNA" of the UI. Every layout is a constraint, not a pixel value.
export type LayoutMode = "flex" | "grid" | "absolute" | "flow";
export type Direction = "row" | "column" | "row-reverse" | "column-reverse";
export type Alignment =
  | "start"
  | "center"
  | "end"
  | "stretch"
  | "between"
  | "around";

// Design Tokens - Unconstrained styling
export interface StyleTokens {
  padding?: string;
  gap?: string;
  radius?: string;
  shadow?: string;
  background?: string;
  color?: string;
  border?: string;
  width?: string;
  height?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: string;
  // Responsive overrides
  mobile?: Partial<StyleTokens>;
  tablet?: Partial<StyleTokens>;
  desktop?: Partial<StyleTokens>;
}

export interface DataBinding {
  propName: string; // e.g., "content" or "src"
  sourcePath: string; // e.g., "query.activeUser.name"
  defaultValue?: any;
}

// The "Atom" Node
export interface NebulaNode {
  id: NebulaId;
  type: NodeType; // Strongly typed node types

  // Content & Configuration
  props: Record<string, any>;
  bindings?: DataBinding[]; // Dynamic value injection
  actions?: NebulaAction[]; // Event handlers connected to logic

  // Logic Configuration (for Loop and Condition nodes)
  logic?: {
    // For Loops: {items.map((item) => ...)}
    loopData?: string; // e.g., "props.users"
    iterator?: string; // e.g., "user"

    // For Conditions: {isActive && ...}
    condition?: string; // e.g., "props.isActive"
  };

  // Component Reference (for Black-Box imports)
  componentName?: string; // e.g., "UserCard", "HeroSection"

  // Visuals (Token-based)
  style?: StyleTokens;

  // Layout Engine
  layout?: {
    mode: LayoutMode;
    direction?: Direction;
    justify?: Alignment;
    align?: Alignment;
    wrap?: boolean;
    columns?: number; // For grids
    gap?: string; // Token
  };

  // NEW: Add this specific block for the Shell
  responsive?: {
    // Controls visibility per device
    visibility?: {
      mobile: 'hidden' | 'visible';
      desktop: 'hidden' | 'visible';
    };
    // Controls layout mode per device (e.g. sidebar becomes bottom-bar)
    mode?: {
      mobile?: 'stack' | 'bottom-bar' | 'drawer';
      desktop?: 'sidebar' | 'grid' | 'default';
    };
  };

  // Hierarchy
  parentId?: NebulaId;
  children: NebulaNode[] | NebulaId[]; // Support both nested for Projects and flat for Editor

  // Meta for AI & Editor
  meta?: {
    label?: string;
    locked?: boolean;
    hidden?: boolean;
    source?: "ai-gen" | "ai-gen-batch" | "human" | "imported";
    aiDescription?: string; // "A blue card for user profile"
    aiConfig?: { defaultRole?: string };
  };
}

// Update ProjectManifest to use this Node
export interface ProjectManifest {
  id: string;
  name: string;
  version: string;
  themeId: string;
  routes: {
    [routePath: string]: NebulaNode;
  };
}

// The Tree (Single Source of Truth)
export interface NebulaTree {
  rootId: NebulaId;
  nodes: Record<NebulaId, NebulaNode>;
  imports: string[]; // Captured import statements
  exports: string[]; // Captured export statements
  version: number;
}
