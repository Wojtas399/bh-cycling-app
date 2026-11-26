import * as deployedFunctions from '../index';

describe('the deployed Cloud Functions', () => {
  it.each(Object.entries(deployedFunctions))(
    'deploys %s to europe-west1 only',
    (_name, deployedFunction) => {
      expect(deployedFunction.__endpoint.region).toEqual(['europe-west1']);
    },
  );
});
