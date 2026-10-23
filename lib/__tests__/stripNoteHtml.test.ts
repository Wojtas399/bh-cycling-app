import { stripNoteHtml } from '@/lib/stripNoteHtml';

describe('stripNoteHtml', () => {
  it('removes a tag and keeps its inner text', () => {
    expect(stripNoteHtml('Jedz <b>dużo</b> węgli')).toBe('Jedz dużo węgli');
  });

  it('keeps the text of tags with attributes and nested tags', () => {
    expect(
      stripNoteHtml('<span style="color: red">Uwaga: <i>nie</i> pij</span>'),
    ).toBe('Uwaga: nie pij');
  });

  it('turns <br> in any form into a line break', () => {
    expect(stripNoteHtml('Rano<br>Wieczór<br/>Noc<BR />Koniec')).toBe(
      'Rano\nWieczór\nNoc\nKoniec',
    );
  });

  it('turns <p> and </p> into line breaks', () => {
    expect(stripNoteHtml('<p>Pierwszy</p><p class="x">Drugi</p>')).toBe(
      '\nPierwszy\n\nDrugi\n',
    );
  });

  it('leaves plain Markdown unchanged', () => {
    const markdown = [
      '## 🍝 Odżywianie treningowe',
      '',
      '- **60–90 g** węgli na godzinę',
      '- _co 20 min_ żel, HR < 150 > Z1',
      '',
      '> Pij regularnie',
      '',
      '---',
      '',
      'Więcej: <https://intervals.icu> i [link](https://example.com)',
      '![wykres](https://example.com/a.png)',
    ].join('\n');

    expect(stripNoteHtml(markdown)).toBe(markdown);
  });
});
