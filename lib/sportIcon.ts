import type { ComponentProps } from 'react';

import type { Ionicons } from '@expo/vector-icons';

export type SportIconName = ComponentProps<typeof Ionicons>['name'];

/** The i18n key of a sport's Polish label, e.g. "Bieg" for a run. */
export type SportLabelKey =
  | 'sport.ride'
  | 'sport.run'
  | 'sport.walk'
  | 'sport.swim'
  | 'sport.strength'
  | 'sport.rowing'
  | 'sport.winter'
  | 'sport.yoga'
  | 'sport.other';

interface Sport {
  icon: SportIconName;
  label: SportLabelKey;
}

/**
 * Matched against intervals.icu's Activity `type` in order, first match wins.
 * Patterns rather than a list of every type, so a variant intervals.icu adds
 * (`VirtualRow`, `GravelRide`) still lands on its sport. The icon and the
 * label come from the same entry, so they always name the same sport.
 */
const SPORTS: [RegExp, Sport][] = [
  [/Ride$|Velomobile|Handcycle/, { icon: 'bicycle', label: 'sport.ride' }],
  [/Run$/, { icon: 'walk', label: 'sport.run' }],
  [/Walk|Hike/, { icon: 'footsteps', label: 'sport.walk' }],
  [/Swim/, { icon: 'water', label: 'sport.swim' }],
  [/WeightTraining|Crossfit/, { icon: 'barbell', label: 'sport.strength' }],
  [/Row|Kayak|Canoe/, { icon: 'boat', label: 'sport.rowing' }],
  [/Ski|Snow/, { icon: 'snow', label: 'sport.winter' }],
  [/Yoga|Pilates/, { icon: 'body', label: 'sport.yoga' }],
];

/** The glyph for a sport that isn't known, or an Activity with none. */
export const GENERIC_SPORT_ICON: SportIconName = 'fitness';

const GENERIC_SPORT: Sport = { icon: GENERIC_SPORT_ICON, label: 'sport.other' };

function sportOf(type: string): Sport {
  return SPORTS.find(([pattern]) => pattern.test(type))?.[1] ?? GENERIC_SPORT;
}

/** The Ionicons glyph for an Activity's sport, the generic one when unknown. */
export function sportIcon(type: string): SportIconName {
  return sportOf(type).icon;
}

/**
 * The i18n key of an Activity's sport label, the generic "Aktywność" when
 * unknown. Matches the same sport as `sportIcon`.
 */
export function sportLabel(type: string): SportLabelKey {
  return sportOf(type).label;
}
