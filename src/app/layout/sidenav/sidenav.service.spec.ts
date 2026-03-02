import { TestBed } from '@angular/core/testing';
import { SidenavService } from './sidenav.service';
import { SidenavState } from './sidenav.models';

const initialState: SidenavState = {
  isOpen: false,
  breakpoint: 'desktop',
  mode: 'side',
};

describe('SidenavService', () => {
  let service: SidenavService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SidenavService],
    });
    service = TestBed.inject(SidenavService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial state', () => {
    it('should emit the initial state on state$', (done) => {
      service.state$.subscribe((state) => {
        expect(state).toEqual(initialState);
        done();
      });
    });

    it('should have isOpen$ emit false initially', (done) => {
      service.isOpen$.subscribe((isOpen) => {
        expect(isOpen).toBe(false);
        done();
      });
    });

    it('should have mode$ emit "side" initially', (done) => {
      service.mode$.subscribe((mode) => {
        expect(mode).toBe('side');
        done();
      });
    });
  });

  describe('open()', () => {
    it('should set isOpen to true', (done) => {
      const emitted: boolean[] = [];

      service.isOpen$.subscribe((isOpen) => {
        emitted.push(isOpen);
        if (emitted.length === 2) {
          expect(emitted[0]).toBe(false);
          expect(emitted[1]).toBe(true);
          done();
        }
      });

      service.open();
    });

    it('should update state$ with isOpen: true', (done) => {
      const emitted: SidenavState[] = [];

      service.state$.subscribe((state) => {
        emitted.push(state);
        if (emitted.length === 2) {
          expect(emitted[1].isOpen).toBe(true);
          done();
        }
      });

      service.open();
    });

    it('should not emit a duplicate state if already open', (done) => {
      const emitted: SidenavState[] = [];

      service.open();

      service.state$.subscribe((state) => {
        emitted.push(state);
      });

      service.open();

      // Allow async queue to flush
      setTimeout(() => {
        expect(emitted.length).toBe(1);
        done();
      }, 50);
    });
  });

  describe('close()', () => {
    it('should set isOpen to false after opening', (done) => {
      const emitted: boolean[] = [];

      service.isOpen$.subscribe((isOpen) => {
        emitted.push(isOpen);
        if (emitted.length === 3) {
          expect(emitted[0]).toBe(false);
          expect(emitted[1]).toBe(true);
          expect(emitted[2]).toBe(false);
          done();
        }
      });

      service.open();
      service.close();
    });

    it('should not emit a duplicate state if already closed', (done) => {
      const emitted: SidenavState[] = [];

      service.state$.subscribe((state) => {
        emitted.push(state);
      });

      service.close();

      setTimeout(() => {
        // Only the initial emission; close() on already-closed state is a no-op via distinctUntilChanged
        expect(emitted.length).toBe(1);
        done();
      }, 50);
    });
  });

  describe('toggle()', () => {
    it('should open the sidenav when it is closed', (done) => {
      const emitted: boolean[] = [];

      service.isOpen$.subscribe((isOpen) => {
        emitted.push(isOpen);
        if (emitted.length === 2) {
          expect(emitted[1]).toBe(true);
          done();
        }
      });

      service.toggle();
    });

    it('should close the sidenav when it is open', (done) => {
      const emitted: boolean[] = [];

      service.isOpen$.subscribe((isOpen) => {
        emitted.push(isOpen);
        if (emitted.length === 3) {
          expect(emitted[2]).toBe(false);
          done();
        }
      });

      service.toggle(); // open
      service.toggle(); // close
    });
  });

  describe('setBreakpoint()', () => {
    it('should update breakpoint to "mobile" and mode to "over"', (done) => {
      const emitted: SidenavState[] = [];

      service.state$.subscribe((state) => {
        emitted.push(state);
        if (emitted.length === 2) {
          expect(emitted[1].breakpoint).toBe('mobile');
          expect(emitted[1].mode).toBe('over');
          done();
        }
      });

      service.setBreakpoint('mobile');
    });

    it('should update breakpoint to "desktop" and mode to "side"', (done) => {
      const emitted: SidenavState[] = [];

      // Start from mobile
      service.setBreakpoint('mobile');

      service.state$.subscribe((state) => {
        emitted.push(state);
        if (emitted.length === 2) {
          expect(emitted[1].breakpoint).toBe('desktop');
          expect(emitted[1].mode).toBe('side');
          done();
        }
      });

      service.setBreakpoint('desktop');
    });

    it('should close the sidenav when switching to desktop', (done) => {
      const emitted: SidenavState[] = [];

      service.open();
      service.setBreakpoint('mobile');

      service.state$.subscribe((state) => {
        emitted.push(state);
        if (emitted.length === 2) {
          expect(emitted[1].isOpen).toBe(false);
          done();
        }
      });

      service.setBreakpoint('desktop');
    });
  });

  describe('syncOpenedState()', () => {
    it('should sync isOpen to true when passed true', (done) => {
      const emitted: boolean[] = [];

      service.isOpen$.subscribe((isOpen) => {
        emitted.push(isOpen);
        if (emitted.length === 2) {
          expect(emitted[1]).toBe(true);
          done();
        }
      });

      service.syncOpenedState(true);
    });

    it('should sync isOpen to false when passed false', (done) => {
      const emitted: boolean[] = [];

      service.open();

      service.isOpen$.subscribe((isOpen) => {
        emitted.push(isOpen);
        if (emitted.length === 2) {
          expect(emitted[1]).toBe(false);
          done();
        }
      });

      service.syncOpenedState(false);
    });

    it('should not emit if the state has not changed', (done) => {
      const emitted: SidenavState[] = [];

      service.state$.subscribe((state) => {
        emitted.push(state);
      });

      service.syncOpenedState(false); // already false

      setTimeout(() => {
        expect(emitted.length).toBe(1);
        done();
      }, 50);
    });
  });
});
