import type React from 'react';
import remarkDirective from 'remark-directive';

import './src/styles/section-include.css';

import {
  activateEditorToolbarTop,
  deactivateEditorToolbarTop,
} from './src/editorToolbarTop';
import { sectionDirectivePlugin } from './src/sectionDirective';
import { withSectionInclude } from './src/SectionInclude';

const PLUGIN_NAME = 'growi-plugin-section-include';

type RendererOptions = {
  components: Record<string, React.ComponentType<any>>;
  remarkPlugins: unknown[];
};

type OptionsGenerator = (...args: any[]) => RendererOptions;

declare const growiFacade: {
  markdownRenderer?: {
    optionsGenerators: {
      generateViewOptions: OptionsGenerator;
      customGenerateViewOptions?: OptionsGenerator;
    };
  };
};

let previousViewGenerator: OptionsGenerator | undefined;
let sectionIncludeActivated = false;

const enhanceViewOptions = (
  options: RendererOptions,
): RendererOptions => {
  const remarkPlugins = [
    ...(options.remarkPlugins ?? []),
  ];

  /*
   * ::section[...] をMarkdownディレクティブとして解析する。
   */
  if (!remarkPlugins.includes(remarkDirective)) {
    remarkPlugins.push(remarkDirective);
  }

  /*
   * sectionディレクティブを専用のリンクノードへ変換する。
   */
  if (!remarkPlugins.includes(sectionDirectivePlugin)) {
    remarkPlugins.push(sectionDirectivePlugin);
  }

  const components = {
    ...options.components,
  };

  const Anchor = components.a;

  if (
    Anchor != null
    && (Anchor as any).__sectionIncludeWrapped !== true
  ) {
    const WrappedAnchor = withSectionInclude(Anchor);

    (WrappedAnchor as any).__sectionIncludeWrapped = true;
    components.a = WrappedAnchor;
  }

  return {
    ...options,
    remarkPlugins,
    components,
  };
};

const activate = (): void => {
  /*
   * 編集ツールバーを上部へ表示する処理を有効化。
   */
  activateEditorToolbarTop();

  /*
   * 二重登録を防止する。
   */
  if (sectionIncludeActivated) {
    return;
  }

  if (
    typeof growiFacade === 'undefined'
    || growiFacade.markdownRenderer == null
  ) {
    return;
  }

  const { optionsGenerators } =
    growiFacade.markdownRenderer;

  /*
   * View画面だけ拡張する。
   * Preview/Edit側には登録しない。
   */
  previousViewGenerator =
    optionsGenerators.customGenerateViewOptions;

  optionsGenerators.customGenerateViewOptions = (
    ...args: any[]
  ): RendererOptions => {
    const originalOptions =
      previousViewGenerator != null
        ? previousViewGenerator(...args)
        : optionsGenerators.generateViewOptions(...args);

    return enhanceViewOptions(originalOptions);
  };

  sectionIncludeActivated = true;
};

const deactivate = (): void => {
  /*
   * ツールバーに追加したスタイルや監視処理を解除する。
   */
  deactivateEditorToolbarTop();

  if (
    typeof growiFacade === 'undefined'
    || growiFacade.markdownRenderer == null
  ) {
    sectionIncludeActivated = false;
    return;
  }

  growiFacade
    .markdownRenderer
    .optionsGenerators
    .customGenerateViewOptions = previousViewGenerator;

  previousViewGenerator = undefined;
  sectionIncludeActivated = false;
};

if ((window as any).pluginActivators == null) {
  (window as any).pluginActivators = {};
}

(window as any).pluginActivators[PLUGIN_NAME] = {
  activate,
  deactivate,
};
