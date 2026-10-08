import React, { useEffect, useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { java } from '@codemirror/lang-java';
import { xml } from '@codemirror/lang-xml';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { EditorView, Decoration } from '@codemirror/view';
import { EditorState, EditorSelection } from '@codemirror/state';
import { tags as t } from '@lezer/highlight';

// Colors are CSS variables, so one style serves light and dark: the theme toggle
// just swaps the variables, no editor reconfiguration.
const style = syntaxHighlighting(HighlightStyle.define([
  { tag: [t.keyword, t.modifier, t.operatorKeyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword], color: 'var(--lf)' },
  { tag: [t.string, t.special(t.string), t.attributeValue], color: 'var(--ok)' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--lw)' },
  { tag: [t.lineComment, t.blockComment, t.comment], color: 'var(--ink3)', fontStyle: 'italic' },
  { tag: [t.typeName, t.className, t.tagName, t.namespace], color: 'var(--li)' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.variableName), t.definition(t.propertyName)], color: 'var(--accent)' },
  { tag: [t.annotation, t.meta, t.attributeName, t.processingInstruction], color: 'var(--lw)' },
  { tag: [t.operator, t.punctuation, t.separator, t.bracket, t.angleBracket], color: 'var(--ink2)' }
]));

const chrome = EditorView.theme({
  '&': { backgroundColor: 'var(--bg2)', color: 'var(--ink)', height: '100%', fontSize: '12px' },
  '.cm-scroller': { fontFamily: 'var(--mono)', lineHeight: '1.65' },
  '.cm-gutters': { backgroundColor: 'var(--bg2)', color: 'var(--ink3)', border: 'none' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--accentSoft)' },
  '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': { backgroundColor: 'var(--accentSoft)' },
  '.cm-cursor': { borderLeftColor: 'var(--ink)' },
  '.jx-hit': { backgroundColor: 'var(--accentFill)', color: 'var(--accentInk)', borderRadius: '2px' },
  '.jx-term': { backgroundColor: 'var(--accentSoft)', outline: '1px solid var(--accent)', borderRadius: '2px' },
  '.cm-panels': { backgroundColor: 'var(--bg3)', color: 'var(--ink)' },
  '.cm-searchMatch': { backgroundColor: 'var(--accentSoft)', outline: '1px solid var(--accent)' },
  '.cm-searchMatch-selected': { backgroundColor: 'var(--accentFill)', color: 'var(--accentInk)' }
});

const LANG = { java, xml };
const base = [style, chrome, EditorView.editable.of(false), EditorState.readOnly.of(true)];

/** Same matching rules as the server's search worker, so the editor lights up what the results list found. */
function termRegex({ q, regex, cs, word }) {
  try {
    const src = regex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(word ? `\\b(?:${src})\\b` : src, 'gm' + (cs ? '' : 'i'));
  } catch { return null; }
}

function lineStart(text, line) {                      // offset of 1-based `line`
  let at = 0;
  for (let i = 1; i < line; i++) { at = text.indexOf('\n', at); if (at < 0) return text.length; at++; }
  return at;
}

export function CodePane({ text, lang, hit, term }) {
  const [v, setV] = useState(null);                 // the view appears a render after mount

  const marks = useMemo(() => {
    const out = [];
    const rx = term?.q ? termRegex(term) : null;
    if (rx) {
      for (let m, n = 0; (m = rx.exec(text)) && n < 2000; n++) {
        if (!m[0]) { rx.lastIndex++; continue; }
        out.push(Decoration.mark({ class: 'jx-term' }).range(m.index, m.index + m[0].length));
      }
    }
    if (hit) {
      const from = lineStart(text, hit.l) + hit.c;
      if (from < text.length) out.push(Decoration.mark({ class: 'jx-hit' }).range(from, Math.min(text.length, from + (hit.n || 1))));
    }
    return Decoration.set(out, true);
  }, [text, term, hit]);

  const extensions = useMemo(() => [...base, ...(LANG[lang] ? [LANG[lang]()] : []), EditorView.decorations.of(marks)], [lang, marks]);

  // Child effects run before this one, so a new doc is already in place.
  useEffect(() => {
    if (!v || !hit || v.state.doc.toString() !== text) return;
    const line = v.state.doc.line(Math.min(Math.max(hit.l, 1), v.state.doc.lines));
    const pos = Math.min(line.from + hit.c, line.to);
    v.dispatch({ selection: EditorSelection.single(pos), effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
  }, [text, hit, v]);

  return (
    <CodeMirror value={text} theme="none" height="100%" extensions={extensions}
      onCreateEditor={(view) => { setV(view); }}
      basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, autocompletion: false, closeBrackets: false, searchKeymap: true }}
      style={{ height: '100%' }} />
  );
}
