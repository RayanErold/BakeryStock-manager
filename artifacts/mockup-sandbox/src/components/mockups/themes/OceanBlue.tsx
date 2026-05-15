export function OceanBlue() {
  return (
    <div style={{ fontFamily: "Inter, sans-serif", display: "flex", height: "100vh", background: "hsl(210,30%,97%)", color: "hsl(215,40%,18%)" }}>
      <aside style={{ width: 200, background: "hsl(214,55%,22%)", display: "flex", flexDirection: "column", padding: "20px 0" }}>
        <div style={{ padding: "0 16px 24px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "hsl(196,80%,50%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>BS</div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>BakeryStock</span>
        </div>
        {["Tableau de bord","Inventaire","Mouvements","Rapports","Audit"].map((item, i) => (
          <div key={i} style={{ padding: "10px 16px", fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? "#fff" : "hsl(210,30%,72%)", background: i === 0 ? "hsl(214,55%,30%)" : "transparent", borderRadius: i === 0 ? "0 6px 6px 0" : 0, marginRight: i === 0 ? 8 : 0, cursor: "pointer" }}>{item}</div>
        ))}
      </aside>
      <main style={{ flex: 1, padding: 28, overflowY: "auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Tableau de bord</h1>
          <p style={{ fontSize: 13, color: "hsl(215,25%,50%)", margin: "4px 0 0" }}>Boulangerie Moderne · Yaoundé</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Articles en stock", value: "148", sub: "+3 cette semaine", color: "hsl(214,55%,38%)" },
            { label: "Stock faible", value: "7", sub: "Réapprovisionnement requis", color: "hsl(355,70%,50%)" },
            { label: "Mouvements aujourd'hui", value: "23", sub: "12 entrées · 11 sorties", color: "hsl(196,80%,40%)" },
          ].map((c, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(30,80,160,.08)", border: "1px solid hsl(210,30%,90%)" }}>
              <div style={{ fontSize: 12, color: "hsl(215,25%,50%)", marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, color: "hsl(215,20%,60%)", marginTop: 4 }}>{c.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(30,80,160,.08)", border: "1px solid hsl(210,30%,90%)" }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Mouvements récents</div>
          {[
            { name: "Farine de blé", type: "Entrée", qty: "+50 kg", time: "Il y a 2h" },
            { name: "Sucre raffiné", type: "Sortie", qty: "-20 kg", time: "Il y a 4h" },
            { name: "Beurre", type: "Entrée", qty: "+30 kg", time: "Il y a 6h" },
          ].map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: i > 0 ? "1px solid hsl(210,25%,92%)" : "none" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: "hsl(215,20%,55%)" }}>{m.time}</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: m.type === "Entrée" ? "hsl(142,50%,92%)" : "hsl(355,80%,93%)", color: m.type === "Entrée" ? "hsl(142,60%,30%)" : "hsl(355,70%,42%)" }}>{m.type}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{m.qty}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
