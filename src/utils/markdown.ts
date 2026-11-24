export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'divider' };

export type InlineTokenType = 'text' | 'strong' | 'em' | 'code';

export interface InlineToken {
  type: InlineTokenType;
  text: string;
}

const INLINE_PATTERN = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*|_[^_\n]+_)/g;

/**
 * 解析提示页使用的 Markdown 子集：
 * `#`/`##`/`###` 标题、`-`/`1.` 列表、`>` 引用、`---` 分隔线、
 * 以及行内 `**加粗**`、`*斜体*`/`_斜体_`、`` `代码` ``。
 */
export function parseInlineMarkdown(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];

  for (const part of text.split(INLINE_PATTERN)) {
    if (!part) continue;

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      tokens.push({ type: 'strong', text: part.slice(2, -2) });
    } else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      tokens.push({ type: 'code', text: part.slice(1, -1) });
    } else if (
      ((part.startsWith('*') && part.endsWith('*')) ||
        (part.startsWith('_') && part.endsWith('_'))) &&
      part.length > 2
    ) {
      tokens.push({ type: 'em', text: part.slice(1, -1) });
    } else {
      tokens.push({ type: 'text', text: part });
    }
  }

  return tokens;
}

export function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];

  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let listOrdered = false;
  let quoteLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraphLines.join('\n') });
      paragraphLines = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: 'list', ordered: listOrdered, items: listItems });
      listItems = [];
    }
  };

  const flushQuote = () => {
    if (quoteLines.length > 0) {
      blocks.push({ type: 'quote', text: quoteLines.join('\n') });
      quoteLines = [];
    }
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushAll();
      blocks.push({
        type: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim(),
      });
      continue;
    }

    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      flushAll();
      blocks.push({ type: 'divider' });
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flushParagraph();
      flushList();
      quoteLines.push(quote[1]);
      continue;
    }

    const list = /^(?:(\d+)[.)]|([-*+]))\s+(.*)$/.exec(line);
    if (list) {
      flushParagraph();
      flushQuote();
      const ordered = Boolean(list[1]);
      if (listItems.length > 0 && listOrdered !== ordered) flushList();
      listOrdered = ordered;
      listItems.push(list[3].trim());
      continue;
    }

    flushList();
    flushQuote();
    paragraphLines.push(line);
  }

  flushAll();
  return blocks;
}
