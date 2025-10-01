import { Card, CardContent } from "@/components/ui/card";
import { Home } from "lucide-react";

export default function RecentActivity() {
  return (
    <section className="w-full bg-white py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Pick up where you left off
        </h2>
        
        <Card className="border border-gray-200 rounded-lg shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                <Home className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  House Cleaning
                </h3>
                <p className="text-gray-600">
                  Napa, CA
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
