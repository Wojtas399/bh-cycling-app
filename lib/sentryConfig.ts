export type SentryBuild = {
  dsn: string | undefined;
  appEnv: string | undefined;
  isDev: boolean;
};

type Headers = Record<string, string>;

type ScrubbableRequest = {
  headers?: Headers;
};

type ScrubbableEvent = {
  request?: ScrubbableRequest;
};

function isSecretName(name: string): boolean {
  return /authorization/i.test(name);
}

function withoutSecretHeaders(headers: Headers): Headers {
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => !isSecretName(name)),
  );
}

function scrubRequest<Request extends ScrubbableRequest>(
  request: Request,
): Request {
  return {
    ...request,
    headers: request.headers && withoutSecretHeaders(request.headers),
  };
}

function scrubEvent<Event extends ScrubbableEvent>(event: Event): Event {
  return { ...event, request: event.request && scrubRequest(event.request) };
}

export function sentryOptions({ dsn, appEnv, isDev }: SentryBuild) {
  if (!dsn || isDev) return null;

  return {
    dsn,
    environment: appEnv,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  };
}
