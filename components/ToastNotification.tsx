
import React from 'react';

export type ToastType = 'success' | 'undo';

interface ToastNotificationProps {
  message: string;
  type: ToastType;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ message, type }) => {
  const baseClasses = "fixed top-5 left-1/2 z-[100] px-6 py-3 text-white rounded-full shadow-lg animate-toast";
  
  // Wählt die Farbe basierend auf dem Typ
  const colorClasses = type === 'undo' 
    ? 'bg-red-600' 
    : 'bg-green-600';

  return (
    <div 
      className={`${baseClasses} ${colorClasses}`}
      style={{ transform: 'translateX(-50%)' }} // Stellt die Positionierung sicher, bevor die Animation angewendet wird
      aria-live="assertive"
    >
      <span className="font-semibold">{message}</span>
    </div>
  );
};

export default ToastNotification;