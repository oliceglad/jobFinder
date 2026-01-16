import { useDispatch } from "react-redux";
import { addToast } from "../app/uiSlice.js";

export default function useToast() {
  const dispatch = useDispatch();

  const notify = (message, type = "info") => {
    dispatch(
      addToast({
        id: `${Date.now()}-${Math.random()}`,
        type,
        message,
      })
    );
  };

  return { notify };
}
