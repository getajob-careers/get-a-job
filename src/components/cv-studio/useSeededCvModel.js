import { useState, useEffect, useRef } from "react";
import { fromCvData } from "@/lib/cvDataAdapter";

// Owns the editor `model` for the currently-selected CV. Seeds it from the loaded
// row when that row matches the selection; clears it otherwise so a stale model
// can never render under a new selection (the bug that showed the master CV under
// a tailored header). ONE effect = ONE writer of `model`, on purpose: an earlier
// version had a SECOND effect (the per-CV chat reset) also keyed on selectedCvId
// that nulled `model`; when the row was warm in the react-query cache both effects
// fired on the same commit, the reset ran after this seed and clobbered it, and no
// dep changed again to re-seed — so /CVAgent hung on the spinner forever (silent,
// threw nothing). Never add a second effect that writes `model`.
export function useSeededCvModel(cvRow, selectedCvId) {
  const [model, setModel] = useState(null);
  const modelRef = useRef(null);
  useEffect(() => {
    if (cvRow && cvRow.id === selectedCvId) {
      const m = fromCvData(cvRow.cv_data);
      modelRef.current = m;
      setModel(m);
    } else {
      modelRef.current = null;
      setModel(null);
    }
  }, [cvRow, selectedCvId]);
  return { model, setModel, modelRef };
}
