type RequestHeaderReader = {
  header: (name: string) => string | undefined;
};

const generatedTraces = new WeakMap<object, RequestTrace>();

export type RequestTrace = {
  requestId: string;
  cfRay?: string;
};

export function getRequestTrace(request: RequestHeaderReader): RequestTrace {
  if (typeof request === "object" && request !== null) {
    const existingTrace = generatedTraces.get(request);
    if (existingTrace) return existingTrace;
  }

  const cfRay = request.header("cf-ray") ?? undefined;
  const requestId =
    request.header("x-request-id") ?? cfRay ?? crypto.randomUUID();

  const trace = { requestId, cfRay };

  if (typeof request === "object" && request !== null) {
    generatedTraces.set(request, trace);
  }

  return trace;
}
