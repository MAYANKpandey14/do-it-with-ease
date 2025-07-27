import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Mail, ArrowLeft } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuthStore } from '../stores/authStore';

const EmailVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Get email from URL params or localStorage
    const emailParam = searchParams.get('email');
    const storedEmail = localStorage.getItem('pendingVerificationEmail');
    
    if (emailParam) {
      setEmail(emailParam);
      localStorage.setItem('pendingVerificationEmail', emailParam);
    } else if (storedEmail) {
      setEmail(storedEmail);
    }

    // If user is already authenticated, redirect to dashboard
    if (user) {
      localStorage.removeItem('pendingVerificationEmail');
      navigate('/');
      toast({
        title: 'Welcome to FocusFlow!',
        description: 'Your email has been verified successfully.',
      });
    }
  }, [user, navigate, searchParams, toast]);

  const handleResendEmail = () => {
    // This would typically trigger a resend verification email function
    toast({
      title: 'Verification email sent',
      description: 'Please check your email for the verification link.',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription>
              We've sent a verification link to {email && <><br /><strong>{email}</strong></>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4" />
                <span>Click the link in your email to verify your account</span>
              </div>
              
              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Didn't receive the email? Check your spam folder or click below to resend.
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleResendEmail}
                  className="w-full"
                >
                  Resend verification email
                </Button>
              </div>

              <div className="pt-4 border-t">
                <Link 
                  to="/register" 
                  className="inline-flex items-center text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to sign up
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailVerificationPage;