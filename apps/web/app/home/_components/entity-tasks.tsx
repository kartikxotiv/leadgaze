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

import { Button } from '@kit/ui/button';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { CardWidgetList, CardWidgetListItem } from '@kit/ui/card-widget-list';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Badge } from '@kit/ui/badge';

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
  const getTodayDateString = () => new Date().toISOString().split('T')[0];
  const [timeLogData, setTimeLogData] = useState({
    hours: '',
    minutes: '',
    description: '',
    logged_at: getTodayDateString(),
  });

  // View logs states
  const [viewLogsTask, setViewLogsTask] = useState<Task | null>(null);
  const [isViewLogsOpen, setIsViewLogsOpen] = useState(false);

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
      invalidateTasks();
    },
    onError: () => toast.error('Failed to delete task'),
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
    mutationFn: () => {
      const hoursVal = parseInt(timeLogData.hours || '0', 10);
      const minutesVal = parseInt(timeLogData.minutes || '0', 10);
      const totalMin = hoursVal * 60 + minutesVal;
      return createTaskTimeLogService(timeLogTask!.id, {
        workspace_id: workspace!.id,
        duration_minutes: totalMin,
        description: timeLogData.description,
        logged_at: timeLogData.logged_at ? new Date(timeLogData.logged_at).toISOString() : undefined,
      });
    },
    onSuccess: () => {
      toast.success('Time logged successfully');
      setIsTimeLogOpen(false);
      setTimeLogData({ hours: '', minutes: '', description: '', logged_at: getTodayDateString() });
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
    toggleMutation.mutate(task);
  };

  const totalLoggedMinutes = timeLogs.reduce((acc, curr) => acc + curr.duration_minutes, 0);
  const totalHours = Math.floor(totalLoggedMinutes / 60);
  const remainingMinutes = totalLoggedMinutes % 60;

  return (
    <CardWidgetContainer
      title="Tasks & Checklist"
      hideHeaderBorder={true}
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
              <DialogHeader className="border-b p-6 pb-4">
                <DialogTitle>
                  {editingTask ? 'Edit Task' : 'Add Task'}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 space-y-4 px-6 py-4 overflow-y-auto">
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
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="border-t p-6 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={!formData.title || createMutation.isPending || updateMutation.isPending}
                  className="w-full"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingTask
                      ? 'Save Changes'
                      : 'Create Task'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="px-6 py-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : tasks.length > 0 ? (
          <CardWidgetList>
            {tasks.map((task) => (
              <CardWidgetListItem
                key={task.id}
                icon={
                  toggleMutation.isPending && toggleMutation.variables?.id === task.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  ) : (
                    <button onClick={() => toggleCompletion(task)} className="text-gray-400 hover:text-blue-500">
                      {task.is_completed ? (
                        <CheckSquare className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>
                  )
                }
                iconAlignTop={true}
                title={
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        task.is_completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'
                      }`}
                    >
                      {task.title}
                    </span>
                    <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'} className="text-[10px] py-0 px-1.5 uppercase font-semibold">
                      {task.priority}
                    </Badge>
                  </div>
                }
                metadata={
                  <div className="flex flex-col gap-1 mt-1 text-xs text-gray-500">
                    {task.description && <p className="text-gray-700 dark:text-gray-300 italic">{task.description}</p>}
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
                        if (confirm('Are you sure you want to delete this task?')) {
                          deleteMutation.mutate(task.id);
                        }
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
          <div className="py-8 text-center">
            <CheckSquare className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No tasks found</p>
          </div>
        )}
      </div>

      {/* Log Time Dialog */}
      <Dialog
        open={isTimeLogOpen}
        onOpenChange={(open) => {
          setIsTimeLogOpen(open);
          if (!open) {
            setTimeLogTask(null);
            setTimeLogData({ hours: '', minutes: '', description: '', logged_at: getTodayDateString() });
          }
        }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Log Time for: {timeLogTask?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hours</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={timeLogData.hours}
                  onChange={(e) => setTimeLogData({ ...timeLogData, hours: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Minutes</Label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="0"
                  value={timeLogData.minutes}
                  onChange={(e) => setTimeLogData({ ...timeLogData, minutes: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Work Date</Label>
              <Input
                type="date"
                value={timeLogData.logged_at}
                onChange={(e) => setTimeLogData({ ...timeLogData, logged_at: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what you worked on"
                value={timeLogData.description}
                onChange={(e) => setTimeLogData({ ...timeLogData, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsTimeLogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => timeLogMutation.mutate()}
              disabled={(!timeLogData.hours && !timeLogData.minutes) || timeLogMutation.isPending}
            >
              {timeLogMutation.isPending ? 'Saving...' : 'Submit Log'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
          <DialogHeader className="mb-4">
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
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setIsViewLogsOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </CardWidgetContainer>
  );
}
