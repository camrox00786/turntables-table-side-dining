import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, CloudRain, Dices, Laptop, QrCode, Stamp, Users } from "lucide-react";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Turntables — QR table ordering for Bangalore venues" },
      { name: "description", content: "Customers scan a table QR, browse your branded menu and order from their phone. Built for cafes, restaurants and breweries." },
      { property: "og:title", content: "Turntables — Scan, order, sip" },
      { property: "og:description", content: "No-app QR ordering with SquadTab bill splits, Mystery Tap, weather offers and loyalty stamps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Laptop, t: "WFH / Client Call Mode", d: "One toggle filters to low-mess, quick-prep picks." },
  { icon: Users, t: "SquadTab", d: "Everyone orders on one table tab, then splits fairly." },
  { icon: CloudRain, t: "Monsoon Mode", d: "Weather-triggered offers with timers and limits." },
  { icon: Dices, t: "Mystery Tap", d: "Spin the wheel, discover a dish, unlock a freebie." },
  { icon: Stamp, t: "Frequent Sipper", d: "Digital stamp cards — no app, no paper." },
  { icon: QrCode, t: "Per-table QR", d: "Every table gets its own link and printable code." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="font-display text-2xl font-black">turn<span className="text-primary">tables</span></span>
        <Link to="/dashboard" className="rounded-full border border-input px-4 py-2 text-sm font-semibold hover:bg-secondary">Owner dashboard</Link>
      </nav>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-10 md:grid-cols-2 md:py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.25em] text-accent">Made for Bengaluru's tables</p>
          <h1 className="text-5xl font-black leading-[0.95] md:text-7xl">
            Scan. Order. <span className="text-primary">Sip.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-muted-foreground">
            Guests scan the QR on their table and order from your branded menu in seconds. No app download, no waiting for a waiter.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/v/$venue/t/$table" params={{ venue: "neon-taproom", table: "12" }} search={{ squad: undefined }} className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground glow-lime">
              Try Table 12 at Neon Taproom <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/v/$venue/t/$table" params={{ venue: "brew-and-bloom", table: "3" }} search={{ squad: undefined }} className="inline-flex h-12 items-center rounded-full border border-input px-6 font-semibold hover:bg-secondary">
              Brew &amp; Bloom cafe
            </Link>
          </div>
        </motion.div>
        <motion.img initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} src={hero} alt="Craft beer, loaded fries and a burger at a neon-lit taproom" width={1280} height={832} className="rounded-3xl border border-border object-cover" />
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div key={f.t} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-border bg-card p-6">
              <f.icon className="h-7 w-7 text-primary" />
              <p className="mt-4 font-display text-xl font-bold">{f.t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-muted-foreground">Demo mode: payments, WhatsApp messages, weather and kitchen notifications are simulated and clearly labelled.</p>
      </section>
    </div>
  );
}
