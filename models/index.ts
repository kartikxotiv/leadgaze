import User from "./User";
import Organization from "./Organization";
import UserOrganization from "./UserOrganization";
import UserSession from "./UserSession";
import Task from "./Task";
import Activity from "./Activity";
import PipelineStage from "./PipelineStage";

import Deal from "./Deal";
import Lead from "./Lead";
import LeadConfig from "./LeadConfig";
import LeadScore from "./LeadScore";
import ScoringRule from "./ScoringRule";
import Notification from "./Notification";
import AutomationRule from "./AutomationRule";
// Config-based models - enabled for config-based schema
import UserConfig from "./UserConfig";
import OrganizationConfig from "./OrganizationConfig";
import OrganizationRole from "./OrganizationRole";
import UserInvitation from "./UserInvitation";
import EmailVerification from "./EmailVerification";
import EmailOTP from "./EmailOTP";
import PasswordResetToken from "./PasswordResetToken";
import OrganizationWorkspace from "./OrganizationWorkspace";
import { initOrgUserAccount } from "./OrgUserAccount";

// Import sequelize instance
import sequelize from "@/lib/database";

// Initialize all models
const UserModel = User(sequelize);
const OrganizationModel = Organization(sequelize);
const UserOrganizationModel = UserOrganization(sequelize);
const UserSessionModel = UserSession(sequelize);
const TaskModel = Task(sequelize);
const ActivityModel = Activity(sequelize);
const PipelineStageModel = PipelineStage(sequelize);

const DealModel = Deal(sequelize);
const LeadModel = Lead(sequelize);
const LeadConfigModel = LeadConfig(sequelize);
const LeadScoreModel = LeadScore(sequelize);
const ScoringRuleModel = ScoringRule(sequelize);
const NotificationModel = Notification(sequelize);
const AutomationRuleModel = AutomationRule(sequelize);
// Config-based models - enabled for config-based schema
const UserConfigModel = UserConfig(sequelize);
const OrganizationConfigModel = OrganizationConfig(sequelize);
const OrganizationRoleModel = OrganizationRole(sequelize);
const UserInvitationModel = UserInvitation(sequelize);
const EmailVerificationModel = EmailVerification(sequelize);
const EmailOTPModel = EmailOTP(sequelize);
const PasswordResetTokenModel = PasswordResetToken(sequelize);
const OrganizationWorkspaceModel = OrganizationWorkspace(sequelize);
const OrgUserAccountModel = initOrgUserAccount(sequelize);

// Create models object for associations
const models = {
  User: UserModel,
  Organization: OrganizationModel,
  UserOrganization: UserOrganizationModel,
  UserSession: UserSessionModel,
  Task: TaskModel,
  Activity: ActivityModel,
  PipelineStage: PipelineStageModel,

  Deal: DealModel,
  Lead: LeadModel,
  LeadConfig: LeadConfigModel,
  LeadScore: LeadScoreModel,
  ScoringRule: ScoringRuleModel,
  Notification: NotificationModel,
  AutomationRule: AutomationRuleModel,
  // Config-based models - enabled for config-based schema
  UserConfig: UserConfigModel,
  OrganizationConfig: OrganizationConfigModel,
  OrganizationRole: OrganizationRoleModel,
  UserInvitation: UserInvitationModel,
  EmailVerification: EmailVerificationModel,
  EmailOTP: EmailOTPModel,
  PasswordResetToken: PasswordResetTokenModel,
  OrganizationWorkspace: OrganizationWorkspaceModel,
  OrgUserAccount: OrgUserAccountModel,
};

// Setup associations with type assertions
(UserModel as any).associate(models);
(OrganizationModel as any).associate(models);
(UserOrganizationModel as any).associate(models);
(UserSessionModel as any).associate(models);

// Auth config associations - enabled for config-based schema
(UserConfigModel as any).associate(models);
(OrganizationConfigModel as any).associate(models);
(OrganizationRoleModel as any).associate(models);
(UserInvitationModel as any).associate(models);
(EmailVerificationModel as any).associate(models);
(PasswordResetTokenModel as any).associate(models);
(OrganizationWorkspaceModel as any).associate(models);

// CRM associations
(TaskModel as any).associate(models);
(ActivityModel as any).associate(models);
(PipelineStageModel as any).associate(models);

(DealModel as any).associate(models);
(LeadModel as any).associate(models);
(LeadConfigModel as any).associate(models);
(LeadScoreModel as any).associate(models);
(ScoringRuleModel as any).associate(models);
(NotificationModel as any).associate(models);
(AutomationRuleModel as any).associate(models);

export {
  sequelize,
  UserModel as User,
  OrganizationModel as Organization,
  UserOrganizationModel as UserOrganization,
  UserSessionModel as UserSession,
  TaskModel as Task,
  ActivityModel as Activity,
  PipelineStageModel as PipelineStage,
  DealModel as Deal,
  LeadModel as Lead,
  LeadConfigModel as LeadConfig,
  LeadScoreModel as LeadScore,
  ScoringRuleModel as ScoringRule,
  NotificationModel as Notification,
  AutomationRuleModel as AutomationRule,
  // Config-based models - enabled for config-based schema
  UserConfigModel as UserConfig,
  OrganizationConfigModel as OrganizationConfig,
  OrganizationRoleModel as OrganizationRole,
  UserInvitationModel as UserInvitation,
  EmailVerificationModel as EmailVerification,
  EmailOTPModel as EmailOTP,
  PasswordResetTokenModel as PasswordResetToken,
  OrganizationWorkspaceModel as OrganizationWorkspace,
  OrgUserAccountModel as OrgUserAccount,
};

export default models;
