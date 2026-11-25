jest.mock('@/lib/errorReporting', () => ({
  reportError: jest.fn(),
  startErrorReporting: jest.fn(),
}));
