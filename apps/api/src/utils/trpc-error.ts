type TRPCErrorMetadata = {
  path?: string;
  code: string;
  requestId?: string;
  cfRay?: string;
};

export function getTRPCErrorMetadata({
  path,
  code,
  requestId,
  cfRay,
}: TRPCErrorMetadata) {
  return {
    path: path ?? "unknown",
    code,
    requestId,
    cfRay,
  };
}
