import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PackageCardProps {
  pkg: {
    id: string;
    name: string;
    description: string;
    price: number;
    duration_days: number;
    features?: string[];
    categories?: { name: string };
  };
}

const PackageCard = ({ pkg }: PackageCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="p-6 border-primary/20 hover:border-primary/40 hover:shadow-glow transition-all flex flex-col">
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
      <Button
        className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
        onClick={() => navigate(`/checkout?package=${pkg.id}`)}
      >
        Purchase Now
      </Button>
    </Card>
  );
};

export default PackageCard;
