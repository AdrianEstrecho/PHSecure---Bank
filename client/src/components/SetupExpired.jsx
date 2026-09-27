import { Alert, Button } from "./ui.jsx";

/** Shown when the 5-minute setup session runs out mid-flow. */
export default function SetupExpired({ message, onRestart }) {
  return (
    <div className="space-y-5">
      <Alert>{message}</Alert>
      <Button className="w-full" onClick={onRestart}>
        Start again
      </Button>
    </div>
  );
}

export const isSetupExpired = (code) => code === "SETUP_EXPIRED" || code === "SETUP_MISMATCH";
