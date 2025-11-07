"use client";
import React, { useState } from 'react'
import { useRouter } from 'next/navigation';
import { CreateWorkspaceForm } from '@/components/workspaces/create-workspace-form';

export default function CreateWorkspacePage() {
  const router = useRouter();
  const [totalWorkspaces, setTotalWorkspaces] = useState(false);

  const handleWorkspaceCreated = () => {
    // Redirect to dashboard after successful creation
    router.push("/pages/dashboard");
  };

  return (
    <div className="flex items-center justify-center h-[100vh] bgworkspace">
      <div className="relative flex items-center justify-center">
        <div className="w-[500px] h-full flex items-center justify-center ">
        <div className="bg-white p-4 rounded-lg z-50 w-full p-10 relative shadow-lg border border-gray-200">
          <CreateWorkspaceForm
            onSuccess={handleWorkspaceCreated}
            showCancelButton={false}
            submitButtonText="Submit"
          />
        </div>
        </div>
      </div>
    </div>
  )
}