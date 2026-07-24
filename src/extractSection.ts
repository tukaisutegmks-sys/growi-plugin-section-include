export type ExtractSectionOptions = {
  includeHeading?: boolean;
};

const stripInlineMarkdown = (value: string): string => {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/\\([#*_~`])/g, '$1');
};

export const normalizeHeading = (value: string): string => {
  return stripInlineMarkdown(value)
    .normalize('NFKC')
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/[\s　]+/g, '')
    .replace(/[：:]+$/g, '')
    .trim();
};

export const extractSection = (
  markdown: string,
  targetHeading: string,
  options: ExtractSectionOptions = {},
): string | null => {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const normalizedTarget = normalizeHeading(targetHeading);

  let fenced = false;
  let fenceMarker = '';
  let startIndex = -1;
  let headingLevel = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^\s*(```+|~~~+)/);
    if (fenceMatch != null) {
      const marker = fenceMatch[1][0];
      if (!fenced) {
        fenced = true;
        fenceMarker = marker;
      }
      else if (marker === fenceMarker) {
        fenced = false;
        fenceMarker = '';
      }
      continue;
    }
    if (fenced) continue;

    const headingMatch = line.match(/^\s{0,3}(#{1,6})[\t ]+(.+?)[\t ]*#*[\t ]*$/);
    if (headingMatch == null) continue;

    const level = headingMatch[1].length;
    const text = headingMatch[2];

    if (startIndex < 0) {
      if (normalizeHeading(text) === normalizedTarget) {
        startIndex = options.includeHeading === true ? index : index + 1;
        headingLevel = level;
      }
      continue;
    }

    if (level <= headingLevel) {
      return lines.slice(startIndex, index).join('\n').trim();
    }
  }

  if (startIndex >= 0) {
    return lines.slice(startIndex).join('\n').trim();
  }

  return null;
};
