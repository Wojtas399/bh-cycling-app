import { AppState, type AppStateStatus, Platform } from 'react-native';

import { setupAppFocus } from '../appFocus';
import { focusManager } from '@tanstack/react-query';

type FocusSetup = Parameters<typeof focusManager.setEventListener>[0];

const keepSetupWithoutRunningIt = () => undefined;

describe('setupAppFocus', () => {
  const originalOS = Platform.OS;
  const remove = jest.fn();
  let appStateListener: (state: AppStateStatus) => void;
  let focusSetupCapture: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, listener) => {
        appStateListener = listener;

        return { remove };
      });
    focusSetupCapture = jest
      .spyOn(focusManager, 'setEventListener')
      .mockImplementation(keepSetupWithoutRunningIt);
  });

  afterEach(() => {
    Platform.OS = originalOS;
    jest.restoreAllMocks();
  });

  function runSetup(handleFocus: jest.Mock) {
    setupAppFocus();

    const setup: FocusSetup = focusSetupCapture.mock.calls[0][0];

    return setup(handleFocus);
  }

  it('reports focus when the app becomes active', () => {
    const handleFocus = jest.fn();

    runSetup(handleFocus);
    appStateListener('active');

    expect(handleFocus).toHaveBeenCalledWith(true);
  });

  it('reports blur when the app goes to the background', () => {
    const handleFocus = jest.fn();

    runSetup(handleFocus);
    appStateListener('background');

    expect(handleFocus).toHaveBeenCalledWith(false);
  });

  it('unsubscribes from AppState', () => {
    const unsubscribe = runSetup(jest.fn());

    unsubscribe?.();

    expect(remove).toHaveBeenCalled();
  });

  it("leaves the library's own listener in place on web", () => {
    Platform.OS = 'web';

    setupAppFocus();

    expect(focusSetupCapture).not.toHaveBeenCalled();
  });
});
