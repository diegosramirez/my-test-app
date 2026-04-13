import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { FormDataService } from './form-data.service';

describe('FormDataService', () => {
  let service: FormDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FormDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return team form data', async () => {
    const teamForm = await firstValueFrom(service.getTeamForm(1, 5));
    expect(teamForm).toBeTruthy();
    expect(teamForm.teamId).toBe(1);
    expect(teamForm.matches).toHaveLength(5);
    expect(teamForm.winPercentage).toBeGreaterThanOrEqual(0);
    expect(teamForm.winPercentage).toBeLessThanOrEqual(1);
  });

  it('should return multiple team forms', async () => {
    const teamIds = [1, 2, 3];
    const forms = await firstValueFrom(service.getMultipleTeamForms(teamIds, 5));
    expect(forms).toHaveLength(3);
    expect(forms[0].teamId).toBe(1);
    expect(forms[1].teamId).toBe(2);
    expect(forms[2].teamId).toBe(3);
  });

  it('should calculate correct points from matches', async () => {
    const teamForm = await firstValueFrom(service.getTeamForm(1, 10));
    const expectedPoints = teamForm.matches.reduce((total, match) => {
      if (match.result === 'win') return total + 3;
      if (match.result === 'draw') return total + 1;
      return total;
    }, 0);
    expect(teamForm.points).toBe(expectedPoints);
  });

  it('should calculate win percentage correctly', async () => {
    const teamForm = await firstValueFrom(service.getTeamForm(1, 10));
    const wins = teamForm.matches.filter(m => m.result === 'win').length;
    const expectedWinPercentage = wins / teamForm.matches.length;
    expect(teamForm.winPercentage).toBe(expectedWinPercentage);
  });
});