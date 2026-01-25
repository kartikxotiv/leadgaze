/**
 * Permission System Test Page
 * Debug page to test permission system functionality
 */
'use client';

import { useEffect, useState } from 'react';

import { useAccessibleModules, usePermissionsLoading } from '~/lib/permissions';

/**
 * Permission System Test Page
 * Debug page to test permission system functionality
 */

export default function PermissionTestPage() {
  const modules = useAccessibleModules();
  const { loading, error } = usePermissionsLoading();
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Try to get workspace ID from URL or localStorage
        const workspaceId =
          new URL(window.location.href).searchParams.get('workspaceId') ||
          localStorage.getItem('workspaceId');

        if (!workspaceId) {
          setDebugInfo('No workspace ID found');
          return;
        }

        const response = await fetch(
          `/api/debug/permissions?workspaceId=${workspaceId}`,
        );
        const data = await response.json();
        setDebugInfo(JSON.stringify(data, null, 2));
      } catch (err) {
        setDebugInfo(`Error: ${String(err)}`);
      }
    };

    checkPermissions();
  }, []);

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="mb-4 text-3xl font-bold">Permission System Debug</h1>

        <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
          </p>
          {error && (
            <p className="text-sm text-red-800">
              <strong>Error:</strong> {error.message}
            </p>
          )}
        </div>

        <div className="mb-4 rounded border border-gray-300 bg-gray-100 p-4">
          <h2 className="mb-2 font-bold">
            Accessible Modules ({modules.length}):
          </h2>
          {modules.length === 0 ? (
            <p className="text-sm text-gray-600">No accessible modules</p>
          ) : (
            <ul className="space-y-2">
              {modules.map((module) => (
                <li
                  key={module.id}
                  className="rounded border border-gray-200 bg-white p-2"
                >
                  <div className="font-semibold">{module.module_name}</div>
                  <div className="ml-2 text-sm text-gray-600">
                    Features: {module.features.length}
                    <ul className="mt-1 ml-4">
                      {module.features.map((feature) => (
                        <li key={feature.id} className="text-xs">
                          • {feature.feature_name} ({feature.accessLevel})
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded border border-gray-300 bg-gray-100 p-4">
          <h2 className="mb-2 font-bold">Raw Permission Data:</h2>
          <pre className="max-h-96 overflow-auto rounded border border-gray-200 bg-white p-2 text-xs">
            {debugInfo || 'Loading...'}
          </pre>
        </div>
      </div>
    </div>
  );
}
