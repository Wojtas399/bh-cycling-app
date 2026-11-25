import { reportError } from '../errorReporting';
import { reportOnFirstLayout } from '../renderErrorReport';

jest.mock('../errorReporting', () => ({
  reportError: jest.fn(),
}));

const mockReportError = jest.mocked(reportError);

const COMPONENT_STACK = '\n    at WorkoutScreen\n    at RootLayout';

function caughtRenderError(): Error & { componentStack?: string } {
  return new Error('Cannot read property "steps" of undefined');
}

describe('reportOnFirstLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports the error with the component stack React Native attaches to it after the fallback renders', () => {
    const error = caughtRenderError();
    const reportWhenLaidOut = reportOnFirstLayout(error);

    error.componentStack = COMPONENT_STACK;

    reportWhenLaidOut();

    expect(mockReportError).toHaveBeenCalledTimes(1);
    expect(mockReportError).toHaveBeenCalledWith(error, {
      componentStack: COMPONENT_STACK,
    });
  });
});
