import * as React from 'react';

interface CardWidgetContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  icon?: React.ReactNode;
  icon2?: React.ReactNode;
}

export function CardWidgetContainer({
  title,
  icon,
  icon2,
  children,
  className,
  ...props
}: CardWidgetContainerProps) {
  return (
    <div
      className={`card-container bg-white flex flex-col rounded-xl overflow-hidden dark:bg-zinc-900 ${className || ''}`}
      {...props}
    >
      <div className="p-6 xl:p-4 2xl:p-6 border-b card-seperator-border dark:card-seperator-border flex justify-between items-center">
        <h2 className="flex items-center gap-1.5 primary-heading text-leadgaze-dark dark:text-zinc-100">
          {icon} {title}
        </h2>        
        {icon2}
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
