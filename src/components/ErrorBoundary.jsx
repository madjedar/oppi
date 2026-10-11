import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { translations } from '../data/translations';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const lang = (typeof window !== 'undefined' && localStorage.getItem('oppi_lang')) || 'ar';
      const dir = lang === 'ar' ? 'rtl' : 'ltr';
      const t = (key) => translations[lang]?.[key] || translations['en']?.[key] || translations['ar']?.[key] || key;

      return (
        <div className="min-h-screen flex items-center justify-center bg-brand-cream p-4" dir={dir}>
          <div className="max-w-md w-full bg-white rounded-[32px] shadow-sm p-8 text-center border border-brand-border">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-100">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-black text-brand-brown mb-3 tracking-wide">
              {t('errorBoundaryTitle')}
            </h1>
            
            <p className="text-brand-brownLight text-sm leading-relaxed mb-8">
              {t('errorBoundaryDesc')}
            </p>

            <button 
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-brown text-white py-4 rounded-full font-bold transition-all shadow-md hover:shadow-xl hover:-translate-y-1"
            >
              <RefreshCcw className="w-5 h-5" />
              <span>{t('reloadPage')}</span>
            </button>

            {import.meta.env.DEV && this.state.error && (
              <div className="mt-8 text-left">
                <p className="text-xs font-bold text-red-500 mb-2" dir="ltr">Developer Details:</p>
                <pre className="bg-brand-cream p-4 rounded-2xl overflow-x-auto text-[10px] text-brand-brown font-mono border border-brand-border" dir="ltr">
                  {this.state.error.toString()}
                  {'\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
