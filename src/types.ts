/**
 * Types for representing mathematical expressions (AST)
 * Port of Text.TeXMath.Types from Haskell
 */

export type TeXSymbolType = 
  | 'Ord'      // Ordinary
  | 'Op'       // Operator
  | 'Bin'      // Binary operator
  | 'Rel'      // Relation
  | 'Open'     // Opening delimiter
  | 'Close'    // Closing delimiter
  | 'Pun'      // Punctuation
  | 'Accent'   // Accent
  | 'Fence'    // Fence
  | 'TOver'    // Over bar
  | 'TUnder'   // Under bar
  | 'Alpha'    // Alphabetic
  | 'BotAccent' // Bottom accent
  | 'Rad';     // Radical

export type Alignment = 'AlignLeft' | 'AlignCenter' | 'AlignRight';

export type FractionType = 
  | 'NormalFrac'   // Displayed or textual, according to DisplayType
  | 'DisplayFrac'  // Force display mode
  | 'InlineFrac'   // Force inline mode (textual)
  | 'NoLineFrac';  // No line between top and bottom

export type StrokeType = 'ForwardSlash' | 'BackSlash' | 'XSlash';

export type ArrayLine = Exp[][];

export type TextType =
  | 'TextNormal'
  | 'TextBold'
  | 'TextItalic'
  | 'TextMonospace'
  | 'TextSansSerif'
  | 'TextDoubleStruck'
  | 'TextScript'
  | 'TextFraktur'
  | 'TextBoldItalic'
  | 'TextSansSerifBold'
  | 'TextSansSerifBoldItalic'
  | 'TextBoldScript'
  | 'TextBoldFraktur'
  | 'TextSansSerifItalic';

export type DisplayType = 'DisplayBlock' | 'DisplayInline';

export type InEDelimited = { type: 'Left', value: string } | { type: 'Right', value: Exp };

/**
 * Main expression type representing mathematical formulas
 */
export type Exp =
  | { type: 'ENumber', value: string }
  | { type: 'EGrouped', value: Exp[] }
  | { type: 'EDelimited', open: string, close: string, content: InEDelimited[] }
  | { type: 'EIdentifier', value: string }
  | { type: 'EMathOperator', value: string }
  | { type: 'ESymbol', symbolType: TeXSymbolType, value: string }
  | { type: 'ESpace', width: number }
  | { type: 'ESub', base: Exp, subscript: Exp }
  | { type: 'ESuper', base: Exp, superscript: Exp }
  | { type: 'ESubsup', base: Exp, subscript: Exp, superscript: Exp }
  | { type: 'EOver', convertible: boolean, base: Exp, over: Exp }
  | { type: 'EUnder', convertible: boolean, base: Exp, under: Exp }
  | { type: 'EUnderover', convertible: boolean, base: Exp, under: Exp, over: Exp }
  | { type: 'EPhantom', value: Exp }
  | { type: 'EBoxed', value: Exp }
  | { type: 'ECancel', strokeType: StrokeType, value: Exp }
  | { type: 'EFraction', fractionType: FractionType, numerator: Exp, denominator: Exp }
  | { type: 'ERoot', index: Exp, base: Exp }
  | { type: 'ESqrt', value: Exp }
  | { type: 'EScaled', scale: number, value: Exp }
  | { type: 'EArray', alignments: Alignment[], lines: ArrayLine }
  | { type: 'EText', textType: TextType, value: string }
  | { type: 'EStyled', textType: TextType, value: Exp[] };
