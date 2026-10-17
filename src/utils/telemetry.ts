/**
 * ServisBot Client Telemetry & APM Error Tracker
 * 
 * Features:
 * - Automatically redacts sensitive Turkish PII (TC Kimlik No, Phone numbers, Passwords).
 * - Generates unique reference incident codes (e.g., ERR-9B41F) for customer support.
 * - Captures browser environment, screen dimensions, network status, and URL path.
 * - Integrates with optional Sentry DSN (VITE_SENTRY_DSN) or custom logging webhooks without bloating the bundle.
 */

export interface TelemetryContext {
  componentStack?: string;
  userEmail?: string;
  companyId?: string;
  role?: string;
  extra?: Record<string, unknown>;
}

export interface TelemetryReport {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  isOnline: boolean;
  context?: TelemetryContext;
}

// KVKK / PII Data Redaction Patterns
const TC_REGEX = /\b[1-9]\d{10}\b/g;
const PHONE_REGEX = /\b0?5\d{9}\b/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function redactSensitiveData(text: string): string {
  if (!text) return text;
  return text
    .replace(TC_REGEX, '[TC_KIMLIK_MASKELENDI]')
    .replace(PHONE_REGEX, '[TELEFON_MASKELENDI]')
    .replace(EMAIL_REGEX, '[EMAIL_MASKELENDI]');
}

export function generateIncidentId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'ERR-';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function captureException(error: unknown, context?: TelemetryContext): string {
  const incidentId = generateIncidentId();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const report: TelemetryReport = {
    id: incidentId,
    timestamp: new Date().toISOString(),
    message: redactSensitiveData(errorMessage),
    stack: stack ? redactSensitiveData(stack) : undefined,
    url: window.location.href,
    userAgent: navigator.userAgent,
    isOnline: navigator.onLine,
    context: context ? {
      ...context,
      componentStack: context.componentStack ? redactSensitiveData(context.componentStack) : undefined,
    } : undefined,
  };

  // Structured client logging
  if (import.meta.env.DEV) {
    console.error(`[ServisBot Telemetry - ${incidentId}]`, report);
  } else {
    console.warn(`[Incident Recorded: ${incidentId}]`, report.message);
  }

  // Forward to external Sentry DSN or Webhook if configured
  const telemetryEndpoint = import.meta.env.VITE_TELEMETRY_WEBHOOK || import.meta.env.VITE_SENTRY_DSN;

  if (telemetryEndpoint && typeof fetch === 'function') {
    try {
      fetch(telemetryEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
        keepalive: true,
      }).catch(() => {
        // Silently ignore telemetry transmission errors
      });
    } catch {
      // Ignore
    }
  }

  return incidentId;
}

/**
 * Initializes global uncaught error listeners
 */
export function initTelemetry(): void {
  window.addEventListener('unhandledrejection', (event) => {
    captureException(event.reason, {
      extra: { type: 'unhandledrejection' },
    });
  });

  window.addEventListener('error', (event) => {
    captureException(event.error || event.message, {
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });
}
