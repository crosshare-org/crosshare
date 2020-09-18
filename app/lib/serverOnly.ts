import { AdminApp } from '../lib/firebaseWrapper';

export async function getStorageUrl(storageKey: string): Promise<string | null> {
  const profilePic = AdminApp.storage().bucket().file(storageKey);
  if ((await profilePic.exists())[0]) {
    try {
      return (await profilePic.getSignedUrl({
        action: 'read',
        expires: '03-09-2491'
      }))[0];
    } catch (e) {
      console.log('error getting profile pic', storageKey, e);
    }
  } else {
    console.log('pic doesnt exist', storageKey);
  }
  return null;
}
