import { useState } from "react";
import { useAppContext } from "@/contexts/AppContext";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  HelpCircle,
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  ClipboardList,
  GitBranch,
  Users,
  FileBarChart,
  BookOpen,
  Info,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Search,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface GuideItem {
  id: string;
  icon: React.ComponentType<any>;
  titleEn: string;
  titleFr: string;
  role: "everyone" | "owner";
  descEn: string;
  descFr: string;
  stepsEn: string[];
  stepsFr: string[];
  tipsEn: string;
  tipsFr: string;
}

const GUIDE_ITEMS: GuideItem[] = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    titleEn: "Dashboard Overview",
    titleFr: "Vue d'ensemble du tableau de bord",
    role: "everyone",
    descEn: "Your central hub to check stock levels, low inventory alerts, active movements, and branch health instantly.",
    descFr: "Votre hub central pour vérifier instantanément les niveaux de stock, les alertes de stock faible, les mouvements et la santé des succursales.",
    stepsEn: [
      "View quick metric cards (Total Items, Low Stock, Damaged, and Missing Today).",
      "Monitor real-time Low Stock alerts highlighted in orange.",
      "Check recent stock movements at a glance in the dynamic side panel."
    ],
    stepsFr: [
      "Visualisez les indicateurs clés (Total articles, Stock faible, Endommagés et Manquants).",
      "Surveillez les alertes de stock faible mises en évidence en orange.",
      "Consultez les mouvements de stock récents d'un coup d'œil dans le panneau dynamique."
    ],
    tipsEn: "Click on any low stock item in the alert widget to jump straight to its detail page to record a reorder!",
    tipsFr: "Cliquez sur n'importe quel article en rupture de stock pour accéder directement à sa page de détails !"
  },
  {
    id: "inventory",
    icon: Package,
    titleEn: "Inventory Management",
    titleFr: "Gestion de l'inventaire",
    role: "everyone",
    descEn: "Add, search, and update bakery products, stock categories, measurement units, and safety thresholds.",
    descFr: "Ajoutez, recherchez et mettez à jour les produits de boulangerie, les catégories de stock, les unités de mesure et les seuils de sécurité.",
    stepsEn: [
      "Use 'Add Item' to insert new ingredients, bread, or packaging materials.",
      "Assign minimum safety thresholds to get notified automatically before you run out.",
      "Print QR codes and scan barcodes using your built-in scanner to find items instantly."
    ],
    stepsFr: [
      "Utilisez 'Ajouter un article' pour insérer des ingrédients, du pain ou des emballages.",
      "Définissez un seuil minimum pour recevoir une alerte automatique avant la rupture.",
      "Imprimez des codes QR et scannez les codes-barres avec votre lecteur intégré pour trouver vos produits."
    ],
    tipsEn: "Upload a CSV file in the 'Import Barcodes' tool to assign hundreds of product barcodes in a single click!",
    tipsFr: "Importez un fichier CSV avec l'outil 'Importer des codes-barres' pour associer des centaines de codes en un clic !"
  },
  {
    id: "movements",
    icon: ArrowLeftRight,
    titleEn: "Recording Stock Movements",
    titleFr: "Mouvements de stock",
    role: "everyone",
    descEn: "Log transactions when goods arrive, get sold, used in production, lost, or damaged.",
    descFr: "Enregistrez des transactions lorsque des marchandises arrivent, sont vendues, utilisées, perdues ou endommagées.",
    stepsEn: [
      "Click 'Record Movement' or tap the action button next to any item.",
      "Select the movement type: Stock In, Used in Production, Sold, Damaged, Missing/Lost, or Returned.",
      "Provide a clean number change and type an optional explanatory note."
    ],
    stepsFr: [
      "Cliquez sur 'Enregistrer un mouvement' ou sur le bouton d'action à côté de l'article.",
      "Sélectionnez le type : Entrée, Utilisé en production, Vendu, Endommagé, Perdu ou Retourné.",
      "Saisissez la quantité modifiée et ajoutez une note explicative optionnelle."
    ],
    tipsEn: "Recording precise movements helps the reporting module calculate ingredient waste and daily production costs exactly.",
    tipsFr: "L'enregistrement précis des mouvements permet de calculer exactement le gaspillage et les coûts de production."
  },
  {
    id: "audit",
    icon: ClipboardList,
    titleEn: "Audit Trail",
    titleFr: "Journal d'audit",
    role: "owner",
    descEn: "A secure, read-only historic ledger documenting every action, user change, and database update.",
    descFr: "Un registre historique sécurisé documentant chaque action, modification d'utilisateur et mise à jour de la base.",
    stepsEn: [
      "Review the time, date, user, and precise branch of every action.",
      "Filter logs by branch or user to audit suspicious stock adjustments.",
      "View automated logs for security invitations and branch creations."
    ],
    stepsFr: [
      "Consultez l'heure, la date, l'utilisateur et la succursale de chaque action.",
      "Filtrez les journaux par succursale ou utilisateur pour auditer les ajustements suspects.",
      "Visualisez les journaux automatiques des invitations et des créations de succursales."
    ],
    tipsEn: "The Audit Trail cannot be edited or deleted by anyone, including staff members, guaranteeing absolute security.",
    tipsFr: "Le journal d'audit ne peut être ni modifié ni supprimé, garantissant une sécurité et une transparence absolues."
  },
  {
    id: "branches",
    icon: GitBranch,
    titleEn: "Branch Configurations",
    titleFr: "Gestion des succursales",
    role: "owner",
    descEn: "Create, view, and assign physical bakery locations to localize staff and isolate inventory balances.",
    descFr: "Créez, affichez et attribuez des points de vente physiques pour localiser le personnel et isoler les stocks.",
    stepsEn: [
      "Click 'Add Branch' to define a new location with its address, manager, and telephone.",
      "Filter the entire web dashboard to view an individual branch or evaluate aggregate global stock.",
      "Move items seamlessly knowing each item is tracked separately per branch location."
    ],
    stepsFr: [
      "Cliquez sur 'Ajouter une succursale' pour définir un nouveau point de vente avec son adresse.",
      "Filtrez tout le tableau de bord pour afficher une succursale spécifique ou le stock global.",
      "Déplacez vos marchandises sereinement en sachant que le suivi est distinct par succursale."
    ],
    tipsEn: "Always assign a dedicated branch manager during setup to maintain clear internal communication.",
    tipsFr: "Attribuez toujours un responsable de succursale dédié pour maintenir une communication claire."
  },
  {
    id: "staff",
    icon: Users,
    titleEn: "Staff Management & Security",
    titleFr: "Gestion du personnel",
    role: "owner",
    descEn: "Invite employees via secure email signup links and assign them to specific bakery branch locations.",
    descFr: "Invitez vos employés par e-mail avec un lien d'inscription sécurisé et affectez-les à des succursales.",
    stepsEn: [
      "Click 'Invite Staff' and type the employee's email address.",
      "The system generates a Clerk signup invitation automatically.",
      "Assign staff to a physical branch to limit their stock modification capability strictly to their workplace."
    ],
    stepsFr: [
      "Cliquez sur 'Inviter du personnel' et saisissez l'adresse e-mail de l'employé.",
      "Le système génère et envoie automatiquement une invitation sécurisée.",
      "Associez l'employé à sa succursale pour limiter ses droits de saisie à son lieu de travail."
    ],
    tipsEn: "Staff members can record daily stock movements but cannot delete items or view reports, keeping your high-level business data safe.",
    tipsFr: "Le personnel peut enregistrer des mouvements, mais ne peut pas supprimer d'articles ni consulter les rapports."
  },
  {
    id: "reports",
    icon: FileBarChart,
    titleEn: "Advanced Analytics Reports",
    titleFr: "Rapports analytiques",
    role: "owner",
    descEn: "Generate PDF and CSV reports on waste, sales volume, branch activity, and audit summaries.",
    descFr: "Générez des rapports PDF et CSV sur les pertes, les volumes de ventes, l'activité et l'audit.",
    stepsEn: [
      "Choose a report template (Daily, Weekly, Missing, Damaged, or Branch Activity).",
      "Select target date range and filter by branch to analyze performance.",
      "Download or export high-fidelity CSV files to plug directly into Excel or accounting software."
    ],
    stepsFr: [
      "Sélectionnez un modèle de rapport (Journalier, Hebdomadaire, Manquants, Endommagés).",
      "Définissez la plage de dates et filtrez par succursale.",
      "Téléchargez ou exportez des fichiers CSV pour Excel ou vos outils comptables."
    ],
    tipsEn: "Regularly generating the 'Damaged Items Report' helps discover product handling patterns and saves ingredient costs.",
    tipsFr: "Générer régulièrement le rapport des articles endommagés aide à identifier les pertes évitables."
  }
];

