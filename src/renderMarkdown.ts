import rehypeRaw from 'rehype-raw';
import rehypeSanitize, {
  defaultSchema,
  type Options,
} from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

const schema: Options = {
  ...defaultSchema,

  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'details',
    'summary',
    'span',
  ],

  attributes: {
    ...(defaultSchema.attributes ?? {}),

    '*': [
      ...(defaultSchema.attributes?.['*'] ?? []),
      'className',
      'id',
      'title',
    ],

    a: [
      ...(defaultSchema.attributes?.a ?? []),
      'target',
      'rel',
    ],
  },
};

export const renderMarkdown = async (
  markdown: string,
): Promise<string> => {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkRehype, {
      allowDangerousHtml: true,
    })
    .use(rehypeRaw)
    .use(rehypeSanitize, schema)
    .use(rehypeStringify)
    .process(markdown);

  return String(file);
};
