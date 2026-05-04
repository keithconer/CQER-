export type HttpResponseStatus =
  | 400
  | 401
  | 403
  | 404
  | 408
  | 500
  | 501
  | 502
  | 503
  | 504;

export type HttpResponseErrorMeta = {
  title: string;
  description: string;
  imageSrc: "/responseImageClient.png" | "/incoming.png" | "/responseImageServer.png";
  tone: "client" | "development" | "server";
};

export type HttpResponseErrorPayload = {
  error: string;
  status: HttpResponseStatus;
  title: string;
  description: string;
  imageSrc: HttpResponseErrorMeta["imageSrc"];
  tone: HttpResponseErrorMeta["tone"];
};

const HTTP_RESPONSE_ERROR_META: Record<HttpResponseStatus, HttpResponseErrorMeta> = {
  400: {
    title: "400 Bad Request",
    description: "The server cannot process the request because the request data is invalid or incomplete.",
    imageSrc: "/responseImageClient.png",
    tone: "client",
  },
  401: {
    title: "401 Unauthorized",
    description: "Authentication is required before this request can continue.",
    imageSrc: "/responseImageClient.png",
    tone: "client",
  },
  403: {
    title: "403 Forbidden",
    description: "The request was understood, but this account does not have permission to continue.",
    imageSrc: "/responseImageClient.png",
    tone: "client",
  },
  404: {
    title: "404 Not Found",
    description: "The requested resource could not be found.",
    imageSrc: "/responseImageClient.png",
    tone: "client",
  },
  408: {
    title: "408 Request Timeout",
    description: "The server waited too long for the request to complete.",
    imageSrc: "/responseImageClient.png",
    tone: "client",
  },
  500: {
    title: "500 Internal Server Error",
    description: "The server encountered an unexpected condition while processing the request.",
    imageSrc: "/responseImageServer.png",
    tone: "server",
  },
  501: {
    title: "501 Not Implemented",
    description: "This feature is still under development or is not available in the current request path yet.",
    imageSrc: "/incoming.png",
    tone: "development",
  },
  502: {
    title: "502 Bad Gateway",
    description: "The server received an invalid response from an upstream service.",
    imageSrc: "/responseImageServer.png",
    tone: "server",
  },
  503: {
    title: "503 Service Unavailable",
    description: "The service is temporarily unavailable due to overload or maintenance.",
    imageSrc: "/responseImageServer.png",
    tone: "server",
  },
  504: {
    title: "504 Gateway Timeout",
    description: "The server did not receive a timely response from an upstream service.",
    imageSrc: "/responseImageServer.png",
    tone: "server",
  },
};

export function getHttpResponseErrorMeta(status: HttpResponseStatus): HttpResponseErrorMeta {
  return HTTP_RESPONSE_ERROR_META[status];
}

export function buildHttpResponseErrorPayload(
  status: HttpResponseStatus,
  error: string
): HttpResponseErrorPayload {
  const meta = getHttpResponseErrorMeta(status);

  return {
    error,
    status,
    title: meta.title,
    description: meta.description,
    imageSrc: meta.imageSrc,
    tone: meta.tone,
  };
}

export class HttpResponseError extends Error {
  status: HttpResponseStatus;
  title: string;
  description: string;
  imageSrc: HttpResponseErrorMeta["imageSrc"];
  tone: HttpResponseErrorMeta["tone"];

  constructor(payload: HttpResponseErrorPayload) {
    super(payload.error);
    this.name = "HttpResponseError";
    this.status = payload.status;
    this.title = payload.title;
    this.description = payload.description;
    this.imageSrc = payload.imageSrc;
    this.tone = payload.tone;
  }
}

export function isHttpResponseErrorPayload(value: unknown): value is HttpResponseErrorPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<HttpResponseErrorPayload>;
  return (
    typeof candidate.error === "string" &&
    typeof candidate.status === "number" &&
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.imageSrc === "string" &&
    typeof candidate.tone === "string"
  );
}
