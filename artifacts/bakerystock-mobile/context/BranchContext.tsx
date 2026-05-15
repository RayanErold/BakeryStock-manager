import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

interface BranchContextType {
  selectedBranchId: number | null;
  setSelectedBranchId: (id: number | null) => void;
}

const BranchContext = createContext<BranchContextType>({
  selectedBranchId: null,
  setSelectedBranchId: () => {},
});

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [selectedBranchId, setSelectedBranchIdState] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("selectedBranchId").then((val) => {
      if (val) setSelectedBranchIdState(Number(val));
    });
  }, []);

  const setSelectedBranchId = (id: number | null) => {
    setSelectedBranchIdState(id);
    if (id === null) {
      AsyncStorage.removeItem("selectedBranchId");
    } else {
      AsyncStorage.setItem("selectedBranchId", String(id));
    }
  };

  return (
    <BranchContext.Provider value={{ selectedBranchId, setSelectedBranchId }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
