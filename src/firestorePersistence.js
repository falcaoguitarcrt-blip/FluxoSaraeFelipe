import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { createHistoryRecord, snapshotsEqual } from "./dataProtection.js";

/**
 * Persists a client snapshot only when the remote document still matches the
 * exact baseline observed by that client. The history record and main document
 * are committed in one Firestore transaction.
 */
export async function persistSnapshotAtomically({
  db,
  docRef,
  baseline,
  pendingData,
}) {
  if (!db || !docRef) throw new TypeError("Firestore and document reference are required.");
  if (!baseline || typeof baseline !== "object" || Array.isArray(baseline)) {
    throw new TypeError("A valid remote baseline is required; save was not attempted.");
  }
  if (!pendingData || typeof pendingData !== "object" || Array.isArray(pendingData)) {
    throw new TypeError("A valid pending snapshot is required.");
  }

  const versionsRef = collection(docRef, "versions");
  const versionRef = doc(versionsRef);

  await runTransaction(db, async (transaction) => {
    const latestSnapshot = await transaction.get(docRef);
    if (!latestSnapshot.exists()) {
      throw new Error("Documento principal ausente durante salvamento; gravação bloqueada.");
    }

    const latestServerData = latestSnapshot.data();
    if (!snapshotsEqual(latestServerData, baseline)) {
      throw new Error("O estado da nuvem mudou desde a última leitura. Recarregue para evitar sobrescrita concorrente.");
    }

    transaction.set(versionRef, createHistoryRecord({
      versionId: versionRef.id,
      createdAt: serverTimestamp(),
      source: "before-client-save",
      data: latestServerData,
    }));
    transaction.set(docRef, pendingData);
  });

  return { versionId: versionRef.id };
}
