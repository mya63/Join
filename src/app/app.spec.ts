import { TestBed } from '@angular/core/testing';
import { App } from './app';

/**
 * Configures the Angular testing module for root component tests.
 * @returns {Promise<void>} Promise resolved after component compilation.
 */
async function configureAppTestingModule(): Promise<void> {
  await TestBed.configureTestingModule({
    imports: [App],
  }).compileComponents();
}

/**
 * Asserts that the root app component can be created.
 * @returns {void} No return value.
 */
function assertAppCreated(): void {
  const fixture = TestBed.createComponent(App);
  const app = fixture.componentInstance;
  expect(app).toBeTruthy();
}

/**
 * Asserts that the root app template renders the expected title.
 * @returns {void} No return value.
 */
function assertAppTitleRendered(): void {
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  const compiled = fixture.nativeElement as HTMLElement;
  expect(compiled.querySelector('h1')?.textContent).toContain('Hello, join2');
}

/**
 * Defines the root application component test suite.
 * @returns {void} No return value.
 */
describe('App', () => {
  beforeEach(configureAppTestingModule);
  it('should create the app', assertAppCreated);
  it('should render title', assertAppTitleRendered);
});
