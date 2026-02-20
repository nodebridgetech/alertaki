import storage from '@react-native-firebase/storage';

async function uploadProfilePhoto(uid: string, imageUri: string): Promise<string> {
  const reference = storage().ref(`users/${uid}/profile/photo.jpg`);
  await reference.putFile(imageUri);
  const downloadURL = await reference.getDownloadURL();
  return downloadURL;
}

async function deleteProfilePhoto(uid: string): Promise<void> {
  try {
    const reference = storage().ref(`users/${uid}/profile/photo.jpg`);
    await reference.delete();
  } catch {
    // Photo may not exist
  }
}

export const storageService = {
  uploadProfilePhoto,
  deleteProfilePhoto,
};
