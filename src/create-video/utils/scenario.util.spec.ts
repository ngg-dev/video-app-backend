import { normalizeScenario, stripCameraDirections } from './scenario.util';

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

describe('stripCameraDirections', () => {
  it('removes lines starting with "Камера:" and keeps the rest', () => {
    // Arrange
    const scenario = 'Начало: улица\n- Камера: наезд\nСередина: герой идёт';

    // Act
    const result = stripCameraDirections(scenario);

    // Assert
    expect(result).toBe('Начало: улица\nСередина: герой идёт');
  });

  it('returns the scenario unchanged when there are no camera lines', () => {
    // Arrange
    const scenario = 'Действие: герой идёт';

    // Act
    const result = stripCameraDirections(scenario);

    // Assert
    expect(result).toBe(scenario);
  });
});
