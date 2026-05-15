export function WarmAmber() {
  return (
    <div style={{ fontFamily: "Inter, sans-serif", display: "flex", height: "100vh", background: "hsl(42,30%,96%)", color: "hsl(25,40%,20%)" }}>
      <aside style={{ width: 200, background: "hsl(35,30%,92%)", borderRight: "1px solid hsl(35,25%,85%)", display: "flex", flexDirection: "column", padding: "20px 0" }}>
        <div style={{ padding: "0 16px 24px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "hsl(30,85%,48%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>BS</div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "hsl(25,40%,20%)" }}>BakeryStock</span>
        </div>
        {["Tableau de bord","Inventaire","Mouvements","Rapports","Audit"].map((item, i) => (
          <div key={i} style={{ padding: "10px 16px", fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? "hsl(30,85%,42%)" : "hsl(25,30%,40%)", background: i === 0 ? "hsl(35,40%,86%)" : "transparent", borderRadius: i === 0 ? "0 6px 6px 0" : 0, marginRight: i === 0 ? 8 : 0, cursor: "pointer" }}>{item}</div>
        ))}
      </aside>
      <main style={{ flex: 1, padding: 28, overflowY: "auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Tableau de bord</h1>
          <p style={{ fontSize: 13, color: "hsl(25,30%,50%)", margin: "4px 0 0" }}>Boulangerie Moderne · Yaoundé</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Articles en stock", value: "148", sub: "+3 cette semaine", color: "hsl(30,85%,48%)" },
            { label: "Stock faible", value: "7", sub: "Réapprovisionnement requis", color: "hsl(15,70%,52%)" },
            { label: "Mouvements aujourd'hui", value: "23", sub: "12 entrées · 11 sorties", color: "hsl(200,60%,45%)" },
          ].map((c, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
              <div style={{ fontSize: 12, color: "hsl(25,30%,50%)", marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, color: "hsl(25,30%,60%)", marginTop: 4 }}>{c.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.07)" }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Mouvements récents</div>
          {[
            { name: "Farine de blé", type: "Entrée", qty: "+50 kg", time: "Il y a 2h" },
            { name: "Sucre raffiné", type: "Sortie", qty: "-20 kg", time: "Il y a 4h" },
            { name: "Beurre", type: "Entrée", qty: "+30 kg", time: "Il y a 6h" },
          ].map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: i > 0 ? "1px solid hsl(35,25%,90%)" : "none" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: "hsl(25,30%,55%)" }}>{m.time}</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: m.type === "Entrée" ? "hsl(142,50%,92%)" : "hsl(15,80%,92%)", color: m.type === "Entrée" ? "hsl(142,60%,30%)" : "hsl(15,70%,40%)" }}>{m.type}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{m.qty}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
