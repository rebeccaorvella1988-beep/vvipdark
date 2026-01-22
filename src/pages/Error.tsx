import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCw, Home, ArrowLeft } from "lucide-react";
import { Link, useNavigate, useRouteError } from "react-router-dom";

interface RouteError {
  status?: number;
  statusText?: string;
  message?: string;
}

const Error = () => {
  const navigate = useNavigate();
  const error = useRouteError() as RouteError | undefined;
  
  const getErrorDetails = () => {
    if (error?.status === 404) {
      return {
        title: "Page Not Found",
        description: "The page you're looking for doesn't exist or has been moved.",
        icon: "🔍"
      };
    }
    if (error?.status === 403) {
      return {
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        icon: "🔒"
      };
    }
    if (error?.status === 500) {
      return {
        title: "Server Error",
        description: "Something went wrong on our end. Please try again later.",
        icon: "⚠️"
      };
    }
    return {
      title: "Something went wrong",
      description: error?.message || "An unexpected error occurred. Please try again.",
      icon: "💔"
    };
  };

  const errorDetails = getErrorDetails();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center border-primary/20">
        <div className="mb-6">
          <div className="text-6xl mb-4">{errorDetails.icon}</div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            {errorDetails.title}
          </h1>
          <p className="text-muted-foreground">
            {errorDetails.description}
          </p>
          {error?.status && (
            <p className="mt-2 text-sm text-muted-foreground">
              Error code: {error.status}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate(-1)}
            className="flex-1"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          <Link to="/" className="flex-1">
            <Button className="w-full bg-gradient-to-r from-primary to-primary-glow">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <Button
            onClick={() => window.location.reload()}
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Page
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Error;
