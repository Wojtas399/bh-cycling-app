const BR_OR_P_TAG_ANY_CASE = /<(?:br\s*\/?|\/?p(?:\s[^>]*)?)>/gi;
const HTML_TAG_BUT_NOT_AUTOLINK = /<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?\/?>/g;

export function stripNoteHtml(text: string): string {
  return text
    .replace(BR_OR_P_TAG_ANY_CASE, '\n')
    .replace(HTML_TAG_BUT_NOT_AUTOLINK, '');
}
