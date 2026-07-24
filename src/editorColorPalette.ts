const COLOR_OPTIONS = [
  {
    name: 'red',
    label: '赤',
  },
  {
    name: 'orange',
    label: '橙',
  },
  {
    name: 'yellow',
    label: '黄',
  },
  {
    name: 'green',
    label: '緑',
  },
  {
    name: 'blue',
    label: '青',
  },
  {
    name: 'purple',
    label: '紫',
  },
  {
    name: 'gray',
    label: '灰',
  },
] as const;

type ColorName =
  typeof COLOR_OPTIONS[number]['name'];

type PaletteState = {
  active: boolean;
  timerId: number;
  observer: MutationObserver | null;
  button: HTMLButtonElement | null;
  panel: HTMLDivElement | null;
  savedRange: Range | null;
  onViewportChange: () => void;
  onDocumentPointerDown:
    (event: PointerEvent) => void;
};

let paletteState: PaletteState | null = null;

const isVisible = (
  element: Element,
): element is HTMLElement => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const rect =
    element.getBoundingClientRect();

  const style =
    window.getComputedStyle(element);

  return rect.width > 0
    && rect.height > 0
    && style.display !== 'none'
    && style.visibility !== 'hidden';
};

const findEditorContent =
  (): HTMLElement | null => {
    return [
      ...document.querySelectorAll<HTMLElement>(
        [
          '.cm-content',
          '[contenteditable="true"]',
          '[data-language="markdown"]',
        ].join(''),
      ),
    ].find(isVisible) ?? null;
  };

type ToolbarParts = {
  toolbar: HTMLElement;
  innerToolbar: HTMLElement;
};

const findToolbarParts =
  (): ToolbarParts | null => {
    const templateButton = [
      ...document
        .querySelectorAll<HTMLButtonElement>(
          'button[data-testid="open-template-button"]',
        ),
    ].find(isVisible);

    if (templateButton == null) {
      return null;
    }

    const innerToolbar =
      templateButton.closest(
        'div.d-flex.gap-2',
      );

    if (
      !(innerToolbar instanceof HTMLElement)
    ) {
      return null;
    }

    const markedToolbar = [
      ...document.querySelectorAll<HTMLElement>(
        [
          '[',
          'data-growi-toolbar-top-active',
          '="true"',
          ']',
        ].join(''),
      ),
    ].find(isVisible);

    return {
      toolbar:
        markedToolbar ?? innerToolbar,
      innerToolbar,
    };
  };

const closePalette = (
  state: PaletteState,
): void => {
  state.panel?.classList.remove(
    'is-open',
  );

  state.button?.setAttribute(
    'aria-expanded',
    'false',
  );
};

const captureCurrentSelection = (
  state: PaletteState,
): void => {
  const editor = findEditorContent();
  const selection =
    window.getSelection();

  if (
    editor == null
    || selection == null
    || selection.rangeCount === 0
  ) {
    return;
  }

  const range =
    selection.getRangeAt(0);

  if (
    editor.contains(
      range.commonAncestorContainer,
    )
  ) {
    state.savedRange =
      range.cloneRange();
  }
};

const escapeMarkdownLinkText = (
  text: string,
): string => {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\]/g, '\\]');
};

const buildColorMarkup = (
  selectedText: string,
  colorName: ColorName,
): string => {
  const targetText =
    selectedText.length === 0
      ? '文字'
      : selectedText;

  /*
   * 独自ディレクティブではなく、
   * 通常のMarkdownリンクとして挿入する。
   *
   * View側ではwithTextColorが
   * 色付きspanへ変換するため、
   * リンクとしては表示されない。
   */
  return targetText
    .split('\n')
    .map((line) => {
      if (line.length === 0) {
        return '';
      }

      return [
        '[',
        escapeMarkdownLinkText(line),
        '](',
        `#growi-color-${colorName}`,
        ')',
      ].join('');
    })
    .join('\n');
};

