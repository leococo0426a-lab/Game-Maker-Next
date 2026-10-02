import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { GameHistoryProvider } from "@/context/GameHistoryContext";
import { FriendProvider } from "@/context/FriendContext";
import Launcher from "@/pages/Launcher";
import GamePage from "@/pages/GamePage";
import Library from "@/pages/Library";
import Auth from "@/pages/Auth";
import Messages from "@/pages/Messages";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Launcher} />
      <Route path="/game/:id" component={GamePage} />
      <Route path="/library" component={Library} />
      <Route path="/auth" component={Auth} />
      <Route path="/messages" component={Messages} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <FriendProvider>
            <GameHistoryProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </GameHistoryProvider>
          </FriendProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
