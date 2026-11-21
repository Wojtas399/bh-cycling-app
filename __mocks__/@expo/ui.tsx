import type { ReactNode } from 'react';
import { View } from 'react-native';

export const BottomSheet = ({
  isPresented,
  children,
}: {
  isPresented: boolean;
  children?: ReactNode;
}) => (isPresented ? <View>{children}</View> : null);

export const RNHostView = ({ children }: { children: ReactNode }) => children;
