/**
 * Explicit terminal ACK for the legacy (nonprepaid) notification ingress.
 * A downstream semantic failure is never a 200; no secrets or original
 * payload details are returned to the sender. Does not authorize retries.
 */
export function sendLegacySemanticWebhookFailureV39(
  res: {
    headersSent: boolean;
    status: (status: number) => {json: (body: {received:false;error:string}) => unknown};
  },
): boolean {
  if (res.headersSent) return false;
  res.status(503).json({
    received: false,
    error: "Semantic webhook processing failed",
  });
  return true;
}
