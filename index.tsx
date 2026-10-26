import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { VestiaBackground } from '@/components/VestiaBackground';
import { useAuth } from '@/lib/auth-context';
import { Colors, Typography, Spacing, BorderRadius } from '@/lib/theme';
import { Sparkles } from 'lucide-react-native';

export default function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (loading) return;
    if (!email.trim() || !password) {
      setError('Inserisci email e password per continuare.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const fn = mode === 'signin' ? signIn : signUp;
      const { error: err } = await fn(email.trim(), password);
      if (!err) return;

      const normalizedError = err.toLowerCase();
      if (normalizedError.includes('already registered') || normalizedError.includes('user already exists')) {
        setError('Questa email è già registrata. Accedi usando la password esistente.');
        setMode('signin');
      } else if (normalizedError.includes('invalid login credentials')) {
        setError('Email o password non corretti. Puoi recuperare la password qui sotto.');
      } else {
        setError(err);
      }
    } catch {
      setError('Non riesco a completare l’accesso. Controlla la connessione e riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (loading) return;
    if (!email.trim()) {
      setError('Inserisci prima il tuo indirizzo email.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const { error: err } = await resetPassword(email.trim());
      if (err) {
        setError(err);
        return;
      }
      setMessage('Controlla la tua email per reimpostare la password.');
    } catch {
      setError('Non riesco a inviare il messaggio. Controlla la connessione e riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <VestiaBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Sparkles color={Colors.accent} size={32} strokeWidth={1.5} />
            </View>
            <Text style={styles.brandName}>Vestia</Text>
            <Text style={styles.tagline}>Your wardrobe, styled by AI</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'signin'
                ? 'Sign in to access your digital wardrobe'
                : 'Start your AI styling journey today'}
            </Text>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {message && (
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>{message}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {mode === 'signin' && (
              <TouchableOpacity style={styles.resetButton} onPress={handlePasswordReset} disabled={loading}>
                <Text style={styles.resetButtonText}>Password dimenticata?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchMode}
              onPress={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
                setMessage(null);
              }}
            >
              <Text style={styles.switchModeText}>
                {mode === 'signin'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </VestiaBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  brandName: {
    ...Typography.h1,
    color: Colors.text,
    letterSpacing: 2,
  },
  tagline: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  form: {
    width: '100%',
  },
  title: {
    ...Typography.h2,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  errorBox: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.error,
  },
  messageBox: {
    backgroundColor: 'rgba(155, 191, 138, 0.12)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(155, 191, 138, 0.28)',
  },
  messageText: {
    ...Typography.bodySmall,
    color: Colors.success,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.label,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  input: {
    ...Typography.body,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  resetButton: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  resetButtonText: {
    ...Typography.caption,
    color: Colors.accentLight,
  },
  primaryButton: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  primaryButtonText: {
    ...Typography.h3,
    color: Colors.primary,
    fontFamily: 'Inter-Semi',
  },
  switchMode: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  switchModeText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
});