const replaceSelectionFallback = (
  editor: HTMLElement,
  range: Range,
  replacement: string,
): void => {
  range.deleteContents();

  const textNode =
    document.createTextNode(replacement);

  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.collapse(true);

  const selection =
    window.getSelection();

  selection?.removeAllRanges();
  selection?.addRange(range);

  try {
    editor.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: replacement,
      }),
    );
  }
  catch {
    editor.dispatchEvent(
      new Event('input', {
        bubbles: true,
      }),
    );
  }
};

const applyColor = (
  state: PaletteState,
  colorName: ColorName,
): void => {
  const editor = findEditorContent();

  if (editor == null) {
    return;
  }

  let range = state.savedRange;

  if (
    range == null
    || !range.startContainer.isConnected
    || !range.endContainer.isConnected
    || !editor.contains(
      range.commonAncestorContainer,
    )
  ) {
    captureCurrentSelection(state);
    range = state.savedRange;
  }

  if (range == null) {
    closePalette(state);
    return;
  }

  const selectedText =
    range.toString();

  const replacement =
    buildColorMarkup(
      selectedText,
      colorName,
    );

  editor.focus();

  const selection =
    window.getSelection();

  selection?.removeAllRanges();
  selection?.addRange(range);

  let inserted = false;

  try {
    inserted = document.execCommand(
      'insertText',
      false,
      replacement,
    );
  }
  catch {
    inserted = false;
  }

  if (!inserted) {
    replaceSelectionFallback(
      editor,
      range,
      replacement,
    );
  }

  state.savedRange = null;
  closePalette(state);
};

const createPaletteUi = (
  state: PaletteState,
): void => {
  state.button?.remove();
  state.panel?.remove();

  const button =
    document.createElement('button');

  button.type = 'button';
  button.className =
    'growi-color-palette-button';

  button.title = '文字色';
  button.setAttribute(
    'aria-label',
    '文字色を変更',
  );
  button.setAttribute(
    'aria-expanded',
    'false',
  );

  const icon =
    document.createElement('span');

  icon.className =
    'material-symbols-outlined';

  icon.textContent = 'palette';

  button.append(icon);

  const panel =
    document.createElement('div');

  panel.className =
    'growi-color-palette-panel';

  panel.setAttribute(
    'role',
    'menu',
  );

  for (
    const option of COLOR_OPTIONS
  ) {
    const colorButton =
      document.createElement('button');

    colorButton.type = 'button';

    colorButton.className = [
      'growi-color-palette-swatch',
      `growi-color-palette-${option.name}`,
    ].join(' ');

    colorButton.title =
      `${option.label}色`;

    colorButton.setAttribute(
      'aria-label',
      `${option.label}色`,
    );

    colorButton.setAttribute(
      'role',
      'menuitem',
    );

    colorButton.addEventListener(
      'pointerdown',
      (event) => {
        /*
         * エディターの文字選択が
         * パレット操作で解除されるのを防ぐ。
         */
        event.preventDefault();
      },
    );

    colorButton.addEventListener(
      'click',
      () => {
        applyColor(
          state,
          option.name,
        );
      },
    );

    panel.append(colorButton);
  }

  button.addEventListener(
    'pointerdown',
    (event) => {
      captureCurrentSelection(state);
      event.preventDefault();
    },
  );

  button.addEventListener(
    'click',
    () => {
      captureCurrentSelection(state);

      const willOpen =
        !panel.classList.contains(
          'is-open',
        );

      panel.classList.toggle(
        'is-open',
        willOpen,
      );

      button.setAttribute(
        'aria-expanded',
        willOpen ? 'true' : 'false',
      );

      schedulePosition(state);
    },
  );

  document.body.append(
    button,
    panel,
  );

  state.button = button;
  state.panel = panel;
};

const ensurePaletteUi = (
  state: PaletteState,
): void => {
  if (
    state.button?.isConnected
    && state.panel?.isConnected
  ) {
    return;
  }

  createPaletteUi(state);
};

