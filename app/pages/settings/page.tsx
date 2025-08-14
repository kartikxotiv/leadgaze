"use client";
import React from "react";
import Link from "next/link";

export default function SettingsRootPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-sm text-gray-600 mb-4">Choose a settings area:</p>
      <ul className="list-disc ml-6 space-y-1">
        <li>
          <Link
            className="text-blue-600 hover:underline"
            href="/pages/settings/workspaces"
          >
            Workspaces
          </Link>
        </li>
      </ul>
    </div>
  );
}
