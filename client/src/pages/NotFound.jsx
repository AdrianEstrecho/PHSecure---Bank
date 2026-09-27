import Logo from "../components/Logo.jsx";
import { ButtonLink } from "../components/ui.jsx";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col px-4 py-6 sm:px-8">
      <Logo />
      <div className="mx-auto flex max-w-md flex-1 flex-col items-start justify-center">
        <p className="caps text-[11px] text-forest">Page not found</p>
        <h1 className="mt-3 text-[32px] leading-tight font-semibold">This page doesn't exist.</h1>
        <p className="mt-3 text-[15px] text-muted">The link may be old or mistyped.</p>
        <ButtonLink to="/" className="mt-8">
          Go to the home page
        </ButtonLink>
      </div>
    </div>
  );
}
