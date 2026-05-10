// @Role: Senior TypeScript Developer
// @Task: Implement the "Code Mode" Operations Class
// @Context: This is the API the AI uses to manipulate the UI. It must be robust.

import {
  NebulaTree,
  NebulaNode,
  NebulaId,
  StyleTokens,
} from "../core/types.js";
import { nanoid } from "nanoid";
import { produce } from "immer"; // Use immer for immutable state updates
import { JsxParser } from "./JsxParser.js";

export class NebulaOps {
  private tree: NebulaTree;
  private onChange: (tree: NebulaTree) => void;

  constructor(initialTree: NebulaTree, onChange: (tree: NebulaTree) => void) {
    this.tree = initialTree;
    this.onChange = onChange;
  }

  // --- Core CRUD ---

  /**
   * Adds multiple nodes to the tree in a single, atomic operation.
   * This is the preferred method for batch updates from the AI.
   */
  addNodes(
    actions: {
      parentId: NebulaId;
      node: Partial<Omit<NebulaNode, "id" | "children">>;
    }[]
  ): NebulaId[] {
    const newIds: NebulaId[] = [];
    this.tree = produce(this.tree, (draft) => {
      actions.forEach((action) => {
        const { parentId, node: nodeData } = action;
        const newId = `node_${nanoid(6)}`;
        newIds.push(newId);

        // Create Node
        draft.nodes[newId] = {
          id: newId,
          type: nodeData.type || "Box",
          props: nodeData.props || {},
          bindings: nodeData.bindings || [],
          actions: nodeData.actions || [],
          style: nodeData.style || {},
          layout: nodeData.layout || { mode: "flex", direction: "column" },
          children: [],
          parentId,
          meta: { ...nodeData.meta, source: "ai-gen-batch" },
        };

        // Link to Parent
        if (draft.nodes[parentId]) {
          (draft.nodes[parentId].children as any[]).push(newId);
        }
      });
    });

    this.onChange(this.tree);
    console.log(
      "[NebulaOps.addNodes] ✅ Batch created",
      newIds.length,
      "nodes."
    );
    return newIds;
  }

  /**
   * Adds a new node to the tree.
   * AI Usage: nebula.addNode({ parentId: 'root', node: { type: 'Button', props: { label: 'Click Me' } } })
   * Legacy: nebula.addNode('container-1', { type: 'Button', props: { label: 'Click Me' } })
   */
  addNode(
    parentIdOrArgs:
      | NebulaId
      | {
          parentId: NebulaId;
          node: Partial<Omit<NebulaNode, "id" | "children">>;
        },
    node?: Partial<Omit<NebulaNode, "id" | "children">>
  ): NebulaId {
    // Handle both object and positional parameters
    const parentId =
      typeof parentIdOrArgs === "string"
        ? parentIdOrArgs
        : parentIdOrArgs.parentId;
    const nodeData =
      typeof parentIdOrArgs === "string" ? node! : parentIdOrArgs.node;
    const newId = `node_${nanoid(6)}`;

    this.tree = produce(this.tree, (draft) => {
      // Create Node
      draft.nodes[newId] = {
        id: newId,
        type: nodeData.type || "Box",
        props: nodeData.props || {},
        bindings: nodeData.bindings || [],
        actions: nodeData.actions || [],
        style: nodeData.style || {},
        layout: nodeData.layout || { mode: "flex", direction: "column" },
        children: [],
        parentId,
        meta: { ...nodeData.meta, source: "ai-gen" },
      };

      // Link to Parent
      if (draft.nodes[parentId]) {
        (draft.nodes[parentId].children as any[]).push(newId);
      }
    });

    console.log(
      "[NebulaOps.addNode] Calling onChange with updated tree. Node count:",
      Object.keys(this.tree.nodes).length
    );
    this.onChange(this.tree);
    console.log(
      "[NebulaOps.addNode] ✅ Created node:",
      newId,
      "under parent:",
      parentId
    );
    return newId;
  }

  /**
   * Sets a whole new tree.
   */
  setTree(newTree: NebulaTree) {
    this.tree = newTree;
    this.onChange(this.tree);
  }

