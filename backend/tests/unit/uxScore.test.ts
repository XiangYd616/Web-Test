const { calculateUXScore, scoreToGrade } = require('../../engines/shared/utils/uxScore');

describe('uxScore utils', () => {
  test('应根据指标计算评分', () => {
    const score = calculateUXScore({
      lcp: 3200,
      cls: 0.2,
      navigation: { ttfb: 1200 },
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('应返回评分等级', () => {
    expect(scoreToGrade(95)).toBe('A');
    expect(scoreToGrade(85)).toBe('B');
    expect(scoreToGrade(75)).toBe('C');
    expect(scoreToGrade(65)).toBe('D');
    expect(scoreToGrade(40)).toBe('F');
  });
});
