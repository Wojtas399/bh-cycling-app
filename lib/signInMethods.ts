export type SignInMethod = 'email' | 'google';

interface UserWithProviders {
  providerData: readonly { providerId: string }[];
}

const METHOD_BY_PROVIDER_ID: Record<string, SignInMethod> = {
  password: 'email',
  'google.com': 'google',
};

export function getSignInMethods(
  user: UserWithProviders | null,
): SignInMethod[] {
  if (!user) return [];

  const methods = user.providerData
    .map(({ providerId }) => METHOD_BY_PROVIDER_ID[providerId])
    .filter((method): method is SignInMethod => method !== undefined);

  return [...new Set(methods)];
}
