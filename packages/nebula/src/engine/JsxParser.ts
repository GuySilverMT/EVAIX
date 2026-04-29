/**
 * Lightweight JSX parser for Nebula ingestion
 * Converts React/JSX code into Nebula node structures
 */

export interface ParsedElement {
  tag: string;
  props: Record<string, any>;
  children: (ParsedElement | string)[];
  isSelfClosing: boolean;
}

export class JsxParser {
  /**
   * Extract JSX from a React component's return statement
   */
  static extractJsx(code: string): string {
    // Try to find return statement
    const returnMatch = code.match(/return\s*\(([\s\S]*?)\);?\s*}/);
    if (returnMatch) {
      return returnMatch[1].trim();
    }
    
    // Fallback: assume entire code is JSX
    return code.trim();
  }

  /**
   * Parse JSX string into element tree using stack-based approach
   */
  static parse(jsx: string): ParsedElement | null {
    jsx = jsx.trim();
    if (!jsx) return null;

    console.log('[JsxParser.parse] Starting parse of JSX:', jsx.substring(0, 200));

    // Handle text nodes
    if (!jsx.startsWith('<')) {
      console.log('[JsxParser.parse] Not JSX, returning null');
      return null;
    }

    try {
      const result = this.parseElement(jsx, 0);
      console.log('[JsxParser.parse] Parse successful:', result.element);
      return result.element;
    } catch (error) {
      console.error('[JsxParser.parse] Parse failed:', error);
      return null;
    }
  }

  /**
   * Parse a single element starting at position
   * Returns { element, endPos }
   */
  private static parseElement(jsx: string, startPos: number): { element: ParsedElement; endPos: number } {
    let pos = startPos;
    
    // Skip whitespace
    while (pos < jsx.length && /\s/.test(jsx[pos])) pos++;
    
    if (jsx[pos] !== '<') {
      throw new Error(`Expected < at position ${pos}`);
    }
    
    pos++; // Skip <
    
    // Extract tag name
    let tagName = '';
    while (pos < jsx.length && /[\w-]/.test(jsx[pos])) {
      tagName += jsx[pos];
      pos++;
    }
    
    if (!tagName) {
      throw new Error(`No tag name found at position ${pos}`);
    }
    
    console.log('[JsxParser.parseElement] Parsing tag:', tagName);
    
    // Parse attributes
    const props: Record<string, any> = {};
    while (pos < jsx.length && jsx[pos] !== '>' && jsx[pos] !== '/') {
      // Skip whitespace
      while (pos < jsx.length && /\s/.test(jsx[pos])) pos++;
      
      if (jsx[pos] === '>' || jsx[pos] === '/') break;
      
      // Parse attribute name
      let attrName = '';
      while (pos < jsx.length && /[\w-]/.test(jsx[pos])) {
        attrName += jsx[pos];
        pos++;
      }
      
      if (!attrName) break;
      
      // Skip whitespace and =
      while (pos < jsx.length && /[\s=]/.test(jsx[pos])) pos++;
      
      // Parse attribute value
      let attrValue: any = true; // Boolean attribute
      
      if (jsx[pos] === '"' || jsx[pos] === "'") {
        const quote = jsx[pos];
        pos++; // Skip opening quote
        attrValue = '';
        while (pos < jsx.length && jsx[pos] !== quote) {
          attrValue += jsx[pos];
          pos++;
        }
        pos++; // Skip closing quote
      } else if (jsx[pos] === '{') {
        pos++; // Skip {
        let depth = 1;
        attrValue = '';
        while (pos < jsx.length && depth > 0) {
          if (jsx[pos] === '{') depth++;
          if (jsx[pos] === '}') depth--;
          if (depth > 0) attrValue += jsx[pos];
          pos++;
        }
      }
      
      props[attrName] = attrValue;
    }
    
    // Check for self-closing
    const isSelfClosing = jsx[pos] === '/';
    if (isSelfClosing) {
      pos++; // Skip /
      pos++; // Skip >
      console.log('[JsxParser.parseElement] Self-closing tag:', tagName);
      return {
        element: { tag: tagName, props, children: [], isSelfClosing: true },
        endPos: pos
      };
    }
    
    pos++; // Skip >
    
    // Parse children
    const children: (ParsedElement | string)[] = [];
    let textBuffer = '';
    
    while (pos < jsx.length) {
      // Check for closing tag
      if (jsx[pos] === '<' && jsx[pos + 1] === '/') {
        // Save any accumulated text
        if (textBuffer.trim()) {
          children.push(textBuffer.trim());
          textBuffer = '';
        }
        
        // Parse closing tag
        pos += 2; // Skip </
        let closingTag = '';
        while (pos < jsx.length && jsx[pos] !== '>') {
          closingTag += jsx[pos];
          pos++;
        }
        pos++; // Skip >
        
        if (closingTag.trim() !== tagName) {
          console.warn(`[JsxParser] Mismatched closing tag: expected ${tagName}, got ${closingTag}`);
        }
        
        console.log('[JsxParser.parseElement] Finished parsing', tagName, 'with', children.length, 'children');
        return {
          element: { tag: tagName, props, children, isSelfClosing: false },
          endPos: pos
        };
      }
      
      // Check for child element
      if (jsx[pos] === '<' && jsx[pos + 1] !== '/') {
        // Save any accumulated text
        if (textBuffer.trim()) {
          children.push(textBuffer.trim());
          textBuffer = '';
        }
        
        // Parse child element recursively
        const childResult = this.parseElement(jsx, pos);
        children.push(childResult.element);
        pos = childResult.endPos;
      } else {
        // Accumulate text
        textBuffer += jsx[pos];
        pos++;
      }
    }
    
    // If we get here, we didn't find a closing tag
    console.warn('[JsxParser] No closing tag found for:', tagName);
    return {
      element: { tag: tagName, props, children, isSelfClosing: false },
      endPos: pos
    };
  }

  /**
   * Parse props string into object
   */
  private static parseProps(propsString: string): Record<string, any> {
    const props: Record<string, any> = {};
    
    if (!propsString) return props;

    // Match prop="value" or prop={value}
    const propRegex = /(\w+)=(?:"([^"]*)"|{([^}]*)})/g;
    let match;

    while ((match = propRegex.exec(propsString)) !== null) {
      const [, key, stringValue, jsValue] = match;
      props[key] = stringValue || jsValue;
    }

    return props;
  }

  /**
   * Parse children elements and text
   */
  private static parseChildren(content: string): (ParsedElement | string)[] {
    const children: (ParsedElement | string)[] = [];
    content = content.trim();

    if (!content) return children;

    // Simple approach: split by top-level tags
    let depth = 0;
    let current = '';
    let inTag = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      
      if (char === '<') {
        if (content[i + 1] === '/') {
          depth--;
          inTag = true;
        } else {
          if (depth === 0 && current.trim()) {
            children.push(current.trim());
            current = '';
          }
          depth++;
          inTag = true;
        }
      } else if (char === '>') {
        inTag = false;
        if (depth === 0 && current.trim().startsWith('<')) {
          const parsed = this.parse(current.trim());
          if (parsed) children.push(parsed);
          current = '';
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) {
      if (current.trim().startsWith('<')) {
        const parsed = this.parse(current.trim());
        if (parsed) children.push(parsed);
      } else {
        children.push(current.trim());
      }
    }

    return children;
  }

  /**
   * Map HTML tag to Nebula component type
   */
  static mapToNebulaType(htmlTag: string): string {
    const mapping: Record<string, string> = {
      'div': 'Box',
      'span': 'Text',
      'p': 'Text',
      'h1': 'Text',
      'h2': 'Text',
      'h3': 'Text',
      'h4': 'Text',
      'h5': 'Text',
      'h6': 'Text',
      'button': 'Button',
      'input': 'Input',
      'img': 'Image',
      'a': 'Button',
    };

    return mapping[htmlTag.toLowerCase()] || 'Box';
  }
}