  /**
   * Ingests a raw JSX string, explodes it into nodes, and attaches it to parentId.
   * AI Usage: nebula.ingest({ parentId: 'root', rawJsx: '<div>...</div>', options: { preserve: ['Header', 'Footer'] } })
   * Legacy: nebula.ingest('root', '<div>...</div>')
   */
  ingest(
    parentIdOrArgs:
      | NebulaId
      | {
          parentId: NebulaId;
          rawJsx: string;
          options?: { preserve?: string[] };
        },
    rawJsx?: string,
    options?: { preserve?: string[] }
  ): NebulaId {
    // Handle both object and positional parameters
    const parentId =
      typeof parentIdOrArgs === "string"
        ? parentIdOrArgs
        : parentIdOrArgs.parentId;
    const jsx =
      typeof parentIdOrArgs === "string" ? rawJsx! : parentIdOrArgs.rawJsx;
    const ingestOptions =
      typeof parentIdOrArgs === "string" ? options : parentIdOrArgs.options;

    console.log("[NebulaOps.ingest] Called with:", {
      parentId,
      jsxLength: jsx?.length,
      jsxPreview: jsx?.substring(0, 100),
      preserveComponents: ingestOptions?.preserve,
      parameterType:
        typeof parentIdOrArgs === "string" ? "positional" : "object",
    });

    try {
      // Use AstTransformer for advanced parsing
      const { AstTransformer } = require("../ingest/AstTransformer.js");
      const transformer = new AstTransformer();

      // Configure preserved components if specified
      if (ingestOptions?.preserve && ingestOptions.preserve.length > 0) {
        transformer.setPreservedComponents(ingestOptions.preserve);
        console.log(
          "[NebulaOps.ingest] Preserving components:",
          ingestOptions.preserve
        );
      }

      // Parse the JSX into a Nebula tree fragment
      console.log("[NebulaOps.ingest] Parsing JSX with AstTransformer...");
      const fragment = transformer.parse(jsx);
      console.log("[NebulaOps.ingest] Parse result:", {
        rootId: fragment.rootId,
        nodeCount: Object.keys(fragment.nodes).length,
        imports: fragment.imports.length,
        exports: fragment.exports.length,
      });

      // Ingest the parsed tree fragment
      const rootNodeId = this.ingestTree(parentId, fragment);
      console.log(
        "[NebulaOps.ingest] ✅ Ingest complete! Root node ID:",
        rootNodeId
      );
      console.log(
        "[NebulaOps.ingest] Tree now has",
        Object.keys(this.tree.nodes).length,
        "nodes"
      );
      return rootNodeId;
    } catch (error) {
      console.error("[NebulaOps.ingest] Error during ingestion:", error);
      // Fallback to old parser if AstTransformer fails
      console.warn("[NebulaOps.ingest] Falling back to legacy JsxParser...");

      const extractedJsx = JsxParser.extractJsx(jsx);
      const parsed = JsxParser.parse(extractedJsx);

      if (!parsed) {
        console.warn(
          "[NebulaOps.ingest] Failed to parse JSX - creating error node"
        );
        return this.addNode(parentId, {
          type: "Box",
          props: { className: "parse-error" },
          meta: { aiDescription: "Failed to parse JSX", source: "imported" },
        });
      }

      const rootNodeId = this.buildFromParsed(parsed, parentId);
      console.log(
        "[NebulaOps.ingest] ✅ Fallback ingest complete! Root node ID:",
        rootNodeId
      );
      return rootNodeId;
    }
  }

  /**
   * Recursively build Nebula nodes from parsed JSX tree
   */
  private buildFromParsed(element: any, parentId: NebulaId): NebulaId {
    console.log("[NebulaOps.buildFromParsed] Building node:", {
      tag: element.tag,
      parentId,
      childrenCount: element.children?.length || 0,
    });

    // Map HTML tag to Nebula type
    const type = JsxParser.mapToNebulaType(
      element.tag
    ) as import("../core/types.js").NodeType;

    // Extract className for styling
    const className = element.props.className || element.props.class || "";

    // Create the node
    console.log("[NebulaOps.buildFromParsed] Creating node with type:", type);
    const nodeId = this.addNode(parentId, {
      type,
      props: {
        ...element.props,
        className,
      },
      meta: {
        aiDescription: `Imported ${element.tag}`,
        source: "imported",
      },
    });
    console.log("[NebulaOps.buildFromParsed] Created node:", nodeId);

    // Recursively add children
    console.log(
      "[NebulaOps.buildFromParsed] Processing",
      element.children.length,
      "children for node:",
      nodeId
    );
    for (const child of element.children) {
      if (typeof child === "string") {
        // Text content - add as Text node
        if (child.trim()) {
          console.log(
            "[NebulaOps.buildFromParsed] Adding text child:",
            child.trim().substring(0, 50)
          );
          this.addNode(nodeId, {
            type: "Text",
            props: { content: child.trim() },
          });
        }
      } else {
        // Nested element
        console.log(
          "[NebulaOps.buildFromParsed] Recursing for nested element:",
          child.tag
        );
        this.buildFromParsed(child, nodeId);
      }
    }

    console.log(
      "[NebulaOps.buildFromParsed] ✅ Finished building node:",
      nodeId
    );
    return nodeId;
  }

  /**
   * Updates the global theme tokens.
   * AI Usage: nebula.setTheme({ theme: { primary: '#ff0000', radius: 0.5, font: 'Inter' } })
   * Legacy: nebula.setTheme({ primary: '#ff0000', radius: 0.5, font: 'Inter' })
   */
  setTheme(theme: any) {
    console.log("[NebulaOps] Setting theme:", theme);
    // Apply all theme properties as CSS variables without constraints
    for (const [key, value] of Object.entries(theme)) {
      document.documentElement.style.setProperty(`--${key}`, String(value));
    }
  }

