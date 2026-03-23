import * as ScreenOrientation from 'expo-screen-orientation';

export async function lockLandscape() {
  try {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  } catch (e) {
    // Silently ignore orientation errors (e.g., not supported)
  }
}

export async function lockPortrait() {
  try {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  } catch (e) {
    // Silently ignore orientation errors (e.g., not supported)
  }
}
