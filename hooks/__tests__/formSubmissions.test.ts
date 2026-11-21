import { resetOtherSubmissions } from '../formSubmissions';

function submission() {
  return { reset: jest.fn() };
}

describe('resetOtherSubmissions', () => {
  it('resets every submission but the one starting, so at most one carries an error', () => {
    const emailSignIn = submission();
    const googleSignIn = submission();
    const appleSignIn = submission();

    resetOtherSubmissions(emailSignIn, [
      emailSignIn,
      googleSignIn,
      appleSignIn,
    ]);

    expect(emailSignIn.reset).not.toHaveBeenCalled();
    expect(googleSignIn.reset).toHaveBeenCalledTimes(1);
    expect(appleSignIn.reset).toHaveBeenCalledTimes(1);
  });
});
