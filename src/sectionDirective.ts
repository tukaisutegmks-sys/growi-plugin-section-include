import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

type DirectiveNode = {
  type: string;
  name?: string;
  attributes?: Record<string, string | null | undefined>;
  children?: Array<{ value?: string }>;
  data?: {
    hName?: string;
    hChildren?: Array<{ type: string; value: string }>;
    hProperties?: Record<string, unknown>;
  };
};

const boolValue = (value: string | null | undefined, defaultValue = false): boolean => {
  if (value == null) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const sectionDirectivePlugin: Plugin = () => {
  return (tree: unknown) => {
    visit(tree as any, 'leafDirective', (node: DirectiveNode) => {
      if (node.name !== 'section') return;

      const path = node.children?.[0]?.value?.trim() ?? '';
      const heading = node.attributes?.heading?.trim() || '気づき・全体メモ';
      const includeHeading = boolValue(node.attributes?.includeHeading, false);

      const data = node.data ?? (node.data = {});
      data.hName = 'a';
      data.hChildren = [{
        type: 'text',
        value: path || 'section',
      }];
      data.hProperties = {
        href: path || '#',
        title: JSON.stringify({
          sectionInclude: true,
          path,
          heading,
          includeHeading,
        }),
      };
    });
  };
};
