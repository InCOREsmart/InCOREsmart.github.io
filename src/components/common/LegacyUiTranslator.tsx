import { useEffect } from 'react';
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
  const target = i18n.resolvedLanguage || i18n.language || 'ru';
  const translated = flatten(i18n.getResourceBundle(target, 'translation'));
  const dictionary = new Map<string, string>();

  for (const [key, russian] of Object.entries(ru)) {
    const value = translated[key];
    if (value && value !== russian) dictionary.set(russian.trim(), value);
  }

  return dictionary;
}

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE']);
const ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'aria-description'];

function translateDocument() {
  const dictionary = buildDictionary();
  if (!dictionary.size) return;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (parent && !SKIP_TAGS.has(parent.tagName)) textNodes.push(node as Text);
  }

  for (const textNode of textNodes) {
    const original = textNode.nodeValue ?? '';
    const trimmed = original.trim();
    if (!trimmed) continue;
    const translated = dictionary.get(trimmed);
    if (!translated) continue;
    const start = original.indexOf(trimmed);
    const end = start + trimmed.length;
    textNode.nodeValue = `${original.slice(0, start)}${translated}${original.slice(end)}`;
  }

  const elements = document.querySelectorAll<HTMLElement>('[placeholder],[title],[aria-label],[aria-description]');
  elements.forEach(element => {
    for (const attribute of ATTRIBUTES) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const translated = dictionary.get(value.trim());
      if (translated) element.setAttribute(attribute, translated);
    }
  });
}

export function LegacyUiTranslator({ children }: { children: React.ReactNode }) {
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
