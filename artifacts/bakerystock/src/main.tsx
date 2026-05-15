import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

async function bootstrap() {
  const container = document.getElementById("root")!;
  const root = createRoot(container);

  if (CLERK_PUBLISHABLE_KEY) {
    // Production path: use real Clerk authentication
    const { ClerkProvider } = await import("@clerk/react");
    const { shadesOfPurple } = await import("@clerk/themes");

    // Warm earthy amber theme for Clerk modals
    const clerkAppearance = {
      baseTheme: shadesOfPurple,
      variables: {
        colorPrimary: "#D97706",
        colorBackground: "#FFFBEB",
        colorInputBackground: "#FEF3C7",
        colorText: "#78350F",
        borderRadius: "0.75rem",
      },
    };

    root.render(
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        appearance={clerkAppearance}
      >
        <App />
      </ClerkProvider>,
    );
  } else {
    // Dev path: Clerk key absent — use X-Dev-User-Id bypass (non-production only)
    root.render(<App />);
  }
}

bootstrap();
