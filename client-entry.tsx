import type React from 'react';
import remarkDirective from 'remark-directive';

import './src/styles/section-include.css';
import './src/styles/color-palette.css';

import {
  activateEditorColorPalette,
  deactivateEditorColorPalette,
} from './src/editorColorPalette';

import {
  activateEditorToolbarTop,
  deactivateEditorToolbarTop,
} from './src/editorToolbarTop';

import {
  colorDirectivePlugin,
} from './src/colorDirective';

import {
  sectionDirectivePlugin,
} from './src/sectionDirective';

import {
  withSectionInclude,
} from './src/SectionInclude';

import {
  withTextColor,
} from './src/withTextColor';

const PLUGIN_NAME =
  'growi-plugin-section-include';

type RendererOptions = {
  components: Record<
    string,
    React.ComponentType<any>
  >;
  remarkPlugins: unknown[];
};

type OptionsGenerator =
  (...args: any[]) => RendererOptions;

declare const growiFacade: {
  markdownRenderer?: {
    optionsGenerators: {
      generateViewOptions:
        OptionsGenerator;
      customGenerateViewOptions?:
        OptionsGenerator;
    };
  };
};

let previousViewGenerator:
  OptionsGenerator | undefined;

let viewPluginActivated = false;

const enhanceViewOptions = (
  options: RendererOptions,
): RendererOptions => {
  const remarkPlugins = [
    ...(options.remarkPlugins ?? []),
  ];

  /*
   * ::section[...] と
   * :color[...] を解析可能にする。
   */
  if (
    !remarkPlugins.includes(
      remarkDirective,
    )
  ) {
    remarkPlugins.push(
      remarkDirective,
    );
  }

  if (
    !remarkPlugins.includes(
      sectionDirectivePlugin,
    )
  ) {
    remarkPlugins.push(
      sectionDirectivePlugin,
    );
  }

  if (
    !remarkPlugins.includes(
      colorDirectivePlugin,
    )
  ) {
    remarkPlugins.push(
      colorDirectivePlugin,
    );
  }

  const components = {
    ...options.components,
  };

  const Anchor = components.a;

  if (Anchor != null) {
    let WrappedAnchor = Anchor;

    /*
     * sectionリンク処理を追加する。
     */
    if (
      (WrappedAnchor as any)
        .__sectionIncludeWrapped
      !== true
    ) {
      const SectionWrappedAnchor =
        withSectionInclude(
          WrappedAnchor,
        );

      (
        SectionWrappedAnchor as any
      ).__sectionIncludeWrapped = true;

      WrappedAnchor =
        SectionWrappedAnchor;
    }

    /*
     * growi-color:リンクを
     * 色付きspanへ変換する。
     */
    if (
      (WrappedAnchor as any)
        .__textColorWrapped
      !== true
    ) {
      const ColorWrappedAnchor =
        withTextColor(
          WrappedAnchor,
        );

      /*
       * 外側を色ラッパーで包んでも、
       * sectionラッパー済みの印を維持する。
       */
      (
        ColorWrappedAnchor as any
      ).__sectionIncludeWrapped =
        (
          WrappedAnchor as any
        ).__sectionIncludeWrapped
        === true;

      (
        ColorWrappedAnchor as any
      ).__textColorWrapped = true;

      WrappedAnchor =
        ColorWrappedAnchor;
    }

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
   * 編集画面の機能。
   */
  activateEditorToolbarTop();
  activateEditorColorPalette();

  /*
   * View拡張の二重登録を防ぐ。
   */
  if (viewPluginActivated) {
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
   * View画面だけを拡張する。
   * Preview/EditのMarkdownレンダラーには
   * 登録しない。
   */
  previousViewGenerator =
    optionsGenerators
      .customGenerateViewOptions;

  optionsGenerators
    .customGenerateViewOptions = (
      ...args: any[]
    ): RendererOptions => {
      const originalOptions =
        previousViewGenerator != null
          ? previousViewGenerator(
              ...args,
            )
          : optionsGenerators
              .generateViewOptions(
                ...args,
              );

      return enhanceViewOptions(
        originalOptions,
      );
    };

  viewPluginActivated = true;
};

const deactivate = (): void => {
  /*
   * bodyへ追加したパレットを先に削除する。
   */
  deactivateEditorColorPalette();
  deactivateEditorToolbarTop();

  if (
    typeof growiFacade === 'undefined'
    || growiFacade.markdownRenderer == null
  ) {
    viewPluginActivated = false;
    return;
  }

  growiFacade
    .markdownRenderer
    .optionsGenerators
    .customGenerateViewOptions =
      previousViewGenerator;

  previousViewGenerator = undefined;
  viewPluginActivated = false;
};

if (
  (window as any).pluginActivators
  == null
) {
  (window as any).pluginActivators = {};
}

(
  window as any
).pluginActivators[PLUGIN_NAME] = {
  activate,
  deactivate,
};
