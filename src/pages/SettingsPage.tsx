
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Bell, Clock, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SettingsPage = () => {
  const { user, updateUser } = useAuthStore();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [preferences, setPreferences] = useState({
    theme: 'light',
    notifications: true,
    soundEnabled: true,
    pomodoroDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
  });

  const handleProfileUpdate = () => {
    updateUser(profile);
    toast({
      title: 'Profile Updated',
      description: 'Your profile information has been saved.',
    });
  };

  const handlePreferencesUpdate = () => {
    // In a real app, this would save to backend/localStorage
    localStorage.setItem('user_preferences', JSON.stringify(preferences));
    toast({
      title: 'Preferences Saved',
      description: 'Your preferences have been updated.',
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account and application preferences</p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Profile</span>
          </CardTitle>
          <CardDescription>
            Update your personal information and account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">
                {profile.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm">
                Change Avatar
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                JPG, PNG or GIF. Max size 2MB.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email"
              />
            </div>
          </div>

          <Button onClick={handleProfileUpdate}>
            Save Profile
          </Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
          </CardTitle>
          <CardDescription>
            Configure how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notifications">Push Notifications</Label>
              <p className="text-sm text-gray-500">Receive notifications for task reminders</p>
            </div>
            <Switch
              id="notifications"
              checked={preferences.notifications}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, notifications: checked }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sound">Sound Notifications</Label>
              <p className="text-sm text-gray-500">Play sound when Pomodoro sessions end</p>
            </div>
            <Switch
              id="sound"
              checked={preferences.soundEnabled}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, soundEnabled: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Pomodoro Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Pomodoro Timer</span>
          </CardTitle>
          <CardDescription>
            Customize your Pomodoro timer durations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pomodoro">Pomodoro Duration (minutes)</Label>
              <Input
                id="pomodoro"
                type="number"
                min="1"
                max="60"
                value={preferences.pomodoroDuration}
                onChange={(e) => 
                  setPreferences(prev => ({ 
                    ...prev, 
                    pomodoroDuration: parseInt(e.target.value) || 25 
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="shortBreak">Short Break (minutes)</Label>
              <Input
                id="shortBreak"
                type="number"
                min="1"
                max="30"
                value={preferences.shortBreakDuration}
                onChange={(e) => 
                  setPreferences(prev => ({ 
                    ...prev, 
                    shortBreakDuration: parseInt(e.target.value) || 5 
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="longBreak">Long Break (minutes)</Label>
              <Input
                id="longBreak"
                type="number"
                min="1"
                max="60"
                value={preferences.longBreakDuration}
                onChange={(e) => 
                  setPreferences(prev => ({ 
                    ...prev, 
                    longBreakDuration: parseInt(e.target.value) || 15 
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="longBreakInterval">Long Break Interval</Label>
              <Input
                id="longBreakInterval"
                type="number"
                min="2"
                max="10"
                value={preferences.longBreakInterval}
                onChange={(e) => 
                  setPreferences(prev => ({ 
                    ...prev, 
                    longBreakInterval: parseInt(e.target.value) || 4 
                  }))
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Take a long break after this many Pomodoros
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <span>Appearance</span>
          </CardTitle>
          <CardDescription>
            Customize the look and feel of the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="theme">Theme</Label>
            <div className="flex space-x-4 mt-2">
              <Button
                variant={preferences.theme === 'light' ? 'default' : 'outline'}
                onClick={() => setPreferences(prev => ({ ...prev, theme: 'light' }))}
                className="flex-1"
              >
                Light
              </Button>
              <Button
                variant={preferences.theme === 'dark' ? 'default' : 'outline'}
                onClick={() => setPreferences(prev => ({ ...prev, theme: 'dark' }))}
                className="flex-1"
              >
                Dark
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save All Settings */}
      <div className="flex justify-end">
        <Button onClick={handlePreferencesUpdate} size="lg">
          Save All Settings
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
