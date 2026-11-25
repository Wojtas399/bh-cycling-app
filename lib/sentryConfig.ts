export type SentryBuild = {
  dsn: string | undefined;
  appEnv: string | undefined;
  isDev: boolean;
};

type Headers = Record<string, string>;

type QueryParam = [name: string, value: string];

type QueryParams = string | Record<string, string> | QueryParam[];

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

function isSecretHeaderOrKey(name: string): boolean {
  return /authorization|token/i.test(name);
}

function isSecretQueryParam(name: string): boolean {
  return isSecretHeaderOrKey(name) || /^(code|state)$/i.test(name);
}

function filteredValue(name: string, value: string): string {
  return isSecretQueryParam(name) ? FILTERED : value;
}

function scrubQueryParam([name, value]: QueryParam): QueryParam {
  return [name, filteredValue(name, value)];
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

  if (Array.isArray(query)) return query.map(scrubQueryParam);

  return Object.fromEntries(Object.entries(query).map(scrubQueryParam));
}

function withoutSecretHeaders(headers: Headers): Headers {
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => !isSecretHeaderOrKey(name)),
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
      .filter(([key]) => !isSecretHeaderOrKey(key) && !isBodyName(key))
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
  if (!dsn?.startsWith('https://') || isDev) return null;

  return {
    dsn,
    environment: appEnv,
    sendDefaultPii: false,
    enableNetworkBreadcrumbs: false,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  };
}

export function sentryUser(
  user: { uid: string } | null,
): { id: string } | null {
  return user && { id: user.uid };
}
