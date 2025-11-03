import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  getUserByEmail,
  createUser,
  updateUser,
  getUserById,
  updateUserLastLogin,
  updateUserLoginAttempts,
  updatePasswordResetToken,
  markEmailVerified,
} from "./data/users";
import {
  getOrganizationById,
  getOrganizationBySlug,
  createOrganization,
  updateOrganization,
  getOrganizationsByUserId,
  getUserWithOrganizations,
} from "./data/organizations";
import {
  getUserOrganization,
  getUserOrganizations as getOrgRelations,
  getOrganizationUsers,
  createUserOrganization,
  updateUserOrganizationRole,
} from "./data/user-organizations";
import {
  createSession,
  deleteSessionByToken,
  deleteUserSessions,
} from "./data/user-sessions";
import { supabase } from "./supabase-client";
import {
  getRoleByValue,
  getRoleById,
} from "./data/organization-roles";
import {
  getUserConfigByTypeAndValue,
} from "./data/user-config";
import {
  getOrganizationConfigByTypeAndValue,
} from "./data/organization-config";
import {
  getInvitationByToken as getInvitationByTokenData,
  createInvitation,
  acceptInvitation as acceptInvitationData,
  getInvitationsByOrganization,
  updateInvitation,
  getInvitationsByEmail,
} from "./data/user-invitations";
import {
  createPasswordResetToken,
  getPasswordResetTokenByToken,
  markTokenAsUsed,
  countRecentPasswordResetTokens,
  deleteExpiredPasswordResetTokens,
} from "./data/password-reset-tokens";
import type {
  User,
  Organization,
  UserOrganization,
  UserSession,
  OrganizationRole,
  UserInvitation,
} from "./types/database";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface JWTPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  currentOrganizationId?: string;
  currentOrganizationName?: string;
  currentOrganizationSlug?: string;
  currentRole?: string;
  availableOrganizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    subscriptionStatus: string;
    trialDaysRemaining?: number;
  }>;
  subscription?: {
    status: string;
    planType: string;
    trialEndsAt?: string;
    daysRemaining?: number;
    maxUsers: number;
    maxWorkspaces: number;
    featuresEnabled: string[];
  };
  exp: number;
  iat: number;
}

export class AuthService {
 
  static getRoleDisplayName(role: string): string {
    const displayNames: { [key: string]: string } = {
      owner: "Owner",
      admin: "Admin",
      manager: "Manager",
      member: "Member",
      viewer: "Viewer",
    };
    return displayNames[role] || "Viewer";
  }

  static getRolePermissions(role: string): object {
    const permissions: { [key: string]: object } = {
      owner: {
        can_invite_users: true,
        can_manage_workspaces: true,
        can_view_reports: true,
        can_manage_organization: true,
      },
      admin: {
        can_invite_users: true,
        can_manage_workspaces: true,
        can_view_reports: true,
        can_manage_organization: false,
      },
      manager: {
        can_invite_users: false,
        can_manage_workspaces: false,
        can_view_reports: true,
        can_manage_organization: false,
      },
      member: {
        can_invite_users: false,
        can_manage_workspaces: false,
        can_view_reports: false,
        can_manage_organization: false,
      },
      viewer: {
        can_invite_users: false,
        can_manage_workspaces: false,
        can_view_reports: false,
        can_manage_organization: false,
      },
    };
    return permissions[role] || permissions.viewer;
  }

 
  static async getUserStatusId(statusValue: string): Promise<string> {
    const statusConfig = await getUserConfigByTypeAndValue("status", statusValue);
    if (!statusConfig) {
      throw new Error(`User status '${statusValue}' not found`);
    }
    return statusConfig.id;
  }

  static async getOrganizationConfigId(
    entityType: string,
    entityValue: string
  ): Promise<string> {
    const config = await getOrganizationConfigByTypeAndValue(entityType, entityValue);
    if (!config) {
      throw new Error(
        `Organization config '${entityType}:${entityValue}' not found`
      );
    }
    return config.id;
  }

