export function bleedPastVerticalPadding(parentPaddingVertical: number) {
  return { marginVertical: -parentPaddingVertical };
}

export function bleedHitArea(parentPaddingVertical: number) {
  return {
    ...bleedPastVerticalPadding(parentPaddingVertical),
    paddingVertical: parentPaddingVertical,
  };
}
