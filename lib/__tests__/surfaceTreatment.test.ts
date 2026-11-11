import {
  type SurfaceEnvironment,
  resolveSurfaceTreatment,
} from '../surfaceTreatment';

const DEFAULT: SurfaceEnvironment = {
  liquidGlassAvailable: false,
  reduceTransparency: false,
  increaseContrast: false,
};

const HAIRLINE = 'rgba(255, 255, 255, 0.08)';
const HAIRLINE_STRONG = 'rgba(255, 255, 255, 0.30)';
const BG_TERTIARY = '#1C1C1E';

const FROST_PLAIN = {
  paint: 'frost',
  fill: 'rgba(255, 255, 255, 0.08)',
  hairline: 'rgba(255, 255, 255, 0.10)',
  topEdge: 'rgba(255, 255, 255, 0.30)',
};
const FROST_PROMINENT = {
  paint: 'frost',
  fill: 'rgba(236, 236, 240, 0.92)',
  hairline: 'rgba(255, 255, 255, 0.5)',
  topEdge: '#FFFFFF',
};

function env(overrides: Partial<SurfaceEnvironment>): SurfaceEnvironment {
  return { ...DEFAULT, ...overrides };
}

describe('resolveSurfaceTreatment', () => {
  describe('Sheen', () => {
    it('paints a gradient with a standard hairline', () => {
      expect(resolveSurfaceTreatment({ kind: 'sheen' }, env({}))).toEqual({
        paint: 'gradient',
        hairlineStrong: false,
      });
    });

    it('turns flat with a strong hairline under Increase Contrast', () => {
      expect(
        resolveSurfaceTreatment(
          { kind: 'sheen' },
          env({ increaseContrast: true }),
        ),
      ).toEqual({ paint: 'flat', hairlineStrong: true });
    });

    it.each([
      [{ reduceTransparency: true }, 'gradient', false],
      [{ liquidGlassAvailable: true }, 'gradient', false],
      [
        { reduceTransparency: true, liquidGlassAvailable: true },
        'gradient',
        false,
      ],
      [
        {
          reduceTransparency: true,
          liquidGlassAvailable: true,
          increaseContrast: true,
        },
        'flat',
        true,
      ],
    ])(
      'ignores Reduce Transparency and Liquid Glass (%o)',
      (overrides, paint, hairlineStrong) => {
        expect(
          resolveSurfaceTreatment({ kind: 'sheen' }, env(overrides)),
        ).toEqual({ paint, hairlineStrong });
      },
    );
  });

  describe('Glass backdrop', () => {
    it.each`
      liquidGlassAvailable | reduceTransparency | increaseContrast | paint       | hairlineStrong
      ${false}             | ${false}           | ${false}         | ${'tint'}   | ${false}
      ${false}             | ${false}           | ${true}          | ${'tint'}   | ${true}
      ${false}             | ${true}            | ${false}         | ${'opaque'} | ${false}
      ${false}             | ${true}            | ${true}          | ${'opaque'} | ${true}
      ${true}              | ${false}           | ${false}         | ${'native'} | ${false}
      ${true}              | ${false}           | ${true}          | ${'native'} | ${false}
      ${true}              | ${true}            | ${false}         | ${'native'} | ${false}
      ${true}              | ${true}            | ${true}          | ${'native'} | ${false}
    `(
      'is $paint (strong hairline: $hairlineStrong) with Liquid Glass $liquidGlassAvailable, Reduce Transparency $reduceTransparency, Increase Contrast $increaseContrast',
      ({ paint, hairlineStrong, ...environment }) => {
        expect(
          resolveSurfaceTreatment({ kind: 'backdrop' }, environment),
        ).toEqual({ paint, hairlineStrong });
      },
    );
  });

  describe('Glass control', () => {
    const SETTINGS = [
      { reduceTransparency: false, increaseContrast: false },
      { reduceTransparency: false, increaseContrast: true },
      { reduceTransparency: true, increaseContrast: false },
      { reduceTransparency: true, increaseContrast: true },
    ];

    it.each(SETTINGS)(
      'is native glass in the chrome with Liquid Glass, whatever the settings (%o)',
      settings => {
        const environment = env({ liquidGlassAvailable: true, ...settings });

        expect(
          resolveSurfaceTreatment(
            { kind: 'control', placement: 'chrome', prominent: false },
            environment,
          ),
        ).toEqual({ paint: 'native', prominent: false });
        expect(
          resolveSurfaceTreatment(
            { kind: 'control', placement: 'chrome', prominent: true },
            environment,
          ),
        ).toEqual({ paint: 'native', prominent: true });
      },
    );

    describe.each`
      where                                   | liquidGlassAvailable | placement
      ${'in the chrome without Liquid Glass'} | ${false}             | ${'chrome'}
      ${'in content without Liquid Glass'}    | ${false}             | ${'content'}
      ${'in content even with Liquid Glass'}  | ${true}              | ${'content'}
    `('$where', ({ liquidGlassAvailable, placement }) => {
      function resolve(
        prominent: boolean,
        settings: Partial<SurfaceEnvironment> = {},
      ) {
        return resolveSurfaceTreatment(
          { kind: 'control', placement, prominent },
          env({ liquidGlassAvailable, ...settings }),
        );
      }

      it('is plain Frost with a light top edge', () => {
        expect(resolve(false)).toEqual(FROST_PLAIN);
      });

      it('is near-white Frost when prominent', () => {
        expect(resolve(true)).toEqual(FROST_PROMINENT);
      });

      it('raises plain Frost to a 14% fill and the strong hairline under Increase Contrast', () => {
        expect(resolve(false, { increaseContrast: true })).toEqual({
          paint: 'frost',
          fill: 'rgba(255, 255, 255, 0.14)',
          hairline: HAIRLINE_STRONG,
          topEdge: 'rgba(255, 255, 255, 0.30)',
        });
      });

      // Its 50% white edge is already brighter than `hairlineStrong`.
      it('leaves prominent Frost alone under Increase Contrast', () => {
        expect(resolve(true, { increaseContrast: true })).toEqual(
          FROST_PROMINENT,
        );
      });

      it.each`
        increaseContrast | hairline
        ${false}         | ${HAIRLINE}
        ${true}          | ${HAIRLINE_STRONG}
      `(
        'turns plain Frost solid bgTertiary under Reduce Transparency (Increase Contrast $increaseContrast)',
        ({ increaseContrast, hairline }) => {
          expect(
            resolve(false, { reduceTransparency: true, increaseContrast }),
          ).toEqual({
            paint: 'opaque',
            fill: BG_TERTIARY,
            hairline,
            topEdge: hairline,
          });
        },
      );

      // Its label is near-black `textInverse`, which can't be read on
      // `bgTertiary`, so it turns solid white instead.
      it.each([false, true])(
        'turns prominent Frost solid white under Reduce Transparency (Increase Contrast %s)',
        increaseContrast => {
          expect(
            resolve(true, { reduceTransparency: true, increaseContrast }),
          ).toEqual({
            paint: 'opaque',
            fill: '#FFFFFF',
            hairline: HAIRLINE,
            topEdge: HAIRLINE,
          });
        },
      );
    });
  });
});
