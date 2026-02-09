import { useState, useEffect } from "react";
import { getHistory, deleteHistory } from "../services/historyService";

export default function usePatientHistory() {
  const [history, setHistory] = useState([]);

  const load = async () => {
    const list = await getHistory();
    setHistory(list);
  };

  const removeEntry = async (id: string) => {
    await deleteHistory(id);
    await load();
  };

  useEffect(() => {
    load();
  }, []);

  return { history, removeEntry };
}
