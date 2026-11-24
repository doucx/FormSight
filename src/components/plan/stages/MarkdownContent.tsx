import type { ComponentChildren } from 'preact';
import {
  type InlineToken,
  type MarkdownBlock,
  parseInlineMarkdown,
  parseMarkdownBlocks,
} from '../../../utils/markdown';

function renderInlineTokens(tokens: InlineToken[]): ComponentChildren[] {
  return tokens.map((token) => {
    if (token.type === 'strong') {
      return <strong className="font-black text-foreground">{token.text}</strong>;
    }
    if (token.type === 'em') {
      return <em className="italic">{token.text}</em>;
    }
    if (token.type === 'code') {
      return (
        <code className="font-mono text-[0.9em] bg-muted border border-border/60 rounded-md px-1 py-0.5">
          {token.text}
        </code>
      );
    }
    return token.text;
  });
}

function renderBlock(block: MarkdownBlock, key: number): ComponentChildren {
  if (block.type === 'heading') {
    const className =
      block.level === 1
        ? 'text-xl sm:text-2xl font-black text-foreground tracking-tight'
        : block.level === 2
          ? 'text-lg font-black text-foreground tracking-tight'
          : 'text-sm font-bold text-foreground';
    return (
      <div key={key} className={className}>
        {renderInlineTokens(parseInlineMarkdown(block.text))}
      </div>
    );
  }

  if (block.type === 'list') {
    const ListTag = block.ordered ? 'ol' : 'ul';
    return (
      <ListTag key={key} className="space-y-1.5 pl-5 list-outside">
        {block.items.map((item, idx) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: list items are static text from the stage content
            key={idx}
            className={`text-sm leading-relaxed text-muted-foreground ${
              block.ordered ? 'list-decimal' : 'list-disc'
            }`}
          >
            {renderInlineTokens(parseInlineMarkdown(item))}
          </li>
        ))}
      </ListTag>
    );
  }

  if (block.type === 'quote') {
    return (
      <blockquote
        key={key}
        className="border-l-2 border-primary/60 pl-3 text-sm leading-relaxed text-muted-foreground italic whitespace-pre-line"
      >
        {renderInlineTokens(parseInlineMarkdown(block.text))}
      </blockquote>
    );
  }

  if (block.type === 'divider') {
    return <hr key={key} className="border-border/60" />;
  }

  return (
    <p key={key} className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
      {renderInlineTokens(parseInlineMarkdown(block.text))}
    </p>
  );
}

interface MarkdownContentProps {
  content: string;
}

/** 渲染提示页的轻量 Markdown 子集（纯文本节点，不注入 HTML）。 */
export function MarkdownContent({ content }: MarkdownContentProps) {
  const blocks = parseMarkdownBlocks(content);
  return <div className="space-y-3">{blocks.map(renderBlock)}</div>;
}
