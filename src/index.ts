/**
 * LaTeX to OMML Converter
 * Main export module for converting LaTeX mathematical expressions to Office Math Markup Language (OMML)
 */

import { readTeX } from './reader';
import { writeOMML } from './writer';
import { DisplayType, Exp } from './types';

/**
 * Converts a LaTeX string to OMML (Office Math Markup Language) XML string
 * 
 * @param latex - The LaTeX mathematical expression as a string
 * @param displayType - Optional display type: 'DisplayBlock' (default) or 'DisplayInline'
 * @returns OMML XML string representation of the mathematical expression
 * 
 * @example
 * ```typescript
 * const latex = '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';
 * const omml = latexToOmml(latex);
 * console.log(omml);
 * ```
 */
export function latexToOmml(latex: string, displayType: DisplayType = 'DisplayInline'): string {
  try {
    // Parse LaTeX to AST
    const ast: Exp[] = readTeX(latex);
    
    // Convert AST to OMML
    const omml: string = writeOMML(displayType, ast);
    
    return omml;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to convert LaTeX to OMML: ${error.message}`);
    }
    throw error;
  }
}

// Export types for advanced usage
export type { Exp, DisplayType, TeXSymbolType, TextType, FractionType, Alignment } from './types';

// Export individual functions for advanced usage
export { readTeX } from './reader';
export { writeOMML } from './writer';