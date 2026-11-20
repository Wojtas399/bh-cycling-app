import type * as SplashScreenModule from '../splashScreen';

const mockHideAsync = jest.fn<Promise<void>, []>();

jest.mock('expo-splash-screen', () => ({
  hideAsync: () => mockHideAsync(),
}));

let hideSplashScreen: typeof SplashScreenModule.hideSplashScreen;

function loadSplashScreenNeverHiddenBefore() {
  jest.isolateModules(() => {
    ({ hideSplashScreen } =
      jest.requireActual<typeof SplashScreenModule>('../splashScreen'));
  });
}

function letTheHideSettleSoAnUnhandledRejectionFails() {
  return new Promise(resolve => setImmediate(resolve));
}

describe('hideSplashScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHideAsync.mockResolvedValue(undefined);
    loadSplashScreenNeverHiddenBefore();
  });

  it('hides the splash', () => {
    hideSplashScreen();

    expect(mockHideAsync).toHaveBeenCalledTimes(1);
  });

  it('hides it only once, however often the root view lays out again', () => {
    hideSplashScreen();
    hideSplashScreen();
    hideSplashScreen();

    expect(mockHideAsync).toHaveBeenCalledTimes(1);
  });

  it('swallows a failed hide', async () => {
    mockHideAsync.mockRejectedValue(new Error('no splash'));

    hideSplashScreen();
    await letTheHideSettleSoAnUnhandledRejectionFails();

    expect(mockHideAsync).toHaveBeenCalledTimes(1);
  });
});
