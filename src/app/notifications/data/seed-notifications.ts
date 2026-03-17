import { AppNotification } from '../models/notification.model';

const now = Date.now();
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function getYesterdayAt(hoursFromMidnight: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - DAY + hoursFromMidnight * HOUR);
  return yesterday.toISOString();
}

export const SEED_NOTIFICATIONS: readonly AppNotification[] = [
  {
    id: 'n1',
    type: 'success',
    title: 'Deployment completed',
    description: 'Your application was successfully deployed to production environment v2.4.1.',
    timestamp: new Date(now - 5 * MINUTE).toISOString(),
  },
  {
    id: 'n2',
    type: 'info',
    title: 'New team member joined',
    description: 'Sarah Chen has joined the Frontend team. Say hello and help them get started!',
    timestamp: new Date(now - 32 * MINUTE).toISOString(),
  },
  {
    id: 'n3',
    type: 'warning',
    title: 'API rate limit approaching',
    description: 'Your application has used 85% of the daily API quota. Consider optimizing request frequency to avoid service interruption.',
    timestamp: new Date(now - 2 * HOUR).toISOString(),
  },
  {
    id: 'n4',
    type: 'error',
    title: 'Build pipeline failed',
    description: 'The CI/CD pipeline for branch feature/auth-redesign failed at the lint stage. Check the logs for details.',
    timestamp: new Date(now - 4 * HOUR).toISOString(),
  },
  {
    id: 'n5',
    type: 'info',
    title: 'Scheduled maintenance window',
    description: 'Database maintenance is scheduled for Saturday 2:00 AM - 4:00 AM UTC. Expect brief downtime.',
    timestamp: new Date(now - 6 * HOUR).toISOString(),
  },
  {
    id: 'n6',
    type: 'success',
    title: 'Performance report ready',
    description: 'Your weekly performance report has been generated. Core Web Vitals improved by 12%.',
    timestamp: getYesterdayAt(14),
  },
  {
    id: 'n7',
    type: 'warning',
    title: 'Disk usage high',
    description: 'Server disk usage is at 92%. Consider cleaning up old logs and temporary files to prevent issues.',
    timestamp: getYesterdayAt(10),
  },
  {
    id: 'n8',
    type: 'info',
    title: 'New comment on PR #247',
    description: 'Alex Rivera commented: "Looks good overall, but can we add unit tests for the edge case with empty arrays?"',
    timestamp: getYesterdayAt(8),
  },
  {
    id: 'n9',
    type: 'error',
    title: 'SSL certificate expiring soon',
    description: 'The SSL certificate for api.example.com expires in 7 days. Renew it to avoid service disruption.',
    timestamp: new Date(now - 3 * DAY).toISOString(),
  },
  {
    id: 'n10',
    type: 'success',
    title: 'Milestone achieved',
    description: 'Congratulations! Your project reached 1,000 active users this week. ThisIsAVeryLongUnbrokenWordToTestOverflowHandlingInTheUI.',
    timestamp: new Date(now - 4 * DAY).toISOString(),
  },
  {
    id: 'n11',
    type: 'info',
    title: 'Security patch available',
    description: 'A critical security update is available for dependency lodash@4.17.20. Update recommended.',
    timestamp: new Date(now - 6 * DAY).toISOString(),
  },
  {
    id: 'n12',
    type: 'warning',
    title: 'Unused feature flags detected',
    description: 'Three feature flags have not been evaluated in over 30 days. Consider removing stale flags to reduce complexity.',
    timestamp: new Date(now - 10 * DAY).toISOString(),
  },
];
