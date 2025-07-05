'use client';

import { useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import AuthForm from './auth-form';
import OnboardingQuestionnaire from './onboarding-questionnaire';
import type { User } from '@supabase/supabase-js';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  console.log('🛡️ AuthGuard render - Current state:', {
    user: user ? { id: user.id, email: user.email } : null,
    loading,
    hasCompletedOnboarding,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    console.log('🛡️ AuthGuard useEffect: Setting up auth listener');
    
    const getUser = async () => {
      console.log('🛡️ Getting initial user...');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('🛡️ Initial user result:', user ? { id: user.id, email: user.email } : null);
      setUser(user);
      
      // Check if user has completed onboarding
      if (user) {
        const onboardingStatus = localStorage.getItem(`onboarding_completed_${user.id}`);
        console.log('🛡️ Onboarding status from localStorage:', onboardingStatus);
        setHasCompletedOnboarding(onboardingStatus === 'true');
      }
      
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🛡️ Auth state changed:', event);
        console.log('🛡️ New session user:', session?.user ? { id: session.user.id, email: session.user.email } : null);
        setUser(session?.user ?? null);
        
        // Check onboarding status for new user
        if (session?.user) {
          const onboardingStatus = localStorage.getItem(`onboarding_completed_${session.user.id}`);
          console.log('🛡️ Onboarding status from localStorage (auth change):', onboardingStatus);
          setHasCompletedOnboarding(onboardingStatus === 'true');
        } else {
          setHasCompletedOnboarding(false);
        }
        
        setLoading(false);
      }
    );

    return () => {
      console.log('🛡️ Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const handleOnboardingComplete = () => {
    console.log('🚀 AuthGuard: handleOnboardingComplete called!');
    console.log('🚀 AuthGuard: Current hasCompletedOnboarding:', hasCompletedOnboarding);
    console.log('🚀 AuthGuard: Setting hasCompletedOnboarding to true...');
    
    setHasCompletedOnboarding(true);
    
    // Persist onboarding completion in localStorage
    if (user) {
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
      console.log('🚀 AuthGuard: Saved onboarding completion to localStorage');
    }
    
    console.log('🚀 AuthGuard: Should now render main dashboard');
  };

  console.log('🛡️ AuthGuard: Determining what to render...');

  if (loading) {
    console.log('🛡️ AuthGuard: Rendering loading state');
    return <div>Loading...</div>;
  }

  if (!user) {
    console.log('🛡️ AuthGuard: No user, rendering AuthForm');
    return <AuthForm />;
  }

  if (!hasCompletedOnboarding) {
    console.log('🛡️ AuthGuard: User exists but no onboarding completed, rendering OnboardingQuestionnaire');
    console.log('🛡️ AuthGuard: Passing userId:', user.id);
    console.log('🛡️ AuthGuard: Passing onComplete function:', handleOnboardingComplete);
    
    return (
      <OnboardingQuestionnaire 
        userId={user.id} 
        onComplete={handleOnboardingComplete}
      />
    );
  }

  console.log('🛡️ AuthGuard: All checks passed, rendering main dashboard');
  return <>{children}</>;
}
