import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  value: number;
  label: string;
}

export function StatCard({
  icon: Icon,
  iconColor,
  bgColor,
  value,
  label,
}: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center">
        <div className={`p-2 ${bgColor} rounded-lg`}>
          <Icon className={`h-3 w-3 ${iconColor}`} />
        </div>
        <div className="ml-4">
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {value}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
