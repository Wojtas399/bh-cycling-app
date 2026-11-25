import { reportError } from '../errorReporting';
import { reportOnFirstLayout } from '../renderErrorReport';

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

  it('reports it only once, however often the fallback lays out again', () => {
    const reportWhenLaidOut = reportOnFirstLayout(caughtRenderError());

    reportWhenLaidOut();
    reportWhenLaidOut();
    reportWhenLaidOut();

    expect(mockReportError).toHaveBeenCalledTimes(1);
  });

  it('reports a thrown string without a stack, since React Native attaches it only to an Error', () => {
    reportOnFirstLayout('workout missing')();

    expect(mockReportError).toHaveBeenCalledWith('workout missing', {
      componentStack: undefined,
    });
  });
});
