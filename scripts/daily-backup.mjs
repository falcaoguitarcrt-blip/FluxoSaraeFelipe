import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const projectId = process.env.FIREBASE_PROJECT_ID;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!projectId || !serviceAccountJson) {
  throw new Error('Backup bloqueado: credenciais do servidor não configuradas.');
}

if (projectId !== 'fluxo-de-caixa-59dd1') {
  throw new Error(`Backup bloqueado: projeto inesperado (${projectId}).`);
}

let admin;
try {
  admin = await import('firebase-admin');
} catch {
  throw new Error('Backup bloqueado: firebase-admin não está instalado.');
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
} catch {
  throw new Error('Backup bloqueado: FIREBASE_SERVICE_ACCOUNT_JSON não contém JSON válido.');
}

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId,
});
const db = admin.getFirestore(app);

const snapshot = await db.collection('shared_state').doc('shared_state').get();
if (!snapshot.exists) {
  throw new Error('Backup bloqueado: documento principal não existe.');
}

const data = snapshot.data();
const now = new Date();
const id = now.toISOString().replace(/[:.]/g, '-');

await db.collection('daily_backups').doc(id).set({
  source: 'shared_state/shared_state',
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  sourceUpdatedAt: data?.updatedAt ?? null,
  data,
});

console.log(`Backup diário criado: daily_backups/${id}`);

await admin.app().delete();
