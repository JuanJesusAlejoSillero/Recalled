import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiChevronDown, FiGlobe, FiGrid, FiHome, FiLogOut, FiMapPin, FiMenu, FiPlus, FiSettings, FiStar, FiX } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import VersionBadge from './VersionBadge';
import { getContentListPath, getEnabledContentModules, getEnabledReviewableContentModules, isContentModuleEnabled } from '../../config/contentModules';

function Navbar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modulesMenuOpen, setModulesMenuOpen] = useState(false);
  const isPlacesEnabled = isContentModuleEnabled('place');
  const isMapEnabled = isPlacesEnabled && window.ENV?.ENABLE_MAP === 'true';
  const contentModules = getEnabledContentModules().filter((module) => module.contentType !== 'place');
  const hasReviewableModules = getEnabledReviewableContentModules().length > 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setModulesMenuOpen(false);
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2 text-primary-600 dark:text-primary-400 font-bold text-xl">
              <span>🌍</span>
              <span>Recalled</span>
            </Link>

            <div className="hidden lg:flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-2 rounded-md text-sm font-medium">
                <FiHome className="w-4 h-4" />
                <span>{t('nav.home')}</span>
              </Link>
              {isPlacesEnabled && (
                <Link to="/places" className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-2 rounded-md text-sm font-medium">
                  <FiMapPin className="w-4 h-4" />
                  <span>{t('nav.places')}</span>
                </Link>
              )}
              {contentModules.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setModulesMenuOpen((open) => !open)}
                    className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    <FiGrid className="w-4 h-4" />
                    <span>{t('nav.modules')}</span>
                    <FiChevronDown className={`w-4 h-4 transition-transform ${modulesMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {modulesMenuOpen && (
                    <div className="absolute left-0 z-20 mt-2 w-56 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                      {contentModules.map((module) => {
                        const Icon = module.icon;

                        return (
                          <Link
                            key={module.contentType}
                            to={getContentListPath(module.contentType)}
                            onClick={() => setModulesMenuOpen(false)}
                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-primary-400"
                          >
                            <Icon className="h-4 w-4" />
                            <span>{t(module.navKey)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <Link to="/my-reviews" className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-2 rounded-md text-sm font-medium">
                <FiStar className="w-4 h-4" />
                <span>{t('nav.myReviews')}</span>
              </Link>
              {isMapEnabled && (
                <Link to="/map" className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-2 rounded-md text-sm font-medium">
                  <FiGlobe className="w-4 h-4" />
                  <span>{t('nav.map')}</span>
                </Link>
              )}
              {hasReviewableModules && (
                <Link to="/reviews/new" className="flex items-center space-x-1 bg-primary-600 text-white hover:bg-primary-700 px-3 py-2 rounded-md text-sm font-medium">
                  <FiPlus className="w-4 h-4" />
                  <span>{t('nav.newReview')}</span>
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="hidden lg:inline"><VersionBadge /></span>
            <LanguageToggle />
            <ThemeToggle />
            {user?.is_admin && (
              <Link to="/admin" className="hidden lg:flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-2 rounded-md text-sm font-medium">
                <FiSettings className="w-4 h-4" />
                <span>{t('nav.admin')}</span>
              </Link>
            )}
            <Link to="/settings" className="text-sm text-gray-500 dark:text-gray-400 hidden lg:inline hover:text-primary-600 dark:hover:text-primary-400" title={t('nav.settings')}>{user?.username}</Link>
            <button
              onClick={handleLogout}
              className="hidden lg:flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 px-3 py-2 rounded-md text-sm font-medium"
            >
              <FiLogOut className="w-4 h-4" />
              <span>{t('nav.logout')}</span>
            </button>

            {/* Botón hamburguesa para móvil/tablet */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex items-center justify-center p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label={t('nav.openMenu')}
            >
              {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menú móvil/tablet desplegable */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="px-4 py-3 space-y-1">
            <Link to="/" onClick={closeMobileMenu} className="flex items-center space-x-3 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium">
              <FiHome className="w-5 h-5" />
              <span>{t('nav.home')}</span>
            </Link>
            {isPlacesEnabled && (
              <Link to="/places" onClick={closeMobileMenu} className="flex items-center space-x-3 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium">
                <FiMapPin className="w-5 h-5" />
                <span>{t('nav.places')}</span>
              </Link>
            )}
            {contentModules.map((module) => {
              const Icon = module.icon;

              return (
                <Link
                  key={module.contentType}
                  to={getContentListPath(module.contentType)}
                  onClick={closeMobileMenu}
                  className="flex items-center space-x-3 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium"
                >
                  <Icon className="w-5 h-5" />
                  <span>{t(module.navKey)}</span>
                </Link>
              );
            })}
            <Link to="/my-reviews" onClick={closeMobileMenu} className="flex items-center space-x-3 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium">
              <FiStar className="w-5 h-5" />
              <span>{t('nav.myReviews')}</span>
            </Link>
            {isMapEnabled && (
              <Link to="/map" onClick={closeMobileMenu} className="flex items-center space-x-3 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium">
                <FiGlobe className="w-5 h-5" />
                <span>{t('nav.map')}</span>
              </Link>
            )}
            {hasReviewableModules && (
              <Link to="/reviews/new" onClick={closeMobileMenu} className="flex items-center space-x-3 bg-primary-600 text-white hover:bg-primary-700 px-3 py-2 rounded-md text-base font-medium">
                <FiPlus className="w-5 h-5" />
                <span>{t('nav.newReview')}</span>
              </Link>
            )}
            {user?.is_admin && (
              <Link to="/admin" onClick={closeMobileMenu} className="flex items-center space-x-3 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-base font-medium">
                <FiSettings className="w-5 h-5" />
                <span>{t('nav.admin')}</span>
              </Link>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center space-x-2">
                  <Link to="/settings" onClick={closeMobileMenu} className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400">{user?.username}</Link>
                  <VersionBadge />
                </div>
                <button
                  onClick={() => { closeMobileMenu(); handleLogout(); }}
                  className="flex items-center space-x-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium"
                >
                  <FiLogOut className="w-4 h-4" />
                  <span>{t('nav.logout')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
