/**
 * Test file for LaTeX to OMML conversion
 */

import { latexToOmml } from './index';

// Test cases from the Haskell test suite
const testCases = [
  {
    name: 'Quadratic Formula',
    latex: 'x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}',
    description: 'Classic quadratic formula with fraction, square root, and operators'
  },
  {
    name: 'Simple fraction',
    latex: '\\frac{1}{2}',
    description: 'Basic fraction'
  },
  {
    name: 'Superscript',
    latex: 'x^2',
    description: 'Simple superscript'
  },
  {
    name: 'Subscript',
    latex: 'x_n',
    description: 'Simple subscript'
  },
  {
    name: 'Sum with limits',
    latex: '\\sum_{i=1}^{n} i',
    description: 'Summation with lower and upper limits'
  },
  {
    name: 'Integral',
    latex: '\\int_0^1 x^2 dx',
    description: 'Definite integral'
  },
  {
    name: 'Greek letters',
    latex: '\\alpha + \\beta = \\gamma',
    description: 'Greek letter identifiers'
  },
  {
    name: 'Matrix',
    latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
    description: 'Simple 2x2 matrix with parentheses'
  },
  {
    name: 'Square root',
    latex: '\\sqrt{x+1}',
    description: 'Square root expression'
  },
  {
    name: 'Complex expression',
    latex: 'e^{i\\pi} + 1 = 0',
    description: "Euler's identity"
  },
  {
    name: 'Binomial coefficient',
    latex: '\\binom{n}{k}',
    description: 'Binomial coefficient (not fully implemented but should handle gracefully)'
  }
];

console.log('='.repeat(80));
console.log('LaTeX to OMML Conversion Tests');
console.log('='.repeat(80));
console.log();

let passed = 0;
let failed = 0;

for (const test of testCases) {
  console.log(`Test: ${test.name}`);
  console.log(`Description: ${test.description}`);
  console.log(`LaTeX: ${test.latex}`);
  console.log();
  
  try {
    const omml = latexToOmml(test.latex, 'DisplayInline');
    console.log('OMML Output:');
    console.log(omml);
    console.log();
    console.log('✓ PASSED');
    passed++;
  } catch (error) {
    console.log('✗ FAILED');
    if (error instanceof Error) {
      console.log(`Error: ${error.message}`);
    }
    failed++;
  }
  
  console.log('-'.repeat(80));
  console.log();
}

console.log('='.repeat(80));
console.log(`Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
console.log('='.repeat(80));
