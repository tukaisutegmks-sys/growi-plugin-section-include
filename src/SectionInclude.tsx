import React from 'react';

import { extractSection } from './extractSection';
import { renderMarkdown } from './renderMarkdown';

declare const growiFacade: {
  react: typeof React;
};

type SectionMeta = {
  sectionInclude?: boolean;
  path?: string;
  heading?: string;
  includeHeading?: boolean;
};

type PageResponse = {
  page?: {
    _id?: string;
    revision?: unknown;
    revisionBody?: string;
  };
  revision?: {
    body?: string;
  };
};

type SectionIncludeContentProps = {
  path: string;
  heading: string;
  includeHeading: boolean;
};

const readPageMarkdown = async(path: string): Promise<string> => {
  const response = await fetch(
    `/_api/v3/page?path=${encodeURIComponent(path)}`,
    {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `ページ取得に失敗しました（HTTP ${response.status}）`,
    );
  }

  const data = await response.json() as PageResponse;

  const body = data.revision?.body
    ?? data.page?.revisionBody
    ?? (
      typeof data.page?.revision === 'object'
      && data.page.revision != null
        ? (data.page.revision as { body?: string }).body
        : undefined
    );

  if (typeof body === 'string') {
    return body;
  }

  const pageId = data.page?._id;

  if (pageId != null) {
    const exportResponse = await fetch(
      `/_api/v3/page/export/${encodeURIComponent(pageId)}`,
      {
        credentials: 'same-origin',
      },
    );

    if (exportResponse.ok) {
      return exportResponse.text();
    }
  }

  throw new Error('ページ本文を取得できませんでした');
};

const parseMeta = (title: unknown): SectionMeta | null => {
  if (typeof title !== 'string') {
    return null;
  }

  try {
    const meta = JSON.parse(title) as SectionMeta;

    return meta.sectionInclude === true
      ? meta
      : null;
  }
  catch {
    return null;
  }
};

const SectionIncludeContent = ({
  path,
  heading,
  includeHeading,
}: SectionIncludeContentProps): React.ReactElement => {
  /*
   * GROWI本体が利用しているReactからHooksを取得する。
   * プラグイン側に別のReactを持たせないための処理。
   */
  const {
    useEffect,
    useState,
  } = growiFacade.react;

  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async(): Promise<void> => {
      setLoading(true);
      setError('');
      setHtml('');

      try {
        if (path === '') {
          throw new Error('参照先ページのパスが空です');
        }

        const markdown = await readPageMarkdown(path);

        const section = extractSection(
          markdown,
          heading,
          {
            includeHeading,
          },
        );

        if (section == null) {
          throw new Error(
            `見出し「${heading}」が見つかりません`,
          );
        }

        const rendered = await renderMarkdown(section);

        if (!cancelled) {
          setHtml(rendered);
        }
      }
      catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : String(err),
          );
        }
      }
      finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    path,
    heading,
    includeHeading,
  ]);

  if (loading) {
    return (
      <div
        className="
          growi-section-include
          growi-section-include-loading
        "
      >
        <span
          className="spinner-border spinner-border-sm"
          aria-hidden="true"
        />
        <span>メモを読み込み中…</span>
      </div>
    );
  }

  if (error !== '') {
    return (
      <div
        className="
          growi-section-include
          alert
          alert-warning
          py-2
        "
      >
        <strong>
          セクション参照エラー：
        </strong>

        {error}

        {path !== '' && (
          <div className="mt-1">
            <a href={path}>
              参照先ページを開く
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="growi-section-include"
      data-source-path={path}
      dangerouslySetInnerHTML={{
        __html: html,
      }}
    />
  );
};

export const withSectionInclude = (
  Tag: React.ComponentType<any>,
): React.FunctionComponent<any> => {
  const SectionIncludeAnchor = ({
    children,
    ...props
  }: any): React.ReactElement => {
    const meta = parseMeta(props.title);

    /*
     * 通常のリンクは、そのまま元のリンクコンポーネントで表示。
     */
    if (meta == null) {
      return (
        <Tag {...props}>
          {children}
        </Tag>
      );
    }

    const path = meta.path?.trim() ?? '';

    const heading = meta.heading?.trim()
      || '気づき・全体メモ';

    const includeHeading = meta.includeHeading === true;

    return (
      <SectionIncludeContent
        path={path}
        heading={heading}
        includeHeading={includeHeading}
      />
    );
  };

  SectionIncludeAnchor.displayName = 'SectionIncludeAnchor';

  return SectionIncludeAnchor;
};