const positionPalette = (
  state: PaletteState,
): void => {
  state.timerId = 0;

  if (!state.active) {
    return;
  }

  ensurePaletteUi(state);

  const button = state.button;
  const panel = state.panel;
  const editor = findEditorContent();
  const toolbarParts =
    findToolbarParts();

  if (
    button == null
    || panel == null
    || editor == null
    || toolbarParts == null
  ) {
    if (button != null) {
      button.style.display = 'none';
    }

    closePalette(state);
    return;
  }

  const {
    toolbar,
    innerToolbar,
  } = toolbarParts;

  const toolbarRect =
    toolbar.getBoundingClientRect();

  const innerRect =
    innerToolbar.getBoundingClientRect();

  const buttonSize = 34;

  const preferredLeft =
    innerRect.right + 6;

  const maximumLeft =
    toolbarRect.right
    - buttonSize
    - 6;

  const buttonLeft = Math.max(
    toolbarRect.left + 6,
    Math.min(
      preferredLeft,
      maximumLeft,
    ),
  );

  const buttonTop =
    toolbarRect.top
    + Math.max(
      0,
      (
        toolbarRect.height
        - buttonSize
      ) / 2,
    );

  button.style.display = 'flex';
  button.style.left =
    `${Math.round(buttonLeft)}px`;

  button.style.top =
    `${Math.round(buttonTop)}px`;

  if (
    panel.classList.contains(
      'is-open',
    )
  ) {
    const buttonRect =
      button.getBoundingClientRect();

    const panelRect =
      panel.getBoundingClientRect();

    let panelLeft =
      buttonRect.right
      - panelRect.width;

    panelLeft = Math.max(
      8,
      Math.min(
        panelLeft,
        window.innerWidth
          - panelRect.width
          - 8,
      ),
    );

    let panelTop =
      buttonRect.bottom + 6;

    if (
      panelTop + panelRect.height
      > window.innerHeight - 8
    ) {
      panelTop =
        buttonRect.top
        - panelRect.height
        - 6;
    }

    panel.style.left =
      `${Math.round(panelLeft)}px`;

    panel.style.top =
      `${Math.round(panelTop)}px`;
  }
};

const schedulePosition = (
  state: PaletteState,
): void => {
  if (!state.active) {
    return;
  }

  if (state.timerId !== 0) {
    window.clearTimeout(
      state.timerId,
    );
  }

  /*
   * toolbar-top側の位置調整が
   * 完了してからパレットを配置する。
   */
  state.timerId =
    window.setTimeout(
      () => positionPalette(state),
      180,
    );
};

export const activateEditorColorPalette =
  (): void => {
    deactivateEditorColorPalette();

    const state: PaletteState = {
      active: true,
      timerId: 0,
      observer: null,
      button: null,
      panel: null,
      savedRange: null,
      onViewportChange: () => {},
      onDocumentPointerDown: () => {},
    };

    state.onViewportChange = () => {
      schedulePosition(state);
    };

    state.onDocumentPointerDown = (
      event: PointerEvent,
    ) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        state.button?.contains(target)
        || state.panel?.contains(target)
      ) {
        return;
      }

      closePalette(state);
    };

    state.observer =
      new MutationObserver(() => {
        schedulePosition(state);
      });

    state.observer.observe(
      document.documentElement,
      {
        childList: true,
        subtree: true,
      },
    );

    window.addEventListener(
      'resize',
      state.onViewportChange,
    );

    window.addEventListener(
      'scroll',
      state.onViewportChange,
      true,
    );

    window.addEventListener(
      'popstate',
      state.onViewportChange,
    );

    document.addEventListener(
      'pointerdown',
      state.onDocumentPointerDown,
    );

    paletteState = state;
    schedulePosition(state);
  };

export const deactivateEditorColorPalette =
  (): void => {
    const state = paletteState;

    if (state == null) {
      return;
    }

    state.active = false;
    state.observer?.disconnect();

    if (state.timerId !== 0) {
      window.clearTimeout(
        state.timerId,
      );
    }

    window.removeEventListener(
      'resize',
      state.onViewportChange,
    );

    window.removeEventListener(
      'scroll',
      state.onViewportChange,
      true,
    );

    window.removeEventListener(
      'popstate',
      state.onViewportChange,
    );

    document.removeEventListener(
      'pointerdown',
      state.onDocumentPointerDown,
    );

    state.button?.remove();
    state.panel?.remove();

    paletteState = null;
  };
