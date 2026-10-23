/** `<br>`, `<br/>`, `<br />`, `<p>`, `<p class="…">` and `</p>`, any case. */
const LINE_BREAK_TAG = /<(?:br\s*\/?|\/?p(?:\s[^>]*)?)>/gi;
/** An opening, closing or self-closing tag. Autolinks (`<https://…>`) don't match. */
const HTML_TAG = /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?\/?>/g;

/**
 * Removes HTML from a Note's text so only its Markdown is left to render.
 * Tags go but their inner text stays; `<br>`, `<p>` and `</p>` become line
 * breaks so the text keeps its lines.
 */
export function stripNoteHtml(text: string): string {
  return text.replace(LINE_BREAK_TAG, '\n').replace(HTML_TAG, '');
}
