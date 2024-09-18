"use client";

import { Alert, AlertDescription, AlertTitle } from "@rallly/ui/alert";
import { Button } from "@rallly/ui/button";
import { InfoIcon } from "lucide-react";
import { useState } from "react";

export function TermiteAlert() {
  const [showTermiteAlert, setShowTermiteAlert] = useState(true);

  if (!showTermiteAlert) {
    return null;
  }

  return (
    <Alert className="termite-alert my-4" icon={InfoIcon}>
      <AlertTitle>Herzlich Willkommen bei der neuen Termite! 🎉</AlertTitle>
      <AlertDescription>
        <p className="mt-4">
          Zum 02.09.2024 wurde die Termite aktualisiert. Eine Anleitung zur
          Nutzung der Termite 2.0 findet ihr{" "}
          <a
            className="text-link"
            href="https://netz.gruene.de/de/wissenswerk/2024-08/die-neue-termite"
            target="_blank"
          >
            hier
          </a>
          .
        </p>
        <p className="mt-2">
          Bei Fragen oder Feedback wendet euch gerne an <strong>beteiligung@gruene.de</strong>.
        </p>
        <div>
          <Button
            className="mt-4"
            variant="primary"
            onClick={() => setShowTermiteAlert(false)}
          >
            Ausblenden
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
