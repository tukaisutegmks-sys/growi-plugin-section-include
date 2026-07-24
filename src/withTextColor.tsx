import type React from 'react';

const COLOR_PREFIX = 'growi-color:';

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

type AnchorProps = {
  href?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
};

const isColorName = (
  value: string,
): value is ColorName => {
  return (
    COLOR_NAMES as readonly string[]
  ).includes(value);
};

export const withTextColor = (
  Anchor: React.ComponentType<any>,
): React.ComponentType<any> => {
  const TextColorAnchor = (
    props: AnchorProps,
  ): React.ReactElement => {
    const {
      href,
      children,
      ...anchorProps
    } = props;

    if (
      typeof href === 'string'
      && href.startsWith(COLOR_PREFIX)
    ) {
      const colorName = href
        .slice(COLOR_PREFIX.length)
        .trim()
        .toLowerCase();

      if (isColorName(colorName)) {
        return (
          <span
            className={[
              'growi-text-color',
              `growi-text-color-${colorName}`,
            ].join(' ')}
          >
            {children}
          </span>
        );
      }
    }

    return (
      <Anchor
        {...anchorProps}
        href={href}
      >
        {children}
      </Anchor>
    );
  };

  return TextColorAnchor;
};
