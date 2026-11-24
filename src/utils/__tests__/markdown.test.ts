import { describe, expect, it } from 'vitest';
import { parseInlineMarkdown, parseMarkdownBlocks } from '../markdown';

describe('markdown subset parser', () => {
  it('解析标题、段落、无序列表与引用', () => {
    const blocks = parseMarkdownBlocks(
      ['# 标题', '', '第一段', '第二行', '', '- 项目一', '- 项目二', '', '> 引用'].join('\n'),
    );

    expect(blocks).toEqual([
      { type: 'heading', level: 1, text: '标题' },
      { type: 'paragraph', text: '第一段\n第二行' },
      { type: 'list', ordered: false, items: ['项目一', '项目二'] },
      { type: 'quote', text: '引用' },
    ]);
  });

  it('解析有序列表与分隔线', () => {
    const blocks = parseMarkdownBlocks('1. 一\n2. 二\n\n---');

    expect(blocks).toEqual([
      { type: 'list', ordered: true, items: ['一', '二'] },
      { type: 'divider' },
    ]);
  });

  it('列表类型切换会拆分为两个块', () => {
    const blocks = parseMarkdownBlocks('- 无序\n1. 有序');

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ type: 'list', ordered: false });
    expect(blocks[1]).toMatchObject({ type: 'list', ordered: true });
  });

  it('解析行内加粗、斜体与代码', () => {
    expect(parseInlineMarkdown('前 **粗** 中 *斜* 后 `码`')).toEqual([
      { type: 'text', text: '前 ' },
      { type: 'strong', text: '粗' },
      { type: 'text', text: ' 中 ' },
      { type: 'em', text: '斜' },
      { type: 'text', text: ' 后 ' },
      { type: 'code', text: '码' },
    ]);
  });

  it('未闭合标记按纯文本处理', () => {
    expect(parseInlineMarkdown('**未闭合')).toEqual([{ type: 'text', text: '**未闭合' }]);
  });

  it('不把 HTML 当结构解析，原样保留为文本', () => {
    const blocks = parseMarkdownBlocks('<img src=x onerror=alert(1)>');

    expect(blocks).toEqual([{ type: 'paragraph', text: '<img src=x onerror=alert(1)>' }]);
  });
});
