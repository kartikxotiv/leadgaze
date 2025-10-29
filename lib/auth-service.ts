import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  User,
  Organization,
  UserOrganization,
  UserSession,
 
  UserConfig,
  OrganizationConfig,
  OrganizationRole,
  UserInvitation,
  EmailVerification,
  PasswordResetToken,
} from "@/models";
import { Op } from "sequelize";
import sequelize from "@/lib/database";

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
    const statusConfig = await UserConfig.findOne({
      where: {
        entityType: "status",
        entityValue: statusValue,
        isActive: true,
      },
      attributes: ["id"],
    });
    if (!statusConfig) {
      throw new Error(`User status '${statusValue}' not found`);
    }
    return (statusConfig as any).id;
  }

  static async getOrganizationConfigId(
    entityType: string,
    entityValue: string
  ): Promise<string> {
    const config = await OrganizationConfig.findOne({
      where: {
        entityType,
        entityValue,
        isActive: true,
      },
      attributes: ["id"],
    });
    if (!config) {
      throw new Error(
        `Organization config '${entityType}:${entityValue}' not found`
      );
    }
    return (config as any).id;
  }

  static async getRoleId(roleName: string): Promise<string> {
    const role = await OrganizationRole.findOne({
      where: {
        role: roleName,
        isActive: true,
      },
    });
    if (!role) {
      throw new Error(`Role '${roleName}' not found`);
    }
    return (role as any).id;
  }

  static async getInvitationStatusId(statusValue: string): Promise<string> {
    const statusConfig = await UserConfig.findOne({
      where: {
        entityType: "invitation_status",
        entityValue: statusValue,
        isActive: true,
      },
      attributes: ["id"],
    });
    if (!statusConfig) {
      throw new Error(`Invitation status '${statusValue}' not found`);
    }
    return (statusConfig as any).id;
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
      const existingUser = await User.findOne({
        where: { email: email.toLowerCase().trim() },
        attributes: ["email"],
      });
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
    const transaction = await sequelize.transaction();

    try {
     
      const existingUser = await User.findOne({
        where: { email: userData.email.toLowerCase() },
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

     
      const activeUserStatusId = await this.getUserStatusId("active");

     
      const user = await User.create(
        {
          email: userData.email.toLowerCase(),
          password: userData.password,
          firstName: userData.first_name,
          lastName: userData.last_name,
          phoneNumber: userData.phone_number,

          emailVerified: false,
          statusId: activeUserStatusId,
        },
        { transaction }
      );

     
      await UserSession.create(
        {
          userId: (user as any).userId,
        },
        { transaction }
      );

      await transaction.commit();

      return user;
    } catch (error) {
      await transaction.rollback();
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
    const transaction = await sequelize.transaction();

    try {
     
      const existingUser = await User.findOne({
        where: { email: userData.email.toLowerCase() },
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

     
      const user = await User.create(
        {
          email: userData.email.toLowerCase(),
          password: userData.password,
          firstName: userData.first_name,
          lastName: userData.last_name,
          phoneNumber: userData.phone_number,

          emailVerified: false,
          status: "active",
        },
        { transaction }
      );

     
      const baseSlug = this.generateSlug(userData.organization_name);
      const slug = `${baseSlug}-${(user as any).userId.slice(-8)}`;

     

     
      const trialStartsAt = new Date();
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

     
      const setupQuestions = userData.setup_questions || {};

     
      const companySizeValue = this.mapCompanySizeToConfigValue(
        setupQuestions.companySize || "small"
      );
      const orgStatusId = await this.getOrganizationConfigId(
        "status",
        "active"
      );
      const orgSubStatusId = await this.getOrganizationConfigId(
        "subscription_status",
        "trial"
      );
      const orgPlanTypeId = await this.getOrganizationConfigId(
        "plan_type",
        "trial"
      );
      const orgCompanySizeConfigId = await this.getOrganizationConfigId(
        "company_size",
        companySizeValue
      );

     
      const organization = await Organization.create(
        {
          name: userData.organization_name,
          slug,
          description: `Organization for ${userData.first_name} ${userData.last_name}`,
          industryType: setupQuestions.whatBringsYou || null,
          companySizeConfigId: orgCompanySizeConfigId,
          primaryUseCase: setupQuestions.whatBringsYou || null,
          currentTool: setupQuestions.currentRole || null,
          createdBy: (user as any).userId,
          statusId: orgStatusId,
          subscriptionStatusId: orgSubStatusId,
          planTypeId: orgPlanTypeId,
          trialStartsAt,
          trialEndsAt,
          maxUsers: 5,
          maxWorkspaces: 3,
          featuresEnabled: ["contacts", "leads", "basic_reports"],
        },
        { transaction }
      );

     
      const ownerRoleId = await this.getRoleId("owner");
      await UserOrganization.create(
        {
          userId: (user as any).userId,
          organizationId: (organization as any).organizationId,
          roleId: ownerRoleId,
          status: "active",
          joinedAt: new Date(),
        },
        { transaction }
      );

     
      await UserSession.create(
        {
          userId: (user as any).userId,
          currentOrganizationId: (organization as any).organizationId,
        },
        { transaction }
      );

      await transaction.commit();

      return {
        user,
        organization,
      };
    } catch (error) {
      await transaction.rollback();
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
   
    if (organizationId || organizationSlug) {
      const models = await import("@/models");
      const org = organizationId
        ? await (models.default.Organization as any).findOne({
            where: { organizationId },
          })
        : await (models.default.Organization as any).findOne({
            where: { slug: organizationSlug },
          });

      if (!org) {
        throw new Error("Organization not found");
      }

      const account = await (models.default.OrgUserAccount as any).findOne({
        where: {
          organizationId: (org as any).organizationId,
          email: email.toLowerCase(),
        },
      });

      if (!account) {
        throw new Error("Invalid email or password");
      }

     
      const bcrypt = await import("bcryptjs");
      const ok = await bcrypt.compare(
        password || "",
        (account as any).passwordHash
      );
      if (!ok) {
        throw new Error("Invalid email or password");
      }

     
      const userLike = {
        userId: (account as any).id,
        email: (account as any).email,
        firstName: (account as any).firstName,
        lastName: (account as any).lastName,
      } as any;

      const orgPayload = [
        {
          id: (org as any).organizationId,
          organizationId: (org as any).organizationId,
          name: (org as any).name,
          slug: (org as any).slug,
          role: "member",
          roleDisplayName: "Member",
          permissions: {},
          subscriptionStatus: (org as any).subscriptionStatus || "trial",
          planType: (org as any).planType || "trial",
          trialDaysRemaining: 14,
          maxUsers: (org as any).maxUsers || 5,
          maxWorkspaces: (org as any).maxWorkspaces || 3,
        },
      ];

      const token = this.generateToken(userLike, orgPayload, orgPayload[0]);

      return {
        user: userLike,
        token,
        organizations: orgPayload,
        currentOrganization: orgPayload[0],
      };
    }

   
    const user = await User.findOne({
      where: { email: email.toLowerCase() },
      attributes: [
        "userId",
        "email",
        "password",
        "firstName",
        "lastName",
        "phoneNumber",
        "emailVerified",
        "statusId",
        "lastLogin",
        "loginAttempts",
        "lockUntil",
        "passwordResetToken",
        "passwordResetExpires",
        "passwordChangedAt",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: UserConfig,
          as: "statusConfig",
          attributes: ["entityType", "entityValue", "displayName"],
        },
        {
          model: UserOrganization,
          as: "userOrganizations",
          attributes: [
            "id",
            "userId",
            "organizationId",
            "roleId",
            "status",
            "joinedAt",
            "invitedBy",
            "createdAt",
            "updatedAt",
          ],
          include: [
            {
              model: Organization,
              as: "organization",
              attributes: [
                "organizationId",
                "name",
                "slug",
                "description",
                "industryType",
                "companySizeConfigId",
                "primaryUseCase",
                "currentTool",
                "statusId",
                "subscriptionStatusId",
                "planTypeId",
                "trialStartsAt",
                "trialEndsAt",
                "maxUsers",
                "maxWorkspaces",
                "featuresEnabled",
                "createdBy",
                "createdAt",
                "updatedAt",
              ],
              include: [
                {
                  model: OrganizationConfig,
                  as: "statusConfig",
                  attributes: ["entityValue"],
                },
                {
                  model: OrganizationConfig,
                  as: "subscriptionStatusConfig",
                  attributes: ["entityValue"],
                },
                {
                  model: OrganizationConfig,
                  as: "planTypeConfig",
                  attributes: ["entityValue"],
                },
              ],
            },
            {
              model: OrganizationRole,
              as: "role",
              attributes: ["role", "displayName", "permissions"],
            },
          ],
        },
        {
          model: UserSession,
          as: "session",
          attributes: [
            "id",
            "userId",
            "currentOrganizationId",
            "lastActivityAt",
            "createdAt",
            "updatedAt",
          ],
        },
      ],
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

   
    if (!skipPasswordCheck && password) {
      const isValidPassword = await (User as any).validatePassword(
        user,
        password
      );
      if (!isValidPassword) {
        throw new Error("Invalid email or password");
      }
    }

   
    await user.update({ lastLogin: new Date() });

   
    const organizations =
      (user as any).userOrganizations?.map((uo: any) => ({
        id: (uo.organization as any).organizationId,
        organizationId: (uo.organization as any).organizationId,
        name: (uo.organization as any).name,
        slug: (uo.organization as any).slug,
        role: (uo.role as any)?.role || "viewer",
        roleDisplayName:
          (uo.role as any)?.displayName || this.getRoleDisplayName("viewer"),
        permissions:
          (uo.role as any)?.permissions || this.getRolePermissions("viewer"),
        subscriptionStatus:
          (uo.organization as any).subscriptionStatusConfig?.entityValue ||
          "trial",
        planType:
          (uo.organization as any).planTypeConfig?.entityValue || "trial",
        trialDaysRemaining: (uo.organization as any).trialEndsAt
          ? Math.ceil(
              (new Date((uo.organization as any).trialEndsAt).getTime() -
                new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 14,
        maxUsers: (uo.organization as any).maxUsers || 5,
        maxWorkspaces: (uo.organization as any).maxWorkspaces || 3,
      })) || [];

   
    const currentOrganization = (user as any).session?.currentOrganizationId
      ? organizations.find(
          (org: any) => org.id === (user as any).session.currentOrganizationId
        )
      : organizations[0];

   
    const token = this.generateToken(user, organizations, currentOrganization);

    return {
      user,
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
    const transaction = await sequelize.transaction();

    try {
     
      const baseSlug = this.generateSlug(organizationData.name);
      const slug = `${baseSlug}-${userId.slice(-8)}`;

     
      const existingUserOrg = await UserOrganization.findOne({
        where: { userId },
        include: [
          {
            model: Organization,
            as: "organization",
            where: { name: organizationData.name },
          },
        ],
      });

      if (existingUserOrg) {
        throw new Error("You already have an organization with this name");
      }

     
      const trialStartsAt = new Date();
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);

     
      const statusId = await this.getOrganizationConfigId("status", "active");
      const subscriptionStatusId = await this.getOrganizationConfigId(
        "subscription_status",
        "trial"
      );
      const planTypeId = await this.getOrganizationConfigId(
        "plan_type",
        "trial"
      );
      const companySizeValue = this.mapCompanySizeToConfigValue(
        organizationData.company_size || "small"
      );
      const companySizeConfigId = await this.getOrganizationConfigId(
        "company_size",
        companySizeValue
      );

     
      const organization = await Organization.create(
        {
          name: organizationData.name,
          slug,
          description: organizationData.description,
          industryType: organizationData.industry_type,
          companySizeConfigId,
          primaryUseCase: organizationData.primary_use_case,
          currentTool: organizationData.current_tool,
          createdBy: userId,
          statusId,
          subscriptionStatusId,
          planTypeId,
          trialStartsAt,
          trialEndsAt,
          maxUsers: 5,
          maxWorkspaces: 3,
          featuresEnabled: ["contacts", "leads", "basic_reports"],
        },
        { transaction }
      );

     
      const ownerRoleId = await this.getRoleId("owner");
      await UserOrganization.create(
        {
          userId,
          organizationId: (organization as any).organizationId,
          roleId: ownerRoleId,
          status: "active",
          joinedAt: new Date(),
        },
        { transaction }
      );

     
      await UserSession.update(
        {
          currentOrganizationId: (organization as any).organizationId,
        },
        {
          where: { userId },
          transaction,
        }
      );

      await transaction.commit();

     
      const orgWithConfigs = await Organization.findOne({
        where: { organizationId: (organization as any).organizationId },
        include: [
          {
            model: OrganizationConfig,
            as: "statusConfig",
            attributes: ["entityValue"],
          },
          {
            model: OrganizationConfig,
            as: "subscriptionStatusConfig",
            attributes: ["entityValue"],
          },
          {
            model: OrganizationConfig,
            as: "planTypeConfig",
            attributes: ["entityValue"],
          },
          {
            model: OrganizationConfig,
            as: "companySizeConfig",
            attributes: ["entityValue"],
          },
        ],
      });

      return orgWithConfigs || organization;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

 
  static async switchOrganization(userId: string, organizationId: string) {
    try {
     
      const userOrg = await UserOrganization.findOne({
        where: {
          userId,
          organizationId,
          status: "active",
        },
      });

      if (!userOrg) {
        throw new Error("User does not have access to this organization");
      }

     
      await UserSession.update(
        {
          currentOrganizationId: organizationId,
          lastActivityAt: new Date(),
        },
        {
          where: { userId },
        }
      );

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
      userId: (user as any).userId,
      email: (user as any).email,
      firstName: (user as any).firstName,
      lastName: (user as any).lastName,

      currentOrganizationId: currentOrganization?.id,
      currentOrganizationName: currentOrganization?.name,
      currentOrganizationSlug: currentOrganization?.slug,
      currentRole: currentOrganization?.role,
      availableOrganizations: organizations,
      subscription: currentOrganization
        ? {
            status: currentOrganization.subscriptionStatus,
            planType: "trial",
            trialEndsAt: currentOrganization.trialEndsAt,
            daysRemaining: currentOrganization.trialDaysRemaining,
            maxUsers: 5,
            maxWorkspaces: 3,
            featuresEnabled: ["contacts", "leads", "basic_reports"],
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
      const organization = await Organization.findOne({
        where: { organizationId },
        include: [
          {
            model: UserOrganization,
            as: "userOrganizations",
            include: [
              {
                model: User,
                as: "user",
                attributes: ["userId", "firstName", "lastName", "email"],
              },
            ],
          },
        ],
      });

      if (!organization) {
        throw new Error("Organization not found");
      }

      const orgData = organization as any;

     
      const trialDaysRemaining = orgData.trialEndsAt
        ? Math.ceil(
            (new Date(orgData.trialEndsAt).getTime() - new Date().getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : undefined;

      return {
        organizationId: orgData.organizationId,
        name: orgData.name,
        slug: orgData.slug,
        description: orgData.description,
        industryType: orgData.industryType,
        companySize: orgData.companySize,
        primaryUseCase: orgData.primaryUseCase,
        currentTool: orgData.currentTool,
        subscriptionStatus: orgData.subscriptionStatus,
        planType: orgData.planType,
        trialStartsAt: orgData.trialStartsAt,
        trialEndsAt: orgData.trialEndsAt,
        maxUsers: orgData.maxUsers,
        maxWorkspaces: orgData.maxWorkspaces,
        featuresEnabled: orgData.featuresEnabled,
        trialDaysRemaining: trialDaysRemaining,
        createdAt: orgData.createdAt,
        updatedAt: orgData.updatedAt,
        users:
          orgData.userOrganizations?.map((uo: any) => ({
            userId: uo.user.userId,
            firstName: uo.user.firstName,
            lastName: uo.user.lastName,
            email: uo.user.email,
            role: uo.role,
            status: uo.status,
            joinedAt: uo.joinedAt,
          })) || [],
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
      const userOrg = await UserOrganization.findOne({
        where: {
          userId,
          organizationId,
          status: "active",
        },
      });

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
     
      let session = await UserSession.findOne({ where: { userId } });

      if (session) {
        await session.update({
          currentOrganizationId: organizationId,
          lastActivityAt: new Date(),
        });
      } else {
        await UserSession.create({
          userId,
          currentOrganizationId: organizationId,
          lastActivityAt: new Date(),
        });
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

 
  static async getUserOrganizations(userId: string) {
    try {
      const userOrgs = await UserOrganization.findAll({
        where: { userId, status: "active" },
        include: [
          {
            model: Organization,
            as: "organization",
          },
          {
            model: OrganizationRole,
            as: "role",
            attributes: ["role", "displayName", "permissions"],
          },
        ],
      });

      return userOrgs.map((uo: any) => ({
        id: (uo.organization as any).organizationId,
        organizationId: (uo.organization as any).organizationId,
        name: (uo.organization as any).name,
        slug: (uo.organization as any).slug,
        role: uo.role || "viewer",
        roleDisplayName: this.getRoleDisplayName(uo.role || "viewer"),
        permissions: this.getRolePermissions(uo.role || "viewer"),
        subscriptionStatus: "trial",
        planType: "trial",
        trialDaysRemaining: (uo.organization as any).trialEndsAt
          ? Math.ceil(
              (new Date((uo.organization as any).trialEndsAt).getTime() -
                new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : undefined,
        maxUsers: (uo.organization as any).maxUsers || 5,
        maxWorkspaces: (uo.organization as any).maxWorkspaces || 3,
      }));
    } catch (error) {
      throw error;
    }
  }

 
  static async getUserRoleInOrganization(
    userId: string,
    organizationId: string
  ): Promise<string | null> {
    try {
      const userOrg = await UserOrganization.findOne({
        where: {
          userId,
          organizationId,
          status: "active",
        },
      });

      if (!userOrg) {
        return null;
      }

      return (userOrg as any).role || "viewer";
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
    const transaction = await sequelize.transaction();

    try {
     
      if (!email || !organizationId || !roleName) {
        throw new Error(
          "Missing required fields: email, organizationId, roleName"
        );
      }

     
      const models = await import("@/models");
      const existingOrgAccount = await (
        models.default.OrgUserAccount as any
      ).findOne({
        where: {
          organizationId,
          email: email.toLowerCase(),
        },
      });

      if (existingOrgAccount) {
        throw new Error("User is already a member of this organization");
      }

     
      const pendingStatusId = await this.getInvitationStatusId("pending");
      const existingInvitation = await UserInvitation.findOne({
        where: {
          organizationId,
          email: email.toLowerCase(),
          statusId: pendingStatusId,
        },
      });

      if (existingInvitation) {
        throw new Error("Invitation already sent to this email");
      }

     
      const roleId = await this.getRoleId(roleName);

     
      const invitation = await UserInvitation.create(
        {
          organizationId,
          email: email.toLowerCase(),
          roleId,
          invitedBy,
          statusId: pendingStatusId,
          message: message || null,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          invitationToken: require("crypto").randomBytes(64).toString("hex"),
        },
        { transaction }
      );

      await transaction.commit();
      return invitation;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async acceptInvitation(
    invitationToken: string,
    userPassword?: string,
    fullName?: string
  ) {
    const transaction = await sequelize.transaction();

    try {
     
      const invitation = await UserInvitation.findOne({
        where: { invitationToken },
        include: [
          {
            model: Organization,
            as: "organization",
            attributes: ["organizationId", "name", "slug"],
          },
          {
            model: OrganizationRole,
            as: "role",
            attributes: ["id", "role", "displayName", "permissions"],
          },
          {
            model: UserConfig,
            as: "status",
            attributes: ["entityValue"],
          },
          {
            model: User,
            as: "inviter",
            attributes: ["firstName", "lastName", "email"],
          },
        ],
      });

      if (!invitation) {
        throw new Error("Invalid or expired invitation token");
      }

      if ((invitation as any).isExpired()) {
        throw new Error("Invitation has expired");
      }

      if ((invitation as any).isAccepted()) {
        throw new Error("Invitation has already been accepted");
      }

      const pendingStatusId = await this.getInvitationStatusId("pending");
      if ((invitation as any).statusId !== pendingStatusId) {
        throw new Error("Invitation is not in pending status");
      }

     
      let user = await User.findOne({
        where: { email: (invitation as any).email },
      });

      let isNewUser = false;
      if (!user) {
       
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

        user = await User.create(
          {
            email: (invitation as any).email,
            password: userPassword,
            firstName,
            lastName,
            status: "active",
            emailVerified: true,
          },
          { transaction }
        );
        isNewUser = true;
      }

     
      const existingRelationship = await UserOrganization.findOne({
        where: {
          userId: (user as any).userId,
          organizationId: (invitation as any).organizationId,
        },
      });

      if (!existingRelationship) {
        await UserOrganization.create(
          {
            userId: (user as any).userId,
            organizationId: (invitation as any).organizationId,
           
            roleId:
              (invitation as any).roleId ||
              (((invitation as any).role &&
                (invitation as any).role.id) as string),
            status: "active",
            joinedAt: new Date(),
            invitedBy: (invitation as any).invitedBy,
          },
          { transaction }
        );
      }

     
      const models = await import("@/models");
      const bcrypt = await import("bcryptjs");
      const hash = await bcrypt.hash(userPassword || "", 10);
      const parsedName = (
        fullName || `${(user as any).firstName} ${(user as any).lastName}`
      )
        .trim()
        .split(/\s+/);
      const firstName =
        parsedName.length > 1
          ? parsedName.slice(0, -1).join(" ")
          : parsedName[0];
      const lastName =
        parsedName.length > 1 ? parsedName.slice(-1).join(" ") : "User";

      await (models.default.OrgUserAccount as any).create(
        {
          organizationId: (invitation as any).organizationId,
          email: (invitation as any).email.toLowerCase(),
          passwordHash: hash,
          firstName,
          lastName,
          status: "active",
          lastLogin: new Date(),
        },
        { transaction }
      );

     
      const acceptedStatusId = await this.getInvitationStatusId("accepted");
      await invitation.update(
        {
          statusId: acceptedStatusId,
          acceptedAt: new Date(),
          acceptedByUserId: (user as any).userId,
        },
        { transaction }
      );

     
      let session = await UserSession.findOne({
        where: { userId: (user as any).userId },
      });

      if (session) {
        await session.update(
          {
            currentOrganizationId: (invitation as any).organizationId,
            lastActivityAt: new Date(),
          },
          { transaction }
        );
      } else {
        await UserSession.create(
          {
            userId: (user as any).userId,
            currentOrganizationId: (invitation as any).organizationId,
            lastActivityAt: new Date(),
          },
          { transaction }
        );
      }

      await transaction.commit();

      return {
        user,
        organization: (invitation as any).organization,
        role: (invitation as any).role,
        isNewUser,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async getInvitationByToken(invitationToken: string) {
    try {
      const invitation = await UserInvitation.findOne({
        where: { invitationToken },
        include: [
          {
            model: Organization,
            as: "organization",
            attributes: ["organizationId", "name", "slug", "description"],
          },
          {
            model: OrganizationRole,
            as: "role",
            attributes: ["role", "displayName", "description"],
          },
          {
            model: User,
            as: "inviter",
            attributes: ["firstName", "lastName", "email"],
          },
          {
            model: UserConfig,
            as: "status",
            attributes: ["entityValue"],
          },
        ],
      });

      if (!invitation) {
        return null;
      }

      return {
        id: (invitation as any).id,
        email: (invitation as any).email,
        message: (invitation as any).message,
        organization: (invitation as any).organization,
        role: (invitation as any).role,
        inviter: (invitation as any).inviter,
        status: (invitation as any).status?.entityValue,
        expiresAt: (invitation as any).expiresAt,
        isExpired: (invitation as any).isExpired(),
        isAccepted: (invitation as any).isAccepted(),
        createdAt: (invitation as any).createdAt,
      };
    } catch (error) {
      throw error;
    }
  }

  static async getOrganizationInvitations(organizationId: string) {
    try {
      const invitations = await UserInvitation.findAll({
        where: { organizationId },
        include: [
          {
            model: OrganizationRole,
            as: "role",
            attributes: ["role", "displayName"],
          },
          {
            model: User,
            as: "inviter",
            attributes: ["firstName", "lastName", "email"],
          },
          {
            model: UserConfig,
            as: "status",
            attributes: ["entityValue"],
          },
        ],
        order: [["created_at", "DESC"]],
      });

      return invitations.map((invitation: any) => ({
        id: invitation.id,
        email: invitation.email,
        message: invitation.message,
        role: invitation.role,
        inviter: invitation.inviter,
        status: invitation.status?.entityValue,
        expiresAt: invitation.expiresAt,
        isExpired: invitation.isExpired(),
        isAccepted: invitation.isAccepted(),
        createdAt: invitation.createdAt,
      }));
    } catch (error) {
      throw error;
    }
  }

  static async cancelInvitation(invitationId: string, cancelledBy: string) {
    const transaction = await sequelize.transaction();

    try {
      const invitation = await UserInvitation.findByPk(invitationId);
      if (!invitation) {
        throw new Error("Invitation not found");
      }

      const cancelledStatusId = await this.getInvitationStatusId("cancelled");
      await invitation.update(
        {
          statusId: cancelledStatusId,
        },
        { transaction }
      );

      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
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

     
      const user = await (User as any).findByEmail(email.toLowerCase());

      if (!user) {
       
        return {
          success: true,
          message: successMessage,
        };
      }

     
      await (PasswordResetToken as any).invalidateAllForUser(user.userId);

     
      const resetToken = await (PasswordResetToken as any).createResetToken(
        user.userId
      );

     
      const baseUrl =
        process.env.NEXTAUTH_URL ||
        process.env.APP_URL;
      const resetUrl = `${baseUrl}/pages/auth/reset-password?token=${resetToken.token}`;

     
      const userOrganizations = await this.getUserOrganizations(user.userId);
      const currentOrganization = userOrganizations[0];

     
      await emailService.ensureInitialized();

     
      const emailSent = await emailService.sendPasswordResetEmail(user.email, {
        firstName: user.firstName,
        lastName: user.lastName,
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

     
      const resetTokenRecord = await (PasswordResetToken as any).findByToken(
        token
      );

      if (!resetTokenRecord) {
        return {
          isValid: false,
          message: "Invalid or expired reset token",
        };
      }

      if (resetTokenRecord.isExpired()) {
        return {
          isValid: false,
          message: "Reset token has expired",
        };
      }

      if (resetTokenRecord.isUsed()) {
        return {
          isValid: false,
          message: "Reset token has already been used",
        };
      }

      return {
        isValid: true,
        user: resetTokenRecord.user,
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
    const transaction = await sequelize.transaction();

    try {
     
      if (!newPassword || newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters long");
      }

     
      const validation = await this.validatePasswordResetToken(token);

      if (!validation.isValid || !validation.user) {
        throw new Error(validation.message);
      }

      const user = validation.user;

     
      const resetTokenRecord = await (PasswordResetToken as any).findByToken(
        token
      );

      if (!resetTokenRecord) {
        throw new Error("Reset token not found");
      }

     
      await user.update(
        {
          password: newPassword,
          passwordChangedAt: new Date(),
         
          loginAttempts: 0,
          lockUntil: null,
        },
        { transaction }
      );

     
      await resetTokenRecord.markUsed();

     
      await (PasswordResetToken as any).invalidateAllForUser(user.userId);

     
      const userOrganizations = await this.getUserOrganizations(user.userId);
      const currentOrganization = userOrganizations[0];

     
      await emailService.sendPasswordChangedEmail(
        user.email,
        user.firstName,
        user.lastName,
        currentOrganization?.name
      );

      await transaction.commit();

      return {
        success: true,
        message: "Password has been reset successfully",
      };
    } catch (error) {
      await transaction.rollback();
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
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

     
      const recentAttempts = await PasswordResetToken.count({
        where: {
          createdAt: {
            [Op.gte]: oneHourAgo,
          },
        },
        include: [
          {
            model: User,
            as: "user",
            where: {
              email: email.toLowerCase(),
            },
            attributes: [],
          },
        ],
      });

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
     
      return {
        allowed: true,
        remainingAttempts: 1,
      };
    }
  }

  
  static async cleanupExpiredPasswordResetTokens(): Promise<number> {
    try {
      const deletedCount = await (PasswordResetToken as any).cleanupExpired();
      console.log(`Cleaned up ${deletedCount} expired password reset tokens`);
      return deletedCount;
    } catch (error) {
      console.error("Cleanup error:", error);
      return 0;
    }
  }
}
