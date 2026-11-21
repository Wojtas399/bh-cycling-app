import type { ComponentProps } from 'react';

import type { Ionicons } from '@expo/vector-icons';

export type SportIconName = ComponentProps<typeof Ionicons>['name'];

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

const SPORTS_BY_FIRST_MATCHING_TYPE_PATTERN: [RegExp, Sport][] = [
  [/Ride$|Velomobile|Handcycle/, { icon: 'bicycle', label: 'sport.ride' }],
  [/Run$/, { icon: 'walk', label: 'sport.run' }],
  [/Walk|Hike/, { icon: 'footsteps', label: 'sport.walk' }],
  [/Swim/, { icon: 'water', label: 'sport.swim' }],
  [/WeightTraining|Crossfit/, { icon: 'barbell', label: 'sport.strength' }],
  [/Row|Kayak|Canoe/, { icon: 'boat', label: 'sport.rowing' }],
  [/Ski|Snow/, { icon: 'snow', label: 'sport.winter' }],
  [/Yoga|Pilates/, { icon: 'body', label: 'sport.yoga' }],
];

export const GENERIC_SPORT_ICON: SportIconName = 'fitness';

const GENERIC_SPORT: Sport = { icon: GENERIC_SPORT_ICON, label: 'sport.other' };

function sportOf(type: string): Sport {
  return (
    SPORTS_BY_FIRST_MATCHING_TYPE_PATTERN.find(([pattern]) =>
      pattern.test(type),
    )?.[1] ?? GENERIC_SPORT
  );
}

export function sportIcon(type: string): SportIconName {
  return sportOf(type).icon;
}

export function sportLabel(type: string): SportLabelKey {
  return sportOf(type).label;
}
