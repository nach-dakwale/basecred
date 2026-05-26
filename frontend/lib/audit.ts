export function auditEvent(event: string, values: Record<string, string | number | boolean | undefined>): void {
  console.info(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    ...values,
  }));
}
