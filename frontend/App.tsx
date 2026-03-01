import { Toaster } from './components/ui/sonner';
import { AppModeProvider } from './context/AppModeContext';
import AppRouter from './routes';

const App = () => {
  return (
    <AppModeProvider>
      <AppRouter />
      <Toaster />
    </AppModeProvider>
  );
};

export default App;
