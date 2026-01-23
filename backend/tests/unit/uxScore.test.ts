const { calculateUXScore, scoreToGrade } = require('../../engines/shared/utils/uxScore');

describe('uxScore utils', () => {
  test('应根据指标计算评分', () => {
    const score = calculateUXScore({
      lcp: 3200,
      cls: 0.2,
      navigation: { ttfb: 1200 },
      fcp: 2400,
      fid: 180,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('高性能指标应得到较高分', () => {
    const score = calculateUXScore({
      lcp: 1800,
      cls: 0.02,
      navigation: { ttfb: 300 },
      fcp: 900,
      fid: 30,
    });
    expect(score).toBeGreaterThanOrEqual(85);
  });

  test('低性能指标应显著降分', () => {
    const score = calculateUXScore({
      lcp: 6000,
      cls: 0.4,
      navigation: { ttfb: 2500 },
      fcp: 4000,
      fid: 350,
    });
    expect(score).toBeLessThan(60);
  });

  test('应返回评分等级', () => {
    expect(scoreToGrade(95)).toBe('A');
    expect(scoreToGrade(85)).toBe('B');
    expect(scoreToGrade(75)).toBe('C');
    expect(scoreToGrade(65)).toBe('D');
    expect(scoreToGrade(40)).toBe('F');
  });
});