  /**
   * Updates properties or styles of a node.
   * AI Usage: nebula.updateNode({ nodeId: 'node_123', update: { style: { background: 'bg-red-500' } } })
   * Legacy: nebula.updateNode('node_123', { style: { background: 'bg-red-500' } })
   */
  updateNode(
    nodeIdOrArgs: NebulaId | { nodeId: NebulaId; update: Partial<NebulaNode> },
    update?: Partial<NebulaNode>
  ) {
    // Handle both object and positional parameters
    const nodeId =
      typeof nodeIdOrArgs === "string" ? nodeIdOrArgs : nodeIdOrArgs.nodeId;
    const updateData =
      typeof nodeIdOrArgs === "string" ? update! : nodeIdOrArgs.update;
    this.tree = produce(this.tree, (draft) => {
      if (draft.nodes[nodeId]) {
        // Deep merge logic should be applied here for props/style
        Object.assign(draft.nodes[nodeId], {
          ...updateData,
          props: { ...draft.nodes[nodeId].props, ...updateData.props },
          style: { ...draft.nodes[nodeId].style, ...updateData.style },
        });
      }
    });
    this.onChange(this.tree);
  }

  /**
   * Moves a node to a new index or new parent.
   * AI Usage: nebula.moveNode({ nodeId: 'card_1', targetParentId: 'container_1', index: 0 })
   * Legacy: nebula.moveNode('card_1', 'container_1', 0)
   */
  moveNode(
    nodeIdOrArgs:
      | NebulaId
      | { nodeId: NebulaId; targetParentId: NebulaId; index: number },
    targetParentId?: NebulaId,
    index?: number
  ) {
    // Handle both object and positional parameters
    const nodeId =
      typeof nodeIdOrArgs === "string" ? nodeIdOrArgs : nodeIdOrArgs.nodeId;
    const targetParent =
      typeof nodeIdOrArgs === "string"
        ? targetParentId!
        : nodeIdOrArgs.targetParentId;
    const targetIndex =
      typeof nodeIdOrArgs === "string" ? index! : nodeIdOrArgs.index;
    this.tree = produce(this.tree, (draft) => {
      const node = draft.nodes[nodeId];
      if (!node) return;

      // Remove from old parent
      const oldParent = draft.nodes[node.parentId!];
      if (oldParent) {
        oldParent.children = (oldParent.children as any[]).filter((id) => id !== nodeId);
      }

      // Add to new parent
      const newParent = draft.nodes[targetParent];
      if (newParent) {
        (newParent.children as any[]).splice(targetIndex, 0, nodeId);
        node.parentId = targetParent;
      }
    });
    this.onChange(this.tree);
  }

  /**
   * Deletes a node and its children.
   * AI Usage: nebula.deleteNode({ nodeId: 'node_123' })
   * Legacy: nebula.deleteNode('node_123')
   */
  deleteNode(nodeIdOrArgs: NebulaId | { nodeId: NebulaId }) {
    // Handle both object and positional parameters
    const nodeId =
      typeof nodeIdOrArgs === "string" ? nodeIdOrArgs : nodeIdOrArgs.nodeId;
    this.tree = produce(this.tree, (draft) => {
      // Recursive deletion logic needed here
      const deleteRecursive = (id: NebulaId) => {
        const n = draft.nodes[id];
        if (!n) return;
        (n.children as any[]).forEach(deleteRecursive);
        delete draft.nodes[id];
      };

      // Unlink from parent
      const parentId = draft.nodes[nodeId]?.parentId;
      if (parentId && draft.nodes[parentId]) {
        draft.nodes[parentId].children = (draft.nodes[parentId].children as any[]).filter(
          (id) => id !== nodeId
        );
      }

      deleteRecursive(nodeId);
    });
    this.onChange(this.tree);
  }

  /**
   * Ingests a whole tree fragment into the current tree.
   * Useful for "Paste & Explode" or "Agentic Ingest".
   */
  ingestTree(parentId: NebulaId, fragment: NebulaTree) {
    this.tree = produce(this.tree, (draft) => {
      // 1. Merge all nodes from fragment into current nodes list
      Object.entries(fragment.nodes).forEach(([id, node]) => {
        draft.nodes[id] = {
          ...node,
          parentId: id === fragment.rootId ? parentId : node.parentId,
        };
      });

      // 2. Link fragment root to parent
      if (draft.nodes[parentId]) {
        (draft.nodes[parentId].children as any[]).push(fragment.rootId);
      }

      // 3. Merge Imports & Exports (set union)
      if (fragment.imports) {
        if (!draft.imports) draft.imports = [];
        fragment.imports.forEach((imp) => {
          if (!draft.imports.includes(imp)) draft.imports.push(imp);
        });
      }
      if (fragment.exports) {
        if (!draft.exports) draft.exports = [];
        fragment.exports.forEach((exp) => {
          if (!draft.exports.includes(exp)) draft.exports.push(exp);
        });
      }
    });

    this.onChange(this.tree);
    return fragment.rootId;
  }
}
