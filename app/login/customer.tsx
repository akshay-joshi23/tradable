import { LoginForm } from "../../components/LoginForm";

export default function CustomerLoginScreen() {
  return (
    <LoginForm
      role="customer"
      title="Customer sign in"
      subtitle="Sign in to request a repair."
    />
  );
}
