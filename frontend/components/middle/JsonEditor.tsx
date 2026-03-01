import { useTestConfig } from '../../context/TestContext';
import { trackCounter } from '../../utils/telemetry';

const JsonEditor = () => {
  const { configText, updateConfigText } = useTestConfig();
  return (
    <div className='json-editor'>
      <textarea
        className='json-editor-input'
        value={configText}
        onChange={event => {
          trackCounter('config.json_edit', { throttleMs: 500 });
          updateConfigText(event.target.value);
        }}
      />
    </div>
  );
};

export default JsonEditor;
