export type SentryBuild = {
  dsn: string | undefined;
  appEnv: string | undefined;
  isDev: boolean;
};

type Headers = Record<string, string>;

type QueryParams = string | Record<string, string> | [string, string][];

type ScrubbableRequest = {
  url?: string;
  query_string?: QueryParams;
  headers?: Headers;
  data?: unknown;
  cookies?: Record<string, string>;
};

type ScrubbableEvent = {
  request?: ScrubbableRequest;
};

type BreadcrumbData = Record<string, unknown>;

type ScrubbableBreadcrumb = {
  message?: string;
  data?: BreadcrumbData;
};

const FILTERED = '[Filtered]';

function isSecretField(name: string): boolean {
  return /authorization|token/i.test(name);
}

function isSecretParam(name: string): boolean {
  return isSecretField(name) || /^(code|state)$/i.test(name);
}

function filteredValue(name: string, value: string): string {
  return isSecretParam(name) ? FILTERED : value;
}

function scrubParams(params: string): string {
  return params.replace(
    /(^|&)([^=&]+)=([^&]*)/g,
    (_param, separator: string, name: string, value: string) =>
      `${separator}${name}=${filteredValue(name, value)}`,
  );
}

function scrubUrl(url: string): string {
  return url.replace(
    /([?#])([^#]*)/g,
    (_part, mark: string, params: string) => `${mark}${scrubParams(params)}`,
  );
}

function scrubQuery(query: QueryParams): QueryParams {
  if (typeof query === 'string') return scrubParams(query);

  if (Array.isArray(query)) {
    return query.map(([name, value]): [string, string] => [
      name,
      filteredValue(name, value),
    ]);
  }

  return Object.fromEntries(
    Object.entries(query).map(([name, value]) => [
      name,
      filteredValue(name, value),
    ]),
  );
}

function withoutSecretHeaders(headers: Headers): Headers {
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => !isSecretField(name)),
  );
}

function scrubRequest<Request extends ScrubbableRequest>(
  request: Request,
): Omit<Request, 'data' | 'cookies'> {
  const { data, cookies, ...kept } = request;

  return {
    ...kept,
    url: kept.url && scrubUrl(kept.url),
    query_string: kept.query_string && scrubQuery(kept.query_string),
    headers: kept.headers && withoutSecretHeaders(kept.headers),
  };
}

function scrubEvent<Event extends ScrubbableEvent>(event: Event): Event {
  return { ...event, request: event.request && scrubRequest(event.request) };
}

function isBodyName(name: string): boolean {
  return /(^|[_.])body$/i.test(name);
}

function scrubBreadcrumbValue(value: unknown): unknown {
  if (typeof value === 'string') return scrubUrl(value);

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return scrubBreadcrumbData(value);
  }

  return value;
}

function scrubBreadcrumbData(data: object): BreadcrumbData {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([key]) => !isSecretField(key) && !isBodyName(key))
      .map(([key, value]) => [key, scrubBreadcrumbValue(value)]),
  );
}

function scrubBreadcrumb<Breadcrumb extends ScrubbableBreadcrumb>(
  breadcrumb: Breadcrumb,
): Breadcrumb {
  return {
    ...breadcrumb,
    message: breadcrumb.message && scrubUrl(breadcrumb.message),
    data: breadcrumb.data && scrubBreadcrumbData(breadcrumb.data),
  };
}

export function sentryOptions({ dsn, appEnv, isDev }: SentryBuild) {
  if (!dsn || isDev) return null;

  return {
    dsn,
    environment: appEnv,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  };
}

export function sentryUser(
  user: { uid: string } | null,
): { id: string } | null {
  return user && { id: user.uid };
}
