import { TestBed } from '@angular/core/testing';
import { App } from './app';

/**
 * Defines the root application component test suite.
 * @returns {void} No return value.
 */
describe('App', () => {
  /**
   * Configures the Angular testing module before each test case.
   * @returns {Promise<void>} Promise resolved after the test module is compiled.
   */
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  /**
   * Verifies that the root app component can be instantiated.
   * @returns {void} No return value.
   */
  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  /**
   * Verifies that the root template renders the default title text.
   * @returns {void} No return value.
   */
  it('should render title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, join2');
  });
});
