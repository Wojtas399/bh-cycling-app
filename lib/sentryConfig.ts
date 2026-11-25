export type SentryBuild = {
  dsn: string | undefined;
  appEnv: string | undefined;
  isDev: boolean;
};

type Headers = Record<string, string>;

type ScrubbableRequest = {
  url?: string;
  headers?: Headers;
};

type ScrubbableEvent = {
  request?: ScrubbableRequest;
};

const FILTERED = '[Filtered]';

function isSecretName(name: string): boolean {
  return /authorization|token|^code$|^state$/i.test(name);
}

function scrubUrl(url: string): string {
  return url.replace(
    /([?&#])([^=&#]+)=([^&#]*)/g,
    (param, separator: string, name: string) =>
      isSecretName(name) ? `${separator}${name}=${FILTERED}` : param,
  );
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
    url: request.url && scrubUrl(request.url),
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
