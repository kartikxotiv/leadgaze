'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Square,
  Trash2,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { CustomTimeLog, type TimeLogValue } from '@kit/ui/custom-time-log';
import { DateTimePicker } from '@kit/ui/datetime-picker';
import { format } from 'date-fns';
import { Button } from '@kit/ui/button';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { CardWidgetList, CardWidgetListItem } from '@kit/ui/card-widget-list';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Badge } from '@kit/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { CustomDeleteDialog } from '@kit/ui/custom-delete-dialog';

import { useLocalization } from '~/lib/localization/localization-provider';
import { useRBAC } from '~/lib/rbac/rbac-provider';

import {
  getTasksService,
  createTaskService,
  updateTaskService,
  deleteTaskService,
  getTaskTimeLogsService,
  createTaskTimeLogService,
  type Task,
  type TaskTimeLog,
} from '../../../services/activities.service';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@kit/ui/tooltip';

interface EntityTasksProps {
  entityType: string;
  entityId: string;
}

export function EntityTasks({ entityType, entityId }: EntityTasksProps) {
  const { currentWorkspace: workspace } = useRBAC();
  const { formatDate } = useLocalization();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [taskTab, setTaskTab] = useState<'active' | 'completed'>('active');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Time logging states
  const [timeLogTask, setTimeLogTask] = useState<Task | null>(null);
  const [isTimeLogOpen, setIsTimeLogOpen] = useState(false);
  const [isCompletingTask, setIsCompletingTask] = useState(false);

  // View logs states
  const [viewLogsTask, setViewLogsTask] = useState<Task | null>(null);
  const [isViewLogsOpen, setIsViewLogsOpen] = useState(false);

  // Delete dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Queries
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', entityType, entityId, workspace?.id, taskTab],
    queryFn: () => {
      if (!workspace?.id) return [];
      return getTasksService(workspace.id, entityType, entityId, taskTab);
    },
    enabled: !!workspace?.id,
  });

  const { data: timeLogs = [], isLoading: isLoadingLogs } = useQuery<TaskTimeLog[]>({
    queryKey: ['task-time-logs', viewLogsTask?.id, workspace?.id],
    queryFn: () => {
      if (!workspace?.id || !viewLogsTask?.id) return [];
      return getTaskTimeLogsService(workspace.id, viewLogsTask.id);
    },
    enabled: !!workspace?.id && !!viewLogsTask?.id && isViewLogsOpen,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: () =>
      createTaskService({
        workspace_id: workspace!.id,
        entity_type: entityType,
        entity_id: entityId,
        title: formData.title,
        description: formData.description,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
        priority: formData.priority,
      }),
    onSuccess: () => {
      toast.success('Task created successfully');
      setIsOpen(false);
      resetForm();
      invalidateTasks();
    },
    onError: () => toast.error('Failed to create task'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Task>) =>
      updateTaskService(editingTask!.id, payload),
    onSuccess: () => {
      toast.success('Task updated successfully');
      setIsOpen(false);
      setEditingTask(null);
      resetForm();
      invalidateTasks();
    },
    onError: () => toast.error('Failed to update task'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTaskService,
    onSuccess: () => {
      toast.success('Task deleted successfully');
      setIsDeleteDialogOpen(false);
      setTaskToDelete(null);
      invalidateTasks();
    },
    onError: () => {
      toast.error('Failed to delete task');
      setIsDeleteDialogOpen(false);
      setTaskToDelete(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (task: Task) =>
      updateTaskService(task.id, {
        is_completed: !task.is_completed,
      }),
    onSuccess: (data, task) => {
      invalidateTasks();
      toast.success(
        task.is_completed ? 'Task marked as active' : 'Task marked as completed',
      );
    },
    onError: () => toast.error('Failed to update task status'),
  });

  const timeLogMutation = useMutation({
    mutationFn: (value: TimeLogValue) => {
      return createTaskTimeLogService(timeLogTask!.id, {
        workspace_id: workspace!.id,
        duration_minutes: value.durationMinutes,
        description: value.description,
        logged_at: value.dateTime,
      });
    },
    onSuccess: () => {
      toast.success('Time logged successfully');
      invalidateTasks();
      if (isCompletingTask && timeLogTask) {
        toggleMutation.mutate(timeLogTask);
      }
      setIsTimeLogOpen(false);
      setIsCompletingTask(false);
      setTimeLogTask(null);
    },
    onError: () => toast.error('Failed to log time'),
  });

  const invalidateTasks = () => {
    queryClient.invalidateQueries({
      queryKey: ['tasks', entityType, entityId, workspace?.id],
    });
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', due_date: '', priority: 'medium' });
  };

  const handleSave = () => {
    const payload = {
      title: formData.title,
      description: formData.description,
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
      priority: formData.priority,
    };
    if (editingTask) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate();
    }
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
      priority: task.priority || 'medium',
    });
    setIsOpen(true);
  };

  const toggleCompletion = (task: Task) => {
    if (!task.is_completed) {
      setTimeLogTask(task);
      setIsCompletingTask(true);
      setIsTimeLogOpen(true);
    } else {
      toggleMutation.mutate(task);
    }
  };

  const totalLoggedMinutes = timeLogs.reduce((acc, curr) => acc + curr.duration_minutes, 0);
  const totalHours = Math.floor(totalLoggedMinutes / 60);
  const remainingMinutes = totalLoggedMinutes % 60;

  return (
    <CardWidgetContainer
      title="Tasks & Checklist"
      headerClassName="p-2 xl:p-2 2xl:p-2 mb-1"
      icon={<CheckSquare className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
      icon2={
        <div className="flex items-center gap-2">
          <Tabs
            value={taskTab}
            onValueChange={(val) => setTaskTab(val as 'active' | 'completed')}
            className="w-fit"
          >
            <TabsList className="h-8 p-1">
              <TabsTrigger value="active" className="h-6 text-xs px-3">Active</TabsTrigger>
              <TabsTrigger value="completed" className="h-6 text-xs px-3">Completed</TabsTrigger>
            </TabsList>
          </Tabs>

          <Dialog
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) {
                setEditingTask(null);
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="gap-1 text-sm text-blue-500 hover:text-blue-600">
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>
                  {editingTask ? 'Edit Task' : 'Add Task'}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 space-y-2 px-2 overflow-y-auto">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="Enter task title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Enter description (optional)"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <DateTimePicker
                    mode="date"
                    placeholder="Select date"
                    value={formData.due_date ? new Date(formData.due_date) : undefined}
                    onChange={(date) => setFormData({ ...formData, due_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                  />
                </div>
                <div className="space-y-2 pb-1">
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) =>
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!formData.title || createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingTask
                      ? 'Save Changes'
                      : 'Create Task'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="px-2 mb-2">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : tasks.length > 0 ? (
          <CardWidgetList>
            {tasks.map((task) => (
              <CardWidgetListItem
                key={task.id}
                className="gap-2"
                actionStyle="slide"
                icon={
                  toggleMutation.isPending && toggleMutation.variables?.id === task.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button onClick={() => toggleCompletion(task)} className="text-gray-400 hover:text-blue-500">
                            {task.is_completed ? (
                              <CheckSquare className="h-5 w-5 text-blue-500" />
                            ) : (
                              <Square className="h-5 w-5" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {task.is_completed ? 'Mark as incomplete' : 'Mark as complete'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                }
                iconAlignTop={true}
                title={
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${task.is_completed ? 'line-through text-leadgaze-dark dark:text-white' : 'text-leadgaze-dark dark:text-white'
                        }`}
                    >
                      {task.title}
                    </span>
                    <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'} className="text-[10px] py-0 px-1.5 uppercase font-semibold rounded-[4px] h-[20px]">
                      {task.priority}
                    </Badge>
                  </div>
                }
                metadata={
                  <div className="flex flex-col gap-1 mt-1 text-xs text-gray-500">
                    {task.description && <p className="text-gray-700 dark:text-gray-300">{task.description}</p>}
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      <span>
                        Created by {task.created_by_user?.name || 'Unknown'}
                      </span>
                      {task.due_date && (
                        <span className="text-red-500 font-medium">
                          Due: {formatDate(task.due_date)}
                        </span>
                      )}
                      {task.is_completed && task.completed_by_user && (
                        <span>
                          Completed by {task.completed_by_user.name} on {task.completed_at ? formatDate(task.completed_at) : ''}
                        </span>
                      )}
                      {task.total_logged_minutes !== undefined && task.total_logged_minutes !== null && (
                        <span className="text-blue-500 font-medium">
                          Time Spent: {Math.floor(task.total_logged_minutes / 60)}h {task.total_logged_minutes % 60}m
                        </span>
                      )}
                    </div>
                  </div>
                }
                actions={
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setTimeLogTask(task);
                        setIsCompletingTask(false);
                        setIsTimeLogOpen(true);
                      }}
                      className="h-7 w-7 text-gray-400 hover:text-green-500"
                      title="Log Time"
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setViewLogsTask(task);
                        setIsViewLogsOpen(true);
                      }}
                      className="h-7 w-7 text-gray-400 hover:text-blue-500"
                      title="View Logged Time"
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(task)}
                      className="h-7 w-7 text-gray-400 hover:text-blue-500"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setTaskToDelete(task.id);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="h-7 w-7 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                }
              />
            ))}
          </CardWidgetList>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F3FF]">
              <CheckSquare className="h-6 w-6 text-blue-500" />
            </div>
            <p className="mt-4 text-sm text-gray-500">No tasks found</p>
          </div>
        )}
      </div>

      {/* Log Time Dialog */}
      <CustomTimeLog
        open={isTimeLogOpen}
        onOpenChange={(open) => {
          setIsTimeLogOpen(open);
          if (!open) {
            setTimeLogTask(null);
            setIsCompletingTask(false);
          }
        }}
        title={`Log Time for: ${timeLogTask?.title ?? ''}`}
        subtitle={
          isCompletingTask && (timeLogTask?.total_logged_minutes ?? 0) <= 0
            ? 'Please input time before closing this task'
            : undefined
        }
        headerExtra={
          (timeLogTask?.total_logged_minutes ?? 0) > 0 ? (
            <p className="text-sm text-blue-500 mt-1 font-medium">
              Total Logged Time: {Math.floor((timeLogTask?.total_logged_minutes ?? 0) / 60)}h {(timeLogTask?.total_logged_minutes ?? 0) % 60}m
            </p>
          ) : undefined
        }
        onSave={(value) => timeLogMutation.mutate(value)}
        isSaving={timeLogMutation.isPending}
        saveLabel="Submit Log"
        showSkip={isCompletingTask}
        skipDisabled={(timeLogTask?.total_logged_minutes ?? 0) <= 0}
        onSkip={() => {
          if (timeLogTask) toggleMutation.mutate(timeLogTask);
          setIsTimeLogOpen(false);
        }}
      />

      {/* View Logs Dialog */}
      <Dialog
        open={isViewLogsOpen}
        onOpenChange={(open) => {
          setIsViewLogsOpen(open);
          if (!open) {
            setViewLogsTask(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle>Time Logs: {viewLogsTask?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {isLoadingLogs ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : timeLogs.length > 0 ? (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border flex justify-between items-center text-sm font-semibold">
                  <span>Total Logged Time:</span>
                  <span className="text-blue-500">
                    {totalHours > 0 ? `${totalHours}h ` : ''}{remainingMinutes}m
                  </span>
                </div>
                {timeLogs.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg text-sm space-y-1.5 bg-white dark:bg-slate-900">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {log.user?.name || 'Unknown User'}
                      </span>
                      <span className="text-xs text-gray-500 font-medium bg-gray-100 dark:bg-slate-800 py-0.5 px-2 rounded-full">
                        {log.duration_minutes} mins
                      </span>
                    </div>
                    {log.description && (
                      <p className="text-gray-600 dark:text-gray-400 italic text-xs">
                        "{log.description}"
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 text-right">
                      Logged on: {formatDate(log.logged_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-6">No time logged yet.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewLogsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        onConfirm={() => {
          if (taskToDelete) {
            deleteMutation.mutate(taskToDelete);
          }
        }}
        isDeleting={deleteMutation.isPending}
      />
    </CardWidgetContainer>
  );
}
