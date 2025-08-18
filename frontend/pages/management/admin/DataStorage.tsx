import React from 'react
interface DataStorageProps {
  // 定义组件属性
}
const DataStorage: React.FC<DataStorageProps> = (props) => {
  return (
    <div className="datastorage">
      <h1>DataStorage</h1>
      <p>组件内容</p>
    </div>
  );
};
export default DataStorage;