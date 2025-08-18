// 模块声明文件
declare module 'react' {
  export = React;
  export as namespace React;
  namespace React {
    type FC<P = {}> = FunctionComponent<P>;
    interface FunctionComponent<P = {}> {
      (props: P & { children?: ReactNode }): ReactElement | null;
    }
    type ReactElement = any;
    type ReactNode = any;
    type Component = any;
    type ComponentType = any;
    function useState<T>(initialState: T | (() => T)): [T, (value: T) => void];
    function useEffect(effect: () => void | (() => void), deps?: any[]): void;
    function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
    function useMemo<T>(factory: () => T, deps: any[]): T;
    function useRef<T>(initialValue: T): { current: T };
    function useContext<T>(context: any): T;
    function createContext<T>(defaultValue: T): any;
    const Fragment: any;
    const StrictMode: any;
  }
}

declare module 'react-dom/client' {
  export function createRoot(container: any): {
    render(element: any): void;
  };
}

declare module 'react-router-dom' {
  export const BrowserRouter: any;
  export const Router: any;
  export const Routes: any;
  export const Route: any;
  export const Navigate: any;
  export const Link: any;
  export const NavLink: any;
  export const useNavigate: () => any;
  export const useLocation: () => any;
  export const useParams: () => any;
}

declare module 'antd' {
  export const ConfigProvider: any;
  export const theme: any;
  export const Button: any;
  export const Card: any;
  export const Input: any;
  export const Form: any;
  export const Table: any;
  export const Modal: any;
  export const message: any;
  export const notification: any;
  export const Spin: any;
  export const Alert: any;
  export const Progress: any;
  export const Space: any;
  export const Typography: any;
  export const Row: any;
  export const Col: any;
  export const Statistic: any;
  export const Divider: any;
  export const Layout: any;
  export const Menu: any;
  export const Breadcrumb: any;
  export const Dropdown: any;
  export const Avatar: any;
  export const Badge: any;
  export const Tag: any;
  export const Tooltip: any;
  export const Popover: any;
  export const Drawer: any;
  export const Tabs: any;
  export const Steps: any;
  export const DatePicker: any;
  export const TimePicker: any;
  export const Select: any;
  export const Checkbox: any;
  export const Radio: any;
  export const Switch: any;
  export const Slider: any;
  export const Rate: any;
  export const Upload: any;
  export const Tree: any;
  export const TreeSelect: any;
  export const Cascader: any;
  export const AutoComplete: any;
  export const Transfer: any;
  export const Pagination: any;
  export const BackTop: any;
  export const Anchor: any;
  export const Affix: any;
  export const Calendar: any;
  export const List: any;
  export const Empty: any;
  export const Result: any;
  export const Skeleton: any;
}

declare module 'antd/locale/zh_CN' {
  const zhCN: any;
  export default zhCN;
}

declare module '@ant-design/icons' {
  export const PlayCircleOutlined: any;
  export const PauseCircleOutlined: any;
  export const StopOutlined: any;
  export const ReloadOutlined: any;
  export const SettingOutlined: any;
  export const UserOutlined: any;
  export const HomeOutlined: any;
  export const DashboardOutlined: any;
  export const TestOutlined: any;
  export const BarChartOutlined: any;
  export const FileTextOutlined: any;
  export const QuestionCircleOutlined: any;
  export const LogoutOutlined: any;
  export const MenuFoldOutlined: any;
  export const MenuUnfoldOutlined: any;
  export const SearchOutlined: any;
  export const PlusOutlined: any;
  export const EditOutlined: any;
  export const DeleteOutlined: any;
  export const DownloadOutlined: any;
  export const UploadOutlined: any;
  export const ExportOutlined: any;
  export const ImportOutlined: any;
  export const CopyOutlined: any;
  export const ShareAltOutlined: any;
  export const PrinterOutlined: any;
  export const MailOutlined: any;
  export const PhoneOutlined: any;
  export const GlobalOutlined: any;
  export const LockOutlined: any;
  export const UnlockOutlined: any;
  export const EyeOutlined: any;
  export const EyeInvisibleOutlined: any;
  export const CheckOutlined: any;
  export const CloseOutlined: any;
  export const ExclamationCircleOutlined: any;
  export const InfoCircleOutlined: any;
  export const WarningOutlined: any;
  export const LoadingOutlined: any;
  export const SyncOutlined: any;
  export const RedoOutlined: any;
  export const UndoOutlined: any;
  export const ZoomInOutlined: any;
  export const ZoomOutOutlined: any;
  export const FullscreenOutlined: any;
  export const FullscreenExitOutlined: any;
  export const CompressOutlined: any;
  export const ExpandOutlined: any;
  export const ArrowLeftOutlined: any;
  export const ArrowRightOutlined: any;
  export const ArrowUpOutlined: any;
  export const ArrowDownOutlined: any;
  export const CaretLeftOutlined: any;
  export const CaretRightOutlined: any;
  export const CaretUpOutlined: any;
  export const CaretDownOutlined: any;
  export const LeftOutlined: any;
  export const RightOutlined: any;
  export const UpOutlined: any;
  export const DownOutlined: any;
}

// 通用模块声明
declare module '*' {
  const content: any;
  export default content;
}
