import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

export async function uploadAvatar(uid: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Profil fotografi bir gorsel dosyasi olmali.");
  }
  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error("Profil fotografi en fazla 5 MB olabilir.");
  }

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `avatars/${uid}/profile-${Date.now()}.${ext}`;
  const avatarRef = ref(storage, path);
  await uploadBytes(avatarRef, file, { contentType: file.type });
  return getDownloadURL(avatarRef);
}
