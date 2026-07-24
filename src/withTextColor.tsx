import type React from 'react';

const COLOR_PREFIX =
  '#growi-color-';

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

const getColorName = (
  href: string,
): ColorName | null => {
  if (!href.startsWith(COLOR_PREFIX)) {
    return null;
  }

  const colorName = href
    .slice(COLOR_PREFIX.length)
    .split(/[?#&/]/, 1)[0]
    .trim()
    .toLowerCase();

  return isColorName(colorName)
    ? colorName
    : null;
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

    if (typeof href === 'string') {
      const colorName =
        getColorName(href);

      if (colorName != null) {
        return (
          <span
            className={[
              'growi-text-color',
              `growi-text-color-${colorName}`,
            ].join(' ')}
            data-growi-text-color={
              colorName
            }
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
