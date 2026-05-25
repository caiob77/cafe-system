import { AuthPanel } from '@/components/auth/auth-panel';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <AuthPanel
      description="Acesse sua operação do dia."
      footer={{
        text: 'Novo por aqui?',
        label: 'Criar conta',
        href: '/registro',
      }}
      title="Entrar"
    >
      <LoginForm />
    </AuthPanel>
  );
}
