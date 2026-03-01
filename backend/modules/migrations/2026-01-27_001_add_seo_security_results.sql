CREATE TABLE IF NOT EXISTS seo_test_results (
  id SERIAL PRIMARY KEY,
  test_result_id INTEGER NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
  meta_tags JSONB NOT NULL DEFAULT '{}',
  headings JSONB NOT NULL DEFAULT '{}',
  images JSONB NOT NULL DEFAULT '{}',
  links JSONB NOT NULL DEFAULT '{}',
  structured_data JSONB NOT NULL DEFAULT '{}',
  mobile_friendly BOOLEAN DEFAULT false,
  page_speed_score DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (test_result_id)
);

CREATE INDEX IF NOT EXISTS idx_seo_test_results_test_result_id ON seo_test_results(test_result_id);

CREATE TABLE IF NOT EXISTS security_test_results (
  id SERIAL PRIMARY KEY,
  test_result_id INTEGER NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
  vulnerabilities JSONB NOT NULL DEFAULT '[]',
  security_headers JSONB NOT NULL DEFAULT '{}',
  ssl_info JSONB NOT NULL DEFAULT '{}',
  content_security_policy JSONB NOT NULL DEFAULT '{}',
  risk_level VARCHAR(20) NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (test_result_id)
);

CREATE INDEX IF NOT EXISTS idx_security_test_results_test_result_id ON security_test_results(test_result_id);

DROP TRIGGER IF EXISTS update_seo_test_results_updated_at ON seo_test_results;
CREATE TRIGGER update_seo_test_results_updated_at
  BEFORE UPDATE ON seo_test_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_security_test_results_updated_at ON security_test_results;
CREATE TRIGGER update_security_test_results_updated_at
  BEFORE UPDATE ON security_test_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
