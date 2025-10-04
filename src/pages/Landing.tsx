import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, Zap, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Landing = () => {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: packages } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*, categories(*)")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            TradePro
          </h1>
          <div className="flex gap-3">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="bg-gradient-to-r from-primary to-primary-glow">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full border border-primary/30 bg-primary/10">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary">Premium Trading Signals</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-primary-glow bg-clip-text text-transparent">
            Trade Smarter,
            <br />
            Win Bigger
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Access premium trading signals, expert betting tips, and exclusive digital products.
            Join thousands of profitable traders worldwide.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/auth?mode=signup">
              <Button size="lg" className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-opacity">
                Start Trading
              </Button>
            </Link>
            <Link to="#packages">
              <Button size="lg" variant="outline">
                View Packages
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 border-primary/20 hover:border-primary/40 transition-all">
              <TrendingUp className="h-12 w-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-2">95% Win Rate</h3>
              <p className="text-muted-foreground">
                Proven track record with consistently profitable signals across all markets.
              </p>
            </Card>
            <Card className="p-6 border-primary/20 hover:border-primary/40 transition-all">
              <Shield className="h-12 w-12 text-accent mb-4" />
              <h3 className="text-xl font-bold mb-2">Secure Payments</h3>
              <p className="text-muted-foreground">
                Safe crypto transactions with instant access after confirmation.
              </p>
            </Card>
            <Card className="p-6 border-primary/20 hover:border-primary/40 transition-all">
              <Users className="h-12 w-12 text-warning mb-4" />
              <h3 className="text-xl font-bold mb-2">Expert Community</h3>
              <p className="text-muted-foreground">
                Join exclusive Telegram groups with professional traders and analysts.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12">
              Our <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Categories</span>
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <Card
                  key={category.id}
                  className="p-8 text-center border-primary/20 hover:border-primary/40 hover:shadow-glow transition-all cursor-pointer group"
                >
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">
                    {category.icon || "📊"}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{category.name}</h3>
                  <p className="text-muted-foreground">{category.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Packages */}
      <section id="packages" className="py-20 px-4 bg-card/50">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">
            Choose Your <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Plan</span>
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages?.map((pkg) => (
              <Card
                key={pkg.id}
                className="p-6 border-primary/20 hover:border-primary/40 hover:shadow-glow transition-all flex flex-col"
              >
                <div className="mb-4">
                  <span className="text-sm text-primary px-3 py-1 rounded-full border border-primary/30 bg-primary/10">
                    {pkg.categories?.name}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
                <p className="text-muted-foreground mb-4">{pkg.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-primary">${pkg.price}</span>
                  <span className="text-muted-foreground">/{pkg.duration_days} days</span>
                </div>
                {pkg.features && Array.isArray(pkg.features) && pkg.features.length > 0 && (
                  <ul className="space-y-2 mb-6 flex-grow">
                    {pkg.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
                <Link to="/auth?mode=signup">
                  <Button className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90">
                    Get Started
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <Card className="p-12 text-center bg-gradient-to-r from-primary/10 to-primary-glow/10 border-primary/20">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Start <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">Winning?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join our community of successful traders and start receiving premium signals today.
            </p>
            <Link to="/auth?mode=signup">
              <Button size="lg" className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90">
                Create Account Now
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; 2025 TradePro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
