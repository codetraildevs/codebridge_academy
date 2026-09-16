import { LocationMap } from "@/components/ui/expanded-map";

export default function ExpandedMapDemo() {
  return (
    <div className="flex items-center justify-center p-12">
      <LocationMap location="Kigali, Rwanda" latitude={-1.9770} longitude={30.0794} zoom={15} />
    </div>
  );
}
