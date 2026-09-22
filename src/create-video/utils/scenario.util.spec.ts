import { normalizeScenario } from './scenario.util';

describe('normalizeScenario', () => {
  it('converts scenario to lowercase', () => {
    // Arrange
    const scenario = 'A Hero Walks';

    // Act
    const normalized = normalizeScenario(scenario);

    // Assert
    expect(normalized).toBe('a hero walks');
  });
});
