
import { useState } from 'react';
import { Task } from '@/types';
import { useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { getFocusRing } from '@/lib/theme';
import { useToast } from '@/hooks/use-toast';
import TaskEditDialog from './TaskEditDialog';
import DeleteTaskDialog from './DeleteTaskDialog';

interface TaskCardProps {
  task: Task;
}

const TaskCard = ({ task }: TaskCardProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const { toast } = useToast();

  const handleToggleTask = async () => {
    try {
      await updateTaskMutation.mutateAsync({
        id: task.id,
        updates: { isCompleted: !task.isCompleted }
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async () => {
    try {
      await deleteTaskMutation.mutateAsync(task.id);
      setIsDeleteDialogOpen(false);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
      case 'low': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <>
      <Card className={cn(
        "transition-all duration-300 ease-in-out hover:shadow-lg hover:scale-[1.02] border-l-4 group",
        task.isCompleted && "opacity-75 scale-[0.98]",
        task.priority === 'high' && "border-l-red-500",
        task.priority === 'medium' && "border-l-yellow-500",
        task.priority === 'low' && "border-l-green-500"
      )}>
        <CardContent className="p-5">
          <div className="flex items-start space-x-4">
            <div className="transition-transform duration-200 ease-in-out hover:scale-110">
              <Checkbox
                checked={task.isCompleted}
                onCheckedChange={handleToggleTask}
                priority={task.priority}
                className={cn('mt-1 touch-target', getFocusRing())}
              />
            </div>
            
            <div className="flex-1 min-w-0 space-y-3">
              {/* Title and Description */}
              <div className="transition-all duration-300 ease-in-out">
                <h3 className={cn(
                  "font-semibold text-lg leading-tight break-words transition-all duration-300 ease-in-out",
                  task.isCompleted && "line-through text-muted-foreground transform scale-95"
                )}>
                  {task.title}
                </h3>
                {task.description && (
                  <p className={cn(
                    "text-muted-foreground mt-2 text-sm leading-relaxed break-words transition-all duration-300 ease-in-out",
                    task.isCompleted && "line-through"
                  )}>
                    {task.description}
                  </p>
                )}
              </div>

              {/* Metadata Row */}
              <div className="flex flex-wrap items-center gap-3">
                <Badge className={cn('px-3 py-1 text-xs font-medium transition-all duration-200 ease-in-out hover:scale-105', getPriorityColor(task.priority))}>
                  {task.priority}
                </Badge>
                
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs px-2 py-1 transition-all duration-200 ease-in-out hover:scale-105">
                    {tag}
                  </Badge>
                ))}
                
                {task.dueDate && (
                  <div className="flex items-center text-xs text-muted-foreground transition-all duration-200 ease-in-out">
                    <span className="mr-1">📅</span>
                    Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                  </div>
                )}
                
                <div className="flex items-center text-xs text-muted-foreground transition-all duration-200 ease-in-out">
                  <span className="mr-1">🍅</span>
                  {task.completedPomodoros}/{task.estimatedPomodoros}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out transform translate-x-2 group-hover:translate-x-0">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditDialogOpen(true)}
                className={cn('touch-target text-muted-foreground hover:text-foreground transition-all duration-200 ease-in-out hover:scale-110', getFocusRing())}
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit task</span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={deleteTaskMutation.isPending}
                className={cn('touch-target text-muted-foreground hover:text-destructive transition-all duration-200 ease-in-out hover:scale-110', getFocusRing())}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete task</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <TaskEditDialog
        task={task}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      <DeleteTaskDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteTask}
        taskTitle={task.title}
      />
    </>
  );
};

export default TaskCard;
