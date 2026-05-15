import { useRef } from "react";
import QRCode from "react-qr-code";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface QRCodePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  barcode: string;
  lang: "en" | "fr";
}

export default function QRCodePrintDialog({ open, onOpenChange, itemName, barcode, lang }: QRCodePrintDialogProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=400,height=520");
    if (!win) return;

    const doc = win.document;

    const style = doc.createElement("style");
    style.textContent = [
      "body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;box-sizing:border-box;}",
      ".card{border:2px solid #000;border-radius:8px;padding:24px;text-align:center;}",
      "h2{margin:0 0 16px;font-size:18px;}",
      "p{margin:12px 0 0;font-size:12px;color:#555;word-break:break-all;}",
    ].join("");
    doc.head.appendChild(style);

    doc.title = itemName + " - QR Code";

    const card = doc.createElement("div");
    card.className = "card";

    const heading = doc.createElement("h2");
    heading.textContent = itemName;
    card.appendChild(heading);

    const svgEl = wrapperRef.current?.querySelector("svg");
    if (svgEl) {
      card.appendChild(svgEl.cloneNode(true));
    }

    const codeText = doc.createElement("p");
    codeText.textContent = barcode;
    card.appendChild(codeText);

    doc.body.appendChild(card);
    doc.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>{lang === "fr" ? "Code QR — " : "QR Code — "}{itemName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 py-2">
          <div
            ref={wrapperRef}
            style={{ border: "2px solid #000", borderRadius: "8px", padding: "24px", textAlign: "center" }}
          >
            <p style={{ margin: "0 0 12px", fontWeight: 600 }}>{itemName}</p>
            <QRCode value={barcode} size={180} />
            <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#555", wordBreak: "break-all" }}>{barcode}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {lang === "fr" ? "Fermer" : "Close"}
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            {lang === "fr" ? "Imprimer" : "Print"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
