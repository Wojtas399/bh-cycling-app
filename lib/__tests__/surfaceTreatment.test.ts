import {
  type SurfaceEnvironment,
  resolveSurfaceTreatment,
} from '../surfaceTreatment';

const DEFAULT: SurfaceEnvironment = {
  liquidGlassAvailable: false,
  reduceTransparency: false,
  increaseContrast: false,
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
    it.each`
      liquidGlassAvailable | placement    | reduceTransparency | increaseContrast | paint       | hairlineStrong
      ${false}             | ${'chrome'}  | ${false}           | ${false}         | ${'frost'}  | ${false}
      ${false}             | ${'chrome'}  | ${false}           | ${true}          | ${'frost'}  | ${true}
      ${false}             | ${'chrome'}  | ${true}            | ${false}         | ${'opaque'} | ${false}
      ${false}             | ${'chrome'}  | ${true}            | ${true}          | ${'opaque'} | ${true}
      ${false}             | ${'content'} | ${false}           | ${false}         | ${'frost'}  | ${false}
      ${false}             | ${'content'} | ${false}           | ${true}          | ${'frost'}  | ${true}
      ${false}             | ${'content'} | ${true}            | ${false}         | ${'opaque'} | ${false}
      ${false}             | ${'content'} | ${true}            | ${true}          | ${'opaque'} | ${true}
      ${true}              | ${'chrome'}  | ${false}           | ${false}         | ${'native'} | ${false}
      ${true}              | ${'chrome'}  | ${false}           | ${true}          | ${'native'} | ${false}
      ${true}              | ${'chrome'}  | ${true}            | ${false}         | ${'native'} | ${false}
      ${true}              | ${'chrome'}  | ${true}            | ${true}          | ${'native'} | ${false}
      ${true}              | ${'content'} | ${false}           | ${false}         | ${'frost'}  | ${false}
      ${true}              | ${'content'} | ${false}           | ${true}          | ${'frost'}  | ${true}
      ${true}              | ${'content'} | ${true}            | ${false}         | ${'opaque'} | ${false}
      ${true}              | ${'content'} | ${true}            | ${true}          | ${'opaque'} | ${true}
    `(
      'in $placement is $paint (strong hairline: $hairlineStrong) with Liquid Glass $liquidGlassAvailable, Reduce Transparency $reduceTransparency, Increase Contrast $increaseContrast',
      ({ placement, paint, hairlineStrong, ...environment }) => {
        expect(
          resolveSurfaceTreatment({ kind: 'control', placement }, environment),
        ).toEqual({ paint, hairlineStrong });
      },
    );
  });
});
