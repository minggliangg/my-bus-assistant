import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export function About() {
  const currentYear = new Date().getFullYear();
  const accessDate = new Date().toLocaleDateString("en-SG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <Link to="/">
          <Button variant="ghost" size="icon" title="Back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">About</h1>
      </header>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>My Bus Assistant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>
              My Bus Assistant is a simple, real-time bus arrival information
              application for commuters in Singapore. It allows you to search
              for bus stops, mark them as favorites, and find nearby stops using
              your current location.
            </p>

            <p>
              Created by{" "}
              <a
                href="https://minggliangg.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                minggliangg
              </a>
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Attribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed">
            <p>
              Contains information from <strong>LTA DataMall</strong> accessed
              on <strong>{accessDate}</strong> from{" "}
              <strong>LTA DataMall</strong> which is made available under the
              terms of the
              <a
                href="https://datamall.lta.gov.sg/content/datamall/en/SingaporeOpenDataLicence.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1"
              >
                Singapore Open Data Licence version 1.0
              </a>
              .
            </p>

            <p>&copy; {currentYear} minggliangg. All rights reserved.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
