import theme from '@/constants/theme';
import { noteMarkedStylesInSystemFont } from '@/lib/noteMarkedStyles';

describe('noteMarkedStylesInSystemFont', () => {
  it('sets no fontFamily on any element, since no app font is bundled and a custom family plus fontWeight drops the bold on Android', () => {
    const styles = Object.values(noteMarkedStylesInSystemFont(theme));

    expect(styles.length).toBeGreaterThan(0);
    styles.forEach(style => expect(style).not.toHaveProperty('fontFamily'));
  });
});
