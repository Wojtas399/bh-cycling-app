import type { ComponentProps } from 'react';

import type { Ionicons } from '@expo/vector-icons';

export type SportIconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Matched against intervals.icu's Activity `type` in order, first match wins.
 * Patterns rather than a list of every type, so a variant intervals.icu adds
 * (`VirtualRow`, `GravelRide`) still lands on its sport.
 */
const SPORT_ICONS: [RegExp, SportIconName][] = [
  [/Ride$|Velomobile|Handcycle/, 'bicycle'],
  [/Run$/, 'walk'],
  [/Walk|Hike/, 'footsteps'],
  [/Swim/, 'water'],
  [/WeightTraining|Crossfit/, 'barbell'],
  [/Row|Kayak|Canoe/, 'boat'],
  [/Ski|Snow/, 'snow'],
  [/Yoga|Pilates/, 'body'],
];

/** The Ionicons glyph for an Activity's sport, `fitness` when unknown. */
export function sportIcon(type: string): SportIconName {
  return SPORT_ICONS.find(([pattern]) => pattern.test(type))?.[1] ?? 'fitness';
}
