import { useUIContext } from "../providers/UIProvider";

export const useLoading = () => {
  const { isLoading, setLoading } = useUIContext();
  return {
    isLoading,
    showLoading: () => setLoading(true),
    hideLoading: () => setLoading(false),
  };
};
