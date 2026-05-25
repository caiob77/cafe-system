import { AuthPanel } from '@/components/auth/auth-panel';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <AuthPanel
      description="Crie o acesso inicial do seu café."
      footer={{
        text: 'Já tem conta?',
        label: 'Entrar',
        href: '/login',
      }}
      title="Criar conta"
    >
      <RegisterForm />
    </AuthPanel>
  );
}
