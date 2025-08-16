/**
 * useTestData Hook
 */

import { useState, useEffect } from 'react';

export const useTestData = (testId?: string) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!testId) return;

    setLoading(true);
    setError(null);

    // 模拟数据获取
    setTimeout(() => {
      setData({ id: testId, status: 'completed', score: 85 });
      setLoading(false);
    }, 1000);
  }, [testId]);

  return { data, loading, error };
};
