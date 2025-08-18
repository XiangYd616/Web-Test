import React from 'react
interface LoginProps {
  // 定义组件属性
}
const Login: React.FC<LoginProps> = (props) => {
  return (
    <div className="login">
      <h1>Login</h1>
      <p>组件内容</p>
    </div>
  );
};
export default Login;