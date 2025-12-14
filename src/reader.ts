/**
 * LaTeX (TeX) Parser
 * Port of Text.TeXMath.Readers.TeX from Haskell
 */

import type { Exp, TeXSymbolType, FractionType, Alignment, ArrayLine, InEDelimited } from './types';
import { symbols, operators, enclosures, styleOps, textOps } from './commands';

class ParseError extends Error {
  constructor(message: string, public position: number) {
    super(message);
    this.name = 'ParseError';
  }
}

class Parser {
  private input: string;
  private pos: number = 0;

  constructor(input: string) {
    this.input = input;
  }

  private peek(): string | null {
    if (this.pos >= this.input.length) return null;
    return this.input[this.pos];
  }

  private advance(count: number = 1): void {
    this.pos += count;
  }

  private consume(): string | null {
    const char = this.peek();
    if (char !== null) this.advance();
    return char;
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.advance();
    }
  }

  private skipIgnorable(): void {
    while (true) {
      this.skipWhitespace();
      if (this.peek() === '%') {
        // Skip comment
        while (this.peek() !== '\n' && this.peek() !== null) {
          this.advance();
        }
        if (this.peek() === '\n') this.advance();
      } else {
        break;
      }
    }
  }

  private match(str: string): boolean {
    if (this.input.substr(this.pos, str.length) === str) {
      this.advance(str.length);
      return true;
    }
    return false;
  }

  private readControlSequence(): string | null {
    if (this.peek() !== '\\') return null;
    this.advance(); // consume '\\'
    
    const start = this.pos;
    const firstChar = this.peek();
    
    if (firstChar && !/[a-zA-Z]/.test(firstChar)) {
      // Single non-letter character (like \\{)
      this.advance();
      return '\\' + firstChar;
    }
    
    // Read letters
    while (this.peek() && /[a-zA-Z]/.test(this.peek()!)) {
      this.advance();
    }
    
    if (this.pos === start) return null;
    return '\\' + this.input.substring(start, this.pos);
  }

  private readBraces<T>(parser: () => T): T | null {
    this.skipIgnorable();
    if (this.peek() !== '{') return null;
    this.advance();
    this.skipIgnorable();
    const result = parser();
    this.skipIgnorable();
    if (this.peek() !== '}') {
      throw new ParseError('Expected closing brace', this.pos);
    }
    this.advance();
    this.skipIgnorable();
    return result;
  }

  private readBrackets<T>(parser: () => T): T | null {
    this.skipIgnorable();
    if (this.peek() !== '[') return null;
    this.advance();
    this.skipIgnorable();
    const result = parser();
    this.skipIgnorable();
    if (this.peek() !== ']') {
      throw new ParseError('Expected closing bracket', this.pos);
    }
    this.advance();
    this.skipIgnorable();
    return result;
  }

  parse(): Exp[] {
    this.skipIgnorable();
    const exps: Exp[] = [];
    
    while (this.peek() !== null) {
      const exp = this.parseExpr();
      if (exp) {
        exps.push(exp);
      } else {
        break;
      }
      this.skipIgnorable();
    }
    
    return this.fixBinList(exps);
  }

  private fixBinList(exps: Exp[]): Exp[] {
    // Convert Bin symbols to Ord in certain contexts
    const result: Exp[] = [];
    
    for (let i = 0; i < exps.length; i++) {
      const exp = exps[i];
      
      if (exp.type === 'ESymbol' && exp.symbolType === 'Bin') {
        // If this is the first atom or previous was Bin, Op, Rel, Open, or Pun
        if (result.length === 0) {
          result.push({ ...exp, symbolType: 'Ord' });
        } else {
          const prev = result[result.length - 1];
          if (prev.type === 'ESymbol' && 
              ['Bin', 'Op', 'Rel', 'Open', 'Pun'].includes(prev.symbolType)) {
            result.push({ ...exp, symbolType: 'Ord' });
          } else {
            result.push(exp);
          }
        }
      } else if (exp.type === 'ESymbol' && ['Rel', 'Close', 'Pun'].includes(exp.symbolType)) {
        // If previous was Bin, change it to Ord
        if (result.length > 0) {
          const prev = result[result.length - 1];
          if (prev.type === 'ESymbol' && prev.symbolType === 'Bin') {
            result[result.length - 1] = { ...prev, symbolType: 'Ord' };
          }
        }
        result.push(exp);
      } else {
        result.push(exp);
      }
    }
    
    return result;
  }

  private parseExpr(): Exp | null {
    this.skipIgnorable();
    
    // Try to parse different expression types
    let base = this.parseExpr1();
    if (!base) return null;
    
    // Check for subscript/superscript
    this.skipIgnorable();
    const subSupResult = this.parseSubSup(base);
    if (subSupResult) return subSupResult;
    
    return base;
  }

  private parseExpr1(): Exp | null {
    this.skipIgnorable();
    
    // Try different parsers in order
    return this.parseInBraces() ??
           this.parseNumber() ??
           this.parseVariable() ??
           this.parseCommand() ??
           this.parseOperator() ??
           this.parseEnclosure() ??
           null;
  }

  private parseInBraces(): Exp | null {
    const result = this.readBraces(() => {
      const exps: Exp[] = [];
      while (this.peek() !== '}' && this.peek() !== null) {
        const exp = this.parseExpr();
        if (exp) exps.push(exp);
        else break;
      }
      return exps;
    });
    
    if (result === null) return null;
    if (result.length === 0) return { type: 'EGrouped', value: [] };
    if (result.length === 1) return result[0];
    return { type: 'EGrouped', value: result };
  }

  private parseNumber(): Exp | null {
    this.skipIgnorable();
    const start = this.pos;
    let hasDigits = false;
    
    // Parse digits
    while (this.peek() && /\d/.test(this.peek()!)) {
      hasDigits = true;
      this.advance();
    }
    
    // Parse decimal point and more digits
    if (this.peek() === '.') {
      const dotPos = this.pos;
      this.advance();
      if (this.peek() && /\d/.test(this.peek()!)) {
        while (this.peek() && /\d/.test(this.peek()!)) {
          this.advance();
        }
      } else if (!hasDigits) {
        // Just a dot, not a number
        this.pos = dotPos;
        return null;
      }
    }
    
    if (this.pos === start) return null;
    this.skipIgnorable();
    return { type: 'ENumber', value: this.input.substring(start, this.pos) };
  }

  private parseVariable(): Exp | null {
    this.skipIgnorable();
    const char = this.peek();
    if (char && /[a-zA-Z]/.test(char)) {
      this.advance();
      this.skipIgnorable();
      return { type: 'EIdentifier', value: char };
    }
    return null;
  }

  private parseCommand(): Exp | null {
    const cmd = this.readControlSequence();
    if (!cmd) return null;
    this.skipIgnorable();
    
    // Check for symbols
    if (cmd in symbols) {
      const sym = symbols[cmd];
      if (sym.type === 'ESymbol' && sym.symbolType === 'Accent') {
        // Accent command - needs an argument
        const arg = this.parseExpr1();
        if (arg) {
          return { type: 'EOver', convertible: false, base: arg, over: sym };
        }
      } else if (sym.type === 'ESymbol' && sym.symbolType === 'TOver') {
        // Over bar command
        const arg = this.parseExpr1();
        if (arg) {
          return { type: 'EOver', convertible: false, base: arg, over: sym };
        }
      } else if (sym.type === 'ESymbol' && sym.symbolType === 'TUnder') {
        // Under bar command
        const arg = this.parseExpr1();
        if (arg) {
          return { type: 'EUnder', convertible: false, base: arg, under: sym };
        }
      }
      return sym;
    }
    
    // Binary operations
    if (cmd === '\\frac') return this.parseFrac('NormalFrac');
    if (cmd === '\\tfrac') return this.parseFrac('InlineFrac');
    if (cmd === '\\dfrac') return this.parseFrac('DisplayFrac');
    if (cmd === '\\sqrt') return this.parseSqrt();
    
    // Sub/superscript
    if (cmd === '\\overset') return this.parseOverset();
    if (cmd === '\\underset') return this.parseUnderset();
    if (cmd === '\\stackrel') return this.parseStackrel();
    
    // Delimiters
    if (cmd === '\\left') return this.parseDelimited();
    if (cmd === '\\right') return null; // Handled in parseDelimited
    
    // Text
    if (cmd in textOps) return this.parseTextOp(cmd);
    
    // Style
    if (cmd in styleOps) return this.parseStyleOp(cmd);
    
    // Operators
    if (cmd === '\\operatorname') return this.parseOperatorName();
    
    // Boxed and phantom
    if (cmd === '\\boxed') return this.parseBoxed();
    if (cmd === '\\phantom') return this.parsePhantom();
    
    // Cancel
    if (cmd === '\\cancel') return this.parseCancel('ForwardSlash');
    if (cmd === '\\bcancel') return this.parseCancel('BackSlash');
    if (cmd === '\\xcancel') return this.parseCancel('XSlash');
    
    // Environments
    if (cmd === '\\begin') return this.parseEnvironment();
    
    // Spaces
    if (cmd === '\\enspace') return { type: 'ESpace', width: 0.5 };
    if (cmd === '\\hspace') return this.parseHSpace();
    
    return null;
  }

  private parseFrac(fracType: FractionType): Exp | null {
    const num = this.readBraces(() => this.parseGroupedExpr());
    const den = this.readBraces(() => this.parseGroupedExpr());
    if (num && den) {
      return { type: 'EFraction', fractionType: fracType, numerator: num, denominator: den };
    }
    return null;
  }

  private parseSqrt(): Exp | null {
    const index = this.readBrackets(() => this.parseGroupedExpr());
    const base = this.readBraces(() => this.parseGroupedExpr()) ?? this.parseExpr1();
    
    if (base) {
      if (index) {
        return { type: 'ERoot', index, base };
      }
      return { type: 'ESqrt', value: base };
    }
    return null;
  }
  
  private parseGroupedExpr(): Exp {
    const exps: Exp[] = [];
    while (this.peek() !== '}' && this.peek() !== ']' && this.peek() !== null) {
      const exp = this.parseExpr();
      if (exp) {
        exps.push(exp);
      } else {
        // If we can't parse, just advance one character to avoid infinite loop
        const char = this.peek();
        if (char && char !== '}' && char !== ']') {
          this.advance();
        } else {
          break;
        }
      }
    }
    if (exps.length === 0) return { type: 'EGrouped', value: [] };
    if (exps.length === 1) return exps[0];
    return { type: 'EGrouped', value: exps };
  }

  private parseOverset(): Exp | null {
    const over = this.readBraces(() => this.parseExpr1());
    const base = this.readBraces(() => this.parseExpr1());
    if (over && base) {
      return { type: 'EOver', convertible: false, base, over };
    }
    return null;
  }

  private parseUnderset(): Exp | null {
    const under = this.readBraces(() => this.parseExpr1());
    const base = this.readBraces(() => this.parseExpr1());
    if (under && base) {
      return { type: 'EUnder', convertible: false, base, under };
    }
    return null;
  }

  private parseStackrel(): Exp | null {
    return this.parseOverset(); // Same as overset
  }

  private parseDelimited(): Exp | null {
    // Parse opening delimiter
    const open = this.parseDelimiter();
    if (open === null) return null;
    
    // Parse content
    const content: InEDelimited[] = [];
    while (true) {
      this.skipIgnorable();
      
      // Check for \right
      const savedPos = this.pos;
      const cmd = this.readControlSequence();
      if (cmd === '\\right') {
        break;
      }
      this.pos = savedPos;
      
      // Check for \middle
      if (cmd === '\\middle') {
        const delim = this.parseDelimiter();
        if (delim) {
          content.push({ type: 'Left', value: delim });
        }
        continue;
      }
      
      const exp = this.parseExpr();
      if (exp) {
        content.push({ type: 'Right', value: exp });
      } else {
        break;
      }
    }
    
    // Parse closing delimiter
    const close = this.parseDelimiter() ?? '';
    
    return { type: 'EDelimited', open, close, content };
  }

  private parseDelimiter(): string | null {
    this.skipIgnorable();
    
    // Check for period (null delimiter)
    if (this.peek() === '.') {
      this.advance();
      this.skipIgnorable();
      return '';
    }
    
    // Check for command delimiter
    const cmd = this.readControlSequence();
    if (cmd && cmd in enclosures) {
      this.skipIgnorable();
      const enc = enclosures[cmd];
      if (enc.type === 'ESymbol') {
        return enc.value;
      }
    }
    
    // Check for single character delimiter
    const char = this.peek();
    if (char && '()[]|'.includes(char)) {
      this.advance();
      this.skipIgnorable();
      return char;
    }
    
    return null;
  }

  private parseTextOp(cmd: string): Exp | null {
    const op = textOps[cmd];
    const text = this.readBraces(() => {
      const start = this.pos;
      while (this.peek() !== '}' && this.peek() !== null) {
        this.advance();
      }
      return this.input.substring(start, this.pos);
    });
    
    if (text !== null) {
      return op(text);
    }
    return null;
  }

  private parseStyleOp(cmd: string): Exp | null {
    const op = styleOps[cmd];
    const content = this.readBraces(() => {
      const exps: Exp[] = [];
      while (this.peek() !== '}' && this.peek() !== null) {
        const exp = this.parseExpr();
        if (exp) exps.push(exp);
        else break;
      }
      return exps;
    }) ?? [this.parseExpr1()].filter(e => e !== null) as Exp[];
    
    if (content.length > 0) {
      return op(content);
    }
    return null;
  }

  private parseOperatorName(): Exp | null {
    const convertible = this.peek() === '*';
    if (convertible) this.advance();
    
    const name = this.readBraces(() => {
      const exps: Exp[] = [];
      while (this.peek() !== '}' && this.peek() !== null) {
        const exp = this.parseExpr1();
        if (exp) exps.push(exp);
        else break;
      }
      return exps.map(e => this.expToText(e)).join('');
    });
    
    if (name) {
      return { type: 'EMathOperator', value: name };
    }
    return null;
  }

  private expToText(exp: Exp): string {
    switch (exp.type) {
      case 'EIdentifier':
      case 'ENumber':
      case 'EMathOperator':
        return exp.value;
      case 'EText':
        return exp.value;
      case 'ESymbol':
        return exp.value;
      case 'EGrouped':
        return exp.value.map(e => this.expToText(e)).join('');
      default:
        return '';
    }
  }

  private parseBoxed(): Exp | null {
    const content = this.readBraces(() => this.parseExpr1()) ?? this.parseExpr1();
    if (content) {
      return { type: 'EBoxed', value: content };
    }
    return null;
  }

  private parsePhantom(): Exp | null {
    const content = this.readBraces(() => this.parseExpr1()) ?? this.parseExpr1();
    if (content) {
      return { type: 'EPhantom', value: content };
    }
    return null;
  }

  private parseCancel(strokeType: 'ForwardSlash' | 'BackSlash' | 'XSlash'): Exp | null {
    const content = this.readBraces(() => this.parseExpr1()) ?? this.parseExpr1();
    if (content) {
      return { type: 'ECancel', strokeType, value: content };
    }
    return null;
  }

  private parseEnvironment(): Exp | null {
    const envName = this.readBraces(() => {
      const start = this.pos;
      while (this.peek() !== '}' && this.peek() !== null) {
        this.advance();
      }
      return this.input.substring(start, this.pos);
    });
    
    if (!envName) return null;
    
    // Handle matrix environments
    if (envName.includes('matrix') || envName === 'array') {
      return this.parseMatrix(envName);
    }
    
    // Handle align environments
    if (envName.includes('align') || envName === 'eqnarray') {
      return this.parseAlign();
    }
    
    return null;
  }

  private parseMatrix(envName: string): Exp | null {
    const lines: ArrayLine = [];
    
    while (true) {
      this.skipIgnorable();
      
      // Check for \end
      const savedPos = this.pos;
      const cmd = this.readControlSequence();
      if (cmd === '\\end') {
        // Consume environment name
        this.readBraces(() => {});
        break;
      }
      this.pos = savedPos;
      
      // Parse line
      const line = this.parseArrayLine();
      if (line.length > 0) {
        lines.push(line);
      }
      
      // Check for line break
      if (this.match('\\\\')) {
        this.skipIgnorable();
        // Optional bracket with size
        this.readBrackets(() => {});
      } else {
        break;
      }
    }
    
    const alignments: Alignment[] = Array(Math.max(...lines.map(l => l.length), 0)).fill('AlignCenter');
    
    // Determine delimiters based on environment name
    let open = '', close = '';
    if (envName === 'pmatrix') { open = '('; close = ')'; }
    else if (envName === 'bmatrix') { open = '['; close = ']'; }
    else if (envName === 'Bmatrix') { open = '{'; close = '}'; }
    else if (envName === 'vmatrix') { open = '|'; close = '|'; }
    else if (envName === 'Vmatrix') { open = '\u2225'; close = '\u2225'; }
    
    const array: Exp = { type: 'EArray', alignments, lines };
    
    if (open && close) {
      return { type: 'EDelimited', open, close, content: [{ type: 'Right', value: array }] };
    }
    
    return array;
  }

  private parseAlign(): Exp | null {
    // Similar to matrix but with different alignment
    const lines: ArrayLine = [];
    
    while (true) {
      this.skipIgnorable();
      
      const savedPos = this.pos;
      const cmd = this.readControlSequence();
      if (cmd === '\\end') {
        this.readBraces(() => {});
        break;
      }
      this.pos = savedPos;
      
      const line = this.parseArrayLine();
      if (line.length > 0) {
        lines.push(line);
      }
      
      if (this.match('\\\\')) {
        this.skipIgnorable();
        this.readBrackets(() => {});
      } else {
        break;
      }
    }
    
    const maxCols = Math.max(...lines.map(l => l.length), 0);
    const alignments: Alignment[] = [];
    for (let i = 0; i < maxCols; i++) {
      alignments.push(i % 2 === 0 ? 'AlignRight' : 'AlignLeft');
    }
    
    return { type: 'EArray', alignments, lines };
  }

  private parseArrayLine(): Exp[][] {
    const cells: Exp[][] = [];
    let currentCell: Exp[] = [];
    
    while (true) {
      this.skipIgnorable();
      
      if (this.peek() === '&') {
        cells.push(currentCell);
        currentCell = [];
        this.advance();
        continue;
      }
      
      if (this.match('\\\\') || this.peek() === null) {
        cells.push(currentCell);
        break;
      }
      
      // Check for \end
      const savedPos = this.pos;
      const cmd = this.readControlSequence();
      if (cmd === '\\end') {
        this.pos = savedPos;
        cells.push(currentCell);
        break;
      }
      this.pos = savedPos;
      
      const exp = this.parseExpr();
      if (exp) {
        currentCell.push(exp);
      } else {
        break;
      }
    }
    
    return cells;
  }

  private parseHSpace(): Exp | null {
    const width = this.readBraces(() => {
      // Parse dimension like "1em" or "2pt"
      const start = this.pos;
      while (this.peek() && this.peek() !== '}') {
        this.advance();
      }
      return this.input.substring(start, this.pos);
    });
    
    if (width) {
      // Simple conversion - just use a default space
      return { type: 'ESpace', width: 0.33 };
    }
    return null;
  }

  private parseOperator(): Exp | null {
    this.skipIgnorable();
    
    // Try multi-character operators first
    for (const op of ["''''", "'''", "''", "'"]) {
      if (this.input.substr(this.pos, op.length) === op) {
        this.advance(op.length);
        this.skipIgnorable();
        return operators[op];
      }
    }
    
    // Try single character operators
    const char = this.peek();
    if (char && char in operators) {
      this.advance();
      this.skipIgnorable();
      return operators[char];
    }
    
    return null;
  }

  private parseEnclosure(): Exp | null {
    const char = this.peek();
    if (char && '()[]|'.includes(char)) {
      const key = char;
      if (key in enclosures) {
        this.advance();
        this.skipIgnorable();
        return enclosures[key];
      }
    }
    return null;
  }

  private parseSubSup(base: Exp): Exp | null {
    this.skipIgnorable();
    
    const char = this.peek();
    
    if (char === '_') {
      this.advance();
      this.skipIgnorable();
      const sub = this.parseExpr1();
      if (!sub) return null;
      
      this.skipIgnorable();
      if (this.peek() === '^') {
        this.advance();
        this.skipIgnorable();
        const sup = this.parseExpr1();
        if (sup) {
          return { type: 'ESubsup', base, subscript: sub, superscript: sup };
        }
      }
      
      return { type: 'ESub', base, subscript: sub };
    }
    
    if (char === '^') {
      this.advance();
      this.skipIgnorable();
      
      // Check for primes
      if (this.peek() === "'") {
        let primeCount = 0;
        while (this.peek() === "'") {
          primeCount++;
          this.advance();
        }
        const primeSymbol = primeCount === 1 ? '\u2032' :
                           primeCount === 2 ? '\u2033' :
                           primeCount === 3 ? '\u2034' : '\u2057';
        const sup: Exp = { type: 'ESymbol', symbolType: 'Pun', value: primeSymbol };
        
        this.skipIgnorable();
        if (this.peek() === '_') {
          this.advance();
          this.skipIgnorable();
          const sub = this.parseExpr1();
          if (sub) {
            return { type: 'ESubsup', base, subscript: sub, superscript: sup };
          }
        }
        
        return { type: 'ESuper', base, superscript: sup };
      }
      
      const sup = this.parseExpr1();
      if (!sup) return null;
      
      this.skipIgnorable();
      if (this.peek() === '_') {
        this.advance();
        this.skipIgnorable();
        const sub = this.parseExpr1();
        if (sub) {
          return { type: 'ESubsup', base, subscript: sub, superscript: sup };
        }
      }
      
      return { type: 'ESuper', base, superscript: sup };
    }
    
    return null;
  }
}

export function readTeX(input: string): Exp[] {
  const parser = new Parser(input);
  return parser.parse();
}
