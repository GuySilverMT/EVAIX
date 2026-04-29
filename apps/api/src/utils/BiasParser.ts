/**
 * BIAS PARSER UTILITY
 * Robust regex-based extraction and clamping for system bias parameters.
 */
export class BiasParser {
  /**
   * Extracts and clamps B-I and B-R values from a string.
   * Format expected: B-I = -10.7, B-R = 0.7
   */
  static processBiasOutput(input: string): { bI: number; bR: number } | null {
    const regex = /B-I\s*=\s*([-+]?\d*\.?\d+).*B-R\s*=\s*([-+]?\d*\.?\d+)/;
    const match = input.match(regex);
    
    if (match) {
      try {
        // Parse values
        const rawBI = parseFloat(match[1]);
        const rawBR = parseFloat(match[2]);
        
        if (isNaN(rawBI) || isNaN(rawBR)) return null;

        // Clamp values to safe ranges
        const bI = Math.max(-11.0, Math.min(-10.5, rawBI));
        const bR = Math.max(0.65, Math.min(0.75, rawBR));
        
        console.log(`[BiasParser] Parsed and Clipped: B-I=${bI}, B-R=${bR}`);
        return { bI, bR };
      } catch (e) {
        console.error("[BiasParser] Failed to parse bias values", e);
        return null;
      }
    }
    
    return null;
  }
}
