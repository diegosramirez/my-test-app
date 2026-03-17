import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sends snake_case request body', () => {
    service.signupStep1({
      email: 'test@example.com',
      password: 'password1',
      passwordConfirmation: 'password1',
    }).subscribe();

    const req = httpMock.expectOne('/api/signup/step1');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'test@example.com',
      password: 'password1',
      password_confirmation: 'password1',
    });
    req.flush({ user_id: 'uuid', step: 1 });
  });

  it('maps snake_case response to camelCase', () => {
    let result: { userId: string; step: number } | undefined;
    service.signupStep1({
      email: 'a@b.com',
      password: 'password1',
      passwordConfirmation: 'password1',
    }).subscribe((res) => { result = res; });

    httpMock.expectOne('/api/signup/step1').flush({ user_id: 'test-uuid', step: 1 });
    expect(result!.userId).toBe('test-uuid');
    expect(result!.step).toBe(1);
  });

  it('applies NFC normalization to password fields', () => {
    const nfd = 'e\u0301'; // NFD
    const nfc = nfd.normalize('NFC');

    service.signupStep1({
      email: 'a@b.com',
      password: `pass${nfd}`,
      passwordConfirmation: `pass${nfd}`,
    }).subscribe();

    const req = httpMock.expectOne('/api/signup/step1');
    expect(req.request.body['password']).toBe(`pass${nfc}`);
    expect(req.request.body['password_confirmation']).toBe(`pass${nfc}`);
    req.flush({ user_id: 'id', step: 1 });
  });

  it('handles emoji passwords with NFC normalization', () => {
    const emojiPass = '🔑secure1';
    service.signupStep1({
      email: 'a@b.com',
      password: emojiPass,
      passwordConfirmation: emojiPass,
    }).subscribe();

    const req = httpMock.expectOne('/api/signup/step1');
    expect(req.request.body['password']).toBe(emojiPass.normalize('NFC'));
    req.flush({ user_id: 'id', step: 1 });
  });

  it('does not modify email (no NFC on email)', () => {
    service.signupStep1({
      email: 'Test@Example.COM',
      password: 'password1',
      passwordConfirmation: 'password1',
    }).subscribe();

    const req = httpMock.expectOne('/api/signup/step1');
    expect(req.request.body['email']).toBe('Test@Example.COM');
    req.flush({ user_id: 'id', step: 1 });
  });
});
