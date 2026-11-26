import { getApp } from '@react-native-firebase/app';
import { getFunctions } from '@react-native-firebase/functions';

const FUNCTIONS_REGION = 'europe-west1';

export function functions() {
  return getFunctions(getApp(), FUNCTIONS_REGION);
}
