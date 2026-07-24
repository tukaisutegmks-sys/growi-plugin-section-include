type OriginalStyle = {
  hadStyle: boolean;
  cssText: string;
};

type ToolbarState = {
  active: boolean;
  timerId: number;
  observer: MutationObserver | null;
  originalStyles: Map<HTMLElement, OriginalStyle>;
  onViewportChange: () => void;
};

let toolbarState: ToolbarState | null = null;

const TOOLBAR_MARK = 'data-growi-toolbar-top-active';

const isVisible = (
  element: Element,
): element is HTMLElement => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return rect.width > 0
    && rect.height > 0
    && style.display !== 'none'
    && style.visibility !== 'hidden';
};

const findEditor = (): HTMLElement | null => {
  return [...document.querySelectorAll('.cm-editor')]
    .find((element) => {
      return isVisible(element)
        && element.querySelector(
          '.cm-content[contenteditable="true"][data-language="markdown"]',
        ) != null;
    }) ?? null;
};

const containsAddButton = (
  element: HTMLElement,
): boolean => {
  return [
    ...element.querySelectorAll(
      'button .material-symbols-outlined',
    ),
  ].some((icon) => {
    return icon.textContent?.trim() === 'add';
  });
};

const findToolbar = (
  editor: HTMLElement,
): HTMLElement | null => {
  const templateButton = [
    ...document.querySelectorAll(
      'button[data-testid="open-template-button"]',
    ),
  ].find(isVisible);

  if (templateButton == null) {
    return null;
  }

  const innerToolbar = templateButton.closest(
    'div.d-flex.gap-2',
  );

  if (!(innerToolbar instanceof HTMLElement)) {
    return null;
  }

  /*
   * Aaなどの内側だけでなく、
   * ＋ボタンを含むツールバー外枠まで探す。
   */
  let candidate = innerToolbar;
  let current = innerToolbar.parentElement;

  for (
    let depth = 0;
    depth < 6 && current != null;
    depth += 1
  ) {
    if (current.contains(editor)) {
      break;
    }

    const rect = current.getBoundingClientRect();

    if (
      containsAddButton(current)
      && rect.height > 0
      && rect.height <= 100
    ) {
      candidate = current;
      break;
    }

    current = current.parentElement;
  }

  return candidate;
};

const rememberStyle = (
  state: ToolbarState,
  element: HTMLElement,
): void => {
  if (state.originalStyles.has(element)) {
    return;
  }

  state.originalStyles.set(element, {
    hadStyle: element.hasAttribute('style'),
    cssText: element.getAttribute('style') ?? '',
  });
};

const setImportant = (
  element: HTMLElement,
  property: string,
  value: string,
): void => {
  element.style.setProperty(
    property,
    value,
    'important',
  );
};

const restoreStyles = (
  state: ToolbarState,
): void => {
  for (
    const [element, original] of
    state.originalStyles.entries()
  ) {
    if (!element.isConnected) {
      continue;
    }

    if (original.hadStyle) {
      element.setAttribute(
        'style',
        original.cssText,
      );
    }
    else {
      element.removeAttribute('style');
    }

    element.removeAttribute(TOOLBAR_MARK);
  }

  state.originalStyles.clear();
};

const applyToolbarPosition = (
  state: ToolbarState,
): void => {
  state.timerId = 0;

  if (!state.active) {
    return;
  }

  const editor = findEditor();

  if (editor == null) {
    return;
  }

  const toolbar = findToolbar(editor);

  if (toolbar == null) {
    return;
  }

  const editorRect = editor.getBoundingClientRect();
  const measuredHeight =
    toolbar.getBoundingClientRect().height;

  const toolbarHeight = Math.max(
    42,
    Math.ceil(measuredHeight || 0),
  );

  const editorIsVisible =
    editorRect.bottom > 0
    && editorRect.top < window.innerHeight;

  rememberStyle(state, editor);
  rememberStyle(state, toolbar);

  /*
   * DOMを移動せず、ツールバーを編集欄上端に表示。
   * Reactによって下へ戻される問題を避ける。
   */
  setImportant(toolbar, 'position', 'fixed');
  setImportant(
    toolbar,
    'top',
    `${Math.max(0, Math.round(editorRect.top))}px`,
  );
  setImportant(
    toolbar,
    'left',
    `${Math.round(editorRect.left)}px`,
  );
  setImportant(toolbar, 'right', 'auto');
  setImportant(toolbar, 'bottom', 'auto');
  setImportant(
    toolbar,
    'width',
    `${Math.round(editorRect.width)}px`,
  );
  setImportant(
    toolbar,
    'min-height',
    `${toolbarHeight}px`,
  );
  setImportant(
    toolbar,
    'display',
    editorIsVisible ? 'flex' : 'none',
  );
  setImportant(toolbar, 'align-items', 'center');
  setImportant(
    toolbar,
    'justify-content',
    'flex-start',
  );
  setImportant(toolbar, 'overflow-x', 'auto');
  setImportant(toolbar, 'overflow-y', 'hidden');
  setImportant(toolbar, 'box-sizing', 'border-box');
  setImportant(toolbar, 'margin', '0');
  setImportant(toolbar, 'padding', '2px 8px');
  setImportant(toolbar, 'z-index', '1100');
  setImportant(
    toolbar,
    'background',
    'var(--bs-body-bg, #172331)',
  );
  setImportant(toolbar, 'border-top', 'none');
  setImportant(
    toolbar,
    'border-bottom',
    '1px solid var(--bs-border-color, #495057)',
  );
  setImportant(toolbar, 'transform', 'none');

  /*
   * 1行目がツールバーの裏へ隠れないようにする。
   */
  setImportant(editor, 'box-sizing', 'border-box');
  setImportant(
    editor,
    'padding-top',
    `${toolbarHeight}px`,
  );

  toolbar.setAttribute(
    TOOLBAR_MARK,
    'true',
  );
};

const scheduleApply = (
  state: ToolbarState,
): void => {
  if (!state.active) {
    return;
  }

  if (state.timerId !== 0) {
    window.clearTimeout(state.timerId);
  }

  state.timerId = window.setTimeout(
    () => applyToolbarPosition(state),
    100,
  );
};

export const activateEditorToolbarTop = (): void => {
  deactivateEditorToolbarTop();

  const state: ToolbarState = {
    active: true,
    timerId: 0,
    observer: null,
    originalStyles: new Map(),
    onViewportChange: () => {},
  };

  state.onViewportChange = () => {
    scheduleApply(state);
  };

  state.observer = new MutationObserver(() => {
    scheduleApply(state);
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

  toolbarState = state;
  scheduleApply(state);
};

export const deactivateEditorToolbarTop = (): void => {
  const state = toolbarState;

  if (state == null) {
    return;
  }

  state.active = false;
  state.observer?.disconnect();

  if (state.timerId !== 0) {
    window.clearTimeout(state.timerId);
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

  restoreStyles(state);
  toolbarState = null;
};
