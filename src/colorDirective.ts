const COLOR_NAMES = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'gray',
] as const;

type ColorName =
  typeof COLOR_NAMES[number];

type MarkdownNode = {
  type?: string;
  name?: string;

  attributes?: Record<
    string,
    string | null | undefined
  >;

  data?: {
    hName?: string;
    hProperties?: Record<
      string,
      unknown
    >;
  };

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
 * :color[重要]{name="yellow"}
 *
 * ↓
 *
 * <a href="#growi-color-yellow">
 *   重要
 * </a>
 *
 * このa要素はwithTextColor側で
 * 色付きspanへ変換される。
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
          const data =
            node.data
            ?? (node.data = {});

          data.hName = 'a';

          data.hProperties = {
            ...(data.hProperties ?? {}),
            href:
              `#growi-color-${requestedColor}`,
          };
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
