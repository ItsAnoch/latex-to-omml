# texmath-node

A TypeScript/JavaScript library for converting LaTeX mathematical expressions to Office Math Markup Language (OMML). This is a port of the Haskell [texmath](https://github.com/jgm/texmath) library's LaTeX to OMML conversion functionality.

## Features

- ✅ Comprehensive LaTeX parser supporting:
  - Fractions (`\frac`, `\tfrac`, `\dfrac`)
  - Roots and radicals (`\sqrt`, `\sqrt[n]`)
  - Subscripts and superscripts (`_`, `^`)
  - Greek letters (`\alpha`, `\beta`, etc.)
  - Mathematical operators (`\sin`, `\cos`, `\log`, etc.)
  - Large operators with limits (`\sum`, `\int`, `\prod`, etc.)
  - Matrices and arrays (`\begin{pmatrix}`, `\begin{bmatrix}`, etc.)
  - Delimiters (`\left(`, `\right)`, etc.)
  - Text styling (`\mathbf`, `\mathit`, etc.)
  - Accents (`\hat`, `\tilde`, `\bar`, etc.)
  - Boxed expressions (`\boxed`)
  - Binary operators and relations
  - Spaces and formatting

- ✅ Complete OMML XML output generation
- ✅ Type-safe TypeScript implementation
- ✅ No external dependencies (except Bun runtime)

## Installation

```bash
bun install
```

## Usage

### Basic Example

```typescript
import { latexToOmml } from './src/index';

// Convert LaTeX to OMML
const latex = '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}';
const omml = latexToOmml(latex);
console.log(omml);
```

### Display Types

You can specify whether the formula should be displayed inline or as a block:

```typescript
// Inline display (default)
const inlineOmml = latexToOmml('x^2 + y^2 = z^2', 'DisplayInline');

// Block display (centered, larger)
const blockOmml = latexToOmml('\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}', 'DisplayBlock');
```

### Advanced Usage

```typescript
import { readTeX, writeOMML, Exp } from './src/index';

// Parse LaTeX to AST
const ast: Exp[] = readTeX('e^{i\\pi} + 1 = 0');
console.log('AST:', JSON.stringify(ast, null, 2));

// Convert AST to OMML
const omml = writeOMML('DisplayInline', ast);
console.log('OMML:', omml);
```

## Examples

### Quadratic Formula
```typescript
const latex = 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}';
const omml = latexToOmml(latex);
```

### Integral with Limits
```typescript
const latex = '\\int_0^1 x^2 \\, dx';
const omml = latexToOmml(latex);
```

### Matrix
```typescript
const latex = '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}';
const omml = latexToOmml(latex);
```

### Sum with Limits
```typescript
const latex = '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}';
const omml = latexToOmml(latex);
```

## Running Tests

```bash
bun run test
```

The test suite includes:
- Basic fractions and roots
- Subscripts and superscripts
- Greek letters
- Integrals and sums with limits
- Matrices
- Complex expressions

## Architecture

The library follows the same architecture as the original Haskell texmath library:

1. **Parser (`reader.ts`)**: Parses LaTeX strings into an Abstract Syntax Tree (AST)
2. **AST (`types.ts`)**: Type definitions for the intermediate representation
3. **Writer (`writer.ts`)**: Converts AST to OMML XML format
4. **Commands (`commands.ts`)**: Lookup tables for LaTeX commands and symbols

### Type System

The AST uses a discriminated union type system for type-safe expression handling:

```typescript
type Exp =
  | { type: 'ENumber', value: string }
  | { type: 'EIdentifier', value: string }
  | { type: 'EFraction', fractionType: FractionType, numerator: Exp, denominator: Exp }
  | { type: 'ESqrt', value: Exp }
  | { type: 'ESuper', base: Exp, superscript: Exp }
  | ... // and many more
```

## Implementation Notes

This implementation covers the core LaTeX to OMML conversion functionality from the original texmath library:

- **Parser**: Based on `Text.TeXMath.Readers.TeX` - handles LaTeX syntax, commands, and environments
- **OMML Writer**: Based on `Text.TeXMath.Writers.OMML` - generates proper OMML XML structure
- **Symbol Tables**: Based on `Text.TeXMath.Readers.TeX.Commands` - comprehensive symbol and operator definitions
- **Type System**: Based on `Text.TeXMath.Types` - faithful port of the Haskell ADT to TypeScript discriminated unions

### Differences from Original

- Simplified macro system (original has a full macro expansion engine)
- Limited environment support (focuses on common matrix environments)
- Some advanced features like siunitx package support are not included
- Error handling is simpler (original has more detailed parse error reporting)

## Development

This project uses [Bun](https://bun.sh) as its runtime.

```bash
# Install dependencies
bun install

# Run tests
bun run test

# Run development mode
bun run dev
```

## License

This is a port of the [texmath](https://github.com/jgm/texmath) library by John MacFarlane, which is licensed under GPL-2.0.

## Credits

Original Haskell implementation: [texmath](https://github.com/jgm/texmath) by John MacFarlane

TypeScript port: Implements LaTeX to OMML conversion from the original texmath library.
