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
    <div style={{backgroundImage: "url('/image/workspace_img.png')", 
            backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat", height: "100vh", }} className="flex items-center justify-center">
                <div className="relative flex items-center justify-center">
                <div className="fixed inset-0 w-full h-full bg-black bg-opacity-50 "></div>
                 <div className="w-[500px] h-full flex items-center justify-center ">
                  <div className="bg-white p-4 rounded-lg z-50 w-full p-10 relative">
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