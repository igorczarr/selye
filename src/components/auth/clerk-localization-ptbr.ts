import type { ClerkProvider } from "@clerk/nextjs";

type ClerkLocalization = NonNullable<
  React.ComponentProps<typeof ClerkProvider>["localization"]
>;

/**
 * Localização PT-BR leve e completa para o Clerk no Selye (Fase 8).
 * Evita qualquer rótulo em inglês nas telas de Login, Cadastro e recuperação de senha.
 */
export const selyeClerkPtBR: ClerkLocalization = {
  locale: "pt-BR",
  socialButtonsBlockButton: "Continuar com {{provider|titleize}}",
  dividerText: "ou continue com e-mail",
  formFieldLabel__emailAddress: "E-mail",
  formFieldLabel__emailAddress_username: "E-mail ou usuário",
  formFieldLabel__username: "Nome de usuário",
  formFieldLabel__password: "Senha",
  formFieldLabel__firstName: "Nome",
  formFieldLabel__lastName: "Sobrenome",
  formFieldInputPlaceholder__emailAddress: "voce@exemplo.com",
  formFieldInputPlaceholder__emailAddress_username: "voce@exemplo.com",
  formFieldInputPlaceholder__password: "Digite sua senha",
  formFieldInputPlaceholder__firstName: "Seu nome",
  formFieldInputPlaceholder__lastName: "Seu sobrenome",
  formButtonPrimary: "Continuar",
  formFieldAction__forgotPassword: "Esqueceu a senha?",
  signIn: {
    start: {
      title: "Entrar no Selye",
      subtitle: "Acesse seus treinos e sua evolução",
      actionText: "Ainda não tem conta?",
      actionLink: "Criar conta",
    },
    password: {
      title: "Digite sua senha",
      subtitle: "Informe a senha associada à sua conta",
      actionLink: "Usar outro método",
    },
    emailCode: {
      title: "Verifique seu e-mail",
      subtitle: "Enviamos um código de confirmação",
      formTitle: "Código de verificação",
      resendButton: "Reenviar código",
    },
  },
  signUp: {
    start: {
      title: "Criar conta no Selye",
      subtitle: "Organize, registre e acompanhe sua evolução física",
      actionText: "Já possui uma conta?",
      actionLink: "Entrar",
    },
    emailCode: {
      title: "Confirme seu e-mail",
      subtitle: "Digite o código enviado para ativar sua conta",
      formTitle: "Código de verificação",
      resendButton: "Reenviar código",
    },
  },
  footerActionLink__useAnotherMethod: "Usar outro método",
};
