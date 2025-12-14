/**
 * OMML Writer
 * Port of Text.TeXMath.Writers.OMML from Haskell
 * Converts expression AST to Office Math Markup Language (OMML) XML
 */

import type { Exp, DisplayType, InEDelimited, TextType, Alignment, StrokeType } from './types';

interface XMLNode {
  tag: string;
  attrs?: Record<string, string>;
  children: (XMLNode | string)[];
}

function createNode(tag: string, attrs: Record<string, string> = {}, children: (XMLNode | string)[] = []): XMLNode {
  return { tag: `m:${tag}`, attrs, children };
}

function createNodeWithVal(tag: string, val: string, children: (XMLNode | string)[] = []): XMLNode {
  return createNode(tag, { 'm:val': val }, children);
}

function nodeToString(node: XMLNode | string, indent: number = 0): string {
  if (typeof node === 'string') {
    return node;
  }
  
  const spaces = '  '.repeat(indent);
  const attrs = Object.entries(node.attrs || {})
    .map(([k, v]) => ` ${k}="${escapeXml(v)}"`)
    .join('');
  
  if (node.children.length === 0) {
    return `${spaces}<${node.tag}${attrs}/>`;
  }
  
  const hasOnlyText = node.children.length === 1 && typeof node.children[0] === 'string';
  
  if (hasOnlyText) {
    return `${spaces}<${node.tag}${attrs}>${escapeXml(node.children[0] as string)}</${node.tag}>`;
  }
  
  const childrenStr = node.children
    .map(child => nodeToString(child, indent + 1))
    .join('\n');
    
  return `${spaces}<${node.tag}${attrs}>\n${childrenStr}\n${spaces}</${node.tag}>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function str(props: XMLNode[], text: string): XMLNode {
  if (props.length === 0) {
    return createNode('r', {}, [
      createNode('t', {}, [text])
    ]);
  }
  
  return createNode('r', {}, [
    createNode('rPr', {}, props),
    createNode('t', {}, [text])
  ]);
}

function setProps(textType: TextType): XMLNode[] {
  const sty = (val: string) => createNodeWithVal('sty', val);
  const scr = (val: string) => createNodeWithVal('scr', val);
  
  switch (textType) {
    case 'TextNormal': return [sty('p')];
    case 'TextBold': return [sty('b')];
    case 'TextItalic': return [sty('i')];
    case 'TextMonospace': return [scr('monospace'), sty('p')];
    case 'TextSansSerif': return [scr('sans-serif'), sty('p')];
    case 'TextDoubleStruck': return [scr('double-struck'), sty('p')];
    case 'TextScript': return [scr('script'), sty('p')];
    case 'TextFraktur': return [scr('fraktur'), sty('p')];
    case 'TextBoldItalic': return [sty('bi')];
    case 'TextSansSerifBold': return [scr('sans-serif'), sty('b')];
    case 'TextBoldScript': return [scr('script'), sty('b')];
    case 'TextBoldFraktur': return [scr('fraktur'), sty('b')];
    case 'TextSansSerifItalic': return [scr('sans-serif'), sty('i')];
    case 'TextSansSerifBoldItalic': return [scr('sans-serif'), sty('bi')];
  }
}

function defaultTo(textType: TextType, props: XMLNode[]): XMLNode[] {
  return props.length === 0 ? setProps(textType) : props;
}

function isBarChar(char: string): boolean {
  return char === '\u203E' || char === '\u00AF' || 
         char === '\u0304' || char === '\u0333' || char === '_';
}

function isNary(exp: Exp): boolean {
  if (exp.type !== 'ESymbol' || exp.symbolType !== 'Op') return false;
  
  const narySymbols = [
    '\u222B', // integral
    '\u222C', // double integral
    '\u222D', // triple integral
    '\u222E', // contour integral
    '\u222F', // surface integral
    '\u2230', // volume integral
    '\u220F', // product
    '\u2210', // coproduct
    '\u2211', // sum
  ];
  
  return narySymbols.includes(exp.value);
}

function showExp(props: XMLNode[], exp: Exp): XMLNode[] {
  switch (exp.type) {
    case 'ENumber':
      return [str(props, exp.value)];
      
    case 'EGrouped':
      if (exp.value.length === 0) {
        return [str(props, '\u200B')]; // Zero-width space
      }
      
      // Check for special nary patterns
      if (exp.value.length === 2) {
        const [first, second] = exp.value;
        
        if (first.type === 'EUnderover' && isNary(first.base)) {
          return [makeNary(props, 'undOvr', first.base.type === 'ESymbol' ? first.base.value : '', 
                          first.under, first.over, second)];
        }
        
        if (first.type === 'ESubsup' && isNary(first.base)) {
          return [makeNary(props, 'subSup', first.base.type === 'ESymbol' ? first.base.value : '',
                          first.subscript, first.superscript, second)];
        }
      }
      
      return exp.value.flatMap(e => showExp(props, e));
      
    case 'EDelimited': {
      const separators = exp.content.filter(item => item.type === 'Left').map(item => item.value);
      const sepChr = separators.length > 0 ? separators[0] : '';
      
      const elements = [];
      let currentGroup: Exp[] = [];
      
      for (const item of exp.content) {
        if (item.type === 'Left') {
          if (currentGroup.length > 0) {
            elements.push(currentGroup);
            currentGroup = [];
          }
        } else {
          currentGroup.push(item.value);
        }
      }
      if (currentGroup.length > 0) {
        elements.push(currentGroup);
      }
      
      return [createNode('d', {}, [
        createNode('dPr', {}, [
          createNodeWithVal('begChr', exp.open),
          createNodeWithVal('sepChr', sepChr),
          createNodeWithVal('endChr', exp.close),
          createNode('grow', {})
        ]),
        ...elements.map(group => 
          createNode('e', {}, group.flatMap(e => showExp(props, e)))
        )
      ])];
    }
    
    case 'EIdentifier':
      if (exp.value === '') {
        return [str(props, '\u200B')];
      }
      // Check if uppercase Greek
      if (isUppercaseGreek(exp.value) && props.length === 0) {
        return [str([createNodeWithVal('sty', 'p')], exp.value)];
      }
      return [str(props, exp.value)];
      
    case 'EMathOperator':
      return [str([createNodeWithVal('sty', 'p'), ...props], exp.value)];
      
    case 'ESymbol': {
      const isSymbolOrPunct = exp.value.length === 1 && 
        /[^\w\s]/.test(exp.value);
      
      if (isSymbolOrPunct) {
        return [str(defaultTo('TextNormal', props), exp.value)];
      }
      
      if (['Op', 'Bin', 'Rel'].includes(exp.symbolType)) {
        return [createNode('box', {}, [
          createNode('boxPr', {}, [
            createNodeWithVal('opEmu', 'on')
          ]),
          createNode('e', {}, [
            str(defaultTo('TextNormal', props), exp.value)
          ])
        ])];
      }
      
      return [str(defaultTo('TextNormal', props), exp.value)];
    }
    
    case 'ESpace': {
      const width = exp.width;
      let spaceChar = '\u200B'; // zero-width space
      
      if (width > 0 && width <= 0.17) spaceChar = '\u2009'; // thin space
      else if (width > 0.17 && width <= 0.23) spaceChar = '\u2005'; // four-per-em space
      else if (width > 0.23 && width <= 0.28) spaceChar = '\u2004'; // three-per-em space
      else if (width > 0.28 && width <= 0.5) spaceChar = '\u2004';
      else if (width > 0.5 && width <= 1.8) spaceChar = '\u2001'; // em space
      else if (width > 1.8) spaceChar = '\u2001\u2001';
      
      return [str(props, spaceChar)];
    }
    
    case 'EUnder':
      if (exp.under.type === 'ESymbol' && exp.under.symbolType === 'TUnder' && 
          isBarChar(exp.under.value)) {
        return [createNode('bar', {}, [
          createNode('barPr', {}, [
            createNodeWithVal('pos', 'bot')
          ]),
          createNode('e', {}, showExp(props, exp.base))
        ])];
      }
      
      if (exp.under.type === 'ESymbol' && exp.under.symbolType === 'TUnder') {
        return [createNode('groupChr', {}, [
          createNode('groupChrPr', {}, [
            createNodeWithVal('chr', exp.under.value),
            createNodeWithVal('pos', 'bot'),
            createNodeWithVal('vertJc', 'top')
          ]),
          createNode('e', {}, showExp(props, exp.base))
        ])];
      }
      
      return [createNode('limLow', {}, [
        createNode('e', {}, showExp(props, exp.base)),
        createNode('lim', {}, showExp(props, exp.under))
      ])];
      
    case 'EOver':
      if (exp.over.type === 'ESymbol' && exp.over.symbolType === 'TOver' && 
          isBarChar(exp.over.value)) {
        return [createNode('bar', {}, [
          createNode('barPr', {}, [
            createNodeWithVal('pos', 'top')
          ]),
          createNode('e', {}, showExp(props, exp.base))
        ])];
      }
      
      if (exp.over.type === 'ESymbol' && exp.over.symbolType === 'Accent') {
        return [createNode('acc', {}, [
          createNode('accPr', {}, [
            createNodeWithVal('chr', exp.over.value)
          ]),
          createNode('e', {}, showExp(props, exp.base))
        ])];
      }
      
      if (exp.over.type === 'ESymbol' && exp.over.symbolType === 'TOver') {
        return [createNode('groupChr', {}, [
          createNode('groupChrPr', {}, [
            createNodeWithVal('chr', exp.over.value),
            createNodeWithVal('pos', 'top'),
            createNodeWithVal('vertJc', 'bot')
          ]),
          createNode('e', {}, showExp(props, exp.base))
        ])];
      }
      
      return [createNode('limUpp', {}, [
        createNode('e', {}, showExp(props, exp.base)),
        createNode('lim', {}, showExp(props, exp.over))
      ])];
      
    case 'EUnderover': {
      const underExp: Exp = { type: 'EUnder', convertible: exp.convertible, base: exp.base, under: exp.under };
      const overUnder: Exp = { type: 'EOver', convertible: exp.convertible, base: underExp, over: exp.over };
      return showExp(props, overUnder);
    }
    
    case 'ESub':
      return [createNode('sSub', {}, [
        createNode('e', {}, showExp(props, exp.base)),
        createNode('sub', {}, showExp(props, exp.subscript))
      ])];
      
    case 'ESuper':
      return [createNode('sSup', {}, [
        createNode('e', {}, showExp(props, exp.base)),
        createNode('sup', {}, showExp(props, exp.superscript))
      ])];
      
    case 'ESubsup':
      return [createNode('sSubSup', {}, [
        createNode('e', {}, showExp(props, exp.base)),
        createNode('sub', {}, showExp(props, exp.subscript)),
        createNode('sup', {}, showExp(props, exp.superscript))
      ])];
      
    case 'ESqrt':
      return [createNode('rad', {}, [
        createNode('radPr', {}, [
          createNodeWithVal('degHide', 'on')
        ]),
        createNode('deg', {}),
        createNode('e', {}, showExp(props, exp.value))
      ])];
      
    case 'ERoot':
      return [createNode('rad', {}, [
        createNode('deg', {}, showExp(props, exp.index)),
        createNode('e', {}, showExp(props, exp.base))
      ])];
      
    case 'EFraction':
      return [showFraction(props, exp.fractionType, exp.numerator, exp.denominator)];
      
    case 'EPhantom':
      return [createNode('phant', {}, [
        createNode('phantPr', {}, [
          createNodeWithVal('show', 'off')
        ]),
        createNode('e', {}, showExp(props, exp.value))
      ])];
      
    case 'EBoxed':
      return [createNode('borderBox', {}, [
        createNode('e', {}, showExp(props, exp.value))
      ])];
      
    case 'ECancel':
      return [makeCancel(props, exp.strokeType, exp.value)];
      
    case 'EScaled':
      return showExp(props, exp.value); // No direct support for scaled in OMML
      
    case 'EArray':
      return [makeArray(props, exp.alignments, exp.lines)];
      
    case 'EText':
      return [makeText(exp.textType, exp.value)];
      
    case 'EStyled':
      return exp.value.flatMap(e => showExp(setProps(exp.textType), e));
  }
}

function showFraction(props: XMLNode[], fractionType: string, numerator: Exp, denominator: Exp): XMLNode {
  const numChildren = showExp(props, numerator);
  const denChildren = showExp(props, denominator);
  
  let typeVal = 'bar';
  if (fractionType === 'InlineFrac') typeVal = 'lin';
  else if (fractionType === 'NoLineFrac') typeVal = 'noBar';
  
  return createNode('f', {}, [
    createNode('fPr', {}, [
      createNodeWithVal('type', typeVal)
    ]),
    createNode('num', {}, numChildren),
    createNode('den', {}, denChildren)
  ]);
}

function makeArray(props: XMLNode[], alignments: Alignment[], lines: Exp[][][]): XMLNode {
  const mProps = createNode('mPr', {}, [
    createNodeWithVal('baseJc', 'center'),
    createNodeWithVal('plcHide', 'on'),
    createNode('mcs', {}, alignments.map(align => {
      const alignStr = align === 'AlignLeft' ? 'left' :
                      align === 'AlignRight' ? 'right' : 'center';
      return createNode('mc', {}, [
        createNode('mcPr', {}, [
          createNodeWithVal('mcJc', alignStr),
          createNodeWithVal('count', '1')
        ])
      ]);
    }))
  ]);
  
  const rows = lines.map(line =>
    createNode('mr', {}, line.map(cell =>
      createNode('e', {}, cell.flatMap(e => showExp(props, e)))
    ))
  );
  
  return createNode('m', {}, [mProps, ...rows]);
}

function makeText(textType: TextType, text: string): XMLNode {
  return str([createNode('nor', {}), ...setProps(textType)], text);
}

function makeNary(props: XMLNode[], limLoc: string, symbol: string, 
                  sub: Exp, sup: Exp, base: Exp): XMLNode {
  const subHide = sub.type === 'EGrouped' && sub.value.length === 0 ? 'on' : 'off';
  const supHide = sup.type === 'EGrouped' && sup.value.length === 0 ? 'on' : 'off';
  
  return createNode('nary', {}, [
    createNode('naryPr', {}, [
      createNodeWithVal('chr', symbol),
      createNodeWithVal('limLoc', limLoc),
      createNodeWithVal('subHide', subHide),
      createNodeWithVal('supHide', supHide)
    ]),
    createNode('sub', {}, showExp(props, sub)),
    createNode('sup', {}, showExp(props, sup)),
    createNode('e', {}, showExp(props, base))
  ]);
}

function makeCancel(props: XMLNode[], strokeType: StrokeType, exp: Exp): XMLNode {
  const strokes = [];
  if (strokeType === 'ForwardSlash' || strokeType === 'XSlash') {
    strokes.push(createNodeWithVal('strikeBLTR', '1'));
  }
  if (strokeType === 'BackSlash' || strokeType === 'XSlash') {
    strokes.push(createNodeWithVal('strikeTLBR', '1'));
  }
  
  return createNode('borderBox', {}, [
    createNode('borderBoxPr', {}, [
      createNodeWithVal('hideTop', '1'),
      createNodeWithVal('hideBot', '1'),
      createNodeWithVal('hideLeft', '1'),
      createNodeWithVal('hideRight', '1'),
      ...strokes
    ]),
    createNode('e', {}, showExp(props, exp))
  ]);
}

function isUppercaseGreek(char: string): boolean {
  const uppercaseGreek = [
    '\u0393', '\u0394', '\u0398', '\u039B', '\u039E', 
    '\u03A0', '\u03A3', '\u03A5', '\u03A6', '\u03A8', '\u03A9'
  ];
  return uppercaseGreek.includes(char);
}

function handleDownup(dt: DisplayType, exps: Exp[]): Exp[] {
  const result: Exp[] = [];
  
  for (let i = 0; i < exps.length; i++) {
    const exp = exps[i];
    const next = i + 1 < exps.length ? exps[i + 1] : { type: 'EGrouped' as const, value: [] };
    
    if (exp.type === 'EOver' && isNary(exp.base)) {
      result.push({
        type: 'EGrouped',
        value: [
          { type: 'EUnderover', convertible: exp.convertible, base: exp.base, 
            under: { type: 'EGrouped', value: [] }, over: exp.over },
          next
        ]
      });
      i++; // Skip next
    } else if (exp.type === 'EUnder' && isNary(exp.base)) {
      result.push({
        type: 'EGrouped',
        value: [
          { type: 'EUnderover', convertible: exp.convertible, base: exp.base,
            under: exp.under, over: { type: 'EGrouped', value: [] } },
          next
        ]
      });
      i++;
    } else if (exp.type === 'EUnderover' && isNary(exp.base)) {
      result.push({
        type: 'EGrouped',
        value: [exp, next]
      });
      i++;
    } else if (exp.type === 'ESub' && isNary(exp.base)) {
      result.push({
        type: 'EGrouped',
        value: [
          { type: 'ESubsup', base: exp.base, subscript: exp.subscript,
            superscript: { type: 'EGrouped', value: [] } },
          next
        ]
      });
      i++;
    } else if (exp.type === 'ESuper' && isNary(exp.base)) {
      result.push({
        type: 'EGrouped',
        value: [
          { type: 'ESubsup', base: exp.base, 
            subscript: { type: 'EGrouped', value: [] }, superscript: exp.superscript },
          next
        ]
      });
      i++;
    } else if (exp.type === 'ESubsup' && isNary(exp.base)) {
      result.push({
        type: 'EGrouped',
        value: [exp, next]
      });
      i++;
    } else {
      result.push(exp);
    }
  }
  
  return result;
}

export function writeOMML(dt: DisplayType, exps: Exp[]): string {
  // Handle nary operators
  const processedExps = handleDownup(dt, exps);
  
  // Convert to XML nodes
  const nodes = processedExps.flatMap(e => showExp([], e));
  
  // Wrap in appropriate container
  let root: XMLNode;
  if (dt === 'DisplayBlock') {
    root = createNode('oMathPara', {}, [
      createNode('oMathParaPr', {}, [
        createNodeWithVal('jc', 'center')
      ]),
      createNode('oMath', {}, nodes)
    ]);
  } else {
    root = createNode('oMath', {}, nodes);
  }
  
  return nodeToString(root, 0);
}
