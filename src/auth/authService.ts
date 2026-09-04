import { supabase } from '../lib/supabase';

export async function signInWithGoogle() {
  if (!supabase) return;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;

  await supabase.auth.signOut();
}
