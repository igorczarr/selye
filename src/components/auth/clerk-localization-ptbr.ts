import type { ClerkProvider } from "@clerk/nextjs";

type ClerkLocalization = NonNullable<
  React.ComponentProps<typeof ClerkProvider>["localization"]
>;

/**
 * Localização PT-BR completa e enxuta para autenticação Selye.
 */
export const selyeClerkPtBR: ClerkLocalization = {
  locale: "pt-BR",
  socialButtonsBlockButton: "Continuar com {{provider|titleize}}",
  dividerText: "ou",
  formFieldLabel__emailAddress: "E-mail",
  formFieldLabel__emailAddress_username: "E-mail ou usuário",
  formFieldLabel__username: "Usuário",
  formFieldLabel__password: "Senha",
  formFieldLabel__newPassword: "Nova senha",
  formFieldLabel__confirmPassword: "Confirmar senha",
  formFieldLabel__firstName: "Nome",
  formFieldLabel__lastName: "Sobrenome",
  formFieldInputPlaceholder__emailAddress: "seu@email.com",
  formFieldInputPlaceholder__emailAddress_username: "seu@email.com ou usuário",
  formFieldInputPlaceholder__username: "seu_usuario",
  formFieldInputPlaceholder__password: "Digite sua senha",
  formFieldInputPlaceholder__firstName: "Nome",
  formFieldInputPlaceholder__lastName: "Sobrenome",
  formButtonPrimary: "Continuar",
  formFieldAction__forgotPassword: "Esqueceu a senha?",
  backButton: "Voltar",
  footerActionLink__useAnotherMethod: "Usar outro método de acesso",
  signIn: {
    start: {
      title: "Acesse sua conta",
      subtitle: "Continue para gerenciar seus treinos e sua evolução.",
      actionText: "Ainda não tem uma conta?",
      actionLink: "Criar conta",
    },
    password: {
      title: "Digite sua senha",
      subtitle: "Informe a senha associada à sua conta.",
      actionLink: "Usar outro método",
    },
    emailCode: {
      title: "Verifique seu e-mail",
      subtitle: "Enviamos um código de 6 dígitos para {{identifier}}.",
      formTitle: "Código de verificação",
      resendButton: "Reenviar código",
    },
    forgotPasswordAlternativeMethods: {
      title: "Recuperar acesso",
      label__alternativeMethods: "Ou entre de outra forma",
      blockButton__resetPassword: "Redefinir minha senha",
    },
    forgotPassword: {
      title: "Redefinir senha",
      subtitle_email: "Primeiro, confirme o código enviado para seu e-mail.",
      formTitle: "Código de recuperação",
      resendButton: "Reenviar código",
    },
    resetPassword: {
      title: "Criar nova senha",
      formButtonPrimary: "Salvar nova senha",
      successMessage: "Senha atualizada com sucesso.",
    },
  },
  signUp: {
    start: {
      title: "Crie sua conta",
      subtitle: "Comece a organizar e acompanhar sua evolução física.",
      actionText: "Já possui uma conta?",
      actionLink: "Entrar",
    },
    emailCode: {
      title: "Confirme seu e-mail",
      subtitle: "Enviamos um código de 6 dígitos para {{identifier}}.",
      formTitle: "Código de verificação",
      resendButton: "Reenviar código",
    },
    continue: {
      title: "Complete seu cadastro",
      subtitle: "Preencha os dados restantes para continuar.",
    },
  },
  unstable__errors: {
    form_identifier_not_found: "Nenhuma conta encontrada com este identificador.",
    form_password_incorrect: "Senha incorreta. Tente novamente ou recupere o acesso.",
    form_code_incorrect: "Código inválido. Verifique os dígitos e tente novamente.",
    form_identifier_exists: "Este endereço de e-mail já está em uso.",
    form_param_format_invalid: "Formato inválido. Verifique o dado informado.",
    form_password_pwned:
      "Esta senha apareceu em vazamentos públicos. Escolha uma senha mais segura.",
    form_password_length_too_short:
      "A senha deve conter pelo menos 8 caracteres.",
  },
};
