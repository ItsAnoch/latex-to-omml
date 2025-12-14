/**
 * Example usage of the LaTeX to OMML converter
 * Demonstrates various mathematical expressions
 */

import { latexToOmml } from './index';

console.log('LaTeX to OMML Converter - Examples\n');
console.log('='.repeat(80));

// Example 1: Quadratic Formula
console.log('\n1. Quadratic Formula');
console.log('LaTeX: x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');
const quadratic = latexToOmml('x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');
console.log('OMML:');
console.log(quadratic);

// Example 2: Euler's Identity
console.log('\n' + '='.repeat(80));
console.log('\n2. Euler\'s Identity');
console.log('LaTeX: e^{i\\pi} + 1 = 0');
const euler = latexToOmml('e^{i\\pi} + 1 = 0');
console.log('OMML:');
console.log(euler);

// Example 3: Summation Formula
console.log('\n' + '='.repeat(80));
console.log('\n3. Summation Formula');
console.log('LaTeX: \\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}');
const sum = latexToOmml('\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}');
console.log('OMML:');
console.log(sum);

// Example 4: Integral
console.log('\n' + '='.repeat(80));
console.log('\n4. Definite Integral');
console.log('LaTeX: \\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}');
const integral = latexToOmml('\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}');
console.log('OMML:');
console.log(integral);

// Example 5: Matrix
console.log('\n' + '='.repeat(80));
console.log('\n5. Matrix');
console.log('LaTeX: \\begin{pmatrix} \\cos\\theta & -\\sin\\theta \\\\ \\sin\\theta & \\cos\\theta \\end{pmatrix}');
const matrix = latexToOmml('\\begin{pmatrix} \\cos\\theta & -\\sin\\theta \\\\ \\sin\\theta & \\cos\\theta \\end{pmatrix}');
console.log('OMML:');
console.log(matrix);

// Example 6: Complex fraction
console.log('\n' + '='.repeat(80));
console.log('\n6. Continued Fraction');
console.log('LaTeX: \\frac{1}{1 + \\frac{1}{2 + \\frac{1}{3}}}');
const continuedFrac = latexToOmml('\\frac{1}{1 + \\frac{1}{2 + \\frac{1}{3}}}');
console.log('OMML:');
console.log(continuedFrac);

// Example 7: Block Display
console.log('\n' + '='.repeat(80));
console.log('\n7. Block Display (centered, larger)');
console.log('LaTeX: \\lim_{x \\to \\infty} \\frac{1}{x} = 0');
const limit = latexToOmml('\\lim_{x \\to \\infty} \\frac{1}{x} = 0', 'DisplayBlock');
console.log('OMML (Block):');
console.log(limit);

console.log('\n' + '='.repeat(80));
console.log('\nAll examples completed successfully!');
