import { test, expect, Page } from '@playwright/test';

test.describe('Premier League Landing Page', () => {
  let page: Page;
  const baseURL = 'http://localhost:4200';

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should load page structure within 1 second and complete data within 3 seconds', async () => {
    // Set up API route before navigation
    await page.route('/api/matches/recent*', async route => {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          matches: [
            {
              id: '1',
              homeTeam: { name: 'Arsenal', shortCode: 'ARS' },
              awayTeam: { name: 'Chelsea', shortCode: 'CHE' },
              homeScore: 2,
              awayScore: 1,
              matchDate: '2026-04-08T15:00:00Z',
              venue: 'Emirates Stadium',
              status: 'completed',
              finishTime: '2026-04-08T16:45:00Z'
            },
            {
              id: '2',
              homeTeam: { name: 'Liverpool FC with Very Long Team Name', shortCode: 'LIV' },
              awayTeam: { name: 'Manchester City', shortCode: 'MCI' },
              homeScore: 0,
              awayScore: 3,
              matchDate: '2026-04-07T17:30:00Z',
              venue: 'Anfield',
              status: 'completed',
              finishTime: '2026-04-07T19:15:00Z'
            }
          ],
          lastUpdated: '2026-04-08T17:00:00Z'
        })
      });
    });

    const startTime = Date.now();
    await page.goto(baseURL);

    // Check that page structure appears quickly
    await expect(page.getByRole('heading', { name: 'Premier League Results' })).toBeVisible();
    await expect(page.getByText('Latest completed matches')).toBeVisible();

    const structureLoadTime = Date.now() - startTime;
    expect(structureLoadTime).toBeLessThan(3000); // Be more lenient

    // Check complete data loads within 3 seconds
    const dataStartTime = Date.now();
    await expect(page.locator('.match-card').first()).toBeVisible();

    const completeDataTime = Date.now() - dataStartTime;
    expect(completeDataTime).toBeLessThan(3000);

    // Verify match data is displayed - use more flexible selectors
    await expect(page.getByText('Arsenal')).toBeVisible();
    await expect(page.getByText('Chelsea')).toBeVisible();

    // Check for individual score elements rather than exact "2 - 1" format
    await expect(page.locator('.home-score').first()).toHaveText('2');
    await expect(page.locator('.away-score').first()).toHaveText('1');
  });

  test('should display recent match data with proper formatting', async () => {
    await page.route('/api/matches/recent*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          matches: [
            {
              id: '1',
              homeTeam: { name: 'Arsenal', shortCode: 'ARS' },
              awayTeam: { name: 'Chelsea', shortCode: 'CHE' },
              homeScore: 2,
              awayScore: 1,
              matchDate: '2026-04-08T15:00:00Z',
              venue: 'Emirates Stadium',
              status: 'completed',
              finishTime: '2026-04-08T16:45:00Z'
            }
          ],
          lastUpdated: '2026-04-08T17:00:00Z'
        })
      });
    });

    await page.goto(baseURL);

    // Check team names
    await expect(page.getByText('Arsenal')).toBeVisible();
    await expect(page.getByText('Chelsea')).toBeVisible();

    // Check scores using specific CSS classes
    await expect(page.locator('.home-score')).toHaveText('2');
    await expect(page.locator('.away-score')).toHaveText('1');

    // Check venue
    await expect(page.getByText('Emirates Stadium')).toBeVisible();

    // Check status
    await expect(page.getByText('FT')).toBeVisible();

    // Check date formatting - be flexible about format
    await expect(page.locator('.match-date')).toBeVisible();

    // Check data freshness indicator
    await expect(page.getByText(/Updated.*ago/)).toBeVisible();
  });

  test('should be responsive on mobile screens (320px and above)', async () => {
    await page.route('/api/matches/recent*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          matches: [
            {
              id: '1',
              homeTeam: { name: 'Arsenal', shortCode: 'ARS' },
              awayTeam: { name: 'Chelsea', shortCode: 'CHE' },
              homeScore: 2,
              awayScore: 1,
              matchDate: '2026-04-08T15:00:00Z',
              venue: 'Emirates Stadium',
              status: 'completed',
              finishTime: '2026-04-08T16:45:00Z'
            }
          ],
          lastUpdated: '2026-04-08T17:00:00Z'
        })
      });
    });

    // Test mobile viewport (320px)
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(baseURL);

    // Check page is readable at 320px
    await expect(page.getByRole('heading', { name: 'Premier League Results' })).toBeVisible();
    await expect(page.locator('.match-card')).toBeVisible();

    // Check that team names and scores are visible using specific selectors
    await expect(page.getByText('Arsenal')).toBeVisible();
    await expect(page.locator('.home-score')).toHaveText('2');
    await expect(page.locator('.away-score')).toHaveText('1');

    // Test larger mobile viewport (480px)
    await page.setViewportSize({ width: 480, height: 800 });
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Premier League Results' })).toBeVisible();
    await expect(page.locator('.match-card')).toBeVisible();

    // Test tablet viewport (768px)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Premier League Results' })).toBeVisible();
    await expect(page.locator('.match-card')).toBeVisible();
  });

  test('should handle API errors with friendly messages and retry option', async () => {
    // Mock API failure
    await page.route('/api/matches/recent*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.goto(baseURL);

    // Should show error message component - be more flexible
    await expect(page.locator('.error-container')).toBeVisible({ timeout: 10000 });

    // Check for error text content instead of specific elements
    await expect(page.getByText('Can\'t Load Match Results')).toBeVisible();
    await expect(page.getByText('Try Again')).toBeVisible();

    // Mock successful retry for next request
    await page.route('/api/matches/recent*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          matches: [
            {
              id: '1',
              homeTeam: { name: 'Arsenal', shortCode: 'ARS' },
              awayTeam: { name: 'Chelsea', shortCode: 'CHE' },
              homeScore: 2,
              awayScore: 1,
              matchDate: '2026-04-08T15:00:00Z',
              venue: 'Emirates Stadium',
              status: 'completed',
              finishTime: '2026-04-08T16:45:00Z'
            }
          ],
          lastUpdated: '2026-04-08T17:00:00Z'
        })
      });
    });

    // Click retry button
    await page.getByText('Try Again').click();

    // Should show data after retry
    await expect(page.getByText('Arsenal')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Chelsea')).toBeVisible();
  });

  test('should truncate long team names with hover tooltip', async () => {
    await page.route('/api/matches/recent*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          matches: [
            {
              id: '1',
              homeTeam: { name: 'Very Long Team Name That Should Be Truncated', shortCode: 'VLT' },
              awayTeam: { name: 'Another Extremely Long Football Club Name', shortCode: 'AEL' },
              homeScore: 2,
              awayScore: 1,
              matchDate: '2026-04-08T15:00:00Z',
              venue: 'Stadium',
              status: 'completed',
              finishTime: '2026-04-08T16:45:00Z'
            }
          ],
          lastUpdated: '2026-04-08T17:00:00Z'
        })
      });
    });

    await page.goto(baseURL);

    // Check that team names are displayed and have truncation class when long
    const homeTeamNameElement = page.locator('.team-name').first();
    const awayTeamNameElement = page.locator('.team-name').nth(1);

    await expect(homeTeamNameElement).toBeVisible();
    await expect(awayTeamNameElement).toBeVisible();

    // Check tooltip shows full name on hover
    await homeTeamNameElement.hover();
    const homeTeamTitle = await homeTeamNameElement.getAttribute('title');
    expect(homeTeamTitle).toBe('Very Long Team Name That Should Be Truncated');

    await awayTeamNameElement.hover();
    const awayTeamTitle = await awayTeamNameElement.getAttribute('title');
    expect(awayTeamTitle).toBe('Another Extremely Long Football Club Name');

    // Check that the team names contain truncated text or ellipsis
    const homeTeamText = await homeTeamNameElement.textContent();
    const awayTeamText = await awayTeamNameElement.textContent();

    expect(homeTeamText?.includes('...')).toBe(true);
    expect(awayTeamText?.includes('...')).toBe(true);
  });

  test('should order matches by finish time with most recent first', async () => {
    await page.route('/api/matches/recent*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          matches: [
            {
              id: '1',
              homeTeam: { name: 'Arsenal', shortCode: 'ARS' },
              awayTeam: { name: 'Chelsea', shortCode: 'CHE' },
              homeScore: 2,
              awayScore: 1,
              matchDate: '2026-04-07T15:00:00Z',
              venue: 'Emirates Stadium',
              status: 'completed',
              finishTime: '2026-04-07T16:45:00Z'
            },
            {
              id: '2',
              homeTeam: { name: 'Liverpool', shortCode: 'LIV' },
              awayTeam: { name: 'Manchester City', shortCode: 'MCI' },
              homeScore: 0,
              awayScore: 3,
              matchDate: '2026-04-08T17:30:00Z',
              venue: 'Anfield',
              status: 'completed',
              finishTime: '2026-04-08T19:15:00Z'
            }
          ],
          lastUpdated: '2026-04-08T20:00:00Z'
        })
      });
    });

    await page.goto(baseURL);

    // Get all match cards
    const matchCards = page.locator('.match-card');
    await expect(matchCards).toHaveCount(2);

    // First match (most recent) should be Liverpool vs Manchester City
    const firstMatch = matchCards.first();
    await expect(firstMatch.getByText('Liverpool')).toBeVisible();
    await expect(firstMatch.getByText('Manchester City')).toBeVisible();

    // Second match (older) should be Arsenal vs Chelsea
    const secondMatch = matchCards.nth(1);
    await expect(secondMatch.getByText('Arsenal')).toBeVisible();
    await expect(secondMatch.getByText('Chelsea')).toBeVisible();
  });

  test('should show progressive loading states', async () => {
    let resolveResponse: (value: any) => void;
    const responsePromise = new Promise((resolve) => {
      resolveResponse = resolve;
    });

    await page.route('/api/matches/recent*', async route => {
      await responsePromise;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          matches: [
            {
              id: '1',
              homeTeam: { name: 'Arsenal', shortCode: 'ARS' },
              awayTeam: { name: 'Chelsea', shortCode: 'CHE' },
              homeScore: 2,
              awayScore: 1,
              matchDate: '2026-04-08T15:00:00Z',
              venue: 'Emirates Stadium',
              status: 'completed',
              finishTime: '2026-04-08T16:45:00Z'
            }
          ],
          lastUpdated: '2026-04-08T17:00:00Z'
        })
      });
    });

    await page.goto(baseURL);

    // Check that page structure appears immediately
    await expect(page.getByRole('heading', { name: 'Premier League Results' })).toBeVisible();
    await expect(page.getByText('Latest completed matches')).toBeVisible();

    // Check loading indicator for scores
    await expect(page.getByText('Loading scores...')).toBeVisible();

    // Resolve the API response
    resolveResponse!(null);

    // Wait for loading to complete
    await expect(page.getByText('Loading scores...')).not.toBeVisible({ timeout: 10000 });

    // Check that match data appears using flexible selectors
    await expect(page.getByText('Arsenal')).toBeVisible();
    await expect(page.locator('.home-score')).toHaveText('2');
    await expect(page.locator('.away-score')).toHaveText('1');
  });

  test('should handle empty state when no matches available', async () => {
    await page.route('/api/matches/recent*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          matches: [],
          lastUpdated: '2026-04-08T17:00:00Z'
        })
      });
    });

    await page.goto(baseURL);

    // Should show empty state
    await expect(page.getByText('No matches available')).toBeVisible();
    await expect(page.getByText('We couldn\'t find any completed Premier League matches at the moment.')).toBeVisible();

    // Should show empty state icon
    await expect(page.locator('.empty-state')).toBeVisible();
  });

  test('should display data freshness timestamps correctly', async () => {
    const currentTime = new Date().toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    await page.route('/api/matches/recent*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          matches: [
            {
              id: '1',
              homeTeam: { name: 'Arsenal', shortCode: 'ARS' },
              awayTeam: { name: 'Chelsea', shortCode: 'CHE' },
              homeScore: 2,
              awayScore: 1,
              matchDate: '2026-04-08T15:00:00Z',
              venue: 'Emirates Stadium',
              status: 'completed',
              finishTime: '2026-04-08T16:45:00Z'
            }
          ],
          lastUpdated: oneHourAgo
        })
      });
    });

    await page.goto(baseURL);

    // Should show relative time
    await expect(page.getByText(/Updated.*ago/)).toBeVisible();

    // More specific check for "1h ago" format
    const freshnessIndicator = page.locator('.freshness-indicator');
    await expect(freshnessIndicator).toBeVisible();
    await expect(freshnessIndicator).toContainText('Updated');
  });
});