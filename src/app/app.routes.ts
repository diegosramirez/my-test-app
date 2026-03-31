import { Routes } from '@angular/router';

// TODO: This /health route is a client-side health page, NOT an HTTP API endpoint.
// Automated infrastructure consumers (Kubernetes liveness probes, AWS ALB health checks,
// Datadog) cannot consume it without executing JavaScript.
// Follow-up ticket needed: server-side /api/health endpoint for Kubernetes probes and load balancers.
export const routes: Routes = [
  {
    path: 'health',
    loadComponent: () =>
      import('./health/health-check.component').then(
        (m) => m.HealthCheckComponent
      ),
  },
];
