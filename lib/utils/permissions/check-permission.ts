import roles, { Role } from "./roles";
import modules, { Module, Feature } from "./modules";
import { useAuthStore } from "@/lib/stores/auth-store";

const hasPermission = <M extends Module>(
  module: M,
  feature: Feature<M>,
  role: Role
): boolean => {
  const moduleFeatures = modules[module];
  const featureRoles = moduleFeatures[
    feature as keyof typeof moduleFeatures
  ] as readonly Role[];

  if (!featureRoles || !Array.isArray(featureRoles)) {
    return false;
  }

  console.log(featureRoles);
  console.log(role);

  if (typeof window !== "undefined") {
    const state = useAuthStore.getState();
    const currentOrg = state.currentOrganization;
    if (currentOrg) {
      console.log("Current User Organization:", {
        organizationId: currentOrg.organizationId || currentOrg.id,
        name: currentOrg.name,
        slug: currentOrg.slug,
        role: currentOrg.role,
        roleDisplayName: currentOrg.roleDisplayName,
      });
    } else {
      console.log("Current User Organization: Not found");
    }
  }
  return (featureRoles as readonly Role[]).includes(role);
};

export default hasPermission;