export default function GuidePage() {
  const { lang } = useAppContext();
  const { data: user } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [seedingSuccess, setSeedingSuccess] = useState(false);
  const isEn = lang === "en";
  const isOwner = user?.role === "owner";

  const handleSeed = async () => {
    if (!user?.clerkId) {
      toast.error(isEn ? "User context not found. Try logging in again." : "Contexte utilisateur introuvable.");
      return;
    }
    setSeeding(true);
    try {
      await api.post("/seed", {}, {
        headers: { "x-dev-user-id": user.clerkId }
      });
      setSeedingSuccess(true);
      toast.success(isEn ? "Demo stock data seeded successfully!" : "Données de démo importées avec succès !");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "Failed to seed demo data");
    } finally {
      setSeeding(false);
    }
  };

  const filteredGuides = GUIDE_ITEMS.filter((item) => {
    const title = isEn ? item.titleEn : item.titleFr;
    const desc = isEn ? item.descEn : item.descFr;
    return (
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary to-primary/80 p-6 sm:p-8 text-primary-foreground shadow-lg">
        <div className="absolute right-4 bottom-0 opacity-10 pointer-events-none">
          <BookOpen className="w-64 h-64" />
        </div>
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5" />
            {isEn ? "Interactive Onboarding Center" : "Centre d'intégration interactif"}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {isEn ? "How to Use BakeryStock" : "Comment utiliser BakeryStock"}
          </h1>
          <p className="text-primary-foreground/90 text-sm leading-relaxed sm:text-base">
            {isEn
              ? "Welcome to your digital assistant! Whether you are a new baker recording a shift or a business owner managing multiple branches, this guide will walk you through utilizing every tool successfully."
              : "Bienvenue sur votre assistant numérique ! Que vous soyez un boulanger enregistrant une équipe ou un propriétaire gérant plusieurs succursales, ce guide vous accompagnera pas à pas."}
          </p>
        </div>
      </div>

      {/* Demo Seeding Alert (Owner Only) */}
      {isOwner && (
        <Card className="rounded-2xl border border-amber-200 bg-amber-50/50 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
                {isEn ? "Want to test BakeryStock with realistic data?" : "Voulez-vous tester BakeryStock avec des données réelles ?"}
              </div>
              <p className="text-xs text-amber-700 max-w-2xl leading-relaxed">
                {isEn
                  ? "Clicking this will instantly populate your Neon Database with two Cameroon bakery locations (Douala & Yaounde), 12 ingredients and products (Flour, Yeast, Milk, Bags), active stock limits, 20 past stock movements, and a complete audit trail."
                  : "En un clic, importez deux succursales (Douala et Yaoundé), 12 produits (Farine, Beurre, Sel, Levure), 20 mouvements récents et un journal d'audit complet."}
              </p>
            </div>
            <Button
              onClick={handleSeed}
              disabled={seeding || seedingSuccess}
              className="w-full sm:w-auto shrink-0 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md border-0 h-10 px-5 gap-2 transition-all"
            >
              {seeding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEn ? "Seeding..." : "Importation..."}
                </>
              ) : seedingSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  {isEn ? "Reloading..." : "Rechargement..."}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  {isEn ? "Load Demo Data ⚡" : "Charger les démos ⚡"}
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Control Actions / Search bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-2xl shadow-sm border">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={isEn ? "Search features, tools, or tips..." : "Rechercher une fonctionnalité, un outil..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="px-3 py-1 rounded-full text-xs font-medium">
            {isEn ? `${filteredGuides.length} Guides Found` : `${filteredGuides.length} Guides trouvés`}
          </Badge>
        </div>
      </div>

      {/* Main Tabs Layout */}
      <Tabs defaultValue="all" className="w-full space-y-6">
        <TabsList className="bg-card border p-1 rounded-xl h-11">
          <TabsTrigger value="all" className="rounded-lg px-4 text-xs sm:text-sm font-medium">
            {isEn ? "All Features" : "Toutes les fonctions"}
          </TabsTrigger>
          <TabsTrigger value="staff" className="rounded-lg px-4 text-xs sm:text-sm font-medium">
            {isEn ? "Staff Tools" : "Outils du personnel"}
          </TabsTrigger>
          <TabsTrigger value="owner" className="rounded-lg px-4 text-xs sm:text-sm font-medium">
            {isEn ? "Owner Controls" : "Contrôles du propriétaire"}
          </TabsTrigger>
          <TabsTrigger value="faq" className="rounded-lg px-4 text-xs sm:text-sm font-medium">
            {isEn ? "FAQs" : "FAQ"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredGuides.map((item) => (
              <GuideCard key={item.id} item={item} isEn={isEn} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredGuides
              .filter((item) => item.role === "everyone")
              .map((item) => (
                <GuideCard key={item.id} item={item} isEn={isEn} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="owner" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredGuides
              .filter((item) => item.role === "owner")
              .map((item) => (
                <GuideCard key={item.id} item={item} isEn={isEn} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="faq" className="space-y-6 mt-0">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="border-b bg-muted/30 p-6">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Info className="w-5 h-5 text-primary" />
                {isEn ? "Frequently Asked Questions" : "Questions Fréquemment Posées"}
              </CardTitle>
              <CardDescription>
                {isEn
                  ? "Answers to the most common questions regarding local configuration, user access, and stock reconciliation."
                  : "Réponses aux questions les plus fréquentes sur l'accès, le stock et la configuration locale."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="faq-1" className="border-b py-1">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    {isEn ? "How do I print QR codes for items?" : "Comment imprimer des codes QR pour mes produits ?"}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed pt-2">
                    {isEn
                      ? "Go to the 'Inventory' tab, click on any existing product to open its card, and select 'Print QR'. You can download or print these codes and tape them directly onto bakery trays or flour bins for fast scanner access."
                      : "Allez dans l'onglet 'Inventaire', cliquez sur un produit et sélectionnez 'Imprimer QR'. Vous pouvez imprimer ces codes et les coller sur vos bacs ou plateaux de cuisson pour un scan rapide."}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-2" className="border-b py-1">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    {isEn ? "What happens when an item reaches its Minimum Threshold?" : "Que se passe-t-il si un produit descend sous le seuil minimum ?"}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed pt-2">
                    {isEn
                      ? "The dashboard will immediately display a bright orange alert badge, and the item will be listed inside 'Low Stock Alerts'. This lets bakers and shop owners order replenishment before any baking schedule is interrupted."
                      : "Le tableau de bord affichera immédiatement une alerte orange vif sous 'Alertes de stock faible'. Cela vous permet de commander des ingrédients avant de perturber la production."}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-3" className="border-b py-1">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    {isEn ? "Can employees view my business reports or analytics?" : "Les employés peuvent-ils voir mes rapports financiers ou analytiques ?"}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed pt-2">
                    {isEn
                      ? "No. The system uses strict Role-Based Access Control (RBAC). Employees registered with the 'Staff' role cannot access Audit Logs, Branches, Staff Management, or Analytics Reports. Those links are completely hidden from their dashboard view."
                      : "Non. Le système utilise un contrôle d'accès strict (RBAC). Les membres du personnel ne peuvent pas accéder aux journaux d'audit, aux succursales, à la gestion du personnel ni aux rapports d'analyse."}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="faq-4" className="py-1">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                    {isEn ? "How are stock calculations isolated across branches?" : "Comment le stock est-il réparti entre les succursales ?"}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed pt-2">
                    {isEn
                      ? "Each item quantity is calculated separate for each branch. When you record a movement, it modifies only the quantity scoped to your currently active branch location, allowing safe multi-branch management in real-time."
                      : "Chaque quantité est gérée de manière isolée pour chaque succursale. Enregistrer un mouvement modifie uniquement le stock de la succursale active, permettant une gestion multi-sites sans mélange."}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GuideCard({ item, isEn }: { item: GuideItem; isEn: boolean }) {
  const Icon = item.icon;
  const title = isEn ? item.titleEn : item.titleFr;
  const desc = isEn ? item.descEn : item.descFr;
  const steps = isEn ? item.stepsEn : item.stepsFr;
  const tips = isEn ? item.tipsEn : item.tipsFr;

  return (
    <Card className="rounded-2xl border shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <Badge
            variant={item.role === "owner" ? "destructive" : "secondary"}
            className="rounded-full text-xs font-semibold px-2 py-0.5"
          >
            {item.role === "owner" ? (
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                {isEn ? "Owner Only" : "Propriétaire"}
              </span>
            ) : (
              <span>{isEn ? "All Roles" : "Tous Rôles"}</span>
            )}
          </Badge>
        </div>
        <div className="space-y-1.5 mt-3">
          <CardTitle className="text-base font-bold tracking-tight">{title}</CardTitle>
          <CardDescription className="text-sm leading-normal text-muted-foreground">
            {desc}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {isEn ? "How it works" : "Comment ça marche"}
          </span>
          <ul className="space-y-2">
            {steps.map((step, idx) => (
              <li key={idx} className="flex gap-2.5 items-start text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-foreground/90">{step}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 flex gap-2.5 items-start">
          <Info className="w-4.5 h-4.5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-primary-foreground/90 leading-normal">
            <strong className="text-primary mr-1">{isEn ? "Pro-Tip:" : "Astuce :"}</strong>
            {tips}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
