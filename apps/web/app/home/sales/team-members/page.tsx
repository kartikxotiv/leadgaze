// 'use client';

// import { useMemo, useState } from 'react';

// import { usePathname } from 'next/navigation';

// import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
// import {
//   Check,
//   Clock,
//   Edit2,
//   Loader2,
//   Plus,
//   RotateCcw,
//   Trash2,
//   Users,
// } from 'lucide-react';
// import { toast } from 'sonner';

// import { Badge } from '@kit/ui/badge';
// import { Button } from '@kit/ui/button';
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from '@kit/ui/card';
// import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
// import { PageBody, PageHeader } from '@kit/ui/page';
// import {
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '@kit/ui/table';
// import '@kit/ui/tooltip';
// import { useColumnVisibility } from '@kit/ui/use-column-visibility';

// import { ModuleGuard } from '~/lib/rbac/module-guard';
// import { useRBAC } from '~/lib/rbac/rbac-provider';
// import { getModuleRolesService } from '~/services/roles.service';
// import {
//   type WorkspaceMember,
//   getMembersService,
//   removeMemberService,
//   resendInvitationService,
// } from '~/services/team-members.service';

// import { InviteMemberDialog } from '../../team-members/components/invite-member-dialog';
// import { UpdateMemberDialog } from '../../team-members/components/update-member-dialog';

// export default function SalesTeamMembersPage() {
//   const queryClient = useQueryClient();
//   const { currentWorkspace, canAccess } = useRBAC();
//   const pathname = usePathname();
//   const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
//   const [updatingMember, setUpdatingMember] = useState<WorkspaceMember | null>(
//     null,
//   );
//   const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

//   // Detect module from pathname
//   const moduleKey = useMemo(() => {
//     if (pathname.includes('/sales/')) return 'sales';
//     if (pathname.includes('/hrms/')) return 'hrms';
//     if (pathname.includes('/inventory/')) return 'inventory';
//     if (pathname.includes('/services/')) return 'service_cloud';
//     if (pathname.includes('/funds/')) return 'funds';
//     return null;
//   }, [pathname]);

//   const columns = useMemo(
//     () => [
//       { id: 'member', label: 'Member' },
//       { id: 'email', label: 'Email' },
//       { id: 'role', label: 'Role' },
//       { id: 'status', label: 'Status' },
//       { id: 'primary_contact', label: 'Primary Contact' },
//     ],
//     [],
//   );

//   const { visibility, toggleVisibility, isVisible, reset } =
//     useColumnVisibility('team-members', {
//       member: true,
//       email: true,
//       role: true,
//       status: true,
//       primary_contact: true,
//     });

//   // Fetch members
//   const {
//     data: membersData = [],
//     isLoading,
//     error,
//   } = useQuery({
//     queryKey: ['workspaceMembers', currentWorkspace?.id],
//     queryFn: () => getMembersService(currentWorkspace?.id || ''),
//     enabled: !!currentWorkspace?.id,
//   });

//   // Prefetch module-specific roles so they're available immediately when invite dialog opens
//   useQuery({
//     queryKey: ['moduleRoles', currentWorkspace?.id, moduleKey],
//     queryFn: async () => {
//       if (moduleKey) {
//         const res = await getModuleRolesService(
//           currentWorkspace?.id || '',
//           moduleKey,
//         );
//         return res?.data;
//       }
//       return [];
//     },
//     enabled: !!currentWorkspace?.id && !!moduleKey,
//   });

//   const members = (membersData?.data || [])?.filter(
//     (m: WorkspaceMember) => m.status !== 'removed',
//   );
//   const activeMembers = members.filter(
//     (m: WorkspaceMember) => m.status === 'accepted',
//   );
//   const pendingMembers = members.filter(
//     (m: WorkspaceMember) => m.status === 'pending',
//   );

//   // Remove member mutation
//   const removeMutation = useMutation({
//     mutationFn: removeMemberService,
//     onSuccess: () => {
//       queryClient.invalidateQueries({
//         queryKey: ['workspaceMembers', currentWorkspace?.id],
//       });
//       toast.success('Member removed successfully');
//     },
//     onError: (error: any) => {
//       toast.error(error?.message || 'Failed to remove member');
//     },
//   });

//   // Resend invitation mutation
//   const resendMutation = useMutation({
//     mutationFn: resendInvitationService,
//     onSuccess: () => {
//       queryClient.invalidateQueries({
//         queryKey: ['workspaceMembers', currentWorkspace?.id],
//       });
//       toast.success('Invitation resent successfully');
//     },
//     onError: (error: any) => {
//       toast.error(error?.message || 'Failed to resend invitation');
//     },
//   });

