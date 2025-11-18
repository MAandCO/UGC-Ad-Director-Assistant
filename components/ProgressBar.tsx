import React from 'react';

interface ProgressBarProps {
  progress: {
    step: number;
    message: string;
  };
  totalSteps: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, totalSteps }) => {
  const percentage = (progress.step / totalSteps) * 100;

  return (
    <div className="w-full bg-gray-700 rounded-full h-8 p-1 my-8 shadow-inner">
      <div 
        className="bg-indigo-600 h-full rounded-full flex items-center justify-center transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      >
        <span className="text-white font-medium text-sm px-2 truncate">
          {progress.message}
        </span>
      </div>
    </div>
  );
};
