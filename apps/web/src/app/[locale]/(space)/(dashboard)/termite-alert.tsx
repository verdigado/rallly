"use client";

import { Alert, AlertDescription, AlertTitle } from "@rallly/ui/alert";
import { Button } from "@rallly/ui/button";
import { InfoIcon } from "lucide-react";
import { useState } from "react";

export function TermiteAlert() {
  const [showAlert, setShowAlert] = useState(true);

  if (!showAlert) {
    return null;
  }

  return (
    <Alert className="my-4">
      {/* The base Alert component forces a 16px (size-4) icon width.
          overwriting by more specific styles
          see [&>svg]:size-4 https://github.com/lukevella/rallly/blob/a08e0c0bf61f2fd4acde60c056b0f226dff8ebb4/packages/ui/src/alert.tsx#L8 */}
      <InfoIcon color="#005437" style={{ width: "20px", height: "20px" }} />
      <AlertTitle>Herzlich Willkommen bei der neuen Termite! 🎉</AlertTitle>
      <AlertDescription>
        <p className="mt-4">
          Zum 02.09.2024 wurde die Termite aktualisiert. Eine Anleitung zur
          Nutzung der Termite 2.0 findet ihr{" "}
          <a
            className="text-link"
            href="https://netz.gruene.de/de/wissenswerk/2024-08/die-neue-termite"
            target="_blank"
            rel="noopener"
          >
            hier
          </a>
          .
        </p>
        <p className="mt-2">
          Bei Fragen oder Feedback wendet euch gerne an{" "}
          <strong>beteiligung@gruene.de</strong>.
        </p>
        <div>
          <Button
            className="mt-4"
            variant="primary"
            onClick={() => setShowAlert(false)}
          >
            Ausblenden
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
