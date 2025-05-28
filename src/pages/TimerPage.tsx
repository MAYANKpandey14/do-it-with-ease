
import { useState, useEffect } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useCreatePomodoroSession, useUpdatePomodoroSession } from '../hooks/usePomodoro';
import { useAuthStore } from '../stores/authStore';
import { usePomodoroStore } from '../stores/pomodoroStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, RotateCcw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const TimerPage = () => {
  const { profile } = useAuthStore();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks({ status: 'pending' });
  const createSessionMutation = useCreatePomodoroSession();
  const updateSessionMutation = useUpdatePomodoroSession();
  const { toast } = useToast();

  const {
    currentSession,
    isRunning,
    isPaused,
    timeRemaining,
    selectedTask,
    workDuration,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    resetSession,
    setDurations,
  } = usePomodoroStore();

  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Update durations when profile loads
  useEffect(() => {
    if (profile) {
      setDurations(profile.pomodoro_duration, profile.short_break_duration);
    }
  }, [profile, setDurations]);

  const activeTasks = tasks.filter(task => !task.isCompleted);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return ((workDuration - timeRemaining) / workDuration) * 100;
  };

  const handleStart = async () => {
    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task || selectedTaskId === 'no-tasks') return;

    try {
      const session = await createSessionMutation.mutateAsync({
        taskId: task.id,
        durationMinutes: Math.round(workDuration / 60),
        sessionType: 'work'
      });

      setCurrentSessionId(session.id);
      startSession(task);
      
      toast({
        title: 'Pomodoro started!',
        description: `Focus time for "${task.title}" has begun.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start session.',
        variant: 'destructive',
      });
    }
  };

  const handlePlayPause = () => {
    if (isRunning) {
      pauseSession();
    } else {
      resumeSession();
    }
  };

  const handleComplete = async () => {
    if (currentSessionId) {
      try {
        await updateSessionMutation.mutateAsync({
          id: currentSessionId,
          status: 'completed',
          completedAt: new Date()
        });

        toast({
          title: 'Pomodoro completed!',
          description: 'Great work! Take a well-deserved break.',
        });
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to complete session.',
          variant: 'destructive',
        });
      }
    }

    completeSession();
    setCurrentSessionId(null);
  };

  const handleReset = async () => {
    if (currentSessionId) {
      try {
        await updateSessionMutation.mutateAsync({
          id: currentSessionId,
          status: 'cancelled'
        });
      } catch (error: any) {
        console.error('Failed to update session status:', error);
      }
    }

    resetSession();
    setCurrentSessionId(null);
  };

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Pomodoro Timer</h1>
        <p className="text-gray-600">Focus on your tasks with the Pomodoro Technique</p>
      </div>

      {/* Timer Display */}
      <Card className="text-center">
        <CardHeader>
          {selectedTask ? (
            <div>
              <CardTitle className="text-lg">{selectedTask.title}</CardTitle>
              <CardDescription>
                <div className="flex items-center justify-center space-x-2 mt-2">
                  <Badge className={
                    selectedTask.priority === 'high' ? 'bg-red-100 text-red-800' :
                    selectedTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }>
                    {selectedTask.priority}
                  </Badge>
                  <span className="text-sm">
                    🍅 {selectedTask.completedPomodoros}/{selectedTask.estimatedPomodoros}
                  </span>
                </div>
              </CardDescription>
            </div>
          ) : (
            <CardTitle>Select a task to begin</CardTitle>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Timer Circle */}
            <div className="relative w-48 h-48 mx-auto">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - getProgressPercentage() / 100)}`}
                  className={`transition-all duration-1000 ${
                    currentSession ? 'text-blue-500' : 'text-gray-300'
                  }`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-mono font-bold">
                    {formatTime(timeRemaining)}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {currentSession ? (isPaused ? 'Paused' : 'Focus Time') : 'Ready to start'}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={getProgressPercentage()} className="h-2" />
              <p className="text-sm text-gray-500">
                {Math.round(getProgressPercentage())}% complete
              </p>
            </div>

            {/* Controls */}
            <div className="flex justify-center space-x-4">
              {!currentSession ? (
                <Button
                  onClick={handleStart}
                  disabled={!selectedTaskId || selectedTaskId === 'no-tasks' || createSessionMutation.isPending}
                  size="lg"
                  className="px-8"
                >
                  {createSessionMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-5 w-5" />
                  )}
                  Start Session
                </Button>
              ) : (
                <>
                  <Button onClick={handlePlayPause} size="lg" variant="outline">
                    {isRunning ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Resume
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handleComplete} 
                    size="lg" 
                    variant="outline"
                    disabled={updateSessionMutation.isPending}
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Complete
                  </Button>
                  <Button 
                    onClick={handleReset} 
                    size="lg" 
                    variant="outline"
                    disabled={updateSessionMutation.isPending}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Task</CardTitle>
          <CardDescription>Choose a task to focus on during your Pomodoro session</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedTaskId}
            onValueChange={setSelectedTaskId}
            disabled={!!currentSession}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a task to work on" />
            </SelectTrigger>
            <SelectContent>
              {activeTasks.length === 0 ? (
                <SelectItem value="no-tasks" disabled>No active tasks available</SelectItem>
              ) : (
                activeTasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    <div className="flex items-center space-x-2">
                      <span>{task.title}</span>
                      <Badge
                        variant="outline"
                        className={
                          task.priority === 'high' ? 'border-red-200 text-red-700' :
                          task.priority === 'medium' ? 'border-yellow-200 text-yellow-700' :
                          'border-green-200 text-green-700'
                        }
                      >
                        {task.priority}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        🍅 {task.completedPomodoros}/{task.estimatedPomodoros}
                      </span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to use the Pomodoro Technique</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>1. Choose a task you want to work on</p>
            <p>2. Set the timer for {profile?.pomodoro_duration || 25} minutes (1 Pomodoro)</p>
            <p>3. Work on the task until the timer goes off</p>
            <p>4. Take a short {profile?.short_break_duration || 5}-minute break</p>
            <p>5. After {profile?.long_break_interval || 4} Pomodoros, take a longer {profile?.long_break_duration || 15}-minute break</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimerPage;