//   const handleRemoveMember = (memberId: string) => {
//     if (confirm('Are you sure you want to remove this member?')) {
//       removeMutation.mutate(memberId);
//     }
//   };

//   const handleResendInvitation = (memberId: string) => {
//     resendMutation.mutate(memberId);
//   };

//   const handleEditMember = (member: WorkspaceMember) => {
//     setUpdatingMember(member);
//     setUpdateDialogOpen(true);
//   };

//   const getRoleColor = (role: any) => {
//     if (!role) return '#6b7280';
//     return role.color || '#6b7280';
//   };

//   const getStatusBadge = (status: string) => {
//     switch (status) {
//       case 'accepted':
//         return (
//           <Badge
//             variant="default"
//             className="bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-400"
//           >
//             <Check className="mr-1 h-3 w-3" />
//             Active
//           </Badge>
//         );
//       case 'pending':
//         return (
//           <Badge
//             variant="secondary"
//             className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
//           >
//             <Clock className="mr-1 h-3 w-3" />
//             Pending
//           </Badge>
//         );
//       case 'removed':
//         return (
//           <Badge variant="destructive">
//             <Trash2 className="mr-1 h-3 w-3" />
//             Removed
//           </Badge>
//         );
//       default:
//         return <Badge variant="outline">{status}</Badge>;
//     }
//   };

//   return (
//     <ModuleGuard module="team_members" feature="view">
//       <div className="@container/payment flex flex-col">
//         <PageHeader
//           title="Team Members"
//           description="Manage your team and their access permissions"
//           className="border-b pb-4"
//         >
//           <div className="flex items-center gap-2">
//             {canAccess('team_members', 'create') && (
//               <Button
//                 onClick={() => setInviteDialogOpen(true)}
//                 className="gap-2"
//               >
//                 <Plus className="h-4 w-4" />
//                 Invite Member
//               </Button>
//             )}
//           </div>
//         </PageHeader>

//         {/* Stats Cards */}
//         <div className="bg-card flex items-center gap-2 overflow-x-auto border-b px-4 py-2">
//           <div className="flex items-center gap-2">
//             <ColumnVisibilitySelector
//               columns={columns}
//               visibility={visibility}
//               onToggle={toggleVisibility}
//               onReset={reset}
//             />
//           </div>

//           <div className="flex items-center gap-2">
//             <Card className="hover:border-primary/50 bg-card w-52 shrink-0 transition-all">
//               <CardContent className="flex h-10 items-center p-3">
//                 <div className="flex w-full flex-col gap-1">
//                   <div className="flex items-center gap-2">
//                     <div className="h-2 w-2 rounded-full bg-green-500" />
//                     <span className="text-muted-foreground truncate text-[12px] font-medium tracking-wider uppercase">
//                       Active Members ({activeMembers.length})
//                     </span>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>

//             <Card className="hover:border-primary/50 bg-card w-52 shrink-0 transition-all">
//               <CardContent className="flex h-10 items-center p-3">
//                 <div className="flex w-full flex-col gap-1">
//                   <div className="flex items-center gap-2">
//                     <div className="h-2 w-2 rounded-full bg-yellow-500" />
//                     <span className="text-muted-foreground truncate text-[12px] font-medium tracking-wider uppercase">
//                       Pending Invitations ({pendingMembers.length})
//                     </span>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         </div>

