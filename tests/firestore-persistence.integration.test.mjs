import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { persistSnapshotAtomically } from "../src/firestorePersistence.js";

const PROJECT_ID = "demo-fluxo-casal-test";
const MAIN_PATH = "artifacts/demo-finance-test/public/data/finances/shared_state";

const ALLOW_MAIN_AND_HISTORY = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/public/data/finances/shared_state {
      allow read, write: if true;
      match /versions/{versionId} {
        allow read, write: if true;
      }
    }
    match /{document=**} { allow read, write: if false; }
  }
}
`;

const DENY_HISTORY = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/public/data/finances/shared_state {
      allow read, write: if true;
      match /versions/{versionId} {
        allow read, write: if false;
      }
    }
    match /{document=**} { allow read, write: if false; }
  }
}
`;

const DENY_MAIN_WRITES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/public/data/finances/shared_state {
      allow read: if true;
      allow write: if false;
      match /versions/{versionId} {
        allow read, write: if true;
      }
    }
    match /{document=**} { allow read, write: if false; }
  }
}
`;

let env;
before(async () => {
  if (process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT !== PROJECT_ID) {
    throw new Error(`Unexpected GCLOUD_PROJECT "${process.env.GCLOUD_PROJECT}". Refusing to run emulator tests.`);
  }
  if (process.env.FIREBASE_CONFIG && process.env.FIREBASE_CONFIG.includes("fluxo-de-caixa-59dd1")) {
    throw new Error("Production Firebase config detected. Refusing to run integration tests.");
  }
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: ALLOW_MAIN_AND_HISTORY },
  });
});

beforeEach(async () => {
  await env.loadFirestoreRules({ rules: ALLOW_MAIN_AND_HISTORY });
  await env.clearFirestore();
});

after(async () => {
  await env?.cleanup();
});

function client(uid) {
  return env.authenticatedContext(uid).firestore();
}

async function seed(data) {
  const db = client("seed-client");
  await setDoc(doc(db, MAIN_PATH), data);
}

test("normal save atomically creates history and updates the main document", async () => {
  const baseline = { transactions: [{ id: "synthetic-1", amount: 25 }], unknown: { keep: true }, nullable: null };
  await seed(baseline);
  const db = client("client-save");
  const pending = { ...baseline, transactions: [...baseline.transactions, { id: "synthetic-2", amount: 7 }] };

  const result = await persistSnapshotAtomically({ db, docRef: doc(db, MAIN_PATH), baseline, pendingData: pending });
  const main = await getDoc(doc(db, MAIN_PATH));
  const versions = await getDocs(collection(db, `${MAIN_PATH}/versions`));

  assert.equal(main.exists(), true);
  assert.deepEqual(main.data(), pending);
  assert.equal(versions.size, 1);
  assert.equal(versions.docs[0].id, result.versionId);
  assert.deepEqual(versions.docs[0].data().data, baseline);
  assert.equal(versions.docs[0].data().source, "before-client-save");
});

test("denied history write leaves the main document unchanged", async () => {
  const baseline = { transactions: [{ id: "synthetic-original", amount: 11 }], custom: { retained: true } };
  await seed(baseline);
  await env.loadFirestoreRules({ rules: DENY_HISTORY });
  const db = client("history-denied-client");
  const pending = { ...baseline, transactions: [{ id: "synthetic-replacement", amount: 99 }] };

  await assert.rejects(
    persistSnapshotAtomically({ db, docRef: doc(db, MAIN_PATH), baseline, pendingData: pending })
  );
  const main = await getDoc(doc(db, MAIN_PATH));
  assert.deepEqual(main.data(), baseline);
});

test("missing main document blocks the save", async () => {
  const db = client("missing-client");
  await assert.rejects(
    persistSnapshotAtomically({
      db,
      docRef: doc(db, MAIN_PATH),
      baseline: { transactions: [] },
      pendingData: { transactions: [{ id: "synthetic-new", amount: 1 }] },
    }),
    /Documento principal ausente/
  );
  assert.equal((await getDoc(doc(db, MAIN_PATH))).exists(), false);
});

test("denied main write does not report a successful save", async () => {
  const baseline = { transactions: [{ id: "synthetic-original", amount: 5 }] };
  await seed(baseline);
  await env.loadFirestoreRules({ rules: DENY_MAIN_WRITES });
  const db = client("write-denied-client");
  const pending = { transactions: [{ id: "synthetic-new", amount: 6 }] };

  await assert.rejects(persistSnapshotAtomically({ db, docRef: doc(db, MAIN_PATH), baseline, pendingData: pending }));
  await env.loadFirestoreRules({ rules: ALLOW_MAIN_AND_HISTORY });
  const checkDb = client("verification-client");
  assert.deepEqual((await getDoc(doc(checkDb, MAIN_PATH))).data(), baseline);
});

test("two independent clients cannot silently overwrite the same baseline", async () => {
  const baseline = { transactions: [{ id: "synthetic-base", amount: 1 }], opaque: { keep: "yes" } };
  await seed(baseline);
  const dbA = client("concurrent-client-a");
  const dbB = client("concurrent-client-b");
  const pendingA = { ...baseline, writer: "A", transactions: [...baseline.transactions, { id: "synthetic-A", amount: 2 }] };
  const pendingB = { ...baseline, writer: "B", transactions: [...baseline.transactions, { id: "synthetic-B", amount: 3 }] };

  const results = await Promise.allSettled([
    persistSnapshotAtomically({ db: dbA, docRef: doc(dbA, MAIN_PATH), baseline, pendingData: pendingA }),
    persistSnapshotAtomically({ db: dbB, docRef: doc(dbB, MAIN_PATH), baseline, pendingData: pendingB }),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);

  const finalData = (await getDoc(doc(client("verify-concurrency"), MAIN_PATH))).data();
  assert.ok(finalData.writer === "A" || finalData.writer === "B");
  assert.deepEqual(finalData.opaque, { keep: "yes" });
  assert.equal(finalData.transactions.length, 2);
  const history = await getDocs(collection(client("verify-history"), `${MAIN_PATH}/versions`));
  assert.equal(history.size, 1);
});

test("remote change after baseline capture blocks stale save; retry with fresh baseline succeeds", async () => {
  const baseline = { transactions: [{ id: "synthetic-base", amount: 10 }] };
  await seed(baseline);
  const db = client("stale-client");
  const remoteNewer = { transactions: [...baseline.transactions, { id: "synthetic-remote", amount: 20 }] };
  await setDoc(doc(client("remote-client"), MAIN_PATH), remoteNewer);
  const stalePending = { transactions: [{ id: "synthetic-stale", amount: 999 }] };

  await assert.rejects(persistSnapshotAtomically({ db, docRef: doc(db, MAIN_PATH), baseline, pendingData: stalePending }));
  assert.deepEqual((await getDoc(doc(db, MAIN_PATH))).data(), remoteNewer);

  const retryPending = { ...remoteNewer, note: null, enabled: false, count: 0 };
  await persistSnapshotAtomically({ db, docRef: doc(db, MAIN_PATH), baseline: remoteNewer, pendingData: retryPending });
  assert.deepEqual((await getDoc(doc(db, MAIN_PATH))).data(), retryPending);
});

test("nested unknown fields, nulls, booleans, strings, numbers and arrays survive persistence", async () => {
  const baseline = {
    transactions: [],
    futureField: { nested: [{ key: "synthetic", nullable: null, active: false, amount: 12.5 }] },
    label: "test-only",
  };
  await seed(baseline);
  const db = client("types-client");
  const pending = { ...baseline, futureField: { ...baseline.futureField, added: [null, true, 0, "x"] } };

  await persistSnapshotAtomically({ db, docRef: doc(db, MAIN_PATH), baseline, pendingData: pending });
  assert.deepEqual((await getDoc(doc(db, MAIN_PATH))).data(), pending);
});
