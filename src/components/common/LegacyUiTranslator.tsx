import { useEffect } from 'react';
import type { ReactNode } from 'react';
import i18n from '../../i18n';

function flatten(value: unknown, prefix = '', result: Record<string, string> = {}) {
  if (!value || typeof value !== 'object') return result;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') result[path] = child;
    else flatten(child, path, result);
  }
  return result;
}

function buildDictionary() {
  const ru = flatten(i18n.getResourceBundle('ru', 'translation'));
  const target = (i18n.resolvedLanguage || i18n.language || 'ru').split('-')[0];
  const translated = flatten(i18n.getResourceBundle(target, 'translation'));
  const dictionary = new Map<string, string>();

  for (const [key, russian] of Object.entries(ru)) {
    const value = translated[key];
    const source = russian.trim();
    const targetValue = typeof value === 'string' ? value.trim() : '';
    if (source && targetValue && targetValue !== source) {
      dictionary.set(source, targetValue);
    }
  }

  return dictionary;
}

function translateValue(value: string, dictionary: Map<string, string>) {
  const trimmed = value.trim();
  const exact = dictionary.get(trimmed);
  if (exact) {
    const leading = value.slice(0, value.length - value.trimStart().length);
    const trailing = value.slice(value.trimEnd().length);
    return `${leading}${exact}${trailing}`;
  }

  let result = value;
  const entries = [...dictionary.entries()].sort((a, b) => b[0].length - a[0].length);

  for (const [source, target] of entries) {
    if (!result.includes(source)) continue;
    result = result.split(source).join(target);
  }

  return result === value ? null : result;
}

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE']);
const ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'aria-description'];

function translateDocument() {
  const dictionary = buildDictionary();
  if (!dictionary.size || typeof document === 'undefined') return;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (parent && !SKIP_TAGS.has(parent.tagName)) textNodes.push(node as Text);
  }

  for (const textNode of textNodes) {
    const original = textNode.nodeValue ?? '';
    if (!original.trim()) continue;
    const translated = translateValue(original, dictionary);
    if (translated && translated !== original) textNode.nodeValue = translated;
  }

  const elements = document.querySelectorAll<HTMLElement>('[placeholder],[title],[aria-label],[aria-description]');
  elements.forEach(element => {
    for (const attribute of ATTRIBUTES) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const translated = translateValue(value, dictionary);
      if (translated && translated !== value) element.setAttribute(attribute, translated);
    }
  });
}

export function LegacyUiTranslator({ children }: { children: ReactNode }) {
  useEffect(() => {
    let timer: number | undefined;

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(translateDocument, 0);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    const unsubscribe = () => schedule();
    i18n.on('languageChanged', unsubscribe);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      i18n.off('languageChanged', unsubscribe);
    };
  }, []);

  return <>{children}</>;
}