//         <PageBody className="sticky flex min-h-0 flex-1 flex-col overflow-hidden pt-4 pb-6">
//           <div className="flex min-h-0 flex-1 flex-col space-y-6">
//             {/* Team Members Table - Scrollable area */}
//             <Card className="flex min-h-0 flex-1 flex-col border-none shadow-none">
//               <CardHeader className="shrink-0 p-4">
//                 <div>
//                   <CardTitle className="leading-tight">Members</CardTitle>
//                   <CardDescription>
//                     Manage team members and their roles
//                   </CardDescription>
//                 </div>
//               </CardHeader>
//               <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
//                 {isLoading ? (
//                   <div className="flex items-center justify-center py-12">
//                     <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
//                   </div>
//                 ) : error ? (
//                   <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border p-4">
//                     Failed to load team members
//                   </div>
//                 ) : members.length === 0 ? (
//                   <div className="py-12 text-center">
//                     <Users className="text-muted-foreground/30 mx-auto mb-4 h-12 w-12" />
//                     <p className="text-muted-foreground">No team members yet</p>
//                     <Button
//                       onClick={() => setInviteDialogOpen(true)}
//                       variant="outline"
//                       size="sm"
//                       className="mt-4"
//                     >
//                       Invite First Member
//                     </Button>
//                   </div>
//                 ) : (
//                   <div className="listing-table-container min-w-0 flex-1 overflow-x-auto overflow-y-auto rounded-lg pb-6">
//                     <table className="w-max min-w-full caption-bottom border-separate border-spacing-0 text-sm">
//                       <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
//                         <TableRow className="bg-card">
//                           {isVisible('member') && <TableHead>Member</TableHead>}
//                           {isVisible('email') && <TableHead>Email</TableHead>}
//                           {isVisible('role') && <TableHead>Role</TableHead>}
//                           {isVisible('status') && <TableHead>Status</TableHead>}
//                           {isVisible('primary_contact') && (
//                             <TableHead>Primary Contact</TableHead>
//                           )}
//                           <TableHead className="bg-card sticky right-0 px-4 text-right">
//                             Actions
//                           </TableHead>
//                         </TableRow>
//                       </TableHeader>
//                       <TableBody>
//                         {members.map((member: WorkspaceMember) => (
//                           <TableRow
//                             key={member.id}
//                             className="hover:bg-muted/50"
//                           >
//                             {isVisible('member') && (
//                               <TableCell>
//                                 <div className="flex items-center gap-3">
//                                   <div className="bg-secondary flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold">
//                                     {(
//                                       member.user?.email?.charAt(0) || 'M'
//                                     ).toUpperCase()}
//                                   </div>
//                                   <span className="font-medium">
//                                     {member.user?.user_metadata?.full_name ||
//                                       'Team Member'}
//                                   </span>
//                                 </div>
//                               </TableCell>
//                             )}
//                             {isVisible('email') && (
//                               <TableCell className="text-muted-foreground text-sm">
//                                 {member.user?.email}
//                               </TableCell>
//                             )}
//                             {isVisible('role') && (
//                               <TableCell>
//                                 <div className="flex items-center gap-2">
//                                   <div
//                                     className="h-3 w-3 rounded-full"
//                                     style={{
//                                       backgroundColor: getRoleColor(
//                                         member.role,
//                                       ),
//                                     }}
//                                   />
//                                   <span className="font-medium">
//                                     {member.role?.role_name}
//                                   </span>
//                                 </div>
//                               </TableCell>
//                             )}
//                             {isVisible('status') && (
//                               <TableCell>
//                                 {getStatusBadge(member.status)}
//                               </TableCell>
//                             )}
//                             {isVisible('primary_contact') && (
//                               <TableCell>
//                                 {member.is_primary_contact ? (
//                                   <Badge variant="secondary">Primary</Badge>
//                                 ) : (
//                                   <span className="text-muted-foreground/50 text-xs">
//                                     —
//                                   </span>
//                                 )}
//                               </TableCell>
//                             )}
//                             <TableCell className="bg-card sticky right-0 px-4 text-right">
//                               <div className="flex items-center justify-end gap-2">
//                                 {member.status === 'pending' && (
//                                   <Button
//                                     variant="ghost"
//                                     size="sm"
//                                     onClick={() =>
//                                       handleResendInvitation(member.id)
//                                     }
//                                     className="gap-2"
//                                     disabled={resendMutation.isPending}
//                                   >
//                                     <RotateCcw className="h-4 w-4" />
//                                   </Button>
//                                 )}
//                                 {canAccess('team_members', 'edit') && (
//                                   <Button
//                                     variant="ghost"
//                                     size="sm"
//                                     onClick={() => handleEditMember(member)}
//                                     className="gap-2"
//                                   >
//                                     <Edit2 className="h-4 w-4" />
//                                   </Button>
//                                 )}
//                                 {canAccess('team_members', 'delete') && (
//                                   <Button
//                                     variant="ghost"
//                                     size="sm"
//                                     onClick={() =>
//                                       handleRemoveMember(member.id)
//                                     }
//                                     className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
//                                     disabled={removeMutation.isPending}
//                                   >
//                                     <Trash2 className="h-4 w-4" />
//                                   </Button>
//                                 )}
//                               </div>
//                             </TableCell>
//                           </TableRow>
//                         ))}
//                       </TableBody>
//                     </table>
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           </div>

//           {/* Dialogs */}
//           <InviteMemberDialog
//             open={inviteDialogOpen}
//             onOpenChange={setInviteDialogOpen}
//           />

//           {updatingMember && (
//             <UpdateMemberDialog
//               member={updatingMember}
//               open={updateDialogOpen}
//               onOpenChange={setUpdateDialogOpen}
//               onSuccess={() => setUpdatingMember(null)}
//             />
//           )}
//         </PageBody>
//       </div>
//     </ModuleGuard>
//   );
// }

export { default } from '../../team-members/page';
