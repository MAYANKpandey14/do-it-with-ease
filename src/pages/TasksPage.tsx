import { useState } from 'react';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks';
import { useTags } from '../hooks/useTags';
import { useTasksStore } from '../stores/tasksStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, Calendar as CalendarIcon, Edit, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const TasksPage = () => {
  const { filters, setFilters } = useTasksStore();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks(filters);
  const { data: tags = [] } = useTags();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    tags: [] as string[],
    dueDate: undefined as Date | undefined,
    estimatedPomodoros: 1,
  });

  const [newTag, setNewTag] = useState('');

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;

    try {
      await createTaskMutation.mutateAsync({
        ...newTask,
      });
      
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        tags: [],
        dueDate: undefined,
        estimatedPomodoros: 1,
      });
      setIsAddDialogOpen(false);
      
      toast({
        title: 'Task created',
        description: 'Your new task has been added successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create task.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleTask = async (taskId: string, isCompleted: boolean) => {
    try {
      await updateTaskMutation.mutateAsync({
        id: taskId,
        updates: { isCompleted: !isCompleted }
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTaskMutation.mutateAsync(taskId);
      toast({
        title: 'Task deleted',
        description: 'The task has been removed successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete task.',
        variant: 'destructive',
      });
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !newTask.tags.includes(newTag.trim())) {
      setNewTask(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewTask(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setFilters({ ...filters, search: value || undefined });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const allTags = Array.from(new Set(tags.map(tag => tag.name)));

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600">Manage your to-do list and track progress</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
              <DialogDescription>
                Create a new task to add to your to-do list.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={newTask.priority} onValueChange={(value: any) => setNewTask(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pomodoros">Estimated Pomodoros</Label>
                <Input
                  id="pomodoros"
                  type="number"
                  min="1"
                  value={newTask.estimatedPomodoros}
                  onChange={(e) => setNewTask(prev => ({ ...prev, estimatedPomodoros: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newTask.dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newTask.dueDate ? format(newTask.dueDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newTask.dueDate}
                      onSelect={(date) => setNewTask(prev => ({ ...prev, dueDate: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="tags">Tags</Label>
                <div className="flex space-x-2">
                  <Input
                    id="tags"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button type="button" onClick={handleAddTag} size="sm">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {newTask.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>
              <Button 
                onClick={handleAddTask} 
                className="w-full"
                disabled={createTaskMutation.isPending}
              >
                {createTaskMutation.isPending ? 'Adding...' : 'Add Task'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filters.priority || 'all'} onValueChange={(value: string) => setFilters({ ...filters, priority: value === 'all' ? undefined : value as 'high' | 'medium' | 'low' })}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status || 'all'} onValueChange={(value: string) => setFilters({ ...filters, status: value === 'all' ? undefined : value as 'completed' | 'pending' })}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {allTags.length > 0 && (
            <div className="mt-4">
              <Label className="text-sm font-medium">Filter by tags:</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={filters.tags?.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const currentTags = filters.tags || [];
                      const newTags = currentTags.includes(tag)
                        ? currentTags.filter(t => t !== tag)
                        : [...currentTags, tag];
                      setFilters({ ...filters, tags: newTags.length > 0 ? newTags : undefined });
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task List */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">No tasks found. Create your first task to get started!</p>
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className={cn("transition-all hover:shadow-md", task.isCompleted && "opacity-75")}>
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <Checkbox
                    checked={task.isCompleted}
                    onCheckedChange={() => handleToggleTask(task.id, task.isCompleted)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h3 className={cn("font-medium", task.isCompleted && "line-through text-gray-500")}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className={cn("text-sm text-gray-600 mt-1", task.isCompleted && "line-through")}>
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-3 mt-2">
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      {task.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {task.dueDate && (
                        <span className="text-xs text-gray-500">
                          Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        🍅 {task.completedPomodoros}/{task.estimatedPomodoros}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={deleteTaskMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default TasksPage;
