export interface IntroTargetPosition {
  readonly x: string;
  readonly y: string;
  readonly width: string;
  readonly height: string;
}

/**
 * Measures an element position for intro animation targeting.
 * @param {string} selector - CSS selector of the target logo element.
 * @returns {IntroTargetPosition} Measured target rectangle or zero fallback.
 */
export function measureIntroTarget(selector: string): IntroTargetPosition {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) return createZeroTargetPosition();
  return mapRectToTargetPosition(element.getBoundingClientRect());
}

/**
 * Maps a DOM rectangle to intro target position values.
 * @param {DOMRect} rect - Measured element rectangle.
 * @returns {IntroTargetPosition} Target position in pixel strings.
 */
function mapRectToTargetPosition(rect: DOMRect): IntroTargetPosition {
  return {
    x: `${rect.left}px`,
    y: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}

/**
 * Creates a safe fallback target position.
 * @returns {IntroTargetPosition} Zero-sized fallback target.
 */
function createZeroTargetPosition(): IntroTargetPosition {
  return { x: '0px', y: '0px', width: '0px', height: '0px' };
}