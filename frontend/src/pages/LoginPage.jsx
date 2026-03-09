import LoginForm from '../components/auth/LoginForm';
import ThemeToggle from '../components/common/ThemeToggle';

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">🌍 Recalled</h1>
          <p className="text-gray-600 dark:text-gray-400">Inicia sesión para gestionar tus reviews</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
