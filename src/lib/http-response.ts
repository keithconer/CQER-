import { NextResponse } from "next/server";

import {
  buildHttpResponseErrorPayload,
  type HttpResponseErrorPayload,
  type HttpResponseStatus,
} from "@/lib/http-response-error";

export function createHttpErrorResponse(
  status: HttpResponseStatus,
  error: string,
  init?: ResponseInit
) {
  const payload: HttpResponseErrorPayload = buildHttpResponseErrorPayload(status, error);
  return NextResponse.json(payload, {
    ...init,
    status,
  });
}