  static async getRoleId(roleName: string): Promise<string> {
    const role = await getRoleByValue(roleName);
    if (!role || !role.is_active) {
      throw new Error(`Role '${roleName}' not found`);
    }
    return role.id;
  }

  static async getInvitationStatusId(statusValue: string): Promise<string> {
    const statusConfig = await getUserConfigByTypeAndValue("invitation_status", statusValue);
    if (!statusConfig) {
      throw new Error(`Invitation status '${statusValue}' not found`);
    }
    return statusConfig.id;
  }

 
  static mapCompanySizeToConfigValue(companySize: string): string {
    const mapping: Record<string, string> = {
      "1": "startup",
      "2-10": "small",
      "11-50": "medium",
      "51-200": "large",
      "201-1000": "enterprise",
      "1000+": "enterprise",
    };
    return mapping[companySize] || "small";
  }

 
  static async checkEmailExists(email: string): Promise<boolean> {
    try {
      const existingUser = await getUserByEmail(email.toLowerCase().trim());
      return !!existingUser;
    } catch (error) {
      throw error;
    }
  }

 
  static async registerUser(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
  }) {
    try {
      // Check if user exists
      const existingUser = await getUserByEmail(userData.email.toLowerCase());
      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Get active status ID
      const activeUserStatusId = await this.getUserStatusId("active");

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await createUser({
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone_number: userData.phone_number || undefined,
        email_verified: false,
        status_id: activeUserStatusId,
        login_attempts: 0,
      });

      // Create session (non-critical, if it fails we don't rollback user creation)
      try {
        await createSession({
          user_id: user.user_id,
          token: "", // Will be set by login flow
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });
      } catch (sessionError) {
        // Log but don't fail registration
        console.error("Failed to create initial session:", sessionError);
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

 
  static async registerUserWithOrganization(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    organization_name: string;
    setup_questions?: any;
  }) {
    try {
      // Check if user exists
      const existingUser = await getUserByEmail(userData.email.toLowerCase());
      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      // Get active status ID
      const activeUserStatusId = await this.getUserStatusId("active");

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await createUser({
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone_number: userData.phone_number || undefined,
        email_verified: false,
        status_id: activeUserStatusId,
        login_attempts: 0,
      });

      // Generate organization slug
      const baseSlug = this.generateSlug(userData.organization_name);
      const slug = `${baseSlug}-${user.user_id.slice(-8)}`;

      // Calculate trial dates
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      // Get organization config IDs
      const setupQuestions = userData.setup_questions || {};
      const companySizeValue = this.mapCompanySizeToConfigValue(
        setupQuestions.companySize || "small"
      );
      const orgStatusId = await this.getOrganizationConfigId("status", "active");
      const orgSubStatusId = await this.getOrganizationConfigId(
        "subscription_status",
        "trial"
      );
      const orgPlanTypeId = await this.getOrganizationConfigId("plan_type", "trial");
      const orgCompanySizeConfigId = await this.getOrganizationConfigId(
        "company_size",
        companySizeValue
      );

      // Create organization
      const organization = await createOrganization({
        name: userData.organization_name,
        slug,
        description: `Organization for ${userData.first_name} ${userData.last_name}`,
        created_by: user.user_id,
        status_id: orgStatusId,
        subscription_status_id: orgSubStatusId,
        plan_type_id: orgPlanTypeId,
        company_size_config_id: orgCompanySizeConfigId,
        trial_ends_at: trialEndsAt.toISOString(),
        max_users: 5,
        max_workspaces: 3,
        max_storage_gb: 10,
        features_enabled: ["contacts", "leads", "basic_reports"],
      });

      // Create user-organization relationship with owner role
      const ownerRoleId = await this.getRoleId("owner");
      await createUserOrganization({
        user_id: user.user_id,
        organization_id: organization.organization_id,
        role_id: ownerRoleId,
        joined_at: new Date().toISOString(),
      });

      return {
        user,
        organization,
      };
    } catch (error) {
      throw error;
    }
  }

 
  static async loginUser(
    email: string,
    password: string | null = null,
    skipPasswordCheck = false,
    organizationId?: string,
    organizationSlug?: string
  ) {
    // Handle organization account login (if OrgUserAccount table exists)
    if (organizationId || organizationSlug) {
      const org = organizationId
        ? await getOrganizationById(organizationId)
        : await getOrganizationBySlug(organizationSlug || "");

      if (!org) {
        throw new Error("Organization not found");
      }

      // Note: OrgUserAccount table migration needed if this feature is used
      // For now, falling through to regular user login
      // TODO: Implement OrgUserAccount data access layer if needed
    }

    // Regular user login
    const user = await getUserByEmail(email.toLowerCase());
    
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check if account is locked
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      throw new Error("Account is locked. Please try again later.");
    }

    // Validate password
    if (!skipPasswordCheck && password) {
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        // Increment login attempts
        const newAttempts = (user.login_attempts || 0) + 1;
        const lockUntil =
          newAttempts >= 5
            ? new Date(Date.now() + 30 * 60 * 1000).toISOString() // Lock for 30 minutes
            : undefined;
        
        await updateUserLoginAttempts(user.user_id, newAttempts, lockUntil);
        throw new Error("Invalid email or password");
      }
    }

    // Reset login attempts on successful login
    await updateUserLastLogin(user.user_id);

    // Get user organizations with roles
    const userOrgs = await getUserWithOrganizations(user.user_id);
    
    // Check if user has organizations
    if (!userOrgs || userOrgs.length === 0) {
      throw new Error("User has no organizations assigned. Please contact administrator.");
    }
    
    // Get user's last visited organization
    const lastOrgId = user.last_visited_organization_id;

    // Map organizations to payload format
    const organizations = await Promise.all(
      userOrgs.map(async (uo: any) => {
        const org = uo.organization;
        const role = uo.role;
        
        // Validate organization data
        if (!org || !org.organization_id) {
          throw new Error(`Invalid organization data for user ${user.user_id}`);
        }
        
        // Calculate trial days remaining
        const trialDaysRemaining = org.trial_ends_at
          ? Math.ceil(
              (new Date(org.trial_ends_at).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 14;

        return {
          id: org.organization_id,
          organizationId: org.organization_id,
          name: org.name,
          slug: org.slug,
          role: role?.role || "viewer",
          roleDisplayName: role?.display_name || this.getRoleDisplayName("viewer"),
          permissions: role?.permissions || this.getRolePermissions("viewer"),
          subscriptionStatus: "trial",
          planType: "trial",
          trialDaysRemaining,
          maxUsers: org.max_users || 5,
          maxWorkspaces: org.max_workspaces || 3,
        };
      })
    );

    // Find current organization
    const currentOrganization = lastOrgId
      ? organizations.find((org: any) => org.id === lastOrgId) || organizations[0]
      : organizations[0];
    
    // Ensure we have a current organization
    if (!currentOrganization) {
      throw new Error("No valid organization found for user");
    }

    // Generate token
    const token = this.generateToken(
      {
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      } as any,
      organizations,
      currentOrganization
    );

    return {
      user: {
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone_number,
        emailVerified: user.email_verified,
        lastLogin: user.last_login,
      },
      token,
      organizations,
      currentOrganization,
    };
  }

 
  static async createOrganization(
    userId: string,
    organizationData: {
      name: string;
      description?: string;
      industry_type?: string;
      company_size?: string;
      primary_use_case?: string;
      current_tool?: string;
    }
  ) {
    try {
      // Generate slug
      const baseSlug = this.generateSlug(organizationData.name);
      const slug = `${baseSlug}-${userId.slice(-8)}`;

      // Check if user already has organization with this name
      const userOrgs = await getOrgRelations(userId);
      const userOrgIds = userOrgs.map((uo) => uo.organization_id);
      if (userOrgIds.length > 0) {
        const { data: orgs } = await supabase
          .from('organizations')
          .select('organization_id, name')
          .in('organization_id', userOrgIds)
          .eq('name', organizationData.name);
        
        if (orgs && orgs.length > 0) {
          throw new Error("You already have an organization with this name");
        }
      }

      // Calculate trial dates
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

      // Get organization config IDs
      const companySizeValue = organizationData.company_size 
        ? this.mapCompanySizeToConfigValue(organizationData.company_size)
        : "small";
      const orgStatusId = await this.getOrganizationConfigId("status", "active");
      const orgSubStatusId = await this.getOrganizationConfigId(
        "subscription_status",
        "trial"
      );
      const orgPlanTypeId = await this.getOrganizationConfigId("plan_type", "trial");
      const orgCompanySizeConfigId = await this.getOrganizationConfigId(
        "company_size",
        companySizeValue
      );

      // Create organization
      const organization = await createOrganization({
        name: organizationData.name,
        slug,
        description: organizationData.description || undefined,
        created_by: userId,
        status_id: orgStatusId,
        subscription_status_id: orgSubStatusId,
        plan_type_id: orgPlanTypeId,
        company_size_config_id: orgCompanySizeConfigId,
        trial_ends_at: trialEndsAt.toISOString(),
        max_users: 5,
        max_workspaces: 3,
        max_storage_gb: 10,
        features_enabled: ["contacts", "leads", "basic_reports"],
      });

      // Create user-organization relationship with owner role
      const ownerRoleId = await this.getRoleId("owner");
      await createUserOrganization({
        user_id: userId,
        organization_id: organization.organization_id,
        role_id: ownerRoleId,
        joined_at: new Date().toISOString(),
      });

      // Update user's last visited organization
      await updateUser(userId, {
        last_visited_organization_id: organization.organization_id,
      });

      return organization;
    } catch (error) {
      throw error;
    }
  }

 
  static async switchOrganization(userId: string, organizationId: string) {
    try {
      // Check if user has access to this organization
      const userOrg = await getUserOrganization(userId, organizationId);
      
      if (!userOrg) {
        throw new Error("User does not have access to this organization");
      }

      // Update user's last visited organization
      await updateUser(userId, {
        last_visited_organization_id: organizationId,
      });

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

 
  static generateToken(
    user: any,
    organizations: any[],
    currentOrganization?: any
  ): string {
    const payload: JWTPayload = {
      userId: user.userId || user.user_id,
      email: user.email,
      firstName: user.firstName || user.first_name,
      lastName: user.lastName || user.last_name,

      currentOrganizationId: currentOrganization?.id || currentOrganization?.organization_id,
      currentOrganizationName: currentOrganization?.name,
      currentOrganizationSlug: currentOrganization?.slug,
      currentRole: currentOrganization?.role,
      availableOrganizations: organizations,
      subscription: currentOrganization
        ? {
            status: currentOrganization.subscriptionStatus || "trial",
            planType: currentOrganization.planType || "trial",
            trialEndsAt: currentOrganization.trialEndsAt || currentOrganization.trial_ends_at,
            daysRemaining: currentOrganization.trialDaysRemaining,
            maxUsers: currentOrganization.maxUsers || currentOrganization.max_users || 5,
            maxWorkspaces: currentOrganization.maxWorkspaces || currentOrganization.max_workspaces || 3,
            featuresEnabled: currentOrganization.featuresEnabled || currentOrganization.features_enabled || ["contacts", "leads", "basic_reports"],
          }
        : undefined,
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, JWT_SECRET);
  }

 
  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  // generateSlug already works - no database calls, so no migration needed
  static generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

 
  static async getOrganizationDetails(organizationId: string) {
    try {
      const organization = await getOrganizationById(organizationId);
      
      if (!organization) {
        throw new Error("Organization not found");
      }

      // Get organization users with roles
      const orgUsers = await getOrganizationUsers(organizationId);
      const userIds = orgUsers.map((uo) => uo.user_id);
      
      // Get user details
      const usersData = userIds.length > 0 
        ? await Promise.all(userIds.map(id => getUserById(id)))
        : [];

      // Get roles for user-org relationships
      const roleIds = orgUsers.map((uo) => uo.role_id).filter(Boolean);
      const roles = roleIds.length > 0
        ? await Promise.all(roleIds.map(id => getRoleById(id)))
        : [];

      const roleMap = new Map(roles.map(r => [r!.id, r!]));

      const trialDaysRemaining = organization.trial_ends_at
        ? Math.ceil(
            (new Date(organization.trial_ends_at).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : undefined;

      return {
        organizationId: organization.organization_id,
        name: organization.name,
        slug: organization.slug,
        description: organization.description,
        subscriptionStatus: "trial",
        planType: "trial",
        trialEndsAt: organization.trial_ends_at,
        maxUsers: organization.max_users,
        maxWorkspaces: organization.max_workspaces,
        featuresEnabled: organization.features_enabled,
        trialDaysRemaining: trialDaysRemaining,
        createdAt: organization.created_at,
        updatedAt: organization.updated_at,
        users: orgUsers.map((uo) => {
          const user = usersData.find(u => u?.user_id === uo.user_id);
          const role = roleMap.get(uo.role_id);
          return {
            userId: user?.user_id,
            firstName: user?.first_name,
            lastName: user?.last_name,
            email: user?.email,
            role: role?.role,
            joinedAt: uo.joined_at,
          };
        }).filter(u => u.userId),
      };
    } catch (error) {
      throw error;
    }
  }

 
  static async userHasAccessToOrganization(
    userId: string,
    organizationId: string
  ) {
    try {
      const userOrg = await getUserOrganization(userId, organizationId);
      console.log(
        `🔐 Access check: User ${userId} -> Org ${organizationId}: ${!!userOrg}`
      );
      return !!userOrg;
    } catch (error) {
      console.error("Error checking user organization access:", error);
      return false;
    }
  }

 
  static async updateUserCurrentOrganization(
    userId: string,
    organizationId: string
  ) {
    try {
      // Simply update user's last visited organization
      await updateUser(userId, {
        last_visited_organization_id: organizationId,
      });
      return true;
    } catch (error) {
      throw error;
    }
  }

 
  static async getUserOrganizations(userId: string) {
    try {
      const userOrgs = await getUserWithOrganizations(userId);

      return await Promise.all(
        userOrgs.map(async (uo: any) => {
          const org = uo.organization;
          const role = uo.role;

          const trialDaysRemaining = org.trial_ends_at
            ? Math.ceil(
                (new Date(org.trial_ends_at).getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : undefined;

          return {
            id: org.organization_id,
            organizationId: org.organization_id,
            name: org.name,
            slug: org.slug,
            role: role?.role || "viewer",
            roleDisplayName: role?.display_name || this.getRoleDisplayName("viewer"),
            permissions: role?.permissions || this.getRolePermissions("viewer"),
            subscriptionStatus: org.subscription_status || "trial",
            planType: org.subscription_plan || "trial",
            trialDaysRemaining,
            maxUsers: org.max_users || 5,
            maxWorkspaces: org.max_workspaces || 3,
          };
        })
      );
    } catch (error) {
      throw error;
    }
  }

 
  static async getUserRoleInOrganization(
    userId: string,
    organizationId: string
  ): Promise<string | null> {
    try {
      const userOrg = await getUserOrganization(userId, organizationId);

      if (!userOrg) {
        return null;
      }

      const role = await getRoleById(userOrg.role_id);
      return role?.role || "viewer";
    } catch (error) {
      console.error("Error getting user role in organization:", error);
      return null;
    }
  }

 
  static async createInvitation(
    organizationId: string,
    email: string,
    roleName: string,
    invitedBy: string,
    message?: string
  ) {
    try {
      // Validate required fields
      if (!email || !organizationId || !roleName) {
        throw new Error(
          "Missing required fields: email, organizationId, roleName"
        );
      }

      // Check if user already exists in organization
      const existingUser = await getUserByEmail(email.toLowerCase());
      if (existingUser) {
        const userOrg = await getUserOrganization(existingUser.user_id, organizationId);
        if (userOrg) {
          throw new Error("User is already a member of this organization");
        }
      }

      // Check for existing pending invitation
      const existingInvitations = await getInvitationsByEmail(email.toLowerCase());
      const pendingInvitation = existingInvitations.find(
        (inv) => inv.organization_id === organizationId && inv.status === "pending"
      );

      if (pendingInvitation) {
        throw new Error("Invitation already sent to this email");
      }

      // Get role ID
      const roleId = await this.getRoleId(roleName);

      // Generate token
      const crypto = await import("crypto");
      const token = crypto.randomBytes(64).toString("hex");

      // Create invitation
      const invitation = await createInvitation({
        organization_id: organizationId,
        email: email.toLowerCase(),
        role_id: roleId,
        invited_by: invitedBy,
        token,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      return invitation;
    } catch (error) {
      throw error;
    }
  }

  static async acceptInvitation(
    invitationToken: string,
    userPassword?: string,
    fullName?: string
  ) {
    try {
      // Get invitation with token
      const invitation = await getInvitationByTokenData(invitationToken);

      if (!invitation) {
        throw new Error("Invalid or expired invitation token");
      }

      // Check if expired
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error("Invitation has expired");
      }

      // Check if already accepted
      if (invitation.status === "accepted") {
        throw new Error("Invitation has already been accepted");
      }

      if (invitation.status !== "pending") {
        throw new Error("Invitation is not in pending status");
      }

      // Get organization and role details
      const organization = await getOrganizationById(invitation.organization_id);
      if (!organization) {
        throw new Error("Organization not found");
      }

      const role = await getRoleById(invitation.role_id);
      if (!role) {
        throw new Error("Role not found");
      }

      // Check if user exists
      let user = await getUserByEmail(invitation.email);
      let isNewUser = false;

      if (!user) {
        // New user - create account
        if (!userPassword) {
          throw new Error("Password required for new user registration");
        }

        let firstName = "New";
        let lastName = "User";
        if (fullName && typeof fullName === "string") {
          const parts = fullName.trim().split(/\s+/);
          if (parts.length >= 2) {
            firstName = parts.slice(0, -1).join(" ");
            lastName = parts.slice(-1).join(" ");
          } else if (parts.length === 1) {
            firstName = parts[0];
            lastName = "User";
          }
        }

        const hashedPassword = await bcrypt.hash(userPassword, 10);
        const activeUserStatusId = await this.getUserStatusId("active");

        user = await createUser({
          email: invitation.email,
          password: hashedPassword,
          first_name: firstName,
          last_name: lastName,
          email_verified: true,
          status_id: activeUserStatusId,
          login_attempts: 0,
        });
        isNewUser = true;
      }

      // Check if user-organization relationship already exists
      const existingRelationship = await getUserOrganization(
        user.user_id,
        invitation.organization_id
      );

      if (!existingRelationship) {
        // Create user-organization relationship
        await createUserOrganization({
          user_id: user.user_id,
          organization_id: invitation.organization_id,
          role_id: invitation.role_id,
          joined_at: new Date().toISOString(),
        });
      }

      // Update user's last visited organization
      await updateUser(user.user_id, {
        last_visited_organization_id: invitation.organization_id,
      });

      // Mark invitation as accepted
      await acceptInvitationData(invitation.invitation_id);

      return {
        user: {
          userId: user.user_id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
        },
        organization: {
          organizationId: organization.organization_id,
          name: organization.name,
          slug: organization.slug,
        },
        role: {
          role: role.role,
          displayName: role.display_name,
          permissions: role.permissions,
        },
        isNewUser,
      };
    } catch (error) {
      throw error;
    }
  }

  static async getInvitationByToken(invitationToken: string) {
    try {
      const invitation = await getInvitationByTokenData(invitationToken);

      if (!invitation) {
        return null;
      }

      // Get related data
      const organization = await getOrganizationById(invitation.organization_id);
      const role = await getRoleById(invitation.role_id);
      const inviter = invitation.invited_by ? await getUserById(invitation.invited_by) : null;

      const isExpired = new Date(invitation.expires_at) < new Date();
      const isAccepted = invitation.status === "accepted";

      return {
        id: invitation.invitation_id,
        email: invitation.email,
        organization: organization
          ? {
              organizationId: organization.organization_id,
              name: organization.name,
              slug: organization.slug,
              description: organization.description,
            }
          : null,
        role: role
          ? {
              role: role.role,
              displayName: role.display_name,
              description: role.description,
            }
          : null,
        inviter: inviter
          ? {
              firstName: inviter.first_name,
              lastName: inviter.last_name,
              email: inviter.email,
            }
          : null,
        status: invitation.status,
        expiresAt: invitation.expires_at,
        isExpired,
        isAccepted,
        createdAt: invitation.created_at,
      };
    } catch (error) {
      throw error;
    }
  }

  static async getOrganizationInvitations(organizationId: string) {
    try {
      const invitations = await getInvitationsByOrganization(organizationId);

      // Get related data for each invitation
      const invitationsWithDetails = await Promise.all(
        invitations.map(async (invitation) => {
          const role = await getRoleById(invitation.role_id);
          const inviter = invitation.invited_by
            ? await getUserById(invitation.invited_by)
            : null;

          const isExpired = new Date(invitation.expires_at) < new Date();
          const isAccepted = invitation.status === "accepted";

          return {
            id: invitation.invitation_id,
            email: invitation.email,
            role: role
              ? {
                  role: role.role,
                  displayName: role.display_name,
                }
              : null,
            inviter: inviter
              ? {
                  firstName: inviter.first_name,
                  lastName: inviter.last_name,
                  email: inviter.email,
                }
              : null,
            status: invitation.status,
            expiresAt: invitation.expires_at,
            isExpired,
            isAccepted,
            createdAt: invitation.created_at,
          };
        })
      );

      return invitationsWithDetails;
    } catch (error) {
      throw error;
    }
  }

  static async cancelInvitation(invitationId: string, cancelledBy: string) {
    try {
      const { data: invitation } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('invitation_id', invitationId)
        .single();

      if (!invitation) {
        throw new Error("Invitation not found");
      }

      await updateInvitation(invitationId, {
        status: "cancelled",
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

 
 
 

  
  static async initiatePasswordReset(email: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const { emailService } = await import("./email-service");

    try {
      const successMessage =
        "If an account with this email exists, you will receive a password reset link.";

      const user = await getUserByEmail(email.toLowerCase());

      if (!user) {
        // Don't reveal if user exists or not
        return {
          success: true,
          message: successMessage,
        };
      }

      // Check rate limit
      const recentTokens = await countRecentPasswordResetTokens(user.user_id, 24);
      if (recentTokens >= 5) {
        throw new Error("Too many password reset requests. Please try again later.");
      }

      // Note: We don't invalidate old tokens here - they expire automatically
      // Old tokens will be cleaned up by cleanupExpiredPasswordResetTokens

      // Generate token
      const crypto = await import("crypto");
      const token = crypto.randomBytes(64).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Create reset token
      await createPasswordResetToken({
        user_id: user.user_id,
        token,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

      // Build reset URL
      const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL;
      const resetUrl = `${baseUrl}/pages/auth/reset-password?token=${token}`;

      // Get user organizations
      const userOrganizations = await this.getUserOrganizations(user.user_id);
      const currentOrganization = userOrganizations[0];

      // Send email
      await emailService.ensureInitialized();

      const emailSent = await emailService.sendPasswordResetEmail(user.email, {
        firstName: user.first_name,
        lastName: user.last_name,
        resetUrl,
        expiresInHours: 1,
        organizationName: currentOrganization?.name,
      });

      if (!emailSent) {
        throw new Error("Failed to send password reset email");
      }

      return {
        success: true,
        message: successMessage,
      };
    } catch (error) {
      console.error("Password reset initiation error:", error);
      throw new Error("Failed to process password reset request");
    }
  }

  
  static async validatePasswordResetToken(token: string): Promise<{
    isValid: boolean;
    user?: any;
    message: string;
  }> {
    try {
      if (!token || typeof token !== "string") {
        return {
          isValid: false,
          message: "Invalid reset token format",
        };
      }

      const resetTokenRecord = await getPasswordResetTokenByToken(token);

      if (!resetTokenRecord) {
        return {
          isValid: false,
          message: "Invalid or expired reset token",
        };
      }

      // Check if expired
      if (new Date(resetTokenRecord.expires_at) < new Date()) {
        return {
          isValid: false,
          message: "Reset token has expired",
        };
      }

      // Check if already used
      if (resetTokenRecord.used) {
        return {
          isValid: false,
          message: "Reset token has already been used",
        };
      }

      // Get user
      const user = await getUserById(resetTokenRecord.user_id);
      if (!user) {
        return {
          isValid: false,
          message: "User not found",
        };
      }

      return {
        isValid: true,
        user: {
          userId: user.user_id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
        },
        message: "Valid reset token",
      };
    } catch (error) {
      console.error("Token validation error:", error);
      return {
        isValid: false,
        message: "Error validating reset token",
      };
    }
  }

  
  static async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const { emailService } = await import("./email-service");

    try {
      // Validate password length
      if (!newPassword || newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

      // Validate token
      const validation = await this.validatePasswordResetToken(token);

      if (!validation.isValid || !validation.user) {
        throw new Error(validation.message);
      }

      const user = validation.user;

      // Get token record
      const resetTokenRecord = await getPasswordResetTokenByToken(token);
      if (!resetTokenRecord) {
        throw new Error("Reset token not found");
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await updateUser(user.userId, {
        password: hashedPassword,
        password_changed_at: new Date().toISOString(),
        login_attempts: 0,
        lock_until: undefined,
      });

      // Mark token as used
      await markTokenAsUsed(resetTokenRecord.id);

      // Get user organizations for email
      const userOrganizations = await this.getUserOrganizations(user.userId);
      const currentOrganization = userOrganizations[0];

      // Send confirmation email
      await emailService.sendPasswordChangedEmail(
        user.email,
        user.firstName,
        user.lastName,
        currentOrganization?.name
      );

      return {
        success: true,
        message: "Password has been reset successfully",
      };
    } catch (error) {
      console.error("Password reset error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Failed to reset password";
      throw new Error(errorMessage);
    }
  }

  
  static async checkPasswordResetRateLimit(
    email: string,
    ipAddress?: string
  ): Promise<{
    allowed: boolean;
    remainingAttempts: number;
    resetTime?: Date;
  }> {
    try {
      // Get user by email
      const user = await getUserByEmail(email.toLowerCase());
      if (!user) {
        // If user doesn't exist, allow (we don't reveal user existence)
        return {
          allowed: true,
          remainingAttempts: 3,
        };
      }

      // Count recent tokens for this user (last hour)
      const recentAttempts = await countRecentPasswordResetTokens(user.user_id, 1);

      const maxAttempts = 3;
      const remainingAttempts = Math.max(0, maxAttempts - recentAttempts);

      if (recentAttempts >= maxAttempts) {
        const resetTime = new Date(Date.now() + 60 * 60 * 1000);
        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime,
        };
      }

      return {
        allowed: true,
        remainingAttempts,
      };
    } catch (error) {
      console.error("Rate limit check error:", error);
      // On error, allow but limit attempts
      return {
        allowed: true,
        remainingAttempts: 1,
      };
    }
  }

  
  static async cleanupExpiredPasswordResetTokens(): Promise<number> {
    try {
      const deletedCount = await deleteExpiredPasswordResetTokens();
      console.log(`Cleaned up ${deletedCount} expired password reset tokens`);
      return deletedCount;
    } catch (error) {
      console.error("Cleanup error:", error);
      return 0;
    }
  }
}
