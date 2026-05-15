export function DarkMode() {
  return (
    <div style={{ fontFamily: "Inter, sans-serif", display: "flex", height: "100vh", background: "hsl(25,35%,10%)", color: "hsl(35,40%,88%)" }}>
      <aside style={{ width: 200, background: "hsl(25,35%,13%)", borderRight: "1px solid hsl(25,25%,18%)", display: "flex", flexDirection: "column", padding: "20px 0" }}>
        <div style={{ padding: "0 16px 24px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "hsl(30,85%,52%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 13 }}>BS</div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "hsl(35,40%,88%)" }}>BakeryStock</span>
        </div>
        {["Tableau de bord","Inventaire","Mouvements","Rapports","Audit"].map((item, i) => (
          <div key={i} style={{ padding: "10px 16px", fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? "hsl(30,90%,60%)" : "hsl(35,20%,60%)", background: i === 0 ? "hsl(25,30%,18%)" : "transparent", borderRadius: i === 0 ? "0 6px 6px 0" : 0, marginRight: i === 0 ? 8 : 0, cursor: "pointer" }}>{item}</div>
        ))}
      </aside>
      <main style={{ flex: 1, padding: 28, overflowY: "auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "hsl(35,40%,90%)" }}>Tableau de bord</h1>
          <p style={{ fontSize: 13, color: "hsl(35,20%,55%)", margin: "4px 0 0" }}>Boulangerie Moderne · Yaoundé</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Articles en stock", value: "148", sub: "+3 cette semaine", color: "hsl(30,90%,60%)" },
            { label: "Stock faible", value: "7", sub: "Réapprovisionnement requis", color: "hsl(15,80%,60%)" },
            { label: "Mouvements aujourd'hui", value: "23", sub: "12 entrées · 11 sorties", color: "hsl(200,70%,60%)" },
          ].map((c, i) => (
            <div key={i} style={{ background: "hsl(25,30%,16%)", borderRadius: 12, padding: "18px 20px", border: "1px solid hsl(25,25%,22%)" }}>
              <div style={{ fontSize: 12, color: "hsl(35,20%,55%)", marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, color: "hsl(35,20%,45%)", marginTop: 4 }}>{c.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "hsl(25,30%,16%)", borderRadius: 12, padding: "18px 20px", border: "1px solid hsl(25,25%,22%)" }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, color: "hsl(35,40%,88%)" }}>Mouvements récents</div>
          {[
            { name: "Farine de blé", type: "Entrée", qty: "+50 kg", time: "Il y a 2h" },
            { name: "Sucre raffiné", type: "Sortie", qty: "-20 kg", time: "Il y a 4h" },
            { name: "Beurre", type: "Entrée", qty: "+30 kg", time: "Il y a 6h" },
          ].map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: i > 0 ? "1px solid hsl(25,25%,22%)" : "none" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "hsl(35,35%,82%)" }}>{m.name}</div>
                <div style={{ fontSize: 11, color: "hsl(35,15%,48%)" }}>{m.time}</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: m.type === "Entrée" ? "hsl(142,30%,18%)" : "hsl(15,40%,18%)", color: m.type === "Entrée" ? "hsl(142,60%,55%)" : "hsl(15,80%,60%)" }}>{m.type}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "hsl(35,40%,85%)" }}>{m.qty}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
