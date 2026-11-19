import type * as SplashScreenModule from '../splashScreen';

const mockHideAsync = jest.fn<Promise<void>, []>();

jest.mock('expo-splash-screen', () => ({
  hideAsync: () => mockHideAsync(),
}));

let hideSplashScreen: typeof SplashScreenModule.hideSplashScreen;

describe('hideSplashScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHideAsync.mockResolvedValue(undefined);

    // A fresh module per test, so an earlier test's hide doesn't count.
    jest.isolateModules(() => {
      ({ hideSplashScreen } =
        jest.requireActual<typeof SplashScreenModule>('../splashScreen'));
    });
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
    // An unhandled rejection would fail the test once the hide settles.
    await new Promise(resolve => setImmediate(resolve));

    expect(mockHideAsync).toHaveBeenCalledTimes(1);
  });
});
