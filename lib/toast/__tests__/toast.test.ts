import { toast } from '@/lib/toast';
import * as Haptics from 'expo-haptics';
import { toast as sonner } from 'sonner-native';

jest.mock('sonner-native', () => ({
  toast: {
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    dismiss: jest.fn(),
  },
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

const mockSonner = jest.mocked(sonner);
const mockNotificationAsync = jest.mocked(Haptics.notificationAsync);

/** The id sonner knows the toast by: the one we passed, or the one it made. */
function shownToast(variant: 'success' | 'warning' | 'error', call: number) {
  const [, options] = mockSonner[variant].mock.calls[call];

  return {
    id: options?.id ?? mockSonner[variant].mock.results[call].value,
    press: () => options?.onPress?.(),
  };
}

describe('toast', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    let sonnerId = 0;

    for (const variant of ['success', 'warning', 'error'] as const) {
      mockSonner[variant].mockImplementation(() => `sonner-${++sonnerId}`);
    }
  });

  it.each(['success', 'warning', 'error'] as const)(
    'shows a %s toast with the message for 3000 ms',
    variant => {
      toast[variant]('Hasło zostało zmienione');

      expect(mockSonner[variant]).toHaveBeenCalledTimes(1);
      expect(mockSonner[variant]).toHaveBeenCalledWith(
        'Hasło zostało zmienione',
        expect.objectContaining({ duration: 3000 }),
      );
    },
  );

  it.each([
    ['success', Haptics.NotificationFeedbackType.Success],
    ['warning', Haptics.NotificationFeedbackType.Warning],
    ['error', Haptics.NotificationFeedbackType.Error],
  ] as const)('plays the matching haptic for a %s toast', (variant, type) => {
    toast[variant]('Message');

    expect(mockNotificationAsync).toHaveBeenCalledTimes(1);
    expect(mockNotificationAsync).toHaveBeenCalledWith(type);
  });

  it.each(['success', 'warning', 'error'] as const)(
    'dismisses a %s toast by its own id when it is tapped',
    variant => {
      toast[variant]('First');
      toast[variant]('Second');

      const first = shownToast(variant, 0);
      const second = shownToast(variant, 1);

      expect(first.id).not.toEqual(second.id);
      expect(mockSonner.dismiss).not.toHaveBeenCalled();

      first.press();

      expect(mockSonner.dismiss).toHaveBeenCalledTimes(1);
      expect(mockSonner.dismiss).toHaveBeenCalledWith(first.id);

      second.press();

      expect(mockSonner.dismiss).toHaveBeenLastCalledWith(second.id);
    },
  );
});
