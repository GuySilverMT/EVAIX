import { NebulaTree, NebulaNode, StyleTokens, NodeType } from '../core/types.js';

export class CodeGenerator {

  generate(tree: NebulaTree): string {
    const root = tree.nodes[tree.rootId];
    if (!root) return '// Empty Tree';

    const jsx = this.renderNode(root, tree);

    const imports = (tree.imports && tree.imports.length > 0)
      ? tree.imports.join('\n')
      : `import React from 'react';\nimport { Button, Card, Input, Label, Slider } from '@/components/ui';`;

    return `
${imports}

export default function GeneratedPage() {
  return (
    ${jsx}
  );
}
    `.trim();
  }

  private renderNode(node: NebulaNode, tree: NebulaTree): string {
    // Handle Logic Nodes: Loops
    if (node.type === 'Loop' && node.logic) {
      const firstChild = node.children[0];
      const childId = typeof firstChild === 'string' ? firstChild : (firstChild as any)?.id;
      const childJsx = childId ? this.renderNode(tree.nodes[childId], tree) : '';
      return `{${node.logic.loopData}.map((${node.logic.iterator}, index) => (
        ${childJsx}
      ))}`;
    }

    // Handle Logic Nodes: Conditions
    if (node.type === 'Condition' && node.logic) {
      const firstChild = node.children[0];
      const childId = typeof firstChild === 'string' ? firstChild : (firstChild as any)?.id;
      const childJsx = childId ? this.renderNode(tree.nodes[childId], tree) : '';
      return `{${node.logic.condition} && (
        ${childJsx}
      )}`;
    }

    // Handle Black-Box Components
    if (node.type === 'Component' && node.componentName) {
      const propStrings: string[] = [];
      Object.entries(node.props).forEach(([key, value]) => {
        if (typeof value === 'string') {
          propStrings.push(`${key}="${value}"`);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          propStrings.push(`${key}={${value}}`);
        } else {
          propStrings.push(`${key}={${JSON.stringify(value)}}`);
        }
      });
      const propsStr = propStrings.length > 0 ? ' ' + propStrings.join(' ') : '';
      return `<${node.componentName}${propsStr} />`;
    }

    // Standard node rendering
    const ComponentName = this.mapNodeTypeToTag(node.type, node);

    // Resolve props and styles
    const className = this.resolveClassNames(node.style);

    // Convert props object to string attributes
    const propStrings: string[] = [];
    if (className) propStrings.push(`className="${className}"`);

    // Handle standard props
    Object.entries(node.props).forEach(([key, value]) => {
      if (key === "children") return; // Handled separately
      if (key === "content" && node.type === "Text") return; // Rendered as inner content
      if (typeof value === "string") {
            propStrings.push(`${key}="${value}"`);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
             propStrings.push(`${key}={${value}}`);
        } else {
             // Complex objects?
             propStrings.push(`${key}={${JSON.stringify(value)}}`);
        }
    });

    const propsStr = propStrings.length > 0 ? ' ' + propStrings.join(' ') : '';

    // Check for children
    const hasRecursiveChildren = node.children && node.children.length > 0;

    if (!hasRecursiveChildren && !node.props.children) {
        // Self closing
        return `<${ComponentName}${propsStr} />`;
    }

    let childrenJSX = "";
    if (hasRecursiveChildren) {
      childrenJSX = node.children
        .map((childOrId) => {
          const cid =
            typeof childOrId === "string" ? childOrId : (childOrId as any).id;
          return this.renderNode(tree.nodes[cid], tree);
        })
        .join("\n");
    } else if (node.props.content) {
      childrenJSX = node.props.content;
    } else if (node.props.children) {
      childrenJSX =
        typeof node.props.children === "string"
          ? node.props.children
          : "{...}";
    }

    return `
    <${ComponentName}${propsStr}>
      ${childrenJSX}
    </${ComponentName}>`;
  }

  private mapNodeTypeToTag(type: NodeType, node?: NebulaNode): string {
    if (type === 'Component' && node?.componentName) return node.componentName;
    if (type === 'Icon') return 'Icon';

    switch (type) {
      case 'Box': return 'div';
      case 'Text': return 'span';
      case 'Button': return 'button';
      case 'Input': return 'input';
      case 'Image': return 'img';
      default: return type;
    }
  }

  private resolveClassNames(style?: StyleTokens): string {
      if (!style) return '';
      // Reuse logic from Renderer or a shared util
      return [
        style.padding,
        style.gap,
        style.radius,
        style.shadow,
        style.background,
        style.color,
        style.border,
        style.width,
        style.height,
      ].filter(Boolean).join(' ');
  }
}
