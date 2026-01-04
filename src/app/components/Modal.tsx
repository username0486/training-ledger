import { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  headerAction?: ReactNode;
}

export function Modal({ isOpen, onClose, title, children, actions, headerAction }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-overlay backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className="relative bg-panel border border-border-medium rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-0 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-xl">{title}</h2>
          {headerAction && (
            <div>
              {headerAction}
            </div>
          )}
        </div>
        
        <div className="p-6">
          {children}
        </div>
        
        {actions && (
          <div className="p-6 pt-0 flex gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}