import { useEffect, useRef } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { indentWithTab, selectAll } from "@codemirror/commands";
import { openSearchPanel } from "@codemirror/search";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { Preferences } from "../../types";
export type EditorAction = "search" | "selectAll";
export default function CodeEditor({
  value,
  onChange,
  filename,
  prefs,
  onRun,
  action,
  readOnly = false,
}: {
  value: string;
  onChange: (value: string) => void;
  filename: string;
  prefs: Preferences;
  onRun: () => void;
  action: { type: EditorAction; id: number } | null;
  readOnly?: boolean;
}) {
  const parent = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null),
    theme = useRef(new Compartment());
  const changeRef = useRef(onChange),
    runRef = useRef(onRun);
  changeRef.current = onChange;
  runRef.current = onRun;
  useEffect(() => {
    if (!parent.current) return;
    const instance = new EditorView({
      parent: parent.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          filename.endsWith(".json") ? json() : javascript(),
          EditorState.readOnly.of(readOnly),
          keymap.of([
            indentWithTab,
            {
              key: "Mod-Enter",
              run: () => {
                runRef.current();
                return true;
              },
            },
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged)
              changeRef.current(update.state.doc.toString());
          }),
          theme.current.of(makeTheme(prefs)),
        ],
      }),
    });
    view.current = instance;
    return () => {
      instance.destroy();
      view.current = null;
    };
  }, [filename, readOnly]);
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value)
      v.dispatch({
        changes: { from: 0, to: v.state.doc.length, insert: value },
      });
  }, [value]);
  useEffect(() => {
    view.current?.dispatch({
      effects: theme.current.reconfigure(makeTheme(prefs)),
    });
  }, [prefs.theme, prefs.fontSize, prefs.fontFamily]);
  useEffect(() => {
    if (view.current && action) {
      if (action.type === "search") openSearchPanel(view.current);
      else selectAll(view.current);
      view.current.focus();
    }
  }, [action]);
  return (
    <div
      className="code-editor"
      ref={parent}
      aria-label={`Code editor ${filename}`}
    />
  );
}
function makeTheme(prefs: Preferences) {
  const mono = prefs.theme === "monochrome";
  return [
    EditorView.theme(
      {
        "&": {
          height: "100%",
          fontSize: `${prefs.fontSize}px`,
          backgroundColor: "var(--editor)",
          color: "var(--code-text)",
        },
        ".cm-content": {
          fontFamily: prefs.fontFamily,
          padding: "20px 0",
          caretColor: "var(--accent)",
        },
        ".cm-scroller": {
          fontFamily: prefs.fontFamily,
          lineHeight: "1.85",
          overflow: "auto",
        },
        ".cm-gutters": {
          backgroundColor: "var(--editor)",
          color: "var(--muted)",
          border: "none",
          paddingRight: "14px",
          paddingLeft: "6px",
        },
        ".cm-activeLine": { backgroundColor: "var(--active-line)" },
        ".cm-activeLineGutter": {
          backgroundColor: "transparent",
          color: "var(--text)",
        },
        ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
          backgroundColor: "var(--selection)",
        },
        ".cm-cursor": { borderLeftColor: "var(--text)" },
        ".cm-panels": { backgroundColor: "var(--panel)", color: "var(--text)" },
        ".cm-searchMatch": { backgroundColor: "#a8793033" },
        ".cm-tooltip": {
          backgroundColor: "var(--panel)",
          color: "var(--text)",
          border: "1px solid var(--border)",
        },
        ".cm-foldPlaceholder": {
          backgroundColor: "var(--panel)",
          color: "var(--muted)",
          border: "none",
        },
        ".cm-line": { paddingLeft: "6px" },
      },
      { dark: true },
    ),
    syntaxHighlighting(
      HighlightStyle.define([
        {
          tag: tags.keyword,
          color: mono
            ? "#f1f1f1"
            : prefs.theme === "rainbow"
              ? "#d9a0ff"
              : "#c586c0",
        },
        { tag: tags.string, color: mono ? "#c4c4c4" : "#ce9178" },
        {
          tag: tags.comment,
          color: mono ? "#777" : "#6a9955",
          fontStyle: "italic",
        },
        {
          tag: [
            tags.function(tags.variableName),
            tags.function(tags.propertyName),
          ],
          color: mono ? "#eee" : "#dcdcaa",
        },
        {
          tag: [tags.number, tags.bool, tags.null],
          color: mono ? "#bdbdbd" : "#b5cea8",
        },
        {
          tag: [tags.variableName, tags.propertyName],
          color: mono
            ? "#ddd"
            : prefs.theme === "rainbow"
              ? "#74dbe4"
              : "#9cdcfe",
        },
        { tag: tags.punctuation, color: "#aaa" },
      ]),
    ),
  ];
}
