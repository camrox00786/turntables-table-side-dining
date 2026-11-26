import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, QrCode } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Turntables — Scan your table QR" },
      {
        name: "description",
        content: "Scan the QR code on your restaurant table to open its menu. No app download needed.",
      },
      { property: "og:title", content: "Turntables — Scan your table QR" },
      {
        property: "og:description",
        content: "Open your restaurant's menu directly from the QR code on your table.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QrFirstHome,
});

function QrFirstHome() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <section
        aria-labelledby="qr-first-heading"
        className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-8 text-center shadow-2xl shadow-black/20 backdrop-blur"
      >
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-primary/50 bg-primary/10 text-primary">
          <QrCode aria-hidden="true" className="h-9 w-9" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-primary">
          QR-first dining
        </p>
        <h1 id="qr-first-heading" className="mt-3 font-display text-4xl font-black tracking-tight">
          Scan. Order. <span className="text-primary">Sip.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-base leading-7 text-muted-foreground">
          Scan the Turntables QR code on your table to open that restaurant&apos;s branded menu.
          No app download or restaurant search needed.
        </p>
        <div className="mt-8 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-5 py-4 text-sm">
          <p className="font-semibold">Your menu opens from the table QR code.</p>
          <p className="mt-1 text-muted-foreground">
            If the code is missing or does not work, ask a member of the restaurant team for help.
          </p>
        </div>
        <Link
          to="/dashboard"
          search={{ tab: "overview" }}
          className="mt-8 inline-flex h-11 items-center gap-2 rounded-full border border-input px-5 text-sm font-semibold transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Owner sign in <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </section>
    </main>
  );
}
