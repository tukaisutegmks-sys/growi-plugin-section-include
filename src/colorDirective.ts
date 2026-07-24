const COLOR_NAMES = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'gray',
] as const;

type ColorName = typeof COLOR_NAMES[number];

type MarkdownNode = {
  type?: string;
  name?: string;
  url?: string;
  attributes?: Record<
    string,
    string | null | undefined
  >;
  children?: MarkdownNode[];
};

const isColorName = (
  value: string,
): value is ColorName => {
  return (
    COLOR_NAMES as readonly string[]
  ).includes(value);
};

/*
 * :color[文字]{name="red"}
 *
 * を内部的に、
 *
 * [文字](growi-color:red)
 *
 * と同等のリンクノードへ変換する。
 *
 * 通常のa要素としてMarkdownレンダラーを通すことで、
 * HTMLサニタイズによって色指定が消されるのを避ける。
 */
export const colorDirectivePlugin = () => {
  return (tree: MarkdownNode): void => {
    const walk = (
      node: MarkdownNode,
    ): void => {
      if (
        node.type === 'textDirective'
        && node.name === 'color'
      ) {
        const requestedColor =
          node.attributes?.name
            ?.trim()
            .toLowerCase()
          ?? '';

        if (isColorName(requestedColor)) {
          node.type = 'link';
          node.url =
            `growi-color:${requestedColor}`;

          delete node.name;
          delete node.attributes;
        }
      }

      for (
        const child of node.children ?? []
      ) {
        walk(child);
      }
    };

    walk(tree);
  };
};
