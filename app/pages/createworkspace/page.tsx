"use client";
import React, { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateWorkspacePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const isNameValid = useMemo(() => name.trim().length > 0, [name]);
  const isEmailValid = useMemo(() => {
    if (!email.trim()) return false;
    return /\S+@\S+\.\S+/.test(email.trim());
  }, [email]);

  const proceedToNextStep = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isNameValid) return;
    setCurrentStep(2);
  };

  const completeWorkspaceSetup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isEmailValid) return;
    router.push("/pages/dashboard");
  };

  return (
    <div className="flex h-screen w-screen flex-col bgworkspace">
      <header className="flex items-center justify-between px-10 py-6 text-sm">
        <div className="flex items-center gap-2 text-lg font-semibold uppercase tracking-wide">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            CU
          </span>
          <span>ClickUp CRM</span>
        </div>
        <div className="text-gray-600">Welcome, Pankaj Maurya!</div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-12">
        <div className="w-full max-w-[720px] rounded-2xl bg-white p-4 shadow-xl">

        <div className="flex items-center justify-between">
          <div>asd</div>
          <div>asd</div>
        </div>

          <div></div>    







        
          <div className="mb-10 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-indigo-500">
              {currentStep === 1 ? "Step 1" : "Step 2"}
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-gray-900">
              {currentStep === 1
                ? "What should we call your workspace?"
                : "Where can we reach you?"}
            </h1>
            <p className="mt-3 text-sm text-gray-500">
              {currentStep === 1
                ? "Enter the workspace name you want to use."
                : "Add an email address so we can keep in touch."}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3 text-xs font-medium tracking-wide text-gray-400">
              <span className={currentStep === 1 ? "text-indigo-500" : ""}>
                1. Workspace Name
              </span>
              <span>·</span>
              <span className={currentStep === 2 ? "text-indigo-500" : ""}>
                2. Contact Email
              </span>
            </div>
          </div>

          {currentStep === 1 ? (
            <form className="space-y-6" onSubmit={proceedToNextStep}>
              <div>
                <label
                  htmlFor="workspaceName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Workspace Name
                </label>
                <input
                  id="workspaceName"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Marketing Team"
                  className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {!isNameValid && (
                  <p className="mt-2 text-xs text-red-500">
                    Please provide a workspace name.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                disabled={!isNameValid}
              >
                Continue
              </button>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={completeWorkspaceSetup}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Contact Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@email.com"
                  className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {!isEmailValid && email && (
                  <p className="mt-2 text-xs text-red-500">
                    Please provide a valid email address.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  className="flex-1 rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-gray-600 transition hover:border-gray-300"
                  onClick={() => setCurrentStep(1)}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  disabled={!isEmailValid}
                >
                  Finish
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}