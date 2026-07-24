import './src/styles/section-include.css';

import remarkDirective from 'remark-directive';

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
      generatePreviewOptions?: OptionsGenerator;
      customGeneratePreviewOptions?: OptionsGenerator;
    };
  };
};

let previousViewGenerator: OptionsGenerator | undefined;
let previousPreviewGenerator: OptionsGenerator | undefined;

const enhanceOptions = (options: RendererOptions): RendererOptions => {
  /*
   * 先に ::section[...] 構文をleafDirectiveとして解析する。
   */
  if (!options.remarkPlugins.includes(remarkDirective)) {
    options.remarkPlugins.push(remarkDirective as never);
  }

  /*
   * 解析されたsectionディレクティブを参照表示用ノードへ変換する。
   */
  if (!options.remarkPlugins.includes(sectionDirectivePlugin)) {
    options.remarkPlugins.push(sectionDirectivePlugin as never);
  }

  const Anchor = options.components.a;

  if (
    Anchor != null
    && (Anchor as any).__sectionIncludeWrapped !== true
  ) {
    const WrappedAnchor = withSectionInclude(Anchor);
    (WrappedAnchor as any).__sectionIncludeWrapped = true;
    options.components.a = WrappedAnchor;
  }

  return options;
};

const activate = (): void => {
  if (
    typeof growiFacade === 'undefined'
    || growiFacade.markdownRenderer == null
  ) {
    return;
  }

  const { optionsGenerators } = growiFacade.markdownRenderer;

  previousViewGenerator = optionsGenerators.customGenerateViewOptions;

  optionsGenerators.customGenerateViewOptions = (...args: any[]) => {
    const options = previousViewGenerator != null
      ? previousViewGenerator(...args)
      : optionsGenerators.generateViewOptions(...args);

    return enhanceOptions(options);
  };

  if (optionsGenerators.generatePreviewOptions != null) {
    previousPreviewGenerator =
      optionsGenerators.customGeneratePreviewOptions;

    optionsGenerators.customGeneratePreviewOptions = (...args: any[]) => {
      const options = previousPreviewGenerator != null
        ? previousPreviewGenerator(...args)
        : optionsGenerators.generatePreviewOptions!(...args);

      return enhanceOptions(options);
    };
  }
};

const deactivate = (): void => {
  if (
    typeof growiFacade === 'undefined'
    || growiFacade.markdownRenderer == null
  ) {
    return;
  }

  const { optionsGenerators } = growiFacade.markdownRenderer;

  optionsGenerators.customGenerateViewOptions = previousViewGenerator;
  optionsGenerators.customGeneratePreviewOptions =
    previousPreviewGenerator;
};

if ((window as any).pluginActivators == null) {
  (window as any).pluginActivators = {};
}

(window as any).pluginActivators[PLUGIN_NAME] = {
  activate,
  deactivate,
};
